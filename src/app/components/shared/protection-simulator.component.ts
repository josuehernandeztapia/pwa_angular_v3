import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinancialCalculatorService } from '../../services/financial-calculator.service';
import { ToastService } from '../../services/toast.service';
import { Client } from '../../models/types';
import { ProtectionScenario, ProtectionType } from '../../models/protection';
import { IconComponent } from './icon/icon.component';

// UI extension of the SSOT ProtectionScenario
interface ProtectionScenarioUI extends ProtectionScenario {
  monthlyPaymentBefore?: number;
  monthlyPaymentAfter?: number;
  termBefore?: number;
  termAfter?: number;
  savings?: number;
  benefits?: string[];
  drawbacks?: string[];
  recommended?: boolean;
}

@Component({
  selector: 'app-protection-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconComponent],
  styleUrls: ['./protection-simulator.component.scss'],
  templateUrl: './protection-simulator.component.html'
})
export class ProtectionSimulatorComponent {
  @Input() client?: Client;
  @Output() onClose = new EventEmitter<void>();
  @Output() onApply = new EventEmitter<any>();

  configForm: FormGroup;
  scenarios: ProtectionScenarioUI[] = [];
  selectedScenario?: ProtectionScenarioUI;
  isCalculating = false;

  constructor(
    private fb: FormBuilder,
    private financialCalc: FinancialCalculatorService,
    private toast: ToastService
  ) {
    this.configForm = this.fb.group({
      monthsAffected: ['', [Validators.required]],
      difficultyType: ['temporary']
    });
  }

  getCurrentMonthlyPayment(): number {
    return this.client?.lastPayment || 8500;
  }

  async calculateScenarios(): Promise<void> {
    if (!this.configForm.get('monthsAffected')?.value) return;

    this.isCalculating = true;
    this.scenarios = [];
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    const monthsAffected = parseInt(this.configForm.value.monthsAffected);
    const currentPayment = this.getCurrentMonthlyPayment();
    
    this.scenarios = [
      {
        // SSOT required fields
        type: 'DEFER',
        params: { d: monthsAffected, capitalizeInterest: true },
        Mprime: 0,
        nPrime: 24 + monthsAffected,
        description: `Suspende pagos por ${monthsAffected} meses sin penalizaciones`,
        // Legacy compatibility fields
        title: 'Pausa de Pagos',
        // UI extension fields
        monthlyPaymentBefore: currentPayment,
        monthlyPaymentAfter: 0,
        termBefore: 24,
        termAfter: 24 + monthsAffected,
        savings: currentPayment * monthsAffected,
        benefits: [
          `${monthsAffected} meses sin pagos`,
          'Sin penalizaciones',
          'Historial crediticio protegido'
        ],
        drawbacks: [
          `Plazo se extiende ${monthsAffected} meses`,
          'Intereses siguen corriendo'
        ],
        recommended: monthsAffected <= 3
      },
      {
        // SSOT required fields
        type: 'STEPDOWN',
        params: { months: monthsAffected, alpha: 0.6 },
        Mprime: currentPayment * 0.6,
        nPrime: 30,
        description: 'Reduce temporalmente tu pago mensual',
        // Legacy compatibility fields
        title: ' Reducción de Pago',
        // UI extension fields
        monthlyPaymentBefore: currentPayment,
        monthlyPaymentAfter: currentPayment * 0.6,
        termBefore: 24,
        termAfter: 30,
        savings: (currentPayment * 0.4) * monthsAffected,
        benefits: [
          'Mantiene financiamiento activo',
          'Pago reducido significativamente',
          'Sin interrupciones'
        ],
        drawbacks: [
          'Plazo se extiende',
          'Costo total mayor'
        ],
        recommended: monthsAffected >= 3
      }
    ];

    this.isCalculating = false;
    this.toast.success('Opciones de protección generadas');
  }

  getScenarioCardClasses(scenario: ProtectionScenarioUI): Record<string, boolean> {
    return {
      'protection-simulator__scenario-card--selected': this.selectedScenario?.type === scenario.type,
      'protection-simulator__scenario-card--recommended': !!scenario.recommended,
    };
  }

  selectScenario(scenario: ProtectionScenarioUI): void {
    this.selectedScenario = scenario;
  }

  applyProtection(): void {
    if (!this.selectedScenario) return;
    
    this.toast.success('¡Protección aplicada exitosamente!');
    this.onApply.emit(this.selectedScenario);
  }

  shareWhatsApp(): void {
    if (!this.selectedScenario) return;

    const message = ` *Protección para Conductores*\n\n${this.selectedScenario.title}\n${this.selectedScenario.description}\n\nAhorro: ${this.formatCurrency(this.selectedScenario.savings)}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }
}
