import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { 
  AVIQuestionEnhanced, 
  AVIResponse, 
  AVIScore, 
  AVICategory,
  VoiceAnalysis,
  RedFlag
} from '../models/types';
import { ALL_AVI_QUESTIONS } from '../data/avi-questions.data';
import { ConfigurationService } from './configuration.service';

@Injectable({
  providedIn: 'root'
})
export class AVIService {
  private currentSession$ = new BehaviorSubject<string | null>(null);
  private responses$ = new BehaviorSubject<AVIResponse[]>([]);

  constructor(private configService: ConfigurationService) {}

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
   * Calculate AVI score based on current responses
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
        processingTime: 0
      });
    }

    const startTime = Date.now();
    
    // Calculate weighted score
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
      processingTime
    };

    return of(result).pipe(delay(200));
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
    // Adjust expectations based on question stress level
    const stressAdjustment = question.stressLevel / 5; // 0-1 scale
    
    let voiceScore = 0.5;
    
    // High pitch variance might indicate stress/lying
    if (voice.pitch_variance > 0.7) voiceScore -= 0.2;
    if (voice.pitch_variance < 0.2 && question.stressLevel >= 4) voiceScore -= 0.1; // Too calm
    
    // Speech rate changes
    if (voice.speech_rate_change > 0.6) voiceScore -= 0.15;
    
    // Pause frequency
    if (voice.pause_frequency > 0.8) voiceScore -= 0.2;
    
    // Voice tremor
    if (voice.voice_tremor > 0.5) voiceScore -= 0.1;
    
    // Confidence from speech recognition
    voiceScore += voice.confidence_level * 0.3;
    
    // Adjust for expected stress level
    if (question.stressLevel >= 4) {
      voiceScore += stressAdjustment * 0.2; // Some stress is expected
    }
    
    return Math.max(0, Math.min(1, voiceScore));
  }

  private calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 800) return 'LOW';
    if (score >= 650) return 'MEDIUM';
    if (score >= 500) return 'HIGH';
    return 'CRITICAL';
  }

  private generateRecommendations(score: number, redFlags: RedFlag[]): string[] {
    const recommendations: string[] = [];

    if (score >= 800) {
      recommendations.push('Cliente de bajo riesgo - puede proceder');
    } else if (score >= 650) {
      recommendations.push('Riesgo moderado - revisar documentación adicional');
    } else if (score >= 500) {
      recommendations.push('Alto riesgo - requiere garantías adicionales');
    } else {
      recommendations.push('Riesgo crítico - no recomendado para crédito');
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
          console.warn('AVI Warning: Income vs fuel expense ratio suspicious');
        }
      }
    }
  }
}