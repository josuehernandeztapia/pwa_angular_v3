import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
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

declare var Chart: any;

@Component({
  selector: 'app-edomex-individual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SummaryPanelComponent, SkeletonCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './edomex-individual.component.scss',
  template: `
    <!-- Skip Link for Accessibility -->
    <a class="skip-link" href="#main-content">Saltar al contenido principal</a>

    <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
      <!-- Header -->
      <header class="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div class="max-w-6xl mx-auto px-6 py-4">
          <div class="flex items-center gap-4">
            <button (click)="goBack()" class="ui-btn ui-btn-ghost ui-btn-sm" data-cy="back-button">
              ← Volver
            </button>
            <div>
              <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Planificador de Enganche Individual</h1>
              <p class="text-sm text-slate-600 dark:text-slate-400">Calcula cuánto tiempo necesitas para ahorrar tu enganche</p>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" class="max-w-6xl mx-auto px-6 py-8">
        <!-- KPIs -->
        <div class="ui-card mb-6" *ngIf="scenario">
          <div class="grid grid-cols-3 gap-6">
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="sim-ahorro-label">Mensualidad</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="sim-ahorro">
                {{ formatCurrency(scenario.monthlyContribution || 0) }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="sim-plazo-label">Tiempo</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="sim-plazo">
                {{ scenario.monthsToTarget || 0 }} meses
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="sim-pmt-label">Meta</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="sim-pmt">
                {{ formatCurrency(scenario.targetAmount || 0) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="grid lg:grid-cols-2 gap-8">
          <!-- Configuration Panel -->
          <div class="ui-card">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Configuración</h2>

            <form [formGroup]="configForm" class="space-y-6">
              <!-- Target Down Payment -->
              <div>
                <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Meta de Enganche *</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    formControlName="targetDownPayment"
                    placeholder="150000"
                    class="ui-input pl-8"
                    min="50000"
                    step="1000"
                    data-cy="target-down-payment"
                  />
                </div>
                <div class="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Mínimo: $50,000</span>
                  <span>Para unidad de $749K: $149,800 (20%)</span>
                </div>
                <div *ngIf="configForm.get('targetDownPayment')?.errors?.['required']"
                     class="text-red-500 text-xs mt-1">La meta de enganche es obligatoria</div>
                <div *ngIf="configForm.get('targetDownPayment')?.errors?.['min']"
                     class="text-red-500 text-xs mt-1">El mínimo es $50,000</div>
              </div>

              <!-- Current Plate Consumption -->
              <div>
                <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Consumo Actual de Combustible *</label>
                <div class="relative">
                  <input
                    type="number"
                    formControlName="currentPlateConsumption"
                    placeholder="500"
                    class="ui-input pr-20"
                    min="100"
                    step="50"
                    data-cy="consumption"
                  />
                  <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">litros/mes</span>
                </div>
                <p class="text-xs text-slate-500 mt-1">Promedio de litros que consumes mensualmente</p>
                <div *ngIf="configForm.get('currentPlateConsumption')?.errors?.['required']"
                     class="text-red-500 text-xs mt-1">El consumo de combustible es obligatorio</div>
                <div *ngIf="configForm.get('currentPlateConsumption')?.errors?.['min']"
                     class="text-red-500 text-xs mt-1">El mínimo es 100 litros/mes</div>
              </div>

              <!-- Overprice Per Liter -->
              <div>
                <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Sobreprecio por Litro *</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    formControlName="overpricePerLiter"
                    placeholder="2.50"
                    class="ui-input pl-8"
                    min="0.5"
                    step="0.1"
                    data-cy="overprice"
                  />
                </div>
                <p class="text-xs text-slate-500 mt-1">Cantidad extra por litro que destinarás al ahorro</p>
                <div *ngIf="configForm.get('overpricePerLiter')?.errors?.['required']"
                     class="text-red-500 text-xs mt-1">El sobreprecio por litro es obligatorio</div>
                <div *ngIf="configForm.get('overpricePerLiter')?.errors?.['min']"
                     class="text-red-500 text-xs mt-1">El mínimo es $0.50/litro</div>
              </div>

              <!-- Optional Voluntary Monthly -->
              <div>
                <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Aportación Voluntaria Mensual (Opcional)</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    formControlName="voluntaryMonthly"
                    placeholder="0"
                    class="ui-input pl-8"
                    min="0"
                    step="100"
                    data-cy="voluntary"
                  />
                </div>
                <p class="text-xs text-slate-500 mt-1">Dinero adicional que puedes aportar mensualmente</p>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  (click)="calculateScenario()"
                  [disabled]="!configForm.valid || isCalculating"
                  class="ui-btn ui-btn-primary flex-1"
                  data-cy="calculate-btn"
                >
                  {{ isCalculating ? 'Calculando...' : 'Calcular Plan de Ahorro' }}
                </button>
                <button
                  type="button"
                  (click)="resetForm()"
                  class="ui-btn ui-btn-secondary"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>

        <!-- Results Panel -->
        <div class="ui-card" *ngIf="scenario">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Resultados del Simulador</h2>

          <!-- Charts Section -->
          <div class="grid lg:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Progreso de Ahorro</h3>
              <div class="relative h-48 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <canvas #progressChart></canvas>
              </div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Distribución de Aportes</h3>
              <div class="relative h-48 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <canvas #distributionChart></canvas>
              </div>
            </div>
          </div>

          <!-- Breakdown -->
          <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Desglose de Aportación Mensual</h3>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-slate-600 dark:text-slate-400">Por recaudación de combustible</span>
                <span class="font-medium text-slate-900 dark:text-slate-100">{{ formatCurrency(scenario.collectionContribution) }}</span>
              </div>
              <div class="flex justify-between items-center" *ngIf="scenario.voluntaryContribution > 0">
                <span class="text-slate-600 dark:text-slate-400">Aportación voluntaria</span>
                <span class="font-medium text-slate-900 dark:text-slate-100">{{ formatCurrency(scenario.voluntaryContribution) }}</span>
              </div>
              <div class="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center font-medium">
                <span class="text-slate-900 dark:text-slate-100">Total mensual</span>
                <span class="text-slate-900 dark:text-slate-100">{{ formatCurrency(scenario.monthlyContribution) }}</span>
              </div>
            </div>
          </div>

          <!-- Comparison Table -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Proyección Mensual (Primeros 12 meses)</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th class="text-left py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Mes</th>
                    <th class="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Balance</th>
                    <th class="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Progreso</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr *ngFor="let balance of scenario.projectedBalance.slice(0, 12); let i = index"
                      class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td class="py-2 px-3 text-slate-900 dark:text-slate-100">{{ i + 1 }}</td>
                    <td class="py-2 px-3 text-right font-medium text-slate-900 dark:text-slate-100">{{ formatCurrency(balance) }}</td>
                    <td class="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{{ ((balance / scenario.targetAmount) * 100).toFixed(1) }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Timeline -->
          <div class="mb-6" *ngIf="scenario.timeline?.length > 0">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Cronograma de Hitos</h3>
            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
              <div *ngFor="let event of scenario.timeline.slice(0, 6)"
                   class="flex justify-between items-start py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                <div class="flex-1">
                  <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Mes {{ event.month }}</span>
                  <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">{{ event.event }}</p>
                </div>
                <span class="text-sm font-medium text-emerald-600 dark:text-emerald-400" *ngIf="event.amount > 0">
                  {{ formatCurrency(event.amount) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 flex-wrap">
            <button
              (click)="generatePDF()"
              class="ui-btn ui-btn-primary"
              data-cy="edomex-pdf"
            >
              📄 Descargar PDF
            </button>
            <button
              (click)="proceedToClientCreation()"
              class="ui-btn ui-btn-primary"
            >
              ✅ Crear Cliente
            </button>
            <button
              (click)="saveDraft()"
              [disabled]="!scenario"
              class="ui-btn ui-btn-secondary"
              data-cy="save-scenario"
            >
              💾 Guardar
            </button>
            <button
              (click)="recalculate()"
              class="ui-btn ui-btn-ghost"
            >
              🔄 Ajustar Plan
            </button>
          </div>
        </div>

        <!-- Initial Help Panel -->
        <div class="ui-card" *ngIf="!scenario">
          <div class="text-center mb-6">
            <div class="w-12 h-12 bg-sky-100 dark:bg-sky-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <span class="text-sky-600 dark:text-sky-400 text-xl">💡</span>
            </div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">¿Cómo funciona el planificador?</h2>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Calcula tu plan personalizado de ahorro para el enganche</p>
          </div>

          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-400 flex-shrink-0">
                1
              </div>
              <div>
                <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">Define tu meta de enganche</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">Establece cuánto necesitas ahorrar para tu unidad</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-400 flex-shrink-0">
                2
              </div>
              <div>
                <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">Ingresa tu consumo actual</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">Basado en los litros que ya consumes mensualmente</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-400 flex-shrink-0">
                3
              </div>
              <div>
                <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">Sobreprecio estratégico</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">Cada litro extra que pagues se destina a tu ahorro</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-xs font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                ✓
              </div>
              <div>
                <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">Obtén tu plan personalizado</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">Cronograma detallado con proyecciones y hitos</p>
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
export class EdomexIndividualComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('progressChart') progressChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChart') distributionChartRef!: ElementRef<HTMLCanvasElement>;
  private progressChart: any;
  private distributionChart: any;
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

  ngAfterViewInit(): void {
    // Chart.js will be initialized when a scenario is calculated
  }

  ngOnDestroy() {
    if (this.progressChart) {
      this.progressChart.destroy();
    }
    if (this.distributionChart) {
      this.distributionChart.destroy();
    }
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

      // Initialize charts after scenario is set
      setTimeout(() => this.initializeCharts(), 100);
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

  private initializeCharts(): void {
    if (!this.scenario) return;

    this.initializeProgressChart();
    this.initializeDistributionChart();
  }

  private initializeProgressChart(): void {
    if (!this.progressChartRef?.nativeElement || !this.scenario) return;

    if (this.progressChart) {
      this.progressChart.destroy();
    }

    const ctx = this.progressChartRef.nativeElement.getContext('2d');
    const months = Array.from({ length: this.scenario.monthsToTarget }, (_, i) => i + 1);
    const projectedData = this.scenario.projectedBalance || [];

    this.progressChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Progreso de Ahorro',
          data: projectedData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Progreso Mensual hacia el Enganche',
            font: { size: 14, weight: '600' },
            color: '#374151'
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Mes', color: '#6B7280' },
            grid: { color: '#E5E7EB' }
          },
          y: {
            title: { display: true, text: 'Monto ($)', color: '#6B7280' },
            grid: { color: '#E5E7EB' },
            ticks: {
              callback: (value: any) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    });
  }

  private initializeDistributionChart(): void {
    if (!this.distributionChartRef?.nativeElement || !this.scenario) return;

    if (this.distributionChart) {
      this.distributionChart.destroy();
    }

    const ctx = this.distributionChartRef.nativeElement.getContext('2d');
    const collectionAmount = this.scenario.collectionContribution * this.scenario.monthsToTarget;
    const voluntaryAmount = this.scenario.voluntaryContribution * this.scenario.monthsToTarget;

    this.distributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Recaudación Combustible', 'Aportación Voluntaria'],
        datasets: [{
          data: [collectionAmount, voluntaryAmount],
          backgroundColor: ['#10B981', '#3B82F6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true }
          },
          title: {
            display: true,
            text: 'Distribución de Aportaciones',
            font: { size: 14, weight: '600' },
            color: '#374151'
          }
        }
      }
    });
  }

  formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }

  goBack(): void {
    this.router.navigate(['/simuladores']);
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
