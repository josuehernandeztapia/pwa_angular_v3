import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { isDevMode } from '@angular/core';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    if (!isDevMode() && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/ngsw-worker.js')
        .then(registration => {
          console.log('Service Worker registered successfully', registration);
        })
        .catch(error => {
          console.log('Service Worker registration failed', error);
        });
    }
  })
  .catch((err) => console.error(err));
