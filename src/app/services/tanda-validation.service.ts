import { HttpClient } from '@angular/common/http';
import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { AnalyticsService } from './analytics.service';
import { MonitoringService } from './monitoring.service';
import { FlowContextService } from './flow-context.service';
import { PolicyClientType, PolicyMarket } from './market-policy.service';
import { Document } from '../models/types';

export type TandaValidationStatus = 'ok' | 'review' | 'error';

export interface TandaValidationConfig {
  market: PolicyMarket;
  clientType: PolicyClientType;
  members: number;
  contribution: number;
  rounds: number;
  rotationOrder?: number[];
  startDate?: string;
  advisorId?: string | null;
  groupName?: string | null;
}

export interface TandaScheduleEntry {
  round: number;
  memberIndex: number;
  payout: number;
  eta: string;
  memberId?: string;
}

export interface TandaFlowContextState {
  validationId: string;
  status: TandaValidationStatus;
  validatedAt: number;
  config: {
    market: PolicyMarket;
    clientType: PolicyClientType;
    members: number;
    contribution: number;
    rounds: number;
    startDate: string;
    rotationOrder: number[];
    advisorId?: string | null;
    groupName?: string | null;
  };
  warnings?: string[];
  schedule?: TandaScheduleEntry[];
  fallbackUsed?: boolean;
  metadata?: Record<string, any>;
  lastRosterUploadId?: string;
  lastRosterSyncedAt?: number;
}

interface RemoteValidationResponse {
  validationId: string;
  status: TandaValidationStatus;
  warnings?: string[];
  metrics?: Record<string, any>;
}

interface RemoteScheduleResponse {
  schedule: TandaScheduleEntry[];
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class TandaValidationService {
  private readonly contextKey = 'tanda';
  private readonly timeoutMs = 6000;
  private readonly stateSubject = new BehaviorSubject<TandaFlowContextState | null>(null);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpClient,
    private readonly analytics: AnalyticsService,
    private readonly monitoring: MonitoringService,
    @Optional() private readonly flowContext?: FlowContextService,
  ) {
    this.baseUrl = (typeof window !== 'undefined' && (window as any).__BFF_BASE__) || '/api';

    const stored = this.flowContext?.getContextData<TandaFlowContextState>(this.contextKey);
    if (stored) {
      this.stateSubject.next(stored);
    }
  }

  get state$() {
    return this.stateSubject.asObservable();
  }

  get current(): TandaFlowContextState | null {
    return this.stateSubject.value;
  }

  async validate(config: TandaValidationConfig): Promise<TandaFlowContextState> {
    const startedAt = Date.now();
    const payload = {
      market: config.market,
      clientType: config.clientType,
      members: config.members,
      contribution: config.contribution,
      rounds: config.rounds,
      rotation: config.rotationOrder ?? [],
      startDate: config.startDate ?? new Date().toISOString(),
      advisorId: config.advisorId ?? null,
      groupName: config.groupName ?? null,
    };

    let response: RemoteValidationResponse | null = null;
    let fallbackUsed = false;

    try {
      response = await firstValueFrom(
        this.http
          .post<RemoteValidationResponse>(`${this.baseUrl}/v1/tanda/validate`, payload)
          .pipe(timeout(this.timeoutMs))
      );
      this.monitoring.captureInfo(
        'tanda',
        'validate.success',
        'Validación de tanda completada',
        {
          validationId: response.validationId,
          status: response.status,
          members: config.members,
          rounds: config.rounds,
        },
        { notifyExternally: true, channels: ['datadog'] }
      );
    } catch (error) {
      fallbackUsed = true;
      const isTimeout = error instanceof TimeoutError;
      this.monitoring.captureWarning(
        'tanda',
        'validate',
        isTimeout ? 'Timeout al validar tanda, usando respuesta simulada' : 'Error al validar tanda, usando respuesta simulada',
        { config, error },
        { notifyExternally: true, channels: ['slack', 'datadog'] }
      );
      response = this.buildMockValidation(config);
    }

    const schedule = await this.obtainSchedule(response.validationId, config, fallbackUsed);

    const state: TandaFlowContextState = {
      validationId: response.validationId,
      status: response.status,
      warnings: response.warnings ?? [],
      validatedAt: Date.now(),
      fallbackUsed,
      config: {
        market: config.market,
        clientType: config.clientType,
        members: config.members,
        contribution: config.contribution,
        rounds: config.rounds,
        startDate: payload.startDate,
        rotationOrder: payload.rotation,
        advisorId: config.advisorId ?? null,
        groupName: config.groupName ?? null,
      },
      schedule,
      metadata: response.metrics,
    };

    this.analytics.track('tanda_validated', {
      validationId: state.validationId,
      status: state.status,
      warnings: state.warnings?.length ?? 0,
      members: config.members,
      rounds: config.rounds,
      fallbackUsed,
    });

    this.analytics.metric('tanda.validation.duration_ms', Date.now() - startedAt, {
      status: state.status,
      fallbackUsed,
      members: config.members,
      rounds: config.rounds,
    });

    this.persistState(state);
    return state;
  }

  private async obtainSchedule(validationId: string, config: TandaValidationConfig, fallbackUsed: boolean): Promise<TandaScheduleEntry[]> {
    if (!fallbackUsed) {
      try {
        const scheduleResponse = await firstValueFrom(
          this.http
            .post<RemoteScheduleResponse>(`${this.baseUrl}/v1/tanda/schedule`, {
              validationId,
              members: config.members,
              contribution: config.contribution,
              rounds: config.rounds,
              startDate: config.startDate ?? new Date().toISOString(),
            })
            .pipe(timeout(this.timeoutMs))
        );

        if (scheduleResponse?.schedule?.length) {
          this.monitoring.captureInfo(
            'tanda',
            'schedule.success',
            'Cronograma de tanda sincronizado con backend',
            {
              validationId,
              scheduleLength: scheduleResponse.schedule.length,
            },
            { notifyExternally: true, channels: ['datadog'] }
          );
          return scheduleResponse.schedule;
        }
      } catch (error) {
        this.monitoring.captureWarning(
          'tanda',
          'schedule',
          'Fallo al obtener cronograma desde backend, usando simulación local',
          {
            validationId,
            error,
          },
          { notifyExternally: true, channels: ['slack', 'datadog'] }
        );
      }
    }

    return this.buildMockSchedule(config);
  }

  private buildMockValidation(config: TandaValidationConfig): RemoteValidationResponse {
    const withinRange = config.members >= 5 && config.members <= 50;
    const status: TandaValidationStatus = withinRange ? 'ok' : 'review';

    const warnings: string[] = [];
    if (config.members < 5) {
      warnings.push('El número de integrantes está por debajo del mínimo sugerido (5).');
    }
    if (config.members > 50) {
      warnings.push('El número de integrantes excede el máximo soportado (50).');
    }
    if (config.contribution < 500) {
      warnings.push('La aportación individual es menor al mínimo recomendado (MXN 500).');
    }

    return {
      validationId: `mock-tanda-${Date.now()}`,
      status,
      warnings,
      metrics: {
        capacityScore: Math.min(1, config.members / 50),
        contributionAdequacy: config.contribution / 3500,
      }
    };
  }

  private buildMockSchedule(config: TandaValidationConfig): TandaScheduleEntry[] {
    const payout = config.contribution * config.members;
    const start = config.startDate ? new Date(config.startDate) : new Date();
    const rotation = config.rotationOrder && config.rotationOrder.length
      ? config.rotationOrder
      : Array.from({ length: config.members }, (_, idx) => idx + 1);

    return Array.from({ length: config.rounds }, (_, index) => {
      const memberIndex = rotation[index % rotation.length];
      const eta = new Date(start.getTime());
      eta.setMonth(start.getMonth() + index);

      return {
        round: index + 1,
        memberIndex,
        payout,
        eta: eta.toISOString(),
        memberId: `member-${memberIndex}`,
      };
    });
  }

  async syncRoster(documents: Document[], options: { clientId?: string } = {}): Promise<TandaFlowContextState | null> {
    const state = this.current;
    if (!state?.validationId) {
      return state;
    }

    const rosterPayload = this.buildRosterPayload(state.config.members, documents);
    if (!rosterPayload) {
      return state;
    }

    const payload = {
      validationId: state.validationId,
      clientId: options.clientId ?? null,
      roster: rosterPayload.members,
      consent: rosterPayload.consent
    };

    let uploadId = `mock-roster-${Date.now()}`;
    let fallbackUsed = false;

    try {
      const response = await firstValueFrom(
        this.http
          .post<{ uploadId: string }>(`${this.baseUrl}/v1/tanda/roster/upload`, payload)
          .pipe(timeout(this.timeoutMs))
      );
      if (response?.uploadId) {
        uploadId = response.uploadId;
      }
    } catch (error) {
      fallbackUsed = true;
      this.monitoring.captureWarning(
        'tanda',
        'roster_upload',
        'Error al sincronizar roster de tanda, almacenando identificador simulado',
        { validationId: state.validationId, error }
      );
    }

    const updated: TandaFlowContextState = {
      ...state,
      lastRosterUploadId: uploadId,
      lastRosterSyncedAt: Date.now(),
      metadata: {
        ...(state.metadata ?? {}),
        rosterUploadId: uploadId,
        rosterFallbackUsed: fallbackUsed
      }
    };

    this.analytics.track('tanda_roster_uploaded', {
      validationId: state.validationId,
      uploadId,
      fallbackUsed,
      members: state.config.members,
      contribution: state.config.contribution
    });

    this.persistState(updated);
    return updated;
  }

  private buildRosterPayload(members: number, documents: Document[]): { members: any[]; consent?: any } | null {
    if (!members || members <= 0) {
      return null;
    }

    const consentDoc = documents.find(doc => doc.id === 'doc-consent' && doc.status === 'Aprobado');
    const rosterDoc = documents.find(doc => doc.id === 'doc-roster' && doc.status === 'Aprobado');

    const rosterMembers = [] as Array<{
      memberIndex: number;
      ine: { documentId: string; fileUrl?: string | null };
      rfc: { documentId: string; fileUrl?: string | null };
    }>;

    for (let index = 1; index <= members; index++) {
      const ineId = `doc-ine-${index}`;
      const rfcId = `doc-rfc-${index}`;
      const ineDoc = documents.find(doc => doc.id === ineId && doc.status === 'Aprobado');
      const rfcDoc = documents.find(doc => doc.id === rfcId && doc.status === 'Aprobado');

      if (!ineDoc || !rfcDoc) {
        return null;
      }

      rosterMembers.push({
        memberIndex: index,
        ine: {
          documentId: ineDoc.id,
          fileUrl: ineDoc.fileUrl ?? null
        },
        rfc: {
          documentId: rfcDoc.id,
          fileUrl: rfcDoc.fileUrl ?? null
        }
      });
    }

    return {
      members: rosterMembers,
      consent: consentDoc
        ? {
            documentId: consentDoc.id,
            fileUrl: consentDoc.fileUrl ?? null
          }
        : rosterDoc
          ? {
              documentId: rosterDoc.id,
              fileUrl: rosterDoc.fileUrl ?? null
            }
          : undefined
    };
  }

  private persistState(state: TandaFlowContextState): void {
    this.stateSubject.next(state);
    if (this.flowContext) {
      this.flowContext.saveContext(this.contextKey, state, {
        breadcrumbs: ['Dashboard', 'Documentos', 'Tanda']
      });
    }
  }
}
