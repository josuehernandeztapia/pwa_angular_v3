import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CasesService, CaseRecord } from '../../services/cases.service';
import { environment } from '../../../environments/environment';

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
  imports: [CommonModule, FormsModule],
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
              <img [src]="step.example" alt="Ejemplo {{ step.title }}" (error)="onExampleError($event)">
            </div>

            <p class="hint">{{ step.hint }}</p>

            <div class="actions">
              <input type="file" accept="image/*" capture="environment" (change)="onFileSelected($event, step.id)" [disabled]="step.uploading" />
              <button class="btn" (click)="retake(step.id)" *ngIf="step.done">Repetir</button>
            </div>

            <div class="upload" *ngIf="step.uploading">Subiendo y analizando...</div>

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
        
      </div>
        <!-- Trigger need_info recording when applicable -->
        <ng-container *ngIf="showNeedInfoRecording"></ng-container>
      </div>

      <div class="footer">
        <button class="btn primary" [disabled]="!caseId" (click)="next()">{{ ctaText }}</button>
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
  `]
})
export class PhotoWizardComponent {
  enabled = environment.features?.enablePostSalesWizard === true;
  threshold = 0.7; // QA threshold
  environment = environment;

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
  firstRecommendationMs: number | null = null;

  constructor(private cases: CasesService) {}

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

    this.cases.uploadAndAnalyze(this.caseId, id, file).subscribe({
      next: ({ attachment, ocr }) => {
        step.uploading = false;
        step.done = true;
        step.confidence = ocr.confidence ?? 0;
        step.missing = ocr.missing || [];

        // Metrics: if we just achieved all 3 basics OK, send t_first_recommendation
        if (!this.sentFirstRecommendation && this.isAllGood && this.startTimeMs != null) {
          const elapsed = performance.now() - this.startTimeMs;
          this.firstRecommendationMs = Math.round(elapsed);
          this.sentFirstRecommendation = true;
          this.cases.recordFirstRecommendation(this.caseId!, this.firstRecommendationMs).subscribe();
        }
      },
      error: (err) => {
        step.uploading = false;
        step.error = 'Error al subir o analizar la imagen';
      }
    });
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
    }
    return this.sentNeedInfo;
  }
}
