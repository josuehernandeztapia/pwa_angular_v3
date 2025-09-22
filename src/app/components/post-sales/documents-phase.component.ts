import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PostSalesQuoteApiService } from '../../services/post-sales-quote-api.service';
import { environment } from '../../../environments/environment';
import {
  DocumentFile,
  LegalDocuments
} from '../../models/types';
import { IntegratedImportTrackerService } from '../../services/integrated-import-tracker.service';
import { PostSalesApiService } from '../../services/post-sales-api.service';

/**
 * FASE 7: DOCUMENTOS TRANSFERIDOS
 * Pantalla para gestionar la transferencia legal del vehículo
 * Captura: factura, póliza de seguro, endosos, contratos firmados
 */
@Component({
  selector: 'app-documents-phase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="documents-phase-container">
      <!-- Header -->
      <div class="phase-header">
        <div class="phase-indicator">
          <span class="phase-number">7</span>
          <div class="phase-info">
            <h2>Documentos Transferidos</h2>
            <p>Transferencia legal y documentación oficial</p>
          </div>
        </div>
        <div class="client-info" *ngIf="clientInfo()">
          <span class="client-name">{{ clientInfo()?.name }}</span>
          <span class="vin">VIN: {{ clientInfo()?.vin }}</span>
        </div>
        <div class="actions">
          <button type="button" class="btn pdf" (click)="printOnePager()" data-cy="postventa-pdf">Imprimir/PDF</button>
        </div>
      </div>

      <!-- Progress Steps -->
      <div class="progress-steps">
        <div class="step completed">
          <span class="step-number">✓</span>
          <span class="step-label">Entrega</span>
        </div>
        <div class="step active">
          <span class="step-number">7</span>
          <span class="step-label">Documentos</span>
        </div>
        <div class="step">
          <span class="step-number">8</span>
          <span class="step-label">Placas</span>
        </div>
      </div>

      <!-- Main Form -->
      <form [formGroup]="documentsForm" (ngSubmit)="onSubmit()" class="documents-form">
        
        <!-- Legal Information -->
        <div class="form-section">
          <h3>📋 Información Legal</h3>
          <div class="legal-info">
            <div class="input-group">
              <label for="fechaTransferencia">Fecha de Transferencia *</label>
              <input 
                type="date" 
                id="fechaTransferencia"
                formControlName="fechaTransferencia"
                class="form-input"
                [class.error]="documentsForm.get('fechaTransferencia')?.invalid && documentsForm.get('fechaTransferencia')?.touched"
              >
            </div>
            <div class="input-group">
              <label for="titular">Titular del Vehículo *</label>
              <input 
                type="text" 
                id="titular"
                formControlName="titular"
                placeholder="Nombre completo del titular legal"
                class="form-input"
                [class.error]="documentsForm.get('titular')?.invalid && documentsForm.get('titular')?.touched"
              >
            </div>
            <div class="input-group">
              <label for="proveedorSeguro">Proveedor de Seguro *</label>
              <select 
                id="proveedorSeguro"
                formControlName="proveedorSeguro"
                class="form-input"
                [class.error]="documentsForm.get('proveedorSeguro')?.invalid && documentsForm.get('proveedorSeguro')?.touched"
              >
                <option value="">Seleccionar aseguradora...</option>
                <option value="GNPAG">GNP Seguros</option>
                <option value="ATIG">AXA Seguros</option>
                <option value="HDI">HDI Seguros</option>
                <option value="Mapfre">MAPFRE</option>
                <option value="Qualitas">Quálitas</option>
                <option value="Zurich">Zurich Seguros</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div class="input-group">
              <label for="duracionPoliza">Duración de Póliza *</label>
              <select 
                id="duracionPoliza"
                formControlName="duracionPoliza"
                class="form-input"
                [class.error]="documentsForm.get('duracionPoliza')?.invalid && documentsForm.get('duracionPoliza')?.touched"
              >
                <option value="">Seleccionar duración...</option>
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
                <option value="36">36 meses</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Required Documents -->
        <div class="form-section">
          <h3>📄 Documentos Requeridos</h3>
          <div class="documents-upload">
            
            <!-- Factura -->
            <div class="document-item">
              <div class="document-header">
                <h4 title="Documento que acredita propiedad del vehículo. Requerido para la transferencia legal." data-cy="tip-factura">🧾 Factura Original</h4>
                <span class="required-badge" title="Obligatorio para cerrar la fase de Documentos">REQUERIDO</span>
              </div>
              <div class="document-content">
                @if (!uploadedDocuments().factura) {
                  <div class="upload-area" (click)="triggerFileUpload('factura')" title="Sube la factura original en PDF para proceder con la transferencia" data-cy="upload-factura">
                    <span class="upload-icon">📄</span>
                    <p>Subir factura original (PDF)</p>
                    <small>Máximo 10MB - Solo PDF</small>
                  </div>
                } @else {
                  <div class="document-preview">
                    <div class="file-info">
                      <span class="file-icon">📄</span>
                      <div class="file-details">
                        <span class="file-name">{{ uploadedDocuments().factura?.filename }}</span>
                        <span class="file-size">{{ formatFileSize(uploadedDocuments().factura?.size || 0) }}</span>
                        <span class="upload-date">{{ formatDate(uploadedDocuments().factura?.uploadedAt) }}</span>
                      </div>
                    </div>
                    <div class="file-actions">
                      <button type="button" class="action-btn view" (click)="viewDocument('factura')">👁️ Ver</button>
                      <button type="button" class="action-btn replace" (click)="triggerFileUpload('factura')">🔄 Reemplazar</button>
                      <button type="button" class="action-btn remove" (click)="removeDocument('factura')">🗑️ Eliminar</button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Póliza de Seguro -->
            <div class="document-item">
              <div class="document-header">
                <h4 title="Comprobante de cobertura vigente para la unidad" data-cy="tip-poliza">🛡️ Póliza de Seguro</h4>
                <span class="required-badge" title="Debe estar vigente y cubrir la unidad">REQUERIDO</span>
              </div>
              <div class="document-content">
                @if (!uploadedDocuments().polizaSeguro) {
                  <div class="upload-area" (click)="triggerFileUpload('polizaSeguro')" title="Sube la póliza de seguro vigente (PDF)" data-cy="upload-poliza">
                    <span class="upload-icon">🛡️</span>
                    <p>Subir póliza de seguro (PDF)</p>
                    <small>Vigente y con cobertura completa</small>
                  </div>
                } @else {
                  <div class="document-preview">
                    <div class="file-info">
                      <span class="file-icon">🛡️</span>
                      <div class="file-details">
                        <span class="file-name">{{ uploadedDocuments().polizaSeguro?.filename }}</span>
                        <span class="file-size">{{ formatFileSize(uploadedDocuments().polizaSeguro?.size || 0) }}</span>
                        <span class="upload-date">{{ formatDate(uploadedDocuments().polizaSeguro?.uploadedAt) }}</span>
                      </div>
                    </div>
                    <div class="file-actions">
                      <button type="button" class="action-btn view" (click)="viewDocument('polizaSeguro')">👁️ Ver</button>
                      <button type="button" class="action-btn replace" (click)="triggerFileUpload('polizaSeguro')">🔄 Reemplazar</button>
                      <button type="button" class="action-btn remove" (click)="removeDocument('polizaSeguro')">🗑️ Eliminar</button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Contratos -->
            <div class="document-item">
              <div class="document-header">
                <h4 title="Contratos necesarios para formalizar la operación" data-cy="tip-contratos">📜 Contratos Firmados</h4>
                <span class="required-badge" title="Obligatorios para la entrega final">REQUERIDO</span>
              </div>
              <div class="document-content">
                @if (uploadedDocuments().contratos.length === 0) {
                  <div class="upload-area" (click)="triggerFileUpload('contratos')" title="Sube los contratos firmados (PDF); puedes seleccionar múltiples" data-cy="upload-contratos">
                    <span class="upload-icon">📜</span>
                    <p>Subir contratos firmados (PDF)</p>
                    <small>Puede seleccionar múltiples archivos</small>
                  </div>
                } @else {
                  <div class="contracts-list">
                    @for (contract of uploadedDocuments().contratos; track contract.filename) {
                      <div class="contract-item">
                        <div class="file-info">
                          <span class="file-icon">📜</span>
                          <div class="file-details">
                            <span class="file-name">{{ contract.filename }}</span>
                            <span class="file-size">{{ formatFileSize(contract.size) }}</span>
                          </div>
                        </div>
                        <div class="file-actions">
                          <button type="button" class="action-btn view" (click)="viewContractDocument(contract)">👁️ Ver</button>
                          <button type="button" class="action-btn remove" (click)="removeContractDocument(contract)">🗑️ Eliminar</button>
                        </div>
                      </div>
                    }
                    <button type="button" class="add-contract-btn" (click)="triggerFileUpload('contratos')">
                      ➕ Agregar más contratos
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Endosos (Opcional) -->
            <div class="document-item optional">
              <div class="document-header">
                <h4 title="Documentos adicionales de transferencia (si aplica)" data-cy="tip-endosos">📃 Endosos</h4>
                <span class="optional-badge" title="Solo si aplica">OPCIONAL</span>
              </div>
              <div class="document-content">
                @if (uploadedDocuments().endosos.length === 0) {
                  <div class="upload-area" (click)="triggerFileUpload('endosos')" title="Sube endosos relacionados con la transferencia" data-cy="upload-endosos">
                    <span class="upload-icon">📃</span>
                    <p>Subir endosos (si aplica)</p>
                    <small>Documentos adicionales de transferencia</small>
                  </div>
                } @else {
                  <div class="endorsements-list">
                    @for (endoso of uploadedDocuments().endosos; track endoso.filename) {
                      <div class="endorsement-item">
                        <div class="file-info">
                          <span class="file-icon">📃</span>
                          <div class="file-details">
                            <span class="file-name">{{ endoso.filename }}</span>
                            <span class="file-size">{{ formatFileSize(endoso.size) }}</span>
                          </div>
                        </div>
                        <div class="file-actions">
                          <button type="button" class="action-btn view" (click)="viewEndorsementDocument(endoso)">👁️ Ver</button>
                          <button type="button" class="action-btn remove" (click)="removeEndorsementDocument(endoso)">🗑️ Eliminar</button>
                        </div>
                      </div>
                    }
                    <button type="button" class="add-endorsement-btn" (click)="triggerFileUpload('endosos')">
                      ➕ Agregar más endosos
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Document Verification -->
        <div class="form-section" *ngIf="hasRequiredDocuments()">
          <h3>✅ Verificación de Documentos</h3>
          <div class="verification-checklist">
            <div class="verification-item">
              <input type="checkbox" id="facturaValida" formControlName="facturaValida">
              <label for="facturaValida">La factura está completa y es legible</label>
            </div>
            <div class="verification-item">
              <input type="checkbox" id="polizaVigente" formControlName="polizaVigente">
              <label for="polizaVigente">La póliza de seguro está vigente</label>
            </div>
            <div class="verification-item">
              <input type="checkbox" id="contratosFirmados" formControlName="contratosFirmados">
              <label for="contratosFirmados">Todos los contratos están debidamente firmados</label>
            </div>
            <div class="verification-item">
              <input type="checkbox" id="datosCorrectos" formControlName="datosCorrectos">
              <label for="datosCorrectos">Los datos del titular coinciden en todos los documentos</label>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-section">
          <h3>📝 Observaciones</h3>
          <textarea 
            formControlName="observaciones"
            placeholder="Agrega cualquier observación sobre la documentación o el proceso de transferencia..."
            class="form-textarea"
            rows="4"
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            type="button" 
            class="btn btn-secondary"
            (click)="goBack()"
          >
            ← Volver a Entrega
          </button>

          <button 
            type="button" 
            class="btn btn-secondary"
            (click)="saveDraft()"
            [disabled]="isSaving()"
          >
            @if (isSaving()) {
              <span class="loading-spinner"></span>
              Guardando...
            } @else {
              💾 Guardar Borrador
            }
          </button>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="!canCompleteDocuments() || isSubmitting()"
          >
            @if (isSubmitting()) {
              <span class="loading-spinner"></span>
              Completando...
            } @else {
              📋 Completar Documentos
            }
          </button>
        </div>

      <!-- Postventa → Chips "Agregar a cotización" (flag) -->
      <div class="add-to-quote" *ngIf="features.enablePostSalesAddToQuote">
        <button type="button" class="chip" (click)="addToQuote()" [disabled]="addingToQuote()">
          {{ addingToQuote() ? 'Agregando...' : '➕ Agregar a cotización' }}
        </button>
        <span class="status" *ngIf="quoteStatus()">{{ quoteStatus() }}</span>
        <small class="hint" *ngIf="!features.enableOdooQuoteBff">(Modo local: sin BFF)</small>
      </div>

      <!-- Validation Summary -->
        @if (validationErrors().length > 0) {
          <div class="validation-summary">
            <h4>⚠️ Campos requeridos:</h4>
            <ul>
              @for (error of validationErrors(); track error) {
                <li>{{ error }}</li>
              }
            </ul>
          </div>
        }
      </form>

      <!-- File Input (Hidden) -->
      <input 
        #fileInput
        id="fileInput"
        type="file" 
        accept=".pdf"
        [multiple]="currentUploadType() === 'contratos' || currentUploadType() === 'endosos'"
        (change)="onFileSelected($event)"
        style="display: none;"
      >
    </div>

    <!-- Success Modal -->
    @if (showSuccessModal()) {
      <div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1" (click)="closeSuccessModal()" (keydown)="onModalKeydown($event)">
        <div class="modal" (click)="$event.stopPropagation()" (keydown)="onModalKeydown($event)">
          <div class="modal-header">
            <h3>✅ Documentos Transferidos</h3>
          </div>
          <div class="modal-body">
            <p>La transferencia legal ha sido completada exitosamente.</p>
            <div class="transfer-summary">
              <h4>📄 Documentos procesados:</h4>
              <ul>
                <li>✅ Factura original</li>
                <li>✅ Póliza de seguro ({{ documentsForm.get('duracionPoliza')?.value }} meses)</li>
                <li>✅ {{ uploadedDocuments().contratos.length }} contrato(s) firmado(s)</li>
                @if (uploadedDocuments().endosos.length > 0) {
                  <li>✅ {{ uploadedDocuments().endosos.length }} endoso(s) adicional(es)</li>
                }
              </ul>
            </div>
            <div class="next-steps">
              <h4>Próximo paso:</h4>
              <p>📋 Gestionar entrega de placas oficiales</p>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-primary" (click)="goToPlatesPhase()" autofocus>
              Continuar a Placas →
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./documents-phase.component.scss']
})
export class DocumentsPhaseComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private importTracker = inject(IntegratedImportTrackerService);
  private quoteApi = inject(PostSalesQuoteApiService);
  private postSalesApi = inject(PostSalesApiService);

  // Signals
  clientId = signal<string>('client_001');
  clientInfo = signal<{ name: string; vin: string } | null>(null);
  currentUploadType = signal<'factura' | 'polizaSeguro' | 'contratos' | 'endosos' | null>(null);
  uploadedDocuments = signal<{
    factura: DocumentFile | null;
    polizaSeguro: DocumentFile | null;
    contratos: DocumentFile[];
    endosos: DocumentFile[];
  }>({
    factura: null,
    polizaSeguro: null,
    contratos: [],
    endosos: []
  });
  isSaving = signal(false);
  isSubmitting = signal(false);
  showSuccessModal = signal(false);
  addingToQuote = signal(false);
  quoteStatus = signal<string>('');
  features = (environment as any).features || {};

  // Form
  documentsForm: FormGroup;

  // Computed
  hasRequiredDocuments = computed(() => {
    const docs = this.uploadedDocuments();
    return docs.factura !== null && 
           docs.polizaSeguro !== null && 
           docs.contratos.length > 0;
  });

  canCompleteDocuments = computed(() => {
    const form = this.documentsForm;
    if (!form) return false;

    return form.valid && 
           this.hasRequiredDocuments() &&
           form.get('facturaValida')?.value &&
           form.get('polizaVigente')?.value &&
           form.get('contratosFirmados')?.value &&
           form.get('datosCorrectos')?.value;
  });

  validationErrors = computed(() => {
    const errors: string[] = [];
    const form = this.documentsForm;
    if (!form) return errors;

    // Form validation errors
    if (form.get('fechaTransferencia')?.invalid) errors.push('Fecha de transferencia');
    if (form.get('titular')?.invalid) errors.push('Titular del vehículo');
    if (form.get('proveedorSeguro')?.invalid) errors.push('Proveedor de seguro');
    if (form.get('duracionPoliza')?.invalid) errors.push('Duración de póliza');

    // Document validation errors
    const docs = this.uploadedDocuments();
    if (!docs.factura) errors.push('Factura original');
    if (!docs.polizaSeguro) errors.push('Póliza de seguro');
    if (docs.contratos.length === 0) errors.push('Contratos firmados');

    // Verification checkboxes
    if (this.hasRequiredDocuments()) {
      if (!form.get('facturaValida')?.value) errors.push('Verificación de factura');
      if (!form.get('polizaVigente')?.value) errors.push('Verificación de póliza vigente');
      if (!form.get('contratosFirmados')?.value) errors.push('Verificación de contratos firmados');
      if (!form.get('datosCorrectos')?.value) errors.push('Verificación de datos correctos');
    }

    return errors;
  });

  addToQuote(): void {
    this.quoteStatus.set('');
    this.addingToQuote.set(true);
    const clientId = this.clientId();
    // Create or get draft, then add a simple line item representing this phase
    this.quoteApi.getOrCreateDraftQuote(clientId).subscribe({
      next: (res: any) => {
        const quoteId = res.quoteId;
        const managementPart = {
          id: 'DOC-MGMT',
          name: 'Gestión Documental Postventa',
          priceMXN: 990,
          stock: 1,
          oem: '',
          equivalent: ''
        };
        this.quoteApi.addLine(quoteId, managementPart).subscribe({
          next: () => {
            this.addingToQuote.set(false);
            this.quoteStatus.set(`Agregado a cotización (${quoteId})`);
          },
          error: () => {
            this.addingToQuote.set(false);
            this.quoteStatus.set('Error al agregar línea a cotización');
          }
        });
      },
      error: () => {
        this.addingToQuote.set(false);
        this.quoteStatus.set('Error creando borrador de cotización');
      }
    });
  }

  // Form/data init

  private loadDocumentsData(): void {
    // Simulate loading client data
    this.clientInfo.set({
      name: 'José Hernández Pérez',
      vin: '3N1CN7AP8KL123456'
    });

    // Pre-fill form with client data
    this.documentsForm.patchValue({
      titular: 'José Hernández Pérez'
    });
  }

  triggerFileUpload(type: 'factura' | 'polizaSeguro' | 'contratos' | 'endosos'): void {
    this.currentUploadType.set(type);
    const input = document.querySelector('#fileInput') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const uploadType = this.currentUploadType();
    if (!uploadType) return;

    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf') {
        alert('Solo se permiten archivos PDF');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        alert('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      const documentFile: DocumentFile = {
        filename: file.name,
        url: URL.createObjectURL(file), // En producción sería la URL real
        uploadedAt: new Date(),
        size: file.size,
        type: 'pdf'
      };

      this.addDocumentFile(uploadType, documentFile);
    });

    // Reset input
    input.value = '';
    this.currentUploadType.set(null);
  }

  private addDocumentFile(type: 'factura' | 'polizaSeguro' | 'contratos' | 'endosos', file: DocumentFile): void {
    const currentDocs = this.uploadedDocuments();
    
    if (type === 'factura') {
      this.uploadedDocuments.set({ ...currentDocs, factura: file });
    } else if (type === 'polizaSeguro') {
      this.uploadedDocuments.set({ ...currentDocs, polizaSeguro: file });
    } else if (type === 'contratos') {
      this.uploadedDocuments.set({ ...currentDocs, contratos: [...currentDocs.contratos, file] });
    } else if (type === 'endosos') {
      this.uploadedDocuments.set({ ...currentDocs, endosos: [...currentDocs.endosos, file] });
    }
  }

  removeDocument(type: 'factura' | 'polizaSeguro'): void {
    const currentDocs = this.uploadedDocuments();
    if (type === 'factura') {
      this.uploadedDocuments.set({ ...currentDocs, factura: null });
    } else if (type === 'polizaSeguro') {
      this.uploadedDocuments.set({ ...currentDocs, polizaSeguro: null });
    }
  }

  removeContractDocument(contract: DocumentFile): void {
    const currentDocs = this.uploadedDocuments();
    const updatedContracts = currentDocs.contratos.filter((c: any) => c.filename !== contract.filename);
    this.uploadedDocuments.set({ ...currentDocs, contratos: updatedContracts });
  }

  removeEndorsementDocument(endoso: DocumentFile): void {
    const currentDocs = this.uploadedDocuments();
    const updatedEndosos = currentDocs.endosos.filter((e: any) => e.filename !== endoso.filename);
    this.uploadedDocuments.set({ ...currentDocs, endosos: updatedEndosos });
  }

  viewDocument(type: 'factura' | 'polizaSeguro'): void {
    const docs = this.uploadedDocuments();
    const doc = type === 'factura' ? docs.factura : docs.polizaSeguro;
    if (doc?.url) {
      window.open(doc.url, '_blank');
    }
  }

  viewContractDocument(contract: DocumentFile): void {
    window.open(contract.url, '_blank');
  }

  viewEndorsementDocument(endoso: DocumentFile): void {
    window.open(endoso.url, '_blank');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);
  }

  saveDraft(): void {
    this.isSaving.set(true);
    
    setTimeout(() => {
      this.isSaving.set(false);
// removed by clean-audit
    }, 1500);
  }

  onSubmit(): void {
    if (!this.canCompleteDocuments()) {
// removed by clean-audit
      return;
    }

    this.isSubmitting.set(true);

    const legalDocuments: LegalDocuments = {
      factura: this.uploadedDocuments().factura!,
      polizaSeguro: this.uploadedDocuments().polizaSeguro!,
      contratos: this.uploadedDocuments().contratos,
      endosos: this.uploadedDocuments().endosos,
      fechaTransferencia: new Date(this.documentsForm.get('fechaTransferencia')?.value),
      proveedorSeguro: this.documentsForm.get('proveedorSeguro')?.value,
      duracionPoliza: parseInt(this.documentsForm.get('duracionPoliza')?.value),
      titular: this.documentsForm.get('titular')?.value
    };

    // Complete documents phase
    this.importTracker.completeDocumentsPhase(this.clientId(), legalDocuments).subscribe({
      next: (result) => {
// removed by clean-audit
        this.isSubmitting.set(false);
        this.showSuccessModal.set(true);
      },
      error: (error) => {
// removed by clean-audit
        this.isSubmitting.set(false);
        alert('Error al completar la transferencia de documentos. Intenta nuevamente.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/post-sales/delivery', this.clientId()]);
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
  }

  goToPlatesPhase(): void {
    this.router.navigate(['/post-sales/plates', this.clientId()]);
    this.closeSuccessModal();
  }

  onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeSuccessModal();
    }
  }
  constructor(private integratedImportTracker: IntegratedImportTrackerService, private pdfExport?: any) {
    this.documentsForm = this.fb.group({
      fechaTransferencia: [new Date().toISOString().split('T')[0], Validators.required],
      titular: ['', [Validators.required, Validators.minLength(3)]],
      proveedorSeguro: ['', Validators.required],
      duracionPoliza: ['', Validators.required],
      facturaValida: [false],
      polizaVigente: [false],
      contratosFirmados: [false],
      datosCorrectos: [false],
      observaciones: ['']
    });
    this.loadDocumentsData();
  }

  async printOnePager() {
    try {
      const mod = await import('../../services/pdf-export.service');
      const pdf = new mod.PdfExportService();
      const docs = this.uploadedDocuments();
      const legal = this.documentsForm.value;
      const data = {
        clientName: this.clientInfo()?.name,
        vin: this.clientInfo()?.vin,
        titular: legal?.titular,
        fechaTransferencia: legal?.fechaTransferencia,
        proveedorSeguro: legal?.proveedorSeguro,
        duracionPoliza: legal?.duracionPoliza,
        docs: {
          factura: !!docs.factura,
          poliza: !!docs.polizaSeguro,
          contratos: docs.contratos?.length || 0,
          endosos: docs.endosos?.length || 0
        }
      } as any;
      const blob = await pdf.generatePostSalesOnePager(data);
      pdf.downloadPDF(blob, `postventa-${data.vin || 'expediente'}.pdf`);
    } catch (e) {
// removed by clean-audit
    }
  }
}

// removed by clean-audit