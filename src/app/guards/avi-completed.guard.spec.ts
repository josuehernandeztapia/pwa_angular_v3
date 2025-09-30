import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { environment } from '../../environments/environment';
import { AviCompletedGuard } from './avi-completed.guard';
import { FlowContextService } from '../services/flow-context.service';
import { ToastService } from '../services/toast.service';
import { BusinessFlow } from '../models/types';

class FlowContextServiceStub {
  getContextDataSpy = jasmine.createSpy('getContextData');

  getContextData<T>(key: string): T | null {
    return this.getContextDataSpy(key) ?? null;
  }
}

class ToastServiceStub {
  warning = jasmine.createSpy('warning');
}

describe('AviCompletedGuard', () => {
  let guard: AviCompletedGuard;
  let flowContext: FlowContextServiceStub;
  let toast: ToastServiceStub;
  let router: Router;
  let originalFlag: boolean;

  beforeEach(() => {
    originalFlag = environment.features.enableAVISystem;

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AviCompletedGuard,
        { provide: FlowContextService, useClass: FlowContextServiceStub },
        { provide: ToastService, useClass: ToastServiceStub }
      ]
    });

    guard = TestBed.inject(AviCompletedGuard);
    flowContext = TestBed.inject(FlowContextService) as unknown as FlowContextServiceStub;
    toast = TestBed.inject(ToastService) as unknown as ToastServiceStub;
    router = TestBed.inject(Router);
    environment.features.enableAVISystem = true;
  });

  afterEach(() => {
    environment.features.enableAVISystem = originalFlag;
  });

  it('allows activation when AVI guard feature flag is disabled', () => {
    environment.features.enableAVISystem = false;

    const result = guard.canActivate({} as any, { url: '/documentos' } as any);

    expect(result).toBeTrue();
    expect(flowContext.getContextDataSpy).not.toHaveBeenCalled();
  });

  it('allows when document context indicates AVI not required', () => {
    flowContext.getContextDataSpy.and.callFake((key: string) => {
      if (key === 'documentos') {
        return { flowContext: { businessFlow: BusinessFlow.VentaDirecta }, showAVI: false };
      }
      return null;
    });

    const result = guard.canActivate({} as any, { url: '/documentos' } as any);

    expect(result).toBeTrue();
  });

  it('redirects to onboarding when no clearance is present', () => {
    flowContext.getContextDataSpy.and.returnValue(null);

    const result = guard.canActivate({} as any, { url: '/documentos' } as any);

    expect(typeof result === 'boolean').toBeFalse();
    expect(toast.warning).toHaveBeenCalled();

    const serialized = router.serializeUrl(result as any);
    expect(serialized.startsWith('/onboarding')).toBeTrue();
  });
});
