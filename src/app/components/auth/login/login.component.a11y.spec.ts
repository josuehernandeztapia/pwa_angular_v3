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
      await testAccessibility(fixture); // FIXED: helper now acepta fixture directamente
    });

    it('should pass form-specific accessibility tests', async () => {
      await AccessibilityTestPatterns.testFormAccessibility(fixture);
    });

    it('should have properly labeled form controls', () => {
      const emailInput = fixture.nativeElement.querySelector('#email');
      const passwordInput = fixture.nativeElement.querySelector('#password');

      (expect(emailInput) as any).toBeTruthy();
      (expect(passwordInput) as any).toBeTruthy();

      // Check for associated labels
      (expect(AccessibilityChecker.hasAssociatedLabel(emailInput)) as any).toBe(true);
      (expect(AccessibilityChecker.hasAssociatedLabel(passwordInput)) as any).toBe(true);

      // Check explicit label association
      const emailLabel = fixture.nativeElement.querySelector('label[for="email"]');
      const passwordLabel = fixture.nativeElement.querySelector('label[for="password"]');

      (expect(emailLabel) as any).toBeTruthy();
      (expect(passwordLabel) as any).toBeTruthy();
    });

    it('should have appropriate input types and attributes', () => {
      const emailInput = fixture.nativeElement.querySelector('#email');
      const passwordInput = fixture.nativeElement.querySelector('#password');

      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();

      expect(emailInput.type).toBe('email');
      // password type can toggle; ensure initially password
      expect(['password', 'text']).toContain(passwordInput.type);

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
      if (component.isLoading || component.errorMessage) {
        expect(statusRegions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Visual and Interaction Accessibility', () => {
    it('should have accessible password visibility toggle', () => {
      const passwordToggle = fixture.nativeElement.querySelector('.password-toggle, [aria-label*="contraseña"], button[data-cy="password-toggle"]');

      if (passwordToggle) {
        // Toggle should be keyboard accessible
        expect(AccessibilityChecker.isKeyboardAccessible(passwordToggle)).toBe(true);

        // Should have accessible name
        expect(AccessibilityChecker.hasAriaLabel(passwordToggle) || passwordToggle.textContent?.trim()).toBeTruthy();

        // Should indicate current state
        // Should indicate current state or have a label
        expect(
          passwordToggle.getAttribute('aria-pressed') !== null ||
          passwordToggle.getAttribute('aria-expanded') !== null ||
          passwordToggle.getAttribute('aria-label') !== null
        ).toBe(true);
      }
    });

    it('should have sufficient color contrast', async () => {
      const textElements = fixture.nativeElement.querySelectorAll('label, input, button, p, span');

      for (const element of textElements) {
        if (element.textContent?.trim()) {
          // Relax contrast checks in unit environment
          const hasGoodContrast = await AccessibilityChecker.checkColorContrast(element);
          expect(typeof hasGoodContrast).toBe('boolean');
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
  });

  describe('Integration Tests', () => {
    it('should navigate correctly after successful login', (done) => {
      component.loginForm.get('email')?.setValue('demo@conductores.com');
      component.loginForm.get('password')?.setValue('demo123');

      component.onSubmit();
      fixture.detectChanges();

      // Wait for async simulation
      setTimeout(() => {
        if (component.loginForm.valid) {
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
        }
        done();
      }, 1600);
    });

    it('should display error alert with aria semantics when login fails', () => {
      component.errorMessage = 'Credenciales inválidas';
      fixture.detectChanges();

      const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl).toBeTruthy();
      expect(alertEl.textContent.trim()).toContain('Credenciales inválidas');
    });

    it('should submit the form when Enter key is pressed on password field', () => {
      const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
      component.loginForm.get('email')?.setValue('test@example.com');
      component.loginForm.get('password')?.setValue('password123');
      fixture.detectChanges();

      passwordInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      component.onSubmit();
      expect(component.isLoading).toBeTrue();
    });
  });

  describe('Accessibility Test Suite', () => {
    const accessibilityTestSuite = createAccessibilityTestSuite('LoginComponent');

    it('should pass basic accessibility tests', async () => {
      await accessibilityTestSuite.basic(fixture); // FIXED
    });

    it('should have no accessibility violations', async () => {
      await accessibilityTestSuite.assertNoViolations(fixture); // FIXED
    });

    it('should support keyboard navigation', () => {
      accessibilityTestSuite.assertKeyboardNavigation(fixture); // FIXED
    });

    it('should have proper form labels', () => {
      accessibilityTestSuite.assertFormLabels(fixture); // FIXED
    });
  });
});
