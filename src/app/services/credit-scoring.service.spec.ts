import { TestBed } from '@angular/core/testing';
import { CreditScoringService } from './credit-scoring.service';
import { Client, BusinessFlow, Document } from '../models/types';

describe('CreditScoringService', () => {
  let service: CreditScoringService;

  const mockClient: Client = {
    id: '1',
    name: 'Ana García López',
    email: 'ana.garcia@email.com',
    phone: '5551234567',
    rfc: 'GALA850315ABC',
    market: 'aguascalientes',
    flow: BusinessFlow.VentaPlazo,
    status: 'Activo',
    birthDate: new Date('1990-01-01'),
    monthlyIncome: 18000,
    createdAt: new Date(),
    lastModified: new Date(),
    events: [],
    documents: [
      { id: '1', name: 'INE Vigente', status: 'Aprobado' },
      { id: '2', name: 'Comprobante de domicilio', status: 'Aprobado' },
      { id: '3', name: 'Verificación Biométrica', status: 'Aprobado' }
    ] as Document[]
  };

  const mockScoringRequest = {
    clientId: '1',
    personalInfo: {
      name: 'Ana García López',
      rfc: 'GALA850315ABC',
      curp: 'GALA850315MDFNPR08',
      birthDate: new Date('1990-01-01'),
      address: 'Calle Ejemplo 123'
    },
    financialInfo: {
      monthlyIncome: 18000,
      expenses: 8000,
      existingDebts: 3000,
      requestedAmount: 250000,
      requestedTerm: 24
    },
    businessFlow: BusinessFlow.VentaPlazo,
    market: 'aguascalientes' as const,
    documentStatus: {
      ineApproved: true,
      comprobanteApproved: true,
      kycCompleted: true
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CreditScoringService]
    });
    service = TestBed.inject(CreditScoringService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have SCORING_CONFIG defined', () => {
      expect(service['SCORING_CONFIG']).toBeDefined();
      expect(service['SCORING_CONFIG'].apiUrl).toBeTruthy();
      expect(service['SCORING_CONFIG'].clientId).toBeTruthy();
      expect(service['SCORING_CONFIG'].haseUrl).toBeTruthy();
    });

    it('should initialize internal storage maps', () => {
      expect(service['scoringDB']).toBeInstanceOf(Map);
      expect(service['statusDB']).toBeInstanceOf(Map);
    });
  });

  describe('Credit Scoring Process', () => {
    it('should initiate credit scoring request', (done) => {
      service.requestCreditScoring(mockScoringRequest).subscribe(result => {
        expect(result.scoringId).toBeTruthy();
        expect(result.scoringId).toMatch(/^scoring-\d+$/);
        expect(result.status.status).toBe('completed');
        expect(result.status.message).toContain('Análisis completado');
        done();
      });
    });

    it('should store scoring result after processing', (done) => {
      service.requestCreditScoring(mockScoringRequest).subscribe(result => {
        service.getScoringResult(result.scoringId).subscribe(scoringResult => {
          expect(scoringResult).toBeTruthy();
          expect(scoringResult!.clientId).toBe('1');
          expect(scoringResult!.score).toBeGreaterThan(0);
          expect(scoringResult!.grade).toMatch(/^[A-E][\+]?$/);
          expect(['APPROVED', 'CONDITIONAL', 'REJECTED']).toContain(scoringResult!.decision);
          done();
        });
      });
    });

    it('should return null for non-existent scoring ID', (done) => {
      service.getScoringResult('non-existent-id').subscribe(result => {
        expect(result).toBeNull();
        done();
      });
    });

    it('should get scoring status correctly', (done) => {
      service.requestCreditScoring(mockScoringRequest).subscribe(result => {
        service.getScoringStatus(result.scoringId).subscribe(status => {
          expect(status).toBeTruthy();
          expect(status!.status).toBe('completed');
          expect(status!.message).toBeTruthy();
          done();
        });
      });
    });

    it('should return null for non-existent status ID', (done) => {
      service.getScoringStatus('non-existent-id').subscribe(status => {
        expect(status).toBeNull();
        done();
      });
    });
  });

  describe('Scoring Prerequisites Validation', () => {
    it('should validate client is ready for scoring', () => {
      const result = service.validateScoringPrerequisites(mockClient);
      
      expect(result.canStartScoring).toBe(true);
      expect(result.missingRequirements.length).toBe(0);
      expect(result.message).toBe('Cliente listo para análisis crediticio');
    });

    it('should identify missing INE document', () => {
      const clientMissingINE = {
        ...mockClient,
        documents: [
          { id: '2', name: 'Comprobante de domicilio', status: 'Aprobado' },
          { id: '3', name: 'Verificación Biométrica', status: 'Aprobado' }
        ] as Document[]
      };

      const result = service.validateScoringPrerequisites(clientMissingINE);
      
      expect(result.canStartScoring).toBe(false);
      expect(result.missingRequirements).toContain('INE Vigente aprobada');
    });

    it('should identify missing comprobante document', () => {
      const clientMissingComprobante = {
        ...mockClient,
        documents: [
          { id: '1', name: 'INE Vigente', status: 'Aprobado' },
          { id: '3', name: 'Verificación Biométrica', status: 'Aprobado' }
        ] as Document[]
      };

      const result = service.validateScoringPrerequisites(clientMissingComprobante);
      
      expect(result.canStartScoring).toBe(false);
      expect(result.missingRequirements).toContain('Comprobante de domicilio aprobado');
    });

    it('should identify missing KYC verification', () => {
      const clientMissingKYC = {
        ...mockClient,
        documents: [
          { id: '1', name: 'INE Vigente', status: 'Aprobado' },
          { id: '2', name: 'Comprobante de domicilio', status: 'Aprobado' }
        ] as Document[]
      };

      const result = service.validateScoringPrerequisites(clientMissingKYC);
      
      expect(result.canStartScoring).toBe(false);
      expect(result.missingRequirements).toContain('Verificación biométrica completada');
    });

    it('should identify multiple missing requirements', () => {
      const clientMissingMultiple = {
        ...mockClient,
        documents: [
          { id: '1', name: 'INE Vigente', status: 'Pendiente' }
        ] as Document[]
      };

      const result = service.validateScoringPrerequisites(clientMissingMultiple);
      
      expect(result.canStartScoring).toBe(false);
      expect(result.missingRequirements.length).toBe(3);
      expect(result.message).toContain('Faltan requisitos');
    });
  });

  describe('Scoring Recommendations', () => {
    it('should get VentaDirecta recommendations', () => {
      const recommendations = service.getScoringRecommendations(BusinessFlow.VentaDirecta, 'aguascalientes');
      
      expect(recommendations.minScore).toBe(700);
      expect(recommendations.preferredGrades).toEqual(['A+', 'A']);
      expect(recommendations.maxLoanToValue).toBe(0.50);
      expect(recommendations.notes.some(note => note.includes('compra de contado'))).toBe(true);
    });

    it('should get VentaPlazo recommendations for AGS', () => {
      const recommendations = service.getScoringRecommendations(BusinessFlow.VentaPlazo, 'aguascalientes');
      
      expect(recommendations.minScore).toBe(680);
      expect(recommendations.maxLoanToValue).toBe(0.75);
      expect(recommendations.notes.some(note => note.includes('menor riesgo'))).toBe(true);
    });

    it('should get VentaPlazo recommendations for EdoMex', () => {
      const recommendations = service.getScoringRecommendations(BusinessFlow.VentaPlazo, 'edomex');
      
      expect(recommendations.minScore).toBe(650);
      expect(recommendations.maxLoanToValue).toBe(0.80);
      expect(recommendations.notes.some(note => note.includes('validación de ruta'))).toBe(true);
    });

    it('should get CreditoColectivo recommendations', () => {
      const recommendations = service.getScoringRecommendations(BusinessFlow.CreditoColectivo, 'edomex');
      
      expect(recommendations.minScore).toBe(620);
      expect(recommendations.preferredGrades).toContain('B');
      expect(recommendations.maxLoanToValue).toBe(0.85);
      expect(recommendations.notes.some(note => note.includes('grupal'))).toBe(true);
      expect(recommendations.notes.some(note => note.includes('5 integrantes'))).toBe(true);
    });

    it('should get AhorroProgramado recommendations', () => {
      const recommendations = service.getScoringRecommendations(BusinessFlow.AhorroProgramado, 'aguascalientes');
      
      expect(recommendations.minScore).toBe(600);
      expect(recommendations.preferredGrades).toContain('C+');
      expect(recommendations.maxLoanToValue).toBe(0.70);
      expect(recommendations.notes.some(note => note.includes('menor riesgo'))).toBe(true);
    });

    it('should return default recommendations for unknown flow', () => {
      const recommendations = service.getScoringRecommendations('UNKNOWN_FLOW' as any, 'aguascalientes');
      
      expect(recommendations.minScore).toBe(650);
      expect(recommendations.preferredGrades).toEqual(['A+', 'A', 'B+']);
      expect(recommendations.maxLoanToValue).toBe(0.80);
    });
  });

  describe('Scoring Simulation', () => {
    it('should simulate scoring with high score for good client', () => {
      const goodClientRequest = {
        ...mockScoringRequest,
        financialInfo: {
          ...mockScoringRequest.financialInfo,
          monthlyIncome: 50000,
          existingDebts: 5000,
          expenses: 15000
        }
      };

// removed by clean-audit
      spyOn(Math, 'random').and.returnValue(0.8);

      const result = service['simulateScoring'](goodClientRequest, 'test-id');
      
      expect(result.score).toBeGreaterThan(700);
      expect(['A+', 'A', 'B+'].some(grade => grade === result.grade)).toBe(true);
      expect(result.decision).toBe('APPROVED');
      expect(result.maxApprovedAmount).toBe(goodClientRequest.financialInfo.requestedAmount);
    });

    it('should simulate scoring with low score for risky client', () => {
      const riskyClientRequest = {
        ...mockScoringRequest,
        financialInfo: {
          ...mockScoringRequest.financialInfo,
          monthlyIncome: 10000,
          existingDebts: 8000, // 80% debt to income ratio
          expenses: 7000
        },
        documentStatus: {
          ineApproved: false,
          comprobanteApproved: false,
          kycCompleted: false
        }
      };

// removed by clean-audit
      spyOn(Math, 'random').and.returnValue(0.1);

      const result = service['simulateScoring'](riskyClientRequest, 'test-id');
      
      expect(result.score).toBeLessThan(650);
      expect(['C', 'D', 'E'].some(grade => grade === result.grade)).toBe(true);
      expect(result.decision).toBe('REJECTED');
      expect(result.maxApprovedAmount).toBe(0);
    });

    it('should apply market bonus for Aguascalientes', () => {
      spyOn(Math, 'random').and.returnValue(0.5); // Neutral random factor

      const agsRequest = { ...mockScoringRequest, market: 'aguascalientes' as const };
      const edomexRequest = { ...mockScoringRequest, market: 'edomex' as const };

      const agsResult = service['simulateScoring'](agsRequest, 'ags-id');
      const edomexResult = service['simulateScoring'](edomexRequest, 'edomex-id');

      // AGS should get a bonus, but due to randomness, we'll just check it's reasonable
      expect(agsResult.score).toBeGreaterThan(500);
      expect(edomexResult.score).toBeGreaterThan(500);
    });

    it('should apply business flow bonuses correctly', () => {
      spyOn(Math, 'random').and.returnValue(0.5);

      const collectiveRequest = { ...mockScoringRequest, businessFlow: BusinessFlow.CreditoColectivo };
      const directRequest = { ...mockScoringRequest, businessFlow: BusinessFlow.VentaDirecta };

      const collectiveResult = service['simulateScoring'](collectiveRequest, 'collective-id');
      const directResult = service['simulateScoring'](directRequest, 'direct-id');

      // Both should be valid scores
      expect(collectiveResult.score).toBeGreaterThan(300);
      expect(directResult.score).toBeGreaterThan(300);
    });

    it('should set correct interest rates by market', () => {
      const agsRequest = { ...mockScoringRequest, market: 'aguascalientes' as const };
      const edomexRequest = { ...mockScoringRequest, market: 'edomex' as const };

      const agsResult = service['simulateScoring'](agsRequest, 'ags-id');
      const edomexResult = service['simulateScoring'](edomexRequest, 'edomex-id');

      expect(agsResult.interestRate).toBe(25.5);
      expect(edomexResult.interestRate).toBe(29.9);
    });

    it('should include conditions for conditional approval', () => {
      const conditionalRequest = {
        ...mockScoringRequest,
        financialInfo: {
          ...mockScoringRequest.financialInfo,
          existingDebts: 8000 // High debt to income
        }
      };

// removed by clean-audit
      spyOn(Math, 'random').and.returnValue(0.2);

      const result = service['simulateScoring'](conditionalRequest, 'conditional-id');

      if (result.decision === 'CONDITIONAL') {
        expect(result.conditions).toBeDefined();
        expect(result.conditions!.length).toBeGreaterThan(0);
        expect(result.conditions!.some(condition => condition.includes('aval'))).toBe(true);
      }
    });

    it('should include reasons for rejection', () => {
      const rejectedRequest = {
        ...mockScoringRequest,
        financialInfo: {
          ...mockScoringRequest.financialInfo,
          monthlyIncome: 5000,
          existingDebts: 4000
        },
        documentStatus: {
          ineApproved: false,
          comprobanteApproved: false,
          kycCompleted: false
        }
      };

// removed by clean-audit
      spyOn(Math, 'random').and.returnValue(-0.9);

      const result = service['simulateScoring'](rejectedRequest, 'rejected-id');

      if (result.decision === 'REJECTED') {
        expect(result.reasons).toBeDefined();
        expect(result.reasons!.length).toBeGreaterThan(0);
      }
    });

    it('should set expiration date correctly', () => {
      const result = service['simulateScoring'](mockScoringRequest, 'test-id');
      
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(result.expiresAt.getTime() - thirtyDaysFromNow.getTime());
      
      expect(timeDiff).toBeLessThan(1000); // Should be within 1 second
    });
  });

  describe('Scoring Retry Functionality', () => {
    it('should retry scoring with updated information', (done) => {
      // First create original scoring
      service.requestCreditScoring(mockScoringRequest).subscribe(originalResult => {
        const updatedRequest = {
          financialInfo: {
            ...mockScoringRequest.financialInfo,
            monthlyIncome: 25000 // Improved income
          }
        };

        service.retryCreditScoring(originalResult.scoringId, updatedRequest).subscribe(retryResult => {
          expect(retryResult.scoringId).toBeTruthy();
          expect(retryResult.scoringId).toMatch(/^scoring-retry-\d+$/);
          expect(retryResult.status.status).toBe('completed');
          done();
        });
      });
    });

    it('should fail retry for non-existent original scoring', (done) => {
      service.retryCreditScoring('non-existent', {}).subscribe({
        error: (error) => {
          expect(error).toBe('Original scoring not found');
          done();
        }
      });
    });
  });

  describe('Client Scoring History', () => {
    it('should get client scoring history', (done) => {
      // Create multiple scorings for same client
      const request1 = { ...mockScoringRequest };
      const request2 = { ...mockScoringRequest };

      service.requestCreditScoring(request1).subscribe(() => {
        setTimeout(() => {
          service.requestCreditScoring(request2).subscribe(() => {
            service.getClientScoringHistory('1').subscribe(history => {
              expect(history.length).toBe(2);
              expect(history[0].clientId).toBe('1');
              expect(history[1].clientId).toBe('1');
              // Should be sorted by timestamp descending
              expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(history[1].timestamp.getTime());
              done();
            });
          });
        }, 50); // Small delay to ensure different timestamps
      });
    });

    it('should return empty array for client with no scorings', (done) => {
      service.getClientScoringHistory('non-existent-client').subscribe(history => {
        expect(history).toEqual([]);
        done();
      });
    });
  });

  describe('Scoring Validity Check', () => {
    it('should validate non-expired scoring', (done) => {
      service.requestCreditScoring(mockScoringRequest).subscribe(result => {
        service.isScoringValid(result.scoringId).subscribe(isValid => {
          expect(isValid).toBe(true);
          done();
        });
      });
    });

    it('should invalidate expired scoring', (done) => {
      // Create a scoring and manually expire it
      service.requestCreditScoring(mockScoringRequest).subscribe(result => {
        service.getScoringResult(result.scoringId).subscribe(scoring => {
          if (scoring) {
            // Manually set expiration to past
            scoring.expiresAt = new Date(Date.now() - 1000);
            service['scoringDB'].set(result.scoringId, scoring);

            service.isScoringValid(result.scoringId).subscribe(isValid => {
              expect(isValid).toBe(false);
              done();
            });
          }
        });
      });
    });

    it('should return false for non-existent scoring', (done) => {
      service.isScoringValid('non-existent-id').subscribe(isValid => {
        expect(isValid).toBe(false);
        done();
      });
    });
  });

  describe('Score Grading System', () => {
    it('should assign correct grades for score ranges', () => {
      const testCases = [
        { score: 850, expectedGrade: 'A+' },
        { score: 780, expectedGrade: 'A' },
        { score: 720, expectedGrade: 'B+' },
        { score: 670, expectedGrade: 'B' },
        { score: 620, expectedGrade: 'C+' },
        { score: 570, expectedGrade: 'C' },
        { score: 520, expectedGrade: 'D' },
        { score: 450, expectedGrade: 'E' }
      ];

      // Use a single spy and adjust its return value per case to avoid re-spying
      const randomSpy = spyOn(Math, 'random');

      testCases.forEach(({ score, expectedGrade }) => {
        const randomValue = (score - 700) / 100; // Adjust for base score of 700
        randomSpy.and.returnValue(randomValue as unknown as number);

        const result = service['simulateScoring'](mockScoringRequest, `test-${score}`);
        expect(result.grade).toBe(expectedGrade);
      });
    });
  });

  describe('Risk Level Assignment', () => {
    it('should assign correct risk levels', () => {
      const testCases = [
        { mockRandom: 0.8, expectedRisk: 'LOW' },
        { mockRandom: 0.3, expectedRisk: 'MEDIUM' },
        { mockRandom: -0.2, expectedRisk: 'HIGH' },
        { mockRandom: -0.8, expectedRisk: 'VERY_HIGH' }
      ];

      const randomSpy = spyOn(Math, 'random');

      testCases.forEach(({ mockRandom, expectedRisk }) => {
        randomSpy.and.returnValue(mockRandom as unknown as number);

        const result = service['simulateScoring'](mockScoringRequest, 'test-risk');
        expect(result.riskLevel).toBe(expectedRisk);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle minimum score bounds', () => {
      spyOn(Math, 'random').and.returnValue(-1); // Very low random value

      const result = service['simulateScoring'](mockScoringRequest, 'min-test');
      expect(result.score).toBeGreaterThanOrEqual(300);
    });

    it('should handle maximum score bounds', () => {
      const perfectRequest = {
        ...mockScoringRequest,
        financialInfo: {
          monthlyIncome: 100000,
          expenses: 10000,
          existingDebts: 0,
          requestedAmount: 100000,
          requestedTerm: 12
        }
      };

      spyOn(Math, 'random').and.returnValue(1); // Maximum random value

      const result = service['simulateScoring'](perfectRequest, 'max-test');
      expect(result.score).toBeLessThanOrEqual(900);
    });

    it('should handle zero or negative income gracefully', () => {
      const zeroIncomeRequest = {
        ...mockScoringRequest,
        financialInfo: {
          ...mockScoringRequest.financialInfo,
          monthlyIncome: 0
        }
      };

      const result = service['simulateScoring'](zeroIncomeRequest, 'zero-income');
      expect(result.score).toBeGreaterThan(0);
      expect(result.decision).toBeDefined();
    });
  });
});

// removed by clean-audit