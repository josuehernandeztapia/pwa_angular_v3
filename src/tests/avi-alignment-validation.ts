/**
 * AVI ALIGNMENT VALIDATION SUITE
 * Compares AVI MAIN (avi.service.ts) vs AVI_LAB (voice-analysis-engine.js)
 * Ensures identical mathematical outputs for same inputs
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AVIService } from '../app/services/avi.service';
import { HASEModelService } from '../app/services/hase-model.service';
import { ConfigurationService } from '../app/services/configuration.service';
import { AVIResponse, VoiceAnalysis } from '../app/models/avi';
import { AVI_VOICE_WEIGHTS, AVI_VOICE_THRESHOLDS, AVILexiconAnalyzer } from '../app/data/avi-lexicons.data';

interface ValidationTestCase {
  profile: 'honest' | 'nervous' | 'suspicious' | 'deceptive';
  expectedDecision: 'GO' | 'REVIEW' | 'NO-GO';
  voiceAnalysis: VoiceAnalysis;
  transcription: string;
  questionId: string;
}

export class AVIAlignmentValidator {
  private aviService: AVIService;
  private haseService: HASEModelService;
  private testResults: any[] = [];

  constructor() {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AVIService, HASEModelService, ConfigurationService]
    });

    this.aviService = TestBed.inject(AVIService);
    this.haseService = TestBed.inject(HASEModelService);
  }

  /**
   * Generate test cases aligned with AVI_LAB validation patterns
   */
  generateTestCases(): ValidationTestCase[] {
    return [
      // HONEST PROFILES (Expected GO ≥750)
      {
        profile: 'honest',
        expectedDecision: 'GO',
        voiceAnalysis: {
          transcription: 'Trabajo exactamente en construcción desde hace cinco años, completamente seguro de mi experiencia',
          confidence_level: 0.95,
          latency_seconds: 1.8,
          pitch_variance: 0.15,
          voice_tremor: 0.08,
          recognition_accuracy: 0.97
        },
        transcription: 'Trabajo exactamente en construcción desde hace cinco años, completamente seguro de mi experiencia',
        questionId: 'ocupacion_actual'
      },
      {
        profile: 'honest',
        expectedDecision: 'GO',
        voiceAnalysis: {
          transcription: 'Claro, mis ingresos son definitivamente dos mil pesos diarios, precisamente esa cantidad',
          confidence_level: 0.92,
          latency_seconds: 2.1,
          pitch_variance: 0.20,
          voice_tremor: 0.12,
          recognition_accuracy: 0.94
        },
        transcription: 'Claro, mis ingresos son definitivamente dos mil pesos diarios, precisamente esa cantidad',
        questionId: 'ingresos_promedio_diarios'
      },

      // NERVOUS PROFILES (Expected REVIEW 500-749)
      {
        profile: 'nervous',
        expectedDecision: 'REVIEW',
        voiceAnalysis: {
          transcription: 'Este pues trabajo en um construcción eh hace como cinco años no estoy completamente seguro',
          confidence_level: 0.78,
          latency_seconds: 4.2,
          pitch_variance: 0.55,
          voice_tremor: 0.35,
          recognition_accuracy: 0.82
        },
        transcription: 'Este pues trabajo en um construcción eh hace como cinco años no estoy completamente seguro',
        questionId: 'ocupacion_actual'
      },

      // SUSPICIOUS PROFILES (Expected NO-GO ≤499)
      {
        profile: 'suspicious',
        expectedDecision: 'NO-GO',
        voiceAnalysis: {
          transcription: 'Tal vez creo que mas o menos trabajo eh no recuerdo bien no estoy seguro de nada',
          confidence_level: 0.45,
          latency_seconds: 0.8,
          pitch_variance: 0.75,
          voice_tremor: 0.68,
          recognition_accuracy: 0.58
        },
        transcription: 'Tal vez creo que mas o menos trabajo eh no recuerdo bien no estoy seguro de nada',
        questionId: 'ocupacion_actual'
      },

      // DECEPTIVE PROFILES (Expected NO-GO ≤499)
      {
        profile: 'deceptive',
        expectedDecision: 'NO-GO',
        voiceAnalysis: {
          transcription: 'No recuerdo tal vez mas o menos um puede ser que supongo que no estoy seguro',
          confidence_level: 0.32,
          latency_seconds: 0.5,
          pitch_variance: 0.85,
          voice_tremor: 0.72,
          recognition_accuracy: 0.41
        },
        transcription: 'No recuerdo tal vez mas o menos um puede ser que supongo que no estoy seguro',
        questionId: 'ingresos_promedio_diarios'
      }
    ];
  }

  /**
   * Execute validation comparing MAIN vs LAB algorithms
   */
  async executeValidation(): Promise<any> {
    console.log('🔍 AVI ALIGNMENT VALIDATION SUITE');
    console.log('========================================');

    const testCases = this.generateTestCases();
    let totalTests = 0;
    let identicalResults = 0;
    let thresholdAlignment = 0;

    for (const testCase of testCases) {
      const mainResult = await this.calculateWithMAIN(testCase);
      const labResult = this.calculateWithLAB(testCase);

      const isIdentical = this.compareResults(mainResult, labResult);
      const isThresholdAligned = mainResult.decision === testCase.expectedDecision;

      if (isIdentical) identicalResults++;
      if (isThresholdAligned) thresholdAlignment++;
      totalTests++;

      this.testResults.push({
        testId: totalTests,
        profile: testCase.profile,
        expected: testCase.expectedDecision,
        mainResult,
        labResult,
        identical: isIdentical,
        thresholdAligned: isThresholdAligned
      });

      console.log(`Test ${totalTests} [${testCase.profile}]: MAIN=${mainResult.score}, LAB=${labResult.score}, Match=${isIdentical ? '✅' : '❌'}`);
    }

    return this.generateValidationReport(totalTests, identicalResults, thresholdAlignment);
  }

  /**
   * Calculate using AVI MAIN algorithm
   */
  private async calculateWithMAIN(testCase: ValidationTestCase): Promise<any> {
    const response: AVIResponse = {
      sessionId: 'test_session',
      questionId: testCase.questionId,
      value: 'test_answer',
      transcription: testCase.transcription,
      responseTime: testCase.voiceAnalysis.latency_seconds * 1000,
      timestamp: new Date().toISOString(),
      voiceAnalysis: testCase.voiceAnalysis,
      stressIndicators: []
    };

    // Start session and submit response
    await this.aviService.startSession().toPromise();
    await this.aviService.submitResponse(response).toPromise();

    // Calculate score using MAIN algorithm
    const aviScore = await this.aviService.calculateScore().toPromise();

    return {
      score: aviScore.totalScore,
      decision: this.mapScoreToDecision(aviScore.totalScore),
      riskLevel: aviScore.riskLevel,
      confidence: aviScore.confidence,
      processingTime: aviScore.processingTime
    };
  }

  /**
   * Calculate using LAB algorithm (simulated)
   */
  private calculateWithLAB(testCase: ValidationTestCase): any {
    const words = testCase.transcription.toLowerCase()
      .replace(/[.,;:¡!¿?\-—()"]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    // LAB Algorithm: L,P,D,E,H calculation
    const answerDuration = Math.max(1, (words.length / 150) * 60);
    const expectedLatency = Math.max(1, answerDuration * 0.1);
    const latencyRatio = testCase.voiceAnalysis.latency_seconds / expectedLatency;
    const L = Math.min(1, Math.abs(latencyRatio - 1.5) / 2);

    const P = Math.min(1, testCase.voiceAnalysis.pitch_variance);
    const D = AVILexiconAnalyzer.calculateDisfluencyRate(words);
    const E = 1 - Math.min(1, testCase.voiceAnalysis.voice_tremor);
    const H = AVILexiconAnalyzer.calculateHonestyScore(words);

    // Apply LAB weighted formula
    const voiceScore =
      AVI_VOICE_WEIGHTS.w1 * (1 - L) +
      AVI_VOICE_WEIGHTS.w2 * (1 - P) +
      AVI_VOICE_WEIGHTS.w3 * (1 - D) +
      AVI_VOICE_WEIGHTS.w4 * E +
      AVI_VOICE_WEIGHTS.w5 * H;

    const finalScore = Math.round(voiceScore * 1000);

    return {
      score: finalScore,
      decision: this.mapScoreToDecision(finalScore),
      riskLevel: this.mapScoreToRiskLevel(finalScore),
      confidence: testCase.voiceAnalysis.confidence_level,
      metrics: { L, P, D, E, H }
    };
  }

  /**
   * Compare MAIN and LAB results for alignment
   */
  private compareResults(mainResult: any, labResult: any): boolean {
    const scoreDiff = Math.abs(mainResult.score - labResult.score);
    const decisionMatch = mainResult.decision === labResult.decision;

    // Allow 5 point tolerance due to random variations
    return scoreDiff <= 5 && decisionMatch;
  }

  /**
   * Map score to decision using aligned thresholds
   */
  private mapScoreToDecision(score: number): 'GO' | 'REVIEW' | 'NO-GO' {
    if (score >= AVI_VOICE_THRESHOLDS.GO) return 'GO';
    if (score >= AVI_VOICE_THRESHOLDS.REVIEW) return 'REVIEW';
    return 'NO-GO';
  }

  /**
   * Map score to risk level using aligned thresholds
   */
  private mapScoreToRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 750) return 'LOW';
    if (score >= 600) return 'MEDIUM';
    if (score >= 500) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Generate validation report
   */
  private generateValidationReport(totalTests: number, identicalResults: number, thresholdAlignment: number): any {
    const identicalPercentage = ((identicalResults / totalTests) * 100).toFixed(1);
    const thresholdPercentage = ((thresholdAlignment / totalTests) * 100).toFixed(1);

    console.log('\n📊 VALIDATION RESULTS SUMMARY');
    console.log('=====================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Identical Results: ${identicalResults}/${totalTests} (${identicalPercentage}%)`);
    console.log(`Threshold Alignment: ${thresholdAlignment}/${totalTests} (${thresholdPercentage}%)`);

    const status = identicalResults >= totalTests * 0.95 ? '✅ ALIGNED' : '❌ MISALIGNED';
    console.log(`\nAlignment Status: ${status}`);

    return {
      totalTests,
      identicalResults,
      identicalPercentage: parseFloat(identicalPercentage),
      thresholdAlignment,
      thresholdPercentage: parseFloat(thresholdPercentage),
      status,
      detailedResults: this.testResults
    };
  }
}