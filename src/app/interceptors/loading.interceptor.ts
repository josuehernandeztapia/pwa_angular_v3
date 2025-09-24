import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private activeRequests = 0;
  private readonly skipLoadingUrls = [
    '/api/heartbeat',
    '/api/health',
    '/api/ping',
    'assets/',
    '.json'
  ];

  constructor(private loadingService: LoadingService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip loading indicator for certain URLs
    if (this.shouldSkipLoading(request.url)) {
      return next.handle(request);
    }

    // Increment active requests counter
    this.activeRequests++;
    
    // Show loading indicator if this is the first request
    if (this.activeRequests === 1) {
      this.loadingService.show();
    }

    const startTime = Date.now();

    return next.handle(request).pipe(
      tap({
        next: (event: HttpEvent<unknown>) => {
          if (event instanceof HttpResponse) {
            const duration = Date.now() - startTime;
          }
        },
        error: (error: HttpErrorResponse) => {
          const duration = Date.now() - startTime;
        }
      }),
      finalize(() => {
        // Decrement active requests counter
        this.activeRequests--;
        
        // Hide loading indicator if no more active requests
        if (this.activeRequests === 0) {
          this.loadingService.hide();
        }
      })
    );
  }

  private shouldSkipLoading(url: string): boolean {
    return this.skipLoadingUrls.some(skipUrl => url.includes(skipUrl));
  }
}
