import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Document, DocumentStatus } from '../../models/types';
import { IconComponent } from './icon/icon.component';

@Component({
  selector: 'app-guarantee-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './guarantee-panel.component.html',
  styleUrls: ['./guarantee-panel.component.scss']
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
    const classes: Record<DocumentStatus, string> = {
      [DocumentStatus.Aprobado]: 'guarantee-panel__status-badge--approved',
      [DocumentStatus.Pendiente]: 'guarantee-panel__status-badge--pending',
      [DocumentStatus.EnRevision]: 'guarantee-panel__status-badge--review',
      [DocumentStatus.Rechazado]: 'guarantee-panel__status-badge--rejected'
    };
    return classes[status] || 'guarantee-panel__status-badge--pending';
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

  getRiskTone(): 'success' | 'warning' | 'danger' {
    const progress = this.getOverallProgress();
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    return 'danger';
  }

  getRiskDescription(): string {
    const progress = this.getOverallProgress();
    if (progress >= 80) return 'Las garantías están bien cubiertas';
    if (progress >= 50) return 'Faltan algunos documentos importantes';
    return 'Se requieren más garantías para reducir el riesgo';
  }

  getRiskAssessmentClass(): string {
    const progress = this.getOverallProgress();
    if (progress >= 80) return 'guarantee-panel__risk--low';
    if (progress >= 50) return 'guarantee-panel__risk--medium';
    return 'guarantee-panel__risk--high';
  }

  getRiskToneClass(): string {
    const tone = this.getRiskTone();
    return `guarantee-panel__risk-dot--${tone}`;
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
