import { Injectable } from '@angular/core';

type FontScale = 'base' | 'sm' | 'lg';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly FONT_KEY = 'ux.pref.fontScale';
  private readonly HC_KEY = 'ux.pref.hc';

  constructor() {
    this.applyStoredPreferences();
  }

  getFontScale(): FontScale {
    const stored = localStorage.getItem(this.FONT_KEY) as FontScale | null;
    return stored || 'base';
  }

  setFontScale(scale: FontScale): void {
    localStorage.setItem(this.FONT_KEY, scale);
    this.applyFontScale(scale);
  }

  getHighContrast(): boolean {
    const stored = localStorage.getItem(this.HC_KEY);
    return stored === '1';
  }

  setHighContrast(enabled: boolean): void {
    localStorage.setItem(this.HC_KEY, enabled ? '1' : '0');
    this.applyHighContrast(enabled);
  }

  private applyStoredPreferences(): void {
    this.applyFontScale(this.getFontScale());
    this.applyHighContrast(this.getHighContrast());
  }

  private applyFontScale(scale: FontScale): void {
    const html = document.documentElement;
    html.classList.remove('senior-sm', 'senior-lg');
    if (scale === 'sm') {
      html.classList.add('senior-sm');
    } else if (scale === 'lg') {
      html.classList.add('senior-lg');
    }
  }

  private applyHighContrast(enabled: boolean): void {
    const html = document.documentElement;
    html.classList.toggle('hc', enabled);
  }
}

