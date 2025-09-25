import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ConfiguracionComponent } from './configuracion.component';

const createInputEvent = (value: string | number, type: 'number' | 'text' = 'number'): Event => {
  const input = document.createElement('input');
  input.type = type;
  input.value = `${value}`;
  return { target: input } as unknown as Event;
};

const createSelectEvent = (value: string): Event => {
  const select = document.createElement('select');
  const option = new Option(value, value, true, true);
  select.add(option);
  select.value = value;
  return { target: select } as unknown as Event;
};

describe('ConfiguracionComponent', () => {
  let fixture: ComponentFixture<ConfiguracionComponent> | undefined;
  let component: ConfiguracionComponent | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component with initial configuration', () => {
    expect(component).toBeTruthy();
    expect(component!.config().mode).toBe('cotizador');
    expect(component!.config().precio).toBe(250000);
    expect(component!.productPackages.length).toBeGreaterThan(0);
  });

  it('should update mode and trigger recalculation', fakeAsync(() => {
    component!.setMode('simulador');
    expect(component!.config().mode).toBe('simulador');
    expect(component!.config().isCalculating).toBeTrue();

    tick(800);
    expect(component!.config().isCalculating).toBeFalse();
  }));

  it('should validate precio field and register errors when invalid', fakeAsync(() => {
    component!.updateConfig('precio', createInputEvent(0));
    expect(component!.config().errors['precio']).toBe('El precio debe ser mayor a 0');

    component!.updateConfig('precio', createInputEvent(500000));
    tick(800);
    expect(component!.config().errors['precio']).toBeUndefined();
    expect(component!.config().precio).toBe(500000);
  }));

  it('should update select-based configuration fields correctly', fakeAsync(() => {
    component!.updateConfigFromSelect('plazo', createSelectEvent('48'));
    expect(component!.config().plazo).toBe(48);

    component!.updateConfigFromSelect('tipoCliente', createSelectEvent('vip'));
    expect(component!.config().tipoCliente).toBe('vip');

    tick(800);
    expect(component!.config().isCalculating).toBeFalse();
  }));

  it('should select package and update financial results', fakeAsync(() => {
    component!.selectPackage('premium');
    expect(component!.config().selectedPackage).toBe('premium');

    tick(800);
    const results = component!.financialResults();
    expect(results).toBeTruthy();
    expect(results?.total).toBeGreaterThan(0);
  }));

  it('should compute consistent financial results for valid configuration', fakeAsync(() => {
    component!.updateConfig('precio', createInputEvent(300000));
    component!.updateConfig('enganche', createInputEvent(25));
    component!.updateConfigFromSelect('plazo', createSelectEvent('24'));

    tick(800);
    const results = component!.financialResults()!;

    expect(results).toEqual(jasmine.objectContaining({
      pmt: jasmine.any(Number),
      tasa: jasmine.any(Number),
      ahorro: jasmine.any(Number),
      total: jasmine.any(Number)
    }));

    // Ensure results are within expected ranges
    expect(results.pmt).toBeGreaterThan(0);
    expect(results.total).toBeGreaterThan(results.ahorro);
  }));
});

