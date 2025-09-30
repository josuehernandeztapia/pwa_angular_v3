import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Market, BusinessFlow, Client } from '../../../models/types';
import { Quote, ProductPackage, ClientType, SimulatorMode } from '../../../models/business';
import { TandaMilestone } from '../../../models/tanda';
import { CotizadorEngineService, ProductComponent } from '../../../services/cotizador-engine.service';
import { FlowContextService } from '../../../services/flow-context.service';
import { MarketPolicyContext, MarketPolicyService, PolicyClientType, PolicyMarket } from '../../../services/market-policy.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { SavingsProjectionChartComponent } from '../../shared/savings-projection-chart.component';
import { TandaTimelineComponent } from '../../shared/tanda-timeline.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { OfflineQueueBannerComponent } from '../../shared/offline-queue-banner/offline-queue-banner.component';
import { ToastService } from '../../../services/toast.service';

interface CollectionUnit {
  id: number;
  consumption: string;
  overprice: string;
}

interface AmortizationRow {
  paymentNumber: number;
  monthlyPayment: number;
  principal: number;
  interest: number;
  balance: number;
}

@Component({
  selector: 'app-cotizador-main',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, SavingsProjectionChartComponent, TandaTimelineComponent, OfflineQueueBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cotizador-main.component.html',
  styleUrls: ['./cotizador-main.component.scss'],
})
export class CotizadorMainComponent implements OnInit, OnDestroy {
  Math = Math;
  @Input() client?: Client;
  @Input() initialMode: SimulatorMode = 'acquisition';
  @Output() onFormalize = new EventEmitter<Quote | Event>();

  private destroy$ = new Subject<void>();

  // Progressive Disclosure State
  currentStep: number = 1;
  totalSteps: number = 4;

  get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  get canGoNext(): boolean {
    switch (this.currentStep) {
      case 1: return !!(this.market && this.clientType);
      case 2: return !!this.pkg;
      case 3: return this.totalPrice > 0;
      case 4: return true;
      default: return false;
    }
  }

  get canGoPrevious(): boolean {
    return this.currentStep > 1;
  }

  nextStep(): void {
    if (this.canGoNext && this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.canGoPrevious) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
    }
  }

  toNumber(value: any): number {
    const n = typeof value === 'number' ? value : parseFloat(value || '0');
    return isNaN(n) ? 0 : n;
  }

  // Port exacto de state desde React Cotizador
  market: Market | '' = '';
  clientType: ClientType | '' = '';
  pkg: ProductPackage | null = null;
  isLoading = false;

  // State for Acquisition Mode (port exacto líneas 125-131)
  selectedOptions: Record<string, boolean> = {};
  downPaymentPercentage = 20;
  term = 0;
  amortizationTable: AmortizationRow[] = [];
  downPaymentAmountDirect = '';

  // State for Savings Mode (port exacto líneas 132-138)
  initialDownPayment = '0';
  deliveryTerm = 3;
  voluntaryContribution = '0';
  collectionUnits: CollectionUnit[] = [];
  tandaMembers = 5;
  isProtectionDemoOpen = false;

  // UX improvements: insurance financing and first payment breakdown
  private _includeInsurance = false;
  private _insuranceAmount: any = '';
  private _insuranceMode: 'financiado' | 'contado' = 'financiado';

  get includeInsurance(): boolean {
    return this._includeInsurance;
  }

  set includeInsurance(value: boolean) {
    this._includeInsurance = value;
    this.persistFlowContextSnapshot('insurance-toggle');
  }

  get insuranceAmount(): any {
    return this._insuranceAmount;
  }

  set insuranceAmount(value: any) {
    this._insuranceAmount = value;
    this.persistFlowContextSnapshot('insurance-amount');
  }

  get insuranceMode(): 'financiado' | 'contado' {
    return this._insuranceMode;
  }

  set insuranceMode(value: 'financiado' | 'contado') {
    this._insuranceMode = value;
    this.persistFlowContextSnapshot('insurance-mode');
  }

  constructor(
    private cotizadorEngine: CotizadorEngineService,
    private pdf: PdfExportService,
    private toast: ToastService,
    private marketPolicy: MarketPolicyService,
    @Optional() private flowContext?: FlowContextService
  ) {}

  ngOnInit(): void {
    // Port exacto de useEffect desde React líneas 150-162
    if (this.client) {
      const clientMarket = this.client.ecosystemId ? 'edomex' : 'aguascalientes';
      const clientCtype = this.client.flow === BusinessFlow.CreditoColectivo ? 'colectivo' : 'individual';
      this.market = clientMarket;
      this.clientType = clientCtype;
    } else {
      this.market = '';
      this.clientType = '';
      this.pkg = null;
    }

    // Trigger package fetch if we have both market and clientType
    if (this.market && this.clientType) {
      this.fetchPackage();
    }

    this.persistFlowContextSnapshot('init');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Port exacto de computed properties desde React líneas 148, 206-233
  get isVentaDirecta(): boolean {
    return this.client?.flow === BusinessFlow.VentaDirecta;
  }

  get totalPrice(): number {
    if (!this.pkg) return 0;
    const years = this.term / 12;
    return this.pkg.components.reduce((sum, comp) => {
      // Include component if it's required OR if it's optional and selected
      if (!comp.isOptional || this.selectedOptions[comp.id]) {
        return sum + (comp.isMultipliedByTerm ? comp.price * Math.ceil(years) : comp.price);
      }
      return sum;
    }, 0);
  }

  get minDownPaymentRequired(): number {
    return this.totalPrice * (this.pkg?.minDownPaymentPercentage || 0);
  }

  get downPayment(): number {
    if (this.isVentaDirecta) {
      return parseFloat(this.downPaymentAmountDirect) || 0;
    }
    return this.totalPrice * (this.downPaymentPercentage / 100);
  }

  get amountToFinance(): number {
    const base = this.totalPrice - this.downPayment;
    if (this.isVentaDirecta) return base;
    const ins = this.includeInsurance ? (parseFloat(this.insuranceAmount) || 0) : 0;
    const addToF = this.includeInsurance && this.insuranceMode === 'financiado' ? ins : 0;
    return Math.max(0, base + addToF);
  }

  get monthlyPayment(): number {
    if (this.amountToFinance <= 0 || !this.term || !this.pkg?.rate) return 0;
    const monthlyRate = this.pkg.rate / 12;
    return (this.amountToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -this.term));
  }

  // First amortization row breakdown (I1, K1, S1)
  get firstInterest(): number {
    if (!this.pkg?.rate) return 0;
    const r = this.pkg.rate / 12;
    return this.amountToFinance * r;
  }
  get firstPrincipal(): number {
    const pmt = this.monthlyPayment;
    return Math.max(0, pmt - this.firstInterest);
  }
  get firstBalance(): number {
    return Math.max(0, this.amountToFinance - this.firstPrincipal);
  }

  // Port exacto de savings calculations desde React líneas 235-282
  get monthlySavings(): number {
    const voluntary = parseFloat(this.voluntaryContribution) || 0;
    const collection = this.collectionUnits.reduce((sum, unit) => 
      sum + ((parseFloat(unit.consumption) || 0) * (parseFloat(unit.overprice) || 0)), 0);
    return voluntary + collection;
  }

  get timeToGoal(): number {
    const goal = this.downPayment;
    return goal > 0 && this.monthlySavings > 0 ? goal / this.monthlySavings : 0;
  }

  get projectedCollectionSavings(): number {
    const collection = this.collectionUnits.reduce((sum, unit) => 
      sum + ((parseFloat(unit.consumption) || 0) * (parseFloat(unit.overprice) || 0)), 0);
    return collection * this.deliveryTerm;
  }

  get tandaTimeline(): TandaMilestone[] {
    // Port exacto de Tanda Timeline Simulation desde React líneas 244-279
    if (!this.pkg || this.clientType !== 'colectivo' || this.initialMode !== 'savings' || 
        this.totalPrice <= 0 || this.tandaMembers <= 0) {
      return [];
    }

    const downPaymentGoal = this.pkg.minDownPaymentPercentage * this.totalPrice;
    const singleMemberMonthlySaving = this.monthlySavings;
    const individualAmountToFinance = this.totalPrice - downPaymentGoal;
    
    let individualMonthlyPayment = 0;
    if (individualAmountToFinance > 0 && this.pkg.rate > 0 && this.pkg.terms.length > 0) {
      const individualTerm = this.pkg.terms[0];
      const monthlyRate = this.pkg.rate / 12;
      individualMonthlyPayment = (individualAmountToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -individualTerm));
    }

    const totalGroupMonthlyIncome = this.tandaMembers * singleMemberMonthlySaving;
    const timeline: TandaMilestone[] = [];
    let accumulatedSavingsSurplus = 0;
    let membersPaying = 0;

    for (let i = 1; i <= this.tandaMembers; i++) {
      const currentMonthlyDebtPayment = membersPaying * individualMonthlyPayment;
      const netSavingsPerMonth = totalGroupMonthlyIncome - currentMonthlyDebtPayment;
      
      if (netSavingsPerMonth <= 0) break;

      const savingsNeeded = downPaymentGoal - accumulatedSavingsSurplus;
      const monthsToSave = savingsNeeded > 0 ? savingsNeeded / netSavingsPerMonth : 0;
      
      timeline.push({ 
        type: 'ahorro', 
        duration: monthsToSave, 
        label: `Ahorro para Enganche ${i}`,
        month: i,
        completed: false,
        current: i === 1,
        icon: 'credit-card',
        title: `Enganche ${i}`,
        description: `Acumulando ${this.formatCurrency(downPaymentGoal)} para la entrega`,
        amount: downPaymentGoal
      });
      
      timeline.push({ 
        type: 'entrega', 
        unitNumber: i, 
        duration: 0.1, 
        label: `Entrega Unidad ${i}`,
        month: i,
        completed: false,
        current: false,
        icon: 'truck',
        title: `Entrega ${i}`,
        description: `Unidad #${i} entregada al grupo`
      });

      const totalSavingsGeneratedThisCycle = accumulatedSavingsSurplus + (monthsToSave * netSavingsPerMonth);
      accumulatedSavingsSurplus = totalSavingsGeneratedThisCycle - downPaymentGoal;
      membersPaying++;
    }

    return timeline;
  }

  // Event handlers - port exacto desde React
  onMarketChange(): void {
    this.clientType = '';
    this.pkg = null;
    this.persistFlowContextSnapshot('market-change');
  }

  onClientTypeChange(): void {
    if (this.market && this.clientType) {
      this.fetchPackage();
    }
    this.persistFlowContextSnapshot('client-type-change');
  }

  onDownPaymentSliderChange(): void {
    this.persistFlowContextSnapshot('downpayment-slider');
  }

  onDownPaymentDirectChange(): void {
    this.persistFlowContextSnapshot('downpayment-direct');
  }

  onTermChange(): void {
    this.persistFlowContextSnapshot('term-change');
  }

  onSavingsConfigChange(): void {
    this.persistFlowContextSnapshot('savings-config');
  }

  onTandaMembersChange(): void {
    this.persistFlowContextSnapshot('tanda-members');
  }

  toggleComponent(componentId: string): void {
    this.selectedOptions[componentId] = !this.selectedOptions[componentId];
    this.persistFlowContextSnapshot('component-toggle');
  }

  addCollectionUnit(): void {
    const newId = Date.now();
    this.collectionUnits.push({
      id: newId,
      consumption: '',
      overprice: ''
    });
    this.persistFlowContextSnapshot('collection-add');
  }

  // Port exacto de fetchPackage desde React líneas 164-200
  private fetchPackage(): void {
    if (!this.market || !this.clientType) {
      this.pkg = null;
      return;
    }

    let packageKey: string;
    const isTandaScenario = this.initialMode === 'savings' && this.market === 'edomex' && this.clientType === 'colectivo';

    if (isTandaScenario) {
      packageKey = 'edomex-colectivo';
    } else if (this.client?.flow === BusinessFlow.VentaDirecta) {
      packageKey = `${this.market}-directa`;
    } else {
      packageKey = `${this.market}-plazo`;
    }

    this.isLoading = true;
    this.cotizadorEngine.getProductPackage(packageKey).subscribe({
      next: (data) => {
        this.pkg = data;
        const initialOptions: Record<string, boolean> = {};
        data.components.forEach((c: ProductComponent) => { 
          initialOptions[c.id] = !c.isOptional; 
        });
        this.selectedOptions = initialOptions;
        this.term = data.terms[0] || 0;
        this.downPaymentPercentage = data.minDownPaymentPercentage * 100;
        this.tandaMembers = data.defaultMembers || 5;
        this.amortizationTable = [];
        this.collectionUnits = [];
        this.voluntaryContribution = '0';
        this.downPaymentAmountDirect = '';
        this.isLoading = false;
        this.persistFlowContextSnapshot('package-loaded');
      },
      error: (error) => {
        this.toast.error(`Error al cargar el paquete para ${this.market}`);
        this.pkg = null;
        this.isLoading = false;
        this.persistFlowContextSnapshot('package-error');
      }
    });
  }

  // Port exacto de calculateAmortization desde React líneas 318-331
  calculateAmortization(): void {
    if (this.amountToFinance <= 0) {
      this.toast.error("El monto a financiar debe ser mayor a cero.");
      return;
    }

    const table: AmortizationRow[] = [];
    let balance = this.amountToFinance;
    const monthlyRate = this.pkg!.rate / 12;
    
    for (let i = 1; i <= this.term; i++) {
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
    this.toast.success("Tabla de amortización calculada.");
    this.persistFlowContextSnapshot('amortization');
  }

  // Port exacto de handleFormalizeClick desde React líneas 284-315
  handleFormalizeClick(): void {
    if (!this.client) {
      this.onFormalize.emit(new Event('formalize'));
      return;
    }

    if (!this.pkg || !this.market || !this.clientType) {
      this.toast.error("Completa la configuración antes de formalizar.");
      return;
    }

    const quoteFlow = this.initialMode === 'savings' 
      ? BusinessFlow.AhorroProgramado 
      : this.client.flow;
    
    const finalFlow = this.client.flow === BusinessFlow.CreditoColectivo 
      ? BusinessFlow.CreditoColectivo 
      : quoteFlow;

    const quote: Quote = {
      totalPrice: this.totalPrice,
      downPayment: this.downPayment,
      amountToFinance: this.amountToFinance,
      term: this.term,
      monthlyPayment: this.monthlyPayment,
      market: this.market,
      clientType: this.clientType,
      flow: finalFlow,
    };
    
    this.persistFlowContextSnapshot('formalize');
    
    this.onFormalize.emit(quote);
  }

  openProtectionDemo(): void {
    this.isProtectionDemoOpen = true;
  }

  // Utility methods for savings mode calculations
  getDownPaymentPercentage(): number {
    const initialDown = parseFloat(this.initialDownPayment) || 0;
    return this.totalPrice > 0 ? (initialDown / this.totalPrice) * 100 : 0;
  }

  getSavedPercentage(): number {
    return this.totalPrice > 0 ? (this.projectedCollectionSavings / this.totalPrice) * 100 : 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }

  private persistFlowContextSnapshot(origin: string = 'auto'): void {
    if (!this.flowContext) {
      return;
    }

    const market = this.resolveMarket();
    const clientType = this.resolveClientType();
    if (!market || !clientType) {
      return;
    }

    const saleType: 'contado' | 'financiero' = this.isVentaDirecta ? 'contado' : 'financiero';
    const businessFlow = this.resolveBusinessFlow(clientType, saleType);
    const collectiveMembers = this.resolveCollectiveMembers(clientType);
    const monthlyPayment = this.resolveMonthlyPayment();

    const existing = this.flowContext.getContextData<any>('cotizador') ?? {};
    const policyContext = this.buildPolicyContext(market, clientType, saleType, businessFlow, collectiveMembers);

    let incomeThreshold: number | undefined;
    let incomeThresholdRatio: number | undefined;

    if (policyContext && monthlyPayment !== undefined && saleType === 'financiero') {
      const ratio = this.marketPolicy.getIncomeThreshold(policyContext);
      if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0) {
        incomeThresholdRatio = ratio;
        incomeThreshold = monthlyPayment * ratio;
      }
    }

    if (incomeThreshold === undefined && typeof existing.incomeThreshold === 'number') {
      incomeThreshold = existing.incomeThreshold;
    }
    if (incomeThresholdRatio === undefined && typeof existing.incomeThresholdRatio === 'number') {
      incomeThresholdRatio = existing.incomeThresholdRatio;
    }

    const requiresIncomeProof = saleType === 'financiero'
      ? (incomeThreshold !== undefined && monthlyPayment !== undefined
          ? monthlyPayment > incomeThreshold
          : existing.requiresIncomeProof)
      : false;

    if (policyContext && typeof requiresIncomeProof === 'boolean') {
      policyContext.requiresIncomeProof = requiresIncomeProof;
    }

    const membersArray = this.buildMembersArray(collectiveMembers, existing.members);

    const quotationData = {
      ...existing.quotationData,
      market,
      clientType,
      saleType,
      totalPrice: this.totalPrice,
      downPayment: this.downPayment,
      amountToFinance: this.amountToFinance,
      term: this.term,
      monthlyPayment,
      incomeThreshold,
      incomeThresholdRatio,
      requiresIncomeProof,
      collectiveMembers,
      members: membersArray,
      includeInsurance: this.includeInsurance,
      insuranceAmount: this.includeInsurance ? this.toNumber(this.insuranceAmount) : 0,
      insuranceMode: this.includeInsurance ? this.insuranceMode : 'contado',
      origin,
      updatedAt: Date.now(),
    };

    const payload = {
      ...existing,
      market,
      clientType,
      saleType,
      businessFlow,
      clientId: this.client?.id ?? existing.clientId,
      clientName: this.client?.name ?? existing.clientName,
      monthlyPayment,
      incomeThreshold,
      incomeThresholdRatio,
      requiresIncomeProof,
      collectiveMembers,
      members: membersArray,
      quotationData,
      policyContext,
    };

    this.flowContext.saveContext('cotizador', payload, {
      breadcrumbs: this.buildFlowContextBreadcrumbs(payload.clientName, payload.clientId),
    });
  }

  private resolveMarket(): PolicyMarket | null {
    if (this.market === 'aguascalientes' || this.market === 'edomex') {
      return this.market as PolicyMarket;
    }
    return null;
  }

  private resolveClientType(): PolicyClientType | null {
    if (this.clientType === 'individual' || this.clientType === 'colectivo') {
      return this.clientType as PolicyClientType;
    }
    if (this.client?.flow === BusinessFlow.CreditoColectivo) {
      return 'colectivo';
    }
    return null;
  }

  private resolveBusinessFlow(clientType: PolicyClientType, saleType: 'contado' | 'financiero'): BusinessFlow {
    if (saleType === 'contado') {
      return BusinessFlow.VentaDirecta;
    }
    if (clientType === 'colectivo') {
      return BusinessFlow.CreditoColectivo;
    }
    return BusinessFlow.VentaPlazo;
  }

  private resolveCollectiveMembers(clientType: PolicyClientType): number | undefined {
    if (clientType !== 'colectivo') {
      return undefined;
    }
    const members = Number(this.tandaMembers);
    return Number.isFinite(members) && members > 0 ? members : undefined;
  }

  private resolveMonthlyPayment(): number | undefined {
    const payment = this.monthlyPayment;
    if (!Number.isFinite(payment) || payment <= 0) {
      return undefined;
    }
    return payment;
  }

  private buildPolicyContext(
    market: PolicyMarket,
    clientType: PolicyClientType,
    saleType: 'contado' | 'financiero',
    businessFlow: BusinessFlow,
    collectiveMembers?: number,
  ): MarketPolicyContext | null {
    return {
      market,
      clientType,
      saleType,
      businessFlow,
      collectiveSize: collectiveMembers,
    };
  }

  private buildMembersArray(collectiveMembers: number | undefined, existingMembers: any): any {
    if (!collectiveMembers || collectiveMembers <= 0) {
      return undefined;
    }

    if (Array.isArray(existingMembers) && existingMembers.length === collectiveMembers) {
      return existingMembers;
    }

    return Array.from({ length: collectiveMembers }, (_, index) => index + 1);
  }

  private buildFlowContextBreadcrumbs(clientName?: string, clientId?: string): string[] {
    const crumbs = ['Dashboard', 'Cotizador'];
    if (clientName) {
      crumbs.push(clientName);
    } else if (clientId) {
      crumbs.push(`Cliente ${clientId}`);
    }
    return crumbs;
  }

  async generateOnePagePDF(): Promise<void> {
    try {
      if (!this.pkg) { this.toast.error('Selecciona un paquete primero'); return; }
      const quoteData = {
        clientInfo: { name: this.client?.name || 'Cliente', contact: this.client?.email || '' },
        ecosystemInfo: { name: this.market || '-', route: this.client?.collectiveGroupName || '-', market: (this.market === 'aguascalientes' ? 'AGS' : 'EDOMEX') as any },
        quoteDetails: {
          vehicleValue: this.totalPrice,
          downPaymentOptions: [this.downPayment],
          monthlyPaymentOptions: [Math.round(this.monthlyPayment)],
          termOptions: [this.term || (this.pkg.terms[0] || 24)],
          interestRate: Math.round((this.pkg.rate || 0) * 10000) / 100
        },
        validUntil: new Date(Date.now() + 14 * 86400000),
        quoteNumber: 'Q-' + Date.now()
      };
      const blob = await this.pdf.generateQuotePDF(quoteData as any);
      this.pdf.downloadPDF(blob, `cotizacion-${Date.now()}.pdf`);
      this.toast.success('PDF generado');
    } catch (e) {
      this.toast.error('No se pudo generar el PDF');
    }
  }
}
