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

  it('should persist 2FA and encryption toggles and session timeout', () => {
// removed by clean-audit
// removed by clean-audit
// removed by clean-audit

    component.onSettingChange('twoFactorAuth', true);
    component.onSettingChange('dataEncryption', true);
    component.onSettingChange('sessionTimeout', 45);

    const saved = JSON.parse(localStorage.getItem('app-configuration') || '{}');
    expect(saved.twoFactorAuth).toBeTrue();
    expect(saved.dataEncryption).toBeTrue();
    expect(saved.sessionTimeout).toBe(45);
  });
});


// removed by clean-audit