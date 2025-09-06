import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BusinessFlow, Client, Market } from '../models/types';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'mandatory' | 'conditional' | 'market-specific' | 'flow-specific';
  market?: Market;
  flow?: BusinessFlow;
  condition?: (client: Client) => boolean;
  validator: (client: Client) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface EcosystemValidation {
  isValid: boolean;
  ecosystemId: string; // ID de la ruta/ecosistema
  routeName: string; // Nombre de la ruta
  requiredDocuments: string[];
  missingDocuments: string[];
  validationStatus: 'pending' | 'approved' | 'rejected' | 'incomplete';
  validationNotes: string[];
  hasCartaAvalRuta: boolean; // Crítico para agremiados
  hasCartaAntiguedadRuta: boolean; // Crítico para agremiados
}

export interface MarketRequirements {
  market: Market;
  requiredDocuments: string[];
  optionalDocuments: string[];
  minimumDownPaymentRange: { min: number; max: number };
  allowedTerms: number[];
  maxLoanAmount: number;
  specialRules: string[];
  supportsAhorro: boolean; // Individual y colectivo (tanda)
  supportsCreditoColectivo: boolean;
  contadoDownPayment: number; // 50% para compra de contado
}

@Injectable({
  providedIn: 'root'
})
export class BusinessRulesService {

  private validationRules: ValidationRule[] = [];

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Initialize all business validation rules
   */
  private initializeValidationRules(): void {
    this.validationRules = [
      // === AGUASCALIENTES RULES ===
      {
        id: 'ags-basic-docs',
        name: 'Documentos Básicos AGS',
        description: 'Documentación requerida para Aguascalientes',
        type: 'market-specific',
        market: 'aguascalientes',
        validator: (client: Client) => this.validateAgsBasicDocs(client)
      },
      {
        id: 'ags-plazo-requirements',
        name: 'Requisitos Venta a Plazo AGS',
        description: 'Validaciones específicas para venta a plazo en Aguascalientes',
        type: 'flow-specific',
        market: 'aguascalientes',
        flow: BusinessFlow.VentaPlazo,
        validator: (client: Client) => this.validateAgsPlazoRequirements(client)
      },

      // === ESTADO DE MEXICO RULES ===
      {
        id: 'edomex-ecosystem',
        name: 'Validación de Ecosistema EdoMex',
        description: 'Validación obligatoria del ecosistema para Estado de México',
        type: 'market-specific',
        market: 'edomex',
        validator: (client: Client) => this.validateEdomexEcosystem(client)
      },
      {
        id: 'edomex-colectivo-group',
        name: 'Validación Grupo Colectivo',
        description: 'Requisitos para crédito colectivo en EdoMex',
        type: 'flow-specific',
        market: 'edomex',
        flow: BusinessFlow.CreditoColectivo,
        validator: (client: Client) => this.validateColectivoGroup(client)
      },
      {
        id: 'edomex-individual-capacity',
        name: 'Capacidad de Pago Individual EdoMex',
        description: 'Validación de capacidad de pago para crédito individual',
        type: 'flow-specific',
        market: 'edomex',
        flow: BusinessFlow.VentaPlazo,
        validator: (client: Client) => this.validateEdomexPaymentCapacity(client)
      },

      // === UNIVERSAL RULES ===
      {
        id: 'age-validation',
        name: 'Validación de Edad',
        description: 'Cliente debe ser mayor de edad y menor de 70 años',
        type: 'mandatory',
        validator: (client: Client) => this.validateAge(client)
      },
      {
        id: 'income-validation',
        name: 'Validación de Ingresos',
        description: 'Ingresos suficientes para el flujo seleccionado',
        type: 'mandatory',
        validator: (client: Client) => this.validateIncome(client)
      },
      {
        id: 'credit-history',
        name: 'Historial Crediticio',
        description: 'Validación de historial crediticio en Buró',
        type: 'conditional',
        condition: (client: Client) => client.flow !== BusinessFlow.AhorroProgramado,
        validator: (client: Client) => this.validateCreditHistory(client)
      }
    ];
  }

  /**
   * Validate client against all applicable business rules
   */
  validateClient(client: Client): Observable<ValidationResult> {
    const applicableRules = this.validationRules.filter(rule => {
      // Check market filter
      if (rule.market && rule.market !== client.market) return false;
      
      // Check flow filter
      if (rule.flow && rule.flow !== client.flow) return false;
      
      // Check condition
      if (rule.condition && !rule.condition(client)) return false;
      
      return true;
    });

    const results = applicableRules.map(rule => rule.validator(client));
    const consolidatedResult = this.consolidateValidationResults(results);

    return of(consolidatedResult).pipe(delay(500));
  }

  /**
   * Validate ecosystem for EdoMex clients
   */
  validateEcosystem(client: Client): Observable<EcosystemValidation> {
    if (client.market !== 'edomex') {
      throw new Error('Validación de ecosistema solo aplica para Estado de México');
    }

    if (!client.ecosystemId) {
      return of<EcosystemValidation>({
        isValid: false,
        ecosystemId: '',
        routeName: '',
        requiredDocuments: this.getEcosystemRequiredDocuments(),
        missingDocuments: this.getEcosystemRequiredDocuments(),
        validationStatus: 'incomplete',
        validationNotes: ['Cliente no asignado a ecosistema'],
        hasCartaAvalRuta: false,
        hasCartaAntiguedadRuta: false
      }).pipe(delay(300));
    }

    // Simulate ecosystem validation
    const requiredDocs = this.getEcosystemRequiredDocuments();
    const clientDocs = client.documents.map(d => d.name);
    const missingDocs = requiredDocs.filter(doc => !clientDocs.includes(doc));
    
    const hasActaConstitutiva = client.documents.some(d => 
      d.name.includes('Acta Constitutiva') && d.status === 'Aprobado'
    );

    const validation: EcosystemValidation = {
      isValid: missingDocs.length === 0 && hasActaConstitutiva,
      ecosystemId: client.ecosystemId,
      routeName: 'Ruta asignada',
      requiredDocuments: requiredDocs,
      missingDocuments: missingDocs,
      validationStatus: hasActaConstitutiva ? 'approved' : 'pending',
      validationNotes: this.getEcosystemValidationNotes(client),
      hasCartaAvalRuta: client.documents.some(d => d.name.includes('Carta Aval de Ruta') && d.status === 'Aprobado'),
      hasCartaAntiguedadRuta: client.documents.some(d => d.name.includes('Carta de Antigüedad') && d.status === 'Aprobado')
    };

    return of<EcosystemValidation>(validation).pipe(delay(800));
  }

  /**
   * Get market-specific requirements
   */
  getMarketRequirements(market: Market): Observable<MarketRequirements> {
    const requirements: MarketRequirements = market === 'aguascalientes' 
      ? this.getAguascalientesRequirements()
      : this.getEdomexRequirements();

    return of(requirements).pipe(delay(200));
  }

  /**
   * Check if client can change business flow
   */
  canChangeBusinessFlow(client: Client, newFlow: BusinessFlow): Observable<{
    allowed: boolean;
    reasons: string[];
    requirements: string[];
  }> {
    const result = {
      allowed: false,
      reasons: [] as string[],
      requirements: [] as string[]
    };

    // Cannot change from/to VentaDirecta once documents are approved
    if (client.flow === BusinessFlow.VentaDirecta || newFlow === BusinessFlow.VentaDirecta) {
      const hasApprovedDocs = client.documents.some(d => d.status === 'Aprobado');
      if (hasApprovedDocs) {
        result.reasons.push('No se puede cambiar flujo con documentos ya aprobados');
        return of(result).pipe(delay(200));
      }
    }

    // Market compatibility checks
    if (client.market === 'aguascalientes' && newFlow === BusinessFlow.CreditoColectivo) {
      result.reasons.push('Crédito colectivo no disponible en Aguascalientes');
      return of(result).pipe(delay(200));
    }

    // EdoMex specific rules
    if (client.market === 'edomex' && newFlow === BusinessFlow.CreditoColectivo) {
      if (!client.ecosystemId) {
        result.requirements.push('Cliente debe estar asignado a ecosistema');
      }
      result.requirements.push('Debe formar grupo de 5-8 miembros');
      result.requirements.push('Todos los miembros deben estar validados');
    }

    result.allowed = result.reasons.length === 0;

    return of(result).pipe(delay(300));
  }

  // === PRIVATE VALIDATION METHODS ===

  private validateAgsBasicDocs(client: Client): ValidationResult {
    const requiredDocs = ['INE', 'Comprobante de Domicilio', 'Constancia de Situación Fiscal', 'Copia Concesión', 'Tarjeta de Circulación'];
    const clientDocs = client.documents.map(d => d.name);
    const missing = requiredDocs.filter(doc => !clientDocs.includes(doc));

    return {
      valid: missing.length === 0,
      errors: missing.map(doc => `Falta documento: ${doc}`),
      warnings: [],
      recommendations: missing.length > 0 ? ['Solicitar documentos faltantes al cliente'] : [],
      nextSteps: missing.length > 0 ? [`Cargar ${missing.length} documento(s) faltante(s)`] : ['Proceder con validación de capacidad de pago']
    };
  }

  private validateAgsPlazoRequirements(client: Client): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Down payment validation (60% minimum for AGS)
    if (client.paymentPlan && (client.paymentPlan.downPaymentPercentage ?? 0) < 0.60) {
      errors.push('Enganche mínimo para AGS es 60%');
    }

    // Term validation (12 or 24 months only)
    if (client.paymentPlan && ![12, 24].includes(client.paymentPlan.term ?? -1)) {
      errors.push('Plazos permitidos en AGS: 12 o 24 meses');
    }

    // Income validation for AGS
    const requiredIncome = 15000; // Minimum for AGS
    if (client.monthlyIncome && client.monthlyIncome < requiredIncome) {
      errors.push(`Ingreso mínimo requerido: $${requiredIncome.toLocaleString('es-MX')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: errors.length > 0 ? ['Revisar condiciones del cliente'] : [],
      nextSteps: errors.length === 0 ? ['Cliente cumple requisitos para AGS Plazo'] : ['Corregir requisitos antes de continuar']
    };
  }

  private validateEdomexEcosystem(client: Client): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!client.ecosystemId) {
      errors.push('Cliente debe estar asignado a una ruta/ecosistema validado');
      recommendations.push('Asignar cliente a ruta correspondiente');
    }

    // Validar documentos de la ruta
    const hasActaConstitutiva = client.documents.some(d => 
      d.name.includes('Acta Constitutiva') && d.status === 'Aprobado'
    );
    const hasPoderes = client.documents.some(d => 
      d.name.includes('Poderes') && d.status === 'Aprobado'
    );
    const hasINERepresentante = client.documents.some(d => 
      d.name.includes('INE Representante') && d.status === 'Aprobado'
    );

    // Validar documentos CRÍTICOS del agremiado
    const hasCartaAvalRuta = client.documents.some(d => 
      d.name.includes('Carta Aval de Ruta') && d.status === 'Aprobado'
    );
    const hasCartaAntiguedad = client.documents.some(d => 
      d.name.includes('Carta de Antigüedad') && d.status === 'Aprobado'
    );

    if (!hasActaConstitutiva) {
      errors.push('Falta Acta Constitutiva de la Ruta aprobada');
    }
    if (!hasPoderes) {
      errors.push('Faltan Poderes de la Ruta aprobados');
    }
    if (!hasINERepresentante) {
      errors.push('Falta INE del Representante Legal aprobado');
    }
    if (!hasCartaAvalRuta) {
      errors.push('Falta Carta Aval de Ruta (CRÍTICO para agremiados)');
      recommendations.push('Solicitar Carta Aval de Ruta - documento obligatorio');
    }
    if (!hasCartaAntiguedad) {
      errors.push('Falta Carta de Antigüedad de la Ruta');
      recommendations.push('Solicitar Carta de Antigüedad de la Ruta');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      nextSteps: errors.length === 0 ? ['Ruta/ecosistema validado correctamente'] : ['Completar validación de ruta']
    };
  }

  private validateColectivoGroup(client: Client): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!client.groupId) {
      errors.push('Cliente no asignado a grupo colectivo');
      recommendations.push('Formar grupo colectivo con miembros de la misma ruta');
    }

    // Validar que todos pertenecen a la misma ruta
    if (!client.ecosystemId) {
      errors.push('Todos los miembros del grupo deben pertenecer a la misma ruta');
    }

    // TODO: Replace with actual API call to get group size
    // For now using minimum valid size for demo purposes
    const groupSize = 5; // This should come from: this.apiService.getGroupSize(client.groupId)
    if (groupSize < 5) {
      errors.push(`Grupo incompleto: ${groupSize} miembros. Mínimo requerido: 5 miembros`);
      recommendations.push('Reclutar miembros adicionales de la misma ruta');
    } else if (groupSize > 20) {
      warnings.push(`Grupo muy grande: ${groupSize} miembros. Considerar dividir en grupos más pequeños.`);
    }

    // Validar enganche del grupo (15-20% para colectivo)
    if (client.paymentPlan) {
      const downPaymentPct = client.paymentPlan.downPaymentPercentage ?? 0;
      if (downPaymentPct < 0.15) {
        errors.push('Enganche mínimo para crédito colectivo: 15%');
      } else if (downPaymentPct > 0.20) {
        warnings.push('Enganche alto para crédito colectivo. Máximo sugerido: 20%');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations,
      nextSteps: errors.length === 0 ? ['Grupo listo para crédito colectivo'] : ['Completar formación de grupo']
    };
  }

  private validateEdomexPaymentCapacity(client: Client): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const minIncome = 20000; // Higher requirement for EdoMex individual
    if (client.monthlyIncome && client.monthlyIncome < minIncome) {
      errors.push(`Ingreso insuficiente para EdoMex individual. Mínimo: $${minIncome.toLocaleString('es-MX')}`);
    }

    // Payment-to-income ratio validation
    if (client.paymentPlan && client.monthlyIncome) {
      const paymentRatio = (client.paymentPlan.monthlyPayment ?? 0) / client.monthlyIncome;
      if (paymentRatio > 0.35) {
        warnings.push('Relación pago/ingreso alta (>35%). Evaluar riesgo.');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: warnings.length > 0 ? ['Considerar reducir monto o extender plazo'] : [],
      nextSteps: errors.length === 0 ? ['Capacidad de pago validada'] : ['Ajustar condiciones de crédito']
    };
  }

  private validateAge(client: Client): ValidationResult {
    const errors: string[] = [];
    
    if (!client.birthDate) {
      errors.push('Fecha de nacimiento requerida');
    } else {
      const age = this.calculateAge(client.birthDate);
      if (age < 18) {
        errors.push('Cliente debe ser mayor de edad');
      } else if (age > 70) {
        errors.push('Edad máxima permitida: 70 años');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      recommendations: [],
      nextSteps: []
    };
  }

  private validateIncome(client: Client): ValidationResult {
    const errors: string[] = [];
    
    if (!client.monthlyIncome || client.monthlyIncome <= 0) {
      errors.push('Ingresos mensuales requeridos');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      recommendations: errors.length > 0 ? ['Solicitar comprobantes de ingresos'] : [],
      nextSteps: []
    };
  }

  private validateCreditHistory(client: Client): ValidationResult {
    // Simulate credit bureau validation
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // This would normally integrate with credit bureau APIs
    // For now, simulate based on score
    const simulatedScore = 650 + Math.random() * 200; // 650-850 range
    
    if (simulatedScore < 600) {
      warnings.push('Historial crediticio bajo. Evaluar condiciones especiales.');
      recommendations.push('Solicitar aval o garantía adicional');
    } else if (simulatedScore < 700) {
      warnings.push('Historial crediticio regular. Monitorear de cerca.');
    }

    return {
      valid: true,
      errors: [],
      warnings,
      recommendations,
      nextSteps: simulatedScore >= 700 ? ['Historial crediticio aprobado'] : ['Evaluar condiciones especiales']
    };
  }

  // === HELPER METHODS ===

  private consolidateValidationResults(results: ValidationResult[]): ValidationResult {
    return {
      valid: results.every(r => r.valid),
      errors: results.flatMap(r => r.errors),
      warnings: results.flatMap(r => r.warnings),
      recommendations: results.flatMap(r => r.recommendations),
      nextSteps: results.flatMap(r => r.nextSteps)
    };
  }

  private getEcosystemRequiredDocuments(): string[] {
    return [
      'Acta Constitutiva del Ecosistema',
      'RFC del Ecosistema',
      'Padrón de Socios Actualizado',
      'Acta de Asamblea de Aprobación'
    ];
  }

  private getEcosystemValidationNotes(client: Client): string[] {
    const notes: string[] = [];
    
    if (client.ecosystemId) {
      notes.push(`Ecosistema asignado: ${client.ecosystemId}`);
    }
    
    const ecosystemDocs = client.documents.filter(d => 
      d.name.includes('Ecosistema') || d.name.includes('Acta Constitutiva')
    );
    
    if (ecosystemDocs.length > 0) {
      notes.push(`${ecosystemDocs.length} documento(s) de ecosistema en expediente`);
    }
    
    return notes;
  }

  private getAguascalientesRequirements(): MarketRequirements {
    return {
      market: 'aguascalientes',
      requiredDocuments: ['INE', 'Comprobante de Domicilio', 'Constancia de Situación Fiscal', 'Copia Concesión', 'Tarjeta de Circulación'],
      optionalDocuments: ['Referencias Comerciales', 'Estados de Cuenta'],
      minimumDownPaymentRange: { min: 0.60, max: 0.60 }, // 60% fijo para venta a plazo
      allowedTerms: [12, 24],
      maxLoanAmount: 400000,
      supportsAhorro: true, // Ahorro individual desde 1 persona
      supportsCreditoColectivo: false, // NO crédito colectivo en AGS
      contadoDownPayment: 0.50, // 50% para compra de contado
      specialRules: [
        'Venta a plazo: 60% enganche fijo',
        'Compra de contado: 50% del valor',
        'Solo plazos de 12 o 24 meses',
        'Ahorro individual disponible',
        'NO crédito colectivo',
        'Ingreso mínimo $15,000 MXN',
        'Edad máxima 65 años'
      ]
    };
  }

  private getEdomexRequirements(): MarketRequirements {
    return {
      market: 'edomex',
      requiredDocuments: [
        // Documentos de la ruta/ecosistema
        'Acta Constitutiva de la Ruta', 'Poderes', 'INE Representante Legal', 'Constancia Situación Fiscal Ruta',
        // Documentos adicionales para agremiados
        'Carta de Antigüedad de la Ruta', 'Carta Aval de Ruta',
        // Documentos personales del agremiado
        'INE', 'Comprobante de Domicilio', 'Constancia Situación Fiscal', 'Copia Concesión', 'Tarjeta de Circulación'
      ],
      optionalDocuments: ['Referencias Comerciales', 'Estados de Cuenta', 'Aval'],
      minimumDownPaymentRange: { 
        min: 0.15, // 15% crédito colectivo
        max: 0.25  // 25% venta a plazo individual
      },
      allowedTerms: [48, 60],
      maxLoanAmount: 800000,
      supportsAhorro: true, // Ahorro individual Y colectivo (tanda)
      supportsCreditoColectivo: true, // Crédito colectivo disponible
      contadoDownPayment: 0.50, // 50% para compra de contado
      specialRules: [
        'Ecosistema de ruta obligatorio',
        'Carta Aval de Ruta CRÍTICA para agremiados',
        'Venta a plazo individual: 20-25% enganche',
        'Crédito colectivo: 15-20% enganche',
        'Compra de contado: 50% del valor',
        'Ahorro individual y colectivo (tanda) disponible',
        'Crédito colectivo: mínimo 5 miembros, sin máximo (lógico ~20)',
        'Plazos de 48 o 60 meses',
        'Ingreso mínimo $20,000 MXN (individual)',
        'Convenio dación en pago post-onboarding'
      ]
    };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}