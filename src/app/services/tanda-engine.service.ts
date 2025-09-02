import { Injectable } from '@angular/core';
import { TandaGroupInput, TandaSimConfig, TandaSimulationResult, TandaMonthState, TandaAward, TandaRiskBadge } from '../models/types';
import { FinancialCalculatorService } from './financial-calculator.service';

@Injectable({
  providedIn: 'root'
})
export class TandaEngineService {

  constructor(private financialCalc: FinancialCalculatorService) { }

  // Core Tanda simulation algorithm - exact port from React
  async simulateTanda(groupInput: TandaGroupInput, config: TandaSimConfig): Promise<TandaSimulationResult> {
    let savings = 0;
    const debtSet = new Map<string, number>(); // memberId -> monthly payment (MDS)
    const queue = [...groupInput.members].filter(m => m.status === 'active').sort((a, b) => a.prio - b.prio);
    const months: TandaMonthState[] = [];
    const awards: TandaAward[] = [];
    const awardsByMember: Record<string, TandaAward> = {};
    const monthlyRate = groupInput.product.rateAnnual / 12;

    for (let t = 1; t <= config.horizonMonths; t++) {
      const monthEvents = config.events.filter(e => e.t === t);
      const contributions = new Map<string, number>(groupInput.members.map(m => [m.id, m.C]));
      
      // Process events that affect contributions
      monthEvents.forEach(event => {
        if (event.type === 'extra') {
          contributions.set(event.data.memberId, (contributions.get(event.data.memberId) || 0) + event.data.amount);
        } else if (event.type === 'miss') {
          contributions.set(event.data.memberId, (contributions.get(event.data.memberId) || 0) - event.data.amount);
        }
      });
      
      const inflow = Array.from(contributions.values()).reduce((sum, c) => sum + c, 0);
      const debtDue = Array.from(debtSet.values()).reduce((sum, d) => sum + d, 0);
      let deficit = 0;
      let riskBadge: TandaRiskBadge = 'ok';

      if (inflow >= debtDue) {
        savings += (inflow - debtDue);
      } else {
        deficit = debtDue - inflow;
        riskBadge = 'debtDeficit';
      }

      const monthAwards: TandaAward[] = [];
      const downPayment = groupInput.product.price * groupInput.product.dpPct + (groupInput.product.fees || 0);

      // Award units to eligible members
      while (riskBadge !== 'debtDeficit' && savings >= downPayment && queue.length > 0) {
        const nextMember = queue.shift();
        if (!nextMember) break;

        const isEligible = !groupInput.rules.eligibility.requireThisMonthPaid || (contributions.get(nextMember.id) || 0) >= groupInput.members.find(m => m.id === nextMember.id)!.C;
        
        if (isEligible) {
          const principal = groupInput.product.price * (1 - groupInput.product.dpPct);
          const mds = this.financialCalc.annuity(principal, monthlyRate, groupInput.product.term);
          debtSet.set(nextMember.id, mds);
          savings -= downPayment;
          
          const award: TandaAward = { memberId: nextMember.id, name: nextMember.name, month: t, mds };
          monthAwards.push(award);
          awards.push(award);
          awardsByMember[nextMember.id] = award;
        } else {
          queue.push(nextMember); // Put back at end of queue
          break; // Stop awarding for this month
        }
      }

      // Assess risk after awards
      if (inflow < (debtDue + monthAwards.reduce((sum, a) => sum + a.mds, 0))) {
        riskBadge = 'lowInflow';
      }

      months.push({
        t,
        inflow,
        debtDue: debtDue + monthAwards.reduce((sum, a) => sum + a.mds, 0), // Include new debt from awards
        deficit,
        savings,
        awards: monthAwards,
        riskBadge
      });
    }

    // Calculate KPIs
    const deliveredCount = awards.length;
    const firstAwardT = awards.length > 0 ? Math.min(...awards.map(a => a.month)) : undefined;
    const lastAwardT = awards.length > 0 ? Math.max(...awards.map(a => a.month)) : undefined;
    const avgTimeToAward = awards.length > 0 ? awards.reduce((sum, a) => sum + a.month, 0) / awards.length : 0;
    
    // Coverage ratio calculation
    const coverageRatios = months.map(m => m.debtDue > 0 ? m.inflow / m.debtDue : 1);
    const coverageRatioMean = coverageRatios.reduce((sum, r) => sum + r, 0) / coverageRatios.length;

    return {
      months,
      awardsByMember,
      firstAwardT,
      lastAwardT,
      kpis: {
        coverageRatioMean,
        deliveredCount,
        avgTimeToAward
      }
    };
  }

  // Enhanced simulation with delta scenarios - for Senior-first UX
  async simulateWithDelta(
    originalGroup: TandaGroupInput, 
    config: TandaSimConfig, 
    deltaAmount: number = 500
  ): Promise<{ original: TandaSimulationResult; withDelta: TandaSimulationResult }> {
    // Run original simulation
    const original = await this.simulateTanda(originalGroup, config);
    
    // Create modified group with delta amount added to each member's contribution
    const modifiedGroup: TandaGroupInput = {
      ...originalGroup,
      members: originalGroup.members.map(member => ({
        ...member,
        C: member.C + deltaAmount
      }))
    };
    
    // Run simulation with modified group
    const withDelta = await this.simulateTanda(modifiedGroup, config);
    
    return { original, withDelta };
  }

  // Generate baseline tanda configuration for simulation
  generateBaselineTanda(memberCount: number, unitPrice: number, memberContribution: number): TandaGroupInput {
    const members = Array.from({ length: memberCount }, (_, i) => ({
      id: `member-${i + 1}`,
      name: `Miembro ${i + 1}`,
      prio: i + 1,
      status: 'active' as const,
      C: memberContribution
    }));

    return {
      name: `Tanda ${memberCount} Miembros`,
      members,
      product: {
        price: unitPrice,
        dpPct: 0.15, // 15% down payment
        term: 60, // 60 months
        rateAnnual: 0.299, // 29.9% annual rate
        fees: 20000 // MXN 20,000 in fees
      },
      rules: {
        allocRule: 'debt_first',
        eligibility: { requireThisMonthPaid: true }
      },
      seed: Math.random()
    };
  }

  // Calculate projected timeline for awards
  getProjectedTimeline(result: TandaSimulationResult): Array<{ month: number; event: string; details?: string }> {
    const timeline: Array<{ month: number; event: string; details?: string }> = [];
    
    result.months.forEach(month => {
      if (month.awards.length > 0) {
        month.awards.forEach(award => {
          timeline.push({
            month: month.t,
            event: 'Entrega de Unidad',
            details: `${award.name} - Pago mensual: ${this.financialCalc.formatCurrency(award.mds)}`
          });
        });
      }

      if (month.riskBadge === 'debtDeficit') {
        timeline.push({
          month: month.t,
          event: 'Alerta de Riesgo',
          details: `Déficit de ${this.financialCalc.formatCurrency(month.deficit)}`
        });
      }
    });

    return timeline.sort((a, b) => a.month - b.month);
  }

  // Calculate "efecto bola de nieve" metrics for visualization
  getSnowballEffect(result: TandaSimulationResult): {
    totalSavings: number[];
    totalDebt: number[];
    unitsDelivered: number[];
    months: number[];
  } {
    const totalSavings = result.months.map(m => m.savings);
    const totalDebt = result.months.map(m => m.debtDue);
    const unitsDelivered = result.months.map(m => 
      result.months.slice(0, m.t).reduce((sum, prevMonth) => sum + prevMonth.awards.length, 0)
    );
    const months = result.months.map(m => m.t);

    return {
      totalSavings,
      totalDebt,
      unitsDelivered,
      months
    };
  }
}