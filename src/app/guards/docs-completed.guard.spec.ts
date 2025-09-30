import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { DocsCompletedGuard } from './docs-completed.guard';
import { FlowContextService } from '../services/flow-context.service';
import { ToastService } from '../services/toast.service';
import { MarketPolicyService, MarketPolicyDocument } from '../services/market-policy.service';
import { BusinessFlow, DocumentStatus, Document } from '../models/types';

class FlowContextServiceStub {
  private readonly context = new Map<string, any>();

  setContext(key: string, value: any): void {
    this.context.set(key, value);
  }

  getContextData<T>(key: string): T | null {
    return (this.context.get(key) ?? null) as T | null;
  }

  clear(): void {
    this.context.clear();
  }
}

class ToastServiceStub {
  warning = jasmine.createSpy('warning');
}

class MarketPolicyServiceStub {
  getRequiredDocs = jasmine.createSpy('getRequiredDocs');
}

describe('DocsCompletedGuard', () => {
  let guard: DocsCompletedGuard;
  let flowContext: FlowContextServiceStub;
  let toast: ToastServiceStub;
  let router: Router;
  let marketPolicy: MarketPolicyServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        DocsCompletedGuard,
        { provide: FlowContextService, useClass: FlowContextServiceStub },
        { provide: ToastService, useClass: ToastServiceStub },
        { provide: MarketPolicyService, useClass: MarketPolicyServiceStub }
      ]
    });

    guard = TestBed.inject(DocsCompletedGuard);
    flowContext = TestBed.inject(FlowContextService) as unknown as FlowContextServiceStub;
    toast = TestBed.inject(ToastService) as unknown as ToastServiceStub;
    router = TestBed.inject(Router);
    marketPolicy = TestBed.inject(MarketPolicyService) as unknown as MarketPolicyServiceStub;
  });

  afterEach(() => {
    toast.warning.calls.reset();
    marketPolicy.getRequiredDocs.calls.reset();
    flowContext.clear();
  });

  function setDocumentContext(documents: Document[], overrides: Partial<{ allComplete: boolean }> = {}): void {
    const completionStatus = {
      totalDocs: documents.length,
      completedDocs: documents.filter(doc => doc.status === DocumentStatus.Aprobado).length,
      pendingDocs: documents.filter(doc => doc.status !== DocumentStatus.Aprobado).length,
      completionPercentage: 0,
      allComplete: overrides.allComplete ?? documents.every(doc => doc.status === DocumentStatus.Aprobado)
    };

    flowContext.setContext('documentos', {
      documents,
      completionStatus,
      flowContext: {
        market: 'aguascalientes',
        clientType: 'individual',
        saleType: 'financiero',
        businessFlow: BusinessFlow.VentaPlazo
      }
    });

    const requiredDocs: MarketPolicyDocument[] = documents.map(doc => ({ id: doc.id, label: doc.name }));
    marketPolicy.getRequiredDocs.and.returnValue(requiredDocs);
  }

  it('canProceed returns true when required documents are approved', () => {
    const docs: Document[] = [
      { id: 'doc-ine', name: 'INE', status: DocumentStatus.Aprobado },
      { id: 'doc-proof', name: 'Comprobante', status: DocumentStatus.Aprobado }
    ];
    setDocumentContext(docs);

    expect(guard.canProceed()).toBeTrue();
    expect(marketPolicy.getRequiredDocs).toHaveBeenCalled();
  });

  it('canActivate redirects when no clearance is present', () => {
    const result = guard.canActivate({} as any, { url: '/contratos' } as any);

    expect(typeof result === 'boolean').toBeFalse();
    expect(toast.warning).toHaveBeenCalled();

    const serialized = router.serializeUrl(result as any);
    expect(serialized.startsWith('/onboarding')).toBeTrue();
  });

  it('enforceDocumentClearance navigates when documents are incomplete', () => {
    const docs: Document[] = [
      { id: 'doc-ine', name: 'INE', status: DocumentStatus.Pendiente },
      { id: 'doc-proof', name: 'Comprobante', status: DocumentStatus.Aprobado }
    ];
    setDocumentContext(docs, { allComplete: false });
    const navigateSpy = spyOn(router, 'navigateByUrl');

    const allowed = guard.enforceDocumentClearance('/onboarding/contracts');

    expect(allowed).toBeFalse();
    expect(toast.warning).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalled();
  });
});
