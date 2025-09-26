/**
 * 📝 Manual OCR Entry Component
 * Fallback manual entry when OCR confidence is low
 */

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface ManualOCRData {
  documentType: string;
  fields: Record<string, any>;
  confidence: number;
  isManual: boolean;
}

@Component({
  selector: 'app-manual-ocr-entry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="manual-entry-overlay" *ngIf="isOpen">
      <div class="manual-entry-modal">
        <div class="modal-header">
          <h3>📝 Ingresar Manualmente</h3>
          <button class="close-btn" (click)="close()">×</button>
        </div>

        <div class="modal-body">
          <div class="banner warning">
            <strong>⚠️ OCR no pudo detectar {{ getDocumentLabel(documentType) }}</strong>
            <p>Por favor, ingresa la información manualmente mirando la imagen.</p>
          </div>

          <form [formGroup]="manualForm" class="manual-form">
            <!-- VIN Fields -->
            <div *ngIf="documentType === 'vin'">
              <div class="form-group">
                <label>VIN (17 caracteres) *</label>
                <input
                  type="text"
                  formControlName="vin"
                  placeholder="1HGBH41JXMN109186"
                  maxlength="17"
                  class="form-control"
                  [class.invalid]="isFieldInvalid('vin')">
                <div class="field-hint">Busca el VIN en el dashboard o la puerta del conductor</div>
                <div class="field-error" *ngIf="isFieldInvalid('vin')">
                  VIN debe tener exactamente 17 caracteres
                </div>
              </div>

              <div class="form-group">
                <label>Año del Vehículo</label>
                <input
                  type="number"
                  formControlName="year"
                  placeholder="2021"
                  min="1980"
                  max="2025"
                  class="form-control">
              </div>

              <div class="form-group">
                <label>Marca</label>
                <input
                  type="text"
                  formControlName="make"
                  placeholder="Honda, Toyota, Ford..."
                  class="form-control">
              </div>
            </div>

            <!-- Odometer Fields -->
            <div *ngIf="documentType === 'odometer'">
              <div class="form-group">
                <label>Kilómetros *</label>
                <input
                  type="number"
                  formControlName="kilometers"
                  placeholder="45230"
                  min="0"
                  max="999999"
                  class="form-control"
                  [class.invalid]="isFieldInvalid('kilometers')">
                <div class="field-hint">Lectura actual del odómetro</div>
                <div class="field-error" *ngIf="isFieldInvalid('kilometers')">
                  Kilómetros es requerido
                </div>
              </div>

              <div class="form-group">
                <label>Unidad</label>
                <select formControlName="unit" class="form-control">
                  <option value="km">Kilómetros</option>
                  <option value="mi">Millas</option>
                </select>
              </div>
            </div>

            <!-- Plate Fields -->
            <div *ngIf="documentType === 'plate'">
              <div class="form-group">
                <label>Número de Placa *</label>
                <input
                  type="text"
                  formControlName="plate"
                  placeholder="ABC-123-DEF"
                  maxlength="15"
                  class="form-control"
                  [class.invalid]="isFieldInvalid('plate')"
                  (input)="formatPlate($event)">
                <div class="field-hint">Formato: ABC-123-DEF o similar</div>
                <div class="field-error" *ngIf="isFieldInvalid('plate')">
                  Número de placa es requerido
                </div>
              </div>

              <div class="form-group">
                <label>Estado</label>
                <select formControlName="state" class="form-control">
                  <option value="EDOMEX">Estado de México</option>
                  <option value="AGS">Aguascalientes</option>
                  <option value="CDMX">Ciudad de México</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="close()">
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="saveManualData()"
            [disabled]="!manualForm.valid || isSaving">
            <span *ngIf="isSaving">🔄 Guardando...</span>
            <span *ngIf="!isSaving">💾 Guardar</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manual-entry-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      
    }

    .manual-entry-modal {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h3 {
      margin: 0;
      color: #1f2937;
      font-size: 1.25rem;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: #374151;
    }

    .modal-body {
      padding: 24px;
    }

    .banner {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .banner.warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
    }

    .banner strong {
      display: block;
      margin-bottom: 4px;
    }

    .banner p {
      margin: 0;
      font-size: 0.9rem;
    }

    .manual-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }

    .form-control {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-control.invalid {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .field-hint {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .field-error {
      font-size: 0.8rem;
      color: #ef4444;
      font-weight: 500;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 0 0 12px 12px;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 600px) {
      .manual-entry-modal {
        width: 95%;
        max-height: 95vh;
      }

      .modal-header, .modal-body, .modal-footer {
        padding: 16px;
      }
    }
  `]
})
export class ManualOCREntryComponent implements OnInit {
  @Input() documentType: string = '';
  @Input() isOpen: boolean = false;
  @Output() save = new EventEmitter<ManualOCRData>();
  @Output() cancel = new EventEmitter<void>();

  manualForm: FormGroup;
  isSaving: boolean = false;

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