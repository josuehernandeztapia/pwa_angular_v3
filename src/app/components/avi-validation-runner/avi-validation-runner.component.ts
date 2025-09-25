import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AVISystemValidatorService, ValidationReport } from '../../services/avi-system-validator.service';

@Component({
  selector: 'app-avi-validation-runner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="validation-runner">
      <div class="header">
        <h1>🧪 Sistema de Validación AVI</h1>
        <p>Validación completa del sistema de entrevistas automatizadas</p>
        
        <button 
          class="run-btn" 
          (click)="runValidation()"
          [disabled]="isRunning">
          {{ isRunning ? 'Ejecutando...' : 'Ejecutar Validación Completa' }}
        </button>
      </div>

      <div class="validation-progress" *ngIf="isRunning">
        <div class="spinner"></div>
        <p>{{ currentTestMessage }}</p>
      </div>

      <div class="validation-results" *ngIf="validationReport">
        <!-- Status General -->
        <div class="status-card" [class]="getStatusClass()">
          <div class="status-header">
            <span class="status-icon">{{ getStatusIcon() }}</span>
            <h2>{{ validationReport.overallStatus }}</h2>
            <span class="timestamp">{{ validationReport.timestamp | date:'medium' }}</span>
          </div>
          
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-number">{{ validationReport.summary.totalTests }}</span>
              <span class="stat-label">Tests Totales</span>
            </div>
            <div class="stat">
              <span class="stat-number">{{ validationReport.summary.passedTests }}</span>
              <span class="stat-label">Exitosos</span>
            </div>
            <div class="stat">
              <span class="stat-number">{{ validationReport.summary.failedTests }}</span>
              <span class="stat-label">Fallidos</span>
            </div>
            <div class="stat">
              <span class="stat-number">{{ validationReport.summary.successRate.toFixed(1) }}%</span>
              <span class="stat-label">Éxito</span>
            </div>
            <div class="stat">
              <span class="stat-number">{{ (validationReport.summary.totalDuration / 1000).toFixed(1) }}s</span>
              <span class="stat-label">Duración</span>
            </div>
          </div>
        </div>

        <!-- Resultados por Categoría -->
        <div class="categories-section">
          <h3>Resultados por Categoría</h3>
          <div class="categories-grid">
            <div 
              class="category-card" 
              *ngFor="let category of validationReport.categories"
              [class.passed]="category.passed"
              [class.failed]="!category.passed">
              
              <div class="category-header">
                <span class="category-icon">{{ getCategoryIcon(category.category) }}</span>
                <div class="category-info">
                  <h4>{{ category.category }}</h4>
                  <span class="category-status">
                    {{ category.passed ? 'PASÓ' : 'FALLÓ' }}
                  </span>
                </div>
                <span class="category-duration">{{ category.duration }}ms</span>
              </div>
              
              <div class="tests-list">
                <div 
                  class="test-item" 
                  *ngFor="let test of category.tests"
                  [class.passed]="test.passed"
                  [class.failed]="!test.passed">
                  
                  <span class="test-icon">{{ test.passed ? '✅' : '❌' }}</span>
                  <div class="test-info">
                    <span class="test-name">{{ test.name }}</span>
                    <span class="test-message">{{ test.message }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recomendaciones -->
        <div class="recommendations-section">
          <h3>Recomendaciones del Sistema</h3>
          <div class="recommendations-list">
            <div 
              class="recommendation-item" 
              *ngFor="let recommendation of validationReport.recommendations"
              [class.success]="recommendation.includes('✅')"
              [class.warning]="recommendation.includes('⚠️')"
              [class.error]="recommendation.includes('🔥')">
              {{ recommendation }}
            </div>
          </div>
        </div>

        <!-- Detalles Técnicos -->
        <div class="technical-details" *ngIf="showTechnicalDetails">
          <h3>Detalles Técnicos</h3>
          <div class="details-content">
            <pre>{{ validationReport | json }}</pre>
          </div>
        </div>

        <div class="actions">
          <button 
            class="toggle-details-btn"
            (click)="showTechnicalDetails = !showTechnicalDetails">
            {{ showTechnicalDetails ? 'Ocultar' : 'Mostrar' }} Detalles Técnicos
          </button>
          
          <button class="rerun-btn" (click)="runValidation()">
            🔄 Ejecutar Nuevamente
          </button>
          
          <button class="export-btn" (click)="exportReport()">
            📊 Exportar Reporte
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .validation-runner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', sans-serif;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      
      h1 {
        font-size: 2.5rem;
        color: #333;
        margin: 0 0 10px 0;
      }
      
      p {
        color: #666;
        font-size: 1.1rem;
        margin-bottom: 30px;
      }
      
      .run-btn {
        background: var(--flat-surface-bg); /* FIXED (verify-ux) */
        color: white;
        border: none;
        padding: 15px 30px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      }
    }

    .validation-progress {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      
      .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      
      p {
        font-size: 16px;
        color: #666;
        font-weight: 500;
      }
    }

    .status-card {
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      border-left: 6px solid;
      
      &.passed {
        border-color: #4CAF50;
        background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      }
      
      &.failed {
        border-color: #f44336;
        background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      }
      
      &.error {
        border-color: #ff9800;
        background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      }
      
      .status-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 25px;
        
        .status-icon {
          font-size: 2rem;
          margin-right: 15px;
        }
        
        h2 {
          flex-grow: 1;
          margin: 0;
          font-size: 1.8rem;
          font-weight: 700;
        }
        
        .timestamp {
          font-size: 14px;
          color: #666;
        }
      }
      
      .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 20px;
        
        .stat {
          text-align: center;
          
          .stat-number {
            display: block;
            font-size: 2rem;
            font-weight: 700;
            color: #333;
          }
          
          .stat-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            font-weight: 500;
          }
        }
      }
    }

    .categories-section {
      margin-bottom: 40px;
      
      h3 {
        font-size: 1.5rem;
        color: #333;
        margin-bottom: 20px;
      }
      
      .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
        
        .category-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          overflow: hidden;
          
          &.passed {
            border-left: 4px solid #4CAF50;
          }
          
          &.failed {
            border-left: 4px solid #f44336;
          }
          
          .category-header {
            display: flex;
            align-items: center;
            padding: 20px;
            background: #f8f9fa;
            
            .category-icon {
              font-size: 1.5rem;
              margin-right: 15px;
            }
            
            .category-info {
              flex-grow: 1;
              
              h4 {
                margin: 0 0 5px 0;
                font-size: 1.1rem;
                color: #333;
              }
              
              .category-status {
                font-size: 12px;
                font-weight: 600;
                padding: 2px 8px;
                border-radius: 10px;
                
                &:contains('PASÓ') {
                  background: #e8f5e8;
                  color: #2e7d32;
                }
                
                &:contains('FALLÓ') {
                  background: #ffebee;
                  color: #d32f2f;
                }
              }
            }
            
            .category-duration {
              font-size: 12px;
              color: #666;
              background: #e9ecef;
              padding: 4px 8px;
              border-radius: 8px;
            }
          }
          
          .tests-list {
            padding: 0 20px 20px;
            
            .test-item {
              display: flex;
              align-items: flex-start;
              padding: 10px 0;
              border-bottom: 1px solid #f0f0f0;
              
              &:last-child {
                border-bottom: none;
              }
              
              .test-icon {
                margin-right: 10px;
                font-size: 16px;
                line-height: 1.2;
              }
              
              .test-info {
                flex-grow: 1;
                
                .test-name {
                  display: block;
                  font-weight: 500;
                  color: #333;
                  font-size: 14px;
                  margin-bottom: 2px;
                }
                
                .test-message {
                  display: block;
                  font-size: 12px;
                  color: #666;
                }
              }
              
              &.passed .test-name {
                color: #2e7d32;
              }
              
              &.failed .test-name {
                color: #d32f2f;
              }
            }
          }
        }
      }
    }

    .recommendations-section {
      margin-bottom: 40px;
      
      h3 {
        font-size: 1.5rem;
        color: #333;
        margin-bottom: 20px;
      }
      
      .recommendations-list {
        .recommendation-item {
          padding: 15px 20px;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #e0e0e0;
          margin-bottom: 10px;
          font-weight: 500;
          
          &.success {
            border-color: #4CAF50;
            background: #e8f5e8;
            color: #2e7d32;
          }
          
          &.warning {
            border-color: #ff9800;
            background: #fff3e0;
            color: #f57c00;
          }
          
          &.error {
            border-color: #f44336;
            background: #ffebee;
            color: #d32f2f;
          }
        }
      }
    }

    .technical-details {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      
      h3 {
        margin: 0 0 15px 0;
        color: #333;
      }
      
      .details-content {
        background: #2d3748;
        color: #e2e8f0;
        padding: 20px;
        border-radius: 8px;
        overflow-x: auto;
        
        pre {
          margin: 0;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.4;
        }
      }
    }

    .actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
      
      button {
        padding: 10px 20px;
        border-radius: 25px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        border: none;
        
        &.toggle-details-btn {
          background: #6c757d;
          color: white;
          
          &:hover {
            background: #545b62;
          }
        }
        
        &.rerun-btn {
          background: #28a745;
          color: white;
          
          &:hover {
            background: #218838;
          }
        }
        
        &.export-btn {
          background: #17a2b8;
          color: white;
          
          &:hover {
            background: #138496;
          }
        }
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .categories-grid {
        grid-template-columns: 1fr !important;
      }
      
      .summary-stats {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      
      .actions {
        flex-direction: column;
      }
    }
  `]
})
export class AVIValidationRunnerComponent implements OnInit {
  validationReport: ValidationReport | null = null;
  isRunning = false;
  currentTestMessage = '';
  showTechnicalDetails = false;

  constructor(private validatorService: AVISystemValidatorService) {}

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

  getStatusClass(): string {
    if (!this.validationReport) return '';
    
    switch (this.validationReport.overallStatus) {
      case 'PASSED': return 'passed';
      case 'FAILED': return 'failed';
      case 'ERROR': return 'error';
      default: return '';
    }
  }

  getStatusIcon(): string {
    if (!this.validationReport) return '🔄';
    
    switch (this.validationReport.overallStatus) {
      case 'PASSED': return '✅';
      case 'FAILED': return '❌';
      case 'ERROR': return '⚠️';
      default: return '🔄';
    }
  }

  getCategoryIcon(category: string): string {
    const icons: {[key: string]: string} = {
      'Servicio AVI Básico': '🔧',
      'Dual Engine': '🤖',
      'Precisión del Sistema': '🎯',
      'Rendimiento': '⚡',
      'Consistencia': '🔄',
      'Casos Extremos': '🚨',
      'Sistema de Calibración': '⚙️',
      'System Error': '🔥'
    };
    
    return icons[category] || '📊';
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
