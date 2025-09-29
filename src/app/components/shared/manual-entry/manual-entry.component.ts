/**
 * Manual Entry Component
 * P0.2 Surgical Fix - Manual fallback for OCR failures
 * Allows manual data entry when OCR confidence < 0.7
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

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
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './manual-entry.component.html',
  styleUrls: ['./manual-entry.component.scss'],
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
      case 'vin':
        return 'VIN (Número de Serie)';
      case 'odometer':
        return 'Kilometraje';
      default:
        return this.fieldName || 'Valor';
    }
  }

  getPlaceholder(): string {
    switch (this.documentType) {
      case 'vin':
        return 'Ej: 3VW2K7AJ9EM388202';
      case 'odometer':
        return 'Ej: 45000';
      default:
        return 'Ingresa el valor manualmente';
    }
  }

  getHint(): string {
    switch (this.documentType) {
      case 'vin':
        return '17 caracteres alfanuméricos sin espacios';
      case 'odometer':
        return 'Solo números, sin comas ni puntos';
      default:
        return 'Verifica que el valor sea correcto';
    }
  }

  getMaxLength(): number {
    switch (this.documentType) {
      case 'vin':
        return 17;
      case 'odometer':
        return 10;
      default:
        return 50;
    }
  }

  getPattern(): string {
    switch (this.documentType) {
      case 'vin':
        return '[A-HJ-NPR-Z0-9]{17}';
      case 'odometer':
        return '[0-9]+';
      default:
        return '.*';
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
          const num = parseInt(value, 10);
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
        confidence: 1.0,
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
