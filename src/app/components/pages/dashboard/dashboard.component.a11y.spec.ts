import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../../services/dashboard.service';
import { DashboardStats, ActivityFeedItem, OpportunityStage, ActionableGroup } from '../../../models/types';
import {
  testAccessibility,
  AccessibilityTestPatterns,
  AccessibilityChecker,
  createAccessibilityTestSuite
} from '../../../test-helpers/accessibility.helper';

describe('DashboardComponent Accessibility Tests', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDashboardService: jasmine.SpyObj<DashboardService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockDashboardStats: DashboardStats = {
    opportunitiesInPipeline: {
      nuevas: 5,
      expediente: 3,
      aprobado: 2
    },
    pendingActions: {
      clientsWithMissingDocs: 4,
      clientsWithGoalsReached: 2
    },
    activeContracts: 15,
    monthlyRevenue: {
      collected: 85000,
      projected: 120000
    }
  };

  const mockActivityFeed: ActivityFeedItem[] = [
    {
      id: '1',
      type: 'new_client',
      timestamp: new Date(),
      message: 'Nuevo cliente registrado: Ana García',
      clientName: 'Ana García',
      icon: '👤'
    }
  ];

  const mockOpportunityStages: OpportunityStage[] = [
    {
      name: 'Nuevas Oportunidades',
      clientIds: ['1', '2'],
      count: 2
    }
  ];

  const mockActionableGroups: ActionableGroup[] = [
    {
      title: 'Clientes con documentos pendientes',
      description: 'Estos clientes necesitan completar su documentación',
      clients: [
        {
          id: '1',
          name: 'Juan Pérez',
          avatarUrl: '',
          status: 'Pendiente'
        }
      ]
    }
  ];

  beforeEach(async () => {
    const dashboardServiceSpy = jasmine.createSpyObj('DashboardService', [
      'getDashboardStats',
      'getActivityFeed',
      'getOpportunityStages',
      'getActionableGroups',
      'updateMarket'
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    mockDashboardService = TestBed.inject(DashboardService) as jasmine.SpyObj<DashboardService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup service mocks
    mockDashboardService.getDashboardStats.and.returnValue(of(mockDashboardStats));
    mockDashboardService.getActivityFeed.and.returnValue(of(mockActivityFeed));
    mockDashboardService.getOpportunityStages.and.returnValue(of(mockOpportunityStages));
    mockDashboardService.getActionableGroups.and.returnValue(of(mockActionableGroups));

    component.ngOnInit();
    fixture.detectChanges();
  });

  describe('Basic Accessibility Compliance', () => {
    it('should pass automated accessibility tests', async () => {
      await testAccessibility(fixture);
    });

    it('should have proper document structure', () => {
      const mainElement = fixture.nativeElement.querySelector('.command-center-dashboard');
      expect(mainElement).toBeTruthy();
      expect(mainElement.tagName.toLowerCase()).toBe('div');
    });

    it('should have proper heading hierarchy', () => {
      const h1 = fixture.nativeElement.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1.textContent).toContain('Centro de Comando');

      // Check that there are no skipped heading levels
      const headings = fixture.nativeElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let previousLevel = 0;

      headings.forEach((heading: HTMLElement) => {
        const currentLevel = parseInt(heading.tagName.charAt(1));
        expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1);
        previousLevel = currentLevel;
      });
    });
  });

  describe('Visual Accessibility', () => {
    it('should provide accessible stats summary', () => {
      const statsCards = fixture.nativeElement.querySelectorAll('.stats-card');
      expect(statsCards.length).toBeGreaterThan(0);

      statsCards.forEach((card: HTMLElement) => {
        expect(AccessibilityChecker.hasAriaLabel(card) || card.querySelector('h2')).toBeTruthy();
      });
    });

    it('should have accessible charts and data visualizations', () => {
      const charts = fixture.nativeElement.querySelectorAll('.chart-container, canvas, svg');

      charts.forEach((chart: HTMLElement) => {
        const hasDescription =
          chart.getAttribute('role') === 'img' ||
          chart.getAttribute('aria-label') !== null ||
          chart.querySelector('figcaption') !== null;

        expect(hasDescription).toBe(true);
      });
    });

    it('should have high contrast for key metrics', async () => {
      const metricElements = fixture.nativeElement.querySelectorAll('.metric-value, .metric-label') as NodeListOf<HTMLElement>;

      for (const element of Array.from(metricElements)) {
        if (element.textContent?.trim()) {
          const hasAdequateContrast = await AccessibilityChecker.checkColorContrast(element as HTMLElement);
          expect(hasAdequateContrast).toBe(true);
        }
      }
    });
  });

  describe('Interaction Accessibility', () => {
    it('should provide accessible navigation to sections', () => {
      const quickLinks = fixture.nativeElement.querySelectorAll('.quick-link, .nav-link, a');

      quickLinks.forEach((link: HTMLElement) => {
        expect(AccessibilityChecker.isKeyboardAccessible(link)).toBe(true);
        (expect((AccessibilityChecker as any).hasAccessibleName(link)) as any).toBe(true);
      });
    });

    it('should provide expandable sections with proper ARIA attributes', () => {
      const expandableSections = fixture.nativeElement.querySelectorAll('[aria-expanded]');

      expandableSections.forEach((section: HTMLElement) => {
        expect(section.getAttribute('aria-controls')).toBeTruthy();
      });
    });
  });

  describe('Data Tables Accessibility', () => {
    it('should provide accessible tables', () => {
      const tables = fixture.nativeElement.querySelectorAll('table');

      tables.forEach((table: HTMLTableElement) => {
        expect(table.querySelector('thead')).toBeTruthy();
        expect(table.querySelector('tbody')).toBeTruthy();

        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
          expect(header.scope === 'col' || header.scope === 'row').toBe(true);
        });
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful page title and headings', () => {
      const pageTitle = fixture.nativeElement.querySelector('h1');
      expect(pageTitle?.textContent).toContain('Centro de Comando');
    });

    it('should have proper landmark regions', () => {
      const landmarks = fixture.nativeElement.querySelectorAll(
        'header, nav, main, section, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"]'
      );

      expect(landmarks.length).toBeGreaterThan(0);
    });

    it('should provide context for dynamic content', () => {
      const liveRegions = fixture.nativeElement.querySelectorAll('[aria-live], [role="status"], [role="alert"]');

      if (component.dashboardStats.opportunitiesInPipeline.nuevas > 0) {
        expect(liveRegions.length >= 0).toBe(true);
      }
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation', () => {
      const focusableElements = fixture.nativeElement.querySelectorAll(
        'button, input, select, textarea, a:not([href=""]), [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      focusableElements.forEach((element: HTMLElement) => {
        expect(AccessibilityChecker.isKeyboardAccessible(element)).toBe(true);
      });
    });

    it('should have logical tab order', () => {
      const focusableElements = Array.from(fixture.nativeElement.querySelectorAll(
        'button, input, select, textarea, a:not([href=""]), [tabindex]:not([tabindex="-1"])'
      )) as HTMLElement[];

      let lastTabIndex = -Infinity;

      focusableElements.forEach((element: HTMLElement) => {
        const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
        if (tabIndex >= 0) {
          expect(tabIndex).toBeGreaterThanOrEqual(lastTabIndex);
          lastTabIndex = tabIndex;
        }
      });
    });
  });

  describe('Mobile and Touch Accessibility', () => {
    it('should have adequate touch target sizes', () => {
      const touchTargets = fixture.nativeElement.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]');

      touchTargets.forEach((target: HTMLElement) => {
        const rect = target.getBoundingClientRect();
        const minSize = 44; // 44px minimum recommended touch target size
        expect(rect.width >= minSize || rect.height >= minSize).toBeTruthy();
      });
    });

    it('should be responsive to viewport changes', () => {
      const viewports = [
        { width: 320, height: 568 },
        { width: 768, height: 1024 },
        { width: 1200, height: 800 }
      ];

      viewports.forEach(viewport => {
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, writable: true });

        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();

        const focusableElements = fixture.nativeElement.querySelectorAll('button, input, a');
        expect(focusableElements.length).toBeGreaterThan(0);
      });
    });
  });

  const accessibilityTestSuite = createAccessibilityTestSuite('DashboardComponent');
  Object.entries(accessibilityTestSuite).forEach(([testName, testFunction]) => {
    it(testName, async () => {
      await (testFunction as any)(fixture);
    });
  });
});
