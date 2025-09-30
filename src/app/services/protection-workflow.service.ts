import { Injectable, Optional } from '@angular/core';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { AnalyticsService } from './analytics.service';
import { MonitoringService } from './monitoring.service';
import { ProtectionService } from './protection.service';
import { FlowContextService } from './flow-context.service';
import {
  ProtectionApplicationRequest,
  ProtectionApplicationResponse,
  ProtectionSimulateRequest,
  ProtectionSimulateResponse,
  ProtectionScenario,
  ProtectionSelectRequest,
  ProtectionApprovalRequest,
  ProtectionSignRequest,
  ProtectionPlan,
  ProtectionState,
  ProtectionType,
} from '../models/protection';

export interface ProtectionWorkflowOptions {
  contractId?: string;
  effectiveDate?: string;
  coverageType?: string | null;
  score?: number | null;
  scoreSource?: 'api' | 'mock' | 'manual';
  advisorId?: string | null;
  clientId?: string | null;
  market?: string;
  metadata?: Record<string, any>;
}

export interface ProtectionFlowContextState {
  applied: boolean;
  appliedAt: number;
  coverageType: string | null;
  score?: number | null;
  scoreSource?: 'api' | 'mock' | 'manual';
  advisorId?: string | null;
  contractId?: string;
  effectiveDate?: string;
  scheduleLength?: number;
  notifications?: ProtectionApplicationResponse['notifications'];
  fallbackUsed?: boolean;
  clientId?: string | null;
  market?: string;
  metadata?: Record<string, any>;
}

type StepResult<T> = { value: T; fallback: boolean };

@Injectable({ providedIn: 'root' })
export class ProtectionWorkflowService {
  private readonly contextKey = 'protection';
  private readonly applyTimeoutMs = 8000;
  private readonly planTimeoutMs = 6000;

  constructor(
    private readonly protection: ProtectionService,
    private readonly analytics: AnalyticsService,
    private readonly monitoring: MonitoringService,
    @Optional() private readonly flowContext?: FlowContextService,
  ) {}

  async applyProtection(options: ProtectionWorkflowOptions = {}): Promise<ProtectionFlowContextState> {
    const contractId = options.contractId ?? `mock-contract-${Date.now()}`;
    const coverageType = options.coverageType ?? null;
    const metadata = options.metadata ?? {};
    const startedAt = Date.now();

    this.analytics.track('protection_workflow_start', {
      contractId,
      coverageType,
      source: options.scoreSource ?? 'manual',
    });

    let fallbackUsed = false;
    const planBefore = await this.tryFetchPlan(contractId).catch(error => {
      fallbackUsed = true;
      this.monitoring.captureWarning('protection', 'plan.fetch', 'No se pudo obtener el plan de protección, usando datos simulados', {
        contractId,
        error
      });
      return null;
    });

    const simulationResult = await this.trySimulate(contractId, options).catch(error => {
      fallbackUsed = true;
      this.monitoring.captureWarning('protection', 'simulate', 'Fallo al simular protección, usando escenarios simulados', {
        contractId,
        error
      });
      return this.buildMockSimulation(contractId, coverageType);
    });

    const scenario = this.pickScenario(simulationResult, coverageType, planBefore) ?? this.buildFallbackScenario(contractId, coverageType);

    const selectOutcome = await this.trySelectScenario(contractId, scenario);
    fallbackUsed = fallbackUsed || selectOutcome.fallback;
    let workflowState: ProtectionState = selectOutcome.value;

    const approveOutcome = await this.tryApproveScenario(contractId, options.advisorId);
    fallbackUsed = fallbackUsed || approveOutcome.fallback;
    workflowState = approveOutcome.value;

    const signOutcome = await this.trySignScenario(contractId, options, planBefore);
    fallbackUsed = fallbackUsed || signOutcome.fallback;
    workflowState = signOutcome.value;

    const applyOutcome = await this.tryApplyScenario(contractId, options, coverageType);
    fallbackUsed = fallbackUsed || applyOutcome.fallback;
    const response = applyOutcome.value;

    if (response?.success) {
      workflowState = 'APPLIED';
    }

    const planAfter = await this.tryFetchPlan(contractId).catch(error => {
      fallbackUsed = true;
      this.monitoring.captureWarning('protection', 'plan.refresh', 'No se pudo refrescar el plan de protección, usando datos simulados', {
        contractId,
        error
      });
      return null;
    });

    const appliedAt = Date.now();
    const state: ProtectionFlowContextState = {
      applied: !!response?.success,
      appliedAt,
      coverageType,
      score: options.score ?? null,
      scoreSource: options.scoreSource ?? (fallbackUsed ? 'mock' : 'api'),
      advisorId: options.advisorId ?? null,
      contractId,
      effectiveDate: options.effectiveDate,
      scheduleLength: response?.newSchedule?.length ?? 0,
      notifications: response?.notifications,
      fallbackUsed,
      clientId: options.clientId ?? null,
      market: options.market,
      metadata: {
        ...metadata,
        workflowState,
        scenarioId: scenario?.id ?? null,
        odooContractId: response?.odooContractId,
        neonTransactionId: response?.neonTransactionId,
        initialPlanState: planBefore?.state ?? null,
        finalPlanState: planAfter?.state ?? null
      }
    };

    this.trackWorkflowResult(state, fallbackUsed);

    if (this.flowContext) {
      this.flowContext.saveContext(this.contextKey, state, {
        breadcrumbs: ['Dashboard', 'Protección']
      });
    }

    const durationMs = Date.now() - startedAt;
    this.analytics.metric('protection.workflow.duration_ms', durationMs, {
      contractId,
      fallbackUsed,
      coverageType,
      applied: state.applied,
    });

    return state;
  }

  private trackWorkflowResult(state: ProtectionFlowContextState, fallbackUsed: boolean): void {
    if (state.applied) {
      this.monitoring.captureInfo(
        'protection',
        'workflow.completed',
        'Workflow de protección completado',
        {
          contractId: state.contractId,
          coverageType: state.coverageType,
          score: state.score,
          fallbackUsed,
        },
        { notifyExternally: true, channels: ['datadog'] }
      );
      this.analytics.track('protection_workflow_completed', {
        contractId: state.contractId,
        coverageType: state.coverageType,
        score: state.score,
        scoreSource: state.scoreSource,
        scheduleLength: state.scheduleLength,
        fallbackUsed,
      });
      return;
    }

    this.monitoring.captureWarning(
      'protection',
      'workflow.failed',
      'Workflow de protección terminó sin aplicar cobertura',
      {
        contractId: state.contractId,
        coverageType: state.coverageType,
        fallbackUsed,
      },
      { notifyExternally: true, channels: ['slack', 'datadog'] }
    );
    this.analytics.track('protection_workflow_failed', {
      contractId: state.contractId,
      coverageType: state.coverageType,
      fallbackUsed,
    });
  }

  private async tryFetchPlan(contractId: string): Promise<ProtectionPlan> {
    return firstValueFrom(
      this.protection.getPlan(contractId).pipe(timeout(this.planTimeoutMs))
    );
  }

  private async trySimulate(contractId: string, options: ProtectionWorkflowOptions): Promise<ProtectionSimulateResponse> {
    const request: ProtectionSimulateRequest = {
      contractId,
      monthK: typeof options.metadata?.['monthK'] === 'number' ? options.metadata['monthK'] : 0,
      options: {
        triggerReason: options.metadata?.['triggerReason'] ?? 'manual',
        requestedType: options.metadata?.['requestedType'] as ProtectionType | undefined,
        customParams: options.metadata?.['customParams']
      }
    };

    return firstValueFrom(
      this.protection.simulate(request).pipe(timeout(this.applyTimeoutMs))
    );
  }

  private pickScenario(
    simulation: ProtectionSimulateResponse | null,
    coverageType: string | null,
    plan: ProtectionPlan | null
  ): ProtectionScenario | null {
    const normalizedCoverage = coverageType?.toLowerCase() ?? null;

    const candidate = simulation?.scenarios?.find(scenario => {
      const descriptor = `${scenario.description ?? ''} ${scenario.type ?? ''}`.toLowerCase();
      if (!normalizedCoverage) {
        return true;
      }
      return descriptor.includes(normalizedCoverage) || String((scenario as any).coverageType ?? '').toLowerCase() === normalizedCoverage;
    });

    if (candidate) {
      return candidate;
    }

    if (simulation?.scenarios?.length) {
      return simulation.scenarios[0];
    }

    if (plan?.scenarios?.length) {
      return plan.scenarios[0];
    }

    return null;
  }

  private buildFallbackScenario(contractId: string, coverageType: string | null): ProtectionScenario {
    const normalized = coverageType?.toLowerCase() ?? 'standard';
    const baseType: ProtectionType = normalized === 'premium' ? 'STEPDOWN' : 'DEFER';

    return {
      id: `${contractId}-scenario-${normalized}`,
      type: baseType,
      params: normalized === 'premium'
        ? { reductionPercentage: 0.25, durationMonths: 4 }
        : { deferMonths: 2 },
      description: normalized === 'premium'
        ? 'Reducción temporal de mensualidad con prima premium'
        : 'Diferimiento de pagos por 2 meses',
      impact: {
        paymentChange: normalized === 'premium' ? -1800 : -900,
        termChange: normalized === 'premium' ? 2 : 1,
        totalCostChange: normalized === 'premium' ? 3500 : 2100
      },
      eligible: true,
      score: normalized === 'premium' ? 86 : 72
    } as ProtectionScenario;
  }

  private buildMockSimulation(contractId: string, coverageType: string | null): ProtectionSimulateResponse {
    const scenario = this.buildFallbackScenario(contractId, coverageType);
    return {
      scenarios: [scenario],
      eligibilityCheck: {
        isEligible: true,
        reason: 'Mock eligibility',
        usageRemaining: {
          defer: 2,
          stepdown: 2,
          recalendar: 1,
          collective: 1
        }
      }
    };
  }

  private async trySelectScenario(contractId: string, scenario: ProtectionScenario): Promise<StepResult<ProtectionState>> {
    const request: ProtectionSelectRequest = {
      contractId,
      scenario,
      reason: 'Auto selección desde workflow dev'
    };

    try {
      const response = await firstValueFrom(
        this.protection.select(request).pipe(timeout(this.applyTimeoutMs))
      );
      return { value: response.newState, fallback: false };
    } catch (error) {
      this.monitoring.captureWarning('protection', 'select', 'Fallo al seleccionar escenario, usando transición simulada', {
        contractId,
        scenario,
        error
      });
      return { value: 'PENDING_APPROVAL', fallback: true };
    }
  }

  private async tryApproveScenario(contractId: string, advisorId?: string | null): Promise<StepResult<ProtectionState>> {
    const request: ProtectionApprovalRequest = {
      contractId,
      approvedBy: advisorId ?? 'advisor-dev',
      notes: 'Aprobación automática en entorno de desarrollo'
    };

    try {
      const response = await firstValueFrom(
        this.protection.approve(request).pipe(timeout(this.applyTimeoutMs))
      );
      return { value: response.newState, fallback: false };
    } catch (error) {
      this.monitoring.captureWarning('protection', 'approve', 'Fallo al aprobar protección, usando transición simulada', {
        contractId,
        error
      });
      return { value: 'READY_TO_SIGN', fallback: true };
    }
  }

  private async trySignScenario(
    contractId: string,
    options: ProtectionWorkflowOptions,
    plan: ProtectionPlan | null
  ): Promise<StepResult<ProtectionState>> {
    const signRequest: ProtectionSignRequest = {
      contractId,
      mifielSessionId: (options.metadata?.['mifielSessionId'] as string) ?? plan?.mifielSessionId ?? `mock-mifiel-${contractId}`,
      signedDocumentUrl: (options.metadata?.['signedDocumentUrl'] as string) ?? plan?.signedDocumentUrl ?? `https://mock.conductores.mx/contracts/${contractId}/signed.pdf`
    };

    try {
      const response = await firstValueFrom(
        this.protection.sign(signRequest).pipe(timeout(this.applyTimeoutMs))
      );
      return { value: response.newState, fallback: false };
    } catch (error) {
      this.monitoring.captureWarning('protection', 'sign', 'Fallo al firmar documentación de protección, usando transición simulada', {
        contractId,
        error
      });
      return { value: 'SIGNED', fallback: true };
    }
  }

  private async tryApplyScenario(
    contractId: string,
    options: ProtectionWorkflowOptions,
    coverageType: string | null
  ): Promise<StepResult<ProtectionApplicationResponse | null>> {
    const request: ProtectionApplicationRequest = {
      contractId,
      effectiveDate: options.effectiveDate
    };

    try {
      const response = await firstValueFrom(
        this.protection.apply(request).pipe(timeout(this.applyTimeoutMs))
      );
      this.monitoring.captureInfo(
        'protection',
        'apply.success',
        'Respuesta de aplicación de protección recibida',
        {
          contractId,
          coverageType,
          scheduleLength: response.newSchedule?.length ?? 0,
        },
        { notifyExternally: true, channels: ['datadog'] }
      );
      return { value: response, fallback: false };
    } catch (error) {
      const isTimeout = error instanceof TimeoutError;
      this.monitoring.captureWarning(
        'protection',
        'apply',
        isTimeout ? 'Timeout al aplicar protección, usando flujo simulado' : 'Fallo al aplicar protección, usando flujo simulado',
        { contractId, error },
        { notifyExternally: true, channels: ['slack', 'datadog'] }
      );
      return { value: this.buildMockResponse(contractId, coverageType), fallback: true };
    }
  }

  private buildMockResponse(contractId: string, coverageType?: string | null): ProtectionApplicationResponse {
    const totalMonths = 6;
    const basePayment = 8500;

    const newSchedule = Array.from({ length: totalMonths }, (_, index) => ({
      month: index + 1,
      payment: Math.max(0, basePayment - (coverageType === 'premium' ? 1800 : 900)),
      principal: Math.max(0, basePayment * 0.6),
      interest: Math.max(0, basePayment * 0.4 - (coverageType === 'premium' ? 600 : 300)),
      balance: Math.max(0, basePayment * (totalMonths - index - 1))
    }));

    return {
      success: true,
      newSchedule,
      odooContractId: `mock-odoo-${contractId}`,
      neonTransactionId: `mock-neon-${Date.now()}`,
      notifications: {
        whatsapp: true,
        email: true,
        push: false
      }
    };
  }
}
