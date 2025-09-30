import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, AfterViewInit, ViewChild, ElementRef, Optional } from '@angular/core';
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
import { DESIGN_TOKENS, getDataColor } from '../../../../styles/design-tokens';
import { FlowContextService } from '../../../../services/flow-context.service';
import { MarketPolicyContext, MarketPolicyService, PolicyClientType, PolicyMarket } from '../../../../services/market-policy.service';
import { BusinessFlow } from '../../../../models/types';

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
    private router: Router,
    private marketPolicy: MarketPolicyService,
    @Optional() private flowContext?: FlowContextService
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

      this.persistFlowContextSnapshot(config, 'tanda-simulation');

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

  private persistFlowContextSnapshot(config: CollectiveScenarioConfig, origin: string): void {
    if (!this.flowContext) {
      return;
    }

    const market: PolicyMarket = 'edomex';
    const clientType: PolicyClientType = 'colectivo';
    const saleType: 'contado' | 'financiero' = 'financiero';
    const businessFlow = BusinessFlow.CreditoColectivo;
    const rawMembers = Number(config.memberCount);
    const collectiveMembers = Number.isFinite(rawMembers) && rawMembers > 0 ? rawMembers : undefined;

    const groupContribution = this.simulationResult?.scenario?.monthlyContribution;
    const monthlyPayment = typeof groupContribution === 'number' && collectiveMembers
      ? groupContribution / collectiveMembers
      : undefined;

    const policyContext: MarketPolicyContext = {
      market,
      clientType,
      saleType,
      businessFlow,
      collectiveSize: collectiveMembers,
    };

    let incomeThreshold: number | undefined;
    let incomeThresholdRatio: number | undefined;

    if (monthlyPayment && monthlyPayment > 0) {
      const ratio = this.marketPolicy.getIncomeThreshold(policyContext);
      if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0) {
        incomeThresholdRatio = ratio;
        incomeThreshold = monthlyPayment * ratio;
      }
    }

    const requiresIncomeProof = incomeThreshold !== undefined && monthlyPayment !== undefined
      ? monthlyPayment > incomeThreshold
      : undefined;

    if (typeof requiresIncomeProof === 'boolean') {
      policyContext.requiresIncomeProof = requiresIncomeProof;
    }

    const simulatorData = {
      market,
      clientType,
      saleType,
      collectiveMembers,
      monthlyContribution: groupContribution,
      monthlyPayment,
      incomeThreshold,
      incomeThresholdRatio,
      requiresIncomeProof,
      config,
      scenario: this.simulationResult?.scenario,
      origin,
      updatedAt: Date.now(),
    };

    const existing = this.flowContext.getContextData<any>('simulador') ?? {};

    this.flowContext.saveContext('simulador', {
      ...existing,
      market,
      clientType,
      saleType,
      businessFlow,
      collectiveMembers,
      monthlyPayment,
      incomeThreshold,
      incomeThresholdRatio,
      requiresIncomeProof,
      simulatorData,
      quotationData: {
        ...(existing.quotationData ?? {}),
        monthlyPayment,
        incomeThreshold,
        incomeThresholdRatio,
        collectiveMembers,
      },
      policyContext,
      clientId: existing.clientId,
      clientName: existing.clientName,
    }, {
      breadcrumbs: this.buildSimulatorBreadcrumbs(),
    });
  }

  private buildSimulatorBreadcrumbs(): string[] {
    return ['Dashboard', 'Simulador', 'Tanda Colectiva'];
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
          borderColor: getDataColor('accent'),
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
          x: { ticks: { color: DESIGN_TOKENS.color.text.secondary } },
          y: {
            ticks: {
              color: DESIGN_TOKENS.color.text.secondary,
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
          backgroundColor: [
            getDataColor('accent'),
            DESIGN_TOKENS.color.border
          ]
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
