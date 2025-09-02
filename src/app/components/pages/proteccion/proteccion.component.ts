import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-proteccion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="proteccion-container">
      <header class="page-header">
        <h1>🛡️ Sistema de Protección</h1>
        <p>Análisis de riesgo y protección financiera para transportistas</p>
      </header>

      <main class="page-main">
        <div class="analysis-grid">
          <div class="analysis-card high-risk">
            <h3>Alto Riesgo</h3>
            <div class="risk-count">{{ highRiskClients }}</div>
            <p>Clientes requieren atención inmediata</p>
          </div>

          <div class="analysis-card medium-risk">
            <h3>Riesgo Medio</h3>
            <div class="risk-count">{{ mediumRiskClients }}</div>
            <p>Monitoreo recomendado</p>
          </div>

          <div class="analysis-card low-risk">
            <h3>Bajo Riesgo</h3>
            <div class="risk-count">{{ lowRiskClients }}</div>
            <p>Situación estable</p>
          </div>
        </div>

        <div class="tools-section">
          <h2>🔧 Herramientas de Protección</h2>
          <div class="tools-grid">
            <button class="tool-card" (click)="openTool('savings')">
              💰 Simulador de Ahorro
            </button>
            <button class="tool-card" (click)="openTool('cashflow')">
              📈 Análisis de Flujo
            </button>
            <button class="tool-card" (click)="openTool('contingency')">
              🎯 Plan de Contingencia
            </button>
            <button class="tool-card" (click)="openTool('report')">
              📋 Reporte de Riesgo
            </button>
            <button class="tool-card" (click)="generateProtectionReport()">
              📄 Generar Reporte PDF
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .proteccion-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 2rem;
      font-weight: 700;
    }

    .page-header p {
      margin: 0;
      color: #718096;
      font-size: 1.1rem;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .analysis-card {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 24px;
      text-align: center;
      transition: all 0.2s;
    }

    .analysis-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }

    .analysis-card h3 {
      margin: 0 0 12px 0;
      color: #2d3748;
      font-size: 1.2rem;
    }

    .risk-count {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .high-risk .risk-count {
      color: #e53e3e;
    }

    .medium-risk .risk-count {
      color: #dd6b20;
    }

    .low-risk .risk-count {
      color: #38a169;
    }

    .analysis-card p {
      margin: 0;
      color: #718096;
    }

    .tools-section h2 {
      margin-bottom: 20px;
      color: #2d3748;
      text-align: center;
    }

    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .tool-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
      color: #4a5568;
    }

    .tool-card:hover {
      background: #f7fafc;
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      .proteccion-container {
        padding: 16px;
      }

      .analysis-grid, .tools-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProteccionComponent {
  highRiskClients = 12;
  mediumRiskClients = 28;
  lowRiskClients = 156;

  constructor(
    private pdfExportService: PdfExportService,
    private toast: ToastService
  ) {}

  openTool(tool: string): void {
    console.log('Abrir herramienta:', tool);
  }
  
  generateProtectionReport(): void {
    const protectionData = {
      totalClients: this.highRiskClients + this.mediumRiskClients + this.lowRiskClients,
      highRiskClients: this.highRiskClients,
      mediumRiskClients: this.mediumRiskClients,
      lowRiskClients: this.lowRiskClients,
      riskDistribution: {
        high: (this.highRiskClients / (this.highRiskClients + this.mediumRiskClients + this.lowRiskClients)) * 100,
        medium: (this.mediumRiskClients / (this.highRiskClients + this.mediumRiskClients + this.lowRiskClients)) * 100,
        low: (this.lowRiskClients / (this.highRiskClients + this.mediumRiskClients + this.lowRiskClients)) * 100
      },
      recommendations: [
        'Contactar inmediatamente a clientes de alto riesgo',
        'Implementar plan de seguimiento para riesgo medio', 
        'Mantener monitoreo de clientes de bajo riesgo',
        'Revisar pólizas y garantías existentes'
      ],
      reportDate: new Date()
    };
    
    this.pdfExportService.generateReportPDF('proteccion', protectionData)
      .then(() => {
        this.toast.success('Reporte de protección generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar reporte de protección');
      });
  }
}