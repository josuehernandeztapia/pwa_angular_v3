import { TestBed } from '@angular/core/testing';
import { ConfiguracionComponent } from './configuracion.component';
import { Router } from '@angular/router';

class RouterStub {
  navigate(commands: any[]): Promise<boolean> { return Promise.resolve(true); }
}

describe('ConfiguracionComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [{ provide: Router, useClass: RouterStub }]
    }).compileComponents();
  });

  it('should save and load configuration from localStorage', () => {
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onSettingChange('language', 'en');

    const saved = JSON.parse(localStorage.getItem('app-configuration') || '{}');
    expect(saved.language).toBe('en');

    // Reload component to verify loadConfiguration populates values
    const fixture2 = TestBed.createComponent(ConfiguracionComponent);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();
    const general = component2.configSections.find(s => s.id === 'general');
    const langSetting = general?.settings.find(s => s.key === 'language');
    expect(langSetting?.value).toBe('en');
  });

  it('should apply theme switching by setting data-theme on :root', () => {
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onSettingChange('theme', 'light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    component.onSettingChange('theme', 'dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should open Flow Builder modal when enabled', () => {
    const fixture = TestBed.createComponent(ConfiguracionComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isFlowBuilderEnabled).toBeTrue();
    component.openFlowBuilder();
    expect(component.showFlowBuilderModal).toBeTrue();
    component.closeFlowBuilderModal();
    expect(component.showFlowBuilderModal).toBeFalse();
  });
});

