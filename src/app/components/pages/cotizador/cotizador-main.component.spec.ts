import { TestBed } from '@angular/core/testing';
import { CotizadorMainComponent } from './cotizador-main.component';
import { ToastService } from '../../../services/toast.service';

describe('CotizadorMainComponent – PMT and Amortization', () => {
  let component: CotizadorMainComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CotizadorMainComponent],
      providers: [
        { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {} } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(CotizadorMainComponent);
    component = fixture.componentInstance;
    // Minimal pkg to compute prices
    (component as any).pkg = {
      rate: 0.255, // 25.5% anual
      terms: [24, 36],
      minDownPaymentPercentage: 0.2,
      components: [
        { id: 'vehiculo', name: 'Unidad', price: 500000, isOptional: false, isMultipliedByTerm: false }
      ]
    };
    // Select defaults
    (component as any).selectedOptions = { vehiculo: true };
    (component as any).term = 24;
    (component as any).downPaymentPercentage = 20; // 20%
  });

  function withinTolerance(actual: number, expected: number): boolean {
    const delta = Math.abs(actual - expected);
    return delta <= Math.max(25, expected * 0.005);
  }

  it('computes monthly PMT within tolerance', () => {
    const totalPrice = component.totalPrice; // 500,000
    const amountToFinance = component.amountToFinance; // 400,000

    const monthlyRate = (component as any).pkg.rate / 12; // simple division as in component
    const expectedPMT = (amountToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -component.term));

    expect(withinTolerance(component.monthlyPayment, expectedPMT)).toBeTrue();
  });

  it('computes first row I1, K1, S1 correctly', () => {
    const af = component.amountToFinance;
    const r = (component as any).pkg.rate / 12;
    const pmt = component.monthlyPayment;
    const expectedI1 = af * r;
    const expectedK1 = Math.max(0, pmt - expectedI1);
    const expectedS1 = Math.max(0, af - expectedK1);

    expect(withinTolerance(component.firstInterest, expectedI1)).toBeTrue();
    expect(withinTolerance(component.firstPrincipal, expectedK1)).toBeTrue();
    expect(withinTolerance(component.firstBalance, expectedS1)).toBeTrue();
  });

  it('builds amortization table with matching first row', () => {
    (component as any).calculateAmortization();
    const table = (component as any).amortizationTable as Array<any>;
    expect(table.length).toBeGreaterThan(0);
    const row1 = table[0];

    const af = component.amountToFinance;
    const r = (component as any).pkg.rate / 12;
    const pmt = component.monthlyPayment;
    const I1 = af * r;
    const K1 = Math.max(0, pmt - I1);
    const S1 = Math.max(0, af - K1);

    expect(withinTolerance(row1.interest, I1)).toBeTrue();
    expect(withinTolerance(row1.principal, K1)).toBeTrue();
    expect(withinTolerance(row1.balance, S1)).toBeTrue();
  });
});

