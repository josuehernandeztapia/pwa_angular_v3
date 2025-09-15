import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Client, EventType, Market, ProtectionScenario } from '../models/types';
import { round2 } from '../utils/math.util';
import { FinancialCalculatorService } from './financial-calculator.service';

// Port exacto de getBalance desde React simulationService.ts
function getBalance(principal: number, monthlyPayment: number, monthlyRate: number, monthsPaid: number): number {
  if (monthlyRate === 0) return principal - (monthlyPayment * monthsPaid);
  
  let balance = principal;
  for (let i = 0; i < monthsPaid; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance = Math.max(0, balance - principalPayment);
  }
  return balance;
}

// Port exacto de annuity desde React simulationService.ts
function annuity(principal: number, rate: number, nper: number): number {
  if (rate === 0) return principal / nper;
  return principal * (rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}

@Injectable({
  providedIn: 'root'
})
export class ProtectionEngineService {

  constructor(private financialCalc: FinancialCalculatorService) { }

  /**
   * Port exacto de simulateRestructure desde React simulationService.ts líneas 665-806
   */
  simulateRestructure(client: Client, months: number): Observable<ProtectionScenario[]> {
    if (!client || !client.paymentPlan || !client.remainderAmount) {
      return of([]).pipe(delay(100)); // Return empty scenarios for invalid clients
    }

    const P = Math.max(0, client.remainderAmount);
    const M = Math.max(0, client.paymentPlan.monthlyPayment || client.paymentPlan.monthlyGoal || 0);
    const market = client.market || 'aguascalientes';
    const r = this.financialCalc.getTIRMin(market) / 12;
    const originalTerm = client.paymentPlan.term || 48;
    const paymentEvents = client.events.filter(e => e.type === EventType.Contribution || e.type === EventType.Collection).length;
    const monthsPaid = Math.floor(paymentEvents / 2); // very rough estimate
    const remainingTerm = originalTerm - monthsPaid;

    if (remainingTerm <= months) {
      return of([]).pipe(delay(100));
    }
    
    const B_k = Math.max(0, getBalance(P, M, r, monthsPaid));
    const scenarios: ProtectionScenario[] = [];

    // Scenario A: Pausa y Prorrateo (Deferral) - Port exacto líneas 686-697
    const newRemainingTerm_A = remainingTerm - months;
    const newPayment_A = round2(Math.max(0, annuity(B_k, r, newRemainingTerm_A)));
    scenarios.push({
      type: 'defer',
      title: 'Pausa y Prorrateo',
      description: 'Pausa los pagos y distribuye el monto en las mensualidades restantes.',
      newMonthlyPayment: newPayment_A,
      newTerm: originalTerm,
      termChange: 0,
      details: [
        `Pagos de $0 por ${months} meses`, 
        `El pago mensual sube a ${this.financialCalc.formatCurrency(newPayment_A)} después.`
      ]
    });

    // Scenario B: Reducción y Compensación (Step-down) - Port exacto líneas 699-711
    const reducedPayment = round2(Math.max(0, M * 0.5));
    const principalAfterStepDown = Math.max(0, getBalance(B_k, reducedPayment, r, months));
    const compensationPayment = round2(Math.max(0, annuity(principalAfterStepDown, r, remainingTerm - months)));
    scenarios.push({
      type: 'step-down',
      title: 'Reducción y Compensación',
      description: 'Reduce el pago a la mitad y compensa la diferencia más adelante.',
      newMonthlyPayment: compensationPayment,
      newTerm: originalTerm,
      termChange: 0,
      details: [
        `Pagos de ${this.financialCalc.formatCurrency(reducedPayment)} por ${months} meses`, 
        `El pago sube a ${this.financialCalc.formatCurrency(compensationPayment)} después.`
      ]
    });

    // Scenario C: Extensión de Plazo - capitalizar interés durante los meses de diferimiento
    const capitalizedBalance_C = this.financialCalc.capitalizeInterest(B_k, r, months);
    const newTerm_C = originalTerm + months;
    // Mantener el pago original; calcular término efectivo por consistencia analítica
    const impliedTermAfterResume = this.financialCalc.getTermFromPayment(capitalizedBalance_C, r, M);
    const finalNewTerm_C = Number.isFinite(impliedTermAfterResume) ? months + impliedTermAfterResume : newTerm_C;
    scenarios.push({
      type: 'recalendar',
      title: 'Extensión de Plazo',
      description: 'Mantener el pago actual y extender el plazo para compensar.',
      newMonthlyPayment: round2(M),
      newTerm: Math.max(newTerm_C, finalNewTerm_C),
      termChange: Math.max(newTerm_C, finalNewTerm_C) - originalTerm,
      details: [
        `Pagos de $0 por ${months} meses`, 
        `Interés capitalizado durante diferimiento`,
        `El plazo se extiende en ${Math.max(newTerm_C, finalNewTerm_C) - originalTerm} meses.`
      ]
    });

    // Port exacto de mockApi delay desde React
    return of(scenarios).pipe(delay(1500));
  }

  // Enhanced scenario generation with TIR validation - exact port from React
  generateScenarioWithTIR(
    type: 'defer' | 'step-down' | 'recalendar', 
    title: string, 
    description: string,
    currentBalance: number,
    monthlyRate: number,
    originalPayment: number,
    remainingTerm: number,
    affectedMonths: number,
    reductionFactor: number = 1,
    market?: Market | string
  ): ProtectionScenario | null {
    
    const policyValidation = this.financialCalc.validateScenarioPolicy(
      type, 
      affectedMonths, 
      reductionFactor < 1 ? 1 - reductionFactor : undefined
    );
    
    if (!policyValidation.valid) {
      return null; // Skip invalid scenarios
    }

    let newPayment = 0;
    let newTerm = remainingTerm;
    let cashFlows: number[] = [];
    let adjustedBalance = currentBalance;
    let capitalizedInterest = 0;

    if (type === 'defer') {
      // Capitalize interest during deferral
      adjustedBalance = this.financialCalc.capitalizeInterest(currentBalance, monthlyRate, affectedMonths);
      capitalizedInterest = adjustedBalance - currentBalance;
      const newRemainingTerm = remainingTerm - affectedMonths;
      newPayment = this.financialCalc.annuity(adjustedBalance, monthlyRate, newRemainingTerm);
      
      // Cash flows: 0 for deferral months, then new payments
      const payments = new Array(affectedMonths).fill(0)
          .concat(new Array(newRemainingTerm).fill(newPayment));
      cashFlows = this.financialCalc.generateCashFlows(currentBalance, payments, remainingTerm);
      
    } else if (type === 'step-down') {
      const reducedPayment = originalPayment * reductionFactor;
      const balanceAfterReduced = this.financialCalc.getBalance(currentBalance, reducedPayment, monthlyRate, affectedMonths);
      const compensationPayment = this.financialCalc.annuity(balanceAfterReduced, monthlyRate, remainingTerm - affectedMonths);
      newPayment = compensationPayment;
      
      // Cash flows: reduced payments, then compensation payments
      const payments = new Array(affectedMonths).fill(reducedPayment)
          .concat(new Array(remainingTerm - affectedMonths).fill(compensationPayment));
      cashFlows = this.financialCalc.generateCashFlows(currentBalance, payments, remainingTerm);
      
    } else if (type === 'recalendar') {
      // Capitalize interest during deferral as in 'defer'
      const adjusted = this.financialCalc.capitalizeInterest(currentBalance, monthlyRate, affectedMonths);
      newTerm = remainingTerm + affectedMonths;
      newPayment = originalPayment;
      
      // Cash flows: 0 for deferral months, then original payments; use adjusted principal in cash flow engine
      const payments = new Array(affectedMonths).fill(0)
          .concat(new Array(remainingTerm).fill(originalPayment));
      cashFlows = this.financialCalc.generateCashFlows(adjusted, payments, newTerm);
      adjustedBalance = adjusted;
    }

    // Calculate TIR for this scenario vs. contract target IRR (market = contrato a plazos)
    const monthlyTIR = this.financialCalc.calculateTIR(cashFlows);
    const annualTIR = Number.isFinite(monthlyTIR) ? monthlyTIR * 12 : 0; // Convert monthly to annual, handle NaN/Inf
    const tirTargetAnnual = this.financialCalc.getTargetContractIRRAnnual(currentBalance, originalPayment, remainingTerm);
    const tolerance = (environment?.finance?.irrToleranceBps ?? 0) / 10000; // convert bps to decimal
    const tirOK = Number.isFinite(annualTIR) && (annualTIR + tolerance) >= tirTargetAnnual;

    const scenario: ProtectionScenario & {
      irr?: number;
      tirOK?: boolean;
      cashFlows?: number[];
      capitalizedInterest?: number;
      principalBalance?: number;
    } = {
      type,
      title,
      description,
      newMonthlyPayment: newPayment,
      newTerm: type === 'recalendar' ? remainingTerm + affectedMonths : remainingTerm,
      termChange: type === 'recalendar' ? affectedMonths : 0,
      details: [],
      // Advanced properties for mathematical analysis
      irr: annualTIR,
      tirOK,
      cashFlows,
      capitalizedInterest,
      principalBalance: adjustedBalance,
    };

    // Generate appropriate details based on scenario type
    if (type === 'defer') {
      scenario.details = [
        `Pagos de $0 por ${affectedMonths} meses`,
        `Interés capitalizado: ${this.financialCalc.formatCurrency(capitalizedInterest)}`,
        `El pago mensual sube a ${this.financialCalc.formatCurrency(newPayment)} después.`,
        `TIR: ${(annualTIR * 100).toFixed(2)}% ${tirOK ? '✓' : '✗'}`
      ];
    } else if (type === 'step-down') {
      const reducedPayment = originalPayment * reductionFactor;
      scenario.details = [
        `Pagos de ${this.financialCalc.formatCurrency(reducedPayment)} por ${affectedMonths} meses`,
        `El pago sube a ${this.financialCalc.formatCurrency(newPayment)} después.`,
        `TIR: ${(annualTIR * 100).toFixed(2)}% ${tirOK ? '✓' : '✗'}`
      ];
    } else if (type === 'recalendar') {
      scenario.details = [
        `Pagos de $0 por ${affectedMonths} meses`,
        `El plazo se extiende en ${affectedMonths} meses.`,
        `TIR: ${(annualTIR * 100).toFixed(2)}% ${tirOK ? '✓' : '✗'}`
      ];
    }

    return scenario;
  }

  // Generate standard protection scenarios for a client
  generateProtectionScenarios(
    currentBalance: number,
    originalPayment: number,
    remainingTerm: number,
    market: Market
  ): ProtectionScenario[] {
    // Derive implied monthly rate from current contract terms (saldo remanente, pago actual, plazo remanente)
    const monthlyRate = this.financialCalc.computeImpliedMonthlyRateFromAnnuity(currentBalance, originalPayment, remainingTerm);
    const scenarios: ProtectionScenario[] = [];

    // Scenario 1: Diferimiento 3 meses
    const defer3 = this.generateScenarioWithTIR(
      'defer',
      'Diferimiento 3 meses',
      'Suspender pagos por 3 meses, capitalizar interés',
      currentBalance,
      monthlyRate,
      originalPayment,
      remainingTerm,
      3,
      1,
      market
    );
    if (defer3) scenarios.push(defer3);

    // Scenario 2: Diferimiento 6 meses
    const defer6 = this.generateScenarioWithTIR(
      'defer',
      'Diferimiento 6 meses',
      'Suspender pagos por 6 meses, capitalizar interés',
      currentBalance,
      monthlyRate,
      originalPayment,
      remainingTerm,
      6,
      1,
      market
    );
    if (defer6) scenarios.push(defer6);

    // Scenario 3: Step-down 50% por 6 meses
    const stepDown = this.generateScenarioWithTIR(
      'step-down',
      'Reducción 50% por 6 meses',
      'Pagar 50% durante 6 meses, compensar después',
      currentBalance,
      monthlyRate,
      originalPayment,
      remainingTerm,
      6,
      0.5,
      market
    );
    if (stepDown) scenarios.push(stepDown);

    // Scenario 4: Recalendarización 6 meses
    const recalendar = this.generateScenarioWithTIR(
      'recalendar',
      'Recalendarización 6 meses',
      'Extender plazo y diferir 6 meses',
      currentBalance,
      monthlyRate,
      originalPayment,
      remainingTerm,
      6,
      1,
      market
    );
    if (recalendar) scenarios.push(recalendar);

    return scenarios; // Return all scenarios for analysis, let UI handle eligibility display
  }

  // Calculate impact summary for protection scenarios
  getProtectionImpact(scenario: ProtectionScenario, originalPayment: number, originalTerm: number): {
    paymentChange: number;
    paymentChangePercent: number;
    termChange: number;
    totalCostChange: number;
  } {
    const paymentChange = scenario.newMonthlyPayment - originalPayment;
    const paymentChangePercent = (paymentChange / originalPayment) * 100;
    const termChange = scenario.termChange;
    
    const originalTotalCost = originalPayment * originalTerm;
    const newTotalCost = scenario.newMonthlyPayment * scenario.newTerm;
    const totalCostChange = newTotalCost - originalTotalCost;

    return {
      paymentChange,
      paymentChangePercent,
      termChange,
      totalCostChange
    };
  }

  // Validate protection plan usage limits
  validateProtectionUsage(
    restructuresAvailable: number,
    restructuresUsed: number,
    scenarioType: 'defer' | 'step-down' | 'recalendar'
  ): { canUse: boolean; reason?: string } {
    if (restructuresUsed >= restructuresAvailable) {
      return {
        canUse: false,
        reason: `Se han agotado las reestructuras disponibles (${restructuresAvailable})`
      };
    }

    return { canUse: true };
  }
}
