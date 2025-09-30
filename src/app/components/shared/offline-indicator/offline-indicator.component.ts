import { Component, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';
import { OfflineService } from '../../../services/offline.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './offline-indicator.component.html',
  styleUrls: ['./offline-indicator.component.scss']
})
export class OfflineIndicatorComponent implements OnDestroy {
  private expanded = signal(false);
  private dismissed = signal(false);
  private lastStatusChange = signal(Date.now());
  private destroy$ = new Subject<void>();
  private autoDismissTimeoutId: number | null = null;

  constructor(public offlineService: OfflineService) {
    // React to connection changes
    this.offlineService.online$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOnline => {
      this.lastStatusChange.set(Date.now());
      if (!isOnline) {
        // Always show when going offline
        this.dismissed.set(false);
        this.expanded.set(true);
        this.clearAutoDismissTimer();
      } else {
        // Auto-expand briefly when coming back online
        this.expanded.set(true);
        // Auto-dismiss after 3 seconds if no pending requests
        this.clearAutoDismissTimer();
        this.autoDismissTimeoutId = window.setTimeout(() => {
          if (!this.hasPendingRequests()) {
            this.expanded.set(false);
          }
          this.autoDismissTimeoutId = null;
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

  readonly qualityLevels = [1, 2, 3, 4];

  getStatusIconName(): IconName {
    return this.isOnline() ? 'dot' : 'offline';
  }

  getStatusIconClasses(): string[] {
    const classes: string[] = [];

    if (!this.isOnline()) {
      classes.push('offline-indicator__glyph--offline');
      return classes;
    }

    const quality = this.getConnectionQuality();
    classes.push('offline-indicator__glyph--online');

    if (quality === 'excellent' || quality === 'good' || quality === 'fair' || quality === 'poor') {
      classes.push(`offline-indicator__glyph--${quality}`);
    }

    if (this.hasPendingRequests()) {
      classes.push('offline-indicator__glyph--syncing');
    }

    return classes;
  }

  getStatusIconStroke(): string {
    return this.isOnline() ? '0' : '2';
  }

  getStatusIconSize(isPill = false): number {
    if (this.isOnline()) {
      return isPill ? 10 : 12;
    }
    return isPill ? 14 : 20;
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
      default: return 'Estado de conexión desconocido';
    }
  }

  getBannerClasses(): Record<string, boolean> {
    const state = this.resolveConnectionState();
    return {
      [`offline-indicator__banner--${state}`]: true,
    };
  }

  getPillClasses(): Record<string, boolean> {
    const state = this.resolveConnectionState();
    return {
      [`offline-indicator__pill--${state}`]: true,
    };
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

  private resolveConnectionState(): 'offline' | 'reconnecting' | 'poor' | 'online' {
    if (!this.isOnline()) {
      return 'offline';
    }

    if (this.hasPendingRequests()) {
      return 'reconnecting';
    }

    const quality = this.getConnectionQuality();
    if (quality === 'poor' || quality === 'fair') {
      return 'poor';
    }

    return 'online';
  }

  expand(): void {
    this.expanded.set(true);
    this.dismissed.set(false);
  }

  dismiss(): void {
    this.dismissed.set(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAutoDismissTimer();
  }

  private clearAutoDismissTimer(): void {
    if (this.autoDismissTimeoutId !== null) {
      window.clearTimeout(this.autoDismissTimeoutId);
      this.autoDismissTimeoutId = null;
    }
  }
}
