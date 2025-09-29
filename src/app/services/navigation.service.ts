import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Location } from '@angular/common';

export interface BreadcrumbItem {
  label: string;
  route?: string;
  icon?: string;
  iconType?: 'home' | 'money' | 'target' | 'users' | 'documents' | 'protection' | 'reports' | 'add' | 'truck' | 'handshake' | 'lightbulb' | 'bank' | 'snowflake';
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
  icon: string;
  iconType?: 'home' | 'money' | 'target' | 'users' | 'documents' | 'protection' | 'reports' | 'add' | 'truck' | 'handshake' | 'lightbulb' | 'bank' | 'snowflake' | 'user' | 'import';
  route?: string;
  action?: () => void;
  badge?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
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
        { label: 'Nueva Oportunidad', iconType: 'add' }
      ],
      showBackButton: true
    },
    '/cotizador': {
      title: 'Cotizador',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Cotizador', iconType: 'money' }
      ]
    },
    '/cotizador/ags-individual': {
      title: 'Cotizador AGS Individual',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Cotizador', route: '/cotizador', iconType: 'money' },
        { label: 'AGS Individual', iconType: 'truck' }
      ],
      showBackButton: true
    },
    '/cotizador/edomex-colectivo': {
      title: 'Cotizador EdoMex Colectivo',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Cotizador', route: '/cotizador', iconType: 'money' },
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
        { label: 'Tanda Colectiva', iconType: 'snowflake' }
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
        { label: 'Expedientes', iconType: 'documents' }
      ]
    },
    '/proteccion': {
      title: 'Protección Financiera',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Protección', iconType: 'protection' }
      ]
    },
    '/reportes': {
      title: 'Reportes y Análisis',
      breadcrumbs: [
        { label: 'Dashboard', route: '/dashboard', iconType: 'home' },
        { label: 'Reportes', iconType: 'reports' }
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
        const route = state.currentRoute;
        
        // Define quick actions based on current route
        switch (route) {
          case '/dashboard':
            return [
              {
                id: 'new-opportunity',
                label: 'Nueva Oportunidad',
                icon: 'plus-icon',
                iconType: 'add',
                route: '/nueva-oportunidad',
                color: 'primary' as const
              },
              {
                id: 'quick-quote',
                label: 'Cotización Rápida',
                icon: '',
                iconType: 'money',
                route: '/cotizador',
                color: 'success' as const
              },
              {
                id: 'simulator',
                label: 'Simulador',
                icon: '',
                iconType: 'target',
                route: '/simulador',
                color: 'secondary' as const
              }
            ];

          case '/clientes':
            return [
              {
                id: 'new-client',
                label: 'Nuevo Cliente',
                icon: '',
                iconType: 'user',
                color: 'primary' as const
              },
              {
                id: 'import-clients',
                label: 'Importar',
                icon: 'import-icon',
                iconType: 'import',
                color: 'secondary' as const
              }
            ];

          case '/cotizador':
            return [
              {
                id: 'ags-quote',
                label: 'AGS Individual',
                icon: 'truck-icon',
                iconType: 'truck',
                route: '/cotizador/ags-individual',
                color: 'primary' as const
              },
              {
                id: 'edomex-quote',
                label: 'EdoMex Colectivo',
                icon: 'handshake-icon',
                iconType: 'handshake',
                route: '/cotizador/edomex-colectivo',
                color: 'success' as const
              }
            ];

          case '/simulador':
            return [
              {
                id: 'ags-saving',
                label: 'AGS Ahorro',
                icon: 'lightbulb',
                iconType: 'lightbulb',
                route: '/simulador/ags-ahorro',
                color: 'warning' as const
              },
              {
                id: 'edomex-individual',
                label: 'EdoMex Individual',
                icon: 'bank-icon',
                iconType: 'bank',
                route: '/simulador/edomex-individual',
                color: 'primary' as const
              },
              {
                id: 'collective-tanda',
                label: 'Tanda Colectiva',
                icon: 'snowflake-icon',
                iconType: 'snowflake',
                route: '/simulador/tanda-colectiva',
                color: 'secondary' as const
              }
            ];

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
    this.getQuickActions().subscribe(actions => {
      const action = actions.find(a => a.id === actionId);
      if (action) {
        if (action.route) {
          this.navigateTo(action.route);
        } else if (action.action) {
          action.action();
        }
      }
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
