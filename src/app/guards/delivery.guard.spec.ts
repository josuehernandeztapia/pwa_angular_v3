import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { DeliveryGuard } from './delivery.guard';
import { FlowContextService } from '../services/flow-context.service';
import { ToastService } from '../services/toast.service';
import { ContractContextSnapshot } from '../models/contract-context';

class FlowContextServiceStub {
  private readonly contexts = new Map<string, any>();

  setContext(key: string, value: any): void {
    this.contexts.set(key, value);
  }

  getContextData<T>(key: string): T | null {
    return (this.contexts.get(key) ?? null) as T | null;
  }

  clear(): void {
    this.contexts.clear();
  }
}

class ToastServiceStub {
  warning = jasmine.createSpy('warning');
}

describe('DeliveryGuard', () => {
  let guard: DeliveryGuard;
  let flowContext: FlowContextServiceStub;
  let toast: ToastServiceStub;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        DeliveryGuard,
        { provide: FlowContextService, useClass: FlowContextServiceStub },
        { provide: ToastService, useClass: ToastServiceStub }
      ]
    });

    guard = TestBed.inject(DeliveryGuard);
    flowContext = TestBed.inject(FlowContextService) as unknown as FlowContextServiceStub;
    toast = TestBed.inject(ToastService) as unknown as ToastServiceStub;
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    flowContext.clear();
    toast.warning.calls.reset();
  });

  function setContractContext(snapshot: Partial<ContractContextSnapshot>): void {
    const base: ContractContextSnapshot = {
      clientId: 'client-1',
      contractId: 'contract-1',
      market: 'aguascalientes',
      documentsComplete: true,
      aviStatus: 'completed',
      aviDecision: 'GO',
      voiceVerified: true,
      requiresVoiceVerification: false,
      protectionRequired: false,
      protectionApplied: true,
      pendingOfflineRequests: 0,
      updatedAt: Date.now()
    };

    flowContext.setContext('contract', { ...base, ...snapshot });
  }

  it('allows access when contract context is valid', () => {
    setContractContext({});

    expect(guard.canActivate({} as any, {} as any)).toBeTrue();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('redirects to document checklist when documents are pending', () => {
    setContractContext({ documentsComplete: false });

    const result = guard.canActivate({} as any, {} as any) as any;

    expect(router.serializeUrl(result)).toBe('/documentos');
    expect(toast.warning).toHaveBeenCalled();
  });

  it('redirects to contract generation when contract is missing', () => {
    const result = guard.canActivate({} as any, {} as any) as any;

    expect(router.serializeUrl(result)).toBe('/contratos/generacion');
    expect(toast.warning).toHaveBeenCalled();
  });

  it('allows when delivery snapshot contains events', () => {
    flowContext.setContext('delivery', { events: [{ id: '1' }] });

    expect(guard.canActivate({} as any, {} as any)).toBeTrue();
  });
});
