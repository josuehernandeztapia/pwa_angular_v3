import { FinancialCalculatorService } from './financial-calculator.service';

describe('FinancialCalculatorService', () => {
  let fin: FinancialCalculatorService;

  beforeEach(() => {
    fin = new FinancialCalculatorService();
  });

  it('inverse IRR parity for annuity (monthly)', () => {
    const principal = 100_000;
    const rMonthly = 0.02; // 2% mensual
    const term = 36;
    const payment = fin.annuity(principal, rMonthly, term);
    const implied = fin.computeImpliedMonthlyRateFromAnnuity(principal, payment, term, { tolerance: 1e-8 });
    expect(Math.abs(implied - rMonthly)).toBeLessThan(1e-6);
  });

  it('getIrrTarget falls back to market baseline', () => {
    const tAgs = fin.getIrrTarget('aguascalientes');
    const baseAgs = fin.getTIRMin('aguascalientes');
    expect(tAgs).toBeCloseTo(baseAgs, 10);
  });
});

