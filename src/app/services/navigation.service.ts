import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { Location } from '@angular/common';
import { IconName } from '../components/shared/icon/icon-definitions';

export interface BreadcrumbItem {
  label: string;
  route?: string;
  icon?: IconName;
  iconType?: IconName;
  params?: any;
}

export interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  breadcrumbs: BreadcrumbItem[];
  pageTitle: string;
  showBackButton: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: IconName;
  iconType?: IconName;
  route?: string;
  queryParams?: Record<string, any>;
  action?: () => void;
  badge?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  tooltip?: string;
  active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private navigationState = new BehaviorSubject<NavigationState>({
    currentRoute: '/',
    previousRoute: null,
    breadcrumbs: [],
    pageTitle: 'Conductores PWA',
    showBackButton: false
  });

  private routeHistory: string[] = [];
  private maxHistoryLength = 10;

  public navigationState$ = this.navigationState.asObservable();

  // Route configurations for breadcrumbs and titles
  private routeConfig: Record<string, {
    title: string;
    breadcrumbs?: BreadcrumbItem[];
    showBackButton?: boolean;
  }> = {
    '/dashboard': {
      title: 'Panel Principal',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' }
      ]
    },
    '/nueva-oportunidad': {
      title: 'Nueva Oportunidad',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Nueva Oportunidad', iconType: 'plus' }
      ],
      showBackButton: true
    },
    '/cotizador': {
      title: 'Cotizador',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Cotizador', iconType: 'currency-dollar' }
      ]
    },
    '/cotizador/ags-individual': {
      title: 'Cotizador AGS Individual',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Cotizador', route: '/cotizador', iconType: 'currency-dollar' },
        { label: 'AGS Individual', iconType: 'truck' }
      ],
      showBackButton: true
    },
    '/cotizador/edomex-colectivo': {
      title: 'Cotizador EdoMex Colectivo',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Cotizador', route: '/cotizador', iconType: 'currency-dollar' },
        { label: 'EdoMex Colectivo', iconType: 'handshake' }
      ],
      showBackButton: true
    },
    '/simulador': {
      title: 'Simulador de Escenarios',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Simulador', iconType: 'target' }
      ]
    },
    '/simulador/ags-ahorro': {
      title: 'Simulador AGS Ahorro',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Simulador', route: '/simulador', iconType: 'target' },
        { label: 'AGS Ahorro', iconType: 'lightbulb' }
      ],
      showBackButton: true
    },
    '/simulador/edomex-individual': {
      title: 'Simulador EdoMex Individual',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Simulador', route: '/simulador', iconType: 'target' },
        { label: 'EdoMex Individual', iconType: 'bank' }
      ],
      showBackButton: true
    },
    '/simulador/tanda-colectiva': {
      title: 'Simulador Tanda Colectiva',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Simulador', route: '/simulador', iconType: 'target' },
        { label: 'Tanda Colectiva', iconType: 'snow' }
      ],
      showBackButton: true
    },
    '/clientes': {
      title: 'Gestión de Clientes',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Clientes', iconType: 'users' }
      ]
    },
    '/expedientes': {
      title: 'Expedientes Digitales',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Expedientes', iconType: 'document-text' }
      ]
    },
    '/proteccion': {
      title: 'Protección Financiera',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Protección', iconType: 'shield' }
      ]
    },
    '/reportes': {
      title: 'Reportes y Análisis',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Reportes', iconType: 'chart' }
      ]
    }
  };

  constructor(
    private router: Router,
    private location: Location,
    private activatedRoute: ActivatedRoute
  ) {
    this.initializeNavigation();
  }

  /**
   * Initialize navigation tracking
   */
  private initializeNavigation(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navigationEndEvent = event as NavigationEnd;
      this.updateNavigationState(navigationEndEvent.urlAfterRedirects);
    });
  }

  /**
   * Update navigation state based on current route
   */
  private updateNavigationState(url: string): void {
    const currentState = this.navigationState.value;
    const previousRoute = (currentState.currentRoute && currentState.currentRoute !== '/' && currentState.currentRoute !== url)
      ? currentState.currentRoute
      : null;

    // Update route history
    if (previousRoute) {
      this.routeHistory.push(previousRoute);
      if (this.routeHistory.length > this.maxHistoryLength) {
        this.routeHistory.shift();
      }
    }

    // Get route configuration
    const config = this.routeConfig[url] || {
      title: 'Conductores PWA',
      breadcrumbs: [{ label: 'Dashboard', route: '/dashboard', iconType: 'home' }],
      showBackButton: false
    };

    // Update navigation state
    this.navigationState.next({
      currentRoute: url,
      previousRoute,
      breadcrumbs: config.breadcrumbs || [],
      pageTitle: config.title,
      showBackButton: config.showBackButton || false
    });
  }

  /**
   * Navigate to a specific route
   */
  navigateTo(route: string, queryParams?: any, fragment?: string): Promise<boolean> {
    return this.router.navigate([route], { queryParams, fragment });
  }

  /**
   * Navigate back to previous route
   */
  navigateBack(): void {
    if (this.routeHistory.length > 0) {
      const previousRoute = this.routeHistory.pop();
      if (previousRoute) {
        this.router.navigate([previousRoute]);
        return;
      }
    }
    
    // Fallback to browser back or dashboard
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Navigate to dashboard
   */
  navigateHome(): Promise<boolean> {
    return this.router.navigate(['/dashboard']);
  }

  /**
   * Get current page title
   */
  getCurrentPageTitle(): Observable<string> {
    return this.navigationState$.pipe(
      map(state => state.pageTitle)
    );
  }

  /**
   * Get current breadcrumbs
   */
  getCurrentBreadcrumbs(): Observable<BreadcrumbItem[]> {
    return this.navigationState$.pipe(
      map(state => state.breadcrumbs)
    );
  }

  /**
   * Check if back button should be shown
   */
  shouldShowBackButton(): Observable<boolean> {
    return this.navigationState$.pipe(
      map(state => state.showBackButton)
    );
  }

  /**
   * Get quick actions for current route
   */
  getQuickActions(): Observable<QuickAction[]> {
    return this.navigationState$.pipe(
      map(state => {
        const route = state.currentRoute === '/' ? '/dashboard' : state.currentRoute;
        
        // Define quick actions based on current route
        switch (route) {
          case '/dashboard':
            return this.markCurrentRoute(route, [
              {
                id: 'new-opportunity',
                label: 'Nueva Oportunidad',
                icon: 'plus',
                iconType: 'plus',
                route: '/nueva-oportunidad',
                color: 'primary' as const,
                tooltip: 'Crear una nueva oportunidad'
              },
              {
                id: 'quick-quote',
                label: 'Cotización Rápida',
                icon: 'currency-dollar',
                iconType: 'currency-dollar',
                route: '/cotizador',
                queryParams: { source: 'quick-action', view: 'new-quote' },
                color: 'success' as const,
                tooltip: 'Abrir el cotizador con el flujo rápido'
              },
              {
                id: 'simulator',
                label: 'Simulador',
                icon: 'target',
                iconType: 'target',
                route: '/simulador',
                queryParams: { source: 'quick-action' },
                color: 'secondary' as const,
                tooltip: 'Ir al simulador de escenarios'
              }
            ]);

          case '/clientes':
            return this.markCurrentRoute(route, [
              {
                id: 'new-client',
                label: 'Nuevo Cliente',
                icon: 'user',
                iconType: 'user',
                route: '/clientes/nuevo',
                queryParams: { source: 'quick-action' },
                color: 'primary' as const,
                tooltip: 'Registrar un nuevo cliente'
              },
              {
                id: 'import-clients',
                label: 'Importar',
                icon: 'download-tray',
                iconType: 'download-tray',
                route: '/clientes',
                queryParams: { view: 'import', source: 'quick-action' },
                color: 'secondary' as const,
                tooltip: 'Importar clientes desde archivo'
              }
            ]);

          case '/cotizador':
            return this.markCurrentRoute(route, [
              {
                id: 'ags-quote',
                label: 'AGS Individual',
                icon: 'truck',
                iconType: 'truck',
                route: '/cotizador/ags-individual',
                queryParams: { source: 'quick-action' },
                color: 'primary' as const,
                tooltip: 'Cotizar plan individual de Aguascalientes'
              },
              {
                id: 'edomex-quote',
                label: 'EdoMex Colectivo',
                icon: 'handshake',
                iconType: 'handshake',
                route: '/cotizador/edomex-colectivo',
                queryParams: { source: 'quick-action' },
                color: 'success' as const,
                tooltip: 'Cotizar plan colectivo Estado de México'
              }
            ]);

          case '/simulador':
            return this.markCurrentRoute(route, [
              {
                id: 'ags-saving',
                label: 'AGS Ahorro',
                icon: 'lightbulb',
                iconType: 'lightbulb',
                route: '/simulador/ags-ahorro',
                queryParams: { source: 'quick-action' },
                color: 'warning' as const,
                tooltip: 'Comparar escenarios de ahorro AGS'
              },
              {
                id: 'edomex-individual',
                label: 'EdoMex Individual',
                icon: 'bank',
                iconType: 'bank',
                route: '/simulador/edomex-individual',
                queryParams: { source: 'quick-action' },
                color: 'primary' as const,
                tooltip: 'Escenario individual Estado de México'
              },
              {
                id: 'collective-tanda',
                label: 'Tanda Colectiva',
                icon: 'snow',
                iconType: 'snow',
                route: '/simulador/tanda-colectiva',
                queryParams: { source: 'quick-action' },
                color: 'secondary' as const,
                tooltip: 'Simular una tanda colectiva'
              }
            ]);

          default:
            return [];
        }
      })
    );
  }

  /**
   * Execute quick action
   */
  executeQuickAction(actionId: string): void {
    // Find the action and execute it
    this.getQuickActions().pipe(take(1)).subscribe(actions => {
      const action = actions.find(a => a.id === actionId);
      if (action) {
        if (action.disabled) {
          return;
        }
        if (action.route) {
          this.navigateTo(action.route, action.queryParams);
        } else if (action.action) {
          action.action();
        }
      }
    });
  }

  private markCurrentRoute(currentRoute: string, actions: QuickAction[]): QuickAction[] {
    const normalized = currentRoute.split('?')[0];

    return actions.map(action => {
      if (!action.route) {
        return action;
      }

      const isCurrent = normalized === action.route || normalized.startsWith(`${action.route}/`);

      return {
        ...action,
        disabled: isCurrent,
        active: isCurrent
      };
    });
  }

  /**
   * Check if current route matches pattern
   */
  isCurrentRoute(routePattern: string): Observable<boolean> {
    return this.navigationState$.pipe(
      map(state => {
        if (routePattern.includes('*')) {
          const pattern = routePattern.replace('*', '.*');
          return new RegExp(`^${pattern}$`).test(state.currentRoute);
        }
        return state.currentRoute === routePattern;
      })
    );
  }

  /**
   * Get route parameters
   */
  getRouteParams(): Observable<any> {
    return this.activatedRoute.params;
  }

  /**
   * Get query parameters
   */
  getQueryParams(): Observable<any> {
    return this.activatedRoute.queryParams;
  }

  /**
   * Update page title dynamically
   */
  setPageTitle(title: string): void {
    const currentState = this.navigationState.value;
    this.navigationState.next({
      ...currentState,
      pageTitle: title
    });
    
    // Also update document title
    document.title = `${title} - Conductores PWA`;
  }

  /**
   * Update breadcrumbs dynamically
   */
  setBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
    const currentState = this.navigationState.value;
    this.navigationState.next({
      ...currentState,
      breadcrumbs
    });
  }

  /**
   * Show/hide back button
   */
  setShowBackButton(show: boolean): void {
    const currentState = this.navigationState.value;
    this.navigationState.next({
      ...currentState,
      showBackButton: show
    });
  }

  /**
   * Get navigation history
   */
  getNavigationHistory(): string[] {
    return [...this.routeHistory];
  }

  /**
   * Clear navigation history
   */
  clearNavigationHistory(): void {
    this.routeHistory = [];
  }
}
