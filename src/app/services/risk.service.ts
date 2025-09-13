import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiConfigService } from './api-config.service';
import { GeographicRiskConfigResponse } from '../models/avi-api-contracts';
import { environment } from '../../environments/environment';

export interface GeoContext {
  state?: string;
  municipality?: string;
  route?: string;
  riskZone?: string; // e.g., 'urban' | 'rural' | 'highway' | 'conflictZone'
  ecosystemId?: string;
}

@Injectable({ providedIn: 'root' })
export class RiskService {
  private geoConfig$ = new BehaviorSubject<GeographicRiskConfigResponse['data'] | null>(null);

  constructor(private apiConfig: ApiConfigService) {
    // Best-effort load; mock is enabled in dev
    this.apiConfig.loadGeographicRisk().subscribe({
      next: (resp) => { if (resp?.success) this.geoConfig$.next(resp.data); },
      error: () => { /* silent */ }
    });
  }

  /**
   * Compute premium in basis points from geo context using config if available
   */
  getIrrPremiumBps(ctx: GeoContext): number {
    // 1) Environment overrides by ecosystem
    const envPrem = environment?.finance?.riskPremiums as { byEcosystem?: Record<string, number> } | undefined;
    const byEco = envPrem?.byEcosystem ?? {};
    if (ctx.ecosystemId && byEco[ctx.ecosystemId] != null) return byEco[ctx.ecosystemId];

    // 2) From geographic risk matrix (if loaded)
    const data = this.geoConfig$.value;
    if (!data) return 0;

    // Risk by municipality
    const score = ctx.state && ctx.municipality
      ? data.riskMatrix?.[ctx.state]?.[ctx.municipality]?.riskScore ?? undefined
      : undefined;
    const zoneMult = ctx.riskZone ? (data.multipliers as any)?.[ctx.riskZone] : undefined;

    const premiumFromScore = this.mapRiskScoreToBps(score);
    const premiumFromZone = this.mapZoneMultiplierToBps(zoneMult);

    return premiumFromScore + premiumFromZone;
  }

  getIrrPremiumBps$(ctx: GeoContext): Observable<number> {
    return this.geoConfig$.pipe(map(() => this.getIrrPremiumBps(ctx)));
  }

  private mapRiskScoreToBps(score?: number): number {
    if (score == null) return 0;
    // Example mapping: 0-1 → 0-100 bps linearly
    const clamped = Math.max(0, Math.min(score, 1));
    return Math.round(clamped * 100);
  }

  private mapZoneMultiplierToBps(mult?: number): number {
    if (!mult || mult <= 1) return 0;
    // Example: multiplier above 1 becomes +bps (e.g., 1.25 → 25 bps)
    return Math.round((mult - 1) * 100);
  }
}

