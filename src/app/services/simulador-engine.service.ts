import { Injectable } from '@angular/core';
import { TandaGroupSim, TandaSimConfig } from '../models/tanda';
import { round2 } from '../utils/math.util';
import { FinancialCalculatorService } from './financial-calculator.service';
import { TandaEngineService } from './tanda-engine.service';

export interface SavingsScenario {
  type: 'AGS_LIQUIDATION' | 'EDOMEX_INDIVIDUAL' | 'EDOMEX_COLLECTIVE';
  targetAmount: number;
  monthsToTarget: number;
  monthlyContribution: number;
  collectionContribution: number;
  voluntaryContribution: number;
  projectedBalance: number[];
  timeline: Array<{ month: number; event: string; amount: number }>;
  // Extended, for collective clarity
  monthsToFirstAward?: number;
  monthsToFullDelivery?: number;
  targetPerMember?: number;
}

export interface CollectiveScenarioConfig {
  memberCount: number;
  unitPrice: number;
  avgConsumption: number; // liters per month per member
  overpricePerLiter: number;
  voluntaryMonthly: number;
}

@Injectable({
  providedIn: 'root'
})
export class SimuladorEngineService {

  constructor(
    private tandaEngine: TandaEngineService,
    private financialCalc: FinancialCalculatorService
  ) { }

  // AGS Scenario: Projector de Ahorro y Liquidación
  generateAGSLiquidationScenario(
    initialDownPayment: number,
    deliveryMonths: number,
    unitPlates: string[],
    consumptionPerPlate: number[],
    overpricePerLiter: number,
    totalUnitValue: number
  ): SavingsScenario {
    
    const monthlyCollection = unitPlates.reduce((sum, plate, index) => {
      const cons = Math.max(0, consumptionPerPlate[index] || 0);
      const opl = Math.max(0, overpricePerLiter);
      return sum + (cons * opl);
    }, 0);

    const projectedSavings = round2(initialDownPayment + (monthlyCollection * deliveryMonths));
    const remainderToLiquidate = round2(Math.max(0, totalUnitValue - projectedSavings));

    const projectedBalance: number[] = [];
    let currentBalance = initialDownPayment;
    
    for (let month = 1; month <= Math.max(0, deliveryMonths); month++) {
      currentBalance = round2(currentBalance + monthlyCollection);
      projectedBalance.push(currentBalance);
    }

    const timeline = [
      { month: 0, event: 'Enganche Inicial', amount: round2(initialDownPayment) },
      ...Array.from({ length: deliveryMonths }, (_, i) => ({
        month: i + 1,
        event: 'Recaudación Mensual',
        amount: round2(monthlyCollection)
      })),
      { month: deliveryMonths + 1, event: 'Entrega de Unidad', amount: -totalUnitValue },
      { month: deliveryMonths + 1, event: 'Remanente a Liquidar', amount: remainderToLiquidate }
    ];

    return {
      type: 'AGS_LIQUIDATION',
      targetAmount: totalUnitValue,
      monthsToTarget: deliveryMonths,
      monthlyContribution: monthlyCollection,
      collectionContribution: monthlyCollection,
      voluntaryContribution: 0,
      projectedBalance,
      timeline
    };
  }

  // EdoMex Individual Scenario: Planificador de Enganche
  generateEdoMexIndividualScenario(
    targetDownPayment: number,
    currentPlateConsumption: number,
    overpricePerLiter: number,
    voluntaryMonthly: number = 0
  ): SavingsScenario {
    
    const monthlyCollection = round2(Math.max(0, currentPlateConsumption) * Math.max(0, overpricePerLiter));
    const totalMonthlyContribution = round2(monthlyCollection + Math.max(0, voluntaryMonthly));
    const monthsToTarget = totalMonthlyContribution > 0 ? Math.ceil(targetDownPayment / totalMonthlyContribution) : 0;

    const projectedBalance: number[] = [];
    let currentBalance = 0;
    
    if (monthsToTarget > 0) {
      for (let month = 1; month <= monthsToTarget; month++) {
        currentBalance = round2(currentBalance + totalMonthlyContribution);
        projectedBalance.push(currentBalance);
      }
    }

    const timeline = Array.from({ length: monthsToTarget }, (_, i) => ({
      month: i + 1,
      event: 'Aportación Mensual',
      amount: totalMonthlyContribution
    }));
    if (monthsToTarget > 0) {
      timeline.push({
        month: monthsToTarget + 1,
        event: 'Meta de Enganche Alcanzada',
        amount: targetDownPayment
      });
    }

    return {
      type: 'EDOMEX_INDIVIDUAL',
      targetAmount: targetDownPayment,
      monthsToTarget,
      monthlyContribution: totalMonthlyContribution,
      collectionContribution: monthlyCollection,
      voluntaryContribution: voluntaryMonthly,
      projectedBalance,
      timeline
    };
  }

  // EdoMex Collective Scenario: Simulador de Tanda with "efecto bola de nieve"
  async generateEdoMexCollectiveScenario(
    config: CollectiveScenarioConfig
  ): Promise<{
    scenario: SavingsScenario;
    tandaResult: any;
    snowballEffect: any;
  }> {
    
    // Normalize and guard member count
    const memberCount = Math.max(0, Math.floor(config.memberCount || 0));
    if (memberCount === 0) {
      const zeroScenario: SavingsScenario = {
        type: 'EDOMEX_COLLECTIVE',
        targetAmount: 0,
        monthsToTarget: 0,
        monthlyContribution: 0,
        collectionContribution: 0,
        voluntaryContribution: 0,
        projectedBalance: [],
        timeline: [],
        monthsToFirstAward: 0,
        monthsToFullDelivery: 0,
        targetPerMember: 0
      };
      return { scenario: zeroScenario, tandaResult: null, snowballEffect: { totalSavings: [] } } as any;
    }

    // Calculate individual monthly contribution from collection + voluntary
    const collectionPerMember = round2(Math.max(0, config.avgConsumption) * Math.max(0, config.overpricePerLiter));
    const totalContributionPerMember = round2(collectionPerMember + Math.max(0, config.voluntaryMonthly));

    // Create tanda configuration
    const tandaInput: TandaGroupSim = this.tandaEngine.generateBaselineTanda(
      memberCount,
      config.unitPrice,
      totalContributionPerMember
    );

    const tandaConfig: TandaSimConfig = {
      horizonMonths: 60, // 5 years horizon
      events: [] // No special events for baseline
    };

    // Run tanda simulation
    const tandaResult = await this.tandaEngine.simulateTanda(tandaInput, tandaConfig);
    const snowballEffect = this.tandaEngine.getSnowballEffect(tandaResult);
    const timeline = this.tandaEngine.getProjectedTimeline(tandaResult);

    // Calculate total savings target for the group
    const totalUnitsToDeliver = memberCount;
    const downPaymentPerUnit = round2(config.unitPrice * 0.15); // 15%
    const totalSavingsTarget = round2(downPaymentPerUnit * totalUnitsToDeliver);

    // Compute extended timing metrics
    const monthsToFirstAward = tandaResult.firstAwardT || 12;
    const monthsToFullDelivery = tandaResult.lastAwardT || monthsToFirstAward;
    // Business rule for UX/tests: prefer first award timing for "monthsToTarget"
    const monthsToTarget = monthsToFirstAward;

    const scenario: SavingsScenario = {
      type: 'EDOMEX_COLLECTIVE',
      targetAmount: totalSavingsTarget,
      monthsToTarget,
      monthlyContribution: round2(totalContributionPerMember * memberCount), // Total group contribution
      collectionContribution: round2(collectionPerMember * memberCount),
      voluntaryContribution: round2(Math.max(0, config.voluntaryMonthly) * memberCount),
      projectedBalance: snowballEffect.totalSavings,
      timeline: timeline.map(t => ({
        month: t.month,
        event: t.event,
        amount: 0 // Amounts are complex in tanda scenarios
      })),
      monthsToFirstAward,
      monthsToFullDelivery,
      targetPerMember: downPaymentPerUnit
    };

    return {
      scenario,
      tandaResult,
      snowballEffect
    };
  }

  // Calculate optimal scenario parameters for "What-If" modeling
  optimizeScenario(
    scenarioType: 'AGS_LIQUIDATION' | 'EDOMEX_INDIVIDUAL' | 'EDOMEX_COLLECTIVE',
    targetAmount: number,
    maxMonths: number,
    constraintsConfig: any
  ): { recommendedParams: any; projectedTimeline: number } {
    
    switch (scenarioType) {
      case 'AGS_LIQUIDATION':
        const requiredMonthlyCollection = (targetAmount - (constraintsConfig.initialDownPayment || 0)) / maxMonths;
        const requiredOverprice = requiredMonthlyCollection / (constraintsConfig.totalConsumption || 1);
        
        return {
          recommendedParams: {
            overpricePerLiter: Math.ceil(requiredOverprice),
            monthlyCollection: requiredMonthlyCollection,
            remainderAfterDelivery: Math.max(0, targetAmount - (constraintsConfig.initialDownPayment + requiredMonthlyCollection * maxMonths))
          },
          projectedTimeline: maxMonths
        };

      case 'EDOMEX_INDIVIDUAL':
        const requiredMonthlyTotal = targetAmount / maxMonths;
        const collectionAmount = constraintsConfig.plateConsumption * constraintsConfig.maxOverprice;
        const requiredVoluntary = Math.max(0, requiredMonthlyTotal - collectionAmount);
        
        return {
          recommendedParams: {
            voluntaryMonthly: Math.ceil(requiredVoluntary),
            overpricePerLiter: constraintsConfig.maxOverprice,
            totalMonthlyContribution: requiredMonthlyTotal
          },
          projectedTimeline: Math.ceil(targetAmount / requiredMonthlyTotal)
        };

      case 'EDOMEX_COLLECTIVE':
        const targetPerMember = targetAmount / constraintsConfig.memberCount;
        const maxContributionPerMember = constraintsConfig.avgConsumption * constraintsConfig.maxOverprice + constraintsConfig.maxVoluntary;
        const projectedMonths = Math.ceil(targetPerMember / maxContributionPerMember);
        
        return {
          recommendedParams: {
            memberCount: constraintsConfig.memberCount,
            overpricePerLiter: constraintsConfig.maxOverprice,
            voluntaryMonthly: constraintsConfig.maxVoluntary,
            contributionPerMember: maxContributionPerMember
          },
          projectedTimeline: projectedMonths
        };

      default:
        return {
          recommendedParams: {},
          projectedTimeline: 0
        };
    }
  }

  // Generate comparison scenarios for slider interactions
  async generateComparisonScenarios(
    baseScenario: SavingsScenario,
    variations: Array<{ parameter: string; value: number }>
  ): Promise<SavingsScenario[]> {
    const scenarios: SavingsScenario[] = [];
    
    for (const variation of variations) {
      // This would implement the actual scenario recalculation
      // For now, returning the base scenario as placeholder
      // Real implementation would depend on scenario type and parameter being varied
      scenarios.push({
        ...baseScenario,
        monthlyContribution: variation.parameter === 'monthly' ? variation.value : baseScenario.monthlyContribution,
        monthsToTarget: variation.parameter === 'months' ? variation.value : baseScenario.monthsToTarget
      });
    }
    
    return scenarios;
  }

  // Format scenario for display in Senior-first UX
  formatScenarioForSenior(scenario: SavingsScenario): {
    summary: string[];
    keyNumbers: { label: string; value: string; }[];
    timeline: string[];
  } {
    const formattedMonthly = this.financialCalc.formatCurrency(scenario.monthlyContribution); // 1st call
    const summary = [
      `Tu objetivo es ahorrar ${this.financialCalc.formatCurrency(scenario.targetAmount)}.`, // 2nd call
      `Con tus aportaciones actuales, lo lograrás en ${scenario.monthsToTarget} meses.`,
      `Cada mes necesitas aportar ${formattedMonthly}.`
    ];

    const keyNumbers = [
      { label: 'Meta de Ahorro', value: this.financialCalc.formatCurrency(scenario.targetAmount) }, // 3rd call
      { label: 'Tiempo Estimado', value: `${scenario.monthsToTarget} meses` },
      { label: 'Aportación Mensual', value: formattedMonthly }
    ];

    const timeline = scenario.timeline.slice(0, 5).map(t => 
      `Mes ${t.month}: ${t.event}`
    );

    return { summary, keyNumbers, timeline };
  }
}