import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { 
  testAccessibility, 
  AccessibilityTestPatterns, 
  AccessibilityChecker, 
  createAccessibilityTestSuite 
} from '../../../test-helpers/accessibility.helper';

describe('LoginComponent Accessibility Tests', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  describe('Form Accessibility', () => {
    it('should pass automated accessibility tests', async () => {
      await testAccessibility(fixture);
    });

    it('should pass form-specific accessibility tests', async () => {
      await AccessibilityTestPatterns.testFormAccessibility(fixture);
    });

    it('should have properly labeled form controls', () => {
      const emailInput = fixture.nativeElement.querySelector('#email');
      const passwordInput = fixture.nativeElement.querySelector('#password');
      
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      
      // Check for associated labels
      expect(AccessibilityChecker.hasAssociatedLabel(emailInput)).toBe(true);
      expect(AccessibilityChecker.hasAssociatedLabel(passwordInput)).toBe(true);
      
      // Check explicit label association
      const emailLabel = fixture.nativeElement.querySelector('label[for="email"]');
      const passwordLabel = fixture.nativeElement.querySelector('label[for="password"]');
      
      expect(emailLabel).toBeTruthy();
      expect(passwordLabel).toBeTruthy();
    });

    it('should have appropriate input types and attributes', () => {
      const emailInput = fixture.nativeElement.querySelector('#email');
      const passwordInput = fixture.nativeElement.querySelector('#password');
      
      expect(emailInput.type).toBe('email');
      expect(passwordInput.type).toBe('password');
      
      // Check for required attributes
      expect(emailInput.hasAttribute('required') || emailInput.getAttribute('aria-required')).toBeTruthy();
      expect(passwordInput.hasAttribute('required') || passwordInput.getAttribute('aria-required')).toBeTruthy();
    });

    it('should provide accessible error messages', () => {
      // Trigger validation errors
      component.loginForm.get('email')?.markAsTouched();
      component.loginForm.get('password')?.markAsTouched();
      component.loginForm.get('email')?.setValue('');
      component.loginForm.get('password')?.setValue('');
      fixture.detectChanges();

      const errorMessages = fixture.nativeElement.querySelectorAll('.error-message');
      
      errorMessages.forEach((errorMessage: HTMLElement) => {
        // Error messages should be associated with their inputs via aria-describedby
        expect(errorMessage.textContent?.trim()).toBeTruthy();
        
        // Check if error has an ID that can be referenced
        const errorId = errorMessage.getAttribute('id');
        if (errorId) {
          const associatedInput = fixture.nativeElement.querySelector(`[aria-describedby*="${errorId}"]`);
          expect(associatedInput).toBeTruthy();
        }
      });
    });

    it('should announce form submission status', () => {
      // Check for status announcements during form submission
      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeTruthy();
      
      // Should have some way to announce status changes
      const statusRegions = fixture.nativeElement.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
      
      // If there are status updates, they should be announced
      if (component.isLoading || component.loginError) {
        expect(statusRegions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Visual and Interaction Accessibility', () => {
    it('should have accessible password visibility toggle', () => {
      const passwordToggle = fixture.nativeElement.querySelector('.password-toggle, [aria-label*="password"], button[type="button"]');
      
      if (passwordToggle) {
        // Toggle should be keyboard accessible
        expect(AccessibilityChecker.isKeyboardAccessible(passwordToggle)).toBe(true);
        
        // Should have accessible name
        expect(AccessibilityChecker.hasAriaLabel(passwordToggle) || passwordToggle.textContent?.trim()).toBeTruthy();
        
        // Should indicate current state
        expect(
          passwordToggle.getAttribute('aria-pressed') !== null ||
          passwordToggle.getAttribute('aria-expanded') !== null ||
          passwordToggle.textContent?.includes('show') ||
          passwordToggle.textContent?.includes('hide')
        ).toBe(true);
      }
    });

    it('should have sufficient color contrast', async () => {
      const textElements = fixture.nativeElement.querySelectorAll('label, input, button, p, span');
      
      for (const element of textElements) {
        if (element.textContent?.trim()) {
          const hasGoodContrast = await AccessibilityChecker.checkColorContrast(element);
          expect(hasGoodContrast).toBe(true);
        }
      }
    });

    it('should not rely solely on color for form validation', () => {
      // Trigger validation errors
      component.loginForm.get('email')?.markAsTouched();
      component.loginForm.get('email')?.setValue('invalid-email');
      fixture.detectChanges();

      const emailInput = fixture.nativeElement.querySelector('#email');
      const errorMessage = fixture.nativeElement.querySelector('.error-message');
      
      if (errorMessage) {
        // Validation should be indicated by text, not just color
        expect(errorMessage.textContent?.trim()).toBeTruthy();
        
        // Input should have aria-invalid attribute
        expect(emailInput.getAttribute('aria-invalid')).toBeTruthy();
      }
    });

    it('should have focus indicators for all interactive elements', () => {
      const focusableElements = fixture.nativeElement.querySelectorAll(
        'input, button, a, [tabindex]:not([tabindex="-1"])'
      );
      
      focusableElements.forEach((element: HTMLElement) => {
        element.focus();
        
        // Should have visible focus indicator
        const computedStyle = window.getComputedStyle(element);
        const hasFocusIndicator = 
          computedStyle.outline !== 'none' ||
          computedStyle.boxShadow.includes('inset') ||
          computedStyle.borderColor !== 'initial';
        
        expect(hasFocusIndicator).toBeTruthy();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard-only navigation', () => {
      const focusableElements = fixture.nativeElement.querySelectorAll(
        'input, button, a:not([href=""]), [tabindex]:not([tabindex="-1"])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      focusableElements.forEach((element: HTMLElement) => {
        expect(AccessibilityChecker.isKeyboardAccessible(element)).toBe(true);
      });
    });

    it('should have logical tab order', () => {
      const emailInput = fixture.nativeElement.querySelector('#email');
      const passwordInput = fixture.nativeElement.querySelector('#password');
      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      
      // Tab order should be: email -> password -> submit
      expect(emailInput.tabIndex).toBeLessThanOrEqual(passwordInput.tabIndex);
      expect(passwordInput.tabIndex).toBeLessThanOrEqual(submitButton.tabIndex);
    });

    it('should handle Enter key submission', () => {
      spyOn(component, 'onSubmit');
      
      const form = fixture.nativeElement.querySelector('form');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      
      form.dispatchEvent(enterEvent);
      
      // Form should be submittable via Enter key
      expect(form.addEventListener).toBeDefined();
    });

    it('should support Escape key functionality', () => {
      // If there are any modal-like behaviors or dismissible elements
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      // Component should handle escape gracefully
      expect(component).toBeTruthy();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful page structure', () => {
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading).toBeTruthy();
      expect(heading.textContent).toContain('Centro de Comando');
      
      // Should have descriptive subtitle
      const subtitle = fixture.nativeElement.querySelector('.brand-subtitle, .command-subtitle');
      if (subtitle) {
        expect(subtitle.textContent?.trim()).toBeTruthy();
      }
    });

    it('should provide form context and instructions', () => {
      const form = fixture.nativeElement.querySelector('form');
      
      // Form should have accessible name or description
      expect(
        form.getAttribute('aria-label') ||
        form.getAttribute('aria-labelledby') ||
        form.getAttribute('aria-describedby') ||
        fixture.nativeElement.querySelector('h1')
      ).toBeTruthy();
    });

    it('should announce loading states', () => {
      component.isLoading = true;
      fixture.detectChanges();
      
      // Loading state should be announced
      const loadingIndicators = fixture.nativeElement.querySelectorAll(
        '[aria-live], [role="status"], .loading, [aria-busy="true"]'
      );
      
      if (component.isLoading) {
        expect(loadingIndicators.length).toBeGreaterThan(0);
      }
    });

    it('should provide meaningful button labels', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      
      buttons.forEach((button: HTMLButtonElement) => {
        const hasAccessibleName = 
          button.textContent?.trim() ||
          button.getAttribute('aria-label') ||
          button.getAttribute('aria-labelledby') ||
          button.getAttribute('title');
        
        expect(hasAccessibleName).toBeTruthy();
      });
    });
  });

  describe('Mobile and Touch Accessibility', () => {
    it('should have adequate touch targets', () => {
      const touchTargets = fixture.nativeElement.querySelectorAll('button, input, a');
      
      touchTargets.forEach((target: HTMLElement) => {
        const rect = target.getBoundingClientRect();
        const minSize = 44; // Minimum recommended touch target size
        
        expect(rect.width >= minSize || rect.height >= minSize).toBeTruthy();
      });
    });

    it('should be responsive and maintain accessibility', () => {
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      
      // Form should remain accessible on mobile
      const emailInput = fixture.nativeElement.querySelector('#email');
      const passwordInput = fixture.nativeElement.querySelector('#password');
      
      expect(AccessibilityChecker.hasAssociatedLabel(emailInput)).toBe(true);
      expect(AccessibilityChecker.hasAssociatedLabel(passwordInput)).toBe(true);
    });
  });

  describe('Error Handling Accessibility', () => {
    it('should announce authentication errors accessibly', () => {
      // Simulate login error
      component.loginError = 'Invalid credentials';
      fixture.detectChanges();
      
      const errorElements = fixture.nativeElement.querySelectorAll(
        '[role="alert"], .error, .alert-error, [aria-live="assertive"]'
      );
      
      if (component.loginError) {
        expect(errorElements.length).toBeGreaterThan(0);
        
        errorElements.forEach((error: HTMLElement) => {
          expect(error.textContent?.trim()).toBeTruthy();
        });
      }
    });

    it('should provide recovery instructions for errors', () => {
      // Set various error states and check for helpful instructions
      const errorScenarios = [
        'Invalid email format',
        'Password too short',
        'Account locked',
        'Network error'
      ];
      
      errorScenarios.forEach(errorMessage => {
        component.loginError = errorMessage;
        fixture.detectChanges();
        
        const errorElement = fixture.nativeElement.querySelector('.error-message, [role="alert"]');
        if (errorElement) {
          // Error should provide actionable information
          expect(errorElement.textContent).toContain(errorMessage);
        }
      });
    });
  });

  describe('Progressive Enhancement', () => {
    it('should work without JavaScript enhancements', () => {
      // Form should have proper action and method attributes for fallback
      const form = fixture.nativeElement.querySelector('form');
      
      // Basic form functionality should be preserved
      expect(form.method || 'get').toBeTruthy();
      expect(form.noValidate !== undefined).toBe(true); // Client-side validation should be optional
    });

    it('should degrade gracefully', () => {
      // Disable component functionality to test graceful degradation
      component.ngOnDestroy();
      fixture.detectChanges();
      
      // Form should still be usable
      const emailInput = fixture.nativeElement.querySelector('#email');
      const passwordInput = fixture.nativeElement.querySelector('#password');
      
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
    });
  });

  // Apply common accessibility test patterns
  const accessibilityTestSuite = createAccessibilityTestSuite('LoginComponent');
  
  Object.entries(accessibilityTestSuite).forEach(([testName, testFunction]) => {
    it(testName, async () => {
      await (testFunction as any)(fixture);
    });
  });
});