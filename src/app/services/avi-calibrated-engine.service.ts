import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AVIResponse, AVIScore, AVIQuestionEnhanced, RedFlag, AVICategory } from '../models/types';
import { environment } from '../../environments/environment';
import { ALL_AVI_QUESTIONS } from '../data/avi-questions.data';
import { 
  adjustLogLRForAdmission, 
  detectNervousWithAdmissionPattern, 
  applyNervousAdmissionCap,
  computeAdvancedLexicalScore 
} from '../utils/avi-lexical-processing';

@Injectable({
  providedIn: 'root'
})
export class AVICalibratedEngineService {

  /**
   * Engine calibrado con quick-fix quirúrgico conservador
   */
  calculateCalibratedScore(responses: AVIResponse[]): Observable<AVIScore> {
    const startTime = Date.now();
    
    if (responses.length === 0) {
      return of(this.getDefaultScore());
    }

    // Obtener configuración calibrada
    const config = environment.avi;
    const profile = config.decisionProfile;
    const thresholds = config.thresholds[profile];
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const categoryScores: { [key in AVICategory]: number } = {} as any;
    const redFlags: RedFlag[] = [];
    
    // Rastrear patterns "nervioso con admisión parcial" para corrección final
    const nervousAdmissionPatterns: any[] = [];

    responses.forEach(response => {
      const question = this.getQuestionById(response.questionId);
      if (!question) return;

      // Determinar si es pregunta de alto riesgo de evasión
      const isHighEvasionQuestion = this.isHighEvasionQuestion(question);
      
      // Calcular subscore calibrado
      const subscore = this.calculateCalibratedSubscore(
        response, 
        question, 
        isHighEvasionQuestion,
        config
      );

      totalWeightedScore += subscore.finalScore * question.weight;
      totalWeight += question.weight;

      // Track category scores
      if (!categoryScores[question.category]) {
        categoryScores[question.category] = 0;
      }
      categoryScores[question.category] += subscore.finalScore;
      
      // Rastrear patterns "nervioso con admisión" para corrección global
      if ((subscore as any).patternAnalysis?.patternDetected) {
        nervousAdmissionPatterns.push({
          questionId: response.questionId,
          patternStrength: ((subscore as any).patternAnalysis.nervousnessScore * 0.6) + 
                         ((subscore as any).patternAnalysis.admissionScore * 0.4),
          capApplied: (subscore as any).capApplied,
          isHighRiskQuestion: isHighEvasionQuestion,
          weight: question.weight
        });
      }

      // Detectar red flags con thresholds calibrados
      if (subscore.finalScore < thresholds.NOGO_MAX && question.weight >= 8) {
        redFlags.push({
          type: 'CALIBRATED_LOW_SCORE_CRITICAL',
          questionId: response.questionId,
          reason: `Score calibrado muy bajo (${subscore.finalScore.toFixed(3)}) en pregunta crítica`,
          impact: question.weight,
          severity: question.weight >= 9 ? 'CRITICAL' : 'HIGH'
        });
      }

      // Red flags específicas del sistema calibrado
      if (subscore.lexicalScore < 0.3 && isHighEvasionQuestion) {
        redFlags.push({
          type: 'EVASIVE_LANGUAGE_HIGH_RISK_QUESTION',
          questionId: response.questionId,
          reason: 'Lenguaje evasivo detectado en pregunta de alto riesgo',
          impact: 9,
          severity: 'HIGH'
        });
      }
    });

    const finalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 1000 : 0;
    const processingTime = Date.now() - startTime;

    // Aplicar thresholds calibrados para determinar risk level
    let riskLevel = this.calculateCalibratedRiskLevel(finalScore, redFlags, thresholds);
    
    // CORRECCIÓN FINAL: Pattern "nervioso con admisión parcial"
    riskLevel = this.applyNervousAdmissionRiskCorrection(riskLevel, nervousAdmissionPatterns);

    const result: AVIScore = {
      totalScore: Math.round(finalScore),
      riskLevel,
      categoryScores,
      redFlags,
      recommendations: this.generateCalibratedRecommendations(finalScore, redFlags, profile),
      processingTime
    };

    return of(result);
  }

  /**
   * Calcular subscore con calibración quirúrgica
   */
  private calculateCalibratedSubscore(
    response: AVIResponse,
    question: AVIQuestionEnhanced,
    isHighEvasion: boolean,
    config: any
  ) {
    // Obtener pesos calibrados según tipo de pregunta
    const weights = isHighEvasion ? config.categoryWeights.highEvasion : config.categoryWeights.normal;
    
    // 1. S_time: Z-score con σ calibrado
    const expectedTime = question.analytics.expectedResponseTime;
    const sigma = config.timing.sigmaRatio * expectedTime;
    const z = (response.responseTime - expectedTime) / Math.max(1e-6, sigma);
    const S_time = this.sigmoid(-z);

    // 2. S_voice: Análisis de voz (sin cambios)
    const S_voice = response.voiceAnalysis ? 
      this.computeVoiceScore(response.voiceAnalysis, question.stressLevel) : 0.5;

    // 3. S_lex: SISTEMA LÉXICO AVANZADO con relief de admisión parcial
    const questionContext = isHighEvasion ? 'high_evasion_question' : 'normal_question';
    const lexicalAnalysis = computeAdvancedLexicalScore(
      response.transcription, 
      config.lexicalBoosts.evasiveTokensMultiplier,
      questionContext
    );
    const S_lex = lexicalAnalysis.adjustedLexicalScore;

    // 4. S_coher: Coherencia (sin cambios mayores)
    const S_coher = this.computeCoherenceScore(response, question);

    // 5. PATTERN ANALYSIS: Detectar "nervioso con admisión parcial"
    const patternAnalysis = detectNervousWithAdmissionPattern(
      response.transcription,
      response.voiceAnalysis,
      response.responseTime,
      expectedTime
    );

    // Subscore base con pesos calibrados (α,β,γ,δ)
    let baseSubscore = this.clamp01(
      weights.a * S_time + 
      weights.b * S_voice + 
      weights.c * S_lex + 
      weights.d * S_coher
    );

    // 6. APLICAR CAP para pattern "nervioso con admisión"
    const finalScore = applyNervousAdmissionCap(baseSubscore, patternAnalysis);

    return {
      S_time,
      S_voice,
      lexicalScore: S_lex,
      S_coher,
      finalScore,
      weights: weights,
      isHighEvasion,
      // Datos avanzados para análisis
      lexicalAnalysis,
      patternAnalysis,
      capApplied: finalScore > baseSubscore
    };
  }

  /**
   * Lexical score CALIBRADO con boosts para tokens evasivos
   */
  private computeCalibratedLexicalScore(transcription: string, lexicalConfig: any): number {
    const text = transcription.toLowerCase();
    let lexicalScore = 0.5; // Base neutral
    
    // Detectar tokens evasivos con boost
    const evasiveTokens = lexicalConfig.evasiveTokens;
    const boostMultiplier = lexicalConfig.evasiveTokensMultiplier;
    
    let evasiveCount = 0;
    evasiveTokens.forEach((token: string) => {
      if (text.includes(token.toLowerCase())) {
        evasiveCount++;
      }
    });
    
    // Aplicar penalización con boost
    const evasivePenalty = evasiveCount * 0.15 * boostMultiplier;
    lexicalScore -= evasivePenalty;
    
    // Detectar tokens de honestidad (sin boost)
    const honestyTokens = ['exactamente', 'específicamente', 'la verdad es', 'admito que'];
    let honestyCount = 0;
    honestyTokens.forEach(token => {
      if (text.includes(token)) honestyCount++;
    });
    
    lexicalScore += honestyCount * 0.1;
    
    return this.clamp01(lexicalScore);
  }

  /**
   * Determinar si es pregunta de alto riesgo de evasión
   */
  private isHighEvasionQuestion(question: AVIQuestionEnhanced): boolean {
    const highEvasionCategories = [
      AVICategory.DAILY_OPERATION,
      AVICategory.OPERATIONAL_COSTS,
      AVICategory.CREDIT_HISTORY,
      AVICategory.PAYMENT_INTENTION
    ];
    
    const highEvasionQuestions = [
      'ingresos_promedio_diarios',
      'gastos_mordidas_cuotas',
      'vueltas_por_dia',
      'gasto_diario_gasolina',
      'ingresos_temporada_baja'
    ];
    
    return highEvasionCategories.includes(question.category) || 
           highEvasionQuestions.includes(question.id) ||
           question.weight >= 8;
  }

  /**
   * CORRECCIÓN FINAL: Evitar CRITICAL para pattern "nervioso con admisión parcial"
   */
  private applyNervousAdmissionRiskCorrection(
    currentRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    nervousAdmissionPatterns: any[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    
    if (currentRisk !== 'CRITICAL' || nervousAdmissionPatterns.length === 0) {
      return currentRisk; // Sin corrección necesaria
    }
    
    // Analizar si hay evidencia fuerte del pattern "nervioso con admisión" (lowered threshold)
    const significantPatterns = nervousAdmissionPatterns.filter(pattern => 
      pattern.patternStrength > 0.45 && pattern.capApplied
    );
    
    if (significantPatterns.length === 0) {
      return currentRisk; // Sin patterns significativos
    }
    
    // Calcular peso de evidencia del pattern
    const totalWeight = nervousAdmissionPatterns.reduce((sum, p) => sum + p.weight, 0);
    const avgPatternStrength = nervousAdmissionPatterns
      .reduce((sum, p) => sum + p.patternStrength * p.weight, 0) / Math.max(totalWeight, 1);
    
    // Corrección conservadora: CRITICAL → HIGH solo si hay evidencia fuerte (lowered threshold)
    if (avgPatternStrength > 0.55 && significantPatterns.length >= 1) {
      console.log(`🧠 CORRECCIÓN DE RISK LEVEL: CRITICAL → HIGH`);
      console.log(`   Pattern strength promedio: ${avgPatternStrength.toFixed(3)}`);
      console.log(`   Patterns significativos: ${significantPatterns.length}`);
      console.log(`   Razón: Nerviosismo con admisión parcial detectado`);
      
      return 'HIGH';
    }
    
    return currentRisk; // Mantener CRITICAL si no hay evidencia suficiente
  }

  /**
   * Risk level con thresholds calibrados
   */
  private calculateCalibratedRiskLevel(
    score: number, 
    redFlags: RedFlag[], 
    thresholds: any
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    
    // Flags críticas fuerzan CRITICAL
    const criticalFlags = redFlags.filter(f => f.severity === 'CRITICAL').length;
    if (criticalFlags >= 2) return 'CRITICAL';
    
    // Aplicar thresholds calibrados
    const normalizedScore = score / 1000; // Convertir a 0-1
    
    if (normalizedScore >= thresholds.GO_MIN) return 'LOW';
    if (normalizedScore <= thresholds.NOGO_MAX) return 'CRITICAL';
    
    // Zona intermedia - depende de flags
    const highFlags = redFlags.filter(f => f.severity === 'HIGH').length;
    if (criticalFlags >= 1 || highFlags >= 3) return 'HIGH';
    
    return 'MEDIUM';
  }

  /**
   * Recomendaciones calibradas por perfil
   */
  private generateCalibratedRecommendations(
    score: number, 
    redFlags: RedFlag[], 
    profile: string
  ): string[] {
    const recommendations: string[] = [];
    
    recommendations.push(`🔬 Análisis con perfil ${profile.toUpperCase()}`);
    
    const normalizedScore = score / 1000;
    const criticalFlags = redFlags.filter(f => f.severity === 'CRITICAL').length;
    const highFlags = redFlags.filter(f => f.severity === 'HIGH').length;
    
    if (profile === 'conservative') {
      if (normalizedScore >= 0.78) {
        recommendations.push('✅ APROBADO: Score alto con perfil conservador');
      } else if (normalizedScore <= 0.55) {
        recommendations.push('🚫 RECHAZADO: Score crítico - riesgo inaceptable');
      } else if (criticalFlags >= 1) {
        recommendations.push('⚠️ REVISAR: Red flags críticas detectadas');
      } else {
        recommendations.push('🔍 ANÁLISIS ADICIONAL: Score en zona intermedia');
      }
    }
    
    // Recomendaciones específicas por red flags
    if (redFlags.some(f => f.type.includes('EVASIVE_LANGUAGE'))) {
      recommendations.push('🕵️ Lenguaje evasivo en preguntas críticas - verificar manualmente');
    }
    
    if (redFlags.some(f => f.type.includes('CALIBRATED_LOW_SCORE'))) {
      recommendations.push('📉 Score muy bajo en preguntas de alto peso - alto riesgo');
    }
    
    recommendations.push(`📊 Score final: ${score}/1000 (${criticalFlags} críticas, ${highFlags} altas)`);
    
    return recommendations;
  }

  // Helper methods
  private computeVoiceScore(voiceAnalysis: any, stressLevel: number): number {
    const stressAdjustment = stressLevel / 5;
    let voiceScore = 0.5;
    
    if (voiceAnalysis.pitch_variance > 0.7) voiceScore -= 0.2;
    if (voiceAnalysis.pitch_variance < 0.2 && stressLevel >= 4) voiceScore -= 0.1;
    if (voiceAnalysis.speech_rate_change > 0.6) voiceScore -= 0.15;
    if (voiceAnalysis.pause_frequency > 0.8) voiceScore -= 0.2;
    if (voiceAnalysis.voice_tremor > 0.5) voiceScore -= 0.1;
    
    voiceScore += voiceAnalysis.confidence_level * 0.3;
    
    if (stressLevel >= 4) {
      voiceScore += stressAdjustment * 0.2;
    }
    
    return this.clamp01(voiceScore);
  }

  private computeCoherenceScore(response: AVIResponse, question: AVIQuestionEnhanced): number {
    // Simplified coherence for now
    const responseTime = response.responseTime;
    const expectedTime = question.analytics.expectedResponseTime;
    const timingScore = Math.abs(1 - responseTime / expectedTime);
    
    return this.clamp01(1 - timingScore);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private getQuestionById(questionId: string): AVIQuestionEnhanced | undefined {
    return ALL_AVI_QUESTIONS.find(q => q.id === questionId);
  }

  private getDefaultScore(): AVIScore {
    return {
      totalScore: 0,
      riskLevel: 'HIGH',
      categoryScores: {} as any,
      redFlags: [],
      recommendations: ['Complete interview to get score'],
      processingTime: 0
    };
  }
}