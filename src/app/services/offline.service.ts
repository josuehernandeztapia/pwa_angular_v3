import { Injectable, signal, computed } from '@angular/core';
import { fromEvent, merge, Observable, BehaviorSubject } from 'rxjs';
import { map, startWith, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface OfflineData {
  timestamp: number;
  data: any;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export interface ConnectionStatus {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastChanged: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  private readonly STORAGE_PREFIX = 'offline_';
  private readonly MAX_OFFLINE_STORAGE = 50; // Máximo 50 requests almacenados
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

  // Signals para estado reactivo
  public readonly connectionStatus = signal<ConnectionStatus>({
    isOnline: navigator.onLine,
    lastChanged: Date.now()
  });

  // Computed properties
  public readonly isOnline = computed(() => this.connectionStatus().isOnline);
  public readonly isOffline = computed(() => !this.connectionStatus().isOnline);

  // Observables tradicionales para compatibilidad
  private connectionSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public readonly online$ = this.connectionSubject.asObservable();
  public readonly offline$ = this.online$.pipe(map(online => !online));

  // Queue de requests pendientes
  private pendingRequests: OfflineData[] = [];
  private readonly pendingRequestsSubject = new BehaviorSubject<OfflineData[]>([]);
  public readonly pendingRequests$ = this.pendingRequestsSubject.asObservable();

  constructor() {
    this.initializeConnectivityMonitoring();
    this.loadPendingRequests();
    this.setupConnectionHandlers();
  }

  private initializeConnectivityMonitoring(): void {
    if (!environment.features.enableOfflineMode) {
      return;
    }

    // Combinación de eventos online/offline
    const onlineEvents$ = fromEvent(window, 'online').pipe(map(() => true));
    const offlineEvents$ = fromEvent(window, 'offline').pipe(map(() => false));

    // Observable combinado con debounce para evitar spam
    merge(onlineEvents$, offlineEvents$)
      .pipe(
        startWith(navigator.onLine),
        debounceTime(100),
        distinctUntilChanged()
      )
      .subscribe(isOnline => {
        this.updateConnectionStatus(isOnline);
      });

    // Network Information API si está disponible
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.updateNetworkInfo();
        connection.addEventListener('change', () => {
          this.updateNetworkInfo();
        });
      }
    }
  }

  private updateConnectionStatus(isOnline: boolean): void {
    const currentStatus = this.connectionStatus();

    if (currentStatus.isOnline !== isOnline) {
      this.connectionStatus.set({
        ...currentStatus,
        isOnline,
        lastChanged: Date.now()
      });

      this.connectionSubject.next(isOnline);

      if (isOnline) {
// removed by clean-audit
        this.processPendingRequests();
      } else {
// removed by clean-audit
      }
    }
  }

  private updateNetworkInfo(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const currentStatus = this.connectionStatus();

      this.connectionStatus.set({
        ...currentStatus,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });
    }
  }

  private setupConnectionHandlers(): void {
    // Auto-sync cuando se restaura la conexión
    this.online$.subscribe(isOnline => {
      if (isOnline && this.pendingRequests.length > 0) {
        setTimeout(() => this.processPendingRequests(), 1000);
      }
    });

    // Limpieza periódica de cache
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 60 * 1000); // Cada hora
  }

  // Almacenar request para procesamiento offline
  public storeOfflineRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    data?: any
  ): void {
    if (!environment.features.enableOfflineMode) {
      return;
    }

    const offlineData: OfflineData = {
      timestamp: Date.now(),
      endpoint,
      method,
      data
    };

    // Agregar a la queue
    this.pendingRequests.push(offlineData);

    // Limitar tamaño de la queue
    if (this.pendingRequests.length > this.MAX_OFFLINE_STORAGE) {
      this.pendingRequests.shift(); // Remove oldest
    }

    // Persistir en localStorage
    this.savePendingRequests();
    this.pendingRequestsSubject.next([...this.pendingRequests]);

// removed by clean-audit
  }

  // Procesar requests pendientes cuando vuelve la conexión
  private async processPendingRequests(): Promise<void> {
    if (this.pendingRequests.length === 0) {
      return;
    }

// removed by clean-audit
    const requests = [...this.pendingRequests];
    this.pendingRequests = [];
    this.pendingRequestsSubject.next([]);

    for (const request of requests) {
      try {
        // Aquí normalmente harías la llamada real al API
        // Por ahora, simulamos el procesamiento
        await this.simulateApiCall(request);
// removed by clean-audit
      } catch (error) {
// removed by clean-audit
        // Re-agregar a la queue si falla
        this.pendingRequests.push(request);
      }
    }

    this.savePendingRequests();
    this.pendingRequestsSubject.next([...this.pendingRequests]);
  }

  private async simulateApiCall(request: OfflineData): Promise<void> {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simular 90% de éxito
    if (Math.random() < 0.9) {
      return Promise.resolve();
    } else {
      throw new Error('Simulated network error');
    }
  }

  // Cache management
  public cacheData(key: string, data: any, ttl: number = this.CACHE_DURATION): void {
    if (!environment.features.enableOfflineMode) {
      return;
    }

    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    try {
      localStorage.setItem(`${this.STORAGE_PREFIX}cache_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
// removed by clean-audit
    }
  }

  public getCachedData<T>(key: string): T | null {
    if (!environment.features.enableOfflineMode) {
      return null;
    }

    try {
      const cached = localStorage.getItem(`${this.STORAGE_PREFIX}cache_${key}`);
      if (!cached) {
        return null;
      }

      const cacheEntry = JSON.parse(cached);
      const isExpired = Date.now() - cacheEntry.timestamp > cacheEntry.ttl;

      if (isExpired) {
        localStorage.removeItem(`${this.STORAGE_PREFIX}cache_${key}`);
        return null;
      }

      return cacheEntry.data as T;
    } catch (error) {
// removed by clean-audit
      return null;
    }
  }

  public clearCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`${this.STORAGE_PREFIX}cache_`)) {
        localStorage.removeItem(key);
      }
    });
// removed by clean-audit
  }

  private cleanupExpiredCache(): void {
    const keys = Object.keys(localStorage);
    let cleanedCount = 0;

    keys.forEach(key => {
      if (key.startsWith(`${this.STORAGE_PREFIX}cache_`)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheEntry = JSON.parse(cached);
            const isExpired = Date.now() - cacheEntry.timestamp > cacheEntry.ttl;

            if (isExpired) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    });

    if (cleanedCount > 0) {
// removed by clean-audit
    }
  }

  private savePendingRequests(): void {
    try {
      localStorage.setItem(
        `${this.STORAGE_PREFIX}pending`,
        JSON.stringify(this.pendingRequests)
      );
    } catch (error) {
// removed by clean-audit
    }
  }

  private loadPendingRequests(): void {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}pending`);
      if (stored) {
        this.pendingRequests = JSON.parse(stored);
        this.pendingRequestsSubject.next([...this.pendingRequests]);
// removed by clean-audit
      }
    } catch (error) {
// removed by clean-audit
      this.pendingRequests = [];
    }
  }

  // Utility methods
  public getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    const status = this.connectionStatus();

    if (!status.isOnline) {
      return 'offline';
    }

    if (!status.rtt || !status.downlink) {
      return 'good'; // Default when network info not available
    }

    if (status.rtt < 150 && status.downlink > 5) {
      return 'excellent';
    } else if (status.rtt < 300 && status.downlink > 1.5) {
      return 'good';
    } else if (status.rtt < 600 && status.downlink > 0.5) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  public getOfflineCapabilities(): {
    canCache: boolean;
    canQueue: boolean;
    storageAvailable: boolean;
    pendingCount: number;
  } {
    return {
      canCache: environment.features.enableOfflineMode && 'localStorage' in window,
      canQueue: environment.features.enableOfflineMode,
      storageAvailable: this.checkStorageAvailable(),
      pendingCount: this.pendingRequests.length
    };
  }

  private checkStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Force connectivity check (útil para testing)
  public async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Intentar hacer una request pequeña
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
// removed by clean-audit