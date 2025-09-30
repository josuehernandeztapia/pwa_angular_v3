import { OnboardingMainComponent } from './onboarding-main.component';
import { DocsCompletedGuard } from '../../../guards/docs-completed.guard';
import { FlowContextService } from '../../../services/flow-context.service';
import { AnalyticsService } from '../../../services/analytics.service';

class FlowContextServiceStub {
  saveContext = jasmine.createSpy('saveContext');
  setBreadcrumbs = jasmine.createSpy('setBreadcrumbs');
  getContextData = jasmine.createSpy('getContextData').and.returnValue(null);
  clearContext = jasmine.createSpy('clearContext');
}

class DocsCompletedGuardStub {
  enforceDocumentClearance = jasmine.createSpy('enforceDocumentClearance').and.returnValue(true);
}

class AnalyticsServiceStub {
  track = jasmine.createSpy('track');
  page = jasmine.createSpy('page');
  identify = jasmine.createSpy('identify');
}

describe('OnboardingMainComponent - guard integration', () => {
  let component: OnboardingMainComponent;
  let docsGuard: DocsCompletedGuardStub;
  let analytics: AnalyticsServiceStub;

  beforeEach(() => {
    const flowContext = new FlowContextServiceStub();
    docsGuard = new DocsCompletedGuardStub();
    analytics = new AnalyticsServiceStub();

    component = new OnboardingMainComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      analytics as unknown as AnalyticsService,
      flowContext as unknown as FlowContextService,
      docsGuard as unknown as DocsCompletedGuard,
      undefined,
      undefined,
      undefined
    );

    component.currentStepIndex = 3; // KYC step
    component.currentStep = 'kyc';
  });

  it('blocks transition to contracts when guard denies clearance', () => {
    docsGuard.enforceDocumentClearance.and.returnValue(false);

    component.nextStep();

    expect(component.currentStep).toBe('kyc');
    expect(docsGuard.enforceDocumentClearance).toHaveBeenCalledWith('/onboarding/contracts');
  });

  it('allows transition to contracts when guard grants clearance', () => {
    docsGuard.enforceDocumentClearance.and.returnValue(true);

    component.nextStep();

    expect(component.currentStep).toBe('contracts');
  });
});
