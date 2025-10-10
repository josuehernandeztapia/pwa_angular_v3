import { TestBed } from '@angular/core/testing';
import { CotizadorEngineService, ProductPackage } from './cotizador-engine.service';
import { FinancialCalculatorService } from './financial-calculator.service';

describe('CotizadorEngineService', () => {
	let service: CotizadorEngineService;
	let financial: FinancialCalculatorService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [CotizadorEngineService, FinancialCalculatorService]
		});
		service = TestBed.inject(CotizadorEngineService);
		financial = TestBed.inject(FinancialCalculatorService);
	});

	it('calculates insurance by years ceil(term/12)', (done) => {
		service.getProductPackage('edomex-plazo').subscribe((pkg: ProductPackage) => {
			const term = 48; // 4 years
			const total = service.calculatePackagePrice(pkg, term, []);
			const base = pkg.components
				.filter(c => !c.isMultipliedByTerm)
				.reduce((s, c) => s + c.price, 0);
			const insurance = pkg.components.find(c => c.id === 'seguro')!;
			const expected = base + insurance.price * 4; // ceil(48/12) = 4
			(expect(total) as any).toBe(expected);
			done();
		});
	});

	it('validates down payment min/max range', (done) => {
		service.getProductPackage('edomex-plazo').subscribe(pkg => {
			const price = service.calculatePackagePrice(pkg, 48);
			const tooLow = service.validateDownPaymentRange(pkg, price, price * 0.10);
			(expect(tooLow.valid) as any).toBeFalsy();
			(expect(tooLow.errors.join(' ')) as any).toContain('mínimo');
			const tooHigh = service.validateDownPaymentRange(pkg, price, price * 0.50);
			(expect(tooHigh.valid) as any).toBeFalsy();
			(expect(tooHigh.errors.join(' ')) as any).toContain('máximo');
			done();
		});
	});

	it('computes monthly payment, total cost and CAT consistently', (done) => {
		service.getProductPackage('edomex-plazo').subscribe(pkg => {
			const term = 48;
			const totalPrice = service.calculatePackagePrice(pkg, term);
			const downPayment = totalPrice * pkg.minDownPaymentPercentage;
			const amountToFinance = totalPrice - downPayment;
			const monthlyRate = pkg.rate / 12;
			const monthlyPayment = financial.annuity(amountToFinance, monthlyRate, term);
			const quote = {
				totalPrice,
				downPayment,
				amountToFinance,
				term,
				monthlyPayment,
				market: 'edomex',
				clientType: 'Individual',
				flow: 0
			} as any;
			const totalCost = service.getTotalCost(quote);
			(expect(totalCost) as any).toBeGreaterThan(totalPrice);
			const cat = service.getCAT(quote);
			(expect(cat) as any).toBeGreaterThan(0);
			done();
		});
	});
});

import { BusinessFlow, Market } from '../models/types';
import { CotizadorConfig } from './cotizador-engine.service';

describe('CotizadorEngineService', () => {
  let service: CotizadorEngineService;
  let mockFinancialCalc: jasmine.SpyObj<FinancialCalculatorService>;

  beforeEach(() => {
    mockFinancialCalc = jasmine.createSpyObj('FinancialCalculatorService', [
      'annuity',
      'getTIRMin'
    ]);

    // Set up default return values with realistic calculations
    mockFinancialCalc.annuity.and.callFake((principal: number, monthlyRate: number, term: number) => {
      if (monthlyRate === 0 || term === 0) return 0;
      if (principal === 0) return 0;
      const factor = Math.pow(1 + monthlyRate, term);
      if (factor === 1) return principal / term; // Handle edge case
      return principal * (monthlyRate * factor) / (factor - 1);
    });
    mockFinancialCalc.getTIRMin.and.returnValue(0.255);

    TestBed.configureTestingModule({
      providers: [
        CotizadorEngineService,
        { provide: FinancialCalculatorService, useValue: mockFinancialCalc }
      ]
    });

    service = TestBed.inject(CotizadorEngineService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      (expect(service) as any).toBeTruthy();
    });
  });

  describe('Product Package Management', () => {
    it('should get Aguascalientes plazo package', (done) => {
      service.getProductPackage('aguascalientes-plazo').subscribe(pkg => {
        (expect(pkg.name) as any).toBe('Paquete Venta a Plazo - Aguascalientes');
        (expect(pkg.rate) as any).toBe(0.255);
        (expect(pkg.terms) as any).toEqual([12, 24]);
        (expect(pkg.minDownPaymentPercentage) as any).toBe(0.60);
        (expect(pkg.components.length) as any).toBe(2);
        (expect(pkg.components[0].name) as any).toBe('Vagoneta H6C (19 Pasajeros)');
        (expect(pkg.components[0].price) as any).toBe(799000);
        done();
      });
    });

    it('should get EdoMex colectivo package', (done) => {
      service.getProductPackage('edomex-colectivo').subscribe(pkg => {
        (expect(pkg.name) as any).toBe('Paquete Crédito Colectivo - EdoMex');
        (expect(pkg.rate) as any).toBe(0.299);
        (expect(pkg.terms) as any).toEqual([60]);
        (expect(pkg.minDownPaymentPercentage) as any).toBe(0.15);
        (expect(pkg.maxDownPaymentPercentage) as any).toBe(0.20);
        (expect(pkg.defaultMembers) as any).toBe(5);
        (expect(pkg.maxMembers) as any).toBe(20);
        (expect(pkg.components.length) as any).toBe(5);
        done();
      });
    });

    it('maps policy context to existing package keys', (done) => {
      service.getProductPackageForContext({
        market: 'edomex',
        saleType: 'financiero',
        clientType: 'colectivo'
      }).subscribe(pkg => {
        (expect(pkg.name) as any).toBe('Paquete Crédito Colectivo - EdoMex');
        done();
      });
    });

    it('should get EdoMex directa package', (done) => {
      service.getProductPackage('edomex-directa').subscribe(pkg => {
        (expect(pkg.name) as any).toBe('Paquete Compra de Contado - EdoMex');
        (expect(pkg.rate) as any).toBe(0);
        (expect(pkg.terms) as any).toEqual([]);
        (expect(pkg.minDownPaymentPercentage) as any).toBe(0.50);
        (expect(pkg.components.length) as any).toBe(3); // No GPS+Cámaras+Seguro for contado
        done();
      });
    });

    it('should handle unknown market gracefully', (done) => {
      service.getProductPackage('unknown-market').subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          (expect(error.message) as any).toContain('Paquete no encontrado para mercado: unknown-market');
          done();
        }
      });
    });
  });

  describe('Package Price Calculation', () => {
    let mockPackage: ProductPackage;

    beforeEach(() => {
      mockPackage = {
        name: 'Test Package',
        rate: 0.25,
        terms: [12, 24],
        minDownPaymentPercentage: 0.20,
        components: [
          { id: 'base', name: 'Base Unit', price: 500000, isOptional: false },
          { id: 'optional1', name: 'Optional Component', price: 50000, isOptional: true },
          { id: 'annual', name: 'Annual Fee', price: 10000, isOptional: false, isMultipliedByTerm: true }
        ]
      };
    });

    it('should calculate basic package price without optionals', () => {
      const price = service.calculatePackagePrice(mockPackage, 12, []);
      
      // Base (500000) + Annual fee for 1 year (10000)
      (expect(price) as any).toBe(510000);
    });

    it('should calculate package price with selected optionals', () => {
      const price = service.calculatePackagePrice(mockPackage, 12, ['optional1']);
      
      // Base (500000) + Optional (50000) + Annual fee for 1 year (10000)
      (expect(price) as any).toBe(560000);
    });

    it('should multiply term-based components by years', () => {
      const price = service.calculatePackagePrice(mockPackage, 24, []);
      
      // Base (500000) + Annual fee for 2 years (20000)
      (expect(price) as any).toBe(520000);
    });

    it('should handle 60-month terms correctly', () => {
      const price = service.calculatePackagePrice(mockPackage, 60, ['optional1']);
      
      // Base (500000) + Optional (50000) + Annual fee for 5 years (50000)
      (expect(price) as any).toBe(600000);
    });

    it('should skip optional components not selected', () => {
      const price = service.calculatePackagePrice(mockPackage, 12, ['nonexistent']);
      
      // Only base + annual fee, no optional
      (expect(price) as any).toBe(510000);
    });

    it('should handle package with no components', () => {
      const emptyPackage: ProductPackage = {
        name: 'Empty Package',
        rate: 0.25,
        terms: [12],
        minDownPaymentPercentage: 0.20,
        components: []
      };
      
      const price = service.calculatePackagePrice(emptyPackage);
      (expect(price) as any).toBe(0);
    });
  });

  describe('Balance Calculations', () => {
    it('should calculate balance for zero interest loan', () => {
      const balance = service.getBalance(100000, 0, 12, 6);
      
      // 100000 - (100000/12 * 6) = 100000 - 50000 = 50000
      (expect(balance) as any).toBe(50000);
    });

    it('should calculate balance for interest-bearing loan', () => {
      const balance = service.getBalance(100000, 0.12, 12, 6);
      
      // Balance should be positive and reasonably calculated
      (expect(balance) as any).toBeGreaterThan(40000); // More lenient than 0
      (expect(balance) as any).toBeLessThan(60000);   // Less than original simple division
    });

    it('should return zero when all payments made', () => {
      const balance = service.getBalance(100000, 0.12, 12, 12);
      (expect(balance) as any).toBeCloseTo(0, 2); // Allow small floating-point differences
    });

    it('should handle no payments made', () => {
      const balance = service.getBalance(100000, 0.12, 12, 0);
      (expect(balance) as any).toBe(100000);
    });

    it('should handle edge case with zero principal', () => {
      const balance = service.getBalance(0, 0.12, 12, 6);
      (expect(balance) as any).toBe(0);
    });
  });

  describe('Quote Generation with Package', () => {
    it('should generate quote with minimum down payment', (done) => {
      service.generateQuoteWithPackage('aguascalientes-plazo').subscribe(quote => {
        (expect(quote.totalPrice) as any).toBe(853000); // Vagoneta + GNV
        (expect(quote.downPayment) as any).toBe(511800); // 60% of 853000
        (expect(quote.amountToFinance) as any).toBe(341200);
        (expect(quote.term) as any).toBe(12);
        (expect(quote.market) as any).toBe('aguascalientes-plazo');
        (expect(mockFinancialCalc.annuity) as any).toHaveBeenCalled();
        done();
      });
    });

    it('should generate quote with custom down payment', (done) => {
      service.generateQuoteWithPackage('aguascalientes-plazo', [], 600000, 24).subscribe(quote => {
        (expect(quote.totalPrice) as any).toBe(853000);
        (expect(quote.downPayment) as any).toBe(600000);
        (expect(quote.amountToFinance) as any).toBe(253000);
        (expect(quote.term) as any).toBe(24);
        done();
      });
    });

    it('should determine client type from package data', (done) => {
      service.generateQuoteWithPackage('edomex-colectivo').subscribe(quote => {
        (expect(quote.clientType) as any).toBe('Colectivo');
        (expect(quote.flow) as any).toBe(BusinessFlow.CreditoColectivo);
        done();
      });
    });

    it('should handle direct sale (rate = 0)', (done) => {
      service.generateQuoteWithPackage('edomex-directa').subscribe(quote => {
        (expect(quote.monthlyPayment) as any).toBe(0);
        (expect(quote.flow) as any).toBe(BusinessFlow.VentaDirecta);
        done();
      });
    });
  });

  describe('Legacy Quote Generation', () => {
    let mockConfig: CotizadorConfig;

    beforeEach(() => {
      mockConfig = {
        totalPrice: 800000,
        downPayment: 200000,
        term: 24,
        market: 'aguascalientes',
        clientType: 'Individual',
        businessFlow: BusinessFlow.VentaPlazo
      };
    });

    it('should generate basic quote', () => {
      const quote = service.generateQuote(mockConfig);
      
      (expect(quote.totalPrice) as any).toBe(800000);
      (expect(quote.downPayment) as any).toBe(200000);
      (expect(quote.amountToFinance) as any).toBe(600000);
      (expect(quote.term) as any).toBe(24);
      (expect(quote.market) as any).toBe('aguascalientes');
      (expect(quote.clientType) as any).toBe('Individual');
      (expect(quote.flow) as any).toBe(BusinessFlow.VentaPlazo);
      (expect(mockFinancialCalc.annuity) as any).toHaveBeenCalled();
    });
  });

  describe('Amortization Table Generation', () => {
    let mockQuote: any;

    beforeEach(() => {
      mockQuote = {
        amountToFinance: 100000,
        monthlyPayment: 10000,
        term: 12,
        market: 'aguascalientes'
      };
    });

    it('should generate complete amortization table', () => {
      const table = service.generateAmortizationTable(mockQuote);
      
      (expect(table.length) as any).toBe(12);
      (expect(table[0].payment) as any).toBe(1);
      (expect(table[11].payment) as any).toBe(12);
      
      // Last payment should have balance of 0
      (expect(table[11].balance) as any).toBe(0);
      
      // Each row should have required properties
      table.forEach(row => {
        (expect(row.principalPayment) as any).toBeGreaterThan(0);
        (expect(row.interestPayment) as any).toBeGreaterThanOrEqual(0);
        (expect(row.balance) as any).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have decreasing balance over time', () => {
      const table = service.generateAmortizationTable(mockQuote);
      
      for (let i = 1; i < table.length; i++) {
        (expect(table[i].balance) as any).toBeLessThanOrEqual(table[i-1].balance);
      }
    });
  });

  describe('Configuration Validation', () => {
    let validConfig: CotizadorConfig;

    beforeEach(() => {
      validConfig = {
        totalPrice: 800000,
        downPayment: 480000, // 60% for Aguascalientes
        term: 24,
        market: 'aguascalientes',
        clientType: 'Individual',
        businessFlow: BusinessFlow.VentaPlazo
      };
    });

    it('should validate correct configuration', () => {
      const result = service.validateConfiguration(validConfig);
      
      (expect(result.valid) as any).toBe(true);
      (expect(result.errors.length) as any).toBe(0);
    });

    it('should reject insufficient down payment', () => {
      validConfig.downPayment = 200000; // Only 25%, need 60%
      
      const result = service.validateConfiguration(validConfig);
      
      (expect(result.valid) as any).toBe(false);
      (expect(result.errors.length) as any).toBe(1);
      (expect(result.errors[0]) as any).toContain('enganche mínimo');
      (expect(result.errors[0]) as any).toContain('60%');
    });

    it('should reject invalid term', () => {
      validConfig.term = 36; // Not allowed for Aguascalientes
      
      const result = service.validateConfiguration(validConfig);
      
      (expect(result.valid) as any).toBe(false);
      (expect(result.errors[0]) as any).toContain('plazos permitidos');
      (expect(result.errors[0]) as any).toContain('12, 24');
    });

    it('should reject zero or negative price', () => {
      validConfig.totalPrice = 0;
      
      const result = service.validateConfiguration(validConfig);
      
      (expect(result.valid) as any).toBe(false);
      (expect(result.errors[0]) as any).toContain('mayor a cero');
    });

    it('should reject down payment equal to total price', () => {
      validConfig.downPayment = validConfig.totalPrice;
      
      const result = service.validateConfiguration(validConfig);
      
      (expect(result.valid) as any).toBe(false);
      (expect(result.errors[0]) as any).toContain('no puede ser igual o mayor');
    });

    it('should validate EdoMex individual requirements', () => {
      const edomexConfig: CotizadorConfig = {
        totalPrice: 800000,
        downPayment: 200000, // 25%
        term: 48,
        market: 'edomex',
        clientType: 'Individual',
        businessFlow: BusinessFlow.VentaPlazo
      };
      
      const result = service.validateConfiguration(edomexConfig);
      (expect(result.valid) as any).toBe(true);
    });

    it('should validate EdoMex collective requirements', () => {
      const edomexConfig: CotizadorConfig = {
        totalPrice: 800000,
        downPayment: 120000, // 15%
        term: 60,
        market: 'edomex',
        clientType: 'Colectivo',
        businessFlow: BusinessFlow.CreditoColectivo
      };
      
      const result = service.validateConfiguration(edomexConfig);
      (expect(result.valid) as any).toBe(true);
    });
  });

  describe('Financial Summary Calculations', () => {
    let mockQuote: any;

    beforeEach(() => {
      mockQuote = {
        totalPrice: 800000,
        amountToFinance: 600000,
        monthlyPayment: 30000,
        term: 24,
        market: 'aguascalientes'
      };
    });

    it('should calculate total interest', () => {
      const totalInterest = service.getTotalInterest(mockQuote);
      
      // 30000 * 24 - 600000 = 720000 - 600000 = 120000
      (expect(totalInterest) as any).toBe(120000);
    });

    it('should generate financial summary', () => {
      const summary = service.getFinancialSummary(mockQuote);
      
      (expect(summary.totalCost) as any).toBe(920000); // 800000 + 120000
      (expect(summary.totalInterest) as any).toBe(120000);
      (expect(summary.effectiveRate) as any).toBe(25.5); // 0.255 * 100
      (expect(mockFinancialCalc.getTIRMin) as any).toHaveBeenCalledWith('aguascalientes');
    });
  });

  describe('Market-Specific Business Rules', () => {
    it('should apply Aguascalientes rules', () => {
      const minDownPayment = service['getMinimumDownPayment']('aguascalientes', 'Individual');
      const allowedTerms = service['getAllowedTerms']('aguascalientes');
      
      (expect(minDownPayment) as any).toBe(0.60);
      (expect(allowedTerms) as any).toEqual([12, 24]);
    });

    it('should apply EdoMex individual rules', () => {
      const minDownPayment = service['getMinimumDownPayment']('edomex', 'Individual');
      const allowedTerms = service['getAllowedTerms']('edomex');
      
      (expect(minDownPayment) as any).toBe(0.25);
      (expect(allowedTerms) as any).toEqual([48, 60]);
    });

    it('should apply EdoMex collective rules', () => {
      const minDownPayment = service['getMinimumDownPayment']('edomex', 'Colectivo');
      
      (expect(minDownPayment) as any).toBe(0.15);
    });

    it('should use fallback rules for unknown market', () => {
      const minDownPayment = service['getMinimumDownPayment']('unknown' as Market, 'Individual');
      const allowedTerms = service['getAllowedTerms']('unknown' as Market);
      
      (expect(minDownPayment) as any).toBe(0.20);
      (expect(allowedTerms) as any).toEqual([12, 24]);
    });
  });
});