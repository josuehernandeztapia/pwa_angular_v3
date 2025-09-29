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
import { IconComponent } from '../../../shared/icon/icon.component';

declare var Chart: any;

@Component({
  selector: 'app-tanda-colectiva',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SummaryPanelComponent, SkeletonCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tanda-colectiva.component.html',
  styleUrls: ['./tanda-colectiva.component.scss']
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
