import { annuity, avg, clamp, monthsToYearsCeil, nonNegative, percentOf, round2, safeAdd, safeDiv, safeMul, safeSub, sum, toAnnualFromMonthly, toMonthlyRate } from './math.util';

describe('math.util', () => {
	it('round2 should round to 2 decimals', () => {
		expect(round2(1.005)).toBe(1.01);
		expect(round2(2.004)).toBe(2.00);
	});

	it('safe operations should reduce FP drift', () => {
		const a = 0.1;
		const b = 0.2;
		expect(safeAdd(a, b)).toBe(0.3);
		expect(safeSub(1, 0.7)).toBe(0.3);
		expect(safeMul(1.23, 4.56)).toBe(5.61);
		expect(safeDiv(1, 3)).toBe(0.33);
	});

	it('clamp should bound values', () => {
		expect(clamp(5, 1, 10)).toBe(5);
		expect(clamp(-1, 0, 10)).toBe(0);
		expect(clamp(11, 0, 10)).toBe(10);
	});

	it('rate conversions should be consistent', () => {
		const monthly = toMonthlyRate(12); // 12% annual -> ~0.0095 (decimal)
		expect(monthly).toBeCloseTo(0.01, 2);
		const annual = toAnnualFromMonthly(monthly);
		expect(annual).toBeCloseTo(0.13, 2); // (1+0.01)^12 - 1 ≈ 0.1268 -> 0.13
	});

	it('annuity should compute payment correctly', () => {
		const principal = 100000;
		const rate = 0.02; // monthly
		const months = 12;
		const payment = annuity(principal, rate, months);
		expect(payment).toBeCloseTo(9456.0, 0); // ~2000 / (1 - 1.02^-12)
	});

	it('helpers should aggregate values', () => {
		expect(sum([1, 2, 3, 4])).toBe(10);
		expect(avg([2, 4, 6, 8])).toBe(5);
		expect(percentOf(200, 15)).toBe(30);
		expect(nonNegative(-5)).toBe(0);
	});

	it('monthsToYearsCeil should ceil to years', () => {
		expect(monthsToYearsCeil(0)).toBe(0);
		expect(monthsToYearsCeil(1)).toBe(1);
		expect(monthsToYearsCeil(12)).toBe(1);
		expect(monthsToYearsCeil(13)).toBe(2);
	});
});

