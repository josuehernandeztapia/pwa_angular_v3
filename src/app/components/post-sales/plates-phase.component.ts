import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IconName } from '../shared/icon/icon-definitions';
import { IconComponent } from '../shared/icon/icon.component';
import {
  DocumentFile,
  PlatesData
} from '../../models/types';
import { IntegratedImportTrackerService } from '../../services/integrated-import-tracker.service';
import { PlatesValidationService } from '../../services/plates-validation.service';

type IconKey =
  | 'alert'
  | 'vehicle'
  | 'identifier'
  | 'plates'
  | 'document'
  | 'upload'
  | 'photos'
  | 'remove'
  | 'checklist'
  | 'record'
  | 'maintenance'
  | 'survey'
  | 'integration';

/**
 * FASE 8: PLACAS ENTREGADAS - HANDOVER CRÍTICO
 * Pantalla final que dispara el evento vehicle.delivered.
 * Identificación: VIN + PLACA (sistema robusto).
 */
@Component({
  selector: 'app-plates-phase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './plates-phase.component.html',
  styleUrls: ['./plates-phase.component.scss']
})
export class PlatesPhaseComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private importTracker = inject(IntegratedImportTrackerService);
  private platesService = inject(PlatesValidationService);

  private readonly iconMap = new Map<IconKey, IconName>([
    ['alert', 'shield-alert'],
    ['vehicle', 'truck'],
    ['identifier', 'badge-check'],
    ['plates', 'target'],
    ['document', 'document'],
    ['upload', 'cloud-upload'],
    ['photos', 'camera'],
    ['remove', 'close'],
    ['checklist', 'clipboard'],
    ['record', 'collection'],
    ['maintenance', 'settings'],
    ['survey', 'chart'],
    ['integration', 'link']
  ]);

  // Signals
  clientId = signal<string>('client_001');
  clientInfo = signal<{ name: string; vin: string } | null>(null);
  vehicleInfo = signal<any | null>(null);
  tarjetaCirculacion = signal<DocumentFile | null>(null);
  fotografiasPlacas = signal<string[]>([]);
  placaValidation = signal<{ isValid: boolean; estado?: string }>({ isValid: false });
  isSaving = signal(false);
  isSubmitting = signal(false);
  showSuccessModal = signal(false);
  postSalesRecordId = signal<string>('');
  nextMaintenanceDate = signal<string>('');
  private lastFocusedElement: HTMLElement | null = null;
  private lastErrorIndex = -1;

  // Form
  platesForm: FormGroup;
  today = new Date().toISOString().split('T')[0];

  // Computed
  hasValidPlaca = computed(() => {
    return this.placaValidation().isValid && this.platesForm?.get('numeroPlacas')?.value;
  });

  hasRequiredData = computed(() => {
    const form = this.platesForm;
    if (!form) return false;

    return (
      this.hasValidPlaca() &&
      form.get('estado')?.value &&
      form.get('fechaAlta')?.value &&
      this.tarjetaCirculacion() !== null &&
      this.fotografiasPlacas().length >= 1
    );
  });

  canCompleteHandover = computed(() => {
    const form = this.platesForm;
    if (!form) return false;

    return (
      form.valid &&
      this.hasRequiredData() &&
      form.get('placasInstaladas')?.value &&
      form.get('tarjetaEntregada')?.value &&
      form.get('entregaCompleta')?.value &&
      (!form.get('hologramas')?.value || form.get('hologramasVerificados')?.value)
    );
  });

  validationErrors = computed(() => {
    const errors: string[] = [];
    const form = this.platesForm;
    if (!form) return errors;

    if (!this.hasValidPlaca()) errors.push('Número de placas válido');
    if (form.get('estado')?.invalid) errors.push('Estado de emisión');
    if (form.get('fechaAlta')?.invalid) errors.push('Fecha de alta');

    if (!this.tarjetaCirculacion()) errors.push('Tarjeta de circulación');
    if (this.fotografiasPlacas().length === 0) errors.push('Fotografías de placas');

    if (this.hasRequiredData()) {
      if (!form.get('placasInstaladas')?.value) errors.push('Confirmación de placas instaladas');
      if (!form.get('tarjetaEntregada')?.value) errors.push('Confirmación de tarjeta entregada');
      if (!form.get('entregaCompleta')?.value) errors.push('Confirmación de entrega completa');
      if (form.get('hologramas')?.value && !form.get('hologramasVerificados')?.value) {
        errors.push('Verificación de hologramas');
      }
    }

    return errors;
  });

  constructor() {
    this.platesForm = this.fb.group({
      numeroPlacas: ['', [Validators.required, this.placaValidator]],
      estado: ['', Validators.required],
      fechaAlta: [this.today, Validators.required],
      hologramas: [true],
      placasInstaladas: [false],
      tarjetaEntregada: [false],
      hologramasVerificados: [false],
      entregaCompleta: [false]
    });

    this.loadPlatesData();
  }

  private placaValidator = (control: AbstractControl) => {
    if (!control.value) return null;
    const estado = this.platesForm?.get('estado')?.value;
    const isValid = this.platesService.validatePlacaFormat(control.value, estado);
    return isValid ? null : { invalidPlaca: true };
  };

  private loadPlatesData(): void {
    this.clientInfo.set({
      name: 'José Hernández Pérez',
      vin: '3N1CN7AP8KL123456'
    });

    this.vehicleInfo.set({
      vin: '3N1CN7AP8KL123456',
      serie: 'NIS2024001',
      modelo: 'Nissan Urvan NV200',
      year: 2024
    });
  }

  getUniqueIdentifier(): string {
    const vin = this.vehicleInfo()?.vin || '';
    const placa = this.platesForm?.get('numeroPlacas')?.value || '';
    const id = this.platesService.buildUniqueId(vin, placa);
    return id || 'Pendiente...';
  }

  onPlacaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.toUpperCase();

    value = value.replace(/[^A-Z0-9]/g, '');

    if (value.length >= 3 && value.length <= 6) {
      value = value.slice(0, 3) + '-' + value.slice(3);
    }
    if (value.length > 7) {
      value = value.slice(0, 7) + '-' + value.slice(7);
    }

    input.value = value;
    this.platesForm.get('numeroPlacas')?.setValue(value, { emitEvent: false });
    this.validatePlaca(value);
  }

  private async validatePlaca(placa: string): Promise<void> {
    const estadoHint = this.platesForm.get('estado')?.value;
    const result = await this.platesService.verifyPlacaAsync(placa, estadoHint);
    this.placaValidation.set({ isValid: result.isValid, estado: result.estado });
    if (result.isValid && result.estado) {
      this.platesForm.get('estado')?.setValue(result.estado);
    }
  }

  onEstadoChange(): void {
    const placa = this.platesForm.get('numeroPlacas')?.value;
    if (placa) {
      this.validatePlaca(placa);
      this.platesForm.get('numeroPlacas')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  triggerDocumentUpload(): void {
    const input = document.querySelector('#documentInput') as HTMLInputElement | null;
    input?.click();
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF para la tarjeta de circulación');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    const documentFile: DocumentFile = {
      filename: file.name,
      url: URL.createObjectURL(file),
      uploadedAt: new Date(),
      size: file.size,
      type: 'pdf'
    };

    this.tarjetaCirculacion.set(documentFile);
    input.value = '';
  }

  removeDocument(): void {
    this.tarjetaCirculacion.set(null);
  }

  viewDocument(): void {
    const doc = this.tarjetaCirculacion();
    if (doc?.url) {
      window.open(doc.url, '_blank');
    }
  }

  triggerPhotoUpload(): void {
    const input = document.querySelector('#photoInput') as HTMLInputElement | null;
    input?.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        this.fotografiasPlacas.set([...this.fotografiasPlacas(), result]);
      };
      reader.readAsDataURL(file);
    });
  }

  removePhoto(photo: string): void {
    const current = this.fotografiasPlacas();
    this.fotografiasPlacas.set(current.filter(p => p !== photo));
  }

  getPhotoLabel(index: number): string {
    const labels = ['Placa Delantera', 'Placa Trasera', 'Hologramas', 'Detalle'];
    return labels[index] || `Foto ${index + 1}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  saveDraft(): void {
    this.isSaving.set(true);
    setTimeout(() => {
      this.isSaving.set(false);
    }, 1500);
  }

  onSubmit(): void {
    if (!this.canCompleteHandover()) {
      this.focusFirstInvalidControl();
      return;
    }

    this.isSubmitting.set(true);

    const platesData: PlatesData = {
      numeroPlacas: this.platesForm.get('numeroPlacas')?.value,
      estado: this.platesForm.get('estado')?.value,
      fechaAlta: new Date(this.platesForm.get('fechaAlta')?.value),
      tarjetaCirculacion: this.tarjetaCirculacion()!,
      fotografiasPlacas: this.fotografiasPlacas(),
      hologramas: this.platesForm.get('hologramas')?.value
    };

    this.importTracker.completePlatesPhase(this.clientId(), platesData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.postSalesRecordId.set(`PSR_${Date.now()}`);
        this.nextMaintenanceDate.set(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'));
        this.lastFocusedElement = document.activeElement as HTMLElement;
        this.showSuccessModal.set(true);
        setTimeout(() => this.focusFirstElementInModal(), 0);
      },
      error: () => {
        this.isSubmitting.set(false);
        alert('Error crítico en el handover. El sistema post-venta NO se activó. Contacta soporte técnico.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/post-sales/documents', this.clientId()]);
  }

  viewPostSalesDashboard(): void {
    const identifier = this.getUniqueIdentifier();
    this.router.navigate(['/post-sales/dashboard', identifier]);
  }

  completeProcess(): void {
    this.showSuccessModal.set(false);
    this.router.navigate(['/dashboard']);
    this.restoreFocusAfterModal();
  }

  onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.showSuccessModal.set(false);
      this.restoreFocusAfterModal();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocusInModal(event);
    }
  }

  private focusFirstInvalidControl(): void {
    const form = this.platesForm;
    const controls = Object.keys(form.controls);
    for (const name of controls) {
      const control = form.get(name);
      if (control && control.invalid) {
        const el = document.getElementById(name) as HTMLElement | null;
        el?.focus();
        break;
      }
    }
  }

  goToNextError(): void {
    const controls = Object.keys(this.platesForm.controls);
    const invalidNames = controls.filter(name => this.platesForm.get(name)?.invalid);
    if (invalidNames.length === 0) return;

    this.lastErrorIndex = (this.lastErrorIndex + 1) % invalidNames.length;
    const nextName = invalidNames[this.lastErrorIndex];
    const el = document.getElementById(nextName) as HTMLElement | null;
    el?.focus();
  }

  private focusFirstElementInModal(): void {
    const modal = document.querySelector('.plates-phase__modal') as HTMLElement | null;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] || modal;
    first.focus();
  }

  private trapFocusInModal(event: KeyboardEvent): void {
    const modal = document.querySelector('.plates-phase__modal') as HTMLElement | null;
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
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  }

  getIcon(key: IconKey): IconName {
    return this.iconMap.get(key) ?? 'document';
  }
}
