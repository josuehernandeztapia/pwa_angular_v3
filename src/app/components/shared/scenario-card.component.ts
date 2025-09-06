import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProtectionScenario } from '../../models/types';

@Component({
  selector: 'app-scenario-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="handleSelect()"
      [disabled]="!onSelect.observed"
      [class]="getButtonClass()"
      class="scenario-card"
    >
      <!-- Selected indicator -->
      <div *ngIf="isSelected && onSelect.observed" class="selected-indicator">
        <div class="check-circle">
          ✓
        </div>
      </div>
      
      <!-- Scenario content -->
      <h4 class="scenario-title">{{ scenario.title }}</h4>
      <p class="scenario-description">{{ scenario.description }}</p>
      
      <div class="scenario-details">
        <div *ngFor="let detail of scenario.details" class="detail-item">
          {{ detail }}
        </div>

        <div class="scenario-summary">
          <span class="summary-label">Nuevo Plazo:</span>
          <span class="summary-value">
            {{ scenario.newTerm }} meses 
            <span class="term-change">({{ getTermChange() }}{{ scenario.termChange }})</span>
          </span>
        </div>

        <div class="kpi-grid" *ngIf="hasKpis()">
          <div class="kpi-item" *ngIf="scenario['paymentChange'] !== undefined">
            <span class="kpi-label">Δ Pago</span>
            <span class="kpi-value">{{ formatCurrency(scenario['paymentChange']) }}</span>
          </div>
          <div class="kpi-item" *ngIf="scenario['paymentChangePercent'] !== undefined">
            <span class="kpi-label">Δ Pago %</span>
            <span class="kpi-value">{{ (scenario['paymentChangePercent']).toFixed(1) }}%</span>
          </div>
          <div class="kpi-item" *ngIf="scenario['totalCostChange'] !== undefined">
            <span class="kpi-label">Δ Costo Total</span>
            <span class="kpi-value">{{ formatCurrency(scenario['totalCostChange']) }}</span>
          </div>
          <div class="kpi-item" *ngIf="scenario['irr'] !== undefined">
            <span class="kpi-label">TIR</span>
            <span class="kpi-value">{{ (scenario['irr'] * 100).toFixed(2) }}%</span>
          </div>
          <div class="kpi-item" *ngIf="scenario['tirOK'] !== undefined">
            <span class="kpi-label">Política</span>
            <span class="kpi-value">{{ scenario['tirOK'] ? '✓ Cumple' : '✗ No cumple' }}</span>
          </div>
        </div>
      </div>
    </button>
  `,
  styles: [`
    .scenario-card {
      width: 100%;
      text-align: left;
      padding: 16px;
      border: 2px solid #374151;
      border-radius: 8px;
      background: #1f2937;
      position: relative;
      transition: all 0.2s;
      cursor: pointer;
    }

    .scenario-card:disabled {
      cursor: default;
    }

    .scenario-card:not(:disabled):hover {
      border-color: #4b5563;
    }

    .scenario-card.selected {
      background: rgba(6, 214, 160, 0.1);
      border-color: #06d6a0;
    }

    .selected-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px;
      background: #06d6a0;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .check-circle {
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    .scenario-title {
      font-size: 18px;
      font-weight: 700;
      color: white;
      margin: 0 0 4px 0;
    }

    .scenario-description {
      font-size: 14px;
      color: #9ca3af;
      margin: 0 0 16px 0;
    }

    .scenario-details {
      padding-top: 16px;
      border-top: 1px solid #374151;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-item {
      font-size: 14px;
      color: #d1d5db;
    }

    .scenario-summary {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding-top: 8px;
    }

    .summary-label {
      font-size: 14px;
      font-weight: 600;
      color: white;
    }

    .summary-value {
      font-size: 14px;
      font-family: monospace;
      font-weight: 700;
      color: white;
    }

    .term-change {
      color: #9ca3af;
      font-weight: 400;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .kpi-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 6px;
    }

    .kpi-label {
      font-size: 11px;
      color: #9ca3af;
    }

    .kpi-value {
      font-size: 13px;
      color: #e2e8f0;
      font-family: monospace;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .scenario-card {
        padding: 12px;
      }

      .scenario-title {
        font-size: 16px;
      }

      .scenario-summary {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class ScenarioCardComponent {
  @Input() scenario!: ProtectionScenario;
  @Input() isSelected = false;
  @Output() onSelect = new EventEmitter<void>();

  handleSelect(): void {
    if (this.onSelect.observed) {
      this.onSelect.emit();
    }
  }

  getButtonClass(): string {
    return this.isSelected ? 'selected' : '';
  }

  getTermChange(): string {
    return this.scenario.termChange >= 0 ? '+' : '';
  }

  // Port exacto de formatCurrency desde React línea 12
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }
}