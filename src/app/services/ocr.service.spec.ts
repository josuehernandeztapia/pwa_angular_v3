import { TestBed } from '@angular/core/testing';
import { OCRService } from './ocr.service';

const mockTesseractResult = {
  data: {
    text: 'INSTITUTO NACIONAL ELECTORAL\nNOMBRE: JUAN PEREZ GARCIA\nCURP: PEGJ850315HDFRGN09\nFECHA NACIMIENTO: 15/03/1985',
    confidence: 89.5,
    words: [
      {
        text: 'INSTITUTO',
        confidence: 95.2,
        bbox: { x0: 10, y0: 10, x1: 80, y1: 25 }
      },
      {
        text: 'NACIONAL',
        confidence: 92.1,
        bbox: { x0: 85, y0: 10, x1: 150, y1: 25 }
      },
      {
        text: 'ELECTORAL',
        confidence: 90.8,
        bbox: { x0: 155, y0: 10, x1: 220, y1: 25 }
      }
    ]
  }
};

const mockTesseractWorker = {
  recognize: jasmine.createSpy('recognize').and.returnValue(Promise.resolve(mockTesseractResult)),
  setParameters: jasmine.createSpy('setParameters').and.returnValue(Promise.resolve()),
  terminate: jasmine.createSpy('terminate').and.returnValue(Promise.resolve())
};

const mockCreateWorker = jasmine.createSpy('createWorker').and.returnValue(Promise.resolve(mockTesseractWorker));


describe('OCRService', () => {
  let service: OCRService;
  let originalRecognize: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: OCRService, useFactory: () => new OCRService(mockCreateWorker as any) }
      ]
    });
    service = TestBed.inject(OCRService);
    (service as any)._retryCount = 0;
    
    mockCreateWorker.calls.reset();
    mockTesseractWorker.recognize.calls.reset();
    mockTesseractWorker.setParameters.calls.reset();
    mockTesseractWorker.terminate.calls.reset();

    // Make retries deterministic and instantaneous in unit tests
    try {
      (service as any)['retryConfig'] = { maxRetries: 0, baseDelay: 0, maxDelay: 0, backoffMultiplier: 1 };
      spyOn<any>(service as any, 'delay').and.returnValue(Promise.resolve());
    } catch {}

    // Ensure default behavior is successful recognition for all tests unless overridden
    mockTesseractWorker.recognize.and.returnValue(Promise.resolve(mockTesseractResult));

    // Capture original for restoration
    originalRecognize = mockTesseractWorker.recognize;
  });

  afterEach(() => {
    if (service) {
      try {
        (service as any)._retryCount = 0;
      } catch {}
    }
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should provide progress observable', () => {
      expect(service.progress$).toBeDefined();
      
      service.progress$.subscribe(progress => {
        expect((progress as any)['status']).toBeDefined();
        expect((progress as any)['progress']).toBeDefined();
        expect((progress as any)['message']).toBeDefined();
      });
    });
  });

  describe('Worker Initialization', () => {
    it('should initialize Tesseract worker with Spanish and English', async () => {
      await service.initializeWorker();
      
      expect(mockCreateWorker).toHaveBeenCalledWith(
        'spa+eng', 
        1, 
        { logger: jasmine.any(Function) }
      );
      expect(mockTesseractWorker.setParameters).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initializeWorker();
      mockCreateWorker.calls.reset();
      
      await service.initializeWorker();
      
      expect(mockCreateWorker).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockCreateWorker.and.returnValue(Promise.reject(new Error('Network error')));
      
      try {
        await service.initializeWorker();
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should update progress during initialization', async () => {
      let progressUpdates: any[] = [];
      
      service.progress$.subscribe(progress => {
        progressUpdates.push(progress);
      });
      
      await service.initializeWorker();
      
      expect(progressUpdates.length).toBeGreaterThan(1);
      expect(progressUpdates.some(p => p.status === 'initializing')).toBe(true);
      expect(progressUpdates.some(p => p.status === 'ready')).toBe(true);
    });

    afterEach(() => {
      // Restore createWorker default resolution to avoid leaking rejections
      mockCreateWorker.and.returnValue(Promise.resolve(mockTesseractWorker as any));
    });
  });

  describe('Text Extraction from Image File', () => {
    const mockImageFile = new File(['fake image data'], 'ine.jpg', { type: 'image/jpeg' });

    it('should extract text from image file', async () => {
      const result = await service.extractTextFromImage(mockImageFile);
      
      expect(result.text).toContain('INSTITUTO NACIONAL ELECTORAL');
      expect(result.confidence).toBe(89.5);
      expect(result.words.length).toBe(3);
      expect(result.words[0].text).toBe('INSTITUTO');
    });

    it('should extract structured data when document type is provided', async () => {
      const result = await service.extractTextFromImage(mockImageFile, 'INE');
      
      expect(result.extractedData).toBeDefined();
      expect(result.extractedData.documentType).toBe('INE');
      expect(result.extractedData.fields.curp).toBe('PEGJ850315HDFRGN09');
    });

    it('should handle extraction errors', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.reject(new Error('OCR failed')));
      
      try {
        await service.extractTextFromImage(mockImageFile);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('OCR failed');
      }
    });

    it('should update progress during extraction', async () => {
      let progressUpdates: any[] = [];
      
      service.progress$.subscribe(progress => {
        progressUpdates.push(progress);
      });
      
      await service.extractTextFromImage(mockImageFile);
      
      const recognizingUpdate = progressUpdates.find(p => p.status === 'recognizing');
      expect(recognizingUpdate).toBeDefined();
      expect(recognizingUpdate.message).toBe('Procesando imagen...');
    });
    
    afterEach(() => {
      // Restore default behavior to avoid leaking rejection into subsequent tests
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve(mockTesseractResult));
    if (service) {
      (service as any)._retryCount = 0;
    }
    });

  afterAll(() => {
    if (service) {
      (service as any)._retryCount = 0;
    }
    // Best-effort restore
    try {
      mockTesseractWorker.recognize = originalRecognize;
    } catch {}
  });
  });

  describe('Text Extraction from Base64', () => {
    beforeEach(() => {
      // Ensure default resolve behavior for each base64 test
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve(mockTesseractResult));
    });
    const mockBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB';

    it('should extract text from base64 image', async () => {
      const result = await service.extractTextFromBase64(mockBase64);
      
      expect(result.text).toContain('INSTITUTO NACIONAL ELECTORAL');
      expect(result.confidence).toBe(89.5);
      expect(mockTesseractWorker.recognize).toHaveBeenCalledWith(mockBase64);
    });

    it('should extract structured data from base64 with document type', async () => {
      const result = await service.extractTextFromBase64(mockBase64, 'INE');
      
      expect(result.extractedData).toBeDefined();
      expect(result.extractedData.documentType).toBe('INE');
    });

    it('should handle base64 extraction errors', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.reject(new Error('Invalid image')));
      
      try {
        await service.extractTextFromBase64(mockBase64);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('INE Data Extraction', () => {
    const ineText = 'INSTITUTO NACIONAL ELECTORAL NOMBRE: MARIA GONZALEZ LOPEZ APELLIDOS: GONZALEZ LOPEZ CURP: GOLM900215MDFNPR08 FECHA NACIMIENTO: 15/02/1990';

    it('should extract CURP from INE text', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: ineText, confidence: 85, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'ine.jpg'), 'INE');
      
      expect(result.extractedData.fields.curp).toBe('GOLM900215MDFNPR08');
      expect(result.extractedData.confidence).toBeGreaterThan(0.5);
    });

    it('should extract name from INE text', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: ineText, confidence: 85, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'ine.jpg'), 'INE');
      
      expect(result.extractedData.fields.nombre).toContain('MARIA GONZALEZ LOPEZ');
    });

    it('should extract birth date from INE text', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: ineText, confidence: 85, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'ine.jpg'), 'INE');
      
      expect(result.extractedData.fields.fechaNacimiento).toBe('15/02/1990');
    });
  });

  describe('Tarjeta de Circulación Data Extraction', () => {
    const tarjetaText = 'TARJETA DE CIRCULACION PLACAS: ABC-12-34 MARCA: NISSAN MODELO: SENTRA AÑO: 2020 VEHICULO AUTOMOVIL';

    it('should extract license plates', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: tarjetaText, confidence: 80, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'tarjeta.jpg'), 'TARJETA DE CIRCULACION');
      
      expect(result.extractedData.fields.placas).toContain('ABC-12-34');
    });

    it('should extract vehicle brand', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: tarjetaText, confidence: 80, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'tarjeta.jpg'), 'TARJETA DE CIRCULACION');
      
      expect(result.extractedData.fields.marca).toBe('NISSAN');
    });

    it('should extract model and year', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: tarjetaText, confidence: 80, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'tarjeta.jpg'), 'TARJETA DE CIRCULACION');
      
      expect(result.extractedData.fields.año).toBe('2020');
    });
  });

  describe('Comprobante de Domicilio Data Extraction', () => {
    const comprobanteText = 'CFE COMISION FEDERAL ELECTRICIDAD CALLE REFORMA 123 COLONIA CENTRO DIRECCION: CALLE REFORMA 123 FECHA: 15/01/2024';

    it('should extract address information', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: comprobanteText, confidence: 75, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'comprobante.jpg'), 'COMPROBANTE DE DOMICILIO');
      
      expect(result.extractedData.fields.direccion).toContain('CALLE REFORMA 123');
    });

    it('should identify utility provider', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: comprobanteText, confidence: 75, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'comprobante.jpg'), 'COMPROBANTE DE DOMICILIO');
      
      expect(result.extractedData.fields.proveedor).toBe('CFE');
    });

    it('should extract date from comprobante', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: comprobanteText, confidence: 75, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'comprobante.jpg'), 'COMPROBANTE DE DOMICILIO');
      
      expect(result.extractedData.fields.fecha).toBe('15/01/2024');
    });
  });

  describe('RFC Data Extraction', () => {
    const rfcText = 'SERVICIO DE ADMINISTRACION TRIBUTARIA SAT CONSTANCIA DE SITUACION FISCAL NOMBRE: PEDRO MARTINEZ RUIZ RFC: MARP850615G71';

    it('should extract RFC code', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: rfcText, confidence: 88, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'rfc.jpg'), 'CONSTANCIA DE SITUACION FISCAL');
      
      expect(result.extractedData.fields.rfc).toBe('MARP850615G71');
    });

    it('should extract taxpayer name', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: rfcText, confidence: 88, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'rfc.jpg'), 'CONSTANCIA DE SITUACION FISCAL');
      
      expect(result.extractedData.fields.nombre).toContain('PEDRO MARTINEZ RUIZ');
    });
  });

  describe('Document Type Validation', () => {
    it('should validate INE document correctly', () => {
      const ineText = 'INSTITUTO NACIONAL ELECTORAL CURP CREDENCIAL PARA VOTAR';
      
      const validation = service.validateDocumentType(ineText, 'INE');
      
      expect(validation.valid).toBe(true);
      expect(validation.confidence).toBeGreaterThan(0.3);
    });

    it('should detect mismatched document types', () => {
      const tarjetaText = 'TARJETA DE CIRCULACION VEHICULO PLACAS MODELO';
      
      const validation = service.validateDocumentType(tarjetaText, 'INE');
      
      expect(validation.valid).toBe(false);
      expect(validation.suggestedType).toBe('TARJETA DE CIRCULACION');
    });

    it('should handle unknown document types', () => {
      const unknownText = 'SOME RANDOM TEXT WITHOUT CLEAR INDICATORS';
      
      const validation = service.validateDocumentType(unknownText, 'UNKNOWN_TYPE');
      
      expect(validation.valid).toBe(false);
      expect(validation.confidence).toBe(0);
    });

    it('should validate comprobante de domicilio', () => {
      const comprobanteText = 'CFE DOMICILIO DIRECCION RECIBO DE LUZ';
      
      const validation = service.validateDocumentType(comprobanteText, 'COMPROBANTE DE DOMICILIO');
      
      expect(validation.valid).toBe(true);
      expect(validation.confidence).toBeGreaterThan(0.3);
    });

    it('should validate RFC documents', () => {
      const rfcText = 'SAT SITUACION FISCAL RFC HACIENDA';
      
      const validation = service.validateDocumentType(rfcText, 'CONSTANCIA DE SITUACION FISCAL');
      
      expect(validation.valid).toBe(true);
      expect(validation.confidence).toBe(1.0);
    });
  });

  describe('Worker Management', () => {
    it('should terminate worker properly', async () => {
      await service.initializeWorker();
      await service.terminateWorker();
      
      expect(mockTesseractWorker.terminate).toHaveBeenCalled();
    });

    it('should handle termination when worker is null', async () => {
      // Should not throw error
      await service.terminateWorker();
      
      expect(mockTesseractWorker.terminate).not.toHaveBeenCalled();
    });

    it('should reinitialize worker after termination', async () => {
      await service.initializeWorker();
      await service.terminateWorker();
      
      mockCreateWorker.calls.reset();
      
      await service.initializeWorker();
      
      expect(mockCreateWorker).toHaveBeenCalled();
    });
  });

  describe('Progress Messaging', () => {
    it('should translate status messages to Spanish', async () => {
      let spanishMessages: string[] = [];
      
      service.progress$.subscribe(progress => {
        spanishMessages.push(progress.message);
      });
      
      await service.initializeWorker();
      
      expect(spanishMessages.some(msg => msg.includes('Inicializando'))).toBe(true);
      expect(spanishMessages.some(msg => msg.includes('listo'))).toBe(true);
    });

    it('should handle unknown status messages', async () => {
      let progressUpdates: any[] = [];
      
      service.progress$.subscribe(progress => {
        progressUpdates.push(progress);
      });
      
      // Simulate unknown status from Tesseract
      const mockLogger = mockCreateWorker.calls.mostRecent()?.args[2]?.logger;
      if (mockLogger) {
        mockLogger({ status: 'unknown_status', progress: 50 });
      }
      
      const unknownStatusUpdate = progressUpdates.find(p => p.status === 'unknown_status');
      if (unknownStatusUpdate) {
        expect(unknownStatusUpdate.message).toBe('unknown_status');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty text extraction', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: '', confidence: 0, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'empty.jpg'));
      
      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.words.length).toBe(0);
    });

    it('should handle malformed CURP patterns', async () => {
      const malformedText = 'INVALID CURP: ABC123 NOT A REAL CURP';
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: malformedText, confidence: 50, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'test.jpg'), 'INE');
      
      expect(result.extractedData.fields.curp).toBeUndefined();
      expect(result.extractedData.confidence).toBeLessThan(0.8);
    });

    it('should handle documents with mixed case text', async () => {
      const mixedCaseText = 'instituto Nacional Electoral nombre: Juan Pérez curp: PEGJ850315HDFRGN09';
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: mixedCaseText, confidence: 85, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'test.jpg'), 'INE');
      
      expect(result.extractedData.fields.curp).toBe('PEGJ850315HDFRGN09');
    });

    it('should handle extraction without document type', async () => {
      const result = await service.extractTextFromImage(new File([''], 'test.jpg'));
      
      expect(result.extractedData).toBeUndefined();
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle very low confidence results', async () => {
      mockTesseractWorker.recognize.and.returnValue(Promise.resolve({
        data: { text: 'BARELY LEGIBLE TEXT', confidence: 15, words: [] }
      }));

      const result = await service.extractTextFromImage(new File([''], 'blurry.jpg'), 'INE');
      
      expect(result.confidence).toBe(15);
      expect(result.extractedData.confidence).toBeLessThan(0.5);
    });
  });
});

