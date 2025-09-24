import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BusinessFlow, Document, DocumentStatus } from '../../models/types';
import { AviSimpleConfigService } from '../../services/avi-simple-config.service';
import { DocumentRequirementsService } from '../../services/document-requirements.service';
import { DocumentValidationService } from '../../services/document-validation.service';
import { OCRProgress, OCRResult, OCRService } from '../../services/ocr.service';
import { VoiceValidationService } from '../../services/voice-validation.service';

interface FlowContext {
  clientId?: string;
  source: 'nueva-oportunidad' | 'simulador' | 'cotizador';
  market: 'aguascalientes' | 'edomex';
  businessFlow: BusinessFlow;
  clientType: 'individual' | 'colectivo';
  quotationData?: any;
  simulatorData?: any;
}

@Component({
  selector: 'app-document-upload-flow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrls: ['./document-upload-flow.component.scss'],
  template: `
    <div class="document-upload-container" *ngIf="flowContext">
      <!-- Documentos Minimalista Card -->
      <section class="ui-card">
        <h2 class="text-sm font-semibold mb-3 text-slate-900 dark:text-slate-100">Documentos</h2>

        <!-- Upload Form -->
        <div class="upload-section mb-6">
          <input
            type="file"
            #fileInput
            (change)="onFileSelected($event)"
            accept="image/*,application/pdf"
            class="hidden"
            id="document-upload">

          <label for="document-upload"
                 class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                 data-cy="document-upload">
            <div class="flex flex-col items-center justify-center pt-5 pb-6">
              <svg class="w-8 h-8 mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              <p class="text-sm text-slate-600 dark:text-slate-400">Subir documento</p>
            </div>
          </label>
        </div>

        <!-- OCR Status -->
        <div *ngIf="showOCRStatus" class="mb-6" data-cy="ocr-status">
          <!-- OCR Pendiente -->
          <div *ngIf="ocrStatus === 'processing'" class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div class="animate-pulse w-2 h-2 bg-amber-500 rounded-full"></div>
            <span data-cy="ocr-pendiente">Pendiente</span>
          </div>

          <!-- OCR Validado -->
          <div *ngIf="ocrStatus === 'validated'" class="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span data-cy="ocr-validado">Validado</span>
          </div>

          <!-- OCR Error -->
          <div *ngIf="ocrStatus === 'error'" class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            <span data-cy="ocr-error">Error</span>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isProcessingDocument" class="animate-pulse space-y-3" data-cy="documents-loading">
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>

        <!-- Documents Table -->
        <div *ngIf="!isProcessingDocument && processedDocuments.length > 0" data-cy="documents-table">
          <div class="space-y-2">
            <div *ngFor="let doc of processedDocuments"
                 class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-xs text-slate-600 dark:text-slate-400">
                  📄
                </div>
                <div>
                  <p class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ doc.name }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ doc.type }}</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span *ngIf="doc.status === 'validated'" class="text-xs text-emerald-600 dark:text-emerald-400" data-cy="doc-status">Validado</span>
                <span *ngIf="doc.status === 'pending'" class="text-xs text-amber-600 dark:text-amber-400" data-cy="doc-status">Pendiente</span>
                <span *ngIf="doc.status === 'error'" class="text-xs text-red-600 dark:text-red-400" data-cy="doc-status">Error</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>

  `
})
export class DocumentUploadFlowComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() flowContext!: FlowContext;
  @Output() flowComplete = new EventEmitter<any>();
  @Output() goBackRequested = new EventEmitter<void>();

  requiredDocuments: Document[] = [];
  completionStatus: any = {
    totalDocs: 0,
    completedDocs: 0,
    pendingDocs: 0,
    completionPercentage: 0,
    allComplete: false
  };

  // Voice Pattern & AVI
  voicePattern = '';
  showVoicePattern = false;
  isRecording = false;
  voiceVerified = false;
  showAVI = false;
  aviAnalysis: any = null;

  // OCR State - Minimalista
  ocrStatus: 'processing' | 'validated' | 'error' | null = null;
  showOCRStatus = false;
  isProcessingDocument = false;
  processedDocuments: { name: string; type: string; status: 'validated' | 'pending' | 'error' }[] = [];

  // Original OCR properties (preserved for compatibility)
  ocrProgress: OCRProgress = { status: 'idle', progress: 0, message: '' };
  ocrResult: OCRResult | null = null;
  showOCRPreview = false;
  currentUploadingDoc: Document | null = null;
  uploadProgress: Record<string, number> = {};
  retryCounts: Record<string, number> = {};
  hashIndex: Map<string, { name: string; size: number; timestamp: number }> = new Map();
  auditLog: Array<{ timestamp: Date; docName: string; action: string; meta?: any }> = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private documentRequirements: DocumentRequirementsService,
    private documentValidation: DocumentValidationService,
    private voiceValidation: VoiceValidationService,
    private aviConfig: AviSimpleConfigService,
    private ocrService: OCRService
  ) {}

  // Expose enums to template
  protected readonly DocumentStatus = DocumentStatus;

  ngOnInit() {
    // If no explicit input provided, attempt to derive from query params for deep-linking
    if (!this.flowContext) {
      try {
        const params = new URLSearchParams(window.location.search);
        const market = (params.get('market') as any) || 'aguascalientes';
        const clientTypeParam = (params.get('clientType') || '').toLowerCase();
        const clientType = (clientTypeParam === 'colectivo' ? 'colectivo' : 'individual') as any;
        const source = (params.get('source') as any) || 'nueva-oportunidad';
        const businessFlow = (params.get('businessFlow') as any) || BusinessFlow.VentaPlazo;
        const clientId = params.get('clientId') || undefined;
        this.flowContext = { market, clientType, source, businessFlow, clientId } as any;
      } catch {}
    }
    this.initializeFlow();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Cleanup OCR worker
    this.ocrService.terminateWorker();
  }

  private async initializeFlow() {
    if (!this.flowContext) return;

    // Load required documents based on flow context
    this.documentRequirements.getDocumentRequirements({
      market: this.flowContext.market,
      saleType: 'financiero', // Default for most flows
      businessFlow: this.flowContext.businessFlow,
      clientType: this.flowContext.clientType
    }).pipe(takeUntil(this.destroy$)).subscribe((docs: Document[]) => {
      this.requiredDocuments = docs;
      this.updateCompletionStatus();
    });

    // Initialize Voice Pattern for complex flows (not VentaDirecta)
    if (this.shouldUseVoicePattern()) {
      this.initializeVoicePattern();
    }

    // Initialize AVI for high-risk flows
    if (this.shouldUseAVI()) {
      this.initializeAVI();
    }
  }

  private shouldUseVoicePattern(): boolean {
    // Voice Pattern for complex flows (exclude VentaDirecta)
    return this.flowContext.businessFlow !== BusinessFlow.VentaDirecta &&
           (this.flowContext.businessFlow === BusinessFlow.VentaPlazo ||
            this.flowContext.businessFlow === BusinessFlow.CreditoColectivo ||
            this.flowContext.market === 'edomex');
  }

  private initializeVoicePattern() {
    this.voicePattern = this.voiceValidation.generateVoicePattern();
    this.showVoicePattern = true;
  }

  private shouldUseAVI(): boolean {
    // Use AVI for complex flows (exclude VentaDirecta/Contado)
    return this.flowContext.businessFlow !== BusinessFlow.VentaDirecta &&
           (this.flowContext.clientType === 'colectivo' || 
            this.flowContext.businessFlow === BusinessFlow.CreditoColectivo ||
            this.flowContext.businessFlow === BusinessFlow.VentaPlazo);
  }

  private initializeAVI() {
    this.showAVI = true;
    this.aviAnalysis = {
      status: 'pending',
      confidence: 0,
      fraudRisk: 'UNKNOWN'
    };
  }

  // New minimalista file upload handler
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processMinimalistaUpload(file);
    }
  }

  private async processMinimalistaUpload(file: File) {
    this.isProcessingDocument = true;
    this.ocrStatus = 'processing';
    this.showOCRStatus = true;

    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const isValid = Math.random() > 0.3; // 70% success rate

      const document = {
        name: file.name,
        type: file.type.startsWith('image/') ? 'Imagen' : 'PDF',
        status: isValid ? 'validated' as const : 'error' as const
      };

      this.processedDocuments.push(document);
      this.ocrStatus = isValid ? 'validated' : 'error';

    } catch (error) {
      this.ocrStatus = 'error';
    } finally {
      this.isProcessingDocument = false;
    }
  }

  // Legacy upload method (preserved for compatibility)
  uploadDocument(document: Document) {
    this.currentUploadingDoc = document;
    this.showFileUploadDialog(document);
  }

  private showFileUploadDialog(document: Document) {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.multiple = false;

    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (file) {
        await this.processUploadedFile(file, document);
      }
    };

    input.click();
  }

  private async processUploadedFile(file: File, document: Document) {
    try {
      // Compute quick hash to detect duplicates
      const hash = await this.computeFileHash(file);
      if (this.hashIndex.has(hash)) {
        this.addAudit('duplicate_detected', document.name, { hash, size: file.size });
        document.status = DocumentStatus.Aprobado;
        this.updateCompletionStatus();
        return;
      }

      this.hashIndex.set(hash, { name: file.name, size: file.size, timestamp: Date.now() });
      this.addAudit('hash_indexed', document.name, { hash, size: file.size });

      document.status = DocumentStatus.EnRevision;
      this.updateCompletionStatus();

      // Check if it's an image for OCR processing
      if (file.type.startsWith('image/')) {
        await this.processImageWithOCR(file, document);
      } else if (file.type === 'application/pdf') {
        await this.processPDFUpload(file, document);
      } else {
        throw new Error('Tipo de archivo no soportado');
      }

    } catch (error) {
      document.status = DocumentStatus.Rechazado;
      this.updateCompletionStatus();
      this.addAudit('upload_error', document.name, { error: String(error) });
    }
  }

  private async processImageWithOCR(file: File, document: Document) {
    try {
      // Initialize OCR worker
      await this.ocrService.initializeWorker();

      // Subscribe to OCR progress
      this.ocrService.progress$.pipe(takeUntil(this.destroy$)).subscribe(
        (progress: OCRProgress) => this.ocrProgress = progress
      );

      // Extract text with OCR
      this.ocrResult = await this.ocrService.extractTextFromImage(file, document.name);
      
      // Show OCR preview for user confirmation
      this.showOCRPreview = true;
      this.currentUploadingDoc = document;


    } catch (error) {
      // Continue with regular upload even if OCR fails
      await this.finalizeDocumentUpload(document, file);
    }
  }

  private async processPDFUpload(file: File, document: Document) {
    // For PDF files, skip OCR and proceed with upload
    await this.finalizeDocumentUpload(document, file);
  }

  confirmOCRResult() {
    if (this.currentUploadingDoc && this.ocrResult) {
      this.finalizeDocumentUpload(this.currentUploadingDoc, null, this.ocrResult);
      this.closeOCRPreview();
    }
  }

  reprocessOCR() {
    if (this.currentUploadingDoc) {
      // Allow user to upload a different image
      this.showFileUploadDialog(this.currentUploadingDoc);
      this.closeOCRPreview();
    }
  }

  closeOCRPreview() {
    this.showOCRPreview = false;
    this.ocrResult = null;
    this.currentUploadingDoc = null;
    this.ocrProgress = { status: 'idle', progress: 0, message: '' };
  }

  private async finalizeDocumentUpload(document: Document, file: File | null, ocrData?: OCRResult) {
    await this.simulateUploadWithProgress(document.name);

    // Validate document based on OCR results if available
    if (ocrData && ocrData.extractedData) {
      const validation = this.ocrService.validateDocumentType(ocrData.text, document.name);
      
      if (validation.valid && validation.confidence > 0.7) {
        document.status = DocumentStatus.Aprobado;
        // Store extracted data for later use
        (document as any).extractedData = ocrData.extractedData;
      } else {
        document.status = DocumentStatus.EnRevision;
      }
    } else {
      // Default approval for non-OCR uploads
      document.status = DocumentStatus.Aprobado;
    }

    this.updateCompletionStatus();
    this.addAudit('finalized', document.name, { status: document.status });
    
    // Check if all core documents are complete to enable voice verification
    if (this.completionStatus.allComplete && this.showVoicePattern && !this.voiceVerified) {
      // Auto-start voice pattern if all docs are uploaded
      this.showVoicePattern = true;
    }
  }

  startVoiceRecording() {
    this.isRecording = true;
    
    setTimeout(() => {
      this.isRecording = false;
      this.voiceVerified = true;
      
      // Trigger AVI analysis if enabled
      if (this.showAVI) {
        this.startAVIAnalysis();
      }
    }, 3000);
  }

  private startAVIAnalysis() {
    this.aviAnalysis = {
      status: 'processing',
      confidence: 0,
      fraudRisk: 'UNKNOWN'
    };

    setTimeout(() => {
      this.aviAnalysis = {
        status: 'completed',
        confidence: 94,
        fraudRisk: 'LOW'
      };
    }, 4000);
  }

  private updateCompletionStatus() {
    this.completionStatus = this.documentRequirements.getDocumentCompletionStatus(this.requiredDocuments);
  }

  get canProceedToContracts(): boolean {
    const docsComplete = this.completionStatus.allComplete;
    const voiceComplete = !this.showVoicePattern || this.voiceVerified;
    const aviComplete = !this.showAVI || (this.aviAnalysis?.status === 'completed' && this.aviAnalysis?.fraudRisk !== 'HIGH');
    
    return docsComplete && voiceComplete && aviComplete;
  }

  proceedToContracts() {
    const contractData = {
      flowContext: this.flowContext,
      documentsComplete: true,
      voiceVerified: this.voiceVerified,
      aviAnalysis: this.aviAnalysis,
      contractType: this.getContractType()
    };

    // Emit completion event with all flow data
    this.flowComplete.emit(contractData);
    
    // Navigate to contract generation or final step
    this.router.navigate(['/contratos/generacion'], {
      queryParams: {
        clientId: this.flowContext.clientId,
        source: this.flowContext.source,
        market: this.flowContext.market,
        businessFlow: this.flowContext.businessFlow
      }
    });
  }

  private getContractType(): string {
    if (this.flowContext.businessFlow === BusinessFlow.VentaPlazo) {
      return this.flowContext.market === 'edomex' ? 'PAQUETE_DACION_PAGO' : 'VENTA_PLAZO';
    }
    return 'PROMESA_COMPRAVENTA';
  }

  saveProgress() {
    const progressData = {
      flowContext: this.flowContext,
      requiredDocuments: this.requiredDocuments,
      voicePattern: this.voicePattern,
      voiceVerified: this.voiceVerified,
      aviAnalysis: this.aviAnalysis,
      timestamp: new Date().toISOString()
    };

    sessionStorage.setItem(`documentProgress_${this.flowContext.clientId}`, JSON.stringify(progressData));
  }

  goBack() {
    this.goBackRequested.emit();
  }

  // Helper methods for template
  getFlowTitle(): string {
    switch (this.flowContext.source) {
      case 'cotizador': return 'Cotización Generada';
      case 'simulador': return 'Simulación Completada';
      case 'nueva-oportunidad': return 'Nueva Oportunidad';
      default: return 'Proceso de Documentos';
    }
  }

  // ===== Drag & Drop =====
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, document: Document): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processUploadedFile(file, document);
    }
  }

  // ===== Hashing & Audit =====
  private async computeFileHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private addAudit(action: string, docName: string, meta?: any): void {
    this.auditLog.push({ timestamp: new Date(), docName, action, meta });
    // Optionally persist minimal audit to sessionStorage
    try {
      sessionStorage.setItem('doc_audit_log', JSON.stringify(this.auditLog.slice(-200)));
    } catch {}
  }

  // ===== Progress + Retry (simulated uploader) =====
  private async simulateUploadWithProgress(key: string, attempt: number = 1): Promise<void> {
    this.uploadProgress[key] = 0;
    const totalSteps = 10;
    for (let i = 1; i <= totalSteps; i++) {
      await new Promise(r => setTimeout(r, 120));
      this.uploadProgress[key] = Math.round((i / totalSteps) * 100);
    }
    // Simulate transient failure on first attempt 10% of time
    const fail = Math.random() < 0.1 && attempt === 1;
    if (fail) {
      this.addAudit('upload_failed', key, { attempt });
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 500));
        this.addAudit('retrying', key, { nextAttempt: attempt + 1 });
        return this.simulateUploadWithProgress(key, attempt + 1);
      }
    }
    this.addAudit('upload_success', key, { attempt });
  }

  getSourceText(source: string): string {
    switch (source) {
      case 'cotizador': return 'Cotizador';
      case 'simulador': return 'Simulador';
      case 'nueva-oportunidad': return 'Nueva Oportunidad';
      default: return source;
    }
  }

  getBusinessFlowText(flow: BusinessFlow): string {
    switch (flow) {
      case BusinessFlow.VentaPlazo: return 'Venta a Plazo';
      case BusinessFlow.VentaDirecta: return 'Venta Directa';
      case BusinessFlow.CreditoColectivo: return 'Crédito Colectivo';
      case BusinessFlow.AhorroProgramado: return 'Ahorro Programado';
      default: return flow;
    }
  }

  getStatusText(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Pendiente: return 'Pendiente de subir';
      case DocumentStatus.EnRevision: return 'Procesando...';
      case DocumentStatus.Aprobado: return 'Aprobado';
      case DocumentStatus.Rechazado: return 'Rechazado - Revisar';
      default: return status;
    }
  }

  getAVIStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'completed': return 'Completado';
      default: return status;
    }
  }

  getFraudRiskText(risk: string): string {
    switch (risk) {
      case 'LOW': return 'Bajo';
      case 'MEDIUM': return 'Medio';
      case 'HIGH': return 'Alto';
      default: return 'Desconocido';
    }
  }

  getDocumentTooltip(documentName: string): string | undefined {
    return this.documentRequirements.getDocumentTooltip(documentName);
  }

  // OCR Helper methods
  getConfidenceLevel(confidence: number): string {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  getExtractedDataArray(fields: any): { key: string; value: string }[] {
    return Object.entries(fields).map(([key, value]) => ({
      key: this.formatFieldName(key),
      value: value as string
    }));
  }

  private formatFieldName(key: string): string {
    const fieldNames: { [key: string]: string } = {
      'curp': 'CURP',
      'nombre': 'Nombre',
      'apellidos': 'Apellidos',
      'fechaNacimiento': 'Fecha de Nacimiento',
      'placas': 'Placas',
      'marca': 'Marca',
      'modelo': 'Modelo',
      'año': 'Año',
      'direccion': 'Dirección',
      'fecha': 'Fecha',
      'proveedor': 'Proveedor',
      'rfc': 'RFC'
    };
    
    return fieldNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }
}
