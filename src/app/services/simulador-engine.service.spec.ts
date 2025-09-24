import { TestBed } from '@angular/core/testing';
import { SimuladorEngineService, SavingsScenario, CollectiveScenarioConfig } from './simulador-engine.service';
import { TandaEngineService } from './tanda-engine.service';
import { TandaMemberSim } from '../models/tanda';
import { FinancialCalculatorService } from './financial-calculator.service';

describe('SimuladorEngineService', () => {
  let service: SimuladorEngineService;
  let mockTandaEngine: jasmine.SpyObj<TandaEngineService>;
  let mockFinancialCalc: jasmine.SpyObj<FinancialCalculatorService>;

  beforeEach(() => {
    mockTandaEngine = jasmine.createSpyObj('TandaEngineService', [
      'generateBaselineTanda',
      'simulateTanda',
      'getSnowballEffect',
      'getProjectedTimeline'
    ]);

    mockFinancialCalc = jasmine.createSpyObj('FinancialCalculatorService', [
      'formatCurrency'
    ]);

    // Set up default return values
    mockTandaEngine.generateBaselineTanda.and.returnValue({
      id: 'test-group-1',
      name: 'Test Group',
      status: 'active',
      capacity: 10,
      totalMembers: 0,
      members: [],
      product: { price: 800000, dpPct: 0.15, term: 60, rateAnnual: 0.299 },
      rules: { allocRule: 'debt_first', eligibility: { requireThisMonthPaid: true } },
      seed: 12345
    });

    mockTandaEngine.simulateTanda.and.returnValue(Promise.resolve({
      firstAwardT: 12,
      lastAwardT: 60,
      awardsByMember: {},
      months: [],
      kpis: { coverageRatioMean: 0.95, deliveredCount: 5, avgTimeToAward: 24 }
    }));

    mockTandaEngine.getSnowballEffect.and.returnValue({
      totalSavings: [10000, 20000, 30000, 40000, 50000],
      totalDebt: [],
      unitsDelivered: [],
      months: []
    } as any);

    mockTandaEngine.getProjectedTimeline.and.returnValue([
      { month: 1, event: 'First Member Award', details: 'Award granted' },
      { month: 12, event: 'Second Member Award', details: 'Award granted' }
    ]);

    mockFinancialCalc.formatCurrency.and.callFake((amount: number) => {
      return `$${amount.toLocaleString('es-MX')}`;
    });

    TestBed.configureTestingModule({
      providers: [
        SimuladorEngineService,
        { provide: TandaEngineService, useValue: mockTandaEngine },
        { provide: FinancialCalculatorService, useValue: mockFinancialCalc }
      ]
    });

    service = TestBed.inject(SimuladorEngineService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      (expect(service) as any).toBeTruthy();
    });
  });

  describe('AGS Liquidation Scenario', () => {
    it('should generate basic liquidation scenario', () => {
      const scenario = service.generateAGSLiquidationScenario(
        150000, // initial down payment
        18,     // delivery months
        ['ABC-123', 'DEF-456'], // unit plates
        [500, 600], // consumption per plate
        2.5,    // overprice per liter
        800000  // total unit value
      );

      (expect(scenario.type) as any).toBe('AGS_LIQUIDATION');
      (expect(scenario.targetAmount) as any).toBe(800000);
      (expect(scenario.monthsToTarget) as any).toBe(18);
      (expect(scenario.collectionContribution) as any).toBe(2750); // (500+600) * 2.5
      (expect(scenario.monthlyContribution) as any).toBe(2750);
      (expect(scenario.voluntaryContribution) as any).toBe(0);
      (expect(scenario.projectedBalance.length) as any).toBe(18);
    });

    it('should calculate projected balance correctly', () => {
      const scenario = service.generateAGSLiquidationScenario(
        100000, // initial down payment
        12,     // delivery months
        ['ABC-123'], // unit plates
        [400], // consumption per plate
        3.0,   // overprice per liter
        500000 // total unit value
      );

      const monthlyCollection = 400 * 3.0; // 1200
      (expect(scenario.projectedBalance[0]) as any).toBe(101200); // 100000 + 1200
      (expect(scenario.projectedBalance[1]) as any).toBe(102400); // 100000 + 1200*2
      (expect(scenario.projectedBalance[11]) as any).toBe(114400); // 100000 + 1200*12
    });

    it('should generate timeline events correctly', () => {
      const scenario = service.generateAGSLiquidationScenario(
        100000, 6, ['ABC-123'], [400], 2.0, 300000
      );

      (expect(scenario.timeline.length) as any).toBe(9); // Initial + 6 monthly + delivery + remainder
      (expect(scenario.timeline[0]) as any).toEqual({ month: 0, event: 'Enganche Inicial', amount: 100000 });
      (expect(scenario.timeline[1]) as any).toEqual({ month: 1, event: 'Recaudación Mensual', amount: 800 });
      (expect(scenario.timeline[7]) as any).toEqual({ month: 7, event: 'Entrega de Unidad', amount: -300000 });
    });

    it('should handle zero consumption scenario', () => {
      const scenario = service.generateAGSLiquidationScenario(
        200000, 12, [], [], 2.0, 500000
      );

      (expect(scenario.monthlyContribution) as any).toBe(0);
      (expect(scenario.collectionContribution) as any).toBe(0);
      (expect(scenario.projectedBalance.every(balance => balance === 200000)) as any).toBe(true);
    });

    it('should handle single plate scenario', () => {
      const scenario = service.generateAGSLiquidationScenario(
        150000, 10, ['ABC-123'], [500], 2.5, 400000
      );

      (expect(scenario.monthlyContribution) as any).toBe(1250); // 500 * 2.5
      (expect(scenario.projectedBalance[9]) as any).toBe(162500); // 150000 + 1250*10
    });
  });

  describe('EdoMex Individual Scenario', () => {
    it('should generate individual savings scenario', () => {
      const scenario = service.generateEdoMexIndividualScenario(
        200000, // target down payment
        600,    // current plate consumption
        2.0,    // overprice per liter
        3000    // voluntary monthly
      );

      (expect(scenario.type) as any).toBe('EDOMEX_INDIVIDUAL');
      (expect(scenario.targetAmount) as any).toBe(200000);
      (expect(scenario.collectionContribution) as any).toBe(1200); // 600 * 2.0
      (expect(scenario.voluntaryContribution) as any).toBe(3000);
      (expect(scenario.monthlyContribution) as any).toBe(4200); // 1200 + 3000
    });

    it('should calculate months to target correctly', () => {
      const scenario = service.generateEdoMexIndividualScenario(
        120000, // target
        500,    // consumption
        2.0,    // overprice
        2000    // voluntary
      );

      const totalMonthly = (500 * 2.0) + 2000; // 1000 + 2000 = 3000
      const expectedMonths = Math.ceil(120000 / 3000); // 40 months
      
      (expect(scenario.monthsToTarget) as any).toBe(expectedMonths);
      (expect(scenario.projectedBalance.length) as any).toBe(expectedMonths);
    });

    it('should generate progressive balance projection', () => {
      const scenario = service.generateEdoMexIndividualScenario(
        60000, 400, 2.0, 1000
      );

      const monthlyTotal = 1800; // (400*2.0) + 1000
      (expect(scenario.projectedBalance[0]) as any).toBe(1800);
      (expect(scenario.projectedBalance[1]) as any).toBe(3600);
      (expect(scenario.projectedBalance[2]) as any).toBe(5400);
    });

    it('should handle zero voluntary contribution', () => {
      const scenario = service.generateEdoMexIndividualScenario(
        50000, 500, 2.0, 0
      );

      (expect(scenario.voluntaryContribution) as any).toBe(0);
      (expect(scenario.monthlyContribution) as any).toBe(1000); // Only collection
      (expect(scenario.collectionContribution) as any).toBe(1000);
    });

    it('should create timeline with milestone', () => {
      const scenario = service.generateEdoMexIndividualScenario(
        30000, 300, 2.0, 500
      );

      const expectedMonths = scenario.monthsToTarget;
      (expect(scenario.timeline.length) as any).toBe(expectedMonths + 1);
      (expect(scenario.timeline[expectedMonths]) as any).toEqual({
        month: expectedMonths + 1,
        event: 'Meta de Enganche Alcanzada',
        amount: 30000
      });
    });
  });

  describe('EdoMex Collective Scenario', () => {
    let mockConfig: CollectiveScenarioConfig;

    beforeEach(() => {
      mockConfig = {
        memberCount: 5,
        unitPrice: 800000,
        avgConsumption: 400,
        overpricePerLiter: 2.0,
        voluntaryMonthly: 1500
      };
    });

    it('should generate collective scenario with tanda integration', async () => {
      const result = await service.generateEdoMexCollectiveScenario(mockConfig);

      (expect(result.scenario.type) as any).toBe('EDOMEX_COLLECTIVE');
      (expect(result.tandaResult) as any).toBeDefined();
      (expect(result.snowballEffect) as any).toBeDefined();
      
      // Check tanda engine was called
      (expect(mockTandaEngine.generateBaselineTanda) as any).toHaveBeenCalled();
      (expect(mockTandaEngine.simulateTanda) as any).toHaveBeenCalled();
      (expect(mockTandaEngine.getSnowballEffect) as any).toHaveBeenCalled();
      (expect(mockTandaEngine.getProjectedTimeline) as any).toHaveBeenCalled();
    });

    it('should calculate individual contributions correctly', async () => {
      const result = await service.generateEdoMexCollectiveScenario(mockConfig);

      const collectionPerMember = 400 * 2.0; // 800
      const totalContributionPerMember = 800 + 1500; // 2300
      const totalGroupContribution = 2300 * 5; // 11500

      (expect(result.scenario.monthlyContribution) as any).toBe(totalGroupContribution);
      (expect(result.scenario.collectionContribution) as any).toBe(4000); // 800 * 5
      (expect(result.scenario.voluntaryContribution) as any).toBe(7500); // 1500 * 5
    });

    it('should calculate total savings target based on member count', async () => {
      const result = await service.generateEdoMexCollectiveScenario(mockConfig);

      const downPaymentPerUnit = 800000 * 0.15; // 120000
      const totalTarget = 120000 * 5; // 600000

      (expect(result.scenario.targetAmount) as any).toBe(totalTarget);
    });

    it('should use first award timing from tanda simulation', async () => {
      mockTandaEngine.simulateTanda.and.returnValue(Promise.resolve({
        firstAwardT: 18,
        lastAwardT: 60,
        awardsByMember: {},
        months: [],
        kpis: { coverageRatioMean: 0.95, deliveredCount: 5, avgTimeToAward: 24 }
      }));

      const result = await service.generateEdoMexCollectiveScenario(mockConfig);

      (expect(result.scenario.monthsToTarget) as any).toBe(18);
    });

    it('should handle missing first award timing', async () => {
      mockTandaEngine.simulateTanda.and.returnValue(Promise.resolve({
        firstAwardT: undefined,
        lastAwardT: 60,
        awardsByMember: {},
        months: [],
        kpis: { coverageRatioMean: 0.95, deliveredCount: 5, avgTimeToAward: 24 }
      }));

      const result = await service.generateEdoMexCollectiveScenario(mockConfig);

      (expect(result.scenario.monthsToTarget) as any).toBe(12); // Fallback
    });
  });

  describe('Scenario Optimization', () => {
    it('should optimize AGS liquidation scenario', () => {
      const result = service.optimizeScenario(
        'AGS_LIQUIDATION',
        500000, // target
        20,     // max months
        {
          initialDownPayment: 100000,
          totalConsumption: 1000
        }
      );

      const requiredCollection = (500000 - 100000) / 20; // 20000
      const requiredOverprice = 20000 / 1000; // 20

      (expect(result.recommendedParams.overpricePerLiter) as any).toBe(20);
      (expect(result.recommendedParams.monthlyCollection) as any).toBe(20000);
      (expect(result.projectedTimeline) as any).toBe(20);
    });

    it('should optimize EdoMex individual scenario', () => {
      const result = service.optimizeScenario(
        'EDOMEX_INDIVIDUAL',
        150000, // target
        30,     // max months
        {
          plateConsumption: 500,
          maxOverprice: 3.0
        }
      );

      const requiredTotal = 150000 / 30; // 5000
      const collectionAmount = 500 * 3.0; // 1500
      const requiredVoluntary = 5000 - 1500; // 3500

      (expect(result.recommendedParams.voluntaryMonthly) as any).toBe(3500);
      (expect(result.recommendedParams.overpricePerLiter) as any).toBe(3.0);
      (expect(result.recommendedParams.totalMonthlyContribution) as any).toBe(5000);
    });

    it('should optimize EdoMex collective scenario', () => {
      const result = service.optimizeScenario(
        'EDOMEX_COLLECTIVE',
        600000, // target
        36,     // max months
        {
          memberCount: 5,
          avgConsumption: 400,
          maxOverprice: 2.5,
          maxVoluntary: 2000
        }
      );

      const targetPerMember = 600000 / 5; // 120000
      const maxContributionPerMember = (400 * 2.5) + 2000; // 3000
      const projectedMonths = Math.ceil(120000 / 3000); // 40

      (expect(result.recommendedParams.memberCount) as any).toBe(5);
      (expect(result.recommendedParams.overpricePerLiter) as any).toBe(2.5);
      (expect(result.recommendedParams.voluntaryMonthly) as any).toBe(2000);
      (expect(result.projectedTimeline) as any).toBe(40);
    });

    it('should handle unknown scenario type', () => {
      const result = service.optimizeScenario(
        'UNKNOWN_TYPE' as any,
        100000,
        12,
        {}
      );

      (expect(result.recommendedParams) as any).toEqual({});
      (expect(result.projectedTimeline) as any).toBe(0);
    });
  });

  describe('Comparison Scenarios', () => {
    let baseScenario: SavingsScenario;

    beforeEach(() => {
      baseScenario = {
        type: 'EDOMEX_INDIVIDUAL',
        targetAmount: 100000,
        monthsToTarget: 25,
        monthlyContribution: 4000,
        collectionContribution: 1000,
        voluntaryContribution: 3000,
        projectedBalance: [4000, 8000, 12000],
        timeline: []
      };
    });

    it('should generate comparison scenarios with parameter variations', async () => {
      const variations = [
        { parameter: 'monthly', value: 5000 },
        { parameter: 'months', value: 20 }
      ];

      const scenarios = await service.generateComparisonScenarios(baseScenario, variations);

      (expect(scenarios.length) as any).toBe(2);
      (expect(scenarios[0].monthlyContribution) as any).toBe(5000);
      (expect(scenarios[1].monthsToTarget) as any).toBe(20);
    });

    it('should preserve other parameters when varying specific ones', async () => {
      const variations = [{ parameter: 'monthly', value: 6000 }];

      const scenarios = await service.generateComparisonScenarios(baseScenario, variations);

      (expect(scenarios[0].targetAmount) as any).toBe(baseScenario.targetAmount);
      (expect(scenarios[0].type) as any).toBe(baseScenario.type);
      (expect(scenarios[0].monthsToTarget) as any).toBe(baseScenario.monthsToTarget);
    });

    it('should handle empty variations array', async () => {
      const scenarios = await service.generateComparisonScenarios(baseScenario, []);

      (expect(scenarios.length) as any).toBe(0);
    });
  });

  describe('Senior-First Formatting', () => {
    let mockScenario: SavingsScenario;

    beforeEach(() => {
      mockScenario = {
        type: 'EDOMEX_INDIVIDUAL',
        targetAmount: 150000,
        monthsToTarget: 30,
        monthlyContribution: 5000,
        collectionContribution: 2000,
        voluntaryContribution: 3000,
        projectedBalance: [],
        timeline: [
          { month: 1, event: 'Primera Aportación', amount: 5000 },
          { month: 2, event: 'Segunda Aportación', amount: 5000 },
          { month: 3, event: 'Tercera Aportación', amount: 5000 }
        ]
      };
    });

    it('should format scenario summary for seniors', () => {
      const formatted = service.formatScenarioForSenior(mockScenario);

      (expect(formatted.summary.length) as any).toBe(3);
      (expect(formatted.summary[0]) as any).toContain('$150,000');
      (expect(formatted.summary[1]) as any).toContain('30 meses');
      (expect(formatted.summary[2]) as any).toContain('$5,000');
      (expect(mockFinancialCalc.formatCurrency) as any).toHaveBeenCalledTimes(3);
    });

    it('should format key numbers correctly', () => {
      const formatted = service.formatScenarioForSenior(mockScenario);

      (expect(formatted.keyNumbers.length) as any).toBe(3);
      (expect(formatted.keyNumbers[0]) as any).toEqual({
        label: 'Meta de Ahorro',
        value: '$150,000'
      });
      (expect(formatted.keyNumbers[1]) as any).toEqual({
        label: 'Tiempo Estimado',
        value: '30 meses'
      });
      (expect(formatted.keyNumbers[2]) as any).toEqual({
        label: 'Aportación Mensual',
        value: '$5,000'
      });
    });

    it('should format timeline with limited events', () => {
      const formatted = service.formatScenarioForSenior(mockScenario);

      (expect(formatted.timeline.length) as any).toBe(3); // Limited to first 5
      (expect(formatted.timeline[0]) as any).toBe('Mes 1: Primera Aportación');
      (expect(formatted.timeline[1]) as any).toBe('Mes 2: Segunda Aportación');
      (expect(formatted.timeline[2]) as any).toBe('Mes 3: Tercera Aportación');
    });

    it('should limit timeline to first 5 events', () => {
      const longTimeline = Array.from({ length: 10 }, (_, i) => ({
        month: i + 1,
        event: `Event ${i + 1}`,
        amount: 1000
      }));

      const scenario = { ...mockScenario, timeline: longTimeline };
      const formatted = service.formatScenarioForSenior(scenario);

      (expect(formatted.timeline.length) as any).toBe(5);
      (expect(formatted.timeline[4]) as any).toBe('Mes 5: Event 5');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero target amount in AGS scenario', () => {
      const scenario = service.generateAGSLiquidationScenario(
        0, 12, ['ABC-123'], [500], 2.0, 0
      );

      (expect(scenario.targetAmount) as any).toBe(0);
      (expect(scenario.projectedBalance.length) as any).toBe(12);
    });

    it('should handle zero consumption in individual scenario', () => {
      const scenario = service.generateEdoMexIndividualScenario(
        100000, 0, 2.0, 1000
      );

      (expect(scenario.collectionContribution) as any).toBe(0);
      (expect(scenario.monthlyContribution) as any).toBe(1000);
    });

    it('should handle very large target amounts', () => {
      const scenario = service.generateEdoMexIndividualScenario(
        10000000, 1000, 2.0, 5000
      );

      (expect(scenario.targetAmount) as any).toBe(10000000);
      (expect(scenario.monthsToTarget) as any).toBeGreaterThan(1000);
    });

    it('should handle zero member count in collective scenario', async () => {
      const config: CollectiveScenarioConfig = {
        memberCount: 0,
        unitPrice: 800000,
        avgConsumption: 400,
        overpricePerLiter: 2.0,
        voluntaryMonthly: 1500
      };

      const result = await service.generateEdoMexCollectiveScenario(config);

      (expect(result.scenario.monthlyContribution) as any).toBe(0);
      (expect(result.scenario.targetAmount) as any).toBe(0);
    });
  });
});