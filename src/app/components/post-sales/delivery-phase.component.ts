import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IconName } from '../shared/icon/icon-definitions';
import { IconComponent } from '../shared/icon/icon.component';
import {
  DeliveryChecklistItem,
  DeliveryData
} from '../../models/types';
import { IntegratedImportTrackerService } from '../../services/integrated-import-tracker.service';
import { PostSalesApiService } from '../../services/post-sales-api.service';

type ChecklistStatus = DeliveryChecklistItem['status'];
type SectionIconKey =
  | 'vehicle'
  | 'odometer'
  | 'details'
  | 'checklist'
  | 'photos'
  | 'signature'
  | 'notes'
  | 'remove'
  | 'complete';

/**
 * FASE 6: ENTREGA DEL VEHÍCULO
 * Pantalla para completar la entrega física del vehículo
 * Captura: odómetro, fotos, firma digital, checklist de inspección
 */
@Component({
  selector: 'app-delivery-phase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IconComponent],
  templateUrl: './delivery-phase.component.html',
  styleUrls: ['./delivery-phase.component.scss']
})
export class DeliveryPhaseComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private importTracker = inject(IntegratedImportTrackerService);
  private postSalesApi = inject(PostSalesApiService);

  private readonly sectionIcons = new Map<SectionIconKey, IconName>([
    ['vehicle', 'truck'],
    ['odometer', 'clock'],
    ['details', 'clipboard'],
    ['checklist', 'check'],
    ['photos', 'camera'],
    ['signature', 'document'],
    ['notes', 'edit'],
    ['remove', 'close'],
    ['complete', 'check-circle']
  ]);

  private readonly statusIcons = new Map<ChecklistStatus, IconName>([
    ['approved', 'check'],
    ['with_issues', 'shield-alert'],
    ['rejected', 'stop']
  ]);

  // Signals
  clientId = signal<string>('client_001'); // En producción vendría de la ruta
  clientInfo = signal<{ name: string; vin: string } | null>(null);
  vehicleInfo = signal<any | null>(null);
  checklistItems = signal<DeliveryChecklistItem[]>([
    { item: 'Exterior del vehículo sin daños', status: 'approved', notes: '' },
    { item: 'Interior limpio y en buen estado', status: 'approved', notes: '' },
    { item: 'Todos los documentos presentes', status: 'approved', notes: '' },
    { item: 'Llaves y controles funcionando', status: 'approved', notes: '' },
    { item: 'Nivel de combustible adecuado', status: 'approved', notes: '' },
    { item: 'Neumáticos en buen estado', status: 'approved', notes: '' },
    { item: 'Luces y sistemas eléctricos', status: 'approved', notes: '' },
    { item: 'Manual del propietario incluido', status: 'approved', notes: '' }
  ]);
  uploadedPhotos = signal<string[]>([]);
  digitalSignature = signal<string | null>(null);
  isSaving = signal(false);
  isSubmitting = signal(false);
  showSuccessModal = signal(false);

  // Form
  deliveryForm: FormGroup;

  // Computed
  progressPercentage = computed(() => {
    const form = this.deliveryForm;
    if (!form) return 0;

    let completedFields = 0;
    const totalFields = 6; // odometro, fecha, hora, domicilio, fotos, firma

    if (form.get('odometroEntrega')?.valid) completedFields++;
    if (form.get('fechaEntrega')?.valid) completedFields++;
    if (form.get('horaEntrega')?.valid) completedFields++;
    if (form.get('domicilioEntrega')?.valid) completedFields++;
    if (this.uploadedPhotos().length > 0) completedFields++;
    if (this.digitalSignature()) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  });

  canCompleteDelivery = computed(() => {
    const form = this.deliveryForm;
    if (!form) return false;

    return (
      form.valid &&
      this.uploadedPhotos().length >= 1 &&
      this.digitalSignature() !== null &&
      this.checklistItems().every(item => item.status !== 'rejected')
    );
  });

  validationErrors = computed(() => {
    const errors: string[] = [];
    const form = this.deliveryForm;
    if (!form) return errors;

    if (form.get('odometroEntrega')?.invalid) {
      errors.push('Lectura del odómetro');
    }
    if (form.get('fechaEntrega')?.invalid) {
      errors.push('Fecha de entrega');
    }
    if (form.get('horaEntrega')?.invalid) {
      errors.push('Hora de entrega');
    }
    if (form.get('domicilioEntrega')?.invalid) {
      errors.push('Domicilio de entrega');
    }
    if (this.uploadedPhotos().length === 0) {
      errors.push('Al menos una fotografía del vehículo');
    }
    if (!this.digitalSignature()) {
      errors.push('Firma digital del cliente');
    }

    const rejectedItems = this.checklistItems().filter(item => item.status === 'rejected');
    if (rejectedItems.length > 0) {
      errors.push(`${rejectedItems.length} elemento(s) del checklist rechazados`);
    }

    return errors;
  });

  constructor() {
    this.deliveryForm = this.fb.group({
      odometroEntrega: ['', [Validators.required, Validators.min(0), Validators.max(999999)]],
      fechaEntrega: [new Date().toISOString().split('T')[0], Validators.required],
      horaEntrega: [new Date().toTimeString().slice(0, 5), Validators.required],
      domicilioEntrega: ['', [Validators.required, Validators.minLength(10)]],
      incidencias: ['']
    });

    // Initialize data
    this.loadDeliveryData();
  }

  private loadDeliveryData(): void {
    // Simulate loading client and vehicle data
    this.clientInfo.set({
      name: 'José Hernández Pérez',
      vin: '3N1CN7AP8KL123456'
    });

    this.vehicleInfo.set({
      vin: '3N1CN7AP8KL123456',
      serie: 'NIS2024001',
      modelo: 'Nissan Urvan NV200',
      year: 2024,
      numeroMotor: 'HR16DE789012'
    });
  }

  updateChecklistItem(itemName: string, status: ChecklistStatus): void {
    const updatedItems = this.checklistItems().map(item =>
      item.item === itemName
        ? { ...item, status, notes: status === 'approved' ? '' : item.notes }
        : item
    );
    this.checklistItems.set(updatedItems);
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
        this.uploadedPhotos.set([...this.uploadedPhotos(), result]);
      };
      reader.readAsDataURL(file);
    });
  }

  removePhoto(photo: string): void {
    const current = this.uploadedPhotos();
    this.uploadedPhotos.set(current.filter(p => p !== photo));
  }

  openSignatureModal(): void {
    // En implementación real, abriría un modal con canvas para firma
    // Por ahora simulamos una firma
    const mockSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    this.digitalSignature.set(mockSignature);
  }

  saveDraft(): void {
    this.isSaving.set(true);

    // Simulate saving draft
    setTimeout(() => {
      this.isSaving.set(false);
    }, 1500);
  }

  onSubmit(): void {
    if (!this.canCompleteDelivery()) {
      return;
    }

    this.isSubmitting.set(true);

    const deliveryData: DeliveryData = {
      odometroEntrega: this.deliveryForm.get('odometroEntrega')?.value,
      fechaEntrega: new Date(this.deliveryForm.get('fechaEntrega')?.value),
      horaEntrega: this.deliveryForm.get('horaEntrega')?.value,
      domicilioEntrega: this.deliveryForm.get('domicilioEntrega')?.value,
      fotosVehiculo: this.uploadedPhotos(),
      firmaDigitalCliente: this.digitalSignature()!,
      checklistEntrega: this.checklistItems(),
      incidencias: this.deliveryForm.get('incidencias')?.value
        ? [this.deliveryForm.get('incidencias')?.value]
        : [],
      entregadoPor: 'asesor_001' // En producción vendría del usuario logueado
    };

    // Complete delivery phase
    this.importTracker.completeDeliveryPhase(this.clientId(), deliveryData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showSuccessModal.set(true);
      },
      error: () => {
        this.isSubmitting.set(false);
        alert('Error al completar la entrega. Intenta nuevamente.');
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
  }

  goToDocumentsPhase(): void {
    this.router.navigate(['/post-sales/documents', this.clientId()]);
    this.closeSuccessModal();
  }

  onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeSuccessModal();
    }
  }

  getSectionIcon(key: SectionIconKey): IconName {
    return this.sectionIcons.get(key) ?? 'document';
  }

  getStatusIcon(status: ChecklistStatus): IconName {
    return this.statusIcons.get(status) ?? 'check';
  }
}
