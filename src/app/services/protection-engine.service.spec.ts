import { TestBed } from '@angular/core/testing';
import { Client, EventType, Market } from '../models/types';
import { ProtectionScenario, ProtectionType } from '../models/protection';
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

  // Global baseClient for all tests to use
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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('simulateRestructure', () => {

    it('should return scenarios for valid client and months', (done) => {
      service.simulateRestructure(baseClient, 3).subscribe(scenarios => {
        (expect(Array.isArray(scenarios)) as any).toBeTrue();
        expect(scenarios.length).toBeGreaterThan(0);
        (expect(scenarios.some(s => s.type === 'DEFER')) as any).toBeTrue();
        (expect(scenarios.some(s => s.type === 'STEPDOWN')) as any).toBeTrue();
        (expect(scenarios.some(s => s.type === 'RECALENDAR')) as any).toBeTrue();
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
      (expect((scenario as any).tirOK) as any).toBeTrue();
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
      (expect((scenario as any).tirOK) as any).toBeTrue();
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
      (expect(res.canUse) as any).toBeFalse();
    });

    it('should allow when under limit', () => {
      const res = service.validateProtectionUsage(3, 1, 'DEFER');
      (expect(res.canUse) as any).toBeTrue();
    });
  });

  // ============= COMPREHENSIVE MUTATION TESTING SCENARIOS =============
  describe('Comprehensive Scenario Generation Testing', () => {
    describe('All scenario types generation', () => {
      it('should generate exactly 3 scenario types when all conditions are met', () => {
        const scenarios = service.generateProtectionScenarios(200000, 8000, 48, 'edomex' as Market);

        // Verify all 3 scenario types are generated
        const deferScenarios = scenarios.filter(s => s.type === 'DEFER');
        const stepdownScenarios = scenarios.filter(s => s.type === 'STEPDOWN');
        const recalendarScenarios = scenarios.filter(s => s.type === 'RECALENDAR');

        expect(deferScenarios.length).toBeGreaterThan(0);
        expect(stepdownScenarios.length).toBeGreaterThan(0);
        expect(recalendarScenarios.length).toBeGreaterThan(0);

        // Verify scenario types are correctly assigned
        deferScenarios.forEach(s => expect(s.type).toBe('DEFER'));
        stepdownScenarios.forEach(s => expect(s.type).toBe('STEPDOWN'));
        recalendarScenarios.forEach(s => expect(s.type).toBe('RECALENDAR'));
      });

      it('should generate scenarios with different affected months', () => {
        const scenarios = service.generateProtectionScenarios(200000, 8000, 48, 'edomex' as Market);

        // Find defer scenarios with different months (3 and 6)
        const defer3 = scenarios.find(s => s.type === 'DEFER' && s.title?.includes('3 meses'));
        const defer6 = scenarios.find(s => s.type === 'DEFER' && s.title?.includes('6 meses'));

        expect(defer3).toBeTruthy();
        expect(defer6).toBeTruthy();
        expect(defer3?.params.d).toBe(3);
        expect(defer6?.params.d).toBe(6);
      });
    });

    describe('TIR Validation Testing', () => {
      it('should validate TIR meets minimum requirements', () => {
        const scenario = service.generateScenarioWithTIR(
          'DEFER',
          'Test Defer',
          'Test Description',
          200000,
          0.255 / 12,
          8000,
          48,
          3,
          1,
          'edomex' as Market
        );

        expect(scenario).toBeTruthy();
        expect(scenario!.tirOK).toBeDefined();
        expect(scenario!.irr).toBeDefined();
        expect(typeof scenario!.irr).toBe('number');

        // TIR should be calculated and compared to target
        expect(mockFinancialCalc.calculateTIR).toHaveBeenCalled();
        expect(mockFinancialCalc.getTargetContractIRRAnnual).toHaveBeenCalled();
      });

      it('should mark scenarios with insufficient TIR as invalid', () => {
// removed by clean-audit
        mockFinancialCalc.calculateTIR.and.returnValue(0.01); // 1% monthly -> 12% annual < 25.5%

        const scenario = service.generateScenarioWithTIR(
          'DEFER',
          'Low TIR Test',
          'Test with low TIR',
          200000,
          0.255 / 12,
          8000,
          48,
          3,
          1,
          'edomex' as Market
        );

        expect(scenario).toBeTruthy();
        (expect(scenario!.tirOK) as any).toBeFalse();
        expect(scenario!.irr).toBe(0.12); // 1% * 12
      });
    });

    describe('Edge Cases and Boundary Conditions', () => {
      it('should handle zero remainderAmount gracefully', () => {
        const clientZeroBalance = { ...baseClient, remainderAmount: 0 };
        service.simulateRestructure(clientZeroBalance, 3).subscribe(scenarios => {
          expect(scenarios).toEqual([]);
        });
      });

      it('should handle negative remainderAmount by converting to positive', (done) => {
        const clientNegBalance = { ...baseClient, remainderAmount: -100000 };
        service.simulateRestructure(clientNegBalance, 3).subscribe(scenarios => {
          expect(Array.isArray(scenarios)).toBe(true);
          // Should still generate scenarios as negative gets converted to Math.max(0, amount)
          expect(scenarios.length).toBeGreaterThan(0);
          done();
        });
      });

      it('should return empty when months >= remaining term', (done) => {
        service.simulateRestructure(baseClient, 100).subscribe(scenarios => {
          expect(scenarios).toEqual([]);
          done();
        });
      });

      it('should handle zero monthly payment', () => {
        const clientZeroPayment = {
          ...baseClient,
          paymentPlan: { monthlyPayment: 0, term: 60 }
        };
        service.simulateRestructure(clientZeroPayment, 3).subscribe(scenarios => {
          scenarios.forEach(s => {
            expect(s.newPayment).toBeDefined();
            expect(typeof s.newPayment).toBe('number');
          });
        });
      });

      it('should handle invalid/null paymentPlan', (done) => {
        const clientNullPlan = { ...baseClient, paymentPlan: null as any };
        service.simulateRestructure(clientNullPlan, 3).subscribe(scenarios => {
          expect(scenarios).toEqual([]);
          done();
        });
      });
    });

    describe('Mathematical Calculations Mutation Testing', () => {
      it('should use annuity calculation for DEFER scenarios', () => {
        const scenario = service.generateScenarioWithTIR(
          'DEFER',
          'Math Test',
          'Test annuity calculation',
          200000,
          0.02,
          8000,
          48,
          6,
          1,
          'edomex' as Market
        );

        expect(mockFinancialCalc.annuity).toHaveBeenCalled();
        expect(scenario?.Mprime).toBeGreaterThan(0);
        expect(scenario?.newPayment).toBeGreaterThan(0);
      });

      it('should correctly calculate capitalized interest for DEFER', () => {
        const scenario = service.generateScenarioWithTIR(
          'DEFER',
          'Capitalization Test',
          'Test interest capitalization',
          100000,
          0.02,
          5000,
          36,
          3,
          1,
          'edomex' as Market
        );

        expect(mockFinancialCalc.capitalizeInterest).toHaveBeenCalledWith(100000, 0.02, 3);
        expect(scenario?.capitalizedInterest).toBeDefined();
        expect(scenario?.principalBalance).toBeDefined();
      });

      it('should use balance calculation for STEPDOWN scenarios', () => {
        const scenario = service.generateScenarioWithTIR(
          'STEPDOWN',
          'Balance Test',
          'Test balance calculation',
          150000,
          0.02,
          6000,
          42,
          6,
          0.5,
          'edomex' as Market
        );

        expect(mockFinancialCalc.getBalance).toHaveBeenCalled();
        expect(scenario?.Mprime).toBeGreaterThan(0);

        // Verify that reduced payment is calculated correctly (50% of original)
        const reducedPayment = 6000 * 0.5;
        expect(mockFinancialCalc.getBalance).toHaveBeenCalledWith(
          jasmine.any(Number),
          reducedPayment,
          0.02,
          6
        );
      });

      it('should calculate term changes correctly for RECALENDAR', () => {
        const scenario = service.generateScenarioWithTIR(
          'RECALENDAR',
          'Term Change Test',
          'Test term extension',
          180000,
          0.02,
          7000,
          40,
          4,
          1,
          'edomex' as Market
        );

        expect(scenario?.termChange).toBe(4);
        expect(scenario?.newTerm).toBe(44); // 40 + 4
        expect(scenario?.nPrime).toBe(44);
        expect(scenario?.Mprime).toBe(7000); // Original payment maintained
      });
    });

    describe('Financial Calculations Validation', () => {
      it('should validate newPayment calculations are positive and finite', () => {
        const scenario = service.generateScenarioWithTIR(
          'DEFER',
          'Payment Validation',
          'Validate payment calculation',
          200000,
          0.02,
          8000,
          48,
          3,
          1,
          'edomex' as Market
        );

        expect(scenario?.newPayment).toBeGreaterThan(0);
        expect(scenario?.Mprime).toBeGreaterThan(0);
        expect(Number.isFinite(scenario?.newPayment)).toBe(true);
        expect(Number.isFinite(scenario?.Mprime)).toBe(true);
      });

      it('should validate term calculations are consistent', () => {
        const originalTerm = 48;
        const affectedMonths = 6;

        const deferScenario = service.generateScenarioWithTIR(
          'DEFER',
          'Term Consistency Test',
          'Test term consistency',
          200000,
          0.02,
          8000,
          originalTerm,
          affectedMonths,
          1,
          'edomex' as Market
        );

        const recalendarScenario = service.generateScenarioWithTIR(
          'RECALENDAR',
          'Recalendar Term Test',
          'Test recalendar term',
          200000,
          0.02,
          8000,
          originalTerm,
          affectedMonths,
          1,
          'edomex' as Market
        );

        // DEFER maintains original term
        expect(deferScenario?.newTerm).toBe(originalTerm);
        expect(deferScenario?.nPrime).toBe(originalTerm);

        // RECALENDAR extends term
        expect(recalendarScenario?.newTerm).toBe(originalTerm + affectedMonths);
        expect(recalendarScenario?.nPrime).toBe(originalTerm + affectedMonths);
      });

      it('should calculate protection impact correctly', () => {
        const scenario: ProtectionScenario = {
          type: 'STEPDOWN',
          params: { months: 6, alpha: 0.5 },
          Mprime: 9500,
          nPrime: 48,
          newPayment: 9500,
          newTerm: 48,
          termChange: 0,
          title: 'Test Scenario',
          description: 'Test',
          details: []
        };

        const impact = service.getProtectionImpact(scenario, 8000, 48);

        expect(impact.paymentChange).toBe(1500); // 9500 - 8000
        expect(impact.paymentChangePercent).toBeCloseTo(18.75, 2); // (1500/8000) * 100
        expect(impact.termChange).toBe(0);
        expect(impact.totalCostChange).toBe(72000); // (9500*48) - (8000*48)
      });
    });

    describe('Protection Eligibility Logic', () => {
      it('should validate scenario policy before generation', () => {
        mockFinancialCalc.validateScenarioPolicy.and.returnValue({ valid: false, reason: 'Invalid policy' });

        const scenario = service.generateScenarioWithTIR(
          'DEFER',
          'Invalid Policy Test',
          'Test invalid policy',
          200000,
          0.02,
          8000,
          48,
          3,
          1,
          'edomex' as Market
        );

        expect(scenario).toBeNull();
        expect(mockFinancialCalc.validateScenarioPolicy).toHaveBeenCalledWith(
          'DEFER',
          3,
          undefined
        );
      });

      it('should pass correct parameters to policy validation for STEPDOWN', () => {
        mockFinancialCalc.validateScenarioPolicy.and.returnValue({ valid: true });

        service.generateScenarioWithTIR(
          'STEPDOWN',
          'Policy Validation Test',
          'Test policy validation',
          200000,
          0.02,
          8000,
          48,
          6,
          0.3, // 30% of original payment
          'edomex' as Market
        );

        expect(mockFinancialCalc.validateScenarioPolicy).toHaveBeenCalledWith(
          'STEPDOWN',
          6,
          0.7 // 1 - 0.3 = 0.7 (70% reduction)
        );
      });

      it('should handle usage limit validation edge cases', () => {
        // Exactly at limit
        let result = service.validateProtectionUsage(2, 2, 'DEFER');
        (expect(result.canUse) as any).toBeFalse();
        expect(result.reason).toContain('Se han agotado');

        // Just under limit
        result = service.validateProtectionUsage(3, 2, 'STEPDOWN');
        (expect(result.canUse) as any).toBeTrue();
        expect(result.reason).toBeUndefined();

        // Zero usage
        result = service.validateProtectionUsage(1, 0, 'RECALENDAR');
        (expect(result.canUse) as any).toBeTrue();
      });
    });

    describe('Type Validation and Scenario Parameters', () => {
      it('should set correct params for DEFER scenarios', () => {
        const scenario = service.generateScenarioWithTIR(
          'DEFER',
          'Params Test',
          'Test DEFER params',
          200000,
          0.02,
          8000,
          48,
          3,
          1,
          'edomex' as Market
        );

        expect(scenario?.params).toEqual({ d: 3, capitalizeInterest: true });
        expect(scenario?.type).toBe('DEFER');
      });

      it('should set correct params for STEPDOWN scenarios', () => {
        const scenario = service.generateScenarioWithTIR(
          'STEPDOWN',
          'Params Test',
          'Test STEPDOWN params',
          200000,
          0.02,
          8000,
          48,
          6,
          0.4,
          'edomex' as Market
        );

        expect(scenario?.params).toEqual({ months: 6, alpha: 0.4 });
        expect(scenario?.type).toBe('STEPDOWN');
      });

      it('should set correct params for RECALENDAR scenarios', () => {
        const scenario = service.generateScenarioWithTIR(
          'RECALENDAR',
          'Params Test',
          'Test RECALENDAR params',
          200000,
          0.02,
          8000,
          48,
          4,
          1,
          'edomex' as Market
        );

        expect(scenario?.params).toEqual({ delta: 4 });
        expect(scenario?.type).toBe('RECALENDAR');
      });
    });

    describe('Cash Flow Generation', () => {
      it('should generate cash flows for all scenario types', () => {
        ['DEFER', 'STEPDOWN', 'RECALENDAR'].forEach(type => {
          const scenario = service.generateScenarioWithTIR(
            type as ProtectionType,
            `${type} Cash Flow Test`,
            `Test cash flows for ${type}`,
            200000,
            0.02,
            8000,
            48,
            6,
            type === 'STEPDOWN' ? 0.5 : 1,
            'edomex' as Market
          );

          expect(scenario?.cashFlows).toBeDefined();
          expect(Array.isArray(scenario?.cashFlows)).toBe(true);
          expect(mockFinancialCalc.generateCashFlows).toHaveBeenCalled();
        });
      });

      it('should generate different cash flow patterns for different scenario types', () => {
        // Reset the spy to track calls
        mockFinancialCalc.generateCashFlows.calls.reset();

        service.generateScenarioWithTIR('DEFER', 'Test', 'Test', 200000, 0.02, 8000, 48, 6, 1, 'edomex' as Market);
        service.generateScenarioWithTIR('STEPDOWN', 'Test', 'Test', 200000, 0.02, 8000, 48, 6, 0.5, 'edomex' as Market);
        service.generateScenarioWithTIR('RECALENDAR', 'Test', 'Test', 200000, 0.02, 8000, 48, 6, 1, 'edomex' as Market);

        // Should be called 3 times (once per scenario)
        expect(mockFinancialCalc.generateCashFlows).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Legacy Compatibility and Integration', () => {
    it('should maintain backward compatibility with legacy scenario format', (done) => {
      service.simulateRestructure(baseClient, 3).subscribe(scenarios => {
        scenarios.forEach(scenario => {
          // Legacy fields should exist
          expect(scenario.title).toBeDefined();
          expect(scenario.newPayment).toBeDefined();
          expect(scenario.newTerm).toBeDefined();
          expect(scenario.termChange).toBeDefined();
          expect(scenario.details).toBeDefined();
          expect(Array.isArray(scenario.details)).toBe(true);

          // New fields should also exist
          expect(scenario.type).toBeDefined();
          expect(scenario.params).toBeDefined();
          expect(scenario.Mprime).toBeDefined();
          expect(scenario.nPrime).toBeDefined();
        });
        done();
      });
    });

    it('should generate scenarios method maintains compatibility', () => {
      const scenarios = service.generateScenarios({
        currentBalance: 200000,
        originalPayment: 8000,
        remainingTerm: 48,
        market: 'edomex' as Market
      });

      expect(Array.isArray(scenarios)).toBe(true);
      expect(scenarios.length).toBeGreaterThan(0);

      // Should delegate to generateProtectionScenarios
      scenarios.forEach(s => {
        expect(s.type).toMatch(/^(DEFER|STEPDOWN|RECALENDAR)$/);
      });
    });
  });
});

// removed by clean-audit