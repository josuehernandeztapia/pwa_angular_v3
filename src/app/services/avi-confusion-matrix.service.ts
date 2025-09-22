/**
 * 🎙️ AVI Confusion Matrix Service
 * P0.2 SURGICAL FIX - Calibration ≥30 audios + confusion matrix
 *
 * Advanced analytics for AVI system performance evaluation
 * Tracks predictions vs actual outcomes for continuous improvement
 */

import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { DualEngineResult } from './avi-dual-engine.service';

export interface ConfusionMatrixData {
  truePositives: number;    // Correctly predicted risky
  falsePositives: number;   // Incorrectly predicted risky (should be safe)
  trueNegatives: number;    // Correctly predicted safe
  falseNegatives: number;   // Incorrectly predicted safe (should be risky)
  total: number;
  sampleSize: number;
}

export interface ConfusionMatrixMetrics {
  accuracy: number;      // (TP + TN) / Total
  precision: number;     // TP / (TP + FP)
  recall: number;        // TP / (TP + FN) - Sensitivity
  specificity: number;   // TN / (TN + FP)
  f1Score: number;       // 2 * (precision * recall) / (precision + recall)
  falsePositiveRate: number;  // FP / (FP + TN)
  falseNegativeRate: number;  // FN / (FN + TP)
  confidence: number;    // Confidence level based on sample size
}

export interface CalibrationSample {
  id: string;
  timestamp: Date;
  audioMetadata: {
    duration: number;
    quality: number;
    format: string;
    deviceInfo?: string;
  };
  responses: any[];
  dualResult: DualEngineResult;
  predictedRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actualOutcome: 'GOOD' | 'ACCEPTABLE' | 'RISKY' | 'VERY_RISKY';
  validationSource: 'MANUAL' | 'BEHAVIORAL' | 'OUTCOME_DATA';
  notes?: string;
}

export interface CalibrationReport {
  totalSamples: number;
  targetSamples: number; // ≥30
  completionPercentage: number;
  confusionMatrix: ConfusionMatrixData;
  metrics: ConfusionMatrixMetrics;
  riskLevelBreakdown: {
    LOW: { samples: number; accuracy: number };
    MEDIUM: { samples: number; accuracy: number };
    HIGH: { samples: number; accuracy: number };
    CRITICAL: { samples: number; accuracy: number };
  };
  recommendations: string[];
  calibrationStatus: 'INSUFFICIENT' | 'PROGRESSING' | 'SUFFICIENT' | 'EXCELLENT';
}

@Injectable({
  providedIn: 'root'
})
export class AVIConfusionMatrixService {
  private readonly TARGET_SAMPLES = 30; // Minimum 30 audios for calibration
  private readonly LOCAL_STORAGE_KEY = 'conductores_avi_calibration';

  // State management
  private calibrationSamples$ = new BehaviorSubject<CalibrationSample[]>([]);
  private confusionMatrix$ = new BehaviorSubject<ConfusionMatrixData>(this.getEmptyMatrix());
  private calibrationReport$ = new BehaviorSubject<CalibrationReport>(this.getEmptyReport());

  // Reactive signals
  readonly calibrationProgress = signal(0); // 0-100%
  readonly isCalibrated = signal(false);
  readonly lastCalibration = signal<string | null>(null);

  constructor() {
    this.loadCalibrationData();
    this.updateCalibrationReport();
  }

  /**
   * 📊 Add new calibration sample
   */
  addCalibrationSample(sample: Omit<CalibrationSample, 'id' | 'timestamp'>): Observable<CalibrationSample> {
    const newSample: CalibrationSample = {
      ...sample,
      id: this.generateSampleId(),
      timestamp: new Date()
    };

    const currentSamples = this.calibrationSamples$.value;
    const updatedSamples = [...currentSamples, newSample];

    this.calibrationSamples$.next(updatedSamples);
    this.saveCalibrationData();
    this.updateCalibrationReport();

// removed by clean-audit

    return of(newSample);
  }

  /**
   * 🧮 Calculate confusion matrix from samples
   */
  calculateConfusionMatrix(): Observable<ConfusionMatrixData> {
    const samples = this.calibrationSamples$.value;

    if (samples.length === 0) {
      return of(this.getEmptyMatrix());
    }

    const matrix = this.getEmptyMatrix();

    samples.forEach(sample => {
      const wasRiskyPredicted = this.isPredictionRisky(sample.predictedRisk);
      const wasActuallyRisky = this.isOutcomeRisky(sample.actualOutcome);

      if (wasRiskyPredicted && wasActuallyRisky) {
        matrix.truePositives++;
      } else if (wasRiskyPredicted && !wasActuallyRisky) {
        matrix.falsePositives++;
      } else if (!wasRiskyPredicted && !wasActuallyRisky) {
        matrix.trueNegatives++;
      } else if (!wasRiskyPredicted && wasActuallyRisky) {
        matrix.falseNegatives++;
      }
    });

    matrix.total = matrix.truePositives + matrix.falsePositives + matrix.trueNegatives + matrix.falseNegatives;
    matrix.sampleSize = samples.length;

    this.confusionMatrix$.next(matrix);
    return of(matrix);
  }

  /**
   * 📈 Calculate performance metrics from confusion matrix
   */
  calculateMetrics(): Observable<ConfusionMatrixMetrics> {
    return this.calculateConfusionMatrix().pipe(
      map(matrix => {
        const { truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn, total } = matrix;

        if (total === 0) {
          return this.getEmptyMetrics();
        }

        const accuracy = (tp + tn) / total;
        const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
        const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
        const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 0;
        const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
        const falsePositiveRate = (fp + tn) > 0 ? fp / (fp + tn) : 0;
        const falseNegativeRate = (fn + tp) > 0 ? fn / (fn + tp) : 0;

        // Calculate confidence based on sample size
        const confidence = this.calculateConfidence(matrix.sampleSize);

        return {
          accuracy: Math.round(accuracy * 10000) / 100, // 2 decimal places as percentage
          precision: Math.round(precision * 10000) / 100,
          recall: Math.round(recall * 10000) / 100,
          specificity: Math.round(specificity * 10000) / 100,
          f1Score: Math.round(f1Score * 10000) / 100,
          falsePositiveRate: Math.round(falsePositiveRate * 10000) / 100,
          falseNegativeRate: Math.round(falseNegativeRate * 10000) / 100,
          confidence
        };
      })
    );
  }

  /**
   * 📋 Generate comprehensive calibration report
   */
  generateCalibrationReport(): Observable<CalibrationReport> {
    const samples = this.calibrationSamples$.value;

    return this.calculateMetrics().pipe(
      map(metrics => {
        const confusionMatrix = this.confusionMatrix$.value;
        const completionPercentage = Math.min(100, (samples.length / this.TARGET_SAMPLES) * 100);

        // Break down by risk level
        const riskLevelBreakdown = this.calculateRiskLevelBreakdown(samples);

        // Generate recommendations
        const recommendations = this.generateRecommendations(samples, metrics);

        // Determine calibration status
        const calibrationStatus = this.determineCalibrationStatus(samples.length, metrics);

        const report: CalibrationReport = {
          totalSamples: samples.length,
          targetSamples: this.TARGET_SAMPLES,
          completionPercentage: Math.round(completionPercentage),
          confusionMatrix,
          metrics,
          riskLevelBreakdown,
          recommendations,
          calibrationStatus
        };

        this.calibrationReport$.next(report);
        this.updateSignals(report);

        return report;
      })
    );
  }

  /**
   * 🎯 Get specific samples for analysis
   */
  getSamplesByRiskLevel(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Observable<CalibrationSample[]> {
    return this.calibrationSamples$.pipe(
      map(samples => samples.filter(sample => sample.predictedRisk === riskLevel))
    );
  }

  /**
   * 🔍 Get misclassified samples for analysis
   */
  getMisclassifiedSamples(): Observable<{
    falsePositives: CalibrationSample[];
    falseNegatives: CalibrationSample[];
  }> {
    const samples = this.calibrationSamples$.value;

    const falsePositives = samples.filter(sample =>
      this.isPredictionRisky(sample.predictedRisk) && !this.isOutcomeRisky(sample.actualOutcome)
    );

    const falseNegatives = samples.filter(sample =>
      !this.isPredictionRisky(sample.predictedRisk) && this.isOutcomeRisky(sample.actualOutcome)
    );

    return of({ falsePositives, falseNegatives });
  }

  /**
   * 🧹 Clear calibration data (for reset)
   */
  clearCalibrationData(): Observable<boolean> {
    this.calibrationSamples$.next([]);
    this.confusionMatrix$.next(this.getEmptyMatrix());
    this.calibrationReport$.next(this.getEmptyReport());

    this.calibrationProgress.set(0);
    this.isCalibrated.set(false);
    this.lastCalibration.set(null);

    localStorage.removeItem(this.LOCAL_STORAGE_KEY);

// removed by clean-audit
    return of(true);
  }

  /**
   * 📥 Import calibration samples (for bulk loading)
   */
  importCalibrationSamples(samples: CalibrationSample[]): Observable<boolean> {
    const validSamples = samples.filter(this.validateSample);

    if (validSamples.length === 0) {
// removed by clean-audit
      return of(false);
    }

    this.calibrationSamples$.next(validSamples);
    this.saveCalibrationData();
    this.updateCalibrationReport();

// removed by clean-audit
    return of(true);
  }

  /**
   * 📤 Export calibration data
   */
  exportCalibrationData(): Observable<{
    samples: CalibrationSample[];
    report: CalibrationReport;
    exportedAt: string;
  }> {
    return of({
      samples: this.calibrationSamples$.value,
      report: this.calibrationReport$.value,
      exportedAt: new Date().toISOString()
    });
  }

  // Public observables
  get calibrationSamples$() {
    return this.calibrationSamples$.asObservable();
  }

  get confusionMatrix$() {
    return this.confusionMatrix$.asObservable();
  }

  get calibrationReport$() {
    return this.calibrationReport$.asObservable();
  }

  // Private utility methods

  private updateCalibrationReport(): void {
    this.generateCalibrationReport().subscribe();
  }

  private updateSignals(report: CalibrationReport): void {
    this.calibrationProgress.set(report.completionPercentage);
    this.isCalibrated.set(report.calibrationStatus === 'SUFFICIENT' || report.calibrationStatus === 'EXCELLENT');
    this.lastCalibration.set(new Date().toISOString());
  }

  private calculateRiskLevelBreakdown(samples: CalibrationSample[]) {
    const breakdown = {
      LOW: { samples: 0, accuracy: 0 },
      MEDIUM: { samples: 0, accuracy: 0 },
      HIGH: { samples: 0, accuracy: 0 },
      CRITICAL: { samples: 0, accuracy: 0 }
    };

    const riskLevels: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    riskLevels.forEach(riskLevel => {
      const levelSamples = samples.filter(s => s.predictedRisk === riskLevel);
      breakdown[riskLevel].samples = levelSamples.length;

      if (levelSamples.length > 0) {
        const correctPredictions = levelSamples.filter(sample =>
          this.isPredictionCorrect(sample.predictedRisk, sample.actualOutcome)
        ).length;

        breakdown[riskLevel].accuracy = Math.round((correctPredictions / levelSamples.length) * 100);
      }
    });

    return breakdown;
  }

  private generateRecommendations(samples: CalibrationSample[], metrics: ConfusionMatrixMetrics): string[] {
    const recommendations: string[] = [];

    if (samples.length < this.TARGET_SAMPLES) {
      recommendations.push(`Collect ${this.TARGET_SAMPLES - samples.length} more audio samples for proper calibration`);
    }

    if (metrics.accuracy < 75) {
      recommendations.push('Overall accuracy is low - review prediction thresholds');
    }

    if (metrics.falsePositiveRate > 20) {
      recommendations.push('High false positive rate - consider being less conservative in risk assessment');
    }

    if (metrics.falseNegativeRate > 15) {
      recommendations.push('High false negative rate - consider being more conservative in risk assessment');
    }

    if (metrics.precision < 70) {
      recommendations.push('Low precision - many safe candidates are being flagged as risky');
    }

    if (metrics.recall < 70) {
      recommendations.push('Low recall - many risky candidates are being missed');
    }

    if (samples.length >= this.TARGET_SAMPLES && metrics.confidence >= 80 && metrics.accuracy >= 80) {
      recommendations.push('✅ Calibration is performing well - system is ready for production use');
    }

    return recommendations;
  }

  private determineCalibrationStatus(sampleCount: number, metrics: ConfusionMatrixMetrics): CalibrationReport['calibrationStatus'] {
    if (sampleCount < 15) {
      return 'INSUFFICIENT';
    }

    if (sampleCount < this.TARGET_SAMPLES) {
      return 'PROGRESSING';
    }

    if (metrics.accuracy >= 85 && metrics.f1Score >= 80 && metrics.confidence >= 80) {
      return 'EXCELLENT';
    }

    if (metrics.accuracy >= 75 && metrics.f1Score >= 70) {
      return 'SUFFICIENT';
    }

    return 'PROGRESSING';
  }

  private isPredictionRisky(prediction: string): boolean {
    return prediction === 'HIGH' || prediction === 'CRITICAL';
  }

  private isOutcomeRisky(outcome: string): boolean {
    return outcome === 'RISKY' || outcome === 'VERY_RISKY';
  }

  private isPredictionCorrect(prediction: string, outcome: string): boolean {
    const predictionRisky = this.isPredictionRisky(prediction);
    const outcomeRisky = this.isOutcomeRisky(outcome);
    return predictionRisky === outcomeRisky;
  }

  private calculateConfidence(sampleSize: number): number {
    if (sampleSize >= 100) return 95;
    if (sampleSize >= 50) return 85;
    if (sampleSize >= this.TARGET_SAMPLES) return 75;
    if (sampleSize >= 20) return 60;
    if (sampleSize >= 10) return 40;
    return 20;
  }

  private validateSample(sample: CalibrationSample): boolean {
    return !!(
      sample.id &&
      sample.audioMetadata &&
      sample.audioMetadata.duration > 0 &&
      sample.predictedRisk &&
      sample.actualOutcome &&
      sample.validationSource
    );
  }

  private saveCalibrationData(): void {
    try {
      const data = {
        samples: this.calibrationSamples$.value,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
// removed by clean-audit
    }
  }

  private loadCalibrationData(): void {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.samples) {
          this.calibrationSamples$.next(data.samples);
        }
      }
    } catch (error) {
// removed by clean-audit
    }
  }

  private generateSampleId(): string {
    return `AVI-CAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEmptyMatrix(): ConfusionMatrixData {
    return {
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0,
      total: 0,
      sampleSize: 0
    };
  }

  private getEmptyMetrics(): ConfusionMatrixMetrics {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      specificity: 0,
      f1Score: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      confidence: 0
    };
  }

  private getEmptyReport(): CalibrationReport {
    return {
      totalSamples: 0,
      targetSamples: this.TARGET_SAMPLES,
      completionPercentage: 0,
      confusionMatrix: this.getEmptyMatrix(),
      metrics: this.getEmptyMetrics(),
      riskLevelBreakdown: {
        LOW: { samples: 0, accuracy: 0 },
        MEDIUM: { samples: 0, accuracy: 0 },
        HIGH: { samples: 0, accuracy: 0 },
        CRITICAL: { samples: 0, accuracy: 0 }
      },
      recommendations: ['Start collecting audio samples for calibration'],
      calibrationStatus: 'INSUFFICIENT'
    };
  }
}
// removed by clean-audit