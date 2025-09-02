import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { ApiService } from '../../../services/api.service';
import { CustomValidators } from '../../../validators/custom-validators';
import { Client, BusinessFlow } from '../../../models/types';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="cliente-form-container">
      <header class="form-header">
        <div class="breadcrumb">
          <button (click)="goBack()" class="back-button">← Volver</button>
          <span class="separator">/</span>
          <span class="current">{{ isEditMode ? 'Editar Cliente' : 'Nuevo Cliente' }}</span>
        </div>
        <h1 class="page-title">
          {{ isEditMode ? '✏️ Editar Cliente' : '➕ Nuevo Cliente' }}
        </h1>
      </header>

      <form [formGroup]="clienteForm" (ngSubmit)="onSubmit()" class="cliente-form">
        <!-- Información Personal -->
        <section class="form-section">
          <h2 class="section-title">👤 Información Personal</h2>
          
          <div class="form-row">
            <div class="form-group">
              <label for="name">Nombre Completo *</label>
              <input
                id="name"
                type="text"
                formControlName="name"
                class="form-input"
                [class.error]="isFieldInvalid('name')"
                placeholder="Ej. Juan Pérez García"
              >
              <div *ngIf="isFieldInvalid('name')" class="error-message">
                Nombre completo es requerido
              </div>
            </div>

            <div class="form-group">
              <label for="email">Correo Electrónico *</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="form-input"
                [class.error]="isFieldInvalid('email')"
                placeholder="juan@ejemplo.com"
              >
              <div *ngIf="isFieldInvalid('email')" class="error-message">
                <span *ngIf="clienteForm.get('email')?.errors?.['required']">
                  Correo es requerido
                </span>
                <span *ngIf="clienteForm.get('email')?.errors?.['email']">
                  Formato de correo inválido
                </span>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="phone">Teléfono *</label>
              <input
                id="phone"
                type="tel"
                formControlName="phone"
                class="form-input"
                [class.error]="isFieldInvalid('phone')"
                placeholder="5555555555"
              >
              <div *ngIf="isFieldInvalid('phone')" class="error-message">
                Teléfono es requerido
              </div>
            </div>

            <div class="form-group">
              <label for="rfc">RFC</label>
              <input
                id="rfc"
                type="text"
                formControlName="rfc"
                class="form-input"
                [class.error]="isFieldInvalid('rfc')"
                placeholder="XAXX010101000"
                (input)="onRfcInput($event)"
              >
              <div *ngIf="isFieldInvalid('rfc')" class="error-message">
                RFC inválido
              </div>
            </div>
          </div>
        </section>

        <!-- Información de Negocio -->
        <section class="form-section">
          <h2 class="section-title">🚐 Información de Negocio</h2>
          
          <div class="form-row">
            <div class="form-group">
              <label for="market">Mercado *</label>
              <select
                id="market"
                formControlName="market"
                class="form-select"
                [class.error]="isFieldInvalid('market')"
              >
                <option value="">Seleccionar mercado</option>
                <option value="aguascalientes">Aguascalientes</option>
                <option value="edomex">Estado de México</option>
              </select>
              <div *ngIf="isFieldInvalid('market')" class="error-message">
                Mercado es requerido
              </div>
            </div>

            <div class="form-group">
              <label for="flow">Tipo de Producto *</label>
              <select
                id="flow"
                formControlName="flow"
                class="form-select"
                [class.error]="isFieldInvalid('flow')"
              >
                <option value="">Seleccionar producto</option>
                <option value="Venta a Plazo">Venta a Plazo</option>
                <option value="Plan de Ahorro">Plan de Ahorro</option>
                <option value="Crédito Colectivo">Crédito Colectivo</option>
                <option value="Venta Directa">Venta Directa</option>
              </select>
              <div *ngIf="isFieldInvalid('flow')" class="error-message">
                Tipo de producto es requerido
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="notes">Notas Adicionales</label>
            <textarea
              id="notes"
              formControlName="notes"
              class="form-textarea"
              rows="3"
              placeholder="Información adicional sobre el cliente..."
            ></textarea>
          </div>
        </section>

        <!-- Actions -->
        <div class="form-actions">
          <button
            type="button"
            (click)="goBack()"
            class="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="isLoading || clienteForm.invalid"
            class="btn-primary"
          >
            {{ isLoading ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Crear Cliente') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .cliente-form-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .form-header {
      margin-bottom: 32px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #6b7280;
    }

    .back-button {
      color: #3b82f6;
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
      border: none;
      background: none;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .back-button:hover {
      background: #f3f4f6;
    }

    .separator {
      color: #9ca3af;
    }

    .page-title {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .cliente-form {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      padding: 32px;
    }

    .form-section {
      margin-bottom: 32px;
    }

    .form-section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f3f4f6;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    label {
      font-weight: 500;
      color: #374151;
      font-size: 14px;
    }

    .form-input,
    .form-select,
    .form-textarea {
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input.error,
    .form-select.error,
    .form-textarea.error {
      border-color: #ef4444;
    }

    .error-message {
      color: #ef4444;
      font-size: 12px;
      margin-top: 4px;
    }

    .form-actions {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      margin-top: 32px;
    }

    .btn-primary,
    .btn-secondary {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    @media (max-width: 768px) {
      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ClienteFormComponent implements OnInit {
  clienteForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  clientId?: string;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.checkEditMode();
  }

  private createForm(): void {
    this.clienteForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, CustomValidators.mexicanPhone]],
      rfc: ['', [CustomValidators.rfc]],
      market: ['', [Validators.required]],
      flow: ['', [Validators.required]],
      notes: ['']
    });
  }

  private checkEditMode(): void {
    this.clientId = this.route.snapshot.params['id'];
    if (this.clientId) {
      this.isEditMode = true;
      this.loadClient(this.clientId);
    }
  }

  private loadClient(id: string): void {
    this.isLoading = true;
    this.apiService.getClientById(id).subscribe({
      next: (client) => {
        if (client) {
          this.clienteForm.patchValue({
            name: client.name,
            email: client.email,
            phone: client.phone,
            rfc: client.rfc || '',
            market: client.market,
            flow: client.flow,
            notes: ''
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toast.error('Error al cargar el cliente');
        this.isLoading = false;
        this.router.navigate(['/clientes']);
      }
    });
  }

  onSubmit(): void {
    if (this.clienteForm.invalid) {
      this.markFormGroupTouched();
      this.toast.error('Por favor, corrige los errores en el formulario');
      return;
    }

    this.isLoading = true;
    const formData = this.clienteForm.value;

    if (this.isEditMode && this.clientId) {
      this.apiService.updateClient(this.clientId, formData).subscribe({
        next: (client) => {
          this.toast.success('Cliente actualizado correctamente');
          this.isLoading = false;
          this.router.navigate(['/clientes']);
        },
        error: (error) => {
          this.toast.error('Error al actualizar el cliente');
          this.isLoading = false;
        }
      });
    } else {
      this.apiService.createClient(formData).subscribe({
        next: (client) => {
          this.toast.success('Cliente creado correctamente');
          this.isLoading = false;
          this.router.navigate(['/clientes']);
        },
        error: (error) => {
          this.toast.error('Error al crear el cliente');
          this.isLoading = false;
        }
      });
    }
  }

  onRfcInput(event: any): void {
    // Convertir a mayúsculas
    const value = event.target.value.toUpperCase();
    this.clienteForm.patchValue({ rfc: value });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clienteForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.clienteForm.controls).forEach(key => {
      const control = this.clienteForm.get(key);
      control?.markAsTouched();
    });
  }

  goBack(): void {
    this.router.navigate(['/clientes']);
  }
}