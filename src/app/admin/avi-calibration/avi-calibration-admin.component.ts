/**
 * 🎯 AVI Calibration Admin Panel
 * Real-time calibration metrics dashboard for enterprise monitoring
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PremiumIconComponent } from '../../components/premium-icon/premium-icon.component';
import { HumanMessageComponent } from '../../components/human-message/human-message.component';

interface CalibrationResult {
  id: string;
  timestamp: string;
  sampleCount: number;
  accuracy: number;
  f1Score: number;
  precision: number;
  recall: number;
  consistency: number;
  gateStatus: 'PASSED' | 'FAILED' | 'PENDING';
  confusionMatrix: {
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
  };
  qualityGates: {
    minSamples: number;
    minAccuracy: number;
    minF1: number;
    minConsistency: number;
  };
  avgProcessingTime?: number;
}

@Component({
  selector: 'app-avi-calibration-admin',
  standalone: true,
  imports: [CommonModule, PremiumIconComponent, HumanMessageComponent],
  template: `
    <div class="calibration-admin">
      <!-- Header -->
      <div class="admin-header">
        <div class="header-content">
          <div class="header-title">
            <app-premium-icon 
              name="voice-analysis" 
              [size]="32"
              class="header-icon">
            </app-premium-icon>
            <div>
              <h1>AVI Calibration Center</h1>
              <p>Real-time voice analysis calibration metrics</p>
            </div>
          </div>
          <button 
            class="run-calibration-btn"
            [class.loading]="runningCalibration"
            (click)="runNewCalibration()"
            [disabled]="runningCalibration">
            <app-premium-icon 
              name="refresh" 
              [size]="20"
              [class.spinning]="runningCalibration">
            </app-premium-icon>
            {{ runningCalibration ? 'Running...' : 'Run New Calibration' }}
          </button>
        </div>
      </div>

      <!-- Current Status -->
      <div class="current-status" *ngIf="latestResult">
        <div class="status-card" [attr.data-status]="latestResult.gateStatus">
          <div class="status-header">
            <div class="status-indicator">
              <app-premium-icon 
                [name]="getStatusIcon(latestResult.gateStatus)"
                [size]="24"
                [class]="'status-' + latestResult.gateStatus.toLowerCase()">
              </app-premium-icon>
              <span class="status-text">{{ latestResult.gateStatus }}</span>
            </div>
            <span class="last-updated">
              Last updated: {{ formatTimestamp(latestResult.timestamp) }}
            </span>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">{{ latestResult.sampleCount }}</div>
              <div class="metric-label">Samples</div>
              <div class="metric-gate" 
                   [class.passed]="latestResult.sampleCount >= latestResult.qualityGates.minSamples">
                ≥{{ latestResult.qualityGates.minSamples }}
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-value">{{ latestResult.accuracy }}%</div>
              <div class="metric-label">Accuracy</div>
              <div class="metric-gate" 
                   [class.passed]="latestResult.accuracy >= latestResult.qualityGates.minAccuracy * 100">
                ≥{{ latestResult.qualityGates.minAccuracy * 100 }}%
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-value">{{ latestResult.f1Score }}%</div>
              <div class="metric-label">F1 Score</div>
              <div class="metric-gate" 
                   [class.passed]="latestResult.f1Score >= latestResult.qualityGates.minF1 * 100">
                ≥{{ latestResult.qualityGates.minF1 * 100 }}%
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-value">{{ latestResult.consistency }}%</div>
              <div class="metric-label">Consistency</div>
              <div class="metric-gate" 
                   [class.passed]="latestResult.consistency >= latestResult.qualityGates.minConsistency * 100">
                ≥{{ latestResult.qualityGates.minConsistency * 100 }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Confusion Matrix -->
      <div class="confusion-matrix" *ngIf="latestResult">
        <h3>Confusion Matrix</h3>
        <div class="matrix-grid">
          <div class="matrix-header"></div>
          <div class="matrix-header">Predicted APPROVED</div>
          <div class="matrix-header">Predicted REJECTED</div>
          
          <div class="matrix-label">Actual APPROVED</div>
          <div class="matrix-cell true-positive">
            <div class="cell-value">{{ latestResult.confusionMatrix.truePositives }}</div>
            <div class="cell-label">True Positives</div>
          </div>
          <div class="matrix-cell false-negative">
            <div class="cell-value">{{ latestResult.confusionMatrix.falseNegatives }}</div>
            <div class="cell-label">False Negatives</div>
          </div>
          
          <div class="matrix-label">Actual REJECTED</div>
          <div class="matrix-cell false-positive">
            <div class="cell-value">{{ latestResult.confusionMatrix.falsePositives }}</div>
            <div class="cell-label">False Positives</div>
          </div>
          <div class="matrix-cell true-negative">
            <div class="cell-value">{{ latestResult.confusionMatrix.trueNegatives }}</div>
            <div class="cell-label">True Negatives</div>
          </div>
        </div>
      </div>

      <!-- Calibration History -->
      <div class="calibration-history">
        <h3>Calibration History</h3>
        <div class="history-list" *ngIf="calibrationHistory.length > 0">
          <div class="history-item" 
               *ngFor="let result of calibrationHistory.slice(0, 10)"
               [attr.data-status]="result.gateStatus">
            <div class="history-timestamp">{{ formatTimestamp(result.timestamp) }}</div>
            <div class="history-metrics">
              <span class="metric">{{ result.accuracy }}% accuracy</span>
              <span class="metric">{{ result.f1Score }}% F1</span>
              <span class="metric">{{ result.sampleCount }} samples</span>
            </div>
            <div class="history-status" [class]="'status-' + result.gateStatus.toLowerCase()">
              {{ result.gateStatus }}
            </div>
          </div>
        </div>
        
        <app-human-message 
          *ngIf="calibrationHistory.length === 0"
          context="no-calibration-history"
          [data]="{ action: 'Run your first calibration' }">
        </app-human-message>
      </div>

      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="runningCalibration">
        <div class="loading-content">
          <app-premium-icon name="voice-analysis" [size]="48" class="loading-icon"></app-premium-icon>
          <h3>Running AVI Calibration...</h3>
          <p>Analyzing voice samples and calculating metrics</p>
          <div class="loading-progress">
            <div class="progress-bar" [style.width.%]="calibrationProgress"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calibration-admin {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      background: var(--bg-primary, #0B1220);
      color: var(--text-primary, #E6ECFF);
      min-height: 100vh;
    }

    .admin-header {
      background: linear-gradient(135deg, #1a2332, #0B1220);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      color: var(--accent-primary, #3AA6FF);
    }

    .header-title h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      background: linear-gradient(135deg, #3AA6FF, #22D3EE);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header-title p {
      margin: 4px 0 0 0;
      opacity: 0.7;
      font-size: 16px;
    }

    .run-calibration-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--accent-primary, #3AA6FF);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .run-calibration-btn:hover:not(:disabled) {
      background: var(--accent-hover, #2563EB);
      transform: translateY(-1px);
    }

    .run-calibration-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .current-status {
      margin-bottom: 32px;
    }

    .status-card {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 16px;
      padding: 24px;
      border-left: 4px solid var(--accent-primary, #3AA6FF);
    }

    .status-card[data-status="PASSED"] {
      border-left-color: var(--success, #22C55E);
    }

    .status-card[data-status="FAILED"] {
      border-left-color: var(--error, #EF4444);
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-text {
      font-size: 20px;
      font-weight: 700;
    }

    .status-passed { color: var(--success, #22C55E); }
    .status-failed { color: var(--error, #EF4444); }
    .status-pending { color: var(--warning, #F59E0B); }

    .last-updated {
      opacity: 0.7;
      font-size: 14px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--accent-primary, #3AA6FF);
      margin-bottom: 4px;
    }

    .metric-label {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .metric-gate {
      font-size: 12px;
      opacity: 0.7;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.1);
      color: var(--error, #EF4444);
    }

    .metric-gate.passed {
      background: rgba(34, 197, 94, 0.1);
      color: var(--success, #22C55E);
    }

    .confusion-matrix {
      margin-bottom: 32px;
    }

    .confusion-matrix h3 {
      margin-bottom: 16px;
      font-size: 20px;
      font-weight: 600;
    }

    .matrix-grid {
      display: grid;
      grid-template-columns: 120px 1fr 1fr;
      grid-template-rows: 40px 1fr 1fr;
      gap: 2px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      overflow: hidden;
    }

    .matrix-header {
      background: rgba(255, 255, 255, 0.1);
      padding: 12px;
      font-weight: 600;
      text-align: center;
      font-size: 14px;
    }

    .matrix-label {
      background: rgba(255, 255, 255, 0.1);
      padding: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      font-size: 14px;
    }

    .matrix-cell {
      background: rgba(255, 255, 255, 0.03);
      padding: 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .cell-value {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .cell-label {
      font-size: 12px;
      opacity: 0.7;
    }

    .true-positive .cell-value { color: var(--success, #22C55E); }
    .true-negative .cell-value { color: var(--success, #22C55E); }
    .false-positive .cell-value { color: var(--error, #EF4444); }
    .false-negative .cell-value { color: var(--error, #EF4444); }

    .calibration-history h3 {
      margin-bottom: 16px;
      font-size: 20px;
      font-weight: 600;
    }

    .history-list {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      overflow: hidden;
    }

    .history-item {
      display: grid;
      grid-template-columns: 200px 1fr 100px;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .history-item:last-child {
      border-bottom: none;
    }

    .history-timestamp {
      font-size: 14px;
      opacity: 0.8;
    }

    .history-metrics {
      display: flex;
      gap: 16px;
    }

    .metric {
      font-size: 14px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
    }

    .history-status {
      text-align: center;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(11, 18, 32, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .loading-content {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      max-width: 400px;
      width: 90%;
    }

    .loading-icon {
      color: var(--accent-primary, #3AA6FF);
      margin-bottom: 20px;
      animation: pulse 2s ease-in-out infinite;
    }

    .loading-content h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 700;
    }

    .loading-content p {
      margin: 0 0 24px 0;
      opacity: 0.7;
    }

    .loading-progress {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      height: 8px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #3AA6FF, #22D3EE);
      border-radius: 8px;
      transition: width 0.3s ease;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class AviCalibrationAdminComponent implements OnInit {
  latestResult: CalibrationResult | null = null;
  calibrationHistory: CalibrationResult[] = [];
  runningCalibration = false;
  calibrationProgress = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCalibrationData();
  }

  async loadCalibrationData() {
    try {
      const response = await this.http.get<{
        latest: CalibrationResult;
        history: CalibrationResult[];
      }>('/api/avi/calibration/results').toPromise();
      
      if (response) {
        this.latestResult = response.latest;
        this.calibrationHistory = response.history;
      }
    } catch (error) {
// removed by clean-audit
    }
  }

  async runNewCalibration() {
    this.runningCalibration = true;
    this.calibrationProgress = 0;

    // Simulate progress
    const progressInterval = setInterval(() => {
      this.calibrationProgress += Math.random() * 10;
      if (this.calibrationProgress >= 95) {
        clearInterval(progressInterval);
      }
    }, 1000);

    try {
      const response = await this.http.post<CalibrationResult>('/api/avi/calibration/run', {}).toPromise();
      
      if (response) {
        this.latestResult = response;
        this.calibrationHistory.unshift(response);
        this.calibrationProgress = 100;
        
        setTimeout(() => {
          this.runningCalibration = false;
          this.calibrationProgress = 0;
        }, 1000);
      }
    } catch (error) {
// removed by clean-audit
      this.runningCalibration = false;
      this.calibrationProgress = 0;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PASSED': return 'check-circle';
      case 'FAILED': return 'alert-circle';
      default: return 'clock';
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
// removed by clean-audit