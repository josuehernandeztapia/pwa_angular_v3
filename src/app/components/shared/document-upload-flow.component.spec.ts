import { DocumentUploadFlowComponent } from './document-upload-flow.component';
import { FormBuilder } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { BusinessFlow } from '../../models/types';
import { MarketPolicyContext, TandaPolicyMetadata } from '../../services/market-policy.service';

const noop = () => {};

function createComponent(overrides: {
  policyContext?: MarketPolicyContext;
  policyMetadata?: { tanda?: TandaPolicyMetadata };
  flowContext?: any;
} = {}) {
  const routerStub = { parseUrl: (url: string) => url } as any;
  const docReqStub = { getDocumentRequirements: () => of([]) } as any;
  const docValidationStub = {} as any;
  const voiceValidationStub = {} as any;
  const aviConfigStub = {} as any;
  const ocrStub = { terminateWorker: noop } as any;
  const errorBoundaryStub = { issues$: new Subject(), captureError: noop, captureWarning: noop } as any;
  const marketPolicyStub = {
    getPolicyMetadata: () => ({ ocrThreshold: 0.8 }),
    getIncomeThreshold: () => undefined,
  } as any;
  const offlineStub = {
    online$: of(true),
    pendingRequests$: of([]),
    processedRequests$: of(null),
  } as any;
  const analyticsStub = { track: jasmine.createSpy('track') } as any;
  const aviBackendStub = {} as any;
  const documentUploadStub = {} as any;
  const tandaValidationStub = {
    state$: of(null),
    current: null,
    validate: () => Promise.resolve(null),
  } as any;
  const toastStub = { warning: noop, info: noop, success: noop } as any;

  const component = new DocumentUploadFlowComponent(
    new FormBuilder(),
    routerStub,
    docReqStub,
    docValidationStub,
    voiceValidationStub,
    aviConfigStub,
    ocrStub,
    errorBoundaryStub,
    marketPolicyStub,
    offlineStub,
    analyticsStub,
    aviBackendStub,
    documentUploadStub,
    tandaValidationStub,
    toastStub,
    undefined
  );

  component.flowContext = overrides.flowContext ?? {
    market: 'edomex',
    clientType: 'colectivo',
    businessFlow: BusinessFlow.CreditoColectivo,
    saleType: 'financiero',
    quotationData: {},
    simulatorData: {},
  } as any;

  if (overrides.policyContext) {
    (component as any).policyContext = overrides.policyContext;
    component.flowContext.policyContext = { ...overrides.policyContext };
  }

  if (overrides.policyMetadata) {
    (component as any).policyMetadata = overrides.policyMetadata;
  }

  return component;
}

describe('DocumentUploadFlowComponent – policy context integration', () => {
  it('determineIncomeProofRequirement returns false when monthly payment is below threshold', () => {
    const policyContext: MarketPolicyContext = {
      market: 'edomex',
      clientType: 'colectivo',
      saleType: 'financiero',
      businessFlow: BusinessFlow.CreditoColectivo,
      incomeThreshold: 9000,
      requiresIncomeProof: false,
    };

    const component = createComponent({ policyContext });
    component.flowContext.monthlyPayment = 8000;
    component.flowContext.quotationData.monthlyPayment = 8000;

    const requires = (component as any).determineIncomeProofRequirement(policyContext);

    expect(requires).toBeFalse();
    expect(component.flowContext.requiresIncomeProof).toBeFalse();
  });

  it('determineIncomeProofRequirement returns true when monthly payment exceeds threshold', () => {
    const policyContext: MarketPolicyContext = {
      market: 'edomex',
      clientType: 'colectivo',
      saleType: 'financiero',
      businessFlow: BusinessFlow.CreditoColectivo,
      incomeThreshold: 6000,
      requiresIncomeProof: false,
    };

    const component = createComponent({ policyContext });
    component.flowContext.monthlyPayment = 9500;
    component.flowContext.quotationData.monthlyPayment = 9500;

    const requires = (component as any).determineIncomeProofRequirement(policyContext);

    expect(requires).toBeTrue();
    expect(component.flowContext.requiresIncomeProof).toBeTrue();
  });

  it('normalizeCollectiveSize respects tanda limits from metadata', () => {
    const policyContext: MarketPolicyContext = {
      market: 'edomex',
      clientType: 'colectivo',
      saleType: 'financiero',
      businessFlow: BusinessFlow.CreditoColectivo,
      collectiveSize: 25,
      metadata: {
        tanda: {
          minMembers: 5,
          maxMembers: 18,
          minContribution: 500,
          maxContribution: 2000,
          minRounds: 6,
          maxRounds: 18,
        }
      }
    };

    const component = createComponent({ policyContext });
    component.flowContext.collectiveMembers = 25;

    const normalized = (component as any).determineCollectiveSize(policyContext);

    expect(normalized).toBe(18);
  });
});
