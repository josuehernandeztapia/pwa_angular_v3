import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { VoiceValidationService } from '../../../services/voice-validation.service';
import { AviQuestionGeneratorService, MicroLocalQuestion } from '../../../services/avi-question-generator.service';
import { AviSimpleConfigService, SimpleAviQuestion } from '../../../services/avi-simple-config.service';
import { VoiceFraudDetectionService, VoiceFraudAnalysis, VoiceMetrics } from '../../../services/voice-fraud-detection.service';

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
    <div class="avi-modal-overlay" (click)="onOverlayClick($event)">
      <div class="avi-modal-container" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="avi-header">
          <div class="avi-title">
            <span class="avi-icon">🎤</span>
            <h2>Verificación Inteligente AVI</h2>
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
          <div class="mic-section">
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
  styles: [`
    .avi-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .avi-modal-container {
      width: 90%;
      max-width: 800px;
      height: 90%;
      max-height: 900px;
      background: white;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .avi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .avi-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avi-icon {
      font-size: 24px;
    }

    .avi-title h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .avi-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .avi-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .avi-content {
      flex: 1;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      overflow-y: auto;
    }

    .recording-status {
      text-align: center;
      padding: 16px;
      border-radius: 12px;
      background: #f8fafc;
      transition: all 0.3s;
    }

    .recording-status.recording-active {
      background: #fef2f2;
      border: 2px solid #fecaca;
    }

    .recording-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .recording-dot {
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .recording-text {
      font-weight: 600;
      font-size: 16px;
    }

    .mic-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 32px 0;
    }

    .mic-button {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    }

    .mic-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
    }

    .mic-button.mic-recording {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      animation: recordingPulse 1.5s infinite;
    }

    @keyframes recordingPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .mic-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .mic-icon {
      font-size: 48px;
      color: white;
    }

    .mic-instructions {
      text-align: center;
      max-width: 500px;
    }

    .mic-instructions p {
      margin: 0;
      font-size: 16px;
      color: #6b7280;
      line-height: 1.5;
    }

    .success-message {
      color: #059669 !important;
      font-weight: 600 !important;
    }

    .transcription-section {
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    .transcription-section h3 {
      margin: 0 0 12px 0;
      color: #374151;
      font-size: 16px;
      font-weight: 600;
    }

    .transcript-box {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      font-family: monospace;
      color: #1f2937;
      line-height: 1.4;
      min-height: 60px;
    }

    .progress-info-section {
      background: #f0fdf4;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #10b981;
    }

    .progress-info-section h3 {
      margin: 0 0 16px 0;
      color: #374151;
      font-size: 16px;
      font-weight: 600;
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .progress-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .progress-label {
      font-size: 12px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
    }

    .progress-value {
      font-size: 18px;
      font-weight: 700;
      color: #059669;
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      transition: width 0.3s ease;
      border-radius: 4px;
    }

    /* Client-Friendly Completion Styles */
    .completion-section {
      margin-top: 20px;
      padding: 24px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 16px;
      border: 1px solid #bae6fd;
      text-align: center;
    }

    .completion-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .success-icon {
      font-size: 48px;
      line-height: 1;
    }

    .completion-section h3 {
      margin: 0;
      color: #0c4a6e;
      font-size: 24px;
      font-weight: 700;
    }

    .completion-text {
      margin: 0;
      color: #075985;
      font-size: 16px;
      line-height: 1.6;
      max-width: 400px;
    }

    .score-display {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 12px;
      border: 1px solid #bae6fd;
    }

    .score-label {
      font-size: 16px;
      color: #075985;
      font-weight: 600;
    }

    .score-value {
      font-size: 28px;
      color: #0c4a6e;
      font-weight: 700;
    }

    .progress-section {
      margin-top: auto;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .progress-steps {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
    }

    .progress-steps::before {
      content: '';
      position: absolute;
      top: 16px;
      left: 32px;
      right: 32px;
      height: 2px;
      background: #e5e7eb;
      z-index: 0;
    }

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      position: relative;
      z-index: 1;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e5e7eb;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .progress-step.step-active .step-number {
      background: #667eea;
      color: white;
    }

    .progress-step.step-completed .step-number {
      background: #10b981;
      color: white;
    }

    .step-label {
      font-size: 12px;
      color: #6b7280;
      text-align: center;
      font-weight: 500;
    }

    .progress-step.step-active .step-label {
      color: #667eea;
      font-weight: 600;
    }

    .progress-step.step-completed .step-label {
      color: #10b981;
      font-weight: 600;
    }

    .avi-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      background: #f8fafc;
      border-top: 1px solid #e5e7eb;
    }

    .btn-primary,
    .btn-secondary {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }

    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5a67d8;
    }

    .btn-secondary {
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #f9fafb;
    }

    .btn-primary:disabled,
    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .avi-modal-container {
        width: 95%;
        height: 95%;
      }

      .avi-header {
        padding: 16px 20px;
      }

      .avi-title h2 {
        font-size: 20px;
      }

      .avi-content {
        padding: 20px;
        gap: 20px;
      }

      .mic-button {
        width: 100px;
        height: 100px;
      }

      .mic-icon {
        font-size: 40px;
      }

      .avi-footer {
        padding: 16px 20px;
      }

      .progress-steps {
        flex-direction: column;
        gap: 16px;
      }

      .progress-steps::before {
        display: none;
      }

      .voice-evaluation-section {
        gap: 16px;
      }
      
      .question-results-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      
      .question-result-card {
        padding: 16px;
      }
      
      .resilience-overview {
        flex-direction: column;
        gap: 20px;
      }
      
      .category-breakdown {
        gap: 12px;
      }
    }

    /* ✅ NUEVO: Voice Evaluation Styles */
    .voice-evaluation-section {
      background: #f8fafc;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .voice-evaluation-section h3 {
      margin: 0;
      color: #1f2937;
      font-size: 18px;
      font-weight: 600;
    }

    .question-results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .question-result-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid transparent;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    /* Semáforo Colors */
    .question-result-card.result-go {
      border-color: #10b981;
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
    }

    .question-result-card.result-nogo {
      border-color: #ef4444;
      background: linear-gradient(135deg, #fef2f2 0%, #fef7f7 100%);
    }

    .question-result-card.result-review {
      border-color: #f59e0b;
      background: linear-gradient(135deg, #fffbeb 0%, #fefce8 100%);
    }

    .semaforo-indicator {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .decision-icon {
      font-size: 24px;
      line-height: 1;
    }

    .question-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .question-id {
      font-size: 14px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .decision-status {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }

    .confidence-score {
      font-size: 14px;
      color: #6b7280;
    }

    .analysis-flags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .flag-item {
      background: rgba(107, 114, 128, 0.1);
      color: #6b7280;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    /* Loading State */
    .analysis-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 20px;
      color: #6b7280;
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e5e7eb;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      font-size: 14px;
      font-weight: 500;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* ✅ NUEVO: Resilience Summary Styles */
    .resilience-summary-section {
      background: linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e9d5ff;
    }

    .resilience-summary-section h3 {
      margin: 0 0 20px 0;
      color: #581c87;
      font-size: 18px;
      font-weight: 600;
    }

    .resilience-overview {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .resilience-score-display {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      text-align: center;
      min-width: 200px;
    }

    .overall-score {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .score-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }

    .score-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1;
    }

    .score-value.score-high {
      color: #10b981;
    }

    .score-value.score-medium {
      color: #f59e0b;
    }

    .score-value.score-low {
      color: #ef4444;
    }

    .resilience-level {
      font-size: 14px;
      font-weight: 600;
      color: #581c87;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .category-breakdown {
      flex: 1;
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .category-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .category-item:last-child {
      border-bottom: none;
    }

    .category-label {
      font-size: 14px;
      color: #374151;
      font-weight: 500;
    }

    .category-score {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
  `]
})
export class AviVerificationModalComponent implements OnInit, OnDestroy {
  @Input() clientId: string = '';
  @Input() municipality: 'aguascalientes' | 'edomex' = 'aguascalientes';
  @Input() visible: boolean = true;
  @Output() completed = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('micButton') micButtonRef!: ElementRef;

  private destroy$ = new Subject<void>();
  
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
    this.initializeAviSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.isRecording) {
      this.stopRecording();
    }
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
      .subscribe(questions => {
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
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
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