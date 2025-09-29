import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent {
  
  constructor(
    private pdfExportService: PdfExportService,
    private toast: ToastService
  ) {}
  
  generateAllReports(): void {
    this.generateSimulationsReport();
    this.generateQuotesReport();
    this.generateClientsReport();
    this.generateFinancialReport();
  }
  
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
