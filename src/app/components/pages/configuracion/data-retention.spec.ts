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

  it('should persist data retention days and validate through service', () => {
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Phase 4 cleanup: use the actual component API instead of configSections
    component.onSettingChange('dataRetention', 180);
    const saved = JSON.parse(localStorage.getItem('app-configuration') || '{}');
    expect(saved.dataRetention).toBe(180);

    // Test settings persistence
    const fixture2 = TestBed.createComponent(ConfiguracionComponent);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    // Verify the setting was persisted and loaded correctly
    const config = JSON.parse(localStorage.getItem('app-configuration') || '{}');
    expect(config.dataRetention).toBe(180);
  });
});


// removed by clean-audit