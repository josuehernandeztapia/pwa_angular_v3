import { TandaValidGuard } from './tanda-valid.guard';
import { BusinessFlow, DocumentStatus } from '../models/types';
import { MarketPolicyContext, MarketPolicyService } from '../services/market-policy.service';

interface StoredContext {
  flowContext?: any;
  policyContext?: MarketPolicyContext;
  documents?: any[];
}

describe('TandaValidGuard', () => {
  it('uses policyContext metadata to validate collective members without fallback heuristics', () => {
    const storedContext: StoredContext = {
      policyContext: {
        market: 'edomex',
        clientType: 'colectivo',
        saleType: 'financiero',
        businessFlow: BusinessFlow.CreditoColectivo,
        collectiveSize: 5,
        metadata: {
          tanda: {
            minMembers: 5,
            maxMembers: 18,
            minContribution: 500,
            maxContribution: 1500,
            minRounds: 6,
            maxRounds: 18,
          },
        },
      },
      flowContext: {
        collectiveMembers: 25,
      },
      documents: [
        { id: 'doc-consent', status: DocumentStatus.Aprobado },
        ...Array.from({ length: 5 }, (_, index) => ({ id: `doc-ine-${index + 1}`, status: DocumentStatus.Aprobado })),
        ...Array.from({ length: 5 }, (_, index) => ({ id: `doc-rfc-${index + 1}`, status: DocumentStatus.Aprobado })),
      ],
    };

    const tandaState = {
      validationId: 'validation-1',
      config: { members: 5, contribution: 1000, rounds: 12 },
      status: 'success',
      schedule: [{}],
      lastRosterUploadId: 'roster-1',
    };

    const flowContextStub = {
      getContextData: jasmine.createSpy('getContextData').and.callFake((key: string) => {
        if (key === 'documentos') {
          return storedContext;
        }
        if (key === 'tanda') {
          return tandaState;
        }
        return null;
      }),
    } as any;

    const marketPolicyStub = {
      getTandaRules: jasmine.createSpy('getTandaRules').and.returnValue(null),
    } as unknown as MarketPolicyService;

    const toastStub = { warning: () => {} } as any;

    const guard = new TandaValidGuard(flowContextStub, marketPolicyStub, toastStub);

    const result = guard.canActivate({} as any, { url: '/test' } as any);

    expect(result).toBeTrue();
    expect(marketPolicyStub.getTandaRules).not.toHaveBeenCalled();
  });
});
