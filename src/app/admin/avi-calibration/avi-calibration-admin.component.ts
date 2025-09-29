/**
 *  AVI Calibration Admin Panel
 * Real-time calibration metrics dashboard for enterprise monitoring
 */

import { Component, HostBinding, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { UiIconComponent } from '../../components/ui/ui-icon/ui-icon.component';
import { HumanMessageComponent } from '../../components/shared/human-message/human-message.component';

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
  imports: [CommonModule, UiIconComponent, HumanMessageComponent],
  templateUrl: './avi-calibration-admin.component.html',
  styleUrls: ['./avi-calibration-admin.component.scss']
})
export class AviCalibrationAdminComponent implements OnInit {
  @HostBinding('class') readonly hostClass = 'calibration-admin';
  latestResult: CalibrationResult | null = null;
  calibrationHistory: CalibrationResult[] = [];
  runningCalibration = false;
  calibrationProgress = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCalibrationData();
  }

  async loadCalibrationData(): Promise<void> {
    try {
      const response = await this.http
        .get<{ latest: CalibrationResult; history: CalibrationResult[] }>('/api/avi/calibration/results')
        .toPromise();

      if (response) {
        this.latestResult = response.latest;
        this.calibrationHistory = response.history;
      }
    } catch {
      // Surface handled through overlays elsewhere
    }
  }

  async runNewCalibration(): Promise<void> {
    if (this.runningCalibration) {
      return;
    }

    this.runningCalibration = true;
    this.calibrationProgress = 0;

    const progressInterval = setInterval(() => {
      this.calibrationProgress = Math.min(95, this.calibrationProgress + Math.random() * 10);
    }, 1000);

    try {
      const response = await this.http.post<CalibrationResult>('/api/avi/calibration/run', {}).toPromise();

      if (response) {
        this.latestResult = response;
        this.calibrationHistory.unshift(response);
        this.calibrationProgress = 100;
      }
    } catch {
      // Keep silent to avoid duplicate toasts
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        this.runningCalibration = false;
        this.calibrationProgress = 0;
      }, 1000);
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PASSED':
        return 'check-circle';
      case 'FAILED':
        return 'alert-circle';
      default:
        return 'clock';
    }
  }

  getRunButtonClasses(): Record<string, boolean> {
    return {
      'calibration-admin__button--loading': this.runningCalibration,
    };
  }

  getStatusIconClasses(status: CalibrationResult['gateStatus']): Record<string, boolean> {
    return {
      'calibration-admin__status-icon--passed': status === 'PASSED',
      'calibration-admin__status-icon--failed': status === 'FAILED',
      'calibration-admin__status-icon--pending': status === 'PENDING',
    };
  }

  getMetricGateClasses(passed: boolean): Record<string, boolean> {
    return {
      'calibration-admin__metric-gate--passed': passed,
    };
  }

  getHistoryStatusClasses(status: CalibrationResult['gateStatus']): Record<string, boolean> {
    return {
      'calibration-admin__history-status--passed': status === 'PASSED',
      'calibration-admin__history-status--failed': status === 'FAILED',
      'calibration-admin__history-status--pending': status === 'PENDING',
    };
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
