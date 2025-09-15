import { Injectable } from '@angular/core';
import { AVIResponse, AVIQuestionEnhanced, AVIScore, RedFlag, VoiceAnalysis } from '../models/types';

// Mathematical utilities
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

interface ScientificResult extends AVIScore {
  subscore_breakdown: {
    [questionId: string]: {
      S_time: number;
      S_voice: number;
      S_lex: number;
      S_coher: number;
      final_subscore: number;
    };
  };
  mathematical_justification: {
    total_weighted_score: number;
    total_weight: number;
    normalization_factor: number;
  };
}

interface CoherenceInputs {
  vueltasDia?: number;
  kmPorVuelta?: number;
  gastoCombustibleDia?: number;
  ingresoDeclaradoDia?: number;
  tarifa?: number;
  paxPorVuelta?: number;
  rendimientoKmLt?: number;
  otrosCostosDia?: number;
  cuotasSemana?: number;
  pagosExistentes?: number;
  capacidadPagoDeclarada?: number;
  anosExperiencia?: number;
}

// Coefficients by category (α, β, γ, δ)
const COEFFICIENTS_BY_CATEGORY = {
  BASIC_INFO: { a: 0.3, b: 0.2, c: 0.2, d: 0.3 },
  DAILY_OPERATION: { a: 0.2, b: 0.25, c: 0.15, d: 0.4 },
  OPERATIONAL_COSTS: { a: 0.2, b: 0.25, c: 0.15, d: 0.4 },
  BUSINESS_STRUCTURE: { a: 0.25, b: 0.2, c: 0.2, d: 0.35 },
  ASSETS: { a: 0.3, b: 0.2, c: 0.2, d: 0.3 },
  CREDIT_HISTORY: { a: 0.15, b: 0.3, c: 0.25, d: 0.3 },
  PAYMENT_INTENTION: { a: 0.2, b: 0.3, c: 0.2, d: 0.3 },
  RISK_ASSESSMENT: { a: 0.2, b: 0.35, c: 0.2, d: 0.25 }
};

// Lexical likelihood ratios (initially heuristic, to be calibrated)
const LEXICAL_LR_MAP = {
  evasive: {
    'aproximadamente': 3.2,
    'mas_o_menos': 2.8,
    'depende': 2.5,
    'varia': 2.3,
    'no_se': 4.5,
    'creo_que': 3.0,
    'debe_ser': 2.7,
    'poquito': 2.9,
    'casi_nada': 3.5,
    'no_pago_nada': 5.0,
    'es_complicado': 2.4
  },
  honest: {
    'exactamente': 0.3,
    'siempre': 0.4,
    'fijo': 0.5,
    'todos_los_dias': 0.4,
    'preciso': 0.2,
    'exacto': 0.3
  }
};

@Injectable({
  providedIn: 'root'
})
export class AVIScientificEngineService {
  
  constructor() {}

  /**
   * Calculate scientific AVI score using mathematical model
   */
  calculate(responses: AVIResponse[], questions: AVIQuestionEnhanced[]): ScientificResult {
    const startTime = Date.now();
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const subscore_breakdown: { [questionId: string]: any } = {};
    const categoryScores: any = {};
    const redFlags: RedFlag[] = [];

    // Build coherence context from all responses
    const coherenceContext = this.buildCoherenceContext(responses);

    responses.forEach(response => {
      const question = questions.find(q => q.id === response.questionId);
      if (!question) return;

      // Get adaptive coefficients
      const coeffs = this.getAdaptiveCoefficients(question);
      
      // Calculate subscore
      const subscore = this.calculateSubscore(response, question, coeffs, coherenceContext);
      
      // Apply anti-double-counting weight cap
      const adjustedWeight = this.getAdjustedWeight(question, subscore.final_subscore);
      
      totalWeightedScore += subscore.final_subscore * adjustedWeight;
      totalWeight += adjustedWeight;
      
      // Store breakdown for analysis
      subscore_breakdown[response.questionId] = subscore;
      
      // Track category scores
      if (!categoryScores[question.category]) {
        categoryScores[question.category] = { total: 0, count: 0 };
      }
      categoryScores[question.category].total += subscore.final_subscore;
      categoryScores[question.category].count += 1;

      // Detect red flags using scientific thresholds
      this.detectRedFlags(response, question, subscore, redFlags);
    });

    // Calculate final score
    const normalizedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const finalScore = Math.round(normalizedScore * 1000);

    // Normalize category scores
    const normalizedCategoryScores: any = {};
    Object.keys(categoryScores).forEach(cat => {
      const catData = categoryScores[cat];
      normalizedCategoryScores[cat] = Math.round((catData.total / catData.count) * 1000);
    });

    const processingTime = Date.now() - startTime;

    return {
      totalScore: finalScore,
      riskLevel: this.calculateRiskLevel(finalScore),
      categoryScores: normalizedCategoryScores,
      redFlags,
      recommendations: this.generateScientificRecommendations(finalScore, redFlags),
      processingTime,
      subscore_breakdown,
      mathematical_justification: {
        total_weighted_score: totalWeightedScore,
        total_weight: totalWeight,
        normalization_factor: normalizedScore
      }
    };
  }

  /**
   * Calculate subscore for individual question using scientific formula
   */
  private calculateSubscore(
    response: AVIResponse,
    question: AVIQuestionEnhanced,
    coeffs: { a: number; b: number; c: number; d: number },
    coherenceContext: CoherenceInputs
  ): {
    S_time: number;
    S_voice: number;
    S_lex: number;
    S_coher: number;
    final_subscore: number;
  } {
    // S_time: Z-score normalization
    const sigma = (question.analytics.sigmaRatio || 0.35) * question.analytics.expectedResponseTime;
    const z = (response.responseTime - question.analytics.expectedResponseTime) / Math.max(1e-6, sigma);
    const S_time = sigmoid(-z); // Slow response = lower score

    // S_voice: Voice analysis (0-1)
    const S_voice = response.voiceAnalysis ? 
      this.computeVoiceScore(response.voiceAnalysis, question.stressLevel) : 0.5;

    // S_lex: Lexical likelihood ratio
    const S_lex = this.computeLexicalScore(response.transcription);

    // S_coher: Coherence with dimensional analysis
    const S_coher = this.computeCoherenceScore(response, question, coherenceContext);

    // Final weighted subscore
    const final_subscore = clamp01(
      coeffs.a * S_time + 
      coeffs.b * S_voice + 
      coeffs.c * S_lex + 
      coeffs.d * S_coher
    );

    return { S_time, S_voice, S_lex, S_coher, final_subscore };
  }

  /**
   * Compute voice score with stress adjustment
   */
  private computeVoiceScore(voice: VoiceAnalysis, expectedStress: number): number {
    const stressAdjustment = expectedStress / 5; // Normalize to 0-1
    
    const rawScore = (
      voice.pitch_variance * 0.3 +
      voice.speech_rate_change * 0.25 +
      voice.pause_frequency * 0.25 +
      voice.voice_tremor * 0.2
    );
    
    // If we expect high stress, don't penalize nervousness as much
    return sigmoid(rawScore - stressAdjustment);
  }

  /**
   * Compute lexical score using likelihood ratios
   */
  private computeLexicalScore(transcription: string): number {
    const words = transcription.toLowerCase().split(/\s+/);
    let logLR = 0;
    let wordCount = 0;

    words.forEach(word => {
      const pe = LEXICAL_LR_MAP.evasive[word];
      const ph = LEXICAL_LR_MAP.honest[word];
      
      if (pe || ph) {
        const evasiveProb = pe || 1e-3;
        const honestProb = ph || 1e-3;
        logLR += Math.log(evasiveProb / honestProb);
        wordCount++;
      }
    });

    // Average log-likelihood ratio
    if (wordCount > 0) {
      logLR /= wordCount;
    }

    return sigmoid(-logLR); // High evasive LR = lower score
  }

  /**
   * Compute coherence score with dimensional analysis
   */
  private computeCoherenceScore(
    response: AVIResponse,
    question: AVIQuestionEnhanced,
    context: CoherenceInputs
  ): number {
    switch (response.questionId) {
      case 'ingresos_promedio_diarios':
        return this.validateIncomeCoherence(parseFloat(response.value), context);
      
      case 'gasto_diario_gasolina':
        return this.validateFuelCoherence(parseFloat(response.value), context);
      
      case 'capacidad_pago_semanal':
        return this.validatePaymentCapacityCoherence(parseFloat(response.value), context);
      
      default:
        return 0.7; // Neutral score for non-quantitative questions
    }
  }

  /**
   * Validate income coherence using expected income formula
   */
  private validateIncomeCoherence(declaredIncome: number, context: CoherenceInputs): number {
    if (!context.vueltasDia || !context.tarifa || !context.paxPorVuelta) {
      return 0.5; // Insufficient data
    }

    const expectedIncome = context.vueltasDia * context.paxPorVuelta * context.tarifa;
    
    if (expectedIncome <= 0) return 0.1; // Invalid calculation
    
    const ratio = declaredIncome / expectedIncome;
    
    // Symmetric penalty: both over and under-declaration are suspicious
    return sigmoid(-Math.abs(Math.log(ratio)));
  }

  /**
   * Validate fuel coherence using consumption formula
   */
  private validateFuelCoherence(declaredFuelCost: number, context: CoherenceInputs): number {
    if (!context.vueltasDia || !context.kmPorVuelta) {
      return 0.5;
    }

    const dailyKm = context.vueltasDia * context.kmPorVuelta;
    const rendimiento = context.rendimientoKmLt || 7; // Default bus fuel efficiency
    const precioLitro = 24; // Current approximate fuel price MXN
    
    const expectedFuelCost = (dailyKm / rendimiento) * precioLitro;
    
    if (expectedFuelCost <= 0) return 0.1;
    
    const ratio = declaredFuelCost / expectedFuelCost;
    return sigmoid(-Math.abs(Math.log(ratio)));
  }

  /**
   * Validate payment capacity against available cash flow
   */
  private validatePaymentCapacityCoherence(declaredCapacity: number, context: CoherenceInputs): number {
    if (!context.ingresoDeclaradoDia) return 0.5;

    const weeklyIncome = context.ingresoDeclaradoDia * 6; // 6 working days
    const weeklyExpenses = (
      (context.gastoCombustibleDia || 0) * 6 +
      (context.cuotasSemana || 0) +
      (context.pagosExistentes || 0)
    );
    
    const availableCashFlow = weeklyIncome - weeklyExpenses;
    
    if (availableCashFlow <= 0) return 0.1; // No capacity
    
    const utilizationRatio = declaredCapacity / availableCashFlow;
    
    // Optimal utilization is around 60-70%
    const targetUtilization = 0.65;
    const deviation = Math.abs(utilizationRatio - targetUtilization);
    
    return sigmoid(-deviation * 3); // Penalize deviations from optimal
  }

  /**
   * Build coherence context from all responses
   */
  private buildCoherenceContext(responses: AVIResponse[]): CoherenceInputs {
    const context: CoherenceInputs = {};
    
    responses.forEach(response => {
      const value = parseFloat(response.value);
      if (isNaN(value)) return;

      switch (response.questionId) {
        case 'vueltas_por_dia':
          context.vueltasDia = value;
          break;
        case 'kilometros_por_vuelta':
          context.kmPorVuelta = value;
          break;
        case 'gasto_diario_gasolina':
          context.gastoCombustibleDia = value;
          break;
        case 'ingresos_promedio_diarios':
          context.ingresoDeclaradoDia = value;
          break;
        case 'tarifa_por_pasajero':
          context.tarifa = value;
          break;
        case 'pasajeros_por_vuelta':
          context.paxPorVuelta = value;
          break;
        case 'capacidad_pago_semanal':
          context.capacidadPagoDeclarada = value;
          break;
        case 'gastos_mordidas_cuotas':
          context.cuotasSemana = value;
          break;
        case 'anos_en_ruta':
          context.anosExperiencia = value;
          break;
      }
    });

    return context;
  }

  /**
   * Get adaptive coefficients based on question weight and category
   */
  private getAdaptiveCoefficients(question: AVIQuestionEnhanced): { a: number; b: number; c: number; d: number } {
    const base = COEFFICIENTS_BY_CATEGORY[question.category] || COEFFICIENTS_BY_CATEGORY.BASIC_INFO;
    
    // For critical questions (weight 9-10), give more weight to coherence
    if (question.weight >= 9) {
      return {
        a: base.a * 0.8,  // Less weight to timing
        b: base.b * 1.1,  // More weight to voice stress
        c: base.c * 0.9,  // Less weight to lexical
        d: base.d * 1.3   // Much more weight to mathematical coherence
      };
    }
    
    return base;
  }

  /**
   * Apply anti-double-counting weight adjustment
   */
  private getAdjustedWeight(question: AVIQuestionEnhanced, subscore: number): number {
    // If the subscore is very low and the weight is high, cap the weight to prevent over-penalization
    if (subscore < 0.35 && question.weight > 7) {
      return Math.min(question.weight, 7);
    }
    
    return question.weight;
  }

  /**
   * Detect red flags using statistical thresholds
   */
  private detectRedFlags(
    response: AVIResponse,
    question: AVIQuestionEnhanced,
    subscore: any,
    redFlags: RedFlag[]
  ): void {
    // Statistical red flag: subscore more than 2 standard deviations below expected
    if (subscore.final_subscore < 0.2) {
      redFlags.push({
        type: 'STATISTICAL_OUTLIER',
        questionId: response.questionId,
        reason: `Score ${subscore.final_subscore.toFixed(3)} is statistically anomalous`,
        impact: question.weight,
        severity: question.weight >= 9 ? 'CRITICAL' : 'HIGH'
      });
    }

    // Coherence red flag: mathematical impossibility
    if (subscore.S_coher < 0.1 && question.weight >= 8) {
      redFlags.push({
        type: 'MATHEMATICAL_IMPOSSIBILITY',
        questionId: response.questionId,
        reason: 'Response violates mathematical constraints',
        impact: question.weight,
        severity: 'CRITICAL'
      });
    }

    // Voice-lexical contradiction: calm voice but evasive language
    if (subscore.S_voice > 0.8 && subscore.S_lex < 0.3 && question.stressLevel >= 4) {
      redFlags.push({
        type: 'VOICE_LEXICAL_CONTRADICTION',
        questionId: response.questionId,
        reason: 'Unusually calm voice with evasive language on stressful question',
        impact: question.weight,
        severity: 'MEDIUM'
      });
    }
  }

  /**
   * Calculate risk level with calibrated thresholds (adjusted for admission cases)
   */
  private calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 800) return 'LOW';
    if (score >= 650) return 'MEDIUM';
    if (score >= 420) return 'HIGH';  // Lowered from 500 to accommodate admission cases
    return 'CRITICAL';
  }

  /**
   * Generate scientific recommendations
   */
  private generateScientificRecommendations(score: number, redFlags: RedFlag[]): string[] {
    const recommendations: string[] = [];

    // Score-based recommendations
    if (score >= 800) {
      recommendations.push('Perfil estadísticamente confiable - proceder con confianza');
    } else if (score >= 650) {
      recommendations.push('Perfil dentro de parámetros aceptables - verificar documentación');
    } else if (score >= 500) {
      recommendations.push('Múltiples indicadores de riesgo - requiere garantías adicionales');
    } else {
      recommendations.push('Perfil estadísticamente inviable - alto riesgo de incumplimiento');
    }

    // Red flag specific recommendations
    const criticalFlags = redFlags.filter(f => f.severity === 'CRITICAL');
    if (criticalFlags.length > 0) {
      recommendations.push(`${criticalFlags.length} indicador(es) crítico(s) detectado(s)`);
    }

    const mathFlags = redFlags.filter(f => f.type === 'MATHEMATICAL_IMPOSSIBILITY');
    if (mathFlags.length > 0) {
      recommendations.push('Inconsistencias matemáticas requieren verificación inmediata');
    }

    return recommendations;
  }
}