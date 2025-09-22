// Procesamiento léxico avanzado para AVI - Relief de admisión parcial
// Implementación quirúrgica del pattern "nervioso con admisión parcial"

import { 
  EVASIVE_STRONG, 
  ADMISSION_PARTIAL, 
  ADMISSION_WEIGHTS, 
  RELIEF_CONFIG,
  LexiconUtils 
} from '../data/avi-lexicons';

/**
 * Ajustar LogLR por admisión parcial - FUNCIÓN CENTRAL DEL REFINAMIENTO
 * 
 * @param logLR - Log Likelihood Ratio original (evasión)
 * @param text - Transcripción completa
 * @param questionContext - Contexto de la pregunta ('high_evasion_question' | 'payment_context' | 'normal_question')
 * @returns LogLR ajustado con relief por admisión parcial
 */
export function adjustLogLRForAdmission(
  logLR: number, 
  text: string, 
  questionContext: 'high_evasion_question' | 'payment_context' | 'normal_question' = 'normal_question'
): number {
  const lowerText = text.toLowerCase();
  
  // 1. Verificar si hay negación tajante - NO aplicar relief
  const hasStrongNegation = LexiconUtils.hasStrongEvasion(text);
  if (hasStrongNegation) {
// removed by clean-audit
    return logLR; // Sin relief para evasión fuerte
  }
  
  // 2. Calcular peso total de admisión parcial
  let admissionRelief = 0;
  let tokensFound: string[] = [];
  
  Object.entries(ADMISSION_WEIGHTS).forEach(([token, weight]) => {
    if (lowerText.includes(token.toLowerCase())) {
      admissionRelief += weight;
      tokensFound.push(token);
    }
  });
  
  // 3. Aplicar multiplicador de contexto
  const contextMultiplier = RELIEF_CONFIG.CONTEXT_MULTIPLIERS[questionContext] || 1.0;
  admissionRelief *= contextMultiplier;
  
  // 4. Limitar relief dentro de rangos seguros
  admissionRelief = Math.max(
    RELIEF_CONFIG.MIN_RELIEF, 
    Math.min(admissionRelief, RELIEF_CONFIG.MAX_RELIEF)
  );
  
  // 5. Convertir relief semántico a alivio cuantitativo
  const reliefAmount = admissionRelief * RELIEF_CONFIG.ADMISSION_RELIEF_FACTOR;
  const adjustedLogLR = logLR - reliefAmount;
  
  // Log para debugging
  if (tokensFound.length > 0) {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit
  }
  
  return adjustedLogLR;
}

/**
 * Detectar pattern "nervioso con admisión" a nivel de respuesta individual
 */
export function detectNervousWithAdmissionPattern(
  transcription: string,
  voiceAnalysis: any,
  responseTime: number,
  expectedTime: number
): {
  isNervous: boolean;
  hasAdmission: boolean;
  hasStrongNegation: boolean;
  nervousnessScore: number;
  admissionScore: number;
  patternDetected: boolean;
} {
  // 1. Detectar nerviosismo a través de múltiples indicadores
  const pitchVar = voiceAnalysis?.pitch_variance || 0;
  const energyStability = voiceAnalysis?.confidence_level || 1;
  const pauseFrequency = voiceAnalysis?.pause_frequency || 0;
  
  // Calcular disfluencia basada en pausas y tiempo
  const timeRatio = responseTime / Math.max(expectedTime, 1000);
  const disfluencyRate = pauseFrequency + Math.max(0, timeRatio - 1) * 0.3;
  
  // Score de nerviosismo (0-1)
  const nervousnessScore = Math.min(1, 
    (pitchVar * 0.4) + 
    ((1 - energyStability) * 0.3) + 
    (disfluencyRate * 0.3)
  );
  
  const isNervous = (
    (pitchVar > 0.6 && energyStability < 0.6) || 
    disfluencyRate > 0.5 ||
    nervousnessScore > 0.65
  );
  
  // 2. Detectar admisión parcial
  const hasAdmission = LexiconUtils.hasPartialAdmission(transcription);
  const admissionScore = LexiconUtils.calculateAdmissionWeight(transcription);
  
  // 3. Detectar negación fuerte (excluye el pattern)
  const hasStrongNegation = LexiconUtils.hasStrongEvasion(transcription);
  
  // 4. Pattern detectado si: nervioso + admisión + NO negación fuerte
  const patternDetected = isNervous && hasAdmission && !hasStrongNegation;
  
  return {
    isNervous,
    hasAdmission,
    hasStrongNegation,
    nervousnessScore,
    admissionScore,
    patternDetected
  };
}

/**
 * Aplicar cap de subscore para pattern "nervioso con admisión"
 */
export function applyNervousAdmissionCap(
  baseSubscore: number,
  patternAnalysis: ReturnType<typeof detectNervousWithAdmissionPattern>
): number {
  if (!patternAnalysis.patternDetected) {
    return baseSubscore; // Sin modificación
  }
  
  // Cap dinámico basado en fuerza del pattern
  const patternStrength = Math.min(1, 
    (patternAnalysis.nervousnessScore * 0.6) + 
    (Math.min(patternAnalysis.admissionScore, 1) * 0.4)
  );
  
  // Cap más alto para patterns más fuertes (adjusted for admission cases)
  const dynamicCap = 0.42 + (patternStrength * 0.18); // Rango: 0.42-0.60
  
  const cappedSubscore = Math.max(baseSubscore, dynamicCap);
  
  if (cappedSubscore > baseSubscore) {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit
  }
  
  return cappedSubscore;
}

/**
 * Análisis léxico completo con boost calibrado
 */
export function computeAdvancedLexicalScore(
  transcription: string,
  evasiveBoost: number = 1.5,
  questionContext: 'high_evasion_question' | 'payment_context' | 'normal_question' = 'normal_question'
): {
  rawLexicalScore: number;
  adjustedLexicalScore: number;
  reliefApplied: number;
  category: string;
  tokenDetails: {
    evasiveTokens: string[];
    admissionTokens: string[];
    honestyTokens: string[];
  };
} {
  const lowerText = transcription.toLowerCase();
  let baseScore = 0.5; // Neutral start
  
  // 1. Detectar y penalizar tokens evasivos con boost
  const evasiveTokensFound: string[] = [];
  EVASIVE_STRONG.forEach(entry => {
    if (lowerText.includes(entry.token.toLowerCase())) {
      baseScore -= entry.weight * 0.15 * evasiveBoost;
      evasiveTokensFound.push(entry.token);
    }
  });
  
  // 2. Detectar tokens de honestidad
  const honestyTokens = ['exactamente', 'específicamente', 'la verdad es', 'para ser honesto'];
  const honestyTokensFound: string[] = [];
  honestyTokens.forEach(token => {
    if (lowerText.includes(token)) {
      baseScore += 0.1;
      honestyTokensFound.push(token);
    }
  });
  
  // 3. Calcular LogLR simulado para aplicar relief
  const simulatedLogLR = (0.5 - Math.max(0, Math.min(1, baseScore))) * 2; // Convertir a logLR aproximado
  
  // 4. Aplicar relief por admisión
  const adjustedLogLR = adjustLogLRForAdmission(simulatedLogLR, transcription, questionContext);
  const reliefApplied = simulatedLogLR - adjustedLogLR;
  
  // 5. Convertir de vuelta a score
  const adjustedScore = Math.max(0, Math.min(1, 0.5 - (adjustedLogLR / 2)));
  
  // 6. Detectar tokens de admisión para reporte
  const admissionTokensFound: string[] = [];
  Object.keys(ADMISSION_WEIGHTS).forEach(token => {
    if (lowerText.includes(token.toLowerCase())) {
      admissionTokensFound.push(token);
    }
  });
  
  return {
    rawLexicalScore: Math.max(0, Math.min(1, baseScore)),
    adjustedLexicalScore: adjustedScore,
    reliefApplied,
    category: LexiconUtils.categorizeText(transcription),
    tokenDetails: {
      evasiveTokens: evasiveTokensFound,
      admissionTokens: admissionTokensFound,
      honestyTokens: honestyTokensFound
    }
  };
}

/**
 * Sigmoid function optimizada
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Clamp value between 0 and 1
 */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
// removed by clean-audit