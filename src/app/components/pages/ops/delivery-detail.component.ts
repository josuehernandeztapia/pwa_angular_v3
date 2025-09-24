import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { DeliveriesService } from '../../../services/deliveries.service';
import { RiskService } from '../../../services/risk.service';
import { ToastService } from '../../../services/toast.service';
import { 
  DeliveryOrder,
  DeliveryEventLog,
  DeliveryEvent,
  DELIVERY_EVENT_DESCRIPTIONS,
  DELIVERY_STATUS_DESCRIPTIONS,
  DeliveryStatus,
  DELIVERY_FSM
} from '../../../models/deliveries';
import { ClientDeliveryInfo } from '../../../models/deliveries';

@Component({
  selector: 'app-delivery-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="delivery-detail-container">
      <!-- Header -->
      <div class="detail-header">
        <div class="header-content">
          <button class="btn-back" routerLink="/ops/deliveries">
            ← Volver al Dashboard
          </button>
          <h1 class="page-title" *ngIf="delivery()">
            📦 Entrega {{ delivery()!.id }}
          </h1>
          <div class="status-info" *ngIf="delivery()">
            <span class="status-badge" [style.background-color]="getStatusColor(delivery()!.status)">
              {{ getStatusIcon(delivery()!.status) }} {{ getStatusTitle(delivery()!.status) }}
            </span>
            <span class="progress-text">{{ getProgress(delivery()!.status) }}% completado</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" (click)="refreshData()" [disabled]="loading()">
            {{ loading() ? '⏳' : '🔄' }} Actualizar
          </button>
          <button 
            *ngIf="canAdvanceStatus()" 
            class="btn-advance" 
            (click)="showAdvanceModal()">
            ⏭️ Avanzar Estado
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Cargando detalles de la entrega...</p>
      </div>

      <!-- Main Content -->
      <div *ngIf="!loading() && delivery()" class="detail-content">
        
        <!-- Overview Cards -->
        <div class="overview-section">
          <div class="overview-cards">
            <!-- Client Info Card -->
            <div class="info-card">
              <div class="card-header">
                <h3>👤 Cliente</h3>
              </div>
              <div class="card-content">
                <div class="info-item">
                  <span class="info-label">Nombre:</span>
                  <span class="info-value">{{ delivery()!.client.name }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">ID:</span>
                  <span class="info-value">{{ delivery()!.client.id }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Mercado:</span>
                  <span class="info-value">{{ getMarketName(delivery()!.market) }}</span>
                </div>
                <div class="info-item" *ngIf="delivery()!.route">
                  <span class="info-label">Ruta:</span>
                  <span class="info-value">{{ delivery()!.route!.name }}</span>
                </div>
                <div class="info-item" *ngIf="getRouteRiskPremiumBps() > 0">
                  <span class="info-label">Riesgo Ruta:</span>
                  <span class="info-value">+{{ getRouteRiskPremiumBps() }} bps</span>
                </div>
              </div>
            </div>

            <!-- Order Info Card -->
            <div class="info-card">
              <div class="card-header">
                <h3>📋 Pedido</h3>
              </div>
              <div class="card-content">
                <div class="info-item">
                  <span class="info-label">Contrato:</span>
                  <span class="info-value">{{ delivery()!.contract.id }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Producto/Paquete:</span>
                  <span class="info-value">{{ delivery()!.sku }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Cantidad:</span>
                  <span class="info-value">{{ delivery()!.qty }}</span>
                </div>
                <div class="info-item" *ngIf="delivery()!.contract.amount">
                  <span class="info-label">Monto:</span>
                  <span class="info-value">{{ formatCurrency(delivery()!.contract.amount!) }}</span>
                </div>
              </div>
            </div>

            <!-- Timeline Info Card -->
            <div class="info-card">
              <div class="card-header">
                <h3>⏰ Tiempos</h3>
              </div>
              <div class="card-content">
                <div class="info-item">
                  <span class="info-label">Creado:</span>
                  <span class="info-value">{{ formatDate(delivery()!.createdAt) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">ETA:</span>
                  <span class="info-value" [class.overdue]="isOverdue(delivery()!.eta)">
                    {{ formatETA(delivery()!.eta) }}
                  </span>
                </div>
                <div class="info-item" *ngIf="delayInfo as di">
                  <span class="info-label">Retraso:</span>
                  <span class="info-value overdue">+{{ di.daysLate }} días</span>
                </div>
                <div class="info-item" *ngIf="delayInfo?.newCommitment as nc">
                  <span class="info-label">Nuevo compromiso:</span>
                  <span class="info-value new-commit">{{ nc }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Días estimados:</span>
                  <span class="info-value">{{ delivery()!.estimatedTransitDays }}</span>
                </div>
                <div class="info-item" *ngIf="delivery()!.actualTransitDays">
                  <span class="info-label">Días reales:</span>
                  <span class="info-value">{{ delivery()!.actualTransitDays }}</span>
                </div>
              </div>
            </div>

            <!-- Shipping Info Card -->
            <div class="info-card" *ngIf="hasShippingInfo()">
              <div class="card-header">
                <h3>🚢 Envío</h3>
              </div>
              <div class="card-content">
                <div class="info-item" *ngIf="delivery()!.containerNumber">
                  <span class="info-label">Contenedor:</span>
                  <span class="info-value">{{ delivery()!.containerNumber }}</span>
                </div>
                <div class="info-item" *ngIf="delivery()!.billOfLading">
                  <span class="info-label">Bill of Lading:</span>
                  <span class="info-value">{{ delivery()!.billOfLading }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Bar Section -->
        <div class="progress-section">
          <h3>📈 Progreso de Entrega</h3>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="getProgress(delivery()!.status)"></div>
            </div>
            <div class="progress-labels">
              <span>Inicio</span>
              <span>{{ getProgress(delivery()!.status) }}%</span>
              <span>Completado</span>
            </div>
          </div>
          <div class="client-toggle">
            <label>
              <input type="checkbox" [(ngModel)]="clientView" /> Vista cliente (simplificada)
            </label>
            <div class="client-panel" *ngIf="clientView">
              <div class="client-status">{{ clientInfo?.status }}</div>
              <div class="client-message">{{ clientInfo?.message }}</div>
              <div class="client-eta" *ngIf="clientInfo?.estimatedDate">ETA: {{ clientInfo?.estimatedDate }}</div>
            </div>
          </div>
        </div>

        <!-- Event Timeline -->
        <div class="timeline-section">
          <div class="timeline-header">
            <h3>📅 Línea de Tiempo</h3>
            <button class="btn-refresh-timeline" (click)="loadEvents()" [disabled]="eventsLoading()">
              {{ eventsLoading() ? '⏳' : '🔄' }} Actualizar Timeline
            </button>
          </div>

          <div *ngIf="eventsLoading()" class="timeline-loading">
            <div class="loading-spinner small"></div>
            <span>Cargando eventos...</span>
          </div>

          <div *ngIf="!eventsLoading()" class="timeline">
            <div *ngFor="let event of events(); trackBy: trackEvent" class="timeline-item">
              <div class="timeline-marker">
                <div class="timeline-dot" [class]="'event-' + event.event.toLowerCase()">
                  {{ getEventIcon(event.event) }}
                </div>
                <div class="timeline-line" *ngIf="!isLastEvent(event)"></div>
              </div>
              
              <div class="timeline-content">
                <div class="event-header">
                  <h4 class="event-title">{{ getEventTitle(event.event) }}</h4>
                  <span class="event-time">{{ formatEventTime(event.at) }}</span>
                </div>
                
                <p class="event-description">{{ getEventDescription(event.event) }}</p>
                
                <div class="event-meta" *ngIf="event.meta || event.actorName">
                  <div class="meta-item" *ngIf="event.actorName">
                    <span class="meta-label">Ejecutado por:</span>
                    <span class="meta-value">{{ event.actorName }}</span>
                  </div>
                  
                  <!-- Container Number -->
                  <div class="meta-item" *ngIf="event.meta?.containerNumber">
                    <span class="meta-label">Contenedor:</span>
                    <span class="meta-value">{{ event.meta?.containerNumber }}</span>
                  </div>
                  
                  <!-- Port Name -->
                  <div class="meta-item" *ngIf="event.meta?.portName">
                    <span class="meta-label">Puerto:</span>
                    <span class="meta-value">{{ event.meta?.portName }}</span>
                  </div>
                  
                  <!-- Vessel Name -->
                  <div class="meta-item" *ngIf="event.meta?.vesselName">
                    <span class="meta-label">Embarcación:</span>
                    <span class="meta-value">{{ event.meta?.vesselName }}</span>
                  </div>
                  
                  <!-- Customs Reference -->
                  <div class="meta-item" *ngIf="event.meta?.customsReference">
                    <span class="meta-label">Ref. Aduanal:</span>
                    <span class="meta-value">{{ event.meta?.customsReference }}</span>
                  </div>
                  
                  <!-- Warehouse Location -->
                  <div class="meta-item" *ngIf="event.meta?.warehouseLocation">
                    <span class="meta-label">Bodega:</span>
                    <span class="meta-value">{{ event.meta?.warehouseLocation }}</span>
                  </div>
                  
                  <!-- Notes -->
                  <div class="meta-item full-width" *ngIf="event.meta?.notes">
                    <span class="meta-label">Notas:</span>
                    <span class="meta-value">{{ event.meta?.notes }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty Timeline State -->
            <div *ngIf="events().length === 0" class="timeline-empty">
              <p>No hay eventos registrados aún.</p>
            </div>
          </div>
        </div>

        <!-- Available Actions -->
        <div class="actions-section" *ngIf="availableActions().length > 0">
          <h3>⚡ Acciones Disponibles</h3>
          <div class="actions-grid">
            <div *ngFor="let action of availableActions()" class="action-card">
              <div class="action-info">
                <h4>{{ action.label }}</h4>
                <p>{{ action.description }}</p>
              </div>
              <button 
                class="btn-action" 
                (click)="executeAction(action.event)"
                [class.requires-confirmation]="action.requiresConfirmation">
                Ejecutar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Advance State Modal -->
      <div *ngIf="showAdvanceStateModal()" class="modal-overlay" (click)="hideAdvanceModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Avanzar Estado de Entrega</h3>
            <button class="btn-close" (click)="hideAdvanceModal()">×</button>
          </div>
          
          <div class="modal-body">
            <div class="current-status" *ngIf="delivery()">
              <p><strong>Pedido:</strong> {{ delivery()!.id }}</p>
              <p><strong>Estado actual:</strong> {{ getStatusTitle(delivery()!.status) }}</p>
            </div>
            
            <div class="action-selection">
              <h4>Selecciona la acción a realizar:</h4>
              <div class="action-options">
                <div *ngFor="let action of availableActions()" class="action-option">
                  <button 
                    class="btn-action-option"
                    (click)="selectAction(action.event)">
                    {{ action.label }}
                  </button>
                  <span class="action-description">{{ action.description }}</span>
                </div>
              </div>
            </div>
            
            <!-- Action Form -->
            <div class="action-form" *ngIf="selectedAction()">
              <h4>{{ getActionLabel(selectedAction()!) }}</h4>
              
              <!-- Meta fields based on action -->
              <div class="form-fields">
                <div class="field-group" *ngIf="requiresContainerNumber(selectedAction()!)">
                  <label>Número de contenedor:</label>
                  <input type="text" [(ngModel)]="actionMeta.containerNumber" placeholder="TCLU1234567">
                </div>
                
                <div class="field-group" *ngIf="requiresPortName(selectedAction()!)">
                  <label>Puerto:</label>
                  <input type="text" [(ngModel)]="actionMeta.portName" placeholder="Puerto de Veracruz">
                </div>
                
                <div class="field-group" *ngIf="requiresVesselName(selectedAction()!)">
                  <label>Nombre de embarcación:</label>
                  <input type="text" [(ngModel)]="actionMeta.vesselName" placeholder="MSC Diana">
                </div>
                
                <div class="field-group" *ngIf="requiresCustomsRef(selectedAction()!)">
                  <label>Referencia aduanal:</label>
                  <input type="text" [(ngModel)]="actionMeta.customsReference" placeholder="ADU-2024-001234">
                </div>
                
                <div class="field-group" *ngIf="requiresWarehouseLocation(selectedAction()!)">
                  <label>Ubicación de bodega:</label>
                  <input type="text" [(ngModel)]="actionMeta.warehouseLocation" placeholder="Bodega Central AGS">
                </div>
                
                <div class="field-group">
                  <label>Notas (opcional):</label>
                  <textarea [(ngModel)]="actionMeta.notes" placeholder="Información adicional..."></textarea>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn-cancel" (click)="hideAdvanceModal()">Cancelar</button>
            <button 
              class="btn-confirm"
              [disabled]="!selectedAction() || submitting()"
              (click)="confirmAction()">
              {{ submitting() ? 'Procesando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delivery-detail-container {
      padding: 24px;
      background: #0f1419;
      color: white;
      min-height: 100vh;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      background: #1a1f2e;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #2d3748;
    }

    .btn-back {
      background: #2d3748;
      color: #a0aec0;
      border: 1px solid #4a5568;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 16px;
      display: inline-block;
    }

    .btn-back:hover {
      background: #4a5568;
      color: white;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 12px 0;
      color: #06d6a0;
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    .progress-text {
      color: #a0aec0;
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn-refresh, .btn-advance {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-refresh {
      background: #2d3748;
      color: white;
      border: 2px solid #4a5568;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #4a5568;
      border-color: #06d6a0;
    }

    .btn-advance {
      background: #06d6a0;
      color: white;
    }

    .btn-advance:hover {
      background: #059669;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
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

    .loading-spinner.small {
      width: 24px;
      height: 24px;
      border-width: 2px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .info-card {
      background: #1a1f2e;
      border: 1px solid #2d3748;
      border-radius: 12px;
      overflow: hidden;
    }

    .card-header {
      background: #2d3748;
      padding: 16px 20px;
    }

    .card-header h3 {
      margin: 0;
      color: #e2e8f0;
      font-size: 16px;
    }

    .card-content {
      padding: 20px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .info-item:last-child {
      margin-bottom: 0;
    }

    .info-label {
      color: #a0aec0;
      font-size: 14px;
    }

    .info-value {
      color: #e2e8f0;
      font-weight: 600;
      font-size: 14px;
    }

    .info-value.overdue {
      color: #f87171;
    }

    .progress-section {
      background: #1a1f2e;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #2d3748;
    }

    .progress-section h3 {
      margin: 0 0 20px 0;
      color: #06d6a0;
    }

    .progress-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .progress-bar {
      width: 100%;
      height: 12px;
      background: #2d3748;
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-radius: 6px;
      transition: width 0.5s ease;
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      color: #a0aec0;
      font-size: 14px;
    }

    .timeline-section {
      background: #1a1f2e;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #2d3748;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .timeline-header h3 {
      margin: 0;
      color: #06d6a0;
    }

    .btn-refresh-timeline {
      padding: 8px 16px;
      background: #2d3748;
      color: white;
      border: 1px solid #4a5568;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .timeline-loading {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #a0aec0;
      justify-content: center;
      padding: 24px;
    }

    .timeline {
      position: relative;
    }

    .timeline-item {
      display: flex;
      gap: 20px;
      margin-bottom: 32px;
    }

    .timeline-item:last-child {
      margin-bottom: 0;
    }

    .timeline-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    .timeline-dot {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #2d3748;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: white;
      border: 2px solid #4a5568;
      z-index: 1;
    }

    .timeline-dot.event-issue_po,
    .timeline-dot.event-start_prod {
      background: #f59e0b;
      border-color: #d97706;
    }

    .timeline-dot.event-factory_ready,
    .timeline-dot.event-load_origin {
      background: #3b82f6;
      border-color: #2563eb;
    }

    .timeline-dot.event-depart_vessel,
    .timeline-dot.event-arrive_dest {
      background: #0891b2;
      border-color: #0e7490;
    }

    .timeline-dot.event-customs_clear,
    .timeline-dot.event-release {
      background: #8b5cf6;
      border-color: #7c3aed;
    }

    .timeline-dot.event-arrive_wh,
    .timeline-dot.event-schedule_handover,
    .timeline-dot.event-confirm_delivery {
      background: #10b981;
      border-color: #059669;
    }

    .timeline-line {
      width: 2px;
      height: 40px;
      background: #4a5568;
      margin-top: 8px;
    }

    .timeline-content {
      flex: 1;
      padding-top: 4px;
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .event-title {
      margin: 0;
      color: #e2e8f0;
      font-size: 16px;
    }

    .event-time {
      color: #a0aec0;
      font-size: 12px;
      white-space: nowrap;
    }

    .event-description {
      margin: 0 0 16px 0;
      color: #a0aec0;
      font-size: 14px;
      line-height: 1.4;
    }

    .event-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
      background: #0f1419;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #2d3748;
    }

    .meta-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .meta-item.full-width {
      grid-column: 1 / -1;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .meta-label {
      color: #6b7280;
      font-size: 12px;
    }

    .meta-value {
      color: #e2e8f0;
      font-size: 12px;
      font-family: monospace;
    }
    .info-value.overdue { color: #f97316; font-weight: 700; }
    .info-value.new-commit { color: #22c55e; font-weight: 700; }

    .timeline-empty {
      text-align: center;
      color: #6b7280;
      padding: 40px;
    }

    .actions-section {
      background: #1a1f2e;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #2d3748;
    }

    .actions-section h3 {
      margin: 0 0 20px 0;
      color: #06d6a0;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .action-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #2d3748;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #4a5568;
    }

    .action-info h4 {
      margin: 0 0 4px 0;
      color: #e2e8f0;
      font-size: 14px;
    }

    .action-info p {
      margin: 0;
      color: #a0aec0;
      font-size: 12px;
    }

    .btn-action {
      padding: 8px 16px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
    }

    .btn-action:hover {
      background: #059669;
    }

    .btn-action.requires-confirmation {
      background: #f59e0b;
    }

    .btn-action.requires-confirmation:hover {
      background: #d97706;
    }

    /* Modal Styles */
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
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid #2d3748;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #2d3748;
    }

    .modal-header h3 {
      margin: 0;
      color: #e2e8f0;
    }

    .btn-close {
      background: none;
      border: none;
      color: #a0aec0;
      font-size: 24px;
      cursor: pointer;
    }

    .modal-body {
      padding: 24px;
    }

    .current-status {
      margin-bottom: 24px;
      padding: 16px;
      background: #2d3748;
      border-radius: 8px;
    }

    .current-status p {
      margin: 0 0 8px 0;
      color: #a0aec0;
    }

    .current-status p:last-child {
      margin-bottom: 0;
    }

    .action-selection h4 {
      margin: 0 0 16px 0;
      color: #e2e8f0;
    }

    .action-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .action-option {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      background: #2d3748;
      border-radius: 8px;
    }

    .btn-action-option {
      padding: 8px 16px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      white-space: nowrap;
    }

    .action-description {
      color: #a0aec0;
      font-size: 14px;
    }

    .action-form {
      border-top: 1px solid #2d3748;
      padding-top: 24px;
    }

    .action-form h4 {
      margin: 0 0 16px 0;
      color: #06d6a0;
    }

    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-group label {
      color: #a0aec0;
      font-size: 14px;
      font-weight: 600;
    }

    .field-group input,
    .field-group textarea {
      padding: 10px 12px;
      background: #2d3748;
      border: 1px solid #4a5568;
      border-radius: 6px;
      color: white;
      font-family: inherit;
    }

    .field-group textarea {
      resize: vertical;
      min-height: 80px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #2d3748;
    }

    .btn-cancel, .btn-confirm {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }

    .btn-cancel {
      background: #4a5568;
      color: white;
    }

    .btn-confirm {
      background: #06d6a0;
      color: white;
    }

    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .delivery-detail-container {
        padding: 16px;
      }

      .detail-header {
        flex-direction: column;
        gap: 20px;
        align-items: stretch;
      }

      .overview-cards {
        grid-template-columns: 1fr;
      }

      .timeline-item {
        gap: 16px;
      }

      .timeline-dot {
        width: 32px;
        height: 32px;
        font-size: 14px;
      }

      .actions-grid {
        grid-template-columns: 1fr;
      }

      .action-card {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }

      .modal-content {
        width: 95%;
        margin: 20px;
      }
    }
  `]
})
export class DeliveryDetailComponent implements OnInit {
  // Injected services
  private deliveriesService = inject(DeliveriesService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private riskService = inject(RiskService);

  // Component state
  delivery = signal<DeliveryOrder | null>(null);
  events = signal<DeliveryEventLog[]>([]);
  loading = signal<boolean>(false);
  eventsLoading = signal<boolean>(false);
  clientView = false;
  clientInfo: ClientDeliveryInfo | null = null;
  
  // Modal state
  showAdvanceStateModal = signal<boolean>(false);
  selectedAction = signal<DeliveryEvent | null>(null);
  submitting = signal<boolean>(false);
  
  // Action metadata
  actionMeta: any = {
    containerNumber: '',
    portName: '',
    vesselName: '',
    customsReference: '',
    warehouseLocation: '',
    notes: ''
  };

  // Computed properties
  availableActions = computed(() => {
    const deliveryOrder = this.delivery();
    if (!deliveryOrder) return [];
    
    return this.deliveriesService.getAvailableActions(deliveryOrder, 'ops');
  });

  ngOnInit(): void {
    const deliveryId = this.route.snapshot.paramMap.get('id');
    if (deliveryId) {
      this.loadDelivery(deliveryId);
      this.loadEvents();
    }
  }

  loadDelivery(id: string): void {
    this.loading.set(true);
    
    this.deliveriesService.get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (delivery) => {
          this.delivery.set(delivery);
          // Client-friendly snapshot
          try {
            const svc: any = this.deliveriesService as any;
            if (typeof svc['transformToClientView'] === 'function') {
              this.clientInfo = svc['transformToClientView'](delivery);
            }
          } catch {}
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Error cargando entrega');
        }
      });
  }

  loadEvents(): void {
    const delivery = this.delivery();
    if (!delivery) return;
    
    this.eventsLoading.set(true);
    
    this.deliveriesService.events(delivery.id)
      .pipe(finalize(() => this.eventsLoading.set(false)))
      .subscribe({
        next: (events) => {
          // Sort events by timestamp (most recent first for display)
          const sortedEvents = events.sort((a, b) => 
            new Date(b.at).getTime() - new Date(a.at).getTime()
          );
          this.events.set(sortedEvents);
        },
        error: (error) => {
          this.toastService.error('Error cargando eventos');
        }
      });
  }

  refreshData(): void {
    const delivery = this.delivery();
    if (!delivery) return;
    
    this.loadDelivery(delivery.id);
    this.loadEvents();
  }

  // Modal actions
  showAdvanceModal(): void {
    this.showAdvanceStateModal.set(true);
  }

  hideAdvanceModal(): void {
    this.showAdvanceStateModal.set(false);
    this.selectedAction.set(null);
    this.resetActionMeta();
  }

  selectAction(event: DeliveryEvent): void {
    this.selectedAction.set(event);
  }

  executeAction(event: DeliveryEvent): void {
    this.selectAction(event);
    this.confirmAction();
  }

  confirmAction(): void {
    const delivery = this.delivery();
    const action = this.selectedAction();
    
    if (!delivery || !action) return;
    
    this.submitting.set(true);
    
    this.deliveriesService.transition(delivery.id, {
      event: action,
      meta: this.actionMeta,
      notes: this.actionMeta.notes
    })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success(response.message);
            this.hideAdvanceModal();
            this.refreshData();
          } else {
            this.toastService.error(response.message);
          }
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Error ejecutando acción');
        }
      });
  }

  resetActionMeta(): void {
    this.actionMeta = {
      containerNumber: '',
      portName: '',
      vesselName: '',
      customsReference: '',
      warehouseLocation: '',
      notes: ''
    };
  }

  // Utility methods
  canAdvanceStatus(): boolean {
    return this.availableActions().length > 0;
  }

  hasShippingInfo(): boolean {
    const delivery = this.delivery();
    return !!(delivery?.containerNumber || delivery?.billOfLading);
  }

  isLastEvent(event: DeliveryEventLog): boolean {
    const events = this.events();
    return events.indexOf(event) === events.length - 1;
  }

  getMarketName(market: string): string {
    return market === 'AGS' ? 'Aguascalientes' : 'Estado de México';
  }

  getStatusTitle(status: string): string {
    return DELIVERY_STATUS_DESCRIPTIONS[status as keyof typeof DELIVERY_STATUS_DESCRIPTIONS]?.title || status;
  }

  getStatusColor(status: string): string {
    return this.deliveriesService.getStatusColor(status as any);
  }

  getStatusIcon(status: string): string {
    return this.deliveriesService.getStatusIcon(status as any);
  }

  getProgress(status: string): number {
    return this.deliveriesService.getDeliveryProgress(status as any);
  }

  getEventTitle(event: DeliveryEvent): string {
    return DELIVERY_EVENT_DESCRIPTIONS[event]?.title || event;
  }

  getEventDescription(event: DeliveryEvent): string {
    return DELIVERY_EVENT_DESCRIPTIONS[event]?.description || '';
  }

  getEventIcon(event: DeliveryEvent): string {
    return DELIVERY_EVENT_DESCRIPTIONS[event]?.icon || '📦';
  }

  getActionLabel(event: DeliveryEvent): string {
    const action = this.availableActions().find(a => a.event === event);
    return action ? action.label : event;
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  formatETA(eta?: string): string {
    if (!eta) return 'Por definir';
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(eta));
  }

  // Recalculate ETA with p80 buffers per tramo and show "nuevo compromiso"
  get bufferedETA(): string | undefined {
    const d = this.delivery();
    if (!d) return undefined;
    return this.calculateBufferedETA(d.createdAt, d.status);
  }

  get delayInfo(): { daysLate: number; newCommitment?: string } | null {
    const d = this.delivery();
    if (!d || !d.eta) return null;
    const now = new Date();
    const eta = new Date(d.eta);
    if (now <= eta) return null;
    const daysLate = Math.ceil((now.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24));
    const newCommitment = this.bufferedETA ? this.formatETA(this.bufferedETA) : undefined;
    return { daysLate, newCommitment };
  }

  formatEventTime(time: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(time));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  // Risk badge helper
  getRouteRiskPremiumBps(): number {
    const d = this.delivery();
    if (!d || !d.route?.id) return 0;
    return this.riskService.getIrrPremiumBps({ ecosystemId: d.route.id });
  }

  isOverdue(eta?: string): boolean {
    if (!eta) return false;
    return new Date(eta) < new Date();
  }

  private calculateBufferedETA(createdAt: string, currentStatus: DeliveryStatus): string {
    // p80 buffers by tramo (multiplicative factors)
    const p80: Record<string, number> = {
      IN_PRODUCTION: 1.2,          // 30d → p80
      READY_AT_FACTORY: 1.1,       // 5d ground to port
      ON_VESSEL: 1.2,              // 30d vessel
      IN_CUSTOMS: 1.2,             // 10d customs
      RELEASED: 1.1,               // 2d to WH
    };

    // Build total days from base FSM with buffers applied to segments that have estimatedDays
    const base = new Date(createdAt);
    let total = 0;
    // Sum up to current status (historical segments use base estimate as reference)
    for (const t of DELIVERY_FSM) {
      const days = t.estimatedDays || 0;
      const factor = p80[t.to] || 1.0;
      total += Math.round(days * factor);
      if (t.to === currentStatus) break;
    }
    // Add remaining segments to delivery
    const currentIndex = DELIVERY_FSM.findIndex(tr => tr.to === currentStatus);
    const remaining = DELIVERY_FSM.slice(currentIndex + 1);
    for (const t of remaining) {
      const days = t.estimatedDays || 0;
      const factor = p80[t.to] || 1.0;
      total += Math.round(days * factor);
    }
    const eta = new Date(base);
    eta.setDate(eta.getDate() + total);
    return eta.toISOString();
  }

  // Form field visibility based on action
  requiresContainerNumber(event: DeliveryEvent): boolean {
    return ['LOAD_ORIGIN', 'DEPART_VESSEL', 'ARRIVE_DEST'].includes(event);
  }

  requiresPortName(event: DeliveryEvent): boolean {
    return ['LOAD_ORIGIN', 'ARRIVE_DEST'].includes(event);
  }

  requiresVesselName(event: DeliveryEvent): boolean {
    return ['DEPART_VESSEL', 'ARRIVE_DEST'].includes(event);
  }

  requiresCustomsRef(event: DeliveryEvent): boolean {
    return ['CUSTOMS_CLEAR', 'RELEASE'].includes(event);
  }

  requiresWarehouseLocation(event: DeliveryEvent): boolean {
    return ['ARRIVE_WH'].includes(event);
  }

  trackEvent(index: number, event: DeliveryEventLog): string {
    return event.id;
  }
}
