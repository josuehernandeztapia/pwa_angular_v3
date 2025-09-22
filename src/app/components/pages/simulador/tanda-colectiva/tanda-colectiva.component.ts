import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { FinancialCalculatorService } from '../../../../services/financial-calculator.service';
import { LoadingService } from '../../../../services/loading.service';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { CollectiveScenarioConfig, SavingsScenario, SimuladorEngineService } from '../../../../services/simulador-engine.service';
import { SpeechService } from '../../../../services/speech.service';
import { ToastService } from '../../../../services/toast.service';
import { SkeletonCardComponent } from '../../../shared/skeleton-card.component';
import { SummaryPanelComponent } from '../../../shared/summary-panel/summary-panel.component';

declare var Chart: any;

@Component({
  selector: 'app-tanda-colectiva',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SummaryPanelComponent, SkeletonCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tanda-colectiva.component.scss',
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
              <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Simulador de Tanda Colectiva</h1>
              <p class="text-sm text-slate-600 dark:text-slate-400">Estrategia de ahorro grupal para vagonetas EdoMex</p>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" class="max-w-6xl mx-auto px-6 py-8">
        <!-- KPIs -->
        <div class="ui-card mb-6" *ngIf="simulationResult?.scenario">
          <div class="grid grid-cols-3 gap-6">
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="group-monthly-label">Aportación Mensual (Grupo)</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="group-monthly">
                {{ formatCurrency(simulationResult?.scenario?.monthlyContribution || 0) }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="first-award-label">1er Otorgamiento</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="first-award">
                {{ simulationResult?.scenario?.monthsToFirstAward || 0 }} meses
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="full-delivery-label">Entrega Completa</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="full-delivery">
                {{ simulationResult?.scenario?.monthsToFullDelivery || 0 }} meses
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="grid lg:grid-cols-2 gap-8">
          <!-- Configuration Panel -->
          <section class="ui-card" data-cy="edomex-colectivo-panel">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">EdoMex Colectivo – Parámetros</h2>

            <form [formGroup]="configForm" class="space-y-6">
              <div class="grid gap-3 md:grid-cols-2">
                <label class="text-sm">
                  Miembros (n)
                  <input data-cy="members" type="number" formControlName="memberCount" class="mt-1 w-full border rounded-md px-2 py-2" placeholder="15">
                </label>

                <label class="text-sm">
                  Valor Unidad (MXN)
                  <input data-cy="unit-price" type="number" formControlName="unitPrice" class="mt-1 w-full border rounded-md px-2 py-2" placeholder="800000">
                </label>

                <label class="text-sm">
                  Consumo Promedio /Miembro (L)
                  <input data-cy="avg-consumption" type="number" formControlName="avgConsumption" class="mt-1 w-full border rounded-md px-2 py-2" placeholder="500">
                </label>

                <label class="text-sm">
                  Sobreprecio por Litro (MXN)
                  <input data-cy="overprice-lit" type="number" step="0.01" formControlName="overpricePerLiter" class="mt-1 w-full border rounded-md px-2 py-2" placeholder="2.50">
                </label>

                <label class="text-sm">
                  Aportación Voluntaria /Miembro (MXN)
                  <input data-cy="voluntary-member" type="number" formControlName="voluntaryMonthly" class="mt-1 w-full border rounded-md px-2 py-2" placeholder="0">
                </label>
              </div>

              <button (click)="simulateTanda()" [disabled]="!configForm.valid || isSimulating" data-cy="run-edomex-colectivo" class="ui-btn ui-btn-primary mt-4">
                {{ isSimulating ? 'Simulando...' : 'Simular' }}
              </button>
            </form>
          </section>

          <!-- Results Panel -->
          <section class="ui-card" data-cy="edomex-colectivo-results" *ngIf="simulationResult?.scenario">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Resultado – EdoMex Colectivo</h3>

            <div class="grid gap-4 md:grid-cols-2 mb-6">
              <div class="ui-card">
                <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Ahorro acumulado (grupo)</h4>
                <canvas id="chartAhorroCol" data-cy="chart-ahorro-col" #groupSavingsChart></canvas>
              </div>
              <div class="ui-card">
                <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">PMT promedio</h4>
                <canvas id="chartPMTCol" data-cy="chart-pmt-col" #avgPmtChart></canvas>
              </div>
            </div>

            <!-- Comparison Table -->
            <div class="ui-card">
              <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Comparación de Simulaciones</h4>
              <table class="w-full text-sm border-collapse" data-cy="sim-comparison-table">
                <thead>
                  <tr class="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th class="text-left py-2">Escenario</th>
                    <th class="text-left py-2">Ahorro/Grupo</th>
                    <th class="text-left py-2">PMT Promedio</th>
                    <th class="text-left py-2">1er Otorg.</th>
                    <th class="text-left py-2">Entrega Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td class="py-2 text-slate-900 dark:text-slate-100">Escenario Actual</td>
                    <td class="py-2 text-slate-900 dark:text-slate-100">{{ formatCurrency(simulationResult?.scenario?.monthlyContribution || 0) }}</td>
                    <td class="py-2 text-slate-900 dark:text-slate-100">{{ formatCurrency((simulationResult?.scenario?.monthlyContribution || 0) / (configForm.get('memberCount')?.value || 1)) }}</td>
                    <td class="py-2 text-slate-900 dark:text-slate-100">{{ simulationResult?.scenario?.monthsToFirstAward || 0 }} m</td>
                    <td class="py-2 text-slate-900 dark:text-slate-100">{{ simulationResult?.scenario?.monthsToFullDelivery || 0 }} m</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 flex-wrap mt-6">
              <button (click)="generatePDF()" class="ui-btn ui-btn-primary">📄 PDF</button>
              <button (click)="resetForm()" class="ui-btn ui-btn-secondary">🔄 Limpiar</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  `
})
export class TandaColectivaComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('groupSavingsChart') groupSavingsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('avgPmtChart') avgPmtChartRef!: ElementRef<HTMLCanvasElement>;
  private groupSavingsChart: any;
  private avgPmtChart: any;

  private destroy$ = new Subject<void>();

  configForm: FormGroup;
  simulationResult: any = null;
  isSimulating = false;

  constructor(
    private fb: FormBuilder,
    private simuladorEngine: SimuladorEngineService,
    private loadingService: LoadingService,
    private financialCalc: FinancialCalculatorService,
    private pdfExportService: PdfExportService,
    private speech: SpeechService,
    private toast: ToastService,
    private router: Router
  ) {
    this.configForm = this.fb.group({
      memberCount: [15, [Validators.required, Validators.min(5), Validators.max(50)]],
      unitPrice: [800000, [Validators.required, Validators.min(500000)]],
      avgConsumption: [500, [Validators.required, Validators.min(200)]],
      overpricePerLiter: [2.5, [Validators.required, Validators.min(0.5)]],
      voluntaryMonthly: [0, [Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    // Initialize with default values
  }

  ngAfterViewInit(): void {
    // Charts will be initialized when simulation runs
  }

  ngOnDestroy(): void {
    if (this.groupSavingsChart) {
      this.groupSavingsChart.destroy();
    }
    if (this.avgPmtChart) {
      this.avgPmtChart.destroy();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/simuladores']);
  }

  simulateTanda(): void {
    if (!this.configForm.valid) return;

    const values = this.configForm.value;
    this.isSimulating = true;
    this.loadingService.show('Simulando estrategia de tanda colectiva...');

    // Simulate async calculation
    setTimeout(() => {
      const config: CollectiveScenarioConfig = {
        memberCount: values.memberCount,
        unitPrice: values.unitPrice,
        avgConsumption: values.avgConsumption,
        overpricePerLiter: values.overpricePerLiter,
        voluntaryMonthly: values.voluntaryMonthly || 0
      };

      this.simulationResult = this.simuladorEngine.generateEdoMexCollectiveScenario(config);

// removed by clean-audit
      this.simulationResult.scenario.monthsToFirstAward = Math.ceil(values.unitPrice / this.simulationResult.scenario.monthlyContribution);
      this.simulationResult.scenario.monthsToFullDelivery = this.simulationResult.scenario.monthsToFirstAward * values.memberCount;

      this.isSimulating = false;
      this.loadingService.hide();

      // Initialize charts after simulation
      setTimeout(() => this.initializeCharts(), 100);
    }, 1500);
  }

  resetForm(): void {
    this.configForm.reset({
      memberCount: 15,
      unitPrice: 800000,
      avgConsumption: 500,
      overpricePerLiter: 2.5,
      voluntaryMonthly: 0
    });
    this.simulationResult = null;
  }

  formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }

  private initializeCharts(): void {
    if (!this.simulationResult?.scenario) return;

    this.initializeGroupSavingsChart();
    this.initializeAvgPmtChart();
  }

  private initializeGroupSavingsChart(): void {
    if (!this.groupSavingsChartRef?.nativeElement || !this.simulationResult) return;

    if (this.groupSavingsChart) {
      this.groupSavingsChart.destroy();
    }

    const ctx = this.groupSavingsChartRef.nativeElement.getContext('2d');
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const groupSavings = months.map(m => m * this.simulationResult.scenario.monthlyContribution);

    this.groupSavingsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Ahorro Grupal Acumulado',
          data: groupSavings,
          borderColor: '#0EA5E9',
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6B7280' } },
          y: {
            ticks: {
              color: '#6B7280',
              callback: (value: any) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    });
  }

  private initializeAvgPmtChart(): void {
    if (!this.avgPmtChartRef?.nativeElement || !this.simulationResult) return;

    if (this.avgPmtChart) {
      this.avgPmtChart.destroy();
    }

    const ctx = this.avgPmtChartRef.nativeElement.getContext('2d');
    const memberCount = this.configForm.get('memberCount')?.value || 1;
    const avgPmt = this.simulationResult.scenario.monthlyContribution / memberCount;

    this.avgPmtChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['PMT Individual', 'Resto del Grupo'],
        datasets: [{
          data: [avgPmt, this.simulationResult.scenario.monthlyContribution - avgPmt],
          backgroundColor: ['#0EA5E9', '#E2E8F0']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  generatePDF(): void {
    if (!this.simulationResult) {
      this.toast.error('No hay simulación disponible para generar PDF');
      return;
    }

    const tandaData = {
      memberCount: this.configForm.value.memberCount,
      unitPrice: this.configForm.value.unitPrice,
      monthlyContribution: this.simulationResult.scenario.monthlyContribution,
      firstDeliveryMonth: this.simulationResult.scenario.monthsToFirstAward || 0
    };

    this.pdfExportService.generateTandaPDF(tandaData as any)
      .then(() => {
        this.toast.success('PDF generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar PDF');
      });
  }
}
// removed by clean-audit