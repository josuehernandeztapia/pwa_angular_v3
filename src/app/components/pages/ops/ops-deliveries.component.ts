import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../shared/icon/icon.component';
import { finalize } from 'rxjs';

import { DeliveriesService } from '../../../services/deliveries.service';
import { StockService } from '../../../services/stock.service';
import { ToastService } from '../../../services/toast.service';
import { 
  DeliveryOrder,
  DeliveryStatus,
  Market,
  DELIVERY_STATUS_DESCRIPTIONS,
  StockPosition,
  StockAlert
} from '../../../models/deliveries';

@Component({
  selector: 'app-ops-deliveries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  templateUrl: './ops-deliveries.component.html',
  styleUrls: ['./ops-deliveries.component.scss']
})
export class OpsDeliveriesComponent implements OnInit {
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
    const markets: Market[] = ['AGS', 'EdoMex'];
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

  constructor() {
    // React to market changes to load routes
    effect(() => {
      if (this.selectedMarket() === 'EdoMex') {
        this.loadRoutes();
      } else {
        this.selectedRoute.set('');
        this.availableRoutes.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.loadData();
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
    const markets: Market[] = ['AGS', 'EdoMex'];
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
    return market === 'AGS' ? 'Aguascalientes' : 'Estado de México';
  }

  getSelectedRouteName(): string {
    const route = this.availableRoutes().find(r => r.id === this.selectedRoute());
    return route ? route.name : '';
  }

  getStatusTitle(status: DeliveryStatus): string {
    return DELIVERY_STATUS_DESCRIPTIONS[status]?.title || status;
  }

  getStatusColor(status: DeliveryStatus): string {
    return this.deliveriesService.getStatusColor(status);
  }

  getStatusIcon(status: DeliveryStatus): string {
    return this.deliveriesService.getStatusIcon(status);
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
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
