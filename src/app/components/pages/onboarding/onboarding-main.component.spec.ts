import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';

import { OnboardingMainComponent } from './onboarding-main.component';
import { OnboardingEngineService } from '../../../services/onboarding-engine.service';
import { DocumentRequirementsService } from '../../../services/document-requirements.service';
import { MetaMapService } from '../../../services/metamap.service';
import { ContractGenerationService } from '../../../services/contract-generation.service';
import { MifielService } from '../../../services/mifiel.service';
import { EcosystemDataService } from '../../../services/data/ecosystem-data.service';
import { InterviewCheckpointService } from '../../../services/interview-checkpoint.service';
import { AnalyticsService } from '../../../services/analytics.service';
import { MarketPolicyService } from '../../../services/market-policy.service';
import { DocsCompletedGuard } from '../../../guards/docs-completed.guard';
import { FlowContextService } from '../../../services/flow-context.service';
import { Client } from '../../../models/types';

class OnboardingEngineServiceStub {
  createClientFromOnboarding(): Observable<Client> {
    return of({} as Client);
  }

  createCollectiveCreditMembers(): Observable<Client> {
    return of({} as Client);
  }

  submitDocument(): Observable<Client> {
    return of({} as Client);
  }

  reviewDocument(): Observable<Client> {
    return of({} as Client);
  }
}

class DocumentRequirementsServiceStub {
  getDocumentRequirements() {
    return of([]);
  }

  getRequirementsMessage(): string {
    return '';
  }

  getDocumentTooltip(): string | undefined {
    return undefined;
  }
}

class MetaMapServiceStub {
  kycSuccess$ = new Subject<any>();
  kycExit$ = new Subject<any>();

  completeKyc(): Observable<Client> {
    return of({} as Client);
  }

  validateKycPrerequisites() {
    return { canStartKyc: false, isKycComplete: false, missingDocs: [], tooltipMessage: '' };
  }

  getKycStatus() {
    return { status: 'not_started', statusMessage: '', canRetry: false } as any;
  }
}

class ContractGenerationServiceStub {}
class MifielServiceStub {}
class InterviewCheckpointServiceStub {}

class EcosystemDataServiceStub {
  getEcosystems() {
    return of([]);
  }
}

class AnalyticsServiceStub {
  track(): void {}
  page(): void {}
  identify(): void {}
}

class MarketPolicyServiceStub {
  getAvailablePolicies() {
    return [
      { market: 'aguascalientes', clientType: 'individual' },
      { market: 'edomex', clientType: 'individual' },
      { market: 'edomex', clientType: 'colectivo' },
    ];
  }
}

describe('OnboardingMainComponent (policy options)', () => {
  let component: OnboardingMainComponent;
  let fixture: ComponentFixture<OnboardingMainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingMainComponent],
      providers: [
        { provide: OnboardingEngineService, useClass: OnboardingEngineServiceStub },
        { provide: DocumentRequirementsService, useClass: DocumentRequirementsServiceStub },
        { provide: MetaMapService, useClass: MetaMapServiceStub },
        { provide: ContractGenerationService, useClass: ContractGenerationServiceStub },
        { provide: MifielService, useClass: MifielServiceStub },
        { provide: EcosystemDataService, useClass: EcosystemDataServiceStub },
        { provide: InterviewCheckpointService, useClass: InterviewCheckpointServiceStub },
        { provide: AnalyticsService, useClass: AnalyticsServiceStub },
        { provide: MarketPolicyService, useClass: MarketPolicyServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initialises market options from MarketPolicyService', () => {
    expect(component.marketOptions).toEqual(['aguascalientes', 'edomex']);
  });

  it('derives client type options for markets that support collective flow', () => {
    component.form.market = 'edomex';
    component.onMarketChange();

    component.form.saleType = 'financiero';
    component.onSaleTypeChange();

    expect(component.clientTypeOptions).toEqual(['colectivo', 'individual']);
  });
});

class FlowContextServiceStub {
  saveContext = jasmine.createSpy('saveContext');
  setBreadcrumbs = jasmine.createSpy('setBreadcrumbs');
  getContextData = jasmine.createSpy('getContextData').and.returnValue(null);
  clearContext = jasmine.createSpy('clearContext');
}

class DocsCompletedGuardStub {
  enforceDocumentClearance = jasmine.createSpy('enforceDocumentClearance').and.returnValue(true);
}

describe('OnboardingMainComponent - guard integration', () => {
  let component: OnboardingMainComponent;
  let docsGuard: DocsCompletedGuardStub;
  let analytics: AnalyticsServiceStub;

  beforeEach(() => {
    const flowContext = new FlowContextServiceStub();
    const marketPolicy = new MarketPolicyServiceStub();
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
      marketPolicy as unknown as MarketPolicyService,
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
