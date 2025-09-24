import { TestBed } from '@angular/core/testing';
import { BusinessRulesService, ValidationRule, ValidationResult, EcosystemValidation, MarketRequirements } from './business-rules.service';
import { Client, BusinessFlow, Document } from '../models/types';

describe('BusinessRulesService', () => {
  let service: BusinessRulesService;

  const mockAgsClient: Client = {
    id: '1',
    name: 'Juan Pérez Aguascalientes',
    email: 'juan.ags@email.com',
    phone: '4499123456',
    rfc: 'PEJA900101ABC',
    market: 'aguascalientes',
    flow: BusinessFlow.VentaPlazo,
    status: 'Activo',
    birthDate: new Date('1990-01-01'),
    monthlyIncome: 18000,
    createdAt: new Date(),
    lastModified: new Date(),
    events: [],
    documents: [
      { id: '1', name: 'INE', status: 'Aprobado' },
      { id: '2', name: 'Comprobante de Domicilio', status: 'Aprobado' },
      { id: '3', name: 'Constancia de Situación Fiscal', status: 'Aprobado' },
      { id: '4', name: 'Copia Concesión', status: 'Aprobado' },
      { id: '5', name: 'Tarjeta de Circulación', status: 'Aprobado' }
    ] as Document[],
    paymentPlan: {
      downPaymentPercentage: 0.60,
      monthlyPayment: 8500,
      term: 24,
      interestRate: 0.255
    }
  };

  const mockEdomexClient: Client = {
    id: '2',
    name: 'María López Estado de México',
    email: 'maria.edomex@email.com',
    phone: '5519876543',
    rfc: 'LOPM850315DEF',
    market: 'edomex',
    flow: BusinessFlow.CreditoColectivo,
    status: 'Activo',
    birthDate: new Date('1985-03-15'),
    monthlyIncome: 25000,
    ecosystemId: 'eco-ruta-norte',
    groupId: 'cc-grupo-01',
    createdAt: new Date(),
    lastModified: new Date(),
    events: [],
    documents: [
      { id: '1', name: 'INE', status: 'Aprobado' },
      { id: '2', name: 'Comprobante de Domicilio', status: 'Aprobado' },
      { id: '3', name: 'Constancia Situación Fiscal', status: 'Aprobado' },
      { id: '4', name: 'Acta Constitutiva de la Ruta', status: 'Aprobado' },
      { id: '5', name: 'Poderes', status: 'Aprobado' },
      { id: '6', name: 'INE Representante Legal', status: 'Aprobado' },
      { id: '7', name: 'Carta Aval de Ruta', status: 'Aprobado' },
      { id: '8', name: 'Carta de Antigüedad', status: 'Aprobado' }
    ] as Document[],
    paymentPlan: {
      downPaymentPercentage: 0.18,
      monthlyPayment: 6500,
      term: 48,
      interestRate: 0.20
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BusinessRulesService]
    });
    service = TestBed.inject(BusinessRulesService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      (expect(service) as any).toBeTruthy();
    });

    it('should initialize validation rules', () => {
      (expect(service['validationRules']) as any).toBeDefined();
      (expect(service['validationRules'].length) as any).toBeGreaterThan(0);
    });

    it('should have AGS specific rules', () => {
      const agsRules = service['validationRules'].filter(rule => rule.market === 'aguascalientes');
      (expect(agsRules.length) as any).toBeGreaterThan(0);
      (expect(agsRules.some(rule => rule.id === 'ags-basic-docs')) as any).toBe(true);
      (expect(agsRules.some(rule => rule.id === 'ags-plazo-requirements')) as any).toBe(true);
    });

    it('should have EdoMex specific rules', () => {
      const edomexRules = service['validationRules'].filter(rule => rule.market === 'edomex');
      (expect(edomexRules.length) as any).toBeGreaterThan(0);
      (expect(edomexRules.some(rule => rule.id === 'edomex-ecosystem')) as any).toBe(true);
      (expect(edomexRules.some(rule => rule.id === 'edomex-colectivo-group')) as any).toBe(true);
    });

    it('should have universal rules', () => {
      const universalRules = service['validationRules'].filter(rule => rule.type === 'mandatory');
      (expect(universalRules.length) as any).toBeGreaterThan(0);
      (expect(universalRules.some(rule => rule.id === 'age-validation')) as any).toBe(true);
      (expect(universalRules.some(rule => rule.id === 'income-validation')) as any).toBe(true);
    });
  });

  describe('Client Validation', () => {
    it('should validate AGS client successfully', (done) => {
      service.validateClient(mockAgsClient).subscribe(result => {
        (expect(result) as any).toBeDefined();
        (expect(result.valid) as any).toBe(true);
        (expect(result.errors.length) as any).toBe(0);
        done();
      });
    });

    it('should validate EdoMex client successfully', (done) => {
      service.validateClient(mockEdomexClient).subscribe(result => {
        (expect(result) as any).toBeDefined();
        (expect(result.valid) as any).toBe(true);
        (expect(result.errors.length) as any).toBe(0);
        done();
      });
    });

    it('should fail validation for client with missing documents', (done) => {
      const clientWithMissingDocs = {
        ...mockAgsClient,
        documents: [
          { id: '1', name: 'INE', status: 'Aprobado' }
        ] as Document[]
      };

      service.validateClient(clientWithMissingDocs).subscribe(result => {
        (expect(result.valid) as any).toBe(false);
        (expect(result.errors.length) as any).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes('Falta documento'))).toBe(true);
        done();
      });
    });

    it('should fail validation for underage client', (done) => {
      const underageClient = {
        ...mockAgsClient,
        birthDate: new Date('2010-01-01') // 14 years old
      };

      service.validateClient(underageClient).subscribe(result => {
        (expect(result.valid) as any).toBe(false);
        expect(result.errors.some(error => error.includes('mayor de edad'))).toBe(true);
        done();
      });
    });

    it('should fail validation for client over age limit', (done) => {
      const overageClient = {
        ...mockAgsClient,
        birthDate: new Date('1950-01-01') // 74 years old
      };

      service.validateClient(overageClient).subscribe(result => {
        (expect(result.valid) as any).toBe(false);
        expect(result.errors.some(error => error.includes('70 años'))).toBe(true);
        done();
      });
    });

    it('should fail validation for client without income', (done) => {
      const clientNoIncome = {
        ...mockAgsClient,
        monthlyIncome: undefined
      };

      service.validateClient(clientNoIncome).subscribe(result => {
        (expect(result.valid) as any).toBe(false);
        expect(result.errors.some(error => error.includes('Ingresos mensuales requeridos'))).toBe(true);
        done();
      });
    });

    it('should filter rules by market correctly', (done) => {
      const agsClient = { ...mockAgsClient };
      
      service.validateClient(agsClient).subscribe(result => {
        // Should not have EdoMex specific errors
        expect(result.errors.some(error => error.includes('ecosistema'))).toBe(false);
        expect(result.errors.some(error => error.includes('Acta Constitutiva'))).toBe(false);
        done();
      });
    });

    it('should filter rules by business flow correctly', (done) => {
      const ahorroClient = {
        ...mockAgsClient,
        flow: BusinessFlow.AhorroProgramado
      };

      service.validateClient(ahorroClient).subscribe(result => {
        // Should not apply credit-specific validations for savings flow
        (expect(result.valid) as any).toBe(true);
        done();
      });
    });
  });

  describe('AGS Specific Validations', () => {
    it('should validate AGS down payment requirement (60%)', () => {
      const clientLowDownPayment = {
        ...mockAgsClient,
        paymentPlan: { ...mockAgsClient.paymentPlan!, downPaymentPercentage: 0.40 }
      };

      const result = service['validateAgsPlazoRequirements'](clientLowDownPayment);
      (expect(result.valid) as any).toBe(false);
      expect(result.errors.some(error => error.includes('60%'))).toBe(true);
    });

    it('should validate AGS term requirements (12 or 24 months)', () => {
      const clientInvalidTerm = {
        ...mockAgsClient,
        paymentPlan: { ...mockAgsClient.paymentPlan!, term: 36 }
      };

      const result = service['validateAgsPlazoRequirements'](clientInvalidTerm);
      (expect(result.valid) as any).toBe(false);
      expect(result.errors.some(error => error.includes('12 o 24 meses'))).toBe(true);
    });

    it('should validate AGS minimum income ($15,000)', () => {
      const clientLowIncome = {
        ...mockAgsClient,
        monthlyIncome: 12000
      };

      const result = service['validateAgsPlazoRequirements'](clientLowIncome);
      (expect(result.valid) as any).toBe(false);
      expect(result.errors.some(error => error.includes('$15,000'))).toBe(true);
    });

    it('should validate AGS required documents', () => {
      const result = service['validateAgsBasicDocs'](mockAgsClient);
      (expect(result.valid) as any).toBe(true);
    });
  });

  describe('EdoMex Specific Validations', () => {
    it('should require ecosystem assignment for EdoMex', () => {
      const clientNoEcosystem = {
        ...mockEdomexClient,
        ecosystemId: undefined
      };

      const result = service['validateEdomexEcosystem'](clientNoEcosystem);
      (expect(result.valid) as any).toBe(false);
      expect(result.errors.some(error => error.includes('ecosistema'))).toBe(true);
    });

    it('should validate EdoMex ecosystem documents', () => {
      const clientMissingDocs = {
        ...mockEdomexClient,
        documents: [
          { id: '1', name: 'INE', status: 'Aprobado' }
        ] as Document[]
      };

      const result = service['validateEdomexEcosystem'](clientMissingDocs);
      (expect(result.valid) as any).toBe(false);
      expect(result.errors.some(error => error.includes('Acta Constitutiva'))).toBe(true);
      expect(result.errors.some(error => error.includes('Carta Aval'))).toBe(true);
    });

    it('should validate collective group requirements', () => {
      const result = service['validateColectivoGroup'](mockEdomexClient);
      (expect(result.valid) as any).toBe(true);
    });

    it('should require group assignment for collective credit', () => {
      const clientNoGroup = {
        ...mockEdomexClient,
        groupId: undefined
      };

      const result = service['validateColectivoGroup'](clientNoGroup);
      (expect(result.valid) as any).toBe(false);
      expect(result.errors.some(error => error.includes('grupo colectivo'))).toBe(true);
    });

    it('should validate EdoMex payment capacity ($20,000 minimum)', () => {
      const clientLowIncome = {
        ...mockEdomexClient,
        flow: BusinessFlow.VentaPlazo,
        monthlyIncome: 15000
      };

      const result = service['validateEdomexPaymentCapacity'](clientLowIncome);
      (expect(result.valid) as any).toBe(false);
      expect(result.errors.some(error => error.includes('$20,000'))).toBe(true);
    });

    it('should warn about high payment-to-income ratio', () => {
      const clientHighRatio = {
        ...mockEdomexClient,
        flow: BusinessFlow.VentaPlazo,
        monthlyIncome: 15000,
        paymentPlan: { ...mockEdomexClient.paymentPlan!, monthlyPayment: 8000 }
      };

      const result = service['validateEdomexPaymentCapacity'](clientHighRatio);
      expect(result.warnings.some(warning => warning.includes('35%'))).toBe(true);
    });
  });

  describe('Ecosystem Validation', () => {
    it('should validate ecosystem for EdoMex client', (done) => {
      service.validateEcosystem(mockEdomexClient).subscribe(validation => {
        (expect(validation) as any).toBeDefined();
        (expect(validation.isValid) as any).toBe(true);
        (expect(validation.ecosystemId) as any).toBe('eco-ruta-norte');
        (expect(validation.validationStatus) as any).toBe('approved');
        done();
      });
    });

    it('should fail ecosystem validation for client without ecosystem', (done) => {
      const clientNoEcosystem = {
        ...mockEdomexClient,
        ecosystemId: undefined
      };

      service.validateEcosystem(clientNoEcosystem).subscribe(validation => {
        (expect(validation.isValid) as any).toBe(false);
        (expect(validation.validationStatus) as any).toBe('incomplete');
        expect(validation.validationNotes.some(note => note.includes('no asignado'))).toBe(true);
        done();
      });
    });

    it('should throw error for AGS client ecosystem validation', () => {
      expect(() => {
        service.validateEcosystem(mockAgsClient).subscribe();
      }).toThrowError('Validación de ecosistema solo aplica para Estado de México');
    });

    it('should identify missing ecosystem documents', (done) => {
      const clientMissingDocs = {
        ...mockEdomexClient,
        documents: [
          { id: '1', name: 'INE', status: 'Aprobado' }
        ] as Document[]
      };

      service.validateEcosystem(clientMissingDocs).subscribe(validation => {
        (expect(validation.isValid) as any).toBe(false);
        (expect(validation.missingDocuments.length) as any).toBeGreaterThan(0);
        (expect(validation.missingDocuments) as any).toContain('Acta Constitutiva del Ecosistema');
        done();
      });
    });
  });

  describe('Market Requirements', () => {
    it('should get Aguascalientes requirements', (done) => {
      service.getMarketRequirements('aguascalientes').subscribe(requirements => {
        (expect(requirements.market) as any).toBe('aguascalientes');
        (expect(requirements.minimumDownPaymentRange.min) as any).toBe(0.60);
        (expect(requirements.allowedTerms) as any).toEqual([12, 24]);
        (expect(requirements.supportsCreditoColectivo) as any).toBe(false);
        (expect(requirements.supportsAhorro) as any).toBe(true);
        (expect(requirements.specialRules.length) as any).toBeGreaterThan(0);
        done();
      });
    });

    it('should get Estado de México requirements', (done) => {
      service.getMarketRequirements('edomex').subscribe(requirements => {
        (expect(requirements.market) as any).toBe('edomex');
        (expect(requirements.minimumDownPaymentRange.min) as any).toBe(0.15);
        (expect(requirements.minimumDownPaymentRange.max) as any).toBe(0.25);
        (expect(requirements.allowedTerms) as any).toEqual([48, 60]);
        (expect(requirements.supportsCreditoColectivo) as any).toBe(true);
        (expect(requirements.supportsAhorro) as any).toBe(true);
        (expect(requirements.maxLoanAmount) as any).toBe(800000);
        done();
      });
    });

    it('should include required documents for each market', (done) => {
      service.getMarketRequirements('edomex').subscribe(requirements => {
        (expect(requirements.requiredDocuments) as any).toContain('Acta Constitutiva de la Ruta');
        (expect(requirements.requiredDocuments) as any).toContain('Carta Aval de Ruta');
        (expect(requirements.requiredDocuments.length) as any).toBeGreaterThan(10);
        done();
      });
    });
  });

  describe('Business Flow Change Validation', () => {
    it('should allow flow change when no documents are approved', (done) => {
      const clientNoDocs = {
        ...mockAgsClient,
        documents: [
          { id: '1', name: 'INE', status: 'Pendiente' }
        ] as Document[]
      };

      service.canChangeBusinessFlow(clientNoDocs, BusinessFlow.AhorroProgramado).subscribe(result => {
        (expect(result.allowed) as any).toBe(true);
        (expect(result.reasons.length) as any).toBe(0);
        done();
      });
    });

    it('should not allow flow change when documents are approved', (done) => {
      const clientWithApprovedDocs = {
        ...mockAgsClient,
        flow: BusinessFlow.VentaDirecta
      };

      service.canChangeBusinessFlow(clientWithApprovedDocs, BusinessFlow.VentaPlazo).subscribe(result => {
        (expect(result.allowed) as any).toBe(false);
        expect(result.reasons.some(reason => reason.includes('documentos ya aprobados'))).toBe(true);
        done();
      });
    });

    it('should not allow collective credit in Aguascalientes', (done) => {
      service.canChangeBusinessFlow(mockAgsClient, BusinessFlow.CreditoColectivo).subscribe(result => {
        (expect(result.allowed) as any).toBe(false);
        expect(result.reasons.some(reason => reason.includes('no disponible en Aguascalientes'))).toBe(true);
        done();
      });
    });

    it('should require ecosystem for EdoMex collective credit', (done) => {
      const clientNoEcosystem = {
        ...mockEdomexClient,
        ecosystemId: undefined,
        flow: BusinessFlow.VentaPlazo
      };

      service.canChangeBusinessFlow(clientNoEcosystem, BusinessFlow.CreditoColectivo).subscribe(result => {
        expect(result.requirements.some(req => req.includes('ecosistema'))).toBe(true);
        expect(result.requirements.some(req => req.includes('grupo de 5-8 miembros'))).toBe(true);
        done();
      });
    });
  });

  describe('Credit History Validation', () => {
    it('should validate credit history with simulated score', () => {
      spyOn(Math, 'random').and.returnValue(0.5); // Should give score of 750

      const result = service['validateCreditHistory'](mockAgsClient);
      (expect(result.valid) as any).toBe(true);
      (expect(result.nextSteps) as any).toContain('Historial crediticio aprobado');
    });

    it('should warn about low credit score', () => {
      spyOn(Math, 'random').and.returnValue(0); // Should give score of 650

      const result = service['validateCreditHistory'](mockAgsClient);
      (expect(result.valid) as any).toBe(true);
      expect(result.warnings.some(warning => warning.includes('regular'))).toBe(true);
    });

    it('should recommend special conditions for very low score', () => {
      spyOn(Math, 'random').and.returnValue(-0.5); // Should give score of 550

      const result = service['validateCreditHistory'](mockAgsClient);
      (expect(result.valid) as any).toBe(true);
      expect(result.warnings.some(warning => warning.includes('bajo'))).toBe(true);
      expect(result.recommendations.some(rec => rec.includes('aval'))).toBe(true);
    });
  });

  describe('Age Calculation', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-06-15');
      const age = service['calculateAge'](birthDate);
      
      // Age should be current year minus 1990, adjusted for month/day
      const expectedAge = new Date().getFullYear() - 1990;
      (expect(age) as any).toBeCloseTo(expectedAge, 1);
    });

    it('should handle birthday not yet reached this year', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() - 25);
      futureDate.setMonth(11); // December
      futureDate.setDate(31);  // December 31

      const age = service['calculateAge'](futureDate);
      (expect(age) as any).toBe(24); // Should be 24, not 25 if birthday hasn't occurred
    });
  });

  describe('Helper Methods', () => {
    it('should consolidate validation results correctly', () => {
      const results: ValidationResult[] = [
        {
          valid: true,
          errors: [],
          warnings: ['Warning 1'],
          recommendations: ['Rec 1'],
          nextSteps: ['Step 1']
        },
        {
          valid: false,
          errors: ['Error 1'],
          warnings: ['Warning 2'],
          recommendations: ['Rec 2'],
          nextSteps: ['Step 2']
        }
      ];

      const consolidated = service['consolidateValidationResults'](results);
      (expect(consolidated.valid) as any).toBe(false);
      (expect(consolidated.errors) as any).toEqual(['Error 1']);
      (expect(consolidated.warnings) as any).toEqual(['Warning 1', 'Warning 2']);
      (expect(consolidated.recommendations) as any).toEqual(['Rec 1', 'Rec 2']);
      (expect(consolidated.nextSteps) as any).toEqual(['Step 1', 'Step 2']);
    });

    it('should get ecosystem required documents', () => {
      const docs = service['getEcosystemRequiredDocuments']();
      (expect(docs.length) as any).toBeGreaterThan(0);
      (expect(docs) as any).toContain('Acta Constitutiva del Ecosistema');
      (expect(docs) as any).toContain('Padrón de Socios Actualizado');
    });

    it('should generate ecosystem validation notes', () => {
      const notes = service['getEcosystemValidationNotes'](mockEdomexClient);
      (expect(notes.length) as any).toBeGreaterThan(0);
      expect(notes.some(note => note.includes(mockEdomexClient.ecosystemId!))).toBe(true);
    });
  });

  describe('Collective Group Validation Details', () => {
    it('should validate minimum group size', () => {
      const result = service['validateColectivoGroup'](mockEdomexClient);
      // Since we're using a fixed size of 5, this should pass
      (expect(result.valid) as any).toBe(true);
    });

    it('should validate down payment range for collective credit', () => {
      const clientHighDownPayment = {
        ...mockEdomexClient,
        paymentPlan: { ...mockEdomexClient.paymentPlan!, downPaymentPercentage: 0.25 }
      };

      const result = service['validateColectivoGroup'](clientHighDownPayment);
      expect(result.warnings.some(warning => warning.includes('20%'))).toBe(true);
    });

    it('should validate down payment minimum for collective credit', () => {
      const clientLowDownPayment = {
        ...mockEdomexClient,
        paymentPlan: { ...mockEdomexClient.paymentPlan!, downPaymentPercentage: 0.10 }
      };

      const result = service['validateColectivoGroup'](clientLowDownPayment);
      (expect(result.valid) as any).toBe(false);
      expect(result.errors.some(error => error.includes('15%'))).toBe(true);
    });
  });

  describe('Market Requirements Special Rules', () => {
    it('should include AGS specific rules about credit types', (done) => {
      service.getMarketRequirements('aguascalientes').subscribe(requirements => {
        expect(requirements.specialRules.some(rule => rule.includes('NO crédito colectivo'))).toBe(true);
        expect(requirements.specialRules.some(rule => rule.includes('60% enganche fijo'))).toBe(true);
        done();
      });
    });

    it('should include EdoMex specific rules about ecosystem', (done) => {
      service.getMarketRequirements('edomex').subscribe(requirements => {
        expect(requirements.specialRules.some(rule => rule.includes('Ecosistema de ruta obligatorio'))).toBe(true);
        expect(requirements.specialRules.some(rule => rule.includes('Carta Aval de Ruta CRÍTICA'))).toBe(true);
        done();
      });
    });
  });

  describe('Ecosystem Validation Edge Cases', () => {
    it('should handle ecosystem validation with partial documents', (done) => {
      const clientPartialDocs = {
        ...mockEdomexClient,
        documents: [
          { id: '1', name: 'Acta Constitutiva de la Ruta', status: 'Pendiente' }
        ] as Document[]
      };

      service.validateEcosystem(clientPartialDocs).subscribe(validation => {
        (expect(validation.isValid) as any).toBe(false);
        (expect(validation.validationStatus) as any).toBe('pending');
        (expect(validation.hasCartaAvalRuta) as any).toBe(false);
        (expect(validation.hasCartaAntiguedadRuta) as any).toBe(false);
        done();
      });
    });

    it('should properly identify required vs optional documents', () => {
      const requiredDocs = service['getEcosystemRequiredDocuments']();
      (expect(requiredDocs) as any).toContain('Acta Constitutiva del Ecosistema');
      (expect(requiredDocs) as any).toContain('RFC del Ecosistema');
      (expect(requiredDocs) as any).toContain('Estado de Cuenta Bancario del Ecosistema');
    });
  });
});
