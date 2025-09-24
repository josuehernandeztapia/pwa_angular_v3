import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineService } from '../../../services/offline.service';

@Component({
  selector: 'app-connection-indicator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Desktop Connection Indicator -->
    <div class="hidden sm:block fixed top-4 right-4 z-50">
      <div
        class="flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300"
        [ngClass]="indicatorClasses()"
      >
        <!-- Connection Icon -->
        <div class="relative">
          <svg
            *ngIf="isOnline()"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
          </svg>
          <svg
            *ngIf="!isOnline()"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636L5.636 18.364m0-12.728l12.728 12.728M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
          </svg>

          <!-- Pulse Animation for Poor Connection -->
          <div
            *ngIf="connectionQuality() === 'poor' && isOnline()"
            class="absolute -inset-1 rounded-full bg-yellow-400 animate-ping opacity-25"
          ></div>
        </div>

        <!-- Status Text -->
        <span>{{ statusText() }}</span>

        <!-- Pending Count Badge -->
        <div
          *ngIf="pendingCount() > 0"
          class="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold"
        >
          {{ pendingCount() }}
        </div>
      </div>
    </div>

    <!-- Mobile Bottom Banner -->
    <div
      *ngIf="!isOnline()"
      class="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white p-4 transform transition-transform duration-300"
      [class.translate-y-full]="!showMobileBanner()"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <div>
            <div class="text-sm font-medium">Sin conexión</div>
            <div class="text-xs opacity-90">Los datos se guardan automáticamente</div>
          </div>
        </div>

        <button
          class="text-white/70 hover:text-white p-1"
          (click)="dismissMobileBanner()"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Toast Notifications for Connection Changes -->
    <div
      *ngIf="showConnectionToast()"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 transform transition-all duration-300"
      [class.translate-y-full]="!showConnectionToast()"
    >
      <div
        class="rounded-lg shadow-lg p-4 flex items-center space-x-3"
        [ngClass]="toastClasses()"
      >
        <div class="flex-shrink-0">
          <svg
            *ngIf="isOnline()"
            class="w-6 h-6 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <svg
            *ngIf="!isOnline()"
            class="w-6 h-6 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>

        <div class="flex-1">
          <div class="text-sm font-medium text-gray-900 dark:text-white">
            {{ toastTitle() }}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {{ toastMessage() }}
          </div>
        </div>

        <button
          class="text-neutral-100 hover:text-gray-600 dark:hover:text-gray-300"
          (click)="dismissToast()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  `
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

  public readonly indicatorClasses = computed(() => {
    const quality = this.connectionQuality();
    const isOnline = this.isOnline();

    if (!isOnline) {
      return 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
    }

    switch (quality) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'poor':
        return 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      default:
        return 'bg-neutral-100 text-gray-800 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
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

  public readonly toastClasses = computed(() => {
    return this.isOnline()
      ? 'bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 shadow-lg'
      : 'bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 shadow-lg';
  });

  public readonly toastTitle = computed(() => {
    return this.isOnline() ? 'Conexión restaurada' : 'Conexión perdida';
  });

  public readonly toastMessage = computed(() => {
    return this.isOnline()
      ? 'Sincronizando datos pendientes...'
      : 'Los datos se guardan automáticamente';
  });

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