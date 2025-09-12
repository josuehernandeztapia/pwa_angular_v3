// VOICE ANALYSIS ENGINE - ALGORITMOS MATEMÁTICOS
// Migrado desde MAIN PWA + BFF para AVI_LAB testing

export class VoiceAnalysisEngine {
  constructor() {
    this.weights = {
      w1: 0.25, // Latency weight
      w2: 0.20, // Pitch variability weight
      w3: 0.15, // Disfluency rate weight  
      w4: 0.20, // Energy stability weight
      w5: 0.20  // Honesty lexicon weight
    };

    this.lexicons = {
      hesitation: ['eh', 'um', 'este', 'pues', 'bueno', 'o_sea', 'verdad', 'no_se'],
      honesty: ['exactamente', 'precisamente', 'definitivamente', 'seguro', 'claro'],
      deception: ['tal_vez', 'creo_que', 'mas_o_menos', 'no_recuerdo', 'no_estoy_seguro'],
      stress: ['nervioso', 'preocupado', 'angustiado', 'estresado', 'tenso']
    };

    this.thresholds = {
      GO: 750,      // >= 750 = GO
      REVIEW: 500,  // 500-749 = REVIEW  
      NO_GO: 499    // <= 499 = NO-GO
    };
  }

  /**
   * ALGORITMO PRINCIPAL - Voice Scoring Matemático
   * Formula: voiceScore = w1*(1-L) + w2*(1-P) + w3*(1-D) + w4*(E) + w5*(H)
   */
  computeVoiceScore(payload) {
    const startTime = Date.now();

    try {
      // 1. NORMALIZE LATENCY (0-1 scale)
      const L = this.normalizeLatency(payload.latencySec, payload.answerDurationSec);
      
      // 2. PITCH VARIABILITY (0-1 scale)
      const P = this.pitchVariability(payload.pitchSeriesHz);
      
      // 3. DISFLUENCY RATE (0-1 scale)
      const D = this.disfluencyRate(payload.words, this.lexicons.hesitation);
      
      // 4. ENERGY STABILITY (0-1 scale)
      const E = this.energyStability(payload.energySeries);
      
      // 5. HONESTY LEXICON (0-1 scale)
      const H = this.honestyLexicon(payload.words, this.lexicons.honesty, this.lexicons.deception);

      // WEIGHTED COMBINATION
      const voiceScore = 
        this.weights.w1 * (1 - L) +
        this.weights.w2 * (1 - P) + 
        this.weights.w3 * (1 - D) +
        this.weights.w4 * E +
        this.weights.w5 * H;

      // SCALE TO 0-1000
      const finalScore = Math.round(voiceScore * 1000);
      
      // DECISION LOGIC
      const decision = this.getDecision(finalScore);
      const flags = this.generateFlags(L, P, D, E, H, payload);
      
      const result = {
        success: true,
        score: finalScore,
        decision: decision,
        metrics: {
          latencyIndex: L,
          pitchVariability: P,
          disfluencyRate: D,
          energyStability: E,
          honestyLexicon: H
        },
        components: {
          L: L, P: P, D: D, E: E, H: H
        },
        weights: this.weights,
        flags: flags,
        processingTime: `${Date.now() - startTime}ms`,
        fallback: false,
        confidence: this.calculateConfidence(payload)
      };

      return result;
    } catch (error) {
      console.error('Voice analysis failed:', error);
      return this.fallbackAnalysis(payload, startTime);
    }
  }

  /**
   * 1. NORMALIZE LATENCY
   * Latency is bad if too high (suspicious) or too low (prepared lie)
   */
  normalizeLatency(latencySec, answerDurationSec) {
    const expectedLatency = Math.max(1, answerDurationSec * 0.1); // 10% of answer duration
    const ratio = latencySec / expectedLatency;
    
    if (ratio <= 0.5) return 0.8; // Too fast - potentially prepared
    if (ratio <= 1.0) return 0.2; // Optimal range
    if (ratio <= 2.0) return 0.4; // Slightly slow - thinking
    if (ratio <= 4.0) return 0.7; // Very slow - potential deception
    return 0.9; // Extremely slow - high suspicion
  }

  /**
   * 2. PITCH VARIABILITY 
   * High variability indicates stress/deception
   */
  pitchVariability(pitchSeriesHz) {
    if (!pitchSeriesHz || pitchSeriesHz.length < 2) return 0.5;
    
    const mean = pitchSeriesHz.reduce((a, b) => a + b) / pitchSeriesHz.length;
    const variance = pitchSeriesHz.reduce((sum, pitch) => 
      sum + Math.pow(pitch - mean, 2), 0) / pitchSeriesHz.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    
    // Normalize CV to 0-1 scale (higher CV = more suspicious)
    return Math.min(1, coefficientOfVariation * 10);
  }

  /**
   * 3. DISFLUENCY RATE
   * Count hesitation words / total words
   */
  disfluencyRate(words, hesitationLexicon) {
    if (!words || words.length === 0) return 0.5;
    
    const hesitationCount = words.filter(word => 
      hesitationLexicon.some(hesitation => 
        word.toLowerCase().includes(hesitation)
      )
    ).length;
    
    return Math.min(1, hesitationCount / words.length);
  }

  /**
   * 4. ENERGY STABILITY
   * Consistent energy indicates confidence
   */
  energyStability(energySeries) {
    if (!energySeries || energySeries.length < 2) return 0.5;
    
    const mean = energySeries.reduce((a, b) => a + b) / energySeries.length;
    const variance = energySeries.reduce((sum, energy) => 
      sum + Math.pow(energy - mean, 2), 0) / energySeries.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = more stable = better
    return Math.max(0, 1 - stdDev);
  }

  /**
   * 5. HONESTY LEXICON
   * Balance between honesty and deception indicators
   */
  honestyLexicon(words, honestyLexicon, deceptionLexicon) {
    if (!words || words.length === 0) return 0.5;
    
    const honestyCount = words.filter(word =>
      honestyLexicon.some(honest => word.toLowerCase().includes(honest))
    ).length;
    
    const deceptionCount = words.filter(word =>
      deceptionLexicon.some(deceptive => word.toLowerCase().includes(deceptive))
    ).length;
    
    const totalIndicators = honestyCount + deceptionCount;
    if (totalIndicators === 0) return 0.5; // Neutral
    
    return honestyCount / totalIndicators;
  }

  /**
   * DECISION LOGIC
   */
  getDecision(score) {
    if (score >= this.thresholds.GO) return 'GO';
    if (score >= this.thresholds.REVIEW) return 'REVIEW';
    return 'NO-GO';
  }

  /**
   * FLAG GENERATION
   */
  generateFlags(L, P, D, E, H, payload) {
    const flags = [];
    
    if (L > 0.7) flags.push('high_latency');
    if (L < 0.3) flags.push('suspiciously_fast');
    if (P > 0.6) flags.push('high_pitch_variability');
    if (D > 0.3) flags.push('high_disfluency');
    if (E < 0.4) flags.push('unstable_energy');
    if (H < 0.4) flags.push('deception_indicators');
    
    // Length-based flags
    if (payload.words && payload.words.length < 3) flags.push('too_short_answer');
    if (payload.words && payload.words.length > 100) flags.push('overly_verbose');
    
    return flags;
  }

  /**
   * CONFIDENCE CALCULATION
   */
  calculateConfidence(payload) {
    let confidence = 0.7; // Base confidence
    
    if (payload.pitchSeriesHz && payload.pitchSeriesHz.length >= 5) confidence += 0.1;
    if (payload.energySeries && payload.energySeries.length >= 5) confidence += 0.1;
    if (payload.words && payload.words.length >= 5) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  /**
   * FALLBACK ANALYSIS
   */
  fallbackAnalysis(payload, startTime) {
    let score = 0.6; // Base score
    const flags = ['fallback_analysis'];
    
    // Simple heuristics
    if (payload.latencySec > 5) {
      score -= 0.2;
      flags.push('high_latency');
    }
    
    if (payload.words && payload.words.length < 3) {
      score -= 0.3;
      flags.push('too_short');
    }
    
    const finalScore = Math.round(Math.max(0, Math.min(1, score)) * 1000);
    
    return {
      success: true,
      score: finalScore,
      decision: this.getDecision(finalScore),
      metrics: {
        latencyIndex: 0.5,
        pitchVariability: 0.5,
        disfluencyRate: 0.5,
        energyStability: 0.5,
        honestyLexicon: 0.5
      },
      flags: flags,
      processingTime: `${Date.now() - startTime}ms`,
      fallback: true,
      confidence: 0.3
    };
  }

  /**
   * MOCK DATA GENERATOR para testing
   */
  generateMockVoiceData(questionId) {
    return {
      questionId: questionId,
      latencySec: 1.5 + Math.random() * 3, // 1.5-4.5 seconds
      answerDurationSec: 5 + Math.random() * 15, // 5-20 seconds
      pitchSeriesHz: Array.from({length: 10}, () => 110 + Math.random() * 40), // 110-150 Hz
      energySeries: Array.from({length: 10}, () => 0.3 + Math.random() * 0.4), // 0.3-0.7
      words: ['bueno', 'pues', 'yo', 'trabajo', 'en', 'la', 'ruta', 'desde', 'hace', 'años'],
      contextId: `test_${Date.now()}`
    };
  }
}

// EXPORT SINGLETON
export const voiceEngine = new VoiceAnalysisEngine();