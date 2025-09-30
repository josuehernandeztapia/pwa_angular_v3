import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BusinessFlow, Client, Ecosystem } from '../../../models/types';
import { ContractGenerationService } from '../../../services/contract-generation.service';
import { EcosystemDataService } from '../../../services/data/ecosystem-data.service';
import { DocumentRequirementsService } from '../../../services/document-requirements.service';
import { InterviewCheckpointService } from '../../../services/interview-checkpoint.service';
import { MetaMapService } from '../../../services/metamap.service';
import { MifielService } from '../../../services/mifiel.service';
import { OnboardingEngineService } from '../../../services/onboarding-engine.service';
import { InterviewCheckpointModalComponent } from '../../shared/interview-checkpoint-modal/interview-checkpoint-modal.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ContextPanelComponent } from '../../shared/context-panel/context-panel.component';
import { FlowContextService } from '../../../services/flow-context.service';
import { MarketPolicyContext, PolicyClientType, PolicyMarket } from '../../../services/market-policy.service';
import { DocsCompletedGuard } from '../../../guards/docs-completed.guard';
import { ProtectionRequiredGuard } from '../../../guards/protection-required.guard';
import { AnalyticsService } from '../../../services/analytics.service';
import { TandaValidGuard } from '../../../guards/tanda-valid.guard';
import { PlazoGuard } from '../../../guards/plazo.guard';
import { environment } from '../../../../environments/environment';

type OnboardingStep = 'selection' | 'client_info' | 'documents' | 'kyc' | 'contracts' | 'completed';

interface DocumentGuardFlowContext {
  market: PolicyMarket;
  clientType: PolicyClientType;
  saleType: 'contado' | 'financiero';
  businessFlow: BusinessFlow;
  collectiveMembers?: number;
  requiresIncomeProof?: boolean;
  monthlyPayment?: number;
  incomeThreshold?: number;
  quotationData?: any;
}

interface OnboardingForm {
  // Client selection
  market: 'aguascalientes' | 'edomex' | '';
  saleType: 'contado' | 'financiero' | '';
  clientType: 'individual' | 'colectivo' | '';
  ecosystemId?: string;
  
  // Client info
  name: string;
  email: string;
  phone: string;
  rfc: string;
  address: string;
  
  // Group info (for collective)
  groupName: string;
  memberNames: string[];
}

interface OnboardingContextSnapshot {
  form: OnboardingForm;
  currentStep: OnboardingStep;
  currentStepIndex: number;
  currentClient: Client | null;
  documentProgress: typeof OnboardingMainComponent.prototype.documentProgress;
  kycValidation: typeof OnboardingMainComponent.prototype.kycValidation;
  kycStatus: typeof OnboardingMainComponent.prototype.kycStatus;
  contractValidation: typeof OnboardingMainComponent.prototype.contractValidation;
  contractMessage: string;
  showRoutesPreview: boolean;
  draftFound: boolean;
  aviDecision: 'GO' | 'REVIEW' | 'NO_GO' | null;
  aviScore: number | null;
  aviUpdatedAt: number | null;
}

@Component({
  selector: 'app-onboarding-main',
  standalone: true,
  imports: [CommonModule, FormsModule, InterviewCheckpointModalComponent, IconComponent, ContextPanelComponent],
  templateUrl: './onboarding-main.component.html',
  styleUrls: ['./onboarding-main.component.scss'],
})
export class OnboardingMainComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Step management
  currentStep: OnboardingStep = 'selection';
  currentStepIndex = 0;
  steps = [
    { id: 'selection', label: 'Configuración' },
    { id: 'client_info', label: 'Información' },
    { id: 'documents', label: 'Documentos' },
    { id: 'kyc', label: 'KYC' },
    { id: 'contracts', label: 'Contratos' },
    { id: 'completed', label: 'Completado' }
  ];

  // Form data
  form: OnboardingForm = {
    market: '',
    saleType: '',
    clientType: '',
    ecosystemId: '',
    name: '',
    email: '',
    phone: '',
    rfc: '',
    address: '',
    groupName: '',
    memberNames: ['', '', '', '', ''] // Start with 5 empty members
  };

  // New route handling
  newRouteName = '';
  availableEcosystems: Ecosystem[] = [];
  showRoutesPreview = false;

  // State
  currentClient: Client | null = null;
  showInterviewModal = false;
  pendingDocumentUpload: { fileInput: HTMLInputElement, documentId: string } | null = null;
  documentProgress = { totalDocs: 0, completedDocs: 0, pendingDocs: 0, completionPercentage: 0, allComplete: false };
  kycValidation: { canStartKyc: boolean; isKycComplete: boolean; missingDocs: string[]; tooltipMessage: string } = { canStartKyc: false, isKycComplete: false, missingDocs: [], tooltipMessage: '' };
  kycStatus: { status: 'not_started' | 'prerequisites_missing' | 'ready' | 'in_progress' | 'completed' | 'failed'; statusMessage: string; canRetry: boolean; completedAt?: Date } = { status: 'not_started', statusMessage: '', canRetry: false };
  contractValidation: { canGenerate: boolean; missingRequirements: string[]; warningMessages: string[] } = { canGenerate: false, missingRequirements: [], warningMessages: [] };
  contractMessage = '';
  isGeneratingContract = false;
  isMobileView = false;
  // Draft recovery
  private draftSave$ = new Subject<void>();
  draftFound = false;
  private readonly draftKey = 'onboardingDraft';
  private readonly contextKey = 'onboarding-wizard';

  aviDecision: 'GO' | 'REVIEW' | 'NO_GO' | null = null;
  aviScore: number | null = null;
  aviUpdatedAt: number | null = null;


  constructor(
    private onboardingEngine: OnboardingEngineService,
    private documentReqs: DocumentRequirementsService,
    private metamap: MetaMapService,
    private contractGen: ContractGenerationService,
    private mifiel: MifielService,
    private ecosystemData: EcosystemDataService,
    private interviewCheckpoint: InterviewCheckpointService,
    private analytics: AnalyticsService,
    @Optional() private flowContext?: FlowContextService,
    @Optional() private docsCompletedGuard?: DocsCompletedGuard,
    @Optional() private protectionRequiredGuard?: ProtectionRequiredGuard,
    @Optional() private tandaValidGuard?: TandaValidGuard,
    @Optional() private plazoGuard?: PlazoGuard,
  ) { }

  ngOnInit(): void {
    this.updateViewportState();
    const restored = this.restoreFromFlowContext();

    if (!restored) {
      const saved = localStorage.getItem(this.draftKey);
      if (saved) {
        this.draftFound = true;
      }
    }

    this.draftSave$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      // Debounce manually via setTimeout pattern replaced by Subject usage in handlers
    });

    this.loadAvailableEcosystems();
    this.updateBreadcrumbs();

    this.metamap.kycSuccess$.pipe(takeUntil(this.destroy$)).subscribe(
      ({ clientId, verificationData }: { clientId: string; verificationData: any }) => {
        if (clientId === this.currentClient?.id) {
          this.onKycSuccess(verificationData);
        }
      }
    );

    this.metamap.kycExit$.pipe(takeUntil(this.destroy$)).subscribe(
      ({ clientId, reason }: { clientId: string; reason: string }) => {
        if (clientId === this.currentClient?.id) {
          this.onKycExit(reason);
        }
      }
    );
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.updateViewportState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.persistContext();
  }

  get progressPercentage(): number {
    return (this.currentStepIndex / (this.steps.length - 1)) * 100;
  }

  // Navigation
  nextStep(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      const nextIndex = this.currentStepIndex + 1;
      const nextStep = this.steps[nextIndex].id as OnboardingStep;

      if (nextStep === 'contracts') {
        if (this.tandaValidGuard && !this.tandaValidGuard.enforceTandaClearance('/cotizador/edomex-colectivo')) {
          this.analytics.track('tanda_guard_blocked', { step: this.currentStep, nextStep });
          return;
        }

        if (this.plazoGuard && !this.plazoGuard.enforcePlazoClearance('/cotizador')) {
          this.analytics.track('plazo_guard_blocked', { step: this.currentStep, nextStep });
          return;
        }

        if (this.protectionRequiredGuard && !this.protectionRequiredGuard.enforceProtectionClearance('/proteccion')) {
          this.analytics.track('protection_guard_blocked', { step: this.currentStep, nextStep });
          return;
        }

        if (this.docsCompletedGuard && !this.docsCompletedGuard.enforceDocumentClearance('/onboarding/contracts')) {
          this.analytics.track('documents_guard_blocked', { step: this.currentStep, nextStep });
          return;
        }
      }

      this.currentStepIndex = nextIndex;
      this.currentStep = nextStep;
      this.analytics.track('onboarding_step_advanced', {
        fromStep: this.steps[nextIndex - 1]?.id ?? this.currentStep,
        toStep: nextStep,
      });
      this.onStepChange();
      this.persistContext();
    }
  }

  previousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.currentStep = this.steps[this.currentStepIndex].id as OnboardingStep;
      this.onStepChange();
      this.persistContext();
    }
  }

  onStepChange(): void {
    // Load step-specific data
    switch (this.currentStep) {
      case 'documents':
        this.updateDocumentProgress();
        break;
      case 'kyc':
        this.updateKycStatus();
        break;
      case 'contracts':
        this.updateContractValidation();
        break;
    }
    // Focus active step title for A11y
    setTimeout(() => {
      const heading = document.querySelector('.step-content .step-header h2') as HTMLElement | null;
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    }, 0);
    // Schedule draft save on step change
    this.scheduleDraftSave();
    this.updateBreadcrumbs();
    this.persistContext();
  }

  // Step validation
  canProceedFromSelection(): boolean {
    if (!this.form.market || !this.form.saleType) return false;
    if (this.form.market === 'edomex' && this.form.saleType === 'financiero' && !this.form.clientType) return false;
    
    // EdoMex requires ecosystem selection
    if (this.form.market === 'edomex' && !this.form.ecosystemId) return false;
    
    // If new route selected, require name
    if (this.form.ecosystemId === '__NEW_ROUTE__' && !this.newRouteName.trim()) return false;
    
    return true;
  }

  canProceedFromClientInfo(): boolean {
    if (this.form.clientType === 'colectivo') {
      return !!this.form.groupName && this.form.memberNames.filter(name => name.trim()).length >= 5;
    }
    const hasBasics = !!this.form.name && !!this.form.email && !!this.form.phone;
    if (!hasBasics) return false;
    return this.isValidEmail(this.form.email) && this.isValidMexicanPhone(this.form.phone) && (!this.form.rfc || this.isValidRFC(this.form.rfc));
  }

  canProceedToKyc(): boolean {
    return this.kycValidation.canStartKyc;
  }

  canProceedToContracts(): boolean {
    return this.kycValidation.isKycComplete;
  }

  // Form handlers
  onMarketChange(): void {
    this.form.saleType = '';
    this.form.clientType = '';
    this.form.ecosystemId = '';
    
    // Load ecosystems when EdoMex is selected
    if (this.form.market === 'edomex') {
      this.loadAvailableEcosystems();
      this.showRoutesPreview = true;
    } else {
      this.showRoutesPreview = false;
    }
  }

  onSaleTypeChange(): void {
    this.form.clientType = '';
    this.onFormChange();
  }

  onEcosystemChange(): void {
    if (this.form.ecosystemId !== '__NEW_ROUTE__') {
      this.newRouteName = '';
    }
    this.onFormChange();
  }

  loadAvailableEcosystems(): void {
    this.ecosystemData.getEcosystems().subscribe({
      next: (ecosystems: Ecosystem[]) => {
        this.availableEcosystems = ecosystems;
      },
      error: (error: unknown) => {
        this.availableEcosystems = [];
      }
    });
  }

  toggleRoutesPreview(): void {
    this.showRoutesPreview = !this.showRoutesPreview;
  }

  addMember(): void {
    if (this.form.memberNames.length < 10) {
      this.form.memberNames.push('');
    }
    this.onFormChange();
  }

  removeMember(index: number): void {
    if (this.form.memberNames.length > 5) {
      this.form.memberNames.splice(index, 1);
    }
    this.onFormChange();
  }

  // Client creation
  createClient(): void {
    if (!this.canProceedFromClientInfo()) {
      this.focusFirstInvalidClientInfoField();
      return;
    }
    if (this.form.clientType === 'colectivo') {
      this.createCollectiveGroup();
    } else {
      this.createIndividualClient();
    }
  }

  createIndividualClient(): void {
    let ecosystemId = this.form.ecosystemId;
    
    // Handle new route creation
    if (this.form.ecosystemId === '__NEW_ROUTE__') {
      ecosystemId = `route-${Date.now()}-${this.newRouteName.toLowerCase().replace(/\s+/g, '-')}`;
      this.createNewRoute(ecosystemId, this.newRouteName);
    }

    this.onboardingEngine.createClientFromOnboarding({
      name: this.form.name,
      market: this.form.market as any,
      saleType: this.form.saleType as any,
      ecosystemId
    }).subscribe({
      next: (client: Client) => {
        this.currentClient = client;
        this.nextStep();
        this.persistContext();
      },
      error: (error: unknown) => {
      }
    });
  }

  createCollectiveGroup(): void {
    const memberNames = this.form.memberNames.filter(name => name.trim());
    let ecosystemId = this.form.ecosystemId;
    
    // Handle new route creation
    if (this.form.ecosystemId === '__NEW_ROUTE__') {
      ecosystemId = `route-${Date.now()}-${this.newRouteName.toLowerCase().replace(/\s+/g, '-')}`;
      this.createNewRoute(ecosystemId, this.newRouteName);
    }
    
    this.onboardingEngine.createCollectiveCreditMembers({
      groupName: this.form.groupName,
      memberNames,
      market: this.form.market as any,
      ecosystemId: ecosystemId || 'default-ecosystem'
    }).subscribe({
      next: (members: Client[]) => {
        // Use first member as representative for UI
        this.currentClient = members[0];
        this.nextStep();
        this.persistContext();
      },
      error: (error: unknown) => {
      }
    });
  }

  private createNewRoute(ecosystemId: string, routeName: string): void {
    // Create temporary route for prospection
    const newRoute = {
      id: ecosystemId,
      name: routeName,
      status: 'En Prospección',
      documents: [
        { id: `${ecosystemId}-doc-1`, name: 'Acta Constitutiva de la Ruta', status: 'Pendiente' as any },
        { id: `${ecosystemId}-doc-2`, name: 'Poder del Representante Legal', status: 'Pendiente' as any }
      ]
    };

    // Add to ecosystem service (this would normally be an API call)
    
    // Refresh available ecosystems
    this.loadAvailableEcosystems();
  }

  private updateViewportState(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.isMobileView = window.innerWidth < 960;
  }

  // Document handling
  updateDocumentProgress(): void {
    if (!this.currentClient) return;
    this.documentProgress = this.documentReqs.getDocumentCompletionStatus(this.currentClient.documents);
    const kyc = this.metamap.validateKycPrerequisites(this.currentClient);
    this.kycValidation = { 
      canStartKyc: kyc.canStartKyc, 
      isKycComplete: kyc.isKycComplete, 
      missingDocs: kyc.missingDocs, 
      tooltipMessage: kyc.tooltipMessage 
    };
    this.persistContext();
  }

  attemptDocumentUpload(fileInput: HTMLInputElement, documentId: string): void {
    if (!this.currentClient) return;

    // Check if interview is required before allowing document upload
    const canUpload = this.interviewCheckpoint.canUploadDocument(
      this.currentClient.id,
      this.form.market as 'aguascalientes' | 'edomex',
      this.getProductType()
    );

    if (!canUpload.allowed) {
      // Store pending upload info and show interview modal
      this.pendingDocumentUpload = { fileInput, documentId };
      this.showInterviewModal = true;
      return;
    }

    // Proceed with direct upload if interview not required or already completed
    fileInput.click();
  }

  onFileSelected(event: any, documentId: string): void {
    const file = event.target.files[0];
    if (!file || !this.currentClient) return;

    this.onboardingEngine.submitDocument(this.currentClient.id, documentId, file).subscribe({
      next: (updatedClient: Client) => {
        this.currentClient = updatedClient;
        this.updateDocumentProgress();
        
        setTimeout(() => {
          this.approveDocument(documentId);
        }, 2000);
      },
      error: (error: unknown) => {
      }
    });
  }

  onInterviewCompleted(): void {
    this.showInterviewModal = false;
    
    // If there was a pending document upload, proceed with it
    if (this.pendingDocumentUpload) {
      this.pendingDocumentUpload.fileInput.click();
      this.pendingDocumentUpload = null;
    }
  }

  onInterviewModalClosed(): void {
    this.showInterviewModal = false;
    this.pendingDocumentUpload = null;
  }

  getProductType(): 'individual' | 'colectivo' | 'contado' {
    if (this.form.saleType === 'contado') return 'contado';
    return this.form.clientType === 'colectivo' ? 'colectivo' : 'individual';
  }

  approveDocument(documentId: string): void {
    if (!this.currentClient) return;

    this.onboardingEngine.reviewDocument(this.currentClient.id, documentId, true).subscribe({
      next: (updatedClient: Client) => {
        this.currentClient = updatedClient;
        this.updateDocumentProgress();
      },
      error: (error: unknown) => {
      }
    });
  }

  getDocumentRequirementsMessage(): string {
    return this.documentReqs.getRequirementsMessage({
      market: this.form.market as any,
      saleType: this.form.saleType as any,
      businessFlow: this.currentClient?.flow
    });
  }

  getDocumentStatusLabel(status: string): string {
    switch (status) {
      case 'Aprobado':
        return 'Aprobado por operaciones';
      case 'En Revisión':
        return 'En revisión interna';
      case 'Rechazado':
        return 'Rechazado — volver a subir';
      case 'Pendiente':
      default:
        return 'Pendiente de cargar';
    }
  }

  getDocumentTooltip(documentName: string): string | undefined {
    return this.documentReqs.getDocumentTooltip(documentName);
  }

  // KYC handling
  updateKycStatus(): void {
    if (!this.currentClient) return;
    
    const kyc = this.metamap.validateKycPrerequisites(this.currentClient);
    this.kycValidation = { 
      canStartKyc: kyc.canStartKyc, 
      isKycComplete: kyc.isKycComplete, 
      missingDocs: kyc.missingDocs, 
      tooltipMessage: kyc.tooltipMessage 
    };
    this.kycStatus = this.metamap.getKycStatus(this.currentClient);
    
    // Initialize MetaMap if ready
    if (this.kycStatus.status === 'ready') {
      setTimeout(() => {
        this.initializeMetaMap();
      }, 500);
    }
  }

  initializeMetaMap(): void {
    if (!this.currentClient) return;

    this.metamap.createKycButton(
      'metamap-container',
      this.currentClient,
      (data) => this.onKycSuccess(data),
      (reason) => this.onKycExit(reason)
    ).subscribe({
      next: (button: HTMLElement | null) => {
      },
      error: (error: unknown) => {
      }
    });
  }

  onKycSuccess(verificationData: any): void {
    if (!this.currentClient) return;

    this.metamap.completeKyc(this.currentClient.id, verificationData).subscribe({
      next: (updatedClient: Client) => {
        this.currentClient = updatedClient;
        this.updateKycStatus();

        const score = this.extractAviScore(verificationData?.score);
        const decision = this.resolveAviDecisionFromScore(score);
        this.setAviDecision(decision, score);
      },
      error: (error: unknown) => {
      }
    });
  }

  onKycExit(reason: string): void {
    const decision = this.resolveAviDecisionFromExit(reason);
    this.setAviDecision(decision, null);
  }

  private setAviDecision(decision: 'GO' | 'REVIEW' | 'NO_GO', score: number | null): void {
    const normalizedScore = score != null ? this.clampScore(score) : null;
    const changed = this.aviDecision !== decision || this.aviScore !== normalizedScore;
    this.aviDecision = decision;
    this.aviScore = normalizedScore;
    this.aviUpdatedAt = Date.now();

    this.flowContext?.updateContext('avi', current => ({
      ...(current as any),
      decision,
      score: normalizedScore != null ? Math.round(normalizedScore * 1000) : (current as any)?.score,
      completedAt: Date.now(),
      requiresSupervisor: decision === 'REVIEW'
    }), { breadcrumbs: this.getBreadcrumbTrail('documents') });

    if (changed) {
      this.analytics.track('avi_decision_recorded', {
        decision,
        score: normalizedScore,
      });
      this.persistContext();
    }
  }

  private extractAviScore(rawScore: any): number | null {
    if (rawScore === undefined || rawScore === null) {
      return null;
    }

    const numeric = Number(rawScore);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    const normalized = numeric > 1 ? numeric / 100 : numeric;
    return this.clampScore(normalized);
  }

  private resolveAviDecisionFromScore(score: number | null): 'GO' | 'REVIEW' | 'NO_GO' {
    if (score === null) {
      return 'REVIEW';
    }

    const profile = environment.avi?.decisionProfile ?? 'conservative';
    const thresholds = environment.avi?.thresholds?.[profile as 'conservative' | 'permissive'] ?? environment.avi?.thresholds?.conservative ?? { GO_MIN: 0.78, NOGO_MAX: 0.55 };
    const goMin = typeof thresholds.GO_MIN === 'number' ? thresholds.GO_MIN : 0.78;
    const noGoMax = typeof thresholds.NOGO_MAX === 'number' ? thresholds.NOGO_MAX : 0.55;

    if (score >= goMin) {
      return 'GO';
    }
    if (score <= noGoMax) {
      return 'NO_GO';
    }
    return 'REVIEW';
  }

  private resolveAviDecisionFromExit(reason: string): 'REVIEW' | 'NO_GO' {
    const normalized = (reason || '').toLowerCase();
    const negativeTriggers = ['fraud', 'rechaz', 'denied', 'deny', 'bloque', 'no go', 'fail', 'error'];
    if (negativeTriggers.some(trigger => normalized.includes(trigger))) {
      return 'NO_GO';
    }
    return 'REVIEW';
  }

  private clampScore(score: number): number {
    if (!Number.isFinite(score)) {
      return 0;
    }
    if (score < 0) {
      return 0;
    }
    if (score > 1) {
      return 1;
    }
    return score;
  }

  // Contract handling
  updateContractValidation(): void {
    if (!this.currentClient) return;
    this.contractValidation = this.contractGen.validateContractRequirements(this.currentClient);
  }

  generateContract(): void {
    if (!this.currentClient || this.isGeneratingContract) return;

    this.isGeneratingContract = true;
    this.contractGen.sendContract(this.currentClient.id).subscribe({
      next: (result: { message: string; documents: any[] }) => {
        this.contractMessage = result.message;
        this.isGeneratingContract = false;
      },
      error: (error: unknown) => {
        this.isGeneratingContract = false;
      }
    });
  }

  // Utility methods
  getFlowDisplayName(flow: BusinessFlow): string {
    switch (flow) {
      case BusinessFlow.VentaDirecta:
        return 'Venta Directa';
      case BusinessFlow.VentaPlazo:
        return 'Venta a Plazo';
      case BusinessFlow.AhorroProgramado:
        return 'Ahorro Programado';
      case BusinessFlow.CreditoColectivo:
        return 'Crédito Colectivo';
      default:
        return String(flow);
    }
  }

  // Completion actions
  goToClient(): void {
    // Navigate to client detail page
  }

  startNewOnboarding(): void {
    // Reset form and start over
    this.form = {
      market: '',
      saleType: '',
      clientType: '',
      ecosystemId: '',
      name: '',
      email: '',
      phone: '',
      rfc: '',
      address: '',
      groupName: '',
      memberNames: ['', '', '', '', '']
    };
    
    this.currentClient = null;
    this.currentStep = 'selection';
    this.currentStepIndex = 0;
    this.contractMessage = '';
    this.isGeneratingContract = false;
    this.clearDraft();
  }

  // Inline validators for template-driven client_info step
  isValidEmail(value: string): boolean {
    if (!value) return false;
    // Basic email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  isValidMexicanPhone(value: string): boolean {
    if (!value) return false;
    const phoneRegex = /^(\+52\s?)?(\d{2}\s?\d{4}\s?\d{4}|\d{3}\s?\d{3}\s?\d{4})$/;
    return phoneRegex.test(value);
  }

  isValidRFC(value: string): boolean {
    if (!value) return true;
    const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-V1-9][A-Z1-9][0-9A]$/;
    return rfcRegex.test(value.toUpperCase().replace(/\s/g, ''));
  }
  private focusFirstInvalidClientInfoField(): void {
    if (this.form.clientType === 'colectivo') {
      if (!this.form.groupName?.trim()) {
        document.getElementById('groupName')?.focus();
        return;
      }
      const firstEmptyIndex = this.form.memberNames.findIndex(name => !name?.trim());
      if (firstEmptyIndex >= 0) {
        const inputs = document.querySelectorAll('.member-inputs input');
        const target = inputs.item(firstEmptyIndex) as HTMLElement | null;
        target?.focus();
        return;
      }
    } else {
      if (!this.form.name?.trim()) {
        document.getElementById('name')?.focus();
        return;
      }
      if (!this.form.email?.trim() || !this.isValidEmail(this.form.email)) {
        document.getElementById('email')?.focus();
        return;
      }
      if (!this.form.phone?.trim() || !this.isValidMexicanPhone(this.form.phone)) {
        document.getElementById('phone')?.focus();
        return;
      }
      if (this.form.rfc && !this.isValidRFC(this.form.rfc)) {
        document.getElementById('rfc')?.focus();
        return;
      }
    }
  }

  // Draft handling helpers
  onFormChange(): void {
    this.scheduleDraftSave();
  }

  private scheduleDraftSave(): void {
    clearTimeout((this as any)._draftTimer);
    (this as any)._draftTimer = setTimeout(() => this.performDraftSave(), 500);
  }

  private performDraftSave(): void {
    const draft = {
      form: this.form,
      currentStep: this.currentStep,
      currentStepIndex: this.currentStepIndex
    };
    try {
      localStorage.setItem(this.draftKey, JSON.stringify(draft));
    } catch { /* ignore quota errors */ }
    this.persistContext();
  }

  continueDraft(): void {
    const saved = localStorage.getItem(this.draftKey);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (draft.form) this.form = draft.form;
      if (typeof draft.currentStepIndex === 'number') {
        this.currentStepIndex = draft.currentStepIndex;
        this.currentStep = this.steps[this.currentStepIndex].id as OnboardingStep;
      }
      this.draftFound = false;
      this.onStepChange();
      this.persistContext();
    } catch { /* ignore parse errors */ }
  }

  private clearDraft(): void {
    try { localStorage.removeItem(this.draftKey); } catch { /* ignore */ }
    this.draftFound = false;
    this.aviDecision = null;
    this.aviScore = null;
    this.aviUpdatedAt = null;
    this.flowContext?.clearContext(this.contextKey);
  }

  discardDraft(): void {
    this.clearDraft();
  }

  private getBreadcrumbTrail(step: OnboardingStep = this.currentStep): string[] {
    const base = ['Dashboard', 'Onboarding'];
    const labels: Record<OnboardingStep, string> = {
      selection: 'Configuración',
      client_info: 'Información del Cliente',
      documents: 'Documentos',
      kyc: 'KYC',
      contracts: 'Contratos',
      completed: 'Completado'
    };

    const label = labels[step] ?? 'Configuración';
    const trail = [...base, label];
    if (this.currentClient?.name) {
      trail.splice(2, 0, this.currentClient.name);
    }
    return trail;
  }

  private updateBreadcrumbs(): void {
    this.flowContext?.setBreadcrumbs(this.getBreadcrumbTrail());
  }

  private persistContext(): void {
    if (!this.flowContext) {
      return;
    }

    this.persistDocumentContextForGuard();

    const snapshot: OnboardingContextSnapshot = {
      form: { ...this.form, memberNames: [...this.form.memberNames] },
      currentStep: this.currentStep,
      currentStepIndex: this.currentStepIndex,
      currentClient: this.currentClient ? { ...this.currentClient } : null,
      documentProgress: { ...this.documentProgress },
      kycValidation: { ...this.kycValidation },
      kycStatus: { ...this.kycStatus },
      contractValidation: { ...this.contractValidation },
      contractMessage: this.contractMessage,
      showRoutesPreview: this.showRoutesPreview,
      draftFound: this.draftFound,
      aviDecision: this.aviDecision,
      aviScore: this.aviScore,
      aviUpdatedAt: this.aviUpdatedAt
    };

    this.flowContext.saveContext(this.contextKey, snapshot, { breadcrumbs: this.getBreadcrumbTrail() });
  }

  private persistDocumentContextForGuard(): void {
    if (!this.flowContext || !this.currentClient) {
      return;
    }

    const existing = this.flowContext.getContextData<any>('documentos');
    const previousFlow: DocumentGuardFlowContext = existing?.flowContext ?? {};

    const built = this.buildDocumentGuardFlowContext();
    if (!built) {
      return;
    }

    const flowContext: DocumentGuardFlowContext = {
      ...previousFlow,
      ...built,
    };

    if (typeof flowContext.monthlyPayment !== 'number') {
      const monthlyPayment = this.currentClient.paymentPlan?.monthlyPayment;
      if (typeof monthlyPayment === 'number' && Number.isFinite(monthlyPayment)) {
        flowContext.monthlyPayment = monthlyPayment;
      }
    }

    if (typeof flowContext.incomeThreshold !== 'number') {
      const quotationIncomeThreshold = existing?.flowContext?.quotationData?.incomeThreshold
        ?? existing?.flowContext?.quotationData?.requiredIncomeThreshold;
      if (typeof quotationIncomeThreshold === 'number' && Number.isFinite(quotationIncomeThreshold)) {
        flowContext.incomeThreshold = quotationIncomeThreshold;
      }
    }

    if (!flowContext.quotationData && existing?.flowContext?.quotationData) {
      flowContext.quotationData = existing.flowContext.quotationData;
    }

    const payload = {
      flowContext,
      policyContext: this.buildPolicyContextForDocuments(flowContext),
      documents: this.currentClient.documents.map(doc => ({ ...doc })),
      completionStatus: { ...this.documentProgress },
      voiceVerified: this.kycStatus.status === 'completed',
      showAVI: this.aviDecision !== null,
      aviAnalysis: this.aviDecision
        ? {
            decision: this.aviDecision,
            score: this.aviScore,
            updatedAt: this.aviUpdatedAt
          }
        : undefined
    };

    this.flowContext.saveContext(
      'documentos',
      payload,
      { breadcrumbs: this.getBreadcrumbTrail('documents') }
    );
  }

  private buildDocumentGuardFlowContext(): DocumentGuardFlowContext | null {
    if (!this.form.market || !this.form.saleType) {
      return null;
    }

    const collectiveMembers = this.form.clientType === 'colectivo'
      ? this.form.memberNames.filter(name => name.trim()).length
      : undefined;

    const businessFlow = this.currentClient?.flow
      ?? (this.form.clientType === 'colectivo'
        ? BusinessFlow.CreditoColectivo
        : BusinessFlow.VentaPlazo);

    const monthlyPayment = this.currentClient?.paymentPlan?.monthlyPayment;
    const incomeThreshold = this.currentClient?.paymentPlan?.monthlyGoal;

    return {
      market: this.form.market as PolicyMarket,
      clientType: (this.form.clientType || 'individual') as PolicyClientType,
      saleType: this.form.saleType as 'contado' | 'financiero',
      businessFlow,
      collectiveMembers,
      requiresIncomeProof: this.determineIncomeProofRequirementFlag(),
      monthlyPayment: typeof monthlyPayment === 'number' ? monthlyPayment : undefined,
      incomeThreshold: typeof incomeThreshold === 'number' ? incomeThreshold : undefined,
    };
  }

  private buildPolicyContextForDocuments(flow: DocumentGuardFlowContext): MarketPolicyContext {
    return {
      market: flow.market,
      clientType: flow.clientType,
      saleType: flow.saleType,
      businessFlow: flow.businessFlow,
      requiresIncomeProof: flow.requiresIncomeProof,
      collectiveSize: flow.collectiveMembers
    };
  }

  private determineIncomeProofRequirementFlag(): boolean | undefined {
    const incomeDoc = this.currentClient?.documents.find(doc => doc.id === 'doc-income');
    if (!incomeDoc) {
      return undefined;
    }

    return incomeDoc.isOptional === true ? false : true;
  }

  private restoreFromFlowContext(): boolean {
    if (!this.flowContext) {
      return false;
    }

    const stored = this.flowContext.getContextData<OnboardingContextSnapshot>(this.contextKey);
    if (!stored) {
      return false;
    }

    this.form = { ...this.form, ...stored.form, memberNames: [...stored.form.memberNames] };
    this.currentStep = stored.currentStep ?? this.currentStep;
    this.currentStepIndex = stored.currentStepIndex ?? this.currentStepIndex;
    this.currentClient = stored.currentClient ? { ...stored.currentClient } : null;
    this.documentProgress = stored.documentProgress ?? this.documentProgress;
    this.kycValidation = stored.kycValidation ?? this.kycValidation;
    this.kycStatus = stored.kycStatus ?? this.kycStatus;
    this.contractValidation = stored.contractValidation ?? this.contractValidation;
    this.contractMessage = stored.contractMessage ?? this.contractMessage;
    this.showRoutesPreview = stored.showRoutesPreview ?? this.showRoutesPreview;
    this.draftFound = stored.draftFound ?? this.draftFound;
    this.aviDecision = stored.aviDecision ?? this.aviDecision;
    this.aviScore = stored.aviScore ?? this.aviScore;
    this.aviUpdatedAt = stored.aviUpdatedAt ?? this.aviUpdatedAt;

    this.onStepChange();
    return true;
  }

}
