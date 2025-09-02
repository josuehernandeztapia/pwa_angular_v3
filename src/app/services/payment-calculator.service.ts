import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { FinancialCalculatorService } from './financial-calculator.service';
import { Client, BusinessFlow, Market } from '../models/types';

export interface AmortizationRow {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface PaymentPlan {
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  firstPaymentDate: Date;
  finalPaymentDate: Date;
  amortizationTable: AmortizationRow[];
}

export interface PaymentProjection {
  currentBalance: number;
  paymentsMade: number;
  paymentsRemaining: number;
  totalInterestPaid: number;
  totalInterestRemaining: number;
  payoffDate: Date;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
}

export interface EarlyPaymentAnalysis {
  currentBalance: number;
  interestSaved: number;
  monthsSaved: number;
  newPayoffDate: Date;
  newTotalInterest: number;
  recommendedAmount: number;
  breakEvenPoint: number;
}

export interface PaymentCapacityAnalysis {
  monthlyIncome: number;
  currentDebt: number;
  availableIncome: number;
  recommendedPayment: number;
  maxLoanAmount: number;
  debtToIncomeRatio: number;
  paymentToIncomeRatio: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PaymentCalculatorService {

  constructor(private financialCalc: FinancialCalculatorService) {}

  /**
   * Generate complete payment plan with amortization table
   */
  generatePaymentPlan(
    loanAmount: number,
    annualRate: number,
    termMonths: number,
    firstPaymentDate?: Date
  ): Observable<PaymentPlan> {
    
    const monthlyRate = annualRate / 12;
    const monthlyPayment = this.financialCalc.annuity(loanAmount, monthlyRate, termMonths);
    const totalPayments = monthlyPayment * termMonths;
    const totalInterest = totalPayments - loanAmount;
    
    const startDate = firstPaymentDate || new Date();
    const finalDate = new Date(startDate);
    finalDate.setMonth(finalDate.getMonth() + termMonths);

    const amortizationTable = this.buildAmortizationTable(
      loanAmount, 
      monthlyRate, 
      termMonths, 
      monthlyPayment
    );

    const paymentPlan: PaymentPlan = {
      loanAmount,
      interestRate: annualRate,
      termMonths,
      monthlyPayment,
      totalPayments,
      totalInterest,
      firstPaymentDate: startDate,
      finalPaymentDate: finalDate,
      amortizationTable
    };

    return of(paymentPlan).pipe(delay(400));
  }

  /**
   * Calculate current payment status and projections
   */
  calculatePaymentProjection(
    originalPlan: PaymentPlan,
    paymentsMade: number,
    lastPaymentDate?: Date
  ): Observable<PaymentProjection> {
    
    const currentBalance = this.calculateRemainingBalance(
      originalPlan.loanAmount,
      originalPlan.interestRate / 12,
      originalPlan.termMonths,
      originalPlan.monthlyPayment,
      paymentsMade
    );

    const paymentsRemaining = originalPlan.termMonths - paymentsMade;
    const totalInterestPaid = originalPlan.amortizationTable
      .slice(0, paymentsMade)
      .reduce((sum, row) => sum + row.interest, 0);
    
    const totalInterestRemaining = originalPlan.totalInterest - totalInterestPaid;

    const nextPaymentDate = lastPaymentDate 
      ? new Date(lastPaymentDate.getTime() + 30 * 24 * 60 * 60 * 1000) // Add 30 days
      : new Date();

    const payoffDate = new Date(nextPaymentDate);
    payoffDate.setMonth(payoffDate.getMonth() + paymentsRemaining);

    const projection: PaymentProjection = {
      currentBalance,
      paymentsMade,
      paymentsRemaining,
      totalInterestPaid,
      totalInterestRemaining,
      payoffDate,
      nextPaymentDate,
      nextPaymentAmount: originalPlan.monthlyPayment
    };

    return of(projection).pipe(delay(200));
  }

  /**
   * Analyze impact of early/additional payments
   */
  analyzeEarlyPayment(
    originalPlan: PaymentPlan,
    currentPaymentsMade: number,
    additionalPayment: number
  ): Observable<EarlyPaymentAnalysis> {
    
    const currentBalance = this.calculateRemainingBalance(
      originalPlan.loanAmount,
      originalPlan.interestRate / 12,
      originalPlan.termMonths,
      originalPlan.monthlyPayment,
      currentPaymentsMade
    );

    // Calculate new payment plan with additional principal payment
    const newBalance = Math.max(0, currentBalance - additionalPayment);
    const monthlyRate = originalPlan.interestRate / 12;
    
    // Calculate remaining term with new balance
    let remainingPayments = 0;
    let balance = newBalance;
    let totalInterestWithExtra = 0;

    while (balance > 0.01 && remainingPayments < originalPlan.termMonths) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = Math.min(originalPlan.monthlyPayment - interestPayment, balance);
      
      balance -= principalPayment;
      totalInterestWithExtra += interestPayment;
      remainingPayments++;
    }

    const originalRemainingPayments = originalPlan.termMonths - currentPaymentsMade;
    const monthsSaved = originalRemainingPayments - remainingPayments;
    
    const originalRemainingInterest = originalPlan.amortizationTable
      .slice(currentPaymentsMade)
      .reduce((sum, row) => sum + row.interest, 0);
    
    const interestSaved = originalRemainingInterest - totalInterestWithExtra;

    const newPayoffDate = new Date();
    newPayoffDate.setMonth(newPayoffDate.getMonth() + remainingPayments);

    // Recommended additional payment (10% of remaining balance)
    const recommendedAmount = Math.min(currentBalance * 0.1, originalPlan.monthlyPayment);
    
    // Break-even point (months to recover additional payment through interest savings)
    const breakEvenPoint = additionalPayment / (originalPlan.monthlyPayment * monthlyRate);

    const analysis: EarlyPaymentAnalysis = {
      currentBalance,
      interestSaved,
      monthsSaved,
      newPayoffDate,
      newTotalInterest: totalInterestWithExtra,
      recommendedAmount,
      breakEvenPoint
    };

    return of(analysis).pipe(delay(300));
  }

  /**
   * Analyze client's payment capacity and debt capacity
   */
  analyzePaymentCapacity(
    monthlyIncome: number,
    currentMonthlyDebt: number = 0,
    market: Market,
    flow: BusinessFlow
  ): Observable<PaymentCapacityAnalysis> {
    
    const availableIncome = monthlyIncome - currentMonthlyDebt;
    const debtToIncomeRatio = currentMonthlyDebt / monthlyIncome;
    
    // Conservative payment capacity (max 35% of gross income for all debts)
    const maxTotalDebt = monthlyIncome * 0.35;
    const availableForNewDebt = maxTotalDebt - currentMonthlyDebt;
    const recommendedPayment = Math.min(availableForNewDebt, availableIncome * 0.4);

    // Calculate maximum loan amount based on payment capacity
    const interestRate = this.getMarketRate(market, flow);
    const termMonths = this.getStandardTerm(market, flow);
    const monthlyRate = interestRate / 12;
    
    const maxLoanAmount = recommendedPayment > 0 
      ? this.financialCalc.presentValue(recommendedPayment, monthlyRate, termMonths)
      : 0;

    const paymentToIncomeRatio = recommendedPayment / monthlyIncome;
    
    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (debtToIncomeRatio > 0.4 || paymentToIncomeRatio > 0.25) {
      riskLevel = 'high';
    } else if (debtToIncomeRatio > 0.25 || paymentToIncomeRatio > 0.15) {
      riskLevel = 'medium';
    }

    const recommendations = this.generatePaymentRecommendations(
      debtToIncomeRatio,
      paymentToIncomeRatio,
      riskLevel,
      market
    );

    const analysis: PaymentCapacityAnalysis = {
      monthlyIncome,
      currentDebt: currentMonthlyDebt,
      availableIncome,
      recommendedPayment,
      maxLoanAmount,
      debtToIncomeRatio,
      paymentToIncomeRatio,
      riskLevel,
      recommendations
    };

    return of(analysis).pipe(delay(500));
  }

  /**
   * Calculate optimal down payment for maximum benefit
   */
  calculateOptimalDownPayment(
    vehiclePrice: number,
    availableCash: number,
    market: Market,
    flow: BusinessFlow
  ): Observable<{
    minimumDownPayment: number;
    recommendedDownPayment: number;
    optimalDownPayment: number;
    scenarios: Array<{
      downPayment: number;
      loanAmount: number;
      monthlyPayment: number;
      totalInterest: number;
      totalCost: number;
    }>;
  }> {
    
    const minDownPaymentPct = this.getMinimumDownPayment(market, flow);
    const minimumDownPayment = vehiclePrice * minDownPaymentPct;
    
    // Recommended: 25% more than minimum
    const recommendedDownPayment = Math.min(
      vehiclePrice * (minDownPaymentPct + 0.10),
      availableCash * 0.8 // Leave 20% as emergency fund
    );

    // Optimal: Balance between cash flow and total cost
    const optimalDownPayment = this.findOptimalDownPayment(
      vehiclePrice,
      availableCash,
      market,
      flow
    );

    // Generate scenarios
    const scenarios = [0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]
      .map(pct => vehiclePrice * pct)
      .filter(dp => dp >= minimumDownPayment && dp <= availableCash)
      .map(downPayment => {
        const loanAmount = vehiclePrice - downPayment;
        const interestRate = this.getMarketRate(market, flow);
        const termMonths = this.getStandardTerm(market, flow);
        const monthlyPayment = this.financialCalc.annuity(
          loanAmount, 
          interestRate / 12, 
          termMonths
        );
        const totalInterest = (monthlyPayment * termMonths) - loanAmount;
        const totalCost = vehiclePrice + totalInterest;

        return {
          downPayment,
          loanAmount,
          monthlyPayment,
          totalInterest,
          totalCost
        };
      });

    return of({
      minimumDownPayment,
      recommendedDownPayment,
      optimalDownPayment,
      scenarios
    }).pipe(delay(400));
  }

  // === PRIVATE HELPER METHODS ===

  private buildAmortizationTable(
    principal: number,
    monthlyRate: number,
    termMonths: number,
    monthlyPayment: number
  ): AmortizationRow[] {
    const table: AmortizationRow[] = [];
    let balance = principal;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;

    for (let period = 1; period <= termMonths; period++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
      
      balance = Math.max(0, balance - principalPayment);
      cumulativeInterest += interestPayment;
      cumulativePrincipal += principalPayment;

      table.push({
        period,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance,
        cumulativeInterest,
        cumulativePrincipal
      });

      if (balance === 0) break;
    }

    return table;
  }

  private calculateRemainingBalance(
    originalPrincipal: number,
    monthlyRate: number,
    totalTerms: number,
    monthlyPayment: number,
    paymentsMade: number
  ): number {
    if (monthlyRate === 0) {
      return Math.max(0, originalPrincipal - (monthlyPayment * paymentsMade));
    }

    let balance = originalPrincipal;
    for (let i = 0; i < paymentsMade; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
      balance = Math.max(0, balance - principalPayment);
    }

    return balance;
  }

  private findOptimalDownPayment(
    vehiclePrice: number,
    availableCash: number,
    market: Market,
    flow: BusinessFlow
  ): number {
    // Optimal point balances monthly payment reduction vs cash preservation
    const minDown = vehiclePrice * this.getMinimumDownPayment(market, flow);
    const maxDown = Math.min(vehiclePrice * 0.6, availableCash * 0.75);
    
    // Sweet spot is typically around 30-40% for most scenarios
    const targetDownPayment = vehiclePrice * 0.35;
    
    return Math.max(minDown, Math.min(targetDownPayment, maxDown));
  }

  private getMarketRate(market: Market, flow: BusinessFlow): number {
    if (flow === BusinessFlow.VentaDirecta || flow === BusinessFlow.AhorroProgramado) {
      return 0; // No interest for direct sales or savings
    }
    
    return market === 'aguascalientes' ? 0.255 : 0.299; // 25.5% AGS, 29.9% EdoMex
  }

  private getStandardTerm(market: Market, flow: BusinessFlow): number {
    if (market === 'aguascalientes') {
      return 24; // 24 months standard for AGS
    }
    
    return flow === BusinessFlow.CreditoColectivo ? 60 : 48; // 60 months collective, 48 individual
  }

  private getMinimumDownPayment(market: Market, flow: BusinessFlow): number {
    if (market === 'aguascalientes') {
      return 0.60; // 60% minimum for AGS
    }
    
    if (flow === BusinessFlow.CreditoColectivo) {
      return 0.15; // 15% for collective credit
    }
    
    return 0.25; // 25% for EdoMex individual
  }

  private generatePaymentRecommendations(
    debtToIncomeRatio: number,
    paymentToIncomeRatio: number,
    riskLevel: string,
    market: Market
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'high') {
      recommendations.push('Considerar reducir el monto del crédito');
      recommendations.push('Evaluar aumentar el plazo de pago');
      recommendations.push('Solicitar aval o garantía adicional');
    }

    if (debtToIncomeRatio > 0.35) {
      recommendations.push('Liquidar deudas existentes antes del nuevo crédito');
    }

    if (paymentToIncomeRatio < 0.10) {
      recommendations.push('Capacidad de pago excelente - puede considerar monto mayor');
    }

    if (market === 'edomex' && paymentToIncomeRatio > 0.20) {
      recommendations.push('Para EdoMex, considerar crédito colectivo para mejores condiciones');
    }

    return recommendations;
  }
}