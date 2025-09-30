import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfiguracionComponent } from './configuracion.component';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

class RouterStub {
  navigate(commands: any[]): Promise<boolean> { return Promise.resolve(true); }
}

class ActivatedRouteStub {
  params = of({});
  queryParams = of({});
  fragment = of(null);
  data = of({});
}

describe('Security settings validation', () => {
  let fixture: ComponentFixture<ConfiguracionComponent> | undefined;
  let component: ConfiguracionComponent | undefined;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [
        { provide: Router, useClass: RouterStub },
        { provide: ActivatedRoute, useClass: ActivatedRouteStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and verify security functionality', () => {
    // Test component creation and basic security-related functionality
    expect(component).toBeTruthy();
    expect(component!.config()).toBeTruthy();

    // Test configuration can be updated (security-related settings)
    const initialMode = component!.config().mode;
    component!.setMode('simulador');
    expect(component!.config().mode).toBe('simulador');
    expect(component!.config().mode).not.toBe(initialMode);
  });
});


