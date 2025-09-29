import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AVISystemValidatorService, ValidationReport, TestResult, TestCase } from '../../services/avi-system-validator.service';
import { IconComponent } from '../shared/icon/icon.component';
import { IconName } from '../shared/icon/icon-definitions';

@Component({
  selector: 'app-avi-validation-runner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './avi-validation-runner.component.html',
  styleUrls: ['./avi-validation-runner.component.scss']
})
export class AVIValidationRunnerComponent implements OnInit {
  validationReport: ValidationReport | null = null;
  isRunning = false;
  currentTestMessage = '';
  showTechnicalDetails = false;

  private readonly statusIcons = new Map<ValidationReport['overallStatus'], IconName>();
  private readonly categoryIcons = new Map<string, IconName>();

  constructor(
    private validatorService: AVISystemValidatorService
  ) {
    this.initializeStatusIcons();
    this.initializeCategoryIcons();
  }

  private initializeStatusIcons(): void {
    this.statusIcons.set('PASSED', 'check-circle');
    this.statusIcons.set('FAILED', 'x-circle');
    this.statusIcons.set('ERROR', 'exclamation-triangle');
  }

  private initializeCategoryIcons(): void {
    this.categoryIcons.set('Servicio AVI Básico', 'settings');
    this.categoryIcons.set('Sistema de Calibración', 'settings');
    this.categoryIcons.set('Dual Engine', 'device-laptop');
    this.categoryIcons.set('Rendimiento', 'lightning-bolt');
    this.categoryIcons.set('Casos Extremos', 'exclamation-triangle');
    this.categoryIcons.set('Precisión del Sistema', 'target-arrow');
    this.categoryIcons.set('Consistencia', 'chart');
    this.categoryIcons.set('System Error', 'alert-triangle');
  }

  ngOnInit() {
    // Auto-ejecutar validación al cargar componente
    setTimeout(() => {
      this.runValidation();
    }, 1000);
  }

  runValidation() {
    this.isRunning = true;
    this.validationReport = null;
    this.currentTestMessage = 'Inicializando sistema de validación...';

    // Simular progreso de tests
    this.simulateProgress();

    this.validatorService.runCompleteValidation().subscribe({
      next: (report) => {
        this.validationReport = report;
        this.isRunning = false;
        this.currentTestMessage = '';
      },
      error: (error) => {
        this.isRunning = false;
        this.currentTestMessage = 'Error en validación';
      }
    });
  }

  private simulateProgress() {
    const messages = [
      'Validando servicio AVI básico...',
      'Probando dual engine...',
      'Ejecutando tests de precisión...',
      'Evaluando rendimiento...',
      'Verificando consistencia...',
      'Probando casos extremos...',
      'Validando sistema de calibración...',
      'Compilando resultados finales...'
    ];

    let messageIndex = 0;
    const interval = setInterval(() => {
      if (messageIndex < messages.length && this.isRunning) {
        this.currentTestMessage = messages[messageIndex];
        messageIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);
  }

  toggleTechnicalDetails(): void {
    this.showTechnicalDetails = !this.showTechnicalDetails;
  }

  getStatusModifier(report: ValidationReport): string {
    const statusMap: Record<ValidationReport['overallStatus'], string> = {
      PASSED: 'avi-validation-runner__status-card--passed',
      FAILED: 'avi-validation-runner__status-card--failed',
      ERROR: 'avi-validation-runner__status-card--error'
    };

    return statusMap[report.overallStatus] ?? '';
  }

  getStatusIcon(report: ValidationReport): IconName | null {
    return this.statusIcons.get(report.overallStatus) ?? null;
  }

  getCategoryModifier(category: TestResult): string {
    return category.passed
      ? 'avi-validation-runner__category-card--passed'
      : 'avi-validation-runner__category-card--failed';
  }

  getTestModifier(test: TestCase): string {
    return test.passed
      ? 'avi-validation-runner__test-item--passed'
      : 'avi-validation-runner__test-item--failed';
  }

  getRecommendationModifier(recommendation: string): string {
    const value = recommendation.toLowerCase();

    if (value.includes('éxito') || value.includes('exito') || value.includes('aprob') || value.includes('complet')) {
      return 'avi-validation-runner__recommendation-item--success';
    }

    if (value.includes('atención') || value.includes('atencion') || value.includes('pendiente') || value.includes('monitor') || value.includes('revisar')) {
      return 'avi-validation-runner__recommendation-item--warning';
    }

    if (value.includes('error') || value.includes('fall') || value.includes('riesgo') || value.includes('crític') || value.includes('critic')) {
      return 'avi-validation-runner__recommendation-item--error';
    }

    return '';
  }

  getCategoryIcon(category: string): IconName | null {
    return this.categoryIcons.get(category) ?? null;
  }

  exportReport() {
    if (!this.validationReport) return;
    
    const reportData = {
      ...this.validationReport,
      exportedAt: new Date().toISOString(),
      systemInfo: {
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `avi-validation-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    window.URL.revokeObjectURL(url);
  }
}
