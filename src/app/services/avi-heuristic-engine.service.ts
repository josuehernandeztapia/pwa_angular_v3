import { Injectable } from '@angular/core';
import { AVIQuestionEnhanced, AVIResponse, AVIScore, RedFlag, AVICategory } from '../models/avi';
import { ALL_AVI_QUESTIONS } from '../data/avi-questions.data';

@Injectable({
  providedIn: 'root'
})
export class AVIHeuristicEngineService {

  /**
   * Heuristic engine - rapid assessment using business rules and patterns
   */
  calculateHeuristicScore(responses: AVIResponse[]): Promise<AVIScore> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const categoryScores: { [key in AVICategory]: number } = {} as any;
      const redFlags: RedFlag[] = [];
      let totalWeightedScore = 0;
      let totalWeight = 0;

      // Business rules patterns
      const financialData = this.extractFinancialData(responses);
      const behaviorPatterns = this.analyzeBehaviorPatterns(responses);
      const consistencyFlags = this.checkFinancialConsistency(financialData);

      responses.forEach(response => {
        const question = this.getQuestionById(response.questionId);
        if (!question) return;

        // Calculate heuristic score for this response
        const heuristicScore = this.calculateResponseHeuristic(
          response, 
          question, 
          financialData,
          behaviorPatterns
        );

        totalWeightedScore += heuristicScore * question.weight;
        totalWeight += question.weight;

        // Track category scores
        if (!categoryScores[question.category]) {
          categoryScores[question.category] = 0;
        }
        categoryScores[question.category] += heuristicScore;

        // Detect red flags using business rules
        const questionRedFlags = this.detectRedFlags(response, question, financialData);
        redFlags.push(...questionRedFlags);
      });

      // Add consistency red flags
      redFlags.push(...consistencyFlags);

      const finalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 1000 : 0;
      const processingTime = Date.now() - startTime;

      const result: AVIScore = {
        totalScore: Math.round(finalScore),
        riskLevel: this.calculateRiskLevel(finalScore),
        categoryScores,
        redFlags,
        recommendations: this.generateHeuristicRecommendations(finalScore, redFlags, financialData),
        processingTime
      };

      resolve(result);
    });
  }

  private extractFinancialData(responses: AVIResponse[]) {
    const data: any = {};
    
    responses.forEach(response => {
      const numericValue = parseFloat(response.value) || 0;
      
      switch(response.questionId) {
        case 'ingresos_promedio_diarios':
          data.dailyIncome = numericValue;
          break;
        case 'gasto_diario_gasolina':
          data.dailyFuelCost = numericValue;
          break;
        case 'vueltas_por_dia':
          data.dailyTrips = numericValue;
          break;
        case 'pasajeros_por_vuelta':
          data.passengersPerTrip = numericValue;
          break;
        case 'tarifa_por_pasajero':
          data.farePerPassenger = numericValue;
          break;
        case 'kilometros_por_vuelta':
          data.kmPerTrip = numericValue;
          break;
        case 'vueltas_por_tanque':
          data.tripsPerTank = numericValue;
          break;
        case 'gastos_mordidas_cuotas':
          data.weeklyBribes = numericValue;
          break;
        case 'pago_semanal_tarjeta':
          data.weeklyCardPayment = numericValue;
          break;
        case 'mantenimiento_mensual':
          data.monthlyMaintenance = numericValue;
          break;
        case 'ingresos_temporada_baja':
          data.lowSeasonIncome = numericValue;
          break;
      }
    });
    
    return data;
  }

  private analyzeBehaviorPatterns(responses: AVIResponse[]) {
    let fastResponses = 0;
    let slowResponses = 0;
    let highStressCount = 0;
    let evasiveLanguage = 0;
    let roundNumbers = 0;

    responses.forEach(response => {
      const question = this.getQuestionById(response.questionId);
      if (!question) return;

      const expectedTime = question.analytics.expectedResponseTime;
      
      // Response timing patterns
      if (response.responseTime < expectedTime * 0.4) {
        fastResponses++;
      } else if (response.responseTime > expectedTime * 2) {
        slowResponses++;
      }

      // Stress indicators
      if (response.stressIndicators.length > 3) {
        highStressCount++;
      }

      // Evasive language
      const hasEvasiveWords = question.analytics.truthVerificationKeywords.some(
        keyword => response.transcription.toLowerCase().includes(keyword)
      );
      if (hasEvasiveWords) {
        evasiveLanguage++;
      }

      // Round numbers (suspicious pattern)
      const numValue = parseFloat(response.value);
      if (numValue && numValue % 100 === 0 && numValue > 100) {
        roundNumbers++;
      }
    });

    return {
      fastResponseRatio: fastResponses / responses.length,
      slowResponseRatio: slowResponses / responses.length,
      highStressRatio: highStressCount / responses.length,
      evasiveLanguageRatio: evasiveLanguage / responses.length,
      roundNumbersRatio: roundNumbers / responses.length
    };
  }

  private checkFinancialConsistency(data: any): RedFlag[] {
    const flags: RedFlag[] = [];

    // Rule 1: Income vs Fuel cost ratio
    if (data.dailyIncome && data.dailyFuelCost) {
      const fuelRatio = data.dailyFuelCost / data.dailyIncome;
      if (fuelRatio > 0.6) {
        flags.push({
          type: 'FUEL_INCOME_RATIO_HIGH',
          questionId: 'financial_consistency',
          reason: `Gasto gasolina muy alto: ${(fuelRatio*100).toFixed(1)}% del ingreso`,
          impact: 9,
          severity: 'HIGH'
        });
      }
    }

    // Rule 2: Mathematical coherence passengers x fare x trips
    if (data.passengersPerTrip && data.farePerPassenger && data.dailyTrips) {
      const calculatedIncome = data.passengersPerTrip * data.farePerPassenger * data.dailyTrips;
      if (data.dailyIncome && Math.abs(calculatedIncome - data.dailyIncome) > data.dailyIncome * 0.4) {
        flags.push({
          type: 'INCOME_CALCULATION_MISMATCH',
          questionId: 'financial_consistency',
          reason: `Ingreso declarado no coincide con cálculo matemático`,
          impact: 10,
          severity: 'CRITICAL'
        });
      }
    }

    // Rule 3: Fuel efficiency check
    if (data.dailyFuelCost && data.kmPerTrip && data.dailyTrips) {
      const dailyKm = data.kmPerTrip * data.dailyTrips;
      const kmPerPeso = dailyKm / data.dailyFuelCost;
      if (kmPerPeso < 0.5) { // Too low efficiency
        flags.push({
          type: 'UNREALISTIC_FUEL_EFFICIENCY',
          questionId: 'operational_consistency',
          reason: 'Eficiencia combustible irrealmente baja',
          impact: 7,
          severity: 'MEDIUM'
        });
      }
    }

    // Rule 4: Low season sustainability
    if (data.dailyIncome && data.lowSeasonIncome) {
      const reductionRatio = (data.dailyIncome - data.lowSeasonIncome) / data.dailyIncome;
      if (reductionRatio > 0.7) {
        flags.push({
          type: 'UNSUSTAINABLE_LOW_SEASON',
          questionId: 'seasonal_risk',
          reason: `Reducción temporal muy alta: ${(reductionRatio*100).toFixed(1)}%`,
          impact: 8,
          severity: 'HIGH'
        });
      }
    }

    return flags;
  }

  private calculateResponseHeuristic(
    response: AVIResponse,
    question: AVIQuestionEnhanced,
    financialData: any,
    behaviorPatterns: any
  ): number {
    let score = 0.7; // Start with neutral score

    // Factor 1: Response timing (business rule)
    const expectedTime = question.analytics.expectedResponseTime;
    const timingRatio = response.responseTime / expectedTime;
    
    if (timingRatio < 0.3) {
      score -= 0.2; // Too fast - suspicious
    } else if (timingRatio > 3) {
      score -= 0.15; // Too slow - struggling
    } else if (timingRatio >= 0.7 && timingRatio <= 1.5) {
      score += 0.1; // Normal timing
    }

    // Factor 2: Stress level vs question difficulty
    const stressExpected = question.stressLevel;
    const stressActual = response.stressIndicators.length;
    
    if (Math.abs(stressActual - stressExpected) <= 1) {
      score += 0.05; // Expected stress level
    } else if (stressActual > stressExpected + 2) {
      score -= 0.15; // Too much stress
    } else if (stressActual < stressExpected - 2 && stressExpected >= 4) {
      score -= 0.1; // Too calm for difficult question
    }

    // Factor 3: Financial coherence context
    if (question.category === AVICategory.DAILY_OPERATION) {
      if (response.questionId === 'ingresos_promedio_diarios' && financialData.dailyFuelCost) {
        const profitMargin = (financialData.dailyIncome - financialData.dailyFuelCost) / financialData.dailyIncome;
        if (profitMargin < 0.2) {
          score -= 0.2; // Unrealistic low margin
        } else if (profitMargin > 0.8) {
          score -= 0.1; // Suspiciously high margin
        }
      }
    }

    // Factor 4: Language patterns
    const hasEvasiveKeywords = question.analytics.truthVerificationKeywords.some(
      keyword => response.transcription.toLowerCase().includes(keyword)
    );
    if (hasEvasiveKeywords) {
      score -= 0.1;
    }

    // Factor 5: Behavioral pattern penalties
    if (behaviorPatterns.roundNumbersRatio > 0.4) {
      score -= 0.05; // Too many round numbers
    }

    if (behaviorPatterns.evasiveLanguageRatio > 0.3) {
      score -= 0.1; // Too much evasive language
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  private detectRedFlags(
    response: AVIResponse,
    question: AVIQuestionEnhanced,
    financialData: any
  ): RedFlag[] {
    const flags: RedFlag[] = [];

    // Red flag: Critical question with very low heuristic score
    const score = this.calculateResponseHeuristic(response, question, financialData, {});
    if (score < 0.3 && question.weight >= 8) {
      flags.push({
        type: 'HEURISTIC_LOW_SCORE_CRITICAL',
        questionId: response.questionId,
        reason: `Score heurístico muy bajo (${score.toFixed(2)}) en pregunta crítica`,
        impact: question.weight,
        severity: question.weight >= 9 ? 'CRITICAL' : 'HIGH'
      });
    }

    // Red flag: Extreme response times
    const expectedTime = question.analytics.expectedResponseTime;
    if (response.responseTime > expectedTime * 4) {
      flags.push({
        type: 'EXTREME_RESPONSE_TIME',
        questionId: response.questionId,
        reason: `Tiempo de respuesta extremo: ${(response.responseTime/1000).toFixed(1)}s`,
        impact: 6,
        severity: 'MEDIUM'
      });
    }

    // Red flag: High stress on low-stress questions
    if (response.stressIndicators.length >= 4 && question.stressLevel <= 2) {
      flags.push({
        type: 'UNEXPECTED_HIGH_STRESS',
        questionId: response.questionId,
        reason: 'Estrés alto en pregunta simple',
        impact: 5,
        severity: 'MEDIUM'
      });
    }

    return flags;
  }

  private calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 780) return 'LOW';
    if (score >= 551) return 'MEDIUM';
    if (score >= 550) return 'HIGH';
    return 'CRITICAL';
  }

  private generateHeuristicRecommendations(
    score: number,
    redFlags: RedFlag[],
    financialData: any
  ): string[] {
    const recommendations: string[] = [];

    // Basic score-based recommendations
    if (score >= 750) {
      recommendations.push('Análisis heurístico: Cliente de bajo riesgo');
    } else if (score >= 600) {
      recommendations.push('Análisis heurístico: Riesgo moderado - validar con motor científico');
    } else if (score >= 450) {
      recommendations.push('Análisis heurístico: Alto riesgo - requiere análisis adicional');
    } else {
      recommendations.push('Análisis heurístico: Riesgo crítico - rechazar o solicitar garantías');
    }

    // Specific pattern-based recommendations
    const criticalFlags = redFlags.filter(f => f.severity === 'CRITICAL');
    if (criticalFlags.length > 0) {
      recommendations.push(`Patrones críticos detectados: ${criticalFlags.length} inconsistencias graves`);
    }

    // Financial data recommendations
    if (financialData.dailyIncome && financialData.dailyFuelCost) {
      const margin = (financialData.dailyIncome - financialData.dailyFuelCost) / financialData.dailyIncome;
      if (margin < 0.3) {
        recommendations.push('Margen operativo muy ajustado - riesgo de impago en crisis');
      }
    }

    // Seasonal risk
    if (financialData.lowSeasonIncome && financialData.dailyIncome) {
      const seasonalImpact = 1 - (financialData.lowSeasonIncome / financialData.dailyIncome);
      if (seasonalImpact > 0.5) {
        recommendations.push('Alta vulnerabilidad estacional - considerar garantías adicionales');
      }
    }

    return recommendations;
  }

  private getQuestionById(questionId: string): AVIQuestionEnhanced | undefined {
    return ALL_AVI_QUESTIONS.find(q => q.id === questionId);
  }
}