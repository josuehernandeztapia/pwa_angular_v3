import { HttpClient } from '@angular/common/http';
import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { OfflineService, OfflineProcessResult } from './offline.service';

export type ClaimStatus = 'open' | 'in_review' | 'approved' | 'rejected' | 'closed';
export type ClaimType = 'warranty' | 'maintenance' | 'insurance' | 'service';

export interface ClaimRecord {
  id: string;
  folio: string;
  clientName: string;
  vehicleVin: string;
  market: 'aguascalientes' | 'edomex' | 'otros';
  type: ClaimType;
  status: ClaimStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
  assignedTo: string;
  description?: string;
  resolutionNotes?: string;
  pendingSync?: boolean;
}

export interface ClaimFormPayload {
  clientName: string;
  vehicleVin: string;
  market: 'aguascalientes' | 'edomex' | 'otros';
  type: ClaimType;
  amount: number;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private readonly storageKey = '__claims_records__';
  private readonly claimsSubject = new BehaviorSubject<ClaimRecord[]>(this.seedClaims());
  private readonly baseUrl: string;
  private readonly useBff: boolean;

  constructor(
    @Optional() private readonly http?: HttpClient,
    @Optional() private readonly offline?: OfflineService
  ) {
    this.baseUrl = `${environment.apiUrl}/claims`;
    this.useBff = Boolean(this.http && environment.features.enableClaimsBff);
    this.restoreFromStorage();

    if (this.offline) {
      this.offline.processedRequests$.subscribe(result => this.handleOfflineProcessed(result));
    }
  }

  getClaims(filter?: { status?: ClaimStatus; market?: string; search?: string }): Observable<ClaimRecord[]> {
    if (this.useBff && this.http) {
      return this.http
        .get<ClaimRecord[]>(this.baseUrl, {
          params: filter ? this.buildQueryParams(filter) : undefined
        })
        .pipe(tap(records => this.claimsSubject.next(records)));
    }

    return this.claimsSubject.asObservable().pipe(
      map(records => {
        if (!filter) {
          return records;
        }

        return records.filter(record => {
          if (filter.status && record.status !== filter.status) {
            return false;
          }

          if (filter.market && record.market !== filter.market) {
            return false;
          }

          if (filter.search) {
            const needle = filter.search.toLowerCase();
            const haystack = `${record.folio} ${record.clientName} ${record.vehicleVin}`.toLowerCase();
            return haystack.includes(needle);
          }

          return true;
        });
      })
    );
  }

  getClaimById(id: string): Observable<ClaimRecord | null> {
    if (this.useBff) {
      this.refreshFromBackend();
    }

    return this.claimsSubject.asObservable().pipe(
      map(records => records.find(record => record.id === id) ?? null)
    );
  }

  createClaim(payload: ClaimFormPayload): Observable<ClaimRecord> {
    const offline = this.isOffline();

    if (this.shouldUseBackend() && !offline) {
      return this.http!
        .post<ClaimRecord>(this.baseUrl, payload)
        .pipe(tap(() => this.refreshFromBackend()));
    }

    const claim = this.buildLocalClaim(payload, offline);
    this.pushLocalClaim(claim);

    if (offline) {
      this.enqueueOfflineRequest('claims', 'POST', { ...payload, tempId: claim.id });
    }

    return of(claim);
  }

  updateClaim(id: string, updates: Partial<ClaimRecord>): Observable<ClaimRecord | null> {
    const offline = this.isOffline();

    if (this.shouldUseBackend() && !offline) {
      return this.http!
        .patch<ClaimRecord>(`${this.baseUrl}/${id}`, updates)
        .pipe(tap(() => this.refreshFromBackend()));
    }

    const updated = this.applyLocalUpdate(id, updates, offline);

    if (offline && updated) {
      this.enqueueOfflineRequest(`claims/${id}`, 'PATCH', { ...updates, id });
    }

    return of(updated);
  }

  closeClaim(id: string, notes?: string): Observable<ClaimRecord | null> {
    const offline = this.isOffline();

    if (this.shouldUseBackend() && !offline) {
      return this.http!
        .post<ClaimRecord>(`${this.baseUrl}/${id}/close`, { notes })
        .pipe(tap(() => this.refreshFromBackend()));
    }

    const updated = this.applyLocalUpdate(
      id,
      {
        status: 'closed',
        resolutionNotes: notes ?? 'Cierre manual desde ClaimsService stub.'
      },
      offline
    );

    if (offline && updated) {
      this.enqueueOfflineRequest(`claims/${id}/close`, 'POST', { id, notes });
    }

    return of(updated);
  }

  getSummary(): Observable<{ total: number; open: number; inReview: number; closed: number; avgAmount: number }> {
    return this.claimsSubject.asObservable().pipe(
      map(records => {
        const total = records.length;
        const open = records.filter(record => record.status === 'open').length;
        const inReview = records.filter(record => record.status === 'in_review').length;
        const closed = records.filter(record => record.status === 'closed' || record.status === 'approved' || record.status === 'rejected').length;
        const avgAmount = total > 0 ? records.reduce((sum, record) => sum + (record.amount || 0), 0) / total : 0;
        return {
          total,
          open,
          inReview,
          closed,
          avgAmount: Math.round(avgAmount)
        };
      })
    );
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.claimsSubject.value));
    } catch {
      // ignore storage errors in stub
    }
  }

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const records: ClaimRecord[] = JSON.parse(raw);
        if (Array.isArray(records) && records.length) {
          this.claimsSubject.next(records);
        }
      }
    } catch {
      // ignore parse errors and keep seed data
    }
  }

  private refreshFromBackend(): void {
    if (!this.useBff || !this.http) {
      return;
    }
    this.http
      .get<ClaimRecord[]>(this.baseUrl)
      .subscribe(records => this.claimsSubject.next(records));
  }

  private shouldUseBackend(): boolean {
    return this.useBff && !!this.http;
  }

  private isOffline(): boolean {
    if (!this.offline) {
      return false;
    }
    const isOnlineSignal = this.offline.isOnline;
    return typeof isOnlineSignal === 'function' ? !isOnlineSignal() : false;
  }

  private enqueueOfflineRequest(endpoint: string, method: 'POST' | 'PATCH' | 'PUT', data?: any): void {
    if (!this.offline) {
      return;
    }
    try {
      this.offline.storeOfflineRequest(endpoint, method, data);
    } catch {
      // Ignore storage errors (private mode / quota)
    }
  }

  private buildLocalClaim(payload: ClaimFormPayload, pendingSync: boolean): ClaimRecord {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      folio: this.generateFolio(payload.market),
      clientName: payload.clientName,
      vehicleVin: payload.vehicleVin,
      market: payload.market,
      type: payload.type,
      status: 'open',
      amount: payload.amount,
      createdAt: now,
      updatedAt: now,
      assignedTo: 'postventa-team',
      description: payload.description,
      pendingSync
    };
  }

  private pushLocalClaim(claim: ClaimRecord): void {
    const next = [claim, ...this.claimsSubject.value];
    this.claimsSubject.next(next);
    this.persist();
  }

  private applyLocalUpdate(
    id: string,
    updates: Partial<ClaimRecord>,
    markPending: boolean
  ): ClaimRecord | null {
    let updatedClaim: ClaimRecord | null = null;
    const next = this.claimsSubject.value.map(claim => {
      if (claim.id !== id) {
        return claim;
      }

      updatedClaim = {
        ...claim,
        ...updates,
        pendingSync: markPending ? true : updates.pendingSync ?? claim.pendingSync,
        updatedAt: new Date().toISOString()
      };

      return updatedClaim;
    });

    if (updatedClaim) {
      this.claimsSubject.next(next);
      this.persist();
    }

    return updatedClaim;
  }

  private handleOfflineProcessed(result: OfflineProcessResult): void {
    if (!result || !result.request) {
      return;
    }

    const endpoint = this.normalizeEndpoint(result.request.endpoint ?? '');
    if (!endpoint.startsWith('claims')) {
      return;
    }

    if (!result.success) {
      return;
    }

    const method = (result.request.method ?? 'POST').toUpperCase();

    if (endpoint === 'claims' && method === 'POST') {
      const payload = result.request.data ?? {};
      const id = payload?.tempId ?? payload?.id;
      if (typeof id === 'string') {
        this.updatePendingFlag(id, false);
      } else if (this.shouldUseBackend()) {
        this.refreshFromBackend();
      }
      return;
    }

    const claimId = this.extractClaimId(endpoint);
    if (claimId) {
      this.updatePendingFlag(claimId, false);
    } else if (this.shouldUseBackend()) {
      this.refreshFromBackend();
    }
  }

  private normalizeEndpoint(endpoint: string): string {
    return endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  }

  private extractClaimId(endpoint: string): string | null {
    const normalized = this.normalizeEndpoint(endpoint);
    const parts = normalized.split('/');
    if (parts[0] !== 'claims' || parts.length < 2) {
      return null;
    }
    return parts[1] ?? null;
  }

  private updatePendingFlag(id: string, pending: boolean): void {
    let mutated = false;
    const next = this.claimsSubject.value.map(claim => {
      if (claim.id !== id) {
        return claim;
      }
      mutated = true;
      return {
        ...claim,
        pendingSync: pending
      };
    });

    if (mutated) {
      this.claimsSubject.next(next);
      this.persist();

      if (!pending && this.shouldUseBackend()) {
        this.refreshFromBackend();
      }
    }
  }

  private buildQueryParams(filter: { status?: ClaimStatus; market?: string; search?: string }): Record<string, string> {
    const params: Record<string, string> = {};
    if (filter.status) params['status'] = filter.status;
    if (filter.market) params['market'] = filter.market;
    if (filter.search) params['search'] = filter.search;
    return params;
  }

  private generateFolio(market: string): string {
    const prefix = market.slice(0, 3).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${timestamp}-${random}`;
  }

  private seedClaims(): ClaimRecord[] {
    const now = new Date();
    return [
      {
        id: crypto.randomUUID(),
        folio: 'AGS-1024-A1B2',
        clientName: 'María Hernández',
        vehicleVin: '3VWFE21C04M000111',
        market: 'aguascalientes',
        type: 'warranty',
        status: 'in_review',
        amount: 12500,
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'carlos.rivera',
        description: 'Falla en sistema eléctrico posterior a entrega.',
        pendingSync: false
      },
      {
        id: crypto.randomUUID(),
        folio: 'EDX-2048-F4G5',
        clientName: 'Luis Martínez',
        vehicleVin: '2FMDK4KC0BBB12345',
        market: 'edomex',
        type: 'maintenance',
        status: 'open',
        amount: 4800,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'claudia.soto',
        description: 'Solicitud de servicio correctivo por fuga de aceite.',
        pendingSync: false
      },
      {
        id: crypto.randomUUID(),
        folio: 'OTR-3050-X7Z9',
        clientName: 'Sofía Delgado',
        vehicleVin: '1GCHK23124F000222',
        market: 'otros',
        type: 'insurance',
        status: 'approved',
        amount: 18990,
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: 'postventa-team',
        description: 'Reembolso de deducible por siniestro leve.',
        resolutionNotes: 'Aprobado con ajuste del 10% por depreciación.',
        pendingSync: false
      }
    ];
  }
}
