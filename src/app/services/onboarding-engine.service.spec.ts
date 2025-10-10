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

  it('creates collective members with colectivo policy documents', (done) => {
    const docsFixture = [
      { id: 'doc-consent', name: 'Consentimiento', status: DocumentStatus.Pendiente },
      { id: 'doc-ine-1', name: 'INE Integrante 1', status: DocumentStatus.Pendiente, group: 'member' },
      { id: 'doc-ine-2', name: 'INE Integrante 2', status: DocumentStatus.Pendiente, group: 'member' },
      { id: 'doc-rfc-1', name: 'RFC Integrante 1', status: DocumentStatus.Pendiente, group: 'member' },
      { id: 'doc-rfc-2', name: 'RFC Integrante 2', status: DocumentStatus.Pendiente, group: 'member' }
    ] as any;

    docReqsSpy.getDocumentRequirements.and.returnValue(of(docsFixture));
    clientDataSpy.addClient.and.callFake((member: Client) => of(member));

    service.createCollectiveCreditMembers({
      groupName: 'Ruta Centro',
      memberNames: ['Ana', 'Beatriz'],
      market: 'edomex',
      ecosystemId: 'eco-1'
    }).subscribe(members => {
      expect(docReqsSpy.getDocumentRequirements).toHaveBeenCalled();
      const lastCallArgs = docReqsSpy.getDocumentRequirements.calls.mostRecent().args[0];
      expect(lastCallArgs.clientType).toBe('colectivo');
      expect(lastCallArgs.collectiveSize).toBe(2);

      expect(members.length).toBe(2);
      expect(members[0].documents.some(doc => doc.id === 'doc-ine-1')).toBeTrue();
      expect(members[0].documents.some(doc => doc.id === 'doc-ine-2')).toBeFalse();
      expect(members[1].documents.some(doc => doc.id === 'doc-ine-2')).toBeTrue();
      done();
    });
  });
});
