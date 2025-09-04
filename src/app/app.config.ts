import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { LoadingInterceptor } from './interceptors/loading.interceptor';
import { ErrorHandlerService } from './services/error-handler.service';
import { ApiService } from './services/api.service';
import { HttpClientService } from './services/http-client.service';
import { environment } from '../environments/environment';
import { TESSERACT_CREATE_WORKER } from './tokens/ocr.tokens';
import { createWorker } from 'tesseract.js';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    },
    {
      provide: ErrorHandler,
      useClass: ErrorHandlerService
    },
    ApiService,
    HttpClientService
    ,
    {
      provide: TESSERACT_CREATE_WORKER,
      useValue: createWorker
    }
  ]
};
