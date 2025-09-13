import { Injectable } from '@angular/core';
import { Market } from '../models/types';
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
    options?: { targetIrrAnnual?: number }
  ): TandaScenarioResult {
    const members = Math.max(1, Math.floor(group.totalMembers || 0));
    const baseMonthly = Math.max(0, group.monthlyAmount || 0);
    const monthly = Math.max(0, baseMonthly * (1 + (params.contribDelta || 0)));
    const h = Math.max(1, Math.floor(horizonMonths || members));

    // Simple flows model (skeleton):
    // - Assume an initial notional outflow (negative) to represent value delivered over the horizon
    // - Monthly inflows are group contributions (members * monthly)
    // This is a simplification to allow IRR comparison while we wire advanced delivery rules.
    const flows = new Array(h + 1).fill(0);
    const notionalPrincipal = members * baseMonthly * Math.max(1, Math.floor(h / 2));
    flows[0] = -notionalPrincipal;
    for (let t = 1; t <= h; t++) {
      flows[t] = members * monthly;
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
      metrics: { deficitsDetected: 0, rescuesUsed: 0 }
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
      { name: 'Base (0%)', contribDelta: 0 },
      { name: 'Contrib -10%', contribDelta: -0.1 },
      { name: 'Contrib +10%', contribDelta: +0.1 },
    ];

    const results = grid.map(g => this.simulateScenario(group, market, horizonMonths, g, options));
    results.sort((a, b) => (b.irrAnnual - a.irrAnnual) || (a.metrics.deficitsDetected - b.metrics.deficitsDetected));
    return results;
  }
}

