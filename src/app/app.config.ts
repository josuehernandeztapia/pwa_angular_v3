import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { LucideAngularModule, BarChart, Calculator, LineChart, Shield, Mic, FileText, Truck, Settings, Activity, LogOut, HelpCircle } from 'lucide-angular';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { LoadingInterceptor } from './interceptors/loading.interceptor';
import { ApiService } from './services/api.service';
import { ErrorHandlerService } from './services/error-handler.service';
import { HttpClientService } from './services/http-client.service';
import { TESSERACT_CREATE_WORKER } from './tokens/ocr.tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    // Keep route-based code-splitting; avoid global preloading to improve LCP
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
    HttpClientService,
    importProvidersFrom(LucideAngularModule.pick({ BarChart, Calculator, LineChart, Shield, Mic, FileText, Truck, Settings, Activity, LogOut, HelpCircle })),
    {
      provide: TESSERACT_CREATE_WORKER,
      useFactory: () => {
        // Lazy load tesseract.js only when needed
        return async (...args: any[]) => {
          const { createWorker } = await import('tesseract.js');
          return createWorker(...args);
        };
      }
    }
  ]
};
