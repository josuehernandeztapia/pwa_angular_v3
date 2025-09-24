import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ConfiguracionComponent } from './configuracion.component';

const createInputEvent = (value: string | number, type: 'number' | 'text' = 'number'): Event => {
  const input = document.createElement('input');
  input.type = type;
  input.value = `${value}`;
  return { target: input } as unknown as Event;
};

const createSelectEvent = (value: string): Event => {
  const select = document.createElement('select');
  select.value = value;
  return { target: select } as unknown as Event;
};

describe('ConfiguracionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent]
    }).compileComponents();
  });

  it('should create component with initial configuration', () => {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit

    expect(component).toBeTruthy();
    expect(component.config().mode).toBe('cotizador');
    expect(component.config().precio).toBe(250000);
    expect(component.productPackages.length).toBeGreaterThan(0);
  });

  it('should update mode and trigger recalculation', fakeAsync(() => {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit

    component.setMode('simulador');
    expect(component.config().mode).toBe('simulador');
    expect(component.config().isCalculating).toBeTrue();

    tick(800);
    expect(component.config().isCalculating).toBeFalse();
  }));

  it('should validate precio field and register errors when invalid', fakeAsync(() => {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit

    component.updateConfig('precio', createInputEvent(0));
    expect(component.config().errors['precio']).toBe('El precio debe ser mayor a 0');

    component.updateConfig('precio', createInputEvent(500000));
    tick(800);
    expect(component.config().errors['precio']).toBeUndefined();
    expect(component.config().precio).toBe(500000);
  }));

  it('should update select-based configuration fields correctly', fakeAsync(() => {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit

    component.updateConfigFromSelect('plazo', createSelectEvent('48'));
    expect(component.config().plazo).toBe(48);

    component.updateConfigFromSelect('tipoCliente', createSelectEvent('vip'));
    expect(component.config().tipoCliente).toBe('vip');

    tick(800);
    expect(component.config().isCalculating).toBeFalse();
  }));

  it('should select package and update financial results', fakeAsync(() => {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit

    component.selectPackage('premium');
    expect(component.config().selectedPackage).toBe('premium');

    tick(800);
    const results = component.financialResults();
    expect(results).toBeTruthy();
    expect(results?.total).toBeGreaterThan(0);
  }));

  it('should compute consistent financial results for valid configuration', fakeAsync(() => {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit

    component.updateConfig('precio', createInputEvent(300000));
    component.updateConfig('enganche', createInputEvent(25));
    component.updateConfigFromSelect('plazo', createSelectEvent('24'));

    tick(800);
    const results = component.financialResults();

    expect(results).toEqual(jasmine.objectContaining({
      pmt: jasmine.any(Number),
      tasa: jasmine.any(Number),
      ahorro: jasmine.any(Number),
      total: jasmine.any(Number)
    }));

    // Ensure results are within expected ranges
    expect(results!.pmt).toBeGreaterThan(0);
    expect(results!.total).toBeGreaterThan(results!.ahorro);
  }));
});

// removed by clean-audit