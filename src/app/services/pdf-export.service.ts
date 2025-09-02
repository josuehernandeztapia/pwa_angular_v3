import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

interface ContractData {
  clientInfo: {
    name: string;
    curp: string;
    rfc: string;
    address: string;
    phone: string;
    email: string;
  };
  ecosystemInfo: {
    name: string;
    route: string;
    market: 'AGS' | 'EDOMEX';
  };
  financialInfo: {
    vehicleValue: number;
    downPayment: number;
    monthlyPayment: number;
    term: number;
    interestRate: number;
  };
  contractTerms: {
    startDate: Date;
    endDate: Date;
    contractNumber: string;
  };
}

interface QuoteData {
  clientInfo: {
    name: string;
    contact: string;
  };
  ecosystemInfo: {
    name: string;
    route: string;
    market: 'AGS' | 'EDOMEX';
  };
  quoteDetails: {
    vehicleValue: number;
    downPaymentOptions: number[];
    monthlyPaymentOptions: number[];
    termOptions: number[];
    interestRate: number;
  };
  validUntil: Date;
  quoteNumber: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  constructor() {}

  // Generate contract PDF
  generateContractPDF(contractData: ContractData): Promise<Blob> {
    return new Promise((resolve) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(6, 214, 160);
      doc.text('CONDUCTORES DEL MUNDO', 105, 25, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('CONTRATO DE FINANCIAMIENTO', 105, 35, { align: 'center' });
      
      // Contract number and date
      doc.setFontSize(10);
      doc.text(`Contrato No: ${contractData.contractTerms.contractNumber}`, 20, 50);
      doc.text(`Fecha: ${this.formatDate(contractData.contractTerms.startDate)}`, 150, 50);
      
      // Client Information Section
      let yPos = 70;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('DATOS DEL CONDUCTOR', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const clientLines = [
        `Nombre: ${contractData.clientInfo.name}`,
        `CURP: ${contractData.clientInfo.curp}`,
        `RFC: ${contractData.clientInfo.rfc}`,
        `Dirección: ${contractData.clientInfo.address}`,
        `Teléfono: ${contractData.clientInfo.phone}`,
        `Email: ${contractData.clientInfo.email}`
      ];
      
      clientLines.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 6;
      });
      
      // Ecosystem Information Section
      yPos += 10;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('INFORMACIÓN DE RUTA', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const ecosystemLines = [
        `Ecosistema: ${contractData.ecosystemInfo.name}`,
        `Ruta: ${contractData.ecosystemInfo.route}`,
        `Mercado: ${contractData.ecosystemInfo.market}`
      ];
      
      ecosystemLines.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 6;
      });
      
      // Financial Information Section
      yPos += 10;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('TÉRMINOS FINANCIEROS', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const financialLines = [
        `Valor del Vehículo: $${this.formatCurrency(contractData.financialInfo.vehicleValue)}`,
        `Enganche: $${this.formatCurrency(contractData.financialInfo.downPayment)}`,
        `Pago Mensual: $${this.formatCurrency(contractData.financialInfo.monthlyPayment)}`,
        `Plazo: ${contractData.financialInfo.term} meses`,
        `Tasa de Interés: ${contractData.financialInfo.interestRate}% anual`
      ];
      
      financialLines.forEach(line => {
        doc.text(line, 20, yPos);
        yPos += 6;
      });
      
      // Contract Terms Section
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(45, 55, 72);
      doc.text('TÉRMINOS Y CONDICIONES', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      const terms = [
        '1. El presente contrato se regirá por las leyes mexicanas aplicables.',
        '2. Los pagos deberán realizarse puntualmente según el calendario establecido.',
        '3. El conductor se compromete a mantener el vehículo en óptimas condiciones.',
        '4. Cualquier modificación deberá ser acordada por escrito.',
        '5. En caso de incumplimiento, se aplicarán las penalizaciones correspondientes.',
        '6. El conductor acepta los términos del ecosistema de transporte seleccionado.',
        `7. La vigencia del contrato es del ${this.formatDate(contractData.contractTerms.startDate)} al ${this.formatDate(contractData.contractTerms.endDate)}.`
      ];
      
      terms.forEach(term => {
        const lines = doc.splitTextToSize(term, 170);
        lines.forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 2;
      });
      
      // Signatures section
      yPos += 20;
      doc.setFontSize(10);
      doc.text('FIRMAS', 105, yPos, { align: 'center' });
      
      yPos += 30;
      doc.line(30, yPos, 90, yPos);
      doc.line(120, yPos, 180, yPos);
      
      yPos += 5;
      doc.text('CONDUCTOR', 60, yPos, { align: 'center' });
      doc.text('CONDUCTORES DEL MUNDO', 150, yPos, { align: 'center' });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Documento generado automáticamente por Conductores PWA', 105, 280, { align: 'center' });
      doc.text(`Generado el: ${this.formatDateTime(new Date())}`, 105, 285, { align: 'center' });
      
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    });
  }

  // Generate quote PDF
  generateQuotePDF(quoteData: QuoteData): Promise<Blob> {
    return new Promise((resolve) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(6, 214, 160);
      doc.text('CONDUCTORES DEL MUNDO', 105, 25, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('COTIZACIÓN DE FINANCIAMIENTO', 105, 35, { align: 'center' });
      
      // Quote number and date
      doc.setFontSize(10);
      doc.text(`Cotización No: ${quoteData.quoteNumber}`, 20, 50);
      doc.text(`Válida hasta: ${this.formatDate(quoteData.validUntil)}`, 150, 50);
      
      // Client Information
      let yPos = 70;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('INFORMACIÓN DEL CLIENTE', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Cliente: ${quoteData.clientInfo.name}`, 20, yPos);
      yPos += 6;
      doc.text(`Contacto: ${quoteData.clientInfo.contact}`, 20, yPos);
      
      // Ecosystem Information
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('INFORMACIÓN DE RUTA', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Ecosistema: ${quoteData.ecosystemInfo.name}`, 20, yPos);
      yPos += 6;
      doc.text(`Ruta: ${quoteData.ecosystemInfo.route}`, 20, yPos);
      yPos += 6;
      doc.text(`Mercado: ${quoteData.ecosystemInfo.market}`, 20, yPos);
      
      // Quote Details
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('OPCIONES DE FINANCIAMIENTO', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Valor del Vehículo: $${this.formatCurrency(quoteData.quoteDetails.vehicleValue)}`, 20, yPos);
      yPos += 6;
      doc.text(`Tasa de Interés: ${quoteData.quoteDetails.interestRate}% anual`, 20, yPos);
      
      // Options table
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(45, 55, 72);
      doc.text('OPCIONES DE PAGO', 20, yPos);
      
      yPos += 10;
      
      // Table headers
      doc.setFontSize(9);
      doc.setFillColor(6, 214, 160);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('ENGANCHE', 25, yPos + 5);
      doc.text('PAGO MENSUAL', 70, yPos + 5);
      doc.text('PLAZO', 125, yPos + 5);
      doc.text('TOTAL A PAGAR', 150, yPos + 5);
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      
      // Generate rows for different options
      for (let i = 0; i < quoteData.quoteDetails.downPaymentOptions.length; i++) {
        if (yPos > 250) break; // Avoid page overflow
        
        const downPayment = quoteData.quoteDetails.downPaymentOptions[i];
        const monthlyPayment = quoteData.quoteDetails.monthlyPaymentOptions[i];
        const term = quoteData.quoteDetails.termOptions[i];
        const totalToPay = downPayment + (monthlyPayment * term);
        
        // Alternate row background
        if (i % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(20, yPos, 170, 8, 'F');
        }
        
        doc.text(`$${this.formatCurrency(downPayment)}`, 25, yPos + 5);
        doc.text(`$${this.formatCurrency(monthlyPayment)}`, 70, yPos + 5);
        doc.text(`${term} meses`, 125, yPos + 5);
        doc.text(`$${this.formatCurrency(totalToPay)}`, 150, yPos + 5);
        
        yPos += 8;
      }
      
      // Important notes
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(45, 55, 72);
      doc.text('NOTAS IMPORTANTES', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      const notes = [
        '• Esta cotización es válida únicamente hasta la fecha indicada.',
        '• Los montos están sujetos a aprobación crediticia.',
        '• Se requiere documentación completa para proceder.',
        '• Los términos pueden variar según el perfil crediticio.',
        '• Para más información, contacte a su asesor financiero.'
      ];
      
      notes.forEach(note => {
        doc.text(note, 20, yPos);
        yPos += 5;
      });
      
      // Contact info
      yPos += 15;
      doc.setFontSize(10);
      doc.setTextColor(6, 214, 160);
      doc.text('CONDUCTORES DEL MUNDO', 105, yPos, { align: 'center' });
      yPos += 5;
      doc.setTextColor(0, 0, 0);
      doc.text('📞 01-800-CONDUCE | 📧 info@conductores.com', 105, yPos, { align: 'center' });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Cotización generada automáticamente por Conductores PWA', 105, 280, { align: 'center' });
      doc.text(`Generada el: ${this.formatDateTime(new Date())}`, 105, 285, { align: 'center' });
      
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    });
  }

  // Download PDF file
  downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Share PDF (mobile)
  async sharePDF(blob: Blob, filename: string, title: string): Promise<void> {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: title,
            text: `Compartir ${title}`
          });
        } catch (error) {
          console.log('Error sharing:', error);
          // Fallback to download
          this.downloadPDF(blob, filename);
        }
      } else {
        // Fallback to download
        this.downloadPDF(blob, filename);
      }
    } else {
      // Fallback to download
      this.downloadPDF(blob, filename);
    }
  }

  // Utility methods
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  // Generate combined proposal PDF (quote + contract preview)
  // Generate simulation PDF for AGS Savings
  generateAGSSavingsPDF(scenarioData: {
    targetAmount: number;
    monthsToTarget: number;
    monthlyContribution: number;
    projectedBalance: number[];
    timeline: Array<{ month: number; event: string; amount: number }>;
    plates: string[];
    consumptions: number[];
    overpricePerLiter: number;
    remainderAmount: number;
  }): Promise<Blob> {
    return new Promise((resolve) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(6, 214, 160);
      doc.text('CONDUCTORES DEL MUNDO', 105, 25, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('SIMULACIÓN AGS AHORRO PROGRAMADO', 105, 35, { align: 'center' });
      
      let yPos = 50;
      doc.setFontSize(10);
      doc.text(`Generado: ${this.formatDateTime(new Date())}`, 20, yPos);
      
      // Key Metrics Section
      yPos += 20;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('MÉTRICAS CLAVE', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const metrics = [
        `Meta Total: $${this.formatCurrency(scenarioData.targetAmount)}`,
        `Tiempo a Meta: ${scenarioData.monthsToTarget} meses`,
        `Recaudación Mensual: $${this.formatCurrency(scenarioData.monthlyContribution)}`,
        `Sobreprecio por Litro: $${scenarioData.overpricePerLiter.toFixed(2)}`,
        `Balance Proyectado: $${this.formatCurrency(scenarioData.projectedBalance[scenarioData.projectedBalance.length - 1] || 0)}`,
        `Remanente a Liquidar: $${this.formatCurrency(scenarioData.remainderAmount)}`
      ];
      
      metrics.forEach(metric => {
        doc.text(metric, 20, yPos);
        yPos += 6;
      });
      
      // Plates and Consumption Table
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('PLACAS Y CONSUMO', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(9);
      doc.setFillColor(6, 214, 160);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('PLACA', 25, yPos + 5);
      doc.text('CONSUMO (L/MES)', 80, yPos + 5);
      doc.text('RECAUDACIÓN MENSUAL', 140, yPos + 5);
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      
      scenarioData.plates.forEach((plate, i) => {
        const consumption = scenarioData.consumptions[i] || 0;
        const monthlyRevenue = consumption * scenarioData.overpricePerLiter;
        
        if (i % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(20, yPos, 170, 6, 'F');
        }
        
        doc.text(plate, 25, yPos + 4);
        doc.text(consumption.toString(), 80, yPos + 4);
        doc.text(`$${this.formatCurrency(monthlyRevenue)}`, 140, yPos + 4);
        yPos += 6;
      });
      
      // Timeline Section
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('CRONOLOGÍA DE AHORRO', 20, yPos);
      
      yPos += 10;
      doc.setFontSize(9);
      
      scenarioData.timeline.slice(0, 12).forEach(event => {
        doc.text(`Mes ${event.month}: ${event.event} - $${this.formatCurrency(Math.abs(event.amount))}`, 20, yPos);
        yPos += 5;
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Simulación generada por Conductores PWA', 105, 280, { align: 'center' });
      
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    });
  }

  // Generate simulation PDF for Individual Down Payment Planning
  generateIndividualPlanningPDF(planData: {
    targetDownPayment: number;
    monthsToTarget: number;
    monthlyCollection: number;
    voluntaryMonthly: number;
    plateConsumption: number;
    overpricePerLiter: number;
    projectedBalance: number[];
  }): Promise<Blob> {
    return new Promise((resolve) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(6, 214, 160);
      doc.text('CONDUCTORES DEL MUNDO', 105, 25, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('PLANIFICADOR DE ENGANCHE INDIVIDUAL', 105, 35, { align: 'center' });
      
      let yPos = 60;
      
      // Plan Summary
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('RESUMEN DEL PLAN', 20, yPos);
      
      yPos += 15;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const planSummary = [
        `Meta de Enganche: $${this.formatCurrency(planData.targetDownPayment)}`,
        `Tiempo Estimado: ${planData.monthsToTarget} meses`,
        `Recaudación por Placa: $${this.formatCurrency(planData.monthlyCollection)}`,
        `Aporte Voluntario: $${this.formatCurrency(planData.voluntaryMonthly)}`,
        `Contribución Total Mensual: $${this.formatCurrency(planData.monthlyCollection + planData.voluntaryMonthly)}`
      ];
      
      planSummary.forEach(item => {
        doc.text(item, 20, yPos);
        yPos += 8;
      });
      
      // Projection Chart (Simple representation)
      yPos += 20;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('PROYECCIÓN DE AHORRO', 20, yPos);
      
      yPos += 15;
      doc.setFontSize(9);
      
      // Show monthly progression for first 12 months
      planData.projectedBalance.slice(0, 12).forEach((balance, i) => {
        const month = i + 1;
        doc.text(`Mes ${month}: $${this.formatCurrency(balance)}`, 20, yPos);
        yPos += 5;
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Plan generado por Conductores PWA', 105, 280, { align: 'center' });
      
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    });
  }

  // Generate collective tanda simulation PDF
  generateTandaPDF(tandaData: {
    memberCount: number;
    unitPrice: number;
    monthlyContribution: number;
    timeline: Array<{ month: number; event: string }>;
    totalSavings: number[];
    firstDeliveryMonth: number;
    avgTimeToAward: number;
  }): Promise<Blob> {
    return new Promise((resolve) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(6, 214, 160);
      doc.text('CONDUCTORES DEL MUNDO', 105, 25, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('SIMULACIÓN TANDA COLECTIVA', 105, 35, { align: 'center' });
      
      let yPos = 60;
      
      // Tanda Configuration
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('CONFIGURACIÓN DE LA TANDA', 20, yPos);
      
      yPos += 15;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const config = [
        `Número de Miembros: ${tandaData.memberCount}`,
        `Precio por Unidad: $${this.formatCurrency(tandaData.unitPrice)}`,
        `Contribución Mensual por Miembro: $${this.formatCurrency(tandaData.monthlyContribution)}`,
        `Total Contribuciones Mensuales: $${this.formatCurrency(tandaData.monthlyContribution * tandaData.memberCount)}`,
        `Primera Entrega en Mes: ${tandaData.firstDeliveryMonth}`,
        `Tiempo Promedio de Entrega: ${tandaData.avgTimeToAward.toFixed(1)} meses`
      ];
      
      config.forEach(item => {
        doc.text(item, 20, yPos);
        yPos += 8;
      });
      
      // Benefits Section
      yPos += 20;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('BENEFICIOS DEL MODELO TANDA', 20, yPos);
      
      yPos += 15;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const benefits = [
        '• Entrega más rápida que ahorro individual',
        '• Efecto bola de nieve accelera el proceso',
        '• Solidaridad grupal reduce riesgos',
        '• Menor enganche requerido (15% vs 25%)',
        '• Aprovechamiento de economías de escala'
      ];
      
      benefits.forEach(benefit => {
        doc.text(benefit, 20, yPos);
        yPos += 6;
      });
      
      // Timeline Preview
      yPos += 20;
      doc.setFontSize(14);
      doc.setTextColor(45, 55, 72);
      doc.text('CRONOGRAMA DE ENTREGAS', 20, yPos);
      
      yPos += 15;
      doc.setFontSize(9);
      
      tandaData.timeline.slice(0, 10).forEach(event => {
        doc.text(`Mes ${event.month}: ${event.event}`, 20, yPos);
        yPos += 5;
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Simulación de Tanda generada por Conductores PWA', 105, 280, { align: 'center' });
      
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    });
  }

  generateProposalPDF(quoteData: QuoteData, selectedOption: number): Promise<Blob> {
    return new Promise((resolve) => {
      const doc = new jsPDF();
      
      // Cover page
      doc.setFontSize(24);
      doc.setTextColor(6, 214, 160);
      doc.text('CONDUCTORES DEL MUNDO', 105, 50, { align: 'center' });
      
      doc.setFontSize(18);
      doc.setTextColor(45, 55, 72);
      doc.text('PROPUESTA DE FINANCIAMIENTO', 105, 70, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Cliente: ${quoteData.clientInfo.name}`, 105, 90, { align: 'center' });
      doc.text(`Ruta: ${quoteData.ecosystemInfo.name}`, 105, 105, { align: 'center' });
      
      // Selected option highlight
      const selectedDownPayment = quoteData.quoteDetails.downPaymentOptions[selectedOption];
      const selectedMonthlyPayment = quoteData.quoteDetails.monthlyPaymentOptions[selectedOption];
      const selectedTerm = quoteData.quoteDetails.termOptions[selectedOption];
      
      let yPos = 130;
      doc.setFontSize(16);
      doc.setTextColor(6, 214, 160);
      doc.text('OPCIÓN SELECCIONADA', 105, yPos, { align: 'center' });
      
      yPos += 20;
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Highlight box
      doc.setFillColor(6, 214, 160, 0.1);
      doc.rect(30, yPos - 5, 150, 50, 'F');
      doc.setDrawColor(6, 214, 160);
      doc.rect(30, yPos - 5, 150, 50);
      
      doc.text(`Valor del Vehículo: $${this.formatCurrency(quoteData.quoteDetails.vehicleValue)}`, 105, yPos + 5, { align: 'center' });
      doc.text(`Enganche: $${this.formatCurrency(selectedDownPayment)}`, 105, yPos + 15, { align: 'center' });
      doc.text(`Pago Mensual: $${this.formatCurrency(selectedMonthlyPayment)}`, 105, yPos + 25, { align: 'center' });
      doc.text(`Plazo: ${selectedTerm} meses`, 105, yPos + 35, { align: 'center' });
      
      // Add new page for detailed terms
      doc.addPage();
      
      // Detailed terms page
      yPos = 30;
      doc.setFontSize(18);
      doc.setTextColor(45, 55, 72);
      doc.text('TÉRMINOS DETALLADOS', 105, yPos, { align: 'center' });
      
      yPos += 20;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      const detailedTerms = [
        `Propuesta válida hasta: ${this.formatDate(quoteData.validUntil)}`,
        `Ecosistema: ${quoteData.ecosystemInfo.name}`,
        `Ruta autorizada: ${quoteData.ecosystemInfo.route}`,
        `Mercado: ${quoteData.ecosystemInfo.market}`,
        '',
        'CONDICIONES DE FINANCIAMIENTO:',
        `• Enganche: ${((selectedDownPayment / quoteData.quoteDetails.vehicleValue) * 100).toFixed(1)}%`,
        `• Financiamiento: $${this.formatCurrency(quoteData.quoteDetails.vehicleValue - selectedDownPayment)}`,
        `• Tasa de interés: ${quoteData.quoteDetails.interestRate}% anual`,
        `• Comisión por apertura: Incluida en los pagos`,
        '',
        'REQUISITOS:',
        '• Identificación oficial vigente',
        '• Comprobante de domicilio (no mayor a 3 meses)',
        '• Comprobante de ingresos',
        '• Referencias personales y comerciales',
        '• CURP y RFC',
        '',
        'BENEFICIOS:',
        '• Acceso inmediato al ecosistema de transporte',
        '• Capacitación incluida',
        '• Soporte técnico 24/7',
        '• Seguimiento personalizado'
      ];
      
      detailedTerms.forEach(term => {
        if (term === '') {
          yPos += 5;
        } else if (term.endsWith(':')) {
          doc.setFontSize(11);
          doc.setTextColor(45, 55, 72);
          doc.text(term, 20, yPos);
          yPos += 8;
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
        } else {
          doc.text(term, 20, yPos);
          yPos += 6;
        }
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Propuesta generada automáticamente por Conductores PWA', 105, 280, { align: 'center' });
      doc.text(`Generada el: ${this.formatDateTime(new Date())}`, 105, 285, { align: 'center' });
      
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    });
  }
  
  async generateReportPDF(reportType: string, reportData: any): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        
        let title = '';
        let icon = '';
        
        switch(reportType) {
          case 'simulaciones':
            title = 'Reporte de Simulaciones';
            icon = '📊';
            break;
          case 'cotizaciones':
            title = 'Reporte de Cotizaciones';
            icon = '💼';
            break;
          case 'clientes':
            title = 'Reporte de Clientes';
            icon = '👥';
            break;
          case 'financiero':
            title = 'Análisis Financiero';
            icon = '📈';
            break;
          case 'proteccion':
            title = 'Reporte de Protección';
            icon = '🛡️';
            break;
          default:
            title = 'Reporte General';
            icon = '📄';
        }
        
        doc.text(`${icon} ${title}`, pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${reportData.reportDate?.toLocaleDateString('es-MX') || new Date().toLocaleDateString('es-MX')}`, pageWidth / 2, 30, { align: 'center' });
        
        let yPos = 50;
        
        // Content based on report type
        this.addReportContent(doc, reportType, reportData, yPos);
        
        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('🤖 Generado con Claude Code', pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        const pdfBlob = doc.output('blob');
        
        // Download the PDF
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        resolve(pdfBlob);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  private addReportContent(doc: jsPDF, reportType: string, data: any, startY: number): void {
    let yPos = startY;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 RESUMEN EJECUTIVO', 20, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    switch(reportType) {
      case 'simulaciones':
        doc.text(`Total de simulaciones: ${data.totalSimulations}`, 25, yPos); yPos += 8;
        doc.text(`Simulaciones AGS: ${data.agsSimulations}`, 25, yPos); yPos += 8;
        doc.text(`Simulaciones EdoMex: ${data.edomexSimulations}`, 25, yPos); yPos += 8;
        doc.text(`Simulaciones Tanda: ${data.tandaSimulations}`, 25, yPos); yPos += 8;
        doc.text(`Meta promedio: $${data.avgTargetAmount.toLocaleString('es-MX')}`, 25, yPos); yPos += 8;
        doc.text(`Tiempo promedio: ${data.avgMonthsToTarget} meses`, 25, yPos); yPos += 8;
        doc.text(`Tasa de éxito: ${data.successRate}%`, 25, yPos);
        break;
        
      case 'cotizaciones':
        doc.text(`Total de cotizaciones: ${data.totalQuotes}`, 25, yPos); yPos += 8;
        doc.text(`Cotizaciones AGS: ${data.agsQuotes}`, 25, yPos); yPos += 8;
        doc.text(`Cotizaciones EdoMex: ${data.edomexQuotes}`, 25, yPos); yPos += 8;
        doc.text(`Valor promedio: $${data.avgQuoteAmount.toLocaleString('es-MX')}`, 25, yPos); yPos += 8;
        doc.text(`Tasa de conversión: ${data.conversionRate}%`, 25, yPos); yPos += 8;
        doc.text(`Cotizaciones pendientes: ${data.pendingQuotes}`, 25, yPos);
        break;
        
      case 'clientes':
        doc.text(`Total de clientes: ${data.totalClients}`, 25, yPos); yPos += 8;
        doc.text(`Clientes activos: ${data.activeClients}`, 25, yPos); yPos += 8;
        doc.text(`Nuevos este mes: ${data.newClientsThisMonth}`, 25, yPos); yPos += 8;
        doc.text(`Mercado AGS: ${data.clientsByMarket.aguascalientes}`, 25, yPos); yPos += 8;
        doc.text(`Mercado EdoMex: ${data.clientsByMarket.edomex}`, 25, yPos); yPos += 8;
        doc.text(`Valor promedio: $${data.avgClientValue.toLocaleString('es-MX')}`, 25, yPos);
        break;
        
      case 'financiero':
        doc.text(`Ingresos totales: $${data.totalRevenue.toLocaleString('es-MX')}`, 25, yPos); yPos += 8;
        doc.text(`Ingresos proyectados: $${data.projectedRevenue.toLocaleString('es-MX')}`, 25, yPos); yPos += 8;
        doc.text(`Crecimiento mensual: ${data.avgMonthlyGrowth}%`, 25, yPos); yPos += 8;
        doc.text(`Mejor mercado: ${data.topPerformingMarket}`, 25, yPos); yPos += 8;
        doc.text(`Monto financiado total: $${data.totalFinancedAmount.toLocaleString('es-MX')}`, 25, yPos); yPos += 8;
        doc.text(`Tasa de interés promedio: ${data.avgInterestRate}%`, 25, yPos);
        break;
        
      case 'proteccion':
        doc.text(`Total de clientes: ${data.totalClients}`, 25, yPos); yPos += 8;
        doc.text(`Clientes alto riesgo: ${data.highRiskClients} (${data.riskDistribution.high.toFixed(1)}%)`, 25, yPos); yPos += 8;
        doc.text(`Clientes riesgo medio: ${data.mediumRiskClients} (${data.riskDistribution.medium.toFixed(1)}%)`, 25, yPos); yPos += 8;
        doc.text(`Clientes bajo riesgo: ${data.lowRiskClients} (${data.riskDistribution.low.toFixed(1)}%)`, 25, yPos); yPos += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('🎯 RECOMENDACIONES', 20, yPos);
        yPos += 10;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        data.recommendations.forEach((rec: string) => {
          doc.text(`• ${rec}`, 25, yPos);
          yPos += 8;
        });
        break;
    }
  }
}