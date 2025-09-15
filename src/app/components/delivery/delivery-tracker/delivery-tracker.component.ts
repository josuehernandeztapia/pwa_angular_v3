import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeliveryCommitment,
  ETAUpdate,
  DeliveryTrackingService,
  DeliveryMetrics
} from '../../../services/delivery-tracking.service';

@Component({
  selector: 'app-delivery-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="delivery-tracker">
      <!-- 📊 Metrics Overview -->
      <div class="metrics-overview" *ngIf="showMetrics()">
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">{{ metrics()?.totalDeliveries || 0 }}</div>
            <div class="metric-label">Total Entregas</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ metrics()?.onTimeRate || 0 }}%</div>
            <div class="metric-label">Puntualidad</div>
            <div class="metric-status"
                 [ngClass]="{'good': (metrics()?.onTimeRate || 0) >= 90, 'warning': (metrics()?.onTimeRate || 0) >= 80, 'critical': (metrics()?.onTimeRate || 0) < 80}">
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ metrics()?.etaAccuracy || 0 }}%</div>
            <div class="metric-label">Precisión ETA</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ deliveryService.trackingReliability() }}%</div>
            <div class="metric-label">Fiabilidad Sistema</div>
            <div class="metric-status"
                 [ngClass]="{'good': deliveryService.trackingReliability() >= 95, 'warning': deliveryService.trackingReliability() >= 85, 'critical': deliveryService.trackingReliability() < 85}">
            </div>
          </div>
        </div>
      </div>

      <!-- 🔍 Track Delivery by Code -->
      <div class="tracking-input" *ngIf="showTrackingInput()">
        <div class="input-group">
          <input
            type="text"
            [(ngModel)]="trackingCode"
            placeholder="Código de seguimiento (ej: CONDXXXXX)"
            class="tracking-code-input"
            (keyup.enter)="trackByCode()">
          <button (click)="trackByCode()" [disabled]="!trackingCode" class="track-button">
            🔍 Rastrear
          </button>
        </div>

        <!-- Tracking Results -->
        <div class="tracking-results" *ngIf="trackingResult()">
          <div class="delivery-info">
            <h3>📦 Entrega {{ trackingResult()?.commitment?.trackingCode }}</h3>

            <!-- Status Badge -->
            <div class="status-badge" [ngClass]="getStatusClass(trackingResult()?.commitment?.status)">
              {{ getStatusLabel(trackingResult()?.commitment?.status) }}
            </div>

            <!-- Client & Contract Info -->
            <div class="delivery-details">
              <div class="detail-row">
                <span class="label">Cliente:</span>
                <span class="value">{{ trackingResult()?.commitment?.clientId }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Contrato:</span>
                <span class="value">{{ trackingResult()?.commitment?.contractId }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Fecha programada:</span>
                <span class="value">{{ formatDate(trackingResult()?.commitment?.deliveryDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Ventana:</span>
                <span class="value">
                  {{ formatTime(trackingResult()?.commitment?.window.start) }} -
                  {{ formatTime(trackingResult()?.commitment?.window.end) }}
                </span>
              </div>
            </div>

            <!-- Current ETA -->
            <div class="current-eta" *ngIf="trackingResult()?.latestETA">
              <div class="eta-header">
                <span class="eta-icon">🕐</span>
                <span class="eta-label">ETA Actual</span>
              </div>
              <div class="eta-time">{{ formatDateTime(trackingResult()?.latestETA?.estimatedArrival) }}</div>
              <div class="eta-confidence">
                Confianza: {{ Math.round((trackingResult()?.latestETA?.confidence || 0) * 100) }}%
              </div>

              <!-- Traffic & Factors -->
              <div class="eta-factors">
                <div class="factor traffic" [ngClass]="trackingResult()?.latestETA?.factors.traffic">
                  🚦 {{ getTrafficLabel(trackingResult()?.latestETA?.factors.traffic) }}
                </div>
                <div class="factor weather" [ngClass]="trackingResult()?.latestETA?.factors.weather">
                  🌤️ {{ getWeatherLabel(trackingResult()?.latestETA?.factors.weather) }}
                </div>
                <div class="factor route" [ngClass]="trackingResult()?.latestETA?.factors.route">
                  🛣️ {{ getRouteLabel(trackingResult()?.latestETA?.factors.route) }}
                </div>
              </div>
            </div>

            <!-- Location -->
            <div class="delivery-location">
              <div class="location-header">📍 Ubicación de entrega</div>
              <div class="location-address">{{ trackingResult()?.commitment?.location.address }}</div>
              <div class="location-landmark" *ngIf="trackingResult()?.commitment?.location.landmark">
                🏢 {{ trackingResult()?.commitment?.location.landmark }}
              </div>
            </div>

            <!-- Special Instructions -->
            <div class="special-instructions" *ngIf="trackingResult()?.commitment?.metadata.specialInstructions">
              <div class="instructions-header">📝 Instrucciones especiales</div>
              <div class="instructions-text">{{ trackingResult()?.commitment?.metadata.specialInstructions }}</div>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div class="no-results" *ngIf="searchPerformed() && !trackingResult()">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-message">No se encontró la entrega con código: <strong>{{ trackingCode }}</strong></div>
        </div>
      </div>

      <!-- 📋 Active Deliveries List -->
      <div class="active-deliveries" *ngIf="showActiveDeliveries()">
        <h3>🚚 Entregas Activas ({{ activeDeliveries().length }})</h3>

        <div class="deliveries-grid">
          <div
            *ngFor="let delivery of activeDeliveries()"
            class="delivery-card"
            [ngClass]="'status-' + delivery.status">

            <!-- Header -->
            <div class="delivery-header">
              <div class="tracking-code">{{ delivery.trackingCode }}</div>
              <div class="status-badge" [ngClass]="getStatusClass(delivery.status)">
                {{ getStatusLabel(delivery.status) }}
              </div>
            </div>

            <!-- Client Info -->
            <div class="client-info">
              <div class="client-id">Cliente: {{ delivery.clientId }}</div>
              <div class="priority" [ngClass]="'priority-' + delivery.metadata.priority">
                {{ getPriorityLabel(delivery.metadata.priority) }}
              </div>
            </div>

            <!-- Delivery Window -->
            <div class="delivery-window">
              <div class="window-date">{{ formatDate(delivery.deliveryDate) }}</div>
              <div class="window-time">
                {{ formatTime(delivery.window.start) }} - {{ formatTime(delivery.window.end) }}
              </div>
              <div class="eta" *ngIf="delivery.window.estimatedArrival">
                ETA: {{ formatTime(delivery.window.estimatedArrival) }}
              </div>
            </div>

            <!-- Address -->
            <div class="delivery-address">
              📍 {{ delivery.location.address }}
            </div>

            <!-- Actions -->
            <div class="delivery-actions">
              <button
                (click)="updateETA(delivery.id)"
                class="btn btn-sm btn-primary"
                [disabled]="delivery.status === 'delivered'">
                🕐 Actualizar ETA
              </button>
              <button
                (click)="viewDetails(delivery)"
                class="btn btn-sm btn-outline">
                👁️ Ver Detalles
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-deliveries" *ngIf="activeDeliveries().length === 0">
          <div class="empty-icon">📦</div>
          <div class="empty-message">No hay entregas activas en este momento</div>
        </div>
      </div>

      <!-- 🔄 System Status -->
      <div class="system-status" *ngIf="showSystemStatus()">
        <div class="status-header">
          <span class="status-icon" [ngClass]="{'online': deliveryService.isTracking(), 'offline': !deliveryService.isTracking()}">
            {{ deliveryService.isTracking() ? '🟢' : '🔴' }}
          </span>
          <span class="status-text">
            Sistema {{ deliveryService.isTracking() ? 'Activo' : 'Inactivo' }}
          </span>
        </div>

        <div class="last-sync" *ngIf="deliveryService.lastETASync()">
          Última sincronización: {{ formatRelativeTime(deliveryService.lastETASync()!) }}
        </div>

        <div class="reliability-meter">
          <div class="reliability-label">Fiabilidad del sistema</div>
          <div class="reliability-bar">
            <div
              class="reliability-fill"
              [style.width.%]="deliveryService.trackingReliability()"
              [ngClass]="getReliabilityClass(deliveryService.trackingReliability())">
            </div>
          </div>
          <div class="reliability-value">{{ deliveryService.trackingReliability() }}%</div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './delivery-tracker.component.css'
})
export class DeliveryTrackerComponent {
  @Input() showMetrics = signal(true);
  @Input() showTrackingInput = signal(true);
  @Input() showActiveDeliveries = signal(true);
  @Input() showSystemStatus = signal(true);

  @Output() deliverySelected = new EventEmitter<DeliveryCommitment>();
  @Output() etaUpdateRequested = new EventEmitter<string>();

  // Injected service
  deliveryService = inject(DeliveryTrackingService);

  // Component state
  trackingCode = '';
  searchPerformed = signal(false);
  trackingResult = signal<{
    commitment: DeliveryCommitment | null;
    latestETA: ETAUpdate | null;
    history: ETAUpdate[];
  } | null>(null);

  // Computed data
  metrics = signal<DeliveryMetrics | null>(null);
  activeDeliveries = signal<DeliveryCommitment[]>([]);

  // Expose Math for template
  Math = Math;

  constructor() {
    this.loadMetrics();
    this.loadActiveDeliveries();
  }

  trackByCode(): void {
    if (!this.trackingCode.trim()) return;

    this.searchPerformed.set(true);

    this.deliveryService.trackDelivery(this.trackingCode).subscribe({
      next: (result) => {
        this.trackingResult.set(result);
      },
      error: (error) => {
        console.error('Tracking error:', error);
        this.trackingResult.set(null);
      }
    });
  }

  updateETA(commitmentId: string): void {
    this.etaUpdateRequested.emit(commitmentId);
  }

  viewDetails(delivery: DeliveryCommitment): void {
    this.deliverySelected.emit(delivery);
  }

  private loadMetrics(): void {
    this.deliveryService.getDeliveryMetrics().subscribe({
      next: (metrics) => {
        this.metrics.set(metrics);
      },
      error: (error) => {
        console.error('Failed to load delivery metrics:', error);
      }
    });
  }

  private loadActiveDeliveries(): void {
    this.deliveryService.getDeliveryCommitments({
      status: 'en_route' // Can be expanded to include other active statuses
    }).subscribe({
      next: (deliveries) => {
        this.activeDeliveries.set(deliveries);
      },
      error: (error) => {
        console.error('Failed to load active deliveries:', error);
      }
    });
  }

  // Template helper methods
  getStatusClass(status?: DeliveryCommitment['status']): string {
    const statusClasses: Record<string, string> = {
      'scheduled': 'status-scheduled',
      'en_route': 'status-en-route',
      'arriving': 'status-arriving',
      'delivered': 'status-delivered',
      'failed': 'status-failed',
      'rescheduled': 'status-rescheduled'
    };
    return statusClasses[status || ''] || '';
  }

  getStatusLabel(status?: DeliveryCommitment['status']): string {
    const statusLabels: Record<string, string> = {
      'scheduled': 'Programada',
      'en_route': 'En camino',
      'arriving': 'Llegando',
      'delivered': 'Entregada',
      'failed': 'Fallida',
      'rescheduled': 'Reprogramada'
    };
    return statusLabels[status || ''] || 'Desconocido';
  }

  getPriorityLabel(priority?: DeliveryCommitment['metadata']['priority']): string {
    const priorityLabels: Record<string, string> = {
      'normal': 'Normal',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return priorityLabels[priority || 'normal'] || 'Normal';
  }

  getTrafficLabel(traffic?: ETAUpdate['factors']['traffic']): string {
    const trafficLabels: Record<string, string> = {
      'light': 'Ligero',
      'moderate': 'Moderado',
      'heavy': 'Pesado'
    };
    return trafficLabels[traffic || 'light'] || 'Desconocido';
  }

  getWeatherLabel(weather?: ETAUpdate['factors']['weather']): string {
    const weatherLabels: Record<string, string> = {
      'clear': 'Despejado',
      'rain': 'Lluvia',
      'adverse': 'Adverso'
    };
    return weatherLabels[weather || 'clear'] || 'Desconocido';
  }

  getRouteLabel(route?: ETAUpdate['factors']['route']): string {
    const routeLabels: Record<string, string> = {
      'optimal': 'Óptima',
      'detour': 'Desvío',
      'blocked': 'Bloqueada'
    };
    return routeLabels[route || 'optimal'] || 'Desconocida';
  }

  getReliabilityClass(reliability: number): string {
    if (reliability >= 95) return 'excellent';
    if (reliability >= 85) return 'good';
    if (reliability >= 75) return 'warning';
    return 'critical';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-MX');
  }

  formatTime(timeStr?: string): string {
    if (!timeStr) return '';
    return new Date(timeStr).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(dateTimeStr?: string): string {
    if (!dateTimeStr) return '';
    return new Date(dateTimeStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatRelativeTime(dateTimeStr: string): string {
    const now = new Date();
    const time = new Date(dateTimeStr);
    const diffMs = now.getTime() - time.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} días`;
  }
}