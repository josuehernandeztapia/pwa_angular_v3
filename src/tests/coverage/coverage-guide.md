# Code Coverage Guide - Conductores PWA

## Overview
This guide explains how to use and interpret the comprehensive code coverage system implemented for the Conductores PWA application.

## Coverage Types

### 1. Unit Test Coverage
Traditional line, function, statement, and branch coverage from unit tests.

**Metrics:**
- **Lines**: Percentage of code lines executed
- **Functions**: Percentage of functions called
- **Statements**: Percentage of statements executed  
- **Branches**: Percentage of conditional branches taken

**Target Thresholds:**
- Lines: 80%+
- Functions: 85%+
- Statements: 80%+
- Branches: 75%+

### 2. Mutation Testing Coverage
Tests the quality of test suites by introducing code mutations.

**Metrics:**
- **Mutation Score**: Percentage of mutants killed by tests
- **Killed**: Mutants detected by tests (good)
- **Survived**: Mutants not detected (needs improvement)
- **Timeout**: Mutants that caused test timeouts

**Target Thresholds:**
- Mutation Score: 70%+ (critical services 85%+)

### 3. Visual Regression Coverage
Ensures UI components render consistently across browsers and screen sizes.

**Metrics:**
- **Components Tested**: Number of components with visual tests
- **Screen Sizes**: Viewports tested (mobile, tablet, desktop)
- **Browsers**: Browser compatibility coverage

### 4. Accessibility Coverage
Validates WCAG compliance and screen reader compatibility.

**Metrics:**
- **Components with A11y Tests**: Accessibility test coverage
- **Violations Found**: Current accessibility issues
- **WCAG Level**: Compliance level (A, AA, AAA)

## Running Coverage Tests

### All Coverage Types
```bash
npm run test:all
```

### Individual Coverage Types
```bash
# Unit test coverage
npm run test:coverage

# Mutation testing
npm run test:mutation

# Visual regression
npm run test:visual

# Accessibility testing
npm run test:accessibility
```

### Generate Coverage Dashboard
```bash
npm run coverage:generate
npm run coverage:serve
```

## Coverage Dashboard

The coverage dashboard provides a unified view of all testing metrics:

### Overall Score
Weighted combination of all coverage metrics:
- Unit Coverage: 40%
- Mutation Score: 35% 
- Visual Coverage: 15%
- Accessibility: 10%

### Health Status
- **EXCELLENT** (90%+): Outstanding coverage
- **GOOD** (80-89%): Solid coverage  
- **FAIR** (70-79%): Acceptable with improvements needed
- **POOR** (60-69%): Significant gaps
- **CRITICAL** (<60%): Immediate attention required

## Interpreting Results

### Unit Coverage Reports
Located in `coverage/lcov-report/index.html`

**Key Areas to Focus:**
1. **Red lines**: Uncovered code requiring tests
2. **Yellow branches**: Partially covered conditionals
3. **Gray lines**: Dead/unreachable code

### Mutation Testing Results
Located in `reports/mutation/index.html`

**Analysis:**
- **Survived Mutants**: Indicate weak test assertions
- **Killed Mutants**: Confirm test effectiveness
- **Equivalent Mutants**: Code changes with no behavioral impact

### Visual Test Results
Located in `test-results/visual/index.html`

**Review:**
- **Failed Screenshots**: UI changes requiring approval
- **Diff Images**: Visual comparison highlights
- **Browser Variations**: Cross-browser rendering differences

## Improving Coverage

### Unit Test Coverage

**Increase Line Coverage:**
```typescript
// Add tests for error handling
it('should handle API errors', () => {
  apiService.getData().subscribe({
    error: (error) => {
      expect(error).toBeDefined();
    }
  });
});

// Test edge cases
it('should handle empty arrays', () => {
  expect(calculateAverage([])).toBe(0);
});
```

**Improve Branch Coverage:**
```typescript
// Test both conditions
it('should validate user age - adult', () => {
  expect(validateAge(25)).toBe('adult');
});

it('should validate user age - minor', () => {
  expect(validateAge(15)).toBe('minor');
});
```

### Mutation Testing Improvements

**Strengthen Assertions:**
```typescript
// Weak test (might let mutants survive)
it('should process data', () => {
  const result = processData(input);
  expect(result).toBeDefined(); // Too generic
});

// Strong test (kills more mutants)
it('should process data', () => {
  const result = processData({ value: 100 });
  expect(result.processed).toBe(true);
  expect(result.total).toBe(100);
  expect(result.timestamp).toBeInstanceOf(Date);
});
```

### Visual Coverage Enhancements

**Add Component States:**
```typescript
test('should match button states', async ({ page }) => {
  // Default state
  await expect(button).toHaveScreenshot('button-default.png');
  
  // Hover state  
  await button.hover();
  await expect(button).toHaveScreenshot('button-hover.png');
  
  // Disabled state
  await button.evaluate(el => el.disabled = true);
  await expect(button).toHaveScreenshot('button-disabled.png');
});
```

### Accessibility Improvements

**Enhanced A11y Testing:**
```typescript
it('should be fully accessible', async () => {
  await testAccessibility(fixture);
  
  // Test keyboard navigation
  await testKeyboardNavigation(fixture);
  
  // Test screen reader support
  await testScreenReaderAnnouncements(fixture);
});
```

## Coverage Quality Gates

### CI/CD Pipeline Integration
```yaml
- name: Run All Tests
  run: npm run test:all

- name: Check Coverage Thresholds
  run: |
    if [ $(cat reports/latest-coverage-report.json | jq '.summary.overallScore') -lt 80 ]; then
      echo "Coverage below threshold"
      exit 1
    fi
```

### Pre-commit Hooks
```bash
#!/bin/bash
# .githooks/pre-commit
npm run test:unit
npm run test:mutation:quick
```

### Pull Request Requirements
- Unit coverage must not decrease
- New code requires 85%+ coverage
- Mutation score impact documented
- Visual changes approved

## Monitoring and Trends

### Coverage Tracking
Monitor coverage trends over time:
- Weekly coverage reports
- Coverage impact of new features
- Regression identification
- Team performance metrics

### Alerts and Notifications
Set up alerts for:
- Coverage drops below thresholds
- Mutation score regressions
- Accessibility violations introduced
- Visual test failures

## Tools and Configuration

### Unit Testing
- **Framework**: Jasmine + Karma
- **Configuration**: `karma.conf.js`
- **Coverage**: Istanbul/NYC
- **Reports**: HTML, LCOV, JSON

### Mutation Testing  
- **Framework**: Stryker
- **Configuration**: `stryker.conf.json`
- **Mutators**: TypeScript, Angular
- **Reports**: HTML Dashboard

### Visual Testing
- **Framework**: Playwright
- **Configuration**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, Safari
- **Viewports**: Mobile, Tablet, Desktop

### Accessibility Testing
- **Framework**: axe-core
- **Rules**: WCAG 2.1 AA compliance
- **Integration**: Jest + Angular Testing Library
- **Reports**: Detailed violation analysis

## Best Practices

### Writing Testable Code
```typescript
// Good: Pure functions, clear dependencies
export class CalculatorService {
  constructor(private logger: Logger) {}
  
  add(a: number, b: number): number {
    this.logger.log(`Adding ${a} + ${b}`);
    return a + b;
  }
}

// Avoid: Hidden dependencies, side effects
export class BadCalculatorService {
  add(a: number, b: number): number {
    console.log(`Adding ${a} + ${b}`); // Hard to test
    localStorage.setItem('lastCalculation', String(a + b)); // Side effect
    return a + b;
  }
}
```

### Test Organization
```
src/
├── app/
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── api.service.spec.ts          # Unit tests
│   │   └── api.service.a11y.spec.ts     # Accessibility tests
│   └── components/
│       ├── login/
│       │   ├── login.component.ts
│       │   ├── login.component.spec.ts  # Unit tests
│       │   └── login.component.a11y.spec.ts
└── tests/
    ├── visual/
    │   ├── pages/
    │   └── components/
    ├── mutation/
    └── coverage/
```

### Coverage Goals by File Type
- **Services**: 85%+ unit, 70%+ mutation
- **Components**: 80%+ unit, accessibility required
- **Models/Types**: 90%+ unit (simple logic)
- **Validators**: 95%+ unit, 80%+ mutation
- **Utils**: 90%+ unit, 75%+ mutation

This comprehensive coverage system ensures the Conductores PWA maintains high code quality, reliability, and user experience standards.