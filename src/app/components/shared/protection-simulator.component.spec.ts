import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';

import { ProtectionSimulatorComponent } from './protection-simulator.component';
import { FinancialCalculatorService } from '../../services/financial-calculator.service';
import { ProtectionEngineService } from '../../services/protection-engine.service';
import { ToastService } from '../../services/toast.service';
import { Client, BusinessFlow } from '../../models/types';
import { ProtectionScenario } from '../../models/protection';

class FinancialCalculatorStub {
  getTIRMin(): number {
    return 0.24;
  }

  formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }
}

class ProtectionEngineStub {
  generateScenarioWithTIR = jasmine.createSpy('generateScenarioWithTIR').and.callFake(
    (
      type: string,
      title: string,
      description: string,
    ): ProtectionScenario | null => {
      if (type === 'DEFER') {
        return {
          type: 'DEFER',
          newPayment: 9800,
          newTerm: 30,
          description: description,
          title,
          impact: {
            paymentChange: 1800,
            termChange: 6,
            totalCostChange: 0,
          },
          details: ['Pago diferido'],
        };
      }

      if (type === 'STEPDOWN') {
        return {
          type: 'STEPDOWN',
          newPayment: 6000,
          newTerm: 28,
          description: description,
          title,
          impact: {
            paymentChange: -2000,
            termChange: 4,
            totalCostChange: 0,
          },
          details: ['Pago reducido'],
        };
      }

      return null;
    }
  );
}

class ToastStub {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  info = jasmine.createSpy('info');
}

describe('ProtectionSimulatorComponent', () => {
  let component: ProtectionSimulatorComponent;
  let fixture: ComponentFixture<ProtectionSimulatorComponent>;
  let protectionEngine: ProtectionEngineStub;
  let toast: ToastStub;

  const baseClient: Client = {
    id: 'client-1',
    name: 'Cliente Demo',
    flow: BusinessFlow.VentaPlazo,
    status: 'Activo',
    documents: [],
    events: [],
    paymentPlan: {
      monthlyPayment: 7800,
      term: 24,
      monthlyGoal: 0,
      currentMonthProgress: 15600,
    },
    remainderAmount: 120000,
    market: 'edomex',
  } as unknown as Client;

  beforeEach(async () => {
    protectionEngine = new ProtectionEngineStub();
    toast = new ToastStub();

    await TestBed.configureTestingModule({
      imports: [ProtectionSimulatorComponent, ReactiveFormsModule],
      providers: [
        { provide: FinancialCalculatorService, useClass: FinancialCalculatorStub },
        { provide: ProtectionEngineService, useValue: protectionEngine },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProtectionSimulatorComponent);
    component = fixture.componentInstance;
    component.client = { ...baseClient };
    component.configForm.setValue({ monthsAffected: '3', difficultyType: 'temporary' });
  });

  it('genera escenarios con la lógica del ProtectionEngine y normaliza los datos para la UI', () => {
    component.calculateScenarios();

    expect(protectionEngine.generateScenarioWithTIR).toHaveBeenCalledTimes(3);
    expect(component.scenarios.length).toBe(2);

    const [deferScenario, stepDownScenario] = component.scenarios;

    expect(deferScenario.title).toContain('Pausa');
    expect(deferScenario.monthlyPaymentBefore).toBe(7800);
    expect(deferScenario.monthlyPaymentAfter).toBe(9800);
    expect(deferScenario.savings).toBeGreaterThan(0);

    expect(stepDownScenario.type).toBe('STEPDOWN');
    expect(stepDownScenario.monthlyPaymentAfter).toBe(6000);
    expect(Array.isArray(stepDownScenario.benefits)).toBeTrue();
    expect(stepDownScenario.benefits?.length).toBeGreaterThan(0);

    expect(component.selectedScenario).toBe(component.scenarios[0]);
    expect(toast.success).toHaveBeenCalled();
  });

  it('muestra mensaje de error cuando faltan datos de cliente', () => {
    component.client = undefined;
    component.calculateScenarios();

    expect(component.scenarios.length).toBe(0);
    expect(toast.error).toHaveBeenCalled();
  });
});
