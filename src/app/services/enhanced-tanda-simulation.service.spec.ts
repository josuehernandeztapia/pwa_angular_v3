import { EnhancedTandaSimulationService } from './enhanced-tanda-simulation.service';
import { FinancialCalculatorService } from './financial-calculator.service';

describe('EnhancedTandaSimulationService', () => {
  let svc: EnhancedTandaSimulationService;
  let fin: FinancialCalculatorService;

  beforeEach(() => {
    fin = new FinancialCalculatorService();
    svc = new EnhancedTandaSimulationService(fin);
  });

  it('computes IRR and validates vs target (base grid)', () => {
    const group = { totalMembers: 12, monthlyAmount: 1000 };
    const res = svc.simulateWithGrid(group, 'aguascalientes' as any, 24);
    expect(res.length).toBe(3);
    expect(res[0].irrAnnual).toBeGreaterThanOrEqual(res[1].irrAnnual);
  });

  it('freeze event reduces active contributions and IRR', () => {
    const group = { totalMembers: 10, monthlyAmount: 1000 };
    const base = svc.simulateScenario(group, 'aguascalientes' as any, 12, { name: 'base', contribDelta: 0 });
    const events = [ { month: 3, type: 'freeze', payload: { memberIndex: 0 } } ] as any;
    const withFreeze = svc.simulateScenario(group, 'aguascalientes' as any, 12, { name: 'freeze', contribDelta: 0 }, { events });
    expect(withFreeze.metrics.deficitsDetected).toBeGreaterThanOrEqual(1);
    expect(withFreeze.irrAnnual).toBeLessThanOrEqual(base.irrAnnual);
  });

  it('rescue event increases flows and can improve IRR', () => {
    const group = { totalMembers: 10, monthlyAmount: 1000 };
    const events = [ { month: 6, type: 'rescue', payload: { amount: 5000 } } ] as any;
    const base = svc.simulateScenario(group, 'aguascalientes' as any, 12, { name: 'base', contribDelta: 0 });
    const withRescue = svc.simulateScenario(group, 'aguascalientes' as any, 12, { name: 'rescue', contribDelta: 0 }, { events });
    expect(withRescue.metrics.rescuesUsed).toBe(1);
    expect(withRescue.irrAnnual).toBeGreaterThanOrEqual(base.irrAnnual);
  });
});

