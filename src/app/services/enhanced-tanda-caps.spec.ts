import { EnhancedTandaSimulationService } from './enhanced-tanda-simulation.service';
import { FinancialCalculatorService } from './financial-calculator.service';

describe('EnhancedTandaSimulationService caps', () => {
  let svc: EnhancedTandaSimulationService;
  let fin: FinancialCalculatorService;

  beforeEach(() => {
    fin = new FinancialCalculatorService();
    svc = new EnhancedTandaSimulationService(fin);
  });

  it('freezeMaxPct=0 prevents freezing any member', () => {
    const group = { totalMembers: 10, monthlyAmount: 1000 };
    const events = [ { month: 2, type: 'freeze', payload: { memberIndex: 0 } } ] as any;
    const res = svc.simulateScenario(group, 'aguascalientes' as any, 6, { name: 'freeze', contribDelta: 0 }, { events, freezeMaxPct: 0 });
    // Active share average should remain 100%
    expect(res.metrics.activeShareAvg).toBeCloseTo(1.0, 3);
  });

  it('rescueCapPerMonth limits accepted rescue events per month', () => {
    const members = 10;
    const monthlyAmount = 1000;
    const group = { totalMembers: members, monthlyAmount };
    const cap = 0.1 * members * monthlyAmount; // 10% del total mensual del grupo
    const events = [
      { month: 3, type: 'rescue', payload: { amount: cap * 0.7 } }, // aceptado
      { month: 3, type: 'rescue', payload: { amount: cap * 0.7 } }  // rechazado por exceder cap
    ] as any;
    const res = svc.simulateScenario(group, 'aguascalientes' as any, 6, { name: 'rescue', contribDelta: 0 }, { events, rescueCapPerMonth: 0.1 });
    expect(res.metrics.rescuesUsed).toBe(1);
  });
});

