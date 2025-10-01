import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { ContextPanelComponent } from './context-panel.component';
import { buildComponentTestProviders } from '../../../../test-helpers/component-test-providers';
import { FlowContextEntry, FlowContextService } from '../../../services/flow-context.service';
import { ErrorBoundaryService, BoundaryIssue } from '../../../services/error-boundary.service';
import { OfflineService } from '../../../services/offline.service';
import { ToastService } from '../../../services/toast.service';
import { MarketPolicyService } from '../../../services/market-policy.service';

class FlowContextServiceStub {
  contexts$ = new BehaviorSubject<FlowContextEntry<any>[]>([]);
}

class ErrorBoundaryServiceStub {
  issues$ = new BehaviorSubject<BoundaryIssue[]>([]);
  retryIssue = jasmine.createSpy('retryIssue');
  executeAction = jasmine.createSpy('executeAction');
}

class OfflineServiceStub {
  flushQueueNow = jasmine.createSpy('flushQueueNow').and.returnValue(Promise.resolve());
  clearPendingRequests = jasmine.createSpy('clearPendingRequests');
}

class ToastServiceStub {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
}

class MarketPolicyServiceStub {
  reloadRemotePolicies = jasmine.createSpy('reloadRemotePolicies').and.returnValue(Promise.resolve());
  getRemoteConfigUpdatedAt(): number | null {
    return null;
  }
}

describe('ContextPanelComponent', () => {
  let component: ContextPanelComponent;
  let fixture: ComponentFixture<ContextPanelComponent>;
  let offline: OfflineServiceStub;
  let toast: ToastServiceStub;
  let marketPolicy: MarketPolicyServiceStub;

  beforeEach(async () => {
    offline = new OfflineServiceStub();
    toast = new ToastServiceStub();
    marketPolicy = new MarketPolicyServiceStub();
    const providerSetup = buildComponentTestProviders();

    await TestBed.configureTestingModule({
      imports: [ContextPanelComponent],
      providers: [
        ...providerSetup.providers,
        { provide: FlowContextService, useClass: FlowContextServiceStub },
        { provide: ErrorBoundaryService, useClass: ErrorBoundaryServiceStub },
        { provide: OfflineService, useValue: offline },
        { provide: ToastService, useValue: toast },
        { provide: MarketPolicyService, useValue: marketPolicy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContextPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function buildDocumentSummary(pendingOfflineRequests: number) {
    return {
      key: 'documentos',
      raw: {
        contractContext: {
          pendingOfflineRequests,
          protectionRequired: false,
          documentsComplete: false
        }
      }
    } as any;
  }

  describe('document summary actions', () => {
    it('flushes the offline queue when there are pending requests', fakeAsync(() => {
      const summary = buildDocumentSummary(2);
      const action = { id: 'flush-offline-queue' } as any;

      component.executeSummaryAction(summary, action);

      expect(offline.flushQueueNow).toHaveBeenCalledTimes(1);
      flushMicrotasks();
      expect(toast.success).toHaveBeenCalledWith('Procesando cola offline…');
    }));

    it('skips flushing when there are no pending requests', () => {
      const summary = buildDocumentSummary(0);
      const action = { id: 'flush-offline-queue' } as any;

      component.executeSummaryAction(summary, action);

      expect(offline.flushQueueNow).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('clears offline queue and shows info toast', () => {
      const summary = buildDocumentSummary(3);
      const action = { id: 'clear-offline-queue' } as any;

      component.executeSummaryAction(summary, action);

      expect(offline.clearPendingRequests).toHaveBeenCalledWith('manual');
      expect(toast.info).toHaveBeenCalledWith('Solicitudes en cola descartadas.');
    });

    it('reloads market policies via MarketPolicyService', fakeAsync(() => {
      const summary = buildDocumentSummary(1);
      const action = { id: 'reload-market-policies' } as any;

      component.executeSummaryAction(summary, action);

      expect(marketPolicy.reloadRemotePolicies).toHaveBeenCalledTimes(1);
      flushMicrotasks();
      expect(toast.success).toHaveBeenCalledWith('Políticas de mercado actualizadas.');
    }));
  });
});
