import { TestBed } from '@angular/core/testing';
import { Client, EventType } from '../models/types';
import { FinancialCalculatorService } from './financial-calculator.service';
import { ProtectionEngineService } from './protection-engine.service';

describe('ProtectionEngineService', () => {
  let service: ProtectionEngineService;
  let mockFinancialCalc: jasmine.SpyObj<FinancialCalculatorService>;

  beforeEach(() => {
    mockFinancialCalc = jasmine.createSpyObj('FinancialCalculatorService', [
      'getTIRMin',
      'computeImpliedMonthlyRateFromAnnuity',
      'getTargetContractIRRAnnual',
      'annuity',
      'capitalizeInterest',
      'getTermFromPayment',
      'calculateTIR',
      'generateCashFlows',
      'getBalance',
      'formatCurrency',
      'validateScenarioPolicy'
    ]);

    mockFinancialCalc.getTIRMin.and.returnValue(0.255);
    mockFinancialCalc.computeImpliedMonthlyRateFromAnnuity.and.returnValue(0.255 / 12);
    mockFinancialCalc.getTargetContractIRRAnnual.and.callFake((p: number, m: number, n: number) => (0.255));
    mockFinancialCalc.annuity.and.callFake((p: number, r: number, n: number) => {
      if (r === 0 || n === 0) return 0;
      return p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    });
    mockFinancialCalc.capitalizeInterest.and.callFake((principal: number, monthlyRate: number, m: number) => {
      return principal * Math.pow(1 + monthlyRate, m);
    });
    mockFinancialCalc.getTermFromPayment.and.returnValue(42);
    mockFinancialCalc.calculateTIR.and.returnValue(0.03); // monthly 3% -> annual 36% >= 25.5%
    mockFinancialCalc.generateCashFlows.and.returnValue([-100000, 0, 0, 5000]);
    mockFinancialCalc.getBalance?.and.callThrough?.();
    mockFinancialCalc.formatCurrency.and.callFake((x: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x));
    mockFinancialCalc.validateScenarioPolicy.and.returnValue({ valid: true });

    TestBed.configureTestingModule({
      providers: [
        ProtectionEngineService,
        { provide: FinancialCalculatorService, useValue: mockFinancialCalc }
      ]
    });

    service = TestBed.inject(ProtectionEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('simulateRestructure', () => {
    const baseClient: Client = {
      id: 'c1',
      name: 'Juan',
      rfc: 'JUAX010101',
      flow: 0 as any,
      status: 'Activo',
      phone: '5555',
      email: 'a@b.com',
      market: 'edomex' as any,
      documents: [],
      events: [
        { id: 'e1', type: EventType.Contribution, timestamp: new Date(), amount: 1000 } as any,
        { id: 'e2', type: EventType.Collection, timestamp: new Date(), amount: 1000 } as any
      ],
      paymentPlan: { monthlyPayment: 7000, term: 60 },
      remainderAmount: 300000
    };

    it('should return scenarios for valid client and months', (done) => {
      service.simulateRestructure(baseClient, 3).subscribe(scenarios => {
        expect(Array.isArray(scenarios)).toBeTrue();
        expect(scenarios.length).toBeGreaterThan(0);
        expect(scenarios.some(s => s.type === 'DEFER')).toBeTrue();
        expect(scenarios.some(s => s.type === 'STEPDOWN')).toBeTrue();
        expect(scenarios.some(s => s.type === 'RECALENDAR')).toBeTrue();
        done();
      });
    });

    it('should return empty for invalid client', (done) => {
      const invalid: any = { paymentPlan: null, remainderAmount: null };
      service.simulateRestructure(invalid, 3).subscribe(s => {
        expect(s).toEqual([]);
        done();
      });
    });
  });

  describe('generateScenarioWithTIR', () => {
    it('should generate a valid defer scenario meeting TIR min', () => {
      const scenario = service.generateScenarioWithTIR(
        'DEFER',
        'Diferimiento',
        'Prueba defer',
        200000,
        0.255 / 12,
        8000,
        48,
        3,
        1,
        'edomex' as any
      );
      expect(scenario).toBeTruthy();
      expect(scenario!.type).toBe('DEFER');
      expect((scenario as any).tirOK).toBeTrue();
    });

    it('should generate step-down scenario', () => {
      const scenario = service.generateScenarioWithTIR(
        'STEPDOWN',
        'Reducción',
        'Prueba step-down',
        150000,
        0.255 / 12,
        8000,
        48,
        6,
        0.5,
        'edomex' as any
      );
      expect(scenario).toBeTruthy();
      expect(scenario!.type).toBe('STEPDOWN');
      expect((scenario as any).tirOK).toBeTrue();
    });
  });

  describe('getProtectionImpact', () => {
    it('should compute impact deltas correctly', () => {
      const scenario: any = { newMonthlyPayment: 9000, newTerm: 54, termChange: 6 };
      const impact = service.getProtectionImpact(scenario, 8000, 48);
      expect(impact.paymentChange).toBe(1000);
      expect(impact.paymentChangePercent).toBeCloseTo(12.5, 5);
      expect(impact.termChange).toBe(6);
      expect(impact.totalCostChange).toBeGreaterThan(0);
    });
  });

  describe('validateProtectionUsage', () => {
    it('should deny when limit reached', () => {
      const res = service.validateProtectionUsage(1, 1, 'DEFER');
      expect(res.canUse).toBeFalse();
    });

    it('should allow when under limit', () => {
      const res = service.validateProtectionUsage(3, 1, 'DEFER');
      expect(res.canUse).toBeTrue();
    });
  });
});
