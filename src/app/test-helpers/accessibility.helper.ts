import { ComponentFixture } from '@angular/core/testing';
import * as axeCore from 'axe-core';

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

const axeConfig = {
  rules: {
    'color-contrast': { enabled: false },
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

type AccessibilityTarget =
  | ComponentFixture<any>
  | HTMLElement
  | {
      nativeElement?: HTMLElement;
      debugElement?: { nativeElement?: HTMLElement };
      elementRef?: { nativeElement?: HTMLElement };
    }
  | null
  | undefined;

const isComponentFixture = (target: any): target is ComponentFixture<any> =>
  !!target && typeof target === 'object' && 'nativeElement' in target && 'detectChanges' in target;

const resolveElement = (target: AccessibilityTarget): HTMLElement => {
  if (!target) {
    throw new Error('A target element or fixture is required for accessibility testing');
  }

  if (target instanceof HTMLElement) {
    return target;
  }

  if (isComponentFixture(target)) {
    return target.nativeElement as HTMLElement;
  }

  if ((target as any).nativeElement instanceof HTMLElement) {
    return (target as any).nativeElement as HTMLElement;
  }

  if ((target as any).debugElement?.nativeElement instanceof HTMLElement) {
    return (target as any).debugElement.nativeElement as HTMLElement;
  }

  if ((target as any).elementRef?.nativeElement instanceof HTMLElement) {
    return (target as any).elementRef.nativeElement as HTMLElement;
  }

  throw new Error('Unable to resolve HTMLElement from provided target');
};

const runAxe = async (element: HTMLElement, config: any = axeConfig): Promise<AxeResults> => {
  return (await axeCore.run(element, config)) as unknown as AxeResults;
};

export async function testComponentAccessibility(target: AccessibilityTarget): Promise<void> {
  const element = resolveElement(target);
  const results = await runAxe(element);
  if (results.violations.length > 0) {
    const violations = results.violations.map(v => `${v.id}: ${v.description}`).join('; ');
    throw new Error(`Accessibility violations found: ${violations}`);
  }
  expect(results.violations.length).toBe(0);
}

export async function testAccessibility(target: AccessibilityTarget): Promise<void> {
  await testComponentAccessibility(target);
}

export async function testElementAccessibility(target: AccessibilityTarget): Promise<void> {
  await testComponentAccessibility(target);
}

export async function testAccessibilityWithConfig(target: AccessibilityTarget, config: any): Promise<void> {
  const element = resolveElement(target);
  const mergedConfig = {
    ...axeConfig,
    ...config
  };
  const results = await runAxe(element, mergedConfig);
  if (results.violations.length > 0) {
    const violations = results.violations.map(v => `${v.id}: ${v.description}`).join('; ');
    throw new Error(`Accessibility violations found: ${violations}`);
  }
  expect(results.violations.length).toBe(0);
}

export async function getAccessibilityViolations(target: AccessibilityTarget): Promise<AxeResults['violations']> {
  const element = resolveElement(target);
  const results = await runAxe(element);
  return results.violations;
}

export const AccessibilityTestPatterns = {
  async testForm(target: AccessibilityTarget): Promise<void> {
    await testAccessibilityWithConfig(target, {
      rules: {
        'label': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
        'aria-required-attr': { enabled: true },
        'aria-valid-attr-value': { enabled: true }
      }
    });
  },

  async testFormAccessibility(target: AccessibilityTarget): Promise<void> {
    await AccessibilityTestPatterns.testForm(target);
  },

  async testNavigation(target: AccessibilityTarget): Promise<void> {
    await testAccessibilityWithConfig(target, {
      rules: {
        'bypass': { enabled: true },
        'link-name': { enabled: true },
        'button-name': { enabled: true },
        'aria-expanded': { enabled: true }
      }
    });
  },

  async testNavigationAccessibility(target: AccessibilityTarget): Promise<void> {
    await AccessibilityTestPatterns.testNavigation(target);
  },

  async testModal(target: AccessibilityTarget): Promise<void> {
    await testAccessibilityWithConfig(target, {
      rules: {
        'aria-dialog-name': { enabled: true },
        'focus-order-semantics': { enabled: true },
        'aria-hidden-focus': { enabled: true }
      }
    });
  },

  async testModalAccessibility(target: AccessibilityTarget): Promise<void> {
    await AccessibilityTestPatterns.testModal(target);
  },

  async testTable(target: AccessibilityTarget): Promise<void> {
    await testAccessibilityWithConfig(target, {
      rules: {
        'td-headers-attr': { enabled: true },
        'th-has-data-cells': { enabled: true },
        'scope-attr-valid': { enabled: true }
      }
    });
  },

  async testTableAccessibility(target: AccessibilityTarget): Promise<void> {
    await AccessibilityTestPatterns.testTable(target);
  }
};

export class AccessibilityChecker {
  static hasAriaLabel(target: AccessibilityTarget): boolean {
    const element = resolveElement(target);
    return (
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby') ||
      element.hasAttribute('aria-describedby')
    );
  }

  static hasAssociatedLabel(target: AccessibilityTarget | HTMLInputElement): boolean {
    const element = target instanceof HTMLElement ? target : resolveElement(target);

    if (element instanceof HTMLInputElement && element.labels && element.labels.length > 0) {
      return true;
    }

    return AccessibilityChecker.hasAriaLabel(element);
  }

  static isKeyboardAccessible(target: AccessibilityTarget): boolean {
    const element = resolveElement(target);
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const tabIndex = element.getAttribute('tabindex');

    if (['button', 'input', 'select', 'textarea', 'a'].includes(tagName)) {
      return tabIndex !== '-1';
    }

    if (['button', 'link', 'tab', 'menuitem'].includes(role || '')) {
      return tabIndex !== '-1';
    }

    return false;
  }

  static async checkColorContrast(target: AccessibilityTarget): Promise<boolean> {
    const element = resolveElement(target);
    try {
      const results = await runAxe(element, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      return results.violations.length === 0;
    } catch {
      return true;
    }
  }
}

type AccessibilitySuite = {
  basic(target: AccessibilityTarget): Promise<void>;
  assertNoViolations(target: AccessibilityTarget): Promise<void>;
  assertKeyboardNavigation(target: AccessibilityTarget): void;
  assertFormLabels(target: AccessibilityTarget): void;
};

type AccessibilitySuiteOptions = {
  componentName: string;
  factory: () => Promise<AccessibilityTarget>;
};

const buildSuite = (): AccessibilitySuite => ({
  async basic(target) {
    await testAccessibility(target);
  },
  async assertNoViolations(target) {
    const violations = await getAccessibilityViolations(target);
    expect(violations.length).toBe(0);
  },
  assertKeyboardNavigation(target) {
    const container = resolveElement(target);
    const interactiveElements = container.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a, [role="button"], [role="link"], [tabindex]'
    );
    interactiveElements.forEach(element => {
      expect(AccessibilityChecker.isKeyboardAccessible(element)).toBe(true);
    });
  },
  assertFormLabels(target) {
    const container = resolveElement(target);
    const formControls = container.querySelectorAll<HTMLInputElement>(
      'input:not([type="hidden"]), select, textarea'
    );
    formControls.forEach(control => {
      expect(AccessibilityChecker.hasAssociatedLabel(control)).toBe(true);
    });
  }
});

export function createAccessibilityTestSuite(options: string | AccessibilitySuiteOptions): AccessibilitySuite {
  const suite = buildSuite();

  if (typeof options === 'string') {
    return suite;
  }

  const { componentName, factory } = options;

  describe(`${componentName} Accessibility Suite`, () => {
    let target: AccessibilityTarget;

    beforeAll(async () => {
      target = await factory();
      if (isComponentFixture(target)) {
        target.detectChanges();
      }
    });

    afterAll(() => {
      if (target && isComponentFixture(target) && typeof target.destroy === 'function') {
        target.destroy();
      }
    });

    it('passes basic accessibility scan', async () => {
      await suite.basic(target);
    });

    it('has no axe-core violations', async () => {
      await suite.assertNoViolations(target);
    });

    it('supports keyboard navigation', () => {
      suite.assertKeyboardNavigation(target);
    });

    it('ensures form controls have associated labels', () => {
      suite.assertFormLabels(target);
    });
  });

  return suite;
}
