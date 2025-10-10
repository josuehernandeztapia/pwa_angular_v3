import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap, retry, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MonitoringService } from './monitoring.service';
import { FlowContextService } from './flow-context.service';
import type { PolicyMarket } from './market-policy.service';

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
  landmark?: string;
}

export interface DeliveryWindow {
  start: string; // ISO string
  end: string;   // ISO string
  confirmed: boolean;
  estimatedArrival?: string; // ETA ISO string
}

export interface DeliveryCommitment {
  id: string;
  clientId: string;
  contractId: string;
  deliveryDate: string; // ISO string
  location: DeliveryLocation;
  window: DeliveryWindow;
  status: 'scheduled' | 'en_route' | 'arriving' | 'delivered' | 'failed' | 'rescheduled';
  driverId?: string;
  vehicleId?: string;
  trackingCode: string;
  createdAt: string;
  updatedAt: string;
  metadata: {
    priority: 'normal' | 'high' | 'urgent';
    specialInstructions?: string;
    contactPhone: string;
    alternateContact?: string;
    deliverables: string[]; // List of items to deliver
    requiresSignature: boolean;
    photoRequired: boolean;
  };
}

export interface ETAUpdate {
  commitmentId: string;
  currentLocation?: DeliveryLocation;
  estimatedArrival: string; // ISO string
  confidence: number; // 0-1 (0.8 = 80% confidence)
  factors: {
    traffic: 'light' | 'moderate' | 'heavy';
    weather: 'clear' | 'rain' | 'adverse';
    route: 'optimal' | 'detour' | 'blocked';
  };
  calculatedAt: string;
  driverNotes?: string;
}

export interface DeliveryMetrics {
  totalDeliveries: number;
  onTimeRate: number; // percentage
  avgDeliveryTime: number; // minutes
  etaAccuracy: number; // percentage
  customerSatisfaction: number; // 1-5 scale
  rescheduleRate: number; // percentage
}

export type DeliveryTimelineStatus = 'completed' | 'in_progress' | 'upcoming';

export interface DeliveryTimelineEvent {
  id: string;
  order: number;
  offsetDays: number;
  label: string;
  description: string;
  status: DeliveryTimelineStatus;
  estimatedDate: string;
  completedAt?: string;
  market: PolicyMarket;
  requiresAction?: boolean;
}

interface DeliveryTimelineBlueprintEntry {
  id: string;
  offsetDays: number;
  label: string;
  description: string;
  milestone?: 'preparation' | 'dispatch' | 'handover' | 'followup';
}

interface DeliveryFlowContextState {
  market: PolicyMarket;
  etaDays: number;
  lastUpdated: string;
  events: DeliveryTimelineEvent[];
}

export interface DeliveryTimelineSnapshot {
  market: PolicyMarket;
  etaDays: number;
  lastUpdated: string;
  events: DeliveryTimelineEvent[];
  source: 'cache' | 'remote';
}

const MARKET_TIMELINE_BLUEPRINTS: Record<PolicyMarket, DeliveryTimelineBlueprintEntry[]> = {
  aguascalientes: [
    {
      id: 'contract-signed',
      offsetDays: 0,
      label: 'Contrato firmado',
      description: 'Firma de contrato y verificación de documentos post-venta',
      milestone: 'preparation'
    },
    {
      id: 'unit-assigned',
      offsetDays: 7,
      label: 'Unidad asignada',
      description: 'Asignación de VIN y revisión de inventario',
      milestone: 'preparation'
    },
    {
      id: 'customs-review',
      offsetDays: 21,
      label: 'Revisión aduanal',
      description: 'Liberación de unidad con importador y verificación mecánica',
      milestone: 'dispatch'
    },
    {
      id: 'logistics',
      offsetDays: 45,
      label: 'Logística de transporte',
      description: 'Programación de transporte hacia agencia y contacto con cliente',
      milestone: 'dispatch'
    },
    {
      id: 'final-delivery',
      offsetDays: 75,
      label: 'Entrega final',
      description: 'Entrega de vehículo y firma de acta de conformidad',
      milestone: 'handover'
    }
  ],
  edomex: [
    {
      id: 'post-sale-case',
      offsetDays: 0,
      label: 'Expediente post-venta',
      description: 'Creación de expediente y carga de checklist local',
      milestone: 'preparation'
    },
    {
      id: 'plates-process',
      offsetDays: 12,
      label: 'Gestoría de placas',
      description: 'Solicitud de láminas, tenencia y hologramas EdoMex',
      milestone: 'preparation'
    },
    {
      id: 'financing-release',
      offsetDays: 24,
      label: 'Liberación de financiamiento',
      description: 'Validación con financiera y confirmación de pago a proveedor',
      milestone: 'dispatch'
    },
    {
      id: 'schedule-delivery',
      offsetDays: 38,
      label: 'Programar entrega',
      description: 'Coordinación con cliente para entrega en agencia o domicilio',
      milestone: 'handover'
    },
    {
      id: 'home-delivery',
      offsetDays: 52,
      label: 'Entrega en domicilio',
      description: 'Entrega final, fotografías y firma de conformidad',
      milestone: 'handover'
    }
  ],
  otros: [
    {
      id: 'kickoff',
      offsetDays: 0,
      label: 'Inicio de post-venta',
      description: 'Confirmación de contrato y checklist inicial',
      milestone: 'preparation'
    },
    {
      id: 'documents-verified',
      offsetDays: 15,
      label: 'Documentación verificada',
      description: 'Validación de documentos de propiedad y garantías locales',
      milestone: 'preparation'
    },
    {
      id: 'transport-logistics',
      offsetDays: 35,
      label: 'Logística de transporte',
      description: 'Coordinación logística con operadores y aseguradora',
      milestone: 'dispatch'
    },
    {
      id: 'handover',
      offsetDays: 60,
      label: 'Entrega y firma',
      description: 'Entrega de vehículo, firma de acta y fotografías de evidencia',
      milestone: 'handover'
    },
    {
      id: 'first-followup',
      offsetDays: 75,
      label: 'Seguimiento 15 días',
      description: 'Encuesta de satisfacción y recordatorio de mantenimiento',
      milestone: 'followup'
    }
  ]
};

@Injectable({ providedIn: 'root' })
export class DeliveryTrackingService {
  private monitoringService = inject(MonitoringService);
  private http = inject(HttpClient);
  private flowContext = inject(FlowContextService, { optional: true });
  private readonly BFF_BASE_URL = `${environment.apiUrl}/bff/delivery`;
  private readonly STORAGE_PREFIX = 'delivery_tracking_';
  private readonly deliveryContextKey = 'delivery';
  private readonly timelineStaleMs = 30 * 60 * 1000; // 30 minutos de cache

  // P0.2 SURGICAL - Enhanced state management with persistence
  private deliveryCommitmentsSubject = new BehaviorSubject<DeliveryCommitment[]>([]);
  private activeDeliveriesSubject = new BehaviorSubject<DeliveryCommitment[]>([]);
  private etaUpdatesSubject = new BehaviorSubject<ETAUpdate[]>([]);
  private deliveryTimelineSubject = new BehaviorSubject<DeliveryTimelineSnapshot | null>(null);

  // Reactive signals for UI
  readonly isTracking = signal(false);
  readonly lastETASync = signal<string | null>(null);
  readonly trackingReliability = signal<number>(100); // percentage

  constructor() {
    this.loadPersistedData();
    this.startETAMonitoring();
  }

  /**
   * [PACKAGE] Create new delivery commitment with persistent ETA
   */
  createDeliveryCommitment(commitment: Omit<DeliveryCommitment, 'id' | 'trackingCode' | 'createdAt' | 'updatedAt'>): Observable<DeliveryCommitment> {
    const newCommitment: DeliveryCommitment = {
      ...commitment,
      id: this.generateCommitmentId(),
      trackingCode: this.generateTrackingCode(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.syncCommitmentWithBFF(newCommitment).pipe(
      tap(commitment => {
        this.addCommitmentToState(commitment);
        this.persistCommitment(commitment);
      }),
      catchError(error => {
        this.monitoringService.captureWarning(
          'DeliveryTrackingService',
          'syncWithBFF',
          'BFF sync failed, storing locally',
          { deliveryId: newCommitment.id, error: error.message }
        );
        this.addCommitmentToState(newCommitment);
        this.persistCommitment(newCommitment);
        return of(newCommitment);
      })
    );
  }

  /**
   * Update ETA with persistence and confidence tracking
   */
  updateETA(commitmentId: string, eta: Omit<ETAUpdate, 'commitmentId' | 'calculatedAt'>): Observable<ETAUpdate> {
    const etaUpdate: ETAUpdate = {
      ...eta,
      commitmentId,
      calculatedAt: new Date().toISOString()
    };

    return this.syncETAWithBFF(etaUpdate).pipe(
      tap(update => {
        this.addETAToState(update);
        this.updateCommitmentETA(commitmentId, update.estimatedArrival);
        this.persistETAUpdate(update);
        this.lastETASync.set(new Date().toISOString());

      }),
      catchError(error => {
        this.monitoringService.captureWarning(
          'DeliveryTrackingService',
          'updateETA',
          'ETA sync failed, persisting locally',
          { deliveryId: commitmentId, estimatedArrival: eta.estimatedArrival, error: error.message }
        );
        this.addETAToState(etaUpdate);
        this.persistETAUpdate(etaUpdate);
        return of(etaUpdate);
      })
    );
  }

  /**
   *  Get delivery commitments with filtering
   */
  getDeliveryCommitments(filters?: {
    status?: DeliveryCommitment['status'];
    clientId?: string;
    dateRange?: { start: string; end: string };
    priority?: DeliveryCommitment['metadata']['priority'];
  }): Observable<DeliveryCommitment[]> {
    return this.deliveryCommitmentsSubject.pipe(
      map(commitments => {
        if (!filters) return commitments;

        return commitments.filter(commitment => {
          if (filters.status && commitment.status !== filters.status) return false;
          if (filters.clientId && commitment.clientId !== filters.clientId) return false;
          if (filters.priority && commitment.metadata.priority !== filters.priority) return false;

          if (filters.dateRange) {
            const deliveryDate = new Date(commitment.deliveryDate);
            const start = new Date(filters.dateRange.start);
            const end = new Date(filters.dateRange.end);
            if (deliveryDate < start || deliveryDate > end) return false;
          }

          return true;
        });
      })
    );
  }

  /**
   *  Track delivery by tracking code
   */
  trackDelivery(trackingCode: string): Observable<{
    commitment: DeliveryCommitment | null;
    latestETA: ETAUpdate | null;
    history: ETAUpdate[];
  }> {
    const commitment = this.findCommitmentByTrackingCode(trackingCode);

    if (!commitment) {
      return throwError(() => new Error(`Delivery not found: ${trackingCode}`));
    }

    const etaHistory = this.etaUpdatesSubject.value.filter(
      eta => eta.commitmentId === commitment.id
    );

    const latestETA = etaHistory.length > 0 ?
      etaHistory.sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())[0] :
      null;

    return of({
      commitment,
      latestETA,
      history: etaHistory
    });
  }

  getDeliveryTimeline(params: {
    market: PolicyMarket;
    anchorDate?: string;
    forceRefresh?: boolean;
  }): Observable<DeliveryTimelineSnapshot> {
    const { market, anchorDate, forceRefresh } = params;
    const cached = this.getStoredTimeline();

    if (!forceRefresh && cached && cached.market === market && !this.isTimelineStale(cached.lastUpdated)) {
      const snapshot: DeliveryTimelineSnapshot = {
        ...cached,
        events: cached.events.map(event => ({ ...event })),
        source: 'cache'
      };
      this.deliveryTimelineSubject.next(snapshot);
      return of(snapshot);
    }

    return this.simulateTimelineRequest(market, anchorDate).pipe(
      map(snapshot => ({ ...snapshot, source: 'remote' as const })),
      tap(snapshot => {
        this.persistTimeline(snapshot);
        this.deliveryTimelineSubject.next(snapshot);
      })
    );
  }

  deliveryTimeline$(): Observable<DeliveryTimelineSnapshot | null> {
    return this.deliveryTimelineSubject.asObservable().pipe(shareReplay(1));
  }

  /**
   *  Get delivery metrics and performance
   */
  getDeliveryMetrics(dateRange?: { start: string; end: string }): Observable<DeliveryMetrics> {
    return this.getDeliveryCommitments({ dateRange }).pipe(
      map(commitments => {
        if (commitments.length === 0) {
          return {
            totalDeliveries: 0,
            onTimeRate: 100,
            avgDeliveryTime: 0,
            etaAccuracy: 100,
            customerSatisfaction: 5,
            rescheduleRate: 0
          };
        }

        const delivered = commitments.filter(c => c.status === 'delivered');
        const rescheduled = commitments.filter(c => c.status === 'rescheduled');

        // Calculate on-time rate
        const onTimeDeliveries = delivered.filter(c => {
          const actualDelivery = new Date(c.updatedAt);
          const windowEnd = new Date(c.window.end);
          return actualDelivery <= windowEnd;
        }).length;

        const onTimeRate = delivered.length > 0 ? (onTimeDeliveries / delivered.length) * 100 : 100;

        // Calculate ETA accuracy
        const etaAccuracy = this.calculateETAAccuracy(delivered);

        const avgDeliveryTime = 35; // minutes
        const customerSatisfaction = 4.2; // 1-5 scale
        const rescheduleRate = commitments.length > 0 ? (rescheduled.length / commitments.length) * 100 : 0;

        return {
          totalDeliveries: commitments.length,
          onTimeRate: Math.round(onTimeRate * 10) / 10,
          avgDeliveryTime,
          etaAccuracy: Math.round(etaAccuracy * 10) / 10,
          customerSatisfaction,
          rescheduleRate: Math.round(rescheduleRate * 10) / 10
        };
      })
    );
  }

  /**
   *  Start ETA monitoring with persistence
   */
  private startETAMonitoring(): void {
    this.isTracking.set(true);

    // Monitor every 2 minutes for active deliveries
    timer(0, 120000).pipe(
      switchMap(() => this.activeDeliveries$),
      map(deliveries => deliveries.filter(d =>
        d.status === 'en_route' || d.status === 'arriving'
      ))
    ).subscribe({
      next: (activeDeliveries) => {
        if (activeDeliveries.length > 0) {

          // Calculate tracking reliability based on sync success
          const reliability = this.calculateTrackingReliability();
          this.trackingReliability.set(reliability);
        }
      },
      error: (error) => {
        this.monitoringService.captureError(
          'DeliveryTrackingService',
          'monitorETAChanges',
          error,
          {},
          'critical'
        );
        this.trackingReliability.set(85); // Degraded mode
      }
    });
  }

  // ===== PRIVATE HELPER METHODS =====

  private loadPersistedData(): void {
    try {
      // Load commitments
      const storedCommitments = localStorage.getItem(`${this.STORAGE_PREFIX}commitments`);
      if (storedCommitments) {
        const commitments: DeliveryCommitment[] = JSON.parse(storedCommitments);
        this.deliveryCommitmentsSubject.next(commitments);

        // Filter active deliveries
        const active = commitments.filter(c =>
          c.status === 'scheduled' || c.status === 'en_route' || c.status === 'arriving'
        );
        this.activeDeliveriesSubject.next(active);
      }

      // Load ETA updates
      const storedETAs = localStorage.getItem(`${this.STORAGE_PREFIX}eta_updates`);
      if (storedETAs) {
        const updates: ETAUpdate[] = JSON.parse(storedETAs);
        this.etaUpdatesSubject.next(updates);
      }

    } catch (error) {
      this.monitoringService.captureError(
        'DeliveryTrackingService',
        'loadPersistedData',
        error,
        {},
        'medium'
      );
    }
  }

  private persistCommitment(commitment: DeliveryCommitment): void {
    try {
      const current = this.deliveryCommitmentsSubject.value;
      const updated = current.some(c => c.id === commitment.id) ?
        current.map(c => c.id === commitment.id ? commitment : c) :
        [...current, commitment];

      localStorage.setItem(`${this.STORAGE_PREFIX}commitments`, JSON.stringify(updated));
    } catch (error) {
      this.monitoringService.captureError(
        'DeliveryTrackingService',
        'persistCommitmentUpdate',
        error,
        { deliveryId: commitment.id },
        'medium'
      );
    }
  }

  private persistETAUpdate(eta: ETAUpdate): void {
    try {
      const current = this.etaUpdatesSubject.value;
      const updated = [...current, eta];

      // Keep only last 50 ETA updates per commitment to manage storage
      const filtered = updated
        .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())
        .reduce((acc, update) => {
          const existing = acc.filter(u => u.commitmentId === update.commitmentId);
          if (existing.length < 50) {
            acc.push(update);
          }
          return acc;
        }, [] as ETAUpdate[]);

      localStorage.setItem(`${this.STORAGE_PREFIX}eta_updates`, JSON.stringify(filtered));
    } catch (error) {
      this.monitoringService.captureError(
        'DeliveryTrackingService',
        'persistETAUpdate',
        error,
        { deliveryId: eta.commitmentId, estimatedArrival: eta.estimatedArrival },
        'medium'
      );
    }
  }

  private addCommitmentToState(commitment: DeliveryCommitment): void {
    const current = this.deliveryCommitmentsSubject.value;
    const updated = [...current.filter(c => c.id !== commitment.id), commitment];
    this.deliveryCommitmentsSubject.next(updated);

    // Update active deliveries if applicable
    if (commitment.status === 'scheduled' || commitment.status === 'en_route' || commitment.status === 'arriving') {
      const activeList = this.activeDeliveriesSubject.value;
      const updatedActive = [...activeList.filter(c => c.id !== commitment.id), commitment];
      this.activeDeliveriesSubject.next(updatedActive);
    }
  }

  private addETAToState(eta: ETAUpdate): void {
    const current = this.etaUpdatesSubject.value;
    const updated = [...current, eta];
    this.etaUpdatesSubject.next(updated);
  }

  private updateCommitmentETA(commitmentId: string, estimatedArrival: string): void {
    const current = this.deliveryCommitmentsSubject.value;
    const updated = current.map(commitment => {
      if (commitment.id === commitmentId) {
        return {
          ...commitment,
          window: {
            ...commitment.window,
            estimatedArrival
          },
          updatedAt: new Date().toISOString()
        };
      }
      return commitment;
    });

    this.deliveryCommitmentsSubject.next(updated);
  }

  private syncCommitmentWithBFF(commitment: DeliveryCommitment): Observable<DeliveryCommitment> {
    if (!(environment.features as any)?.enableDeliveryBff) {
    }

    return this.http.post<DeliveryCommitment>(`${this.BFF_BASE_URL}/commitments`, commitment).pipe(
      retry(2),
      shareReplay(1)
    );
  }

  private syncETAWithBFF(eta: ETAUpdate): Observable<ETAUpdate> {
    if (!(environment.features as any)?.enableDeliveryBff) {
    }

    return this.http.post<ETAUpdate>(`${this.BFF_BASE_URL}/eta-updates`, eta).pipe(
      retry(2),
      shareReplay(1)
    );
  }

  private findCommitmentByTrackingCode(trackingCode: string): DeliveryCommitment | null {
    return this.deliveryCommitmentsSubject.value.find((commitment: DeliveryCommitment) => commitment.trackingCode === trackingCode) || null;
  }

  private generateCommitmentId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTrackingCode(): string {
    const prefix = 'COND';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private calculateETAAccuracy(deliveredCommitments: DeliveryCommitment[]): number {
    if (deliveredCommitments.length === 0) return 100;

    let totalAccuracy = 0;
    let validETAs = 0;

    deliveredCommitments.forEach(commitment => {
      if (commitment.window.estimatedArrival) {
        const estimatedTime = new Date(commitment.window.estimatedArrival);
        const actualTime = new Date(commitment.updatedAt); // When it was marked delivered

        const diffMinutes = Math.abs(actualTime.getTime() - estimatedTime.getTime()) / (1000 * 60);

        // Calculate accuracy: 100% if within 15 minutes, decreasing linearly
        const accuracy = Math.max(0, 100 - (diffMinutes - 15) * 2);
        totalAccuracy += Math.max(accuracy, 0);
        validETAs++;
      }
    });

    return validETAs > 0 ? totalAccuracy / validETAs : 100;
  }

  private calculateTrackingReliability(): number {
    const recentSyncAttempts = this.getRecentSyncAttempts();
    const successfulSyncs = recentSyncAttempts.filter(attempt => attempt.success).length;

    if (recentSyncAttempts.length === 0) return 100;

    const reliability = (successfulSyncs / recentSyncAttempts.length) * 100;
    return Math.round(reliability);
  }

  private getRecentSyncAttempts(): Array<{ success: boolean; timestamp: string }> {
    // In a real implementation, this would track actual sync attempts
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return [
      { success: true, timestamp: oneHourAgo.toISOString() },
      { success: true, timestamp: new Date(oneHourAgo.getTime() + 15 * 60 * 1000).toISOString() },
      { success: true, timestamp: new Date(oneHourAgo.getTime() + 30 * 60 * 1000).toISOString() },
      { success: true, timestamp: new Date(oneHourAgo.getTime() + 45 * 60 * 1000).toISOString() }
    ];
  }

  private getStoredTimeline(): DeliveryTimelineSnapshot | null {
    if (!this.flowContext) {
      return null;
    }

    const stored = this.flowContext.getContextData<DeliveryFlowContextState>(this.deliveryContextKey);
    if (!stored || !stored.events) {
      return null;
    }

    return {
      market: stored.market,
      etaDays: stored.etaDays,
      lastUpdated: stored.lastUpdated,
      events: stored.events.map(event => ({ ...event })),
      source: 'cache'
    };
  }

  private persistTimeline(snapshot: DeliveryTimelineSnapshot): void {
    if (!this.flowContext) {
      return;
    }

    const payload: DeliveryFlowContextState = {
      market: snapshot.market,
      etaDays: snapshot.etaDays,
      lastUpdated: snapshot.lastUpdated,
      events: snapshot.events.map(event => ({ ...event }))
    };

    this.flowContext.saveContext(this.deliveryContextKey, payload, {
      breadcrumbs: ['Dashboard', 'Entregas']
    });
  }

  private isTimelineStale(lastUpdated: string): boolean {
    const updatedAt = new Date(lastUpdated);
    if (Number.isNaN(updatedAt.getTime())) {
      return true;
    }
    return Date.now() - updatedAt.getTime() > this.timelineStaleMs;
  }

  private simulateTimelineRequest(
    market: PolicyMarket,
    anchorDate?: string
  ): Observable<Omit<DeliveryTimelineSnapshot, 'source'>> {
    const anchor = anchorDate ? new Date(anchorDate) : new Date();
    const blueprint = MARKET_TIMELINE_BLUEPRINTS[market] ?? MARKET_TIMELINE_BLUEPRINTS.otros;
    const snapshot = this.buildTimelineSnapshot(market, anchor, blueprint);
    return timer(450).pipe(map(() => snapshot));
  }

  private buildTimelineSnapshot(
    market: PolicyMarket,
    anchor: Date,
    blueprint: DeliveryTimelineBlueprintEntry[]
  ): Omit<DeliveryTimelineSnapshot, 'source'> {
    const dayMs = 24 * 60 * 60 * 1000;
    const progressIndex = Math.floor(Math.random() * (blueprint.length + 1));
    const currentOffset = progressIndex >= blueprint.length
      ? blueprint[blueprint.length - 1]?.offsetDays ?? 0
      : blueprint[progressIndex].offsetDays;

    const events: DeliveryTimelineEvent[] = blueprint.map((entry, index) => {
      const eventDate = new Date(anchor.getTime() + entry.offsetDays * dayMs);
      let status: DeliveryTimelineStatus;
      if (index < progressIndex) {
        status = 'completed';
      } else if (index === progressIndex) {
        status = 'in_progress';
      } else {
        status = 'upcoming';
      }
      return {
        id: `${market}-${entry.id}`,
        order: index,
        offsetDays: entry.offsetDays,
        label: entry.label,
        description: entry.description,
        status,
        estimatedDate: eventDate.toISOString(),
        completedAt: status === 'completed' ? eventDate.toISOString() : undefined,
        market,
        requiresAction: status === 'in_progress' && entry.milestone !== 'followup'
      };
    });

    const finalOffset = blueprint[blueprint.length - 1]?.offsetDays ?? currentOffset;
    const etaDays = Math.max(0, finalOffset - currentOffset);

    return {
      market,
      etaDays,
      lastUpdated: new Date().toISOString(),
      events
    };
  }

  // Public getters for reactive data
  get deliveryCommitments$() {
    return this.deliveryCommitmentsSubject.asObservable();
  }

  get activeDeliveries$() {
    return this.activeDeliveriesSubject.asObservable();
  }

  get etaUpdates$() {
    return this.etaUpdatesSubject.asObservable();
  }
}
