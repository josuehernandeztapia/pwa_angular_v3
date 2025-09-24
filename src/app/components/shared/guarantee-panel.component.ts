import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Document, DocumentStatus } from '../../models/types';

@Component({
  selector: 'app-guarantee-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="guarantee-panel bg-gray-900 rounded-xl border border-gray-800 p-6">
      <!-- Header -->
      <div class="panel-header mb-6">
        <div class="flex items-center gap-3">
          <div class="icon-container">
            🛡️
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">Panel de Garantías</h3>
            <p class="text-sm text-gray-400">Documentos específicos para garantizar el crédito</p>
          </div>
        </div>
      </div>

      <!-- Documents List -->
      <div class="documents-list space-y-4">
        <div 
          *ngFor="let document of documents" 
          class="document-item p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- Status Icon -->
              <div class="status-icon">
                <div [ngSwitch]="document.status" class="w-8 h-8 rounded-full flex items-center justify-center">
                  <span *ngSwitchCase="'Aprobado'" class="w-6 h-6 text-emerald-400">✅</span>
                  <span *ngSwitchCase="'En Revisión'" class="w-6 h-6 text-amber-400 animate-pulse">⏳</span>
                  <span *ngSwitchCase="'Pendiente'" class="w-6 h-6 text-gray-500">⭕</span>
                  <span *ngSwitchCase="'Rechazado'" class="w-6 h-6 text-red-500">❌</span>
                  <span *ngSwitchDefault class="w-6 h-6 text-gray-500">❓</span>
                </div>
              </div>

              <!-- Document Info -->
              <div class="document-info">
                <h4 class="font-semibold text-white text-sm">{{ document.name }}</h4>
                <p class="text-xs text-gray-400 mt-1" *ngIf="getDocumentDescription(document.name)">
                  {{ getDocumentDescription(document.name) }}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span 
                    class="status-badge px-2 py-1 rounded-full text-xs font-medium"
                    [class]="getStatusBadgeClass(document.status)"
                  >
                    {{ document.status }}
                  </span>
                  <span *ngIf="document.isOptional" class="optional-badge px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                    Opcional
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="document-actions">
              <button 
                *ngIf="document.status === 'Pendiente'"
                (click)="onUpload.emit(document.id)"
                class="upload-btn px-4 py-2 bg-primary-cyan-600 hover:bg-primary-cyan-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <span class="upload-icon">📄</span>
                Subir
              </button>
              
              <button 
                *ngIf="document.status === 'Aprobado'"
                (click)="viewDocument(document)"
                class="view-btn px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <span class="view-icon">👁️</span>
                Ver
              </button>

              <button 
                *ngIf="document.status === 'Rechazado'"
                (click)="onUpload.emit(document.id)"
                class="reupload-btn px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <span class="reupload-icon">🔄</span>
                Re-subir
              </button>
            </div>
          </div>

          <!-- Progress Indicator for specific documents -->
          <div *ngIf="document.name === 'Convenio de Dación en Pago'" class="mt-4 pt-4 border-t border-gray-700/50">
            <div class="progress-info">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-neutral-100">Progreso del Convenio</span>
                <span class="text-primary-cyan-400 font-medium">{{ getConvenioProgress() }}%</span>
              </div>
              <div class="progress-bar w-full bg-gray-700 rounded-full h-2">
                <div 
                  class="progress-fill bg-neutral-900 h-2 rounded-full transition-all duration-300"
                  [style.width.%]="getConvenioProgress()"
                ></div>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                Este convenio formalizará la transferencia de propiedad como garantía
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Card -->
      <div class="summary-card mt-6 p-4 bg-neutral-900 rounded-lg border border-gray-600/50">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-semibold text-white text-sm">Resumen de Garantías</h4>
            <p class="text-xs text-gray-400 mt-1">Estado general de documentos de garantía</p>
          </div>
          <div class="summary-stats text-right">
            <div class="text-2xl font-bold text-primary-cyan-400">{{ getApprovedCount() }}/{{ documents.length }}</div>
            <div class="text-xs text-gray-400">Aprobados</div>
          </div>
        </div>
        
        <div class="progress-overview mt-4">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-neutral-100">Completado</span>
            <span class="text-white font-medium">{{ getOverallProgress() }}%</span>
          </div>
          <div class="progress-bar w-full bg-gray-700 rounded-full h-3">
            <div 
              class="progress-fill bg-neutral-900 h-3 rounded-full transition-all duration-500"
              [style.width.%]="getOverallProgress()"
            ></div>
          </div>
        </div>

        <!-- Risk Assessment -->
        <div class="risk-assessment mt-4 p-3 rounded-lg" [class]="getRiskAssessmentClass()">
          <div class="flex items-center gap-2">
            <span class="risk-icon">{{ getRiskIcon() }}</span>
            <div>
              <h5 class="font-medium text-sm">{{ getRiskLevel() }}</h5>
              <p class="text-xs opacity-90">{{ getRiskDescription() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons mt-6 flex gap-3">
        <button 
          (click)="generateGuaranteeReport()"
          [disabled]="getOverallProgress() < 100"
          class="generate-report-btn flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span>📋</span>
          Generar Reporte de Garantías
        </button>
        
        <button 
          (click)="requestLegalReview()"
          class="legal-review-btn px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>⚖️</span>
          Revisión Legal
        </button>
      </div>
    </div>
  `,
  styles: [`
    .guarantee-panel {
      position: relative;
      overflow: hidden;
    }

    .guarantee-panel::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
    }

    .icon-container {
      font-size: 2rem;
      opacity: 0.9;
    }

    .document-item {
      position: relative;
      transition: all 0.2s ease;
    }

    .document-item:hover {
      transform: translateY(-1px);
    }

    .status-badge.approved {
      background-color: rgba(16, 185, 129, 0.2);
      color: rgb(16, 185, 129);
    }

    .status-badge.pending {
      background-color: rgba(107, 114, 128, 0.2);
      color: rgb(107, 114, 128);
    }

    .status-badge.in-review {
      background-color: rgba(245, 158, 11, 0.2);
      color: rgb(245, 158, 11);
    }

    .status-badge.rejected {
      background-color: rgba(239, 68, 68, 0.2);
      color: rgb(239, 68, 68);
    }

    .progress-fill {
      transition: width 0.3s ease-in-out;
    }

    .risk-assessment.low-risk {
      background-color: rgba(16, 185, 129, 0.1);
      color: rgb(16, 185, 129);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .risk-assessment.medium-risk {
      background-color: rgba(245, 158, 11, 0.1);
      color: rgb(245, 158, 11);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .risk-assessment.high-risk {
      background-color: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    @media (max-width: 768px) {
      .document-item {
        padding: 1rem;
      }
      
      .document-item .flex {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
      
      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class GuaranteePanelComponent {
  @Input() documents: Document[] = [];
  @Output() onUpload = new EventEmitter<string>();

  getDocumentDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'Carta Aval de Ruta': 'Documento que avala la participación en la ruta específica',
      'Convenio de Dación en Pago': 'Acuerdo legal para transferir propiedad como garantía de pago',
      'Acta Constitutiva de la Ruta': 'Documento legal que constituye formalmente la organización de la ruta',
      'Poder del Representante Legal': 'Autorización legal para actuar en nombre de la organización'
    };
    return descriptions[name] || '';
  }

  getStatusBadgeClass(status: DocumentStatus): string {
    const classes = {
      'Aprobado': 'status-badge approved',
      'Pendiente': 'status-badge pending', 
      'En Revisión': 'status-badge in-review',
      'Rechazado': 'status-badge rejected'
    };
    return classes[status] || 'status-badge pending';
  }

  getApprovedCount(): number {
    return this.documents.filter(doc => doc.status === 'Aprobado').length;
  }

  getOverallProgress(): number {
    if (this.documents.length === 0) return 0;
    return Math.round((this.getApprovedCount() / this.documents.length) * 100);
  }

  getConvenioProgress(): number {
    const convenio = this.documents.find(doc => doc.name === 'Convenio de Dación en Pago');
    if (!convenio) return 0;
    
    switch (convenio.status) {
      case 'Aprobado': return 100;
      case 'En Revisión': return 75;
      case 'Pendiente': return 25;
      default: return 0;
    }
  }

  getRiskLevel(): string {
    const progress = this.getOverallProgress();
    if (progress >= 80) return 'Riesgo Bajo';
    if (progress >= 50) return 'Riesgo Medio';
    return 'Riesgo Alto';
  }

  getRiskIcon(): string {
    const progress = this.getOverallProgress();
    if (progress >= 80) return '🟢';
    if (progress >= 50) return '🟡';
    return '🔴';
  }

  getRiskDescription(): string {
    const progress = this.getOverallProgress();
    if (progress >= 80) return 'Las garantías están bien cubiertas';
    if (progress >= 50) return 'Faltan algunos documentos importantes';
    return 'Se requieren más garantías para reducir el riesgo';
  }

  getRiskAssessmentClass(): string {
    const progress = this.getOverallProgress();
    if (progress >= 80) return 'risk-assessment low-risk';
    if (progress >= 50) return 'risk-assessment medium-risk';
    return 'risk-assessment high-risk';
  }

  viewDocument(document: Document): void {
    // Implement document viewing logic
  }

  generateGuaranteeReport(): void {
    // Implement report generation logic
  }

  requestLegalReview(): void {
    // Implement legal review request logic
  }
}
