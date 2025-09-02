import { Injectable } from '@angular/core';

export interface VoiceFraudAnalysis {
  sessionId: string;
  overallFraudScore: number; // 0-100 (100 = highest fraud probability)
  patterns: {
    stressLevel: number; // 0-1
    hesitationRate: number; // 0-1  
    consistencyScore: number; // 0-1
    confidenceLevel: number; // 0-1
    speechRate: number; // words per minute
    pauseAnalysis: PausePattern;
  };
  redFlags: FraudRedFlag[];
  recommendations: string[];
}

export interface PausePattern {
  averagePauseLength: number; // seconds
  unusualPauses: number; // count of pauses > 3 seconds
  fillerWords: number; // "eh", "um", "este" count
  totalPauses: number;
}

export interface FraudRedFlag {
  type: 'STRESS_DETECTED' | 'LONG_HESITATION' | 'INCONSISTENT_RESPONSE' | 'LOW_CONFIDENCE' | 'REHEARSED_SPEECH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  questionId?: string;
  timestamp: number;
}

export interface VoiceMetrics {
  transcript: string;
  audioBlob?: Blob;
  duration: number; // seconds
  questionId: string;
  responseTime: number; // seconds from question to response
}

@Injectable({
  providedIn: 'root'
})
export class VoiceFraudDetectionService {
  private sessionData: Map<string, VoiceMetrics[]> = new Map();
  
  constructor() {}

  // Initialize fraud detection session
  initializeSession(sessionId: string): void {
    this.sessionData.set(sessionId, []);
  }

  // Add voice response for analysis
  addVoiceResponse(sessionId: string, metrics: VoiceMetrics): void {
    if (!this.sessionData.has(sessionId)) {
      this.initializeSession(sessionId);
    }
    
    this.sessionData.get(sessionId)!.push(metrics);
  }

  // Analyze voice patterns for fraud detection
  analyzeFraudPatterns(sessionId: string): VoiceFraudAnalysis {
    const responses = this.sessionData.get(sessionId) || [];
    
    if (responses.length === 0) {
      return this.createEmptyAnalysis(sessionId);
    }

    // Calculate individual pattern scores
    const stressLevel = this.calculateStressLevel(responses);
    const hesitationRate = this.calculateHesitationRate(responses);
    const consistencyScore = this.calculateConsistencyScore(responses);
    const confidenceLevel = this.calculateConfidenceLevel(responses);
    const speechRate = this.calculateSpeechRate(responses);
    const pauseAnalysis = this.analyzePausePatterns(responses);

    // Generate red flags
    const redFlags = this.generateRedFlags(responses, {
      stressLevel,
      hesitationRate,
      consistencyScore,
      confidenceLevel,
      speechRate,
      pauseAnalysis
    });

    // Calculate overall fraud score (weighted combination)
    const overallFraudScore = this.calculateOverallFraudScore({
      stressLevel,
      hesitationRate,
      consistencyScore,
      confidenceLevel,
      speechRate,
      pauseAnalysis
    });

    return {
      sessionId,
      overallFraudScore,
      patterns: {
        stressLevel,
        hesitationRate,
        consistencyScore,
        confidenceLevel,
        speechRate,
        pauseAnalysis
      },
      redFlags,
      recommendations: this.generateRecommendations(overallFraudScore, redFlags)
    };
  }

  // Calculate stress level based on speech patterns
  private calculateStressLevel(responses: VoiceMetrics[]): number {
    let stressScore = 0;
    let factors = 0;

    responses.forEach(response => {
      const transcript = response.transcript.toLowerCase();
      
      // Check for stress indicators in speech
      const stressWords = ['no sé', 'este', 'eh', 'mm', 'pues', 'o sea'];
      const stressWordCount = stressWords.reduce((count, word) => 
        count + (transcript.match(new RegExp(word, 'g')) || []).length, 0
      );
      
      // High stress word frequency indicates nervousness
      const wordCount = transcript.split(' ').length;
      const stressRatio = wordCount > 0 ? stressWordCount / wordCount : 0;
      stressScore += Math.min(stressRatio * 3, 1); // Cap at 1.0
      
      // Response time pressure (very quick or very slow responses are suspicious)
      if (response.responseTime < 1) {
        stressScore += 0.3; // Too quick = rehearsed
      } else if (response.responseTime > 8) {
        stressScore += 0.4; // Too slow = thinking/fabricating
      }
      
      factors++;
    });

    return factors > 0 ? Math.min(stressScore / factors, 1) : 0;
  }

  // Calculate hesitation patterns
  private calculateHesitationRate(responses: VoiceMetrics[]): number {
    let totalHesitation = 0;
    let totalResponses = responses.length;

    responses.forEach(response => {
      const transcript = response.transcript.toLowerCase();
      
      // Count hesitation markers
      const hesitationWords = ['eh', 'este', 'mm', 'pues', 'bueno', 'a ver'];
      const hesitationCount = hesitationWords.reduce((count, word) => 
        count + (transcript.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0
      );
      
      // Long response time also indicates hesitation
      const timeHesitation = response.responseTime > 5 ? 1 : 0;
      
      // Combine word and time-based hesitation
      totalHesitation += Math.min((hesitationCount / 10) + (timeHesitation * 0.5), 1);
    });

    return totalResponses > 0 ? totalHesitation / totalResponses : 0;
  }

  // Calculate consistency across responses
  private calculateConsistencyScore(responses: VoiceMetrics[]): number {
    if (responses.length < 2) return 1; // Can't measure consistency with < 2 responses

    let consistencyScore = 1;
    
    // Check response time consistency
    const responseTimes = responses.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const responseTimeVariance = responseTimes.reduce((variance, time) => 
      variance + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length;
    
    // High variance in response times indicates inconsistent behavior
    if (responseTimeVariance > 10) {
      consistencyScore -= 0.3;
    }

    // Check speech pattern consistency
    const speechRates = responses.map(r => {
      const wordCount = r.transcript.split(' ').length;
      return r.duration > 0 ? wordCount / r.duration * 60 : 0; // words per minute
    });
    
    const avgSpeechRate = speechRates.reduce((a, b) => a + b, 0) / speechRates.length;
    const speechRateVariance = speechRates.reduce((variance, rate) => 
      variance + Math.pow(rate - avgSpeechRate, 2), 0) / speechRates.length;
    
    // High variance in speech rate indicates inconsistent confidence
    if (speechRateVariance > 2500) { // ~50 WPM variance
      consistencyScore -= 0.2;
    }

    return Math.max(consistencyScore, 0);
  }

  // Calculate confidence level based on speech characteristics
  private calculateConfidenceLevel(responses: VoiceMetrics[]): number {
    let totalConfidence = 0;

    responses.forEach(response => {
      const transcript = response.transcript.toLowerCase();
      let confidence = 0.7; // Base confidence

      // Confident language patterns
      const confidentWords = ['sí', 'claro', 'exacto', 'siempre', 'seguro', 'por supuesto'];
      const uncertainWords = ['creo que', 'no estoy seguro', 'tal vez', 'posiblemente', 'no sé'];
      
      const confidentCount = confidentWords.reduce((count, word) => 
        count + (transcript.includes(word) ? 1 : 0), 0);
      const uncertainCount = uncertainWords.reduce((count, word) => 
        count + (transcript.includes(word) ? 1 : 0), 0);

      confidence += (confidentCount * 0.1) - (uncertainCount * 0.15);

      // Response completeness indicates confidence
      const wordCount = transcript.split(' ').length;
      if (wordCount > 15) confidence += 0.1; // Detailed responses show confidence
      if (wordCount < 5) confidence -= 0.2; // Very short responses show uncertainty

      totalConfidence += Math.min(Math.max(confidence, 0), 1);
    });

    return responses.length > 0 ? totalConfidence / responses.length : 0;
  }

  // Calculate speech rate
  private calculateSpeechRate(responses: VoiceMetrics[]): number {
    let totalWordsPerMinute = 0;
    let validResponses = 0;

    responses.forEach(response => {
      if (response.duration > 0) {
        const wordCount = response.transcript.split(' ').length;
        const wordsPerMinute = (wordCount / response.duration) * 60;
        totalWordsPerMinute += wordsPerMinute;
        validResponses++;
      }
    });

    return validResponses > 0 ? totalWordsPerMinute / validResponses : 0;
  }

  // Analyze pause patterns
  private analyzePausePatterns(responses: VoiceMetrics[]): PausePattern {
    let totalPauses = 0;
    let totalPauseLength = 0;
    let unusualPauses = 0;
    let fillerWords = 0;

    responses.forEach(response => {
      const transcript = response.transcript.toLowerCase();
      
      // Count filler words as indicators of pauses/thinking
      const fillers = ['eh', 'mm', 'este', 'pues'];
      fillerWords += fillers.reduce((count, filler) => 
        count + (transcript.match(new RegExp(`\\b${filler}\\b`, 'g')) || []).length, 0);
      
      // Long response times indicate pauses for thinking
      if (response.responseTime > 3) {
        totalPauses++;
        totalPauseLength += response.responseTime;
        
        if (response.responseTime > 8) {
          unusualPauses++;
        }
      }
    });

    return {
      averagePauseLength: totalPauses > 0 ? totalPauseLength / totalPauses : 0,
      unusualPauses,
      fillerWords,
      totalPauses
    };
  }

  // Generate red flags based on analysis
  private generateRedFlags(responses: VoiceMetrics[], patterns: any): FraudRedFlag[] {
    const redFlags: FraudRedFlag[] = [];
    const timestamp = Date.now();

    // High stress detection
    if (patterns.stressLevel > 0.7) {
      redFlags.push({
        type: 'STRESS_DETECTED',
        severity: patterns.stressLevel > 0.85 ? 'HIGH' : 'MEDIUM',
        description: `Alto nivel de estrés detectado (${(patterns.stressLevel * 100).toFixed(1)}%)`,
        timestamp
      });
    }

    // Excessive hesitation
    if (patterns.hesitationRate > 0.6) {
      redFlags.push({
        type: 'LONG_HESITATION',
        severity: patterns.hesitationRate > 0.8 ? 'HIGH' : 'MEDIUM',
        description: `Excesiva vacilación en respuestas (${(patterns.hesitationRate * 100).toFixed(1)}%)`,
        timestamp
      });
    }

    // Low consistency
    if (patterns.consistencyScore < 0.4) {
      redFlags.push({
        type: 'INCONSISTENT_RESPONSE',
        severity: patterns.consistencyScore < 0.2 ? 'HIGH' : 'MEDIUM',
        description: `Patrones inconsistentes de respuesta (${(patterns.consistencyScore * 100).toFixed(1)}%)`,
        timestamp
      });
    }

    // Low confidence
    if (patterns.confidenceLevel < 0.3) {
      redFlags.push({
        type: 'LOW_CONFIDENCE',
        severity: patterns.confidenceLevel < 0.15 ? 'HIGH' : 'MEDIUM',
        description: `Bajo nivel de confianza en respuestas (${(patterns.confidenceLevel * 100).toFixed(1)}%)`,
        timestamp
      });
    }

    // Rehearsed speech patterns
    const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
    if (avgResponseTime < 1.5 && patterns.consistencyScore > 0.9) {
      redFlags.push({
        type: 'REHEARSED_SPEECH',
        severity: 'HIGH',
        description: 'Posibles respuestas ensayadas (muy rápidas y consistentes)',
        timestamp
      });
    }

    return redFlags;
  }

  // Calculate weighted fraud score
  private calculateOverallFraudScore(patterns: any): number {
    const weights = {
      stressLevel: 0.25,
      hesitationRate: 0.20,
      consistencyScore: 0.25, // Low consistency increases fraud score
      confidenceLevel: 0.15, // Low confidence increases fraud score  
      unusualPauses: 0.15
    };

    let fraudScore = 0;
    
    fraudScore += patterns.stressLevel * weights.stressLevel * 100;
    fraudScore += patterns.hesitationRate * weights.hesitationRate * 100;
    fraudScore += (1 - patterns.consistencyScore) * weights.consistencyScore * 100; // Invert consistency
    fraudScore += (1 - patterns.confidenceLevel) * weights.confidenceLevel * 100; // Invert confidence
    
    // Unusual pause penalty
    const pausePenalty = Math.min(patterns.pauseAnalysis.unusualPauses / 10, 1);
    fraudScore += pausePenalty * weights.unusualPauses * 100;

    return Math.min(Math.round(fraudScore), 100);
  }

  // Generate recommendations based on analysis
  private generateRecommendations(fraudScore: number, redFlags: FraudRedFlag[]): string[] {
    const recommendations: string[] = [];

    if (fraudScore > 70) {
      recommendations.push('ALTO RIESGO: Requiere revisión manual inmediata');
      recommendations.push('Considerar entrevista presencial adicional');
    } else if (fraudScore > 50) {
      recommendations.push('RIESGO MEDIO: Verificación adicional recomendada');
      recommendations.push('Revisar documentos con mayor detalle');
    } else if (fraudScore > 30) {
      recommendations.push('RIESGO BAJO: Proceder con precaución estándar');
    } else {
      recommendations.push('RIESGO MÍNIMO: Proceder con proceso normal');
    }

    // Specific recommendations based on red flags
    redFlags.forEach(flag => {
      switch (flag.type) {
        case 'STRESS_DETECTED':
          recommendations.push('Considerar re-hacer entrevista en ambiente más cómodo');
          break;
        case 'REHEARSED_SPEECH':
          recommendations.push('Hacer preguntas adicionales no preparadas');
          break;
        case 'INCONSISTENT_RESPONSE':
          recommendations.push('Validar información con fuentes adicionales');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Create empty analysis for new sessions
  private createEmptyAnalysis(sessionId: string): VoiceFraudAnalysis {
    return {
      sessionId,
      overallFraudScore: 0,
      patterns: {
        stressLevel: 0,
        hesitationRate: 0,
        consistencyScore: 1,
        confidenceLevel: 1,
        speechRate: 0,
        pauseAnalysis: {
          averagePauseLength: 0,
          unusualPauses: 0,
          fillerWords: 0,
          totalPauses: 0
        }
      },
      redFlags: [],
      recommendations: ['Sin datos suficientes para análisis']
    };
  }

  // Clean up session data
  clearSession(sessionId: string): void {
    this.sessionData.delete(sessionId);
  }

  // Get current session metrics
  getSessionMetrics(sessionId: string): VoiceMetrics[] {
    return this.sessionData.get(sessionId) || [];
  }
}