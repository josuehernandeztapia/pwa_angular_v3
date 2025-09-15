import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AviQuestionGeneratorService, MicroLocalQuestion } from '../../../services/avi-question-generator.service';
import { AviSimpleConfigService, SimpleAviQuestion } from '../../../services/avi-simple-config.service';
import { VoiceFraudAnalysis, VoiceFraudDetectionService, VoiceMetrics } from '../../../services/voice-fraud-detection.service';
import { VoiceValidationService } from '../../../services/voice-validation.service';

// ✅ NUEVO: Voice Evaluation UI Types
interface QuestionResult {
  questionId: string;
  decision: 'GO' | 'NO-GO' | 'REVIEW';
  icon: string;
  message: string;
  flags: string[];
  score: number;
  timestamp: number;
}

interface ExtractedEntity {
  type: 'nombre' | 'rfc' | 'direccion' | 'telefono';
  value: string;
  confidence: number;
  status: 'pending' | 'extracted' | 'validated';
}

interface AviSessionData {
  clientId: string;
  municipality: 'aguascalientes' | 'edomex';
  transportQuestions: SimpleAviQuestion[];
  microLocalQuestions: MicroLocalQuestion[];
  currentQuestionIndex: number;
  responses: { questionId: string; response: string; score: number }[];
  overallRiskScore: number;
  fraudAnalysis?: VoiceFraudAnalysis;
  status: 'initializing' | 'asking_questions' | 'micro_local_questions' | 'completed' | 'failed';
}

@Component({
  selector: 'app-avi-verification-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avi-modal-overlay" (click)="onOverlayClick($event)" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descId">
      <div class="avi-modal-container" (click)="$event.stopPropagation()" tabindex="-1" (keydown)="onKeydown($event)">
        
        <!-- Header -->
        <div class="avi-header">
          <div class="avi-title">
            <span class="avi-icon">🎤</span>
            <h2 [attr.id]="titleId">Verificación Inteligente AVI</h2>
          </div>
          <button class="avi-close-btn" (click)="closeModal()">✕</button>
        </div>

        <!-- Main Content -->
        <div class="avi-content">
          
          <!-- Recording Status -->
          <div class="recording-status" [class.recording-active]="isRecording">
            <div class="recording-indicator">
              <span *ngIf="isRecording" class="recording-dot">🔴</span>
              <span class="recording-text">
                {{ isRecording ? 'GRABANDO...' : (sessionData.status === 'completed' ? 'VERIFICACIÓN COMPLETADA' : 'LISTO PARA GRABAR') }}
              </span>
            </div>
          </div>

          <!-- Microphone Button -->
          <div class="mic-section" [attr.id]="descId">
            <button 
              #micButton
              class="mic-button" 
              [class.mic-recording]="isRecording"
              [disabled]="sessionData.status === 'completed'"
              (click)="toggleRecording()">
              <span class="mic-icon">🎤</span>
            </button>
            
            <div class="mic-instructions">
              <p *ngIf="sessionData.status === 'initializing'">
                Preparando verificación...
              </p>
              <p *ngIf="sessionData.status === 'asking_questions' && getCurrentTransportQuestion()">
                <strong>Pregunta {{ sessionData.currentQuestionIndex + 1 }} de {{ sessionData.transportQuestions.length }}:</strong><br>
                {{ getCurrentTransportQuestion()?.text }}
              </p>
              <p *ngIf="sessionData.status === 'micro_local_questions' && currentQuestion">
                <strong>Pregunta de verificación local:</strong><br>
                {{ currentQuestion.question }}
              </p>
              <p *ngIf="sessionData.status === 'completed'" class="success-message">
                ✨ Verificación completada exitosamente
              </p>
            </div>
          </div>

          <!-- Real-time Transcription -->
          <div class="transcription-section" *ngIf="currentTranscript">
            <h3>📝 Transcripción en vivo:</h3>
            <div class="transcript-box">
              {{ currentTranscript }}
            </div>
          </div>

          <!-- ✅ NUEVO: Voice Evaluation Results (Semáforo Display) -->
          <div class="voice-evaluation-section" *ngIf="questionResults.length > 0">
            <h3>🚦 Resultados de Análisis de Voz:</h3>
            <div class="question-results-grid">
              <div class="question-result-card" 
                   *ngFor="let result of questionResults; trackBy: trackByQuestionId"
                   [class]="'result-' + result.decision.toLowerCase().replace('-', '')">
                
                <!-- Semáforo Icon -->
                <div class="semaforo-indicator" [attr.aria-label]="result.decision">
                  <span class="decision-icon">{{ result.icon }}</span>
                </div>
                
                <!-- Question Info -->
                <div class="question-info">
                  <div class="question-id">{{ result.questionId }}</div>
                  <div class="decision-status">{{ result.decision }}</div>
                  <div class="confidence-score">Score: {{ result.score.toFixed(1) }}/10</div>
                </div>
                
                <!-- Analysis Flags -->
                <div class="analysis-flags" *ngIf="result.flags.length > 0">
                  <span class="flag-item" *ngFor="let flag of result.flags">{{ flag }}</span>
                </div>
              </div>
            </div>
            
            <!-- Analysis Loading State -->
            <div class="analysis-loading" *ngIf="isAnalyzing">
              <div class="loading-spinner"></div>
              <span class="loading-text">Analizando respuesta de voz...</span>
            </div>
          </div>

          <!-- ✅ NUEVO: Final Resilience Summary -->
          <div class="resilience-summary-section" *ngIf="resilienceSummary && sessionData.status === 'completed'">
            <h3>💪 Resumen de Resiliencia:</h3>
            <div class="resilience-overview">
              <div class="resilience-score-display">
                <div class="overall-score">
                  <span class="score-label">Puntuación Global:</span>
                  <span class="score-value" [class]="'score-' + getScoreLevel(resilienceSummary.overallScore)">
                    {{ resilienceSummary.overallScore.toFixed(1) }}/10
                  </span>
                </div>
                <div class="resilience-level">
                  {{ getResilienceLevel(resilienceSummary.overallScore) }}
                </div>
              </div>
              
              <!-- Category Breakdown -->
              <div class="category-breakdown">
                <div class="category-item">
                  <span class="category-label">Estabilidad Financiera:</span>
                  <span class="category-score">{{ resilienceSummary.categoryScores.financial_stability.toFixed(1) }}/10</span>
                </div>
                <div class="category-item">
                  <span class="category-label">Adaptabilidad Operacional:</span>
                  <span class="category-score">{{ resilienceSummary.categoryScores.operational_adaptability.toFixed(1) }}/10</span>
                </div>
                <div class="category-item">
                  <span class="category-label">Conocimiento del Mercado:</span>
                  <span class="category-score">{{ resilienceSummary.categoryScores.market_knowledge.toFixed(1) }}/10</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Progress Display -->
          <div class="progress-info-section" *ngIf="sessionData.responses.length > 0">
            <h3>📊 Progreso de Verificación:</h3>
            <div class="progress-details">
              <div class="progress-item">
                <span class="progress-label">Preguntas Respondidas:</span>
                <span class="progress-value">{{ sessionData.responses.length }}</span>
              </div>
              <div class="progress-item">
                <span class="progress-label">Preguntas Restantes:</span>
                <span class="progress-value">
                  {{ (sessionData.transportQuestions.length + sessionData.microLocalQuestions.length) - sessionData.responses.length }}
                </span>
              </div>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" [style.width.%]="getProgressPercentage()"></div>
            </div>
          </div>

          <!-- Success Message (Client-Friendly) -->
          <div class="completion-section" *ngIf="sessionData.status === 'completed'">
            <div class="completion-message">
              <div class="success-icon">✨</div>
              <h3>¡Verificación Completada!</h3>
              <p class="completion-text">
                Hemos procesado exitosamente su información de verificación.
                Su puntuación AVI ha sido calculada y está lista para revisión.
              </p>
              <div class="score-display">
                <span class="score-label">Puntuación AVI:</span>
                <span class="score-value">{{ getClientFriendlyScore() }}/100</span>
              </div>
            </div>
          </div>

          <!-- Progress Indicator -->
          <div class="progress-section">
            <div class="progress-steps">
              <div class="progress-step" 
                   [class.step-active]="sessionData.status === 'asking_questions'"
                   [class.step-completed]="isStepCompleted('asking_questions')">
                <span class="step-number">1</span>
                <span class="step-label">Preguntas de Transporte</span>
              </div>
              <div class="progress-step" 
                   [class.step-active]="sessionData.status === 'micro_local_questions'"
                   [class.step-completed]="isStepCompleted('micro_local_questions')">
                <span class="step-number">2</span>
                <span class="step-label">Verificación Local</span>
              </div>
              <div class="progress-step" 
                   [class.step-active]="sessionData.status === 'completed'"
                   [class.step-completed]="sessionData.status === 'completed'">
                <span class="step-number">3</span>
                <span class="step-label">Completado</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="avi-footer">
          <button class="btn-secondary" (click)="closeModal()" [disabled]="isRecording">
            Cancelar
          </button>
          <button 
            *ngIf="sessionData.status === 'completed'" 
            class="btn-primary" 
            (click)="completeVerification()">
            Finalizar Verificación
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './avi-verification-modal.component.scss',
})
export class AviVerificationModalComponent implements OnInit, OnDestroy {
  @Input() clientId: string = '';
  @Input() municipality: 'aguascalientes' | 'edomex' = 'aguascalientes';
  @Input() visible: boolean = true;
  @Output() completed = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('micButton') micButtonRef!: ElementRef;

  private destroy$ = new Subject<void>();
  titleId: string = `avi_title_${Math.random().toString(36).slice(2)}`;
  descId: string = `avi_desc_${Math.random().toString(36).slice(2)}`;
  private lastFocusedElement: HTMLElement | null = null;
  
  isRecording = false;
  currentTranscript = '';
  currentQuestion: MicroLocalQuestion | null = null;
  recordingStartTime = 0;
  
  // ✅ NUEVO: Voice Evaluation UI State
  private _questionResults: { [questionId: string]: QuestionResult } = {};
  isAnalyzing = false;
  analysisMessage = 'Analizando respuesta...';
  showFinalSummary = false;
  finalSummary: any = null;

  sessionData: AviSessionData = {
    clientId: '',
    municipality: 'aguascalientes',
    transportQuestions: [],
    microLocalQuestions: [],
    currentQuestionIndex: 0,
    responses: [],
    overallRiskScore: 0,
    status: 'initializing'
  };

  constructor(
    private voiceValidation: VoiceValidationService,
    private questionGenerator: AviQuestionGeneratorService,
    private aviConfigService: AviSimpleConfigService,
    private voiceFraudDetection: VoiceFraudDetectionService
  ) {}

  ngOnInit(): void {
    this.lastFocusedElement = document.activeElement as HTMLElement;
    this.initializeAviSession();
    setTimeout(() => this.focusFirstElementInModal(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.isRecording) {
      this.stopRecording();
    }
    this.restoreFocusAfterModal();
  }

  private async initializeAviSession(): Promise<void> {
    this.sessionData.clientId = this.clientId;
    this.sessionData.municipality = this.municipality;
    
    // Initialize fraud detection session
    this.voiceFraudDetection.initializeSession(this.clientId);
    
    // Load transport-specific questions from config
    const config = this.aviConfigService.getConfig();
    this.sessionData.transportQuestions = this.aviConfigService.getActiveQuestions();
    
    // Load micro-local questions
    const microLocalCount = config.microLocalQuestions || 2;
    this.questionGenerator.getRandomMicroLocalQuestions(this.municipality, microLocalCount)
      .pipe(takeUntil(this.destroy$))
      .subscribe((questions: MicroLocalQuestion[]) => {
        this.sessionData.microLocalQuestions = questions;
        if (this.sessionData.transportQuestions.length > 0) {
          this.sessionData.status = 'asking_questions';
        } else {
          this.sessionData.status = 'micro_local_questions';
          this.currentQuestion = this.sessionData.microLocalQuestions[0] || null;
        }
      });

    // Check if we need to refresh questions from LLM
    this.questionGenerator.refreshQuestionsFromLLM(this.municipality)
      .then(refreshed => {
        if (refreshed) {
          console.log(`Micro-local questions refreshed for ${this.municipality}`);
        }
      });
  }

  toggleRecording(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  private startRecording(): void {
    this.isRecording = true;
    this.currentTranscript = '';
    this.recordingStartTime = Date.now();

    // Start voice recording
    this.voiceValidation.startRecording();
  }

  private async stopRecording(): Promise<void> {
    this.isRecording = false;
    
    try {
      this.voiceValidation.stopRecording();
      const result = await this.voiceValidation.getValidationResult(this.sessionData.clientId) as any;
      if (!result) return;
      
      // ✅ NUEVO: Start voice evaluation
      this.isAnalyzing = true;
      this.analysisMessage = 'Analizando respuesta...';
      
      const currentQuestionId = this.getCurrentQuestionId();
      
      if (currentQuestionId && result.audioBlob) {
        try {
          // ✅ NUEVO: Evaluate voice
          const voiceEvaluation = await this.voiceValidation.evaluateAudio(
            result.audioBlob,
            currentQuestionId,
            this.sessionData.clientId,
            this.municipality
          );
          
          // ✅ NUEVO: Show question result
          this.showQuestionResult(voiceEvaluation);
          
        } catch (voiceError) {
          console.warn('Voice evaluation failed, continuing with transcript only:', voiceError);
        }
      }
      
      // Continue with original processing
      this.processVoiceResult(result);
      
    } catch (error) {
      console.error('Stop recording error:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  private processAudioStream(audioData: any): void {
    // Process real-time transcription
    if (audioData.transcript) {
      this.currentTranscript = audioData.transcript;
    }
  }

  private processVoiceResult(result: any): void {
    // Process based on current status
    if (this.sessionData.status === 'asking_questions') {
      this.processTransportQuestionResponse(result);
    } else if (this.sessionData.status === 'micro_local_questions') {
      this.processMicroLocalResponse(result);
    }
  }

  private processTransportQuestionResponse(result: any): void {
    const currentQuestion = this.getCurrentTransportQuestion();
    if (!currentQuestion) return;

    // Calculate response timing
    const responseTime = (Date.now() - this.recordingStartTime) / 1000; // seconds
    const duration = result.duration || responseTime; // Use result duration if available

    // Create voice metrics for fraud detection
    const voiceMetrics: VoiceMetrics = {
      transcript: result.transcript,
      audioBlob: result.audioBlob,
      duration: duration,
      questionId: currentQuestion.id,
      responseTime: responseTime
    };

    // Add voice metrics to fraud detection system
    this.voiceFraudDetection.addVoiceResponse(this.sessionData.clientId, voiceMetrics);

    // Record the response
    const response = {
      questionId: currentQuestion.id,
      response: result.transcript,
      score: result.compliance_score || this.scoreTransportResponse(currentQuestion, result.transcript)
    };

    this.sessionData.responses.push(response);

    // Move to next question or proceed to micro-local
    if (this.sessionData.currentQuestionIndex < this.sessionData.transportQuestions.length - 1) {
      this.sessionData.currentQuestionIndex++;
    } else {
      this.proceedToMicroLocalQuestions();
    }
  }

  private scoreTransportResponse(question: SimpleAviQuestion, response: string): number {
    // Simple scoring based on question category and response content
    const responseText = response.toLowerCase();
    
    switch (question.category) {
      case 'personal':
        // Personal questions get scored based on completeness
        return responseText.length > 10 ? 80 : 50;
      
      case 'operation':
        // Operation questions look for numeric values
        const hasNumbers = /\d+/.test(responseText);
        return hasNumbers ? 85 : 60;
      
      case 'business':
        // Business questions look for ownership/management indicators
        const businessWords = ['dueño', 'propio', 'administra', 'manejo'];
        const hasBusinessTerms = businessWords.some(word => responseText.includes(word));
        return hasBusinessTerms ? 90 : 70;
      
      case 'vehicle':
        // Vehicle questions look for specific models/types
        const vehicleWords = ['nissan', 'ford', 'chevrolet', 'gnv', 'glp', 'gasolina'];
        const hasVehicleTerms = vehicleWords.some(word => responseText.includes(word));
        return hasVehicleTerms ? 85 : 65;
      
      case 'resilience':
        // Resilience questions look for adaptive strategies and operational flexibility
        const adaptabilityWords = ['cambio', 'adapto', 'busco', 'alternativa', 'estrategia', 'siempre', 'tengo', 'planifico'];
        const passiveWords = ['no puedo', 'imposible', 'no hago nada', 'me afecta mucho', 'no tengo'];
        const proactiveWords = ['preveo', 'anticipo', 'preparo', 'diversifico', 'multiple'];
        
        const hasAdaptability = adaptabilityWords.some(word => responseText.includes(word));
        const hasPassivity = passiveWords.some(word => responseText.includes(word));
        const hasProactivity = proactiveWords.some(word => responseText.includes(word));
        
        if (hasProactivity) return 95; // Highly resilient - proactive planning
        if (hasAdaptability && !hasPassivity) return 85; // Good resilience - adaptive
        if (hasPassivity) return 30; // Poor resilience - passive response
        return 60; // Neutral resilience
      
      default:
        return 70;
    }
  }

  private proceedToMicroLocalQuestions(): void {
    this.sessionData.status = 'micro_local_questions';
    this.currentQuestion = this.sessionData.microLocalQuestions[0] || null;
  }

  private processMicroLocalResponse(result: any): void {
    if (!this.currentQuestion) return;

    // Calculate response timing
    const responseTime = (Date.now() - this.recordingStartTime) / 1000; // seconds
    const duration = result.duration || responseTime; // Use result duration if available

    // Create voice metrics for fraud detection
    const voiceMetrics: VoiceMetrics = {
      transcript: result.transcript,
      audioBlob: result.audioBlob,
      duration: duration,
      questionId: this.currentQuestion.id,
      responseTime: responseTime
    };

    // Add voice metrics to fraud detection system
    this.voiceFraudDetection.addVoiceResponse(this.sessionData.clientId, voiceMetrics);

    // Record the response
    const response = {
      questionId: this.currentQuestion.id,
      response: result.transcript,
      score: result.compliance_score || 0
    };

    this.sessionData.responses.push(response);

    // Move to next question or complete
    const currentIndex = this.sessionData.microLocalQuestions
      .findIndex(q => q.id === this.currentQuestion!.id);
    
    if (currentIndex < this.sessionData.microLocalQuestions.length - 1) {
      this.currentQuestion = this.sessionData.microLocalQuestions[currentIndex + 1];
    } else {
      this.completeAviSession();
    }
  }

  private completeAviSession(): void {
    // Perform fraud analysis on voice patterns
    this.sessionData.fraudAnalysis = this.voiceFraudDetection.analyzeFraudPatterns(this.sessionData.clientId);
    
    // Calculate AVI score using the configured service with fraud analysis
    const responses: { [questionId: string]: any } = {};
    this.sessionData.responses.forEach(r => {
      responses[r.questionId] = r.response;
    });
    
    const aviScore = this.aviConfigService.calculateAviScore(responses, this.sessionData.fraudAnalysis);
    this.sessionData.overallRiskScore = Math.max(0, 100 - aviScore); // Convert to risk score
    this.sessionData.status = 'completed';
    this.currentQuestion = null;
    
    // ✅ NUEVO: Generate final resilience summary
    this.showFinalResilienceSummary();
  }

  completeVerification(): void {
    // Calculate final HASE score with fraud analysis
    const responses: { [questionId: string]: any } = {};
    this.sessionData.responses.forEach(r => {
      responses[r.questionId] = r.response;
    });
    
    const haseScore = this.aviConfigService.calculateHaseScore(responses, this.sessionData.fraudAnalysis);
    
    // Clean up fraud detection session
    this.voiceFraudDetection.clearSession(this.sessionData.clientId);
    
    // Emit completion with all data including fraud analysis
    this.completed.emit({
      clientId: this.sessionData.clientId,
      transportResponses: this.sessionData.responses,
      microLocalResponses: this.sessionData.responses.filter(r => 
        this.sessionData.microLocalQuestions.some(q => q.id === r.questionId)
      ),
      aviScore: haseScore.avi_score,
      haseScore: haseScore,
      riskScore: this.sessionData.overallRiskScore,
      fraudAnalysis: this.sessionData.fraudAnalysis,
      status: 'completed'
    });
  }

  // Helper method to get current transport question
  getCurrentTransportQuestion(): SimpleAviQuestion | null {
    if (this.sessionData.currentQuestionIndex < this.sessionData.transportQuestions.length) {
      return this.sessionData.transportQuestions[this.sessionData.currentQuestionIndex];
    }
    return null;
  }

  closeModal(): void {
    if (this.isRecording) {
      this.stopRecording();
    }
    this.closed.emit();
    this.restoreFocusAfterModal();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocusInModal(event);
    }
  }

  private focusFirstElementInModal(): void {
    const modal = document.querySelector('.avi-modal-container') as HTMLElement | null;
    if (!modal) return;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] || modal;
    first.focus();
  }

  private trapFocusInModal(event: KeyboardEvent): void {
    const modal = document.querySelector('.avi-modal-container') as HTMLElement | null;
    if (!modal) return;
    const focusable = Array.from(modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement;
    if (event.shiftKey) {
      if (active === first) {
        last.focus();
        event.preventDefault();
      }
    } else {
      if (active === last) {
        first.focus();
        event.preventDefault();
      }
    }
  }

  private restoreFocusAfterModal(): void {
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  }

  getEntityLabel(type: string): string {
    const labels = {
      'nombre': 'Nombre',
      'rfc': 'RFC',
      'direccion': 'Dirección',
      'telefono': 'Teléfono'
    };
    return labels[type as keyof typeof labels] || type;
  }

  isStepCompleted(step: string): boolean {
    const stepOrder = ['asking_questions', 'micro_local_questions', 'completed'];
    const currentIndex = stepOrder.indexOf(this.sessionData.status);
    const stepIndex = stepOrder.indexOf(step);
    return currentIndex > stepIndex;
  }

  // Progress tracking helper
  getProgressPercentage(): number {
    const totalQuestions = this.sessionData.transportQuestions.length + this.sessionData.microLocalQuestions.length;
    const answeredQuestions = this.sessionData.responses.length;
    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  }

  getFraudScoreClass(): string {
    if (!this.sessionData.fraudAnalysis) return 'fraud-score-low';
    
    const score = this.sessionData.fraudAnalysis.overallFraudScore;
    if (score > 70) return 'fraud-score-high';
    if (score > 50) return 'fraud-score-medium';
    if (score > 30) return 'fraud-score-low';
    return 'fraud-score-minimal';
  }

  // Client-friendly score that doesn't reveal fraud analysis
  getClientFriendlyScore(): number {
    if (!this.sessionData.fraudAnalysis) return 0;
    
    // Calculate a simple score based on responses without revealing fraud details
    const responses: { [questionId: string]: any } = {};
    this.sessionData.responses.forEach(r => {
      responses[r.questionId] = r.response;
    });
    
    // Use the original AVI score calculation (before fraud penalty)
    const originalScore = this.aviConfigService.calculateAviScore(responses); // Without fraud analysis
    return Math.round((originalScore / this.aviConfigService.getConfig().haseContribution) * 100);
  }

  // ✅ NUEVO: Voice Evaluation UI Methods
  private getCurrentQuestionId(): string | null {
    if (this.sessionData.status === 'asking_questions') {
      const currentQuestion = this.getCurrentTransportQuestion();
      return currentQuestion?.id || null;
    } else if (this.sessionData.status === 'micro_local_questions' && this.currentQuestion) {
      return this.currentQuestion.id;
    }
    return null;
  }

  private showQuestionResult(evaluation: any): void {
    console.log(`🎯 Showing result for question: ${evaluation.questionId}`, evaluation);
    
    this._questionResults[evaluation.questionId] = {
      questionId: evaluation.questionId,
      decision: evaluation.decision,
      icon: this.getDecisionIcon(evaluation.decision),
      message: this.getDecisionMessage(evaluation),
      flags: evaluation.flags || [],
      score: evaluation.voiceScore,
      timestamp: Date.now()
    };
  }

  private getDecisionIcon(decision: string): string {
    switch(decision) {
      case 'GO': return '✅';
      case 'REVIEW': return '⚠️';  
      case 'NO-GO': return '❌';
      default: return '🔍';
    }
  }

  private getDecisionMessage(evaluation: any): string {
    if (evaluation.fallback) {
      return evaluation.message || 'Análisis básico aplicado';
    }
    
    switch(evaluation.decision) {
      case 'GO': return 'Respuesta clara y confiable';
      case 'REVIEW': return 'Requiere revisión manual';
      case 'NO-GO': return 'Respuesta evasiva detectada';
      default: return 'Procesando...';
    }
  }

  getQuestionNumber(questionId: string): number {
    // Find question index for display
    const allQuestions = [
      ...this.sessionData.transportQuestions,
      ...this.sessionData.microLocalQuestions
    ];
    
    const index = allQuestions.findIndex(q => q.id === questionId);
    return index >= 0 ? index + 1 : 0;
  }

  showFinalResilienceSummary(): void {
    try {
      this.finalSummary = this.voiceValidation.aggregateResilience();
      this.showFinalSummary = true;
      
      console.log('📊 Final resilience summary:', this.finalSummary);
      
    } catch (error) {
      console.error('Failed to generate resilience summary:', error);
      this.showFinalSummary = false;
    }
  }

  getFinalScoreClass(): string {
    if (!this.finalSummary) return '';
    
    const score = this.finalSummary.voiceResilienceScore;
    if (score >= 0.75) return 'score-excellent';
    if (score >= 0.6) return 'score-good'; 
    if (score >= 0.4) return 'score-fair';
    return 'score-poor';
  }

  // ✅ NUEVO: Helper methods for template

  trackByQuestionId(index: number, result: QuestionResult): string {
    return result.questionId;
  }

  get questionResults(): QuestionResult[] {
    return Object.values(this._questionResults);
  }

  get resilienceSummary(): any {
    return this.finalSummary;
  }

  getScoreLevel(score: number): string {
    if (score >= 7.5) return 'high';
    if (score >= 5.0) return 'medium';
    return 'low';
  }

  getResilienceLevel(score: number): string {
    if (score >= 8.5) return 'Excelente';
    if (score >= 7.0) return 'Muy Buena';
    if (score >= 5.5) return 'Buena';
    if (score >= 4.0) return 'Regular';
    return 'Necesita Mejora';
  }
}