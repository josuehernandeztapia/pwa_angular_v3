import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { Client, BusinessFlow } from '../../../models/types';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="clientes-container command-container">
      <header class="clientes-header">
        <div class="header-content">
          <h1 class="page-title command-title">👥 Portafolio de Clientes Inteligente</h1>
          <p class="page-subtitle intelligence-subtitle">Administra todos tus clientes y sus expedientes</p>
        </div>
        <div class="header-actions">
          <button routerLink="/clientes/nuevo" class="premium-button">
            ➕ Nuevo Cliente
          </button>
        </div>
      </header>

      <!-- Strategic Search & Segmentation -->
      <div class="segmentation-section">
        <div class="search-box premium-card">
          <div class="search-input-container">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (input)="onSearch()"
              placeholder="¿Dónde está el cliente...?"
              class="premium-input"
            >
          </div>
        </div>

        <div class="strategic-filters">
          <div class="filter-group priority premium-card">
            <label class="filter-label">🚨 Estado Crítico</label>
            <select [(ngModel)]="filterStatus" (change)="applyFilters()" class="premium-select status">
              <option value="">Todos los estados</option>
              <option value="Activo">✅ Activo</option>
              <option value="Pendiente">⏳ Pendiente</option>
              <option value="En Expediente">📋 En Expediente</option>
              <option value="Documentos Incompletos">⚠️ Doc. Incompletos</option>
              <option value="En Riesgo">🔴 En Riesgo</option>
              <option value="Inactivo">❌ Inactivo</option>
            </select>
          </div>

          <div class="filter-group critical premium-card">
            <label class="filter-label">💹 Health Score</label>
            <select [(ngModel)]="filterHealthScore" (change)="applyFilters()" class="premium-select health">
              <option value="">Todos los scores</option>
              <option value="critical">🔴 Crítico (&lt; 40)</option>
              <option value="poor">🟠 Regular (40-59)</option>
              <option value="good">🟡 Bueno (60-79)</option>
              <option value="excellent">🟢 Excelente (80+)</option>
            </select>
          </div>

          <div class="filter-group secondary premium-card">
            <select [(ngModel)]="filterMarket" (change)="applyFilters()" class="premium-select">
              <option value="">Todos los mercados</option>
              <option value="aguascalientes">Aguascalientes</option>
              <option value="edomex">Estado de México</option>
            </select>
          </div>

          <div class="filter-group secondary premium-card">
            <select [(ngModel)]="filterFlow" (change)="applyFilters()" class="premium-select">
              <option value="">Todos los productos</option>
              <option value="Venta a Plazo">Venta a Plazo</option>
              <option value="Plan de Ahorro">Plan de Ahorro</option>
              <option value="Crédito Colectivo">Crédito Colectivo</option>
              <option value="Venta Directa">Venta Directa</option>
            </select>
          </div>

          <button 
            *ngIf="hasActiveFilters()" 
            (click)="clearAllFilters()" 
            class="premium-button outline"
            title="Limpiar todos los filtros"
          >
            🗑️ Limpiar
          </button>
        </div>

        <!-- Active Filters Summary -->
        <div *ngIf="hasActiveFilters()" class="active-filters-summary premium-card">
          <span class="summary-label">Segmentación activa:</span>
          <span class="filter-tag" *ngIf="filterStatus">Estado: {{ filterStatus }}</span>
          <span class="filter-tag" *ngIf="filterHealthScore">Score: {{ getHealthScoreLabel(filterHealthScore) }}</span>
          <span class="filter-tag" *ngIf="filterMarket">{{ getMarketName(filterMarket) }}</span>
          <span class="filter-tag" *ngIf="filterFlow">{{ filterFlow }}</span>
          <span class="results-count">{{ filteredClientes.length }} cliente{{ filteredClientes.length !== 1 ? 's' : '' }} encontrado{{ filteredClientes.length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container premium-card">
        <div class="premium-loading"></div>
        <p>Cargando clientes...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && filteredClientes.length === 0" class="empty-state premium-card">
        <div class="empty-icon">📝</div>
        <h3>{{ searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados' }}</h3>
        <p>{{ searchTerm ? 'Intenta con otros términos de búsqueda' : 'Comienza creando tu primer cliente' }}</p>
        <button *ngIf="!searchTerm" routerLink="/clientes/nuevo" class="premium-button">
          Crear primer cliente
        </button>
      </div>

      <!-- Strategic Actions Bar -->
      <div *ngIf="!isLoading && filteredClientes.length > 0" class="strategic-actions-bar premium-card">
        <div class="selection-info">
          <label class="select-all-container">
            <input 
              type="checkbox" 
              [checked]="allSelected" 
              [indeterminate]="someSelected && !allSelected"
              (change)="toggleSelectAll()"
              class="select-all-checkbox"
            >
            <span class="select-all-label">
              {{ selectedClientes.size === 0 ? 'Seleccionar todo' : selectedClientes.size + ' seleccionado' + (selectedClientes.size !== 1 ? 's' : '') }}
            </span>
          </label>
        </div>

        <div class="bulk-actions" *ngIf="selectedClientes.size > 0">
          <button 
            (click)="exportSelected()" 
            class="premium-button"
            title="Exportar clientes seleccionados"
          >
            📊 Exportar ({{ selectedClientes.size }})
          </button>
          <button 
            (click)="clearSelection()" 
            class="premium-button outline"
            title="Limpiar selección"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      <!-- Strategic Client Cards -->
      <div *ngIf="!isLoading && filteredClientes.length > 0" class="clients-grid">
        <div
          *ngFor="let cliente of paginatedClientes; trackBy: trackByClientId"
          class="client-card"
          [class.selected]="selectedClientes.has(cliente.id)"
        >
          <!-- Selection Checkbox -->
          <div class="selection-area" (click)="toggleClientSelection(cliente.id, $event)">
            <input 
              type="checkbox" 
              [checked]="selectedClientes.has(cliente.id)"
              class="client-checkbox"
              (click)="$event.stopPropagation()"
            >
          </div>

          <!-- Clickable Card Content -->
          <div class="card-content" [routerLink]="['/clientes', cliente.id]">
            <div class="client-header">
              <div class="client-avatar" [class]="getHealthScoreClass(cliente.healthScore)">
                {{ getClientInitials(cliente.name) }}
              </div>
              <div class="client-info">
                <h3 class="client-name">{{ cliente.name }}</h3>
                <p class="client-email">{{ cliente.email || 'Sin email' }}</p>
              </div>
              <div class="client-metrics">
                <div class="health-score" *ngIf="cliente.healthScore !== undefined">
                  <span class="score-label">Health</span>
                  <span [class]="'score-value ' + getHealthScoreClass(cliente.healthScore)">
                    {{ cliente.healthScore }}%
                  </span>
                </div>
                <div class="client-status">
                  <span [class]="getStatusClass(cliente.status)">
                    {{ cliente.status }}
                  </span>
                </div>
              </div>
            </div>

            <div class="client-details">
              <div class="detail-item">
                <span class="detail-label">📱 Teléfono:</span>
                <span class="detail-value">{{ cliente.phone || 'No registrado' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">🏢 Mercado:</span>
                <span class="detail-value">{{ getMarketName(cliente.market || '') }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">💼 Producto:</span>
                <span class="detail-value">{{ cliente.flow }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">📅 Creado:</span>
                <span class="detail-value">{{ formatDate(cliente.createdAt) }}</span>
              </div>
            </div>

            <!-- Strategic Indicators -->
            <div class="strategic-indicators">
              <div class="indicator urgent" *ngIf="isClientUrgent(cliente)" title="Requiere atención inmediata">
                🚨 Urgente
              </div>
              <div class="indicator opportunity" *ngIf="isHighValueClient(cliente)" title="Cliente de alto valor">
                💎 Premium
              </div>
              <div class="indicator risk" *ngIf="isAtRisk(cliente)" title="Cliente en riesgo">
                ⚠️ Riesgo
              </div>
              <div class="indicator protection" *ngIf="hasProtectionAvailable(cliente)" title="Protección financiera disponible">
                🛡️ Protección
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="client-actions">
            <button
              (click)="$event.stopPropagation(); callClient(cliente)"
              class="action-btn call"
              title="Llamar cliente"
            >
              📞
            </button>
            <button
              (click)="$event.stopPropagation(); emailClient(cliente)"
              class="action-btn email"
              title="Enviar email"
            >
              ✉️
            </button>
            <button
              (click)="$event.stopPropagation(); viewClientDetails(cliente.id)"
              class="action-btn view"
              title="Ver detalles completos"
            >
              👁️
            </button>
          </div>
        </div>
      </div>

      <!-- Strategic Pagination -->
      <div *ngIf="!isLoading && filteredClientes.length > 0" class="strategic-pagination">
        <div class="pagination-info">
          <span class="results-summary">
            Mostrando {{ getDisplayRange() }} de {{ filteredClientes.length }} cliente{{ filteredClientes.length !== 1 ? 's' : '' }}
            {{ hasActiveFilters() ? '(filtrados)' : '' }}
          </span>
          <div class="page-size-selector">
            <label>Mostrar:</label>
            <select [(ngModel)]="pageSize" (change)="onPageSizeChange()" class="page-size-select">
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>por página</span>
          </div>
        </div>

        <div class="pagination-controls" *ngIf="totalPages > 1">
          <button 
            [disabled]="currentPage === 1" 
            (click)="goToPage(1)"
            class="page-btn first"
            title="Primera página"
          >
            ⏮️
          </button>
          <button 
            [disabled]="currentPage === 1" 
            (click)="goToPage(currentPage - 1)"
            class="page-btn prev"
            title="Página anterior"
          >
            ◀️
          </button>

          <div class="page-numbers">
            <button 
              *ngFor="let page of getVisiblePages()" 
              [class]="'page-btn ' + (page === currentPage ? 'active' : '')"
              [disabled]="page === '...'"
              (click)="page !== '...' && goToPage(+page)"
            >
              {{ page }}
            </button>
          </div>

          <button 
            [disabled]="currentPage === totalPages" 
            (click)="goToPage(currentPage + 1)"
            class="page-btn next"
            title="Página siguiente"
          >
            ▶️
          </button>
          <button 
            [disabled]="currentPage === totalPages" 
            (click)="goToPage(totalPages)"
            class="page-btn last"
            title="Última página"
          >
            ⏭️
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .clientes-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .clientes-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
    }

    .header-content h1 {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .header-content p {
      color: #6b7280;
      margin: 8px 0 0 0;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: background-color 0.2s;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    /* Strategic Segmentation Section */
    .segmentation-section {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .strategic-filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
      align-items: end;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .filter-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .filter-group.priority .filter-label {
      color: #dc2626;
    }

    .filter-group.critical .filter-label {
      color: #ea580c;
    }

    .filter-select {
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: white;
      font-size: 14px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .filter-select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .filter-select.status {
      border-color: #dc2626;
    }

    .filter-select.health {
      border-color: #ea580c;
    }

    .clear-filters-btn {
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      align-self: end;
    }

    .clear-filters-btn:hover {
      background: #dc2626;
    }

    .active-filters-summary {
      margin-top: 16px;
      padding: 12px;
      background: #f3f4f6;
      border-radius: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .summary-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .filter-tag {
      background: #3b82f6;
      color: white;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }

    .results-count {
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      margin-left: auto;
    }

    .search-box {
      flex: 1;
      min-width: 300px;
    }

    .search-input-container {
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #6b7280;
    }

    .search-input {
      width: 100%;
      padding: 12px 12px 12px 40px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .filters {
      display: flex;
      gap: 12px;
    }

    .filter-select {
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: white;
      font-size: 14px;
      outline: none;
      cursor: pointer;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px 0;
      color: #6b7280;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid #e5e7eb;
      border-left-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 64px 0;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 20px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8px 0;
    }

    .empty-state p {
      margin: 0 0 24px 0;
    }

    /* Strategic Actions Bar */
    .strategic-actions-bar {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px 24px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .selection-info .select-all-container {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }

    .select-all-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .select-all-label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .bulk-actions {
      display: flex;
      gap: 12px;
    }

    .action-btn.export {
      background: #10b981;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .action-btn.export:hover {
      background: #059669;
    }

    .action-btn.clear {
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .action-btn.clear:hover {
      background: #4b5563;
    }

    /* Enhanced Strategic Client Cards */
    .clients-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .client-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.3s ease;
      position: relative;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .client-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border-color: #3b82f6;
    }

    .client-card.selected {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      background: #fefbff;
    }

    .selection-area {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 10;
      padding: 4px;
      cursor: pointer;
    }

    .client-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .card-content {
      padding: 24px 24px 16px 56px;
      flex: 1;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
    }

    .client-card:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-color: #3b82f6;
    }

    .client-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
    }

    .client-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 20px;
      color: white;
      border: 3px solid;
      flex-shrink: 0;
    }

    /* Health Score Avatar Colors */
    .client-avatar.score-excellent {
      background: linear-gradient(135deg, #10b981, #059669);
      border-color: #d1fae5;
    }

    .client-avatar.score-good {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-color: #fef3c7;
    }

    .client-avatar.score-poor {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border-color: #fee2e2;
    }

    .client-avatar.score-critical {
      background: linear-gradient(135deg, #991b1b, #7f1d1d);
      border-color: #fecaca;
      animation: pulse-critical 2s infinite;
    }

    .client-avatar.score-unknown {
      background: linear-gradient(135deg, #6b7280, #4b5563);
      border-color: #f3f4f6;
    }

    @keyframes pulse-critical {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .client-metrics {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-end;
    }

    .health-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .score-label {
      font-size: 10px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .score-value {
      font-size: 16px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      min-width: 50px;
      text-align: center;
    }

    .score-value.score-excellent {
      background: #d1fae5;
      color: #065f46;
    }

    .score-value.score-good {
      background: #fef3c7;
      color: #92400e;
    }

    .score-value.score-poor {
      background: #fee2e2;
      color: #991b1b;
    }

    .score-value.score-critical {
      background: #fecaca;
      color: #7f1d1d;
      animation: blink-critical 2s infinite;
    }

    @keyframes blink-critical {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0.7; }
    }

    .client-info {
      flex: 1;
    }

    .client-name {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .client-email {
      color: #6b7280;
      font-size: 14px;
      margin: 4px 0 0 0;
    }

    .client-status {
      align-self: flex-start;
    }

    .status-activo {
      background: #dcfce7;
      color: #166534;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-pendiente {
      background: #fef3c7;
      color: #92400e;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-inactivo {
      background: #fee2e2;
      color: #991b1b;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
    }

    .client-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
    }

    .detail-value {
      font-size: 14px;
      color: #111827;
    }

    /* Strategic Indicators */
    .strategic-indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0 8px 0;
    }

    .indicator {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .indicator.urgent {
      background: #fecaca;
      color: #7f1d1d;
      animation: pulse 2s infinite;
    }

    .indicator.opportunity {
      background: #ddd6fe;
      color: #5b21b6;
    }

    .indicator.risk {
      background: #fed7aa;
      color: #9a3412;
    }
    .indicator.protection {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #06d6a0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* Enhanced Action Buttons */
    .client-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid #f3f4f6;
      background: #fafafa;
    }

    .action-btn {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
    }

    .action-btn:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
      transform: scale(1.05);
    }

    .action-btn.call:hover {
      background: #dcfce7;
      border-color: #10b981;
    }

    .action-btn.email:hover {
      background: #dbeafe;
      border-color: #3b82f6;
    }

    .action-btn.view:hover {
      background: #f3e8ff;
      border-color: #8b5cf6;
    }

    /* Strategic Pagination */
    .strategic-pagination {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px 24px;
      margin-top: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .pagination-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .results-summary {
      color: #374151;
      font-size: 14px;
      font-weight: 500;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #6b7280;
    }

    .page-size-select {
      padding: 6px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      font-size: 14px;
      cursor: pointer;
    }

    .pagination-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }

    .page-btn {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: white;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
      min-width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-btn:hover:not(:disabled) {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .page-btn.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
      font-weight: 600;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      color: #9ca3af;
    }

    .page-numbers {
      display: flex;
      gap: 4px;
    }

    @media (max-width: 768px) {
      .clientes-header {
        flex-direction: column;
        gap: 16px;
      }

      .filters-section {
        flex-direction: column;
      }

      .search-box {
        min-width: auto;
      }

      .clients-grid {
        grid-template-columns: 1fr;
      }

      .client-details {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ClientesListComponent implements OnInit {
  // Core Data
  clientes: Client[] = [];
  filteredClientes: Client[] = [];
  paginatedClientes: Client[] = [];
  
  // Search & Filters
  searchTerm = '';
  filterMarket = '';
  filterFlow = '';
  filterStatus = '';
  filterHealthScore = '';
  
  // Selection Management
  selectedClientes = new Set<string>();
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  
  // State
  isLoading = true;
  totalClientes = 0;

  constructor(
    private apiService: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  private loadClientes(): void {
    this.isLoading = true;
    
    this.apiService.getClients().subscribe({
      next: (clientes) => {
        this.clientes = clientes;
        this.filteredClientes = [...this.clientes];
        this.totalClientes = this.clientes.length;
        this.updatePagination();
        this.isLoading = false;
      },
      error: (error) => {
        this.toast.error('Error al cargar los clientes');
        this.isLoading = false;
      }
    });
  }


  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredClientes = this.clientes.filter(cliente => {
      // Search filter
      const matchesSearch = !this.searchTerm || 
        cliente.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (cliente.email && cliente.email.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (cliente.phone && cliente.phone.includes(this.searchTerm));
      
      // Basic filters
      const matchesMarket = !this.filterMarket || cliente.market === this.filterMarket;
      const matchesFlow = !this.filterFlow || cliente.flow === this.filterFlow;
      const matchesStatus = !this.filterStatus || cliente.status === this.filterStatus;
      
      // Health Score filter
      const matchesHealthScore = !this.filterHealthScore || this.matchesHealthScoreFilter(cliente, this.filterHealthScore);

      return matchesSearch && matchesMarket && matchesFlow && matchesStatus && matchesHealthScore;
    });
    
    // Reset to first page when filters change
    this.currentPage = 1;
    this.updatePagination();
  }

  private matchesHealthScoreFilter(cliente: Client, filter: string): boolean {
    const score = cliente.healthScore;
    if (score === undefined) return filter === 'critical'; // Clients without score are considered critical
    
    switch (filter) {
      case 'critical': return score < 40;
      case 'poor': return score >= 40 && score < 60;
      case 'good': return score >= 60 && score < 80;
      case 'excellent': return score >= 80;
      default: return true;
    }
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredClientes.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedClientes = this.filteredClientes.slice(startIndex, endIndex);
    
    // Clear selection if clients are no longer visible
    this.selectedClientes.forEach(clientId => {
      if (!this.paginatedClientes.some(c => c.id === clientId)) {
        // Keep selection, but user should be aware
      }
    });
  }

  trackByClientId(index: number, cliente: Client): string {
    return cliente.id;
  }

  getClientInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'activo': return 'status-activo';
      case 'pendiente': return 'status-pendiente';
      case 'inactivo': return 'status-inactivo';
      default: return 'status-pendiente';
    }
  }

  getMarketName(market: string): string {
    switch (market) {
      case 'aguascalientes': return 'Aguascalientes';
      case 'edomex': return 'Estado de México';
      default: return market;
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'No registrado';
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  // === STRATEGIC FILTER METHODS ===
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterMarket || this.filterFlow || this.filterStatus || this.filterHealthScore);
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.filterMarket = '';
    this.filterFlow = '';
    this.filterStatus = '';
    this.filterHealthScore = '';
    this.applyFilters();
  }

  getHealthScoreLabel(filter: string): string {
    const labels: Record<string, string> = {
      'critical': 'Crítico (< 40)',
      'poor': 'Regular (40-59)',
      'good': 'Bueno (60-79)',
      'excellent': 'Excelente (80+)'
    };
    return labels[filter] || filter;
  }

  // === HEALTH SCORE & STRATEGIC INDICATORS ===
  getHealthScoreClass(score: number | undefined): string {
    if (score === undefined) return 'score-unknown';
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-poor';
    return 'score-critical';
  }

  isClientUrgent(cliente: Client): boolean {
    return (cliente.healthScore !== undefined && cliente.healthScore < 40) || 
           cliente.status === 'En Riesgo' || 
           cliente.status === 'Documentos Incompletos';
  }

  isHighValueClient(cliente: Client): boolean {
    return (cliente.healthScore !== undefined && cliente.healthScore >= 90) && 
           cliente.status === 'Activo';
  }

  isAtRisk(cliente: Client): boolean {
    return (cliente.healthScore !== undefined && cliente.healthScore < 60) || 
           cliente.status === 'En Riesgo';
  }
  
  hasProtectionAvailable(cliente: Client): boolean {
    // Protection only available for financial products
    const financialFlows = ['VentaPlazo', 'AhorroProgramado', 'CreditoColectivo'];
    return financialFlows.includes(cliente.flow as string);
  }

  // === SELECTION MANAGEMENT ===
  get allSelected(): boolean {
    return this.paginatedClientes.length > 0 && 
           this.paginatedClientes.every(cliente => this.selectedClientes.has(cliente.id));
  }

  get someSelected(): boolean {
    return this.paginatedClientes.some(cliente => this.selectedClientes.has(cliente.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      // Deselect all visible
      this.paginatedClientes.forEach(cliente => {
        this.selectedClientes.delete(cliente.id);
      });
    } else {
      // Select all visible
      this.paginatedClientes.forEach(cliente => {
        this.selectedClientes.add(cliente.id);
      });
    }
  }

  toggleClientSelection(clientId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.selectedClientes.has(clientId)) {
      this.selectedClientes.delete(clientId);
    } else {
      this.selectedClientes.add(clientId);
    }
  }

  clearSelection(): void {
    this.selectedClientes.clear();
  }

  // === PAGINATION METHODS ===
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getDisplayRange(): string {
    if (this.filteredClientes.length === 0) return '0';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.filteredClientes.length);
    return `${start}-${end}`;
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      pages.push(1);
      
      if (current > 4) {
        pages.push('...');
      }
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < total - 3) {
        pages.push('...');
      }
      
      pages.push(total);
    }
    
    return pages;
  }

  // === EXPORT FUNCTIONALITY ===
  exportSelected(): void {
    if (this.selectedClientes.size === 0) {
      this.toast.error('Selecciona al menos un cliente para exportar');
      return;
    }
    
    const selectedClientsData = this.clientes.filter(cliente => 
      this.selectedClientes.has(cliente.id)
    );
    
    this.exportToCSV(selectedClientsData);
  }

  private exportToCSV(clientes: Client[]): void {
    const headers = [
      'Nombre',
      'Email', 
      'Teléfono',
      'Estado',
      'Health Score',
      'Mercado',
      'Producto',
      'Fecha Creación'
    ];
    
    const csvData = [
      headers.join(','),
      ...clientes.map(cliente => [
        `"${cliente.name}"`,
        `"${cliente.email || ''}"`,
        `"${cliente.phone || ''}"`,
        `"${cliente.status}"`,
        cliente.healthScore?.toString() || '',
        `"${this.getMarketName(cliente.market || '')}"`,
        `"${cliente.flow}"`,
        cliente.createdAt ? this.formatDate(cliente.createdAt) : ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toast.success(`${clientes.length} clientes exportados exitosamente`);
  }

  // === QUICK ACTIONS ===
  callClient(cliente: Client): void {
    if (cliente.phone) {
      window.open(`tel:${cliente.phone}`, '_self');
    } else {
      this.toast.error('Este cliente no tiene teléfono registrado');
    }
  }

  emailClient(cliente: Client): void {
    if (cliente.email) {
      window.open(`mailto:${cliente.email}?subject=Seguimiento Conductores PWA`, '_self');
    } else {
      this.toast.error('Este cliente no tiene email registrado');
    }
  }

  viewClientDetails(clientId: string): void {
    // Navigation handled by routerLink
  }
}