import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DeliveryCommitment,
  DeliveryMetrics,
  DeliveryTrackingService,
  ETAUpdate
} from '../../../services/delivery-tracking.service';

@Component({
  selector: 'app-delivery-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-tracker.component.html',
  styleUrls: ['./delivery-tracker.component.scss']
})
export class DeliveryTrackerComponent {
  loading = false;
  eta = 75;

  @Input() showMetrics = signal(true);
  @Input() showTrackingInput = signal(true);
  @Input() showActiveDeliveries = signal(true);
  @Input() showSystemStatus = signal(true);

  @Output() deliverySelected = new EventEmitter<DeliveryCommitment>();
  @Output() etaUpdateRequested = new EventEmitter<string>();

  deliveryService = inject(DeliveryTrackingService);

  trackingCode = '';
  searchPerformed = signal(false);
  trackingResult = signal<{
    commitment: DeliveryCommitment | null;
    latestETA: ETAUpdate | null;
    history: ETAUpdate[];
  } | null>(null);

  metrics = signal<DeliveryMetrics | null>(null);
  activeDeliveries = signal<DeliveryCommitment[]>([]);

  Math = Math;

  constructor() {
    this.loadMetrics();
    this.loadActiveDeliveries();
    this.initializeMinimalista();
  }

  private initializeMinimalista(): void {
    this.loading = true;

    setTimeout(() => {
      this.loading = false;
      this.eta = Math.floor(Math.random() * 120) + 1;
    }, 1500);
  }

  trackByCode(): void {
    if (!this.trackingCode.trim()) return;

    this.searchPerformed.set(true);

    this.deliveryService.trackDelivery(this.trackingCode).subscribe({
      next: (result) => {
        this.trackingResult.set(result);
      },
      error: () => {
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
      next: (metrics) => this.metrics.set(metrics),
      error: () => undefined
    });
  }

  private loadActiveDeliveries(): void {
    this.deliveryService.getDeliveryCommitments({ status: 'en_route' }).subscribe({
      next: (deliveries) => this.activeDeliveries.set(deliveries),
      error: () => undefined
    });
  }

  getStatusClass(status?: DeliveryCommitment['status']): string {
    const statusClasses: Record<string, string> = {
      scheduled: 'status-scheduled',
      en_route: 'status-en-route',
      arriving: 'status-arriving',
      delivered: 'status-delivered',
      failed: 'status-failed',
      rescheduled: 'status-rescheduled'
    };
    return statusClasses[status || ''] || '';
  }

  getStatusLabel(status?: DeliveryCommitment['status']): string {
    const statusLabels: Record<string, string> = {
      scheduled: 'Programada',
      en_route: 'En camino',
      arriving: 'Llegando',
      delivered: 'Entregada',
      failed: 'Fallida',
      rescheduled: 'Reprogramada'
    };
    return statusLabels[status || ''] || 'Desconocido';
  }

  getPriorityLabel(priority?: DeliveryCommitment['metadata']['priority']): string {
    const priorityLabels: Record<string, string> = {
      normal: 'Normal',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return priorityLabels[priority || 'normal'] || 'Normal';
  }

  getTrafficLabel(traffic?: ETAUpdate['factors']['traffic']): string {
    const trafficLabels: Record<string, string> = {
      light: 'Ligero',
      moderate: 'Moderado',
      heavy: 'Pesado'
    };
    return trafficLabels[traffic || 'light'] || 'Desconocido';
  }

  getWeatherLabel(weather?: ETAUpdate['factors']['weather']): string {
    const weatherLabels: Record<string, string> = {
      clear: 'Despejado',
      rain: 'Lluvia',
      adverse: 'Adverso'
    };
    return weatherLabels[weather || 'clear'] || 'Desconocido';
  }

  getRouteLabel(route?: ETAUpdate['factors']['route']): string {
    const routeLabels: Record<string, string> = {
      optimal: 'Óptima',
      detour: 'Desvío',
      blocked: 'Bloqueada'
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
