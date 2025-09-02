import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PlanMethods {
  collection: boolean;
  voluntary: boolean;
}

interface PlanConfig {
  goal: number;
  methods: PlanMethods;
  plates?: string;
  overprice?: number;
}

@Component({
  selector: 'app-plan-config-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="plan-config-form">
      <!-- Goal Amount -->
      <div class="form-group">
        <label for="goal" class="form-label">{{ title }}</label>
        <div class="currency-input">
          <span class="currency-symbol">$</span>
          <input 
            type="number" 
            id="goal" 
            [(ngModel)]="goal"
            [placeholder]="placeholder"
            class="form-input with-currency"
          />
        </div>
      </div>

      <!-- Methods Selection -->
      <div class="form-group">
        <label class="form-label">Métodos de {{ isSavings ? 'Ahorro' : 'Pago' }}</label>
        <div class="methods-options">
          <label class="method-option">
            <input 
              type="checkbox" 
              [(ngModel)]="methods.voluntary"
              class="method-checkbox"
            />
            <span class="method-label">Permitir Aportaciones Voluntarias</span>
          </label>
          
          <label class="method-option">
            <input 
              type="checkbox" 
              [(ngModel)]="methods.collection"
              class="method-checkbox"
            />
            <span class="method-label">
              Activar {{ isSavings ? 'Ahorro' : 'Pago' }} por Recaudación
            </span>
          </label>
        </div>
      </div>
      
      <!-- Collection Configuration -->
      <div *ngIf="methods.collection" class="collection-config">
        <div class="form-group">
          <label for="plates" class="form-label">
            Placas de las Unidades (separadas por coma)
          </label>
          <input 
            type="text" 
            id="plates" 
            [(ngModel)]="plates"
            placeholder="XYZ-123, ABC-456"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label for="overprice" class="form-label">
            Sobreprecio por Litro (MXN)
          </label>
          <input 
            type="number" 
            id="overprice" 
            [(ngModel)]="overprice"
            placeholder="5.00"
            class="form-input"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="form-actions">
        <button 
          *ngIf="onBack.observed"
          type="button" 
          (click)="handleBack()"
          class="btn-secondary"
        >
          Volver
        </button>
        
        <button 
          type="button" 
          (click)="handleSubmit()"
          class="btn-primary"
        >
          {{ buttonText }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .plan-config-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 14px;
      font-weight: 500;
      color: #a0aec0;
    }

    .currency-input {
      position: relative;
      display: flex;
      align-items: center;
    }

    .currency-symbol {
      position: absolute;
      left: 12px;
      color: #718096;
      font-size: 14px;
      z-index: 1;
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      background: #1a202c;
      border: 1px solid #4a5568;
      border-radius: 6px;
      color: white;
      font-size: 16px;
      transition: border-color 0.2s;
    }

    .form-input.with-currency {
      padding-left: 32px;
    }

    .form-input:focus {
      outline: none;
      border-color: #06d6a0;
      box-shadow: 0 0 0 3px rgba(6, 214, 160, 0.1);
    }

    .form-input::placeholder {
      color: #718096;
    }

    .methods-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }

    .method-option {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: #2d3748;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .method-option:hover {
      background: #4a5568;
    }

    .method-checkbox {
      width: 16px;
      height: 16px;
      accent-color: #06d6a0;
      margin-right: 12px;
    }

    .method-label {
      color: white;
      font-size: 14px;
      user-select: none;
    }

    .collection-config {
      padding: 16px;
      background: rgba(26, 32, 44, 0.5);
      border: 1px solid #4a5568;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-actions {
      display: flex;
      gap: 16px;
      padding-top: 16px;
    }

    .btn-primary, .btn-secondary {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: #4a5568;
      color: #a0aec0;
    }

    .btn-secondary:hover {
      background: #2d3748;
    }

    .btn-primary {
      background: #06d6a0;
      color: white;
    }

    .btn-primary:hover {
      background: #059669;
    }

    @media (max-width: 768px) {
      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class PlanConfigFormComponent {
  @Input() isSavings = true;
  @Output() onBack = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<PlanConfig>();

  // Port exacto de state desde React líneas 10-13
  methods: PlanMethods = { collection: false, voluntary: true };
  goal = '';
  plates = '';
  overprice = '';

  // Port exacto de computed properties desde React líneas 15-17
  get title(): string {
    return this.isSavings ? 'Meta de Ahorro (MXN)' : 'Meta de Pago Mensual (MXN)';
  }

  get placeholder(): string {
    return this.isSavings ? '50,000.00' : '15,000.00';
  }

  get buttonText(): string {
    return this.isSavings ? 'Crear Plan de Ahorro' : 'Configurar Plan de Pagos';
  }

  handleBack(): void {
    this.onBack.emit();
  }

  // Port exacto de handleSubmit desde React líneas 19-27
  handleSubmit(): void {
    const config: PlanConfig = {
      goal: parseFloat(this.goal) || (this.isSavings ? 50000 : 15000),
      methods: this.methods,
      plates: this.methods.collection ? this.plates : undefined,
      overprice: this.methods.collection ? parseFloat(this.overprice) : undefined,
    };
    this.onSubmit.emit(config);
  }
}