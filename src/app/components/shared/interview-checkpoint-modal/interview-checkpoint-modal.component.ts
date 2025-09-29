import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
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
  templateUrl: './interview-checkpoint-modal.component.html',
  styleUrls: ['./interview-checkpoint-modal.component.scss']
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

  constructor(private checkpointService: InterviewCheckpointService) {}

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
    this.checkpointService
      .getCheckpoints()
      .pipe(takeUntil(this.destroy$))
      .subscribe((checkpoints: Record<string, any>) => {
        const updated = checkpoints[this.modalData.clientId];
        if (updated) {
          this.modalData = {
            ...this.modalData,
            checkpoint: updated,
          };
        }
      });
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.isInterviewInProgress) {
      this.closeModal();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.isInterviewInProgress) {
      this.closeModal();
    }

    if (event.key === 'Tab') {
      this.trapFocusInModal(event);
    }
  }

  closeModal(): void {
    this.modalClosed.emit();
    this.isInterviewInProgress = false;
    this.errorMessage = '';
  }

  onValidationComplete(result: any): void {
    if (result?.isValid) {
      this.errorMessage = '';
    } else {
      this.errorMessage = result?.message || 'La entrevista continúa en validación.';
    }
  }

  onInterviewApproved(result: any): void {
    this.isInterviewInProgress = false;
    this.errorMessage = '';
    this.interviewCompleted.emit(result);
  }

  onRecorderError(error: any): void {
    this.isInterviewInProgress = false;
    this.errorMessage = error?.message || 'Ocurrió un error durante la grabación.';
  }

  onRecordStart(): void {
    this.isInterviewInProgress = true;
    this.errorMessage = '';
  }

  retryInterview(): void {
    this.errorMessage = '';
    this.isInterviewInProgress = false;
    if (this.voiceRecorder) {
      this.voiceRecorder.resetRecording();
    }
  }

  continueToUpload(): void {
    this.continueUpload.emit();
    this.closeModal();
  }

  contactSupervisor(): void {
    const supervisorPhone = this.modalData.checkpoint?.requirement?.supervisor_phone;
    if (supervisorPhone) {
      window.open(`tel:${supervisorPhone}`);
    }
  }

  toggleHelp(): void {
    this.helpExpanded = !this.helpExpanded;
  }

  // =================================
  // STATUS HELPERS
  // =================================

  getStatusClass(): string {
    const status = this.modalData?.checkpoint?.status;
    if (!status) {
      return '';
    }

    const map: Record<string, string> = {
      required_pending: 'checkpoint-modal__status--pending',
      in_progress: 'checkpoint-modal__status--progress',
      completed_valid: 'checkpoint-modal__status--success',
      completed_invalid: 'checkpoint-modal__status--invalid',
      expired: 'checkpoint-modal__status--expired',
    };

    return map[status] || '';
  }

  getStatusIcon(): string {
    if (!this.modalData?.checkpoint) return '❓';

    switch (this.modalData.checkpoint.status) {
      case 'required_pending':
        return '⏳';
      case 'in_progress':
        return 'REC';
      case 'completed_valid':
        return '✅';
      case 'completed_invalid':
        return '⚠️';
      case 'expired':
        return '⏰';
      default:
        return '❓';
    }
  }

  getStatusText(): string {
    if (!this.modalData?.checkpoint) return 'Estado desconocido';

    switch (this.modalData.checkpoint.status) {
      case 'required_pending':
        return 'Entrevista pendiente';
      case 'in_progress':
        return 'Entrevista en progreso';
      case 'completed_valid':
        return 'Entrevista completada exitosamente';
      case 'completed_invalid':
        return 'Entrevista no válida';
      case 'expired':
        return 'Entrevista expirada';
      default:
        return 'Estado desconocido';
    }
  }

  getStatusDetails(): string | null {
    if (!this.modalData?.checkpoint) return null;

    switch (this.modalData.checkpoint.status) {
      case 'required_pending':
        return 'Debe completar la entrevista antes de continuar con la documentación.';
      case 'in_progress':
        return 'La entrevista está siendo grabada. Complete todas las preguntas obligatorias.';
      case 'completed_valid':
        return this.modalData.checkpoint.expires_at
          ? `Válida hasta: ${new Date(
              this.modalData.checkpoint.expires_at
            ).toLocaleString('es-MX')}`
          : 'Entrevista válida.';
      case 'completed_invalid':
        return `Intento ${this.modalData.checkpoint.attempts} de ${
          this.modalData.checkpoint.requirement?.max_attempts || 3
        }. La entrevista no cumplió con los requerimientos.`;
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
    if (!this.modalData?.checkpoint) return false;

    const status = this.modalData.checkpoint.status;
    return ['required_pending', 'completed_invalid', 'expired'].includes(status) && !this.isMaxAttemptsReached();
  }

  canRetryInterview(): boolean {
    if (!this.modalData?.checkpoint) return false;

    return this.modalData.checkpoint.status === 'completed_invalid' && !this.isMaxAttemptsReached();
  }

  canContinue(): boolean {
    return this.modalData?.checkpoint?.status === 'completed_valid' && this.isCheckpointValid();
  }

  isMaxAttemptsReached(): boolean {
    if (!this.modalData?.checkpoint) return false;

    const attempts = this.modalData.checkpoint.attempts;
    const maxAttempts = this.modalData.checkpoint.requirement?.max_attempts || 3;
    return attempts >= maxAttempts;
  }

  private isCheckpointValid(): boolean {
    const expiresAt = this.modalData?.checkpoint?.expires_at;
    if (!expiresAt) {
      return true;
    }

    return new Date() < new Date(expiresAt);
  }

  // =================================
  // FORMATTING HELPERS
  // =================================

  getProductTypeLabel(productType: string): string {
    const labels: Record<string, string> = {
      individual: 'Individual',
      colectivo: 'Colectivo',
      contado: 'Contado',
      credito_simple: 'Crédito Simple',
      high_risk: 'Alto Riesgo',
      standard: 'Estándar',
    };
    return labels[productType] || productType;
  }

  getMunicipalityLabel(municipality: string): string {
    const labels: Record<string, string> = {
      aguascalientes: 'Aguascalientes',
      estado_de_mexico: 'Estado de México',
      default: 'General',
    };
    return labels[municipality] || municipality;
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
    }
    return `${seconds} seg`;
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(0);
    }

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getRemainingAttempts(): string {
    if (!this.modalData?.checkpoint) return '0';

    const attempts = this.modalData.checkpoint.attempts;
    const maxAttempts = this.modalData.checkpoint.requirement?.max_attempts || 3;
    const remaining = Math.max(0, maxAttempts - attempts);

    return `${remaining} de ${maxAttempts}`;
  }

  // =================================
  // ACCESSIBILITY HELPERS
  // =================================

  private focusFirstElementInModal(): void {
    const modal = document.querySelector('.checkpoint-modal__panel') as HTMLElement | null;
    if (!modal) return;

    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] || modal;
    first.focus();
  }

  private trapFocusInModal(event: KeyboardEvent): void {
    const modal = document.querySelector('.checkpoint-modal__panel') as HTMLElement | null;
    if (!modal) return;

    const focusable = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled'));

    if (!focusable.length) {
      return;
    }

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
