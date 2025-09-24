import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProtectionScenario } from '../../models/types';
import { SimulationService } from '../../services/simulation.service';
import { ToastService } from '../../services/toast.service';
import { ScenarioCardComponent } from './scenario-card.component';

interface BaseQuote {
  amountToFinance: number;
  monthlyPayment: number;
  term: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ScenarioCardComponent],
  template: `
      <!-- Description -->
        Esta es una demostración de cómo funciona nuestra Protección para Conductores. 
        La simulación asume que el cliente solicita la protección 1 año después de iniciar su crédito.
      </p>
      
      <!-- Simulation Form -->
      <form (ngSubmit)="handleSimulate($event)" class="simulation-form">
        <div class="form-group">
          <input
            type="number"
            [(ngModel)]="months"
            name="months"
            min="1"
            max="6"
            required
            class="form-input"
          />
        </div>
        <button 
          type="submit" 
          [disabled]="isLoading" 
          class="simulate-button"
        >
          {{ getSimulateButtonText() }}
        </button>
      </form>

      <!-- Loading State -->
      <div *ngIf="isLoading && scenarios.length === 0" class="loading-container">
        <div class="loading-spinner"></div>
      </div>
      
      <!-- Scenarios Results -->
      <div *ngIf="scenarios.length > 0" class="scenarios-section">
        <h3 class="scenarios-title">Resultados de la Simulación:</h3>
        <app-scenario-card
          *ngFor="let scenario of scenarios; trackBy: trackScenario"
          [scenario]="scenario"
        ></app-scenario-card>
      </div>
      
      <!-- Close Button -->
      <div class="actions-section">
        <button (click)="handleClose()" class="close-button">
          Cerrar
        </button>
      </div>
    </div>
  `,
  styles: [`
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    }

    .simulation-form {
      display: flex;
      align-items: end;
      gap: 16px;
      padding: 16px;
      background: #111827;
      border-radius: 8px;
    }

    .form-group {
      flex: 1;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #9ca3af;
      margin-bottom: 4px;
    }

    .form-input {
      width: 100%;
      margin-top: 4px;
      padding: 8px 12px;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 6px;
      color: white;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      border-color: #06d6a0;
    }

    .simulate-button {
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: #06d6a0;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 0.2s;
    }

    .simulate-button:hover:not(:disabled) {
      background: #059669;
    }

    .simulate-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 32px;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid #4a5568;
      border-left-color: #06d6a0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .scenarios-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .scenarios-title {
      font-size: 18px;
      font-weight: 600;
      color: white;
      margin: 0;
    }

    .actions-section {
      display: flex;
      gap: 16px;
      padding-top: 16px;
      border-top: 1px solid #374151;
    }

    .close-button {
      width: 100%;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #9ca3af;
      background: #4b5563;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .close-button:hover {
      background: #6b7280;
    }

    @media (max-width: 768px) {
      .simulation-form {
        flex-direction: column;
        align-items: stretch;
      }

      .simulate-button {
        width: 100%;
      }
    }
  `]
})
export class ProtectionDemoSimulatorComponent implements OnInit {
  @Input() baseQuote!: BaseQuote;
  @Output() onClose = new EventEmitter<void>();

  // Port exacto de state desde React líneas 17-19
  months = '2';
  scenarios: ProtectionScenario[] = [];
  isLoading = false;

  constructor(
    private simulationService: SimulationService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Component initialized
  }

  // Port exacto de handleSimulate desde React líneas 21-40
  async handleSimulate(event: Event): Promise<void> {
    event.preventDefault();
    
    const numMonths = parseInt(this.months, 10);
    if (isNaN(numMonths) || numMonths <= 0) {
      this.toast.error("Por favor, introduce un número de meses válido.");
      return;
    }

    this.isLoading = true;
    try {
      const results = await this.simulationService.simulateProtectionDemo(this.baseQuote, numMonths);
      this.scenarios = results;
      if (results.length === 0) {
        this.toast.info("No se pudieron generar escenarios. El plazo restante es muy corto.");
      }
    } catch (error) {
      this.toast.error("Error al simular la demostración.");
    } finally {
      this.isLoading = false;
    }
  }

  handleClose(): void {
    this.onClose.emit();
  }

  getSimulateButtonText(): string {
    return this.isLoading ? 'Calculando...' : 'Simular Escenarios';
  }

  trackScenario(index: number, scenario: ProtectionScenario): string {
    return scenario.type;
  }
}

declare global {
  interface SimulationService {
    simulateProtectionDemo(baseQuote: BaseQuote, numMonths: number): Promise<ProtectionScenario[]>;
  }
}
