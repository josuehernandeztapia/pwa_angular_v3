import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManualOCREntryComponent, ManualOCRData } from '../shared/manual-ocr-entry/manual-ocr-entry.component';
import { IconComponent } from '../shared/icon/icon.component';
import { IconName } from '../shared/icon/icon-definitions';
import { VisionOCRRetryService, OCRResult } from '../../services/vision-ocr-retry.service';
import { CasesService, CaseRecord } from '../../services/cases.service';
import { environment } from '../../../environments/environment';
import { PostSalesQuoteDraftService, PartSuggestion } from '../../services/post-sales-quote-draft.service';
import { PostSalesQuoteApiService } from '../../services/post-sales-quote-api.service';
import { timeout, catchError, retry, delayWhen, tap, switchMap } from 'rxjs/operators';
import { of, timer, throwError } from 'rxjs';

type StepId = 'plate' | 'vin' | 'odometer' | 'evidence';
type IconKey = 'camera' | 'edit';

interface StepState {
  id: StepId;
  title: string;
  hint: string;
  example?: string; // path to example image
  file?: File | null;
  uploading?: boolean;
  done?: boolean;
  confidence?: number;
  missing?: string[];
  error?: string | null;
}

@Component({
  selector: 'app-photo-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgOptimizedImage, ManualOCREntryComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo-wizard.component.html',
  styleUrls: ['./photo-wizard.component.scss']
})
export class PhotoWizardComponent {
  enabled = environment.features?.enablePostSalesWizard === true;
  threshold = 0.7; // QA threshold
  environment = environment;
  enableAddToQuote = environment.features?.enablePostSalesAddToQuote === true;
  private readonly iconMap = new Map<IconKey, IconName>([
    ['camera', 'camera'],
    ['edit', 'edit']
  ]);

  steps: StepState[] = [
    { id: 'plate', title: 'Placa de circulación', hint: 'Asegúrate de buena luz y enfoque. Evita reflejos.', example: 'assets/examples/plate-example.jpg' },
    { id: 'vin', title: 'VIN plate', hint: 'Captura el VIN completo y legible.', example: 'assets/examples/vin-example.jpg' },
    { id: 'odometer', title: 'Odómetro', hint: 'Captura el marcador con nitidez y sin movimiento.', example: 'assets/examples/odometer-example.jpg' },
    { id: 'evidence', title: 'Evidencia', hint: 'Una foto general de la unidad para contexto.', example: 'assets/examples/evidence-example.jpg' },
  ];

  currentIndex = 0;
  caseId: string | null = null;
  private startTimeMs: number | null = null;

  // P0.2 Surgical Fix - Manual Entry State
  showManualEntry = false;
  manualEntryType: StepId | null = null;
  private sentFirstRecommendation = false;
  private sentNeedInfo = false;
  showVinDetectionBanner = false;
  firstRecommendationMs: number | null = null;
  draftCount = 0;
  recommendedParts: PartSuggestion[] = [];
  vinRetryAttempt = 0;

  constructor(
    private cases: CasesService,
    private quoteDraft: PostSalesQuoteDraftService,
    private quoteApi: PostSalesQuoteApiService,
    private ocrRetryService: VisionOCRRetryService
  ) {
    if (this.enableAddToQuote) {
      this.recommendedParts = this.buildRecommendedParts();
      this.draftCount = this.quoteDraft.getCount();
    }
  }

  get ctaText(): string {
    if (!this.caseId) return 'Iniciar';
    if (this.currentIndex < this.steps.length - 1) return 'Siguiente';
    return this.isAllGood ? 'Continuar (Caso listo)' : 'Continuar con pendientes';
  }

  get needsVin(): boolean { return this.hasMissing('vin'); }
  get needsOdometer(): boolean { return this.hasMissing('odometer'); }
  get needsEvidence(): boolean { return this.hasMissing('evidence'); }

  get isAllGood(): boolean {
    const vin = this.find('vin');
    const odo = this.find('odometer');
    const ev = this.find('evidence');
    return !!(vin?.done && (vin.confidence || 0) >= this.threshold && (!vin.missing || vin.missing.length === 0)
      && odo?.done && (odo.confidence || 0) >= this.threshold && (!odo.missing || odo.missing.length === 0)
      && ev?.done && (ev.confidence || 0) >= this.threshold && (!ev.missing || ev.missing.length === 0));
  }

  get summaryIssues(): string[] {
    const issues: string[] = [];
    ['vin','odometer','evidence'].forEach((k) => {
      const s = this.find(k as StepId);
      if (!s?.done) issues.push(`${this.titleFor(k as StepId)} pendiente`);
      else if ((s.confidence || 0) < this.threshold) issues.push(`${this.titleFor(k as StepId)} con baja confianza`);
      if (s?.missing && s.missing.length > 0) issues.push(`${this.titleFor(k as StepId)}: faltan ${s.missing.join(', ')}`);
    });
    return issues;
  }

  get showNeedInfoRecording(): boolean {
    if (!this.caseId) return false;
    if (this.sentNeedInfo) return false;
    const allTried = this.steps.filter(s => s.id !== 'plate').every(s => s.done);
    if (allTried && !this.isAllGood) {
      const missing: string[] = [];
      if (this.needsVin) missing.push('vin');
      if (this.needsOdometer) missing.push('odometer');
      if (this.needsEvidence) missing.push('evidence');
      this.cases.recordNeedInfo(this.caseId, missing).subscribe();
      this.sentNeedInfo = true;
      try {
        const raw = localStorage.getItem('kpi:needInfo:agg');
        const agg = raw ? JSON.parse(raw) : { need: 0, total: 0 };
        agg.need = (agg.need || 0) + 1;
        agg.total = (agg.total || 0) + 1;
        localStorage.setItem('kpi:needInfo:agg', JSON.stringify(agg));
      } catch {}
    }
    return this.sentNeedInfo;
  }

  private titleFor(id: StepId): string { return this.find(id)?.title || id; }
  private find(id: StepId) { return this.steps.find(s => s.id === id); }
  private hasMissing(key: 'vin' | 'odometer' | 'evidence'): boolean {
    const s = this.find(key);
    return !!(s && s.done && (s.missing?.includes(key) || (s.confidence || 0) < this.threshold));
  }

  getIcon(key: IconKey): IconName {
    return this.iconMap.get(key) ?? 'document';
  }

  onExampleError(evt: Event) {
    const img = evt.target as HTMLImageElement;
    img.style.display = 'none';
  }

  openManualEntry(stepId: StepId) {
    if (stepId === 'vin' || stepId === 'odometer') {
      this.manualEntryType = stepId;
      this.showManualEntry = true;
    }
  }

  onManualOCRSave(data: ManualOCRData) {
    if (!this.manualEntryType) return;

    const step = this.find(this.manualEntryType);
    if (step) {
      step.done = true;
      step.confidence = data.confidence;
      step.missing = [];
      step.error = null;

      if (this.caseId) {
      }
    }

    this.showManualEntry = false;
    this.manualEntryType = null;
  }

  onManualCancel() {
    this.showManualEntry = false;
    this.manualEntryType = null;
  }

  next() {
    if (!this.caseId) {
      this.cases.createCase().subscribe(rec => {
        this.caseId = rec.id;
        this.startTimeMs = performance.now();
      });
      return;
    }
    if (this.currentIndex < this.steps.length - 1) this.currentIndex += 1;
  }

  jumpTo(id: StepId) {
    const idx = this.steps.findIndex(s => s.id === id);
    if (idx >= 0) this.currentIndex = idx;
  }

  retake(id: StepId) {
    const s = this.find(id);
    if (!s) return;
    s.file = null;
    s.uploading = false;
    s.done = false;
    s.confidence = undefined;
    s.missing = undefined;
    s.error = null;
    this.jumpTo(id);
  }

  onFileSelected(evt: Event, id: StepId) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file || !this.caseId) return;
    const step = this.find(id);
    if (!step) return;
    step.file = file;
    step.uploading = true;
    step.error = null;

    this.uploadWithOCRRetry(this.caseId, id, file).subscribe({
      next: ({ attachment, ocr }: any) => {
        step.uploading = false;
        step.done = true;
        step.confidence = ocr.confidence ?? 0;
        step.missing = ocr.missing || [];

        if ((ocr as any).requiresManualReview && id === 'vin') {
          this.showVinDetectionBanner = true;
        }

        if (!this.sentFirstRecommendation && this.isAllGood && this.startTimeMs != null) {
          const elapsed = performance.now() - this.startTimeMs;
          this.firstRecommendationMs = Math.round(elapsed);
          this.sentFirstRecommendation = true;
          this.cases.recordFirstRecommendation(this.caseId!, this.firstRecommendationMs).subscribe();
          try {
            const raw = localStorage.getItem('kpi:firstRecommendation:list');
            const arr = raw ? JSON.parse(raw) : [];
            arr.push(this.firstRecommendationMs);
            localStorage.setItem('kpi:firstRecommendation:list', JSON.stringify(arr));
          } catch {}
        }
      },
      error: (err: any) => {
        step.uploading = false;
        step.error = 'Error al subir o analizar la imagen';
      }
    });
  }

  private uploadWithOCRRetry(caseId: string, stepId: StepId, file: File) {
    const mockImageUrl = `data:image/jpeg;base64,${stepId}-${Date.now()}`;

    return this.ocrRetryService.ocrWithRetry(mockImageUrl, stepId, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 5000,
      confidenceThreshold: this.threshold,
      enableFallback: true
    }).pipe(
      tap(result => {
        if (stepId === 'vin' && result.retryCount) {
          this.vinRetryAttempt = result.retryCount;
        }
      }),
      switchMap(ocrResult => {
        if (ocrResult.fallbackUsed) {
          return of({
            attachment: null,
            ocr: {
              confidence: 0,
              missing: [`OCR falló después de ${ocrResult.retryCount || 0} intentos - fallback manual activado`],
              detectedVin: stepId === 'vin' ? 'MANUAL_ENTRY_REQUIRED' : null,
              requiresManualReview: true,
              retryCount: ocrResult.retryCount
            }
          });
        }

        return of({
          ocr: {
            confidence: ocrResult.confidence,
            missing: this.extractMissingFields(ocrResult.fields, stepId),
            detectedVin: stepId === 'vin' ? ocrResult.fields['vin'] : null,
            processingTime: ocrResult.processingTime,
            retryCount: ocrResult.retryCount
          }
        });
      })
    );
  }

  private extractMissingFields(fields: Record<string, any>, stepId: StepId): string[] {
    const missing: string[] = [];

    switch (stepId) {
      case 'vin':
        if (!fields['vin']) missing.push('vin');
        break;
      case 'odometer':
        if (!fields['kilometers']) missing.push('kilometers');
        break;
      case 'plate':
        if (!fields['plate']) missing.push('plate');
        break;
      case 'evidence':
        break;
    }

    return missing;
  }

  retakeVinWithRetry() {
    const vinStep = this.find('vin');
    if (!vinStep) return;

    this.showVinDetectionBanner = false;
    this.vinRetryAttempt = 0;
    this.retake('vin');
  }

  private buildRecommendedParts(): PartSuggestion[] {
    return [
      { id: 'oil-filter', name: 'Filtro de aceite', oem: 'A123-OF', equivalent: 'WIX-57045', stock: 12, priceMXN: 189 },
      { id: 'air-filter', name: 'Filtro de aire', oem: 'B456-AF', equivalent: 'MANN-C26168', stock: 5, priceMXN: 349 },
      { id: 'front-brake-pads', name: 'Pastillas freno (delanteras)', oem: 'C789-BP', equivalent: 'BREMBO-P1234', stock: 0, priceMXN: 899 },
      { id: 'wiper-blade', name: 'Limpia parabrisas', oem: 'D234-WB', equivalent: 'BOSCH-AEROTWIN', stock: 20, priceMXN: 249 }
    ];
  }

  addToQuote(p: PartSuggestion) {
    if (!this.enableAddToQuote) return;
    if ((this.environment.features as any)?.enableOdooQuoteBff) {
      const meta = { caseId: this.caseId };
      this.quoteApi.getOrCreateDraftQuote(undefined, meta).subscribe(({ quoteId }) => {
        this.quoteApi.addLine(quoteId, p, 1, meta).subscribe(() => {
          this.draftCount += 1;
        });
      });
    } else {
      this.quoteDraft.addItem(p, 1);
      this.draftCount = this.quoteDraft.getCount();
    }
  }

  clearDraft() {
    if (!this.enableAddToQuote) return;
    this.quoteDraft.clear();
    this.draftCount = 0;
  }
}
