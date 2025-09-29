import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {

    // Get required roles and permissions from route data
    const requiredRoles: string[] = route.data['roles'] || [];
    const requiredPermissions: string[] = route.data['permissions'] || [];

    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          this.router.navigate(['/login']);
          return false;
        }

        // Check roles
        if (requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.some(role =>
            this.authService.hasRole(role)
          );

          if (!hasRequiredRole) {
            this.router.navigate(['/unauthorized']);
            return false;
          }
        }

        // Check permissions
        if (requiredPermissions.length > 0) {
          const hasRequiredPermission = requiredPermissions.some(permission =>
            this.authService.hasPermission(permission)
          );

          if (!hasRequiredPermission) {
            this.router.navigate(['/unauthorized']);
            return false;
          }
        }

        return true;
      })
    );
  }
}
