/**
 * AVI Engine - Migrado desde PWA
 * Algoritmos de scoring basados en avi.service.ts y avi-calibrated-engine.service.ts
 */

export interface AVIResponse {
  questionId: string;
  value: string;
  responseTime: number;
  transcription: string;
  voiceAnalysis?: VoiceAnalysis;
  stressIndicators: string[];
  coherenceScore: number;
}

export interface VoiceAnalysis {
  pitch_variance: number;
  speech_rate_change: number;
  pause_frequency: number;
  voice_tremor: number;
  confidence_level: number;
}

export interface AVIQuestionEnhanced {
  id: string;
  category: string;
  weight: number;
  stressLevel: number;
  analytics: {
    expectedResponseTime: number;
    truthVerificationKeywords: string[];
  };
}

/**
 * MIGRADO DESDE: avi.service.ts:171-212
 * Evalúa una respuesta individual usando tu algoritmo sofisticado
 */
export function evaluateResponse(
  response: AVIResponse, 
  question: AVIQuestionEnhanced
): number {
  let score = 0.5; // Base score

  // Factor 1: Response time analysis (MIGRADO EXACTO)
  const expectedTime = question.analytics.expectedResponseTime;
  const actualTime = response.responseTime;
  
  if (actualTime > expectedTime * 2) {
    score -= 0.15; // Too slow (suspicious)
  } else if (actualTime < expectedTime * 0.3) {
    score -= 0.1; // Too fast (prepared lie?)
  } else {
    score += 0.1; // Normal timing
  }

  // Factor 2: Stress indicators (MIGRADO EXACTO)
  const stressCount = response.stressIndicators.length;
  const expectedStress = question.stressLevel;
  
  if (stressCount > expectedStress + 2) {
    score -= 0.2; // Much more stressed than expected
  } else if (stressCount < expectedStress - 1 && expectedStress > 3) {
    score -= 0.1; // Too calm for stressful question
  }

  // Factor 3: Truth verification keywords (MIGRADO EXACTO)
  const hasEvasiveKeywords = question.analytics.truthVerificationKeywords.some(
    keyword => response.transcription.toLowerCase().includes(keyword)
  );
  
  if (hasEvasiveKeywords) {
    score -= 0.15;
  }

  // Factor 4: Voice analysis (MIGRADO EXACTO)
  if (response.voiceAnalysis) {
    const voiceScore = evaluateVoiceAnalysis(response.voiceAnalysis, question);
    score = (score * 0.7) + (voiceScore * 0.3); // 70-30 weighted combination
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * MIGRADO DESDE: avi.service.ts:214-242
 * Evalúa análisis de voz con ajustes por nivel de estrés
 */
export function evaluateVoiceAnalysis(
  voice: VoiceAnalysis, 
  question: AVIQuestionEnhanced
): number {
  // Adjust expectations based on question stress level
  const stressAdjustment = question.stressLevel / 5; // 0-1 scale
  
  let voiceScore = 0.5;
  
  // High pitch variance might indicate stress/lying
  if (voice.pitch_variance > 0.7) voiceScore -= 0.2;
  if (voice.pitch_variance < 0.2 && question.stressLevel >= 4) voiceScore -= 0.1; // Too calm
  
  // Speech rate changes
  if (voice.speech_rate_change > 0.6) voiceScore -= 0.15;
  
  // Pause frequency
  if (voice.pause_frequency > 0.8) voiceScore -= 0.2;
  
  // Voice tremor
  if (voice.voice_tremor > 0.5) voiceScore -= 0.1;
  
  // Confidence from speech recognition
  voiceScore += voice.confidence_level * 0.3;
  
  // Adjust for expected stress level
  if (question.stressLevel >= 4) {
    voiceScore += stressAdjustment * 0.2; // Some stress is expected
  }
  
  return Math.max(0, Math.min(1, voiceScore));
}

/**
 * MIGRADO DESDE: avi.service.ts:244-249
 * Calcula nivel de riesgo basado en score
 */
export function calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 800) return 'LOW';
  if (score >= 650) return 'MEDIUM';  
  if (score >= 500) return 'HIGH';
  return 'CRITICAL';
}

/**
 * MIGRADO DESDE: avi.service.ts:251-276
 * Genera recomendaciones basadas en score y red flags
 */
export function generateRecommendations(
  score: number, 
  redFlags: any[]
): string[] {
  const recommendations: string[] = [];

  if (score >= 800) {
    recommendations.push('Cliente de bajo riesgo - puede proceder');
  } else if (score >= 650) {
    recommendations.push('Riesgo moderado - revisar documentación adicional');
  } else if (score >= 500) {
    recommendations.push('Alto riesgo - requiere garantías adicionales');
  } else {
    recommendations.push('Riesgo crítico - no recomendado para crédito');
  }

  // Add specific recommendations based on red flags
  redFlags.forEach(flag => {
    switch (flag.type) {
      case 'LOW_SCORE_HIGH_WEIGHT':
        recommendations.push(`Revisar respuesta a pregunta crítica: ${flag.questionId}`);
        break;
      default:
        recommendations.push(`Atención requerida: ${flag.reason}`);
    }
  });

  return recommendations;
}

/**
 * Utilidad para generar voice analysis mock (desarrollo)
 */
export function generateMockVoiceAnalysis(question: AVIQuestionEnhanced): VoiceAnalysis {
  const baseStress = question.stressLevel / 5;
  
  return {
    pitch_variance: Math.random() * 0.3 + baseStress * 0.4,
    speech_rate_change: Math.random() * 0.2 + baseStress * 0.3,
    pause_frequency: Math.random() * 0.1 + baseStress * 0.5,
    voice_tremor: Math.random() * 0.1 + baseStress * 0.2,
    confidence_level: Math.max(0.6, Math.random() * 0.4 + 0.6)
  };
}