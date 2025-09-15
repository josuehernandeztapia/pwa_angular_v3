import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FinancialCalculatorService } from '../../services/financial-calculator.service';
import { ToastService } from '../../services/toast.service';
import { Client } from '../../models/types';
import { ProtectionScenario, ProtectionType } from '../../models/protection';

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
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="protection-simulator bg-white rounded-xl shadow-lg border border-gray-200">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-xl p-6">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-2xl font-bold mb-2">🛡️ Protección para Conductores</h2>
            <p class="text-blue-100">Encuentra la mejor solución para situaciones imprevistas</p>
            <div *ngIf="client" class="mt-2 text-sm text-blue-200">
              Cliente: <strong>{{ client.name }}</strong> • Pago actual: <strong>{{ formatCurrency(getCurrentMonthlyPayment()) }}</strong>
            </div>
          </div>
          <button (click)="onClose.emit()" class="text-blue-200 hover:text-white">×</button>
        </div>
      </div>

      <div class="p-6">
        <!-- Configuration Form -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Configura tu situación:</h3>
          
          <form [formGroup]="configForm" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Meses que necesitas protección *
                </label>
                <select formControlName="monthsAffected" 
                        (change)="calculateScenarios()"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Seleccionar --</option>
                  <option value="1">1 mes</option>
                  <option value="2">2 meses</option>
                  <option value="3">3 meses</option>
                  <option value="4">4 meses</option>
                  <option value="6">6 meses</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de dificultad</label>
                <select formControlName="difficultyType" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="temporary">Dificultad temporal (enfermedad)</option>
                  <option value="economic">Situación económica difícil</option>
                  <option value="work_loss">Pérdida de trabajo</option>
                  <option value="family">Emergencia familiar</option>
                </select>
              </div>
            </div>

            <div class="text-center">
              <button type="button" 
                      (click)="calculateScenarios()"
                      [disabled]="!configForm.get('monthsAffected')?.value || isCalculating"
                      class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                {{ isCalculating ? '🔄 Calculando...' : '🔍 Buscar Opciones' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Scenarios Results -->
        <div *ngIf="scenarios.length > 0 && !isCalculating" class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">💡 Opciones Disponibles:</h3>

          <div class="grid gap-4">
            <div *ngFor="let scenario of scenarios" 
                 (click)="selectScenario(scenario)"
                 [class]="'cursor-pointer border-2 rounded-xl p-6 transition-all ' + 
                          (selectedScenario?.type === scenario.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200') +
                          (scenario.recommended ? ' ring-2 ring-green-400' : '')">
              
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h4 class="text-lg font-semibold text-gray-800">
                    {{ scenario.title }}
                    <span *ngIf="scenario.recommended" 
                          class="ml-2 px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-full">
                      ⭐ RECOMENDADO
                    </span>
                  </h4>
                  <p class="text-gray-600 text-sm">{{ scenario.description }}</p>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-green-600">{{ formatCurrency(scenario.savings) }}</div>
                  <div class="text-xs text-gray-500">de ahorro</div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 class="font-medium text-green-700 mb-2">✅ Beneficios:</h5>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li *ngFor="let benefit of scenario.benefits">• {{ benefit }}</li>
                  </ul>
                </div>
                <div>
                  <h5 class="font-medium text-orange-700 mb-2">⚠️ Consideraciones:</h5>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li *ngFor="let drawback of scenario.drawbacks">• {{ drawback }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div *ngIf="scenarios.length > 0" class="mt-6 pt-6 border-t border-gray-200">
          <div class="flex gap-4">
            <button (click)="onClose.emit()" 
                    class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg">
              Cancelar
            </button>
            <button (click)="shareWhatsApp()" class="px-6 py-3 bg-green-600 text-white rounded-lg">
              📱 Compartir
            </button>
            <button (click)="applyProtection()" 
                    [disabled]="!selectedScenario"
                    class="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg disabled:bg-gray-400">
              ✅ Aplicar Protección
            </button>
          </div>
        </div>
      </div>
    </div>
  `
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
        title: '⏸️ Pausa de Pagos',
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
        title: '📉 Reducción de Pago',
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

    const message = `🛡️ *Protección para Conductores*\n\n${this.selectedScenario.title}\n${this.selectedScenario.description}\n\nAhorro: ${this.formatCurrency(this.selectedScenario.savings)}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }
}