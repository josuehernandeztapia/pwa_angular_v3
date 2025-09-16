import { Injectable } from '@angular/core';
import { Market } from '../models/types';
import { environment } from '../../environments/environment';
import { formatCurrencyMXN } from '../utils/format.util';
import { annuity as annuityUtil, round2 } from '../utils/math.util';

@Injectable({
  providedIn: 'root'
})
export class FinancialCalculatorService {
  
  // Market-specific constants from React advancedFinancials.ts
  private readonly TIR_MIN_AGS = 0.255; // Aguascalientes rate (25.5% annual)
  private readonly TIR_MIN_EDOMEX = 0.299; // Estado de México rate (29.9% annual)
  private readonly difMaxMeses = 6; // Maximum months for deferral
  private readonly stepDownMaxPct = 0.5; // Maximum reduction percentage for step-down

  constructor() { }

  // Helper function to get TIR minimum based on market
  getTIRMin(market?: Market | string): number {
    if (market === 'aguascalientes') return this.TIR_MIN_AGS;
    if (market === 'edomex') return this.TIR_MIN_EDOMEX;
    return this.TIR_MIN_AGS; // Default fallback
  }

  /**
   * Target IRR anual por colectivo/ecosistema con fallback al baseline de mercado.
   */
  getIrrTarget(market?: Market | string, opts?: { productSku?: string; collectiveId?: string; ecosystemId?: string }): number {
    const cfg = environment?.finance?.irrTargets as { bySku?: Record<string, number>; byCollective?: Record<string, number>; byEcosystem?: Record<string, number> } | undefined;
    const bySku: Record<string, number> = cfg?.bySku ?? {};
    const byCollective: Record<string, number> = cfg?.byCollective ?? {};
    const byEcosystem: Record<string, number> = cfg?.byEcosystem ?? {};
    // Prioridad: colectivo → ecosistema → SKU (opcional) → mercado
    if (opts?.collectiveId && byCollective[opts.collectiveId] != null) return byCollective[opts.collectiveId];
    if (opts?.ecosystemId && byEcosystem[opts.ecosystemId] != null) return byEcosystem[opts.ecosystemId];
    if (opts?.productSku && bySku[opts.productSku] != null) return bySku[opts.productSku];
    return this.getTIRMin(market);
  }

  // Newton-Raphson method for TIR calculation - exact port from React
  calculateTIR(cashFlows: number[], guess: number = 0.1, tolerance: number = 1e-6, maxIterations: number = 100): number {
    let rate = guess;
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let npvDerivative = 0;
      
      for (let t = 0; t < cashFlows.length; t++) {
        const denominator = Math.pow(1 + rate, t);
        npv += cashFlows[t] / denominator;
        // CORRECTED DERIVATIVE CALCULATION
        npvDerivative += -t * cashFlows[t] / Math.pow(1 + rate, t + 1);
      }
      
      if (Math.abs(npv) < tolerance) {
        return rate;
      }
      
      if (Math.abs(npvDerivative) < tolerance) {
        break; // Avoid division by zero
      }
      
      rate = rate - npv / npvDerivative;
      
      // Bound the rate to reasonable values
      rate = Math.max(-0.99, Math.min(rate, 10));
    }
    
    return rate;
  }

  /**
   * Compute implied monthly interest rate r from an annuity where:
   *  payment = principal * (r * (1+r)^n) / ((1+r)^n - 1)
   * Uses a bounded binary search for robustness (avoids derivative issues).
   */
  computeImpliedMonthlyRateFromAnnuity(principal: number, monthlyPayment: number, term: number, 
    opts: { maxRate?: number; tolerance?: number; maxIterations?: number } = {}): number {
    const maxRate = opts.maxRate ?? 5; // 500% monthly upper bound (practical cap)
    const tolerance = opts.tolerance ?? 1e-7;
    const maxIterations = opts.maxIterations ?? 200;

    if (principal <= 0 || monthlyPayment <= 0 || term <= 0) return 0;

    // If zero-rate annuity fits exactly
    const zeroRatePayment = principal / term;
    if (Math.abs(zeroRatePayment - monthlyPayment) < tolerance) return 0;

    // Helper: annuity payment for a given r
    const pay = (r: number) => {
      if (r === 0) return principal / term;
      const a = Math.pow(1 + r, term);
      return principal * (r * a) / (a - 1);
    };

    // Binary search on r to match monthlyPayment
    let lo = 0;
    let hi = maxRate;
    let r = 0.0;
    for (let i = 0; i < maxIterations; i++) {
      r = (lo + hi) / 2;
      const p = pay(r);
      const diff = p - monthlyPayment;
      if (Math.abs(diff) < tolerance) break;
      if (diff > 0) {
        // payment too high → rate too high
        hi = r;
      } else {
        lo = r;
      }
    }
    return r;
  }

  /**
   * Convenience wrapper to get annualized IRR target from contract terms (monthly -> annual).
   */
  getTargetContractIRRAnnual(principalOrBalance: number, monthlyPayment: number, remainingTerm: number): number {
    const rMonthly = this.computeImpliedMonthlyRateFromAnnuity(principalOrBalance, monthlyPayment, remainingTerm);
    return rMonthly * 12;
  }

  // Generate cash flow array for scenario analysis
  generateCashFlows(principal: number, payments: number[], term: number): number[] {
    const flows = new Array(term + 1).fill(0);
    flows[0] = -principal; // Initial disbursement (negative)
    
    for (let i = 1; i <= term && i - 1 < payments.length; i++) {
      flows[i] = payments[i - 1] || 0; // Monthly payments (positive)
    }
    
    return flows;
  }

  // Capitalize interest for deferral scenarios
  capitalizeInterest(principal: number, monthlyRate: number, deferralMonths: number): number {
    return principal * Math.pow(1 + monthlyRate, deferralMonths);
  }

  // Validate scenario against policy limits
  validateScenarioPolicy(scenarioType: string, months: number, reductionPct?: number): { valid: boolean; reason?: string } {
    switch (scenarioType) {
      case 'defer':
        if (months > this.difMaxMeses) {
          return { valid: false, reason: `El diferimiento no puede exceder ${this.difMaxMeses} meses. Solicitado: ${months} meses.` };
        }
        break;
      case 'step-down':
        if (reductionPct && reductionPct > this.stepDownMaxPct) {
          return { valid: false, reason: `La reducción no puede exceder ${(this.stepDownMaxPct * 100).toFixed(0)}%. Solicitado: ${(reductionPct * 100).toFixed(0)}%.` };
        }
        break;
    }
    return { valid: true };
  }

  // Basic financial functions (re-exported for convenience)
  annuity(principal: number, monthlyRate: number, term: number): number {
    return annuityUtil(principal, monthlyRate, term);
  }

  getBalance(originalPrincipal: number, originalPayment: number, monthlyRate: number, monthsPaid: number): number {
    if (monthlyRate <= 0) return originalPrincipal - (originalPayment * monthsPaid);
    return originalPrincipal * Math.pow(1 + monthlyRate, monthsPaid) - originalPayment * (Math.pow(1 + monthlyRate, monthsPaid) - 1) / monthlyRate;
  }

  // Solve for number of periods given principal, rate and fixed payment
  // Returns the number of payments required to amortize the principal at the given payment
  getTermFromPayment(principal: number, monthlyRate: number, payment: number): number {
    if (payment <= 0) return 0;
    if (monthlyRate <= 0) {
      return Math.ceil(principal / payment);
    }
    const ratio = 1 - (monthlyRate * principal) / payment;
    // If payment is too small to cover interest, return a large number to indicate non-amortizing
    if (ratio <= 0) {
      return Number.POSITIVE_INFINITY as unknown as number;
    }
    const n = -Math.log(ratio) / Math.log(1 + monthlyRate);
    return Math.ceil(n);
  }

  // Format currency for Mexican Pesos
  formatCurrency(amount: number): string {
    return formatCurrencyMXN(round2(amount));
  }
}
