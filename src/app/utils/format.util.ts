// MX formatting helpers

import { round2 } from './math.util';

export function formatCurrencyMXN(value: number | string, withSymbol = true): string {
	const num = round2(typeof value === 'string' ? Number(value) : value);
	const formatted = num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	return withSymbol ? `$${formatted}` : formatted;
}

export function parseCurrency(input: string | number | null | undefined): number {
	if (input == null) return 0;
	if (typeof input === 'number') return input;
	const cleaned = input.replace(/[^0-9.-]/g, '');
	const n = Number(cleaned);
	return Number.isFinite(n) ? n : 0;
}

export function formatPercent(rate: number | string, decimals = 2): string {
	const n = typeof rate === 'string' ? Number(rate) : rate;
	const value = Number.isFinite(n) ? n : 0;
	return `${value.toFixed(decimals)}%`;
}

export function toYears(termMonths: number): string {
	if (!Number.isFinite(termMonths) || termMonths <= 0) return '0 años';
	const years = Math.floor(termMonths / 12);
	const remaining = termMonths % 12;
	if (years === 0) return `${remaining} meses`;
	if (remaining === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
	return `${years} ${years === 1 ? 'año' : 'años'} ${remaining} meses`;
}

