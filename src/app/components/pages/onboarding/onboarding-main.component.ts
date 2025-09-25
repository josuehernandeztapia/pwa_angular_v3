import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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

type OnboardingStep = 'selection' | 'client_info' | 'documents' | 'kyc' | 'contracts' | 'completed';

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

@Component({
  selector: 'app-onboarding-main',
  standalone: true,
  imports: [CommonModule, FormsModule, InterviewCheckpointModalComponent],
  template: `
    <div class="onboarding-container command-container">
      <!-- Draft Recovery Banner -->
      <div *ngIf="draftFound" class="draft-banner" role="status" aria-live="polite">
        <div class="draft-banner-content">
          <span>📝 Borrador encontrado de un onboarding anterior.</span>
          <div class="draft-banner-actions">
            <button type="button" class="btn-secondary" (click)="continueDraft()">Continuar</button>
            <button type="button" class="btn-secondary" (click)="discardDraft()">Descartar</button>
          </div>
        </div>
      </div>
      <!-- Progress Header -->
      <div class="progress-header">
        <div class="progress-steps">
          <div *ngFor="let step of steps; let i = index" 
               class="step" 
               [class.step-active]="currentStepIndex === i"
               [class.step-completed]="currentStepIndex > i"
               [attr.aria-current]="currentStepIndex === i ? 'step' : null">
            <div class="step-circle">{{ i + 1 }}</div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>
        <div class="progress-bar intelligent-progress">
          <div class="progress-fill" [style.width.%]="progressPercentage"></div>
        </div>
      </div>

      <!-- Step: Selection -->
      <div *ngIf="currentStep === 'selection'" class="step-content">
        <div class="step-header">
          <h2 class="section-title" tabindex="-1">🎯 Onboarding Inteligente de Conductores</h2>
          <p class="intelligence-subtitle">Selecciona el tipo de oportunidad que deseas crear</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="market">Mercado</label>
            <select id="market" [(ngModel)]="form.market" (change)="onMarketChange()" (ngModelChange)="onFormChange()">
              <option value="">Selecciona un mercado</option>
              <option value="aguascalientes">Aguascalientes</option>
              <option value="edomex">Estado de México</option>
            </select>
          </div>

          <div class="form-group" *ngIf="form.market">
            <label for="saleType">Tipo de Venta</label>
            <select id="saleType" [(ngModel)]="form.saleType" (change)="onSaleTypeChange()" (ngModelChange)="onFormChange()">
              <option value="">Selecciona tipo de venta</option>
              <option value="contado">Venta de Contado</option>
              <option value="financiero">Venta a Plazo</option>
            </select>
          </div>

          <div class="form-group" *ngIf="form.market === 'edomex' && form.saleType === 'financiero'">
            <label for="clientType">Modalidad</label>
            <select id="clientType" [(ngModel)]="form.clientType" (ngModelChange)="onFormChange()">
              <option value="">Selecciona modalidad</option>
              <option value="individual">Individual</option>
              <option value="colectivo">Crédito Colectivo</option>
            </select>
          </div>

          <div class="form-group" *ngIf="form.market === 'edomex'">
            <label for="ecosystemId">Ruta/Ecosistema *</label>
            <select id="ecosystemId" [(ngModel)]="form.ecosystemId" (change)="onEcosystemChange()" (ngModelChange)="onFormChange()">
              <option value="">Selecciona una ruta</option>
              <option *ngFor="let ecosystem of availableEcosystems" [value]="ecosystem.id">
                {{ ecosystem.name }} - {{ ecosystem.status }}
              </option>
              <option value="__NEW_ROUTE__">🆕 Nueva Ruta en Prospección</option>
            </select>
            
            <!-- New Route Input -->
            <div *ngIf="form.ecosystemId === '__NEW_ROUTE__'" class="new-route-input">
              <input type="text" 
                     [(ngModel)]="newRouteName" 
                     (ngModelChange)="onFormChange()"
                     placeholder="Nombre de la nueva ruta (ej: Ruta Valle Dorado)"
                     class="new-route-field">
              <small class="new-route-help">
                Esta ruta se registrará como "en prospección" y podrás cotizar inmediatamente
              </small>
            </div>
          </div>
          
          <!-- Routes Preview -->
          <div class="form-group full-width" *ngIf="form.market === 'edomex' && showRoutesPreview">
            <div class="routes-preview">
              <div class="routes-header">
                <h4>Rutas Disponibles en Estado de México</h4>
                <button type="button" class="btn-toggle-preview" (click)="toggleRoutesPreview()">
                  {{ showRoutesPreview ? 'Ocultar' : 'Ver Todas' }}
                </button>
              </div>
              <div class="routes-list">
                <div *ngFor="let ecosystem of availableEcosystems" 
                     class="route-item"
                     [class.route-active]="ecosystem.status === 'Activo'"
                     [class.route-pending]="ecosystem.status.includes('Pendiente')">
                  <div class="route-info">
                    <span class="route-name">{{ ecosystem.name }}</span>
                    <span class="route-status" [class]="'status-' + ecosystem.status.toLowerCase().replace(' ', '-')">
                      {{ ecosystem.status }}
                    </span>
                  </div>
                  <div class="route-docs">
                    {{ ecosystem.documents?.length || 0 }} documentos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn-primary" 
                  [disabled]="!canProceedFromSelection()"
                  (click)="nextStep()">
            Continuar
          </button>
        </div>
      </div>

      <!-- Step: Client Info -->
      <div *ngIf="currentStep === 'client_info'" class="step-content">
        <div class="step-header">
          <h2 tabindex="-1">Información del Cliente</h2>
          <p>Proporciona los datos básicos del cliente</p>
        </div>
        
        <div class="form-grid" *ngIf="form.clientType !== 'colectivo'">
          <div class="form-group">
            <label for="name">Nombre Completo *</label>
            <input id="name" type="text" [(ngModel)]="form.name" (ngModelChange)="onFormChange()" required aria-required="true" [attr.aria-describedby]="'name-error'">
            <div *ngIf="!form.name" id="name-error" class="error-message" aria-live="polite">
              El nombre es requerido.
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email *</label>
            <input id="email" type="email" [(ngModel)]="form.email" (ngModelChange)="onFormChange()" required aria-required="true" [attr.aria-describedby]="'email-error'">
            <div *ngIf="form.email && !isValidEmail(form.email)" id="email-error" class="error-message" aria-live="polite">
              Formato de email inválido.
            </div>
            <div *ngIf="!form.email" id="email-error" class="error-message" aria-live="polite">
              El email es requerido.
            </div>
          </div>

          <div class="form-group">
            <label for="phone">Teléfono *</label>
            <input id="phone" type="tel" [(ngModel)]="form.phone" (ngModelChange)="onFormChange()" required aria-required="true" [attr.aria-describedby]="'phone-error'" pattern="^(\\+52\\s?)?(\\d{2}\\s?\\d{4}\\s?\\d{4}|\\d{3}\\s?\\d{3}\\s?\\d{4})$" placeholder="55 1234 5678">
            <div *ngIf="form.phone && !isValidMexicanPhone(form.phone)" id="phone-error" class="error-message" aria-live="polite">
              Formato inválido. Ej: 55 1234 5678
            </div>
            <div *ngIf="!form.phone" id="phone-error" class="error-message" aria-live="polite">
              El teléfono es requerido.
            </div>
          </div>

          <div class="form-group">
            <label for="rfc">RFC</label>
            <input id="rfc" type="text" [(ngModel)]="form.rfc" (ngModelChange)="onFormChange()" (input)="form.rfc = (form.rfc || '').toUpperCase()" [attr.aria-describedby]="'rfc-error'" placeholder="XAXX010101000">
            <div *ngIf="form.rfc && !isValidRFC(form.rfc)" id="rfc-error" class="error-message" aria-live="polite">
              RFC inválido.
            </div>
          </div>

          <div class="form-group full-width">
            <label for="address">Dirección</label>
            <textarea id="address" [(ngModel)]="form.address" (ngModelChange)="onFormChange()" rows="3"></textarea>
          </div>
        </div>

        <!-- Collective Group Info -->
        <div class="form-grid" *ngIf="form.clientType === 'colectivo'">
          <div class="form-group full-width">
            <label for="groupName">Nombre del Grupo *</label>
            <input id="groupName" type="text" [(ngModel)]="form.groupName" (ngModelChange)="onFormChange()" required>
          </div>

          <div class="form-group full-width">
            <label>Miembros del Grupo (5 miembros requeridos)</label>
            <div class="member-inputs">
              <div *ngFor="let member of form.memberNames; let i = index" class="member-input">
                <input type="text" 
                       [(ngModel)]="form.memberNames[i]" 
                       (ngModelChange)="onFormChange()"
                       [placeholder]="'Nombre del miembro ' + (i + 1)"
                       required>
                <button type="button" 
                        class="btn-remove" 
                        title="Eliminar miembro" aria-label="Eliminar miembro"
                        *ngIf="form.memberNames.length > 5"
                        (click)="removeMember(i)">✕</button>
              </div>
              <button type="button" 
                      class="btn-add-member" 
                      *ngIf="form.memberNames.length < 10"
                      (click)="addMember()">+ Agregar Miembro</button>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn-secondary" aria-label="Volver" (click)="previousStep()">Atrás</button>
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="cta-pill" *ngIf="true">Siguiente: Carga de Documentos</span>
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
              <button class="btn-primary" 
                      [disabled]="!canProceedFromClientInfo()"
                      (click)="createClient()">
                Crear Oportunidad
              </button>
              <small class="cta-hint" *ngIf="!canProceedFromClientInfo()" aria-live="polite">Completa los campos requeridos para continuar.</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Step: Documents -->
      <div *ngIf="currentStep === 'documents'" class="step-content">
        <div class="step-header">
          <h2 tabindex="-1">Documentos Requeridos</h2>
          <p>{{ getDocumentRequirementsMessage() }}</p>
        </div>

        <div class="documents-grid" *ngIf="currentClient">
          <div *ngFor="let doc of currentClient.documents" 
               class="document-item"
               [class.doc-approved]="doc.status === 'Aprobado'"
               [class.doc-pending]="doc.status === 'Pendiente'"
               [class.doc-review]="doc.status === 'En Revisión'"
               [class.doc-rejected]="doc.status === 'Rechazado'">
            
            <div class="doc-header">
              <div class="doc-icon">📄</div>
              <div class="doc-info">
                <h4>{{ doc.name }}</h4>
                <span class="doc-status" [class]="'status-' + doc.status.toLowerCase().replace(' ', '-')">
                  {{ doc.status }}
                </span>
              </div>
            </div>

            <div class="doc-actions" *ngIf="doc.status === 'Pendiente'">
              <input type="file" 
                     #fileInput
                     style="display: none"
                     (change)="onFileSelected($event, doc.id)">
              <button class="btn-upload" (click)="attemptDocumentUpload(fileInput, doc.id)">
                Subir Documento
              </button>
            </div>

            <div class="doc-tooltip" *ngIf="getDocumentTooltip(doc.name)">
              {{ getDocumentTooltip(doc.name) }}
            </div>
          </div>
        </div>

        <div class="documents-progress" *ngIf="currentClient">
          <div class="progress-info">
            <span>{{ documentProgress.completedDocs }} de {{ documentProgress.totalDocs }} documentos completos</span>
            <span class="progress-percent">{{ documentProgress.completionPercentage }}%</span>
          </div>
          <div class="progress-bar-docs">
            <div class="progress-fill" [style.width.%]="documentProgress.completionPercentage"></div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn-secondary" aria-label="Volver" (click)="previousStep()">Atrás</button>
          <div style="display:flex; flex-direction:column; align-items:flex-end;">
            <button class="btn-primary" 
                    [disabled]="!canProceedToKyc()"
                    (click)="nextStep()">
              Continuar a KYC
            </button>
            <small class="cta-hint" *ngIf="!canProceedToKyc()" aria-live="polite">Aprueba INE y Comprobante para habilitar KYC.</small>
          </div>
        </div>
      </div>

      <!-- Step: KYC -->
      <div *ngIf="currentStep === 'kyc'" class="step-content">
        <div class="step-header">
          <h2 tabindex="-1">Verificación Biométrica</h2>
          <p>{{ kycValidation.tooltipMessage }}</p>
        </div>

        <div class="kyc-container" *ngIf="currentClient">
          <div class="kyc-status" [class]="'status-' + kycStatus.status">
            <div class="status-icon">
              <span *ngIf="kycStatus.status === 'completed'">✅</span>
              <span *ngIf="kycStatus.status === 'ready'">🔍</span>
              <span *ngIf="kycStatus.status === 'prerequisites_missing'">⚠️</span>
              <span *ngIf="kycStatus.status === 'in_progress'">⏳</span>
              <span *ngIf="kycStatus.status === 'failed'">❌</span>
            </div>
            <div class="status-text">
              <h3>{{ kycStatus.statusMessage }}</h3>
              <div *ngIf="kycValidation.missingDocs.length > 0" class="missing-docs">
                <p>Documentos faltantes:</p>
                <ul>
                  <li *ngFor="let doc of kycValidation.missingDocs">{{ doc }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- MetaMap Button Container -->
          <div id="metamap-container" 
               *ngIf="kycStatus.status === 'ready'" 
               class="metamap-container">
            <p class="kyc-instructions">
              Por favor, pasa el dispositivo al cliente para que complete su verificación de identidad biométrica.
            </p>
          </div>

          <!-- KYC Completed Info -->
          <div *ngIf="kycStatus.status === 'completed'" class="kyc-completed">
            <p>✅ Verificación biométrica completada exitosamente</p>
            <div *ngIf="kycStatus.completedAt" class="completion-info">
              <small>Completado: {{ kycStatus.completedAt | date:'medium' }}</small>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn-secondary" aria-label="Volver" (click)="previousStep()">Atrás</button>
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="cta-pill" *ngIf="true">Siguiente: Generar Contrato</span>
            <div style="display:flex; flex-direction:column; align-items:flex-end;">
              <button class="btn-primary" 
                      [disabled]="!canProceedToContracts()"
                      (click)="nextStep()">
                Continuar a Contratos
              </button>
              <small class="cta-hint" *ngIf="!canProceedToContracts()" aria-live="polite">Completa la verificación biométrica para continuar.</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Step: Contracts -->
      <div *ngIf="currentStep === 'contracts'" class="step-content">
        <div class="step-header">
          <h2 tabindex="-1">Generación de Contratos</h2>
          <p>Genera y envía los contratos correspondientes</p>
        </div>

        <div class="contracts-container" *ngIf="currentClient">
          <div class="contract-validation">
            <div class="validation-status" 
                 [class.validation-success]="contractValidation.canGenerate"
                 [class.validation-warning]="!contractValidation.canGenerate">
              
              <div class="validation-icon">
                <span *ngIf="contractValidation.canGenerate">✅</span>
                <span *ngIf="!contractValidation.canGenerate">⚠️</span>
              </div>
              
              <div class="validation-info">
                <h4 *ngIf="contractValidation.canGenerate">Listo para generar contratos</h4>
                <h4 *ngIf="!contractValidation.canGenerate">Requisitos faltantes</h4>
                
                <ul *ngIf="contractValidation.missingRequirements.length > 0" class="missing-requirements">
                  <li *ngFor="let req of contractValidation.missingRequirements">{{ req }}</li>
                </ul>
                
                <ul *ngIf="contractValidation.warningMessages.length > 0" class="warning-messages">
                  <li *ngFor="let warning of contractValidation.warningMessages">{{ warning }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="contract-actions" *ngIf="contractValidation.canGenerate">
            <button class="btn-generate-contract" 
                    [disabled]="isGeneratingContract"
                    (click)="generateContract()">
              <span *ngIf="!isGeneratingContract">Generar y Enviar Contrato</span>
              <span *ngIf="isGeneratingContract">Generando...</span>
            </button>
          </div>

          <div class="contract-status" *ngIf="contractMessage">
            <div class="status-message success">
              {{ contractMessage }}
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn-secondary" aria-label="Volver" (click)="previousStep()">Atrás</button>
          <button class="btn-primary" 
                  [disabled]="!contractMessage"
                  (click)="nextStep()">
            Finalizar Onboarding
          </button>
        </div>
      </div>

      <!-- Step: Completed -->
      <div *ngIf="currentStep === 'completed'" class="step-content">
        <div class="completion-container">
          <div class="completion-icon">🎉</div>
          <h2 tabindex="-1">¡Onboarding Completado!</h2>
          <p>La oportunidad ha sido creada exitosamente</p>
          
          <div class="completion-summary" *ngIf="currentClient">
            <div class="summary-item">
              <span class="label">Cliente:</span>
              <span class="value">{{ currentClient.name }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Flujo:</span>
              <span class="value">{{ getFlowDisplayName(currentClient.flow) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Estado:</span>
              <span class="value">{{ currentClient.status }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Score de Salud:</span>
              <span class="value">{{ currentClient.healthScore }}%</span>
            </div>
          </div>
          
          <div class="completion-actions">
            <button class="btn-primary" (click)="goToClient()">Ver Cliente</button>
            <button class="btn-secondary" (click)="startNewOnboarding()">Nuevo Onboarding</button>
          </div>
        </div>
      </div>
      
      <!-- Interview Checkpoint Modal -->
      <app-interview-checkpoint-modal
        *ngIf="showInterviewModal"
        [isVisible]="showInterviewModal"
        [modalData]="{
          clientId: currentClient?.id || '',
          clientName: currentClient?.name || '',
          documentType: 'Documento',
          checkpoint: null,
          clientData: {
            municipality: form.market,
            productType: getProductType()
          }
        }"
        (interviewCompleted)="onInterviewCompleted()"
        (modalClosed)="onInterviewModalClosed()"
        (continueUpload)="onInterviewCompleted()"
      ></app-interview-checkpoint-modal>
    </div>
  `,
  styleUrl: './onboarding-main.component.scss',
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
  // Draft recovery
  private draftSave$ = new Subject<void>();
  draftFound = false;
  private readonly draftKey = 'onboardingDraft';

  constructor(
    private onboardingEngine: OnboardingEngineService,
    private documentReqs: DocumentRequirementsService,
    private metamap: MetaMapService,
    private contractGen: ContractGenerationService,
    private mifiel: MifielService,
    private ecosystemData: EcosystemDataService,
    private interviewCheckpoint: InterviewCheckpointService
  ) { }

  ngOnInit(): void {
    // Restore draft if present
    const saved = localStorage.getItem(this.draftKey);
    if (saved) {
      this.draftFound = true;
    }

    // Debounced draft save
    this.draftSave$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      // Debounce manually via setTimeout pattern replaced by Subject usage in handlers
    });

    // Use a debounced save with setTimeout logic encapsulated in scheduleDraftSave
    // Load available ecosystems
    this.loadAvailableEcosystems();

    // Subscribe to MetaMap events
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get progressPercentage(): number {
    return (this.currentStepIndex / (this.steps.length - 1)) * 100;
  }

  // Navigation
  nextStep(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.currentStep = this.steps[this.currentStepIndex].id as OnboardingStep;
      this.onStepChange();
    }
  }

  previousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.currentStep = this.steps[this.currentStepIndex].id as OnboardingStep;
      this.onStepChange();
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
      },
      error: (error: unknown) => {
      }
    });
  }

  onKycExit(reason: string): void {
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
    // Debounce via timeout per requirement (500ms)
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
    } catch { /* ignore parse errors */ }
  }

  private clearDraft(): void {
    try { localStorage.removeItem(this.draftKey); } catch { /* ignore */ }
    this.draftFound = false;
  }

  discardDraft(): void {
    this.clearDraft();
  }
}
