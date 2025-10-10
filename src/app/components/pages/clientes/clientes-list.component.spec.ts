import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ClientesListComponent } from './clientes-list.component';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { RiskEvaluationService } from '../../../services/risk-evaluation.service';
import { FlowContextService } from '../../../services/flow-context.service';
import { getDemoClients, getDemoRiskEvaluations, cloneDemoRiskEvaluation } from '../../../demo/demo-seed';

const noopToast = {
  error: jasmine.createSpy('error'),
  success: jasmine.createSpy('success'),
  info: jasmine.createSpy('info')
};

const flowContextStub = {
  setBreadcrumbs: jasmine.createSpy('setBreadcrumbs')
};

describe('ClientesListComponent (risk integration)', () => {
  let fixture: ComponentFixture<ClientesListComponent>;
  let component: ClientesListComponent;
  let apiService: jasmine.SpyObj<ApiService>;
  let riskService: jasmine.SpyObj<RiskEvaluationService>;

  const demoRiskEvaluations = getDemoRiskEvaluations();

  beforeEach(async () => {
    apiService = jasmine.createSpyObj('ApiService', ['getClients']);
    riskService = jasmine.createSpyObj('RiskEvaluationService', ['getEvaluationHistory']);

    await TestBed.configureTestingModule({
      imports: [ClientesListComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: ToastService, useValue: noopToast },
        { provide: RiskEvaluationService, useValue: riskService },
        { provide: FlowContextService, useValue: flowContextStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesListComponent);
    component = fixture.componentInstance;
  });

  it('hydrates GO evaluations into friendly risk badges', () => {
    const client = getDemoClients().find(item => item.id === 'cli-ags-001');
    expect(client).toBeTruthy();
    const evaluationEntry = demoRiskEvaluations.find(entry => entry.clientId === 'cli-ags-001');
    expect(evaluationEntry).toBeTruthy();

    apiService.getClients.and.returnValue(of([client!]));
    riskService.getEvaluationHistory.and.returnValue(of([cloneDemoRiskEvaluation(evaluationEntry!.evaluation)]));

    fixture.detectChanges();

    expect(component.paginatedClientes.length).toBe(1);

    const hydratedClient = component.paginatedClientes[0];
    expect(component.getRiskBadge(hydratedClient)).toBe('GO · Riesgo bajo');
    expect(component.isAtRisk(hydratedClient)).toBeFalse();
    expect(component.isHighValueClient(hydratedClient)).toBeTrue();
    expect(riskService.getEvaluationHistory).toHaveBeenCalledWith('cli-ags-001');
  });

  it('flags NO-GO evaluations as risk and urgent', () => {
    const client = getDemoClients().find(item => item.id === 'cli-edx-002');
    expect(client).toBeTruthy();
    const evaluationEntry = demoRiskEvaluations.find(entry => entry.clientId === 'cli-edx-002');
    expect(evaluationEntry).toBeTruthy();

    apiService.getClients.and.returnValue(of([client!]));
    riskService.getEvaluationHistory.and.returnValue(of([cloneDemoRiskEvaluation(evaluationEntry!.evaluation)]));

    fixture.detectChanges();

    const hydratedClient = component.paginatedClientes[0];
    expect(component.isAtRisk(hydratedClient)).toBeTrue();
    expect(component.isClientUrgent(hydratedClient)).toBeTrue();
    expect(component.getRiskBadge(hydratedClient)).toContain('No-Go');

    const indicatorClasses = component.getRiskIndicatorClasses(hydratedClient);
    expect(indicatorClasses['clientes-list__indicator--risk-critico']).toBeTrue();
  });
});
