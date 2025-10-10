import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  Optional
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ManualOCRData } from '../shared/manual-ocr-entry/manual-ocr-entry.component';
import { OCRScannerEnhancedComponent, OCRScanResult, ScanMode } from './ocr-scanner-enhanced.component';
import { DocumentsPhaseComponent } from './documents-phase.component';
import { DeliveryPhaseComponent } from './delivery-phase.component';
import { PlatesPhaseComponent } from './plates-phase.component';
import { IconComponent } from '../shared/icon/icon.component';
import { IconName } from '../shared/icon/icon-definitions';
import { environment } from '../../../environments/environment';
import { PostSalesQuoteDraftService, PartSuggestion } from '../../services/post-sales-quote-draft.service';
import { PostSalesQuoteApiService } from '../../services/post-sales-quote-api.service';
import {
  PostSaleOfflinePayload,
  PostSalePhotoUploadResult,
  PostSaleService
} from '../../services/post-sale.service';
import { FlowContextService } from '../../services/flow-context.service';
import { ContractContextSnapshot } from '../../models/contract-context';
import { ClientContextSnapshot } from '../../models/client-context';

export type StepId = 'plate' | 'vin' | 'odometer' | 'evidence';
type IconKey = 'camera' | 'edit';

type StepState = {
  id: StepId;
  title: string;
  hint: string;
  example?: string;
  file?: File | null;
  uploading?: boolean;
  done?: boolean;
  confidence?: number;
  missing?: string[];
  error?: string | null;
  offlineQueued?: boolean;
  detectedValue?: string | null;
};

type StoredStepState = Pick<StepState, 'id' | 'done' | 'confidence' | 'missing' | 'error' | 'offlineQueued' | 'detectedValue'>;

type PostSaleFlowContextState = {
  caseId: string | null;
  currentIndex: number;
  steps: StoredStepState[];
  sentFirstRecommendation: boolean;
  sentNeedInfo: boolean;
  firstRecommendationMs: number | null;
  showVinDetectionBanner: boolean;
  vinRetryAttempt: number;
  draftCount: number;
  recommendedParts?: PartSuggestion[];
  pendingOfflineCount: number;
  startedAt: number | null;
  clientId?: string | null;
  contractId?: string | null;
  photos?: Record<StepId, string | null>;
};

@Component({
  selector: 'app-photo-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgOptimizedImage, OCRScannerEnhancedComponent, DocumentsPhaseComponent, DeliveryPhaseComponent, PlatesPhaseComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-wizard.component.html',
  styleUrls: ['./photo-wizard.component.scss']
})
export class PhotoWizardComponent implements OnInit, OnDestroy {
  enabled = environment.features?.enablePostSalesWizard === true;
  threshold = 0.7;
  environment = environment;
  enableAddToQuote = environment.features?.enablePostSalesAddToQuote === true;

  private readonly iconMap = new Map<IconKey, IconName>([
    ['camera', 'camera'],
    ['edit', 'edit']
  ]);
  private readonly destroy$ = new Subject<void>();

  steps: StepState[] = [
    {
      id: 'plate',
      title: 'Placa de circulación',
      hint: 'Asegúrate de buena luz y enfoque. Evita reflejos.',
      example: 'assets/examples/plate-example.jpg'
    },
    {
      id: 'vin',
      title: 'VIN plate',
      hint: 'Captura el VIN completo y legible.',
      example: 'assets/examples/vin-example.jpg'
    },
    {
      id: 'odometer',
      title: 'Odómetro',
      hint: 'Captura el marcador con nitidez y sin movimiento.',
      example: 'assets/examples/odometer-example.jpg'
    },
    {
      id: 'evidence',
      title: 'Evidencia',
      hint: 'Una foto general de la unidad para contexto.',
      example: 'assets/examples/evidence-example.jpg'
    }
  ];

  currentIndex = 0;
  caseId: string | null = null;
  private caseStartedAt: number | null = null;

  activeOCRMode: ScanMode | null = null;
  ocrTargetStep: StepId | null = null;
  private sentFirstRecommendation = false;
  private sentNeedInfo = false;
  showVinDetectionBanner = false;
  firstRecommendationMs: number | null = null;
  draftCount = 0;
  recommendedParts: PartSuggestion[] = [];
  vinRetryAttempt = 0;
  pendingOfflineCount = 0;
  isOffline = false;
  queueMessage: string | null = null;
  private queueMessageTimeout: ReturnType<typeof setTimeout> | null = null;
  private contractId: string | null = null;
  clientId: string | null = null;
  photoSnapshots: Record<StepId, string | null> = this.createEmptyPhotoMap();
  showAdvancedPhases = environment.features?.enablePostventa === true;
  readonly reopenWizardStep = (step: StepId) => this.jumpTo(step);

  private createEmptyPhotoMap(): Record<StepId, string | null> {
    return {
      plate: null,
      vin: null,
      odometer: null,
      evidence: null
    };
  }

  constructor(
    private readonly postSale: PostSaleService,
    private readonly quoteDraft: PostSalesQuoteDraftService,
    private readonly quoteApi: PostSalesQuoteApiService,
    private readonly cdr: ChangeDetectorRef,
    @Optional() private readonly flowContext?: FlowContextService
  ) {
    if (this.enableAddToQuote) {
      this.recommendedParts = this.buildRecommendedParts();
      this.draftCount = this.quoteDraft.getCount();
    }
  }

  ngOnInit(): void {
    this.loadContextSnapshots();
    this.restoreFlowState();
    this.setupOfflineSubscriptions();
  }

  private loadContextSnapshots(): void {
    if (!this.flowContext) {
      return;
    }

    const contract = this.flowContext.getContextData<ContractContextSnapshot>('contract');
    const client = this.flowContext.getContextData<ClientContextSnapshot>('client');

    this.contractId = contract?.contractId ?? client?.contractId ?? this.contractId;
    this.clientId = client?.clientId ?? contract?.clientId ?? this.clientId;
  }

  private async capturePhotoSnapshot(stepId: StepId, file: File): Promise<void> {
    try {
      const dataUrl = await this.readFileAsDataUrl(file);
      this.photoSnapshots = { ...this.photoSnapshots, [stepId]: dataUrl };
      this.persistFlowState();
    } catch {
      // Ignore preview errors; the queue continues to operate normally.
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.queueMessageTimeout) {
      clearTimeout(this.queueMessageTimeout);
      this.queueMessageTimeout = null;
    }
    this.persistFlowState();
  }

  get ctaText(): string {
    if (!this.caseId) {
      return 'Iniciar';
    }
    if (this.currentIndex < this.steps.length - 1) {
      return 'Siguiente';
    }
    return this.isAllGood ? 'Continuar (Caso listo)' : 'Continuar con pendientes';
  }

  get needsVin(): boolean {
    return this.hasMissing('vin');
  }

  get needsOdometer(): boolean {
    return this.hasMissing('odometer');
  }

  get needsEvidence(): boolean {
    return this.hasMissing('evidence');
  }

  get isAllGood(): boolean {
    const vin = this.find('vin');
    const odo = this.find('odometer');
    const ev = this.find('evidence');
    return !!(
      vin?.done && (vin.confidence || 0) >= this.threshold && (!vin.missing || vin.missing.length === 0) &&
      odo?.done && (odo.confidence || 0) >= this.threshold && (!odo.missing || odo.missing.length === 0) &&
      ev?.done && (ev.confidence || 0) >= this.threshold && (!ev.missing || ev.missing.length === 0)
    );
  }

  get summaryIssues(): string[] {
    const issues: string[] = [];
    ['vin', 'odometer', 'evidence'].forEach(key => {
      const step = this.find(key as StepId);
      if (!step?.done) {
        issues.push(`${this.titleFor(key as StepId)} pendiente`);
      } else if ((step.confidence || 0) < this.threshold) {
        issues.push(`${this.titleFor(key as StepId)} con baja confianza`);
      }
      if (step?.missing?.length) {
        issues.push(`${this.titleFor(key as StepId)}: faltan ${step.missing.join(', ')}`);
      }
    });
    return issues;
  }

  get showNeedInfoRecording(): boolean {
    if (!this.caseId || this.sentNeedInfo) {
      return false;
    }

    const allTried = this.steps.filter(step => step.id !== 'plate').every(step => step.done);
    if (allTried && !this.isAllGood) {
      const missing: string[] = [];
      if (this.needsVin) missing.push('vin');
      if (this.needsOdometer) missing.push('odometer');
      if (this.needsEvidence) missing.push('evidence');

      this.postSale
        .recordNeedInfo(this.caseId, missing)
        .pipe(takeUntil(this.destroy$))
        .subscribe();

      this.sentNeedInfo = true;

      try {
        const raw = localStorage.getItem('kpi:needInfo:agg');
        const agg = raw ? JSON.parse(raw) : { need: 0, total: 0 };
        agg.need = (agg.need || 0) + 1;
        agg.total = (agg.total || 0) + 1;
        localStorage.setItem('kpi:needInfo:agg', JSON.stringify(agg));
      } catch {
        // Ignore localStorage issues
      }

      this.persistFlowState();
    }

    return this.sentNeedInfo;
  }

  getIcon(key: IconKey): IconName {
    return this.iconMap.get(key) ?? 'document';
  }

  onExampleError(evt: Event): void {
    const img = evt.target as HTMLImageElement;
    img.style.display = 'none';
  }

  openManualEntry(stepId: StepId): void {
    this.ocrTargetStep = stepId;
    this.activeOCRMode = stepId === 'vin' ? 'vin' : stepId === 'odometer' ? 'odometer' : 'general';
  }

  onOcrValueDetected(result: OCRScanResult): void {
    if (!this.ocrTargetStep) {
      this.closeOcrOverlay();
      return;
    }

    const step = this.find(this.ocrTargetStep);
    if (step) {
      const confidence = Math.max(0, Math.min(1, (result.confidence || 0) / 100));
      step.done = result.success;
      step.confidence = confidence;
      step.missing = [];
      step.error = null;
      step.offlineQueued = false;
      const formattedValue = this.normalizeDetectedValue(this.ocrTargetStep, result.value ?? '');
      step.detectedValue = formattedValue || null;
      if (!formattedValue) {
        step.missing = ['manual_review'];
      }

      if (this.caseId) {
        const manualData: ManualOCRData = {
          documentType: this.ocrTargetStep,
          fields: this.buildManualEntryFields(this.ocrTargetStep, formattedValue, result.method),
          confidence,
          isManual: result.method === 'manual'
        };

        this.postSale
          .storeManualEntry(this.caseId, this.ocrTargetStep, manualData)
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      }
    }

    this.persistFlowState();
    this.cdr.markForCheck();
    this.closeOcrOverlay();
  }

  onOcrError(_message: string): void {
    this.closeOcrOverlay(false);
  }

  closeOcrOverlay(_resetError: boolean = true): void {
    this.activeOCRMode = null;
    this.ocrTargetStep = null;
  }

  next(): void {
    if (!this.caseId) {
      this.postSale
        .createCase()
        .pipe(takeUntil(this.destroy$))
        .subscribe(record => {
          this.caseId = record.id;
          this.caseStartedAt = Date.now();
          this.photoSnapshots = this.createEmptyPhotoMap();
          this.persistFlowState();
          this.cdr.markForCheck();
        });
      return;
    }

    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex += 1;
      this.persistFlowState();
    }
  }

  jumpTo(id: StepId): void {
    const idx = this.steps.findIndex(step => step.id === id);
    if (idx >= 0) {
      this.currentIndex = idx;
      this.persistFlowState();
    }
  }

  retake(id: StepId): void {
    const step = this.find(id);
    if (!step) {
      return;
    }

    step.file = null;
    step.uploading = false;
    step.done = false;
    step.confidence = undefined;
    step.missing = undefined;
    step.error = null;
    step.offlineQueued = false;
    step.detectedValue = null;
    this.photoSnapshots = { ...this.photoSnapshots, [id]: null };

    if (id === 'vin') {
      this.showVinDetectionBanner = false;
      this.vinRetryAttempt = 0;
    }

    this.jumpTo(id);
    this.persistFlowState();
    this.cdr.markForCheck();
  }

  async onFileSelected(evt: Event, id: StepId): Promise<void> {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file || !this.caseId) {
      return;
    }

    const step = this.find(id);
    if (!step) {
      return;
    }

    step.file = file;
    step.uploading = true;
    step.error = null;
    step.offlineQueued = false;

    await this.capturePhotoSnapshot(id, file);

    this.postSale
      .processPhoto(this.caseId, id, file, { threshold: this.threshold })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          step.uploading = false;
          if (result.retryCount && id === 'vin') {
            this.vinRetryAttempt = result.retryCount;
          }
          this.applyPhotoResult(result);
        },
        error: () => {
          step.uploading = false;
          step.error = 'Error al subir o analizar la imagen';
          this.persistFlowState();
          this.cdr.markForCheck();
        }
      });
  }

  retakeVinWithRetry(): void {
    this.showVinDetectionBanner = false;
    this.vinRetryAttempt = 0;
    this.retake('vin');
  }

  getDetectedLabel(stepId: StepId): string {
    switch (stepId) {
      case 'vin':
        return 'VIN detectado';
      case 'odometer':
        return 'Lectura odómetro';
      case 'plate':
        return 'Placa capturada';
      case 'evidence':
      default:
        return 'Dato capturado';
    }
  }

  onPhaseNavigate(phase: 'delivery' | 'documents' | 'plates'): void {
    switch (phase) {
      case 'delivery':
        this.jumpTo('plate');
        break;
      case 'documents':
        this.jumpTo('vin');
        break;
      case 'plates':
        this.jumpTo('evidence');
        break;
    }
  }

  private normalizeDetectedValue(stepId: StepId, raw: string): string {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) {
      return '';
    }

    switch (stepId) {
      case 'vin':
        return trimmed.toUpperCase();
      case 'plate':
        return trimmed.replace(/\s+/g, '').toUpperCase();
      case 'odometer':
        return trimmed.replace(/[^0-9]/g, '') || trimmed;
      default:
        return trimmed;
    }
  }

  private buildManualEntryFields(stepId: StepId, value: string, method: 'ocr' | 'manual'): Record<string, any> {
    const fields: Record<string, any> = { source: method };

    switch (stepId) {
      case 'vin':
        fields['vin'] = value;
        if (value.length === 17) {
          fields['length'] = value.length;
        }
        break;
      case 'odometer': {
        const numeric = parseInt(value.replace(/[^0-9]/g, ''), 10);
        fields['kilometers'] = Number.isFinite(numeric) && !Number.isNaN(numeric) ? numeric : null;
        fields['raw'] = value;
        break;
      }
      case 'plate':
        fields['plate'] = value;
        break;
      default:
        fields['value'] = value;
        break;
    }

    return fields;
  }

  addToQuote(part: PartSuggestion): void {
    if (!this.enableAddToQuote) {
      return;
    }

    if ((this.environment.features as any)?.enableOdooQuoteBff) {
      const meta = { caseId: this.caseId };
      this.quoteApi
        .getOrCreateDraftQuote(undefined, meta)
        .pipe(takeUntil(this.destroy$))
        .subscribe(({ quoteId }) => {
          this.quoteApi
            .addLine(quoteId, part, 1, meta)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              this.draftCount += 1;
              this.persistFlowState();
              this.cdr.markForCheck();
            });
        });
    } else {
      this.quoteDraft.addItem(part, 1);
      this.draftCount = this.quoteDraft.getCount();
      this.persistFlowState();
      this.cdr.markForCheck();
    }
  }

  clearDraft(): void {
    if (!this.enableAddToQuote) {
      return;
    }
    this.quoteDraft.clear();
    this.draftCount = 0;
    this.persistFlowState();
    this.cdr.markForCheck();
  }

  private setupOfflineSubscriptions(): void {
    this.postSale.online$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOnline => {
        const wasOffline = this.isOffline;
        this.isOffline = !isOnline;
        if (wasOffline && isOnline && this.pendingOfflineCount > 0) {
          this.queueMessage = 'Conexión restablecida. Sincronizando fotos pendientes…';
          if (this.queueMessageTimeout) {
            clearTimeout(this.queueMessageTimeout);
          }
          this.queueMessageTimeout = setTimeout(() => {
            this.queueMessage = null;
            this.queueMessageTimeout = null;
            this.cdr.markForCheck();
          }, 3500);
        }
        this.cdr.markForCheck();
      });

    this.postSale.pendingPhotoRequests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(requests => {
        this.pendingOfflineCount = requests.length;
        this.syncOfflineQueuedFlags(requests.map(req => req.data as PostSaleOfflinePayload));
        this.persistFlowState();
        this.cdr.markForCheck();
      });

    this.postSale.processedPhotoRequests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        const mapped = this.postSale.mapOfflineResult(result);
        if (mapped) {
          if (mapped.retryCount && mapped.stepId === 'vin') {
            this.vinRetryAttempt = mapped.retryCount;
          }
          this.applyPhotoResult(mapped);
        }
      });
  }

  private applyPhotoResult(result: PostSalePhotoUploadResult): void {
    const step = this.find(result.stepId as StepId);
    if (!step) {
      return;
    }

    step.uploading = false;

    if (result.status === 'processed') {
      step.done = true;
      step.confidence = result.confidence ?? 0;
      step.missing = result.missing ?? [];
      step.error = null;
      step.offlineQueued = false;

      if (result.stepId === 'vin' && result.fallbackUsed) {
        this.showVinDetectionBanner = true;
      }

      if (!this.sentFirstRecommendation && this.caseId && this.isAllGood && this.caseStartedAt != null) {
        const elapsed = Date.now() - this.caseStartedAt;
        this.firstRecommendationMs = elapsed;
        this.sentFirstRecommendation = true;

        this.postSale
          .recordFirstRecommendation(this.caseId, elapsed)
          .pipe(takeUntil(this.destroy$))
          .subscribe();

        try {
          const raw = localStorage.getItem('kpi:firstRecommendation:list');
          const list = raw ? JSON.parse(raw) : [];
          list.push(elapsed);
          localStorage.setItem('kpi:firstRecommendation:list', JSON.stringify(list));
        } catch {
          // Ignore storage issues
        }
      }
    } else {
      step.done = true;
      step.confidence = result.confidence ?? 0;
      step.missing = result.missing ?? ['sync_pending'];
      step.error = null;
      step.offlineQueued = true;
    }

    this.persistFlowState();
    this.cdr.markForCheck();
  }

  private syncOfflineQueuedFlags(payloads: (PostSaleOfflinePayload | undefined)[]): void {
    const queuedSteps = new Set<StepId>();
    payloads.forEach(payload => {
      if (payload?.stepId) {
        queuedSteps.add(payload.stepId as StepId);
      }
    });

    this.steps.forEach(step => {
      if (queuedSteps.has(step.id)) {
        step.offlineQueued = true;
        step.done = true;
        step.missing = step.missing?.length ? step.missing : ['sync_pending'];
      } else if (step.offlineQueued) {
        step.offlineQueued = false;
      }
    });
  }

  private titleFor(id: StepId): string {
    return this.find(id)?.title || id;
  }

  private find(id: StepId): StepState | undefined {
    return this.steps.find(step => step.id === id);
  }

  private hasMissing(key: StepId): boolean {
    const step = this.find(key);
    return !!(
      step &&
      step.done &&
      (step.missing?.includes(key) || (step.confidence || 0) < this.threshold)
    );
  }

  private buildRecommendedParts(): PartSuggestion[] {
    return [
      { id: 'oil-filter', name: 'Filtro de aceite', oem: 'A123-OF', equivalent: 'WIX-57045', stock: 12, priceMXN: 189 },
      { id: 'air-filter', name: 'Filtro de aire', oem: 'B456-AF', equivalent: 'MANN-C26168', stock: 5, priceMXN: 349 },
      { id: 'front-brake-pads', name: 'Pastillas freno (delanteras)', oem: 'C789-BP', equivalent: 'BREMBO-P1234', stock: 0, priceMXN: 899 },
      { id: 'wiper-blade', name: 'Limpia parabrisas', oem: 'D234-WB', equivalent: 'BOSCH-AEROTWIN', stock: 20, priceMXN: 249 }
    ];
  }

  private persistFlowState(): void {
    if (!this.flowContext) {
      return;
    }

    const storedSteps: StoredStepState[] = this.steps.map(step => ({
      id: step.id,
      done: step.done,
      confidence: step.confidence,
      missing: step.missing ? [...step.missing] : undefined,
      error: step.error,
      offlineQueued: step.offlineQueued,
      detectedValue: step.detectedValue ?? null
    }));

    const payload: PostSaleFlowContextState = {
      caseId: this.caseId,
      currentIndex: this.currentIndex,
      steps: storedSteps,
      sentFirstRecommendation: this.sentFirstRecommendation,
      sentNeedInfo: this.sentNeedInfo,
      firstRecommendationMs: this.firstRecommendationMs,
      showVinDetectionBanner: this.showVinDetectionBanner,
      vinRetryAttempt: this.vinRetryAttempt,
      draftCount: this.draftCount,
      recommendedParts: this.enableAddToQuote ? this.recommendedParts.map(part => ({ ...part })) : undefined,
      pendingOfflineCount: this.pendingOfflineCount,
      startedAt: this.caseStartedAt,
      clientId: this.clientId,
      contractId: this.contractId,
      photos: { ...this.photoSnapshots }
    };

    this.flowContext.saveContext('postventa', payload, {
      breadcrumbs: ['Dashboard', 'Postventa', 'Wizard']
    });
  }

  private restoreFlowState(): void {
    if (!this.flowContext) {
      return;
    }

    const stored = this.flowContext.getContextData<PostSaleFlowContextState>('postventa');
    if (!stored) {
      return;
    }

    this.caseId = stored.caseId;
    this.currentIndex = stored.currentIndex ?? 0;
    this.sentFirstRecommendation = stored.sentFirstRecommendation ?? false;
    this.sentNeedInfo = stored.sentNeedInfo ?? false;
    this.firstRecommendationMs = stored.firstRecommendationMs ?? null;
    this.showVinDetectionBanner = stored.showVinDetectionBanner ?? false;
    this.vinRetryAttempt = stored.vinRetryAttempt ?? 0;
    this.draftCount = stored.draftCount ?? this.draftCount;
    this.pendingOfflineCount = stored.pendingOfflineCount ?? 0;
    this.caseStartedAt = stored.startedAt ?? null;
    this.clientId = stored.clientId ?? this.clientId;
    this.contractId = stored.contractId ?? this.contractId;
    this.photoSnapshots = stored.photos ? { ...this.createEmptyPhotoMap(), ...stored.photos } : this.createEmptyPhotoMap();

    if (Array.isArray(stored.steps)) {
      stored.steps.forEach(entry => {
        const step = this.find(entry.id);
        if (!step) {
          return;
        }
        step.done = entry.done;
        step.confidence = entry.confidence;
        step.missing = entry.missing ? [...entry.missing] : undefined;
        step.error = entry.error ?? null;
        step.offlineQueued = entry.offlineQueued;
        step.detectedValue = entry.detectedValue ?? null;
      });
    }

    if (stored.recommendedParts && this.enableAddToQuote) {
      this.recommendedParts = stored.recommendedParts.map(part => ({ ...part }));
    }

    this.cdr.markForCheck();
  }
}
