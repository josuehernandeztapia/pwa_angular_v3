// Test para distinguir tipos de evasión en sistema AVI + Whisper


// Simulador de respuestas con diferentes tipos de evasión
const EvasionProfiles = {
  
  // EVASIVO TAJANTE - Peligroso
  'evasive_confident': {
    audioProfile: {
      text: "No pago nada de mordidas, eso no existe aquí, no sé de qué me hablas",
      profile: 'evasive_confident'
    },
    whisperResponse: {
      text: "No pago nada de mordidas eso no existe aquí no sé de qué me hablas",
      words: [
        { word: "No", start: 0.0, end: 0.3, confidence: 0.95 },      // Firme
        { word: "pago", start: 0.4, end: 0.7, confidence: 0.93 },    // Firme
        { word: "nada", start: 0.8, end: 1.1, confidence: 0.96 },    // Firme
        { word: "de", start: 1.2, end: 1.3, confidence: 0.98 },
        { word: "mordidas", start: 1.4, end: 2.0, confidence: 0.87 }, // Ligeramente menos confianza
        { word: "eso", start: 2.2, end: 2.4, confidence: 0.94 },     // Firme
        { word: "no", start: 2.5, end: 2.7, confidence: 0.96 },      // Firme
        { word: "existe", start: 2.8, end: 3.3, confidence: 0.92 },  // Firme
        { word: "aquí", start: 3.4, end: 3.7, confidence: 0.89 },
        { word: "no", start: 3.9, end: 4.1, confidence: 0.95 },      // Firme
        { word: "sé", start: 4.2, end: 4.4, confidence: 0.88 },
        { word: "de", start: 4.5, end: 4.6, confidence: 0.97 },
        { word: "qué", start: 4.7, end: 4.9, confidence: 0.91 },
        { word: "me", start: 5.0, end: 5.1, confidence: 0.94 },
        { word: "hablas", start: 5.2, end: 5.6, confidence: 0.86 }
      ],
      usage: { total_tokens: 65 }
    },
    expectedRisk: 'CRITICAL',
    description: 'Negación tajante y segura - altamente sospechoso'
  },

  // EVASIVO NERVIOSO - Menos peligroso  
  'evasive_nervous': {
    audioProfile: {
      text: "Eh... pues... no... no pago nada de eso... este... no sé... bueno, tal vez algo pequeñito pero...",
      profile: 'evasive_nervous'
    },
    whisperResponse: {
      text: "Eh pues no no pago nada de eso este no sé bueno tal vez algo pequeñito pero",
      words: [
        { word: "Eh", start: 0.0, end: 0.8, confidence: 0.62 },       // Muy inseguro
        { word: "pues", start: 1.2, end: 1.8, confidence: 0.68 },     // Inseguro
        { word: "no", start: 2.5, end: 2.8, confidence: 0.75 },       // Dubitativo
        { word: "no", start: 3.2, end: 3.5, confidence: 0.71 },       // Repetición nerviosa
        { word: "pago", start: 3.8, end: 4.2, confidence: 0.73 },
        { word: "nada", start: 4.5, end: 4.8, confidence: 0.69 },
        { word: "de", start: 4.9, end: 5.0, confidence: 0.85 },
        { word: "eso", start: 5.1, end: 5.4, confidence: 0.77 },
        { word: "este", start: 6.0, end: 6.5, confidence: 0.64 },     // Muletilla nerviosa
        { word: "no", start: 7.2, end: 7.5, confidence: 0.72 },
        { word: "sé", start: 7.6, end: 8.0, confidence: 0.66 },       // Inseguro
        { word: "bueno", start: 8.8, end: 9.2, confidence: 0.78 },    // Cambio de postura
        { word: "tal", start: 9.5, end: 9.7, confidence: 0.82 },
        { word: "vez", start: 9.8, end: 10.1, confidence: 0.85 },
        { word: "algo", start: 10.3, end: 10.7, confidence: 0.79 },   // Admisión parcial
        { word: "pequeñito", start: 10.8, end: 11.5, confidence: 0.74 },
        { word: "pero", start: 11.8, end: 12.2, confidence: 0.81 }    // Intento de justificar
      ],
      usage: { total_tokens: 78 }
    },
    expectedRisk: 'HIGH',
    description: 'Evasión nerviosa con admisión parcial - sospechoso pero menos peligroso'
  },

  // EVASIVO CALCULADO - Muy peligroso
  'evasive_calculated': {
    audioProfile: {
      text: "Mire, yo trabajo honestamente, no tengo nada que ver con ese tipo de cosas, mi negocio es transparente",
      profile: 'evasive_calculated'
    },
    whisperResponse: {
      text: "Mire yo trabajo honestamente no tengo nada que ver con ese tipo de cosas mi negocio es transparente",
      words: [
        { word: "Mire", start: 0.0, end: 0.4, confidence: 0.94 },     // Controlado
        { word: "yo", start: 0.5, end: 0.7, confidence: 0.97 },       // Firme
        { word: "trabajo", start: 0.8, end: 1.3, confidence: 0.95 },  // Controlado
        { word: "honestamente", start: 1.4, end: 2.2, confidence: 0.89 }, // Palabra clave sospechosa
        { word: "no", start: 2.4, end: 2.6, confidence: 0.96 },       // Firme
        { word: "tengo", start: 2.7, end: 3.1, confidence: 0.93 },
        { word: "nada", start: 3.2, end: 3.5, confidence: 0.95 },
        { word: "que", start: 3.6, end: 3.8, confidence: 0.97 },
        { word: "ver", start: 3.9, end: 4.2, confidence: 0.94 },
        { word: "con", start: 4.3, end: 4.5, confidence: 0.96 },
        { word: "ese", start: 4.6, end: 4.9, confidence: 0.91 },
        { word: "tipo", start: 5.0, end: 5.3, confidence: 0.93 },
        { word: "de", start: 5.4, end: 5.5, confidence: 0.98 },
        { word: "cosas", start: 5.6, end: 6.0, confidence: 0.88 },     // Evasión indirecta
        { word: "mi", start: 6.2, end: 6.4, confidence: 0.96 },
        { word: "negocio", start: 6.5, end: 7.0, confidence: 0.92 },
        { word: "es", start: 7.1, end: 7.3, confidence: 0.97 },
        { word: "transparente", start: 7.4, end: 8.2, confidence: 0.85 } // Palabra clave sospechosa
      ],
      usage: { total_tokens: 72 }
    },
    expectedRisk: 'CRITICAL',
    description: 'Evasión calculada con lenguaje preparado - extremadamente peligroso'
  },

  // HONESTO NERVIOSO - Menor riesgo
  'honest_nervous': {
    audioProfile: {
      text: "Pues... sí... eh... sí pago algo... como cincuenta pesos a la semana... me da pena decirlo pero así es",
      profile: 'honest_nervous'
    },
    whisperResponse: {
      text: "Pues sí eh sí pago algo como cincuenta pesos a la semana me da pena decirlo pero así es",
      words: [
        { word: "Pues", start: 0.0, end: 0.6, confidence: 0.73 },      // Nervioso pero honesto
        { word: "sí", start: 1.2, end: 1.5, confidence: 0.84 },        // Admisión
        { word: "eh", start: 1.8, end: 2.3, confidence: 0.59 },        // Nerviosismo
        { word: "sí", start: 2.8, end: 3.1, confidence: 0.87 },        // Reafirmación
        { word: "pago", start: 3.3, end: 3.7, confidence: 0.91 },      // Admisión clara
        { word: "algo", start: 3.8, end: 4.1, confidence: 0.85 },
        { word: "como", start: 4.3, end: 4.6, confidence: 0.88 },
        { word: "cincuenta", start: 4.7, end: 5.4, confidence: 0.82 }, // Específico = honesto
        { word: "pesos", start: 5.5, end: 5.9, confidence: 0.93 },
        { word: "a", start: 6.0, end: 6.1, confidence: 0.96 },
        { word: "la", start: 6.2, end: 6.3, confidence: 0.97 },
        { word: "semana", start: 6.4, end: 6.9, confidence: 0.89 },
        { word: "me", start: 7.2, end: 7.4, confidence: 0.92 },
        { word: "da", start: 7.5, end: 7.7, confidence: 0.89 },
        { word: "pena", start: 7.8, end: 8.2, confidence: 0.86 },       // Emoción genuina
        { word: "decirlo", start: 8.3, end: 8.9, confidence: 0.83 },
        { word: "pero", start: 9.1, end: 9.4, confidence: 0.88 },
        { word: "así", start: 9.5, end: 9.8, confidence: 0.91 },
        { word: "es", start: 9.9, end: 10.2, confidence: 0.94 }        // Aceptación de realidad
      ],
      usage: { total_tokens: 84 }
    },
    expectedRisk: 'MEDIUM',
    description: 'Nervioso pero honesto con admisión específica - riesgo moderado'
  }
};

// Analizador mejorado para subtipos de evasión
class AdvancedEvasionAnalyzer {
  
  static analyzeEvasionSubtype(whisperResponse, audioProfile) {
    const words = whisperResponse.words || [];
    const text = whisperResponse.text.toLowerCase();
    
    // Calcular métricas base
    const avgConfidence = words.length ? words.reduce((sum, w) => sum + w.confidence, 0) / words.length : 0;
    const confidenceVariance = this.calculateVariance(words.map(w => w.confidence));
    
    // Detectar patrones específicos de evasión
    const evasionPatterns = this.detectEvasionPatterns(text, words);
    const honestyIndicators = this.detectHonestyIndicators(text, words);
    const calculatedLanguage = this.detectCalculatedLanguage(text, words);
    
    // Clasificar subtipo
    const evasionSubtype = this.classifyEvasionSubtype(evasionPatterns, honestyIndicators, calculatedLanguage, avgConfidence);
    
    // Calcular score ajustado por subtipo
    const adjustedScore = this.calculateSubtypeAdjustedScore(evasionSubtype, evasionPatterns, honestyIndicators, avgConfidence);
    
    return {
      transcription: whisperResponse.text,
      avgConfidence: avgConfidence,
      confidenceVariance: confidenceVariance,
      evasionPatterns: evasionPatterns,
      honestyIndicators: honestyIndicators,
      calculatedLanguage: calculatedLanguage,
      evasionSubtype: evasionSubtype,
      adjustedScore: adjustedScore,
      riskLevel: this.getRiskLevel(adjustedScore, evasionSubtype),
      reasoning: this.generateReasoning(evasionSubtype, evasionPatterns, honestyIndicators, avgConfidence)
    };
  }
  
  static detectEvasionPatterns(text, words) {
    const patterns = {
      directDenial: ['no pago nada', 'no existe', 'no sé de qué', 'eso no pasa'],
      deflection: ['trabajo honestamente', 'mi negocio es', 'ese tipo de cosas'],
      absoluteStatements: ['nada', 'nunca', 'jamás', 'imposible'],
      nervousFillersCount: (text.match(/\beh\b|\bpues\b|\beste\b|\bbueno\b/g) || []).length,
      repetitions: this.countRepetitions(text),
      vagueReferences: ['eso', 'ese tipo', 'esas cosas', 'por ahí']
    };
    
    // Contar ocurrencias
    let directDenialCount = 0;
    let deflectionCount = 0;
    let absoluteCount = 0;
    let vagueCount = 0;
    
    patterns.directDenial.forEach(phrase => {
      if (text.includes(phrase)) directDenialCount++;
    });
    
    patterns.deflection.forEach(phrase => {
      if (text.includes(phrase)) deflectionCount++;
    });
    
    patterns.absoluteStatements.forEach(word => {
      if (text.includes(word)) absoluteCount++;
    });
    
    patterns.vagueReferences.forEach(ref => {
      if (text.includes(ref)) vagueCount++;
    });
    
    return {
      directDenialCount,
      deflectionCount,
      absoluteCount,
      vagueCount,
      nervousFillersCount: patterns.nervousFillersCount,
      repetitions: patterns.repetitions
    };
  }
  
  static detectHonestyIndicators(text, words) {
    const indicators = {
      admission: ['sí pago', 'pago algo', 'un poquito', 'pequeña cantidad'],
      specificity: this.countSpecificNumbers(text),
      emotion: ['me da pena', 'me avergüenza', 'no me gusta', 'así es la realidad'],
      qualification: ['pero', 'aunque', 'sin embargo', 'la verdad es'],
      selfCorrection: ['bueno', 'mejor dicho', 'o sea', 'en realidad']
    };
    
    let admissionCount = 0;
    let emotionCount = 0;
    let qualificationCount = 0;
    let selfCorrectionCount = 0;
    
    indicators.admission.forEach(phrase => {
      if (text.includes(phrase)) admissionCount++;
    });
    
    indicators.emotion.forEach(phrase => {
      if (text.includes(phrase)) emotionCount++;
    });
    
    indicators.qualification.forEach(word => {
      if (text.includes(word)) qualificationCount++;
    });
    
    indicators.selfCorrection.forEach(phrase => {
      if (text.includes(phrase)) selfCorrectionCount++;
    });
    
    return {
      admissionCount,
      specificityCount: indicators.specificity,
      emotionCount,
      qualificationCount,
      selfCorrectionCount,
      totalHonestyScore: admissionCount + indicators.specificity + emotionCount + qualificationCount + selfCorrectionCount
    };
  }
  
  static detectCalculatedLanguage(text, words) {
    const calculated = [
      'honestamente', 'transparente', 'legalmente', 'oficialmente',
    ];
    
    let calculatedCount = 0;
    calculated.forEach(phrase => {
      if (text.includes(phrase)) calculatedCount++;
    });
    
    // Detectar respuestas demasiado perfectas (alta confianza + lenguaje preparado)
    const avgConfidence = words.length ? words.reduce((sum, w) => sum + w.confidence, 0) / words.length : 0;
    const tooPolished = avgConfidence > 0.90 && calculatedCount > 0;
    
    return {
      calculatedCount,
      tooPolished,
      avgConfidence
    };
  }
  
  static classifyEvasionSubtype(evasionPatterns, honestyIndicators, calculatedLanguage, avgConfidence) {
    // HONESTO NERVIOSO - admite pero nervioso
    if (honestyIndicators.admissionCount > 0 && honestyIndicators.totalHonestyScore >= 3) {
      return {
        type: 'HONEST_NERVOUS',
        confidence: 0.8,
        description: 'Nervioso pero admite y da detalles específicos'
      };
    }
    
    // EVASIVO CALCULADO - lenguaje preparado
    if (calculatedLanguage.tooPolished || calculatedLanguage.calculatedCount >= 2) {
      return {
        type: 'EVASIVE_CALCULATED',
        confidence: 0.9,
        description: 'Respuesta preparada con lenguaje defensivo sofisticado'
      };
    }
    
    // EVASIVO TAJANTE - negación firme y segura
    if (evasionPatterns.directDenialCount >= 2 && avgConfidence > 0.85 && evasionPatterns.nervousFillersCount <= 2) {
      return {
        type: 'EVASIVE_CONFIDENT',
        confidence: 0.85,
        description: 'Negación tajante y segura sin nerviosismo'
      };
    }
    
    // EVASIVO NERVIOSO - evasión con mucho nerviosismo
    if (evasionPatterns.directDenialCount >= 1 && evasionPatterns.nervousFillersCount >= 4 && avgConfidence < 0.80) {
      return {
        type: 'EVASIVE_NERVOUS',
        confidence: 0.75,
        description: 'Evasión con mucho nerviosismo e inseguridad'
      };
    }
    
    // DEFAULT - Evasivo general
    return {
      type: 'EVASIVE_GENERAL',
      confidence: 0.6,
      description: 'Patrones evasivos sin clasificación específica'
    };
  }
  
  static calculateSubtypeAdjustedScore(evasionSubtype, evasionPatterns, honestyIndicators, avgConfidence) {
    let baseScore = 700;
    
    switch (evasionSubtype.type) {
      case 'HONEST_NERVOUS':
        baseScore = 650; // Honesto pero nervioso
        baseScore += honestyIndicators.specificityCount * 30; // Bonificar especificidad
        baseScore += honestyIndicators.emotionCount * 20; // Bonificar emoción genuina
        break;
        
      case 'EVASIVE_NERVOUS':
        baseScore = 450; // Sospechoso pero no crítico
        baseScore -= evasionPatterns.directDenialCount * 40;
        baseScore += Math.max(0, 20 - evasionPatterns.nervousFillersCount * 3); // Mucho nerviosismo = más sospechoso
        break;
        
      case 'EVASIVE_CONFIDENT':
        baseScore = 300; // Muy sospechoso
        baseScore -= evasionPatterns.directDenialCount * 60;
        baseScore -= evasionPatterns.absoluteCount * 30;
        if (avgConfidence > 0.90) baseScore -= 50; // Demasiado seguro = sospechoso
        break;
        
      case 'EVASIVE_CALCULATED':
        baseScore = 250; // Extremadamente sospechoso
        baseScore -= evasionPatterns.deflectionCount * 70;
        baseScore -= 100; // Penalización por respuesta preparada
        break;
        
      default:
        baseScore = 500;
        baseScore -= evasionPatterns.directDenialCount * 50;
    }
    
    return Math.max(200, Math.min(1000, Math.round(baseScore)));
  }
  
  static getRiskLevel(score, evasionSubtype) {
    // Ajustar umbrales según subtipo
    switch (evasionSubtype.type) {
      case 'HONEST_NERVOUS':
        return score >= 600 ? 'MEDIUM' : 'HIGH';
      case 'EVASIVE_NERVOUS':
        return score >= 500 ? 'HIGH' : 'CRITICAL';
      case 'EVASIVE_CONFIDENT':
        return 'CRITICAL'; // Siempre crítico
      case 'EVASIVE_CALCULATED':
        return 'CRITICAL'; // Siempre crítico
      default:
        if (score >= 700) return 'LOW';
        if (score >= 550) return 'MEDIUM';
        if (score >= 400) return 'HIGH';
        return 'CRITICAL';
    }
  }
  
  static generateReasoning(evasionSubtype, evasionPatterns, honestyIndicators, avgConfidence) {
    const reasons = [];
    
    reasons.push(`Subtipo detectado: ${evasionSubtype.description}`);
    
    if (honestyIndicators.admissionCount > 0) {
      reasons.push(`✅ Admite pagos (${honestyIndicators.admissionCount} indicadores)`);
    }
    
    if (honestyIndicators.specificityCount > 0) {
      reasons.push(`✅ Proporciona números específicos (${honestyIndicators.specificityCount})`);
    }
    
    if (evasionPatterns.directDenialCount > 0) {
      reasons.push(`❌ Negación directa (${evasionPatterns.directDenialCount} veces)`);
    }
    
    if (evasionPatterns.nervousFillersCount >= 4) {
      reasons.push(`⚠️ Mucho nerviosismo (${evasionPatterns.nervousFillersCount} muletillas)`);
    }
    
    if (avgConfidence > 0.90 && evasionPatterns.directDenialCount > 0) {
      reasons.push(`🚨 Demasiado seguro en negaciones (${(avgConfidence*100).toFixed(1)}% confianza)`);
    }
    
    return reasons;
  }
  
  // Helper methods
  static countRepetitions(text) {
    const words = text.toLowerCase().split(' ');
    let repetitions = 0;
    for (let i = 1; i < words.length; i++) {
      if (words[i] === words[i-1]) repetitions++;
    }
    return repetitions;
  }
  
  static countSpecificNumbers(text) {
    const numbers = text.match(/\b\d+\b/g) || [];
    return numbers.length;
  }
  
  static calculateVariance(numbers) {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / numbers.length;
  }
}

// Ejecutar tests con subtipos
async function runEvasionSubtypeTests() {
  
  let testsPassed = 0;
  let totalTests = 0;
  
  for (const [profileName, profileData] of Object.entries(EvasionProfiles)) {
    totalTests++;
    
    const analysis = AdvancedEvasionAnalyzer.analyzeEvasionSubtype(
      profileData.whisperResponse,
      profileData.audioProfile
    );
    
    
    analysis.reasoning.forEach(reason => {
    });
    
    // Validar resultado
    const testPassed = analysis.riskLevel === profileData.expectedRisk;
    
    if (testPassed) testsPassed++;
  }
  
  // Resumen
  
  if (testsPassed === totalTests) {
  } else {
  }
  
  return testsPassed === totalTests;
}

// Ejecutar
if (require.main === module) {
  runEvasionSubtypeTests().then(success => {
    if (success) {
    }
  });
}

module.exports = { AdvancedEvasionAnalyzer, EvasionProfiles };
