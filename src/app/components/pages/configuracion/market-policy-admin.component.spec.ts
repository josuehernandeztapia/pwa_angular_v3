import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MarketPolicyAdminComponent } from './market-policy-admin.component';
import { buildComponentTestProviders } from '../../../../test-helpers/component-test-providers';
import { MarketPolicyService } from '../../../services/market-policy.service';
import { ToastService } from '../../../services/toast.service';
import { MonitoringService } from '../../../services/monitoring.service';

describe('MarketPolicyAdminComponent', () => {
  let fixture: ComponentFixture<MarketPolicyAdminComponent>;
  let component: MarketPolicyAdminComponent;
  let policyService: jasmine.SpyObj<MarketPolicyService>;
  let toast: jasmine.SpyObj<ToastService>;
  let monitoring: jasmine.SpyObj<MonitoringService>;

  const snapshot = {
    ags: {
      documents: [{ id: 'doc-initial', label: 'Documento Inicial' }],
      metadata: { ocrThreshold: 0.85 }
    }
  };

  beforeEach(async () => {
    policyService = jasmine.createSpyObj<MarketPolicyService>('MarketPolicyService', [
      'reloadRemotePolicies',
      'getRemoteConfigSnapshot',
      'registerPoliciesFromRemoteConfig',
      'savePoliciesToRemote',
      'getPolicyDocuments',
      'toDocuments',
      'getPolicyMetadata'
    ]);
    policyService.reloadRemotePolicies.and.returnValue(Promise.resolve());
    policyService.getRemoteConfigSnapshot.and.returnValue(snapshot);
    policyService.savePoliciesToRemote.and.returnValue(of(void 0));
    policyService.getPolicyDocuments.and.returnValue({
      documents: [],
      metadata: { ocrThreshold: 0.85 }
    } as any);
    policyService.toDocuments.and.returnValue([]);
    policyService.getPolicyMetadata.and.returnValue({ ocrThreshold: 0.85 } as any);

    toast = jasmine.createSpyObj<ToastService>('ToastService', ['info', 'success', 'error']);
    monitoring = jasmine.createSpyObj<MonitoringService>('MonitoringService', ['auditEvent']);
    const providerSetup = buildComponentTestProviders();

    await TestBed.configureTestingModule({
      imports: [MarketPolicyAdminComponent],
      providers: [
        ...providerSetup.providers,
        { provide: MarketPolicyService, useValue: policyService },
        { provide: ToastService, useValue: toast },
        { provide: MonitoringService, useValue: monitoring }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MarketPolicyAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads remote configuration on init', () => {
    expect(policyService.reloadRemotePolicies).toHaveBeenCalled();
    expect(policyService.getRemoteConfigSnapshot).toHaveBeenCalled();
    expect(component.configText).toBe(JSON.stringify(snapshot, null, 2));
    expect(toast.info).toHaveBeenCalledWith('Políticas remotas sincronizadas.');
    expect(monitoring.auditEvent).toHaveBeenCalledWith('qa_market_policy_synced', jasmine.objectContaining({
      action: 'reload',
      markets: Object.keys(snapshot)
    }));
  });

  it('shows parse error when JSON is invalid', () => {
    component.configText = '{ invalid json';
    component.applyChanges();

    expect(component.parseError).toBe('El JSON de políticas no es válido. Revisa comas y llaves.');
    expect(policyService.registerPoliciesFromRemoteConfig).not.toHaveBeenCalled();
  });

  it('applies changes for valid JSON', async () => {
    const updated = { ags: { documents: [], metadata: { ocrThreshold: 0.9 } } };
    component.configText = JSON.stringify(updated);

    component.applyChanges();
    expect(component.isConfirmVisible).toBeTrue();
    expect(policyService.registerPoliciesFromRemoteConfig).not.toHaveBeenCalled();

    await component.confirmPendingAction();

    expect(policyService.registerPoliciesFromRemoteConfig).toHaveBeenCalledWith(updated);
    expect(toast.success).toHaveBeenCalledWith('Políticas aplicadas para la sesión actual.');
    expect(monitoring.auditEvent).toHaveBeenCalledWith('qa_market_policy_applied_session', jasmine.objectContaining({
      action: 'apply_session',
      markets: Object.keys(updated),
      diff: jasmine.any(Array)
    }));
  });

  it('persists changes through MarketPolicyService', async () => {
    const updated = { ags: { documents: [{ id: 'doc-new', label: 'Doc' }], metadata: { ocrThreshold: 0.92 } } };
    component.configText = JSON.stringify(updated);

    await component.persistChanges();
    expect(component.isConfirmVisible).toBeTrue();
    expect(policyService.savePoliciesToRemote).not.toHaveBeenCalled();

    await component.confirmPendingAction();

    expect(policyService.savePoliciesToRemote).toHaveBeenCalledWith(updated);
    expect(toast.success).toHaveBeenCalledWith('Políticas guardadas en el BFF.');
    expect(monitoring.auditEvent).toHaveBeenCalledWith('qa_market_policy_saved', jasmine.objectContaining({
      action: 'save_remote',
      markets: Object.keys(updated),
      diff: jasmine.any(Array)
    }));
  });
});
