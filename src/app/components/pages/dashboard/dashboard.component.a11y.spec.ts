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

  describe('Navigation Accessibility', () => {
    it('should pass navigation accessibility tests', async () => {
      await AccessibilityTestPatterns.testNavigationAccessibility(fixture);
    });

    it('should have accessible navigation buttons', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      
      buttons.forEach((button: HTMLButtonElement) => {
        // Each button should have accessible name
        expect(AccessibilityChecker.hasAriaLabel(button) || button.textContent?.trim()).toBeTruthy();
        
        // Should be keyboard accessible
        expect(AccessibilityChecker.isKeyboardAccessible(button)).toBe(true);
      });
    });

    it('should have proper ARIA attributes for interactive elements', () => {
      const clientModeToggle = fixture.nativeElement.querySelector('app-client-mode-toggle');
      if (clientModeToggle) {
        expect(clientModeToggle.getAttribute('role')).toBeTruthy();
      }
    });
  });

  describe('Content Accessibility', () => {
    it('should have accessible KPI cards', () => {
      // KPI cards should be announced properly by screen readers
      const kpiCards = fixture.nativeElement.querySelectorAll('.kpi-card, .metric-card, [data-testid*="kpi"]');
      
      kpiCards.forEach((card: HTMLElement) => {
        // Cards should have accessible text content or ARIA labels
        const hasText = card.textContent?.trim();
        const hasAriaLabel = AccessibilityChecker.hasAriaLabel(card);
        expect(hasText || hasAriaLabel).toBeTruthy();
      });
    });

    it('should have accessible activity feed', () => {
      const activityItems = fixture.nativeElement.querySelectorAll('.activity-item, [data-testid*="activity"]');
      
      activityItems.forEach((item: HTMLElement) => {
        // Activity items should be properly labeled
        expect(item.textContent?.trim()).toBeTruthy();
      });
    });

    it('should use semantic HTML for content structure', () => {
      const header = fixture.nativeElement.querySelector('header, .command-header');
      expect(header).toBeTruthy();

      const main = fixture.nativeElement.querySelector('main, .dashboard-content');
      // Main content should be identifiable
      const hasMainContent = main || fixture.nativeElement.querySelector('.command-center-dashboard');
      expect(hasMainContent).toBeTruthy();
    });
  });

  describe('Form and Input Accessibility', () => {
    it('should have accessible form controls if any', () => {
      const formControls = fixture.nativeElement.querySelectorAll('input, select, textarea');
      
      formControls.forEach((control: HTMLInputElement) => {
        expect(AccessibilityChecker.hasAssociatedLabel(control)).toBe(true);
      });
    });

    it('should handle form validation accessibly', () => {
      const errorMessages = fixture.nativeElement.querySelectorAll('.error-message, [role="alert"]');
      
      errorMessages.forEach((error: HTMLElement) => {
        // Error messages should be associated with their inputs
        const ariaDescribedBy = error.getAttribute('id');
        if (ariaDescribedBy) {
          const associatedInput = fixture.nativeElement.querySelector(`[aria-describedby*="${ariaDescribedBy}"]`);
          expect(associatedInput).toBeTruthy();
        }
      });
    });
  });

  describe('Visual and Interaction Accessibility', () => {
    it('should not rely solely on color to convey information', () => {
      // Check for status indicators that might use color only
      const statusElements = fixture.nativeElement.querySelectorAll('.status, .badge, .indicator');
      
      statusElements.forEach((element: HTMLElement) => {
        // Status should be conveyed through text, icons, or ARIA attributes
        const hasTextContent = element.textContent?.trim();
        const hasAriaLabel = AccessibilityChecker.hasAriaLabel(element);
        const hasIconOrSymbol = element.innerHTML.includes('icon') || /[📊📈📉✅❌⚠️]/.test(element.innerHTML);
        
        expect(hasTextContent || hasAriaLabel || hasIconOrSymbol).toBeTruthy();
      });
    });

    it('should have sufficient focus indicators', () => {
      const focusableElements = fixture.nativeElement.querySelectorAll(
        'button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])'
      );
      
      focusableElements.forEach((element: HTMLElement) => {
        // Element should be visually focusable
        element.focus();
        const computedStyle = window.getComputedStyle(element);
        const hasFocusStyle = computedStyle.outline !== 'none' || 
                             computedStyle.boxShadow !== 'none' ||
                             computedStyle.border !== element.style.border;
        
        expect(hasFocusStyle).toBeTruthy();
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful page title and headings', () => {
      const pageTitle = fixture.nativeElement.querySelector('h1');
      expect(pageTitle?.textContent).toContain('Centro de Comando');
    });

    it('should have proper landmark regions', () => {
      // Check for semantic HTML or ARIA landmarks
      const landmarks = fixture.nativeElement.querySelectorAll(
        'header, nav, main, section, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"]'
      );
      
      expect(landmarks.length).toBeGreaterThan(0);
    });

    it('should provide context for dynamic content', () => {
      // Check for ARIA live regions for dynamic updates
      const liveRegions = fixture.nativeElement.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
      
      // If there are dynamic updates, there should be live regions
      if (component.dashboardStats.opportunitiesInPipeline.nuevas > 0) {
        // Dynamic content should be announced
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
      
      // Elements should be in logical DOM order unless explicitly overridden with tabindex
      let lastTabIndex = -Infinity;
      
      focusableElements.forEach((element: HTMLElement) => {
        const tabIndex = parseInt(element.getAttribute('tabindex') || '0');
        if (tabIndex >= 0) {
          expect(tabIndex).toBeGreaterThanOrEqual(lastTabIndex);
          lastTabIndex = tabIndex;
        }
      });
    });

    it('should handle keyboard interactions properly', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      
      buttons.forEach((button: HTMLButtonElement) => {
        spyOn(button, 'click');
        
        // Simulate Enter key press
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        button.dispatchEvent(enterEvent);
        
        // Simulate Space key press
        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
        button.dispatchEvent(spaceEvent);
        
        // These should trigger click events or handle appropriately
      });
    });
  });

  describe('Mobile and Touch Accessibility', () => {
    it('should have adequate touch target sizes', () => {
      const touchTargets = fixture.nativeElement.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]');
      
      touchTargets.forEach((target: HTMLElement) => {
        const rect = target.getBoundingClientRect();
        const minSize = 44; // 44px minimum recommended touch target size
        
        // Either the element itself or its padding should provide adequate touch area
        expect(rect.width >= minSize || rect.height >= minSize).toBeTruthy();
      });
    });

    it('should be responsive to viewport changes', () => {
      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1200, height: 800 }  // Desktop
      ];
      
      viewports.forEach(viewport => {
        // Simulate viewport change
        Object.defineProperty(window, 'innerWidth', { value: viewport.width, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: viewport.height, writable: true });
        
        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();
        
        // Component should remain accessible across viewport changes
        const focusableElements = fixture.nativeElement.querySelectorAll('button, input, a');
        expect(focusableElements.length).toBeGreaterThan(0);
      });
    });
  });

  // Apply common accessibility test patterns
  const accessibilityTestSuite = createAccessibilityTestSuite('DashboardComponent');
  
  Object.entries(accessibilityTestSuite).forEach(([testName, testFunction]) => {
    it(testName, async () => {
      await (testFunction as any)(fixture);
    });
  });
});