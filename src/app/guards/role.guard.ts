import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { Observable, of } from 'rxjs';
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
            console.warn('User does not have required role:', requiredRoles);
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
            console.warn('User does not have required permission:', requiredPermissions);
            this.router.navigate(['/unauthorized']);
            return false;
          }
        }

        return true;
      })
    );
  }
}