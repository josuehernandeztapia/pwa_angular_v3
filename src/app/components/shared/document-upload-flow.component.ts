import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Optional, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BusinessFlow, Document, DocumentStatus } from '../../models/types';
import { AviSimpleConfigService } from '../../services/avi-simple-config.service';
import { DocumentRequirementsService } from '../../services/document-requirements.service';
import { DocumentValidationService } from '../../services/document-validation.service';
import { OCRProgress, OCRResult, OCRService } from '../../services/ocr.service';
import { VoiceValidationService } from '../../services/voice-validation.service';
import { IconComponent } from './icon/icon.component';
import { ContextPanelComponent } from './context-panel/context-panel.component';
import { ErrorBoundaryService, BoundaryIssue, BoundaryIssueStatus, BoundaryIssueType } from '../../services/error-boundary.service';
import { FlowContextService } from '../../services/flow-context.service';
import { OfflineData, OfflineProcessResult, OfflineService } from '../../services/offline.service';
import { MarketPolicyContext, MarketPolicyMetadata, MarketPolicyService, TandaPolicyMetadata } from '../../services/market-policy.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AviBackendService } from '../../services/avi-backend.service';
import { DocumentUploadService, DocumentUploadEvent } from '../../services/document-upload.service';
import { TandaValidationService, TandaFlowContextState, TandaValidationConfig, TandaValidationStatus } from '../../services/tanda-validation.service';
import { ToastService } from '../../services/toast.service';
import { ContractContextSnapshot } from '../../models/contract-context';
import { ProtectionFlowContextState } from '../../services/protection-workflow.service';

interface FlowContext {
  clientId?: string;
  clientName?: string;
  source: 'nueva-oportunidad' | 'simulador' | 'cotizador';
  market: 'aguascalientes' | 'edomex';
  businessFlow: BusinessFlow;
  clientType: 'individual' | 'colectivo';
  saleType?: 'contado' | 'financiero';
  quotationData?: any;
  simulatorData?: any;
  collectiveMembers?: number;
  requiresIncomeProof?: boolean;
  monthlyPayment?: number;
  incomeThreshold?: number;
  incomeThresholdRatio?: number;
  tandaRules?: TandaPolicyMetadata;
  protection?: {
    required: boolean;
    coverageOptions: string[];
    defaultCoverage: string | null;
  };
  contract?: {
    id?: string | null;
    status?: 'pending' | 'ready' | 'blocked';
    lastUpdated?: number;
  };
}

interface DocumentCompletionStatus {
  totalDocs: number;
  completedDocs: number;
  pendingDocs: number;
  completionPercentage: number;
  allComplete: boolean;
}

interface DocumentFlowContextState {
  flowContext: FlowContext;
  completionStatus: DocumentCompletionStatus;
  documents?: Document[];
  policyContext?: MarketPolicyContext;
  policyMetadata?: MarketPolicyMetadata;
  voiceVerified?: boolean;
  showAVI?: boolean;
  aviAnalysis?: any;
  tandaValidation?: TandaFlowContextState | null;
  contractContext?: ContractContextSnapshot;
}

interface MemberDocumentSection {
  index: number;
  label: string;
  documents: Document[];
}

@Component({
  selector: 'app-document-upload-flow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, ContextPanelComponent],
  templateUrl: './document-upload-flow.component.html',
  styleUrls: ['./document-upload-flow.component.scss'],
})
export class DocumentUploadFlowComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private readonly contextKey = 'documentos';
  private policyContext: MarketPolicyContext | null = null;
  private restoredDocuments: Document[] | null = null;
  private policyMetadata: MarketPolicyMetadata | null = null;
  queuedRequests: OfflineData[] = [];
  private protectionBannerDismissed = false;
  private tandaBannerDismissed = false;
  private incomeBannerDismissed = false;
  private currentUploadingFile: File | null = null;

  @Input() flowContext!: FlowContext;
  @Output() flowComplete = new EventEmitter<any>();
  @Output() goBackRequested = new EventEmitter<void>();

  requiredDocuments: Document[] = [];
  completionStatus: DocumentCompletionStatus = {
    totalDocs: 0,
    completedDocs: 0,
    pendingDocs: 0,
    completionPercentage: 0,
    allComplete: false
  };

  // Voice Pattern & AVI
  voicePattern = '';
  showVoicePattern = false;
  isRecording = false;
  voiceVerified = false;
  showAVI = false;
  aviAnalysis: any = null;

  // OCR State - Minimalista
  ocrStatus: 'processing' | 'validated' | 'error' | null = null;
  showOCRStatus = false;
  isProcessingDocument = false;

  // Original OCR properties (preserved for compatibility)
  ocrProgress: OCRProgress = { status: 'idle', progress: 0, message: '' };
  ocrResult: OCRResult | null = null;
  showOCRPreview = false;
  currentUploadingDoc: Document | null = null;
  uploadProgress: Record<string, number> = {};
  private uploadingDocId: string | null = null;
  retryCounts: Record<string, number> = {};
  hashIndex: Map<string, { name: string; size: number; timestamp: number }> = new Map();
  private pendingHashes = new Map<string, string>();
  private serializedFiles = new Map<string, { base64: string; name: string; type: string; size: number }>();
  auditLog: Array<{ timestamp: Date; docName: string; action: string; meta?: any }> = [];

  isOffline = !navigator.onLine;
  pendingOfflineDocs = 0;
  syncMessage: string | null = null;
  private syncMessageTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly queueActionInProgress = new Set<string>();
  primaryDocuments: Document[] = [];
  memberDocumentSections: MemberDocumentSection[] = [];
  tandaValidationState: TandaFlowContextState | null = null;
  private lastTandaConfigKey: string | null = null;
  private lastTandaRosterHash: string | null = null;
  boundaryIssues: BoundaryIssue[] = [];
  private lastTelemetryHash = '';

  getStatusLineClasses(status: 'processing' | 'validated' | 'error'): Record<string, boolean> {
    return {
      'document-upload__status-line--processing': status === 'processing',
      'document-upload__status-line--validated': status === 'validated',
      'document-upload__status-line--error': status === 'error'
    };
  }

  getStatusDotClasses(status: 'processing' | 'validated' | 'error'): Record<string, boolean> {
    return {
      'document-upload__status-dot--processing': status === 'processing',
      'document-upload__status-dot--validated': status === 'validated',
      'document-upload__status-dot--error': status === 'error'
    };
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private documentRequirements: DocumentRequirementsService,
    private documentValidation: DocumentValidationService,
    private voiceValidation: VoiceValidationService,
    private aviConfig: AviSimpleConfigService,
    private ocrService: OCRService,
    private errorBoundary: ErrorBoundaryService,
    private marketPolicy: MarketPolicyService,
    private offline: OfflineService,
    private analytics: AnalyticsService,
    private aviBackend: AviBackendService,
    private documentUpload: DocumentUploadService,
    private tandaValidation: TandaValidationService,
    private toast: ToastService,
    @Optional() private flowContextService?: FlowContextService
  ) {}

  // Expose enums to template
  protected readonly DocumentStatus = DocumentStatus;

  ngOnInit() {
    if (!this.flowContext && this.flowContextService) {
      this.flowContext = this.restoreFlowContextFromService() ?? this.flowContext;
    }

    // If no explicit input provided, attempt to derive from query params for deep-linking
    if (!this.flowContext) {
      try {
        const params = new URLSearchParams(window.location.search);
        const market = (params.get('market') as any) || 'aguascalientes';
        const clientTypeParam = (params.get('clientType') || '').toLowerCase();
        const clientType = (clientTypeParam === 'colectivo' ? 'colectivo' : 'individual') as any;
        const source = (params.get('source') as any) || 'nueva-oportunidad';
        const businessFlow = (params.get('businessFlow') as any) || BusinessFlow.VentaPlazo;
        const saleTypeParam = (params.get('saleType') || '').toLowerCase();
        const saleType = saleTypeParam === 'contado' ? 'contado' : 'financiero';
        const clientId = params.get('clientId') || undefined;
        const clientName = params.get('clientName') || undefined;
        this.flowContext = { market, clientType, source, businessFlow, saleType, clientId, clientName } as any;
      } catch {}
    }

    this.updateBreadcrumbs();
    this.persistFlowState();
    this.initializeFlow();

    this.errorBoundary.issues$
      .pipe(takeUntil(this.destroy$))
      .subscribe(issues => {
        this.boundaryIssues = issues;
        this.trackTelemetry(issues);
      });

    this.offline.online$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOnline => {
        this.isOffline = !isOnline;
        if (isOnline && this.pendingOfflineDocs > 0) {
          this.showSyncMessage('Conexión restablecida. Sincronizando documentos pendientes…');
        }
        this.trackTelemetry(this.boundaryIssues);
      });

    this.offline.pendingRequests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(requests => {
        const relevant = requests.filter(request => this.isDocumentUploadRequest(request));
        this.pendingOfflineDocs = relevant.length;
        this.queuedRequests = relevant;
        this.syncQueuedDocumentStatuses();
        this.trackTelemetry(this.boundaryIssues);
        this.persistFlowState();
      });

    this.offline.processedRequests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.handleOfflineProcessResult(result);
        this.trackTelemetry(this.boundaryIssues);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.syncMessageTimeout) {
      clearTimeout(this.syncMessageTimeout);
      this.syncMessageTimeout = null;
    }

    // Cleanup OCR worker
    this.ocrService.terminateWorker();
    this.persistFlowState();
  }

  private async initializeFlow() {
    if (!this.flowContext) return;

    this.protectionBannerDismissed = false;
    this.tandaBannerDismissed = false;
    this.incomeBannerDismissed = false;

    // Load required documents based on flow context
    const saleType = this.flowContext.saleType ?? 'financiero';
    this.flowContext.saleType = saleType;

    const requiresIncomeProof = this.determineIncomeProofRequirement();
    this.flowContext.requiresIncomeProof = requiresIncomeProof;

    const collectiveSize = this.determineCollectiveSize();
    if (typeof collectiveSize === 'number') {
      this.flowContext.collectiveMembers = collectiveSize;
    } else {
      this.flowContext.collectiveMembers = undefined;
    }

    this.policyContext = this.buildPolicyContext(saleType, requiresIncomeProof, collectiveSize);
    this.policyMetadata = this.marketPolicy.getPolicyMetadata(this.policyContext);

    this.initializeTandaValidation();

    this.documentRequirements.getDocumentRequirements({
      market: this.flowContext.market,
      saleType,
      businessFlow: this.flowContext.businessFlow,
      clientType: this.flowContext.clientType,
      requiresIncomeProof,
      collectiveSize
    }).pipe(takeUntil(this.destroy$)).subscribe((docs: Document[]) => {
      let finalDocs = docs;
      if (this.restoredDocuments?.length) {
        const restoredMap = new Map(this.restoredDocuments.map(doc => [doc.id, doc]));
        finalDocs = docs.map(doc => {
          const restored = restoredMap.get(doc.id);
          return restored ? { ...doc, ...restored } : doc;
        });
        this.restoredDocuments = null;
      }
      finalDocs = this.applyMetadataEffects(finalDocs);
      this.requiredDocuments = finalDocs;
      this.syncQueuedDocumentStatuses();
      this.updateCompletionStatus();
    });

    // Initialize Voice Pattern for complex flows (not VentaDirecta)
    if (this.shouldUseVoicePattern()) {
      this.initializeVoicePattern();
    }

    // Initialize AVI for high-risk flows
    if (this.shouldUseAVI()) {
      this.initializeAVI();
    }
  }

  private initializeTandaValidation(): void {
    if (!this.policyMetadata?.tanda) {
      return;
    }

    this.tandaValidation.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.tandaValidationState = state;
        if (state) {
          this.lastTandaConfigKey = this.configKeyForState(state);
        }
        this.persistFlowState();
      });

    const config = this.buildTandaValidationConfig();
    if (!config) {
      return;
    }

    const desiredKey = this.configKeyFor(config);
    if (this.lastTandaConfigKey === desiredKey) {
      return;
    }

    const current = this.tandaValidation.current;
    if (!current || this.hasDifferentTandaConfig(current, config)) {
      this.lastTandaConfigKey = desiredKey;
      this.analytics.track('tanda_validation_triggered', {
        members: config.members,
        rounds: config.rounds,
        contribution: config.contribution,
      });
      this.tandaValidation
        .validate(config)
        .catch(() => {
          this.lastTandaConfigKey = null;
        });
    }
  }

  private buildTandaValidationConfig(): TandaValidationConfig | null {
    if (!this.policyMetadata?.tanda || !this.flowContext) {
      return null;
    }

    const rules = this.policyMetadata.tanda;
    const members = this.determineCollectiveSize() ?? rules.minMembers;
    if (!members || members <= 0) {
      return null;
    }

    const contributionCandidate = this.resolveTandaContribution();
    const roundsCandidate = this.resolveTandaRounds();

    const contribution = Math.min(
      rules.maxContribution,
      Math.max(rules.minContribution, contributionCandidate ?? rules.minContribution)
    );
    const rounds = Math.min(
      rules.maxRounds,
      Math.max(rules.minRounds, roundsCandidate ?? rules.minRounds)
    );

    return {
      market: this.flowContext.market,
      clientType: this.flowContext.clientType,
      members,
      contribution,
      rounds,
      rotationOrder: this.resolveTandaRotation(members),
      startDate: this.resolveTandaStartDate(),
      advisorId: this.resolveAdvisorId(),
      groupName: this.resolveGroupName(),
    };
  }

  private hasDifferentTandaConfig(state: TandaFlowContextState, config: TandaValidationConfig): boolean {
    return (
      state.config.members !== config.members ||
      Math.round(state.config.contribution) !== Math.round(config.contribution) ||
      state.config.rounds !== config.rounds
    );
  }

  private configKeyFor(config: TandaValidationConfig): string {
    return [config.members, Math.round(config.contribution), config.rounds].join('|');
  }

  private configKeyForState(state: TandaFlowContextState | null): string | null {
    if (!state) {
      return null;
    }
    return this.configKeyFor({
      market: state.config.market,
      clientType: state.config.clientType,
      members: state.config.members,
      contribution: state.config.contribution,
      rounds: state.config.rounds,
      rotationOrder: state.config.rotationOrder,
      startDate: state.config.startDate,
      advisorId: state.config.advisorId,
      groupName: state.config.groupName,
    });
  }

  get tandaValidationStatus(): TandaValidationStatus | null {
    return this.tandaValidationState?.status ?? null;
  }

  getTandaStatusLabel(status: TandaValidationStatus): string {
    switch (status) {
      case 'ok':
        return 'Aprobada';
      case 'review':
        return 'En revisión';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  }

  private resolveTandaContribution(): number | undefined {
    const quotation = (this.flowContext?.quotationData ?? {}) as any;
    const simulator = (this.flowContext?.simulatorData ?? {}) as any;

    const candidates = [
      quotation?.monthlyContribution,
      quotation?.monthlyPaymentPerMember,
      quotation?.contribution,
      quotation?.aporte,
      quotation?.scenario?.monthlyContribution,
      quotation?.scenario?.monthlyAmount,
      simulator?.monthlyContribution,
      simulator?.aporte,
    ];

    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
      }
    }

    return undefined;
  }

  private resolveTandaRounds(): number | undefined {
    const quotation = (this.flowContext?.quotationData ?? {}) as any;
    const simulator = (this.flowContext?.simulatorData ?? {}) as any;

    const candidates = [
      quotation?.rounds,
      quotation?.scenario?.rounds,
      quotation?.scenario?.horizonMonths,
      quotation?.timeline?.length,
      simulator?.rounds,
      simulator?.horizonMonths,
    ];

    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.round(value);
      }
    }

    return undefined;
  }

  private resolveTandaRotation(members: number): number[] {
    const quotation = (this.flowContext?.quotationData ?? {}) as any;
    const rotation = quotation?.rotationOrder;
    if (Array.isArray(rotation) && rotation.every(item => typeof item === 'number')) {
      return rotation.slice(0, members);
    }

    return Array.from({ length: members }, (_, index) => index + 1);
  }

  private resolveTandaStartDate(): string {
    const quotation = (this.flowContext?.quotationData ?? {}) as any;
    const start = quotation?.startDate ?? quotation?.scenario?.startDate;
    if (start) {
      const parsed = new Date(start);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }

    return new Date().toISOString();
  }

  private resolveAdvisorId(): string | null {
    const onboarding = this.flowContextService?.getContextData<any>('onboarding-wizard');
    if (onboarding?.advisorId) {
      return onboarding.advisorId;
    }
    const stored = sessionStorage.getItem('advisorId') ?? localStorage.getItem('advisorId');
    return stored ?? null;
  }

  private resolveGroupName(): string | null {
    const quotation = (this.flowContext?.quotationData ?? {}) as any;
    return quotation?.groupName ?? quotation?.scenario?.groupName ?? null;
  }

  private cloneTandaState(state: TandaFlowContextState | null): TandaFlowContextState | undefined {
    if (!state) {
      return undefined;
    }

    try {
      const cloner = (globalThis as any).structuredClone;
      if (typeof cloner === 'function') {
        return cloner(state);
      }
    } catch {
      // Ignore and fallback to JSON copy
    }

    try {
      return JSON.parse(JSON.stringify(state)) as TandaFlowContextState;
    } catch {
      return {
        ...state,
        config: { ...state.config },
        schedule: state.schedule ? state.schedule.map(entry => ({ ...entry })) : state.schedule,
        warnings: state.warnings ? [...state.warnings] : state.warnings,
        metadata: state.metadata ? { ...state.metadata } : state.metadata,
      };
    }
  }

  private buildAviTranscript(): string {
    const clientName = this.flowContext?.clientName ?? 'Cliente';
    const market = this.flowContext?.market ?? 'mercado';
    const completed = `${this.completionStatus.completedDocs}/${Math.max(1, this.completionStatus.totalDocs)}`;
    const timestamp = new Date().toISOString();
    return `Sesión de verificación con ${clientName} (${market}). Documentos validados ${completed}. Registro generado ${timestamp}.`;
  }

  private createMockAudioBlob(transcript: string): Blob {
    const header = 'MOCK_AUDIO_SIMULATION';
    return new Blob([`${header}\n${transcript}`], { type: 'audio/webm' });
  }

  private mapDecisionToRisk(decision: string | undefined): string {
    switch (decision) {
      case 'NO_GO':
        return 'HIGH';
      case 'REVIEW':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  private buildUploadMetadata(document: Document, extra: Record<string, any> = {}): Record<string, any> {
    return {
      documentName: document.name,
      market: this.flowContext?.market,
      clientType: this.flowContext?.clientType,
      businessFlow: this.flowContext?.businessFlow,
      source: this.flowContext?.source,
      requiresIncomeProof: this.flowContext?.requiresIncomeProof ?? false,
      collectiveMembers: this.flowContext?.collectiveMembers,
      ...extra,
    };
  }

  private async uploadToBackend(
    file: File,
    document: Document,
    hash?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const clientId = this.flowContext?.clientId;
    if (!clientId) {
      this.analytics.track('documents_upload_skipped', {
        reason: 'missing_client_id',
        documentId: document.id,
      });
      throw new Error('No se puede subir el documento: falta clientId.');
    }

    const payloadMetadata = this.buildUploadMetadata(document, metadata);

    this.analytics.track('documents_upload_started', {
      documentId: document.id,
      clientId,
      fileSize: file.size,
    });

    await new Promise<void>((resolve, reject) => {
      const upload$ = this.documentUpload.uploadDocument({
        file,
        clientId,
        documentId: document.id,
        metadata: payloadMetadata,
        hash,
      });

      const subscription = upload$.subscribe({
        next: (event: DocumentUploadEvent) => {
          if (event.type === 'hash-computed') {
            if (event.hash && !this.pendingHashes.has(document.id)) {
              this.pendingHashes.set(document.id, event.hash);
            }
          }

          if (event.type === 'progress') {
            this.uploadProgress[document.id] = event.percentage;
          }

          if (event.type === 'completed') {
            this.uploadProgress[document.id] = 100;
            this.analytics.track('documents_upload_completed', {
              documentId: document.id,
              clientId,
              fileSize: file.size,
              mimeType: file.type,
            });
            this.addAudit('upload_backend_completed', document.name, {
              hash: event.hash,
              size: file.size,
            });
          }

          if (event.type === 'error') {
            this.addAudit('upload_backend_error', document.name, { message: event.message });
          }
        },
        error: error => {
          delete this.uploadProgress[document.id];
          this.analytics.track('documents_upload_failed', {
            documentId: document.id,
            clientId,
            message: (error as Error)?.message ?? 'unknown',
          });
          this.addAudit('upload_backend_failed', document.name, {
            message: (error as Error)?.message ?? 'unknown',
          });
          subscription.unsubscribe();
          reject(error);
        },
        complete: () => {
          delete this.uploadProgress[document.id];
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  get telemetryStats(): { total: number; queued: number; processing: number; ocrFailures: number; networkTimeouts: number; offlineQueued: number } {
    return this.telemetryStatsFromIssues(this.boundaryIssues);
  }

  get telemetryIssues(): BoundaryIssue[] {
    return this.boundaryIssues;
  }

  get showTelemetryPanel(): boolean {
    const stats = this.telemetryStats;
    return stats.total > 0 || stats.offlineQueued > 0;
  }

  async retryTelemetryIssue(issueId: string): Promise<void> {
    try {
      await this.errorBoundary.retryIssue(issueId);
    } catch (error) {
      this.toast.error('No se pudo reintentar la incidencia. Intenta más tarde.');
      throw error;
    }
  }

  dismissTelemetryIssue(issueId: string): void {
    this.errorBoundary.dismissIssue(issueId, 'Incidencia descartada.');
  }

  isQueueActionBusy(queueId: string): boolean {
    return this.queueActionInProgress.has(queueId);
  }

  async retryQueuedRequest(queueId: string): Promise<void> {
    if (this.queueActionInProgress.has(queueId)) {
      return;
    }

    this.queueActionInProgress.add(queueId);
    try {
      const success = await this.offline.replayRequest(queueId);
      if (success) {
        this.toast.success('Documento enviado nuevamente.');
      }
    } catch (error) {
      this.toast.error('No se pudo sincronizar el documento. Reintenta más tarde.');
    } finally {
      this.queueActionInProgress.delete(queueId);
    }
  }

  discardQueuedRequest(queueId: string): void {
    if (this.queueActionInProgress.has(queueId)) {
      return;
    }

    const removed = this.offline.discardRequest(queueId);
    if (removed) {
      this.toast.info('Se descartó la acción en cola.');
    }
  }

  queueDocumentLabel(request: OfflineData): string {
    const metaName = request.data?.metadata?.documentName;
    if (typeof metaName === 'string' && metaName.trim().length > 0) {
      return metaName;
    }
    if (typeof request.data?.fileName === 'string') {
      return request.data.fileName;
    }
    if (typeof request.data?.documentId === 'string') {
      return request.data.documentId;
    }
    return request.endpoint || 'Acción en cola';
  }

  trackQueuedRequest(_index: number, request: OfflineData): string {
    return request.id;
  }

  formatTelemetryType(type: BoundaryIssueType): string {
    switch (type) {
      case 'network-timeout':
        return 'Timeout de red';
      case 'ocr-failure':
        return 'Error de OCR';
      case 'offline-queued':
        return 'Acción en cola offline';
      default:
        return 'Incidencia';
    }
  }

  formatTelemetryStatus(status: BoundaryIssueStatus): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'queued':
        return 'En cola';
      case 'processing':
        return 'En proceso';
      case 'resolved':
        return 'Resuelta';
      case 'failed':
        return 'Fallida';
      default:
        return status;
    }
  }

  private trackTelemetry(issues: BoundaryIssue[]): void {
    const hash = this.computeTelemetryHash(issues);
    if (hash === this.lastTelemetryHash) {
      return;
    }
    this.lastTelemetryHash = hash;
    const stats = this.telemetryStatsFromIssues(issues);
    this.analytics.track('documents_telemetry_snapshot', {
      totalIssues: stats.total,
      queuedIssues: stats.queued,
      processingIssues: stats.processing,
      offlineQueued: stats.offlineQueued,
      ocrFailures: stats.ocrFailures,
      networkTimeouts: stats.networkTimeouts,
    });
  }

  private telemetryStatsFromIssues(issues: BoundaryIssue[]): { total: number; queued: number; processing: number; ocrFailures: number; networkTimeouts: number; offlineQueued: number } {
    const queued = issues.filter(issue => issue.status === 'queued').length;
    const processing = issues.filter(issue => issue.status === 'processing').length;
    const ocrFailures = issues.filter(issue => issue.type === 'ocr-failure').length;
    const networkTimeouts = issues.filter(issue => issue.type === 'network-timeout').length;
    return {
      total: issues.length,
      queued,
      processing,
      ocrFailures,
      networkTimeouts,
      offlineQueued: this.pendingOfflineDocs,
    };
  }

  private computeTelemetryHash(issues: BoundaryIssue[]): string {
    const issueSignature = issues
      .map(issue => `${issue.type}:${issue.status}`)
      .sort()
      .join('|');
    return `${issueSignature}|offline:${this.pendingOfflineDocs}`;
  }

  private restoreFlowContextFromService(): FlowContext | null {
    if (!this.flowContextService) {
      return null;
    }

    const stored = this.flowContextService.getContextData<DocumentFlowContextState>(this.contextKey);
    if (stored?.flowContext) {
      if (stored.completionStatus) {
        this.completionStatus = stored.completionStatus;
      }
      if (Array.isArray(stored.documents) && stored.documents.length) {
        this.restoredDocuments = stored.documents.map(doc => ({ ...doc }));
        this.requiredDocuments = this.restoredDocuments.map(doc => ({ ...doc }));
        this.syncQueuedDocumentStatuses();
        this.updateDocumentCollections();
      }
      if (stored.policyContext) {
        this.policyContext = { ...stored.policyContext };
      }
      if (stored.policyMetadata) {
        this.policyMetadata = {
          ocrThreshold: stored.policyMetadata.ocrThreshold,
          expiryRules: stored.policyMetadata.expiryRules
            ? { ...stored.policyMetadata.expiryRules }
            : undefined,
          protection: stored.policyMetadata.protection
            ? {
                ...stored.policyMetadata.protection,
                coverageOptions: [...stored.policyMetadata.protection.coverageOptions]
              }
            : undefined,
          tanda: stored.policyMetadata.tanda
            ? { ...stored.policyMetadata.tanda }
            : undefined,
          income: stored.policyMetadata.income
            ? { ...stored.policyMetadata.income }
            : undefined,
        };
      }
      if (!this.policyMetadata && this.policyContext) {
        this.policyMetadata = this.marketPolicy.getPolicyMetadata(this.policyContext);
      }
      if (stored.voiceVerified !== undefined) {
        this.voiceVerified = stored.voiceVerified;
      }
      if (stored.showAVI !== undefined) {
        this.showAVI = stored.showAVI;
      }
      if (stored.aviAnalysis !== undefined) {
        this.aviAnalysis = stored.aviAnalysis;
      }
      if (stored.tandaValidation) {
        this.tandaValidationState = stored.tandaValidation;
        this.lastTandaConfigKey = this.configKeyForState(stored.tandaValidation);
      }
      return stored.flowContext;
    }

    const onboarding = this.flowContextService.getContextData<any>('onboarding-wizard');
    if (onboarding) {
      const mapped = this.mapOnboardingContext(onboarding);
      if (mapped) {
        return mapped;
      }
    }

    const cotizador = this.flowContextService.getContextData<any>('cotizador');
    if (cotizador) {
      const mapped = this.mapCotizadorContext(cotizador);
      if (mapped) {
        return mapped;
      }
    }

    const simulador = this.flowContextService.getContextData<any>('simulador');
    if (simulador) {
      const mapped = this.mapSimulatorContext(simulador);
      if (mapped) {
        return mapped;
      }
    }

    return null;
  }

  private mapOnboardingContext(snapshot: any): FlowContext | null {
    if (!snapshot) {
      return null;
    }

    const form = snapshot.form ?? {};
    const market = (form.market as FlowContext['market']) || 'aguascalientes';
    const clientType = (form.clientType as FlowContext['clientType']) || 'individual';
    const saleType = (form.saleType as 'contado' | 'financiero' | undefined) ?? 'financiero';

    const businessFlow = saleType === 'contado'
      ? BusinessFlow.VentaDirecta
      : clientType === 'colectivo'
        ? BusinessFlow.CreditoColectivo
        : BusinessFlow.VentaPlazo;

    const collectiveMembers = Array.isArray(form.memberNames) ? form.memberNames.filter(Boolean).length : undefined;

    return {
      market,
      clientType,
      businessFlow,
      saleType,
      source: 'nueva-oportunidad',
      clientId: snapshot.currentClient?.id,
      clientName: snapshot.currentClient?.name || undefined,
      collectiveMembers
    };
  }

  private mapCotizadorContext(context: any): FlowContext | null {
    if (!context) {
      return null;
    }

    const market = (context.market as FlowContext['market']) || 'aguascalientes';
    const clientType = (context.clientType as FlowContext['clientType']) || 'individual';
    const businessFlow = clientType === 'colectivo'
      ? BusinessFlow.CreditoColectivo
      : BusinessFlow.VentaPlazo;

    const collectiveMembers = typeof context.collectiveMembers === 'number'
      ? context.collectiveMembers
      : Array.isArray(context.members)
        ? context.members.length
        : undefined;

    return {
      market,
      clientType,
      businessFlow,
      saleType: (context.saleType as FlowContext['saleType']) ?? 'financiero',
      source: 'cotizador',
      clientId: context.clientId,
      clientName: context.clientName || undefined,
      quotationData: context,
      collectiveMembers
    };
  }

  private mapSimulatorContext(context: any): FlowContext | null {
    if (!context) {
      return null;
    }

    const market = (context.market as FlowContext['market']) || 'aguascalientes';
    const clientType = (context.clientType as FlowContext['clientType']) || 'individual';
    const saleType = (context.saleType as FlowContext['saleType']) ?? 'financiero';
    const businessFlow = context.businessFlow as BusinessFlow
      ?? (clientType === 'colectivo' ? BusinessFlow.CreditoColectivo : BusinessFlow.VentaPlazo);

    const collectiveMembers = typeof context.collectiveMembers === 'number'
      ? context.collectiveMembers
      : typeof context.memberCount === 'number'
        ? context.memberCount
        : Array.isArray(context.members)
          ? context.members.length
          : undefined;

    return {
      market,
      clientType,
      businessFlow,
      saleType,
      source: 'simulador',
      simulatorData: context.simulatorData ?? context,
      quotationData: context.quotationData ?? context,
      collectiveMembers,
      requiresIncomeProof: context.requiresIncomeProof,
      monthlyPayment: context.monthlyPayment,
      incomeThreshold: context.incomeThreshold,
      incomeThresholdRatio: context.incomeThresholdRatio,
      clientId: context.clientId,
      clientName: context.clientName,
    };
  }

  private persistFlowState(): void {
    if (!this.flowContextService || !this.flowContext) {
      return;
    }

    const contractContext = this.buildContractContext();
    const flowContractStatus = contractContext ? this.resolveContractStatus(contractContext) : this.flowContext.contract?.status;
    const flowContextSnapshot: FlowContext = {
      ...this.flowContext,
      contract: {
        id: contractContext?.contractId ?? this.flowContext.contract?.id ?? null,
        status: flowContractStatus ?? 'pending',
        lastUpdated: contractContext?.updatedAt ?? Date.now()
      }
    };

    this.flowContext = flowContextSnapshot;

    const payload: DocumentFlowContextState = {
      flowContext: flowContextSnapshot,
      completionStatus: this.completionStatus,
      documents: this.requiredDocuments.map(doc => ({ ...doc })),
      policyContext: this.policyContext ? { ...this.policyContext } : undefined,
      policyMetadata: this.policyMetadata
        ? {
            ocrThreshold: this.policyMetadata.ocrThreshold,
            expiryRules: this.policyMetadata.expiryRules
              ? { ...this.policyMetadata.expiryRules }
              : undefined,
            protection: this.policyMetadata.protection
              ? {
                  ...this.policyMetadata.protection,
                  coverageOptions: [...this.policyMetadata.protection.coverageOptions]
                }
              : undefined,
            tanda: this.policyMetadata.tanda
              ? { ...this.policyMetadata.tanda }
              : undefined,
            income: this.policyMetadata.income
              ? { ...this.policyMetadata.income }
              : undefined,
          }
        : undefined,
      voiceVerified: this.voiceVerified,
      showAVI: this.showAVI,
      aviAnalysis: this.aviAnalysis,
      tandaValidation: this.cloneTandaState(this.tandaValidationState),
      contractContext: contractContext ? { ...contractContext } : undefined
    };
    this.flowContextService.saveContext(this.contextKey, payload, {
      breadcrumbs: this.buildBreadcrumbs()
    });

    this.persistContractGuardContext(contractContext);
  }

  private buildContractContext(): ContractContextSnapshot | null {
    if (!this.flowContext) {
      return null;
    }

    const protectionState = this.flowContextService?.getContextData<ProtectionFlowContextState>('protection');
    const pendingUploads = this.offline
      ? this.offline
          .getPendingRequestsSnapshot()
          .filter(request => request.endpoint === '/documents/upload').length
      : 0;

    const aviStatus = typeof this.aviAnalysis?.status === 'string'
      ? this.aviAnalysis.status
      : this.showAVI
        ? 'pending'
        : 'skipped';

    const aviDecision = typeof this.aviAnalysis?.decision === 'string'
      ? this.aviAnalysis.decision
      : null;

    return {
      clientId: this.flowContext.clientId,
      contractId: this.flowContext.contract?.id ?? null,
      market: this.flowContext.market,
      businessFlow: this.flowContext.businessFlow,
      source: this.flowContext.source,
      documentsComplete: this.completionStatus.allComplete,
      aviStatus,
      aviDecision,
      voiceVerified: this.voiceVerified,
      requiresVoiceVerification: this.showVoicePattern,
      protectionRequired: this.policyMetadata?.protection?.required ?? false,
      protectionApplied: !!protectionState?.applied,
      pendingOfflineRequests: pendingUploads,
      updatedAt: Date.now()
    };
  }

  private resolveContractStatus(context: ContractContextSnapshot): 'pending' | 'ready' | 'blocked' {
    if (!context.documentsComplete || context.pendingOfflineRequests > 0) {
      return 'pending';
    }

    if (context.requiresVoiceVerification && !context.voiceVerified) {
      return 'pending';
    }

    const decision = context.aviDecision?.toLowerCase();
    if (decision === 'no_go') {
      return 'blocked';
    }

    if (context.protectionRequired && !context.protectionApplied) {
      return 'blocked';
    }

    return 'ready';
  }

  private persistContractGuardContext(context: ContractContextSnapshot | null): void {
    if (!context || !this.flowContextService) {
      return;
    }

    this.flowContextService.saveContext('contract', context, {
      breadcrumbs: ['Documentos', 'Contratos']
    });
  }

  private buildBreadcrumbs(): string[] {
    const crumbs = ['Dashboard', 'Documentos'];
    if (this.flowContext?.clientName) {
      crumbs.push(this.flowContext.clientName);
    } else if (this.flowContext?.clientId) {
      crumbs.push(`Cliente ${this.flowContext.clientId}`);
    }
    return crumbs;
  }

  private updateBreadcrumbs(): void {
    if (!this.flowContextService) {
      return;
    }
    this.flowContextService.setBreadcrumbs(this.buildBreadcrumbs());
  }

  private shouldUseVoicePattern(): boolean {
    // Voice Pattern for complex flows (exclude VentaDirecta)
    return this.flowContext.businessFlow !== BusinessFlow.VentaDirecta &&
           (this.flowContext.businessFlow === BusinessFlow.VentaPlazo ||
            this.flowContext.businessFlow === BusinessFlow.CreditoColectivo ||
            this.flowContext.market === 'edomex');
  }

  private initializeVoicePattern() {
    this.voicePattern = this.voiceValidation.generateVoicePattern();
    this.showVoicePattern = true;
  }

  private shouldUseAVI(): boolean {
    // Use AVI for complex flows (exclude VentaDirecta/Contado)
    return this.flowContext.businessFlow !== BusinessFlow.VentaDirecta &&
           (this.flowContext.clientType === 'colectivo' || 
            this.flowContext.businessFlow === BusinessFlow.CreditoColectivo ||
            this.flowContext.businessFlow === BusinessFlow.VentaPlazo);
  }

  private initializeAVI() {
    this.showAVI = true;
    this.aviAnalysis = {
      status: 'pending',
      confidence: 0,
      fraudRisk: 'UNKNOWN'
    };
    this.persistFlowState();
  }

  private determineIncomeProofRequirement(): boolean {
    if (!this.flowContext) {
      return false;
    }

    if (typeof this.flowContext.requiresIncomeProof === 'boolean') {
      return this.flowContext.requiresIncomeProof;
    }

    const quotation = this.flowContext.quotationData ?? {};
    if (typeof quotation.requiresIncomeProof === 'boolean') {
      return quotation.requiresIncomeProof;
    }

    const monthlyPayment = quotation.monthlyPayment ?? quotation.pmt ?? quotation.monthlyQuota;
    const incomeThreshold = quotation.incomeThreshold ?? quotation.requiredIncomeThreshold;
    if (typeof monthlyPayment === 'number' && Number.isFinite(monthlyPayment)) {
      this.flowContext.monthlyPayment = monthlyPayment;

      if (typeof incomeThreshold === 'number' && Number.isFinite(incomeThreshold)) {
        this.flowContext.incomeThreshold = incomeThreshold;
        this.flowContext.incomeThresholdRatio = this.policyContext ? this.marketPolicy.getIncomeThreshold(this.policyContext) : undefined;
        this.analytics.track('documents_income_threshold_resolved', {
          source: 'quotation',
          monthlyPayment,
          threshold: incomeThreshold,
          ratio: this.flowContext.incomeThresholdRatio ?? null,
        });
        return monthlyPayment > incomeThreshold;
      }

      if (this.policyContext) {
        const ratio = this.marketPolicy.getIncomeThreshold(this.policyContext);
        if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0) {
          const derivedThreshold = monthlyPayment * ratio;
          this.flowContext.incomeThreshold = derivedThreshold;
          this.flowContext.incomeThresholdRatio = ratio;
          this.analytics.track('documents_income_threshold_resolved', {
            source: 'policy',
            monthlyPayment,
            threshold: derivedThreshold,
            ratio,
          });
          return monthlyPayment > derivedThreshold;
        }
      }
    }

    return false;
  }

  private determineCollectiveSize(): number | undefined {
    if (!this.flowContext) {
      return undefined;
    }

    if (typeof this.flowContext.collectiveMembers === 'number') {
      return this.flowContext.collectiveMembers;
    }

    const quotation = this.flowContext.quotationData ?? {};
    if (Array.isArray(quotation.members)) {
      return quotation.members.length;
    }
    if (Array.isArray(quotation.groupMembers)) {
      return quotation.groupMembers.length;
    }

    const simulator = this.flowContext.simulatorData ?? {};
    if (Array.isArray(simulator.members)) {
      return simulator.members.length;
    }
    if (typeof simulator.memberCount === 'number') {
      return simulator.memberCount;
    }

    return undefined;
  }

  get protectionRequired(): boolean {
    if (this.protectionBannerDismissed) {
      return false;
    }
    return this.policyMetadata?.protection?.required === true;
  }

  dismissProtectionBanner(): void {
    this.protectionBannerDismissed = true;
  }

  get protectionCoverageOptions(): string {
    const options = this.policyMetadata?.protection?.coverageOptions ?? [];
    return options.length ? options.map(option => option.toUpperCase()).join(' / ') : 'Standard';
  }

  get tandaRules(): TandaPolicyMetadata | undefined {
    return this.policyMetadata?.tanda;
  }

  get showTandaBanner(): boolean {
    if (this.tandaBannerDismissed) {
      return false;
    }

    return !!this.tandaRules;
  }

  dismissTandaBanner(): void {
    this.tandaBannerDismissed = true;
  }

  get showIncomeBanner(): boolean {
    if (this.incomeBannerDismissed) {
      return false;
    }

    const monthlyPayment = this.flowContext?.monthlyPayment;
    const threshold = this.flowContext?.incomeThreshold;

    if (typeof monthlyPayment !== 'number' || typeof threshold !== 'number') {
      return false;
    }

    return monthlyPayment > threshold;
  }

  dismissIncomeBanner(): void {
    this.incomeBannerDismissed = true;
  }

  get incomeBannerMessage(): string {
    const monthlyPayment = this.flowContext?.monthlyPayment;
    const threshold = this.flowContext?.incomeThreshold;

    if (typeof monthlyPayment !== 'number' || typeof threshold !== 'number' || threshold === 0) {
      return 'Revisa el comprobante de ingresos antes de continuar.';
    }

    const ratio = (monthlyPayment / threshold) * 100;
    return `Pago mensual estimado ${this.formatCurrency(monthlyPayment)} supera el umbral (${this.formatCurrency(threshold)} – ${ratio.toFixed(0)}%). Adjunta comprobante de ingresos o ajusta el plan.`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
  }

  get statusBannerType(): 'offline' | 'queued' | 'error' | null {
    if (this.isOffline) {
      return 'offline';
    }
    if (this.pendingOfflineDocs > 0) {
      return 'queued';
    }
    if (this.hasDocumentErrors) {
      return 'error';
    }
    return null;
  }

  getDocumentBadgeClasses(doc: Document): Record<string, boolean> {
    return {
      'document-card__status--approved': doc.status === DocumentStatus.Aprobado,
      'document-card__status--pending': doc.status === DocumentStatus.Pendiente || doc.status === DocumentStatus.EnRevision,
      'document-card__status--error': doc.status === DocumentStatus.Rechazado,
    };
  }

  getDocumentBadgeLabel(doc: Document): string {
    switch (doc.status) {
      case DocumentStatus.Aprobado:
        return 'Validado';
      case DocumentStatus.Rechazado:
        return 'Error';
      case DocumentStatus.EnRevision:
        return 'En revisión';
      default:
        return 'Pendiente';
    }
  }

  getDocumentQaHints(doc: Document): string[] {
    const hints: string[] = [];

    if (this.policyMetadata && this.shouldDisplayOcrHint(doc)) {
      const threshold = Math.round(this.policyMetadata.ocrThreshold * 100);
      hints.push(`OCR ≥ ${threshold}%`);
    }

    const expiry = this.resolveExpiryRule(doc.id);
    if (expiry) {
      hints.push(`Expiración: ${expiry}`);
    }

    return hints;
  }

  private resolveExpiryRule(docId: string): string | undefined {
    const rules = this.policyMetadata?.expiryRules;
    if (!rules) {
      return undefined;
    }

    if (rules[docId]) {
      return rules[docId];
    }

    for (const [key, value] of Object.entries(rules)) {
      if (key.includes('*') && this.matchesWildcard(docId, key)) {
        return value;
      }
    }

    return undefined;
  }

  private matchesWildcard(target: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return target === pattern;
    }

    const [prefix] = pattern.split('*');
    return target.startsWith(prefix);
  }

  private shouldDisplayOcrHint(doc: Document): boolean {
    if (!this.policyMetadata) {
      return false;
    }

    return /doc-(ine|proof|rfc|income)/.test(doc.id);
  }

  private handleOfflineProcessResult(result: OfflineProcessResult): void {
    if (!this.isDocumentUploadRequest(result.request)) {
      return;
    }

    const documentId = result.request.data?.documentId as string | undefined;
    if (!documentId) {
      return;
    }

    const doc = this.requiredDocuments.find(item => item.id === documentId);
    if (!doc) {
      return;
    }

    if (result.success) {
      doc.status = DocumentStatus.Aprobado;
      this.addAudit('offline_synced', doc.name, { attempts: result.request.attempts ?? 0 });
      this.errorBoundary.resolveIssueByContext(issue => issue.context?.documentName === doc.name);
      this.updateCompletionStatus();
      this.persistFlowState();
      this.showSyncMessage(`Sincronizamos ${doc.name} al reconectar.`);
    } else {
      this.addAudit('offline_retry_failed', doc.name, { attempts: result.request.attempts ?? 0 });
    }
  }

  private isDocumentUploadRequest(request: OfflineData): boolean {
    if (!request) {
      return false;
    }

    if (typeof request.endpoint === 'string' && request.endpoint.includes('/documents')) {
      return true;
    }

    return Boolean(request.data && request.data.documentId);
  }

  private markDocumentQueued(doc: Document): void {
    doc.status = DocumentStatus.EnRevision;
    this.addAudit('queued_offline', doc.name);
    this.updateCompletionStatus();
    this.showSyncMessage(`${doc.name} se guardó para sincronización offline.`);
    this.persistFlowState();
  }

  private syncQueuedDocumentStatuses(): void {
    if (!this.requiredDocuments.length || !this.queuedRequests.length) {
      return;
    }

    let statusChanged = false;
    this.queuedRequests.forEach(request => {
      const docId = request.data?.documentId as string | undefined;
      if (!docId) {
        return;
      }
      const target = this.requiredDocuments.find(doc => doc.id === docId);
      if (target && target.status !== DocumentStatus.Aprobado && target.status !== DocumentStatus.EnRevision) {
        target.status = DocumentStatus.EnRevision;
        statusChanged = true;
      }
    });

    if (statusChanged) {
      this.updateCompletionStatus();
    }
  }

  private showSyncMessage(message: string): void {
    this.syncMessage = message;
    if (this.syncMessageTimeout) {
      clearTimeout(this.syncMessageTimeout);
    }
    this.syncMessageTimeout = setTimeout(() => {
      this.syncMessage = null;
      this.syncMessageTimeout = null;
    }, 5000);
  }

  isUploading(doc: Document): boolean {
    const progress = this.uploadProgress[doc.id] ?? 0;
    return this.uploadingDocId === doc.id && progress < 100;
  }

  retryDocument(doc: Document): void {
    doc.status = DocumentStatus.Pendiente;
    this.uploadProgress[doc.id] = 0;
    this.addAudit('retry_request', doc.name);
    this.persistFlowState();
    this.updateCompletionStatus();
    setTimeout(() => this.uploadDocument(doc));
  }

  markManualReview(doc: Document): void {
    doc.status = DocumentStatus.EnRevision;
    this.addAudit('manual_review', doc.name);
    this.persistFlowState();
    this.updateCompletionStatus();
  }

  markManualComplete(doc: Document): void {
    doc.status = DocumentStatus.Aprobado;
    this.addAudit('manual_complete', doc.name);
    this.persistFlowState();
    this.updateCompletionStatus();
  }

  private pickNextDocumentForUpload(): Document | null {
    if (!this.requiredDocuments.length) {
      return null;
    }

    const priorityStatuses: DocumentStatus[] = [
      DocumentStatus.Pendiente,
      DocumentStatus.Rechazado,
      DocumentStatus.EnRevision
    ];

    for (const status of priorityStatuses) {
      const found = this.requiredDocuments.find(doc => doc.status === status);
      if (found) {
        return found;
      }
    }

    return this.requiredDocuments.find(doc => doc.status !== DocumentStatus.Aprobado) ?? null;
  }

  get hasDocumentErrors(): boolean {
    return this.requiredDocuments.some(doc => doc.status === DocumentStatus.Rechazado);
  }

  // New minimalista file upload handler
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (input) {
      input.value = '';
    }
    if (!file) {
      return;
    }

    await this.handleDropUpload(file);
  }

  private async handleDropUpload(file: File): Promise<void> {
    const targetDocument = this.pickNextDocumentForUpload();
    if (!targetDocument) {
      this.showSyncMessage('Todos los documentos están validados.');
      return;
    }

    this.currentUploadingDoc = targetDocument;
    try {
      await this.processUploadedFile(file, targetDocument);
    } catch (error) {
    }
  }

  // Legacy upload method (preserved for compatibility)
  uploadDocument(document: Document) {
    this.currentUploadingDoc = document;
    this.showFileUploadDialog(document);
  }

  private showFileUploadDialog(document: Document) {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.multiple = false;

    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (file) {
        await this.processUploadedFile(file, document);
      }
    };

    input.click();
  }

  private async processUploadedFile(file: File, document: Document) {
    this.isProcessingDocument = true;
    this.showOCRStatus = true;
    this.ocrStatus = 'processing';
    this.currentUploadingFile = file;
    this.currentUploadingDoc = document;

    let hash: string | undefined;
    let serialized: { base64: string; name: string; type: string; size: number } | undefined;

    try {
      hash = await this.documentUpload.computeFileHash(file);
      if (this.hashIndex.has(hash)) {
        this.addAudit('duplicate_detected', document.name, { hash, size: file.size });
        document.status = DocumentStatus.Aprobado;
        this.updateCompletionStatus();
        this.uploadProgress[document.id] = 100;
        this.ocrStatus = 'validated';
        this.uploadingDocId = null;
        this.currentUploadingFile = null;
        this.currentUploadingDoc = null;
        this.isProcessingDocument = false;
        return;
      }

      this.hashIndex.set(hash, { name: file.name, size: file.size, timestamp: Date.now() });
      this.addAudit('hash_indexed', document.name, { hash, size: file.size });
      serialized = await this.documentUpload.serializeFile(file);
      this.serializedFiles.set(document.id, serialized);
      this.pendingHashes.set(document.id, hash);

      document.status = DocumentStatus.EnRevision;
      this.updateCompletionStatus();

      this.uploadingDocId = document.id;
      this.uploadProgress[document.id] = 0;

      if (file.type.startsWith('image/')) {
        await this.processImageWithOCR(file, document);
      } else if (file.type === 'application/pdf') {
        await this.processPDFUpload(file, document);
      } else {
        throw new Error('Tipo de archivo no soportado');
      }

      this.errorBoundary.resolveIssueByContext(issue => issue.context?.documentName === document.name);
    } catch (error) {
      document.status = DocumentStatus.Rechazado;
      this.updateCompletionStatus();
      this.addAudit('upload_error', document.name, { error: String(error) });
      this.ocrStatus = 'error';
      this.uploadProgress[document.id] = 0;
      this.uploadingDocId = null;
      this.pendingHashes.delete(document.id);
      let serializedForQueue = serialized ?? this.serializedFiles.get(document.id);
      if (!serializedForQueue) {
        try {
          serializedForQueue = await this.documentUpload.serializeFile(file);
        } catch {}
      }

      const payloadMetadata = this.buildUploadMetadata(document, {
        queueReason: 'network-timeout',
        queuedAt: new Date().toISOString(),
      });
      if (hash) {
        payloadMetadata['hash'] = hash;
      }

      this.errorBoundary.reportNetworkTimeout({
        message: `No se pudo subir ${document.name}. Intentaremos nuevamente cuando haya conexión.`,
        context: {
          module: 'documentos',
          documentName: document.name,
          clientId: this.flowContext?.clientId
        },
        retry: () => this.processUploadedFile(file, document),
        queueRequest: {
          endpoint: '/documents/upload',
          method: 'POST',
          payload: {
            clientId: this.flowContext?.clientId,
            documentId: document.id,
            fileName: serializedForQueue?.name ?? file.name,
            size: serializedForQueue?.size ?? file.size,
            fileSize: serializedForQueue?.size ?? file.size,
            type: serializedForQueue?.type ?? file.type,
            fileType: serializedForQueue?.type ?? file.type,
            fileBase64: serializedForQueue?.base64 ?? null,
            hash: hash,
            metadata: payloadMetadata,
          }
        },
        onQueue: () => {
          this.markDocumentQueued(document);
        },
        onSaveDraft: async () => {
          document.status = DocumentStatus.Pendiente;
          this.updateCompletionStatus();
          this.persistFlowState();
          this.addAudit('saved_draft', document.name, { reason: 'network-timeout' });
        }
      });

      if (serializedForQueue) {
        this.serializedFiles.delete(document.id);
      }
    } finally {
      if (!this.showOCRPreview) {
        this.isProcessingDocument = false;
        this.currentUploadingFile = null;
        this.currentUploadingDoc = null;
      }
    }
  }

  private async processImageWithOCR(file: File, document: Document) {
    try {
      // Initialize OCR worker
      await this.ocrService.initializeWorker();

      // Subscribe to OCR progress
      this.ocrService.progress$.pipe(takeUntil(this.destroy$)).subscribe(
        (progress: OCRProgress) => this.ocrProgress = progress
      );

      // Extract text with OCR
      this.ocrResult = await this.ocrService.extractTextFromImage(file, document.name);
      
      // Show OCR preview for user confirmation
      this.showOCRPreview = true;
      this.currentUploadingDoc = document;
      this.isProcessingDocument = false;


    } catch (error) {
      this.errorBoundary.reportOcrFailure({
        message: `El OCR falló para ${document.name}.`,
        context: {
          module: 'documentos',
          documentName: document.name,
          clientId: this.flowContext?.clientId
        },
        retry: () => this.processImageWithOCR(file, document),
        processManually: async () => {
          document.status = DocumentStatus.EnRevision;
          this.updateCompletionStatus();
          this.persistFlowState();
          this.addAudit('manual_processing', document.name);
          this.pendingHashes.delete(document.id);
        },
        skip: async () => {
          document.status = DocumentStatus.Pendiente;
          this.updateCompletionStatus();
          this.persistFlowState();
          this.addAudit('manual_skip', document.name);
          this.pendingHashes.delete(document.id);
        }
      });
      // Continue with regular upload even if OCR fails
      await this.finalizeDocumentUpload(document, file);
      this.isProcessingDocument = false;
    }
  }

  private async processPDFUpload(file: File, document: Document) {
    // For PDF files, skip OCR and proceed with upload
    await this.finalizeDocumentUpload(document, file);
    this.ocrStatus = 'validated';
    this.isProcessingDocument = false;
  }

  confirmOCRResult() {
    if (this.currentUploadingDoc && this.ocrResult) {
      const file = this.currentUploadingFile;
      this.finalizeDocumentUpload(this.currentUploadingDoc, file, this.ocrResult)
        .then(() => this.closeOCRPreview())
        .catch(() => this.closeOCRPreview());
    }
  }

  reprocessOCR() {
    if (this.currentUploadingDoc) {
      // Allow user to upload a different image
      this.showFileUploadDialog(this.currentUploadingDoc);
      this.closeOCRPreview();
    }
  }

  closeOCRPreview() {
    this.showOCRPreview = false;
    if (this.currentUploadingDoc) {
      this.pendingHashes.delete(this.currentUploadingDoc.id);
    }
    this.ocrResult = null;
    this.currentUploadingDoc = null;
    this.currentUploadingFile = null;
    this.ocrProgress = { status: 'idle', progress: 0, message: '' };
    this.isProcessingDocument = false;
  }

  private async finalizeDocumentUpload(document: Document, file: File | null, ocrData?: OCRResult) {
    this.uploadingDocId = document.id;
    this.uploadProgress[document.id] = file ? 0 : 100;

    try {
      if (file) {
        const hash = this.pendingHashes.get(document.id);
        const metadata = ocrData?.extractedData ? { ocrExtract: ocrData.extractedData } : {};
        await this.uploadToBackend(file, document, hash, metadata);
        this.serializedFiles.delete(document.id);
        this.uploadProgress[document.id] = 100;
      }

      this.pendingHashes.delete(document.id);

      if (ocrData && ocrData.extractedData) {
        const validation = this.ocrService.validateDocumentType(ocrData.text, document.name);

        if (validation.valid && validation.confidence > 0.7) {
          document.status = DocumentStatus.Aprobado;
          (document as any).extractedData = ocrData.extractedData;
        } else {
          document.status = DocumentStatus.EnRevision;
        }
      } else {
        document.status = DocumentStatus.Aprobado;
      }

      this.ocrStatus = document.status === DocumentStatus.Aprobado ? 'validated' : 'error';

      this.updateCompletionStatus();
      this.addAudit('finalized', document.name, { status: document.status });

      this.errorBoundary.resolveIssueByContext(issue => issue.context?.documentName === document.name);

      if (this.completionStatus.allComplete && this.showVoicePattern && !this.voiceVerified) {
        this.showVoicePattern = true;
      }
    } catch (error) {
      this.uploadProgress[document.id] = 0;
      this.pendingHashes.delete(document.id);
      throw error;
    } finally {
      this.uploadingDocId = null;
      delete this.uploadProgress[document.id];
      if (!this.showOCRPreview) {
        this.currentUploadingFile = null;
        this.currentUploadingDoc = null;
      }
    }
  }

  async startVoiceRecording(): Promise<void> {
    if (this.isRecording) {
      return;
    }

    this.isRecording = true;
    this.analytics.track('avi_recording_started', {
      market: this.flowContext?.market,
      businessFlow: this.flowContext?.businessFlow,
    });

    if (this.showAVI) {
      this.startAVIAnalysis();
    }

    const transcript = this.buildAviTranscript();
    const audioBlob = this.createMockAudioBlob(transcript);

    try {
      const result = await this.aviBackend.analyzeRecording({
        audio: audioBlob,
        sessionId: this.aviAnalysis?.sessionId,
        transcript,
        advisorId: this.resolveAdvisorId(),
        clientId: this.flowContext?.clientId ?? null,
        market: this.flowContext?.market ?? null,
        metadata: {
          source: 'document-upload-flow',
          completion: this.completionStatus.completedDocs / Math.max(1, this.completionStatus.totalDocs),
        },
      });

      this.voiceVerified = result.decision !== 'NO_GO';
      this.aviAnalysis = {
        status: 'completed',
        confidence: result.confidence,
        fraudRisk: this.mapDecisionToRisk(result.decision),
        decision: result.decision,
        score: result.score,
        transcript: result.transcript,
        sessionId: result.sessionId,
        fallbackUsed: result.fallbackUsed,
      };

      this.analytics.track('avi_recording_completed', {
        decision: result.decision,
        score: result.score,
        fallbackUsed: result.fallbackUsed,
      });
    } catch (error) {
      this.voiceVerified = false;
      const message = (error as Error)?.message ?? 'Error desconocido';
      this.analytics.track('avi_recording_failed', {
        message,
      });
      this.aviAnalysis = {
        status: 'error',
        message,
      };
      this.errorBoundary.reportNetworkTimeout({
        message: 'No se pudo procesar la validación de voz',
        context: {
          module: 'Documentos',
          step: 'AVI',
        },
        retry: () => this.startVoiceRecording(),
      });
    } finally {
      this.isRecording = false;
      this.persistFlowState();
    }
  }

  private startAVIAnalysis() {
    this.aviAnalysis = {
      status: 'processing',
      confidence: 0,
      fraudRisk: 'UNKNOWN'
    };
    this.persistFlowState();
  }

  private buildPolicyContext(
    saleType: 'contado' | 'financiero',
    requiresIncomeProof: boolean,
    collectiveSize?: number
  ): MarketPolicyContext {
    return {
      market: this.flowContext.market,
      clientType: this.flowContext.clientType,
      saleType,
      businessFlow: this.flowContext.businessFlow,
      requiresIncomeProof,
      collectiveSize
    };
  }

  private applyMetadataEffects(documents: Document[]): Document[] {
    let result = documents.map(doc => ({ ...doc }));

    if (this.policyMetadata?.protection) {
      (this.flowContext as any).protection = {
        required: this.policyMetadata.protection.required,
        coverageOptions: [...(this.policyMetadata.protection.coverageOptions ?? [])],
        defaultCoverage: this.policyMetadata.protection.defaultCoverage ?? null,
      };

      if (this.policyMetadata.protection.required) {
        this.analytics.track('protection_required_detected', {
          market: this.flowContext.market,
          clientType: this.flowContext.clientType,
          coverageOptions: this.policyMetadata.protection.coverageOptions ?? [],
        });
      }
    }

    const tandaMeta = this.policyMetadata?.tanda;
    if (tandaMeta) {
      (this.flowContext as any).tandaRules = { ...tandaMeta };
      this.analytics.track('tanda_rules_detected', {
        market: this.flowContext.market,
        minMembers: tandaMeta.minMembers,
        maxMembers: tandaMeta.maxMembers,
      });
    }

    this.analytics.track('documents_metadata_applied', {
      market: this.flowContext.market,
      clientType: this.flowContext.clientType,
      protectionRequired: this.policyMetadata?.protection?.required ?? false,
      hasTandaRules: !!tandaMeta,
      incomeThreshold: this.flowContext?.incomeThreshold ?? null,
      tandaValidationStatus: this.tandaValidationState?.status ?? null,
    });

    const incomeMeta = this.policyMetadata?.income;
    if (incomeMeta) {
      const incomeDocId = incomeMeta.documentId ?? 'doc-income';
      const shouldForce = this.showIncomeBanner;
      const monthlyPayment = this.flowContext?.monthlyPayment ?? null;
      const incomeThreshold = this.flowContext?.incomeThreshold ?? null;
      if (shouldForce && typeof monthlyPayment === 'number' && typeof incomeThreshold === 'number') {
        this.analytics.track('financing_income_required', {
          market: this.flowContext.market,
          clientType: this.flowContext.clientType,
          monthlyPayment,
          incomeThreshold,
        });
      }
      result = result.map(doc => {
        if (doc.id !== incomeDocId) {
          return doc;
        }
        return {
          ...doc,
          isOptional: shouldForce ? false : doc.isOptional,
          tooltip: shouldForce
            ? 'Obligatorio: adjunta comprobante de ingresos porque el pago supera el umbral configurado.'
            : doc.tooltip,
        };
      });
    }

    return result;
  }

  private updateCompletionStatus() {
    this.completionStatus = this.documentRequirements.getDocumentCompletionStatus(this.requiredDocuments) as DocumentCompletionStatus;
    this.updateDocumentCollections();
    this.persistFlowState();
  }

  private async syncTandaRosterIfNeeded(): Promise<void> {
    if (!this.policyMetadata?.tanda || !this.tandaValidationState?.validationId) {
      return;
    }

    if (!this.isTandaRosterComplete()) {
      return;
    }

    if (this.lastTandaRosterHash === null && this.tandaValidationState.lastRosterUploadId) {
      this.lastTandaRosterHash = this.computeTandaRosterHash();
      return;
    }

    const rosterHash = this.computeTandaRosterHash();
    if (this.lastTandaRosterHash && this.lastTandaRosterHash === rosterHash && this.tandaValidationState.lastRosterUploadId) {
      return;
    }

    try {
      const updated = await this.tandaValidation.syncRoster(this.requiredDocuments, {
        clientId: this.flowContext?.clientId
      });

      if (updated) {
        this.tandaValidationState = updated;
        this.lastTandaRosterHash = rosterHash;
        this.persistFlowState();
      }
    } catch (error) {
      this.analytics.track('tanda_roster_sync_failed', {
        validationId: this.tandaValidationState.validationId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private isTandaRosterComplete(): boolean {
    const members = this.determineCollectiveSize() ?? 0;
    if (!members) {
      return false;
    }

    const consent = this.requiredDocuments.find(doc => doc.id === 'doc-consent' && doc.status === DocumentStatus.Aprobado);
    const roster = this.requiredDocuments.find(doc => doc.id === 'doc-roster' && doc.status === DocumentStatus.Aprobado);
    if (!consent && !roster) {
      return false;
    }

    for (let index = 1; index <= members; index++) {
      const ine = this.requiredDocuments.find(doc => doc.id === `doc-ine-${index}` && doc.status === DocumentStatus.Aprobado);
      const rfc = this.requiredDocuments.find(doc => doc.id === `doc-rfc-${index}` && doc.status === DocumentStatus.Aprobado);
      if (!ine || !rfc) {
        return false;
      }
    }

    return true;
  }

  private computeTandaRosterHash(): string {
    const relevant = this.requiredDocuments.filter(doc =>
      doc.id === 'doc-consent' ||
      doc.id === 'doc-roster' ||
      doc.id.startsWith('doc-ine-') ||
      doc.id.startsWith('doc-rfc-')
    );

    return relevant
      .map(doc => `${doc.id}:${doc.status}:${doc.updatedAt ? new Date(doc.updatedAt).getTime() : ''}`)
      .sort()
      .join('|');
  }

  private updateDocumentCollections(sourceDocs: Document[] = this.requiredDocuments): void {
    if (!sourceDocs.length) {
      this.primaryDocuments = [];
      this.memberDocumentSections = [];
      return;
    }

    const primary: Document[] = [];
    const memberMap = new Map<number, MemberDocumentSection>();

    sourceDocs.forEach(doc => {
      if (doc.group === 'member') {
        const memberIndex = this.extractMemberIndex(doc.id);
        const sectionIndex = memberIndex ?? (memberMap.size + 1);

        let section = memberMap.get(sectionIndex);
        if (!section) {
          section = {
            index: sectionIndex,
            label: this.extractMemberLabel(doc.name, sectionIndex),
            documents: []
          };
          memberMap.set(sectionIndex, section);
        }

        section.documents.push(doc);
      } else {
        primary.push(doc);
      }
    });

    this.primaryDocuments = primary;
    this.memberDocumentSections = Array.from(memberMap.values())
      .sort((a, b) => a.index - b.index)
      .map(section => ({
        ...section,
        documents: section.documents.sort((a, b) => a.id.localeCompare(b.id))
      }));

    void this.syncTandaRosterIfNeeded();
  }

  private extractMemberIndex(docId: string): number | null {
    const match = /-(\d+)$/.exec(docId);
    if (match) {
      const numeric = Number(match[1]);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  }

  private extractMemberLabel(documentName: string, fallbackIndex: number): string {
    const parts = documentName.split(':');
    if (parts.length > 1) {
      return parts[0].trim();
    }
    return `Integrante ${fallbackIndex}`;
  }

  getDocumentTitle(doc: Document): string {
    if (doc.group === 'member') {
      const parts = doc.name.split(':');
      if (parts.length > 1) {
        return parts.slice(1).join(':').trim();
      }
    }
    return doc.name;
  }

  get canProceedToContracts(): boolean {
    const docsComplete = this.completionStatus.allComplete;
    const voiceComplete = !this.showVoicePattern || this.voiceVerified;
    const aviComplete = !this.showAVI || (this.aviAnalysis?.status === 'completed' && this.aviAnalysis?.fraudRisk !== 'HIGH');
    
    return docsComplete && voiceComplete && aviComplete;
  }

  proceedToContracts() {
    const contractData = {
      flowContext: this.flowContext,
      documentsComplete: true,
      voiceVerified: this.voiceVerified,
      aviAnalysis: this.aviAnalysis,
      contractType: this.getContractType()
    };

    // Emit completion event with all flow data
    this.flowComplete.emit(contractData);
    this.persistFlowState();

    // Navigate to contract generation or final step
    this.router.navigate(['/contratos/generacion'], {
      queryParams: {
        clientId: this.flowContext.clientId,
        source: this.flowContext.source,
        market: this.flowContext.market,
        businessFlow: this.flowContext.businessFlow
      }
    });
  }

  private getContractType(): string {
    if (this.flowContext.businessFlow === BusinessFlow.VentaPlazo) {
      return this.flowContext.market === 'edomex' ? 'PAQUETE_DACION_PAGO' : 'VENTA_PLAZO';
    }
    return 'PROMESA_COMPRAVENTA';
  }

  saveProgress() {
    const progressData = {
      flowContext: this.flowContext,
      requiredDocuments: this.requiredDocuments,
      voicePattern: this.voicePattern,
      voiceVerified: this.voiceVerified,
      aviAnalysis: this.aviAnalysis,
      timestamp: new Date().toISOString()
    };

    sessionStorage.setItem(`documentProgress_${this.flowContext.clientId}`, JSON.stringify(progressData));
  }

  goBack() {
    this.goBackRequested.emit();
  }

  // Helper methods for template
  getFlowTitle(): string {
    switch (this.flowContext.source) {
      case 'cotizador': return 'Cotización Generada';
      case 'simulador': return 'Simulación Completada';
      case 'nueva-oportunidad': return 'Nueva Oportunidad';
      default: return 'Proceso de Documentos';
    }
  }

  // ===== Drag & Drop =====
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, document: Document): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processUploadedFile(file, document);
    }
  }

  // ===== Hashing & Audit =====

  private addAudit(action: string, docName: string, meta?: any): void {
    this.auditLog.push({ timestamp: new Date(), docName, action, meta });
    // Optionally persist minimal audit to sessionStorage
    try {
      sessionStorage.setItem('doc_audit_log', JSON.stringify(this.auditLog.slice(-200)));
    } catch {}
  }

  getSourceText(source: string): string {
    switch (source) {
      case 'cotizador': return 'Cotizador';
      case 'simulador': return 'Simulador';
      case 'nueva-oportunidad': return 'Nueva Oportunidad';
      default: return source;
    }
  }

  getBusinessFlowText(flow: BusinessFlow): string {
    switch (flow) {
      case BusinessFlow.VentaPlazo: return 'Venta a Plazo';
      case BusinessFlow.VentaDirecta: return 'Venta Directa';
      case BusinessFlow.CreditoColectivo: return 'Crédito Colectivo';
      case BusinessFlow.AhorroProgramado: return 'Ahorro Programado';
      default: return flow;
    }
  }

  getStatusText(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Pendiente: return 'Pendiente de subir';
      case DocumentStatus.EnRevision: return 'Procesando...';
      case DocumentStatus.Aprobado: return 'Aprobado';
      case DocumentStatus.Rechazado: return 'Rechazado - Revisar';
      default: return status;
    }
  }

  getAVIStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'completed': return 'Completado';
      default: return status;
    }
  }

  getFraudRiskText(risk: string): string {
    switch (risk) {
      case 'LOW': return 'Bajo';
      case 'MEDIUM': return 'Medio';
      case 'HIGH': return 'Alto';
      default: return 'Desconocido';
    }
  }

  getDocumentTooltip(documentName: string): string | undefined {
    return this.documentRequirements.getDocumentTooltip(documentName);
  }

  // OCR Helper methods
  getConfidenceLevel(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  getExtractedDataArray(fields: any): { key: string; value: string }[] {
    return Object.entries(fields).map(([key, value]) => ({
      key: this.formatFieldName(key),
      value: value as string
    }));
  }

  private formatFieldName(key: string): string {
    const fieldNames: { [key: string]: string } = {
      'curp': 'CURP',
      'nombre': 'Nombre',
      'apellidos': 'Apellidos',
      'fechaNacimiento': 'Fecha de Nacimiento',
      'placas': 'Placas',
      'marca': 'Marca',
      'modelo': 'Modelo',
      'año': 'Año',
      'direccion': 'Dirección',
      'fecha': 'Fecha',
      'proveedor': 'Proveedor',
      'rfc': 'RFC'
    };
    
    return fieldNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }
}
