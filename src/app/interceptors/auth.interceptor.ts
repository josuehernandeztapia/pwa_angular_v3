import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Add authentication token to requests
    let authRequest = request;
    const token = this.authService.getToken();

    if (token && !this.isPublicUrl(request.url)) {
      authRequest = this.addToken(request, token);
    }

    // Add request logging only in development (no sensitive data)
    if (!environment.production && !request.url.includes('assets/') && typeof window !== 'undefined' && (window as any).ng && (window as any).ng.probe) {
      console.log(`🌐 HTTP ${request.method} ${request.url}`);
    }

    return next.handle(authRequest).pipe(
      tap((event: HttpEvent<unknown>) => {
        if (!environment.production && event instanceof HttpResponse && !request.url.includes('assets/') && typeof window !== 'undefined' && (window as any).ng && (window as any).ng.probe) {
          console.log(`✅ HTTP ${request.method} ${request.url} - ${event.status}`);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`❌ HTTP ${request.method} ${request.url} - ${error.status}`, error);

        if (error.status === 401) {
          return this.handle401Error(authRequest, next);
        } else if (error.status === 403) {
          return this.handle403Error();
        } else if (error.status >= 500) {
          return this.handle5xxError(error);
        } else if (error.status === 0) {
          return this.handleNetworkError();
        }

        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': '1.0.0',
        'X-Client-Platform': 'web'
      }
    });
  }

  private isPublicUrl(url: string): boolean {
    const publicUrls = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/public/',
      'assets/'
    ];

    return publicUrls.some(publicUrl => url.includes(publicUrl));
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        return this.authService.refreshToken().pipe(
          switchMap((response) => {
            this.isRefreshing = false;
            const newToken = response?.token;
            
            if (!newToken) {
              throw new Error('Invalid token refresh response');
            }
            
            this.refreshTokenSubject.next(newToken);
            return next.handle(this.addToken(request, newToken));
          }),
          catchError((error) => {
            this.isRefreshing = false;
            this.authService.logout();
            this.router.navigate(['/login']);
            return throwError(() => new Error('Session expired. Please login again.'));
          })
        );
      } else {
        this.isRefreshing = false;
        this.authService.logout();
        this.router.navigate(['/login']);
        return throwError(() => new Error('No refresh token available.'));
      }
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(jwt => {
          return next.handle(this.addToken(request, jwt));
        })
      );
    }
  }

  private handle403Error(): Observable<never> {
    // User is authenticated but doesn't have permission
    this.router.navigate(['/unauthorized']);
    return throwError(() => new Error('Access denied. You do not have permission to access this resource.'));
  }

  private handle5xxError(error: HttpErrorResponse): Observable<never> {
    // Server error
    const userMessage = 'Server error. Please try again later.';
    
    // Log detailed error for debugging
    console.error('Server Error Details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error
    });

    // Show user-friendly message
    this.showErrorToast(userMessage);

    return throwError(() => new Error(userMessage));
  }

  private handleNetworkError(): Observable<never> {
    // Network/connectivity error
    const userMessage = 'Network error. Please check your internet connection.';
    
    console.error('Network Error: No internet connection or server unreachable');
    this.showErrorToast(userMessage);

    return throwError(() => new Error(userMessage));
  }

  private showErrorToast(message: string): void {
    // This would typically integrate with a toast/notification service
    console.warn('Error Toast:', message);
    
    // Simple fallback notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Conductores PWA', {
        body: message,
        icon: '/assets/icons/icon-192x192.png'
      });
    }
  }
}