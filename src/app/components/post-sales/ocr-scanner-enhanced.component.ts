/**
 * 📱 Enhanced OCR Scanner Component
 * Production-ready OCR with retry mechanism and manual fallback
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { OCRService, OCRProgress } from '../../services/ocr.service';
import { PremiumIconComponent } from '../premium-icon/premium-icon.component';
import { HumanMessageComponent } from '../human-message/human-message.component';
import { HumanMicrocopyService } from '../../services/human-microcopy.service';

export interface OCRScanResult {
  success: boolean;
  value: string;
  confidence: number;
  method: 'ocr' | 'manual';
  needsManualEntry: boolean;
}

export type ScanMode = 'vin' | 'odometer' | 'general';

@Component({
  selector: 'app-ocr-scanner-enhanced',
  standalone: true,
  imports: [CommonModule, FormsModule, PremiumIconComponent, HumanMessageComponent],
  template: `
    <div class="ocr-scanner-enhanced" [attr.data-testid]="'ocr-scanner-' + mode">
      
      <!-- Scanner Header -->
      <div class="scanner-header">
        <div class="scanner-title">
          <app-premium-icon 
            [name]="getScannerIcon()" 
            [size]="24"
            class="scanner-icon">
          </app-premium-icon>
          <h3>{{ getScannerTitle() }}</h3>
        </div>
        <div class="scanner-status" [class]="'status-' + currentStatus">
          {{ getStatusText() }}
        </div>
      </div>

      <!-- Camera Input -->
      <div class="camera-section" *ngIf="!showManualEntry">
        <input 
          #fileInput
          type="file"
          accept="image/*"
          capture="environment"
          (change)="onImageSelected($event)"
          class="file-input"
          [attr.data-testid]="mode + '-camera-input'"
          hidden>
          
        <div class="camera-preview" *ngIf="selectedImage">
          <img [src]="selectedImage" alt="Imagen seleccionada" class="preview-image">
          <button class="retake-btn" (click)="retakePhoto()">
            <app-premium-icon name="camera" [size]="20"></app-premium-icon>
            Tomar otra foto
          </button>
        </div>
        
        <button 
          class="camera-trigger"
          (click)="triggerCamera()"
          [disabled]="isProcessing"
          [attr.data-testid]="mode + '-camera-trigger'">
          <app-premium-icon 
            [name]="selectedImage ? 'refresh' : 'camera'"
            [size]="32"
            [class.spinning]="isProcessing">
          </app-premium-icon>
          <span>{{ selectedImage ? 'Procesar imagen' : 'Tomar foto del ' + getScannerLabel() }}</span>
        </button>
      </div>

      <!-- OCR Progress -->
      <div class="ocr-progress" *ngIf="isProcessing && ocrProgress">
        <div class="progress-header">
          <span class="progress-status">{{ ocrProgress.message }}</span>
          <span class="progress-attempt" *ngIf="ocrProgress.attempt">
            Intento {{ ocrProgress.attempt }}/{{ ocrProgress.maxAttempts }}
          </span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill"
            [style.width.%]="ocrProgress.progress"
            [class]="'progress-' + ocrProgress.status">
          </div>
        </div>
      </div>

      <!-- OCR Results -->
      <div class="ocr-results" *ngIf="ocrResult && !showManualEntry">
        <div class="result-header">
          <app-premium-icon 
            [name]="ocrResult.needsManualEntry ? 'alert-triangle' : 'check-circle'"
            [size]="20"
            [class]="ocrResult.needsManualEntry ? 'text-warning' : 'text-success'">
          </app-premium-icon>
          <span>{{ ocrResult.needsManualEntry ? 'Verificación necesaria' : 'Detectado automáticamente' }}</span>
        </div>
        
        <div class="result-value">
          <input 
            type="text" 
            [(ngModel)]="detectedValue"
            [class]="'result-input ' + (ocrResult.needsManualEntry ? 'needs-verification' : 'auto-detected')"
            [attr.data-testid]="mode + '-detected-value'"
            [placeholder]="getPlaceholderText()">
          <span class="confidence-badge" *ngIf="ocrResult.confidence > 0">
            {{ ocrResult.confidence }}% confianza
          </span>
        </div>

        <app-human-message 
          *ngIf="ocrResult.needsManualEntry"
          [context]="'ocr-manual-verification'"
          [data]="{ field: getScannerLabel(), confidence: ocrResult.confidence }">
        </app-human-message>
      </div>

      <!-- Manual Entry Mode -->
      <div class="manual-entry" *ngIf="showManualEntry">
        <div class="manual-header">
          <app-premium-icon name="edit" [size]="20"></app-premium-icon>
          <span>Entrada manual</span>
        </div>
        
        <div class="manual-input-group">
          <input 
            type="text"
            [(ngModel)]="manualValue"
            [placeholder]="getPlaceholderText()"
            class="manual-input"
            [attr.data-testid]="mode + '-manual-input'"
            (input)="onManualValueChange()">
          <div class="input-validation" *ngIf="validationMessage">
            <app-premium-icon name="info" [size]="16"></app-premium-icon>
            <span>{{ validationMessage }}</span>
          </div>
        </div>

        <app-human-message 
          [context]="'manual-entry-guidance'"
          [data]="{ field: getScannerLabel() }">
        </app-human-message>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          class="btn btn-secondary"
          (click)="toggleManualEntry()"
          [disabled]="isProcessing"
          [attr.data-testid]="mode + '-toggle-manual'">
          <app-premium-icon 
            [name]="showManualEntry ? 'camera' : 'edit'"
            [size]="20">
          </app-premium-icon>
          {{ showManualEntry ? 'Usar cámara' : 'Entrada manual' }}
        </button>

        <button 
          class="btn btn-primary"
          (click)="confirmValue()"
          [disabled]="!canConfirm()"
          [attr.data-testid]="mode + '-confirm'">
          <app-premium-icon name="check" [size]="20"></app-premium-icon>
          Confirmar {{ getScannerLabel() }}
        </button>
      </div>

      <!-- Error Display -->
      <div class="error-display" *ngIf="errorMessage">
        <app-human-message 
          context="ocr-error"
          [data]="{ error: errorMessage, canRetry: true }">
        </app-human-message>
        <button class="btn btn-outline" (click)="retry()">
          <app-premium-icon name="refresh" [size]="20"></app-premium-icon>
          Reintentar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .ocr-scanner-enhanced {
      background: var(--bg-secondary, #1a2332);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .scanner-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .scanner-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .scanner-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary, #E6ECFF);
    }

    .scanner-icon {
      color: var(--accent-primary, #3AA6FF);
    }

    .scanner-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-idle { 
      background: rgba(168, 179, 207, 0.1); 
      color: var(--text-muted, #A8B3CF); 
    }
    
    .status-processing { 
      background: rgba(58, 166, 255, 0.1); 
      color: var(--accent-primary, #3AA6FF); 
    }
    
    .status-success { 
      background: rgba(34, 197, 94, 0.1); 
      color: var(--success, #22C55E); 
    }
    
    .status-error { 
      background: rgba(239, 68, 68, 0.1); 
      color: var(--error, #EF4444); 
    }

    .camera-section {
      margin-bottom: 24px;
    }

    .camera-preview {
      margin-bottom: 16px;
      position: relative;
    }

    .preview-image {
      width: 100%;
      max-height: 300px;
      object-fit: contain;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.1);
    }

    .retake-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(11, 18, 32, 0.9);
      color: var(--text-primary, #E6ECFF);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retake-btn:hover {
      background: rgba(11, 18, 32, 1);
      border-color: var(--accent-primary, #3AA6FF);
    }

    .camera-trigger {
      width: 100%;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      color: white;
      border: none;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 100px;
    }

    .camera-trigger:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(58, 166, 255, 0.3);
    }

    .camera-trigger:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .ocr-progress {
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border-left: 3px solid var(--accent-primary, #3AA6FF);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .progress-attempt {
      color: var(--text-muted, #A8B3CF);
      font-size: 12px;
    }

    .progress-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 3px;
    }

    .progress-recognizing { background: var(--accent-primary, #3AA6FF); }
    .progress-retrying { background: var(--warning, #F59E0B); }
    .progress-completed { background: var(--success, #22C55E); }
    .progress-failed { background: var(--error, #EF4444); }

    .ocr-results {
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
    }

    .result-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 500;
    }

    .text-warning { color: var(--warning, #F59E0B); }
    .text-success { color: var(--success, #22C55E); }

    .result-value {
      position: relative;
    }

    .result-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      color: var(--text-primary, #E6ECFF);
      font-size: 16px;
      transition: all 0.2s ease;
    }

    .result-input:focus {
      outline: none;
      border-color: var(--accent-primary, #3AA6FF);
      background: rgba(255, 255, 255, 0.08);
    }

    .needs-verification {
      border-color: var(--warning, #F59E0B);
      background: rgba(245, 158, 11, 0.05);
    }

    .auto-detected {
      border-color: var(--success, #22C55E);
      background: rgba(34, 197, 94, 0.05);
    }

    .confidence-badge {
      position: absolute;
      top: -8px;
      right: 8px;
      background: var(--bg-primary, #0B1220);
      color: var(--text-muted, #A8B3CF);
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .manual-entry {
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border-left: 3px solid var(--accent-primary, #3AA6FF);
    }

    .manual-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-weight: 500;
      color: var(--accent-primary, #3AA6FF);
    }

    .manual-input-group {
      position: relative;
    }

    .manual-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 12px;
      color: var(--text-primary, #E6ECFF);
      font-size: 16px;
      transition: all 0.2s ease;
    }

    .manual-input:focus {
      outline: none;
      border-color: var(--accent-primary, #3AA6FF);
      background: rgba(255, 255, 255, 0.08);
    }

    .input-validation {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-muted, #A8B3CF);
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .btn {
      flex: 1;
      padding: 12px 16px;
      border-radius: 8px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-primary {
      background: var(--accent-primary, #3AA6FF);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--accent-hover, #2563EB);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary, #E6ECFF);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.15);
      border-color: var(--accent-primary, #3AA6FF);
    }

    .btn-outline {
      background: transparent;
      color: var(--accent-primary, #3AA6FF);
      border: 1px solid var(--accent-primary, #3AA6FF);
    }

    .btn-outline:hover {
      background: var(--accent-primary, #3AA6FF);
      color: white;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .error-display {
      padding: 16px;
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  `]
})
export class OCRScannerEnhancedComponent implements OnInit, OnDestroy {
  @Input() mode: ScanMode = 'general';
  @Input() required: boolean = true;
  @Input() validateInput: boolean = true;
  @Output() valueDetected = new EventEmitter<OCRScanResult>();
  @Output() scanError = new EventEmitter<string>();

  private destroy$ = new Subject<void>();

  selectedImage: string | null = null;
  isProcessing = false;
  showManualEntry = false;
  currentStatus: 'idle' | 'processing' | 'success' | 'error' = 'idle';
  
  ocrProgress: OCRProgress | null = null;
  ocrResult: any = null;
  detectedValue = '';
  manualValue = '';
  errorMessage = '';
  validationMessage = '';

  constructor(
    private ocrService: OCRService,
    private microcopyService: HumanMicrocopyService
  ) {}

  ngOnInit() {
    // Subscribe to OCR progress
    this.ocrService.progress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.ocrProgress = progress;
        this.updateStatus(progress.status);
      });

    // Initialize microcopy contexts
    this.initializeMicrocopy();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeMicrocopy() {
    // Add OCR-specific microcopy contexts
    this.microcopyService.registerContext('ocr-manual-verification', {
      message: 'No pudimos detectar el {{field}} con suficiente confianza ({{confidence}}%). Por favor, revisa y corrige si es necesario.',
      tone: 'helpful',
      actionable: true
    });

    this.microcopyService.registerContext('manual-entry-guidance', {
      message: 'Ingresa el {{field}} manualmente. Asegúrate de que la información sea correcta.',
      tone: 'instructional',
      actionable: true
    });

    this.microcopyService.registerContext('ocr-error', {
      message: 'No pudimos procesar la imagen: {{error}}. {{canRetry ? "Puedes reintentar o usar entrada manual." : "Por favor, usa entrada manual."}}',
      tone: 'apologetic',
      actionable: true
    });
  }

  triggerCamera() {
    if (this.selectedImage && !this.isProcessing) {
      this.processImage();
    } else {
      const fileInput = document.querySelector(`input[data-testid="${this.mode}-camera-input"]`) as HTMLInputElement;
      fileInput?.click();
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImage = e.target?.result as string;
        // Automatically process the image
        this.processImage();
      };
      reader.readAsDataURL(file);
    }
  }

  private async processImage() {
    if (!this.selectedImage) return;

    this.isProcessing = true;
    this.currentStatus = 'processing';
    this.errorMessage = '';
    this.ocrResult = null;

    try {
      // Convert data URL to file
      const file = await this.dataUrlToFile(this.selectedImage, 'scan.jpg');
      
      let result;
      switch (this.mode) {
        case 'vin':
          result = await this.ocrService.extractVINFromImage(file);
          this.ocrResult = {
            value: result.vin,
            confidence: result.confidence,
            needsManualEntry: result.needsManualEntry
          };
          this.detectedValue = result.vin;
          break;
          
        case 'odometer':
          result = await this.ocrService.extractOdometerFromImage(file);
          this.ocrResult = {
            value: result.odometer?.toString() || '',
            confidence: result.confidence,
            needsManualEntry: result.needsManualEntry
          };
          this.detectedValue = result.odometer?.toString() || '';
          break;
          
        default:
          const generalResult = await this.ocrService.extractTextFromImage(file);
          this.ocrResult = {
            value: generalResult.text,
            confidence: generalResult.confidence,
            needsManualEntry: generalResult.confidence < 70
          };
          this.detectedValue = generalResult.text;
      }

      this.currentStatus = 'success';
    } catch (error) {
      this.currentStatus = 'error';
      this.errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.scanError.emit(this.errorMessage);
    } finally {
      this.isProcessing = false;
    }
  }

  private async dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  }

  retakePhoto() {
    this.selectedImage = null;
    this.ocrResult = null;
    this.detectedValue = '';
    this.currentStatus = 'idle';
    this.errorMessage = '';
  }

  toggleManualEntry() {
    this.showManualEntry = !this.showManualEntry;
    if (this.showManualEntry) {
      this.manualValue = this.detectedValue;
    }
  }

  onManualValueChange() {
    if (this.validateInput) {
      this.validateManualInput();
    }
  }

  private validateManualInput() {
    this.validationMessage = '';
    
    if (!this.manualValue.trim()) {
      this.validationMessage = `${this.getScannerLabel()} es requerido`;
      return;
    }

    switch (this.mode) {
      case 'vin':
        if (this.manualValue.length !== 17) {
          this.validationMessage = 'VIN debe tener exactamente 17 caracteres';
        } else if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(this.manualValue)) {
          this.validationMessage = 'VIN contiene caracteres inválidos';
        }
        break;
        
      case 'odometer':
        const odometerValue = parseInt(this.manualValue);
        if (isNaN(odometerValue) || odometerValue < 0 || odometerValue > 9999999) {
          this.validationMessage = 'Odómetro debe ser un número entre 0 y 9,999,999';
        }
        break;
    }
  }

  confirmValue() {
    const value = this.showManualEntry ? this.manualValue : this.detectedValue;
    const method = this.showManualEntry ? 'manual' : 'ocr';
    
    this.valueDetected.emit({
      success: true,
      value: value.trim(),
      confidence: this.showManualEntry ? 100 : (this.ocrResult?.confidence || 0),
      method,
      needsManualEntry: false
    });
  }

  canConfirm(): boolean {
    if (this.isProcessing) return false;
    
    const value = this.showManualEntry ? this.manualValue : this.detectedValue;
    
    if (!value?.trim()) return false;
    
    if (this.showManualEntry && this.validateInput) {
      this.validateManualInput();
      return !this.validationMessage;
    }
    
    return true;
  }

  retry() {
    this.errorMessage = '';
    this.currentStatus = 'idle';
    if (this.selectedImage) {
      this.processImage();
    }
  }

  private updateStatus(status: string) {
    switch (status) {
      case 'recognizing':
      case 'retrying':
      case 'processing':
        this.currentStatus = 'processing';
        break;
      case 'completed':
        this.currentStatus = 'success';
        break;
      case 'error':
      case 'failed':
        this.currentStatus = 'error';
        break;
      default:
        this.currentStatus = 'idle';
    }
  }

  getScannerIcon(): string {
    switch (this.mode) {
      case 'vin': return 'car';
      case 'odometer': return 'speedometer';
      default: return 'scan';
    }
  }

  getScannerTitle(): string {
    switch (this.mode) {
      case 'vin': return 'Escanear VIN';
      case 'odometer': return 'Escanear Odómetro';
      default: return 'Escanear Documento';
    }
  }

  getScannerLabel(): string {
    switch (this.mode) {
      case 'vin': return 'VIN';
      case 'odometer': return 'odómetro';
      default: return 'documento';
    }
  }

  getPlaceholderText(): string {
    switch (this.mode) {
      case 'vin': return 'Ej: 1HGCM82633A123456';
      case 'odometer': return 'Ej: 85432';
      default: return 'Texto detectado...';
    }
  }

  getStatusText(): string {
    switch (this.currentStatus) {
      case 'idle': return 'Listo para escanear';
      case 'processing': return 'Procesando...';
      case 'success': return 'Completado';
      case 'error': return 'Error';
      default: return '';
    }
  }
}