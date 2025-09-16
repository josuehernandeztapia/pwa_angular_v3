// AVI LEXICONES - Centralización de palabras clave para análisis de voz
// ALIGNED WITH AVI_LAB voice-analysis-engine.js

export interface AVILexicons {
  hesitation: string[];
  honesty: string[];
  deception: string[];
  stress: string[];
}

/**
 * Lexicones de palabras clave para análisis de voz
 * Sincronizado con AVI_LAB para consistencia 100%
 */
export const AVI_LEXICONS: AVILexicons = {
  /**
   * Palabras de hesitación/disfluencia
   * Indican incertidumbre o preparación de respuesta
   */
  hesitation: [
    'eh', 'um', 'este', 'pues', 'bueno', 'o_sea', 'verdad', 'no_se',
    'mmm', 'ajá', 'entonces', 'digamos', 'como_que', 'más_o_menos',
    'no_sé', 'o_sea', 'este_pues', 'eh_eh', 'este_este'
  ],

  /**
   * Palabras de honestidad/confianza
   * Indican certeza y transparencia
   */
  honesty: [
    'exactamente', 'precisamente', 'definitivamente', 'seguro', 'claro',
    'por_supuesto', 'sin_duda', 'completamente', 'totalmente', 'obviamente',
    'realmente', 'verdaderamente', 'absolutamente', 'ciertamente'
  ],

  /**
   * Palabras de engaño/evasión
   * Indican posible ocultamiento de información
   */
  deception: [
    'tal_vez', 'creo_que', 'mas_o_menos', 'no_recuerdo', 'no_estoy_seguro',
    'posiblemente', 'quizás', 'puede_ser', 'supongo', 'aparentemente',
    'probablemente', 'digamos_que', 'como_si', 'algo_así', 'no_sé_bien',
    'medio', 'más_o_menos', 'regular', 'depende', 'varía'
  ],

  /**
   * Palabras de estrés/ansiedad
   * Indican estado emocional alterado
   */
  stress: [
    'nervioso', 'preocupado', 'angustiado', 'estresado', 'tenso',
    'ansioso', 'inquieto', 'agitado', 'alterado', 'presionado',
    'abrumado', 'intranquilo', 'incómodo', 'desesperado', 'agobiado'
  ]
};

/**
 * Pesos para análisis de voz - ALINEADOS CON AVI_LAB
 * Formula: voiceScore = w1*(1-L) + w2*(1-P) + w3*(1-D) + w4*(E) + w5*(H)
 */
export const AVI_VOICE_WEIGHTS = {
  w1: 0.25, // Latency weight
  w2: 0.20, // Pitch variability weight
  w3: 0.15, // Disfluency rate weight
  w4: 0.20, // Energy stability weight
  w5: 0.20  // Honesty lexicon weight
};

/**
 * Thresholds para decisiones - ALINEADOS CON AVI_LAB
 */
export const AVI_VOICE_THRESHOLDS = {
  GO: 750,      // >= 750 = GO
  REVIEW: 500,  // 500-749 = REVIEW
  NO_GO: 499    // <= 499 = NO-GO
};

/**
 * Helper functions para análisis lexicográfico
 */
export class AVILexiconAnalyzer {

  /**
   * Contar palabras de hesitación en transcripción
   */
  static countHesitationWords(words: string[]): number {
    const normalizedWords = words.map(w => w.toLowerCase().trim());
    return normalizedWords.filter(word =>
      AVI_LEXICONS.hesitation.includes(word)
    ).length;
  }

  /**
   * Contar palabras de honestidad
   */
  static countHonestyWords(words: string[]): number {
    const normalizedWords = words.map(w => w.toLowerCase().trim());
    return normalizedWords.filter(word =>
      AVI_LEXICONS.honesty.includes(word)
    ).length;
  }

  /**
   * Contar palabras de engaño
   */
  static countDeceptionWords(words: string[]): number {
    const normalizedWords = words.map(w => w.toLowerCase().trim());
    return normalizedWords.filter(word =>
      AVI_LEXICONS.deception.includes(word)
    ).length;
  }

  /**
   * Contar palabras de estrés
   */
  static countStressWords(words: string[]): number {
    const normalizedWords = words.map(w => w.toLowerCase().trim());
    return normalizedWords.filter(word =>
      AVI_LEXICONS.stress.includes(word)
    ).length;
  }

  /**
   * Análisis completo de lexicones
   */
  static analyzeLexicons(words: string[]) {
    return {
      hesitation: this.countHesitationWords(words),
      honesty: this.countHonestyWords(words),
      deception: this.countDeceptionWords(words),
      stress: this.countStressWords(words),
      totalWords: words.length
    };
  }

  /**
   * Calcular disfluency rate (alineado con AVI_LAB)
   */
  static calculateDisfluencyRate(words: string[]): number {
    const hesitationCount = this.countHesitationWords(words);
    return words.length > 0 ? hesitationCount / words.length : 0;
  }

  /**
   * Calcular honesty score (alineado con AVI_LAB)
   */
  static calculateHonestyScore(words: string[]): number {
    const honestyCount = this.countHonestyWords(words);
    const deceptionCount = this.countDeceptionWords(words);

    if (words.length === 0) return 0.5; // neutral

    const honestyRatio = honestyCount / words.length;
    const deceptionRatio = deceptionCount / words.length;

    // Higher honesty ratio = higher score, higher deception ratio = lower score
    return Math.max(0, Math.min(1, 0.5 + (honestyRatio * 2) - (deceptionRatio * 2)));
  }
}