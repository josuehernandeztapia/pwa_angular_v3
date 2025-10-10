import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinancialCalculatorService } from '../../services/financial-calculator.service';
import { ToastService } from '../../services/toast.service';
import { Client } from '../../models/types';
import { ProtectionScenario, ProtectionType } from '../../models/protection';
import { ProtectionEngineService } from '../../services/protection-engine.service';
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
    private protectionEngine: ProtectionEngineService,
    private toast: ToastService
  ) {
    this.configForm = this.fb.group({
      monthsAffected: ['', [Validators.required]],
      difficultyType: ['temporary']
    });
  }

  getCurrentMonthlyPayment(): number {
    if (this.client?.paymentPlan?.monthlyPayment) {
      return this.client.paymentPlan.monthlyPayment;
    }
    if (this.client?.paymentPlan?.monthlyGoal) {
      return this.client.paymentPlan.monthlyGoal;
    }
    return this.client?.lastPayment || 0;
  }

  calculateScenarios(): void {
    if (!this.configForm.get('monthsAffected')?.value) {
      this.toast.error('Ingresa los meses afectados para simular.');
      return;
    }

    if (!this.client || !this.client.paymentPlan) {
      this.toast.error('Este cliente no tiene información financiera suficiente para simular.');
      return;
    }

    const monthsAffected = parseInt(this.configForm.value.monthsAffected, 10);
    if (Number.isNaN(monthsAffected) || monthsAffected <= 0) {
      this.toast.error('Ingresa un número válido de meses.');
      return;
    }

    const paymentPlan = this.client.paymentPlan;
    const basePayment = this.getCurrentMonthlyPayment();
    const remainingTerm = Math.max(paymentPlan.term ?? 0, 0);

    if (!basePayment || !remainingTerm || monthsAffected >= remainingTerm) {
      this.toast.error('Los parámetros actuales no permiten generar escenarios de protección.');
      return;
    }

    this.isCalculating = true;
    this.scenarios = [];

    try {
      const monthlyRate = this.financialCalc.getTIRMin(this.client.market ?? 'aguascalientes') / 12;
      const currentBalance = this.deriveCurrentBalance(basePayment, remainingTerm);
      const baseTerm = remainingTerm;

      const generated = [
        this.protectionEngine.generateScenarioWithTIR(
          'DEFER',
          `Pausa los pagos por ${monthsAffected} meses`,
          `Pausa los pagos por ${monthsAffected} meses y redistribuye el saldo en las mensualidades restantes.`,
          currentBalance,
          monthlyRate,
          basePayment,
          remainingTerm,
          monthsAffected,
          1,
          this.client.market
        ),
        this.protectionEngine.generateScenarioWithTIR(
          'STEPDOWN',
          'Reducción temporal de pago',
          'Reduce temporalmente tu pago mensual y compensa al finalizar el periodo.',
          currentBalance,
          monthlyRate,
          basePayment,
          remainingTerm,
          monthsAffected,
          0.6,
          this.client.market
        ),
        this.protectionEngine.generateScenarioWithTIR(
          'RECALENDAR',
          'Extensión de plazo',
          'Extiende el plazo del crédito para mantener el pago actual después de la pausa.',
          currentBalance,
          monthlyRate,
          basePayment,
          remainingTerm,
          monthsAffected,
          1,
          this.client.market
        )
      ].filter((scenario): scenario is ProtectionScenario => !!scenario);

      this.scenarios = generated.map(scenario =>
        this.mapScenarioToUI(scenario, basePayment, baseTerm, monthsAffected)
      );

      if (this.scenarios.length === 0) {
        this.toast.info('No hay escenarios disponibles con los parámetros seleccionados.');
      } else {
        this.selectedScenario = this.scenarios[0];
        this.toast.success(`${this.scenarios.length} escenario(s) generados.`);
      }
    } catch (error) {
      this.toast.error('Ocurrió un error al calcular los escenarios de protección.');
    } finally {
      this.isCalculating = false;
    }
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
    return this.financialCalc.formatCurrency(value ?? 0);
  }

  private deriveCurrentBalance(basePayment: number, remainingTerm: number): number {
    if (typeof this.client?.remainderAmount === 'number' && this.client.remainderAmount > 0) {
      return this.client.remainderAmount;
    }

    const plan = this.client?.paymentPlan;
    if (plan?.currentMonthProgress && plan?.term) {
      const paid = plan.currentMonthProgress;
      const total = (plan.monthlyPayment ?? basePayment) * plan.term;
      const balance = total - paid;
      if (balance > 0) {
        return balance;
      }
    }

    return Math.max(basePayment * remainingTerm, 0);
  }

  private mapScenarioToUI(
    scenario: ProtectionScenario,
    basePayment: number,
    baseTerm: number,
    monthsAffected: number
  ): ProtectionScenarioUI {
    const monthlyAfter = this.roundAmount(scenario.newPayment ?? scenario.Mprime ?? basePayment);
    const termAfter = Math.round(scenario.newTerm ?? scenario.nPrime ?? baseTerm);

    const descriptors = this.describeScenario(
      scenario.type,
      basePayment,
      monthlyAfter,
      baseTerm,
      termAfter,
      monthsAffected
    );

    const savings = this.roundAmount(
      scenario.impact?.paymentChange ??
        (scenario.type === 'DEFER'
          ? basePayment * monthsAffected
          : scenario.type === 'STEPDOWN'
            ? Math.max(basePayment - monthlyAfter, 0) * monthsAffected
            : 0)
    );

    return {
      ...scenario,
      title: descriptors.title,
      description: descriptors.description,
      monthlyPaymentBefore: this.roundAmount(basePayment),
      monthlyPaymentAfter: monthlyAfter,
      termBefore: baseTerm,
      termAfter,
      savings,
      benefits: descriptors.benefits,
      drawbacks: descriptors.drawbacks,
      recommended: descriptors.recommended
    };
  }

  private describeScenario(
    type: ProtectionType,
    basePayment: number,
    monthlyAfter: number,
    termBefore: number,
    termAfter: number,
    monthsAffected: number
  ) {
    switch (type) {
      case 'DEFER':
        return {
          title: 'Pausa y prorrateo',
          description: `Suspende los pagos durante ${monthsAffected} mes(es) y redistribuye el saldo restante en el plazo original.`,
          benefits: [
            `${monthsAffected} mes(es) sin pagos`,
            'Conserva el crédito activo',
            `Pago posterior de ${this.formatCurrency(monthlyAfter)}`
          ],
          drawbacks: [
            'Interés capitalizado durante la pausa',
            termAfter > termBefore ? `Plazo total: ${termAfter} meses` : 'Plazo se mantiene'
          ],
          recommended: monthsAffected <= 3
        };
      case 'STEPDOWN':
        return {
          title: 'Reducción temporal de pago',
          description: `Disminuye el pago mensual y lo compensa al finalizar el periodo seleccionado.`,
          benefits: [
            `Pago temporal de ${this.formatCurrency(monthlyAfter)}`,
            'Mantiene el financiamiento activo',
            'Permite reorganizar el flujo de efectivo'
          ],
          drawbacks: [
            termAfter > termBefore ? `El plazo se extiende a ${termAfter} meses` : 'El plazo se mantiene',
            'El costo total del crédito aumenta'
          ],
          recommended: monthsAffected >= 3
        };
      case 'RECALENDAR':
        return {
          title: 'Extensión de plazo',
          description: `Pausa los pagos y extiende el plazo del crédito para mantener el pago actual.` ,
          benefits: [
            `${monthsAffected} mes(es) sin pagos`,
            `Pago mensual continúa en ${this.formatCurrency(basePayment)}`,
            'Facilita retomar el crédito al término de la pausa'
          ],
          drawbacks: [
            termAfter > termBefore ? `Plazo total después de la modificación: ${termAfter} meses` : 'El plazo no cambia',
            'Mayor tiempo de financiamiento'
          ],
          recommended: false
        };
      default:
        return {
          title: 'Escenario de protección',
          description: 'Ajuste calculado para mejorar la capacidad de pago.',
          benefits: [],
          drawbacks: [],
          recommended: false
        };
    }
  }

  private roundAmount(value: number): number {
    return Math.round((value ?? 0) * 100) / 100;
  }
}
