import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { OfflineService } from '../../../services/offline.service';

@Component({
  selector: 'app-connection-indicator',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connection-indicator.component.html',
  styleUrls: ['./connection-indicator.component.scss'],
})
export class ConnectionIndicatorComponent {
  // Signals para estado interno
  private readonly mobileBannerVisible = signal(true);
  private readonly toastVisible = signal(false);
  private readonly lastConnectionState = signal<boolean | null>(null);

  // Computed properties del servicio offline
  public readonly isOnline = computed(() => this.offlineService.isOnline());
  public readonly connectionStatus = computed(() => this.offlineService.connectionStatus());
  public readonly offlineCapabilities = computed(() => this.offlineService.getOfflineCapabilities());

  // Computed properties locales
  public readonly connectionQuality = computed(() => this.offlineService.getConnectionQuality());
  public readonly pendingCount = computed(() => this.offlineCapabilities().pendingCount);

  public readonly showMobileBanner = computed(() => {
    return !this.isOnline() && this.mobileBannerVisible();
  });

  public readonly showConnectionToast = computed(() => {
    return this.toastVisible();
  });

  public readonly statusText = computed(() => {
    const quality = this.connectionQuality();
    const isOnline = this.isOnline();

    if (!isOnline) {
      return 'Sin conexión';
    }

    switch (quality) {
      case 'excellent':
        return 'Conexión excelente';
      case 'good':
        return 'Buena conexión';
      case 'fair':
        return 'Conexión regular';
      case 'poor':
        return 'Conexión lenta';
      default:
        return 'Conectado';
    }
  });

  public readonly toastTitle = computed(() => {
    return this.isOnline() ? 'Conexión restaurada' : 'Conexión perdida';
  });

  public readonly toastMessage = computed(() => {
    return this.isOnline()
      ? 'Sincronizando datos pendientes...'
      : 'Los datos se guardan automáticamente';
  });

  public getDesktopCardClasses(): Record<string, boolean> {
    const quality = this.connectionQuality();
    const isOnline = this.isOnline();

    return {
      'connection-indicator__card--offline': !isOnline,
      'connection-indicator__card--excellent': isOnline && quality === 'excellent',
      'connection-indicator__card--good': isOnline && quality === 'good',
      'connection-indicator__card--fair': isOnline && quality === 'fair',
      'connection-indicator__card--poor': isOnline && quality === 'poor',
      'connection-indicator__card--neutral': isOnline && !['excellent', 'good', 'fair', 'poor'].includes(quality ?? '')
    };
  }

  public getMobileBannerClasses(): Record<string, boolean> {
    return {
      'connection-indicator__mobile--hidden': !this.showMobileBanner(),
    };
  }

  public getToastVisibilityClasses(): Record<string, boolean> {
    return {
      'connection-indicator__toast--visible': this.showConnectionToast(),
      'connection-indicator__toast--hidden': !this.showConnectionToast(),
    };
  }

  public getToastCardClasses(): Record<string, boolean> {
    return {
      'connection-indicator__toast-card--online': this.isOnline(),
      'connection-indicator__toast-card--offline': !this.isOnline(),
    };
  }

  public getPendingCountLabel(count: number): string {
    const plural = count === 1 ? 'pendiente' : 'pendientes';
    return `${count} ${plural}`;
  }

  constructor(private offlineService: OfflineService) {
    // Monitorear cambios de conexión para mostrar toast
    this.offlineService.online$.subscribe(isOnline => {
      const wasOnline = this.lastConnectionState();

      // Solo mostrar toast si hay un cambio real de estado
      if (wasOnline !== null && wasOnline !== isOnline) {
        this.showToast();
      }

      this.lastConnectionState.set(isOnline);
    });
  }

  public dismissMobileBanner(): void {
    this.mobileBannerVisible.set(false);
  }

  public dismissToast(): void {
    this.toastVisible.set(false);
  }

  private showToast(): void {
    this.toastVisible.set(true);

    // Auto-hide después de 5 segundos
    setTimeout(() => {
      this.toastVisible.set(false);
    }, 5000);
  }
}
