/**
 * mobile Enhanced OCR Scanner Component
 * Production-ready OCR with retry mechanism and manual fallback
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { OCRService, OCRProgress } from '../../services/ocr.service';
import { UiIconComponent } from '../ui/ui-icon/ui-icon.component';
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
  imports: [CommonModule, FormsModule, UiIconComponent, HumanMessageComponent],
  templateUrl: './ocr-scanner-enhanced.component.html',
  styleUrls: ['./ocr-scanner-enhanced.component.scss']
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