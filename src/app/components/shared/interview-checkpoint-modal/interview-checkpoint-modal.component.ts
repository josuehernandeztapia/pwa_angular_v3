import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { InterviewCheckpointService } from '../../../services/interview-checkpoint.service';
import { VoiceRecorderComponent } from '../voice-recorder/voice-recorder.component';

interface CheckpointModalData {
  clientId: string;
  clientName: string;
  documentType: string;
  checkpoint: any;
  clientData: any;
}

@Component({
  selector: 'app-interview-checkpoint-modal',
  standalone: true,
  imports: [CommonModule, VoiceRecorderComponent],
  template: `
    <div class="checkpoint-modal-overlay" *ngIf="isVisible" (click)="onOverlayClick($event)" role="dialog" aria-modal="true" [attr.aria-labelledby]="modalTitleId" [attr.aria-describedby]="modalDescId">
      <div class="checkpoint-modal" (click)="$event.stopPropagation()" tabindex="-1" (keydown)="onKeydown($event)">
        
        <!-- Header -->
        <div class="modal-header">
          <div class="header-icon">🚫</div>
          <div class="header-content">
            <div class="header-title" [attr.id]="modalTitleId">Entrevista Obligatoria</div>
            <div class="header-subtitle" [attr.id]="modalDescId">{{ modalData.clientName }}</div>
          </div>
          <button class="btn-close" (click)="closeModal()" [disabled]="isInterviewInProgress">
            ✕
          </button>
        </div>

        <!-- Block Reason -->
        <div class="block-reason">
          <div class="reason-icon">ℹ️</div>
          <div class="reason-text">
            <strong>No puede subir "{{ modalData.documentType }}" sin completar la entrevista.</strong>
            <p>{{ modalData.checkpoint?.requirement?.reason }}</p>
          </div>
        </div>

        <!-- Interview Status -->
        <div class="interview-status" [ngClass]="getStatusClass()">
          <div class="status-header">
            <span class="status-icon">{{ getStatusIcon() }}</span>
            <span class="status-text">{{ getStatusText() }}</span>
          </div>
          
          <div class="status-details" *ngIf="getStatusDetails()">
            {{ getStatusDetails() }}
          </div>
        </div>

        <!-- Interview Requirements -->
        <div class="requirements-section" *ngIf="modalData.checkpoint?.requirement">
          <div class="section-title">📋 Requerimientos de Entrevista</div>
          
          <div class="requirement-grid">
            <div class="requirement-item">
              <span class="req-label">Tipo:</span>
              <span class="req-value">{{ getProductTypeLabel(modalData.checkpoint.product_type) }}</span>
            </div>
            
            <div class="requirement-item">
              <span class="req-label">Municipio:</span>
              <span class="req-value">{{ getMunicipalityLabel(modalData.checkpoint.municipality) }}</span>
            </div>
            
            <div class="requirement-item" *ngIf="modalData.checkpoint.requirement.min_duration_seconds">
              <span class="req-label">Duración mínima:</span>
              <span class="req-value">{{ formatDuration(modalData.checkpoint.requirement.min_duration_seconds) }}</span>
            </div>
            
            <div class="requirement-item">
              <span class="req-label">Intentos restantes:</span>
              <span class="req-value">{{ getRemainingAttempts() }}</span>
            </div>
          </div>
        </div>

        <!-- Voice Recorder Section -->
        <div class="recorder-section" *ngIf="canStartInterview()">
          <div class="section-title">🎙️ Grabación de Entrevista</div>
          
          <app-voice-recorder
            #voiceRecorder
            [advisorId]="advisorId"
            [clientId]="modalData.clientId"
            [sessionType]="'documentation'"
            [municipality]="modalData.checkpoint.municipality"
            [productType]="modalData.checkpoint.product_type"
            [showGuide]="true"
            [showLiveFeedback]="true"
            [formData]="modalData.clientData"
            (validationComplete)="onValidationComplete($event)"
            (interviewApproved)="onInterviewApproved($event)"
            (errorOccurred)="onRecorderError($event)"
          ></app-voice-recorder>
        </div>

        <!-- Error Display -->
        <div class="error-section" *ngIf="errorMessage">
          <div class="error-content">
            <span class="error-icon">⚠️</span>
            <span class="error-text">{{ errorMessage }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <!-- Cancel/Close Button -->
          <button 
            class="btn-cancel" 
            (click)="closeModal()"
            [disabled]="isInterviewInProgress"
            *ngIf="!isMaxAttemptsReached()"
          >
            {{ isInterviewInProgress ? 'Grabando...' : 'Cancelar' }}
          </button>

          <!-- Retry Interview Button -->
          <button 
            class="btn-retry" 
            (click)="retryInterview()"
            *ngIf="canRetryInterview()"
          >
            🔄 Intentar Nuevamente
          </button>

          <!-- Continue After Success -->
          <button 
            class="btn-continue" 
            (click)="continueToUpload()"
            *ngIf="canContinue()"
          >
            ✅ Continuar con Documentos
          </button>

          <!-- Contact Supervisor -->
          <button 
            class="btn-supervisor" 
            (click)="contactSupervisor()"
            *ngIf="isMaxAttemptsReached()"
          >
            📞 Contactar Supervisor
          </button>
        </div>

        <!-- Help Section -->
        <div class="help-section" *ngIf="showHelp">
          <div class="help-toggle" (click)="toggleHelp()">
            <span class="help-icon">{{ helpExpanded ? '▼' : '▶' }}</span>
            <span class="help-text">¿Necesita ayuda?</span>
          </div>
          
          <div class="help-content" *ngIf="helpExpanded">
            <div class="help-title">Consejos para una entrevista exitosa:</div>
            <ul class="help-list">
              <li>Hable claro y pausadamente</li>
              <li>Esté en un lugar silencioso</li>
              <li>Responda todas las preguntas completamente</li>
              <li>Mantenga consistencia con la información del formulario</li>
              <li>Si no entiende una pregunta, pida que la repitan</li>
            </ul>
            
            <div class="help-contact">
              <strong>¿Problemas técnicos?</strong><br>
              Contacte a soporte: <a href="tel:+525555555555">55-5555-5555</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkpoint-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      backdrop-filter: blur(4px);
    }

    .checkpoint-modal {
      background: white;
      border-radius: 16px;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-50px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      padding: 24px;
      border-bottom: 2px solid #fee2e2;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
    }

    .header-icon {
      font-size: 2rem;
      margin-right: 16px;
      flex-shrink: 0;
    }

    .header-content {
      flex: 1;
    }

    .header-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #dc2626;
      margin-bottom: 4px;
    }

    .header-subtitle {
      font-size: 1rem;
      color: #6b7280;
      font-weight: 500;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #6b7280;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: all 0.2s;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close:hover:not(:disabled) {
      background: #f3f4f6;
      color: #dc2626;
    }

    .btn-close:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .block-reason {
      display: flex;
      padding: 20px 24px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      margin: 0;
    }

    .reason-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .reason-text {
      flex: 1;
    }

    .reason-text strong {
      color: #92400e;
      display: block;
      margin-bottom: 8px;
    }

    .reason-text p {
      color: #78350f;
      margin: 0;
      line-height: 1.5;
    }

    .interview-status {
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .interview-status.pending {
      background: #fef3c7;
    }

    .interview-status.in-progress {
      background: #dbeafe;
    }

    .interview-status.completed-valid {
      background: #dcfce7;
    }

    .interview-status.completed-invalid {
      background: #fee2e2;
    }

    .interview-status.expired {
      background: #f3f4f6;
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .status-icon {
      font-size: 1.2rem;
    }

    .status-text {
      font-weight: 600;
      color: #1f2937;
    }

    .status-details {
      font-size: 0.9rem;
      color: #6b7280;
      line-height: 1.4;
    }

    .requirements-section {
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .section-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .requirement-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .requirement-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f9fafb;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }

    .req-label {
      font-size: 0.9rem;
      color: #6b7280;
      font-weight: 500;
    }

    .req-value {
      font-size: 0.9rem;
      color: #1f2937;
      font-weight: 600;
    }

    .recorder-section {
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .error-section {
      padding: 16px 24px;
      background: #fef2f2;
      border-bottom: 1px solid #e5e7eb;
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .error-text {
      color: #dc2626;
      font-weight: 500;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      padding: 24px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .modal-actions button {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
      min-width: 120px;
    }

    .btn-cancel {
      background: #6b7280;
      color: white;
      border-color: #6b7280;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #4b5563;
    }

    .btn-cancel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-retry {
      background: #f59e0b;
      color: white;
      border-color: #f59e0b;
    }

    .btn-retry:hover {
      background: #d97706;
    }

    .btn-continue {
      background: #22c55e;
      color: white;
      border-color: #22c55e;
    }

    .btn-continue:hover {
      background: #16a34a;
    }

    .btn-supervisor {
      background: #dc2626;
      color: white;
      border-color: #dc2626;
    }

    .btn-supervisor:hover {
      background: #b91c1c;
    }

    .help-section {
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .help-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 24px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .help-toggle:hover {
      background: #f3f4f6;
    }

    .help-icon {
      font-size: 0.9rem;
      color: #6b7280;
    }

    .help-text {
      color: #6b7280;
      font-weight: 500;
    }

    .help-content {
      padding: 0 24px 24px;
    }

    .help-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 12px;
    }

    .help-list {
      list-style: none;
      padding: 0;
      margin: 0 0 16px 0;
    }

    .help-list li {
      padding: 4px 0;
      color: #6b7280;
      position: relative;
      padding-left: 16px;
    }

    .help-list li:before {
      content: '•';
      color: #06d6a0;
      position: absolute;
      left: 0;
      font-weight: bold;
    }

    .help-contact {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      font-size: 0.9rem;
      color: #374151;
    }

    .help-contact a {
      color: #06d6a0;
      text-decoration: none;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .checkpoint-modal {
        margin: 16px;
        max-height: calc(100vh - 32px);
        width: calc(100vw - 32px);
      }

      .requirement-grid {
        grid-template-columns: 1fr;
      }

      .modal-actions {
        flex-direction: column;
      }

      .modal-actions button {
        width: 100%;
      }
    }
  `]
})
export class InterviewCheckpointModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isVisible: boolean = false;
  @Input() modalData!: CheckpointModalData;
  @Input() advisorId: string = '';

  @Output() interviewCompleted = new EventEmitter<any>();
  @Output() modalClosed = new EventEmitter<void>();
  @Output() continueUpload = new EventEmitter<void>();

  @ViewChild('voiceRecorder') voiceRecorder!: VoiceRecorderComponent;

  isInterviewInProgress: boolean = false;
  errorMessage: string = '';
  showHelp: boolean = true;
  helpExpanded: boolean = false;
  modalTitleId: string = `modal_title_${Math.random().toString(36).slice(2)}`;
  modalDescId: string = `modal_desc_${Math.random().toString(36).slice(2)}`;
  private previouslyFocusedElement: HTMLElement | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private checkpointService: InterviewCheckpointService
  ) {}

  ngOnInit(): void {
    this.subscribeToCheckpointUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible']) {
      if (this.isVisible) {
        this.previouslyFocusedElement = document.activeElement as HTMLElement;
        setTimeout(() => this.focusFirstElementInModal(), 0);
      } else {
        this.restoreFocusAfterModal();
      }
    }
  }

  private subscribeToCheckpointUpdates(): void {
    this.checkpointService.getCheckpoints()
      .pipe(takeUntil(this.destroy$))
      .subscribe((checkpoints: Record<string, any>) => {
        const updated = checkpoints[this.modalData.clientId];
        if (updated) {
          this.modalData.checkpoint = updated;
        }
      });
  }

  // =================================
  // EVENT HANDLERS
  // =================================

  onOverlayClick(event: Event): void {
    if (!this.isInterviewInProgress) {
      this.closeModal();
    }
  }

  closeModal(): void {
    if (!this.isInterviewInProgress) {
      this.modalClosed.emit();
    }
  }

  onValidationComplete(result: any): void {
    this.isInterviewInProgress = false;
    
    // Update checkpoint with results
    const updatedCheckpoint = this.checkpointService.completeInterview(
      this.modalData.clientId, 
      result
    );
    
    this.modalData.checkpoint = updatedCheckpoint;
    this.interviewCompleted.emit({
      checkpoint: updatedCheckpoint,
      result: result
    });
  }

  onInterviewApproved(data: any): void {
    this.continueToUpload();
  }

  onRecorderError(error: string): void {
    this.errorMessage = error;
    this.isInterviewInProgress = false;
  }

  retryInterview(): void {
    this.errorMessage = '';
    
    // Start new interview attempt
    const updatedCheckpoint = this.checkpointService.startInterview(this.modalData.clientId);
    this.modalData.checkpoint = updatedCheckpoint;
    this.isInterviewInProgress = true;
  }

  continueToUpload(): void {
    this.continueUpload.emit();
    this.closeModal();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocusInModal(event);
    }
  }

  contactSupervisor(): void {
    // In a real app, this would open a contact form or make a call
    const phone = '+52-55-5555-5555';
    const message = `Cliente ${this.modalData.clientName} (${this.modalData.clientId}) necesita ayuda con entrevista obligatoria. Máximo de intentos alcanzado.`;
    
    if (confirm(`¿Desea contactar al supervisor?\n\nTeléfono: ${phone}\n\nSe copiará el siguiente mensaje:\n"${message}"`)) {
      // Copy message to clipboard
      navigator.clipboard?.writeText(message);
      
      // Open phone dialer (mobile)
      window.open(`tel:${phone}`);
    }
  }

  toggleHelp(): void {
    this.helpExpanded = !this.helpExpanded;
  }

  // =================================
  // STATUS HELPERS
  // =================================

  getStatusClass(): string {
    if (!this.modalData.checkpoint) return '';
    
    const status = this.modalData.checkpoint.status;
    return status.replace('_', '-');
  }

  getStatusIcon(): string {
    if (!this.modalData.checkpoint) return '❓';
    
    switch (this.modalData.checkpoint.status) {
      case 'required_pending': return '⏳';
      case 'in_progress': return '🎙️';
      case 'completed_valid': return '✅';
      case 'completed_invalid': return '❌';
      case 'expired': return '⏰';
      default: return '❓';
    }
  }

  getStatusText(): string {
    if (!this.modalData.checkpoint) return 'Estado desconocido';
    
    switch (this.modalData.checkpoint.status) {
      case 'required_pending': return 'Entrevista pendiente';
      case 'in_progress': return 'Entrevista en progreso';
      case 'completed_valid': return 'Entrevista completada exitosamente';
      case 'completed_invalid': return 'Entrevista no válida';
      case 'expired': return 'Entrevista expirada';
      default: return 'Estado desconocido';
    }
  }

  getStatusDetails(): string | null {
    if (!this.modalData.checkpoint) return null;
    
    switch (this.modalData.checkpoint.status) {
      case 'required_pending': 
        return 'Debe completar la entrevista antes de continuar con la documentación.';
      
      case 'in_progress': 
        return 'La entrevista está siendo grabada. Complete todas las preguntas obligatorias.';
      
      case 'completed_valid': 
        const validUntil = this.modalData.checkpoint.expires_at;
        return validUntil ? `Válida hasta: ${new Date(validUntil).toLocaleString('es-MX')}` : 'Entrevista válida.';
      
      case 'completed_invalid': 
        const attempts = this.modalData.checkpoint.attempts;
        const maxAttempts = this.modalData.checkpoint.requirement?.max_attempts || 3;
        return `Intento ${attempts} de ${maxAttempts}. La entrevista no cumplió con los requerimientos.`;
      
      case 'expired': 
        return 'La entrevista anterior ha expirado. Debe realizar una nueva.';
      
      default: 
        return null;
    }
  }

  // =================================
  // CONDITION HELPERS
  // =================================

  canStartInterview(): boolean {
    if (!this.modalData.checkpoint) return false;
    
    const status = this.modalData.checkpoint.status;
    return ['required_pending', 'completed_invalid', 'expired'].includes(status) &&
           !this.isMaxAttemptsReached();
  }

  canRetryInterview(): boolean {
    if (!this.modalData.checkpoint) return false;
    
    return this.modalData.checkpoint.status === 'completed_invalid' &&
           !this.isMaxAttemptsReached();
  }

  canContinue(): boolean {
    return this.modalData.checkpoint?.status === 'completed_valid' &&
           this.isCheckpointValid();
  }

  isMaxAttemptsReached(): boolean {
    if (!this.modalData.checkpoint) return false;
    
    const attempts = this.modalData.checkpoint.attempts;
    const maxAttempts = this.modalData.checkpoint.requirement?.max_attempts || 3;
    return attempts >= maxAttempts;
  }

  private isCheckpointValid(): boolean {
    if (!this.modalData.checkpoint?.expires_at) return true;
    return new Date() < new Date(this.modalData.checkpoint.expires_at);
  }

  // =================================
  // FORMATTING HELPERS
  // =================================

  getProductTypeLabel(productType: string): string {
    const labels: { [key: string]: string } = {
      'individual': 'Individual',
      'colectivo': 'Colectivo',
      'contado': 'Contado',
      'credito_simple': 'Crédito Simple',
      'high_risk': 'Alto Riesgo',
      'standard': 'Estándar'
    };
    return labels[productType] || productType;
  }

  getMunicipalityLabel(municipality: string): string {
    const labels: { [key: string]: string } = {
      'aguascalientes': 'Aguascalientes',
      'estado_de_mexico': 'Estado de México',
      'default': 'General'
    };
    return labels[municipality] || municipality;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
    } else {
      return `${seconds} seg`;
    }
  }

  getRemainingAttempts(): string {
    if (!this.modalData.checkpoint) return '0';
    
    const attempts = this.modalData.checkpoint.attempts;
    const maxAttempts = this.modalData.checkpoint.requirement?.max_attempts || 3;
    const remaining = Math.max(0, maxAttempts - attempts);
    
    return `${remaining} de ${maxAttempts}`;
  }

  private focusFirstElementInModal(): void {
    const modal = document.querySelector('.checkpoint-modal') as HTMLElement | null;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] || modal;
    first.focus();
  }

  private trapFocusInModal(event: KeyboardEvent): void {
    const modal = document.querySelector('.checkpoint-modal') as HTMLElement | null;
    if (!modal) return;
    const focusable = Array.from(modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement;
    if (event.shiftKey) {
      if (active === first) {
        last.focus();
        event.preventDefault();
      }
    } else {
      if (active === last) {
        first.focus();
        event.preventDefault();
      }
    }
  }

  private restoreFocusAfterModal(): void {
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
      this.previouslyFocusedElement = null;
    }
  }
}