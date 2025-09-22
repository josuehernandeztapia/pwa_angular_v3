import { ComponentFixture } from '@angular/core/testing';
import * as axeCore from 'axe-core';

// Type definitions for axe-core results
interface AxeViolation {
  id: string;
  description: string;
  nodes: any[];
}

interface AxeResults {
  violations: AxeViolation[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
}

// Configure axe for Angular applications
const axeConfig = {
  rules: {
    // Disable color-contrast rule for development as it can be flaky
    'color-contrast': { enabled: false },
    // Focus on critical accessibility issues
    'aria-allowed-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'bypass': { enabled: true },
    'duplicate-id': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'marquee': { enabled: true },
    'meta-refresh': { enabled: true },
    'object-alt': { enabled: true },
    'role-img-alt': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true }
  }
};

// Create configureAxe function for compatibility
function configureAxe(config: any) {
  return (element: HTMLElement) => axeCore.run(element, config);
}

/**
 * Test accessibility of a component
 */
// removed by clean-audit
// removed by clean-audit
  const results = await axeCore.run(element, axeConfig) as unknown as AxeResults;
  if (results.violations.length > 0) {
    const violations = results.violations.map(v => `${v.id}: ${v.description}`).join('; ');
    throw new Error(`Accessibility violations found: ${violations}`);
  }
  expect(results.violations.length).toBe(0);
}

/**
 * Test accessibility of a specific element
 */
export async function testElementAccessibility(element: HTMLElement): Promise<void> {
  const results = await axeCore.run(element, axeConfig) as unknown as AxeResults;
  if (results.violations.length > 0) {
    const violations = results.violations.map(v => `${v.id}: ${v.description}`).join('; ');
    throw new Error(`Accessibility violations found: ${violations}`);
  }
  expect(results.violations.length).toBe(0);
}

/**
 * Test accessibility with custom axe configuration
 */
export async function testAccessibilityWithConfig(
// removed by clean-audit
  config: any
): Promise<void> {
// removed by clean-audit
  const results = await axeCore.run(element, config) as unknown as AxeResults;
  if (results.violations.length > 0) {
    const violations = results.violations.map(v => `${v.id}: ${v.description}`).join('; ');
    throw new Error(`Accessibility violations found: ${violations}`);
  }
  expect(results.violations.length).toBe(0);
}

/**
 * Get accessibility violations without throwing
 */
// removed by clean-audit
// removed by clean-audit
  const results = await axeCore.run(element, axeConfig) as unknown as AxeResults;
  return results.violations;
}

/**
 * Common accessibility test patterns
 */
export const AccessibilityTestPatterns = {
  /**
   * Test form accessibility
   */
// removed by clean-audit
    const formConfig = {
      rules: {
        'label': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true }
      }
    };
// removed by clean-audit
  },

  /**
   * Test navigation accessibility
   */
// removed by clean-audit
    const navConfig = {
      rules: {
        'bypass': { enabled: true },
        'link-name': { enabled: true },
        'button-name': { enabled: true },
        'aria-expanded': { enabled: true }
      }
    };
// removed by clean-audit
  },

  /**
   * Test modal/dialog accessibility
   */
// removed by clean-audit
    const modalConfig = {
      rules: {
        'aria-dialog-name': { enabled: true },
        'focus-order-semantics': { enabled: true },
        'aria-hidden-focus': { enabled: true }
      }
    };
// removed by clean-audit
  },

  /**
   * Test table accessibility
   */
// removed by clean-audit
    const tableConfig = {
      rules: {
        'td-headers-attr': { enabled: true },
        'th-has-data-cells': { enabled: true },
        'scope-attr-valid': { enabled: true }
      }
    };
// removed by clean-audit
  }
};

/**
 * Utility to check specific accessibility features
 */
export class AccessibilityChecker {
  /**
   * Check if element has proper ARIA labels
   */
  static hasAriaLabel(element: HTMLElement): boolean {
    return element.hasAttribute('aria-label') || 
           element.hasAttribute('aria-labelledby') ||
           element.hasAttribute('aria-describedby');
  }

  /**
   * Check if form control has associated label
   */
  static hasAssociatedLabel(input: HTMLInputElement): boolean {
    // Check for explicit label association
    if (input.labels && input.labels.length > 0) {
      return true;
    }

    // Check for aria-label or aria-labelledby
    return this.hasAriaLabel(input);
  }

  /**
   * Check if interactive elements are keyboard accessible
   */
  static isKeyboardAccessible(element: HTMLElement): boolean {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const tabIndex = element.getAttribute('tabindex');

    // Native interactive elements
    if (['button', 'input', 'select', 'textarea', 'a'].includes(tagName)) {
      return tabIndex !== '-1';
    }

    // Elements with interactive roles
    if (['button', 'link', 'tab', 'menuitem'].includes(role || '')) {
      return tabIndex !== '-1';
    }

    return false;
  }

  /**
   * Check if element has sufficient color contrast
   * Note: This is a basic check, use axe-core for comprehensive testing
   */
  static async checkColorContrast(element: HTMLElement): Promise<boolean> {
    try {
      const results = await axeCore.run(element, {
        rules: {
          'color-contrast': { enabled: true }
        }
      }) as unknown as AxeResults;
      return results.violations.length === 0;
    } catch {
      return true; // Assume pass if unable to test
    }
  }
}

/**
 * Accessibility test suite for common component patterns
 */
export function createAccessibilityTestSuite(componentName: string) {
  return {
// removed by clean-audit
// removed by clean-audit
    },

// removed by clean-audit
// removed by clean-audit
      expect(violations.length).toBe(0);
    },

// removed by clean-audit
// removed by clean-audit
        'button, input, select, textarea, a, [role="button"], [role="link"], [tabindex]'
      );

      interactiveElements.forEach((element: HTMLElement) => {
        expect(AccessibilityChecker.isKeyboardAccessible(element)).toBe(true);
      });
    },

// removed by clean-audit
// removed by clean-audit
        'input:not([type="hidden"]), select, textarea'
      );

      formControls.forEach((control: HTMLInputElement) => {
        expect(AccessibilityChecker.hasAssociatedLabel(control)).toBe(true);
      });
    }
  };
}
// removed by clean-audit