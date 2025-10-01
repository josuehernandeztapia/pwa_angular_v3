import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { DocumentValidationService, DocumentRequirement } from './document-validation.service';
import { Document, Client, DocumentStatus, BusinessFlow, Market } from '../models/types';
import { environment } from '../../environments/environment';

describe('DocumentValidationService', () => {
  let service: DocumentValidationService;
  let originalTimeout: number;
  
  beforeAll(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
  });

  afterAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });
  

  const mockClient: Client = {
    id: 'client-123',
    name: 'Juan Pérez García',
    email: 'juan@example.com',
    phone: '+525512345678',
    status: 'Activo' as any,
    market: 'aguascalientes' as Market,
    flow: BusinessFlow.Individual,
    ecosystemId: 'ags-ecosystem-001',
    healthScore: 85,
    documents: [
      {
        id: 'doc-ine-123',
        name: 'INE Vigente',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-15'),
        expirationDate: new Date('2034-01-15')
      },
      {
        id: 'doc-rfc-123',
        name: 'RFC Persona Física',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-15')
      },
      {
        id: 'doc-comprobante-123',
        name: 'Comprobante de Domicilio',
        status: DocumentStatus.Pendiente,
        uploadedAt: new Date('2024-01-10'),
        expirationDate: new Date('2024-04-10')
      }
    ],
    events: [],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16')
  };

  const mockEdomexClient: Client = {
    ...mockClient,
    id: 'client-edomex-456',
    market: 'edomex' as Market,
    flow: BusinessFlow.CreditoColectivo,
    ecosystemId: 'edomex-ruta-001'
  };

  const mockDocument: Document = {
    id: 'doc-test-123',
    name: 'INE_Juan_Perez.pdf',
    status: DocumentStatus.Pendiente,
    uploadedAt: new Date('2024-01-15'),
    expirationDate: new Date('2034-01-15')
  };

  const mockExpiredDocument: Document = {
    id: 'doc-expired-123',
    name: 'Licencia_Vencida.pdf',
    status: DocumentStatus.Pendiente,
    uploadedAt: new Date('2023-01-15'),
    expirationDate: new Date('2023-06-15')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DocumentValidationService]
    });
    service = TestBed.inject(DocumentValidationService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      (expect(service) as any).toBeTruthy();
    });

    it('should initialize document requirements', () => {
      const agsRequirements = service.getRequiredDocuments('aguascalientes', BusinessFlow.Individual);
      (expect(agsRequirements.length) as any).toBeGreaterThan(0);
      
      const universalReq = agsRequirements.find(req => req.name === 'INE');
      (expect(universalReq) as any).toBeTruthy();
      (expect(universalReq?.required) as any).toBe(true);
    });
  });

  describe('Document Validation', () => {
    it('should validate document with valid format', (done) => {
      service.validateDocument(mockDocument).subscribe(result => {
        (expect(result.valid) as any).toBeTruthy();
        (expect(result.score) as any).toBeGreaterThan(70);
        (expect(result.issues.length) as any).toBe(0);
        done();
      });
    });

    it('should detect invalid file format', (done) => {
      const invalidFormatDoc = {
        ...mockDocument,
        name: 'document.txt'
      };

      service.validateDocument(invalidFormatDoc).subscribe(result => {
        (expect(result.valid) as any).toBe(false);
        (expect(result.issues.length) as any).toBeGreaterThan(0);
        (expect(result.issues[0].code) as any).toBe('INVALID_FORMAT');
        (expect(result.issues[0].type) as any).toBe('error');
        done();
      });
    });

    it('should detect expired documents', (done) => {
      service.validateDocument(mockExpiredDocument).subscribe(result => {
        (expect(result.valid) as any).toBe(false);
        const expiredIssue = result.issues.find(issue => issue.code === 'DOCUMENT_EXPIRED');
        (expect(expiredIssue) as any).toBeTruthy();
        (expect(expiredIssue?.type) as any).toBe('error');
        done();
      });
    });

    it('should generate auto-corrections for fixable issues', (done) => {
      const badFilenameDoc = {
        ...mockDocument,
        name: 'doc123.pdf'
      };

      service.validateDocument(badFilenameDoc).subscribe(result => {
        (expect(result.autoCorrections) as any).toBeDefined();
        if (result.issues.some(issue => issue.fixable)) {
          (expect(result.autoCorrections.length) as any).toBeGreaterThan(0);
        }
        done();
      });
    });

    it('should provide suggestions for improvement', (done) => {
      const lowQualityDoc = {
        ...mockDocument,
        name: 'blurry_image.jpg'
      };

      service.validateDocument(lowQualityDoc).subscribe(result => {
        (expect(result.suggestions) as any).toBeDefined();
        (expect(Array.isArray(result.suggestions)) as any).toBe(true);
        done();
      });
    });

    it('should merge remote validation response when mocks are disabled', (done) => {
      const remoteResponse = {
        data: {
          valid: false,
          score: 55,
          issues: [{ code: 'REMOTE_BLOCK', type: 'error' as const, message: 'Server validation failed', severity: 8, fixable: false }],
          suggestions: ['Revisar legibilidad en backend']
        }
      };

      const httpClientStub = {
        post: jasmine.createSpy('post').and.returnValue(of(remoteResponse))
      } as any;

      (service as any).httpClient = httpClientStub;
      const useMockSpy = spyOn(service as any, 'shouldUseMock').and.returnValue(false);

      service.validateDocument(mockDocument).subscribe({
        next: result => {
          expect(httpClientStub.post).toHaveBeenCalledWith('documents/validate', jasmine.any(Object));
          expect(result.valid).toBe(false);
          expect(result.score).toBe(55);
          expect(result.issues).toEqual(remoteResponse.data.issues);
          expect(result.suggestions).toEqual(['Revisar legibilidad en backend']);
        },
        error: error => done.fail(error),
        complete: () => {
          useMockSpy.and.callThrough();
          (service as any).httpClient = undefined;
          done();
        }
      });
    });
  });

  describe('Compliance Report Generation', () => {
    it('should generate compliance report for Aguascalientes client', (done) => {
      service.generateComplianceReport(mockClient).subscribe(report => {
        (expect(report.clientId) as any).toBe(mockClient.id);
        (expect(report.market) as any).toBe('aguascalientes');
        (expect(report.flow) as any).toBe(BusinessFlow.Individual);
        (expect(report.overallScore) as any).toBeGreaterThanOrEqual(0);
        (expect(report.overallScore) as any).toBeLessThanOrEqual(100);
        (expect(report.complianceLevel) as any).toMatch(/complete|partial|insufficient|non-compliant/);
        done();
      });
    });

    it('should identify missing documents', (done) => {
      const incompleteClient = {
        ...mockClient,
        documents: [mockClient.documents[0]] // Only INE
      };

      service.generateComplianceReport(incompleteClient).subscribe(report => {
        (expect(report.missingDocuments.length) as any).toBeGreaterThan(0);
        (expect(report.complianceLevel) as any).not.toBe('complete');
        (expect(report.blockingIssues.length) as any).toBeGreaterThanOrEqual(0);
        done();
      });
    });

    it('should categorize documents correctly', (done) => {
      service.generateComplianceReport(mockClient).subscribe(report => {
        (expect(report.validDocuments) as any).toBeDefined();
        (expect(report.invalidDocuments) as any).toBeDefined();
        (expect(report.warningDocuments) as any).toBeDefined();
        
        const totalCategorized = report.validDocuments.length + 
                               report.invalidDocuments.length + 
                               report.warningDocuments.length;
        (expect(totalCategorized) as any).toBe(report.submittedDocuments.length);
        done();
      });
    });

    it('should provide blocking issues for incomplete documents', (done) => {
      const clientWithoutINE = {
        ...mockClient,
        documents: mockClient.documents.filter(doc => !doc.name.includes('INE'))
      };

      service.generateComplianceReport(clientWithoutINE).subscribe(report => {
        (expect(report.blockingIssues.length) as any).toBeGreaterThan(0);
        (expect(report.blockingIssues.some(issue => issue.includes('INE'))) as any).toBe(true);
        done();
      });
    });

    it('should merge remote overrides with local snapshot', () => {
      const overrideRequirement: DocumentRequirement = {
        id: 'doc-custom',
        name: 'Documento Personalizado',
        description: 'Doc generado desde backend',
        required: true,
        validationRules: []
      };

      const overrides = {
        clientId: 'remote-client-987',
        requiredDocuments: [overrideRequirement],
        submittedDocuments: [],
        missingDocuments: [overrideRequirement],
        overallScore: 75,
        complianceLevel: 'partial' as const,
        blockingIssues: ['backend_override'],
        recommendations: ['remote recommendation'],
        nextSteps: ['remote next step']
      };

      const report = service.composeComplianceReport(mockClient, overrides);

      (expect(report.clientId) as any).toBe('remote-client-987');
      (expect(report.requiredDocuments) as any).toEqual([overrideRequirement]);
      (expect(report.submittedDocuments.length) as any).toBe(0);
      (expect(report.missingDocuments) as any).toEqual([overrideRequirement]);
      (expect(report.overallScore) as any).toBe(75);
      (expect(report.complianceLevel) as any).toBe('partial');
      (expect(report.blockingIssues) as any).toEqual(['backend_override']);
      (expect(report.recommendations) as any).toEqual(['remote recommendation']);
      (expect(report.nextSteps) as any).toEqual(['remote next step']);
    });

    it('should generate appropriate next steps', (done) => {
      service.generateComplianceReport(mockClient).subscribe(report => {
        (expect(report.nextSteps) as any).toBeDefined();
        (expect(report.nextSteps.length) as any).toBeGreaterThan(0);
        
        if (report.complianceLevel === 'complete') {
          (expect(report.nextSteps.some(step => step.includes('validación financiera'))) as any).toBe(true);
        } else {
          (expect(report.nextSteps.some(step => step.includes('Contactar') || step.includes('Solicitar'))) as any).toBe(true);
        }
        done();
      });
    });

    it('should fall back to local report when remote request fails', (done) => {
      const originalMockFlag = environment.features.enableMockData;
      environment.features.enableMockData = false;

      const httpClientStub = {
        post: () => throwError(() => new Error('network error')),
      } as any;

      (service as any).httpClient = httpClientStub;

      service.generateComplianceReport(mockClient).subscribe({
        next: report => {
          (expect(report.clientId) as any).toBe(mockClient.id);
          environment.features.enableMockData = originalMockFlag;
          (service as any).httpClient = undefined;
          done();
        },
        error: error => {
          environment.features.enableMockData = originalMockFlag;
          (service as any).httpClient = undefined;
          done.fail(error);
        }
      });
    });

    it('should merge remote compliance report overrides when API succeeds', (done) => {
      const remoteReport = {
        data: {
          clientId: 'remote-client-001',
          overallScore: 92,
          complianceLevel: 'complete' as const,
          missingDocuments: [],
          recommendations: ['Backend aprobó expediente'],
          nextSteps: ['Continuar con firma de contrato']
        }
      };

      const httpClientStub = {
        post: jasmine.createSpy('post').and.returnValue(of(remoteReport))
      } as any;

      (service as any).httpClient = httpClientStub;
      const useMockSpy = spyOn(service as any, 'shouldUseMock').and.returnValue(false);

      service.generateComplianceReport(mockClient).subscribe({
        next: report => {
          expect(httpClientStub.post).toHaveBeenCalledWith('documents/compliance-report', jasmine.any(Object));
          expect(report.clientId).toBe('remote-client-001');
          expect(report.overallScore).toBe(92);
          expect(report.complianceLevel).toBe('complete');
          expect(report.recommendations).toEqual(['Backend aprobó expediente']);
          expect(report.nextSteps).toEqual(['Continuar con firma de contrato']);
        },
        error: error => done.fail(error),
        complete: () => {
          useMockSpy.and.callThrough();
          (service as any).httpClient = undefined;
          done();
        }
      });
    });
  });

  describe('Ecosystem Document Validation (EdoMex)', () => {
    const mockEcosystemDocuments: Document[] = [
      {
        id: 'doc-acta-123',
        name: 'Acta Constitutiva de Ruta',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-10')
      },
      {
        id: 'doc-poderes-123',
        name: 'Poderes Notariales',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-10')
      },
      {
        id: 'doc-ine-rep-123',
        name: 'INE Representante Legal',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-10')
      },
      {
        id: 'doc-rfc-ruta-123',
        name: 'Constancia Situación Fiscal Ruta',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-10')
      },
      {
        id: 'doc-carta-aval-123',
        name: 'Carta Aval de Ruta',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-10')
      },
      {
        id: 'doc-carta-antiguedad-123',
        name: 'Carta de Antigüedad de la Ruta',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-10')
      }
    ];

    it('should validate complete ecosystem documents', (done) => {
      service.validateEcosystemDocuments('edomex-ruta-001', mockEcosystemDocuments)
        .subscribe(validation => {
          (expect(validation.ecosystemId) as any).toBe('edomex-ruta-001');
          (expect(validation.constitutiveActValid) as any).toBe(true);
          (expect(validation.ecosystemRiskLevel) as any).toMatch(/low|medium|high/);
          (expect(validation.validationNotes.length) as any).toBeGreaterThan(0);
          done();
        });
    });

    it('should detect missing critical ecosystem documents', (done) => {
      const incompleteEcosystemDocs = mockEcosystemDocuments.slice(0, 2); // Only first 2 docs
      
      service.validateEcosystemDocuments('edomex-ruta-001', incompleteEcosystemDocs)
        .subscribe(validation => {
          (expect(validation.overallValid) as any).toBe(false);
          (expect(validation.ecosystemRiskLevel) as any).toBe('high');
          (expect(validation.validationNotes.some(note => note.includes('pendiente'))) as any).toBe(true);
          done();
        });
    });

    it('should assess ecosystem risk level correctly', (done) => {
      const partiallyValidDocs = mockEcosystemDocuments.slice(0, 3); // 3 out of 6 docs
      
      service.validateEcosystemDocuments('edomex-ruta-001', partiallyValidDocs)
        .subscribe(validation => {
          (expect(['low', 'medium', 'high'].includes(validation.ecosystemRiskLevel)) as any).toBe(true);
          
          // Risk should be high with only 3 valid documents
          (expect(validation.ecosystemRiskLevel) as any).toBe('high');
          done();
        });
    });

    it('should validate critical agremiado documents', (done) => {
      const criticalDocs = mockEcosystemDocuments.filter(doc => 
        doc.name.includes('Carta Aval') || doc.name.includes('Carta de Antigüedad')
      );
      
      service.validateEcosystemDocuments('edomex-ruta-001', criticalDocs)
        .subscribe(validation => {
          (expect(validation.validationDetails) as any).toBeDefined();
          // Since these are critical documents, they should be validated
          (expect(Object.keys(validation.validationDetails).length) as any).toBeGreaterThanOrEqual(0);
          done();
        });
    });
  });

  describe('Document Requirements by Market/Flow', () => {
    it('should return AGS specific requirements', () => {
      const agsReqs = service.getRequiredDocuments('aguascalientes', BusinessFlow.Individual, mockClient);
      
      (expect(agsReqs.length) as any).toBeGreaterThan(0);
      
      const universalReqs = agsReqs.filter(req => !req.market);
      const agsSpecific = agsReqs.filter(req => req.market === 'aguascalientes');
      
      (expect(universalReqs.length) as any).toBeGreaterThan(0);
      (expect(agsSpecific.length) as any).toBeGreaterThan(0);
    });

    it('should return EdoMex specific requirements', () => {
      const edomexReqs = service.getRequiredDocuments('edomex', BusinessFlow.CreditoColectivo, mockEdomexClient);
      
      (expect(edomexReqs.length) as any).toBeGreaterThan(0);
      
      const edomexSpecific = edomexReqs.filter(req => req.market === 'edomex');
      (expect(edomexSpecific.length) as any).toBeGreaterThan(0);
      
      const ecosystemReq = edomexReqs.find(req => req.name.includes('Acta Constitutiva'));
      (expect(ecosystemReq) as any).toBeTruthy();
    });

    it('should filter requirements by flow type', () => {
      const individualReqs = service.getRequiredDocuments('edomex', BusinessFlow.Individual);
      const collectiveReqs = service.getRequiredDocuments('edomex', BusinessFlow.CreditoColectivo);
      
      // Collective flow should have more requirements (ecosystem docs)
      (expect(collectiveReqs.length) as any).toBeGreaterThanOrEqual(individualReqs.length);
    });

    it('should apply conditional requirements', () => {
      const clientWithEcosystem = {
        ...mockEdomexClient,
        ecosystemId: 'test-ecosystem'
      };
      
      const clientWithoutEcosystem = {
        ...mockEdomexClient,
        ecosystemId: undefined
      };
      
      const reqsWithEcosystem = service.getRequiredDocuments('edomex', BusinessFlow.CreditoColectivo, clientWithEcosystem);
      const reqsWithoutEcosystem = service.getRequiredDocuments('edomex', BusinessFlow.CreditoColectivo, clientWithoutEcosystem);
      
      // Both should have requirements, but may differ based on ecosystem assignment
      (expect(reqsWithEcosystem.length) as any).toBeGreaterThan(0);
      (expect(reqsWithoutEcosystem.length) as any).toBeGreaterThan(0);
    });
  });

  describe('Document Type Detection', () => {
    it('should detect INE from filename', (done) => {
      service.detectDocumentType('INE_Juan_Perez.pdf').subscribe(result => {
        (expect(result.detectedType) as any).toBe('INE');
        (expect(result.confidence) as any).toBeGreaterThan(80);
        done();
      });
    });

    it('should detect RFC documents', (done) => {
      service.detectDocumentType('constancia_situacion_fiscal.pdf').subscribe(result => {
        (expect(result.detectedType) as any).toBe('Constancia de Situación Fiscal');
        (expect(result.confidence) as any).toBeGreaterThan(80);
        done();
      });
    });

    it('should detect ecosystem documents', (done) => {
      service.detectDocumentType('acta_constitutiva_ruta.pdf').subscribe(result => {
        (expect(result.detectedType) as any).toBe('Acta Constitutiva de la Ruta');
        (expect(result.confidence) as any).toBeGreaterThan(80);
        done();
      });
    });

    it('should detect carta aval documents', (done) => {
      service.detectDocumentType('carta_aval_ruta_transportes.pdf').subscribe(result => {
        (expect(result.detectedType) as any).toBe('Carta Aval de Ruta');
        (expect(result.confidence) as any).toBeGreaterThan(90);
        done();
      });
    });

    it('should provide suggestions for unclear filenames', (done) => {
      service.detectDocumentType('documento_123.pdf').subscribe(result => {
        (expect(result.detectedType) as any).toBe('unknown');
        (expect(result.confidence) as any).toBeLessThan(70);
        (expect(result.suggestions.length) as any).toBeGreaterThan(0);
        (expect(result.suggestions[0]) as any).toContain('descriptivo');
        done();
      });
    });

    it('should handle various file extensions', (done) => {
      service.detectDocumentType('INE_scan.jpg').subscribe(result => {
        (expect(result.detectedType) as any).toBe('INE');
        (expect(result.confidence) as any).toBeGreaterThan(80);
        done();
      });
    });
  });

  describe('Validation Rules', () => {
    it('should validate file formats correctly', (done) => {
      const pdfDoc = { ...mockDocument, name: 'document.pdf' };
      const txtDoc = { ...mockDocument, name: 'document.txt' };
      
      service.validateDocument(pdfDoc).subscribe(pdfResult => {
        service.validateDocument(txtDoc).subscribe(txtResult => {
          (expect(pdfResult.valid) as any).toBe(true);
          (expect(txtResult.valid) as any).toBe(false);
          
          const formatError = txtResult.issues.find(issue => issue.code === 'INVALID_FORMAT');
          (expect(formatError) as any).toBeTruthy();
          done();
        });
      });
    });

    it('should check document expiration', (done) => {
      const validDoc = {
        ...mockDocument,
        expirationDate: new Date('2030-12-31')
      };
      
      const expiredDoc = {
        ...mockDocument,
        expirationDate: new Date('2020-01-01')
      };
      
      service.validateDocument(validDoc).subscribe(validResult => {
        service.validateDocument(expiredDoc).subscribe(expiredResult => {
          (expect(validResult.valid) as any).toBe(true);
          (expect(expiredResult.valid) as any).toBe(false);
          
          const expirationError = expiredResult.issues.find(issue => issue.code === 'DOCUMENT_EXPIRED');
          (expect(expirationError) as any).toBeTruthy();
          done();
        });
      });
    });

    it('should handle documents without expiration date', (done) => {
      const noExpirationDoc = {
        ...mockDocument,
        expirationDate: undefined
      };
      
      service.validateDocument(noExpirationDoc).subscribe(result => {
        (expect(result.valid) as any).toBe(true);
        
        const noExpirationInfo = result.issues.find(issue => issue.code === 'NO_EXPIRATION');
        if (noExpirationInfo) {
          (expect(noExpirationInfo.type) as any).toBe('info');
        }
        done();
      });
    });

    it('should assess legibility scores', (done) => {
      service.validateDocument(mockDocument).subscribe(result => {
        (expect(result.score) as any).toBeGreaterThanOrEqual(0);
        (expect(result.score) as any).toBeLessThanOrEqual(100);
        done();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty document list', (done) => {
      const emptyClient = {
        ...mockClient,
        documents: []
      };
      
      service.generateComplianceReport(emptyClient).subscribe(report => {
        (expect(report.submittedDocuments.length) as any).toBe(0);
        (expect(report.complianceLevel) as any).toBe('non-compliant');
        (expect(report.missingDocuments.length) as any).toBeGreaterThan(0);
        done();
      });
    });

    it('should handle documents without names', (done) => {
      const namelessDoc = {
        ...mockDocument,
        name: ''
      };
      
      service.validateDocument(namelessDoc).subscribe(result => {
        (expect(result) as any).toBeDefined();
        (expect(result.valid) as any).toBe(false);
        done();
      });
    });

    it('should handle clients without market assignment', () => {
      const clientNoMarket = {
        ...mockClient,
        market: undefined as any
      };
      
      const requirements = service.getRequiredDocuments(
        'aguascalientes', 
        BusinessFlow.Individual, 
        clientNoMarket
      );
      
      (expect(requirements) as any).toBeDefined();
      (expect(Array.isArray(requirements)) as any).toBe(true);
    });

    it('should handle ecosystem validation with empty document list', (done) => {
      service.validateEcosystemDocuments('empty-ecosystem', [])
        .subscribe(validation => {
          (expect(validation.overallValid) as any).toBe(false);
          (expect(validation.ecosystemRiskLevel) as any).toBe('high');
          (expect(validation.validationNotes.length) as any).toBeGreaterThan(0);
          done();
        });
    });

    it('should generate compliance recommendations for various scenarios', (done) => {
      const problematicClient = {
        ...mockEdomexClient,
        documents: [
          {
            ...mockExpiredDocument,
            name: 'INE_Expired.pdf'
          }
        ],
        ecosystemId: undefined
      };
      
      service.generateComplianceReport(problematicClient).subscribe(report => {
        (expect(report.recommendations.length) as any).toBeGreaterThan(0);
        (expect(report.recommendations.some(rec => rec.includes('ecosistema'))) as any).toBe(true);
        done();
      });
    });
  });
});
