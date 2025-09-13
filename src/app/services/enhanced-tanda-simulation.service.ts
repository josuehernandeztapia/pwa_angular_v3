import { Injectable } from '@angular/core';
import { Market } from '../models/types';
import { environment } from '../../environments/environment';
import { FinancialCalculatorService } from './financial-calculator.service';

export type TandaEventType = 'rescue' | 'change_price' | 'freeze' | 'unfreeze';

export interface TandaEvent {
  month: number;
  type: TandaEventType;
  payload?: any;
}

export interface TandaGroupInput {
  totalMembers: number;
  monthlyAmount: number;
  startDate?: Date;
}

export interface TandaScenarioParams {
  name: string;
  contribDelta: number; // e.g., -0.1, 0, +0.1
  priority?: 'fifo' | 'compliance' | 'rescue';
}

export interface TandaScenarioResult {
  id: string;
  name: string;
  params: TandaScenarioParams;
  cashFlows: number[];
  irrAnnual: number;
  tirOK: boolean;
  metrics: {
    deficitsDetected: number;
    rescuesUsed: number;
    activeShareAvg: number; // average fraction of active members
    awardsMade: number;
    firstAwardT?: number;
    lastAwardT?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class EnhancedTandaSimulationService {
  constructor(private fin: FinancialCalculatorService) {}

  /**
   * Simulate a single Tanda scenario with simple contribution adjustment (no freezes/rescues in this base version).
   * This provides a starting point to compare IRR vs. target without changing existing UI/flows.
   */
  simulateScenario(
    group: TandaGroupInput,
    market: Market,
    horizonMonths: number,
    params: TandaScenarioParams,
    options?: { targetIrrAnnual?: number; events?: TandaEvent[]; activeThreshold?: number; rescueCapPerMonth?: number; freezeMaxPct?: number; freezeMaxMonths?: number }
  ): TandaScenarioResult {
    const members = Math.max(1, Math.floor(group.totalMembers || 0));
    const baseMonthly = Math.max(0, group.monthlyAmount || 0);
    const monthly = Math.max(0, baseMonthly * (1 + (params.contribDelta || 0)));
    const h = Math.max(1, Math.floor(horizonMonths || members));

    // Flows model (fase 2):
    // - Outflow inicial notional (valor entregado)
    // - Ingresos mensuales = aportes de miembros activos (ajustados por freezes/unfreezes y change_price)
    // - Rescues: inyecciones positivas puntuales
    const flows = new Array(h + 1).fill(0);
    const notionalPrincipal = members * baseMonthly * Math.max(1, Math.floor(h / 2));
    flows[0] = -notionalPrincipal;

    // Estado por miembro (solo contamos activos/frozen)
    const active: boolean[] = Array.from({ length: members }, () => true);
    let currentMonthly = monthly;
    let rescuesUsed = 0;
    let deficits = 0;
    let activeShareAccum = 0;
    const evIndex = new Map<number, TandaEvent[]>();
    (options?.events || []).forEach(e => {
      if (e.month >= 1 && e.month <= h) {
        const arr = evIndex.get(e.month) || [];
        arr.push(e);
        evIndex.set(e.month, arr);
      }
    });

    // Award schedule tracking
    const contributed = Array.from({ length: members }, () => 0);
    const delivered = Array.from({ length: members }, () => false);
    const frozenMonths = Array.from({ length: members }, () => 0);
    let awards = 0;
    let firstAwardT: number | undefined;
    let lastAwardT: number | undefined;

    const cfg = environment?.finance?.tandaCaps || {};
    const allowAward = (activeShare: number) => activeShare >= (options?.activeThreshold ?? cfg.activeThreshold ?? 0.8);
    const maxFrozenSimultaneous = (options?.freezeMaxPct ?? cfg.freezeMaxPct ?? 0.2) * members;
    const maxFreezeMonths = Math.max(0, Math.floor(options?.freezeMaxMonths ?? cfg.freezeMaxMonths ?? 2));
    const rescueCapPerMonth = Math.max(0, Number(options?.rescueCapPerMonth ?? cfg.rescueCapPerMonth ?? 1.0)) * (members * currentMonthly);
    const pickAwardIndex = (): number | undefined => {
      const candidates: number[] = [];
      for (let i = 0; i < members; i++) if (!delivered[i]) candidates.push(i);
      if (candidates.length === 0) return undefined;
      switch (params.priority || 'fifo') {
        case 'fifo':
          return candidates[0];
        case 'compliance':
          return candidates.sort((a, b) => contributed[b] - contributed[a])[0];
        case 'rescue': {
          // deficit = expected - contributed; expected ≈ t * currentMonthly
          // Use currentMonthly as proxy; pick who tiene mayor déficit
          return candidates.sort((a, b) => (contribDeficit(b) - contribDeficit(a)))[0];
        }
      }
      return candidates[0];
    };
    const contribDeficit = (idx: number) => {
      // approximate expected by average currentMonthly over time; as proxy use currentMonthly * t
      // this function is re-evaluated inside the loop with t in closure
      return 0; // placeholder replaced in loop
    };

    for (let t = 1; t <= h; t++) {
      // Aplicar eventos del mes
      const monthEvents = evIndex.get(t) || [];
      let usedRescueAmount = 0;
      monthEvents.forEach(e => {
        switch (e.type) {
          case 'freeze': {
            const id = Math.max(0, Math.min(members - 1, Number(e.payload?.memberIndex ?? -1)));
            if (!Number.isNaN(id) && id >= 0) {
              const frozenCount = active.filter(v => !v).length;
              if (frozenCount < maxFrozenSimultaneous && frozenMonths[id] < maxFreezeMonths) {
                active[id] = false;
                // contabilizar mes congelado a partir de ahora
                frozenMonths[id] = Math.min(maxFreezeMonths, frozenMonths[id] + 1);
              }
            }
            break;
          }
          case 'unfreeze': {
            const id = Math.max(0, Math.min(members - 1, Number(e.payload?.memberIndex ?? -1)));
            if (!Number.isNaN(id) && id >= 0) active[id] = true;
            break;
          }
          case 'change_price': {
            const newAmount = Number(e.payload?.newMonthlyAmount ?? currentMonthly);
            if (newAmount >= 0) currentMonthly = newAmount;
            break;
          }
          case 'rescue': {
            const amount = Number(e.payload?.amount ?? 0);
            if (amount > 0 && (usedRescueAmount + amount) <= rescueCapPerMonth) { flows[t] += amount; rescuesUsed++; usedRescueAmount += amount; }
            break;
          }
        }
      });

      const activeCount = active.reduce((s, v) => s + (v ? 1 : 0), 0);
      activeShareAccum += activeCount / members;
      if (activeCount < members) deficits++;
      flows[t] += activeCount * currentMonthly;

      // actualizar contribuciones por miembro activo
      for (let i = 0; i < members; i++) if (active[i]) contributed[i] += currentMonthly;

      // actualizar función de déficit con t actual
      const expectedAt = (i: number) => t * currentMonthly; // proxy
      const contribDeficitAt = (i: number) => expectedAt(i) - contributed[i];

      // awards si aplica el umbral de actividad
      if (allowAward(activeCount / members)) {
        const idx = (() => {
          const cands: number[] = [];
          for (let i = 0; i < members; i++) if (!delivered[i]) cands.push(i);
          if (cands.length === 0) return undefined;
          switch (params.priority || 'fifo') {
            case 'fifo':
              return cands[0];
            case 'compliance':
              return cands.sort((a, b) => contributed[b] - contributed[a])[0];
            case 'rescue':
              return cands.sort((a, b) => (contribDeficitAt(b) - contribDeficitAt(a)))[0];
          }
          return cands[0];
        })();
        if (idx !== undefined) {
          delivered[idx] = true;
          awards++;
          if (firstAwardT === undefined) firstAwardT = t;
          lastAwardT = t;
        }
      }
    }

    const irrMonthly = this.fin.calculateTIR(flows);
    const irrAnnual = irrMonthly * 12;
    const target = options?.targetIrrAnnual ?? this.fin.getTIRMin(market);
    const tirOK = irrAnnual >= target;

    return {
      id: `tanda-scn-${params.name}`,
      name: params.name,
      params,
      cashFlows: flows,
      irrAnnual,
      tirOK,
      metrics: { deficitsDetected: deficits, rescuesUsed, activeShareAvg: activeShareAccum / h, awardsMade: awards, firstAwardT, lastAwardT }
    };
  }

  /**
   * Build a small grid of scenarios (contrib 0%, -10%, +10%) and rank by IRR, then by deficits/rescues.
   */
  simulateWithGrid(
    group: TandaGroupInput,
    market: Market,
    horizonMonths: number,
    options?: { targetIrrAnnual?: number }
  ): TandaScenarioResult[] {
    const grid: TandaScenarioParams[] = [
      { name: 'Base (0%) - FIFO', contribDelta: 0, priority: 'fifo' },
      { name: 'Contrib -10% - FIFO', contribDelta: -0.1, priority: 'fifo' },
      { name: 'Contrib +10% - FIFO', contribDelta: +0.1, priority: 'fifo' },
      { name: 'Base (0%) - Compliance', contribDelta: 0, priority: 'compliance' },
      { name: 'Base (0%) - Rescue', contribDelta: 0, priority: 'rescue' },
    ];

    const results = grid.map(g => this.simulateScenario(group, market, horizonMonths, g, options));
    results.sort((a, b) => (b.irrAnnual - a.irrAnnual)
      || (a.metrics.deficitsDetected - b.metrics.deficitsDetected)
      || (b.metrics.activeShareAvg - a.metrics.activeShareAvg)
    );
    return results;
  }
}
