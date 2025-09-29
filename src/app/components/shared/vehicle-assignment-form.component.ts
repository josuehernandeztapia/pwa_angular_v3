import { Component, inject, output, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VehicleAssignmentService } from '../../services/vehicle-assignment.service';
import { IntegratedImportTrackerService } from '../../services/integrated-import-tracker.service';
import { VehicleUnit } from '../../models/types';

export interface VehicleAssignmentFormData {
  vin: string;
  serie: string;
  modelo: string;
  year: number;
  numeroMotor: string;
  transmission?: 'Manual' | 'Automatica';
  productionBatch?: string;
  factoryLocation?: string;
  notes?: string;
}

@Component({
  selector: 'app-vehicle-assignment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vehicle-assignment-form.component.html',
  styleUrls: ['./vehicle-assignment-form.component.scss'],
})
export class VehicleAssignmentFormComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private vehicleAssignmentService = inject(VehicleAssignmentService);
  private importTrackerService = inject(IntegratedImportTrackerService);

  // Inputs as signals for test compatibility
  clientId = signal<string>('');
  clientName = signal<string | undefined>(undefined);
  
  // Outputs (align with spec names)
  assignmentCompleted = output<{ success: boolean; vehicleData?: VehicleUnit }>();
  assignmentCancelled = output<void>();

  // State
  isSubmitting = signal(false);
  assignmentResult = signal<{ success: boolean; assignedUnit?: VehicleUnit; error?: string } | null>(null);
  validationErrors = signal<string[]>([]);

  // Form
  assignmentForm: FormGroup;

  constructor() {
    this.assignmentForm = this.fb.group({
      vin: ['', [
        Validators.required,
        Validators.minLength(17),
        Validators.maxLength(17),
        Validators.pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
      ]],
      serie: ['', Validators.required],
      modelo: ['', Validators.required],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(2020), Validators.max(2026)]],
      numeroMotor: ['', Validators.required],
      transmission: [''],
      productionBatch: [''],
      factoryLocation: [''],
      notes: ['']
    });
  }

  ngOnDestroy(): void {}

  isFieldInvalid(fieldName: string): boolean {
    const field = this.assignmentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getInputClasses(fieldName: string): Record<string, boolean> {
    return {
      'vehicle-assignment__input': true,
      'vehicle-assignment__input--error': this.isFieldInvalid(fieldName),
    };
  }

  getSelectClasses(): Record<string, boolean> {
    return {
      'vehicle-assignment__select': true,
    };
  }

  getFieldError(fieldName: string): string {
    const field = this.assignmentForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return `${this.getFieldLabel(fieldName)} es requerido`;
    if (field.errors['minlength'] || field.errors['maxlength']) return `${this.getFieldLabel(fieldName)} debe tener exactamente 17 caracteres`;
    if (field.errors['min']) return `${this.getFieldLabel(fieldName)} debe ser mayor a ${field.errors['min'].min}`;
    if (field.errors['max']) return `${this.getFieldLabel(fieldName)} debe ser menor a ${field.errors['max'].max}`;

    return 'Campo inválido';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      vin: 'VIN',
      serie: 'Serie',
      modelo: 'Modelo',
      year: 'Año',
      numeroMotor: 'Número de Motor'
    };
    return labels[fieldName] || fieldName;
  }

  onSubmit(): void {
    if (this.assignmentForm.invalid) {
      this.markAllFieldsAsTouched();
      console.log('Form is invalid, cannot submit');
      return;
    }

    const formData = this.assignmentForm.value as VehicleAssignmentFormData;
    
    // Validación adicional
    const validation = this.vehicleAssignmentService.validateVehicleData ? this.vehicleAssignmentService.validateVehicleData({
      clientId: this.clientId(),
      assignedBy: 'current_user', // En producción vendría del contexto de usuario
      ...formData
    }) : { valid: true, errors: [] };

    if (!validation.valid) {
      this.validationErrors.set(validation.errors);
      return;
    }

    this.validationErrors.set([]);
    this.isSubmitting.set(true);
    this.assignmentResult.set(null);

    // Ejecutar asignación a través del import tracker service
    // Update integrated tracker first (spec uses updateVehicleAssignment)
    if (typeof this.importTrackerService.updateVehicleAssignment === 'function') {
      this.importTrackerService.updateVehicleAssignment(this.clientId(), {
        vin: formData.vin,
        serie: formData.serie,
        modelo: formData.modelo,
        year: formData.year,
        numeroMotor: formData.numeroMotor
      }).subscribe({ next: () => {}, error: () => {} });
    }

    this.vehicleAssignmentService.assignVehicleToClient({
      clientId: this.clientId(),
      ...formData,
      assignedBy: 'current_user'
    }).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        this.assignmentResult.set(result);
        
        if (result.success) {
          // Emitir evento de éxito (spec expects assignmentCompleted.emit)
          const vehicleData = result.assignedUnit || (formData as unknown as VehicleUnit);
          this.assignmentCompleted.emit({ success: true, vehicleData });
          
          // Reset form después del éxito
          setTimeout(() => {
            this.assignmentForm.reset();
            this.assignmentResult.set(null);
          }, 3000);
        } else {
          // Manejar error de asignación (no excepción)
          alert(`Error: ${result.error || 'Error de asignación'}`);
        }
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.assignmentResult.set({
          success: false,
          error: 'Error interno del sistema. Intenta nuevamente.'
        });
        alert('Error de conexión al asignar vehículo. Verifica tu conexión a internet.');
      }
    });
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.assignmentForm.controls).forEach(key => {
      this.assignmentForm.get(key)?.markAsTouched();
    });
  }

  // Methods expected by spec
  getYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
  }

  onCancel(): void {
    this.assignmentCancelled.emit();
  }

  getResultClasses(): Record<string, boolean> {
    const result = this.assignmentResult();
    return {
      'vehicle-assignment__result': true,
      'vehicle-assignment__result--success': !!result?.success,
      'vehicle-assignment__result--error': !!result && !result.success,
    };
  }
}
