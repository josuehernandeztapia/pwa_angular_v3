import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, take, finalize } from 'rxjs/operators';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { ActionableClient, ActionableGroup, ActivityFeedItem, DashboardStats, Market, OpportunityStage } from '../../../models/types';
import { DashboardService } from '../../../services/dashboard.service';
import { ConnectionIndicatorComponent } from '../../shared/connection-indicator/connection-indicator.component';
import { DESIGN_TOKENS, getDataColor, getChartColor } from '../../../styles/design-tokens';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../shared/icon/icon-definitions';
import { DeliveriesService } from '../../../services/deliveries.service';
import { ToastService } from '../../../services/toast.service';
import { environment } from '../../../../environments/environment';
import { FlowContextService } from '../../../services/flow-context.service';

// Register Chart.js components
Chart.register(...registerables);

interface KPIAction {
  label: string;
  dataCy: string;
  variant: 'primary' | 'secondary';
  route?: string | any[];
  queryParams?: Record<string, any>;
  externalUrl?: string;
  action?: 'recalculateEta' | 'downloadSavings';
}

interface KPICard {
  title: string;
  value: string;
  subValue?: string;
  iconName: IconName;
  iconClass?: string;
  dataCy: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  primaryAction?: KPIAction;
  secondaryAction?: KPIAction;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ConnectionIndicatorComponent,
    IconComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('pmtChart', { static: false }) pmtChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart', { static: false }) revenueChartRef!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private pmtChart?: Chart;
  private revenueChart?: Chart;

  // State management
  userName = 'Ricardo';
  selectedMarket: Market = 'all';
  isLoading = true;
  showMobileActions = false;
  private isEtaRecalculating = false;

  // Dashboard data
  stats: DashboardStats | null = null;
  dashboardStats!: DashboardStats;
  activityFeed: ActivityFeedItem[] = [];
  funnelData: OpportunityStage[] = [];
  actionableGroups: ActionableGroup[] = [];
  allClients: ActionableClient[] = [];

  // KPI Cards Data
  kpiCards: KPICard[] = [
    {
      title: 'PMT Mensual',
      value: '$8,450',
      subValue: 'Promedio móvil',
      iconName: 'currency-dollar',
      iconClass: 'kpi-icon--money',
      dataCy: 'kpi-pmt',
      trend: 'up',
      trendValue: '+5.2%',
      primaryAction: {
        label: 'Crear cotización',
        dataCy: 'dashboard-pmt-create-quote',
        variant: 'primary',
        route: ['/cotizador'],
        queryParams: { source: 'dashboard', view: 'new-quote' }
      },
      secondaryAction: {
        label: 'Ver pipeline',
        dataCy: 'dashboard-pmt-open-pipeline',
        variant: 'secondary',
        route: ['/cotizador'],
        queryParams: { filter: 'pipeline', source: 'dashboard' }
      }
    },
    {
      title: 'TIR',
      value: '27.1%',
      subValue: 'Tasa Interna de Retorno',
      iconName: 'chart',
      iconClass: 'kpi-icon--chart-up',
      dataCy: 'kpi-tir',
      trend: 'up',
      trendValue: '+2.1%',
      primaryAction: {
        label: 'Abrir simulador',
        dataCy: 'dashboard-tir-open-simulator',
        variant: 'primary',
        route: ['/simulador'],
        queryParams: { preset: 'tir', source: 'dashboard' }
      },
      secondaryAction: {
        label: 'Ver protección',
        dataCy: 'dashboard-tir-open-proteccion',
        variant: 'secondary',
        route: ['/proteccion'],
        queryParams: { source: 'dashboard' }
      }
    },
    {
      title: 'Ahorro Proyectado',
      value: '$32,500',
      subValue: 'Próximos 12 meses',
      iconName: 'target',
      iconClass: 'kpi-icon--target',
      dataCy: 'kpi-ahorro',
      trend: 'up',
      trendValue: '+12.8%',
      primaryAction: {
        label: 'Comparar escenarios',
        dataCy: 'dashboard-ahorro-compare',
        variant: 'primary',
        route: ['/simulador'],
        queryParams: { view: 'compare', source: 'dashboard' }
      },
      secondaryAction: {
        label: 'Exportar ahorro',
        dataCy: 'dashboard-ahorro-export',
        variant: 'secondary',
        action: 'downloadSavings'
      }
    },
    {
      title: 'Unidades Entregadas',
      value: '12',
      subValue: 'Este mes',
      iconName: 'truck',
      iconClass: 'kpi-icon--delivery',
      dataCy: 'kpi-entregas',
      trend: 'stable',
      trendValue: '0%',
      primaryAction: {
        label: 'Revisar entregas',
        dataCy: 'dashboard-entregas-open',
        variant: 'primary',
        route: ['/entregas'],
        queryParams: { source: 'dashboard' }
      },
      secondaryAction: {
        label: 'Recalcular ETA',
        dataCy: 'dashboard-entregas-recalculate',
        variant: 'secondary',
        action: 'recalculateEta'
      }
    }
  ];

  constructor(
    private router: Router,
    private dashboardService: DashboardService,
    private deliveriesService: DeliveriesService,
    private toast: ToastService,
    private flowContext: FlowContextService
  ) {}

  ngOnInit(): void {
    this.flowContext.setBreadcrumbs(['Dashboard']);
    this.loadDashboardData();
    this.subscribeToActivityFeed();
  }

  ngAfterViewInit(): void {
    // Initialize charts after view is ready
    setTimeout(() => {
      this.initializeCharts();
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup charts
    if (this.pmtChart) {
      this.pmtChart.destroy();
    }
    if (this.revenueChart) {
      this.revenueChart.destroy();
    }
  }

  private initializeCharts(): void {
    if (this.pmtChartRef?.nativeElement) {
      this.initializePMTChart();
    }
    if (this.revenueChartRef?.nativeElement) {
      this.initializeRevenueChart();
    }
  }

  private initializePMTChart(): void {
    const ctx = this.pmtChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        datasets: [{
          label: 'PMT',
          data: [7800, 8200, 8300, 8450, 8600, 8750],
          borderColor: getDataColor('primary'),           // OpenAI data blue
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: getDataColor('primary'),  // OpenAI data blue
          pointBorderColor: DESIGN_TOKENS.color.panel.light,
          pointBorderWidth: 2,
          pointRadius: 4,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return '$' + Number(value).toLocaleString();
              },
              color: getChartColor('line', 'axis')       // OpenAI chart axis color
            },
            grid: {
              color: getChartColor('line', 'grid')       // OpenAI chart grid color
            }
          },
          x: {
            ticks: { color: getChartColor('line', 'axis') }, // OpenAI chart axis color
            grid: {
              color: getChartColor('line', 'grid')       // OpenAI chart grid color
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 6
          }
        }
      }
    };

    this.pmtChart = new Chart(ctx, config);
  }

  private initializeRevenueChart(): void {
    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [{
          label: 'Ingresos Reales',
          data: [45000, 52000, 48000, 61000, 55000, 67000],
          backgroundColor: getDataColor('primary'),     // OpenAI data blue
          borderRadius: 2
        }, {
          label: 'Proyección',
          data: [50000, 55000, 53000, 65000, 60000, 70000],
          backgroundColor: getDataColor('secondary'),   // OpenAI data green
          borderRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              color: DESIGN_TOKENS.color.text.secondary,
              font: { size: 12 }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + Number(value).toLocaleString();
              },
              color: getChartColor('bar', 'primary')     // OpenAI chart axis color
            },
            grid: {
              color: getChartColor('line', 'grid')       // OpenAI chart grid color
            }
          },
          x: {
            ticks: { color: getChartColor('bar', 'primary') }, // OpenAI chart axis color
            grid: {
              color: getChartColor('line', 'grid')       // OpenAI chart grid color
            }
          }
        }
      }
    };

    this.revenueChart = new Chart(ctx, config);
  }

  createNewOpportunity(): void {
    const smartContext = {
      market: this.selectedMarket !== 'all' ? this.selectedMarket : undefined,
      suggestedFlow: this.getSuggestedFlowFromStats(),
      timestamp: Date.now(),
      returnContext: 'dashboard-filtered'
    };

    this.router.navigate(['/nueva-oportunidad'], {
      queryParams: smartContext
    });
  }

  toggleMobileActions(): void {
    this.showMobileActions = !this.showMobileActions;
  }

  private getSuggestedFlowFromStats(): string | undefined {
    if (!this.stats) return undefined;

    const { nuevas, expediente, aprobado } = this.stats.opportunitiesInPipeline;

    if (nuevas > expediente + aprobado) {
      return 'COTIZACION';
    } else if (aprobado > nuevas) {
      return 'SIMULACION';
    }

    return undefined;
  }

  onMarketFilter(market: Market): void {
    this.selectedMarket = market;
    this.loadDashboardData();
  }

  onMarketChanged(market: Market): void {
    this.selectedMarket = market;
    this.dashboardService.updateMarket(market);
  }

  navigateToClient(clientId: string): void {
    this.router.navigate(['/clientes', clientId]);
  }

  navigateToClients(): void {
    this.router.navigate(['/clientes']);
  }

  navigateToOpportunities(): void {
    this.router.navigate(['/opportunities']);
  }

  handleKpiAction(action: KPIAction): void {
    if (!action) {
      return;
    }

    if (action.route) {
      const commands = Array.isArray(action.route) ? action.route : [action.route];
      this.router.navigate(commands, { queryParams: action.queryParams ?? undefined });
      return;
    }

    if (action.externalUrl && typeof window !== 'undefined') {
      window.open(action.externalUrl, '_blank', 'noopener');
      return;
    }

    if (action.action === 'downloadSavings') {
      this.downloadSavingsReport();
      return;
    }

    if (action.action === 'recalculateEta') {
      this.triggerEtaRecalculation();
      return;
    }
  }

  getTrendIcon(trend: KPICard['trend']): IconName {
    if (trend === 'up') {
      return 'trending-up';
    }
    if (trend === 'down') {
      return 'trending-down';
    }
    return 'minus';
  }

  getTrendSymbol(trend: KPICard['trend']): string {
    switch(trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return '→';
    }
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    const stats$ = this.dashboardService.getDashboardStats(this.selectedMarket);
    const funnel$ = this.dashboardService.getOpportunityStages(this.selectedMarket);
    const groups$ = this.dashboardService.getActionableGroups(this.selectedMarket);
    const clients$ = this.dashboardService.getAllClients?.(this.selectedMarket) ?? of([]);

    forkJoin({ stats: stats$, funnel: funnel$, groups: groups$, clients: clients$ }).subscribe({
      next: ({ stats, funnel, groups, clients }: any) => {
        this.stats = stats || null;
        if (stats) {
          this.dashboardStats = stats;
          this.updateKPIsFromStats(stats);
        }
        this.funnelData = funnel || [];
        this.actionableGroups = groups || [];
        this.allClients = clients || [];

        this.isLoading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
        this.loadMockData();
      }
    });
  }

  private subscribeToActivityFeed(): void {
    const source: any = (this.dashboardService as any).activityFeed$ || this.dashboardService.getActivityFeed?.();
    if (!source || typeof source.pipe !== 'function') {
      return;
    }
    source
      .pipe(takeUntil(this.destroy$))
      .subscribe((activities: ActivityFeedItem[]) => {
        this.activityFeed = activities;
      });
  }

  private updateKPIsFromStats(stats: DashboardStats): void {
    // Update KPI cards with real data
    const pmtValue = this.formatCurrency(stats.monthlyRevenue.collected / 30);
    this.kpiCards[0].value = pmtValue;
    this.kpiCards[2].value = this.formatCurrency(stats.monthlyRevenue.projected - stats.monthlyRevenue.collected);
    this.kpiCards[3].value = stats.activeContracts.toString();
  }

  private downloadSavingsReport(range: string = '30d'): void {
    if (typeof window === 'undefined') {
      return;
    }

    const url = `${environment.apiUrl}/dashboard/savings/export?range=${range}`;
    window.open(url, '_blank', 'noopener');
    this.toast.info('Exportando ahorro proyectado (últimos 30 días)...');
  }

  private triggerEtaRecalculation(): void {
    if (this.isEtaRecalculating) {
      this.toast.info('Ya se está recalculando el ETA...');
      return;
    }

    this.isEtaRecalculating = true;
    this.deliveriesService.validateEtaCalculations()
      .pipe(
        take(1),
        finalize(() => {
          this.isEtaRecalculating = false;
        })
      )
      .subscribe({
        next: result => {
          if (result.calculationsAccurate) {
            this.toast.success('ETA recalculado y validado correctamente.');
          } else {
            this.toast.warning(`ETA recalculado con ${result.accuracyPercentage}% de precisión.`);
          }
        },
        error: () => {
          this.toast.error('No fue posible recalcular el ETA. Inténtalo de nuevo.');
        }
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / 60000);

    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} horas`;

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} días`;
  }

  getCompletionPercentage(): number {
    if (!this.dashboardStats) return 0;
    const collected = this.dashboardStats.monthlyRevenue.collected;
    const projected = this.dashboardStats.monthlyRevenue.projected || 1;
    return Math.round((collected / projected) * 100);
  }

  getNextBestAction(): { title: string } {
    return { title: 'Siguiente acción sugerida' };
  }

  getHighPriorityClients(): any[] {
    return (this.actionableGroups?.[0]?.clients as any[]) || [];
  }

  private loadMockData(): void {
    this.stats = {
      opportunitiesInPipeline: {
        nuevas: 5,
        expediente: 3,
        aprobado: 2
      },
      pendingActions: {
        clientsWithMissingDocs: 7,
        clientsWithGoalsReached: 2
      },
      activeContracts: 28,
      monthlyRevenue: {
        collected: 1250000,
        projected: 1450000
      }
    };

    this.actionableGroups = [
      {
        title: 'Documentos Faltantes',
        description: 'Clientes que necesitan completar documentación',
        clients: [
          {
            id: '1',
            name: 'María González',
            status: 'INE faltante',
            avatarUrl: 'https://via.placeholder.com/40'
          },
          {
            id: '2',
            name: 'Carlos Méndez',
            status: 'Comprobante de ingresos',
            avatarUrl: 'https://via.placeholder.com/40'
          }
        ]
      },
      {
        title: 'Seguimiento Requerido',
        description: 'Clientes que requieren seguimiento',
        clients: [
          {
            id: '3',
            name: 'Ana López',
            status: 'Sin respuesta 5 días',
            avatarUrl: 'https://via.placeholder.com/40'
          }
        ]
      }
    ];

    this.activityFeed = [
      {
        id: '1',
        type: 'new_client',
        message: 'Juan Pérez se registró en la plataforma',
        timestamp: new Date(Date.now() - 5 * 60000),
        clientName: 'Juan Pérez',
        iconType: 'user'
      },
      {
        id: '2',
        type: 'payment_received',
        message: 'María González realizó un pago de $5,000',
        timestamp: new Date(Date.now() - 15 * 60000),
        clientName: 'María González',
        amount: 5000,
        iconType: 'currency-dollar'
      }
    ];

    this.updateKPIsFromStats(this.stats);
  }
}
