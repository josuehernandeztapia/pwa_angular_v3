import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContractGenerationComponent } from './contract-generation.component';
import { FlowContextService } from '../../../services/flow-context.service';
import { ContractContextSnapshot } from '../../../models/contract-context';

class FlowContextServiceStub {
  context: ContractContextSnapshot | null = null;

  getContextData<T>(_key: string): T | null {
    return this.context as unknown as T | null;
  }
}

describe('ContractGenerationComponent', () => {
  let fixture: ComponentFixture<ContractGenerationComponent>;
  let component: ContractGenerationComponent;
  let flowContext: FlowContextServiceStub;

  beforeEach(async () => {
    flowContext = new FlowContextServiceStub();

    await TestBed.configureTestingModule({
      imports: [ContractGenerationComponent],
      providers: [{ provide: FlowContextService, useValue: flowContext }]
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ContractGenerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('renders contract summary when context is available', () => {
    flowContext.context = {
      clientId: 'client-001',
      documentsComplete: true,
      voiceVerified: true,
      protectionRequired: true,
      protectionApplied: false,
      pendingOfflineRequests: 3,
      updatedAt: Date.now()
    };

    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    const summary = compiled.querySelector('.contract-generation__summary');
    expect(summary).not.toBeNull();
    expect(summary!.textContent).toContain('client-001');
    expect(summary!.textContent).toContain('Pendiente');
    expect(summary!.textContent).toContain('3');
    expect(compiled.querySelector('.contract-generation__placeholder')).toBeNull();
  });

  it('shows placeholder when context is missing', () => {
    flowContext.context = null;

    createComponent();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contract-generation__summary')).toBeNull();
    const placeholder = compiled.querySelector('.contract-generation__placeholder');
    expect(placeholder).not.toBeNull();
    expect(placeholder!.textContent).toContain('No se encontró contexto de contrato');
  });
});
