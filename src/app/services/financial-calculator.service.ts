import { Injectable } from '@angular/core';
import { Market } from '../models/types';

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

  // Newton-Raphson method for TIR calculation - exact port from React
  calculateTIR(cashFlows: number[], guess: number = 0.1, tolerance: number = 1e-6, maxIterations: number = 100): number {
    let rate = guess;
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let npvDerivative = 0;
      
      for (let t = 0; t < cashFlows.length; t++) {
        const denominator = Math.pow(1 + rate, t);
        npv += cashFlows[t] / denominator;
        npvDerivative -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
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
    if (term <= 0) return principal;
    if (monthlyRate <= 0) return principal / term;
    return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
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
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }
}