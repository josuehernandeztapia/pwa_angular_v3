import { TestBed } from '@angular/core/testing';
import { ConfiguracionComponent } from './configuracion.component';
import { Router } from '@angular/router';

class RouterStub {
  navigate(commands: any[]): Promise<boolean> { return Promise.resolve(true); }
}

describe('Data retention policy', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [{ provide: Router, useClass: RouterStub }]
    }).compileComponents();
  });

  it('should create component and have valid config', () => {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit

    // Test component creation and config initialization
    expect(component).toBeTruthy();
    expect(component.config()).toBeTruthy();
    expect(component.config().mode).toBe('cotizador');
    expect(component.config().precio).toBeGreaterThan(0);
  });
});


// removed by clean-audit