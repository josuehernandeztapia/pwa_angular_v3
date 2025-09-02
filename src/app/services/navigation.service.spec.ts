import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { NavigationService, BreadcrumbItem, QuickAction } from './navigation.service';

describe('NavigationService', () => {
  let service: NavigationService;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockLocation: jasmine.SpyObj<Location>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockLocation = jasmine.createSpyObj('Location', ['back']);
    mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', [], {
      params: of({}),
      queryParams: of({})
    });

    // Mock router events
    Object.defineProperty(mockRouter, 'events', {
      value: of(new NavigationEnd(1, '/dashboard', '/dashboard')),
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        { provide: Router, useValue: mockRouter },
        { provide: Location, useValue: mockLocation },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    });

    service = TestBed.inject(NavigationService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default navigation state', (done) => {
      service.navigationState$.subscribe(state => {
        expect(state.currentRoute).toBe('/dashboard');
        expect(state.previousRoute).toBeNull();
        expect(state.pageTitle).toBe('Panel Principal');
        expect(state.breadcrumbs.length).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('Navigation Methods', () => {
    it('should navigate to specified route', async () => {
      mockRouter.navigate.and.returnValue(Promise.resolve(true));

      const result = await service.navigateTo('/clientes');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes'], { queryParams: undefined, fragment: undefined });
      expect(result).toBe(true);
    });

    it('should navigate with query parameters', async () => {
      mockRouter.navigate.and.returnValue(Promise.resolve(true));

      const result = await service.navigateTo('/clientes', { filter: 'active' }, 'section1');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes'], { 
        queryParams: { filter: 'active' }, 
        fragment: 'section1' 
      });
      expect(result).toBe(true);
    });

    it('should navigate home', async () => {
      mockRouter.navigate.and.returnValue(Promise.resolve(true));

      const result = await service.navigateHome();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
      expect(result).toBe(true);
    });
  });

  describe('Back Navigation', () => {
    it('should navigate back using route history', () => {
      // Simulate navigation history
      service['routeHistory'] = ['/clientes', '/expedientes'];
      mockRouter.navigate.and.returnValue(Promise.resolve(true));

      service.navigateBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/expedientes']);
      expect(service['routeHistory'].length).toBe(1);
    });

    it('should use browser back when no route history and history exists', () => {
      service['routeHistory'] = [];
      
      // Mock window.history.length
      Object.defineProperty(window, 'history', {
        value: { length: 2 },
        writable: true
      });

      service.navigateBack();

      expect(mockLocation.back).toHaveBeenCalled();
    });

    it('should navigate to dashboard when no history available', () => {
      service['routeHistory'] = [];
      mockRouter.navigate.and.returnValue(Promise.resolve(true));
      
      // Mock window.history.length
      Object.defineProperty(window, 'history', {
        value: { length: 1 },
        writable: true
      });

      service.navigateBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('Navigation State Updates', () => {
    it('should update navigation state when route changes', () => {
      spyOn(service as any, 'updateNavigationState');

      // Trigger navigation end event
      const navigationEnd = new NavigationEnd(2, '/clientes', '/clientes');
      Object.defineProperty(service['router'], 'events', {
        value: of(navigationEnd),
        writable: true
      });
      (service as any).initializeNavigation();

      expect(service['updateNavigationState']).toHaveBeenCalledWith('/clientes');
    });

    it('should handle unknown routes with default config', () => {
      service['updateNavigationState']('/unknown-route');

      service.navigationState$.subscribe(state => {
        expect(state.currentRoute).toBe('/unknown-route');
        expect(state.pageTitle).toBe('Conductores PWA');
        expect(state.showBackButton).toBe(false);
      });
    });

    it('should maintain route history with max length', () => {
      service['maxHistoryLength'] = 3;

      // Add routes beyond max length
      service['updateNavigationState']('/route1');
      service['updateNavigationState']('/route2');
      service['updateNavigationState']('/route3');
      service['updateNavigationState']('/route4');
      service['updateNavigationState']('/route5');

      expect(service['routeHistory'].length).toBe(3);
      expect(service['routeHistory']).not.toContain('/route1');
      expect(service['routeHistory']).toContain('/route4');
    });
  });

  describe('Page Title Management', () => {
    it('should get current page title', (done) => {
      service['updateNavigationState']('/cotizador');

      service.getCurrentPageTitle().subscribe(title => {
        expect(title).toBe('Cotizador');
        done();
      });
    });

    it('should set page title dynamically', () => {
      service.setPageTitle('Custom Title');

      service.getCurrentPageTitle().subscribe(title => {
        expect(title).toBe('Custom Title');
      });

      expect(document.title).toBe('Custom Title - Conductores PWA');
    });
  });

  describe('Breadcrumbs Management', () => {
    it('should get current breadcrumbs', (done) => {
      service['updateNavigationState']('/nueva-oportunidad');

      service.getCurrentBreadcrumbs().subscribe(breadcrumbs => {
        expect(breadcrumbs.length).toBe(2);
        expect(breadcrumbs[0].label).toBe('🏠 Dashboard');
        expect(breadcrumbs[0].route).toBe('/dashboard');
        expect(breadcrumbs[1].label).toBe('➕ Nueva Oportunidad');
        done();
      });
    });

    it('should set breadcrumbs dynamically', () => {
      const customBreadcrumbs: BreadcrumbItem[] = [
        { label: 'Home', route: '/' },
        { label: 'Custom Page' }
      ];

      service.setBreadcrumbs(customBreadcrumbs);

      service.getCurrentBreadcrumbs().subscribe(breadcrumbs => {
        expect(breadcrumbs).toEqual(customBreadcrumbs);
      });
    });
  });

  describe('Back Button Visibility', () => {
    it('should show back button for configured routes', (done) => {
      service['updateNavigationState']('/nueva-oportunidad');

      service.shouldShowBackButton().subscribe(showBack => {
        expect(showBack).toBe(true);
        done();
      });
    });

    it('should hide back button for dashboard', (done) => {
      service['updateNavigationState']('/dashboard');

      service.shouldShowBackButton().subscribe(showBack => {
        expect(showBack).toBe(false);
        done();
      });
    });

    it('should set back button visibility dynamically', () => {
      service.setShowBackButton(true);

      service.shouldShowBackButton().subscribe(showBack => {
        expect(showBack).toBe(true);
      });
    });
  });

  describe('Quick Actions', () => {
    it('should get quick actions for dashboard', (done) => {
      service['updateNavigationState']('/dashboard');

      service.getQuickActions().subscribe(actions => {
        expect(actions.length).toBe(3);
        expect(actions[0].id).toBe('new-opportunity');
        expect(actions[1].id).toBe('quick-quote');
        expect(actions[2].id).toBe('simulator');
        done();
      });
    });

    it('should get quick actions for cotizador', (done) => {
      service['updateNavigationState']('/cotizador');

      service.getQuickActions().subscribe(actions => {
        expect(actions.length).toBe(2);
        expect(actions[0].id).toBe('ags-quote');
        expect(actions[1].id).toBe('edomex-quote');
        done();
      });
    });

    it('should get quick actions for simulador', (done) => {
      service['updateNavigationState']('/simulador');

      service.getQuickActions().subscribe(actions => {
        expect(actions.length).toBe(3);
        expect(actions[0].id).toBe('ags-saving');
        expect(actions[1].id).toBe('edomex-individual');
        expect(actions[2].id).toBe('collective-tanda');
        done();
      });
    });

    it('should get quick actions for clientes', (done) => {
      service['updateNavigationState']('/clientes');

      service.getQuickActions().subscribe(actions => {
        expect(actions.length).toBe(2);
        expect(actions[0].id).toBe('new-client');
        expect(actions[1].id).toBe('import-clients');
        done();
      });
    });

    it('should return empty actions for unknown routes', (done) => {
      service['updateNavigationState']('/unknown');

      service.getQuickActions().subscribe(actions => {
        expect(actions.length).toBe(0);
        done();
      });
    });

    it('should execute quick action with route', () => {
      service['updateNavigationState']('/dashboard');
      mockRouter.navigate.and.returnValue(Promise.resolve(true));
      spyOn(service, 'navigateTo').and.returnValue(Promise.resolve(true));

      service.executeQuickAction('new-opportunity');

      expect(service.navigateTo).toHaveBeenCalledWith('/nueva-oportunidad');
    });

    it('should execute quick action with custom function', () => {
      const customAction = jasmine.createSpy('customAction');
      
      // Mock getQuickActions to return action with custom function
      spyOn(service, 'getQuickActions').and.returnValue(of([
        {
          id: 'custom-action',
          label: 'Custom',
          icon: '⚡',
          action: customAction
        }
      ]));

      service.executeQuickAction('custom-action');

      expect(customAction).toHaveBeenCalled();
    });
  });

  describe('Route Matching', () => {
    it('should match exact route', (done) => {
      service['updateNavigationState']('/dashboard');

      service.isCurrentRoute('/dashboard').subscribe(isMatch => {
        expect(isMatch).toBe(true);
        done();
      });
    });

    it('should not match different route', (done) => {
      service['updateNavigationState']('/dashboard');

      service.isCurrentRoute('/clientes').subscribe(isMatch => {
        expect(isMatch).toBe(false);
        done();
      });
    });

    it('should match wildcard pattern', (done) => {
      service['updateNavigationState']('/cotizador/ags-individual');

      service.isCurrentRoute('/cotizador/*').subscribe(isMatch => {
        expect(isMatch).toBe(true);
        done();
      });
    });

    it('should not match non-matching wildcard', (done) => {
      service['updateNavigationState']('/clientes');

      service.isCurrentRoute('/cotizador/*').subscribe(isMatch => {
        expect(isMatch).toBe(false);
        done();
      });
    });
  });

  describe('Route Parameters', () => {
    it('should get route parameters', (done) => {
      const mockParams = { id: '123' };
      mockActivatedRoute.params = of(mockParams);

      service.getRouteParams().subscribe(params => {
        expect(params).toEqual(mockParams);
        done();
      });
    });

    it('should get query parameters', (done) => {
      const mockQueryParams = { filter: 'active', page: '1' };
      mockActivatedRoute.queryParams = of(mockQueryParams);

      service.getQueryParams().subscribe(queryParams => {
        expect(queryParams).toEqual(mockQueryParams);
        done();
      });
    });
  });

  describe('Navigation History Management', () => {
    it('should get navigation history', () => {
      service['routeHistory'] = ['/dashboard', '/clientes', '/expedientes'];

      const history = service.getNavigationHistory();

      expect(history).toEqual(['/dashboard', '/clientes', '/expedientes']);
      // Should return a copy, not the original array
      expect(history).not.toBe(service['routeHistory']);
    });

    it('should clear navigation history', () => {
      service['routeHistory'] = ['/dashboard', '/clientes', '/expedientes'];

      service.clearNavigationHistory();

      expect(service['routeHistory'].length).toBe(0);
    });
  });

  describe('Route Configuration', () => {
    it('should handle nested routes correctly', () => {
      service['updateNavigationState']('/cotizador/ags-individual');

      service.navigationState$.subscribe(state => {
        expect(state.pageTitle).toBe('Cotizador AGS Individual');
        expect(state.breadcrumbs.length).toBe(3);
        expect(state.showBackButton).toBe(true);
      });
    });

    it('should handle simulador nested routes', () => {
      service['updateNavigationState']('/simulador/tanda-colectiva');

      service.navigationState$.subscribe(state => {
        expect(state.pageTitle).toBe('Simulador Tanda Colectiva');
        expect(state.breadcrumbs.length).toBe(3);
        expect(state.breadcrumbs[2].label).toBe('🌨️ Tanda Colectiva');
        expect(state.showBackButton).toBe(true);
      });
    });

    it('should handle all configured main routes', () => {
      const mainRoutes = [
        '/dashboard',
        '/clientes', 
        '/expedientes',
        '/proteccion',
        '/reportes'
      ];

      mainRoutes.forEach(route => {
        service['updateNavigationState'](route);
        
        service.navigationState$.subscribe(state => {
          expect(state.currentRoute).toBe(route);
          expect(state.pageTitle).toBeTruthy();
          expect(state.breadcrumbs.length).toBeGreaterThan(0);
        });
      });
    });
  });
});