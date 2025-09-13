import { Inject, Injectable, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Tesseract, { Worker, createWorker } from 'tesseract.js';
import { CreateWorkerType, TESSERACT_CREATE_WORKER } from '../tokens/ocr.tokens';

export interface OCRResult {
  text: string;
  confidence: number;
  words: {
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }[];
  extractedData?: any;
}

export interface OCRProgress {
  status: string;
  progress: number;
  message: string;
}

interface ExtractedDocumentData {
  documentType: string;
  fields: { [key: string]: string };
  confidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private progressSubject = new BehaviorSubject<OCRProgress>({ status: 'idle', progress: 0, message: '' });
  private createWorkerFn: CreateWorkerType;

  // Allow injecting createWorker for easier testing/mocking
  constructor(
    @Optional() @Inject(TESSERACT_CREATE_WORKER) createWorkerFn: CreateWorkerType | null
  ) {
    this.createWorkerFn = createWorkerFn ?? createWorker;
  }
  
  public progress$ = this.progressSubject.asObservable();

  

  /**
   * Initialize Tesseract worker with Spanish and English support
   */
  async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      this.progressSubject.next({ status: 'initializing', progress: 0, message: 'Inicializando OCR...' });
      
      this.worker = await this.createWorkerFn('spa+eng', 1, {
        logger: (m: any) => {
          console.log('OCR Logger:', m);
          this.progressSubject.next({
            status: m.status,
            progress: m.progress || 0,
            message: this.getSpanishMessage(m.status)
          });
        }
      });

      // Optimize for document recognition
      await this.worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ0123456789-/.,: ',
      });

      this.isInitialized = true;
      this.progressSubject.next({ status: 'ready', progress: 100, message: 'OCR listo' });
      
    } catch (error) {
      console.error('Error initializing OCR worker:', error);
      this.progressSubject.next({ status: 'error', progress: 0, message: 'Error inicializando OCR' });
      throw error;
    }
  }

  /**
   * Extract text from image file with progress tracking
   */
  async extractTextFromImage(
    imageFile: File, 
    documentType?: string
  ): Promise<OCRResult> {
    if (!this.worker) {
      await this.initializeWorker();
    }

    try {
      this.progressSubject.next({ status: 'recognizing', progress: 0, message: 'Procesando imagen...' });

      const result = await this.worker!.recognize(imageFile);
      const words: any[] = (result as any)?.data?.words || [];
      
      const ocrResult: OCRResult = {
        text: (result as any).data.text,
        confidence: (result as any).data.confidence,
        words: words.map((word: any) => ({
          text: word.text || '',
          bbox: word.bbox || { x: 0, y: 0, w: 0, h: 0 },
          confidence: word.confidence || 0
        }))
      };

      // Extract structured data based on document type
      if (documentType) {
        ocrResult.extractedData = this.extractStructuredData(ocrResult.text, documentType);
      }

      this.progressSubject.next({ status: 'completed', progress: 100, message: 'Texto extraído' });
      
      return ocrResult;

    } catch (error) {
      console.error('Error during OCR processing:', error);
      this.progressSubject.next({ status: 'error', progress: 0, message: 'Error procesando imagen' });
      throw error;
    }
  }

  /**
   * Extract text from base64 image
   */
  async extractTextFromBase64(
    base64Image: string, 
    documentType?: string
  ): Promise<OCRResult> {
    if (!this.worker) {
      await this.initializeWorker();
    }

    try {
      const result = await this.worker!.recognize(base64Image);
      const words: any[] = (result as any)?.data?.words || [];
      
      const ocrResult: OCRResult = {
        text: (result as any).data.text,
        confidence: (result as any).data.confidence,
        words: words.map((word: any) => ({
          text: word.text || '',
          bbox: word.bbox || { x: 0, y: 0, w: 0, h: 0 },
          confidence: word.confidence || 0
        }))
      };

      if (documentType) {
        ocrResult.extractedData = this.extractStructuredData(ocrResult.text, documentType);
      }

      return ocrResult;

    } catch (error) {
      console.error('Error during OCR processing:', error);
      throw error;
    }
  }

  /**
   * Extract structured data based on document type
   */
  private extractStructuredData(text: string, documentType: string): ExtractedDocumentData {
    const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').toUpperCase();
    
    switch (documentType.toUpperCase()) {
      case 'INE':
      case 'INE VIGENTE':
        return this.extractINEData(cleanText);
      
      case 'TARJETA DE CIRCULACION':
      case 'TARJETA DE CIRCULACIÓN':
        return this.extractTarjetaCirculacionData(cleanText);
      
      case 'COMPROBANTE DE DOMICILIO':
        return this.extractComprobanteData(cleanText);
      
      case 'CONSTANCIA DE SITUACION FISCAL':
      case 'CONSTANCIA DE SITUACIÓN FISCAL':
        return this.extractRFCData(cleanText);
      
      default:
        return {
          documentType: documentType,
          fields: { text: cleanText },
          confidence: 0.5
        };
    }
  }

  /**
   * Extract INE specific data
   */
  private extractINEData(text: string): ExtractedDocumentData {
    const fields: { [key: string]: string } = {};
    let confidence = 0.3;

    // Extract CURP
    const curpMatch = text.match(/[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}/);
    if (curpMatch) {
      fields['curp'] = curpMatch[0];
      confidence += 0.2;
    }

    // Extract name patterns
    const namePatterns = [
      /NOMBRE\s*:?\s*([A-ZÁÉÍÓÚÑ\s]+)/,
      /APELLIDOS?\s*:?\s*([A-ZÁÉÍÓÚÑ\s]+)/
    ];
    
    namePatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        const key = pattern.toString().includes('APELLIDO') ? 'apellidos' : 'nombre';
        fields[key] = match[1].trim();
        confidence += 0.15;
      }
    });

    // Extract birthdate
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
    if (dateMatch) {
      fields['fechaNacimiento'] = dateMatch[1];
      confidence += 0.1;
    }

    // Validate it looks like an INE
    if (text.includes('INSTITUTO NACIONAL') || text.includes('ELECTORAL') || fields['curp']) {
      confidence += 0.2;
    }

    return {
      documentType: 'INE',
      fields,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Extract Tarjeta de Circulación data
   */
  private extractTarjetaCirculacionData(text: string): ExtractedDocumentData {
    const fields: { [key: string]: string } = {};
    let confidence = 0.3;

    // Extract license plates
    const placasMatch = text.match(/([A-Z]{3}[-\s]?\d{2}[-\s]?\d{2})|(\d{3}[-\s]?[A-Z]{3})/);
    if (placasMatch) {
      fields['placas'] = placasMatch[0].replace(/\s/g, '');
      confidence += 0.25;
    }

    // Extract vehicle brand
    const marcas = ['NISSAN', 'FORD', 'CHEVROLET', 'TOYOTA', 'VOLKSWAGEN', 'HYUNDAI', 'KIA'];
    marcas.forEach(marca => {
      if (text.includes(marca)) {
        fields['marca'] = marca;
        confidence += 0.15;
      }
    });

    // Extract model
    const modelMatch = text.match(/MODELO\s*:?\s*([A-ZÁÉÍÓÚÑ0-9\s]+)/);
    if (modelMatch) {
      fields['modelo'] = modelMatch[1].trim();
      confidence += 0.1;
    }

    // Extract year
    const yearMatch = text.match(/(19|20)\d{2}/);
    if (yearMatch) {
      fields['año'] = yearMatch[0];
      confidence += 0.1;
    }

    // Validate it looks like a Tarjeta de Circulación
    if (text.includes('CIRCULACION') || text.includes('VEHICULO') || fields['placas']) {
      confidence += 0.1;
    }

    return {
      documentType: 'TARJETA_CIRCULACION',
      fields,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Extract Comprobante de domicilio data
   */
  private extractComprobanteData(text: string): ExtractedDocumentData {
    const fields: { [key: string]: string } = {};
    let confidence = 0.3;

    // Extract address patterns
    const addressPatterns = [
      /CALLE\s+([A-ZÁÉÍÓÚÑ0-9\s,]+)/,
      /DIRECCION\s*:?\s*([A-ZÁÉÍÓÚÑ0-9\s,]+)/,
      /DOMICILIO\s*:?\s*([A-ZÁÉÍÓÚÑ0-9\s,]+)/
    ];

    addressPatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        fields['direccion'] = match[1].trim();
        confidence += 0.2;
      }
    });

    // Extract date
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
    if (dateMatch) {
      fields['fecha'] = dateMatch[1];
      confidence += 0.1;
    }

    // Check for utility companies
    const utilities = ['CFE', 'TELMEX', 'IZZI', 'TOTALPLAY', 'GAS NATURAL'];
    utilities.forEach(utility => {
      if (text.includes(utility)) {
        fields['proveedor'] = utility;
        confidence += 0.2;
      }
    });

    return {
      documentType: 'COMPROBANTE_DOMICILIO',
      fields,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Extract RFC data
   */
  private extractRFCData(text: string): ExtractedDocumentData {
    const fields: { [key: string]: string } = {};
    let confidence = 0.3;

    // Extract RFC pattern
    const rfcMatch = text.match(/[A-Z]{3,4}\d{6}[A-Z0-9]{3}/);
    if (rfcMatch) {
      fields['rfc'] = rfcMatch[0];
      confidence += 0.3;
    }

    // Extract name
    const nameMatch = text.match(/NOMBRE\s*:?\s*([A-ZÁÉÍÓÚÑ\s,]+)/);
    if (nameMatch) {
      fields['nombre'] = nameMatch[1].trim();
      confidence += 0.2;
    }

    // Check for SAT indicators
    if (text.includes('SAT') || text.includes('SITUACION FISCAL') || fields['rfc']) {
      confidence += 0.2;
    }

    return {
      documentType: 'RFC',
      fields,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Terminate the worker
   */
  async terminateWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get Spanish message for status
   */
  private getSpanishMessage(status: string): string {
    const messages: { [key: string]: string } = {
      'initializing api': 'Inicializando API...',
      'loading language traineddata': 'Cargando idioma...',
      'initializing tesseract': 'Inicializando Tesseract...',
      'loading core': 'Cargando datos de entrenamiento...',
      'recognizing text': 'Reconociendo texto...',
      'done': 'Completado',
      'ready': 'Listo'
    };
    
    return messages[status] || status;
  }

  /**
   * Validate document type based on extracted text
   */
  validateDocumentType(text: string, expectedType: string): { valid: boolean; confidence: number; suggestedType?: string } {
    const cleanText = text.toUpperCase();
    
    const documentIndicators: { [key: string]: string[] } = {
      'INE': ['INSTITUTO NACIONAL', 'ELECTORAL', 'CURP', 'CREDENCIAL'],
      'TARJETA DE CIRCULACION': ['CIRCULACION', 'VEHICULO', 'PLACAS', 'MODELO'],
      'COMPROBANTE DE DOMICILIO': ['CFE', 'TELMEX', 'DOMICILIO', 'DIRECCION'],
      'CONSTANCIA DE SITUACION FISCAL': ['SAT', 'RFC', 'SITUACION FISCAL', 'HACIENDA']
    };
    
    let bestMatch = '';
    let bestScore = 0;
    
    Object.entries(documentIndicators).forEach(([docType, indicators]) => {
      const score = indicators.reduce((acc: number, indicator: string) => {
        return acc + (cleanText.includes(indicator) ? 1 : 0);
      }, 0) / indicators.length;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = docType;
      }
    });
    
    const expectedIndicators = documentIndicators[expectedType.toUpperCase()] || [];
    const expectedScore = expectedIndicators.length > 0
      ? expectedIndicators.reduce((acc: number, indicator: string) => acc + (cleanText.includes(indicator) ? 1 : 0), 0) / expectedIndicators.length
      : 0;
    
    return {
      valid: expectedScore >= 0.3,
      confidence: expectedScore,
      suggestedType: bestScore > expectedScore ? bestMatch : undefined
    };
  }
}
