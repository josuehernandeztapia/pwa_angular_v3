import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { MetaMapService } from './metamap.service';
import { DataService } from './data.service';
import { Client, DocumentStatus } from '../models/types';
import { environment } from '../../environments/environment';

// removed by clean-audit
declare global {
  interface Window {
    Mati?: any;
  }
}

describe('MetaMapService', () => {
  let service: MetaMapService;
  let mockDataService: jasmine.SpyObj<DataService>;
  
  const mockClient: Client = {
    id: 'client-test-123',
    name: 'Juan Carlos Pérez',
    flow: 'Venta a Plazo' as any,
    email: 'juan.carlos@example.com',
    phone: '+525512345678',
    status: 'Activo' as any,
    healthScore: 75,
    documents: [
      {
        id: 'doc-ine-123',
        name: 'INE Vigente',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-15'),
        reviewedAt: new Date('2024-01-16')
      },
      {
        id: 'doc-comprobante-123',
        name: 'Comprobante de domicilio',
        status: DocumentStatus.Aprobado,
        uploadedAt: new Date('2024-01-15'),
        reviewedAt: new Date('2024-01-16')
      },
      {
        id: 'doc-kyc-123',
        name: 'Verificación Biométrica KYC',
        status: DocumentStatus.Pendiente,
        uploadedAt: new Date('2024-01-15')
      }
    ],
    events: [
      {
        id: 'event-1',
        timestamp: new Date('2024-01-15'),
        message: 'Cliente registrado',
        actor: 'Sistema' as any,
        type: 'CLIENT_REGISTERED' as any
      }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16')
  };

  beforeEach(() => {
    const dataSpy = jasmine.createSpyObj('DataService', ['getClientById', 'updateClient']);
    
    // Install spies BEFORE service instantiation to catch deferred init
    spyOn(document, 'createElement').and.callThrough();
    spyOn(document, 'querySelector').and.returnValue(null);
// removed by clean-audit

    // Configure environment for MetaMap test IDs
    (environment as any).services = {
      ...(environment as any).services,
      metamap: {
        ...(environment as any).services?.metamap,
        clientId: '689833b7d4e7dd0ca48216fb',
        flowId: '689833b7d4e7dd00d08216fa',
        baseUrl: 'https://api.metamap.com'
      }
    };

    TestBed.configureTestingModule({
      providers: [
        MetaMapService,
        { provide: DataService, useValue: dataSpy }
      ]
    });
    
    service = TestBed.inject(MetaMapService);
    mockDataService = TestBed.inject(DataService) as jasmine.SpyObj<DataService>;
  });

  afterEach(() => {
    // Clean up any created DOM elements
    const metamapButtons = document.querySelectorAll('metamap-button');
    metamapButtons.forEach(button => button.remove());
    
    const scripts = document.querySelectorAll('script[src*="getmati.com"]');
    scripts.forEach(script => script.remove());
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize MetaMap SDK on creation', () => {
      expect(document.createElement).toHaveBeenCalledWith('script');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('should not reload SDK if already present', () => {
      // Reset spy counts
      (document.createElement as jasmine.Spy).calls.reset();
      (document.head.appendChild as jasmine.Spy).calls.reset();
      
// removed by clean-audit
      (document.querySelector as jasmine.Spy).and.returnValue({} as any);
      
      // Create new service instance
      const newService = new (MetaMapService as any)(mockDataService);
      
      expect(document.createElement).not.toHaveBeenCalled();
      expect(document.head.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('KYC Button Creation', () => {
    beforeEach(() => {
      // Create test container
      const container = document.createElement('div');
      container.id = 'test-container';
      document.body.appendChild(container);
    });

    afterEach(() => {
      const container = document.getElementById('test-container');
      if (container) {
        container.remove();
      }
    });

    it('should create MetaMap button successfully', (done) => {
      service.createKycButton('test-container', mockClient).subscribe(button => {
        expect(button).toBeTruthy();
        expect(button!.clientid).toBe('689833b7d4e7dd0ca48216fb');
        expect(button!.flowid).toBe('689833b7d4e7dd00d08216fa');
        
        const metadata = JSON.parse(button!.metadata || '{}');
        expect(metadata.clientId).toBe(mockClient.id);
        expect(metadata.clientName).toBe(mockClient.name);
        
        done();
      });
    });

    it('should handle container not found error', (done) => {
      service.createKycButton('non-existent-container', mockClient).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toContain('Container with ID non-existent-container not found');
          done();
        }
      });
    });

    it('should emit KYC success event', (done) => {
      let buttonElement: HTMLElement;
      
      service.createKycButton('test-container', mockClient).subscribe(button => {
        buttonElement = button as HTMLElement;
        
        // Listen to service events
        service.kycSuccess$.subscribe(event => {
          expect(event.clientId).toBe(mockClient.id);
          expect(event.verificationData.verificationId).toBe('test-verification-123');
          done();
        });
        
        // Simulate MetaMap success event
        const successEvent = new CustomEvent('metamap:verificationSuccess', {
          detail: {
            verificationId: 'test-verification-123',
            score: 95,
            status: 'verified'
          }
        });
        
        buttonElement.dispatchEvent(successEvent);
      });
    });

    it('should emit KYC exit event', (done) => {
      let buttonElement: HTMLElement;
      
      service.createKycButton('test-container', mockClient).subscribe(button => {
        buttonElement = button as HTMLElement;
        
        // Listen to service events
        service.kycExit$.subscribe(event => {
          expect(event.clientId).toBe(mockClient.id);
          expect(event.reason).toBe('User cancelled verification');
          done();
        });
        
        // Simulate MetaMap exit event
        const exitEvent = new CustomEvent('metamap:userFinished', {
          detail: {
            reason: 'User cancelled verification'
          }
        });
        
        buttonElement.dispatchEvent(exitEvent);
      });
    });

    it('should call optional callback functions', (done) => {
      const onSuccessSpy = jasmine.createSpy('onSuccess');
      const onExitSpy = jasmine.createSpy('onExit');
      
      service.createKycButton('test-container', mockClient, onSuccessSpy, onExitSpy).subscribe(button => {
        const buttonElement = button as HTMLElement;
        
        // Simulate success event
        const successEvent = new CustomEvent('metamap:verificationSuccess', {
          detail: { verificationId: 'test-123' }
        });
        buttonElement.dispatchEvent(successEvent);
        
        // Simulate exit event
        const exitEvent = new CustomEvent('metamap:userFinished', {
          detail: { reason: 'cancelled' }
        });
        buttonElement.dispatchEvent(exitEvent);
        
        setTimeout(() => {
          expect(onSuccessSpy).toHaveBeenCalledWith({ verificationId: 'test-123' });
          expect(onExitSpy).toHaveBeenCalledWith('cancelled');
          done();
        }, 100);
      });
    });

    it('should cleanup event listeners on unsubscribe', (done) => {
      const subscription = service.createKycButton('test-container', mockClient).subscribe(button => {
        const buttonElement = button as HTMLElement;
        
        // Spy on removeEventListener
        spyOn(buttonElement, 'removeEventListener').and.callThrough();
        
        // Unsubscribe should trigger cleanup
        subscription.unsubscribe();
        
        expect(buttonElement.removeEventListener).toHaveBeenCalledWith(
          'metamap:verificationSuccess', 
          jasmine.any(Function)
        );
        expect(buttonElement.removeEventListener).toHaveBeenCalledWith(
          'metamap:userFinished', 
          jasmine.any(Function)
        );
        
        done();
      });
    });
  });

  describe('KYC Completion', () => {
    it('should complete KYC successfully', (done) => {
      const verificationData = {
        verificationId: 'metamap-123',
        score: 92,
        status: 'verified'
      };
      
      mockDataService.getClientById.and.returnValue(of(mockClient));
      mockDataService.updateClient.and.returnValue(of(mockClient));
      
      service.completeKyc(mockClient.id, verificationData).subscribe(updatedClient => {
        expect(updatedClient.documents[2].status).toBe(DocumentStatus.Aprobado);
        expect((updatedClient.documents[2] as any).verificationId).toBe('metamap-123');
        expect((updatedClient.documents[2] as any).verificationScore).toBe(92);
        expect(updatedClient.healthScore).toBe(90); // 75 + 15
        expect(updatedClient.events.length).toBe(2); // Original + KYC completion event
        expect(updatedClient.events[1].message).toContain('Verificación biométrica completada');
        done();
      });
    });

    it('should handle client not found error', (done) => {
      mockDataService.getClientById.and.returnValue(of(null));
      
      service.completeKyc('non-existent-client', {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBe('Client not found');
          done();
        }
      });
    });

    it('should cap health score at 100', (done) => {
      const highScoreClient = {
        ...mockClient,
        healthScore: 95 // Already high score
      };
      
      mockDataService.getClientById.and.returnValue(of(highScoreClient));
      mockDataService.updateClient.and.returnValue(of(highScoreClient));
      
      service.completeKyc(mockClient.id, {}).subscribe(updatedClient => {
        expect(updatedClient.healthScore).toBe(100); // Should be capped at 100
        done();
      });
    });

    it('should handle database update errors', (done) => {
      mockDataService.getClientById.and.returnValue(of(mockClient));
      mockDataService.updateClient.and.returnValue(throwError('Database error'));
      
      service.completeKyc(mockClient.id, {}).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBe('Database error');
          done();
        }
      });
    });
  });

  describe('KYC Prerequisites Validation', () => {
    it('should validate prerequisites for ready client', () => {
      const result = service.validateKycPrerequisites(mockClient);
      
      expect(result.canStartKyc).toBe(true);
      expect(result.isKycComplete).toBe(false);
      expect(result.missingDocs).toEqual([]);
      expect(result.tooltipMessage).toBe('Listo para iniciar verificación biométrica.');
    });

    it('should detect missing INE document', () => {
      const clientWithoutINE = {
        ...mockClient,
        documents: mockClient.documents.map(doc => 
          doc.name === 'INE Vigente' 
            ? { ...doc, status: DocumentStatus.Pendiente }
            : doc
        )
      };
      
      const result = service.validateKycPrerequisites(clientWithoutINE);
      
      expect(result.canStartKyc).toBe(false);
      expect(result.missingDocs).toContain('INE Vigente');
      expect(result.tooltipMessage).toBe('Se requiere aprobar INE y Comprobante de Domicilio para iniciar KYC.');
    });

    it('should detect missing comprobante de domicilio', () => {
      const clientWithoutComprobante = {
        ...mockClient,
        documents: mockClient.documents.map(doc => 
          doc.name === 'Comprobante de domicilio'
            ? { ...doc, status: DocumentStatus.Rechazado }
            : doc
        )
      };
      
      const result = service.validateKycPrerequisites(clientWithoutComprobante);
      
      expect(result.canStartKyc).toBe(false);
      expect(result.missingDocs).toContain('Comprobante de domicilio');
    });

    it('should detect already completed KYC', () => {
      const clientWithCompletedKYC = {
        ...mockClient,
        documents: mockClient.documents.map(doc => 
          doc.name.includes('Verificación Biométrica')
            ? { ...doc, status: DocumentStatus.Aprobado }
            : doc
        )
      };
      
      const result = service.validateKycPrerequisites(clientWithCompletedKYC);
      
      expect(result.canStartKyc).toBe(false);
      expect(result.isKycComplete).toBe(true);
      expect(result.tooltipMessage).toBe('El KYC ya ha sido aprobado.');
    });

    it('should detect multiple missing documents', () => {
      const clientWithMissingDocs = {
        ...mockClient,
        documents: mockClient.documents.map(doc => ({
          ...doc,
          status: DocumentStatus.Pendiente
        }))
      };
      
      const result = service.validateKycPrerequisites(clientWithMissingDocs);
      
      expect(result.canStartKyc).toBe(false);
      expect(result.missingDocs).toEqual(['INE Vigente', 'Comprobante de domicilio']);
    });
  });

  describe('KYC Status Reporting', () => {
    it('should report ready status', () => {
      const status = service.getKycStatus(mockClient);
      
      expect(status.status).toBe('ready');
      expect(status.statusMessage).toBe('Listo para verificación biométrica');
      expect(status.canRetry).toBe(false);
    });

    it('should report completed status', () => {
      const completedClient = {
        ...mockClient,
        documents: mockClient.documents.map(doc => 
          doc.name.includes('Verificación Biométrica')
            ? { 
                ...doc, 
                status: DocumentStatus.Aprobado,
                completedAt: new Date('2024-02-01'),
                verificationId: 'verified-123'
              }
            : doc
        )
      };
      
      const status = service.getKycStatus(completedClient);
      
      expect(status.status).toBe('completed');
      expect(status.statusMessage).toBe('Verificación biométrica completada');
      expect(status.canRetry).toBe(false);
      expect(status.verificationId).toBe('verified-123');
      expect(status.completedAt).toEqual(new Date('2024-02-01'));
    });

    it('should report failed status with retry option', () => {
      const failedClient = {
        ...mockClient,
        documents: mockClient.documents.map(doc => 
          doc.name.includes('Verificación Biométrica')
            ? { ...doc, status: DocumentStatus.Rechazado }
            : doc
        )
      };
      
      const status = service.getKycStatus(failedClient);
      
      expect(status.status).toBe('failed');
      expect(status.statusMessage).toBe('Verificación biométrica falló');
      expect(status.canRetry).toBe(true);
    });

    it('should report in_progress status', () => {
      const inProgressClient = {
        ...mockClient,
        documents: mockClient.documents.map(doc => 
          doc.name.includes('Verificación Biométrica')
            ? { ...doc, status: DocumentStatus.EnRevision }
            : doc
        )
      };
      
      const status = service.getKycStatus(inProgressClient);
      
      expect(status.status).toBe('in_progress');
      expect(status.statusMessage).toBe('Verificación en proceso');
      expect(status.canRetry).toBe(false);
    });

    it('should report prerequisites_missing status', () => {
      const incompleteClient = {
        ...mockClient,
        documents: mockClient.documents.map(doc => 
          doc.name === 'INE Vigente'
            ? { ...doc, status: DocumentStatus.Pendiente }
            : doc
        )
      };
      
      const status = service.getKycStatus(incompleteClient);
      
      expect(status.status).toBe('prerequisites_missing');
      expect(status.statusMessage).toContain('Se requiere aprobar INE');
    });

    it('should report not_started for client without KYC document', () => {
      const clientWithoutKYC = {
        ...mockClient,
        documents: mockClient.documents.filter(doc => !doc.name.includes('Verificación Biométrica'))
      };
      
      const status = service.getKycStatus(clientWithoutKYC);
      
      expect(status.status).toBe('not_started');
      expect(status.statusMessage).toBe('KYC no configurado para este cliente');
      expect(status.canRetry).toBe(false);
    });
  });

  describe('KYC Failure Simulation', () => {
    it('should simulate KYC failure', (done) => {
      const failureReason = 'Document quality too low';
      
      mockDataService.getClientById.and.returnValue(of(mockClient));
      mockDataService.updateClient.and.returnValue(of(mockClient));
      
      service.simulateKycFailure(mockClient.id, failureReason).subscribe(updatedClient => {
        const kycDoc = updatedClient.documents.find(doc => doc.name.includes('Verificación Biométrica'));
        
        expect(kycDoc!.status).toBe(DocumentStatus.Rechazado);
        expect((kycDoc as any).reviewNotes).toBe(failureReason);
        expect((kycDoc as any).reviewedAt).toBeDefined();
        
        const failureEvent = updatedClient.events.find(event => event.message.includes('Verificación biométrica falló'));
        expect(failureEvent).toBeTruthy();
        expect(failureEvent!.message).toContain(failureReason);
        expect(failureEvent!.actor).toBe('Sistema');
        
        done();
      });
    });

    it('should use default failure reason', (done) => {
      mockDataService.getClientById.and.returnValue(of(mockClient));
      mockDataService.updateClient.and.returnValue(of(mockClient));
      
      service.simulateKycFailure(mockClient.id).subscribe(updatedClient => {
        const kycDoc = updatedClient.documents.find(doc => doc.name.includes('Verificación Biométrica'));
        expect((kycDoc as any).reviewNotes).toBe('Identity verification failed');
        done();
      });
    });

    it('should handle client not found in failure simulation', (done) => {
      mockDataService.getClientById.and.returnValue(of(null));
      
      service.simulateKycFailure('non-existent-client').subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error).toBe('Client not found');
          done();
        }
      });
    });
  });

  describe('SDK Availability Check', () => {
    beforeEach(() => {
      // Reset window object
      delete (window as any).Mati;
      
// removed by clean-audit
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'complete'
      });
    });

    it('should detect SDK availability when Mati object exists', (done) => {
      (window as any).Mati = { version: '1.0.0' };
      
      service.checkSDKAvailability().subscribe(available => {
        expect(available).toBe(true);
        done();
      });
    });

    it('should detect SDK availability when metamap-button exists', async () => {
// removed by clean-audit
      const mockButton = document.createElement('div');
      mockButton.setAttribute('data-tag', 'METAMAP-BUTTON');
      (document.querySelector as jasmine.Spy).and.returnValue(mockButton);

      const result = await new Promise<boolean>(resolve => {
        service.checkSDKAvailability().subscribe(resolve);
      });

      expect(result).toBeTrue();
    });

    it('should report SDK as unavailable when neither exists', (done) => {
      service.checkSDKAvailability().subscribe(available => {
        expect(available).toBe(false);
        done();
      });
    });

    it('should handle server-side rendering (no window object)', (done) => {
      if (typeof window !== 'undefined') {
        pending('SSR not applicable in browser-based Karma environment');
        done();
        return;
      }
      service.checkSDKAvailability().subscribe(available => {
        expect(available).toBe(false);
        done();
      });
    });

    it('should wait for page load when document not ready', (done) => {
      Object.defineProperty(document, 'readyState', {
        writable: true,
        value: 'loading'
      });
      
      (window as any).Mati = { version: '1.0.0' };
      
      let loadCallback: (ev: any) => void;
      spyOn(window, 'addEventListener').and.callFake(((event: any, callback: any) => {
        if (event === 'load') {
          loadCallback = callback;
        }
      }) as any);
      
      service.checkSDKAvailability().subscribe(available => {
        expect(available).toBe(true);
        done();
      });
      
      // Simulate page load
      setTimeout(() => {
        if (loadCallback) {
          loadCallback(new Event('load'));
        }
      }, 50);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle exit event without reason', (done) => {
      const container = document.createElement('div');
      container.id = 'test-container-2';
      document.body.appendChild(container);
      
      service.createKycButton('test-container-2', mockClient).subscribe(button => {
        service.kycExit$.subscribe(event => {
          expect(event.reason).toBe('User cancelled');
          container.remove();
          done();
        });
        
        // Simulate exit event without detail.reason
        const exitEvent = new CustomEvent('metamap:userFinished', {
          detail: {}
        });
        
        (button as HTMLElement).dispatchEvent(exitEvent);
      });
    });

    it('should handle client without KYC document in completion', (done) => {
      const clientWithoutKYC = {
        ...mockClient,
        documents: mockClient.documents.filter(doc => !doc.name.includes('Verificación Biométrica'))
      };
      
      mockDataService.getClientById.and.returnValue(of(clientWithoutKYC));
      mockDataService.updateClient.and.returnValue(of(clientWithoutKYC));
      
      service.completeKyc(mockClient.id, {}).subscribe(updatedClient => {
        // Should still complete without KYC document (creates event but no document update)
        expect(updatedClient.events.length).toBe(2);
        expect(updatedClient.healthScore).toBe(90);
        done();
      });
    });

    it('should handle empty verification data', (done) => {
      mockDataService.getClientById.and.returnValue(of(mockClient));
      mockDataService.updateClient.and.returnValue(of(mockClient));
      
      service.completeKyc(mockClient.id).subscribe(updatedClient => {
        const kycDoc = updatedClient.documents.find(doc => doc.name.includes('Verificación Biométrica'));
        expect(kycDoc!.status).toBe(DocumentStatus.Aprobado);
        expect((kycDoc as any).verificationId).toBeUndefined();
        expect((kycDoc as any).verificationScore).toBeUndefined();
        done();
      });
    });

    it('should handle button creation with existing button in container', (done) => {
      const container = document.createElement('div');
      container.id = 'test-container-existing';
      
      // Add existing button
      const existingButton = document.createElement('div');
      container.appendChild(existingButton);
      
      document.body.appendChild(container);
      
      service.createKycButton('test-container-existing', mockClient).subscribe(button => {
        expect(button).toBeTruthy();
        expect(container.children.length).toBe(2); // existing + new button
        container.remove();
        done();
      });
    });
  });
});
// removed by clean-audit