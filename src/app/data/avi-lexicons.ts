// Lexicons avanzados para AVI - Pattern "Nervioso con Admisión Parcial"
// Implementación quirúrgica para distinguir evasión crítica vs alto riesgo

export interface LexiconEntry {
  token: string;
  weight: number;
  category: 'evasive_strong' | 'admission_partial' | 'evasive_calculated' | 'honesty_markers';
  description?: string;
}

// === EVASIÓN FUERTE (CRITICAL) ===
// Negación tajante sin matices - mayor peligro crediticio
export const EVASIVE_STRONG: LexiconEntry[] = [
  { token: 'no pago nada', weight: 1.0, category: 'evasive_strong', description: 'Negación total categórica' },
  { token: 'no doy nada', weight: 1.0, category: 'evasive_strong', description: 'Negación total de contribuciones' },
  { token: 'eso no existe', weight: 0.9, category: 'evasive_strong', description: 'Negación de realidad conocida' },
  { token: 'no se de que habla', weight: 0.9, category: 'evasive_strong', description: 'Ignorancia fingida' },
  { token: 'jamás he pagado', weight: 0.95, category: 'evasive_strong', description: 'Negación histórica absoluta' },
  { token: 'nunca pago', weight: 0.95, category: 'evasive_strong', description: 'Negación de comportamiento' },
  { token: 'eso no pasa', weight: 0.8, category: 'evasive_strong', description: 'Negación de eventos' },
  { token: 'no conozco eso', weight: 0.8, category: 'evasive_strong', description: 'Ignorancia selectiva' },
  { token: 'aquí no hay nada de eso', weight: 0.85, category: 'evasive_strong', description: 'Negación geográfica' },
  { token: 'yo no me meto en esas cosas', weight: 0.8, category: 'evasive_strong', description: 'Distanciamiento total' }
];

// === ADMISIÓN PARCIAL (HIGH, no CRITICAL) ===
// Reconoce parcialmente la realidad - menor peligro crediticio
export const ADMISSION_PARTIAL: LexiconEntry[] = [
  { token: 'a veces pago', weight: 1.0, category: 'admission_partial', description: 'Admite comportamiento ocasional' },
  { token: 'pago poquito', weight: 1.0, category: 'admission_partial', description: 'Admite pero minimiza cantidad' },
  { token: 'pago algo', weight: 0.9, category: 'admission_partial', description: 'Admisión vaga pero presente' },
  { token: 'si me piden', weight: 0.8, category: 'admission_partial', description: 'Admite bajo presión' },
  { token: 'cuando se puede', weight: 0.7, category: 'admission_partial', description: 'Admite con limitaciones' },
  { token: 'cuando toca', weight: 0.7, category: 'admission_partial', description: 'Admite bajo obligación' },
  { token: 'de vez en cuando', weight: 0.8, category: 'admission_partial', description: 'Frecuencia irregular admitida' },
  { token: 'lo mínimo', weight: 0.9, category: 'admission_partial', description: 'Admite cantidad mínima' },
  { token: 'muy poco', weight: 0.8, category: 'admission_partial', description: 'Cuantifica minimizando' },
  { token: 'casi nada', weight: 0.75, category: 'admission_partial', description: 'Admisión cuantificada mínima' },
  { token: 'alguna vez', weight: 0.6, category: 'admission_partial', description: 'Admisión temporal vaga' },
  { token: 'tal vez algo', weight: 0.7, category: 'admission_partial', description: 'Admisión dubitativa' },
  { token: 'bueno sí pero', weight: 0.8, category: 'admission_partial', description: 'Admisión con justificación' },
  { token: 'admito que', weight: 0.9, category: 'admission_partial', description: 'Reconocimiento directo parcial' },
  { token: 'la verdad es que sí', weight: 0.9, category: 'admission_partial', description: 'Honestidad parcial' }
];

// === EVASIÓN CALCULADA (CRITICAL) ===
// Discurso preparado, sobre-justificado - altamente sospechoso
export const EVASIVE_CALCULATED: LexiconEntry[] = [
  { token: 'trabajo honestamente', weight: 0.8, category: 'evasive_calculated', description: 'Sobre-énfasis en honestidad' },
  { token: 'mi negocio es transparente', weight: 0.85, category: 'evasive_calculated', description: 'Declaración defensiva' },
  { token: 'no tengo nada que ocultar', weight: 0.8, category: 'evasive_calculated', description: 'Protesta de inocencia' },
  { token: 'siempre he sido legal', weight: 0.75, category: 'evasive_calculated', description: 'Énfasis en legalidad' },
// removed by clean-audit
  { token: 'no me meto en problemas', weight: 0.7, category: 'evasive_calculated', description: 'Distanciamiento de conflictos' },
// removed by clean-audit
];

// === MARCADORES DE HONESTIDAD (Reducen sospecha) ===
export const HONESTY_MARKERS: LexiconEntry[] = [
  { token: 'exactamente', weight: 0.8, category: 'honesty_markers', description: 'Precisión en respuesta' },
  { token: 'específicamente', weight: 0.8, category: 'honesty_markers', description: 'Detalle específico' },
  { token: 'la verdad es', weight: 0.7, category: 'honesty_markers', description: 'Preámbulo de honestidad' },
  { token: 'para ser honesto', weight: 0.7, category: 'honesty_markers', description: 'Declaración de honestidad' },
  { token: 'te voy a ser sincero', weight: 0.75, category: 'honesty_markers', description: 'Compromiso con sinceridad' },
  { token: 'no te voy a mentir', weight: 0.8, category: 'honesty_markers', description: 'Promesa de veracidad' },
  { token: 'mira la verdad', weight: 0.7, category: 'honesty_markers', description: 'Introducción a verdad' }
];

// === PESOS DE ADMISIÓN PARA RELIEF CUANTITATIVO ===
export const ADMISSION_WEIGHTS: Record<string, number> = {
  // Admisión fuerte (mayor relief)
  'pago poquito': 1.0,
  'a veces pago': 1.0,
  'admito que': 0.9,
  'la verdad es que sí': 0.9,
  'pago algo': 0.9,
  'bueno sí pero': 0.8,
  
  // Admisión media
  'si me piden': 0.8,
  'de vez en cuando': 0.8,
  'muy poco': 0.8,
  'lo mínimo': 0.8,
  
  // Admisión débil (menor relief)
  'cuando se puede': 0.7,
  'cuando toca': 0.7,
  'tal vez algo': 0.7,
  'casi nada': 0.7,
  'alguna vez': 0.6
};

// === CONFIGURACIÓN DE RELIEF ===
export const RELIEF_CONFIG = {
  // Factor de alivio por admisión (calibrable)
  ADMISSION_RELIEF_FACTOR: 0.35, // Cada 1.0 de admission weight resta 0.35 a logLR
  
  // Multiplicadores por contexto
  CONTEXT_MULTIPLIERS: {
    'high_evasion_question': 1.2, // Más relief en preguntas de alta evasión
    'payment_context': 1.1,       // Más relief en contexto de pagos
    'normal_question': 1.0        // Relief normal
  },
  
  // Límites de relief
  MAX_RELIEF: 1.5, // Relief máximo aplicable
  MIN_RELIEF: 0.1  // Relief mínimo para evitar divisiones por cero
};

// === UTILIDADES DE LEXICON ===
export class LexiconUtils {
  
  /**
   * Obtener todos los tokens evasivos fuertes
   */
  static getEvasiveStrongTokens(): string[] {
    return EVASIVE_STRONG.map(entry => entry.token);
  }
  
  /**
   * Obtener todos los tokens de admisión parcial
   */
  static getAdmissionPartialTokens(): string[] {
    return ADMISSION_PARTIAL.map(entry => entry.token);
  }
  
  /**
   * Verificar si el texto contiene evasión fuerte
   */
  static hasStrongEvasion(text: string): boolean {
    const lowerText = text.toLowerCase();
    return EVASIVE_STRONG.some(entry => lowerText.includes(entry.token.toLowerCase()));
  }
  
  /**
   * Verificar si el texto contiene admisión parcial
   */
  static hasPartialAdmission(text: string): boolean {
    const lowerText = text.toLowerCase();
    return ADMISSION_PARTIAL.some(entry => lowerText.includes(entry.token.toLowerCase()));
  }
  
  /**
   * Calcular peso total de admisión en el texto
   */
  static calculateAdmissionWeight(text: string): number {
    const lowerText = text.toLowerCase();
    let totalWeight = 0;
    
    Object.entries(ADMISSION_WEIGHTS).forEach(([token, weight]) => {
      if (lowerText.includes(token.toLowerCase())) {
        totalWeight += weight;
      }
    });
    
    return Math.min(totalWeight, RELIEF_CONFIG.MAX_RELIEF);
  }
  
  /**
   * Determinar categoría principal del texto
   */
  static categorizeText(text: string): 'evasive_strong' | 'admission_partial' | 'evasive_calculated' | 'neutral' {
    if (this.hasStrongEvasion(text)) return 'evasive_strong';
    if (this.hasPartialAdmission(text)) return 'admission_partial';
    
    const lowerText = text.toLowerCase();
    const hasCalculatedEvasion = EVASIVE_CALCULATED.some(entry => 
      lowerText.includes(entry.token.toLowerCase())
    );
    
    if (hasCalculatedEvasion) return 'evasive_calculated';
    return 'neutral';
  }
}
// removed by clean-audit