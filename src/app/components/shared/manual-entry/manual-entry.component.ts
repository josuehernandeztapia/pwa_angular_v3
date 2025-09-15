/**
 * 📝 Manual Entry Component
 * P0.2 Surgical Fix - Manual fallback for OCR failures
 * Allows manual data entry when OCR confidence < 0.7
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface ManualEntryData {
  vin?: string;
  odometer?: string;
  documentType: 'vin' | 'odometer' | 'other';
  userEnteredValue: string;
  confidence: number; // Always 1.0 for manual entry
}

@Component({
  selector: 'app-manual-entry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="manual-entry-modal" data-testid="manual-entry-modal">
      <div class="modal-overlay" (click)="onCancel()"></div>
      <div class="modal-content">
        <header class="modal-header">
          <h3>📝 Ingreso Manual</h3>
          <button class="close-btn" (click)="onCancel()" aria-label="Cerrar">×</button>
        </header>
        
        <div class="modal-body">
          <div class="info-banner">
            <div class="icon">⚠️</div>
            <div class="text">
              <strong>No se pudo detectar automáticamente</strong>
              <p>Ingresa manualmente el {{ getFieldLabel() }} de la imagen</p>
            </div>
          </div>

          <form [formGroup]="manualForm" (ngSubmit)="onSave()">
            <div class="form-field">
              <label [for]="fieldId">{{ getFieldLabel() }}</label>
              <input
                [id]="fieldId"
                type="text"
                formControlName="value"
                [placeholder]="getPlaceholder()"
                [maxlength]="getMaxLength()"
                [pattern]="getPattern()"
                data-testid="manual-input"
                autocomplete="off"
              />
              <div class="field-hint">{{ getHint() }}</div>
              <div *ngIf="manualForm.get('value')?.invalid && manualForm.get('value')?.touched" 
                   class="error-message" data-testid="validation-error">
                {{ getValidationError() }}
              </div>
            </div>

            <div class="action-buttons">
              <button type="button" class="btn-secondary" (click)="onCancel()">
                Cancelar
              </button>
              <button type="button" class="btn-retry" (click)="onRetry()">
                🔄 Reintentar OCR
              </button>
              <button 
                type="submit" 
                class="btn-primary" 
                [disabled]="manualForm.invalid"
                data-testid="save-manual-entry">
                ✅ Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manual-entry-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      position: relative;
      animation: slideUp 0.3s ease-out;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 24px 16px;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h3 {
      margin: 0;
      color: #2d3748;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #718096;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #f7fafc;
      color: #2d3748;
    }

    .modal-body {
      padding: 24px;
    }

    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #fef5e7;
      border: 1px solid #f6ad55;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .info-banner .icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .info-banner .text strong {
      display: block;
      color: #c05621;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .info-banner .text p {
      margin: 0;
      color: #744210;
      font-size: 0.9rem;
    }

    .form-field {
      margin-bottom: 20px;
    }

    .form-field label {
      display: block;
      font-weight: 500;
      color: #2d3748;
      margin-bottom: 6px;
    }

    .form-field input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.2s;
      box-sizing: border-box;
    }

    .form-field input:focus {
      outline: none;
      border-color: #3182ce;
      box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }

    .form-field input.ng-invalid.ng-touched {
      border-color: #e53e3e;
    }

    .field-hint {
      font-size: 0.85rem;
      color: #718096;
      margin-top: 4px;
    }

    .error-message {
      color: #e53e3e;
      font-size: 0.85rem;
      margin-top: 4px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .action-buttons button {
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #edf2f7;
    }

    .btn-retry {
      background: #fef5e7;
      color: #c05621;
      border: 1px solid #f6ad55;
    }

    .btn-retry:hover:not(:disabled) {
      background: #fed7aa;
    }

    .btn-primary {
      background: #3182ce;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2c5282;
    }

    .btn-primary:disabled {
      background: #a0aec0;
      cursor: not-allowed;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .modal-content {
        width: 95%;
        margin: 20px;
      }
      
      .action-buttons {
        flex-direction: column;
      }
      
      .action-buttons button {
        width: 100%;
      }
    }
  `]
})
export class ManualEntryComponent {
  @Input() documentType: 'vin' | 'odometer' | 'other' = 'other';
  @Input() fieldName: string = '';
  
  @Output() save = new EventEmitter<ManualEntryData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  manualForm: FormGroup;
  fieldId: string;

  constructor(private fb: FormBuilder) {
    this.fieldId = 'manual-' + Math.random().toString(36).substr(2, 9);
    this.manualForm = this.fb.group({
      value: ['', [Validators.required, this.getCustomValidator()]]
    });
  }

  getFieldLabel(): string {
    switch (this.documentType) {
      case 'vin': return 'VIN (Número de Serie)';
      case 'odometer': return 'Kilometraje';
      default: return this.fieldName || 'Valor';
    }
  }

  getPlaceholder(): string {
    switch (this.documentType) {
      case 'vin': return 'Ej: 3VW2K7AJ9EM388202';
      case 'odometer': return 'Ej: 45000';
      default: return 'Ingresa el valor manualmente';
    }
  }

  getHint(): string {
    switch (this.documentType) {
      case 'vin': return '17 caracteres alfanuméricos sin espacios';
      case 'odometer': return 'Solo números, sin comas ni puntos';
      default: return 'Verifica que el valor sea correcto';
    }
  }

  getMaxLength(): number {
    switch (this.documentType) {
      case 'vin': return 17;
      case 'odometer': return 10;
      default: return 50;
    }
  }

  getPattern(): string {
    switch (this.documentType) {
      case 'vin': return '[A-HJ-NPR-Z0-9]{17}';
      case 'odometer': return '[0-9]+';
      default: return '.*';
    }
  }

  getCustomValidator() {
    switch (this.documentType) {
      case 'vin':
        return (control: any) => {
          const value = control.value?.toUpperCase();
          if (!value) return null;
          if (value.length !== 17) return { vinLength: true };
          if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(value)) return { vinFormat: true };
          return null;
        };
      case 'odometer':
        return (control: any) => {
          const value = control.value;
          if (!value) return null;
          const num = parseInt(value);
          if (isNaN(num)) return { notNumber: true };
          if (num < 0) return { negative: true };
          if (num > 999999) return { tooHigh: true };
          return null;
        };
      default:
        return Validators.minLength(1);
    }
  }

  getValidationError(): string {
    const errors = this.manualForm.get('value')?.errors;
    if (!errors) return '';

    if (errors['required']) return 'Este campo es requerido';
    
    if (this.documentType === 'vin') {
      if (errors['vinLength']) return 'El VIN debe tener exactamente 17 caracteres';
      if (errors['vinFormat']) return 'VIN inválido. Usa solo letras A-H, J-N, P-R, T-Z y números 0-9';
    }
    
    if (this.documentType === 'odometer') {
      if (errors['notNumber']) return 'Solo se permiten números';
      if (errors['negative']) return 'El kilometraje no puede ser negativo';
      if (errors['tooHigh']) return 'Kilometraje muy alto (máximo 999,999)';
    }

    return 'Valor inválido';
  }

  onSave(): void {
    if (this.manualForm.valid) {
      const value = this.manualForm.value.value;
      const normalizedValue = this.documentType === 'vin' ? value.toUpperCase() : value;
      
      const data: ManualEntryData = {
        documentType: this.documentType,
        userEnteredValue: normalizedValue,
        confidence: 1.0, // Manual entry is always 100% confident
        [this.documentType]: normalizedValue
      };

      this.save.emit(data);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onRetry(): void {
    this.retry.emit();
  }
}