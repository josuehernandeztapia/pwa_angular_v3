import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { FinancialCalculatorService } from '../../../../services/financial-calculator.service';
import { LoadingService } from '../../../../services/loading.service';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { SavingsScenario, SimuladorEngineService } from '../../../../services/simulador-engine.service';
import { ToastService } from '../../../../services/toast.service';
import { SkeletonCardComponent } from '../../../shared/skeleton-card.component';
import { SummaryPanelComponent } from '../../../shared/summary-panel/summary-panel.component';

@Component({
  selector: 'app-edomex-individual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SummaryPanelComponent, SkeletonCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="command-container p-6 space-y-6">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-6 shadow-lg">
        <h1 class="text-3xl font-bold mb-2">Planificador de Enganche Individual</h1>
        <p class="text-blue-100 text-lg">Calcula cuánto tiempo necesitas para ahorrar tu enganche</p>
      </div>

      <!-- Resumen KPIs -->
      <div class="premium-card p-4">
        <h2 class="text-lg font-semibold text-gray-800 mb-3">Resumen</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-blue-50 p-3 rounded border border-blue-100">
            <div class="text-blue-600 text-xs">Mensualidad</div>
            <div class="text-xl font-bold text-blue-800">{{ formatCurrency(scenario?.monthlyContribution || 0) }}</div>
          </div>
          <div class="bg-green-50 p-3 rounded border border-green-100">
            <div class="text-green-600 text-xs">Tiempo</div>
            <div class="text-xl font-bold text-green-800">{{ (scenario?.monthsToTarget || 0) }} meses</div>
          </div>
          <div class="bg-purple-50 p-3 rounded border border-purple-100">
            <div class="text-purple-600 text-xs">Meta</div>
            <div class="text-xl font-bold text-purple-800">{{ formatCurrency(scenario?.targetAmount || 0) }}</div>
          </div>
        </div>
      </div>

      <div class="grid-aside">
        <!-- Configuration Panel -->
        <div class="premium-card p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
            Unidad
          </h2>

          <form [formGroup]="configForm" class="space-y-6">
            <!-- Target Down Payment -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Meta de Enganche *
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  formControlName="targetDownPayment"
                  placeholder="150000"
                  class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="50000"
                  step="1000"
                />
              </div>
              <div class="flex justify-between text-xs text-gray-500">
                <span>Mínimo: $50,000</span>
                <span>Para unidad de $749K: $149,800 (20%)</span>
              </div>
              <div *ngIf="configForm.get('targetDownPayment')?.errors?.['required']" 
                   class="text-red-500 text-sm">La meta de enganche es obligatoria</div>
              <div *ngIf="configForm.get('targetDownPayment')?.errors?.['min']" 
                   class="text-red-500 text-sm">El mínimo es $50,000</div>
            </div>

            <!-- Current Plate Consumption -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Consumo Actual de Combustible *
              </label>
              <div class="relative">
                <input
                  type="number"
                  formControlName="currentPlateConsumption"
                  placeholder="500"
                  class="w-full pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="100"
                  step="50"
                />
                <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">litros/mes</span>
              </div>
              <p class="text-xs text-gray-500">Promedio de litros que consumes mensualmente</p>
              <div *ngIf="configForm.get('currentPlateConsumption')?.errors?.['required']" 
                   class="text-red-500 text-sm">El consumo de combustible es obligatorio</div>
              <div *ngIf="configForm.get('currentPlateConsumption')?.errors?.['min']" 
                   class="text-red-500 text-sm">El mínimo es 100 litros/mes</div>
            </div>

            <!-- Overprice Per Liter -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Sobreprecio por Litro *
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  formControlName="overpricePerLiter"
                  placeholder="2.50"
                  class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0.5"
                  step="0.1"
                />
              </div>
              <p class="text-xs text-gray-500">Cantidad extra por litro que destinarás al ahorro</p>
              <div *ngIf="configForm.get('overpricePerLiter')?.errors?.['required']" 
                   class="text-red-500 text-sm">El sobreprecio por litro es obligatorio</div>
              <div *ngIf="configForm.get('overpricePerLiter')?.errors?.['min']" 
                   class="text-red-500 text-sm">El mínimo es $0.50/litro</div>
            </div>

            <!-- Optional Voluntary Monthly -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Aportación Voluntaria Mensual (Opcional)
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  formControlName="voluntaryMonthly"
                  placeholder="0"
                  class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="100"
                />
              </div>
              <p class="text-xs text-gray-500">Dinero adicional que puedes aportar mensualmente</p>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4 pt-4">
              <button
                type="button"
                (click)="calculateScenario()"
                [disabled]="!configForm.valid || isCalculating"
                class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <span *ngIf="!isCalculating">Calcular Plan de Ahorro</span>
                <div *ngIf="isCalculating" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculando...
                </div>
              </button>
              <button
                type="button"
                (click)="resetForm()"
                class="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>

        <!-- Results Panel -->
        <div class="premium-card p-6" *ngIf="scenario">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span class="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
            Finanzas
          </h2>

          <!-- Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div class="text-blue-600 text-sm font-medium">Meta de Enganche</div>
              <div class="text-2xl font-bold text-blue-800">{{ formatCurrency(scenario.targetAmount) }}</div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div class="text-green-600 text-sm font-medium">Tiempo Estimado</div>
              <div class="text-2xl font-bold text-green-800">{{ scenario.monthsToTarget }} meses</div>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div class="text-purple-600 text-sm font-medium">Aportación Mensual</div>
              <div class="text-2xl font-bold text-purple-800">{{ formatCurrency(scenario.monthlyContribution) }}</div>
            </div>
          </div>

          <!-- Breakdown -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-gray-800 mb-3">Desglose de Aportación Mensual:</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Por recaudación de combustible:</span>
                <span class="font-medium">{{ formatCurrency(scenario.collectionContribution) }}</span>
              </div>
              <div class="flex justify-between" *ngIf="scenario.voluntaryContribution > 0">
                <span class="text-gray-600">Aportación voluntaria:</span>
                <span class="font-medium">{{ formatCurrency(scenario.voluntaryContribution) }}</span>
              </div>
              <hr class="my-2">
              <div class="flex justify-between font-semibold">
                <span>Total mensual:</span>
                <span>{{ formatCurrency(scenario.monthlyContribution) }}</span>
              </div>
            </div>
          </div>

          <!-- Progress Chart -->
          <div class="mb-6">
            <h3 class="font-semibold text-gray-800 mb-3">Proyección de Ahorro:</h3>
            <div class="bg-gray-100 rounded-lg p-4">
              <div class="grid grid-cols-4 gap-2 text-xs text-gray-600 mb-2">
                <span>Mes</span>
                <span>Balance</span>
                <span>Progreso</span>
                <span>%</span>
              </div>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                <div *ngFor="let balance of scenario.projectedBalance.slice(0, 12); let i = index" 
                     class="grid grid-cols-4 gap-2 text-sm">
                  <span class="text-gray-800">{{ i + 1 }}</span>
                  <span class="font-medium">{{ formatCurrency(balance) }}</span>
                  <div class="flex items-center">
                    <div class="w-16 bg-gray-200 rounded-full h-2">
                      <div class="bg-blue-500 h-2 rounded-full" [style.width.%]="(balance / scenario.targetAmount) * 100"></div>
                    </div>
                  </div>
                  <span class="text-xs text-gray-600">{{ ((balance / scenario.targetAmount) * 100).toFixed(1) }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="mb-6" *ngIf="scenario.timeline.length > 0">
            <h3 class="font-semibold text-gray-800 mb-3">Cronograma de Eventos:</h3>
            <div class="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <div *ngFor="let event of scenario.timeline.slice(0, 6)" class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                <div>
                  <span class="font-medium text-gray-800">Mes {{ event.month }}</span>
                  <p class="text-sm text-gray-600">{{ event.event }}</p>
                </div>
                <span class="text-sm font-medium text-green-600" *ngIf="event.amount > 0">
                  {{ formatCurrency(event.amount) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-4 flex-col sm:flex-row">
            <button
              (click)="generatePDF()"
              class="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
              data-cy="edomex-pdf"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              📄 Descargar PDF
            </button>
            <button
              (click)="proceedToClientCreation()"
              class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Crear Cliente con este Plan
            </button>
            <button
              (click)="saveDraft()"
              [disabled]="!scenario"
              class="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              data-cy="save-scenario" title="Guardar simulación"
            >
              💾 Guardar
            </button>
            <button
              (click)="recalculate()"
              class="px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-200"
            >
              Ajustar Plan
            </button>
          </div>
        </div>

        <!-- Initial Help Panel -->
        <div class="premium-card p-6" *ngIf="!scenario">
          <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span class="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">💡</span>
            ¿Cómo funciona?
          </h2>
          <div class="space-y-4 text-gray-600">
            <div class="flex items-start space-x-3">
              <span class="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div>
                <h3 class="font-medium text-gray-800">Define tu meta</h3>
                <p class="text-sm">¿Cuánto necesitas para el enganche de tu unidad?</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <span class="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div>
                <h3 class="font-medium text-gray-800">Tu consumo actual</h3>
                <p class="text-sm">Basado en los litros que ya consumes mensualmente</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <span class="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div>
                <h3 class="font-medium text-gray-800">Sobreprecio estratégico</h3>
                <p class="text-sm">Cada litro extra que pagues se destina a tu ahorro</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <span class="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">✓</span>
              <div>
                <h3 class="font-medium text-gray-800">Plan personalizado</h3>
                <p class="text-sm">Obtén tu cronograma detallado para alcanzar tu meta</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Aside Summary -->
        <app-summary-panel class="aside" *ngIf="scenario"
          [metrics]="[
            { label: 'Mensualidad', value: formatCurrency(scenario.monthlyContribution || 0), badge: 'success' },
            { label: 'Meses a Meta', value: (scenario.monthsToTarget || 0) + ' meses' },
            { label: 'Meta de Enganche', value: formatCurrency(scenario.targetAmount || 0) }
          ]"
          [actions]="asideActions"
        ></app-summary-panel>
      </div>
    </div>
  `
})
export class EdomexIndividualComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  configForm: FormGroup;
  scenario: SavingsScenario | null = null;
  isCalculating = false;
  asideActions = [
    { label: '📄 PDF', click: () => this.generatePDF() },
    { label: '✅ Crear Cliente', click: () => this.proceedToClientCreation() }
  ];

  constructor(
    private fb: FormBuilder,
    private simuladorEngine: SimuladorEngineService,
    private loadingService: LoadingService,
    private financialCalc: FinancialCalculatorService,
    private pdfExportService: PdfExportService,
    private toast: ToastService,
    private router: Router
  ) {
    this.configForm = this.fb.group({
      targetDownPayment: [149800, [Validators.required, Validators.min(50000)]],
      currentPlateConsumption: [500, [Validators.required, Validators.min(100)]],
      overpricePerLiter: [2.5, [Validators.required, Validators.min(0.5)]],
      voluntaryMonthly: [0, [Validators.min(0)]]
    });
  }

  ngOnInit() {
    // Optional: Pre-populate with common EdoMex values
    this.configForm.patchValue({
      targetDownPayment: 149800, // 20% of $749,000
      currentPlateConsumption: 500,
      overpricePerLiter: 2.5,
      voluntaryMonthly: 0
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  calculateScenario() {
    if (!this.configForm.valid) return;

    const values = this.configForm.value;
    this.isCalculating = true;
    this.loadingService.show('Calculando tu plan de ahorro personalizado...');

    // Simulate async calculation
    setTimeout(() => {
      this.scenario = this.simuladorEngine.generateEdoMexIndividualScenario(
        values.targetDownPayment,
        values.currentPlateConsumption,
        values.overpricePerLiter,
        values.voluntaryMonthly || 0
      );

      this.isCalculating = false;
      this.loadingService.hide();
    }, 1200);
  }

  resetForm() {
    this.configForm.reset({
      targetDownPayment: 149800,
      currentPlateConsumption: 500,
      overpricePerLiter: 2.5,
      voluntaryMonthly: 0
    });
    this.scenario = null;
  }

  recalculate() {
    this.scenario = null;
  }

  proceedToClientCreation() {
    if (!this.scenario) return;

    // Store scenario data for client creation
    const clientData: any = {
      simulatorData: {
        type: 'EDOMEX_INDIVIDUAL',
        scenario: this.scenario,
        configParams: this.configForm.value
      }
    };

    sessionStorage.setItem('pendingClientData', JSON.stringify(clientData));
    this.router.navigate(['/clientes/nuevo'], {
      queryParams: { 
        fromSimulator: 'edomex-individual',
        hasScenario: 'true'
      }
    });
  }

  formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }

  generatePDF(): void {
    if (!this.scenario) {
      this.toast.error('No hay simulación disponible para generar PDF');
      return;
    }

    const planningData = {
      targetDownPayment: this.scenario.targetAmount,
      monthsToTarget: this.scenario.monthsToTarget,
      monthlyCollection: this.scenario.collectionContribution,
      voluntaryMonthly: this.scenario.voluntaryContribution,
      plateConsumption: this.configForm.value.currentPlateConsumption,
      overpricePerLiter: this.configForm.value.overpricePerLiter,
      projectedBalance: this.scenario.projectedBalance
    };

    this.pdfExportService.generateIndividualPlanningPDF(planningData as any)
      .then(() => {
        this.toast.success('PDF generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar PDF');
      });
  }

  saveDraft(): void {
    if (!this.scenario) { this.toast.error('No hay simulación para guardar'); return; }
    const values = this.configForm.value;
    const draftKey = `edomex-individual-${Date.now()}-draft`;
    const draft = {
      clientName: '',
      market: 'edomex',
      clientType: 'Individual',
      timestamp: Date.now(),
      type: 'EDOMEX_INDIVIDUAL',
      targetDownPayment: this.scenario.targetAmount,
      scenario: this.scenario,
      configParams: values
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      this.toast.success('Simulación guardada');
    } catch {
      this.toast.error('No se pudo guardar la simulación');
    }
  }
}
