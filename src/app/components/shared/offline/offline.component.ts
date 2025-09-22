import { Component, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineService } from '../../../services/offline.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 flex items-center justify-center">
      <div class="ui-card max-w-lg w-full text-center">
        <!-- Connection Status Icon -->
        <div class="mb-8">
          <div class="relative inline-flex">
            <div class="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636L5.636 18.364m12.728 0L5.636 5.636M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
              </svg>
            </div>
            <div class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-content animate-pulse">
              <span class="text-white text-xs font-bold mx-auto">!</span>
            </div>
          </div>
        </div>

        <!-- Status Message -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Sin conexión a internet
          </h1>
          <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
            No se pudo establecer conexión con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.
          </p>
        </div>

        <!-- Connection Quality & Offline Stats -->
        <div class="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div class="flex items-center justify-center space-x-2">
              <div class="w-2 h-2 bg-red-500 rounded-full"></div>
              <span class="text-gray-600 dark:text-gray-400">Estado: Desconectado</span>
            </div>
            <div class="flex items-center justify-center space-x-2">
              <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span class="text-gray-600 dark:text-gray-400">
                Pendientes: {{ offlineCapabilities().pendingCount }}
              </span>
            </div>
          </div>
        </div>

        <!-- Offline Features -->
        <div class="mb-8 space-y-3">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Mientras estás offline:
          </h3>

          <div class="space-y-3 text-sm text-left">
            <div class="flex items-start space-x-3">
              <div class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <span class="text-gray-600 dark:text-gray-400">
                Los datos se guardan automáticamente en tu dispositivo
              </span>
            </div>
            <div class="flex items-start space-x-3">
              <div class="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <span class="text-gray-600 dark:text-gray-400">
                Las acciones se sincronizarán cuando vuelvas a tener conexión
              </span>
            </div>
            <div class="flex items-start space-x-3">
              <div class="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <span class="text-gray-600 dark:text-gray-400">
                Puedes seguir navegando con los datos almacenados
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <button
            class="ui-btn ui-btn-primary w-full"
            (click)="checkConnection()"
            [disabled]="isChecking()"
          >
            <svg *ngIf="!isChecking()" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <svg *ngIf="isChecking()" class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isChecking() ? 'Verificando conexión...' : 'Verificar conexión' }}
          </button>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              class="ui-btn ui-btn-secondary"
              (click)="goToDashboard()"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Dashboard
            </button>

            <button
              class="ui-btn ui-btn-secondary"
              (click)="clearOfflineData()"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Limpiar caché
            </button>
          </div>
        </div>

        <!-- Network Tips -->
        <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h4 class="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            💡 Consejos para mejorar tu conexión:
          </h4>
          <ul class="text-xs text-blue-800 dark:text-blue-400 space-y-1 text-left">
            <li>• Verifica que el Wi-Fi esté habilitado</li>
            <li>• Intenta cambiar a datos móviles</li>
            <li>• Acércate al router o busca mejor señal</li>
            <li>• Reinicia tu router si es necesario</li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class OfflineComponent implements OnInit {
  // Signals para reactividad
  private readonly checking = signal(false);

  // Computed properties
  public readonly isChecking = computed(() => this.checking());
  public readonly connectionStatus = computed(() => this.offlineService.connectionStatus());
  public readonly offlineCapabilities = computed(() => this.offlineService.getOfflineCapabilities());

  constructor(
    private offlineService: OfflineService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Auto-check de conexión cada 30 segundos
    setInterval(() => {
      if (!this.checking()) {
        this.checkConnection();
      }
    }, 30000);

    // Escuchar cuando vuelve la conexión
    this.offlineService.online$.subscribe(isOnline => {
      if (isOnline) {
        // Pequeña delay para mostrar feedback visual
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      }
    });
  }

  async checkConnection(): Promise<void> {
    this.checking.set(true);

    try {
      // Usar el servicio para verificar conectividad
      const isConnected = await this.offlineService.checkConnectivity();

      if (isConnected) {
        // Redirigir al dashboard si hay conexión
        await this.router.navigate(['/dashboard']);
      } else {
        // Mostrar mensaje temporal de que sigue sin conexión
        this.showTemporaryMessage('Aún sin conexión', 'error');
      }
    } catch (error) {
// removed by clean-audit
      this.showTemporaryMessage('Error al verificar conexión', 'error');
    } finally {
      this.checking.set(false);
    }
  }

  goToDashboard(): void {
    // Navegar al dashboard incluso offline (con datos cacheados)
    this.router.navigate(['/dashboard']);
  }

  clearOfflineData(): void {
    this.offlineService.clearCache();
    this.showTemporaryMessage('Caché limpiado correctamente', 'success');
  }

  private showTemporaryMessage(message: string, type: 'success' | 'error'): void {
// removed by clean-audit
    // Por ahora, usamos console
    if (type === 'success') {
// removed by clean-audit
    } else {
// removed by clean-audit
    }
  }
}


// removed by clean-audit