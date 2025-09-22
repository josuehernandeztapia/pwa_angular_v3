/**
 * 🚀 Performance-Optimized Preloading Strategy
 * Intelligent route preloading based on user behavior and network conditions
 */

import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PerformancePreloadStrategy implements PreloadingStrategy {
  private preloadedRoutes = new Set<string>();
  private readonly criticalRoutes = [
    'dashboard',
    'clientes',
    'nueva-oportunidad',
    'cotizador',
    'onboarding'
  ];

  private readonly lowPriorityRoutes = [
    'lab',
    'reportes',
    'configuracion',
    'perfil'
  ];

  preload(route: Route, fn: () => Observable<any>): Observable<any> {
    const routePath = route.path || '';

    // Skip already preloaded routes
    if (this.preloadedRoutes.has(routePath)) {
      return of(null);
    }

    // Check if we should preload this route
    if (!this.shouldPreload(route)) {
      return of(null);
    }

    // Check network conditions
    if (!this.isNetworkSuitable()) {
      return of(null);
    }

    // Mark as preloaded
    this.preloadedRoutes.add(routePath);

    // Determine preload delay based on priority
    const delay = this.getPreloadDelay(route);

// removed by clean-audit

    return timer(delay).pipe(
      mergeMap(() => {
        try {
          return fn();
        } catch (error) {
// removed by clean-audit
          return of(null);
        }
      })
    );
  }

  private shouldPreload(route: Route): boolean {
    const routePath = route.path || '';

    // Don't preload if route has no loadComponent/loadChildren
    if (!route.loadComponent && !route.loadChildren) {
      return false;
    }

    // Always preload critical routes
    if (this.criticalRoutes.some(critical => routePath.includes(critical))) {
      return true;
    }

    // Don't preload low priority routes on slower connections
    if (this.lowPriorityRoutes.some(lowPri => routePath.includes(lowPri))) {
      return this.isHighSpeedConnection();
    }

    // Check if route has preload data
    if (route.data?.['preload'] === false) {
      return false;
    }

    // Default: preload after delay
    return true;
  }

  private getPreloadDelay(route: Route): number {
    const routePath = route.path || '';

    // Critical routes: immediate preload
    if (this.criticalRoutes.some(critical => routePath.includes(critical))) {
      return 100; // 100ms delay to avoid blocking initial render
    }

    // Low priority routes: longer delay
    if (this.lowPriorityRoutes.some(lowPri => routePath.includes(lowPri))) {
      return 5000; // 5 second delay
    }

    // Default delay
    return 2000; // 2 second delay
  }

  private isNetworkSuitable(): boolean {
    if (!navigator.connection) {
      return true; // Assume good connection if API not available
    }

    const connection = navigator.connection as any;
    const effectiveType = connection.effectiveType;
    const saveData = connection.saveData;

    // Don't preload on save-data mode
    if (saveData) {
      return false;
    }

    // Don't preload on slow connections
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return false;
    }

    return true;
  }

  private isHighSpeedConnection(): boolean {
    if (!navigator.connection) {
      return true; // Assume good connection
    }

    const connection = navigator.connection as any;
    const effectiveType = connection.effectiveType;

    return effectiveType === '4g' || effectiveType === '3g';
  }

  /**
   * Manually trigger preload for specific route
   */
  preloadRoute(routePath: string): void {
    // This would require access to router configuration
    // Implementation would depend on specific use case
// removed by clean-audit
  }

  /**
   * Get preload statistics
   */
  getStats(): { preloadedCount: number; preloadedRoutes: string[] } {
    return {
      preloadedCount: this.preloadedRoutes.size,
      preloadedRoutes: Array.from(this.preloadedRoutes)
    };
  }

  /**
   * Clear preload cache (useful for testing)
   */
  clearCache(): void {
    this.preloadedRoutes.clear();
  }
}
// removed by clean-audit