import { TestBed } from '@angular/core/testing';
import { DocumentRequirementsService } from './document-requirements.service';
import { MarketPolicyService, MarketPolicyContext, MarketPolicyResult } from './market-policy.service';
import { DocumentStatus } from '../models/types';

describe('DocumentRequirementsService', () => {
  let service: DocumentRequirementsService;
  let marketPolicy: jasmine.SpyObj<MarketPolicyService>;

  beforeEach(() => {
    marketPolicy = jasmine.createSpyObj<MarketPolicyService>('MarketPolicyService', [
      'getPolicyDocuments',
      'toDocuments',
    ]);

    const policyResult: MarketPolicyResult = {
      documents: [
        { id: 'doc-ine', label: 'INE', tooltip: 'Identificación oficial' },
        { id: 'doc-proof', label: 'Comprobante de domicilio' },
      ],
      metadata: {
        ocrThreshold: 0.9,
      },
    };

    marketPolicy.getPolicyDocuments.and.returnValue(policyResult);
    marketPolicy.toDocuments.and.returnValue([
      { id: 'doc-ine', name: 'INE', status: DocumentStatus.Pendiente },
      { id: 'doc-proof', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
    ]);

    TestBed.configureTestingModule({
      providers: [
        DocumentRequirementsService,
        { provide: MarketPolicyService, useValue: marketPolicy },
      ],
    });

    service = TestBed.inject(DocumentRequirementsService);
  });

  it('delegates document lookup to MarketPolicyService', (done) => {
    const context = {
      market: 'aguascalientes' as const,
      saleType: 'financiero' as const,
      clientType: 'individual' as const,
    };

    service.getDocumentRequirements(context).subscribe(docs => {
      expect(marketPolicy.getPolicyDocuments).toHaveBeenCalledWith(jasmine.objectContaining<MarketPolicyContext>({
        market: context.market,
        saleType: context.saleType,
        clientType: context.clientType,
      }));
      expect(docs.length).toBe(2);
      expect(docs[0]).toEqual(jasmine.objectContaining({ id: 'doc-ine', status: DocumentStatus.Pendiente }));
      done();
    });
  });
});
