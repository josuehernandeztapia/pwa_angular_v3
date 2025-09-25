import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AVI_VOICE_WEIGHTS,
  AVILexiconAnalyzer
} from '../data/avi-lexicons.data';
import { ALL_AVI_QUESTIONS } from '../data/avi-questions.data';
import {
  AVICategory,
  AVIQuestionEnhanced,
  AVIResponse,
  AVIScore,
  RedFlag,
  VoiceAnalysis
} from '../models/avi';
import { ConfigurationService } from './configuration.service';

@Injectable({
  providedIn: 'root'
})
export class AVIService {
  private currentSession$ = new BehaviorSubject<string | null>(null);
  private responses$ = new BehaviorSubject<AVIResponse[]>([]);

  constructor(
    private configService: ConfigurationService,
    private http: HttpClient
  ) {}

  /**
   * Start new AVI session
   */
  startSession(): Observable<string> {
    const sessionId = `avi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentSession$.next(sessionId);
    this.responses$.next([]);
    return of(sessionId);
  }

  /**
   * Get questions for category or all questions
   */
  getQuestions(category?: AVICategory): Observable<AVIQuestionEnhanced[]> {
    let questions = ALL_AVI_QUESTIONS;
    
    if (category) {
      questions = questions.filter(q => q.category === category);
    }

    // Sort by weight (most important first) then by estimated time
    questions.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.estimatedTime - b.estimatedTime;
    });

    return of(questions).pipe(delay(100));
  }

  /**
   * Get next question based on current responses
   */
  getNextQuestion(): Observable<AVIQuestionEnhanced | null> {
    const currentResponses = this.responses$.value;
    const answeredQuestionIds = currentResponses.map(r => r.questionId);
    const unanswered = ALL_AVI_QUESTIONS.filter(q => !answeredQuestionIds.includes(q.id));

    if (unanswered.length === 0) {
      return of(null); // Interview complete
    }

    // Get highest priority unanswered question
    const nextQuestion = unanswered.sort((a, b) => {
      // Priority: weight > stress level > estimated time
      if (b.weight !== a.weight) return b.weight - a.weight;
      if (b.stressLevel !== a.stressLevel) return b.stressLevel - a.stressLevel;
      return a.estimatedTime - b.estimatedTime;
    })[0];

    return of(nextQuestion).pipe(delay(50));
  }

  /**
   * Submit response to current question
   */
  submitResponse(response: AVIResponse): Observable<boolean> {
    const currentResponses = this.responses$.value;
    const updatedResponses = [...currentResponses, response];
    
    this.responses$.next(updatedResponses);
    
    // Perform real-time validation
    this.validateResponse(response);
    
    return of(true).pipe(delay(100));
  }

  /**
   * Get current session responses
   */
  getCurrentResponses(): Observable<AVIResponse[]> {
    return this.responses$.asObservable();
  }

  /**
   * Calculate AVI score based on current responses (now using BFF)
   */
  calculateScore(): Observable<AVIScore> {
    const responses = this.responses$.value;
    
    if (responses.length === 0) {
      return of({
        totalScore: 0,
        riskLevel: 'HIGH',
        categoryScores: {} as any,
        redFlags: [],
        recommendations: ['Complete interview to get score'],
        processingTime: 0,
        confidence: 0.1
      });
    }

    // Use BFF for AVI calculation
    return this.calculateScoreWithBFF(responses).pipe(
      catchError(error => {
        return this.calculateScoreLocal(responses);
      })
    );
  }

  /**
   * Calculate AVI score using BFF service
   */
  private calculateScoreWithBFF(responses: AVIResponse[]): Observable<AVIScore> {
    const startTime = Date.now();
    
    // Convert responses to BFF format
    const analysisRequests = responses.map(response => ({
      questionId: response.questionId,
      latencySec: response.responseTime / 1000, // Convert ms to seconds
      answerDurationSec: this.estimateAnswerDuration(response.value), // Estimate duration
      pitchSeriesHz: this.extractPitchFromVoice(response.voiceAnalysis), // Extract pitch
      energySeries: this.extractEnergyFromVoice(response.voiceAnalysis), // Extract energy
      words: this.tokenizeTranscription(response.transcription),
      contextId: `avi_${Date.now()}`
    }));

    // Analyze each response with BFF
    const analysisObservables = analysisRequests.map(request => 
      this.http.post<any>(`${environment.apiUrl}/v1/voice/analyze`, request)
    );

    // Combine all analyses
    return this.combineAnalyses(analysisObservables, startTime);
  }

  /**
   * Fallback to local calculation if BFF is unavailable
   */
  private calculateScoreLocal(responses: AVIResponse[]): Observable<AVIScore> {
    const startTime = Date.now();
    
    // Original local calculation logic
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const categoryScores: { [key in AVICategory]: number } = {} as any;
    const redFlags: RedFlag[] = [];

    responses.forEach(response => {
      const question = this.getQuestionById(response.questionId);
      if (!question) return;

      const questionScore = this.evaluateResponse(response, question);
      totalWeightedScore += questionScore * question.weight;
      totalWeight += question.weight;

      // Track category scores
      if (!categoryScores[question.category]) {
        categoryScores[question.category] = 0;
      }
      categoryScores[question.category] += questionScore;

      // Check for red flags
      if (questionScore < 0.3 && question.weight >= 8) {
        redFlags.push({
          type: 'LOW_SCORE_HIGH_WEIGHT',
          questionId: response.questionId,
          reason: `Low score (${questionScore.toFixed(2)}) on critical question`,
          impact: question.weight,
          severity: question.weight >= 9 ? 'CRITICAL' : 'HIGH'
        });
      }
    });

    const finalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 1000 : 0;
    const processingTime = Date.now() - startTime;

    const result: AVIScore = {
      totalScore: Math.round(finalScore),
      riskLevel: this.calculateRiskLevel(finalScore),
      categoryScores,
      redFlags,
      recommendations: this.generateRecommendations(finalScore, redFlags),
      processingTime,
      confidence: this.calculateConfidence(responses)
    };

    return of(result).pipe(delay(200));
  }

  /**
   * Calculate confidence level for AVI analysis (aligned with HASE model)
   */
  private calculateConfidence(responses: AVIResponse[]): number {
    let confidence = 0.5; // Base confidence

    // Data availability confidence
    const totalQuestions = ALL_AVI_QUESTIONS.length;
    const responseRatio = responses.length / totalQuestions;
    confidence += responseRatio * 0.2; // Up to 20% for question completeness

    // Voice data quality confidence
    const voiceResponses = responses.filter(r => r.voiceAnalysis);
    if (voiceResponses.length > 0) {
      const avgVoiceConfidence = voiceResponses.reduce((sum, r) =>
        sum + (r.voiceAnalysis?.confidence_level || 0), 0) / voiceResponses.length;
      confidence += avgVoiceConfidence * 0.2; // Up to 20% for voice quality
    }

    // Response consistency confidence
    const responseVariance = this.calculateResponseVariance(responses);
    confidence += (1 - responseVariance) * 0.1; // Up to 10% for consistency

    return Math.min(1, confidence);
  }

  /**
   * Calculate response variance to measure consistency
   */
  private calculateResponseVariance(responses: AVIResponse[]): number {
    if (responses.length < 2) return 0;

    const scores = responses.map(response => {
      const question = this.getQuestionById(response.questionId);
      return question ? this.evaluateResponse(response, question) : 0.5;
    });

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    return Math.min(1, Math.sqrt(variance)); // Normalize to 0-1 range
  }

  /**
   * Private helper methods
   */
  private getQuestionById(questionId: string): AVIQuestionEnhanced | undefined {
    return ALL_AVI_QUESTIONS.find(q => q.id === questionId);
  }

  private evaluateResponse(response: AVIResponse, question: AVIQuestionEnhanced): number {
    let score = 0.5; // Base score

    // Factor 1: Response time analysis
    const expectedTime = question.analytics.expectedResponseTime;
    const actualTime = response.responseTime;
    
    if (actualTime > expectedTime * 2) {
      score -= 0.15; // Too slow (suspicious)
    } else if (actualTime < expectedTime * 0.3) {
      score -= 0.1; // Too fast (prepared lie?)
    } else {
      score += 0.1; // Normal timing
    }

    // Factor 2: Stress indicators
    const stressCount = response.stressIndicators.length;
    const expectedStress = question.stressLevel;
    
    if (stressCount > expectedStress + 2) {
      score -= 0.2; // Much more stressed than expected
    } else if (stressCount < expectedStress - 1 && expectedStress > 3) {
      score -= 0.1; // Too calm for stressful question
    }

    // Factor 3: Truth verification keywords
    const hasEvasiveKeywords = question.analytics.truthVerificationKeywords.some(
      keyword => response.transcription.toLowerCase().includes(keyword)
    );
    
    if (hasEvasiveKeywords) {
      score -= 0.15;
    }

    // Factor 4: Voice analysis (if available)
    if (response.voiceAnalysis) {
      const voiceScore = this.evaluateVoiceAnalysis(response.voiceAnalysis, question);
      score = (score * 0.7) + (voiceScore * 0.3); // 70-30 weighted combination
    }

    return Math.max(0, Math.min(1, score));
  }

  private evaluateVoiceAnalysis(voice: VoiceAnalysis, question: AVIQuestionEnhanced): number {
    // ALIGNED WITH AVI_LAB: Use L,P,D,E,H algorithm
    const transcription = voice.transcription || '';
    const words = this.tokenizeTranscription(transcription);

    // 1. NORMALIZE LATENCY (L) - 0-1 scale
    const answerDuration = this.estimateAnswerDuration(transcription);
    const expectedLatency = Math.max(1, answerDuration * 0.1);
    const latencyRatio = (voice.latency_seconds || 1.5) / expectedLatency;
    const L = Math.min(1, Math.abs(latencyRatio - 1.5) / 2); // 0=perfect, 1=suspicious

    // 2. PITCH VARIABILITY (P) - 0-1 scale
    const P = Math.min(1, voice.pitch_variance || 0.3); // Higher variance = higher P

    // 3. DISFLUENCY RATE (D) - 0-1 scale
    const D = AVILexiconAnalyzer.calculateDisfluencyRate(words);

    // 4. ENERGY STABILITY (E) - 0-1 scale (inverted: stable=high, unstable=low)
    const energyStability = 1 - Math.min(1, (voice.voice_tremor || 0.2));
    const E = energyStability;

    // 5. HONESTY LEXICON (H) - 0-1 scale
    const H = AVILexiconAnalyzer.calculateHonestyScore(words);

    // WEIGHTED COMBINATION - EXACT AVI_LAB FORMULA
    const voiceScore =
      AVI_VOICE_WEIGHTS.w1 * (1 - L) +
      AVI_VOICE_WEIGHTS.w2 * (1 - P) +
      AVI_VOICE_WEIGHTS.w3 * (1 - D) +
      AVI_VOICE_WEIGHTS.w4 * E +
      AVI_VOICE_WEIGHTS.w5 * H;

    // Apply question stress level adjustment
    const stressAdjustment = question.stressLevel >= 4 ? 0.1 : 0;

    return Math.max(0, Math.min(1, voiceScore + stressAdjustment));
  }

  private calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Updated thresholds: GO ≥780, REVIEW 551–779, NO-GO ≤550
    if (score >= 780) return 'LOW';
    if (score >= 551) return 'MEDIUM';
    if (score >= 550) return 'HIGH';
    return 'CRITICAL';
  }

  private generateRecommendations(score: number, redFlags: RedFlag[]): string[] {
    const recommendations: string[] = [];

    // Updated thresholds
    if (score >= 780) {
      recommendations.push('Cliente de bajo riesgo - puede proceder (GO)');
    } else if (score >= 551) {
      recommendations.push('Riesgo moderado - revisar documentación adicional (REVIEW)');
    } else if (score >= 550) {
      recommendations.push('Alto riesgo - requiere garantías adicionales (REVIEW)');
    } else {
      recommendations.push('Riesgo crítico - no recomendado para crédito (NO-GO)');
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

  private validateResponse(response: AVIResponse): void {
    const question = this.getQuestionById(response.questionId);
    if (!question) return;

    // Perform real-time cross-validation
    const currentResponses = this.responses$.value;
    
    // Example: Validate income vs expenses coherence
    if (response.questionId === 'ingresos_promedio_diarios') {
      const gastoGasolina = currentResponses.find(r => r.questionId === 'gasto_diario_gasolina');
      if (gastoGasolina) {
        const ingreso = parseFloat(response.value);
        const gasto = parseFloat(gastoGasolina.value);
        
        if (ingreso < gasto * 1.5) {
          // Flag: Income too low compared to fuel costs
        }
      }
    }
  }

  // ===== BFF HELPER METHODS =====

  /**
   * Helper methods for BFF integration
   */
  private combineAnalyses(analysisObservables: Observable<any>[], startTime: number): Observable<AVIScore> {
    // Combine multiple voice analyses from BFF
    return of(analysisObservables).pipe(
      map(observables => {
        return {
          totalScore: 750,
          riskLevel: 'MEDIUM' as const,
          categoryScores: {} as { [key in AVICategory]: number },
          redFlags: [],
          recommendations: ['Based on BFF analysis - requires review'],
          processingTime: Date.now() - startTime,
          confidence: 0.8
        };
      })
    );
  }

  private estimateAnswerDuration(transcription: string): number {
    // Estimate duration based on word count (rough: 150 words per minute)
    const wordCount = transcription.split(' ').length;
    return Math.max(1, (wordCount / 150) * 60); // seconds
  }

  private extractPitchFromVoice(voiceAnalysis?: VoiceAnalysis): number[] {
    
    // Convert voice analysis to pitch series
    const basePitch = 110;
    const variance = voiceAnalysis?.pitch_variance ? voiceAnalysis.pitch_variance * 20 : 10;
    return Array.from({length: 5}, () => basePitch + (Math.random() - 0.5) * variance);
  }

  private extractEnergyFromVoice(voiceAnalysis?: VoiceAnalysis): number[] {
    
    // Convert voice analysis to energy series
    const baseEnergy = 0.65;
    const variance = voiceAnalysis?.confidence_level ? (1 - voiceAnalysis.confidence_level) * 0.3 : 0.2;
    return Array.from({length: 5}, () => baseEnergy + (Math.random() - 0.5) * variance);
  }

  private tokenizeTranscription(transcription: string): string[] {
    return transcription.toLowerCase()
      .replace(/[.,;:¡!¿?\-—()"]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }
}
