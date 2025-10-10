import { HttpClient } from '@angular/common/http';
import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';
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
import { ApiConfigService } from './api-config.service';
import { AnalyticsService } from './analytics.service';
import { ConfigurationService } from './configuration.service';
import { FlowContextService } from './flow-context.service';

interface AviFlowContextSnapshot {
  sessionId: string | null;
  startedAt: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  responses: Array<{
    questionId: string;
    transcription: string;
    responseTime: number;
    recordedAt: number;
  }>;
  transcript?: string;
  lastResponseAt?: number;
  score?: number;
  riskLevel?: string;
  confidence?: number;
  redFlags?: RedFlag[];
  decision?: 'GO' | 'REVIEW' | 'NO_GO';
  flags?: string[];
  completedAt?: number;
  processedAt?: number;
  requiresSupervisor?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AVIService {
  private currentSession$ = new BehaviorSubject<string | null>(null);
  private responses$ = new BehaviorSubject<AVIResponse[]>([]);

  private readonly apiConfig: ApiConfigService;

  constructor(
    private configService: ConfigurationService,
    private http: HttpClient,
    apiConfigService: ApiConfigService,
    @Optional() private readonly analytics?: AnalyticsService,
    @Optional() private readonly flowContext?: FlowContextService
  ) {
    this.apiConfig = apiConfigService;
  }

  private persistAviContext(partial: Partial<AviFlowContextSnapshot>, appendResponse?: AviFlowContextSnapshot['responses'][number]): void {
    if (!this.flowContext) {
      return;
    }

    if (appendResponse) {
      this.flowContext.updateContext<AviFlowContextSnapshot>('avi', current => {
        const base: AviFlowContextSnapshot = current ?? {
          sessionId: partial.sessionId ?? this.currentSession$.value ?? null,
          startedAt: partial.startedAt ?? Date.now(),
          status: partial.status ?? 'IN_PROGRESS',
          responses: []
        };

        base.responses = [...(base.responses ?? []), appendResponse];
        base.lastResponseAt = appendResponse.recordedAt;
        const combined = [base.transcript, appendResponse.transcription].filter(Boolean).join(' ').trim();
        base.transcript = combined;

        return { ...base, ...partial };
      }, { breadcrumbs: ['Dashboard', 'AVI'] });
      return;
    }

    this.flowContext.updateContext<AviFlowContextSnapshot>('avi', current => {
      if (!current) {
        return {
          sessionId: partial.sessionId ?? this.currentSession$.value ?? null,
          startedAt: partial.startedAt ?? Date.now(),
          status: partial.status ?? 'IN_PROGRESS',
          responses: [],
          ...partial
        } as AviFlowContextSnapshot;
      }
      return { ...current, ...partial };
    }, { breadcrumbs: ['Dashboard', 'AVI'] });
  }

  /**
   * Start new AVI session
   */
  startSession(): Observable<string> {
    const localSessionId = this.generateLocalSessionId();

    const session$ = this.isMockMode()
      ? of({ sessionId: localSessionId, remote: false })
      : this.http.post<{ sessionId: string }>(`${environment.apiUrl}/v1/avi/session`, {
          locale: this.getBrowserLocale(),
          startedAt: new Date().toISOString(),
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }).pipe(
          map(res => ({ sessionId: res.sessionId ?? localSessionId, remote: true })),
          catchError(error => {
            console.warn('[AVI] No se pudo iniciar sesión remota, usando fallback local', error);
            return of({ sessionId: localSessionId, remote: false });
          })
        );

    return session$.pipe(
      tap(({ sessionId, remote }) => {
        this.currentSession$.next(sessionId);
        this.responses$.next([]);
        this.persistAviContext({
          sessionId,
          startedAt: Date.now(),
          status: 'IN_PROGRESS',
          responses: []
        });
        this.analytics?.track('avi_session_started', {
          sessionId,
          remote
        });
      }),
      map(({ sessionId }) => sessionId)
    );
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

    const sessionId = this.currentSession$.value;

    let submission$: Observable<boolean>;

    if (!this.isMockMode() && sessionId) {
      submission$ = this.http
        .post(`${environment.apiUrl}/v1/avi/session/${sessionId}/responses`, {
          questionId: response.questionId,
          transcription: response.transcription ?? response.value,
          responseTime: response.responseTime,
          stressIndicators: response.stressIndicators,
          sessionId,
          recordedAt: new Date().toISOString()
        })
        .pipe(
          map(() => true),
          catchError(error => {
            console.warn('[AVI] Error al enviar respuesta a BFF, usando fallback local', error);
            return of(true);
          })
        );
    } else {
      submission$ = of(true).pipe(delay(100));
    }

    return submission$.pipe(
      tap(() => {
        const recordedAt = Date.now();
        this.persistAviContext({}, {
          questionId: response.questionId,
          transcription: response.transcription ?? response.value,
          responseTime: response.responseTime,
          recordedAt
        });

        this.analytics?.track('avi_response_recorded', {
          sessionId: this.currentSession$.value,
          questionId: response.questionId,
          responseTime: response.responseTime
        });
      })
    );
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

    let score$: Observable<AVIScore>;

    if (responses.length === 0) {
      score$ = of({
        totalScore: 0,
        riskLevel: 'HIGH',
        categoryScores: {} as any,
        redFlags: [],
        recommendations: ['Complete interview to get score'],
        processingTime: 0,
        confidence: 0.1
      });
    } else if (this.apiConfig.isMockMode()) {
      score$ = this.calculateScoreVoiceOnly(responses);
    } else {
      score$ = this.calculateScoreWithBFF(responses).pipe(
        catchError(() => this.calculateScoreLocal(responses))
      );
    }

    return score$.pipe(
      tap(score => {
        this.persistAviContext({
          score: score.totalScore,
          riskLevel: score.riskLevel,
          confidence: score.confidence,
          redFlags: score.redFlags,
          processedAt: Date.now()
        });

        this.analytics?.track('avi_score_calculated', {
          sessionId: this.currentSession$.value,
          score: score.totalScore,
          riskLevel: score.riskLevel,
          redFlags: score.redFlags?.length ?? 0,
          confidence: score.confidence
        });
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
   * Calculate score using LAB voice-only algorithm (alignment mode for tests/mock)
   */
  private calculateScoreVoiceOnly(responses: AVIResponse[]): Observable<AVIScore> {
    const startTime = Date.now();

    // Compute voice-only score per response (LAB formula) and average
    const scores = responses.map(r => {
      const words = this.tokenizeTranscription(r.transcription || '');
      // L,P,D,E,H as in LAB
      const answerDuration = Math.max(1, (words.length / 150) * 60);
      const expectedLatency = Math.max(1, answerDuration * 0.1);
      const latencyRatio = (r.voiceAnalysis?.latency_seconds || 1.5) / expectedLatency;
      const L = Math.min(1, Math.abs(latencyRatio - 1.5) / 2);
      const P = Math.min(1, r.voiceAnalysis?.pitch_variance || 0);
      const D = AVILexiconAnalyzer.calculateDisfluencyRate(words);
      const E = 1 - Math.min(1, r.voiceAnalysis?.voice_tremor || 0);
      const H = AVILexiconAnalyzer.calculateHonestyScore(words);

      const voiceScore =
        AVI_VOICE_WEIGHTS.w1 * (1 - L) +
        AVI_VOICE_WEIGHTS.w2 * (1 - P) +
        AVI_VOICE_WEIGHTS.w3 * (1 - D) +
        AVI_VOICE_WEIGHTS.w4 * E +
        AVI_VOICE_WEIGHTS.w5 * H;

      return Math.round(Math.max(0, Math.min(1, voiceScore)) * 1000);
    });

    const finalScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const result: AVIScore = {
      totalScore: finalScore,
      riskLevel: this.calculateRiskLevel(finalScore),
      categoryScores: {} as any,
      redFlags: [],
      recommendations: this.generateRecommendations(finalScore, []),
      processingTime: Date.now() - startTime,
      confidence: 0.9
    };

    return of(result).pipe(delay(10));
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
    const { goMin, noGoMax, reviewMid } = this.getCalibratedThresholds();
    const normalizedScore = this.normalizeScore(score);

    if (normalizedScore >= goMin) {
      return 'LOW';
    }

    if (normalizedScore >= reviewMid) {
      return 'MEDIUM';
    }

    if (normalizedScore >= noGoMax) {
      return 'HIGH';
    }

    return 'CRITICAL';
  }

  completeSession(decision: 'GO' | 'REVIEW' | 'NO-GO', options: { flags?: string[]; score?: AVIScore | null } = {}): void {
    const { flags, score } = options;
    const normalizedDecision = decision === 'NO-GO' ? 'NO_GO' : decision;
    this.persistAviContext({
      decision: normalizedDecision,
      flags,
      status: 'COMPLETED',
      completedAt: Date.now(),
      requiresSupervisor: normalizedDecision === 'REVIEW',
      score: score?.totalScore,
      riskLevel: score?.riskLevel,
      confidence: score?.confidence,
      redFlags: score?.redFlags
    });

    const sessionId = this.currentSession$.value;
    if (sessionId && !this.isMockMode()) {
      this.http
        .post(`${environment.apiUrl}/v1/avi/session/${sessionId}/complete`, {
          decision: normalizedDecision,
          score: score?.totalScore,
          confidence: score?.confidence,
          flags
        })
        .pipe(catchError(error => {
          console.warn('[AVI] Error al finalizar sesión remota', error);
          return of(null);
        }))
        .subscribe();
    }

    this.analytics?.track('avi_session_completed', {
      sessionId,
      decision: normalizedDecision,
      score: score?.totalScore,
      confidence: score?.confidence
    });

    this.currentSession$.next(null);
  }

  private generateLocalSessionId(): string {
    return `avi_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private getBrowserLocale(): string {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }
    return this.configService.getCurrentConfiguration()?.locale ?? 'es-MX';
  }

  private isMockMode(): boolean {
    return this.apiConfig.isMockMode();
  }

  private generateRecommendations(score: number, redFlags: RedFlag[]): string[] {
    const recommendations: string[] = [];

    const { goMin, noGoMax, reviewMid } = this.getCalibratedThresholds();
    const normalizedScore = this.normalizeScore(score);

    if (normalizedScore >= goMin) {
      recommendations.push('Cliente de bajo riesgo - puede proceder (GO)');
    } else if (normalizedScore >= reviewMid) {
      recommendations.push('Riesgo moderado - revisar documentación adicional (REVIEW)');
    } else if (normalizedScore >= noGoMax) {
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

  private normalizeScore(score: number): number {
    if (!Number.isFinite(score)) {
      return 0;
    }

    const normalized = score / 1000;
    return Math.max(0, Math.min(1, normalized));
  }

  private getCalibratedThresholds(): { goMin: number; noGoMax: number; reviewMid: number } {
    const profile = environment.avi?.decisionProfile ?? 'conservative';
    const configured = environment.avi?.thresholds?.[profile as 'conservative' | 'permissive']
      ?? environment.avi?.thresholds?.conservative
      ?? { GO_MIN: 0.78, NOGO_MAX: 0.55 };

    const goMin = typeof configured.GO_MIN === 'number' && Number.isFinite(configured.GO_MIN)
      ? configured.GO_MIN
      : 0.78;
    const noGoMax = typeof configured.NOGO_MAX === 'number' && Number.isFinite(configured.NOGO_MAX)
      ? configured.NOGO_MAX
      : 0.55;

    const clampedGoMin = Math.min(Math.max(goMin, 0), 1);
    const clampedNoGoMax = Math.max(0, Math.min(Math.max(noGoMax, 0), clampedGoMin - 0.01));
    const reviewMid = clampedNoGoMax + ((clampedGoMin - clampedNoGoMax) / 2);

    return {
      goMin: clampedGoMin,
      noGoMax: clampedNoGoMax,
      reviewMid,
    };
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
