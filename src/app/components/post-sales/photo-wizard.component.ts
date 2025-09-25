import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManualEntryComponent, ManualEntryData } from '../shared/manual-entry/manual-entry.component';
import { ManualOCREntryComponent, ManualOCRData } from '../shared/manual-ocr-entry/manual-ocr-entry.component';
import { VisionOCRRetryService, OCRResult } from '../../services/vision-ocr-retry.service';
import { CasesService, CaseRecord } from '../../services/cases.service';
import { environment } from '../../../environments/environment';
import { PostSalesQuoteDraftService, PartSuggestion } from '../../services/post-sales-quote-draft.service';
import { PostSalesQuoteApiService } from '../../services/post-sales-quote-api.service';
import { timeout, catchError, retry, delayWhen, tap, switchMap } from 'rxjs/operators';
import { of, timer, throwError } from 'rxjs';

type StepId = 'plate' | 'vin' | 'odometer' | 'evidence';

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
  imports: [CommonModule, FormsModule, NgOptimizedImage, ManualEntryComponent, ManualOCREntryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ui-card" *ngIf="enabled; else disabledTpl">
      <h2 class="text-sm font-semibold mb-6 text-slate-900 dark:text-slate-100">
        Postventa – Wizard de 4 Fotos
      </h2>

      <!-- Status Banner -->
      <div *ngIf="!caseId" class="mb-4 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Se creará un caso al iniciar. Las fotos se subirán y evaluarán automáticamente.
        </p>
      </div>

      <!-- Photo Upload Steps -->
      <div class="space-y-4">
        <div *ngFor="let step of steps; let i = index"
             class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
             data-cy="step-card">

          <!-- Step Header -->
          <div class="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                     [class.bg-slate-200]="!step.done"
                     [class.text-slate-600]="!step.done"
                     [class.dark:bg-slate-700]="!step.done"
                     [class.dark:text-slate-400]="!step.done"
                     [class.bg-green-500]="step.done && (step.confidence || 0) >= threshold"
                     [class.text-white]="step.done && (step.confidence || 0) >= threshold"
                     [class.bg-yellow-500]="step.done && (step.confidence || 0) < threshold"
                     [class.text-white]="step.done && (step.confidence || 0) < threshold">
                  {{ step.done && (step.confidence || 0) >= threshold ? '✓' : (i + 1) }}
                </div>
                <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ step.title }}
                </h3>
              </div>

              <!-- Status Indicator -->
              <div *ngIf="step.done" class="text-xs">
                <span *ngIf="(step.confidence || 0) >= threshold && (!step.missing || step.missing.length === 0)"
                      class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md">
                  Validado ({{ (step.confidence!*100) | number:'1.0-0' }}%)
                </span>
                <span *ngIf="(step.confidence || 0) < threshold || (step.missing && step.missing.length > 0)"
                      class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-md">
                  Revisar
                </span>
              </div>

              <!-- Loading Spinner -->
              <div *ngIf="step.uploading" class="flex items-center space-x-2">
                <div class="animate-spin h-4 w-4 border-2 border-slate-300 dark:border-slate-600 border-t-slate-600 dark:border-t-slate-300 rounded-full"></div>
                <span class="text-xs text-slate-500 dark:text-slate-400">Procesando...</span>
              </div>
            </div>
          </div>

          <!-- Step Content -->
          <div class="p-4">
            <p class="text-xs text-slate-600 dark:text-slate-400 mb-3">
              {{ step.hint }}
            </p>

            <!-- Upload Actions -->
            <div class="flex items-center space-x-3 mb-3">
              <label class="ui-btn ui-btn-secondary text-xs cursor-pointer">
                <input type="file" accept="image/*" capture="environment"
                       (change)="onFileSelected($event, step.id)"
                       [disabled]="step.uploading"
                       class="sr-only" />
                📷 Tomar Foto
              </label>

              <button *ngIf="step.done"
                      (click)="retake(step.id)"
                      class="ui-btn ui-btn-secondary text-xs">
                🔄 Repetir
              </button>
            </div>

            <!-- Upload Progress -->
            <div *ngIf="step.uploading" class="mb-3">
              <!-- Skeleton Loading -->
              <div class="animate-pulse space-y-2">
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>

              <div *ngIf="step.id === 'vin' && vinRetryAttempt > 0"
                   class="mt-2 text-xs text-blue-600 dark:text-blue-400">
                Intento {{ vinRetryAttempt }} de 3 (análisis VIN extendido)
              </div>
            </div>

            <!-- Quality Assessment -->
            <div *ngIf="step.done" class="border-t border-slate-200 dark:border-slate-700 pt-3 -mx-4 px-4">
              <div *ngIf="(step.confidence || 0) >= threshold && (!step.missing || step.missing.length === 0)"
                   class="flex items-center text-xs text-green-600 dark:text-green-400">
                <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Documento procesado correctamente
              </div>

              <div *ngIf="(step.confidence || 0) < threshold || (step.missing && step.missing.length > 0)"
                   class="space-y-3">
                <div class="flex items-center text-xs text-yellow-600 dark:text-yellow-400">
                  <div class="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  Requiere revisión manual
                </div>

                <!-- Missing Fields List -->
                <div *ngIf="step.missing && step.missing.length > 0" class="ml-4">
                  <p class="text-xs text-slate-600 dark:text-slate-400 mb-1">Campos faltantes:</p>
                  <ul class="text-xs text-slate-500 dark:text-slate-500 space-y-1">
                    <li *ngFor="let m of step.missing" class="flex items-center">
                      <div class="w-1 h-1 bg-slate-400 rounded-full mr-2"></div>
                      {{ m | titlecase }}
                    </li>
                  </ul>
                </div>

                <!-- Manual Entry Actions -->
                <div class="flex items-center space-x-2">
                  <button (click)="retake(step.id)"
                          class="ui-btn ui-btn-secondary text-xs">
                    🔄 Repetir captura
                  </button>
                  <button *ngIf="step.id === 'vin' || step.id === 'odometer'"
                          (click)="openManualEntry(step.id)"
                          class="ui-btn ui-btn-primary text-xs"
                          data-testid="manual-entry-btn">
                    📝 Ingresar manualmente
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- OCR Processing Summary -->
      <div *ngIf="caseId" class="mt-6 space-y-4">
        <!-- Success State -->
        <div *ngIf="isAllGood" class="px-4 py-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <p class="text-sm text-green-700 dark:text-green-400 font-medium">
              Validación completa
            </p>
          </div>
          <p class="text-xs text-green-600 dark:text-green-500 mt-1 ml-4">
            Todos los documentos procesados correctamente
          </p>
        </div>

        <!-- Performance Metrics -->
        <div *ngIf="firstRecommendationMs != null" class="text-xs text-slate-500 dark:text-slate-400">
          ⏱️ Tiempo de procesamiento: {{ (firstRecommendationMs!/1000) | number:'1.1-1' }}s
        </div>

        <!-- Issues State -->
        <div *ngIf="!isAllGood" class="px-4 py-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div class="flex items-center space-x-2 mb-2">
            <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <p class="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
              Estado: Pendiente
            </p>
          </div>
          <div class="ml-4 space-y-2">
            <p class="text-xs text-yellow-600 dark:text-yellow-500">Elementos identificados:</p>
            <ul class="text-xs text-yellow-600 dark:text-yellow-500 space-y-1">
              <li *ngFor="let msg of summaryIssues" class="flex items-start">
                <div class="w-1 h-1 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                {{ msg }}
              </li>
            </ul>

            <!-- Quick Actions -->
            <div class="flex flex-wrap gap-2 pt-2">
              <button *ngIf="needsVin"
                      (click)="jumpTo('vin')"
                      class="ui-btn ui-btn-secondary text-xs">
                📷 Capturar VIN
              </button>
              <button *ngIf="needsOdometer"
                      (click)="jumpTo('odometer')"
                      class="ui-btn ui-btn-secondary text-xs">
                📷 Capturar Odómetro
              </button>
              <button *ngIf="needsEvidence"
                      (click)="jumpTo('evidence')"
                      class="ui-btn ui-btn-secondary text-xs">
                📷 Tomar Evidencia
              </button>
            </div>
          </div>
        </div>

        <!-- Enhanced VIN Detection Banner -->
        <div *ngIf="showVinDetectionBanner"
             class="px-4 py-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg"
             data-testid="vin-detection-banner"
             data-cy="vin-detection-banner">
          <div class="flex items-center space-x-2 mb-2">
            <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
            <p class="text-sm text-orange-700 dark:text-orange-400 font-medium">
              VIN requiere revisión manual
            </p>
          </div>
          <p class="text-xs text-orange-600 dark:text-orange-500 mb-3 ml-4">
            Timeout en detección automática después de varios intentos
          </p>
          <button (click)="retakeVinWithRetry()"
                  class="ui-btn ui-btn-secondary text-xs ml-4">
            🔄 Reintentar con tiempo extendido
          </button>
        </div>

        <!-- Trigger need_info recording when applicable -->
        <ng-container *ngIf="showNeedInfoRecording"></ng-container>

        <!-- Refacciones Sugeridas -->
        <div *ngIf="enableAddToQuote && recommendedParts.length > 0"
             class="border-t border-slate-200 dark:border-slate-700 pt-6"
             data-cy="parts-suggested">

          <div class="mb-4">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              🔧 Refacciones Recomendadas
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Basado en el análisis de las fotografías
            </p>
          </div>

          <!-- Parts Chips Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div *ngFor="let p of recommendedParts"
                 class="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:shadow-sm transition-shadow"
                 [attr.data-cy]="'chip-' + p.id">

              <div class="flex justify-between items-start mb-2">
                <h4 class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ p.name }}
                </h4>
                <span class="text-sm font-semibold text-green-600 dark:text-green-400">
                  {{ p.priceMXN | currency:'MXN':'symbol-narrow':'1.0-0' }}
                </span>
              </div>

              <div class="text-xs text-slate-500 dark:text-slate-500 space-y-1 mb-3">
                <div class="flex justify-between">
                  <span>OEM: {{ p.oem }}</span>
                  <span *ngIf="p.equivalent">Equiv: {{ p.equivalent }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Stock: {{ p.stock }}</span>
                  <span *ngIf="p.stock === 0"
                        class="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs">
                    Agotado
                  </span>
                  <span *ngIf="p.stock > 0"
                        class="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs">
                    Disponible
                  </span>
                </div>
              </div>

              <button (click)="addToQuote(p)"
                      class="w-full ui-btn ui-btn-primary text-xs"
                      [attr.data-cy]="'add-' + p.id"
                      [attr.aria-label]="'Agregar ' + p.name + ' a cotización'"
                      [disabled]="p.stock === 0">
                ➕ Agregar a Cotización
              </button>
            </div>
          </div>

          <!-- Quote Draft Summary -->
          <div *ngIf="draftCount > 0"
               class="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
               data-cy="quote-draft-summary"
               aria-live="polite">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span class="text-sm text-blue-700 dark:text-blue-400">
                Cotización provisional: <strong>{{ draftCount }}</strong> artículo{{ draftCount > 1 ? 's' : '' }}
              </span>
            </div>
            <button (click)="clearDraft()"
                    class="ui-btn ui-btn-secondary text-xs"
                    data-cy="clear-draft">
              🗑️ Limpiar
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation Footer -->
      <div class="mt-6 flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
        <div class="text-xs text-slate-500 dark:text-slate-500">
          Paso {{ currentIndex + 1 }} de {{ steps.length }}
        </div>

        <button [disabled]="!caseId"
                (click)="next()"
                class="ui-btn ui-btn-primary"
                data-cy="wizard-next">
          {{ ctaText }}
        </button>
      </div>
    </section>

    <!-- Manual OCR Entry Modal -->
    <app-manual-ocr-entry
      [documentType]="manualEntryType || ''"
      [isOpen]="showManualEntry"
      (save)="onManualOCRSave($event)"
      (cancel)="onManualCancel()">
    </app-manual-ocr-entry>

    <ng-template #disabledTpl>
      <section class="ui-card">
        <div class="px-4 py-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <p class="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
              Función desactivada
            </p>
          </div>
          <p class="text-xs text-yellow-600 dark:text-yellow-500 mt-1 ml-4">
            El Wizard de Postventa está desactivado. Actívalo con el flag environment.features.enablePostSalesWizard.
          </p>
        </div>
      </section>
    </ng-template>
  `,
  styles: []
})
export class PhotoWizardComponent {
  enabled = environment.features?.enablePostSalesWizard === true;
  threshold = 0.7; // QA threshold
  environment = environment;
  enableAddToQuote = environment.features?.enablePostSalesAddToQuote === true;

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
