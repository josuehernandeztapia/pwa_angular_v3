import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { AVIService } from '../../services/avi.service';
import { AVIDualEngineService, DualEngineResult } from '../../services/avi-dual-engine.service';
import { OpenAIWhisperService, AVIVoiceResponse } from '../../services/openai-whisper.service';
import { 
  AVIQuestionEnhanced, 
  AVIResponse, 
  AVIScore, 
  VoiceAnalysis,
  AVICategory 
} from '../../models/types';

@Component({
  selector: 'app-avi-interview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avi-interview.component.html',
  styleUrls: ['./avi-interview.component.scss']
})
export class AVIInterviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estado de la entrevista
  currentSession: string | null = null;
  currentQuestion: AVIQuestionEnhanced | null = null;
  currentResponse = '';
  questionStartTime = 0;
  isRecording = false;
  
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
  
  // Mock voice analysis (en producción sería real)
  private voiceAnalysisEnabled = true;
  private stressIndicators = new BehaviorSubject<string[]>([]);

  constructor(
    private aviService: AVIService,
    private dualEngine: AVIDualEngineService,
    private whisperService: OpenAIWhisperService
  ) {}

  ngOnInit() {
    this.initializeComponent();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent() {
    // Suscribirse a cambios en respuestas para actualizar progreso
    this.aviService.getCurrentResponses()
      .pipe(takeUntil(this.destroy$))
      .subscribe(responses => {
        this.answeredQuestions = responses;
        this.updateProgress();
      });
  }

  /**
   * Iniciar nueva entrevista AVI
   */
  startInterview() {
    this.aviService.startSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe(sessionId => {
        this.currentSession = sessionId;
        this.isInterviewActive = true;
        this.showResults = false;
        this.answeredQuestions = [];
        this.loadNextQuestion();
      });
  }

  /**
   * Cargar siguiente pregunta
   */
  private loadNextQuestion() {
    this.aviService.getNextQuestion()
      .pipe(takeUntil(this.destroy$))
      .subscribe(question => {
        if (question) {
          this.currentQuestion = question;
          this.currentResponse = '';
          this.questionStartTime = Date.now();
          this.resetStressIndicators();
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

    this.aviService.submitResponse(aviResponse)
      .pipe(takeUntil(this.destroy$))
      .subscribe(success => {
        if (success) {
          this.isProcessingResponse = false;
          this.loadNextQuestion();
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
        switchMap(result => result), // Unwrap Promise
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        this.dualEngineResult = result;
        this.currentScore = result.consolidatedScore;
        this.isAnalyzing = false;
        this.showResults = true;
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
    
    console.log('🎤 Iniciando grabación real con Whisper');
    this.isRecording = true;
    
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
          console.log('Grabación iniciada, esperando...');
          // Guardar la función de stop para uso manual
          if (response.stopRecording) {
            this.stopRealVoiceRecording = response.stopRecording;
          }
        }
      },
      error: (error) => {
        console.error('Error en grabación:', error);
        this.isRecording = false;
        // Fallback a método simulado
        this.startMockVoiceRecording();
      }
    });
  }

  private async stopRealVoiceRecording() {
    this.isRecording = false;
    console.log('🛑 Deteniendo grabación');
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
  }

  /**
   * Fallback: simulación de grabación (para desarrollo)
   */
  private startMockVoiceRecording() {
    console.log('🎭 Modo simulación - usando datos mock');
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
  }

  /**
   * Saltar pregunta (solo para preguntas opcionales)
   */
  skipQuestion() {
    if (!this.currentQuestion) return;
    
    // Solo permitir saltar preguntas de peso bajo
    if (this.currentQuestion.weight <= 4) {
      this.loadNextQuestion();
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
}