import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { VoiceValidationService } from '../../../services/voice-validation.service';

interface VoiceRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  hasRecording: boolean;
  isProcessing: boolean;
  error: string | null;
}

@Component({
  selector: 'app-voice-recorder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="voice-recorder" [class.recording]="state.isRecording" [class.processing]="state.isProcessing">
      
      <!-- Interview Guide (if provided) -->
      <div class="interview-guide" *ngIf="showGuide && interviewGuide">
        <div class="guide-header">
          <span class="guide-icon">📋</span>
          <span class="guide-title">Guía de Entrevista</span>
          <button class="btn-toggle-guide" (click)="toggleGuide()">
            {{ guideExpanded ? '▼' : '▶' }}
          </button>
        </div>
        
        <div class="guide-content" *ngIf="guideExpanded">
          <div class="introduction">{{ interviewGuide.introduction }}</div>
          
          <div class="required-questions">
            <div class="section-title">Preguntas Obligatorias:</div>
            <div 
              class="question-item" 
              *ngFor="let question of interviewGuide.questions"
              [class.asked]="askedQuestions.includes(question.id)"
              [class.mandatory]="question.mandatory"
            >
              <span class="question-status">
                {{ askedQuestions.includes(question.id) ? '✅' : (question.mandatory ? '🔴' : '🟡') }}
              </span>
              <span class="question-text">{{ question.text }}</span>
              <span class="question-category">{{ getCategoryLabel(question.category) }}</span>
            </div>
          </div>
          
          <div class="interview-tips">
            <div class="section-title">Tips:</div>
            <ul>
              <li *ngFor="let tip of interviewGuide.tips">{{ tip }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Recording Controls -->
      <div class="recorder-controls">
        <!-- Status Display -->
        <div class="recorder-status">
          <div class="status-indicator">
            <span class="status-dot" [class.active]="state.isRecording"></span>
            <span class="status-text">
              {{ getStatusText() }}
            </span>
          </div>
          
          <div class="duration" *ngIf="state.duration > 0">
            {{ formatDuration(state.duration) }}
          </div>
        </div>

        <!-- Main Controls -->
        <div class="main-controls">
          <button 
            class="btn-record" 
            [class.recording]="state.isRecording"
            [disabled]="state.isProcessing"
            (click)="toggleRecording()"
          >
            <span class="btn-icon">
              {{ state.isRecording ? '⏹️' : '🎙️' }}
            </span>
            <span class="btn-text">
              {{ state.isRecording ? 'Detener' : 'Iniciar Entrevista' }}
            </span>
          </button>

          <button 
            class="btn-reset" 
            *ngIf="state.hasRecording && !state.isRecording && !state.isProcessing"
            (click)="resetRecording()"
          >
            🗑️ Nueva Grabación
          </button>
        </div>

        <!-- Processing Status -->
        <div class="processing-status" *ngIf="state.isProcessing">
          <div class="processing-spinner"></div>
          <div class="processing-text">
            Procesando audio y validando entrevista...
          </div>
        </div>

        <!-- Error Display -->
        <div class="error-display" *ngIf="state.error">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{{ state.error }}</span>
          <button class="btn-dismiss-error" (click)="dismissError()">✕</button>
        </div>
      </div>

      <!-- Live Feedback (during recording) -->
      <div class="live-feedback" *ngIf="state.isRecording && showLiveFeedback">
        <div class="feedback-header">
          <span class="feedback-icon">🎯</span>
          <span class="feedback-title">Progreso de Entrevista</span>
        </div>
        
        <div class="progress-stats">
          <div class="stat">
            <span class="stat-value">{{ getCompletedQuestionsCount() }}</span>
            <span class="stat-label">/ {{ getTotalQuestionsCount() }} preguntas</span>
          </div>
          
          <div class="stat">
            <span class="stat-value">{{ getMandatoryCompletedCount() }}</span>
            <span class="stat-label">/ {{ getMandatoryQuestionsCount() }} obligatorias</span>
          </div>
        </div>

        <div class="next-question" *ngIf="getNextQuestion() as nextQ">
          <div class="next-label">Siguiente pregunta obligatoria:</div>
          <div class="next-text">{{ nextQ.text }}</div>
        </div>
      </div>

      <!-- Results Preview (after processing) -->
      <div class="results-preview" *ngIf="validationResult && !state.isProcessing">
        <div class="results-header">
          <span class="results-icon">📊</span>
          <span class="results-title">Resultado de Validación</span>
        </div>
        
        <div class="compliance-score">
          <div class="score-circle" [style.border-color]="getComplianceColor(validationResult.compliance_score)">
            <span class="score-value">{{ validationResult.compliance_score }}</span>
            <span class="score-label">%</span>
          </div>
          <div class="score-text">Cumplimiento</div>
        </div>

        <div class="validation-summary">
          <div class="summary-item" [class.success]="validationResult.questions_missing.length === 0">
            <span class="item-icon">{{ validationResult.questions_missing.length === 0 ? '✅' : '❌' }}</span>
            <span class="item-text">
              {{ validationResult.questions_missing.length === 0 ? 'Todas las preguntas realizadas' : validationResult.questions_missing.length + ' preguntas faltantes' }}
            </span>
          </div>
          
          <div class="summary-item" [class.warning]="validationResult.risk_flags.length > 0">
            <span class="item-icon">{{ validationResult.risk_flags.length === 0 ? '✅' : '⚠️' }}</span>
            <span class="item-text">
              {{ validationResult.risk_flags.length === 0 ? 'Sin alertas de riesgo' : validationResult.risk_flags.length + ' alertas detectadas' }}
            </span>
          </div>

          <div class="summary-item">
            <span class="item-icon">🎯</span>
            <span class="item-text">
              Coherencia: {{ validationResult.coherence_analysis.overall_score }}%
            </span>
          </div>
        </div>

        <div class="results-actions">
          <button class="btn-view-details" (click)="viewDetailedResults()">
            Ver Detalles Completos
          </button>
          
          <button class="btn-approve" 
            *ngIf="validationResult.compliance_score >= 70"
            (click)="approveInterview()"
          >
            ✅ Aprobar Entrevista
          </button>
          
          <button class="btn-retry" 
            *ngIf="validationResult.compliance_score < 70"
            (click)="retryInterview()"
          >
            🔄 Repetir Entrevista
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .voice-recorder {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .voice-recorder.recording {
      border-color: #ef4444;
      background: linear-gradient(135deg, #fef2f2, #ffffff);
    }

    .voice-recorder.processing {
      border-color: #3b82f6;
      background: linear-gradient(135deg, #eff6ff, #ffffff);
    }

    /* Interview Guide Styles */
    .interview-guide {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }

    .guide-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: #334155;
      color: white;
      cursor: pointer;
    }

    .guide-icon {
      font-size: 1.2rem;
      margin-right: 8px;
    }

    .guide-title {
      flex: 1;
      font-weight: 600;
    }

    .btn-toggle-guide {
      background: none;
      border: none;
      color: white;
      font-size: 1rem;
      cursor: pointer;
    }

    .guide-content {
      padding: 16px;
    }

    .introduction {
      background: #dbeafe;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      border-left: 4px solid #3b82f6;
    }

    .section-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
      margin-top: 16px;
    }

    .question-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 4px;
      transition: background-color 0.2s;
    }

    .question-item.asked {
      background: #dcfce7;
      border-left: 3px solid #22c55e;
    }

    .question-item.mandatory:not(.asked) {
      background: #fef2f2;
      border-left: 3px solid #ef4444;
    }

    .question-status {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .question-text {
      flex: 1;
      font-size: 0.9rem;
    }

    .question-category {
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
    }

    .interview-tips ul {
      margin: 0;
      padding-left: 20px;
    }

    .interview-tips li {
      margin-bottom: 4px;
      font-size: 0.9rem;
      color: #6b7280;
    }

    /* Recorder Controls */
    .recorder-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #9ca3af;
      transition: all 0.3s;
    }

    .status-dot.active {
      background: #ef4444;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .status-text {
      font-weight: 600;
      color: #374151;
    }

    .duration {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #ef4444;
      font-size: 1.1rem;
    }

    .main-controls {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 20px;
    }

    .btn-record {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 32px;
      background: linear-gradient(135deg, #06d6a0, #059669);
      border: none;
      border-radius: 12px;
      color: white;
      font-weight: 700;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(6, 214, 160, 0.3);
    }

    .btn-record:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(6, 214, 160, 0.4);
    }

    .btn-record.recording {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .btn-record:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-reset {
      padding: 12px 20px;
      background: #6b7280;
      border: none;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-reset:hover {
      background: #4b5563;
    }

    /* Processing Status */
    .processing-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .processing-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #bfdbfe;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .processing-text {
      color: #1e40af;
      font-weight: 500;
    }

    /* Error Display */
    .error-display {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .error-text {
      flex: 1;
      color: #dc2626;
      font-weight: 500;
    }

    .btn-dismiss-error {
      background: none;
      border: none;
      color: #dc2626;
      cursor: pointer;
      font-size: 1.2rem;
    }

    /* Live Feedback */
    .live-feedback {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .feedback-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-weight: 600;
      color: #0c4a6e;
    }

    .progress-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 12px;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0369a1;
      display: block;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #64748b;
    }

    .next-question {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
    }

    .next-label {
      font-size: 0.8rem;
      color: #92400e;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .next-text {
      color: #1f2937;
      font-weight: 500;
    }

    /* Results Preview */
    .results-preview {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }

    .results-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-weight: 600;
      color: #374151;
    }

    .compliance-score {
      text-align: center;
      margin-bottom: 20px;
    }

    .score-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 4px solid;
      margin-bottom: 8px;
      position: relative;
    }

    .score-value {
      font-size: 1.8rem;
      font-weight: 700;
    }

    .score-label {
      font-size: 0.9rem;
      font-weight: 500;
      position: absolute;
      bottom: 18px;
      right: 12px;
    }

    .score-text {
      font-weight: 500;
      color: #6b7280;
    }

    .validation-summary {
      margin-bottom: 20px;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 4px;
    }

    .summary-item.success {
      background: #dcfce7;
      color: #166534;
    }

    .summary-item.warning {
      background: #fef3c7;
      color: #92400e;
    }

    .results-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .results-actions button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-view-details {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-approve {
      background: #22c55e;
      color: white;
    }

    .btn-retry {
      background: #f59e0b;
      color: white;
    }

    .results-actions button:hover {
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      .voice-recorder {
        padding: 16px;
      }
      
      .main-controls {
        flex-direction: column;
      }
      
      .progress-stats {
        justify-content: space-around;
      }
      
      .results-actions {
        flex-direction: column;
      }
    }
  `]
})
export class VoiceRecorderComponent implements OnInit, OnDestroy {
  @Input() advisorId: string = '';
  @Input() clientId: string = '';
  @Input() sessionType: 'prospection' | 'documentation' | 'legal_questionnaire' = 'prospection';
  @Input() municipality: string = '';
  @Input() productType: string = '';
  @Input() showGuide: boolean = true;
  @Input() showLiveFeedback: boolean = true;
  @Input() formData: any = null; // For cross-validation

  @Output() validationComplete = new EventEmitter<any>();
  @Output() interviewApproved = new EventEmitter<any>();
  @Output() errorOccurred = new EventEmitter<string>();

  state: VoiceRecorderState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    hasRecording: false,
    isProcessing: false,
    error: null
  };

  interviewGuide: any = null;
  guideExpanded: boolean = true;
  askedQuestions: string[] = [];
  validationResult: any = null;

  private destroy$ = new Subject<void>();
  private durationTimer: any;

  constructor(private voiceService: VoiceValidationService) {}

  ngOnInit(): void {
    this.loadInterviewGuide();
    this.setupEventListeners();
    this.subscribeToVoiceService();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearDurationTimer();
  }

  private loadInterviewGuide(): void {
    if (this.showGuide && this.municipality && this.productType) {
      this.interviewGuide = this.voiceService.generateInterviewGuide(
        this.municipality,
        this.productType
      );
    }
  }

  private setupEventListeners(): void {
    // Listen for validation completion
    window.addEventListener('voiceValidationComplete', (event: any) => {
      this.handleValidationComplete(event.detail);
    });
  }

  private subscribeToVoiceService(): void {
    this.voiceService.isRecording
      .pipe(takeUntil(this.destroy$))
      .subscribe(isRecording => {
        this.state.isRecording = isRecording;
        if (isRecording) {
          this.startDurationTimer();
        } else {
          this.clearDurationTimer();
          this.state.hasRecording = true;
        }
      });

    this.voiceService.recordingErrors
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.state.error = error;
        this.state.isRecording = false;
        this.state.isProcessing = false;
        this.clearDurationTimer();
        this.errorOccurred.emit(error);
      });

    this.voiceService.currentSession
      .pipe(takeUntil(this.destroy$))
      .subscribe(session => {
        if (session) {
          this.state.isProcessing = session.status === 'processing';
        }
      });
  }

  async toggleRecording(): Promise<void> {
    if (this.state.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording(): Promise<void> {
    try {
      this.state.error = null;
      
      const session = await this.voiceService.startVoiceSession(
        this.advisorId,
        this.clientId,
        this.sessionType,
        this.municipality,
        this.productType
      );

      this.voiceService.startRecording();
      
      // Reset tracking
      this.askedQuestions = [];
      this.validationResult = null;
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.state.error = 'No se pudo iniciar la grabación. Verifique permisos del micrófono.';
      this.errorOccurred.emit(this.state.error);
    }
  }

  private stopRecording(): void {
    this.voiceService.stopRecording();
    this.state.isProcessing = true;
  }

  private startDurationTimer(): void {
    this.clearDurationTimer();
    this.state.duration = 0;
    
    this.durationTimer = setInterval(() => {
      this.state.duration += 1000;
    }, 1000);
  }

  private clearDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  resetRecording(): void {
    this.state = {
      isRecording: false,
      isPaused: false,
      duration: 0,
      hasRecording: false,
      isProcessing: false,
      error: null
    };
    this.askedQuestions = [];
    this.validationResult = null;
  }

  dismissError(): void {
    this.state.error = null;
  }

  toggleGuide(): void {
    this.guideExpanded = !this.guideExpanded;
  }

  // Interview Guide Helpers
  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'identity': 'ID',
      'financial': 'FIN',
      'operational': 'OPE',
      'legal': 'LEG'
    };
    return labels[category] || category.toUpperCase();
  }

  getCompletedQuestionsCount(): number {
    return this.askedQuestions.length;
  }

  getTotalQuestionsCount(): number {
    return this.interviewGuide?.questions.length || 0;
  }

  getMandatoryCompletedCount(): number {
    if (!this.interviewGuide) return 0;
    return this.interviewGuide.questions
      .filter((q: any) => q.mandatory && this.askedQuestions.includes(q.id))
      .length;
  }

  getMandatoryQuestionsCount(): number {
    return this.interviewGuide?.questions.filter((q: any) => q.mandatory).length || 0;
  }

  getNextQuestion(): any {
    if (!this.interviewGuide) return null;
    
    return this.voiceService.getNextRequiredQuestion(
      this.sessionType,
      this.municipality,
      this.productType,
      this.askedQuestions
    );
  }

  // Status Helpers
  getStatusText(): string {
    if (this.state.isProcessing) return 'Procesando...';
    if (this.state.isRecording) return 'Grabando entrevista';
    if (this.state.hasRecording) return 'Grabación completada';
    return 'Listo para grabar';
  }

  formatDuration(ms: number): string {
    return this.voiceService.formatDuration(ms);
  }

  getComplianceColor(score: number): string {
    return this.voiceService.getComplianceColor(score);
  }

  // Event Handlers
  private handleValidationComplete(result: any): void {
    this.validationResult = result;
    this.state.isProcessing = false;
    this.validationComplete.emit(result);
  }

  viewDetailedResults(): void {
    // Emit event or navigate to detailed results page
    console.log('Viewing detailed results:', this.validationResult);
  }

  approveInterview(): void {
    this.interviewApproved.emit({
      validationResult: this.validationResult,
      sessionType: this.sessionType,
      advisorId: this.advisorId,
      clientId: this.clientId
    });
  }

  retryInterview(): void {
    this.resetRecording();
  }
}