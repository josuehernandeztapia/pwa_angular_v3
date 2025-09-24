import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { ActionableClient, ActionableGroup, ActivityFeedItem, DashboardStats, Market, OpportunityStage } from '../../../models/types';
import { DashboardService } from '../../../services/dashboard.service';
import { ConnectionIndicatorComponent } from '../../shared/connection-indicator/connection-indicator.component';

// Register Chart.js components
Chart.register(...registerables);

interface KPICard {
  title: string;
  value: string;
  subValue?: string;
  icon: string;
  dataCy: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ConnectionIndicatorComponent
  ],
  template: `
    <!-- Dashboard Container -->
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950">

      <!-- Connection Indicator -->
      <app-connection-indicator></app-connection-indicator>

      <!-- Header -->
      <header class="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1 truncate">
              Dashboard
            </h1>
            <p class="text-sm text-slate-600 dark:text-slate-400 truncate">
              Vista general de tu negocio, {{ userName }}
            </p>
          </div>

          <!-- Desktop Actions -->
          <div class="hidden sm:flex items-center space-x-3 ml-4">
            <button class="ui-btn ui-btn-secondary ui-btn-sm">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Exportar
            </button>
            <button class="ui-btn ui-btn-primary ui-btn-sm" (click)="createNewOpportunity()">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Nueva Oportunidad
            </button>
          </div>

          <!-- Mobile Menu Button -->
          <div class="sm:hidden ml-4">
            <button
              class="ui-btn ui-btn-secondary ui-btn-sm p-2"
              (click)="toggleMobileActions()"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Actions Dropdown -->
        <div
          *ngIf="showMobileActions"
          class="sm:hidden mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3"
        >
          <button class="ui-btn ui-btn-secondary w-full justify-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Exportar
          </button>
          <button class="ui-btn ui-btn-primary w-full justify-center" (click)="createNewOpportunity()">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Nueva Oportunidad
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">

        <!-- KPIs Grid -->
        <section>
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Métricas Principales
          </h2>
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div *ngFor="let kpi of kpiCards" class="ui-card">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">
                    {{ kpi.title }}
                  </div>
                  <div class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100" [attr.data-cy]="kpi.dataCy">
                    {{ kpi.value }}
                  </div>
                  <div *ngIf="kpi.subValue" class="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {{ kpi.subValue }}
                  </div>
                </div>
                <div class="text-sky-600 dark:text-sky-400 text-2xl flex-shrink-0 ml-3">
                  {{ kpi.icon }}
                </div>
              </div>
              <div *ngIf="kpi.trend" class="flex items-center mt-3 text-xs">
                <span
                  class="flex items-center flex-shrink-0"
                  [class.text-green-600]="kpi.trend === 'up'"
                  [class.text-red-600]="kpi.trend === 'down'"
                  [class.text-slate-500]="kpi.trend === 'stable'">
                  <span *ngIf="kpi.trend === 'up'" class="mr-1">↗</span>
                  <span *ngIf="kpi.trend === 'down'" class="mr-1">↘</span>
                  <span *ngIf="kpi.trend === 'stable'" class="mr-1">→</span>
                  {{ kpi.trendValue }}
                </span>
                <span class="ml-2 text-slate-500 truncate">vs semana anterior</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Charts Section -->
        <section class="grid gap-6 lg:grid-cols-2">

          <!-- PMT Evolution Chart -->
          <div class="ui-card">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Evolución PMT (Últimos 6 meses)
            </h3>
            <div class="h-64">
              <canvas #pmtChart data-cy="chart-pmt"></canvas>
            </div>
          </div>

          <!-- Revenue Projection Chart -->
          <div class="ui-card">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Proyección de Ingresos
            </h3>
            <div class="h-64">
              <canvas #revenueChart data-cy="chart-revenue"></canvas>
            </div>
          </div>
        </section>

        <!-- Action Items -->
        <section *ngIf="actionableGroups.length > 0">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Acciones Requeridas
          </h2>
          <div class="grid gap-4 md:grid-cols-2">
            <div *ngFor="let group of actionableGroups" class="ui-card">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="font-medium text-slate-900 dark:text-slate-100">{{ group.title }}</h3>
                  <p class="text-sm text-slate-500 dark:text-slate-400">{{ group.description }}</p>
                </div>
                <span class="ui-btn ui-btn-ghost ui-btn-sm">
                  {{ group.clients.length }}
                </span>
              </div>
              <div class="space-y-2">
                <div *ngFor="let client of group.clients.slice(0, 3)" class="flex items-center justify-between text-sm">
                  <span class="text-slate-900 dark:text-slate-100">{{ client.name }}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">{{ client.status }}</span>
                </div>
                <button *ngIf="group.clients.length > 3" class="text-xs text-sky-600 hover:text-sky-500" (click)="navigateToClients()">
                  Ver {{ group.clients.length - 3 }} más...
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Recent Activity -->
        <section *ngIf="activityFeed.length > 0">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Actividad Reciente
          </h2>
          <div class="ui-card space-y-4">
            <div *ngFor="let activity of activityFeed.slice(0, 5)" class="flex items-start space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div class="flex-shrink-0 w-8 h-8 bg-sky-100 dark:bg-sky-900 rounded-full flex items-center justify-center text-xs">
                📊
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-slate-900 dark:text-slate-100">{{ activity.message }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatTimeAgo(activity.timestamp) }}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    /* Minimal custom styles - mainly relying on Tailwind + UI helpers */
    .chart-container {
      position: relative;
      height: 250px;
    }
  `]
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
      icon: '💰',
      dataCy: 'kpi-pmt',
      trend: 'up',
      trendValue: '+5.2%'
    },
    {
      title: 'TIR',
      value: '27.1%',
      subValue: 'Tasa Interna de Retorno',
      icon: '📈',
      dataCy: 'kpi-tir',
      trend: 'up',
      trendValue: '+2.1%'
    },
    {
      title: 'Ahorro Proyectado',
      value: '$32,500',
      subValue: 'Próximos 12 meses',
      icon: '🎯',
      dataCy: 'kpi-ahorro',
      trend: 'up',
      trendValue: '+12.8%'
    },
    {
      title: 'Unidades Entregadas',
      value: '12',
      subValue: 'Este mes',
      icon: '🚚',
      dataCy: 'kpi-entregas',
      trend: 'stable',
      trendValue: '0%'
    }
  ];

  constructor(
    private router: Router,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
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
          borderColor: '#0EA5E9',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointBackgroundColor: '#0EA5E9',
          pointBorderColor: '#ffffff',
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
              color: '#6B7280'
            },
            grid: {
              color: '#E5E7EB'
            }
          },
          x: {
            ticks: { color: '#6B7280' },
            grid: {
              color: '#E5E7EB'
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
          backgroundColor: '#0EA5E9',
          borderRadius: 4
        }, {
          label: 'Proyección',
          data: [50000, 55000, 53000, 65000, 60000, 70000],
          backgroundColor: '#94A3B8',
          borderRadius: 4
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
              color: '#6B7280',
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
              color: '#6B7280'
            },
            grid: {
              color: '#E5E7EB'
            }
          },
          x: {
            ticks: { color: '#6B7280' },
            grid: {
              color: '#E5E7EB'
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
        icon: '👤'
      },
      {
        id: '2',
        type: 'payment_received',
        message: 'María González realizó un pago de $5,000',
        timestamp: new Date(Date.now() - 15 * 60000),
        clientName: 'María González',
        amount: 5000,
        icon: '💰'
      }
    ];

    this.updateKPIsFromStats(this.stats);
  }
}
