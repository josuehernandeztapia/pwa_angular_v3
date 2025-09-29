import { Injectable, inject, signal } from '@angular/core';
import { Observable, BehaviorSubject, of, combineLatest } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { AVIResponse, AVIScore } from '../models/avi';
import { AVIDualEngineService, DualEngineResult } from './avi-dual-engine.service';
import { AVIConfusionMatrixService, CalibrationSample } from './avi-confusion-matrix.service';

@Injectable({
  providedIn: 'root'
})
export class AVICalibrationService {
  private confusionMatrixService = inject(AVIConfusionMatrixService);

  // AVI P0.2 SURGICAL FIX - Enhanced tracking for ≥30 audios
  private readonly TARGET_AUDIO_SAMPLES = 30;
  readonly audioSamplesCollected = signal(0);
  readonly calibrationProgress = signal(0);
  readonly isFullyCalibrated = signal(false);

  private calibrationData$ = new BehaviorSubject<CalibrationData>({
    totalInterviews: 0,
    successfulInterviews: 0,
    averageAccuracy: 0.85,
    enginePerformance: {
      scientific: { accuracy: 0.87, avgProcessingTime: 1200, reliability: 0.85 },
      heuristic: { accuracy: 0.82, avgProcessingTime: 200, reliability: 0.78 }
    },
    adaptiveWeights: {
      scientificWeight: 0.65,
      heuristicWeight: 0.35,
      lastAdjustment: new Date()
    },
    riskThresholds: {
      low: 750,
      medium: 600,
      high: 450,
      critical: 300
    },
    questionWeights: new Map(),
    falsePositiveRate: 0.12,
    falseNegativeRate: 0.08,
    consensusThreshold: 150
  });

  constructor(private dualEngine: AVIDualEngineService) {
    this.loadCalibrationData();
    this.initializeCalibrationTracking();
  }

  /**
   * AVI P0.2 SURGICAL FIX - Initialize calibration tracking
   */
  private initializeCalibrationTracking(): void {
    // Subscribe to confusion matrix service to track progress
    this.confusionMatrixService.calibrationReport$.subscribe(report => {
      this.audioSamplesCollected.set(report.totalSamples);
      this.calibrationProgress.set(report.completionPercentage);
      this.isFullyCalibrated.set(report.calibrationStatus === 'SUFFICIENT' || report.calibrationStatus === 'EXCELLENT');

    });
  }

  /**
   *  Record audio sample with validation outcome
   */
  recordAudioSampleWithOutcome(
    responses: AVIResponse[],
    dualResult: DualEngineResult,
    actualOutcome: 'GOOD' | 'ACCEPTABLE' | 'RISKY' | 'VERY_RISKY',
    audioMetadata: {
      duration: number;
      quality: number;
      format: string;
      deviceInfo?: string;
    },
    validationSource: 'MANUAL' | 'BEHAVIORAL' | 'OUTCOME_DATA' = 'MANUAL',
    notes?: string
  ): Observable<boolean> {
    // Map risk level from dual result
    const predictedRisk = this.mapRiskLevel(dualResult.consolidatedScore.riskLevel);

    const calibrationSample: Omit<CalibrationSample, 'id' | 'timestamp'> = {
      audioMetadata,
      responses,
      dualResult,
      predictedRisk,
      actualOutcome,
      validationSource,
      notes
    };

    return this.confusionMatrixService.addCalibrationSample(calibrationSample).pipe(
      tap(sample => {

        // Update legacy calibration data for backwards compatibility
        const currentData = this.calibrationData$.value;
        currentData.totalInterviews++;

        // Check if prediction was correct for success rate
        const wasCorrect = this.isPredictionCorrect(predictedRisk, actualOutcome);
        if (wasCorrect) {
          currentData.successfulInterviews++;
        }

        // Update accuracy
        currentData.averageAccuracy = currentData.successfulInterviews / currentData.totalInterviews;

        this.updateCalibrationData(currentData);
      }),
      map(() => true)
    );
  }

  /**
   *  Get enhanced calibration status with confusion matrix
   */
  getEnhancedCalibrationStatus(): Observable<{
    audioSamplesCollected: number;
    targetSamples: number;
    progress: number;
    isCalibrated: boolean;
    confusionMatrix: any;
    metrics: any;
    recommendations: string[];
  }> {
    return combineLatest([
      this.confusionMatrixService.calibrationReport$,
      this.confusionMatrixService.calculateMetrics(),
      this.calibrationData$
    ]).pipe(
      map(([report, metrics, legacyData]) => ({
        audioSamplesCollected: report.totalSamples,
        targetSamples: this.TARGET_AUDIO_SAMPLES,
        progress: report.completionPercentage,
        isCalibrated: report.calibrationStatus === 'SUFFICIENT' || report.calibrationStatus === 'EXCELLENT',
        confusionMatrix: report.confusionMatrix,
        metrics,
        recommendations: report.recommendations,
        // Legacy data for backwards compatibility
        legacyCalibration: legacyData
      }))
    );
  }

  /**
   */
  generateMockCalibrationSamples(count: number = 35): Observable<boolean> {
    if (count < 1 || count > 100) {
      count = 35;
    }


    const mockSamples: Array<Omit<CalibrationSample, 'id' | 'timestamp'>> = [];

    for (let i = 0; i < count; i++) {
      const riskLevels: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const outcomes: Array<'GOOD' | 'ACCEPTABLE' | 'RISKY' | 'VERY_RISKY'> = ['GOOD', 'ACCEPTABLE', 'RISKY', 'VERY_RISKY'];

      const predictedRisk = riskLevels[Math.floor(Math.random() * riskLevels.length)];

      // Create realistic correlation between prediction and outcome
      let actualOutcome: 'GOOD' | 'ACCEPTABLE' | 'RISKY' | 'VERY_RISKY';

      // 80% accuracy simulation
      if (Math.random() < 0.8) {
        // Correct prediction
        actualOutcome = predictedRisk === 'LOW' ? 'GOOD' :
                       predictedRisk === 'MEDIUM' ? 'ACCEPTABLE' :
                       predictedRisk === 'HIGH' ? 'RISKY' : 'VERY_RISKY';
      } else {
        // Incorrect prediction
        actualOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      }

      const mockSample: Omit<CalibrationSample, 'id' | 'timestamp'> = {
        audioMetadata: {
          duration: 60000 + Math.random() * 180000, // 1-4 minutes
          quality: 75 + Math.random() * 25, // 75-100%
          format: 'audio/webm',
          deviceInfo: `MockDevice-${i % 5}`
        },
        responses: this.generateMockResponses(),
        dualResult: this.generateMockDualResult(predictedRisk),
        predictedRisk,
        actualOutcome,
        validationSource: Math.random() > 0.5 ? 'MANUAL' : 'BEHAVIORAL',
      };

      mockSamples.push(mockSample);
    }

    // Add samples sequentially with slight delay for realistic feel
    return this.addMockSamplesSequentially(mockSamples, 0);
  }


  private addMockSamplesSequentially(samples: Array<Omit<CalibrationSample, 'id' | 'timestamp'>>, index: number): Observable<boolean> {
    if (index >= samples.length) {
      return of(true);
    }

    return this.confusionMatrixService.addCalibrationSample(samples[index]).pipe(
      switchMap(() => {
        // Small delay between samples
        return new Promise(resolve => setTimeout(resolve, 50)).then(() =>
          this.addMockSamplesSequentially(samples, index + 1)
        );
      })
    );
  }

  private generateMockResponses(): any[] {
    return [
      {
        questionId: 'q1',
        responseTime: 2000 + Math.random() * 3000,
        stressIndicators: Math.random() > 0.7 ? ['hesitation'] : []
      }
    ];
  }

  private generateMockDualResult(predictedRisk: string): DualEngineResult {
    const riskScore = predictedRisk === 'LOW' ? 800 + Math.random() * 200 :
                     predictedRisk === 'MEDIUM' ? 600 + Math.random() * 200 :
                     predictedRisk === 'HIGH' ? 400 + Math.random() * 200 :
                     200 + Math.random() * 200;

    return {
      scientificScore: {
        totalScore: riskScore + (Math.random() - 0.5) * 100,
        riskLevel: predictedRisk as any,
        confidence: 70 + Math.random() * 30,
        components: {},
        redFlags: [],
        processingTime: 1000 + Math.random() * 1000
      },
      heuristicScore: {
        totalScore: riskScore + (Math.random() - 0.5) * 100,
        riskLevel: predictedRisk as any,
        confidence: 70 + Math.random() * 30,
        components: {},
        redFlags: [],
        processingTime: 100 + Math.random() * 200
      },
      consolidatedScore: {
        totalScore: riskScore,
        riskLevel: predictedRisk as any,
        confidence: 70 + Math.random() * 30,
        components: {},
        redFlags: [],
        processingTime: 1200 + Math.random() * 1200
      },
      consensus: {
        level: 'HIGH',
        difference: Math.random() * 100,
        agreementPercentage: 70 + Math.random() * 30
      },
      metadata: {
        timestamp: new Date(),
        engineVersions: { scientific: '2.1.0', heuristic: '1.5.0' },
        processingFlags: []
      }
    } as DualEngineResult;
  }

  private mapRiskLevel(riskLevel: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (riskLevel?.toUpperCase()) {
      case 'LOW': return 'LOW';
      case 'MEDIUM': return 'MEDIUM';
      case 'HIGH': return 'HIGH';
      case 'CRITICAL': return 'CRITICAL';
      default: return 'MEDIUM';
    }
  }

  private isPredictionCorrect(predicted: string, actual: string): boolean {
    const isRiskyPrediction = predicted === 'HIGH' || predicted === 'CRITICAL';
    const isRiskyOutcome = actual === 'RISKY' || actual === 'VERY_RISKY';
    return isRiskyPrediction === isRiskyOutcome;
  }

  /**
   * Ejecuta calibración automática basada en resultados históricos
   */
  performAutoCalibration(historicalResults: CalibrationSample[]): Observable<CalibrationResult> {
    
    return of(null).pipe(
      map(() => {
        const calibrationResult: CalibrationResult = {
          adjustmentsMade: [],
          performanceImprovement: 0,
          newConfiguration: this.calibrationData$.value,
          confidence: 0,
          recommendedActions: []
        };

        // 1. Calibrar pesos de engines
        const engineWeightAdjustment = this.calibrateEngineWeights(historicalResults);
        if (engineWeightAdjustment.adjusted) {
          calibrationResult.adjustmentsMade.push(engineWeightAdjustment.description);
          calibrationResult.performanceImprovement += engineWeightAdjustment.expectedImprovement;
        }

        // 2. Calibrar thresholds de riesgo
        const thresholdAdjustment = this.calibrateRiskThresholds(historicalResults);
        if (thresholdAdjustment.adjusted) {
          calibrationResult.adjustmentsMade.push(thresholdAdjustment.description);
          calibrationResult.performanceImprovement += thresholdAdjustment.expectedImprovement;
        }

        // 3. Calibrar pesos de preguntas
        const questionWeightAdjustment = this.calibrateQuestionWeights(historicalResults);
        if (questionWeightAdjustment.adjusted) {
          calibrationResult.adjustmentsMade.push(questionWeightAdjustment.description);
          calibrationResult.performanceImprovement += questionWeightAdjustment.expectedImprovement;
        }

        // 4. Detectar patrones de falsos positivos/negativos
        const errorPatternAnalysis = this.analyzeErrorPatterns(historicalResults);
        calibrationResult.recommendedActions.push(...errorPatternAnalysis.recommendations);

        // 5. Calcular confianza de la calibración
        calibrationResult.confidence = this.calculateCalibrationConfidence(historicalResults);

        // Actualizar datos de calibración
        this.updateCalibrationData(calibrationResult.newConfiguration);

        return calibrationResult;
      }),
      tap(result => {
      })
    );
  }

  /**
   * Calibrar pesos adaptativos de los engines
   */
  private calibrateEngineWeights(samples: CalibrationSample[]): CalibrationAdjustment {
    const currentData = this.calibrationData$.value;
    let adjustment: CalibrationAdjustment = {
      adjusted: false,
      description: '',
      expectedImprovement: 0
    };

    // Analizar performance de cada engine
    let scientificCorrect = 0;
    let heuristicCorrect = 0;
    let totalSamples = samples.length;

    samples.forEach(sample => {
      // Determinar si cada engine acertó basado en outcome real
      const scientificCorrect_sample = this.wasEngineCorrect(
        sample.dualResult.scientificScore,
        sample.actualOutcome
      );
      const heuristicCorrect_sample = this.wasEngineCorrect(
        sample.dualResult.heuristicScore,
        sample.actualOutcome
      );

      if (scientificCorrect_sample) scientificCorrect++;
      if (heuristicCorrect_sample) heuristicCorrect++;
    });

    const scientificAccuracy = scientificCorrect / totalSamples;
    const heuristicAccuracy = heuristicCorrect / totalSamples;

    // Calcular nuevos pesos basados en accuracy relativa
    const totalAccuracy = scientificAccuracy + heuristicAccuracy;
    const newScientificWeight = totalAccuracy > 0 ? scientificAccuracy / totalAccuracy : 0.6;
    const newHeuristicWeight = 1 - newScientificWeight;

    // Solo ajustar si la diferencia es significativa (>5%)
    const currentScientificWeight = currentData.adaptiveWeights.scientificWeight;
    const weightDifference = Math.abs(newScientificWeight - currentScientificWeight);

    if (weightDifference > 0.05) {
      currentData.adaptiveWeights.scientificWeight = newScientificWeight;
      currentData.adaptiveWeights.heuristicWeight = newHeuristicWeight;
      currentData.adaptiveWeights.lastAdjustment = new Date();

      adjustment = {
        adjusted: true,
        description: `Pesos de engines ajustados: Científico ${(newScientificWeight*100).toFixed(1)}%, Heurístico ${(newHeuristicWeight*100).toFixed(1)}%`,
        expectedImprovement: weightDifference * 0.15 // Mejora estimada
      };
    }

    return adjustment;
  }

  /**
   * Calibrar thresholds de niveles de riesgo
   */
  private calibrateRiskThresholds(samples: CalibrationSample[]): CalibrationAdjustment {
    const currentData = this.calibrationData$.value;
    let adjustment: CalibrationAdjustment = {
      adjusted: false,
      description: '',
      expectedImprovement: 0
    };

    // Analizar distribución de scores vs outcomes reales
    const riskAnalysis = {
      lowRisk: { scores: [] as number[], goodOutcomes: 0, totalSamples: 0 },
      mediumRisk: { scores: [] as number[], goodOutcomes: 0, totalSamples: 0 },
      highRisk: { scores: [] as number[], goodOutcomes: 0, totalSamples: 0 },
      criticalRisk: { scores: [] as number[], goodOutcomes: 0, totalSamples: 0 }
    };

    samples.forEach(sample => {
      const score = sample.dualResult.consolidatedScore.totalScore;
      const isGoodOutcome = sample.actualOutcome === 'GOOD' || sample.actualOutcome === 'ACCEPTABLE';
      
      const currentThresholds = currentData.riskThresholds;
      
      if (score >= currentThresholds.low) {
        riskAnalysis.lowRisk.scores.push(score);
        riskAnalysis.lowRisk.totalSamples++;
        if (isGoodOutcome) riskAnalysis.lowRisk.goodOutcomes++;
      } else if (score >= currentThresholds.medium) {
        riskAnalysis.mediumRisk.scores.push(score);
        riskAnalysis.mediumRisk.totalSamples++;
        if (isGoodOutcome) riskAnalysis.mediumRisk.goodOutcomes++;
      } else if (score >= currentThresholds.high) {
        riskAnalysis.highRisk.scores.push(score);
        riskAnalysis.highRisk.totalSamples++;
        if (isGoodOutcome) riskAnalysis.highRisk.goodOutcomes++;
      } else {
        riskAnalysis.criticalRisk.scores.push(score);
        riskAnalysis.criticalRisk.totalSamples++;
        if (isGoodOutcome) riskAnalysis.criticalRisk.goodOutcomes++;
      }
    });

    // Calcular tasas de éxito por categoría
    const lowRiskSuccessRate = riskAnalysis.lowRisk.totalSamples > 0 
      ? riskAnalysis.lowRisk.goodOutcomes / riskAnalysis.lowRisk.totalSamples : 0;
    const mediumRiskSuccessRate = riskAnalysis.mediumRisk.totalSamples > 0
      ? riskAnalysis.mediumRisk.goodOutcomes / riskAnalysis.mediumRisk.totalSamples : 0;

    // Ajustar thresholds si las tasas de éxito no son las esperadas
    let thresholdsChanged = false;
    let improvementEstimate = 0;

    // Low risk debería tener >85% de éxito
    if (lowRiskSuccessRate < 0.85 && riskAnalysis.lowRisk.totalSamples > 10) {
      const avgScoreInLowRisk = riskAnalysis.lowRisk.scores.reduce((a, b) => a + b, 0) / riskAnalysis.lowRisk.scores.length;
      currentData.riskThresholds.low = Math.min(900, avgScoreInLowRisk + 50);
      thresholdsChanged = true;
      improvementEstimate += 0.05;
    }

    // Medium risk debería tener ~60-75% de éxito
    if ((mediumRiskSuccessRate < 0.6 || mediumRiskSuccessRate > 0.75) && riskAnalysis.mediumRisk.totalSamples > 10) {
      const avgScoreInMediumRisk = riskAnalysis.mediumRisk.scores.reduce((a, b) => a + b, 0) / riskAnalysis.mediumRisk.scores.length;
      currentData.riskThresholds.medium = Math.max(500, Math.min(700, avgScoreInMediumRisk));
      thresholdsChanged = true;
      improvementEstimate += 0.03;
    }

    if (thresholdsChanged) {
      adjustment = {
        adjusted: true,
        description: `Thresholds de riesgo calibrados: LOW>${currentData.riskThresholds.low}, MEDIUM>${currentData.riskThresholds.medium}`,
        expectedImprovement: improvementEstimate
      };
    }

    return adjustment;
  }

  /**
   * Calibrar pesos individuales de preguntas
   */
  private calibrateQuestionWeights(samples: CalibrationSample[]): CalibrationAdjustment {
    let adjustment: CalibrationAdjustment = {
      adjusted: false,
      description: '',
      expectedImprovement: 0
    };

    // Analizar cuáles preguntas son más predictivas de outcomes reales
    const questionPerformance = new Map<string, {
      correctPredictions: number,
      totalSamples: number,
      avgResponseTime: number,
      avgStressLevel: number
    }>();

    samples.forEach(sample => {
      sample.responses.forEach(response => {
        if (!questionPerformance.has(response.questionId)) {
          questionPerformance.set(response.questionId, {
            correctPredictions: 0,
            totalSamples: 0,
            avgResponseTime: 0,
            avgStressLevel: 0
          });
        }
        
        const perf = questionPerformance.get(response.questionId)!;
        perf.totalSamples++;
        perf.avgResponseTime += response.responseTime;
        perf.avgStressLevel += response.stressIndicators.length;
        
        // Determinar si esta pregunta contribuyó a una predicción correcta
        // (simplificación: si el outcome final fue correcto)
        if (this.wasOverallPredictionCorrect(sample.dualResult, sample.actualOutcome)) {
          perf.correctPredictions++;
        }
      });
    });

    // Identificar preguntas con muy baja predictividad
    const lowPerformingQuestions: string[] = [];
    const highPerformingQuestions: string[] = [];

    questionPerformance.forEach((perf, questionId) => {
      if (perf.totalSamples >= 5) { // Solo analizar preguntas con suficientes datos
        const accuracy = perf.correctPredictions / perf.totalSamples;
        
        if (accuracy < 0.4) {
          lowPerformingQuestions.push(questionId);
        } else if (accuracy > 0.8) {
          highPerformingQuestions.push(questionId);
        }
      }
    });

    if (lowPerformingQuestions.length > 0 || highPerformingQuestions.length > 0) {
      // Guardar información para recomendaciones
      const currentData = this.calibrationData$.value;
      lowPerformingQuestions.forEach(qId => {
        currentData.questionWeights.set(qId, { adjustedWeight: 0.7, reason: 'low_predictivity' });
      });
      highPerformingQuestions.forEach(qId => {
        currentData.questionWeights.set(qId, { adjustedWeight: 1.3, reason: 'high_predictivity' });
      });

      adjustment = {
        adjusted: true,
        description: `${highPerformingQuestions.length} preguntas con alta predictividad, ${lowPerformingQuestions.length} con baja predictividad`,
        expectedImprovement: (highPerformingQuestions.length * 0.02) + (lowPerformingQuestions.length * 0.01)
      };
    }

    return adjustment;
  }

  /**
   * Analizar patrones de errores para mejoras futuras
   */
  private analyzeErrorPatterns(samples: CalibrationSample[]): ErrorPatternAnalysis {
    const analysis: ErrorPatternAnalysis = {
      falsePositivePatterns: [],
      falseNegativePatterns: [],
      recommendations: []
    };

    let falsePositives = 0;
    let falseNegatives = 0;
    let totalSamples = samples.length;

    samples.forEach(sample => {
      const prediction = this.getPredictionFromScore(sample.dualResult.consolidatedScore);
      const actual = sample.actualOutcome;

      // False Positive: predecimos GOOD/ACCEPTABLE pero fue BAD
      if ((prediction === 'GOOD' || prediction === 'ACCEPTABLE') && actual === 'BAD') {
        falsePositives++;
        
        // Analizar patrones específicos
        if (sample.dualResult.consensus.level === 'LOW') {
          analysis.falsePositivePatterns.push('Bajo consenso entre engines predice falsos positivos');
        }
        if (sample.dualResult.consolidatedScore.redFlags.length === 0) {
          analysis.falsePositivePatterns.push('Ausencia de red flags no garantiza buen outcome');
        }
      }

      // False Negative: predecimos BAD pero fue GOOD/ACCEPTABLE  
      if (prediction === 'BAD' && (actual === 'GOOD' || actual === 'ACCEPTABLE')) {
        falseNegatives++;
        
        if (sample.dualResult.consolidatedScore.redFlags.length > 5) {
          analysis.falseNegativePatterns.push('Exceso de red flags puede generar falsos negativos');
        }
      }
    });

    // Generar recomendaciones
    const fpRate = falsePositives / totalSamples;
    const fnRate = falseNegatives / totalSamples;

    if (fpRate > 0.15) {
      analysis.recommendations.push('Tasa de falsos positivos alta: considerar ser más conservador en scoring');
    }
    if (fnRate > 0.15) {
      analysis.recommendations.push('Tasa de falsos negativos alta: revisar thresholds y red flags');
    }
    if (analysis.falsePositivePatterns.includes('Bajo consenso entre engines predice falsos positivos')) {
      analysis.recommendations.push('Cuando hay bajo consenso, ser más conservador en la decisión final');
    }

    return analysis;
  }

  /**
   * Calcular confianza en la calibración realizada
   */
  private calculateCalibrationConfidence(samples: CalibrationSample[]): number {
    if (samples.length < 10) return 0.3; // Pocos datos = baja confianza
    if (samples.length < 50) return 0.6; // Datos moderados
    if (samples.length < 100) return 0.8; // Buenos datos
    return 0.95; // Muchos datos = alta confianza
  }

  /**
   * Obtener datos actuales de calibración
   */
  getCalibrationData(): Observable<CalibrationData> {
    return this.calibrationData$.asObservable();
  }

  /**
   * Registrar resultado de entrevista para calibración futura
   */
  recordInterviewResult(
    responses: AVIResponse[],
    dualResult: DualEngineResult,
    actualOutcome: OutcomeType
  ): void {
    const sample: CalibrationSample = {
      timestamp: new Date(),
      responses,
      dualResult,
      actualOutcome,
      interviewId: `cal_${Date.now()}`
    };

    // En producción, esto se guardaría en base de datos
    // Por ahora, simular almacenamiento
  }

  // Helper methods
  private wasEngineCorrect(score: AVIScore, actualOutcome: OutcomeType): boolean {
    const prediction = this.getPredictionFromScore(score);
    return this.doesPredictionMatchOutcome(prediction, actualOutcome);
  }

  private wasOverallPredictionCorrect(dualResult: DualEngineResult, actualOutcome: OutcomeType): boolean {
    const prediction = this.getPredictionFromScore(dualResult.consolidatedScore);
    return this.doesPredictionMatchOutcome(prediction, actualOutcome);
  }

  private getPredictionFromScore(score: AVIScore): PredictionType {
    switch (score.riskLevel) {
      case 'LOW': return 'GOOD';
      case 'MEDIUM': return 'ACCEPTABLE';
      case 'HIGH': return 'QUESTIONABLE';
      case 'CRITICAL': return 'BAD';
      default: return 'QUESTIONABLE';
    }
  }

  private doesPredictionMatchOutcome(prediction: PredictionType, outcome: OutcomeType): boolean {
    // Mapeo simplificado - en producción sería más sofisticado
    const predictionScore = { 'GOOD': 4, 'ACCEPTABLE': 3, 'QUESTIONABLE': 2, 'BAD': 1 };
    const outcomeScore = { 'GOOD': 4, 'ACCEPTABLE': 3, 'BAD': 1 };
    
    const pScore = predictionScore[prediction] || 2;
    const oScore = outcomeScore[outcome] || 2;
    
    return Math.abs(pScore - oScore) <= 1; // Permitir 1 nivel de diferencia
  }

  private updateCalibrationData(newData: CalibrationData): void {
    this.calibrationData$.next(newData);
    // En producción: guardar en storage persistente
  }

  private loadCalibrationData(): void {
    // En producción: cargar desde storage persistente
    // Por ahora usar datos por defecto
  }
}

// Interfaces para calibración
export interface CalibrationData {
  totalInterviews: number;
  successfulInterviews: number;
  averageAccuracy: number;
  enginePerformance: {
    scientific: EnginePerformanceMetrics;
    heuristic: EnginePerformanceMetrics;
  };
  adaptiveWeights: {
    scientificWeight: number;
    heuristicWeight: number;
    lastAdjustment: Date;
  };
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  questionWeights: Map<string, { adjustedWeight: number; reason: string }>;
  falsePositiveRate: number;
  falseNegativeRate: number;
  consensusThreshold: number;
}

export interface EnginePerformanceMetrics {
  accuracy: number;
  avgProcessingTime: number;
  reliability: number;
}

export interface CalibrationSample {
  timestamp: Date;
  responses: AVIResponse[];
  dualResult: DualEngineResult;
  actualOutcome: OutcomeType;
  interviewId: string;
}

export interface CalibrationResult {
  adjustmentsMade: string[];
  performanceImprovement: number;
  newConfiguration: CalibrationData;
  confidence: number;
  recommendedActions: string[];
}

export interface CalibrationAdjustment {
  adjusted: boolean;
  description: string;
  expectedImprovement: number;
}

export interface ErrorPatternAnalysis {
  falsePositivePatterns: string[];
  falseNegativePatterns: string[];
  recommendations: string[];
}

export type OutcomeType = 'GOOD' | 'ACCEPTABLE' | 'BAD';
export type PredictionType = 'GOOD' | 'ACCEPTABLE' | 'QUESTIONABLE' | 'BAD';
