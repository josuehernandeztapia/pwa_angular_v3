import { Component, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineService } from '../../../services/offline.service';
import { Router } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./offline.component.scss'],
  templateUrl: './offline.component.html'
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
    // Por ahora, usamos console
    if (type === 'success') {
    } else {
    }
  }
}
