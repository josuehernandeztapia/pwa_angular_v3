import { annuity, toMonthlyRate, round2 } from './math.util';

describe('math.util financial formulas', () => {
  it('annuity returns 0 for zero principal', () => {
    expect(annuity(0, 0.02, 12)).toBe(0);
  });

  it('annuity handles zero rate as straight division', () => {
    expect(annuity(12000, 0, 12)).toBe(1000);
  });

  it('annuity matches standard PMT within tolerance', () => {
    // Example: PV=500,000, annual 25.5%, monthly eff approx, n=24
    const pv = 500000;
    const annualRatePct = 25.5;
    const monthlyEff = Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
    const expected = round2((monthlyEff * pv) / (1 - Math.pow(1 + monthlyEff, -24)));

    const pmt = annuity(pv, monthlyEff, 24);
    const delta = Math.abs(pmt - expected);
    // P0 criterio: ±0.5% o ±$25
    const ok = delta <= Math.max(25, expected * 0.005);
    expect(ok).toBeTrue();
  });

  it('toMonthlyRate converts annual to effective monthly', () => {
    const m = toMonthlyRate(12); // ~0.9489% -> 0.95 after rounding
    expect(m).toBeCloseTo(0.95, 2);
  });
});

