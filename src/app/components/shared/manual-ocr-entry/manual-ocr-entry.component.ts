/**
 * Icono informativo mostrado con `<app-icon name="document-text">` para Manual OCR Entry Component
 * Fallback manual entry when OCR confidence is low
 */

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

export interface ManualOCRData {
  documentType: string;
  fields: Record<string, any>;
  confidence: number;
  isManual: boolean;
}

@Component({
  selector: 'app-manual-ocr-entry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './manual-ocr-entry.component.html',
  styleUrls: ['./manual-ocr-entry.component.scss']
})
export class ManualOCREntryComponent implements OnInit {
  @Input() documentType: string = '';
  @Input() isOpen: boolean = false;
  @Output() save = new EventEmitter<ManualOCRData>();
  @Output() cancel = new EventEmitter<void>();

  manualForm: FormGroup;
  isSaving: boolean = false;
  readonly titleId = 'manual-entry-title';
  readonly descriptionId = 'manual-entry-description';

  constructor(private fb: FormBuilder) {
    this.manualForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.setupForm();
  }

  private setupForm(): void {
    switch (this.documentType) {
      case 'vin':
        this.manualForm = this.fb.group({
          vin: ['', [Validators.required, Validators.minLength(17), Validators.maxLength(17)]],
          year: ['', [Validators.min(1980), Validators.max(2025)]],
          make: ['']
        });
        break;

      case 'odometer':
        this.manualForm = this.fb.group({
          kilometers: ['', [Validators.required, Validators.min(0)]],
          unit: ['km']
        });
        break;

      case 'plate':
        this.manualForm = this.fb.group({
          plate: ['', Validators.required],
          state: ['EDOMEX']
        });
        break;

      default:
        this.manualForm = this.fb.group({
          value: ['', Validators.required]
        });
    }
  }

  getDocumentLabel(type: string): string {
    const labels: Record<string, string> = {
      'vin': 'el VIN del vehículo',
      'odometer': 'el odómetro',
      'plate': 'la placa del vehículo'
    };
    return labels[type] || type;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.manualForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  formatPlate(event: any): void {
    let value = event.target.value.toUpperCase();
    // Basic formatting for Mexican plates
    value = value.replace(/[^A-Z0-9]/g, '');
    event.target.value = value;
    this.manualForm.patchValue({ plate: value });
  }

  close(): void {
    this.cancel.emit();
  }

  saveManualData(): void {
    if (!this.manualForm.valid) return;

    this.isSaving = true;

    // Simulate save delay
    setTimeout(() => {
      const manualData: ManualOCRData = {
        documentType: this.documentType,
        fields: this.manualForm.value,
        confidence: 1.0, // Manual entry is always 100% confident
        isManual: true
      };

      this.save.emit(manualData);
      this.isSaving = false;
    }, 500);
  }
}
