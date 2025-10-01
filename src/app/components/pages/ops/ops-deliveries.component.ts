import { Component, OnDestroy, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../shared/icon/icon-definitions';
import { ContextPanelComponent } from '../../shared/context-panel/context-panel.component';
import { finalize } from 'rxjs';

import { DeliveriesService } from '../../../services/deliveries.service';
import { StockService } from '../../../services/stock.service';
import { ToastService } from '../../../services/toast.service';
import { FlowContextService } from '../../../services/flow-context.service';
import { 
  DeliveryOrder,
  DeliveryStatus,
  Market,
  DELIVERY_STATUS_DESCRIPTIONS,
  StockPosition,
  StockAlert
} from '../../../models/deliveries';

interface DeliveriesContextSnapshot {
  selectedMarket: Market | '';
  selectedRoute: string;
  clientSearch: string;
  selectedStatus: DeliveryStatus | '';
  currentPage: number;
  pageSize: number;
  timestamp: number;
}

@Component({
  selector: 'app-ops-deliveries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent, ContextPanelComponent],
  templateUrl: './ops-deliveries.component.html',
  styleUrls: ['./ops-deliveries.component.scss']
})
export class OpsDeliveriesComponent implements OnInit, OnDestroy {
  // Injected services
  private deliveriesService = inject(DeliveriesService);
  private stockService = inject(StockService);
  private toastService = inject(ToastService);

  // Hierarchical filters (signals)
  selectedMarket = signal<Market | ''>('');
  selectedRoute = signal<string>('');
  clientSearch = signal<string>('');
  selectedStatus = signal<DeliveryStatus | ''>('');

  // Data signals
  deliveries = signal<DeliveryOrder[]>([]);
  stockPositions = signal<StockPosition[]>([]);
  stockAlerts = signal<StockAlert[]>([]);
  availableRoutes = signal<Array<{ id: string; name: string; market: Market }>>([]);

  performanceMetrics = signal<{ totalDeliveries: number; onTimePercentage: number; avgTransitDays: number; delayedDeliveries: number } | null>(null);
  metricsLoading = signal<boolean>(false);

  showEtaHistoryModal = signal<boolean>(false);
  etaHistory = signal<any[]>([]);
  etaHistoryLoading = signal<boolean>(false);
  etaHistoryError = signal<string | null>(null);
  etaHistoryDelivery = signal<DeliveryOrder | null>(null);

  showAdjustEtaModal = signal<boolean>(false);
  adjustEtaDate = signal<string>('');
  adjustEtaReason = signal<string>('');
  adjustEtaSaving = signal<boolean>(false);
  adjustEtaError = signal<string | null>(null);
  adjustEtaDelivery = signal<DeliveryOrder | null>(null);

  private readonly flowContext = inject(FlowContextService, { optional: true });
  private readonly FLOW_CONTEXT_KEY = 'entregas';
  private restoringContext = false;

  // UI state
  loading = signal<boolean>(false);
  stockLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  pageSize = signal<number>(20);
  
  // Modal state
  showAdvanceStateModal = signal<boolean>(false);
  selectedDelivery = signal<DeliveryOrder | null>(null);

  // Computed properties
  filteredDeliveries = computed(() => {
    let filtered = this.deliveries();

    // Market filter
    if (this.selectedMarket()) {
      filtered = filtered.filter(d => d.market === this.selectedMarket());
    }

    // Route filter (only for EdoMex)
    if (this.selectedRoute()) {
      filtered = filtered.filter(d => d.route?.id === this.selectedRoute());
    }

    // Client search
    if (this.clientSearch()) {
      const search = this.clientSearch().toLowerCase();
      filtered = filtered.filter(d => 
        d.client.name.toLowerCase().includes(search) ||
        d.client.id.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (this.selectedStatus()) {
      filtered = filtered.filter(d => d.status === this.selectedStatus());
    }

    return filtered;
  });

  paginatedDeliveries = computed(() => {
    const filtered = this.filteredDeliveries();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  totalDeliveries = computed(() => this.filteredDeliveries().length);
  totalPages = computed(() => Math.ceil(this.totalDeliveries() / this.pageSize()));

  currentView = computed(() => {
    if (this.selectedMarket() && !this.selectedRoute() && !this.clientSearch()) {
      return 'market';
    }
    if (this.selectedRoute()) {
      return 'route';
    }
    if (this.clientSearch()) {
      return 'client';
    }
    return 'general';
  });

  marketSummary = computed(() => {
    const markets: Market[] = ['aguascalientes', 'edomex'];
    return markets.map(market => {
      const marketDeliveries = this.deliveries().filter(d => d.market === market);
      return {
        market,
        total: marketDeliveries.length,
        inTransit: marketDeliveries.filter(d => 
          ['ON_VESSEL', 'AT_DEST_PORT', 'IN_CUSTOMS', 'RELEASED'].includes(d.status)
        ).length,
        readyForDelivery: marketDeliveries.filter(d => d.status === 'READY_FOR_HANDOVER').length,
        delivered: marketDeliveries.filter(d => d.status === 'DELIVERED').length
      };
    });
  });

  groupedByClient = computed(() => {
    const grouped = new Map<string, { name: string; market: string; deliveries: DeliveryOrder[] }>();
    
    this.filteredDeliveries().forEach(delivery => {
      const clientId = delivery.client.id;
      if (!grouped.has(clientId)) {
        grouped.set(clientId, {
          name: delivery.client.name,
          market: delivery.client.market,
          deliveries: []
        });
      }
      grouped.get(clientId)!.deliveries.push(delivery);
    });

    return Array.from(grouped.values());
  });

  availableActions = computed(() => {
    const delivery = this.selectedDelivery();
    if (!delivery) return [];
    
    return this.deliveriesService.getAvailableActions(delivery, 'ops');
  });

  // Static data
  deliveryStatuses: DeliveryStatus[] = [
    'PO_ISSUED', 'IN_PRODUCTION', 'READY_AT_FACTORY',
    'AT_ORIGIN_PORT', 'ON_VESSEL', 'AT_DEST_PORT',
    'IN_CUSTOMS', 'RELEASED', 'AT_WH',
    'READY_FOR_HANDOVER', 'DELIVERED'
  ];

  private readonly defaultStatusIcon: IconName = 'package';

  constructor() {
    // React to market changes to load routes
    effect(() => {
      if (this.selectedMarket() === 'edomex') {
        this.loadRoutes();
      } else {
        this.selectedRoute.set('');
        this.availableRoutes.set([]);
      }
    });

    effect(() => {
      if (!this.flowContext || this.restoringContext) {
        return;
      }
      this.persistContext({
        selectedMarket: this.selectedMarket(),
        selectedRoute: this.selectedRoute(),
        clientSearch: this.clientSearch(),
        selectedStatus: this.selectedStatus(),
        currentPage: this.currentPage(),
        pageSize: this.pageSize()
      });
    });
  }

  ngOnInit(): void {
    this.flowContext?.setBreadcrumbs(['Dashboard', 'Entregas']);
    this.restoreFromContext();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.persistContext();
  }

  private persistContext(partial?: Partial<DeliveriesContextSnapshot>): void {
    if (!this.flowContext) {
      return;
    }

    const snapshot: DeliveriesContextSnapshot = {
      selectedMarket: partial?.selectedMarket ?? this.selectedMarket(),
      selectedRoute: partial?.selectedRoute ?? this.selectedRoute(),
      clientSearch: partial?.clientSearch ?? this.clientSearch(),
      selectedStatus: partial?.selectedStatus ?? this.selectedStatus(),
      currentPage: partial?.currentPage ?? this.currentPage(),
      pageSize: partial?.pageSize ?? this.pageSize(),
      timestamp: Date.now()
    };

    this.flowContext.saveContext(this.FLOW_CONTEXT_KEY, snapshot, { breadcrumbs: ['Dashboard', 'Entregas'] });
  }

  private restoreFromContext(): void {
    if (!this.flowContext) {
      return;
    }

    const stored = this.flowContext.getContextData<DeliveriesContextSnapshot>(this.FLOW_CONTEXT_KEY);
    if (!stored) {
      return;
    }

    this.restoringContext = true;
    if (stored.selectedMarket !== undefined) {
      this.selectedMarket.set(stored.selectedMarket ?? '');
    }
    if (stored.selectedRoute !== undefined) {
      this.selectedRoute.set(stored.selectedRoute ?? '');
    }
    if (stored.clientSearch !== undefined) {
      this.clientSearch.set(stored.clientSearch ?? '');
    }
    if (stored.selectedStatus !== undefined) {
      this.selectedStatus.set(stored.selectedStatus ?? '');
    }
    if (stored.currentPage !== undefined) {
      this.currentPage.set(stored.currentPage || 1);
    }
    if (stored.pageSize !== undefined) {
      this.pageSize.set(stored.pageSize || 20);
    }
    this.restoringContext = false;
  }

  // Data loading methods
  loadData(): void {
    this.loading.set(true);
    
    const request = {
      market: this.selectedMarket() || undefined,
      routeId: this.selectedRoute() || undefined,
      clientId: this.clientSearch() || undefined,
      status: this.selectedStatus() ? [this.selectedStatus() as DeliveryStatus] : undefined,
      limit: 100 // Load more for ops view
    };

    this.deliveriesService.list(request)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.deliveries.set(response.items);
          this.loadPerformanceMetrics();
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Error cargando entregas');
        }
      });

    // Load stock data
    this.loadStockData();
  }

  loadStockData(): void {
    this.stockLoading.set(true);
    
    // Load stock positions for both markets
    const markets: Market[] = ['aguascalientes', 'edomex'];
    const stockPromises = markets.map(market => 
      this.stockService.getAllPositions(market).toPromise()
    );

    Promise.all(stockPromises)
      .then(results => {
        const allPositions = results.flat().filter(Boolean) as StockPosition[];
        this.stockPositions.set(allPositions);
      })
      .catch(error => {
      });

    // Load stock alerts
    this.stockService.getAlerts()
      .pipe(finalize(() => this.stockLoading.set(false)))
      .subscribe({
        next: (alerts) => {
          this.stockAlerts.set(alerts);
        },
        error: (error) => {
        }
      });
  }

  private loadPerformanceMetrics(): void {
    this.metricsLoading.set(true);
    const market = this.selectedMarket() || undefined;
    this.deliveriesService.getPerformanceMetrics(market as Market | undefined)
      .pipe(finalize(() => this.metricsLoading.set(false)))
      .subscribe({
        next: metrics => {
          this.performanceMetrics.set(metrics);
        },
        error: (error) => {
          this.performanceMetrics.set(null);
          this.toastService.warning(error.userMessage || 'No fue posible obtener los indicadores de entrega.');
        }
      });
  }

  loadRoutes(): void {
    if (this.selectedMarket()) {
      this.deliveriesService.getRoutes(this.selectedMarket() as Market)
        .subscribe({
          next: (routes) => {
            this.availableRoutes.set(routes);
          },
          error: (error) => {
          }
        });
    }
  }

  // Filter event handlers
  onMarketChange(): void {
    this.selectedRoute.set('');
    this.currentPage.set(1);
    this.loadData();
  }

  onRouteChange(): void {
    this.currentPage.set(1);
    this.loadData();
  }

  onClientSearch(): void {
    this.currentPage.set(1);
    // Debounce would be better here
    setTimeout(() => this.loadData(), 300);
  }

  onStatusChange(): void {
    this.currentPage.set(1);
    this.loadData();
  }

  clearFilters(): void {
    this.selectedMarket.set('');
    this.selectedRoute.set('');
    this.clientSearch.set('');
    this.selectedStatus.set('');
    this.currentPage.set(1);
    this.loadData();
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedMarket() || this.selectedRoute() || this.clientSearch() || this.selectedStatus());
  }

  // Actions
  refreshData(): void {
    this.loadData();
  }

  recomputeStock(): void {
    this.stockService.recomputeForecast()
      .subscribe({
        next: (result) => {
          this.toastService.success(result.message);
          this.loadStockData();
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Error recalculando stock');
        }
      });
  }

  // Modal actions
  showAdvanceModal(delivery: DeliveryOrder): void {
    this.selectedDelivery.set(delivery);
    this.showAdvanceStateModal.set(true);
  }

  hideAdvanceModal(): void {
    this.showAdvanceStateModal.set(false);
    this.selectedDelivery.set(null);
  }

  openEtaHistory(delivery: DeliveryOrder): void {
    this.etaHistoryDelivery.set(delivery);
    this.showEtaHistoryModal.set(true);
    this.etaHistoryLoading.set(true);
    this.etaHistoryError.set(null);
    this.deliveriesService.getEtaHistory(delivery.id)
      .pipe(finalize(() => this.etaHistoryLoading.set(false)))
      .subscribe({
        next: history => {
          this.etaHistory.set(history);
        },
        error: (error) => {
          this.etaHistory.set([]);
          this.etaHistoryError.set(error.userMessage || 'No fue posible recuperar el historial de ETA.');
        }
      });
  }

  closeEtaHistory(): void {
    this.showEtaHistoryModal.set(false);
    this.etaHistory.set([]);
    this.etaHistoryDelivery.set(null);
    this.etaHistoryError.set(null);
  }

  openAdjustEta(delivery: DeliveryOrder): void {
    this.adjustEtaDelivery.set(delivery);
    this.adjustEtaDate.set(this.formatDateForInput(delivery.eta));
    this.adjustEtaReason.set('');
    this.adjustEtaError.set(null);
    this.showAdjustEtaModal.set(true);
  }

  closeAdjustEtaModal(): void {
    this.showAdjustEtaModal.set(false);
    this.adjustEtaDelivery.set(null);
    this.adjustEtaDate.set('');
    this.adjustEtaReason.set('');
    this.adjustEtaError.set(null);
    this.adjustEtaSaving.set(false);
  }

  submitEtaAdjustment(): void {
    const delivery = this.adjustEtaDelivery();
    if (!delivery) {
      return;
    }

    const dateValue = this.adjustEtaDate().trim();
    if (!dateValue) {
      this.adjustEtaError.set('Selecciona una fecha estimada.');
      return;
    }

    const reasonValue = this.adjustEtaReason().trim();
    if (!reasonValue) {
      this.adjustEtaError.set('Describe el motivo del ajuste.');
      return;
    }

    const isoDate = this.formatIsoForSubmission(dateValue);

    this.adjustEtaSaving.set(true);
    this.deliveriesService.adjustEta(delivery.id, isoDate, reasonValue, 'ops_dev')
      .pipe(finalize(() => this.adjustEtaSaving.set(false)))
      .subscribe({
        next: response => {
          if (response.success) {
            this.toastService.success(response.message || 'ETA actualizada correctamente.');
            this.closeAdjustEtaModal();
            this.loadData();
          } else {
            this.adjustEtaError.set(response.message || 'No se pudo actualizar la ETA.');
          }
        },
        error: (error) => {
          this.adjustEtaError.set(error.userMessage || 'Error ajustando la ETA.');
        }
      });
  }

  executeTransition(event: any): void {
    const delivery = this.selectedDelivery();
    if (!delivery) return;

    this.deliveriesService.transition(delivery.id, { event })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success(response.message);
            this.hideAdvanceModal();
            this.loadData(); // Refresh data
          } else {
            this.toastService.error(response.message);
          }
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Error avanzando estado');
        }
      });
  }

  // Pagination
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  // Utility methods
  getMarketName(market: Market): string {
    return market === 'aguascalientes' ? 'Aguascalientes' : 'Estado de México';
  }

  getSelectedRouteName(): string {
    const route = this.availableRoutes().find(r => r.id === this.selectedRoute());
    return route ? route.name : '';
  }

  getStatusTitle(status: DeliveryStatus): string {
    return DELIVERY_STATUS_DESCRIPTIONS[status]?.title || status;
  }

  getStatusColor(delivery: DeliveryOrder): string {
    if (delivery.status !== 'DELIVERED' && this.isOverdue(delivery.eta)) {
      return 'var(--accent-danger)';
    }
    return this.deliveriesService.getStatusColor(delivery.status);
  }

  getStatusIcon(status: DeliveryStatus): IconName {
    const icon = this.deliveriesService.getStatusIcon(status);
    return icon ?? this.defaultStatusIcon;
  }

  getProgress(status: DeliveryStatus): number {
    return this.deliveriesService.getDeliveryProgress(status);
  }

  formatETA(eta?: string): string {
    if (!eta) return 'Por definir';
    const date = new Date(eta);
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short'
    }).format(new Date(date));
  }

  formatEtaHistoryDate(date: string): string {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return date;
    }
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(parsed);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  private formatDateForInput(eta?: string): string {
    if (!eta) {
      return '';
    }
    const date = new Date(eta);
    return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private formatIsoForSubmission(date: string): string {
    const parsed = new Date(`${date}T00:00:00Z`);
    return parsed.toISOString();
  }

  isOverdue(eta?: string): boolean {
    if (!eta) return false;
    return new Date(eta) < new Date();
  }

  canAdvanceStatus(delivery: DeliveryOrder): boolean {
    const actions = this.deliveriesService.getAvailableActions(delivery, 'ops');
    return actions.length > 0;
  }

  getMarketAlerts(market: Market): StockAlert[] {
    return this.stockAlerts().filter(alert => alert.market === market && !alert.resolved);
  }
}
