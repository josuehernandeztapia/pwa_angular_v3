// Precision-safe math helpers and financial formulas

export type Numeric = number | string;

function toNumber(value: Numeric): number {
	if (typeof value === 'number') return value;
	const as = String(value).replace(/,/g, '').trim();
	const parsed = Number(as);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function clamp(value: Numeric, min: Numeric, max: Numeric): number {
	const v = toNumber(value);
	const lo = toNumber(min);
	const hi = toNumber(max);
	if (lo > hi) return v; // invalid bounds, return as-is
	return Math.min(Math.max(v, lo), hi);
}

export function round2(value: Numeric): number {
	const v = toNumber(value);
	return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function safeAdd(a: Numeric, b: Numeric): number {
	return round2(toNumber(a) + toNumber(b));
}

export function safeSub(a: Numeric, b: Numeric): number {
	return round2(toNumber(a) - toNumber(b));
}

export function safeMul(a: Numeric, b: Numeric): number {
	// Use integer math where possible to reduce FP drift
	const x = Math.round(toNumber(a) * 1000);
	const y = Math.round(toNumber(b) * 1000);
	return round2((x * y) / 1_000_000);
}

export function safeDiv(a: Numeric, b: Numeric): number {
	const denominator = toNumber(b);
	if (denominator === 0) return 0;
	return round2(toNumber(a) / denominator);
}

// Convert annual nominal rate to effective monthly rate
export function toMonthlyRate(annualRatePercent: Numeric): number {
	const annualRate = toNumber(annualRatePercent) / 100;
	// Effective monthly from nominal APR with compounding
	const monthly = Math.pow(1 + annualRate, 1 / 12) - 1;
	return round2(monthly);
}

// Standard annuity payment formula: P = r * PV / (1 - (1 + r)^-n)
export function annuity(principal: Numeric, monthlyRate: Numeric, months: number): number {
	const pv = toNumber(principal);
	const r = toNumber(monthlyRate);
	const n = Math.max(0, Math.floor(months));
	if (pv <= 0 || r <= 0 || n === 0) return 0;
	const denom = 1 - Math.pow(1 + r, -n);
	if (denom === 0) return 0;
	return round2((r * pv) / denom);
}

export function monthsToYearsCeil(months: number): number {
	if (!Number.isFinite(months) || months <= 0) return 0;
	return Math.ceil(months / 12);
}

export function toAnnualFromMonthly(monthlyRate: Numeric): number {
	const r = toNumber(monthlyRate);
	if (r <= 0) return 0;
	const annual = Math.pow(1 + r, 12) - 1;
	return round2(annual);
}

export function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

export function nonNegative(value: Numeric): number {
	return Math.max(0, toNumber(value));
}

export function percentOf(base: Numeric, percent: Numeric): number {
	return safeMul(toNumber(base), toNumber(percent) / 100);
}

export function sum(values: Array<Numeric>): number {
	return round2(values.reduce<number>((acc, v) => acc + toNumber(v), 0));
}

export function avg(values: Array<Numeric>): number {
	if (!values.length) return 0;
	return round2(sum(values) / values.length);
}

