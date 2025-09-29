import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const APP_NAME = 'Conductores PWA';

@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const resolved = this.buildTitle(snapshot);
    const nextTitle = resolved && resolved.trim().length > 0 ? resolved : APP_NAME;
    this.title.setTitle(nextTitle);
  }
}
