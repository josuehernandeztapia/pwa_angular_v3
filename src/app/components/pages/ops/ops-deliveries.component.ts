import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="ops-deliveries-container">
      <!-- Header -->
      <div class="ops-header">
        <div class="header-content">
          <h1 class="page-title">🚚 Centro de Operaciones - Entregas</h1>
          <p class="page-subtitle">Gestión completa del ciclo de entregas (77 días)</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" (click)="refreshData()" [disabled]="loading()">
            {{ loading() ? '⏳' : '🔄' }} Actualizar
          </button>
          <button class="btn-recompute" (click)="recomputeStock()" [disabled]="stockLoading()">
            📊 Recalcular Stock
          </button>
        </div>
      </div>

      <!-- Filtros Jerárquicos: Mercado > Ruta > Cliente > Pedido -->
      <div class="hierarchical-filters">
        <div class="filter-level">
          <label class="filter-label">📍 Mercado</label>
          <select [(ngModel)]="selectedMarket" (change)="onMarketChange()" class="filter-select">
            <option value="">Todos los mercados</option>
            <option value="AGS">Aguascalientes (CON asientos)</option>
            <option value="EdoMex">Estado de México (SIN asientos)</option>
          </select>
        </div>

        <div class="filter-level" *ngIf="selectedMarket() === 'EdoMex'">
          <label class="filter-label">🛣️ Ruta</label>
          <select [(ngModel)]="selectedRoute" (change)="onRouteChange()" class="filter-select">
            <option value="">Todas las rutas</option>
            <option *ngFor="let route of availableRoutes()" [value]="route.id">
              {{ route.name }}
            </option>
          </select>
        </div>

        <div class="filter-level">
          <label class="filter-label">👤 Cliente</label>
          <input 
            type="text" 
            [(ngModel)]="clientSearch" 
            (input)="onClientSearch()"
            placeholder="Buscar por nombre de cliente..."
            class="filter-input">
        </div>

        <div class="filter-level">
          <label class="filter-label">📦 Estado</label>
          <select [(ngModel)]="selectedStatus" (change)="onStatusChange()" class="filter-select">
            <option value="">Todos los estados</option>
            <option *ngFor="let status of deliveryStatuses" [value]="status">
              {{ getStatusTitle(status) }}
            </option>
          </select>
        </div>

        <div class="filter-summary">
          <span class="results-count">
            {{ filteredDeliveries().length }} pedido{{ filteredDeliveries().length !== 1 ? 's' : '' }} encontrado{{ filteredDeliveries().length !== 1 ? 's' : '' }}
          </span>
          <button *ngIf="hasActiveFilters()" class="btn-clear-filters" (click)="clearFilters()">
            🗑️ Limpiar filtros
          </button>
        </div>
      </div>

      <!-- Vista por Mercado (Stock + Resumen) -->
      <div *ngIf="currentView() === 'market'" class="market-view">
        <div class="stock-cards">
          <div class="stock-card" *ngFor="let position of stockPositions()">
            <div class="stock-header">
              <h3>{{ getMarketName(position.market) }}</h3>
              <span class="sku-badge">{{ position.sku }}</span>
            </div>
            <div class="stock-metrics">
              <div class="metric">
                <span class="metric-label">En stock</span>
                <span class="metric-value" [class.low-stock]="position.onHand < position.reorderPoint">
                  {{ position.onHand }}
                </span>
              </div>
              <div class="metric">
                <span class="metric-label">En tránsito</span>
                <span class="metric-value">{{ position.onOrder }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Proyección</span>
                <span class="metric-value">{{ position.forecast }}</span>
              </div>
            </div>
            <div class="stock-alerts" *ngIf="getMarketAlerts(position.market).length > 0">
              <div *ngFor="let alert of getMarketAlerts(position.market)" class="alert-item" [class]="'alert-' + alert.severity">
                {{ alert.message }}
              </div>
            </div>
          </div>
        </div>

        <div class="market-summary">
          <h3>📊 Resumen de Entregas por Mercado</h3>
          <div class="summary-grid">
            <div class="summary-card" *ngFor="let summary of marketSummary()">
              <h4>{{ getMarketName(summary.market) }}</h4>
              <div class="summary-stats">
                <div class="stat">
                  <span class="stat-value">{{ summary.total }}</span>
                  <span class="stat-label">Total pedidos</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ summary.inTransit }}</span>
                  <span class="stat-label">En tránsito</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ summary.readyForDelivery }}</span>
                  <span class="stat-label">Listas para entrega</span>
                </div>
                <div class="stat">
                  <span class="stat-value">{{ summary.delivered }}</span>
                  <span class="stat-label">Entregadas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista por Ruta (Solo EdoMex) -->
      <div *ngIf="currentView() === 'route'" class="route-view">
        <h3>🛣️ Entregas por Ruta - {{ getSelectedRouteName() }}</h3>
        <div class="route-deliveries">
          <div class="delivery-table">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Pedido</th>
                  <th>Estado</th>
                  <th>ETA</th>
                  <th>Progreso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let delivery of filteredDeliveries()" class="delivery-row">
                  <td>
                    <div class="client-info">
                      <span class="client-name">{{ delivery.client.name }}</span>
                      <span class="client-id">{{ delivery.client.id }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="order-id">{{ delivery.id }}</span>
                  </td>
                  <td>
                    <span class="status-badge" [style.background-color]="getStatusColor(delivery.status)">
                      {{ getStatusIcon(delivery.status) }} {{ getStatusTitle(delivery.status) }}
                    </span>
                  </td>
                  <td>
                    <span class="eta-date" [class.overdue]="isOverdue(delivery.eta)">
                      {{ formatETA(delivery.eta) }}
                    </span>
                  </td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="getProgress(delivery.status)"></div>
                      <span class="progress-text">{{ getProgress(delivery.status) }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button 
                        class="btn-action btn-view"
                        [routerLink]="['/ops/deliveries', delivery.id]"
                        title="Ver detalles">
                        👁️
                      </button>
                      <button 
                        *ngIf="canAdvanceStatus(delivery)"
                        class="btn-action btn-advance"
                        (click)="showAdvanceModal(delivery)"
                        title="Avanzar estado">
                        ⏭️
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Vista por Cliente -->
      <div *ngIf="currentView() === 'client'" class="client-view">
        <h3>👤 Vista por Cliente</h3>
        <div class="client-deliveries">
          <div *ngFor="let client of groupedByClient()" class="client-group">
            <div class="client-header">
              <h4>{{ client.name }}</h4>
              <span class="client-meta">{{ client.market }} - {{ client.deliveries.length }} pedido(s)</span>
            </div>
            <div class="client-delivery-list">
              <div *ngFor="let delivery of client.deliveries" class="delivery-item">
                <div class="delivery-summary">
                  <span class="order-id">{{ delivery.id }}</span>
                  <span class="status-badge" [style.background-color]="getStatusColor(delivery.status)">
                    {{ getStatusIcon(delivery.status) }} {{ getStatusTitle(delivery.status) }}
                  </span>
                  <span class="eta">{{ formatETA(delivery.eta) }}</span>
                  <button class="btn-view" [routerLink]="['/ops/deliveries', delivery.id]">Ver</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista General (Default) -->
      <div *ngIf="currentView() === 'general'" class="general-view">
        <div class="delivery-grid">
          <div *ngFor="let delivery of paginatedDeliveries()" class="delivery-card">
            <div class="card-header">
              <div class="client-info">
                <h4>{{ delivery.client.name }}</h4>
                <span class="market-badge">{{ delivery.market }}</span>
                <span *ngIf="delivery.route" class="route-badge">{{ delivery.route.name }}</span>
              </div>
              <div class="order-meta">
                <span class="order-id">{{ delivery.id }}</span>
                <span class="created-date">{{ formatDate(delivery.createdAt) }}</span>
              </div>
            </div>
            
            <div class="card-body">
              <div class="status-section">
                <span class="status-badge" [style.background-color]="getStatusColor(delivery.status)">
                  {{ getStatusIcon(delivery.status) }} {{ getStatusTitle(delivery.status) }}
                </span>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getProgress(delivery.status)"></div>
                </div>
                <span class="progress-text">{{ getProgress(delivery.status) }}% completado</span>
              </div>
              
              <div class="eta-section">
                <span class="eta-label">ETA:</span>
                <span class="eta-value" [class.overdue]="isOverdue(delivery.eta)">
                  {{ formatETA(delivery.eta) }}
                </span>
              </div>
              
              <div class="contract-section">
                <span class="contract-label">Contrato:</span>
                <span class="contract-value">{{ delivery.contract.id }}</span>
                <span *ngIf="delivery.contract.amount" class="contract-amount">
                  {{ formatCurrency(delivery.contract.amount) }}
                </span>
              </div>
            </div>
            
            <div class="card-actions">
              <button 
                class="btn-view"
                [routerLink]="['/ops/deliveries', delivery.id]">
                Ver Detalles
              </button>
              <button 
                *ngIf="canAdvanceStatus(delivery)"
                class="btn-advance"
                (click)="showAdvanceModal(delivery)">
                Avanzar Estado
              </button>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <div *ngIf="totalDeliveries() > pageSize()" class="pagination">
          <button 
            class="btn-page"
            [disabled]="currentPage() === 1"
            (click)="previousPage()">
            ← Anterior
          </button>
          <span class="page-info">
            Página {{ currentPage() }} de {{ totalPages() }}
          </span>
          <button 
            class="btn-page"
            [disabled]="currentPage() === totalPages()"
            (click)="nextPage()">
            Siguiente →
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Cargando entregas...</p>
      </div>

      <!-- Modal para Avanzar Estado -->
      <div *ngIf="showAdvanceStateModal()" class="modal-overlay" (click)="hideAdvanceModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Avanzar Estado de Entrega</h3>
          <div *ngIf="selectedDelivery()">
            <p><strong>Pedido:</strong> {{ selectedDelivery()!.id }}</p>
            <p><strong>Cliente:</strong> {{ selectedDelivery()!.client.name }}</p>
            <p><strong>Estado actual:</strong> {{ getStatusTitle(selectedDelivery()!.status) }}</p>
            
            <div class="available-actions">
              <div *ngFor="let action of availableActions()" class="action-option">
                <button 
                  class="btn-action-option"
                  (click)="executeTransition(action.event)">
                  {{ action.label }}
                </button>
                <span class="action-description">{{ action.description }}</span>
              </div>
            </div>
            
            <div class="modal-actions">
              <button class="btn-cancel" (click)="hideAdvanceModal()">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ops-deliveries-container {
      padding: 24px;
      background: #0f1419;
      color: white;
      min-height: 100vh;
    }

    .ops-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      background: #1a1f2e;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #2d3748;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #06d6a0;
    }

    .page-subtitle {
      margin: 0;
      color: #a0aec0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn-refresh, .btn-recompute {
      padding: 12px 20px;
      background: #2d3748;
      color: white;
      border: 2px solid #4a5568;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-refresh:hover, .btn-recompute:hover {
      background: #4a5568;
      border-color: #06d6a0;
    }

    .hierarchical-filters {
      background: #1a1f2e;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      border: 1px solid #2d3748;
    }

    .filter-level {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .filter-label {
      font-weight: 600;
      color: #e2e8f0;
      min-width: 100px;
    }

    .filter-select, .filter-input {
      padding: 8px 12px;
      background: #2d3748;
      border: 1px solid #4a5568;
      border-radius: 6px;
      color: white;
      min-width: 200px;
    }

    .filter-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid #2d3748;
    }

    .results-count {
      color: #06d6a0;
      font-weight: 600;
    }

    .btn-clear-filters {
      padding: 6px 12px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .stock-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .stock-card {
      background: #1a1f2e;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #2d3748;
    }

    .stock-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .sku-badge {
      padding: 4px 8px;
      background: #06d6a0;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .stock-metrics {
      display: flex;
      gap: 20px;
      margin-bottom: 16px;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      font-size: 12px;
      color: #a0aec0;
    }

    .metric-value {
      font-size: 18px;
      font-weight: 600;
      color: #e2e8f0;
    }

    .metric-value.low-stock {
      color: #f59e0b;
    }

    .alert-item {
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .alert-high {
      background: #7c2d12;
      color: #fbbf24;
    }

    .alert-medium {
      background: #713f12;
      color: #f59e0b;
    }

    .delivery-table {
      background: #1a1f2e;
      border-radius: 12px;
      overflow: hidden;
    }

    .delivery-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .delivery-table th {
      background: #2d3748;
      color: #a0aec0;
      font-weight: 600;
      padding: 12px;
      text-align: left;
    }

    .delivery-table td {
      padding: 12px;
      border-bottom: 1px solid #2d3748;
    }

    .client-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .client-name {
      font-weight: 600;
      color: #e2e8f0;
    }

    .client-id {
      font-size: 12px;
      color: #a0aec0;
    }

    .order-id {
      font-family: monospace;
      background: #2d3748;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    .progress-bar {
      position: relative;
      width: 80px;
      height: 6px;
      background: #2d3748;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #06d6a0, #10b981);
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 10px;
      color: #a0aec0;
    }

    .eta-date.overdue {
      color: #f87171;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .btn-action {
      padding: 6px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-view {
      background: #3b82f6;
    }

    .btn-advance {
      background: #06d6a0;
    }

    .delivery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .delivery-card {
      background: #1a1f2e;
      border: 1px solid #2d3748;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }

    .delivery-card:hover {
      border-color: #06d6a0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .market-badge, .route-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }

    .market-badge {
      background: #3b82f6;
      color: white;
    }

    .route-badge {
      background: #8b5cf6;
      color: white;
    }

    .card-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .btn-view, .btn-advance {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      color: white;
      text-align: center;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #2d3748;
      border-left-color: #06d6a0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #1a1f2e;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      border: 1px solid #2d3748;
    }

    .available-actions {
      margin: 20px 0;
    }

    .action-option {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .btn-action-option {
      padding: 8px 16px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }

    .action-description {
      font-size: 14px;
      color: #a0aec0;
    }

    @media (max-width: 768px) {
      .ops-deliveries-container {
        padding: 16px;
      }

      .hierarchical-filters {
        padding: 16px;
      }

      .filter-level {
        flex-direction: column;
        align-items: flex-start;
      }

      .delivery-grid {
        grid-template-columns: 1fr;
      }

      .delivery-table {
        overflow-x: auto;
      }
    }
  `]
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
        console.error('Error loading stock positions:', error);
      });

    // Load stock alerts
    this.stockService.getAlerts()
      .pipe(finalize(() => this.stockLoading.set(false)))
      .subscribe({
        next: (alerts) => {
          this.stockAlerts.set(alerts);
        },
        error: (error) => {
          console.error('Error loading stock alerts:', error);
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
            console.error('Error loading routes:', error);
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