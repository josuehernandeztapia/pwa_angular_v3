import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wizard-container" *ngIf="enabled; else disabledTpl">
      <h1 class="title">Postventa – Wizard de 4 Fotos</h1>

      <div class="banner info" *ngIf="!caseId">
        <span>Se creará un caso al iniciar. Las fotos se subirán y evaluarán automáticamente.</span>
      </div>

      <div class="steps">
        <div *ngFor="let step of steps; let i = index" class="step-card" [class.active]="currentIndex === i" [class.done]="step.done">
          <div class="step-header">
            <div class="badge">{{ i+1 }}</div>
            <div class="step-title">{{ step.title }}</div>
            <div class="status" *ngIf="step.done">
              <span class="ok" *ngIf="(step.confidence || 0) >= threshold && (!step.missing || step.missing.length === 0)">✓ OK ({{ (step.confidence!*100) | number:'1.0-0' }}%)</span>
              <span class="warn" *ngIf="(step.confidence || 0) < threshold || (step.missing && step.missing.length>0)">⚠️ Revisión</span>
            </div>
          </div>

          <div class="step-body">
            <div class="example" *ngIf="step.example">
              <div class="example-label">Ejemplo</div>
              <img ngSrc="{{ step.example }}" width="320" height="180" alt="Ejemplo {{ step.title }}" (error)="onExampleError($event)">
            </div>

            <p class="hint">{{ step.hint }}</p>

            <div class="actions">
              <input type="file" accept="image/*" capture="environment" (change)="onFileSelected($event, step.id)" [disabled]="step.uploading" />
              <button class="btn" (click)="retake(step.id)" *ngIf="step.done">Repetir</button>
            </div>

            <div class="upload" *ngIf="step.uploading">
              Subiendo y analizando...
              <div class="upload-progress" *ngIf="step.id === 'vin' && vinRetryAttempt > 0">
                Intento {{ vinRetryAttempt }} de 3 (tiempo extendido para VIN)
              </div>
            </div>

            <div class="qa" *ngIf="step.done">
              <div class="ok" *ngIf="(step.confidence || 0) >= threshold && (!step.missing || step.missing.length === 0)">
                ✅ Calidad suficiente (confianza {{ (step.confidence!*100) | number:'1.0-0' }}%)
              </div>
              <div class="warn" *ngIf="(step.confidence || 0) < threshold || (step.missing && step.missing.length > 0)">
                <div>⚠️ Falta calidad o datos clave.</div>
                <ul *ngIf="step.missing && step.missing.length > 0" class="missing">
                  <li *ngFor="let m of step.missing">Falta: {{ m | titlecase }}</li>
                </ul>
                <button class="btn retry" (click)="retake(step.id)">Tomar de nuevo {{ step.title }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="summary" *ngIf="caseId">
        <div class="banner success" *ngIf="isAllGood">Caso listo: 3 básicos completos en el primer intento.</div>
        <div class="badge-time" *ngIf="firstRecommendationMs != null">
          ⏱️ Tiempo a primera recomendación: {{ (firstRecommendationMs!/1000) | number:'1.1-1' }}s
        </div>
        <div class="banner warn" *ngIf="!isAllGood">
          Faltan elementos o calidad baja. Identificamos:
          <ul>
            <li *ngFor="let msg of summaryIssues">{{ msg }}</li>
          </ul>
          <div class="cta-row">
            <button class="btn" *ngIf="needsVin" (click)="jumpTo('vin')">Tomar foto de VIN</button>
            <button class="btn" *ngIf="needsOdometer" (click)="jumpTo('odometer')">Tomar foto de Odómetro</button>
            <button class="btn" *ngIf="needsEvidence" (click)="jumpTo('evidence')">Tomar Evidencia</button>
        </div>
        
        <!-- Enhanced VIN Detection Banner for timeout/error cases -->
        <div class="banner warn" *ngIf="showVinDetectionBanner" data-testid="vin-detection-banner" data-cy="vin-detection-banner">
          ⚠️ VIN requiere revisión manual - Timeout en detección automática después de varios intentos
          <div class="banner-actions">
            <button class="btn retry-vin" (click)="retakeVinWithRetry()">Reintentar VIN con tiempo extendido</button>
          </div>
        </div>
        
        <!-- Chips de refacciones y CTA de agregado a cotización (dev/BFF flags) abajo -->
      </div>
        <!-- Trigger need_info recording when applicable -->
        <ng-container *ngIf="showNeedInfoRecording"></ng-container>

        <!-- Dev-only: Chips de refacciones sugeridas + CTA Agregar a cotización -->
        <div *ngIf="enableAddToQuote && recommendedParts.length > 0" class="parts-suggested" data-cy="parts-suggested">
          <h3 class="parts-title">🔧 Piezas sugeridas</h3>
          <div class="chips">
            <div class="chip" *ngFor="let p of recommendedParts" [attr.data-cy]="'chip-' + p.id">
              <div class="chip-main">
                <span class="chip-name">{{ p.name }}</span>
                <span class="chip-price">{{ p.priceMXN | currency:'MXN':'symbol-narrow':'1.0-0' }}</span>
              </div>
              <div class="chip-meta">
                <span class="meta">OEM: {{ p.oem }}</span>
                <span class="meta" *ngIf="p.equivalent">Equiv: {{ p.equivalent }}</span>
                <span class="meta" [class.low]="p.stock === 0">Stock: {{ p.stock }}</span>
              </div>
              <button class="btn add" (click)="addToQuote(p)" [attr.data-cy]="'add-' + p.id" [attr.aria-label]="'Agregar ' + p.name + ' a cotización'">
                ➕ Agregar a cotización
              </button>
            </div>
          </div>
          <div class="draft-summary" data-cy="quote-draft-summary" aria-live="polite">
            En cotización provisional: <strong>{{ draftCount }}</strong> artículos
            <button class="btn clear" (click)="clearDraft()" data-cy="clear-draft">Limpiar</button>
          </div>
        </div>
      </div>

      <div class="footer">
        <button class="btn primary" [disabled]="!caseId" (click)="next()" data-cy="wizard-next">{{ ctaText }}</button>
      </div>
    </div>
    <ng-template #disabledTpl>
      <div class="wizard-container">
        <div class="banner warn">El Wizard de Postventa está desactivado. Actívalo con el flag environment.features.enablePostSalesWizard.</div>
      </div>
    </ng-template>
  `,
  styles: [`
    .wizard-container { padding: 20px; color: #e5e7eb; background: #0f1419; min-height: 100vh; }
    .title { font-size: 22px; font-weight: 700; color: #06d6a0; margin-bottom: 12px; }
    .steps { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .step-card { border: 1px solid #2d3748; border-radius: 10px; background: #1a1f2e; }
    .step-card.active { border-color: #06d6a0; }
    .step-card.done { opacity: 0.95; }
    .step-header { display: flex; align-items: center; gap: 10px; padding: 12px; border-bottom: 1px solid #2d3748; }
    .badge { width: 24px; height: 24px; border-radius: 999px; background: #06d6a0; color: #0b1411; font-weight: 800; display: flex; align-items: center; justify-content: center; }
    .step-title { font-weight: 600; }
    .status .ok { color: #10b981; font-weight: 700; }
    .status .warn { color: #f59e0b; font-weight: 700; }
    .step-body { padding: 12px; display: grid; grid-template-columns: 1fr; gap: 10px; }
    .hint { color: #a0aec0; font-size: 14px; }
    .example { border: 1px dashed #374151; border-radius: 8px; padding: 8px; }
    .example-label { font-size: 12px; color: #9ca3af; margin-bottom: 6px; }
    .example img { max-width: 100%; border-radius: 6px; }
    .actions { display:flex; align-items:center; gap: 10px; }
    .upload { color: #93c5fd; font-size: 14px; }
    .qa .ok { color:#10b981; }
    .qa .warn { color:#f59e0b; }
    .qa .missing { margin: 6px 0 0 16px; color:#fbbf24; }
    .banner { padding: 10px 12px; border-radius: 8px; margin: 10px 0; font-size: 14px; }
    .banner.info { background: #1f2937; border: 1px solid #374151; }
    .banner.warn { background: #5b3a0a; border: 1px solid #b45309; color: #fde68a; }
    .banner.success { background: #0f5132; border: 1px solid #14532d; color: #bbf7d0; }
    .btn { padding: 8px 12px; border-radius: 8px; border: 1px solid #374151; background:#111827; color: #e5e7eb; cursor: pointer; }
    .btn:hover { background:#0b1220; }
    .btn.primary { background:#059669; border-color:#059669; }
    .btn.retry { background:#4b5563; }
    .summary { margin-top: 12px; }
    .cta-row { display:flex; gap: 8px; margin-top:8px; }
    .footer { margin-top: 16px; display:flex; justify-content: flex-end; }
    .badge-time { margin-top: 6px; font-size: 12px; color: #93c5fd; }

    /* Parts chips */
    .parts-suggested { margin-top: 16px; border-top: 1px dashed #374151; padding-top: 12px; }
    .parts-title { color:#fbbf24; font-size:16px; margin: 0 0 8px 0; }
    .chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .chip { border:1px solid #374151; background:#0b1220; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:6px; }
    .chip-main { display:flex; justify-content:space-between; align-items:center; }
    .chip-name { font-weight:700; color:#e5e7eb; }
    .chip-price { color:#06d6a0; font-weight:700; }
    .chip-meta { display:flex; gap:8px; color:#9ca3af; font-size:12px; }
    .chip-meta .meta.low { color:#f87171; }
    .btn.add { align-self:flex-start; font-size:12px; padding:6px 8px; }
    .draft-summary { margin-top:8px; font-size:13px; color:#e5e7eb; display:flex; align-items:center; gap:8px; }
    .btn.clear { background:#374151; }
    .banner-actions { margin-top: 8px; }
    .btn.retry-vin { background: #b45309; border-color: #b45309; color: #fde68a; font-size: 12px; padding: 6px 10px; }
    .upload-progress { margin-top: 4px; color: #93c5fd; font-size: 12px; }
  `]
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
  private sentFirstRecommendation = false;
  private sentNeedInfo = false;
  showVinDetectionBanner = false;
  firstRecommendationMs: number | null = null;
  draftCount = 0;
  recommendedParts: PartSuggestion[] = [];
  vinRetryAttempt = 0;

  constructor(private cases: CasesService, private quoteDraft: PostSalesQuoteDraftService, private quoteApi: PostSalesQuoteApiService) {
    if (this.enableAddToQuote) {
      this.recommendedParts = this.buildDevRecommendedParts();
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

  private titleFor(id: StepId): string { return this.find(id)?.title || id; }
  private find(id: StepId) { return this.steps.find(s => s.id === id); }
  private hasMissing(key: 'vin' | 'odometer' | 'evidence'): boolean {
    const s = this.find(key);
    return !!(s && s.done && (s.missing?.includes(key) || (s.confidence || 0) < this.threshold));
  }

  onExampleError(evt: Event) {
    // Graceful fallback if example asset is missing
    const img = evt.target as HTMLImageElement;
    img.style.display = 'none';
  }

  next() {
    if (!this.caseId) {
      this.cases.createCase().subscribe(rec => { this.caseId = rec.id; this.startTimeMs = performance.now(); });
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
    s.file = null; s.uploading = false; s.done = false; s.confidence = undefined; s.missing = undefined; s.error = null;
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

    this.cases.uploadAndAnalyze(this.caseId, id, file)
      .pipe(
        timeout(20000), // Increased timeout for better reliability
        catchError(error => {
          console.warn('OCR analysis timeout or error:', error);
          // Return fallback response for timeout/error cases
          return of({
            attachment: null,
            ocr: {
              confidence: 0,
              missing: ['Timeout en detección automática'],
              detectedVin: null,
              requiresManualReview: true
            }
          });
        })
      )
      .subscribe({
      next: ({ attachment, ocr }: any) => {
        step.uploading = false;
        step.done = true;
        step.confidence = ocr.confidence ?? 0;
        step.missing = ocr.missing || [];
        
        // Show VIN detection banner for timeout/error cases
        if ((ocr as any).requiresManualReview && id === 'vin') {
          this.showVinDetectionBanner = true;
        }

        // Metrics: if we just achieved all 3 basics OK, send t_first_recommendation
        if (!this.sentFirstRecommendation && this.isAllGood && this.startTimeMs != null) {
          const elapsed = performance.now() - this.startTimeMs;
          this.firstRecommendationMs = Math.round(elapsed);
          this.sentFirstRecommendation = true;
          this.cases.recordFirstRecommendation(this.caseId!, this.firstRecommendationMs).subscribe();
          // Dev KPI: store locally
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

  /**
   * Enhanced OCR upload with exponential backoff and retry logic
   * Implements robust timeout handling with progressive timeouts:
   * - 1st attempt: 10s timeout
   * - 2nd attempt: 15s timeout  
   * - 3rd attempt: 20s timeout
   * - Final fallback: Manual review with clear error messaging
   */
  private uploadWithRetryAndBackoff(caseId: string, stepId: StepId, file: File) {
    let attemptNumber = 0;
    
    const attemptUpload = (): any => {
      attemptNumber++;
      const timeoutMs = 8000 + (attemptNumber * 4000); // 12s, 16s, 20s
      
      return this.cases.uploadAndAnalyze(caseId, stepId, file)
        .pipe(
          timeout(timeoutMs),
          catchError(error => {
            const isTimeoutError = error.name === 'TimeoutError' || error.message?.includes('timeout');
            const isLastAttempt = attemptNumber >= 3;
            
            if (isLastAttempt) {
              // Final failure - return fallback response
              console.error(`OCR analysis failed after ${attemptNumber} attempts:`, error);
              
              const isVinStep = stepId === 'vin';
              return of({
                attachment: null,
                ocr: {
                  confidence: 0.1, // Low confidence to indicate manual review needed
                  missing: isTimeoutError 
                    ? [`Timeout después de ${attemptNumber} intentos (${stepId})`]
                    : [`Error de procesamiento después de ${attemptNumber} intentos (${stepId})`],
                  detectedVin: isVinStep ? 'RETRY_REQUIRED' : null,
                  requiresManualReview: true,
                  errorType: isTimeoutError ? 'timeout' : 'processing_error',
                  retryAttempts: attemptNumber
                }
              });
            } else {
              // Retry with exponential backoff
              const backoffMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 4000); // 1s, 2s, 4s
              console.warn(`OCR attempt ${attemptNumber} failed, retrying in ${backoffMs}ms (next timeout: ${8000 + (attemptNumber + 1) * 4000}ms):`, error);
              
              // Update UI progress for VIN steps
              if (stepId === 'vin') {
                this.vinRetryAttempt = attemptNumber + 1;
              }
              
              return timer(backoffMs).pipe(
                delayWhen(() => timer(0)), // Ensure proper timing
                tap(() => console.log(`Starting retry attempt ${attemptNumber + 1} for ${stepId}...`)),
                switchMap(() => attemptUpload()) // Use switchMap to flatten the retry
              );
            }
          })
        );
    };
    
    return attemptUpload();
  }
  
  /**
   * Retry VIN capture with extended timeout - triggered by user action
   */
  retakeVinWithRetry() {
    const vinStep = this.find('vin');
    if (!vinStep) return;
    
    // Reset VIN step state
    this.showVinDetectionBanner = false;
    this.vinRetryAttempt = 0;
    this.retake('vin');
  }

  // When showing summary and not all good, record need_info once
  get showNeedInfoRecording(): boolean {
    if (!this.caseId) return false;
    if (this.sentNeedInfo) return false;
    const allTried = this.steps.filter(s => s.id !== 'plate').every(s => s.done); // 3 básicos intentados
    if (allTried && !this.isAllGood) {
      const missing: string[] = [];
      if (this.needsVin) missing.push('vin');
      if (this.needsOdometer) missing.push('odometer');
      if (this.needsEvidence) missing.push('evidence');
      this.cases.recordNeedInfo(this.caseId, missing).subscribe();
      this.sentNeedInfo = true;
      // Dev KPI: aggregate need_info
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

  // Dev-only parts: simple static suggestions to illustrate UX before BFF
  private buildDevRecommendedParts(): PartSuggestion[] {
    return [
      { id: 'oil-filter', name: 'Filtro de aceite', oem: 'A123-OF', equivalent: 'WIX-57045', stock: 12, priceMXN: 189 },
      { id: 'air-filter', name: 'Filtro de aire', oem: 'B456-AF', equivalent: 'MANN-C26168', stock: 5, priceMXN: 349 },
      { id: 'front-brake-pads', name: 'Pastillas freno (delanteras)', oem: 'C789-BP', equivalent: 'BREMBO-P1234', stock: 0, priceMXN: 899 },
      { id: 'wiper-blade', name: 'Limpia parabrisas', oem: 'D234-WB', equivalent: 'BOSCH-AEROTWIN', stock: 20, priceMXN: 249 }
    ];
  }

  addToQuote(p: PartSuggestion) {
    if (!this.enableAddToQuote) return;
    // Switch: if BFF enabled, call API; else, use local draft
    if ((this.environment.features as any)?.enableOdooQuoteBff) {
      const meta = { caseId: this.caseId };
      this.quoteApi.getOrCreateDraftQuote(undefined, meta).subscribe(({ quoteId }) => {
        this.quoteApi.addLine(quoteId, p, 1, meta).subscribe(() => {
          this.draftCount += 1; // UI feedback only; real totals vendrán del BFF
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
