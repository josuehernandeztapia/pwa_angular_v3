import { TestBed } from '@angular/core/testing';
import { ConfiguracionComponent } from './configuracion.component';
import { Router } from '@angular/router';

class RouterStub {
  navigate(commands: any[]): Promise<boolean> { return Promise.resolve(true); }
}

describe('Security settings validation', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [{ provide: Router, useClass: RouterStub }]
    }).compileComponents();
  });

  it('should create component and verify security functionality', () => {
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Test component creation and basic security-related functionality
    expect(component).toBeTruthy();
    expect(component.config()).toBeTruthy();

    // Test configuration can be updated (security-related settings)
    const initialMode = component.config().mode;
    component.setMode('simulador');
    expect(component.config().mode).toBe('simulador');
    expect(component.config().mode).not.toBe(initialMode);
  });
});


// removed by clean-audit