/**
 *  Risk Evaluation Persistence Service
 * P0.2 SURGICAL FIX - KIBAN/HASE persistence layer
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { MonitoringService } from './monitoring.service';

import { environment } from '../../environments/environment';
import { RiskEvaluation } from '../components/risk-evaluation/risk-panel.component';
import { getDemoRiskEvaluations } from '../demo/demo-seed';

interface StoredRiskEvaluation {
  id: string;
  clientId: string;
  evaluation: RiskEvaluation;
  createdAt: string;
  updatedAt: string;
  version: number;
  metadata?: {
    source: string;
    sessionId?: string;
    deviceInfo?: string;
    synced?: boolean;
  };
}

interface RiskEvaluationSummary {
  total: number;
  approved: number;
  rejected: number;
  underReview: number;
  averageProcessingTime: number;
  last30Days: {
    total: number;
    approvalRate: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RiskPersistenceService {
  private monitoringService = inject(MonitoringService);
  private readonly BFF_BASE_URL = '/api/bff/risk/persistence';
  private readonly LOCAL_STORAGE_KEY = 'conductores_risk_evaluations';
  private readonly enabled = environment.features?.enableRiskPersistence === true;

  // Local cache for offline support
  private evaluationsCache$ = new BehaviorSubject<StoredRiskEvaluation[]>([]);
  private summaryCache$ = new BehaviorSubject<RiskEvaluationSummary | null>(null);

  constructor(private http: HttpClient) {
    this.loadFromLocalStorage();
    this.bootstrapDemoEvaluations();
  }

  /**
   *  Store risk evaluation with full persistence
   */
  storeEvaluation(
    clientId: string,
    evaluation: RiskEvaluation,
    metadata?: any
  ): Observable<{ stored: boolean; id: string }> {
    if (!this.enabled) {
      return of({ stored: false, id: '' });
    }

    const storedEvaluation: StoredRiskEvaluation = {
      id: this.generateId(),
      clientId,
      evaluation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      metadata: {
        source: 'web-app',
        sessionId: this.getSessionId(),
        deviceInfo: this.getDeviceInfo(),
        synced: !this.shouldUseRemoteStorage(),
        ...metadata
      }
    };

    // Store locally first (offline support)
    this.storeLocally(storedEvaluation);

    // Attempt remote storage
    if (this.shouldUseRemoteStorage()) {
      return this.http.post<{ stored: boolean; id: string }>(
        `${this.BFF_BASE_URL}/store`,
        storedEvaluation
      ).pipe(
        tap(response => {
        }),
        catchError(error => {
          this.monitoringService.captureWarning(
            'RiskPersistenceService',
            'storeEvaluation',
            'Remote storage failed, using local fallback',
            { evaluationId: evaluation.evaluationId, error: error.message }
          );
          return of({ stored: true, id: storedEvaluation.id });
        })
      );
    }

    return of({ stored: true, id: storedEvaluation.id });
  }

  /**
   * Get evaluation history for a client
   */
  getEvaluationHistory(clientId: string, limit: number = 10): Observable<StoredRiskEvaluation[]> {
    if (!this.enabled) {
      return of([]);
    }

    // Try remote first, fallback to local
    if (this.shouldUseRemoteStorage()) {
      return this.http.get<StoredRiskEvaluation[]>(
        `${this.BFF_BASE_URL}/history/${clientId}?limit=${limit}`
      ).pipe(
        tap(evaluations => {
          // Update local cache
          this.updateLocalCache(clientId, evaluations);
        }),
        catchError(error => {
          this.monitoringService.captureWarning(
            'RiskPersistenceService',
            'getHistory',
            'Remote history failed, using local fallback',
            { clientId, error: error.message }
          );
          return this.getLocalHistory(clientId, limit);
        })
      );
    }

    return this.getLocalHistory(clientId, limit);
  }

  /**
   *  Get specific evaluation by ID
   */
  getEvaluationById(evaluationId: string): Observable<StoredRiskEvaluation | null> {
    if (!this.enabled) {
      return of(null);
    }

    // Check local cache first
    const cached = this.evaluationsCache$.value.find(e => e.id === evaluationId);
    if (cached) {
      return of(cached);
    }

    if (this.shouldUseRemoteStorage()) {
      return this.http.get<StoredRiskEvaluation>(`${this.BFF_BASE_URL}/evaluation/${evaluationId}`).pipe(
        catchError(error => {
          this.monitoringService.captureWarning(
            'RiskPersistenceService',
            'getEvaluation',
            'Remote get failed, evaluation not found',
            { evaluationId, error: error.message }
          );
          return of(null);
        })
      );
    }

    return of(null);
  }

  /**
   *  Get evaluation summary statistics
   */
  getEvaluationSummary(dateRange?: { start: Date; end: Date }): Observable<RiskEvaluationSummary> {
    if (!this.enabled) {
      return of(this.getEmptySummary());
    }

    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.start.toISOString();
      params.endDate = dateRange.end.toISOString();
    }

    if (this.shouldUseRemoteStorage()) {
      return this.http.get<RiskEvaluationSummary>(`${this.BFF_BASE_URL}/summary`, { params }).pipe(
        tap(summary => {
          this.summaryCache$.next(summary);
        }),
        catchError(error => {
          this.monitoringService.captureWarning(
            'RiskPersistenceService',
            'getSummary',
            'Remote summary failed, using local calculation',
            { error: error.message }
          );
          return of(this.calculateLocalSummary());
        })
      );
    }

    return of(this.calculateLocalSummary());
  }

  /**
   *  Update existing evaluation
   */
  updateEvaluation(
    evaluationId: string,
    updates: Partial<RiskEvaluation>
  ): Observable<{ updated: boolean }> {
    if (!this.enabled) {
      return of({ updated: false });
    }

    const cached = this.evaluationsCache$.value.find(e => e.id === evaluationId);
    if (cached) {
      cached.evaluation = { ...cached.evaluation, ...updates };
      cached.updatedAt = new Date().toISOString();
      cached.version += 1;

      this.updateLocalStorage();
    }

    if (this.shouldUseRemoteStorage()) {
      return this.http.patch<{ updated: boolean }>(
        `${this.BFF_BASE_URL}/evaluation/${evaluationId}`,
        { updates }
      ).pipe(
        catchError(error => {
          this.monitoringService.captureError(
            'RiskPersistenceService',
            'updateEvaluation',
            error,
            { evaluationId, updatedFields: Object.keys(updates) },
            'medium'
          );
          return of({ updated: !!cached });
        })
      );
    }

    return of({ updated: !!cached });
  }

  /**
   * DELETE Delete evaluation
   */
  deleteEvaluation(evaluationId: string): Observable<{ deleted: boolean }> {
    if (!this.enabled) {
      return of({ deleted: false });
    }

    // Remove from local cache
    const currentEvaluations = this.evaluationsCache$.value;
    const filtered = currentEvaluations.filter(e => e.id !== evaluationId);
    this.evaluationsCache$.next(filtered);
    this.updateLocalStorage();

    if (this.shouldUseRemoteStorage()) {
      return this.http.delete<{ deleted: boolean }>(`${this.BFF_BASE_URL}/evaluation/${evaluationId}`).pipe(
        catchError(error => {
          this.monitoringService.captureError(
            'RiskPersistenceService',
            'deleteEvaluation',
            error,
            { evaluationId },
            'medium'
          );
          return of({ deleted: true }); // Local delete succeeded
        })
      );
    }

    return of({ deleted: true });
  }

  /**
   *  Get cached observables for reactive UI
   */
  get evaluations$() {
    return this.evaluationsCache$.asObservable();
  }

  get summary$() {
    return this.summaryCache$.asObservable();
  }

  /**
   *  Sync local data with remote storage
   */
  syncWithRemote(): Observable<{ synced: boolean; conflicts: number }> {
    if (!this.enabled || !this.shouldUseRemoteStorage()) {
      return of({ synced: false, conflicts: 0 });
    }

    const localEvaluations = this.evaluationsCache$.value;
    const unsyncedEvaluations = localEvaluations.filter(e => !e.metadata?.synced);

    if (unsyncedEvaluations.length === 0) {
      return of({ synced: true, conflicts: 0 });
    }

    return this.http.post<{ synced: boolean; conflicts: number }>(
      `${this.BFF_BASE_URL}/sync`,
      { evaluations: unsyncedEvaluations }
    ).pipe(
      tap(result => {
        if (result.synced) {
          // Mark as synced
          unsyncedEvaluations.forEach(evaluation => {
            if (evaluation.metadata) {
              evaluation.metadata.synced = true;
            }
          });
          this.updateLocalStorage();
        }
      }),
      catchError(error => {
        this.monitoringService.captureError(
          'RiskPersistenceService',
          'syncWithRemote',
          error,
          { localItemsCount: unsyncedEvaluations.length },
          'medium'
        );
        return of({ synced: false, conflicts: 0 });
      })
    );
  }

  // Private methods

  private shouldUseRemoteStorage(): boolean {
    return environment.features?.enableRiskBff === true;
  }

  private storeLocally(evaluation: StoredRiskEvaluation): void {
    const current = this.evaluationsCache$.value;
    const updated = [evaluation, ...current].slice(0, 100); // Keep latest 100
    this.evaluationsCache$.next(updated);
    this.updateLocalStorage();
  }

  private getLocalHistory(clientId: string, limit: number): Observable<StoredRiskEvaluation[]> {
    const filtered = this.evaluationsCache$.value
      .filter(e => e.clientId === clientId)
      .slice(0, limit);
    return of(filtered);
  }

  private updateLocalCache(clientId: string, evaluations: StoredRiskEvaluation[]): void {
    const current = this.evaluationsCache$.value;
    const filtered = current.filter(e => e.clientId !== clientId);
    const updated = [...evaluations, ...filtered].slice(0, 100);
    this.evaluationsCache$.next(updated);
    this.updateLocalStorage();
  }

  private bootstrapDemoEvaluations(): void {
    if (!this.enabled || !environment.features?.enableMockData) {
      return;
    }

    if (this.evaluationsCache$.value.length > 0) {
      return;
    }

    const demoEntries = getDemoRiskEvaluations();
    if (demoEntries.length === 0) {
      return;
    }

    const storedEvaluations = demoEntries.map(entry => this.toStoredEvaluation(entry.clientId, entry.evaluation));
    this.evaluationsCache$.next(storedEvaluations);
    this.summaryCache$.next(this.calculateLocalSummary());
    this.updateLocalStorage();
  }

  private toStoredEvaluation(clientId: string, evaluation: RiskEvaluation): StoredRiskEvaluation {
    const processedAt = evaluation.processedAt instanceof Date
      ? evaluation.processedAt.toISOString()
      : new Date(evaluation.processedAt as any).toISOString();

    return {
      id: evaluation.evaluationId,
      clientId,
      evaluation,
      createdAt: processedAt,
      updatedAt: processedAt,
      version: 1,
      metadata: {
        source: 'demo-seed',
        synced: true
      }
    };
  }

  private calculateLocalSummary(): RiskEvaluationSummary {
    const evaluations = this.evaluationsCache$.value;
    const total = evaluations.length;

    if (total === 0) {
      return this.getEmptySummary();
    }

    const approved = evaluations.filter(e => e.evaluation.decision === 'GO').length;
    const rejected = evaluations.filter(e => e.evaluation.decision === 'NO-GO').length;
    const underReview = evaluations.filter(e => e.evaluation.decision === 'REVIEW').length;

    const totalProcessingTime = evaluations.reduce((sum, e) => sum + e.evaluation.processingTimeMs, 0);
    const averageProcessingTime = Math.round(totalProcessingTime / total);

    // Last 30 days calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent = evaluations.filter(e => new Date(e.createdAt) >= thirtyDaysAgo);
    const recentApproved = recent.filter(e => e.evaluation.decision === 'GO').length;
    const approvalRate = recent.length > 0 ? (recentApproved / recent.length) * 100 : 0;

    return {
      total,
      approved,
      rejected,
      underReview,
      averageProcessingTime,
      last30Days: {
        total: recent.length,
        approvalRate: Math.round(approvalRate * 100) / 100
      }
    };
  }

  private getEmptySummary(): RiskEvaluationSummary {
    return {
      total: 0,
      approved: 0,
      rejected: 0,
      underReview: 0,
      averageProcessingTime: 0,
      last30Days: {
        total: 0,
        approvalRate: 0
      }
    };
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (stored) {
        const evaluations = JSON.parse(stored);
        this.evaluationsCache$.next(evaluations);
      }
    } catch (error) {
      this.monitoringService.captureError(
        'RiskPersistenceService',
        'loadFromLocalStorage',
        error,
        {},
        'medium'
      );
    }
  }

  private updateLocalStorage(): void {
    try {
      const evaluations = this.evaluationsCache$.value;
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(evaluations));
    } catch (error) {
      this.monitoringService.captureError(
        'RiskPersistenceService',
        'saveToLocalStorage',
        error,
        { evaluationsCount: this.evaluationsCache$.value.length },
        'medium'
      );
    }
  }

  private generateId(): string {
    return `RISK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('risk_session_id');
    if (!sessionId) {
      sessionId = `SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('risk_session_id', sessionId);
    }
    return sessionId;
  }

  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    const browser = this.getBrowserName(ua);
    return `${browser}${isMobile ? '-mobile' : '-desktop'}`;
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'unknown';
  }
}
