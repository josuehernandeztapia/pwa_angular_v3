import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { ContractValidGuard } from './contract-valid.guard';
import { FlowContextService } from '../services/flow-context.service';
import { ToastService } from '../services/toast.service';
import { ContractContextSnapshot } from '../models/contract-context';

class FlowContextServiceStub {
  private readonly contexts = new Map<string, any>();

  setContext(key: string, value: any): void {
    this.contexts.set(key, value);
  }

  saveContext(key: string, value: any, _options?: any): void {
    this.setContext(key, value);
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
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
}

describe('ContractValidGuard', () => {
  let guard: ContractValidGuard;
  let flowContext: FlowContextServiceStub;
  let toast: ToastServiceStub;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        ContractValidGuard,
        { provide: FlowContextService, useClass: FlowContextServiceStub },
        { provide: ToastService, useClass: ToastServiceStub }
      ]
    });

    guard = TestBed.inject(ContractValidGuard);
    flowContext = TestBed.inject(FlowContextService) as unknown as FlowContextServiceStub;
    toast = TestBed.inject(ToastService) as unknown as ToastServiceStub;
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    flowContext.clear();
    toast.warning.calls.reset();
    toast.error.calls.reset();
    toast.info.calls.reset();
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

  it('allows navigation when contract context is valid', () => {
    setContractContext({});

    const allowed = guard.canActivate({} as any, {} as any);

    expect(allowed).toBeTrue();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('redirects to contract generation when context is missing', () => {
    const result = guard.canActivate({} as any, {} as any);

    expect(result instanceof Object).toBeTrue();
    expect(toast.warning).toHaveBeenCalled();
    expect(router.serializeUrl(result as any)).toBe('/contratos/generacion');
  });

  it('blocks when documents are incomplete', () => {
    setContractContext({ documentsComplete: false });

    const result = guard.canActivate({} as any, {} as any);

    expect(toast.warning).toHaveBeenCalled();
    expect(router.serializeUrl(result as any)).toBe('/documentos');
  });

  it('blocks when there are pending offline requests', () => {
    setContractContext({ pendingOfflineRequests: 2 });

    const result = guard.canActivate({} as any, {} as any);

    expect(toast.info).toHaveBeenCalled();
    expect(router.serializeUrl(result as any)).toBe('/documentos');
  });
});
