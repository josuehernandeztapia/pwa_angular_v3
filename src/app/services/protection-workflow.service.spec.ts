import { of, throwError } from 'rxjs';

import { ProtectionWorkflowService, ProtectionWorkflowOptions } from './protection-workflow.service';
import { ProtectionService } from './protection.service';
import { AnalyticsService } from './analytics.service';
import { MonitoringService } from './monitoring.service';
import { FlowContextService } from './flow-context.service';
import { ProtectionPlan } from '../models/protection';

class ProtectionServiceStub {
  getPlan = jasmine.createSpy('getPlan').and.returnValue(of<ProtectionPlan>({
    contractId: 'contract-123',
    clientId: 'client-123',
    state: 'APPLIED' as const,
    scenarios: [
      {
        id: 'scenario-std',
        description: 'Cobertura estándar',
        type: 'DEFER',
        params: {},
        impact: { paymentChange: -900, termChange: 1, totalCostChange: 2000 },
        eligible: true,
        score: 80
      }
    ],
    policy: {
      difMax: 6,
      extendMax: 24,
      stepDownMaxPct: 0.5,
      irrMin: 0.05,
      mMin: 1000
    },
    used: {
      defer: 0,
      stepdown: 0,
      recalendar: 0,
      collective: 0
    },
    audit: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  }));

  simulate = jasmine.createSpy('simulate').and.returnValue(of({
    scenarios: [
      {
        id: 'scenario-std',
        description: 'Cobertura estándar',
        type: 'DEFER',
        params: {},
        impact: { paymentChange: -900, termChange: 1, totalCostChange: 2000 },
        eligible: true,
        score: 80
      }
    ]
  }));

  select = jasmine.createSpy('select').and.returnValue(of({ newState: 'PENDING_APPROVAL' as const }));
  approve = jasmine.createSpy('approve').and.returnValue(of({ newState: 'READY_TO_SIGN' as const }));
  sign = jasmine.createSpy('sign').and.returnValue(of({ newState: 'SIGNED' as const }));
  apply = jasmine.createSpy('apply').and.returnValue(of({ success: true, newSchedule: [{ month: 1, payment: 7600 }] }));
}

class AnalyticsServiceStub {
  track = jasmine.createSpy('track');
  metric = jasmine.createSpy('metric');
}

class MonitoringServiceStub {
  captureInfo = jasmine.createSpy('captureInfo');
  captureWarning = jasmine.createSpy('captureWarning');
}

class FlowContextServiceStub {
  saveContext = jasmine.createSpy('saveContext');
}

describe('ProtectionWorkflowService', () => {
  let protection: ProtectionServiceStub;
  let analytics: AnalyticsServiceStub;
  let monitoring: MonitoringServiceStub;
  let flowContext: FlowContextServiceStub;
  let service: ProtectionWorkflowService;

  const baseOptions: ProtectionWorkflowOptions = {
    contractId: 'contract-123',
    coverageType: 'premium',
    advisorId: 'advisor-001',
    clientId: 'client-001',
    score: 88,
    scoreSource: 'api',
    effectiveDate: '2024-01-31',
    metadata: {
      requestedType: 'DEFER',
      triggerReason: 'manual'
    }
  };

  beforeEach(() => {
    protection = new ProtectionServiceStub();
    analytics = new AnalyticsServiceStub();
    monitoring = new MonitoringServiceStub();
    flowContext = new FlowContextServiceStub();
    service = new ProtectionWorkflowService(
      protection as unknown as ProtectionService,
      analytics as unknown as AnalyticsService,
      monitoring as unknown as MonitoringService,
      flowContext as unknown as FlowContextService
    );
  });

  it('executes the happy path and persists context', async () => {
    const result = await service.applyProtection(baseOptions);

    expect(protection.getPlan).toHaveBeenCalledTimes(2);
    expect(protection.simulate).toHaveBeenCalledTimes(1);
    expect(protection.select).toHaveBeenCalledTimes(1);
    expect(protection.approve).toHaveBeenCalledTimes(1);
    expect(protection.sign).toHaveBeenCalledTimes(1);
    expect(protection.apply).toHaveBeenCalledTimes(1);

    expect(result.applied).toBeTrue();
    expect(result.fallbackUsed).toBeFalse();
    expect(result.metadata?.['workflowState']).toBe('APPLIED');

    expect(analytics.track).toHaveBeenCalledWith('protection_workflow_start', jasmine.objectContaining({
      contractId: 'contract-123',
      coverageType: 'premium',
    }));
    expect(analytics.track).toHaveBeenCalledWith('protection_workflow_completed', jasmine.objectContaining({
      contractId: 'contract-123',
      fallbackUsed: false,
    }));
    expect(analytics.metric).toHaveBeenCalledWith('protection.workflow.duration_ms', jasmine.any(Number), jasmine.objectContaining({
      contractId: 'contract-123',
      applied: true,
    }));

    expect(flowContext.saveContext).toHaveBeenCalledWith('protection', jasmine.objectContaining({
      contractId: 'contract-123',
      applied: true,
    }), jasmine.any(Object));

    expect(monitoring.captureWarning).not.toHaveBeenCalledWith('protection', 'workflow.failed', jasmine.any(String), jasmine.any(Object), jasmine.any(Object));
  });

  it('marks workflow as fallback when apply fails', async () => {
    protection.apply.and.returnValue(throwError(() => new Error('apply failed')));

    const result = await service.applyProtection(baseOptions);

    expect(result.applied).toBeTrue();
    expect(result.fallbackUsed).toBeTrue();
    expect(monitoring.captureWarning).toHaveBeenCalledWith('protection', 'apply', jasmine.any(String), jasmine.objectContaining({
      contractId: 'contract-123'
    }), jasmine.any(Object));
    expect(analytics.track).toHaveBeenCalledWith('protection_workflow_completed', jasmine.objectContaining({
      fallbackUsed: true,
    }));
  });

  it('falls back to mock scenarios when simulation fails', async () => {
    protection.simulate.and.returnValue(throwError(() => new Error('simulate failed')));

    const result = await service.applyProtection(baseOptions);

    expect(result.fallbackUsed).toBeTrue();
    expect(monitoring.captureWarning).toHaveBeenCalledWith('protection', 'simulate', jasmine.any(String), jasmine.objectContaining({
      contractId: 'contract-123'
    }));
    expect(result.metadata?.['scenarioId']).toContain('contract-123-scenario');
  });
});
