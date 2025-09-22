import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Subject, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { switchMap, takeUntil } from 'rxjs/operators';

import {
  AVIQuestionEnhanced,
  AVIResponse,
  AVIScore,
  VoiceAnalysis
} from '../../models/avi';
import { AVIDualEngineService, DualEngineResult } from '../../services/avi-dual-engine.service';
import { ALL_AVI_QUESTIONS } from '../../data/avi-questions.data';
import { AVIService } from '../../services/avi.service';
import { AVIVoiceResponse, OpenAIWhisperService } from '../../services/openai-whisper.service';
import { ApiConfigService } from '../../services/api-config.service';

@Component({
  selector: 'app-avi-interview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avi-interview.component.html',
  styleUrls: ['./avi-interview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AVIInterviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estado de la entrevista
  currentSession: string | null = null;
  currentQuestion: AVIQuestionEnhanced | null = null;
  currentResponse = '';
  questionStartTime = 0;
  isRecording = false;
  @ViewChild('questionTitle') questionTitleEl?: ElementRef<HTMLElement>;
  
  // UI timer de grabación
  recordingSeconds = 0;
  private recordingTimerId: any = null;
  
  // UI saved feedback
  lastSavedAt: number | null = null;
  
  // Progress tracking
  answeredQuestions: AVIResponse[] = [];
  totalQuestions = 55;
  progressPercentage = 0;
  estimatedTimeRemaining = 0;
  
  // Estados UI
  isInterviewActive = false;
  isProcessingResponse = false;
  isAnalyzing = false;
  showResults = false;
  
  // Resultados
  dualEngineResult: DualEngineResult | null = null;
  currentScore: AVIScore | null = null;

  // Pills por pregunta y resumen final
  questionPills: Array<{ questionId: string; status: 'clear' | 'review' | 'evasive'; label: string; reason: string }>=[];
  finalDecision: 'GO' | 'REVIEW' | 'NO-GO' | null = null;
  finalFlags: string[] = [];
  
// removed by clean-audit
  private voiceAnalysisEnabled = true;
  private stressIndicators = new BehaviorSubject<string[]>([]);

  // Guided Basic Info (6)
  guidedBasicActive = false;
  private guidedList: AVIQuestionEnhanced[] = [];
  private guidedIndex = 0;

  constructor(
    private aviService: AVIService,
    private dualEngine: AVIDualEngineService,
    private whisperService: OpenAIWhisperService,
    private http: HttpClient,
    private apiConfig: ApiConfigService,
  ) {}

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRecordingTimer();
  }

  private initializeComponent() {
    // Suscribirse a cambios en respuestas para actualizar progreso
    this.aviService.getCurrentResponses()
      .pipe(takeUntil(this.destroy$))
      .subscribe((responses: AVIResponse[]) => {
        this.answeredQuestions = responses;
        this.updateProgress();
      });
  }

  /**
   * Índice actual (Pregunta X de Y)
   */
  get currentIndex(): number {
    return this.answeredQuestions.length + (this.currentQuestion ? 1 : 0);
  }

  /**
   * Resultado listo para avanzar
   */
  get hasResultReady(): boolean {
    return !!this.currentResponse && this.currentResponse.trim().length > 0 && !this.isProcessingResponse;
  }

  /**
   * Iniciar nueva entrevista AVI
   */
  startInterview() {
    this.aviService.startSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe((sessionId: string) => {
        this.currentSession = sessionId;
        this.isInterviewActive = true;
        this.showResults = false;
        this.answeredQuestions = [];
        if (this.guidedBasicActive) {
          this.startGuidedBasic();
        } else {
          this.loadNextQuestion();
        }
      });
  }

  /**
   * Cargar siguiente pregunta
   */
  private loadNextQuestion() {
    if (this.guidedBasicActive) {
      const q = this.guidedList[this.guidedIndex];
      if (q) {
        this.currentQuestion = q;
        this.currentResponse = '';
        this.questionStartTime = Date.now();
        this.resetStressIndicators();
        setTimeout(() => this.questionTitleEl?.nativeElement?.focus?.(), 0);
      } else {
        this.completeInterview();
      }
      return;
    }
    this.aviService.getNextQuestion()
      .pipe(takeUntil(this.destroy$))
      .subscribe((question: AVIQuestionEnhanced | null) => {
        if (question) {
          this.currentQuestion = question;
          this.currentResponse = '';
          this.questionStartTime = Date.now();
          this.resetStressIndicators();
          // Enfocar el enunciado de la nueva pregunta para accesibilidad
          setTimeout(() => {
            this.questionTitleEl?.nativeElement?.focus?.();
          }, 0);
        } else {
          // Entrevista completada
          this.completeInterview();
        }
      });
  }

  /**
   * Enviar respuesta actual
   */
  submitResponse() {
    if (!this.currentQuestion || !this.currentResponse.trim()) return;

    this.isProcessingResponse = true;
    
    const responseTime = Date.now() - this.questionStartTime;
    
    const aviResponse: AVIResponse = {
      questionId: this.currentQuestion.id,
      value: this.currentResponse.trim(),
      responseTime,
      transcription: this.currentResponse.trim(), // En producción sería de speech-to-text
      voiceAnalysis: this.generateMockVoiceAnalysis(),
      stressIndicators: this.stressIndicators.value,
      coherenceScore: this.calculateQuickCoherence()
    };

    // Clasificar respuesta (píldora UX)
    const pill = this.classifyResponse(aviResponse);
    if (pill) {
      this.questionPills.push(pill);
    }

    this.aviService.submitResponse(aviResponse)
      .pipe(takeUntil(this.destroy$))
      .subscribe((success: boolean) => {
        if (success) {
          this.isProcessingResponse = false;
          this.lastSavedAt = Date.now();
          // Pequeño retraso para estabilidad visual antes de avanzar
          setTimeout(() => {
            if (this.guidedBasicActive) this.guidedIndex += 1;
            this.loadNextQuestion();
          }, 300);
        }
      });
  }

  /**
   * Completar entrevista y analizar con dual engine
   */
  private completeInterview() {
    this.isInterviewActive = false;
    this.isAnalyzing = true;
    
    // Ejecutar análisis con dual engine
    this.dualEngine.calculateDualEngineScore(this.answeredQuestions)
      .pipe(
        switchMap((result: Promise<DualEngineResult>) => result), // Unwrap Promise
        takeUntil(this.destroy$)
      )
      .subscribe((result: DualEngineResult) => {
        this.dualEngineResult = result;
        this.currentScore = result.consolidatedScore;
        this.isAnalyzing = false;
        this.showResults = true;

        // Resumen final (GO / REVIEW / NO-GO) con regla correctiva
        this.computeFinalSummary();
      });
  }

  /**
   * Iniciar/detener grabación con Whisper real
   */
  toggleRecording() {
    if (!this.isRecording) {
      this.startRealVoiceRecording();
    } else {
      this.stopRealVoiceRecording();
    }
  }

  private startRealVoiceRecording() {
    if (!this.currentQuestion) return;
    
// removed by clean-audit
    this.isRecording = true;
    this.startRecordingTimer();
    
    this.whisperService.recordAndTranscribeQuestion(
      this.currentQuestion.id,
      this.currentQuestion.analytics.expectedResponseTime,
      {
        language: 'es',
        model: 'gpt-4o-transcribe',
        responseFormat: 'verbose_json',
        timestampGranularities: ['word', 'segment'],
        includeLogProbs: true,
        temperature: 0.1,
        prompt: 'Entrevista financiera en español mexicano para conductores de transporte público. Incluir pausas y expresiones de duda.'
      }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: AVIVoiceResponse) => {
        if (response.status === 'completed') {
          this.handleVoiceTranscriptionComplete(response);
        } else if (response.status === 'recording') {
// removed by clean-audit
          // Guardar la función de stop para uso manual
          if (response.stopRecording) {
            this.stopRealVoiceRecording = response.stopRecording;
          }
          // Marcar indicador de audio listo para la pregunta actual
          if (this.currentQuestion) {
            this.markAudioReady(this.currentQuestion.id);
          }
        }
      },
      error: (error: unknown) => {
// removed by clean-audit
        this.isRecording = false;
// removed by clean-audit
        this.startMockVoiceRecording();
      }
    });
  }

  private async stopRealVoiceRecording() {
    this.isRecording = false;
    this.stopRecordingTimer();
// removed by clean-audit
    // La transcripción se maneja automáticamente en el observable
  }

  /**
   * Manejar transcripción completada
   */
  private handleVoiceTranscriptionComplete(response: AVIVoiceResponse) {
    if (response.transcription) {
      this.currentResponse = response.transcription;
    }
    
    if (response.stressIndicators) {
      this.stressIndicators.next(response.stressIndicators);
    }
    
    // Auto-enviar si la transcripción está completa
    if (response.transcription && response.transcription.trim().length > 10) {
      setTimeout(() => {
        if (!this.isProcessingResponse) {
          this.submitResponse();
        }
      }, 2000); // Dar 2 segundos para revisar
    }
    
    this.isRecording = false;
    this.stopRecordingTimer();
  }

  /**
   * Fallback: simulación de grabación (para desarrollo)
   */
  private startMockVoiceRecording() {
// removed by clean-audit
    // Simular captura de voz con timer
    timer(0, 500)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isRecording) {
          this.simulateStressDetection();
        }
      });
  }

  /**
   * Simulación de detección de estrés en tiempo real
   */
  private simulateStressDetection() {
    if (!this.currentQuestion) return;
    
    const indicators = [];
    const responseLength = this.currentResponse.length;
    const expectedStress = this.currentQuestion.stressLevel;
    
    // Simular detección basada en la pregunta y respuesta
    if (this.currentQuestion.weight >= 8) {
      indicators.push('pregunta_critica');
    }
    
    if (responseLength > 50 && this.currentResponse.includes('...')) {
      indicators.push('pausas_largas');
    }
    
    if (this.currentQuestion.analytics.truthVerificationKeywords.some(
      keyword => this.currentResponse.toLowerCase().includes(keyword)
    )) {
      indicators.push('lenguaje_evasivo');
    }
    
    this.stressIndicators.next(indicators);
  }

  /**
   * Generar análisis de voz simulado
   */
  private generateMockVoiceAnalysis(): VoiceAnalysis | undefined {
    if (!this.voiceAnalysisEnabled || !this.currentQuestion) return undefined;
    
    // Simular análisis basado en el nivel de estrés esperado
    const baseStress = this.currentQuestion.stressLevel / 5;
    
    return {
      pitch_variance: Math.random() * 0.3 + baseStress * 0.4,
      speech_rate_change: Math.random() * 0.2 + baseStress * 0.3,
      pause_frequency: Math.random() * 0.1 + baseStress * 0.5,
      voice_tremor: Math.random() * 0.1 + baseStress * 0.2,
      confidence_level: Math.max(0.6, Math.random() * 0.4 + 0.6)
    };
  }

  /**
   * Calcular coherencia rápida para feedback inmediato
   */
  private calculateQuickCoherence(): number {
    if (!this.currentQuestion) return 0.5;
    
    const responseTime = Date.now() - this.questionStartTime;
    const expectedTime = this.currentQuestion.analytics.expectedResponseTime;
    const timingScore = Math.abs(1 - responseTime / expectedTime);
    
    return Math.max(0.1, Math.min(1.0, 1 - timingScore));
  }

  /**
   * Actualizar progreso de la entrevista
   */
  private updateProgress() {
    this.progressPercentage = (this.answeredQuestions.length / this.totalQuestions) * 100;
    
    // Calcular tiempo estimado restante
    const remainingQuestions = this.totalQuestions - this.answeredQuestions.length;
    const avgTimePerQuestion = this.answeredQuestions.length > 0 
      ? this.answeredQuestions.reduce((sum, r) => sum + r.responseTime, 0) / this.answeredQuestions.length
      : 45000; // 45 segundos promedio
    
    this.estimatedTimeRemaining = (remainingQuestions * avgTimePerQuestion) / 1000 / 60; // en minutos
  }

  private resetStressIndicators() {
    this.stressIndicators.next([]);
  }

  /**
   * Reiniciar entrevista
   */
  restartInterview() {
    this.currentSession = null;
    this.currentQuestion = null;
    this.currentResponse = '';
    this.answeredQuestions = [];
    this.dualEngineResult = null;
    this.currentScore = null;
    this.isInterviewActive = false;
    this.showResults = false;
    this.progressPercentage = 0;
    // reset guided
    this.guidedBasicActive = false;
    this.guidedList = [];
    this.guidedIndex = 0;
  }

  /**
   * Saltar pregunta (solo para preguntas opcionales)
   */
  skipQuestion() {
    if (!this.currentQuestion) return;
    
    // Solo permitir saltar preguntas de peso bajo
    if (this.currentQuestion.weight <= 4) {
      // Registrar evento SKIPPED en BFF (sin audio)
      const form = new FormData();
      form.append('questionId', this.currentQuestion.id);
      form.append('contextId', this.currentSession || 'unknown');
      form.append('skipped', 'true');
      // orderIndex no disponible en este flujo; se puede agregar si se usa guided flow
      const url = `${this.apiConfig.getBffUrl()}/v1/voice/evaluate`;
      this.http.post(url, form).subscribe({
        next: () => { if (this.guidedBasicActive) this.guidedIndex += 1; this.loadNextQuestion(); },
        error: () => { if (this.guidedBasicActive) this.guidedIndex += 1; this.loadNextQuestion(); }, // continuar flujo aunque falle persistencia
      });
    }
  }

  // ===== Guided helpers =====
  startGuidedBasic() {
    this.guidedList = ALL_AVI_QUESTIONS.filter(q => q.category === 'basic_info').slice(0, 6);
    this.totalQuestions = this.guidedList.length || 6;
    this.guidedIndex = 0;
    this.guidedBasicActive = true;
    // Cargar primera
    const q = this.guidedList[this.guidedIndex];
    if (q) {
      this.currentQuestion = q;
      this.currentResponse = '';
      this.questionStartTime = Date.now();
      this.resetStressIndicators();
    }
  }

  /**
   * Obtener clase CSS para nivel de riesgo
   */
  getRiskLevelClass(): string {
    if (!this.currentScore) return '';
    
    switch (this.currentScore.riskLevel) {
      case 'LOW': return 'risk-low';
      case 'MEDIUM': return 'risk-medium';
      case 'HIGH': return 'risk-high';
      case 'CRITICAL': return 'risk-critical';
      default: return '';
    }
  }

  /**
   * Obtener categorías únicas para mostrar scores
   */
  getCategoryScoreEntries(): Array<{category: string, score: number}> {
    if (!this.currentScore?.categoryScores) return [];
    
    return Object.entries(this.currentScore.categoryScores).map(([category, score]) => ({
      category: this.formatCategoryName(category),
      score: Math.round(score as number)
    }));
  }

  private formatCategoryName(category: string): string {
    const categoryNames: {[key: string]: string} = {
      'basic_info': 'Información Básica',
      'daily_operation': 'Operación Diaria',
      'operational_costs': 'Costos Operativos',
      'business_structure': 'Estructura del Negocio',
      'assets': 'Activos',
      'credit_history': 'Historial Crediticio',
      'payment_intention': 'Intención de Pago',
      'risk_assessment': 'Evaluación de Riesgo'
    };
    
    return categoryNames[category] || category;
  }

  /**
   * Formatear tiempo en minutos y segundos
   */
  formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  /**
   * Formatear mm:ss
   */
  formatTimeMMSS(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  /**
   * Iniciar temporizador de grabación (UI)
   */
  private startRecordingTimer() {
    this.recordingSeconds = 0;
    this.stopRecordingTimer();
    this.recordingTimerId = setInterval(() => {
      if (this.isRecording) {
        this.recordingSeconds++;
      }
    }, 1000);
  }

  /**
   * Detener temporizador de grabación (UI)
   */
  private stopRecordingTimer() {
    if (this.recordingTimerId) {
      clearInterval(this.recordingTimerId);
      this.recordingTimerId = null;
    }
  }

  /**
   * Atajos de teclado: flecha derecha para "Siguiente" cuando corresponde
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' && this.hasResultReady && this.isInterviewActive) {
      event.preventDefault();
      this.submitResponse();
    }
  }

  // ===== Audio ready indicator =====
  private audioReady: Record<string, boolean> = {};
  markAudioReady(questionId: string) {
    this.audioReady[questionId] = true;
  }
  isAudioReady(questionId: string | undefined | null): boolean {
    if (!questionId) return false;
    return !!this.audioReady[questionId];
  }

  // ===== Pills & Summary helpers =====
  private classifyResponse(r: AVIResponse): { questionId: string; status: 'clear' | 'review' | 'evasive'; label: string; reason: string } | null {
    const stress = r.stressIndicators?.length || 0;
    const coh = r.coherenceScore ?? 0.8;
    const text = (r.transcription || r.value || '').toLowerCase();

    // Heurística simple
    const hasStrongNegation = /(nunca|jam[aá]s|de ning[uú]n modo|neg[oó] tajantemente)/.test(text);
    const hasPartialAdmission = /(creo|tal vez|posible|podr[ií]a|quiz[aá]s)/.test(text);
    const evasiveLex = /(no s[eé]|no recuerdo|eso no aplica|prefiero no|no tengo ese dato)/.test(text);

    let status: 'clear'|'review'|'evasive' = 'review';
    let reason = '';
    let label = 'Revisar';

    if (coh >= 0.85 && stress <= 1 && !evasiveLex) {
      status = 'clear'; label = 'Claro'; reason = 'Respuesta consistente, baja tensión';
    } else if (hasStrongNegation || stress >= 3 || evasiveLex) {
      status = 'evasive'; label = 'Evasivo';
      reason = hasStrongNegation ? 'Negación tajante' : evasiveLex ? 'Lenguaje evasivo' : 'Alto nivel de estrés';
    } else {
      status = 'review'; label = 'Revisar';
      reason = stress >= 2 ? 'Demasiadas pausas/muletillas' : 'Coherencia moderada';
    }

    return { questionId: r.questionId, status, label, reason };
  }

  private computeFinalSummary() {
    const goMin = environment.avi?.thresholds?.conservative?.GO_MIN ?? 0.78;
    const nogoMax = environment.avi?.thresholds?.conservative?.NOGO_MAX ?? 0.55;
    const score01 = Math.max(0, Math.min(1, (this.currentScore?.totalScore || 0) / 1000));

    let decision: 'GO'|'REVIEW'|'NO-GO' = 'REVIEW';
    if (score01 >= goMin) decision = 'GO';
    else if (score01 <= nogoMax) decision = 'NO-GO';

    // Reglas correctivas: nervioso + admisión parcial + sin negación tajante ⇒ HIGH (no CRITICAL) → mover de NO-GO a REVIEW
    const latestText = (this.answeredQuestions[this.answeredQuestions.length - 1]?.transcription || '').toLowerCase();
    const anyNervioso = this.questionPills.some(p => /estr[eé]s|pausa|muletillas/.test(p.reason));
    const partialAdmission = /(creo|tal vez|posible|podr[ií]a|quiz[aá]s)/.test(latestText);
    const strongNeg = /(nunca|jam[aá]s|neg[oó] tajantemente)/.test(latestText);
    if (decision === 'NO-GO' && anyNervioso && partialAdmission && !strongNeg) {
      decision = 'REVIEW';
    }

    // Top 3 flags desde pills
    const freq = new Map<string, number>();
    this.questionPills.forEach(p => {
      const key = p.reason;
      freq.set(key, (freq.get(key) || 0) + 1);
    });
    const top = Array.from(freq.entries()).sort((a,b)=> b[1]-a[1]).slice(0,3).map(([k])=>k);

    this.finalDecision = decision;
    this.finalFlags = top;
  }
}

// removed by clean-audit