import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DeliveryChecklistItem,
  DeliveryData
} from '../../models/types';
import { IntegratedImportTrackerService } from '../../services/integrated-import-tracker.service';
import { PostSalesApiService } from '../../services/post-sales-api.service';

/**
 * FASE 6: ENTREGA DEL VEHÍCULO
 * Pantalla para completar la entrega física del vehículo
 * Captura: odómetro, fotos, firma digital, checklist de inspección
 */
@Component({
  selector: 'app-delivery-phase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="delivery-phase-container">
      <!-- Header -->
      <div class="phase-header">
        <div class="phase-indicator">
          <span class="phase-number">6</span>
          <div class="phase-info">
            <h2>Entrega del Vehículo</h2>
            <p>Inspección final y entrega al cliente</p>
          </div>
        </div>
        <div class="client-info" *ngIf="clientInfo()">
          <span class="client-name">{{ clientInfo()?.name }}</span>
          <span class="vin">VIN: {{ clientInfo()?.vin }}</span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
        <span class="progress-text">{{ progressPercentage() }}% completado</span>
      </div>

      <!-- Main Form -->
      <form [formGroup]="deliveryForm" (ngSubmit)="onSubmit()" class="delivery-form">
        
        <!-- Vehicle Information -->
        <div class="form-section">
          <h3>📋 Información del Vehículo</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Modelo:</label>
              <span>{{ vehicleInfo()?.modelo || 'Cargando...' }}</span>
            </div>
            <div class="info-item">
              <label>VIN:</label>
              <span>{{ vehicleInfo()?.vin || 'Cargando...' }}</span>
            </div>
            <div class="info-item">
              <label>Serie:</label>
              <span>{{ vehicleInfo()?.serie || 'Cargando...' }}</span>
            </div>
            <div class="info-item">
              <label>Año:</label>
              <span>{{ vehicleInfo()?.year || 'Cargando...' }}</span>
            </div>
          </div>
        </div>

        <!-- Odometer Reading -->
        <div class="form-section">
          <h3>📏 Lectura de Odómetro</h3>
          <div class="odometer-input">
            <label for="odometro">Kilometraje de Entrega *</label>
            <input 
              type="number" 
              id="odometro"
              formControlName="odometroEntrega"
              placeholder="0"
              min="0"
              max="999999"
              class="form-input"
              [class.error]="deliveryForm.get('odometroEntrega')?.invalid && deliveryForm.get('odometroEntrega')?.touched"
            >
            <span class="unit">km</span>
            @if (deliveryForm.get('odometroEntrega')?.invalid && deliveryForm.get('odometroEntrega')?.touched) {
              <div class="error-message">El odómetro es requerido y debe ser válido</div>
            }
          </div>
        </div>

        <!-- Delivery Details -->
        <div class="form-section">
          <h3>📍 Detalles de Entrega</h3>
          <div class="delivery-details">
            <div class="input-group">
              <label for="fechaEntrega">Fecha de Entrega *</label>
              <input 
                type="date" 
                id="fechaEntrega"
                formControlName="fechaEntrega"
                class="form-input"
                [class.error]="deliveryForm.get('fechaEntrega')?.invalid && deliveryForm.get('fechaEntrega')?.touched"
              >
            </div>
            <div class="input-group">
              <label for="horaEntrega">Hora de Entrega *</label>
              <input 
                type="time" 
                id="horaEntrega"
                formControlName="horaEntrega"
                class="form-input"
                [class.error]="deliveryForm.get('horaEntrega')?.invalid && deliveryForm.get('horaEntrega')?.touched"
              >
            </div>
            <div class="input-group full-width">
              <label for="domicilio">Domicilio de Entrega *</label>
              <textarea 
                id="domicilio"
                formControlName="domicilioEntrega"
                placeholder="Dirección completa donde se entregó el vehículo..."
                class="form-textarea"
                rows="3"
                [class.error]="deliveryForm.get('domicilioEntrega')?.invalid && deliveryForm.get('domicilioEntrega')?.touched"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Inspection Checklist -->
        <div class="form-section">
          <h3>✅ Lista de Verificación de Entrega</h3>
          <div class="checklist">
            @for (item of checklistItems(); track item.item) {
              <div class="checklist-item">
                <div class="item-header">
                  <span class="item-name">{{ item.item }}</span>
                  <div class="status-buttons">
                    <button 
                      type="button"
                      class="status-btn approved"
                      [class.active]="item.status === 'approved'"
                      (click)="updateChecklistItem(item.item, 'approved')"
                    >
                      ✅ Aprobado
                    </button>
                    <button 
                      type="button"
                      class="status-btn with-issues"
                      [class.active]="item.status === 'with_issues'"
                      (click)="updateChecklistItem(item.item, 'with_issues')"
                    >
                      ⚠️ Con Observaciones
                    </button>
                    <button 
                      type="button"
                      class="status-btn rejected"
                      [class.active]="item.status === 'rejected'"
                      (click)="updateChecklistItem(item.item, 'rejected')"
                    >
                      ❌ Rechazado
                    </button>
                  </div>
                </div>
                @if (item.status === 'with_issues' || item.status === 'rejected') {
                  <div class="item-notes">
                    <textarea 
                      [(ngModel)]="item.notes"
                      placeholder="Describe las observaciones o problemas encontrados..."
                      class="notes-textarea"
                      rows="2"
                    ></textarea>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Photo Upload -->
        <div class="form-section">
          <h3>📷 Fotografías del Vehículo</h3>
          <div class="photo-upload">
            <div class="upload-area" (click)="triggerPhotoUpload()">
              <div class="upload-placeholder">
                <span class="upload-icon">📷</span>
                <p>Toca para agregar fotos del vehículo</p>
                <small>Recomendado: frente, atrás, laterales, interior</small>
              </div>
            </div>
            <input 
              #photoInput
              id="photoInput"
              type="file" 
              accept="image/*" 
              multiple 
              (change)="onPhotoSelected($event)"
              style="display: none;"
            >
            @if (uploadedPhotos().length > 0) {
              <div class="photo-preview">
                @for (photo of uploadedPhotos(); track photo) {
                  <div class="photo-item">
                    <img [src]="photo" alt="Vehicle photo" class="photo-thumbnail">
                    <button 
                      type="button" 
                      class="remove-photo-btn"
                      (click)="removePhoto(photo)"
                    >
                      ✕
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Digital Signature -->
        <div class="form-section">
          <h3>✍️ Firma Digital del Cliente</h3>
          <div class="signature-area">
            @if (!digitalSignature()) {
              <div class="signature-placeholder" (click)="openSignatureModal()">
                <span class="signature-icon">✍️</span>
                <p>Toca para capturar la firma del cliente</p>
              </div>
            } @else {
              <div class="signature-preview">
                <img [src]="digitalSignature()" alt="Client signature" class="signature-image">
                <button 
                  type="button" 
                  class="retake-signature-btn"
                  (click)="openSignatureModal()"
                >
                  📝 Volver a firmar
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Additional Notes -->
        <div class="form-section">
          <h3>📝 Observaciones Adicionales</h3>
          <textarea 
            formControlName="incidencias"
            placeholder="Agrega cualquier observación especial sobre la entrega..."
            class="form-textarea"
            rows="4"
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            type="button" 
            class="btn btn-secondary"
            (click)="saveDraft()"
            [disabled]="isSaving()"
          >
            💾 Guardar Borrador
          </button>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="!canCompleteDelivery() || isSubmitting()"
          >
            @if (isSubmitting()) {
              <span class="loading-spinner"></span>
              Completando Entrega...
            } @else {
              📦 Completar Entrega
            }
          </button>
        </div>

        <!-- Validation Summary -->
        @if (validationErrors().length > 0) {
          <div class="validation-summary">
            <h4>⚠️ Campos requeridos:</h4>
            <ul>
              @for (error of validationErrors(); track error) {
                <li>{{ error }}</li>
              }
            </ul>
          </div>
        }
      </form>
    </div>

    <!-- Success Modal -->
    @if (showSuccessModal()) {
      <div class="modal-overlay" (click)="closeSuccessModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>✅ Entrega Completada</h3>
          </div>
          <div class="modal-body">
            <p>El vehículo ha sido entregado exitosamente.</p>
            <div class="next-steps">
              <h4>Próximos pasos:</h4>
              <ul>
                <li>📋 Completar transferencia de documentos</li>
                <li>🚗 Gestionar entrega de placas</li>
                <li>📞 El cliente recibirá encuesta de satisfacción</li>
              </ul>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-primary" (click)="goToDocumentsPhase()">
              Continuar a Documentos →
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./delivery-phase.component.scss']
})
export class DeliveryPhaseComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private importTracker = inject(IntegratedImportTrackerService);
  private postSalesApi = inject(PostSalesApiService);

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

    return form.valid && 
           this.uploadedPhotos().length >= 1 && 
           this.digitalSignature() !== null &&
           this.checklistItems().every(item => item.status !== 'rejected');
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
      horaEntrega: [new Date().toTimeString().slice(0,5), Validators.required],
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

  updateChecklistItem(itemName: string, status: 'approved' | 'with_issues' | 'rejected'): void {
    const currentItems = this.checklistItems();
    const updatedItems = currentItems.map(item => 
      item.item === itemName ? { ...item, status, notes: status === 'approved' ? '' : item.notes } : item
    );
    this.checklistItems.set(updatedItems);
  }

  triggerPhotoUpload(): void {
    const input = document.querySelector('#photoInput') as HTMLInputElement;
    input?.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
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
      console.log('📄 Draft saved');
    }, 1500);
  }

  onSubmit(): void {
    if (!this.canCompleteDelivery()) {
      console.log('❌ Cannot complete delivery - validation failed');
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
      incidencias: this.deliveryForm.get('incidencias')?.value ? [this.deliveryForm.get('incidencias')?.value] : [],
      entregadoPor: 'asesor_001' // En producción vendría del usuario logueado
    };

    // Complete delivery phase
    this.importTracker.completeDeliveryPhase(this.clientId(), deliveryData).subscribe({
      next: (result) => {
        console.log('✅ Delivery phase completed:', result);
        this.isSubmitting.set(false);
        this.showSuccessModal.set(true);
      },
      error: (error) => {
        console.error('❌ Error completing delivery phase:', error);
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
}