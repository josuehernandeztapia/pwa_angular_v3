import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineService } from '../../../services/offline.service';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Connection Status Banner -->
    <div
      *ngIf="showIndicator()"
      class="connection-banner"
      [class]="getBannerClass()">

      <div class="banner-content">
        <div class="status-icon">
          {{ getStatusIcon() }}
        </div>

        <div class="status-info">
          <div class="status-title">{{ getStatusTitle() }}</div>
          <div class="status-subtitle">{{ getStatusSubtitle() }}</div>
        </div>

        <!-- Pending Sync Indicator -->
        <div class="sync-indicator" *ngIf="offlineService.pendingRequests$ | async as pending">
          <span *ngIf="pending.length > 0" class="pending-count">
            {{ pending.length }} pendiente{{ pending.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Connection Quality -->
        <div class="connection-quality" *ngIf="isOnline()">
          <div class="quality-dots">
            <span
              class="quality-dot"
              [class.active]="getQualityLevel() >= 1"></span>
            <span
              class="quality-dot"
              [class.active]="getQualityLevel() >= 2"></span>
            <span
              class="quality-dot"
              [class.active]="getQualityLevel() >= 3"></span>
            <span
              class="quality-dot"
              [class.active]="getQualityLevel() >= 4"></span>
          </div>
        </div>

        <!-- Dismiss Button -->
        <button
          *ngIf="canDismiss()"
          class="dismiss-btn"
          (click)="dismiss()"
          aria-label="Cerrar indicador">
          ✕
        </button>
      </div>
    </div>

    <!-- Floating Status Pill (minimized) -->
    <div
      *ngIf="!showIndicator() && shouldShowPill()"
      class="status-pill"
      [class]="getPillClass()"
      (click)="expand()">

      <span class="pill-icon">{{ getStatusIcon() }}</span>
      <span class="pill-text">{{ getPillText() }}</span>

      <!-- Pending indicator dot -->
      <span
        *ngIf="hasPendingRequests()"
        class="pending-dot">
      </span>
    </div>
  `,
  styles: [`
    /* Connection Banner */
    .connection-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 12px 16px;
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      animation: slideDown 0.3s ease;
    }

    .connection-banner.online {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.9));
      color: white;
    }

    .connection-banner.offline {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
      color: white;
    }

    .connection-banner.reconnecting {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95));
      color: white;
    }

    .connection-banner.poor {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95));
      color: white;
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .status-icon {
      font-size: 20px;
      animation: pulse 2s infinite;
    }

    .status-info {
      flex: 1;
    }

    .status-title {
      font-weight: 600;
      font-size: 14px;
    }

    .status-subtitle {
      font-size: 12px;
      opacity: 0.9;
    }

    .sync-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pending-count {
      font-size: 12px;
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    /* Connection Quality Dots */
    .connection-quality {
      display: flex;
      align-items: center;
    }

    .quality-dots {
      display: flex;
      gap: 2px;
    }

    .quality-dot {
      width: 4px;
      height: 12px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      transition: all 0.2s ease;
    }

    .quality-dot.active {
      background: rgba(255, 255, 255, 0.9);
    }

    .dismiss-btn {
      background: none;
      border: none;
      color: inherit;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s ease;
      padding: 4px;
      border-radius: 4px;
    }

    .dismiss-btn:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Status Pill (floating) */
    .status-pill {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideUp 0.3s ease;
    }

    .status-pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .status-pill.online {
      background: rgba(34, 197, 94, 0.9);
      color: white;
    }

    .status-pill.offline {
      background: rgba(239, 68, 68, 0.95);
      color: white;
    }

    .status-pill.poor {
      background: rgba(245, 158, 11, 0.95);
      color: white;
    }

    .pill-icon {
      font-size: 14px;
    }

    .pill-text {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .pending-dot {
      width: 8px;
      height: 8px;
      background: #fbbf24;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    /* Animations */
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    /* Mobile responsiveness */
    @media (max-width: 640px) {
      .connection-banner {
        padding: 10px 12px;
      }

      .status-title {
        font-size: 13px;
      }

      .status-subtitle {
        font-size: 11px;
      }

      .status-pill {
        bottom: 16px;
        right: 16px;
        padding: 6px 10px;
      }

      .quality-dots {
        display: none; /* Hide on mobile to save space */
      }
    }
  `]
})
export class OfflineIndicatorComponent {
  private expanded = signal(false);
  private dismissed = signal(false);
  private lastStatusChange = signal(Date.now());

  constructor(public offlineService: OfflineService) {
    // React to connection changes
    this.offlineService.online$.subscribe(isOnline => {
      this.lastStatusChange.set(Date.now());
      if (!isOnline) {
        // Always show when going offline
        this.dismissed.set(false);
        this.expanded.set(true);
      } else {
        // Auto-expand briefly when coming back online
        this.expanded.set(true);
        // Auto-dismiss after 3 seconds if no pending requests
        setTimeout(() => {
          if (!this.hasPendingRequests()) {
            this.expanded.set(false);
          }
        }, 3000);
      }
    });
  }

  isOnline = computed(() => this.offlineService.isOnline());

  showIndicator = computed(() =>
    this.expanded() && !this.dismissed()
  );

  shouldShowPill = computed(() => {
    const timeSinceChange = Date.now() - this.lastStatusChange();
    return !this.isOnline() ||
           this.hasPendingRequests() ||
           (this.getConnectionQuality() === 'poor' && timeSinceChange > 5000);
  });

  canDismiss = computed(() =>
    this.isOnline() && !this.hasPendingRequests()
  );

  getStatusIcon(): string {
    if (!this.isOnline()) return '📡';

    const quality = this.getConnectionQuality();
    switch (quality) {
      case 'excellent': return '🟢';
      case 'good': return '🔵';
      case 'fair': return '🟡';
      case 'poor': return '🟠';
      default: return '🔵';
    }
  }

  getStatusTitle(): string {
    if (!this.isOnline()) {
      return 'Sin conexión a internet';
    }

    if (this.hasPendingRequests()) {
      return 'Sincronizando datos...';
    }

    const quality = this.getConnectionQuality();
    switch (quality) {
      case 'excellent': return 'Conexión excelente';
      case 'good': return 'Conexión estable';
      case 'fair': return 'Conexión lenta';
      case 'poor': return 'Conexión muy lenta';
      default: return 'Conectado';
    }
  }

  getStatusSubtitle(): string {
    if (!this.isOnline()) {
      return 'Los cambios se guardarán localmente y se sincronizarán automáticamente';
    }

    if (this.hasPendingRequests()) {
      return 'Enviando datos pendientes al servidor';
    }

    const quality = this.getConnectionQuality();
    switch (quality) {
      case 'excellent': return 'Todas las funciones disponibles';
      case 'good': return 'Rendimiento óptimo';
      case 'fair': return 'Algunas funciones pueden ser más lentas';
      case 'poor': return 'Recomendamos usar WiFi para mejor experiencia';
      default: return 'Todo funcionando correctamente';
    }
  }

  getBannerClass(): string {
    if (!this.isOnline()) return 'offline';
    if (this.hasPendingRequests()) return 'reconnecting';

    const quality = this.getConnectionQuality();
    if (quality === 'poor' || quality === 'fair') return 'poor';

    return 'online';
  }

  getPillClass(): string {
    if (!this.isOnline()) return 'offline';

    const quality = this.getConnectionQuality();
    if (quality === 'poor' || quality === 'fair') return 'poor';

    return 'online';
  }

  getPillText(): string {
    if (!this.isOnline()) return 'Sin conexión';
    if (this.hasPendingRequests()) return 'Sincronizando';

    const quality = this.getConnectionQuality();
    switch (quality) {
      case 'poor': return 'Conexión lenta';
      case 'fair': return 'Conexión lenta';
      default: return 'Conectado';
    }
  }

  getConnectionQuality(): string {
    return this.offlineService.getConnectionQuality();
  }

  getQualityLevel(): number {
    const quality = this.getConnectionQuality();
    switch (quality) {
      case 'excellent': return 4;
      case 'good': return 3;
      case 'fair': return 2;
      case 'poor': return 1;
      default: return 0;
    }
  }

  hasPendingRequests(): boolean {
    const capabilities = this.offlineService.getOfflineCapabilities();
    return capabilities.pendingCount > 0;
  }

  expand(): void {
    this.expanded.set(true);
    this.dismissed.set(false);
  }

  dismiss(): void {
    this.dismissed.set(true);
  }
}