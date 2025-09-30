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
import { IconComponent } from '../../../shared/icon/icon.component';
import { DESIGN_TOKENS, getDataColor } from '../../../../styles/design-tokens';

declare var Chart: any;

@Component({
  selector: 'app-edomex-individual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SummaryPanelComponent, SkeletonCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './edomex-individual.component.scss',
  templateUrl: './edomex-individual.component.html'
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
    { label: 'PDF', click: () => this.generatePDF() },
    { label: 'Crear Cliente', click: () => this.proceedToClientCreation() }
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

  private withAlpha(color: string, alpha: number): string {
    const hex = color.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
          borderColor: getDataColor('primary'),
          backgroundColor: this.withAlpha(getDataColor('primary'), 0.1),
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
            color: DESIGN_TOKENS.color.text.primary
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Mes', color: DESIGN_TOKENS.color.text.secondary },
            grid: { color: DESIGN_TOKENS.color.border }
          },
          y: {
            title: { display: true, text: 'Monto ($)', color: DESIGN_TOKENS.color.text.secondary },
            grid: { color: DESIGN_TOKENS.color.border },
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
          backgroundColor: [
            DESIGN_TOKENS.color.text.primary,
            DESIGN_TOKENS.color.text.secondary
          ],
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
            labels: {
              usePointStyle: true,
              color: DESIGN_TOKENS.color.text.secondary
            }
          },
          title: {
            display: true,
            text: 'Distribución de Aportaciones',
            font: { size: 14, weight: '600' },
            color: DESIGN_TOKENS.color.text.primary
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
