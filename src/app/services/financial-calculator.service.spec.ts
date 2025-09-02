import { TestBed } from '@angular/core/testing';
import { FinancialCalculatorService } from './financial-calculator.service';
import { Market } from '../models/types';

describe('FinancialCalculatorService', () => {
  let service: FinancialCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinancialCalculatorService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Market-Specific TIR Rates', () => {
    it('should return correct TIR for Aguascalientes', () => {
      const rate = service.getTIRMin('aguascalientes');
      expect(rate).toBe(0.255);
    });

    it('should return correct TIR for Estado de México', () => {
      const rate = service.getTIRMin('edomex');
      expect(rate).toBe(0.299);
    });

    it('should return default TIR for unknown market', () => {
      const rate = service.getTIRMin('unknown' as Market);
      expect(rate).toBe(0.255); // Default to Aguascalientes
    });

    it('should return default TIR when market is undefined', () => {
      const rate = service.getTIRMin();
      expect(rate).toBe(0.255);
    });
  });

  describe('TIR Calculation (Newton-Raphson)', () => {
    it('should calculate TIR for simple cash flows', () => {
      // Investment of -1000, returns 600, 600
      const cashFlows = [-1000, 600, 600];
      const tir = service.calculateTIR(cashFlows);
      
      // Should be approximately 13% (0.13)
      expect(tir).toBeCloseTo(0.13, 2);
    });

    it('should calculate TIR for loan scenario', () => {
      // Loan of 100000, payments of -15000 for 8 months
      const cashFlows = [100000, -15000, -15000, -15000, -15000, -15000, -15000, -15000, -15000];
      const tir = service.calculateTIR(cashFlows);
      
      expect(tir).toBeGreaterThan(0);
      expect(tir).toBeLessThan(1); // Should be a reasonable rate
    });

    it('should handle zero cash flows', () => {
      const cashFlows = [0, 0, 0];
      const tir = service.calculateTIR(cashFlows);
      
      // When all cash flows are zero, TIR should be the initial guess
      expect(tir).toBeCloseTo(0.1, 1);
    });

    it('should handle single negative cash flow', () => {
      const cashFlows = [-1000];
      const tir = service.calculateTIR(cashFlows);
      
      // No positive returns, should handle gracefully
      expect(typeof tir).toBe('number');
    });

    it('should respect maximum iterations', () => {
      const cashFlows = [-1000, 100, 100, 100]; // Low return scenario
      const tir = service.calculateTIR(cashFlows, 0.1, 1e-6, 5); // Only 5 iterations
      
      expect(typeof tir).toBe('number');
    });

    it('should bound rate to reasonable values', () => {
      const cashFlows = [-1000, 5000, 5000]; // High return scenario
      const tir = service.calculateTIR(cashFlows);
      
      expect(tir).toBeLessThanOrEqual(10); // Should not exceed bound
      expect(tir).toBeGreaterThan(-0.99); // Should not go below bound
    });
  });

  describe('Cash Flow Generation', () => {
    it('should generate cash flows with principal and payments', () => {
      const principal = 100000;
      const payments = [5000, 5000, 5000, 5000];
      const term = 4;
      
      const cashFlows = service.generateCashFlows(principal, payments, term);
      
      expect(cashFlows.length).toBe(5); // term + 1
      expect(cashFlows[0]).toBe(-100000); // Negative principal
      expect(cashFlows[1]).toBe(5000);
      expect(cashFlows[2]).toBe(5000);
      expect(cashFlows[3]).toBe(5000);
      expect(cashFlows[4]).toBe(5000);
    });

    it('should handle fewer payments than term', () => {
      const principal = 100000;
      const payments = [5000, 5000]; // Only 2 payments
      const term = 4;
      
      const cashFlows = service.generateCashFlows(principal, payments, term);
      
      expect(cashFlows.length).toBe(5);
      expect(cashFlows[0]).toBe(-100000);
      expect(cashFlows[1]).toBe(5000);
      expect(cashFlows[2]).toBe(5000);
      expect(cashFlows[3]).toBe(0); // Missing payment defaults to 0
      expect(cashFlows[4]).toBe(0);
    });

    it('should handle empty payments array', () => {
      const principal = 100000;
      const payments: number[] = [];
      const term = 3;
      
      const cashFlows = service.generateCashFlows(principal, payments, term);
      
      expect(cashFlows.length).toBe(4);
      expect(cashFlows[0]).toBe(-100000);
      expect(cashFlows[1]).toBe(0);
      expect(cashFlows[2]).toBe(0);
      expect(cashFlows[3]).toBe(0);
    });
  });

  describe('Interest Capitalization', () => {
    it('should capitalize interest for deferral period', () => {
      const principal = 100000;
      const monthlyRate = 0.02; // 2% monthly
      const deferralMonths = 3;
      
      const capitalizedAmount = service.capitalizeInterest(principal, monthlyRate, deferralMonths);
      
      // 100000 * (1.02)^3 = 106,120.80
      expect(capitalizedAmount).toBeCloseTo(106120.80, 2);
    });

    it('should handle zero deferral months', () => {
      const principal = 100000;
      const monthlyRate = 0.02;
      const deferralMonths = 0;
      
      const capitalizedAmount = service.capitalizeInterest(principal, monthlyRate, deferralMonths);
      
      expect(capitalizedAmount).toBe(100000); // No change
    });

    it('should handle zero interest rate', () => {
      const principal = 100000;
      const monthlyRate = 0;
      const deferralMonths = 6;
      
      const capitalizedAmount = service.capitalizeInterest(principal, monthlyRate, deferralMonths);
      
      expect(capitalizedAmount).toBe(100000); // No interest
    });
  });

  describe('Scenario Policy Validation', () => {
    it('should validate defer scenario within limits', () => {
      const result = service.validateScenarioPolicy('defer', 3);
      
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject defer scenario exceeding limits', () => {
      const result = service.validateScenarioPolicy('defer', 8); // > 6 months
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('diferimiento no puede exceder 6 meses');
      expect(result.reason).toContain('Solicitado: 8 meses');
    });

    it('should validate step-down scenario within limits', () => {
      const result = service.validateScenarioPolicy('step-down', 12, 0.3); // 30% reduction
      
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject step-down scenario exceeding reduction limit', () => {
      const result = service.validateScenarioPolicy('step-down', 12, 0.7); // 70% reduction
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('reducción no puede exceder 50%');
      expect(result.reason).toContain('Solicitado: 70%');
    });

    it('should validate unknown scenario type', () => {
      const result = service.validateScenarioPolicy('unknown-type', 12);
      
      expect(result.valid).toBe(true); // Unknown types pass by default
    });

    it('should handle step-down without reduction percentage', () => {
      const result = service.validateScenarioPolicy('step-down', 12);
      
      expect(result.valid).toBe(true); // No reduction percentage to validate
    });
  });

  describe('Annuity Calculations', () => {
    it('should calculate monthly payment for standard loan', () => {
      const principal = 100000;
      const monthlyRate = 0.02; // 2% monthly
      const term = 12;
      
      const payment = service.annuity(principal, monthlyRate, term);
      
      // Should be around 9,456 pesos
      expect(payment).toBeGreaterThan(9000);
      expect(payment).toBeLessThan(10000);
    });

    it('should handle zero interest rate', () => {
      const principal = 100000;
      const monthlyRate = 0;
      const term = 12;
      
      const payment = service.annuity(principal, monthlyRate, term);
      
      expect(payment).toBeCloseTo(8333.33, 2); // 100000 / 12
    });

    it('should handle zero term', () => {
      const principal = 100000;
      const monthlyRate = 0.02;
      const term = 0;
      
      const payment = service.annuity(principal, monthlyRate, term);
      
      expect(payment).toBe(100000); // Return full principal
    });

    it('should handle negative interest rate', () => {
      const principal = 100000;
      const monthlyRate = -0.01;
      const term = 12;
      
      const payment = service.annuity(principal, monthlyRate, term);
      
      expect(payment).toBeCloseTo(8333.33, 2); // Fallback to zero rate
    });
  });

  describe('Balance Calculations', () => {
    it('should calculate remaining balance after payments', () => {
      const originalPrincipal = 100000;
      const originalPayment = 9000;
      const monthlyRate = 0.02;
      const monthsPaid = 6;
      
      const balance = service.getBalance(originalPrincipal, originalPayment, monthlyRate, monthsPaid);
      
      expect(balance).toBeGreaterThan(0);
      expect(balance).toBeLessThan(originalPrincipal);
    });

    it('should handle zero interest rate balance', () => {
      const originalPrincipal = 100000;
      const originalPayment = 8333.33;
      const monthlyRate = 0;
      const monthsPaid = 6;
      
      const balance = service.getBalance(originalPrincipal, originalPayment, monthlyRate, monthsPaid);
      
      // 100000 - (8333.33 * 6) = approximately 50000
      expect(balance).toBeCloseTo(50000, 0);
    });

    it('should handle zero months paid', () => {
      const originalPrincipal = 100000;
      const originalPayment = 9000;
      const monthlyRate = 0.02;
      const monthsPaid = 0;
      
      const balance = service.getBalance(originalPrincipal, originalPayment, monthlyRate, monthsPaid);
      
      expect(balance).toBe(100000); // No payments made
    });

    it('should handle negative interest rate in balance calculation', () => {
      const originalPrincipal = 100000;
      const originalPayment = 8333.33;
      const monthlyRate = -0.01;
      const monthsPaid = 6;
      
      const balance = service.getBalance(originalPrincipal, originalPayment, monthlyRate, monthsPaid);
      
      // Should fallback to zero rate calculation
      expect(balance).toBeCloseTo(50000, 0);
    });
  });

  describe('Currency Formatting', () => {
    it('should format positive amounts in Mexican Pesos', () => {
      const formatted = service.formatCurrency(123456.78);
      
      expect(formatted).toContain('123,456.78');
      expect(formatted).toContain('MX$'); // Mexican peso symbol
    });

    it('should format negative amounts', () => {
      const formatted = service.formatCurrency(-5000);
      
      expect(formatted).toContain('-');
      expect(formatted).toContain('5,000');
    });

    it('should format zero amount', () => {
      const formatted = service.formatCurrency(0);
      
      expect(formatted).toContain('0');
    });

    it('should format large amounts with proper separators', () => {
      const formatted = service.formatCurrency(1234567.89);
      
      expect(formatted).toContain('1,234,567.89');
    });

    it('should format small amounts', () => {
      const formatted = service.formatCurrency(0.50);
      
      expect(formatted).toContain('0.50');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large principal amounts', () => {
      const principal = 100000000; // 100 million
      const monthlyRate = 0.01;
      const term = 60;
      
      const payment = service.annuity(principal, monthlyRate, term);
      
      expect(payment).toBeGreaterThan(0);
      expect(isFinite(payment)).toBe(true);
    });

    it('should handle very small interest rates', () => {
      const principal = 100000;
      const monthlyRate = 0.0001; // 0.01%
      const term = 12;
      
      const payment = service.annuity(principal, monthlyRate, term);
      
      expect(payment).toBeGreaterThan(principal / term);
      expect(payment).toBeLessThan(principal);
    });

    it('should handle very long terms', () => {
      const principal = 100000;
      const monthlyRate = 0.01;
      const term = 360; // 30 years
      
      const payment = service.annuity(principal, monthlyRate, term);
      
      expect(payment).toBeGreaterThan(0);
      expect(payment).toBeLessThan(principal);
    });

    it('should handle TIR calculation convergence issues', () => {
      // Cash flows that might cause convergence issues
      const problematicCashFlows = [-1000, 1, 1, 1, 1000];
      
      const tir = service.calculateTIR(problematicCashFlows, 0.5, 1e-4, 50);
      
      expect(typeof tir).toBe('number');
      expect(isFinite(tir)).toBe(true);
    });
  });
});