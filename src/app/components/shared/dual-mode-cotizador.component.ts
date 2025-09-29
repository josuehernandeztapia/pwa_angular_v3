import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from './icon/icon.component';
import { BusinessFlow, Client } from '../../models/types';
import { Quote, SimulatorMode } from '../../models/business';
import { CotizadorEngineService, ProductPackage } from '../../services/cotizador-engine.service';
import { FinancialCalculatorService } from '../../services/financial-calculator.service';
import { SavingsScenario, SimuladorEngineService } from '../../services/simulador-engine.service';
import { SpeechService } from '../../services/speech.service';
import { ToastService } from '../../services/toast.service';

type Market = 'aguascalientes' | 'edomex';
type ClientType = 'individual' | 'colectivo';

interface Component {
  id: string;
  name: string;
  price: number;
  isOptional: boolean;
  isMultipliedByTerm?: boolean;
}

interface CollectionUnit {
  id: number;
  consumption: string;
  overprice: string;
}

@Component({
  selector: 'app-dual-mode-cotizador',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconComponent],
  templateUrl: './dual-mode-cotizador.component.html',
  styleUrls: ['./dual-mode-cotizador.component.scss'],
})
export class DualModeCotizadorComponent implements OnInit {
  @Input() client?: Client;
  @Input() initialMode: SimulatorMode = 'acquisition';
  @Output() onFormalize = new EventEmitter<Quote | any>();

  // State
  currentMode: SimulatorMode = 'acquisition';
  selectedMarket: Market | '' = '';
  selectedClientType: ClientType | '' = '';
  packageData?: ProductPackage;
  isLoading = false;
  
  // Acquisition Mode State
  selectedComponents: Record<string, boolean> = {};
  downPaymentPercentage = 60;
  selectedTerm = 12;
  directPaymentAmount = 0;
  
  // Savings Mode State
  initialDownPayment = 0;
  deliveryTerm = 6;
  voluntaryMonthly = 0;
  tandaMembers = 5;
  collectionUnits: CollectionUnit[] = [];
  
  // Results
  savingsScenario?: SavingsScenario;
  amortizationTable: any[] = [];
  showAmortizationModal = false;

  constructor(
    private fb: FormBuilder,
    private cotizadorEngine: CotizadorEngineService,
    private simuladorEngine: SimuladorEngineService,
    private financialCalc: FinancialCalculatorService,
    private toast: ToastService,
    private speech: SpeechService
  ) {}

  ngOnInit() {
    this.currentMode = this.initialMode;
    
    if (this.client) {
      this.selectedMarket = this.client.ecosystemId ? 'edomex' : 'aguascalientes';
      this.selectedClientType = this.client.flow?.includes('Colectivo') ? 'colectivo' : 'individual';
      this.loadPackageData();
    }
    
    this.initializeCollectionUnits();
  }

  switchMode(mode: SimulatorMode) {
    this.currentMode = mode;
    this.clearResults();
  }

  async onContextChange() {
    if (this.selectedMarket && this.selectedClientType) {
      await this.loadPackageData();
    }
  }

  async loadPackageData() {
    if (!this.selectedMarket || !this.selectedClientType) return;

    this.isLoading = true;
    
    try {
      let packageKey = '';
      
      if (this.currentMode === 'savings' && this.selectedMarket === 'edomex' && this.selectedClientType === 'colectivo') {
        packageKey = 'edomex-colectivo';
      } else if (this.client?.flow?.includes('VentaDirecta')) {
        packageKey = `${this.selectedMarket}-directa`;
      } else {
        packageKey = `${this.selectedMarket}-plazo`;
      }
      
      this.packageData = await this.cotizadorEngine.getProductPackage(packageKey);

      if (!this.packageData) {
        return;
      }

      // Initialize selected components
      this.selectedComponents = {};
      this.packageData.components.forEach(comp => {
        this.selectedComponents[comp.id] = !comp.isOptional;
      });
      
      this.selectedTerm = this.packageData.terms[0];
      this.downPaymentPercentage = this.packageData.minDownPaymentPercentage * 100;
      
      if (this.currentMode === 'acquisition') {
        this.calculateResults();
      } else if (this.currentMode === 'savings') {
        this.calculateSavingsResults();
      }
      
    } catch (error) {
      this.toast.error('Error al cargar datos del paquete');
    } finally {
      this.isLoading = false;
    }
  }

  onComponentChange(componentId: string, event: any) {
    this.selectedComponents[componentId] = event.target.checked;
    this.calculateResults();
  }

  calculateResults() {
    if (!this.packageData) return;
    // Calculation logic here - similar to existing cotizador
  }

  calculateSavingsResults() {
    if (!this.packageData || !this.selectedMarket || !this.selectedClientType) return;

    try {
      if (this.selectedMarket === 'aguascalientes' && this.selectedClientType === 'individual') {
        // AGS Liquidation scenario
        const plates = this.collectionUnits.map((_, i) => `PLACA-${i + 1}`);
        const consumptions = this.collectionUnits.map(u => parseFloat(u.consumption) || 0);
        const overprice = this.collectionUnits.length > 0 ? parseFloat(this.collectionUnits[0].overprice) || 0 : 0;
        
        this.savingsScenario = this.simuladorEngine.generateAGSLiquidationScenario(
          this.initialDownPayment,
          this.deliveryTerm,
          plates,
          consumptions,
          overprice,
          this.totalPrice
        );
      } else if (this.selectedMarket === 'edomex' && this.selectedClientType === 'individual') {
        // EdoMex Individual scenario
        const targetDownPayment = this.totalPrice * 0.2; // 20% down payment
        const consumption = this.collectionUnits.reduce((sum, u) => sum + (parseFloat(u.consumption) || 0), 0);
        const overprice = this.collectionUnits.length > 0 ? parseFloat(this.collectionUnits[0].overprice) || 0 : 0;
        
        this.savingsScenario = this.simuladorEngine.generateEdoMexIndividualScenario(
          targetDownPayment,
          consumption,
          overprice,
          this.voluntaryMonthly
        );
      }
    } catch (error) {
      this.toast.error('Error al calcular escenario de ahorro');
    }
  }

  initializeCollectionUnits() {
    this.collectionUnits = [
      { id: 1, consumption: '400', overprice: '3.0' }
    ];
  }

  addCollectionUnit() {
    const newId = Math.max(...this.collectionUnits.map(u => u.id)) + 1;
    this.collectionUnits.push({ id: newId, consumption: '', overprice: '' });
  }

  removeCollectionUnit(index: number) {
    this.collectionUnits.splice(index, 1);
    this.calculateSavingsResults();
  }

  clearResults() {
    this.savingsScenario = undefined;
    this.amortizationTable = [];
  }

  calculateAmortization() {
    if (!this.packageData || this.amountToFinance <= 0) return;

    const monthlyRate = this.packageData.rate / 12;
    const table = [];
    let balance = this.amountToFinance;

    for (let i = 1; i <= this.selectedTerm; i++) {
      const interest = balance * monthlyRate;
      const principal = this.monthlyPayment - interest;
      balance -= principal;

      table.push({
        paymentNumber: i,
        monthlyPayment: this.monthlyPayment,
        principal,
        interest,
        balance: balance > 0 ? balance : 0
      });
    }

    this.amortizationTable = table;
    this.showAmortizationModal = true;
  }

  closeAmortizationModal() {
    this.showAmortizationModal = false;
  }

  shareWhatsApp() {
    const message = this.generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  speakSummary() {
    const text = this.generateSpeechText();
    this.speech.speak(text);
  }

  formalizeQuote() {
    if (this.currentMode === 'acquisition') {
      const quote: Quote = {
        totalPrice: this.totalPrice,
        downPayment: this.downPayment,
        amountToFinance: this.amountToFinance,
        monthlyPayment: this.monthlyPayment,
        term: this.selectedTerm,
        market: this.selectedMarket,
        clientType: this.selectedClientType,
        flow: BusinessFlow.VentaPlazo
      };
      this.onFormalize.emit(quote);
    } else {
      this.onFormalize.emit(this.savingsScenario);
    }
  }

  private generateWhatsAppMessage(): string {
    if (this.currentMode === 'acquisition') {
      return `🛒 *Cotización ${this.selectedMarket.toUpperCase()}*

💰 *Resumen:*
• Precio total: ${this.formatCurrency(this.totalPrice)}
• Enganche: ${this.formatCurrency(this.downPayment)}
• ${this.isVentaDirecta ? 'Remanente' : 'Financiamiento'}: ${this.formatCurrency(this.amountToFinance)}
${!this.isVentaDirecta ? `• Pago mensual: ${this.formatCurrency(this.monthlyPayment)}` : ''}
${!this.isVentaDirecta ? `• Plazo: ${this.selectedTerm} meses` : ''}

¿Te interesa formalizar esta cotización?`;
    } else {
      return `💰 *Simulación de Ahorro ${this.selectedMarket.toUpperCase()}*

📊 *Tu Plan:*
• Meta: ${this.formatCurrency(this.savingsScenario?.targetAmount || 0)}
• Ahorro mensual: ${this.formatCurrency(this.savingsScenario?.monthlyContribution || 0)}
• Tiempo estimado: ${this.savingsScenario?.monthsToTarget || 0} meses

¿Quieres formalizar este plan de ahorro?`;
    }
  }

  private generateSpeechText(): string {
    if (this.currentMode === 'acquisition') {
      return `Cotización calculada. El precio total es ${this.formatCurrency(this.totalPrice)}. 
               ${this.isVentaDirecta ? 
                 `Con un pago inicial de ${this.formatCurrency(this.downPayment)}, queda un remanente de ${this.formatCurrency(this.amountToFinance)}.` :
                 `Con un enganche de ${this.formatCurrency(this.downPayment)} y un financiamiento de ${this.formatCurrency(this.amountToFinance)} a ${this.selectedTerm} meses, el pago mensual sería de ${this.formatCurrency(this.monthlyPayment)}.`}`;
    } else {
      return `Simulación de ahorro completada. Tu meta es ${this.formatCurrency(this.savingsScenario?.targetAmount || 0)}. 
               Con un ahorro mensual de ${this.formatCurrency(this.savingsScenario?.monthlyContribution || 0)}, 
               lograrás tu objetivo en ${this.savingsScenario?.monthsToTarget || 0} meses.`;
    }
  }

  private formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }

  // Getters for calculated values
  get totalPrice(): number {
    if (!this.packageData) return 0;
    
    return this.packageData.components
      .filter(comp => this.selectedComponents[comp.id])
      .reduce((sum, comp) => {
        const years = Math.ceil(this.selectedTerm / 12);
        return sum + (comp.isMultipliedByTerm ? comp.price * years : comp.price);
      }, 0);
  }

  get downPayment(): number {
    if (this.isVentaDirecta) {
      return this.directPaymentAmount;
    }
    return this.totalPrice * (this.downPaymentPercentage / 100);
  }

  get amountToFinance(): number {
    return this.totalPrice - this.downPayment;
  }

  get monthlyPayment(): number {
    if (this.isVentaDirecta || !this.packageData || this.amountToFinance <= 0) {
      return 0;
    }
    
    const monthlyRate = this.packageData.rate / 12;
    return (this.amountToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -this.selectedTerm));
  }

  get isVentaDirecta(): boolean {
    return this.client?.flow?.includes('VentaDirecta') || false;
  }

  getModeTabClasses(mode: SimulatorMode): Record<string, boolean> {
    return {
      'dual-cotizador__mode-tab--active': this.currentMode === mode,
    };
  }

  getComponentClasses(component: Component): Record<string, boolean> {
    return {
      'dual-cotizador__component--required': !component.isOptional,
    };
  }

  getTimelineMarkerClasses(type: string): Record<string, boolean> {
    return {
      'dual-cotizador__timeline-marker--entrega': type === 'entrega',
      'dual-cotizador__timeline-marker--espera': type !== 'entrega',
    };
  }

  // Helper methods for savings results
  getBarPercentage(type: 'downPayment' | 'savings'): number {
    if (!this.savingsScenario) return 0;
    
    const total = this.savingsScenario.targetAmount;
    if (type === 'downPayment') {
      return (this.initialDownPayment / total) * 100;
    } else {
      const projected = this.getProjectedSavings();
      return (projected / total) * 100;
    }
  }

  getProjectedSavings(): number {
    if (!this.savingsScenario) return 0;
    return this.savingsScenario.monthlyContribution * this.savingsScenario.monthsToTarget;
  }

  getRemainder(): number {
    if (!this.savingsScenario) return 0;
    return Math.max(0, this.savingsScenario.targetAmount - this.initialDownPayment - this.getProjectedSavings());
  }

  getChartBarHeight(balance: number, target: number): string {
    const percentage = Math.min((balance / target) * 100, 100);
    return `${percentage}%`;
  }

  getTandaMilestones(): any[] {
    // Simplified tanda milestones - would integrate with TandaEngineService
    return [
      { type: 'ahorro', duration: 2.3, label: 'Ahorro para primer enganche' },
      { type: 'entrega', duration: 0.1, label: 'Entrega primera unidad' },
      { type: 'ahorro', duration: 1.8, label: 'Ahorro para segundo enganche' },
      { type: 'entrega', duration: 0.1, label: 'Entrega segunda unidad' }
    ];
  }
}
