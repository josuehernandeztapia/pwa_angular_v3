import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, OnInit, Optional, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ToastService } from '../../../services/toast.service';
import { FinancialCalculatorService } from '../../../services/financial-calculator.service';
import { ProtectionEngineService } from '../../../services/protection-engine.service';
import { Market } from '../../../models/types';
import { ProtectionScenario } from '../../../models/protection';
import { calculateIRR, calculateModifiedPayment, IRRResult } from '../../../utils/irr-calculator';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../../shared/icon/icon.component';
import { ContextPanelComponent } from '../../shared/context-panel/context-panel.component';
import { OfflineQueueBannerComponent } from '../../shared/offline-queue-banner/offline-queue-banner.component';
import { RiskPanelComponent, RiskEvaluation } from '../../risk-evaluation/risk-panel.component';
import { RiskEvaluationService, RiskEvaluationRequest } from '../../../services/risk-evaluation.service';
import { FlowContextService } from '../../../services/flow-context.service';
import { ClientContextSnapshot } from '../../../models/client-context';
import { ContractContextSnapshot } from '../../../models/contract-context';
import { AnalyticsService } from '../../../services/analytics.service';
import { ProtectionWorkflowService, ProtectionFlowContextState, ProtectionWorkflowOptions } from '../../../services/protection-workflow.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ProtectionContextSnapshot {
  form: any;
  scenarios: ProtectionScenario[];
  cobertura: string;
  healthScore: number;
  lastUpdated: number;
  state?: ProtectionFlowState;
}

interface ProtectionFlowState {
  applied: boolean;
  appliedAt: number | null;
  coverageType: string | null;
  score?: number | null;
  advisorId?: string | null;
  scoreSource?: 'api' | 'mock' | 'manual';
  fallbackUsed?: boolean;
  metadata?: Record<string, any>;
  contractId?: string | null;
}

@Component({
  selector: 'app-proteccion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, ContextPanelComponent, OfflineQueueBannerComponent, RiskPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './proteccion.component.scss',
  templateUrl: './proteccion.component.html'
})
export class ProteccionComponent implements OnInit, OnDestroy {
  // Minimalista Protection KPIs
  loading = false;
  healthScore = 82;
  cobertura = 'Estándar';

  // Original functionality
  highRiskClients = 12;
  mediumRiskClients = 35;
  lowRiskClients = 203;

  contractForm: FormGroup;
  scenarios: ProtectionScenario[] = [];
  private readonly destroy$ = new Subject<void>();
  private persistTimer: any = null;
  private riskEvalDebounce: ReturnType<typeof setTimeout> | null = null;
  private protectionState: ProtectionFlowState = {
    applied: false,
    appliedAt: null,
    coverageType: null,
    score: undefined,
    advisorId: undefined,
    scoreSource: undefined,
    fallbackUsed: false,
    metadata: {},
    contractId: undefined
  };
  riskEvaluation = signal<RiskEvaluation | null>(null);
  riskLoading = signal(false);
  riskError = signal(false);
  private contextClientId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private pdfExportService: PdfExportService,
    private toast: ToastService,
    private financialCalc: FinancialCalculatorService,
    private protectionEngine: ProtectionEngineService,
    private analytics: AnalyticsService,
    private riskEvaluationService: RiskEvaluationService,
    private protectionWorkflow: ProtectionWorkflowService,
    @Optional() private readonly flowContext?: FlowContextService
  ) {
    this.contractForm = this.fb.group({
      currentBalance: [320000, [Validators.required, Validators.min(1)]],
      originalPayment: [10500, [Validators.required, Validators.min(1)]],
      remainingTerm: [36, [Validators.required, Validators.min(1), Validators.max(120)]],
      market: ['edomex', Validators.required]
    });
  }

  ngOnInit(): void {
    this.flowContext?.setBreadcrumbs(['Dashboard', 'Protección']);
    this.restoreFromContext();

    this.contractForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.schedulePersist();
        this.requestRiskEvaluation();
      });

    this.initializeRiskPanel();
  }

  ngOnDestroy(): void {
    clearTimeout(this.persistTimer);
    if (this.riskEvalDebounce) {
      clearTimeout(this.riskEvalDebounce);
      this.riskEvalDebounce = null;
    }
    this.persistContext();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeRiskPanel(): void {
    if (!environment.features.enableRiskPanel) {
      this.loadFallbackRiskEvaluation('feature_disabled');
      return;
    }

    this.contextClientId = this.resolveClientId();
    this.evaluateRiskSnapshot();
  }

  private loadFallbackRiskEvaluation(reason: 'feature_disabled' | 'service_unavailable' | 'missing_client' = 'service_unavailable'): void {
    const evaluation: RiskEvaluation = {
      evaluationId: 'mock-eval-001',
      processedAt: new Date(),
      processingTimeMs: 1240,
      algorithmVersion: '1.2.3',
      decision: 'REVIEW',
      riskCategory: 'MEDIO',
      confidenceLevel: 0.76,
      scoreBreakdown: {
        creditScore: 720,
        financialStability: 68,
        behaviorHistory: 74,
        paymentCapacity: 62,
        geographicRisk: 58,
        vehicleProfile: 82,
        finalScore: 705
      },
      kiban: {
        scoreRaw: 705,
        scoreBand: 'B',
        status: 'Evaluado',
        reasons: [
          { code: 'PAYMENT_HISTORY', desc: 'Historial de pagos consistente' },
          { code: 'CREDIT_USAGE', desc: 'Uso de crédito moderado' }
        ],
        bureauRef: 'BUREAU-REF-705'
      },
      hase: {
        riskScore01: 0.42,
        category: 'MEDIO',
        explain: [
          { factor: 'FINANCIAL_STABILITY', weight: 0.28, impact: 'moderate' },
          { factor: 'GNSS_BEHAVIOR', weight: 0.18, impact: 'low' }
        ]
      },
      riskFactors: [
        {
          factorId: 'INCOME_VARIANCE',
          factorName: 'Variación de ingresos',
          description: 'Ingresos mensuales variables por temporada',
          severity: 'MEDIA',
          scoreImpact: -8,
          mitigationRecommendations: ['Solicitar estados de cuenta adicionales', 'Monitorear durante 3 meses']
        },
        {
          factorId: 'ROUTE_DEPENDENCY',
          factorName: 'Dependencia de ruta',
          description: 'Ruta con demanda irregular',
          severity: 'BAJA',
          scoreImpact: -3,
          mitigationRecommendations: ['Diversificar horarios', 'Buscar rutas complementarias']
        }
      ],
      financialRecommendations: {
        maxLoanAmount: 280000,
        minDownPayment: 65000,
        maxTermMonths: 48,
        suggestedInterestRate: 16.5,
        estimatedMonthlyPayment: 9250,
        resultingDebtToIncomeRatio: 0.42,
        specialConditions: ['Revisar historial de combustible GNV', 'Solicitar seguro integral']
      },
      mitigationPlan: {
        required: true,
        actions: ['Actualizar comprobantes de domicilio', 'Entregar referencias adicionales'],
        estimatedDays: 5,
        expectedRiskReduction: 0.12
      },
      decisionReasons: [
        'Relación deuda/ingreso aceptable con documentación adicional',
        'Historial crediticio consistente con ligeras variaciones de ingreso'
      ],
      nextSteps: [
        'Enviar contrato para revisión del comité',
        'Solicitar validación de referencias comerciales'
      ]
    };

    this.riskEvaluation.set(evaluation);
    this.riskLoading.set(false);
    this.riskError.set(true);
    this.protectionState.score = evaluation.scoreBreakdown.finalScore;
    this.protectionState.scoreSource = 'mock';
    this.protectionState.fallbackUsed = true;
    this.protectionState.metadata = {
      ...(this.protectionState.metadata ?? {}),
      riskFallbackReason: reason
    };
    this.schedulePersist();
    this.cdr.markForCheck();
  }

  private requestRiskEvaluation(): void {
    if (!environment.features.enableRiskPanel) {
      return;
    }

    if (this.riskEvalDebounce) {
      clearTimeout(this.riskEvalDebounce);
    }

    this.riskEvalDebounce = setTimeout(() => this.evaluateRiskSnapshot(), 400);
  }

  private evaluateRiskSnapshot(): void {
    if (!environment.features.enableRiskPanel) {
      return;
    }

    if (!this.riskEvaluationService) {
      this.loadFallbackRiskEvaluation('service_unavailable');
      return;
    }

    const clientId = this.resolveClientId();
    if (!clientId) {
      this.loadFallbackRiskEvaluation('missing_client');
      return;
    }

    const request: RiskEvaluationRequest = {
      clientId,
      document: {
        country: 'MX',
        idType: 'RFC',
        idNumber: this.resolveDocumentId(clientId)
      },
      meta: {
        market: this.contractForm?.get('market')?.value ?? 'edomex',
        product: 'proteccion',
        voiceScore01: this.protectionState.score ?? undefined
      }
    };

    this.riskLoading.set(true);
    this.riskError.set(false);

    this.riskEvaluationService
      .evaluateRisk(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: evaluation => {
          this.riskEvaluation.set(evaluation);
          this.riskLoading.set(false);
          this.riskError.set(false);
          this.protectionState.score = evaluation.scoreBreakdown.finalScore;
          this.protectionState.scoreSource = 'api';
          this.protectionState.fallbackUsed = false;
          this.contextClientId = clientId;
          this.schedulePersist();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadFallbackRiskEvaluation('service_unavailable');
        }
      });
  }

  private resolveClientId(): string | null {
    if (this.contextClientId) {
      return this.contextClientId;
    }

    const clientContext = this.flowContext?.getContextData<ClientContextSnapshot>('client');
    if (clientContext?.clientId) {
      this.contextClientId = clientContext.clientId;
      return this.contextClientId;
    }

    const contractContext = this.flowContext?.getContextData<ContractContextSnapshot>('contract');
    if (contractContext?.clientId) {
      this.contextClientId = contractContext.clientId ?? null;
      return this.contextClientId;
    }

    const stored = this.flowContext?.getContextData<ProtectionContextSnapshot>('proteccion');
    if (stored?.form?.clientId) {
      this.contextClientId = stored.form.clientId;
      return this.contextClientId;
    }

    return null;
  }

  private resolveDocumentId(clientId: string): string {
    const contractContext = this.flowContext?.getContextData<ContractContextSnapshot>('contract');
    if (contractContext?.contractId) {
      return contractContext.contractId;
    }
    return `${clientId}-RFC`;
  }

  private schedulePersist(): void {
    clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persistContext(), 250);
  }

  private persistContext(): void {
    if (!this.flowContext) {
      return;
    }

    const snapshot: ProtectionContextSnapshot = {
      form: this.contractForm.getRawValue(),
      scenarios: [...this.scenarios],
      cobertura: this.cobertura,
      healthScore: this.healthScore,
      lastUpdated: Date.now(),
      state: { ...this.protectionState }
    };

    this.flowContext.saveContext('proteccion', snapshot, { breadcrumbs: ['Dashboard', 'Protección'] });
    this.flowContext.saveContext('protection', snapshot.state ?? this.protectionState, { breadcrumbs: ['Dashboard', 'Protección'] });
  }

  private restoreFromContext(): void {
    if (!this.flowContext) {
      return;
    }

    let stored = this.flowContext.getContextData<ProtectionContextSnapshot>('proteccion');
    if (!stored) {
      stored = this.flowContext.getContextData<ProtectionContextSnapshot>('protection');
    }
    if (!stored) {
      return;
    }

    if (stored.form) {
      this.contractForm.patchValue(stored.form, { emitEvent: false });
      this.contextClientId = stored.form?.clientId ?? this.contextClientId;
    }
    this.scenarios = stored.scenarios ?? [];
    this.cobertura = stored.cobertura ?? this.cobertura;
    this.healthScore = stored.healthScore ?? this.healthScore;
    if (stored.state) {
      this.protectionState = {
        applied: stored.state.applied ?? false,
        appliedAt: stored.state.appliedAt ?? null,
        coverageType: stored.state.coverageType ?? null,
        score: stored.state.score,
        advisorId: stored.state.advisorId,
        scoreSource: stored.state.scoreSource,
        fallbackUsed: stored.state.fallbackUsed,
        metadata: stored.state.metadata,
        contractId: stored.state.contractId ?? null,
      };
      if (stored.state.coverageType) {
        this.cobertura = this.formatCoverageLabel(stored.state.coverageType);
      }
      if (typeof stored.state.score === 'number') {
        this.healthScore = Math.round(stored.state.score);
      }
    }

    if (!this.contextClientId) {
      const clientContext = this.flowContext.getContextData<any>('client');
      this.contextClientId = clientContext?.clientId ?? this.contextClientId;
    }
    this.cdr.markForCheck();
  }


  // Minimalista Protection functionality
  async aplicarProteccion(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const coverageType = this.cobertura?.toLowerCase() === 'premium' ? 'premium' : 'standard';
    const options: ProtectionWorkflowOptions = {
      contractId: this.resolveContractId(),
      effectiveDate: new Date().toISOString().split('T')[0],
      coverageType,
      score: this.healthScore,
      scoreSource: 'manual',
      advisorId: this.resolveAdvisorId(),
      clientId: this.resolveClientId(),
      market: this.contractForm.value.market,
      metadata: {
        component: 'ProteccionComponent',
        formSnapshot: this.contractForm.getRawValue(),
      }
    };

    try {
      const result = await this.protectionWorkflow.applyProtection(options);
      this.applyProtectionResult(result);
      this.toast.success('Protección aplicada exitosamente');
    } catch (error) {
      this.toast.error('No se pudo aplicar la protección');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.schedulePersist();
    }
  }

  private applyProtectionResult(result: ProtectionFlowContextState): void {
    if (result.coverageType) {
      this.cobertura = this.formatCoverageLabel(result.coverageType);
    }
    if (typeof result.score === 'number') {
      this.healthScore = Math.round(result.score);
    }

    this.protectionState = {
      applied: result.applied,
      appliedAt: result.appliedAt,
      coverageType: result.coverageType ? this.formatCoverageLabel(result.coverageType) : this.cobertura,
      score: result.score ?? null,
      advisorId: result.advisorId ?? null,
      scoreSource: result.scoreSource,
      fallbackUsed: result.fallbackUsed,
      metadata: result.metadata,
      contractId: result.contractId ?? this.protectionState.contractId ?? null,
    };

    this.analytics.track('protection_apply_result', {
      applied: result.applied,
      coverageType: result.coverageType,
      score: result.score,
      scoreSource: result.scoreSource,
      fallbackUsed: result.fallbackUsed,
    });
  }

  private formatCoverageLabel(type: string | null): string {
    if (!type) {
      return this.cobertura;
    }
    const normalized = type.toLowerCase();
    if (normalized === 'premium') {
      return 'Premium';
    }
    if (normalized === 'group') {
      return 'Cobertura Grupal';
    }
    return 'Estándar';
  }

  private resolveContractId(): string | undefined {
    const documentos = this.flowContext?.getContextData<any>('documentos');
    const onboarding = this.flowContext?.getContextData<any>('onboarding-wizard');
    return (
      documentos?.flowContext?.contractId ||
      onboarding?.currentClient?.contractId ||
      this.protectionState?.contractId ||
      undefined
    );
  }

  private resolveAdvisorId(): string | null {
    const fromStorage = sessionStorage.getItem('advisorId') ?? localStorage.getItem('advisorId');
    if (fromStorage) {
      return fromStorage;
    }

    const onboarding = this.flowContext?.getContextData<any>('onboarding-wizard');
    if (onboarding?.advisorId) {
      return onboarding.advisorId;
    }

    return this.protectionState.advisorId ?? null;
  }


  openTool(tool: string): void {
    this.toast.info(`Abriendo herramienta: ${tool}`);
  }

  generateProtectionReport(): void {
    this.toast.info('Generando reporte PDF...');
    // In a real scenario, this would call the PDF service
    setTimeout(() => {
      this.toast.success('Reporte PDF generado');
    }, 1000);
  }

  // === Advanced Protection Logic (Original) ===
  computeScenarios(): void {
    if (!this.contractForm.valid) return;

    const values = this.contractForm.value;
    const market = values.market as Market;

    this.scenarios = this.protectionEngine.generateScenarios({
      currentBalance: values.currentBalance,
      originalPayment: values.originalPayment,
      remainingTerm: values.remainingTerm,
      market
    });

    this.cdr.detectChanges();
    this.toast.success(`${this.scenarios.length} escenarios calculados`);
    this.schedulePersist();
  }

  isScenarioEligible(scenario: ProtectionScenario): boolean {
    return scenario.eligible ?? false;
  }

  getNewMonthlyPayment(scenario: ProtectionScenario): number {
    return scenario.newPayment || 0;
  }

  getNewTerm(scenario: ProtectionScenario): number {
    return scenario.newTerm || 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getIrrPct(scenario: ProtectionScenario): number {
    return (scenario.irr || 0) * 100;
  }

  isTirOk(scenario: ProtectionScenario): boolean {
    return (scenario.irr || 0) >= 0.08; // 8% default minimum
  }

  isBelowMinPayment(scenario: ProtectionScenario): boolean {
    return (scenario.newPayment || 0) < 5000; // Example minimum payment
  }

  hasRejectionReasons(scenario: ProtectionScenario): boolean {
    return !this.isTirOk(scenario) || this.isBelowMinPayment(scenario);
  }
}
