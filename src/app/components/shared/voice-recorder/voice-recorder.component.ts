import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { VoiceValidationService } from '../../../services/voice-validation.service';
import { IconComponent } from '../icon/icon.component';

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
  imports: [CommonModule, IconComponent],
  templateUrl: './voice-recorder.component.html',
  styleUrls: ['./voice-recorder.component.scss'],
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

  getRecorderStateClasses(): Record<string, boolean> {
    return {
      'voice-recorder--recording': this.state.isRecording,
      'voice-recorder--processing': this.state.isProcessing,
    };
  }

  getStatusDotClasses(): Record<string, boolean> {
    return {
      'voice-recorder__status-dot--active': this.state.isRecording,
    };
  }

  getRecordButtonClasses(): Record<string, boolean> {
    return {
      'voice-recorder__button--recording': this.state.isRecording,
    };
  }

  getQuestionClasses(question: any): Record<string, boolean> {
    const asked = this.askedQuestions.includes(question.id);
    return {
      'voice-recorder__question--asked': asked,
      'voice-recorder__question--mandatory': question.mandatory && !asked,
    };
  }

  getScoreClasses(score: number): Record<string, boolean> {
    return {
      'voice-recorder__score-circle--excellent': score >= 85,
      'voice-recorder__score-circle--warning': score < 85 && score >= 60,
      'voice-recorder__score-circle--critical': score < 60,
    };
  }

  getQuestionsSummaryClasses(): Record<string, boolean> {
    const missing = this.validationResult?.questions_missing?.length || 0;
    return {
      'voice-recorder__summary-item--success': missing === 0,
      'voice-recorder__summary-item--alert': missing > 0,
    };
  }

  getRiskSummaryClasses(): Record<string, boolean> {
    const hasRisk = (this.validationResult?.risk_flags?.length || 0) > 0;
    return {
      'voice-recorder__summary-item--alert': hasRisk,
      'voice-recorder__summary-item--success': !hasRisk,
    };
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
