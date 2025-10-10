import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild,
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuthStatus(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.canActivate(childRoute, state);
  }

  private checkAuthStatus(url: string): Observable<boolean> {
    if (environment.testing && environment.bypassAuth) {
      return of(true);
    }

    return this.authService.isAuthenticated$.pipe(
      tap(isAuthenticated => {
        if (!isAuthenticated) {
          this.handleUnauthenticatedUser(url);
        }
      }),
      map(isAuthenticated => {
        // Additional check for token expiration
        if (isAuthenticated && this.authService.isTokenExpired()) {
          this.attemptTokenRefresh();
          return false;
        }
        return isAuthenticated;
      }),
      catchError(error => {
        this.handleUnauthenticatedUser(url);
        return of(false);
      })
    );
  }

  private handleUnauthenticatedUser(attemptedUrl: string): void {
    // Store the attempted URL for redirect after login
    if (attemptedUrl && attemptedUrl !== '/') {
      localStorage.setItem('redirectUrl', attemptedUrl);
    }
    
    // Navigate to login page
    this.router.navigate(['/login']);
  }

  private attemptTokenRefresh(): void {
    this.authService.refreshToken().subscribe({
      next: () => {
        // Token refresh successful, user can continue
      },
      error: (error) => {
        // Token refresh failed, redirect to login
        this.router.navigate(['/login']);
      }
    });
  }
}
