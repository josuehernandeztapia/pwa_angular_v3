import { formatCurrencyMXN, formatPercent, parseCurrency, toYears } from './format.util';

describe('format.util', () => {
	it('formatCurrencyMXN should format with symbol and two decimals', () => {
		expect(formatCurrencyMXN(1234.5)).toBe('$1,234.50');
		expect(formatCurrencyMXN('1000')).toBe('$1,000.00');
	});

	it('parseCurrency should parse strings with symbols and commas', () => {
		expect(parseCurrency('$1,234.56')).toBe(1234.56);
		expect(parseCurrency('MXN 9,999')).toBe(9999);
		expect(parseCurrency(null as any)).toBe(0);
	});

	it('formatPercent should format with default decimals', () => {
		expect(formatPercent(12.3456)).toBe('12.35%');
		expect(formatPercent('7.1', 1)).toBe('7.1%');
	});

	it('toYears should render human friendly term', () => {
		expect(toYears(0)).toBe('0 años');
		expect(toYears(6)).toBe('6 meses');
		expect(toYears(12)).toBe('1 año');
		expect(toYears(18)).toBe('1 año 6 meses');
	});
});

