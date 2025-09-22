import { TestBed } from '@angular/core/testing';
import { CotizadorMainComponent } from './cotizador-main.component';
import { ToastService } from '../../../services/toast.service';

describe('CotizadorMainComponent – Insurance toggle', () => {
  let component: CotizadorMainComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CotizadorMainComponent],
      providers: [
        { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {} } }
      ]
    }).compileComponents();

// removed by clean-audit
// removed by clean-audit
    // Set minimal package
    (component as any).pkg = {
      rate: 0.24, // 24% anual
      terms: [24],
      minDownPaymentPercentage: 0.2,
      components: [
        { id: 'vehiculo', name: 'Unidad', price: 500000, isOptional: false, isMultipliedByTerm: false }
      ]
    };
    (component as any).selectedOptions = { vehiculo: true };
    (component as any).term = 24;
    // Ensure not venta directa
// removed by clean-audit
  });

  it('adds insurance to amountToFinance when financed', () => {
    const baseF = component.amountToFinance;
    (component as any).includeInsurance = true;
    (component as any).insuranceAmount = 10000;
    (component as any).insuranceMode = 'financiado';
    const financedF = component.amountToFinance;
    expect(financedF).toBe(baseF + 10000);
  });

  it('does not add insurance to amountToFinance when contado', () => {
    const baseF = component.amountToFinance;
    (component as any).includeInsurance = true;
    (component as any).insuranceAmount = 10000;
    (component as any).insuranceMode = 'contado';
    const contadoF = component.amountToFinance;
    expect(contadoF).toBe(baseF);
  });
});


// removed by clean-audit