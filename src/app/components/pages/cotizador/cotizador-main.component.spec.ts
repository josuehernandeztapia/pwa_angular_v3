import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CotizadorMainComponent } from './cotizador-main.component';
import { buildComponentTestProviders } from '../../../../test-helpers/component-test-providers';
import { ToastService } from '../../../services/toast.service';
import { MarketPolicyService } from '../../../services/market-policy.service';
import { FlowContextService } from '../../../services/flow-context.service';
import { BusinessFlow } from '../../../models/types';

describe('CotizadorMainComponent – PMT and Amortization', () => {
  let component: CotizadorMainComponent;
  let fixture: ComponentFixture<CotizadorMainComponent>;
  let marketPolicyStub: jasmine.SpyObj<MarketPolicyService>;

  beforeEach(async () => {
    const providerSetup = buildComponentTestProviders();

    marketPolicyStub = jasmine.createSpyObj<MarketPolicyService>('MarketPolicyService', [
      'getAvailablePolicies',
      'getPolicyMetadata',
      'getIncomeThreshold',
    ]);
    marketPolicyStub.getAvailablePolicies.and.returnValue([
      { market: 'aguascalientes', clientType: 'individual' },
      { market: 'edomex', clientType: 'individual' },
      { market: 'edomex', clientType: 'colectivo' },
    ]);
    marketPolicyStub.getPolicyMetadata.and.returnValue({
      ocrThreshold: 0.85,
      tanda: {
        minMembers: 5,
        maxMembers: 15,
        minContribution: 500,
        maxContribution: 5000,
        minRounds: 12,
        maxRounds: 60,
      },
      income: {
        threshold: 0.4,
        documentId: 'doc-income'
      }
    });
    marketPolicyStub.getIncomeThreshold.and.returnValue(undefined);

    await TestBed.configureTestingModule({
      imports: [CotizadorMainComponent, HttpClientTestingModule],
      providers: [
        ...providerSetup.providers,
        { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {} } },
        { provide: MarketPolicyService, useValue: marketPolicyStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CotizadorMainComponent);
    component = fixture.componentInstance;

    // Minimal pkg to compute prices
    (component as any).pkg = {
      rate: 0.255, // 25.5% anual
      terms: [24, 36],
      minDownPaymentPercentage: 0.2,
      components: [
        { id: 'vehiculo', name: 'Unidad', price: 500000, isOptional: false, isMultipliedByTerm: false }
      ]
    };
    // Select defaults
    (component as any).selectedOptions = { vehiculo: true };
    (component as any).term = 24;
    (component as any).downPaymentPercentage = 20; // 20%
  });

  it('hydrates market options from policy service', () => {
    const policyFixture = TestBed.createComponent(CotizadorMainComponent);
    const instance = policyFixture.componentInstance;
    instance.ngOnInit();
    expect((instance as any).marketOptions.length).toBeGreaterThan(0);
    policyFixture.destroy();
  });

  it('persists policy metadata and normalized collective state into FlowContext', () => {
    const flowContext = {
      getContextData: jasmine.createSpy('getContextData').and.returnValue(null),
      saveContext: jasmine.createSpy('saveContext'),
    } as unknown as FlowContextService;

    const componentInstance = fixture.componentInstance;
    (componentInstance as any).flowContext = flowContext;

    (componentInstance as any).pkg = {
      rate: 0.25,
      terms: [12],
      minDownPaymentPercentage: 0.2,
      components: [
        { id: 'base', name: 'Base', price: 500000, isOptional: false },
      ],
    };
    (componentInstance as any).selectedOptions = { base: true };
    componentInstance.term = 12;
    componentInstance.downPaymentPercentage = 25;
    componentInstance.market = 'edomex';
    componentInstance.clientType = 'colectivo';
    componentInstance.tandaMembers = 3;

    const policyMetadata = {
      ocrThreshold: 0.85,
      tanda: {
        minMembers: 5,
        maxMembers: 12,
        minContribution: 500,
        maxContribution: 5000,
        minRounds: 12,
        maxRounds: 60,
      },
      income: {
        threshold: 0.4,
        documentId: 'doc-income'
      }
    };

    (componentInstance as any).applyPolicyMetadata(policyMetadata, 'colectivo');
    (componentInstance as any).currentPolicyMetadata = policyMetadata;
    (componentInstance as any).currentPolicyContext = {
      market: 'edomex',
      clientType: 'colectivo',
      saleType: 'financiero',
      businessFlow: BusinessFlow.CreditoColectivo,
    };

    marketPolicyStub.getIncomeThreshold.and.returnValue(undefined);

    componentInstance.persistFlowContextSnapshot('spec');

    const payload = (flowContext.saveContext as jasmine.Spy).calls.mostRecent().args[1];

    expect(payload.collectiveMembers).toBe(5);
    expect(payload.policyContext.collectiveSize).toBe(5);
    expect(payload.policyContext.requiresIncomeProof).toBeTrue();
    expect(payload.quotationData.policyContext.metadata.tanda.minMembers).toBe(5);
    expect(payload.quotationData.requiresIncomeProof).toBeTrue();
  });

  function withinTolerance(actual: number, expected: number): boolean {
    const delta = Math.abs(actual - expected);
    return delta <= Math.max(25, expected * 0.005);
  }

  it('computes monthly PMT within tolerance', () => {
    const totalPrice = component.totalPrice; // 500,000
    const amountToFinance = component.amountToFinance; // 400,000

    const monthlyRate = (component as any).pkg.rate / 12; // simple division as in component
    const expectedPMT = (amountToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -component.term));

    expect(withinTolerance(component.monthlyPayment, expectedPMT)).toBeTrue();
  });

  it('computes first row I1, K1, S1 correctly', () => {
    const af = component.amountToFinance;
    const r = (component as any).pkg.rate / 12;
    const pmt = component.monthlyPayment;
    const expectedI1 = af * r;
    const expectedK1 = Math.max(0, pmt - expectedI1);
    const expectedS1 = Math.max(0, af - expectedK1);

    expect(withinTolerance(component.firstInterest, expectedI1)).toBeTrue();
    expect(withinTolerance(component.firstPrincipal, expectedK1)).toBeTrue();
    expect(withinTolerance(component.firstBalance, expectedS1)).toBeTrue();
  });

  it('builds amortization table with matching first row', () => {
    (component as any).calculateAmortization();
    const table = (component as any).amortizationTable as Array<any>;
    expect(table.length).toBeGreaterThan(0);
    const row1 = table[0];

    const af = component.amountToFinance;
    const r = (component as any).pkg.rate / 12;
    const pmt = component.monthlyPayment;
    const I1 = af * r;
    const K1 = Math.max(0, pmt - I1);
    const S1 = Math.max(0, af - K1);

    expect(withinTolerance(row1.interest, I1)).toBeTrue();
    expect(withinTolerance(row1.principal, K1)).toBeTrue();
    expect(withinTolerance(row1.balance, S1)).toBeTrue();
  });

  it('persists policy context metadata for colectivo flows', () => {
    const saveContextSpy = jasmine.createSpy('saveContext');
    const flowContextStub = {
      getContextData: jasmine.createSpy('getContextData').and.returnValue({}),
      saveContext: saveContextSpy,
      setBreadcrumbs: () => {}
    } as any;

    (component as any).flowContext = flowContextStub;

    component.market = 'edomex' as any;
    component.clientType = 'colectivo' as any;
    component.tandaMembers = 10;
    component.term = 12;
    component.downPaymentPercentage = 20;
    component.selectedOptions = { unidad: true };
    component.pkg = {
      rate: 0.12,
      terms: [12],
      minDownPaymentPercentage: 0.2,
      components: [
        { id: 'unidad', name: 'Unidad', price: 200000, isOptional: false, isMultipliedByTerm: false }
      ]
    } as any;

    (component as any).client = { flow: BusinessFlow.CreditoColectivo };

    (component as any).currentPolicyMetadata = {
      ocrThreshold: 0.85,
      tanda: {
        minMembers: 5,
        maxMembers: 18,
        minContribution: 500,
        maxContribution: 1500,
        minRounds: 6,
        maxRounds: 18,
      },
      income: {
        threshold: 5000,
      },
    };

    (component as any).currentPolicyContext = {
      market: 'edomex',
      clientType: 'colectivo',
      saleType: 'financiero',
      businessFlow: BusinessFlow.CreditoColectivo,
      collectiveSize: 10,
    };

    (component as any).persistFlowContextSnapshot('spec');

    expect(saveContextSpy).toHaveBeenCalledTimes(1);
    const [, payload] = saveContextSpy.calls.mostRecent().args;

    expect(payload.policyContext?.collectiveSize).toBe(10);
    expect(payload.policyContext?.incomeThreshold).toBe(5000);
    expect(payload.policyContext?.requiresIncomeProof).toBeTrue();
    expect(payload.quotationData?.policyContext?.metadata?.tanda?.minMembers).toBe(5);
    expect(payload.quotationData?.requiresIncomeProof).toBeTrue();
    expect(payload.quotationData?.collectiveMembers).toBe(10);
  });

  it('keeps requiresIncomeProof false when monthly payment is under threshold', () => {
    const saveContextSpy = jasmine.createSpy('saveContext');
    const flowContextStub = {
      getContextData: jasmine.createSpy('getContextData').and.returnValue({}),
      saveContext: saveContextSpy,
      setBreadcrumbs: () => {}
    } as any;

    (component as any).flowContext = flowContextStub;

    component.market = 'aguascalientes' as any;
    component.clientType = 'individual' as any;
    component.term = 12;
    component.downPaymentPercentage = 30;
    component.selectedOptions = { unidad: true };
    component.pkg = {
      rate: 0.1,
      terms: [12],
      minDownPaymentPercentage: 0.3,
      components: [
        { id: 'unidad', name: 'Unidad', price: 200000, isOptional: false, isMultipliedByTerm: false }
      ]
    } as any;

    (component as any).currentPolicyMetadata = {
      ocrThreshold: 0.8,
      income: {
        threshold: 10000,
      },
    };

    (component as any).currentPolicyContext = {
      market: 'aguascalientes',
      clientType: 'individual',
      saleType: 'financiero',
      businessFlow: BusinessFlow.VentaPlazo,
    };

    // Ensure monthlyPayment < threshold (amountToFinance small enough)
    (component as any).amountToFinance = 40000;
    spyOnProperty(component, 'monthlyPayment', 'get').and.returnValue(2500);

    (component as any).persistFlowContextSnapshot('under-threshold');

    const [, payload] = saveContextSpy.calls.mostRecent().args;
    expect(payload.requiresIncomeProof).toBeFalse();
    expect(payload.quotationData.requiresIncomeProof).toBeFalse();
  });

  it('marks requiresIncomeProof when monthly payment exceeds threshold', () => {
    const saveContextSpy = jasmine.createSpy('saveContext');
    const flowContextStub = {
      getContextData: jasmine.createSpy('getContextData').and.returnValue({}),
      saveContext: saveContextSpy,
      setBreadcrumbs: () => {}
    } as any;

    (component as any).flowContext = flowContextStub;

    component.market = 'aguascalientes' as any;
    component.clientType = 'individual' as any;
    component.term = 12;
    component.downPaymentPercentage = 20;
    component.selectedOptions = { unidad: true };
    component.pkg = {
      rate: 0.12,
      terms: [12],
      minDownPaymentPercentage: 0.2,
      components: [
        { id: 'unidad', name: 'Unidad', price: 400000, isOptional: false, isMultipliedByTerm: false }
      ]
    } as any;

    (component as any).currentPolicyMetadata = {
      ocrThreshold: 0.8,
      income: {
        threshold: 5000,
      },
    };

    (component as any).currentPolicyContext = {
      market: 'aguascalientes',
      clientType: 'individual',
      saleType: 'financiero',
      businessFlow: BusinessFlow.VentaPlazo,
    };

    (component as any).amountToFinance = 350000;
    spyOnProperty(component, 'monthlyPayment', 'get').and.returnValue(12000);

    (component as any).persistFlowContextSnapshot('over-threshold');

    const [, payload] = saveContextSpy.calls.mostRecent().args;
    expect(payload.requiresIncomeProof).toBeTrue();
    expect(payload.quotationData.requiresIncomeProof).toBeTrue();
  });
});
