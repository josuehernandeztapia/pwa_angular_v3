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
import { IconComponent } from '../shared/icon/icon.component';

/**
 * FASE 7: DOCUMENTOS TRANSFERIDOS
 * Pantalla para gestionar la transferencia legal del vehículo
 * Captura: factura, póliza de seguro, endosos, contratos firmados
 */
@Component({
  selector: 'app-documents-phase',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './documents-phase.component.html',
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

  canCompleteDocuments(): boolean {
    const form = this.documentsForm;
    if (!form) return false;
    return form.valid &&
      this.hasRequiredDocuments() &&
      !!form.get('facturaValida')?.value &&
      !!form.get('polizaVigente')?.value &&
      !!form.get('contratosFirmados')?.value &&
      !!form.get('datosCorrectos')?.value;
  }

  validationErrors(): string[] {
    const errors: string[] = [];
    const form = this.documentsForm;
    if (!form) return errors;
    if (form.get('fechaTransferencia')?.invalid) errors.push('Fecha de transferencia');
    if (form.get('titular')?.invalid) errors.push('Titular del vehículo');
    if (form.get('proveedorSeguro')?.invalid) errors.push('Proveedor de seguro');
    if (form.get('duracionPoliza')?.invalid) errors.push('Duración de póliza');
    const docs = this.uploadedDocuments();
    if (!docs.factura) errors.push('Factura original');
    if (!docs.polizaSeguro) errors.push('Póliza de seguro');
    if (docs.contratos.length === 0) errors.push('Contratos firmados');
    if (this.hasRequiredDocuments()) {
      if (!form.get('facturaValida')?.value) errors.push('Verificación de factura');
      if (!form.get('polizaVigente')?.value) errors.push('Verificación de póliza vigente');
      if (!form.get('contratosFirmados')?.value) errors.push('Verificación de contratos firmados');
      if (!form.get('datosCorrectos')?.value) errors.push('Verificación de datos correctos');
    }
    return errors;
  }

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
    }, 1500);
  }

  onSubmit(): void {
    if (!this.canCompleteDocuments()) {
      console.log('Cannot complete documents - validation failed');
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
        this.isSubmitting.set(false);
        this.showSuccessModal.set(true);
      },
      error: (error) => {
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
  constructor() {
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
    }
  }
}
