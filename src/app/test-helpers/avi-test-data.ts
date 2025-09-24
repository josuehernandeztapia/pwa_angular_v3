// Test data and helpers for AVI system testing
import { AVIResponse, AVIQuestionEnhanced, AVICategory, VoiceAnalysis } from '../models/avi';
import { DualEngineResult } from '../services/avi-dual-engine.service';
import { CalibrationSample, OutcomeType } from '../services/avi-calibration.service';

export class AVITestDataGenerator {
  
  /**
   * Generar respuestas de prueba para diferentes perfiles de riesgo
   */
  static generateTestResponses(profile: TestProfile): AVIResponse[] {
    const responses: AVIResponse[] = [];
    
    switch (profile) {
      case 'LOW_RISK':
        responses.push(...this.generateLowRiskResponses());
        break;
      case 'HIGH_RISK':
        responses.push(...this.generateHighRiskResponses());
        break;
      case 'INCONSISTENT':
        responses.push(...this.generateInconsistentResponses());
        break;
      case 'NERVOUS_TRUTHFUL':
        responses.push(...this.generateNervousTruthfulResponses());
        break;
      default:
        responses.push(...this.generateRandomResponses());
    }
    
    return responses;
  }

  /**
   * Generar respuestas de perfil de bajo riesgo
   */
  private static generateLowRiskResponses(): AVIResponse[] {
    return [
      {
        questionId: 'nombre_completo',
        value: 'Juan Carlos Pérez González',
        responseTime: 2500,
        transcription: 'Juan Carlos Pérez González',
        stressIndicators: [],
        voiceAnalysis: {
          pitch_variance: 0.2,
          speech_rate_change: 0.1,
          pause_frequency: 0.1,
          voice_tremor: 0.1,
          confidence_level: 0.95
        }
      },
      {
        questionId: 'ingresos_promedio_diarios',
        value: '1200',
        responseTime: 6500,
        transcription: 'Pues mira, saco aproximadamente mil doscientos pesos diarios, a veces un poco más cuando hay buen día',
        stressIndicators: ['pausa_breve'],
        voiceAnalysis: {
          pitch_variance: 0.3,
          speech_rate_change: 0.2,
          pause_frequency: 0.2,
          voice_tremor: 0.1,
          confidence_level: 0.88
        }
      },
      {
        questionId: 'gasto_diario_gasolina',
        value: '400',
        responseTime: 4000,
        transcription: 'En gasolina gasto como cuatrocientos pesos diarios',
        stressIndicators: [],
        voiceAnalysis: {
          pitch_variance: 0.25,
          speech_rate_change: 0.15,
          pause_frequency: 0.15,
          voice_tremor: 0.05,
          confidence_level: 0.92
        }
      },
      {
        questionId: 'vueltas_por_dia',
        value: '8',
        responseTime: 3500,
        transcription: 'Normalmente hago ocho vueltas completas al día',
        stressIndicators: [],
        voiceAnalysis: {
          pitch_variance: 0.2,
          speech_rate_change: 0.1,
          pause_frequency: 0.1,
          voice_tremor: 0.05,
          confidence_level: 0.9
        }
      }
    ];
  }

  /**
   * Generar respuestas de perfil de alto riesgo
   */
  private static generateHighRiskResponses(): AVIResponse[] {
    return [
      {
        questionId: 'nombre_completo',
        value: 'Roberto... Roberto García',
        responseTime: 8000,
        transcription: 'Roberto... Roberto García',
        stressIndicators: ['pausa_larga', 'tartamudeo'],
        voiceAnalysis: {
          pitch_variance: 0.6,
          speech_rate_change: 0.4,
          pause_frequency: 0.5,
          voice_tremor: 0.3,
          confidence_level: 0.75
        }
      },
      {
        questionId: 'ingresos_promedio_diarios',
        value: '2500',
        responseTime: 15000,
        transcription: 'Eh... pues... depende del día, pero más o menos... unos dos mil quinientos, a veces más',
        stressIndicators: ['pausas_largas', 'numeros_redondos', 'evasion', 'tartamudeo'],
        voiceAnalysis: {
          pitch_variance: 0.8,
          speech_rate_change: 0.7,
          pause_frequency: 0.8,
          voice_tremor: 0.6,
          confidence_level: 0.65
        }
      },
      {
        questionId: 'gasto_diario_gasolina',
        value: '800',
        responseTime: 12000,
        transcription: 'En gasolina... pues... varia mucho... como ochocientos pesos aproximadamente',
        stressIndicators: ['pausas_largas', 'imprecision', 'calculos_mentales'],
        voiceAnalysis: {
          pitch_variance: 0.7,
          speech_rate_change: 0.6,
          pause_frequency: 0.7,
          voice_tremor: 0.5,
          confidence_level: 0.7
        }
      },
      {
        questionId: 'gastos_mordidas_cuotas',
        value: '0',
        responseTime: 20000,
        transcription: 'No, no pago nada de eso... no sé de qué me hablas... eso no existe',
        stressIndicators: ['pausas_muy_largas', 'evasion_total', 'cambio_tema', 'nerviosismo_extremo'],
        voiceAnalysis: {
          pitch_variance: 0.9,
          speech_rate_change: 0.8,
          pause_frequency: 0.9,
          voice_tremor: 0.8,
          confidence_level: 0.5
        }
      }
    ];
  }

  /**
   * Generar respuestas matemáticamente inconsistentes
   */
  private static generateInconsistentResponses(): AVIResponse[] {
    return [
      {
        questionId: 'ingresos_promedio_diarios',
        value: '800',
        responseTime: 5000,
        transcription: 'Gano ochocientos pesos al día',
        stressIndicators: [],
        voiceAnalysis: {
          pitch_variance: 0.3,
          speech_rate_change: 0.2,
          pause_frequency: 0.2,
          voice_tremor: 0.1,
          confidence_level: 0.85
        }
      },
      {
        questionId: 'gasto_diario_gasolina',
        value: '600', // 75% del ingreso en gasolina - inconsistente
        responseTime: 4500,
        transcription: 'En gasolina gasto seiscientos pesos diarios',
        stressIndicators: [],
        voiceAnalysis: {
          pitch_variance: 0.3,
          speech_rate_change: 0.2,
          pause_frequency: 0.2,
          voice_tremor: 0.1,
          confidence_level: 0.88
        }
      },
      {
        questionId: 'pasajeros_por_vuelta',
        value: '25',
        responseTime: 3000,
        transcription: 'Llevo como veinticinco pasajeros por vuelta',
        stressIndicators: [],
        voiceAnalysis: {
          pitch_variance: 0.25,
          speech_rate_change: 0.15,
          pause_frequency: 0.15,
          voice_tremor: 0.08,
          confidence_level: 0.9
        }
      },
      {
        questionId: 'tarifa_por_pasajero',
        value: '15',
        responseTime: 2500,
        transcription: 'Cobro quince pesos por pasaje',
        stressIndicators: [],
        voiceAnalysis: {
          pitch_variance: 0.2,
          speech_rate_change: 0.1,
          pause_frequency: 0.1,
          voice_tremor: 0.05,
          confidence_level: 0.92
        }
      },
      {
        questionId: 'vueltas_por_dia',
        value: '2', // 25 * 15 * 2 = 750 pero dice ganar solo 800 - casi coherente pero sospechoso
        responseTime: 3500,
        transcription: 'Hago solamente dos vueltas al día',
        stressIndicators: [],
        voiceAnalysis: {
          pitch_variance: 0.2,
          speech_rate_change: 0.1,
          pause_frequency: 0.1,
          voice_tremor: 0.05,
          confidence_level: 0.9
        }
      }
    ];
  }

  /**
   * Generar respuestas de perfil nervioso pero veraz
   */
  private static generateNervousTruthfulResponses(): AVIResponse[] {
    return [
      {
        questionId: 'nombre_completo',
        value: 'María Elena Rodríguez López',
        responseTime: 4000,
        transcription: 'María Elena Rodríguez López',
        stressIndicators: ['nerviosismo'],
        voiceAnalysis: {
          pitch_variance: 0.5,
          speech_rate_change: 0.3,
          pause_frequency: 0.3,
          voice_tremor: 0.2,
          confidence_level: 0.85
        }
      },
      {
        questionId: 'ingresos_promedio_diarios',
        value: '1000',
        responseTime: 10000,
        transcription: 'Ay, pues... es que me pone nerviosa hablar de dinero... pero sí, gano como mil pesos diarios cuando hay trabajo',
        stressIndicators: ['nerviosismo', 'pausa_larga', 'ansiedad'],
        voiceAnalysis: {
          pitch_variance: 0.6,
          speech_rate_change: 0.4,
          pause_frequency: 0.4,
          voice_tremor: 0.3,
          confidence_level: 0.8
        }
      },
      {
        questionId: 'gasto_diario_gasolina',
        value: '350',
        responseTime: 7000,
        transcription: 'En gasolina... ay, déjeme pensar... como trescientos cincuenta pesos',
        stressIndicators: ['calculos_mentales', 'nerviosismo'],
        voiceAnalysis: {
          pitch_variance: 0.55,
          speech_rate_change: 0.35,
          pause_frequency: 0.35,
          voice_tremor: 0.25,
          confidence_level: 0.82
        }
      }
    ];
  }

  /**
   * Generar respuestas aleatorias para testing
   */
  private static generateRandomResponses(): AVIResponse[] {
    const responses: AVIResponse[] = [];
    const questionIds = ['nombre_completo', 'ingresos_promedio_diarios', 'gasto_diario_gasolina', 'vueltas_por_dia'];
    
    questionIds.forEach(questionId => {
      responses.push({
        questionId,
        value: this.getRandomValue(questionId),
        responseTime: Math.random() * 10000 + 2000,
        transcription: `Respuesta para ${questionId}`,
        stressIndicators: Math.random() > 0.7 ? ['stress'] : [],
        voiceAnalysis: this.generateRandomVoiceAnalysis()
      });
    });
    
    return responses;
  }

  private static getRandomValue(questionId: string): string {
    switch (questionId) {
      case 'nombre_completo':
        return 'Juan Pérez';
      case 'ingresos_promedio_diarios':
        return (Math.random() * 2000 + 500).toFixed(0);
      case 'gasto_diario_gasolina':
        return (Math.random() * 600 + 200).toFixed(0);
      case 'vueltas_por_dia':
        return (Math.random() * 10 + 3).toFixed(0);
      default:
        return 'valor_random';
    }
  }

  private static generateRandomVoiceAnalysis(): VoiceAnalysis {
    return {
      pitch_variance: Math.random(),
      speech_rate_change: Math.random(),
      pause_frequency: Math.random(),
      voice_tremor: Math.random(),
      confidence_level: Math.random() * 0.4 + 0.6
    };
  }

  /**
   * Generar muestras de calibración para testing
   */
  static generateCalibrationSamples(count: number): CalibrationSample[] {
    const samples: CalibrationSample[] = [];
    const profiles: TestProfile[] = ['LOW_RISK', 'HIGH_RISK', 'INCONSISTENT', 'NERVOUS_TRUTHFUL'];
    const outcomes: OutcomeType[] = ['GOOD', 'ACCEPTABLE', 'BAD'];
    
    for (let i = 0; i < count; i++) {
      const profile = profiles[Math.floor(Math.random() * profiles.length)];
      const responses = this.generateTestResponses(profile);
      
      // Simular resultado de dual engine (simplificado)
      const mockDualResult = this.generateMockDualEngineResult(profile);
      
      // Asignar outcome basado en perfil con algo de ruido
      let outcome: OutcomeType;
      if (profile === 'LOW_RISK') {
        outcome = Math.random() > 0.15 ? 'GOOD' : 'ACCEPTABLE'; // 85% GOOD
      } else if (profile === 'HIGH_RISK') {
        outcome = Math.random() > 0.2 ? 'BAD' : 'ACCEPTABLE'; // 80% BAD
      } else if (profile === 'NERVOUS_TRUTHFUL') {
        outcome = Math.random() > 0.3 ? 'GOOD' : 'ACCEPTABLE'; // 70% GOOD
      } else {
        outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      }
      
      samples.push({
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Último mes
        responses,
        dualResult: mockDualResult,
        actualOutcome: outcome,
        interviewId: `test_${i}_${Date.now()}`
      });
    }
    
    return samples;
  }

  /**
   */
  private static generateMockDualEngineResult(profile: TestProfile): DualEngineResult {
    let baseScore: number;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    
    switch (profile) {
      case 'LOW_RISK':
        baseScore = 750 + Math.random() * 200;
        riskLevel = baseScore >= 800 ? 'LOW' : 'MEDIUM';
        break;
      case 'HIGH_RISK':
        baseScore = 200 + Math.random() * 300;
        riskLevel = baseScore >= 450 ? 'HIGH' : 'CRITICAL';
        break;
      case 'INCONSISTENT':
        baseScore = 400 + Math.random() * 200;
        riskLevel = 'HIGH';
        break;
      case 'NERVOUS_TRUTHFUL':
        baseScore = 650 + Math.random() * 200;
        riskLevel = baseScore >= 750 ? 'LOW' : 'MEDIUM';
        break;
      default:
        baseScore = 400 + Math.random() * 400;
        riskLevel = 'MEDIUM';
    }

    const scientificScore = Math.round(baseScore + (Math.random() - 0.5) * 100);
    const heuristicScore = Math.round(baseScore + (Math.random() - 0.5) * 150);
    const consolidatedScore = Math.round((scientificScore + heuristicScore) / 2);

    return {
      consolidatedScore: {
        totalScore: consolidatedScore,
        riskLevel,
        categoryScores: {} as any,
        redFlags: profile === 'HIGH_RISK' ? [
          {
            type: 'TEST_FLAG',
            questionId: 'test',
            reason: 'Generated for testing',
            impact: 8,
            severity: 'HIGH'
          }
        ] : [],
        recommendations: [`Test recommendation for ${profile}`],
        processingTime: Math.random() * 2000 + 500
      },
      scientificScore: {
        totalScore: scientificScore,
        riskLevel,
        categoryScores: {} as any,
        redFlags: [],
        recommendations: [],
        processingTime: Math.random() * 1500 + 800
      },
      heuristicScore: {
        totalScore: heuristicScore,
        riskLevel,
        categoryScores: {} as any,
        redFlags: [],
        recommendations: [],
        processingTime: Math.random() * 400 + 100
      },
      consensus: {
        level: Math.abs(scientificScore - heuristicScore) < 100 ? 'HIGH' : 
               Math.abs(scientificScore - heuristicScore) < 200 ? 'MEDIUM' : 'LOW',
        scoreDifference: Math.abs(scientificScore - heuristicScore),
        riskLevelAgreement: true,
        agreement: 'Test agreement',
        scientificAdvantages: ['Test advantage 1'],
        heuristicAdvantages: ['Test advantage 2']
      },
      processingTime: Math.random() * 2000 + 1000,
      engineReliability: {
        scientific: 0.8 + Math.random() * 0.15,
        heuristic: 0.75 + Math.random() * 0.15,
        overall: 0.78 + Math.random() * 0.15
      },
      recommendations: [`Consolidated recommendation for ${profile}`]
    };
  }

  /**
   * Generar batch de pruebas para validación
   */
  static generateValidationBatch(): ValidationBatch {
    return {
      lowRiskCases: Array.from({length: 20}, () => ({
        responses: this.generateTestResponses('LOW_RISK'),
        expectedRiskLevel: 'LOW',
        expectedScoreRange: [750, 1000]
      })),
      highRiskCases: Array.from({length: 20}, () => ({
        responses: this.generateTestResponses('HIGH_RISK'),
        expectedRiskLevel: 'CRITICAL',
        expectedScoreRange: [0, 450]
      })),
      edgeCases: Array.from({length: 10}, () => ({
        responses: this.generateTestResponses('INCONSISTENT'),
        expectedRiskLevel: 'HIGH',
        expectedScoreRange: [300, 600]
      }))
    };
  }
}

// Types for testing
export type TestProfile = 'LOW_RISK' | 'HIGH_RISK' | 'INCONSISTENT' | 'NERVOUS_TRUTHFUL' | 'RANDOM';

export interface ValidationCase {
  responses: AVIResponse[];
  expectedRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expectedScoreRange: [number, number];
}

export interface ValidationBatch {
  lowRiskCases: ValidationCase[];
  highRiskCases: ValidationCase[];
  edgeCases: ValidationCase[];
}
