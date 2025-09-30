import { Title } from '@angular/platform-browser';
import { bootstrapApplication } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { isDevMode } from '@angular/core';

// Limit verbose logging in production builds - disabled for debugging
// if (!isDevMode()) {
//   const noop = () => {};
//   console.log = noop;
//   console.debug = noop;
//   console.info = noop;
//   console.trace = noop;
// }

bootstrapApplication(AppComponent, appConfig)
  .then(appRef => {
    const router = appRef.injector.get(Router);
    const title = appRef.injector.get(Title);
    router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (!title.getTitle()) {
          title.setTitle('Conductores PWA');
        }
      });
    const html = document.documentElement;
    if (!html.getAttribute('lang')) {
      html.setAttribute('lang', 'es-MX');
    }
  })
  .catch(err => {
    console.error('Error starting app:', err);
  });
