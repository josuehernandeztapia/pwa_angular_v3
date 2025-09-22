import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { isDevMode } from '@angular/core';

// Limit verbose logging in production builds
if (!isDevMode()) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.trace = noop;
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => {})
// removed by clean-audit

// removed by clean-audit