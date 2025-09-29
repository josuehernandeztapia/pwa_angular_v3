import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { EcosystemUiService } from '../../../services/ecosystem-ui.service';
import { CustomValidators } from '../../../validators/custom-validators';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../shared/icon/icon-definitions';

// Dynamic Wizard Step Interface
interface WizardStep {
  id: string;
  label: string;
  required: boolean;
  visible: boolean;
  completed: boolean;
  validationFields?: string[];
  icon?: string;
}

@Component({
  selector: 'app-nueva-oportunidad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent],
  templateUrl: './nueva-oportunidad.component.html',
  styleUrls: ['./nueva-oportunidad.component.scss'],
})
export class NuevaOportunidadComponent implements OnInit, OnDestroy {
  opportunityForm!: FormGroup;
  opportunityType: 'COTIZACION' | 'SIMULACION' | null = null;
  opportunityTypeError = false;
  isLoading = false;
  private autoSaveSub?: Subscription;
  
  // Smart Context Integration
  smartContext: any = {
    market: undefined,
    suggestedFlow: undefined,
    timestamp: undefined,
    returnContext: undefined
  };
  
  // Progress Tracking - Dynamic Steps
  currentStep = 1;
  totalSteps = 4; // Will be calculated dynamically
  visibleSteps: WizardStep[] = [];
  
  // Draft Management
  hasDraftAvailable = false;
  draftRecovered = false;
  draftData: any = null;
  private draftKey = 'nueva-oportunidad-draft';
  
  // Anti-duplicate System
  isCheckingDuplicates = false;
  similarClients: any[] = [];
  
  // Intelligent Autocomplete System
  clientSuggestions: any[] = [];
  showSuggestions = false;
  selectedSuggestionIndex = -1;
  private suggestionTimeout: any;
  
  // Dynamic Fields State
  selectedEcosystem = '';
  availableEcosystems: any[] = [];
  loadingEcosystems = false;
  errorEcosystems = false;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private ecosystemUiService: EcosystemUiService
  ) {}

  ngOnInit() {
    this.loadSmartContext();
    this.checkForDrafts();
    this.initializeForm();
    this.setupDuplicateDetection();
    this.initializeDynamicSteps();
    this.startAutoSave();
    this.loadEcosystems();
  }

  ngOnDestroy() {
    if (this.autoSaveSub) this.autoSaveSub.unsubscribe();
  }

  /**
   * SMART CONTEXT INTEGRATION
   * Load intelligence from Dashboard navigation
   */
  private loadSmartContext(): void {
    this.route.queryParams.subscribe(params => {
      this.smartContext = {
        market: params['market'],
        suggestedFlow: params['suggestedFlow'],
        timestamp: params['timestamp'],
        returnContext: params['returnContext']
      };
      
      // Auto-suggest opportunity type based on business intelligence
      if (this.smartContext.suggestedFlow && !this.opportunityType) {
        this.opportunityType = this.smartContext.suggestedFlow;
        this.updateCurrentStep();
      }
    });
  }

  /**
   * DRAFT MANAGEMENT SYSTEM
   * Check for existing drafts and offer recovery
   */
  private checkForDrafts(): void {
    const savedDraft = localStorage.getItem(this.draftKey);
    if (savedDraft) {
      try {
        this.draftData = JSON.parse(savedDraft);
        // Only show draft if it's less than 24 hours old
        const draftAge = Date.now() - this.draftData.timestamp;
        if (draftAge < 24 * 60 * 60 * 1000) {
          this.hasDraftAvailable = true;
        } else {
          // Clean up old draft
          localStorage.removeItem(this.draftKey);
        }
      } catch (error) {
        localStorage.removeItem(this.draftKey);
      }
    }
  }

  initializeForm() {
    this.opportunityForm = this.fb.group({
      clientName: ['', [Validators.required, CustomValidators.clientName]],
      phone: ['', [Validators.required, CustomValidators.mexicanPhone]],
      email: ['', [Validators.email]],
      rfc: ['', []],
      market: [this.smartContext.market || '', [Validators.required]], // Smart pre-population
      municipality: [''], // Required only for EdoMex
      saleType: ['', [Validators.required]],
      clientType: [''],
      ecosystem: [''], // Dynamic field for EdoMex
      notes: ['']
    });
    
    // Watch form changes for dynamic step recalculation
    this.opportunityForm.valueChanges.subscribe(() => {
      this.recalculateSteps();
      this.updateCurrentStep();
    });

    // Apply dynamic contact requirements initially
    this.updateContactRequirements();
  }

  /**
   * DYNAMIC WIZARD CORE - The Brain of Adaptive Flow
   * Initialize and manage dynamic step visibility
   */
  private initializeDynamicSteps(): void {
    this.recalculateSteps();
  }

  private recalculateSteps(): void {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;
    const opportunityType = this.opportunityType;

    // Base steps that always exist
    const baseSteps: WizardStep[] = [
      {
        id: 'client-info',
        label: 'Cliente',
        required: true,
        visible: true,
        completed: this.isStepCompleted('client-info'),
        validationFields: ['clientName', 'phone']
      },
      {
        id: 'opportunity-type',
        label: 'Tipo',
        required: true,
        visible: true,
        completed: this.isStepCompleted('opportunity-type'),
        validationFields: []
      }
    ];

    // Dynamic steps based on business rules
    const dynamicSteps: WizardStep[] = [];

    // Market Configuration - Always needed but varies by complexity
    if (market === 'aguascalientes' && clientType === 'Individual') {
      // AGS Individual: Simplified market step
      dynamicSteps.push({
        id: 'market-simple',
        label: 'Configuración',
        required: true,
        visible: true,
        completed: this.isStepCompleted('market-simple'),
        validationFields: ['market', 'clientType']
      });
    } else if (market === 'edomex') {
      // EdoMex: Full market configuration
      dynamicSteps.push({
        id: 'market-full',
        label: 'Mercado',
        required: true,
        visible: true,
        completed: this.isStepCompleted('market-full'),
        validationFields: ['market', 'clientType']
      });

      // EdoMex requires ecosystem selection
      if (clientType) {
        dynamicSteps.push({
          id: 'ecosystem',
          label: 'Ecosistema',
          required: true,
          visible: true,
          completed: this.isStepCompleted('ecosystem'),
          validationFields: ['ecosystem']
        });
      }
    } else {
      // Default market step for other combinations
      dynamicSteps.push({
        id: 'market-default',
        label: 'Mercado',
        required: true,
        visible: true,
        completed: this.isStepCompleted('market-default'),
        validationFields: ['market', 'clientType']
      });
    }


    // Final confirmation step
    const finalSteps: WizardStep[] = [
      {
        id: 'confirmation',
        label: 'Confirmar',
        required: true,
        visible: true,
        completed: this.isStepCompleted('confirmation'),
        validationFields: []
      }
    ];

    // Combine all visible steps
    this.visibleSteps = [...baseSteps, ...dynamicSteps, ...finalSteps];
    this.totalSteps = this.visibleSteps.length;
  }

  /**
   * Check if a specific step is completed based on its validation fields
   */
  private isStepCompleted(stepId: string): boolean {
    switch (stepId) {
      case 'client-info':
        return this.validateClientInfo();
      
      case 'opportunity-type':
        return this.validateOpportunityType();
      
      case 'market-simple':
      case 'market-full':
      case 'market-default':
        return this.validateMarketConfiguration();
      
      case 'ecosystem':
        return this.validateEcosystemSelection();
      
      
      case 'confirmation':
        return this.opportunityForm.valid && !!this.opportunityType;
      
      default:
        return false;
    }
  }

  // === BUSINESS RULES VALIDATION ===
  private validateClientInfo(): boolean {
    const clientName = this.opportunityForm.get('clientName');
    const phone = this.opportunityForm.get('phone');
    const email = this.opportunityForm.get('email');
    const rfc = this.opportunityForm.get('rfc');

    // Basic validation: name is required
    if (!clientName?.value || !clientName.valid) {
      return false;
    }

    // Business rule: WhatsApp is now mandatory for all clients
    if (!phone?.value || !phone.valid) {
      return false;
    }

    // If saleType is 'financiero' and market is AGS, require full contact (email + RFC valid)
    if (this.saleTypeValue === 'financiero') {
      if (!email?.value || email.invalid) return false;
      // RFC optional unless financiero: then required and valid
      if (!rfc?.value) return false;
      const rfcError = CustomValidators.rfc(rfc as any);
      if (rfcError) return false;
    }

    return true;
  }

  private validateOpportunityType(): boolean {
    if (!this.opportunityType) {
      return false;
    }

    // Business rule: EdoMex Individual clients prefer Simulacion
    if (this.marketValue === 'edomex' && this.clientTypeValue === 'Individual' && this.opportunityType === 'COTIZACION') {
    }

    // Business rule: AGS clients prefer Cotizacion for quick sales
    if (this.marketValue === 'aguascalientes' && this.opportunityType === 'SIMULACION') {
    }

    return true;
  }

  private validateMarketConfiguration(): boolean {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;
    const saleType = this.saleTypeValue;

    if (!market || !saleType) {
      return false;
    }

    // If EdoMex + Financiero, clientType is required and must be valid
    if (market === 'edomex' && saleType === 'financiero') {
      return ['Individual', 'Colectivo'].includes(clientType);
    }

    // Otherwise, clientType may be empty (validated later in onboarding)
    if (market === 'aguascalientes' || market === 'edomex') {
      return true;
    }

    return false;
  }

  private validateEcosystemSelection(): boolean {
    // Only required for EdoMex market
    if (this.marketValue !== 'edomex') {
      return true;
    }

    const ecosystem = this.opportunityForm.get('ecosystem')?.value;
    if (!ecosystem) {
      return false;
    }

    // Business rule: Validate ecosystem availability
    const validEcosystems = this.availableEcosystems.map(e => e.id);
    return validEcosystems.includes(ecosystem);
  }

  /**
   * ANTI-DUPLICATE DETECTION SYSTEM
   * Real-time search for similar clients
   */
  private setupDuplicateDetection(): void {
    this.opportunityForm.get('clientName')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(name => {
          if (name && name.length >= 3) {
            this.isCheckingDuplicates = true;
            return this.apiService.searchClients(name);
          }
          return of([]);
        })
      )
      .subscribe({
        next: (clients) => {
          this.similarClients = clients.slice(0, 3); // Show max 3 similar clients
          this.isCheckingDuplicates = false;
        },
        error: (error) => {
          this.isCheckingDuplicates = false;
          this.similarClients = [];
        }
      });
  }

  /**
   * AUTO-SAVE DRAFT SYSTEM
   * Save draft every 10 seconds when form has data
   */
  private startAutoSave(): void {
    this.autoSaveSub = this.opportunityForm.valueChanges
      .pipe(debounceTime(800))
      .subscribe(() => {
        if (this.opportunityForm.dirty && !this.draftRecovered) {
          this.saveDraftToStorage();
        }
      });
  }

  private saveDraftToStorage(): void {
    const draft = {
      formData: this.opportunityForm.value,
      opportunityType: this.opportunityType,
      smartContext: this.smartContext,
      timestamp: Date.now(),
      currentStep: this.currentStep
    };
    
    localStorage.setItem(this.draftKey, JSON.stringify(draft));
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.opportunityForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  selectOpportunityType(type: 'COTIZACION' | 'SIMULACION') {
    this.opportunityType = type;
    this.opportunityTypeError = false;
  }

  getBusinessFlowLabel(): string {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;
    const opType = this.opportunityType;

    if (opType === 'COTIZACION') {
      return 'Venta a Plazo';
    } else {
      if (clientType === 'Individual') {
        return 'Plan de Ahorro';
      } else {
        return 'Crédito Colectivo';
      }
    }
  }

  getBusinessFlowDescription(): string {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;
    const opType = this.opportunityType;

    if (opType === 'COTIZACION') {
      return `Cotización para financiamiento en ${market === 'aguascalientes' ? 'Aguascalientes' : 'Estado de México'}`;
    } else {
      if (clientType === 'Individual') {
        return 'Simulación de ahorro individual para alcanzar enganche necesario';
      } else {
        return 'Simulación de tanda colectiva con efecto bola de nieve';
      }
    }
  }

  get clientNameValue(): string {
    return this.opportunityForm.get('clientName')?.value || '';
  }

  get marketValue(): string {
    return this.opportunityForm.get('market')?.value || '';
  }

  get clientTypeValue(): string {
    return this.opportunityForm.get('clientType')?.value || '';
  }

  get saleTypeValue(): string {
    return this.opportunityForm.get('saleType')?.value || '';
  }

  get municipalityValue(): string {
    return this.opportunityForm.get('municipality')?.value || '';
  }


  // === SMART CONTEXT METHODS ===
  getMarketName(market: string): string {
    const marketNames: { [key: string]: string } = {
      'aguascalientes': 'Aguascalientes',
      'edomex': 'Estado de México'
    };
    return marketNames[market] || market;
  }

  onMarketChange(): void {
    const market = this.marketValue;
    
    // Clear municipality when market changes
    this.opportunityForm.get('municipality')?.setValue('');
    
    // Update municipality validation based on market
    if (market === 'edomex') {
      this.opportunityForm.get('municipality')?.setValidators([Validators.required]);
    } else {
      this.opportunityForm.get('municipality')?.clearValidators();
    }
    this.opportunityForm.get('municipality')?.updateValueAndValidity();

    // Client type is required only for EdoMex + Financiero
    this.updateClientTypeRequirement();

    // Reload ecosystems if applicable
    this.loadEcosystems();
  }

  onSaleTypeChange(): void {
    this.updateClientTypeRequirement();
    this.updateContactRequirements();
  }

  requiresClientType(): boolean {
    return this.marketValue === 'edomex' && this.saleTypeValue === 'financiero';
  }

  private updateClientTypeRequirement(): void {
    const clientTypeControl = this.opportunityForm.get('clientType');
    if (!clientTypeControl) return;
    if (this.requiresClientType()) {
      clientTypeControl.setValidators([Validators.required]);
    } else {
      clientTypeControl.clearValidators();
    }
    clientTypeControl.updateValueAndValidity({ emitEvent: false });
  }

  // === DYNAMIC WIZARD HELPER METHODS ===
  
  /**
   * Determine if a specific step should be visible
   */
  shouldShowStep(stepType: string): boolean {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;
    const opportunityType = this.opportunityType;
    const saleType = this.saleTypeValue;

    switch (stepType) {
      case 'market':
        return !!opportunityType;
      
      case 'ecosystem':
        return market === 'edomex' && (!!clientType || saleType !== 'financiero');
      
      
      default:
        return true;
    }
  }

  /**
   * Get dynamic step titles based on context
   */
  getMarketStepTitle(): string {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;

    if (market === 'aguascalientes' && clientType === 'Individual') {
      return 'Configuración Rápida'; // Simplified for AGS Individual
    } else if (market === 'edomex') {
      return 'Configuración Estado de México'; // Full config for EdoMex
    } else {
      return 'Configuración del Mercado'; // Default
    }
  }

  /**
   * Get icon for market step based on context
   */
  getMarketStepIcon(): IconName {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;

    if (market === 'aguascalientes' && clientType === 'Individual') {
      return 'lightning-bolt'; // Quick setup
    } else if (market === 'edomex') {
      return 'globe'; // Global/regional configuration
    } else {
      return 'location-marker'; // Location-based setup
    }
  }

  /**
   * Get CSS modifier class for market step icon
   */
  getMarketStepIconClass(): string {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;

    if (market === 'aguascalientes' && clientType === 'Individual') {
      return 'market-title__icon--yellow';
    } else if (market === 'edomex') {
      return 'market-title__icon--blue';
    } else {
      return 'market-title__icon--red';
    }
  }

  getMarketStepDescription(): string {
    const market = this.marketValue;
    const clientType = this.clientTypeValue;

    if (market === 'aguascalientes' && clientType === 'Individual') {
      return 'Configuración simplificada para Aguascalientes Individual';
    } else if (market === 'edomex') {
      return 'Configuración completa requerida para Estado de México';
    } else {
      return 'Selecciona el mercado y tipo de cliente para continuar';
    }
  }

  /**
   * Ecosystem management for EdoMex
   */
  getAvailableEcosystems(): any[] {
    return [
      {
        id: 'centro',
        name: 'Centro Histórico',
        description: 'Zona céntrica con alta actividad comercial',
        icon: 'building-office',
        activeClients: 45,
        avgSavings: 85
      },
      {
        id: 'industrial',
        name: 'Zona Industrial',
        description: 'Área industrial con empresas manufactureras',
        icon: 'building-factory',
        activeClients: 32,
        avgSavings: 78
      },
      {
        id: 'residencial',
        name: 'Zona Residencial',
        description: 'Área residencial con familias trabajadoras',
        icon: 'building-residential',
        activeClients: 28,
        avgSavings: 92
      }
    ];
  }

  selectEcosystem(ecosystemId: string): void {
    this.selectedEcosystem = ecosystemId;
    this.opportunityForm.patchValue({ ecosystem: ecosystemId });
    this.recalculateSteps();
  }


  // === PROGRESS TRACKING ===
  getProgressPercentage(): number {
    return this.calculateDynamicProgress();
  }

  private calculateDynamicProgress(): number {
    const completedSteps = this.visibleSteps.filter(step => step.completed).length;
    const totalVisibleSteps = this.visibleSteps.length;
    
    if (totalVisibleSteps === 0) return 0;
    
    // Add partial progress for current step based on field completion
    const currentStepProgress = this.getCurrentStepProgress();
    const baseProgress = (completedSteps / totalVisibleSteps) * 100;
    const partialProgress = currentStepProgress * (100 / totalVisibleSteps);
    
    return Math.min(baseProgress + partialProgress, 100);
  }

  get currentStepProgress(): number {
    return this.getCurrentStepProgress();
  }

  private getCurrentStepProgress(): number {
    const currentVisibleStep = this.visibleSteps[this.currentStep - 1];
    if (!currentVisibleStep || currentVisibleStep.completed) return 0;

    // Calculate progress based on required fields completion
    const requiredFields = currentVisibleStep.validationFields || [];
    if (requiredFields.length === 0) return 0;

    const completedFields = requiredFields.filter(field => {
      const control = this.opportunityForm.get(field);
      return control?.value && control.valid;
    }).length;

    return completedFields / requiredFields.length;
  }

  private updateCurrentStep(): void {
    // Find the first incomplete step
    const firstIncompleteStep = this.visibleSteps.findIndex(step => !step.completed);
    
    if (firstIncompleteStep === -1) {
      // All steps completed
      this.currentStep = this.visibleSteps.length;
    } else {
      // Set current step to first incomplete (1-indexed)
      this.currentStep = firstIncompleteStep + 1;
    }
    
    // Update totalSteps based on visible steps
    this.totalSteps = this.visibleSteps.length;
    this.focusCurrentStepTitle();
  }

  getStepStatus(stepIndex: number): string {
    const step = this.visibleSteps[stepIndex];
    if (!step) return 'pending';
    
    if (step.completed) return 'completed';
    if (stepIndex + 1 === this.currentStep) return 'current';
    if (stepIndex + 1 < this.currentStep) return 'completed';
    return 'pending';
  }

  getStepIcon(stepIndex: number): string {
    const status = this.getStepStatus(stepIndex);
    const step = this.visibleSteps[stepIndex];
    
    switch (status) {
      case 'completed':
        return '';
      case 'current':
        return step?.icon || '';
      default:
        return step?.icon || '';
    }
  }

  // === A11y helpers & field helpers ===
  getErrorId(fieldName: string): string {
    return `${fieldName}-error`;
  }

  onPhoneBlur(): void {
    const ctrl = this.opportunityForm.get('phone');
    const v = (ctrl?.value || '').toString();
    const normalized = v.replace(/\D/g, '').slice(-10);
    ctrl?.setValue(normalized, { emitEvent: false });
    ctrl?.updateValueAndValidity({ onlySelf: true });
  }

  requiresClientContactData(): boolean {
    return this.saleTypeValue === 'financiero';
  }

  private updateContactRequirements(): void {
    const emailControl = this.opportunityForm.get('email');
    const rfcControl = this.opportunityForm.get('rfc');
    if (!emailControl || !rfcControl) return;
    if (this.requiresClientContactData()) {
      emailControl.setValidators([Validators.required, Validators.email]);
      rfcControl.setValidators([Validators.required, CustomValidators.rfc]);
    } else {
      emailControl.setValidators([Validators.email]);
      rfcControl.clearValidators();
    }
    emailControl.updateValueAndValidity({ emitEvent: false });
    rfcControl.updateValueAndValidity({ emitEvent: false });
  }

  private focusCurrentStepTitle(): void {
    const currentVisibleStep = this.visibleSteps[this.currentStep - 1];
    if (!currentVisibleStep) return;
    let titleId = '';
    switch (currentVisibleStep.id) {
      case 'client-info':
        titleId = 'step-title-client-info';
        break;
      case 'opportunity-type':
        titleId = 'step-title-opportunity-type';
        break;
      case 'market-simple':
      case 'market-full':
      case 'market-default':
        titleId = 'step-title-market';
        break;
      case 'ecosystem':
        titleId = 'step-title-ecosystem';
        break;
    }
    if (titleId) {
      setTimeout(() => {
        const el = document.getElementById(titleId);
        el?.focus();
      });
    }
  }

  // === Ecosystem loading ===
  private loadEcosystems(): void {
    if (this.marketValue !== 'edomex') return;
    this.loadingEcosystems = true;
    this.errorEcosystems = false;
    this.ecosystemUiService.getEcosystemsForMarket(this.marketValue).subscribe({
      next: (ecos) => {
        this.availableEcosystems = ecos;
        this.loadingEcosystems = false;
      },
      error: () => {
        this.loadingEcosystems = false;
        this.errorEcosystems = true;
      }
    });
  }

  reloadEcosystems(): void {
    this.loadEcosystems();
  }

  // === Gating helpers and CTA label ===
  isEdomex(): boolean { return this.marketValue === 'edomex'; }
  isAguascalientes(): boolean { return this.marketValue === 'aguascalientes'; }
  isCotizacion(): boolean { return this.opportunityType === 'COTIZACION'; }
  isSimulacion(): boolean { return this.opportunityType === 'SIMULACION'; }
  isFinanciero(): boolean { return this.saleTypeValue === 'financiero'; }

  nextStepLabel(): string {
    if (this.isCotizacion()) {
      return 'Cotizador';
    }
    if (this.isSimulacion()) {
      if (this.marketValue === 'edomex') {
        return this.clientTypeValue === 'Individual' ? 'Simulador Individual' : 'Tanda Colectiva';
      }
      return 'AGS Ahorro';
    }
    return 'Carga de Documentos';
  }

  // === DRAFT RECOVERY METHODS ===
  formatDraftDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  recoverDraft(): void {
    if (this.draftData) {
      // Restore form data
      this.opportunityForm.patchValue(this.draftData.formData);
      this.opportunityType = this.draftData.opportunityType;
      this.currentStep = this.draftData.currentStep;
      
      // Mark as recovered
      this.draftRecovered = true;
      this.hasDraftAvailable = false;
      
      // Merge smart context (new context takes precedence)
      this.smartContext = {
        ...this.draftData.smartContext,
        ...this.smartContext
      };
    }
  }

  discardDraft(): void {
    localStorage.removeItem(this.draftKey);
    this.hasDraftAvailable = false;
    this.draftData = null;
  }

  // === ANTI-DUPLICATE METHODS ===
  getClientInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  selectSimilarClient(client: any): void {
    // Pre-populate form with existing client data
    this.opportunityForm.patchValue({
      clientName: client.name,
      phone: client.phone || '',
      email: client.email || '',
      market: client.market || this.smartContext.market || ''
    });
    
    // Clear similar clients
    this.similarClients = [];
    
    // Navigate directly to opportunity selection since we have existing client
    this.currentStep = 2;
  }

  clearSimilarClients(): void {
    this.similarClients = [];
  }

  // === ENHANCED SAVE METHODS ===
  saveDraft(): void {
    this.saveDraftToStorage();
  }

  onSubmit() {
    if (!this.opportunityType) {
      this.opportunityTypeError = true;
      return;
    }

    if (this.opportunityForm.valid) {
      this.isLoading = true;
      this.currentStep = 4;

      // Enhanced client data with business intelligence
      const enhancedClientData = {
        ...this.opportunityForm.value,
        opportunityType: this.opportunityType,
        businessFlow: this.getBusinessFlowLabel(),
        smartContext: this.smartContext,
        createdAt: new Date(),
        // Business intelligence metadata
        source: 'nueva-oportunidad-wizard',
        advisorContext: {
          dashboardFilter: this.smartContext.market,
          suggestedFlow: this.smartContext.suggestedFlow,
          createdFromContext: this.smartContext.returnContext
        }
      };

      // Normalize phone to digits for persistence and downstream flows
      enhancedClientData.phone = String(this.opportunityForm.get('phone')?.value || '').replace(/\D/g, '');
      // Real API Integration
      this.apiService.createClient(enhancedClientData).subscribe({
        next: (createdClient) => {
          
          // Clear draft after successful creation
          localStorage.removeItem(this.draftKey);
          
          // Navigate with enhanced context
          this.navigateToNextStep(createdClient);
        },
        error: (error) => {
          this.isLoading = false;
        }
      });
    } else {
      // Enhanced validation feedback
      Object.keys(this.opportunityForm.controls).forEach(key => {
        this.opportunityForm.get(key)?.markAsTouched();
      });
      
      // Focus first invalid field
      const firstInvalidControl = Object.keys(this.opportunityForm.controls)
        .find(key => this.opportunityForm.get(key)?.invalid);
      
      if (firstInvalidControl) {
        const element = document.getElementById(firstInvalidControl);
        element?.focus();
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  /**
   * INTELLIGENT NAVIGATION
   * Navigate to appropriate next step with enhanced context
   */
  private navigateToNextStep(createdClient?: any): void {
    const navigationContext = {
      clientId: createdClient?.id,
      clientName: this.clientNameValue,
      source: 'nueva-oportunidad',
      smartContext: this.smartContext,
      market: this.marketValue,
      clientType: this.clientTypeValue ? this.clientTypeValue.toLowerCase() : (this.marketValue === 'edomex' ? 'individual' : 'individual'),
      businessFlow: this.getBusinessFlowLabel()
    };

    if (this.opportunityType === 'COTIZACION') {
      // Cotizador routing with business rules
      if (this.marketValue === 'aguascalientes' && this.clientTypeValue === 'Individual') {
        this.router.navigate(['/cotizador/ags-individual'], {
          queryParams: navigationContext
        });
      } else if (this.marketValue === 'edomex' && this.clientTypeValue === 'Colectivo') {
        this.router.navigate(['/cotizador/edomex-colectivo'], {
          queryParams: navigationContext
        });
      } else {
        // Default cotizador with context
        this.router.navigate(['/cotizador'], {
          queryParams: navigationContext
        });
      }
    } else {
      // Simulador or Onboarding/Document Upload based on context
      if (this.marketValue === 'aguascalientes') {
        this.router.navigate(['/simulador/ags-ahorro'], {
          queryParams: navigationContext
        });
      } else if (this.clientTypeValue === 'Individual') {
        this.router.navigate(['/simulador/edomex-individual'], {
          queryParams: navigationContext
        });
      } else {
        this.router.navigate(['/simulador/tanda-colectiva'], {
          queryParams: navigationContext
        });
      }
    }

    this.isLoading = false;
  }

  // === INTELLIGENT AUTOCOMPLETE ===
  onClientNameFocus(): void {
    this.generateClientSuggestions();
    this.showSuggestions = true;
    this.selectedSuggestionIndex = -1;
  }

  onClientNameBlur(): void {
    // Delay hiding to allow for suggestion selection
    this.suggestionTimeout = setTimeout(() => {
      this.showSuggestions = false;
      this.selectedSuggestionIndex = -1;
    }, 150);
  }

  handleClientNameKeydown(event: KeyboardEvent): void {
    if (!this.showSuggestions || this.clientSuggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.clientSuggestions.length - 1
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, 0);
        break;
      
      case 'Enter':
        event.preventDefault();
        if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < this.clientSuggestions.length) {
          this.selectSuggestion(this.clientSuggestions[this.selectedSuggestionIndex]);
        }
        break;
      
      case 'Escape':
        this.showSuggestions = false;
        this.selectedSuggestionIndex = -1;
        break;
    }
  }

  private generateClientSuggestions(): void {
    const currentName = this.clientNameValue.toLowerCase().trim();
    
    // Generate smart suggestions based on context and common patterns
    this.clientSuggestions = [];

    // Suggestions based on market context
    if (this.smartContext.market === 'aguascalientes') {
      this.clientSuggestions.push(
        { name: 'María González Hernández', phone: '449-123-4567', market: 'AGS', type: 'Cotización recurrente' },
        { name: 'Carlos López Torres', phone: '449-234-5678', market: 'AGS', type: 'Cliente premium' },
        { name: 'Ana Patricia Morales', phone: '449-345-6789', market: 'AGS', type: 'Simulación activa' }
      );
    } else if (this.smartContext.market === 'edomex') {
      this.clientSuggestions.push(
        { name: 'Roberto Sánchez Martínez', phone: '55-9876-5432', market: 'EdoMex', type: ' Cliente corporativo' },
        { name: 'Laura Jiménez Ruiz', phone: '55-8765-4321', market: 'EdoMex', type: 'Cliente familiar' },
        { name: 'Miguel Ángel Torres', phone: '55-7654-3210', market: 'EdoMex', type: ' Renovación pendiente' }
      );
    }

    // Filter suggestions if user is typing
    if (currentName.length >= 2) {
      this.clientSuggestions = this.clientSuggestions.filter(suggestion =>
        suggestion.name.toLowerCase().includes(currentName) ||
        suggestion.name.toLowerCase().split(' ').some((part: string) => part.startsWith(currentName))
      );
    }

    // Add generic suggestions based on typing patterns
    if (currentName.length >= 3) {
      this.clientSuggestions.unshift(
        { name: this.formatSuggestionName(currentName), type: 'Completar automáticamente' }
      );
    }

    // Limit to 5 suggestions for UX
    this.clientSuggestions = this.clientSuggestions.slice(0, 5);
  }

  private formatSuggestionName(input: string): string {
    return input.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  selectSuggestion(suggestion: any): void {
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }

    // Fill form with suggestion data
    this.opportunityForm.patchValue({
      clientName: suggestion.name,
      phone: suggestion.phone || '',
      market: suggestion.market || this.smartContext.market || this.opportunityForm.get('market')?.value
    });

    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;

    // Trigger validation and step recalculation
    this.recalculateSteps();
  }

  trackBySuggestion(index: number, suggestion: any): any {
    return suggestion.name + suggestion.type;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
