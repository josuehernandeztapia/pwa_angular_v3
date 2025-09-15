import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { EcosystemUiService } from '../../../services/ecosystem-ui.service';
import { CustomValidators } from '../../../validators/custom-validators';

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
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="nueva-oportunidad-container command-container">
      <div class="header-section">
        <div class="breadcrumb">
          <button class="back-btn premium-button outline" (click)="goBack()" [attr.aria-label]="'Volver'">
            ⬅️ Regresar
          </button>
          <h1 class="command-title">💎 Generador de Oportunidades Inteligente</h1>
          <div class="smart-context" *ngIf="smartContext.market || smartContext.suggestedFlow">
            <span class="context-tag" *ngIf="smartContext.market">
              📍 {{ getMarketName(smartContext.market) }}
            </span>
            <span class="context-tag" *ngIf="smartContext.suggestedFlow">
              🎯 {{ smartContext.suggestedFlow === 'COTIZACION' ? 'Sugerido: Cotizador' : 'Sugerido: Simulador' }}
            </span>
          </div>
        </div>
        <p class="intelligence-subtitle">
          {{ smartContext.market 
            ? ('Creando oportunidad para ' + getMarketName(smartContext.market) + ' con contexto inteligente del Dashboard')
            : 'El primer paso para ayudar a un transportista a obtener su unidad' }}
        </p>
        
        <!-- Progress Indicator -->
        <div class="progress-indicator">
          <div class="progress-bar intelligent-progress">
            <div class="progress-fill" [style.width.%]="getProgressPercentage()"></div>
          </div>
          <div class="progress-steps">
            <span 
              *ngFor="let step of visibleSteps; let i = index" 
              class="step"
              [class.active]="getStepStatus(i) === 'current'"
              [class.completed]="getStepStatus(i) === 'completed'"
              [class.pending]="getStepStatus(i) === 'pending'"
              [attr.aria-current]="getStepStatus(i) === 'current' ? 'step' : null"
            >
              <span class="step-icon">{{ getStepIcon(i) }}</span>
              <span class="step-label">{{ step.label }}</span>
              <span class="step-progress" *ngIf="getStepStatus(i) === 'current' && currentStepProgress > 0">
                ({{ (currentStepProgress * 100) | number:'1.0-0' }}%)
              </span>
            </span>
          </div>
        </div>
        
        <!-- Draft Recovery Banner -->
        <div class="draft-banner premium-card" *ngIf="hasDraftAvailable && !draftRecovered">
          <div class="banner-content">
            <span class="banner-icon">💾</span>
            <div class="banner-text">
              <strong>Borrador encontrado</strong>
              <p>Tienes una oportunidad sin terminar del {{ formatDraftDate(draftData.timestamp) }}</p>
            </div>
            <div class="banner-actions">
              <button class="premium-button" (click)="recoverDraft()">Continuar</button>
              <button class="premium-button secondary" (click)="discardDraft()">Descartar</button>
            </div>
          </div>
        </div>
      </div>

      <div class="form-container">
        <form [formGroup]="opportunityForm" (ngSubmit)="onSubmit()" class="opportunity-form premium-card">
          
          <!-- Step 1: Client Information -->
          <div class="form-section">
            <h2 class="section-title" id="step-title-client-info" tabindex="-1">👤 Información del Cliente</h2>
            
            <div class="form-group">
              <label for="clientName">Nombre Completo *</label>
              <div class="smart-input-container">
                <input
                  id="clientName"
                  type="text"
                  formControlName="clientName"
                  class="premium-input"
                  [class.error]="isFieldInvalid('clientName')"
                  [attr.aria-invalid]="isFieldInvalid('clientName')"
                  [attr.aria-describedby]="getErrorId('clientName')"
                  [class.checking]="isCheckingDuplicates"
                  [class.has-suggestions]="clientSuggestions.length > 0"
                  placeholder="Ej: Juan Pérez García"
                  (focus)="onClientNameFocus()"
                  (blur)="onClientNameBlur()"
                  (keydown)="handleClientNameKeydown($event)"
                  autocomplete="off"
                >
                <div class="input-status" *ngIf="isCheckingDuplicates">
                  <span class="checking-icon">🔍</span>
                </div>
                <div class="suggestions-skeletons" *ngIf="isCheckingDuplicates && clientSuggestions.length === 0">
                  <div class="skeleton-row" *ngFor="let s of [1,2,3]"></div>
                </div>
                
                <!-- Intelligent Autocomplete Dropdown -->
                <div class="autocomplete-dropdown" *ngIf="showSuggestions && clientSuggestions.length > 0">
                  <div class="suggestion-header">
                    <span class="suggestion-icon">💡</span>
                    <strong>Sugerencias inteligentes</strong>
                  </div>
                  <div class="suggestions-list">
                    <div 
                      *ngFor="let suggestion of clientSuggestions; trackBy: trackBySuggestion; let i = index" 
                      class="suggestion-item"
                      [class.highlighted]="i === selectedSuggestionIndex"
                      (click)="selectSuggestion(suggestion)"
                      (mouseenter)="selectedSuggestionIndex = i"
                    >
                      <div class="suggestion-content">
                        <div class="suggestion-name">{{ suggestion.name }}</div>
                        <div class="suggestion-details">
                          <span class="detail-item" *ngIf="suggestion.phone">📞 {{ suggestion.phone }}</span>
                          <span class="detail-item" *ngIf="suggestion.market">🏢 {{ suggestion.market }}</span>
                          <span class="detail-item suggestion-type">{{ suggestion.type }}</span>
                        </div>
                      </div>
                      <span class="select-arrow">→</span>
                    </div>
                  </div>
                  <div class="suggestion-footer" *ngIf="!isCheckingDuplicates">
                    <span class="suggestion-hint">Use ↑↓ para navegar, Enter para seleccionar</span>
                  </div>
                </div>
              </div>
              
              <!-- Similar Clients Warning -->
              <div class="similar-clients-warning" *ngIf="similarClients.length > 0">
                <div class="warning-header">
                  <span class="warning-icon">⚠️</span>
                  <strong>Clientes similares encontrados</strong>
                </div>
                <div class="similar-clients-list">
                  <div 
                    *ngFor="let client of similarClients" 
                    class="similar-client-item"
                    (click)="selectSimilarClient(client)"
                  >
                    <div class="client-avatar">{{ getClientInitials(client.name) }}</div>
                    <div class="client-info">
                      <div class="client-name">{{ client.name }}</div>
                      <div class="client-details">{{ client.phone || 'Sin teléfono' }} • {{ client.market || 'Sin mercado' }}</div>
                    </div>
                    <button type="button" class="btn-use-client">Usar este cliente</button>
                  </div>
                </div>
                <div class="continue-anyway">
                  <button type="button" class="premium-button outline" (click)="clearSimilarClients()">
                    Continuar con cliente nuevo
                  </button>
                </div>
              </div>
              
              <div *ngIf="isFieldInvalid('clientName')" class="error-message" [id]="getErrorId('clientName')">
                <span *ngIf="opportunityForm.get('clientName')?.errors?.['required']">
                  El nombre del cliente es requerido
                </span>
                <span *ngIf="opportunityForm.get('clientName')?.errors?.['clientName']">
                  {{ opportunityForm.get('clientName')?.errors?.['clientName']?.message }}
                </span>
              </div>
            </div>

            <div class="form-row priority-contact">
              <div class="form-group primary-contact">
                <label for="phone" class="primary-label">
                  📱 WhatsApp *
                  <span class="contact-priority">Principal vía de contacto</span>
                </label>
                <div class="whatsapp-input">
                  <span class="country-prefix">🇲🇽 +52</span>
                  <input
                    id="phone"
                    type="tel"
                    formControlName="phone"
                    class="form-input whatsapp-field"
                    [class.error]="isFieldInvalid('phone')"
                    [attr.aria-invalid]="isFieldInvalid('phone')"
                    [attr.aria-describedby]="getErrorId('phone')"
                    placeholder="55 1234 5678"
                    maxlength="16"
                    (blur)="onPhoneBlur()"
                  >
                  <span class="whatsapp-icon">💬</span>
                </div>
                <div *ngIf="isFieldInvalid('phone')" class="error-message" [id]="getErrorId('phone')">
                  <span *ngIf="opportunityForm.get('phone')?.errors?.['required']">
                    El número de WhatsApp es requerido para contacto
                  </span>
                  <span *ngIf="opportunityForm.get('phone')?.errors?.['mexicanPhone']">Debe contener 10 dígitos</span>
                </div>
              </div>

              <div class="form-group secondary-contact">
                <label for="email" class="secondary-label">
                  📧 Email
                  <span class="contact-optional" *ngIf="!requiresClientContactData()">Opcional</span>
                </label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="form-input email-field"
                  [class.error]="isFieldInvalid('email')"
                  [attr.aria-invalid]="isFieldInvalid('email')"
                  [attr.aria-describedby]="getErrorId('email')"
                  placeholder="cliente@correo.com"
                >
                <div *ngIf="isFieldInvalid('email')" class="error-message" [id]="getErrorId('email')">
                  <span *ngIf="opportunityForm.get('email')?.errors?.['required']">
                    El email es requerido
                  </span>
                  <span *ngIf="opportunityForm.get('email')?.errors?.['email']">
                    Formato de email inválido
                  </span>
                  <span *ngIf="opportunityForm.get('email')?.errors?.['duplicateEmail']">
                    Este email ya existe en el sistema
                  </span>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="rfc">RFC <span *ngIf="requiresClientContactData()">*</span></label>
                <input
                  id="rfc"
                  type="text"
                  formControlName="rfc"
                  class="form-input"
                  [class.error]="isFieldInvalid('rfc')"
                  [attr.aria-invalid]="isFieldInvalid('rfc')"
                  [attr.aria-describedby]="getErrorId('rfc')"
                  placeholder="GODE561231GR8"
                  (input)="opportunityForm.get('rfc')?.setValue(opportunityForm.get('rfc')?.value?.toUpperCase(), { emitEvent: false })"
                >
                <div *ngIf="isFieldInvalid('rfc')" class="error-message" [id]="getErrorId('rfc')">
                  <span *ngIf="opportunityForm.get('rfc')?.errors?.['required']">El RFC es requerido</span>
                  <span *ngIf="opportunityForm.get('rfc')?.errors?.['rfc']">RFC inválido</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Opportunity Type Selection -->
          <div class="form-section">
            <h2 id="step-title-opportunity-type" tabindex="-1">🎯 ¿Qué quieres modelar para {{ clientNameValue || 'este cliente' }}?</h2>
            <p class="section-description">
              Selecciona el tipo de oportunidad que mejor se adapte a las necesidades del cliente
            </p>

            <div class="opportunity-cards">
              <div 
                class="opportunity-card"
                [class.selected]="opportunityType === 'COTIZACION'"
                [class.suggested]="smartContext.suggestedFlow === 'COTIZACION'"
                (click)="selectOpportunityType('COTIZACION')"
              >
                <div class="card-icon">💰</div>
                <div class="card-content">
                  <h3>Adquisición de Unidad</h3>
                  <p>Cliente listo para comprar. Generar cotización rápida y transparente.</p>
                  <div class="card-tag">Modo Cotizador</div>
                </div>
              </div>

              <div 
                class="opportunity-card"
                [class.selected]="opportunityType === 'SIMULACION'"
                [class.suggested]="smartContext.suggestedFlow === 'SIMULACION'"
                (click)="selectOpportunityType('SIMULACION')"
              >
                <div class="card-icon">🎯</div>
                <div class="card-content">
                  <h3>Plan de Ahorro</h3>
                  <p>Modelar capacidad de ahorro y proyecciones financieras.</p>
                  <div class="card-tag">Modo Simulador</div>
                </div>
              </div>
            </div>

            <div *ngIf="opportunityTypeError" class="error-message">
              Debe seleccionar un tipo de oportunidad
            </div>
          </div>

          <!-- Step 3: Dynamic Market Configuration -->
          <div class="form-section" *ngIf="opportunityType && shouldShowStep('market')">
            <h2 id="step-title-market" tabindex="-1">{{ getMarketStepTitle() }}</h2>
            <p class="section-description">{{ getMarketStepDescription() }}</p>

            <div class="form-row">
              <div class="form-group">
                <label for="market">Mercado *</label>
                <select
                  id="market"
                  formControlName="market"
                  class="form-select"
                  [class.error]="isFieldInvalid('market')"
                  (change)="onMarketChange()"
                >
                  <option value="">Seleccionar mercado...</option>
                  <option value="aguascalientes">🌵 Aguascalientes</option>
                  <option value="edomex">🏔️ Estado de México</option>
                </select>
                <div *ngIf="isFieldInvalid('market')" class="error-message">
                  <span *ngIf="opportunityForm.get('market')?.errors?.['required']">
                    El mercado es requerido
                  </span>
                </div>
              </div>

              <!-- Sale Type selector (required to gate continue) -->
              <div class="form-group">
                <label for="saleType">Tipo de venta *</label>
                <select
                  id="saleType"
                  formControlName="saleType"
                  class="form-select"
                  [class.error]="isFieldInvalid('saleType')"
                  (change)="onSaleTypeChange()"
                >
                  <option value="">Seleccionar tipo...</option>
                  <option value="contado">💵 Contado</option>
                  <option value="financiero">🏦 Financiero</option>
                </select>
                <div *ngIf="isFieldInvalid('saleType')" class="error-message">
                  <span *ngIf="opportunityForm.get('saleType')?.errors?.['required']">
                    El tipo de venta es requerido
                  </span>
                </div>
              </div>

              <!-- Municipality selector (only for EdoMex) -->
              <div class="form-group" *ngIf="marketValue === 'edomex'">
                <label for="municipality">Municipio *</label>
                <select
                  id="municipality"
                  formControlName="municipality"
                  class="form-select"
                  [class.error]="isFieldInvalid('municipality')"
                >
                  <option value="">Seleccionar municipio...</option>
                  
                  <!-- ZMVM Municipalities -->
                  <optgroup label="Zona Metropolitana">
                    <option value="ecatepec">Ecatepec de Morelos</option>
                    <option value="nezahualcoyotl">Ciudad Nezahualcóyotl</option>
                    <option value="naucalpan">Naucalpan de Juárez</option>
                    <option value="tlalnepantla">Tlalnepantla de Baz</option>
                    <option value="chimalhuacan">Chimalhuacán</option>
                    <option value="valle_chalco">Valle de Chalco Solidaridad</option>
                    <option value="la_paz">La Paz</option>
                    <option value="ixtapaluca">Ixtapaluca</option>
                    <option value="coacalco">Coacalco de Berriozábal</option>
                    <option value="tultitlan">Tultitlán</option>
                    <option value="cuautitlan_izcalli">Cuautitlán Izcalli</option>
                    <option value="atizapan">Atizapán de Zaragoza</option>
                  </optgroup>
                  
                  <!-- Central Zone -->
                  <optgroup label="Zona Central">
                    <option value="toluca">Toluca de Lerdo</option>
                    <option value="metepec">Metepec</option>
                    <option value="lerma">Lerma</option>
                    <option value="zinacantepec">Zinacantepec</option>
                    <option value="almoloya_juarez">Almoloya de Juárez</option>
                  </optgroup>
                  
                  <!-- Eastern Zone -->
                  <optgroup label="Zona Oriente">
                    <option value="texcoco">Texcoco</option>
                    <option value="chalco">Chalco</option>
                    <option value="chicoloapan">Chicoloapan</option>
                  </optgroup>
                  
                  <!-- Northern Zone -->
                  <optgroup label="Zona Norte">
                    <option value="tepotzotlan">Tepotzotlán</option>
                    <option value="villa_nicolas_romero">Villa Nicolás Romero</option>
                    <option value="isidro_fabela">Isidro Fabela</option>
                  </optgroup>
                  
                  <!-- Southern Zone -->
                  <optgroup label="Zona Sur">
                    <option value="valle_bravo">Valle de Bravo</option>
                    <option value="temascaltepec">Temascaltepec</option>
                    <option value="tejupilco">Tejupilco</option>
                  </optgroup>
                </select>
                <div *ngIf="isFieldInvalid('municipality')" class="error-message">
                  <span *ngIf="opportunityForm.get('municipality')?.errors?.['required']">
                    El municipio es requerido para Estado de México
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label for="clientType">Tipo de Cliente <span *ngIf="requiresClientType()">*</span></label>
                <select
                  id="clientType"
                  formControlName="clientType"
                  class="form-select"
                  [class.error]="isFieldInvalid('clientType')"
                >
                  <option value="">Seleccionar tipo...</option>
                  <option value="Individual">👤 Individual</option>
                  <option value="Colectivo">👥 Colectivo (Tanda)</option>
                </select>
                <div *ngIf="isFieldInvalid('clientType')" class="error-message">
                  <span *ngIf="opportunityForm.get('clientType')?.errors?.['required']">El tipo de cliente es requerido para Financiero en EdoMex</span>
                </div>
              </div>
            </div>

            <!-- Business Flow (determined automatically) -->
            <div class="info-card" *ngIf="marketValue && clientTypeValue">
              <div class="info-icon">ℹ️</div>
              <div class="info-content">
                <h4>Flujo de Negocio Sugerido</h4>
                <p>
                  <strong>{{ getBusinessFlowLabel() }}</strong> - 
                  {{ getBusinessFlowDescription() }}
                </p>
              </div>
            </div>
          </div>

          <!-- Step 4: Ecosystem Selection (EdoMex Only) -->
          <div class="form-section" *ngIf="shouldShowStep('ecosystem')">
            <h2 id="step-title-ecosystem" tabindex="-1">🏪 Selección de Ecosistema</h2>
            <p class="section-description">
              En Estado de México, los clientes se organizan por ecosistemas territoriales
            </p>

            <div class="ecosystem-cards">
              <ng-container *ngIf="!loadingEcosystems && !errorEcosystems; else ecoState">
                <div 
                  *ngFor="let ecosystem of availableEcosystems" 
                  class="ecosystem-card"
                  [class.selected]="selectedEcosystem === ecosystem.id"
                  (click)="selectEcosystem(ecosystem.id)"
                >
                  <div class="ecosystem-icon">{{ ecosystem.icon }}</div>
                  <div class="ecosystem-content">
                    <h3>{{ ecosystem.name }}</h3>
                    <p>{{ ecosystem.description }}</p>
                    <div class="ecosystem-stats">
                      <span class="stat">{{ ecosystem.activeClients }} activos</span>
                      <span class="stat">{{ ecosystem.avgSavings }}% ahorro promedio</span>
                    </div>
                  </div>
                </div>
              </ng-container>
              <ng-template #ecoState>
                <div *ngIf="loadingEcosystems" class="ecoskeletons">
                  <div class="ecoskeleton-card" *ngFor="let s of [1,2,3]"></div>
                </div>
                <div *ngIf="errorEcosystems" class="ecosystem-error">
                  <p>Ocurrió un error al cargar ecosistemas.</p>
                  <button class="premium-button secondary" type="button" (click)="reloadEcosystems()">Reintentar</button>
                </div>
              </ng-template>
            </div>
          </div>


          <!-- Step 4: Additional Notes -->
          <div class="form-section" *ngIf="opportunityType && marketValue">
            <h2>📝 Notas Adicionales</h2>
            
            <div class="form-group">
              <label for="notes">Observaciones</label>
              <textarea
                id="notes"
                formControlName="notes"
                class="form-textarea"
                rows="4"
                placeholder="Información adicional sobre el cliente o la oportunidad..."
              ></textarea>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions" *ngIf="opportunityType">
            <button 
              type="button" 
              class="premium-button secondary"
              (click)="saveDraft()"
              [disabled]="isLoading"
            >
              📄 Guardar Borrador
            </button>
            
            <button 
              type="submit" 
              class="premium-button"
              [disabled]="opportunityForm.invalid || isLoading"
              [attr.aria-disabled]="opportunityForm.invalid || isLoading ? true : null"
            >
              <span *ngIf="!isLoading">
                {{ opportunityType === 'COTIZACION' ? '💰 Continuar a Cotizador' : '🎯 Continuar a Simulador' }}
              </span>
              <span *ngIf="isLoading" class="loading">
                ⏳ Procesando...
              </span>
            </button>
            <span class="next-step-pill">Siguiente: {{ nextStepLabel() }}</span>
            <span class="disabled-hint" *ngIf="opportunityForm.invalid && !isLoading">Completa los campos requeridos para continuar</span>
          </div>
        </form>

        <!-- Helper Sidebar -->
        <div class="helper-sidebar">
          <div class="helper-card">
            <h3>💡 Guía Rápida</h3>
            
            <div class="helper-section">
              <h4>🎯 ¿Cuándo usar Cotizador?</h4>
              <ul>
                <li>Cliente con decisión de compra</li>
                <li>Tiene claridad sobre enganche</li>
                <li>Necesita información de pagos</li>
              </ul>
            </div>

            <div class="helper-section">
              <h4>📊 ¿Cuándo usar Simulador?</h4>
              <ul>
                <li>Cliente explora opciones</li>
                <li>Necesita planear ahorro</li>
                <li>Quiere ver proyecciones</li>
              </ul>
            </div>

            <div class="helper-section">
              <h4>🏪 Diferencias por Mercado</h4>
              <div class="market-comparison">
                <div class="market-item">
                  <strong>Aguascalientes:</strong>
                  <span>Plazos: 12-24 meses</span>
                  <span>Enganche: 20% mín.</span>
                </div>
                <div class="market-item">
                  <strong>Estado de México:</strong>
                  <span>Plazos: 48-60 meses</span>
                  <span>Individual: 25% mín.</span>
                  <span>Colectivo: 15% mín.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './nueva-oportunidad.component.scss',
})
export class NuevaOportunidadComponent implements OnInit {
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
        console.error('Error parsing draft:', error);
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
      console.warn('EdoMex Individual clients typically use Simulacion flow');
    }

    // Business rule: AGS clients prefer Cotizacion for quick sales
    if (this.marketValue === 'aguascalientes' && this.opportunityType === 'SIMULACION') {
      console.info('AGS clients often prefer Cotizacion for faster processing');
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
          console.error('Error searching clients:', error);
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
      return '⚡ Configuración Rápida'; // Simplified for AGS Individual
    } else if (market === 'edomex') {
      return '🏔️ Configuración Estado de México'; // Full config for EdoMex
    } else {
      return '📍 Configuración del Mercado'; // Default
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
    // Mock data - in real app this would come from API based on market
    return [
      {
        id: 'centro',
        name: 'Centro Histórico',
        description: 'Zona céntrica con alta actividad comercial',
        icon: '🏛️',
        activeClients: 45,
        avgSavings: 85
      },
      {
        id: 'industrial',
        name: 'Zona Industrial',
        description: 'Área industrial con empresas manufactureras',
        icon: '🏭',
        activeClients: 32,
        avgSavings: 78
      },
      {
        id: 'residencial',
        name: 'Zona Residencial',
        description: 'Área residencial con familias trabajadoras',
        icon: '🏘️',
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
        return '✅';
      case 'current':
        return step?.icon || '⏳';
      default:
        return step?.icon || '⭕';
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
    // TODO: Also save to backend when API is ready
    console.log('Draft saved locally and will sync with backend');
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
          console.log('Client created successfully:', createdClient);
          
          // Clear draft after successful creation
          localStorage.removeItem(this.draftKey);
          
          // Navigate with enhanced context
          this.navigateToNextStep(createdClient);
        },
        error: (error) => {
          console.error('Error creating client:', error);
          this.isLoading = false;
          // TODO: Show user-friendly error message
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
        { name: 'María González Hernández', phone: '449-123-4567', market: 'AGS', type: '📊 Cotización recurrente' },
        { name: 'Carlos López Torres', phone: '449-234-5678', market: 'AGS', type: '💰 Cliente premium' },
        { name: 'Ana Patricia Morales', phone: '449-345-6789', market: 'AGS', type: '🎯 Simulación activa' }
      );
    } else if (this.smartContext.market === 'edomex') {
      this.clientSuggestions.push(
        { name: 'Roberto Sánchez Martínez', phone: '55-9876-5432', market: 'EdoMex', type: '🏢 Cliente corporativo' },
        { name: 'Laura Jiménez Ruiz', phone: '55-8765-4321', market: 'EdoMex', type: '👥 Cliente familiar' },
        { name: 'Miguel Ángel Torres', phone: '55-7654-3210', market: 'EdoMex', type: '🚗 Renovación pendiente' }
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
        { name: this.formatSuggestionName(currentName), type: '✨ Completar automáticamente' }
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