import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CotizadorEngineService } from '../../../../services/cotizador-engine.service';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { SavingsScenario, SimuladorEngineService } from '../../../../services/simulador-engine.service';
import { SpeechService } from '../../../../services/speech.service';
import { ToastService } from '../../../../services/toast.service';
import { FormFieldComponent } from '../../../shared/form-field.component';
import { SkeletonCardComponent } from '../../../shared/skeleton-card.component';
import { SummaryPanelComponent } from '../../../shared/summary-panel/summary-panel.component';

declare var Chart: any;

@Component({
  selector: 'app-ags-ahorro',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SummaryPanelComponent, SkeletonCardComponent, FormFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ags-ahorro.component.html',
  styleUrl: './ags-ahorro.component.scss',
})
export class AgsAhorroComponent implements OnInit, AfterViewInit {
  @ViewChild('ahorroChart') ahorroChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pmtChart') pmtChartRef!: ElementRef<HTMLCanvasElement>;
  private ahorroChart: any;
  private pmtChart: any;
  simuladorForm!: FormGroup;
  currentScenario?: SavingsScenario;
  plates: string[] = [];
  consumptions: number[] = [];
  newPlate = '';
  isLoading = false;
  isSimulating = false;
  asideActions = [
    { label: '📄 PDF', click: () => this.generatePDF() },
    { label: '✅ Continuar', click: () => this.proceedWithScenario() }
  ];
  
  // Enhanced features
  amortizationTable: any[] = [];
  showAmortizationTable = false;
  showWhatsAppShare = false;
  currentViewMode: 'simple' | 'advanced' = 'simple';
  showProtectionDemo = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private simuladorEngine: SimuladorEngineService,
    private toast: ToastService,
    private cotizadorEngine: CotizadorEngineService,
    private pdfExport: PdfExportService,
    private speech: SpeechService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadDefaultValues();
  }

  ngAfterViewInit(): void {
    // Chart.js will be initialized when a scenario is calculated
  }

  private createForm(): void {
    this.simuladorForm = this.fb.group({
      unitValue: [799000, [Validators.required, Validators.min(700000)]],
      initialDownPayment: [400000, [Validators.required, Validators.min(0)]],
      deliveryMonths: [6, Validators.required],
      overpricePerLiter: [5.00, [Validators.required, Validators.min(1)]]
    });
  }

  private loadDefaultValues(): void {
    // Pre-load typical AGS scenario
    this.plates = ['ABC-1234'];
    this.consumptions = [2500]; // Typical consumption
  }

  addPlate(): void {
    if (this.newPlate.trim()) {
      this.plates.push(this.newPlate.trim().toUpperCase());
      this.consumptions.push(2500); // Default consumption
      this.newPlate = '';
      this.onConfigChange();
    }
  }

  removePlate(index: number): void {
    this.plates.splice(index, 1);
    this.consumptions.splice(index, 1);
    this.onConfigChange();
  }

  onConfigChange(): void {
    this.currentScenario = undefined;
  }

  simulateScenario(): void {
    if (!this.canSimulate()) return;

    const formValue = this.simuladorForm.value;
    this.isSimulating = true;

    try {
      const scenario = this.simuladorEngine.generateAGSLiquidationScenario(
        formValue.initialDownPayment,
        formValue.deliveryMonths,
        this.plates,
        this.consumptions,
        formValue.overpricePerLiter,
        formValue.unitValue
      );

      this.currentScenario = scenario;
      this.toast.success('Escenario AGS simulado exitosamente');
      this.isSimulating = false;

      // Initialize charts after scenario is set
      setTimeout(() => this.initializeCharts(), 100);
    } catch (error) {
      this.toast.error('Error al simular escenario AGS');
      this.isSimulating = false;
    }
  }

  proceedWithScenario(): void {
    if (!this.currentScenario) return;
    
    // Store scenario for next step
    sessionStorage.setItem('agsScenario', JSON.stringify(this.currentScenario));
    this.toast.success('Escenario guardado, creando cliente...');
    
    this.router.navigate(['/clientes/nuevo'], {
      queryParams: {
        fromSimulator: 'ags-ahorro',
        market: 'aguascalientes',
        flow: 'AhorroProgramado'
      }
    });
  }

  resetSimulation(): void {
    this.currentScenario = undefined;
    this.toast.info('Simulación limpiada');
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  generatePDF(): void {
    if (!this.currentScenario) {
      this.toast.error('Primero ejecuta la simulación');
      return;
    }

    const formValue = this.simuladorForm.value;
    const scenarioData = {
      targetAmount: this.currentScenario.targetAmount,
      monthsToTarget: this.currentScenario.monthsToTarget,
      monthlyContribution: this.currentScenario.monthlyContribution,
      projectedBalance: this.currentScenario.projectedBalance,
      timeline: this.currentScenario.timeline,
      plates: this.plates,
      consumptions: this.consumptions,
      overpricePerLiter: formValue.overpricePerLiter,
      remainderAmount: this.remainderAmount
    };

    this.pdfExport.generateAGSSavingsPDF(scenarioData).then(blob => {
      const filename = `simulacion-ags-ahorro-${new Date().getTime()}.pdf`;
      this.pdfExport.downloadPDF(blob, filename);
      this.toast.success('PDF de simulación descargado');
    }).catch(error => {
      this.toast.error('Error al generar PDF');
    });
  }

  saveDraft(): void {
    if (!this.currentScenario) { this.toast.error('Primero ejecuta la simulación'); return; }
    const formValue = this.simuladorForm.value;
    const draftKey = `agsScenario-${Date.now()}-draft`;
    const draft = {
      clientName: '',
      market: 'aguascalientes',
      clientType: 'Individual',
      timestamp: Date.now(),
      scenario: {
        targetAmount: this.currentScenario.targetAmount,
        monthsToTarget: this.currentScenario.monthsToTarget,
        monthlyContribution: this.currentScenario.monthlyContribution
      },
      configParams: {
        unitValue: formValue.unitValue,
        initialDownPayment: formValue.initialDownPayment,
        deliveryMonths: formValue.deliveryMonths,
        plates: this.plates,
        consumptions: this.consumptions,
        overpricePerLiter: formValue.overpricePerLiter
      }
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      this.toast.success('Simulación guardada');
    } catch (e) {
      this.toast.error('No se pudo guardar la simulación');
    }
  }

  // Getters and helpers
  canSimulate(): boolean {
    return this.simuladorForm.valid && 
           this.plates.length > 0 && 
           this.consumptions.every(c => c > 0) &&
           !this.isSimulating;
  }

  get remainderAmount(): number {
    if (!this.currentScenario) return 0;
    
    const totalProjected = this.simuladorForm.value.initialDownPayment + 
                          (this.currentScenario.monthlyContribution * this.currentScenario.monthsToTarget);
    return Math.max(0, this.currentScenario.targetAmount - totalProjected);
  }

  get displayTimeline(): any[] {
    return this.currentScenario?.timeline.slice(0, 8) || [];
  }

  getTimelineClass(event: any): string {
    if (event.amount < 0) return 'negative';
    if (event.event.includes('Entrega')) return 'positive';
    return '';
  }

  // Enhanced features methods
  calculateAmortization(): void {
    if (!this.currentScenario) return;

    const remainderToFinance = this.remainderAmount;
    if (remainderToFinance <= 0) {
      this.toast.info('No hay monto a financiar para calcular amortización');
      return;
    }

    // Use AGS financing terms (25.5% annual rate, typical 12-24 months)
    const annualRate = 0.255; // 25.5%
    const term = 24; // 24 months typical
    const monthlyRate = annualRate / 12;
    const monthlyPayment = (remainderToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));

    const table = [];
    let balance = remainderToFinance;

    for (let i = 1; i <= term; i++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      balance -= principal;

      table.push({
        paymentNumber: i,
        monthlyPayment: monthlyPayment,
        principal: principal,
        interest: interest,
        balance: balance > 0 ? balance : 0
      });
    }

    this.amortizationTable = table;
    this.showAmortizationTable = true;
    this.toast.success('Tabla de amortización calculada');
  }

  toggleViewMode(): void {
    this.currentViewMode = this.currentViewMode === 'simple' ? 'advanced' : 'simple';
  }

  shareWhatsApp(): void {
    if (!this.currentScenario) return;

    const message = this.generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  private generateWhatsAppMessage(): string {
    if (!this.currentScenario) return '';

    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    
    return `🌵 *Simulación AGS Ahorro Programado*

📊 *Resumen del Plan:*
• Meta: ${formatter.format(this.currentScenario.targetAmount)}
• Enganche inicial: ${formatter.format(this.simuladorForm.value.initialDownPayment)}
• Ahorro mensual: ${formatter.format(this.currentScenario.monthlyContribution)}
• Tiempo estimado: ${this.currentScenario.monthsToTarget} meses
• Remanente a liquidar: ${formatter.format(this.remainderAmount)}

🚐 *Placas incluidas:* ${this.plates.join(', ')}
⛽ *Sobreprecio por litro:* $${this.simuladorForm.value.overpricePerLiter}

¿Te interesa formalizar este plan? ¡Contáctanos!`;
  }

  speakSummary(): void {
    if (!this.currentScenario) return;

    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const text = `Simulación de ahorro AGS completada. 
    Tu meta es ${formatter.format(this.currentScenario.targetAmount)}. 
    Con tu enganche inicial de ${formatter.format(this.simuladorForm.value.initialDownPayment)} 
    y ahorrando ${formatter.format(this.currentScenario.monthlyContribution)} pesos mensuales, 
    lograrás tu objetivo en ${this.currentScenario.monthsToTarget} meses. 
    Quedaría un remanente de ${formatter.format(this.remainderAmount)} pesos para liquidar.`;

    this.speech.speak(text);
  }

  private initializeCharts(): void {
    if (!this.currentScenario) return;

    this.initializeAhorroChart();
    this.initializePMTChart();
  }

  private initializeAhorroChart(): void {
    if (!this.ahorroChartRef?.nativeElement || !this.currentScenario) return;

    if (this.ahorroChart) {
      this.ahorroChart.destroy();
    }

    const ctx = this.ahorroChartRef.nativeElement.getContext('2d');
    const months = Array.from({ length: this.currentScenario.monthsToTarget }, (_, i) => i + 1);
    const projectedData = this.currentScenario.projectedBalance || [];

    this.ahorroChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Ahorro Acumulado',
          data: projectedData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Proyección de Ahorro Mensual',
            font: { size: 14, weight: '600' },
            color: '#374151'
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Mes', color: '#6B7280' },
            grid: { color: '#E5E7EB' }
          },
          y: {
            title: { display: true, text: 'Monto ($)', color: '#6B7280' },
            grid: { color: '#E5E7EB' },
            ticks: {
              callback: (value: any) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    });
  }

  private initializePMTChart(): void {
    if (!this.pmtChartRef?.nativeElement || !this.currentScenario) return;

    if (this.pmtChart) {
      this.pmtChart.destroy();
    }

    const ctx = this.pmtChartRef.nativeElement.getContext('2d');
    const remainderAmount = this.remainderAmount;
    const monthlyContribution = this.currentScenario.monthlyContribution;

    this.pmtChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ahorro Programado', 'Remanente a Financiar'],
        datasets: [{
          data: [monthlyContribution * this.currentScenario.monthsToTarget, remainderAmount],
          backgroundColor: ['#10B981', '#F59E0B'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true }
          },
          title: {
            display: true,
            text: 'Distribución de Financiamiento',
            font: { size: 14, weight: '600' },
            color: '#374151'
          }
        }
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }
}

