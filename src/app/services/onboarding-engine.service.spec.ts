import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Client, DocumentStatus } from '../models/types';
import { ClientDataService } from './data/client-data.service';
import { DocumentRequirementsService } from './document-requirements.service';
import { OnboardingEngineService } from './onboarding-engine.service';

describe('OnboardingEngineService', () => {
  let service: OnboardingEngineService;
  let docReqsSpy: jasmine.SpyObj<DocumentRequirementsService>;
  let clientDataSpy: jasmine.SpyObj<ClientDataService>;

  const baseClient: Client = {
    id: 'client-1',
    name: 'Test User',
    flow: 'Venta a Plazo' as any,
    status: 'Nuevas Oportunidades',
    documents: [
      { id: '1', name: 'INE Vigente', status: DocumentStatus.Pendiente },
      { id: '2', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
      { id: '3', name: 'Verificación Biométrica (Metamap)', status: DocumentStatus.Pendiente },
    ],
    events: [],
  };

  beforeEach(() => {
    docReqsSpy = jasmine.createSpyObj('DocumentRequirementsService', [
      'getDocumentRequirements',
      'getDocumentCompletionStatus',
      'validateKycPrerequisites'
    ]);
    clientDataSpy = jasmine.createSpyObj('ClientDataService', [
      'addClient', 'getClientById', 'updateClient'
    ]);

    TestBed.configureTestingModule({
      providers: [
        OnboardingEngineService,
        { provide: DocumentRequirementsService, useValue: docReqsSpy },
        { provide: ClientDataService, useValue: clientDataSpy }
      ]
    });

    service = TestBed.inject(OnboardingEngineService);
  });

  it('should call updateClient with id and updated object on document submission', (done) => {
    const client = { ...baseClient };
    clientDataSpy.getClientById.and.returnValue(of(client));
    clientDataSpy.updateClient.and.returnValue(of({ ...client } as any));

    service.submitDocument(client.id, '1' /* INE */).subscribe(() => {
      expect(clientDataSpy.updateClient).toHaveBeenCalled();
      const [calledId, calledUpdate] = clientDataSpy.updateClient.calls.mostRecent().args;
      expect(calledId).toBe(client.id);
      expect(calledUpdate).toBeTruthy();
      done();
    });
  });

  it('should call updateClient with id and updated object on reviewDocument', (done) => {
    const client = { ...baseClient };
    clientDataSpy.getClientById.and.returnValue(of(client));
    clientDataSpy.updateClient.and.returnValue(of({ ...client } as any));

    service.reviewDocument(client.id, '1', true).subscribe(() => {
      expect(clientDataSpy.updateClient).toHaveBeenCalled();
      const [calledId, calledUpdate] = clientDataSpy.updateClient.calls.mostRecent().args;
      expect(calledId).toBe(client.id);
      expect(calledUpdate).toBeTruthy();
      done();
    });
  });
});

