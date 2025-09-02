import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reportes-container">
      <h1>📊 Reportes</h1>
      
      <div class="reports-grid">
        <div class="report-card">
          <h3>📈 Reporte de Simulaciones</h3>
          <p>Resumen de todas las simulaciones realizadas</p>
          <button (click)="generateSimulationsReport()" class="report-btn">📄 Generar PDF</button>
        </div>
        
        <div class="report-card">
          <h3>💼 Reporte de Cotizaciones</h3>
          <p>Historial de cotizaciones y ventas</p>
          <button (click)="generateQuotesReport()" class="report-btn">📄 Generar PDF</button>
        </div>
        
        <div class="report-card">
          <h3>👥 Reporte de Clientes</h3>
          <p>Base de datos de clientes activos</p>
          <button (click)="generateClientsReport()" class="report-btn">📄 Generar PDF</button>
        </div>
        
        <div class="report-card">
          <h3>📊 Análisis Financiero</h3>
          <p>Métricas y análisis de rendimiento</p>
          <button (click)="generateFinancialReport()" class="report-btn">📄 Generar PDF</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reportes-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-top: 32px;
    }
    
    .report-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      padding: 24px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }
    
    .report-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    }
    
    .report-card h3 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 1.25rem;
    }
    
    .report-card p {
      margin: 0 0 16px 0;
      color: #718096;
      line-height: 1.5;
    }
    
    .report-btn {
      background: #3182ce;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 20px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      width: 100%;
    }
    
    .report-btn:hover {
      background: #2c5282;
    }
  `]
})
export class ReportesComponent {
  
  constructor(
    private pdfExportService: PdfExportService,
    private toast: ToastService
  ) {}
  
  generateSimulationsReport(): void {
    const simulationsData = {
      totalSimulations: 25,
      agsSimulations: 12,
      edomexSimulations: 8,
      tandaSimulations: 5,
      avgTargetAmount: 749000,
      avgMonthsToTarget: 18,
      successRate: 85,
      reportDate: new Date()
    };
    
    this.pdfExportService.generateReportPDF('simulaciones', simulationsData)
      .then(() => {
        this.toast.success('Reporte de simulaciones generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar reporte de simulaciones');
      });
  }
  
  generateQuotesReport(): void {
    const quotesData = {
      totalQuotes: 18,
      agsQuotes: 11,
      edomexQuotes: 7,
      avgQuoteAmount: 799000,
      conversionRate: 68,
      pendingQuotes: 5,
      reportDate: new Date()
    };
    
    this.pdfExportService.generateReportPDF('cotizaciones', quotesData)
      .then(() => {
        this.toast.success('Reporte de cotizaciones generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar reporte de cotizaciones');
      });
  }
  
  generateClientsReport(): void {
    const clientsData = {
      totalClients: 42,
      activeClients: 38,
      newClientsThisMonth: 8,
      clientsByMarket: {
        aguascalientes: 24,
        edomex: 18
      },
      avgClientValue: 750000,
      reportDate: new Date()
    };
    
    this.pdfExportService.generateReportPDF('clientes', clientsData)
      .then(() => {
        this.toast.success('Reporte de clientes generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar reporte de clientes');
      });
  }
  
  generateFinancialReport(): void {
    const financialData = {
      totalRevenue: 15750000,
      projectedRevenue: 22500000,
      avgMonthlyGrowth: 12.5,
      topPerformingMarket: 'Aguascalientes',
      totalFinancedAmount: 8950000,
      avgInterestRate: 25.5,
      reportDate: new Date()
    };
    
    this.pdfExportService.generateReportPDF('financiero', financialData)
      .then(() => {
        this.toast.success('Reporte financiero generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar reporte financiero');
      });
  }
}