import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const flagConfig = route.data?.['featureFlag'] ?? route.data?.['featureFlags'];
    const requiredFlags: string[] = Array.isArray(flagConfig)
      ? flagConfig
      : flagConfig
        ? [flagConfig]
        : [];

    if (requiredFlags.length === 0) {
      return true;
    }

    const isEnabled = requiredFlags.every(flag => (environment.features as Record<string, boolean | undefined>)[flag] === true);

    if (isEnabled) {
      return true;
    }

    this.router.navigate(['/unauthorized']);
    return false;
  }
}
