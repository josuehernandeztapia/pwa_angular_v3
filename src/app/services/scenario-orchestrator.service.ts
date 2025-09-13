import { Injectable } from '@angular/core';
import { BusinessFlow, Market, Quote, Client } from '../models/types';
import { FinancialCalculatorService } from './financial-calculator.service';
import { CotizadorEngineService, CotizadorConfig } from './cotizador-engine.service';
import { TandaEngineService } from './tanda-engine.service';
import { ProtectionEngineService } from './protection-engine.service';
import { SimuladorEngineService, SavingsScenario, CollectiveScenarioConfig } from './simulador-engine.service';

export interface CompleteBusinessScenario {
  id: string;
  clientName: string;
  flow: BusinessFlow;
  market: Market;
  stage: 'COTIZACION' | 'SIMULACION' | 'ACTIVO' | 'PROTECCION';
  
  // Cotización data (if applicable)
  quote?: Quote;
  amortizationTable?: any[];
  
  // Simulación data (if applicable)  
  savingsScenario?: SavingsScenario;
  tandaSimulation?: any;
  
  // Protection data (if applicable)
  protectionScenarios?: any[];
  
  // Senior-first formatted data
  seniorSummary: {
    title: string;
    description: string[];
    keyMetrics: Array<{ label: string; value: string; emoji: string }>;
    timeline: Array<{ month: number; event: string; emoji: string }>;
    whatsAppMessage: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ScenarioOrchestratorService {

  constructor(
    private financialCalc: FinancialCalculatorService,
    private cotizador: CotizadorEngineService,
    private tandaEngine: TandaEngineService,
    private protectionEngine: ProtectionEngineService,
    private simulador: SimuladorEngineService
  ) { }

  // ===============================
  // COTIZADOR MODE SCENARIOS
  // ===============================

  async createAGSIndividualCotizacion(
    clientName: string,
    totalPrice: number,
    downPayment: number,
    term: number
  ): Promise<CompleteBusinessScenario> {
    
    const config: CotizadorConfig = {
      totalPrice,
      downPayment,
      term,
      market: 'aguascalientes',
      clientType: 'Individual',
      businessFlow: BusinessFlow.VentaPlazo
    };

    const validation = this.cotizador.validateConfiguration(config);
    if (!validation.valid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
    }

    const quote = this.cotizador.generateQuote(config);
    const amortizationTable = this.cotizador.generateAmortizationTable(quote);
    const financialSummary = this.cotizador.getFinancialSummary(quote);

    return {
      id: `ags-individual-${Date.now()}`,
      clientName,
      flow: BusinessFlow.VentaPlazo,
      market: 'aguascalientes',
      stage: 'COTIZACION',
      quote,
      amortizationTable,
      seniorSummary: {
        title: '🚐 Tu Unidad en Aguascalientes',
        description: [
          `${clientName}, aquí está tu cotización para una unidad de ${this.financialCalc.formatCurrency(totalPrice)}.`,
          `Con un enganche de ${this.financialCalc.formatCurrency(downPayment)}, financiarás ${this.financialCalc.formatCurrency(quote.amountToFinance)}.`,
          `Tu pago mensual será de ${this.financialCalc.formatCurrency(quote.monthlyPayment)} por ${term} meses.`
        ],
        keyMetrics: [
          { label: 'Precio Total', value: this.financialCalc.formatCurrency(totalPrice), emoji: '💰' },
          { label: 'Enganche', value: this.financialCalc.formatCurrency(downPayment), emoji: '💸' },
          { label: 'Pago Mensual', value: this.financialCalc.formatCurrency(quote.monthlyPayment), emoji: '📅' },
          { label: 'Plazo', value: `${term} meses`, emoji: '⏱️' }
        ],
        timeline: [
          { month: 0, event: 'Firma de Contrato y Enganche', emoji: '✍️' },
          { month: 1, event: 'Primer Pago Mensual', emoji: '💳' },
          { month: term, event: 'Último Pago - Unidad Liberada', emoji: '🎉' }
        ],
        whatsAppMessage: `🚐 *Cotización AGS - ${clientName}*\n\n💰 Precio: ${this.financialCalc.formatCurrency(totalPrice)}\n💸 Enganche: ${this.financialCalc.formatCurrency(downPayment)}\n📅 Mensualidad: ${this.financialCalc.formatCurrency(quote.monthlyPayment)}\n⏱️ Plazo: ${term} meses\n\n*Tu nueva unidad te está esperando* ✨`
      }
    };
  }

  async createEdoMexCollectiveCotizacion(
    clientName: string,
    totalPrice: number,
    downPayment: number,
    term: number,
    groupSize: number
  ): Promise<CompleteBusinessScenario> {
    
    const config: CotizadorConfig = {
      totalPrice,
      downPayment,
      term,
      market: 'edomex',
      clientType: 'Colectivo',
      businessFlow: BusinessFlow.CreditoColectivo
    };

    const validation = this.cotizador.validateConfiguration(config);
    if (!validation.valid) {
      throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
    }

    const quote = this.cotizador.generateQuote(config);
    const amortizationTable = this.cotizador.generateAmortizationTable(quote);

    return {
      id: `edomex-collective-${Date.now()}`,
      clientName,
      flow: BusinessFlow.CreditoColectivo,
      market: 'edomex',
      stage: 'COTIZACION',
      quote,
      amortizationTable,
      seniorSummary: {
        title: '🤝 Crédito Colectivo - Estado de México',
        description: [
          `${clientName}, tu grupo de ${groupSize} personas puede acceder a unidades de ${this.financialCalc.formatCurrency(totalPrice)}.`,
          `Con un enganche colectivo de ${this.financialCalc.formatCurrency(downPayment)}, cada unidad se financia a ${this.financialCalc.formatCurrency(quote.monthlyPayment)} mensuales.`,
          `El plan colectivo les permite obtener mejores condiciones y apoyo mutuo entre miembros.`
        ],
        keyMetrics: [
          { label: 'Precio por Unidad', value: this.financialCalc.formatCurrency(totalPrice), emoji: '🚐' },
          { label: 'Enganche Grupal', value: this.financialCalc.formatCurrency(downPayment), emoji: '🤝' },
          { label: 'Pago por Unidad', value: this.financialCalc.formatCurrency(quote.monthlyPayment), emoji: '💳' },
          { label: 'Miembros Grupo', value: `${groupSize} personas`, emoji: '👥' }
        ],
        timeline: [
          { month: 0, event: 'Formación del Grupo y Convenio', emoji: '🤝' },
          { month: 1, event: 'Inicio de Aportaciones Colectivas', emoji: '💰' },
          { month: 12, event: 'Primera Adjudicación Estimada', emoji: '🎯' },
          { month: term, event: 'Última Entrega del Grupo', emoji: '🎉' }
        ],
        whatsAppMessage: `🤝 *Crédito Colectivo EdoMex - ${clientName}*\n\n🚐 Precio: ${this.financialCalc.formatCurrency(totalPrice)}\n💰 Enganche Grupal: ${this.financialCalc.formatCurrency(downPayment)}\n💳 Pago por unidad: ${this.financialCalc.formatCurrency(quote.monthlyPayment)}\n👥 Grupo: ${groupSize} miembros\n\n*Juntos llegarán más lejos* 🌟`
      }
    };
  }

  // ===============================
  // SIMULADOR MODE SCENARIOS  
  // ===============================

  async createAGSAhorroRenovacion(
    clientName: string,
    initialDownPayment: number,
    deliveryMonths: number,
    unitPlates: string[],
    consumptionPerPlate: number[],
    overpricePerLiter: number,
    totalUnitValue: number
  ): Promise<CompleteBusinessScenario> {
    
    const savingsScenario = this.simulador.generateAGSLiquidationScenario(
      initialDownPayment,
      deliveryMonths,
      unitPlates,
      consumptionPerPlate,
      overpricePerLiter,
      totalUnitValue
    );

    const seniorFormat = this.simulador.formatScenarioForSenior(savingsScenario);

    return {
      id: `ags-ahorro-${Date.now()}`,
      clientName,
      flow: BusinessFlow.AhorroProgramado,
      market: 'aguascalientes',
      stage: 'SIMULACION',
      savingsScenario,
      seniorSummary: {
        title: '💡 Plan de Ahorro AGS',
        description: seniorFormat.summary,
        keyMetrics: seniorFormat.keyNumbers.map(kn => ({
          label: kn.label,
          value: kn.value,
          emoji: kn.label.includes('Meta') ? '🎯' : kn.label.includes('Tiempo') ? '⏰' : '💰'
        })),
        timeline: savingsScenario.timeline.slice(0, 4).map(t => ({
          month: t.month,
          event: t.event,
          emoji: t.event.includes('Enganche') ? '💸' : t.event.includes('Recaudación') ? '⛽' : t.event.includes('Entrega') ? '🚐' : '💰'
        })),
        whatsAppMessage: `💡 *Plan Ahorro AGS - ${clientName}*\n\n🎯 Meta: ${this.financialCalc.formatCurrency(totalUnitValue)}\n💰 Con tu enganche: ${this.financialCalc.formatCurrency(initialDownPayment)}\n⛽ Recaudación mensual: ${this.financialCalc.formatCurrency(savingsScenario.collectionContribution)}\n⏰ Tiempo estimado: ${deliveryMonths} meses\n\n*¡Tu renovación está más cerca!* 🌟`
      }
    };
  }

  async createEdoMexIndividualAhorro(
    clientName: string,
    targetDownPayment: number,
    plateConsumption: number,
    overpricePerLiter: number,
    voluntaryMonthly: number = 0
  ): Promise<CompleteBusinessScenario> {
    
    const savingsScenario = this.simulador.generateEdoMexIndividualScenario(
      targetDownPayment,
      plateConsumption,
      overpricePerLiter,
      voluntaryMonthly
    );

    const seniorFormat = this.simulador.formatScenarioForSenior(savingsScenario);

    return {
      id: `edomex-individual-ahorro-${Date.now()}`,
      clientName,
      flow: BusinessFlow.AhorroProgramado,
      market: 'edomex',
      stage: 'SIMULACION',
      savingsScenario,
      seniorSummary: {
        title: '🏦 Plan Individual EdoMex - Enganche',
        description: seniorFormat.summary,
        keyMetrics: seniorFormat.keyNumbers.map(kn => ({
          label: kn.label,
          value: kn.value,
          emoji: kn.label.includes('Meta') ? '🎯' : kn.label.includes('Tiempo') ? '⏰' : '💰'
        })),
        timeline: [
          { month: 1, event: 'Inicio de Ahorros', emoji: '🏦' },
          { month: Math.ceil(savingsScenario.monthsToTarget / 2), event: 'Mitad del Camino', emoji: '📈' },
          { month: savingsScenario.monthsToTarget, event: 'Meta de Enganche Alcanzada', emoji: '🎯' },
          { month: savingsScenario.monthsToTarget + 1, event: 'Inicio de Financiamiento', emoji: '🚐' }
        ],
        whatsAppMessage: `🏦 *Plan Individual EdoMex - ${clientName}*\n\n🎯 Meta enganche: ${this.financialCalc.formatCurrency(targetDownPayment)}\n⛽ Recaudación: ${this.financialCalc.formatCurrency(savingsScenario.collectionContribution)}\n💰 Aportación extra: ${this.financialCalc.formatCurrency(voluntaryMonthly)}\n⏰ Tiempo: ${savingsScenario.monthsToTarget} meses\n\n*Paso a paso hacia tu unidad* 🎯`
      }
    };
  }

  async createEdoMexTandaColectiva(
    clientName: string,
    config: CollectiveScenarioConfig
  ): Promise<CompleteBusinessScenario> {
    
    const { scenario: savingsScenario, tandaResult, snowballEffect } = await this.simulador.generateEdoMexCollectiveScenario(config);

    return {
      id: `edomex-tanda-${Date.now()}`,
      clientName,
      flow: BusinessFlow.CreditoColectivo,
      market: 'edomex',
      stage: 'SIMULACION',
      savingsScenario,
      tandaSimulation: { tandaResult, snowballEffect },
      seniorSummary: {
        title: '🌨️ Tanda Colectiva - Efecto Bola de Nieve',
        description: [
          `${clientName}, tu grupo de ${config.memberCount} miembros creará un efecto bola de nieve poderoso.`,
          `Con ${this.financialCalc.formatCurrency(savingsScenario.monthlyContribution)} mensuales del grupo, las entregas comenzarán pronto.`,
          `Cada entrega aumenta el poder de ahorro colectivo y acelera las siguientes adjudicaciones.`
        ],
        keyMetrics: [
          { label: 'Miembros Activos', value: `${config.memberCount} personas`, emoji: '👥' },
          { label: 'Aportación Grupal', value: this.financialCalc.formatCurrency(savingsScenario.monthlyContribution), emoji: '💰' },
          { label: 'Primera Entrega', value: `Mes ${tandaResult.firstAwardT || 12}`, emoji: '🏆' },
          { label: 'Unidades Total', value: `${config.memberCount} unidades`, emoji: '🚐' }
        ],
        timeline: [
          { month: 1, event: 'Inicio de Tanda Colectiva', emoji: '🤝' },
          { month: tandaResult.firstAwardT || 12, event: 'Primera Adjudicación', emoji: '🏆' },
          { month: Math.floor((tandaResult.firstAwardT || 12) * 1.5), event: 'Aceleración del Efecto', emoji: '🌨️' },
          { month: tandaResult.lastAwardT || 36, event: 'Última Entrega', emoji: '🎉' }
        ],
        whatsAppMessage: `🌨️ *Tanda EdoMex - ${clientName}*\n\n👥 Grupo: ${config.memberCount} miembros\n💰 Aportación grupal: ${this.financialCalc.formatCurrency(savingsScenario.monthlyContribution)}\n🏆 Primera entrega: Mes ${tandaResult.firstAwardT || 12}\n🚐 Total unidades: ${config.memberCount}\n\n*¡El efecto bola de nieve funciona!* ❄️`
      }
    };
  }

  // ===============================
  // PROTECTION MODE SCENARIOS
  // ===============================

  async createProtectionScenarios(
    client: Client,
    currentBalance: number,
    originalPayment: number,
    remainingTerm: number,
    market: Market
  ): Promise<CompleteBusinessScenario> {
    
    const protectionScenarios = this.protectionEngine.generateProtectionScenarios(
      currentBalance,
      originalPayment,
      remainingTerm,
      market
    );

    const bestScenario = protectionScenarios[0]; // Usually defer 3 months is most viable

    return {
      id: `protection-${client.id}-${Date.now()}`,
      clientName: client.name,
      flow: client.flow,
      market,
      stage: 'PROTECCION',
      protectionScenarios,
      seniorSummary: {
        title: '🛡️ Opciones de Protección Financiera',
        description: [
          `${client.name}, tenemos ${protectionScenarios.length} opciones para ayudarte en este momento.`,
          `La opción recomendada es: ${bestScenario.title}.`,
          `${bestScenario.description} - Tu nuevo pago sería ${this.financialCalc.formatCurrency(bestScenario.newMonthlyPayment)}.`
        ],
        keyMetrics: [
          { label: 'Opciones Disponibles', value: `${protectionScenarios.length} escenarios`, emoji: '🛡️' },
          { label: 'Pago Actual', value: this.financialCalc.formatCurrency(originalPayment), emoji: '💳' },
          { label: 'Pago Recomendado', value: this.financialCalc.formatCurrency(bestScenario.newMonthlyPayment), emoji: '✨' },
          { label: 'Reestructuras Usadas', value: `${client.protectionPlan?.restructuresUsed || 0}/${client.protectionPlan?.restructuresAvailable || 3}`, emoji: '🔄' }
        ],
        timeline: [
          { month: 0, event: 'Solicitud de Protección', emoji: '📋' },
          { month: 1, event: 'Inicio de Nuevo Plan', emoji: '🛡️' },
          { month: bestScenario.newTerm, event: 'Plan Completado', emoji: '✅' }
        ],
        whatsAppMessage: `🛡️ *Protección ${client.name}*\n\n✨ Opción recomendada: ${bestScenario.title}\n💳 Pago actual: ${this.financialCalc.formatCurrency(originalPayment)}\n✨ Nuevo pago: ${this.financialCalc.formatCurrency(bestScenario.newMonthlyPayment)}\n🔄 Reestructuras: ${client.protectionPlan?.restructuresUsed || 0}/${client.protectionPlan?.restructuresAvailable || 3}\n\n*Estamos aquí para apoyarte* 💪`
      }
    };
  }

  // ===============================
  // TANDA ENHANCED (SCENARIOS + IRR)
  // ===============================

  async createTandaScenariosEnhanced(
    group: { totalMembers: number; monthlyAmount: number; startDate?: Date },
    market: Market,
    horizonMonths: number,
    options?: { targetIrrAnnual?: number }
  ): Promise<CompleteBusinessScenario> {
    const tandaService = (this as any).enhancedTandaSimulationService as import('./enhanced-tanda-simulation.service').EnhancedTandaSimulationService | undefined;
    // Safe dynamic import to avoid circular deps in compile path
    const svc = tandaService ?? new (await import('./enhanced-tanda-simulation.service')).EnhancedTandaSimulationService(this.financialCalc);

    const results = svc.simulateWithGrid(group, market, horizonMonths, options);
    const best = results[0];

    return {
      id: `tanda-enhanced-${Date.now()}`,
      clientName: 'Grupo Colectivo',
      flow: 0 as any,
      market,
      stage: 'PROTECCION',
      protectionScenarios: [],
      seniorSummary: {
        title: '❄️ Tanda Enhanced – Escenarios con IRR de Mercado',
        description: [
          `Se evaluaron ${results.length} escenarios de contribución base y ±10%.`,
          `Mejor escenario: ${best.name} | IRR ${(best.irrAnnual * 100).toFixed(2)}% | ${best.tirOK ? '✓ Cumple' : '✗ No cumple'}`
        ],
        keyMetrics: [
          { label: 'Miembros', value: `${group.totalMembers}`, emoji: '👥' },
          { label: 'Aportación Base', value: this.financialCalc.formatCurrency(group.monthlyAmount), emoji: '💰' },
          { label: 'Horizonte', value: `${horizonMonths} meses`, emoji: '📆' },
        ],
        timeline: [] as any,
        whatsAppMessage: `❄️ *Tanda Enhanced*\n\nMejor escenario: ${best.name}\nIRR: ${(best.irrAnnual * 100).toFixed(2)}% ${best.tirOK ? '✓' : '✗'}\nMiembros: ${group.totalMembers} | Aportación: ${this.financialCalc.formatCurrency(group.monthlyAmount)} | Horizonte: ${horizonMonths}m`
      }
    };
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  // Convert any scenario to WhatsApp-ready format
  generateWhatsAppExport(scenario: CompleteBusinessScenario): string {
    return scenario.seniorSummary.whatsAppMessage;
  }

  // Convert any scenario to PDF-ready format
  generatePDFExport(scenario: CompleteBusinessScenario): any {
    return {
      title: scenario.seniorSummary.title,
      description: scenario.seniorSummary.description,
      keyMetrics: scenario.seniorSummary.keyMetrics,
      timeline: scenario.seniorSummary.timeline,
      quote: scenario.quote,
      amortizationTable: scenario.amortizationTable,
      savingsScenario: scenario.savingsScenario
    };
  }

  // Validate scenario before creation
  validateScenarioInput(flow: BusinessFlow, market: Market, config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validations
    if (!config.clientName || config.clientName.trim().length < 2) {
      errors.push('El nombre del cliente es requerido');
    }

    // Flow-specific validations
    if (flow === BusinessFlow.VentaPlazo) {
      if (!config.totalPrice || config.totalPrice <= 0) {
        errors.push('El precio total debe ser mayor a cero');
      }
      if (!config.downPayment || config.downPayment <= 0) {
        errors.push('El enganche debe ser mayor a cero');
      }
      if (config.downPayment >= config.totalPrice) {
        errors.push('El enganche no puede ser mayor o igual al precio total');
      }
    }

    // Market-specific validations
    if (market === 'aguascalientes' && config.term && ![12, 24].includes(config.term)) {
      errors.push('Para Aguascalientes, los plazos válidos son 12 o 24 meses');
    }
    if (market === 'edomex' && config.term && ![48, 60].includes(config.term)) {
      errors.push('Para Estado de México, los plazos válidos son 48 o 60 meses');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
