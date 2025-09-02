import { Injectable } from '@angular/core';
import { SavingsPlan, CollectionDetails, Market, TandaGroupInput, TandaSimConfig } from '../models/types';
import { TandaEngineService } from './tanda-engine.service';
import { FinancialCalculatorService } from './financial-calculator.service';

export interface SavingsScenario {
  type: 'AGS_LIQUIDATION' | 'EDOMEX_INDIVIDUAL' | 'EDOMEX_COLLECTIVE';
  targetAmount: number;
  monthsToTarget: number;
  monthlyContribution: number;
  collectionContribution: number;
  voluntaryContribution: number;
  projectedBalance: number[];
  timeline: Array<{ month: number; event: string; amount: number }>;
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
      return sum + (consumptionPerPlate[index] * overpricePerLiter);
    }, 0);

    const projectedSavings = initialDownPayment + (monthlyCollection * deliveryMonths);
    const remainderToLiquidate = Math.max(0, totalUnitValue - projectedSavings);

    const projectedBalance: number[] = [];
    let currentBalance = initialDownPayment;
    
    for (let month = 1; month <= deliveryMonths; month++) {
      currentBalance += monthlyCollection;
      projectedBalance.push(currentBalance);
    }

    const timeline = [
      { month: 0, event: 'Enganche Inicial', amount: initialDownPayment },
      ...Array.from({ length: deliveryMonths }, (_, i) => ({
        month: i + 1,
        event: 'Recaudación Mensual',
        amount: monthlyCollection
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
    
    const monthlyCollection = currentPlateConsumption * overpricePerLiter;
    const totalMonthlyContribution = monthlyCollection + voluntaryMonthly;
    const monthsToTarget = Math.ceil(targetDownPayment / totalMonthlyContribution);

    const projectedBalance: number[] = [];
    let currentBalance = 0;
    
    for (let month = 1; month <= monthsToTarget; month++) {
      currentBalance += totalMonthlyContribution;
      projectedBalance.push(currentBalance);
    }

    const timeline = Array.from({ length: monthsToTarget }, (_, i) => ({
      month: i + 1,
      event: 'Aportación Mensual',
      amount: totalMonthlyContribution
    }));
    timeline.push({
      month: monthsToTarget + 1,
      event: 'Meta de Enganche Alcanzada',
      amount: targetDownPayment
    });

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
    
    // Calculate individual monthly contribution from collection + voluntary
    const collectionPerMember = config.avgConsumption * config.overpricePerLiter;
    const totalContributionPerMember = collectionPerMember + config.voluntaryMonthly;

    // Create tanda configuration
    const tandaInput: TandaGroupInput = this.tandaEngine.generateBaselineTanda(
      config.memberCount,
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
    const totalUnitsToDeliver = config.memberCount;
    const downPaymentPerUnit = config.unitPrice * 0.15; // 15%
    const totalSavingsTarget = downPaymentPerUnit * totalUnitsToDeliver;

    const scenario: SavingsScenario = {
      type: 'EDOMEX_COLLECTIVE',
      targetAmount: totalSavingsTarget,
      monthsToTarget: tandaResult.firstAwardT || 12, // First award or fallback
      monthlyContribution: totalContributionPerMember * config.memberCount, // Total group contribution
      collectionContribution: collectionPerMember * config.memberCount,
      voluntaryContribution: config.voluntaryMonthly * config.memberCount,
      projectedBalance: snowballEffect.totalSavings,
      timeline: timeline.map(t => ({
        month: t.month,
        event: t.event,
        amount: 0 // Amounts are complex in tanda scenarios
      }))
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
    const summary = [
      `Tu objetivo es ahorrar ${this.financialCalc.formatCurrency(scenario.targetAmount)}.`,
      `Con tus aportaciones actuales, lo lograrás en ${scenario.monthsToTarget} meses.`,
      `Cada mes necesitas aportar ${this.financialCalc.formatCurrency(scenario.monthlyContribution)}.`
    ];

    const keyNumbers = [
      { label: 'Meta de Ahorro', value: this.financialCalc.formatCurrency(scenario.targetAmount) },
      { label: 'Tiempo Estimado', value: `${scenario.monthsToTarget} meses` },
      { label: 'Aportación Mensual', value: this.financialCalc.formatCurrency(scenario.monthlyContribution) }
    ];

    const timeline = scenario.timeline.slice(0, 5).map(t => 
      `Mes ${t.month}: ${t.event}`
    );

    return { summary, keyNumbers, timeline };
  }
}