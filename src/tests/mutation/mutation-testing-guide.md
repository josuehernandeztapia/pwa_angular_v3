# Mutation Testing Guide for Conductores PWA

## Overview
Mutation testing validates the quality of our test suites by introducing small changes (mutations) to the code and checking if the tests catch these changes.

## What is Mutation Testing?

Mutation testing works by:
1. Creating "mutants" - small modifications to your source code
2. Running your test suite against each mutant
3. If tests fail, the mutant is "killed" (good!)
4. If tests pass, the mutant "survives" (indicates weak tests)

## Mutation Score Interpretation

- **90-100%**: Excellent test coverage and quality
- **70-89%**: Good coverage with room for improvement
- **60-69%**: Acceptable but needs attention
- **Below 60%**: Poor test quality, significant improvements needed

## Common Mutation Types

### Arithmetic Operator Mutations
```typescript
// Original
const total = price + tax;

// Mutant
const total = price - tax;  // + changed to -
```

### Conditional Boundary Mutations
```typescript
// Original
if (age >= 18) { ... }

// Mutant  
if (age > 18) { ... }  // >= changed to >
```

### Boolean Literal Mutations
```typescript
// Original
const isActive = true;

// Mutant
const isActive = false;  // true changed to false
```

### Method Call Mutations
```typescript
// Original
array.push(item);

// Mutant
array.pop();  // push changed to pop
```

## Configuration Explanation

### Target Files
We focus mutation testing on:
- **Services**: Core business logic
- **Models**: Data structures and types
- **Validators**: Input validation logic

### Excluded Areas
- Test files (*.spec.ts)
- Test helpers and mocks
- Environment configurations
- Type definitions (*.d.ts)

### Thresholds
- **High (90%)**: Target for critical services
- **Low (70%)**: Minimum acceptable level
- **Break (60%)**: Build fails below this threshold

## Running Mutation Tests

### Full Mutation Test Suite
```bash
npm run test:mutation
```

### Specific Service Testing
```bash
npx stryker run --mutate="src/app/services/api.service.ts"
```

### Update Baseline (After Code Changes)
```bash
npm run test:mutation:update
```

## Interpreting Results

### HTML Report
- Open `reports/mutation/index.html` in browser
- View mutation details by file
- See surviving mutants and recommendations

### Console Output
```
#-----------------------------|-------------|
#File                         | % score     |
#-----------------------------|-------------|
#All files                    | 85.23       |
# src/app/services            | 88.45       |
#  api.service.ts             | 92.31       |
#  data.service.ts            | 84.67       |
#-----------------------------|-------------|
```

## Improving Mutation Scores

### 1. Add Missing Test Cases
If mutants survive, identify missing test scenarios:

```typescript
// If this mutant survives:
if (user.age >= 18) { return 'adult'; }
// Becomes: if (user.age > 18) { return 'adult'; }

// Add boundary test:
it('should return adult for exactly 18 years old', () => {
  expect(getAgeCategory({ age: 18 })).toBe('adult');
});
```

### 2. Test Edge Cases
```typescript
// Test null/undefined values
it('should handle null input', () => {
  expect(() => processData(null)).toThrow();
});

// Test boundary conditions
it('should handle empty arrays', () => {
  expect(calculateAverage([])).toBe(0);
});
```

### 3. Verify Return Values
```typescript
// Don't just test that method was called
it('should return correct calculation result', () => {
  const result = calculateTax(100, 0.1);
  expect(result).toBe(10); // Specific value assertion
});
```

### 4. Test Error Conditions
```typescript
it('should throw error for invalid input', () => {
  expect(() => validateEmail('invalid')).toThrow('Invalid email format');
});
```

## Best Practices

### 1. Focus on Critical Code
Prioritize mutation testing for:
- Business logic services
- Validation functions
- Financial calculations
- Security-related code

### 2. Don't Chase 100%
- Some mutations may not be practically testable
- Focus on meaningful coverage improvements
- Consider excluding trivial mutations

### 3. Regular Execution
- Run mutation tests on CI/CD pipeline
- Include in code review process
- Track mutation score trends over time

### 4. Balance Performance
- Mutation testing is resource-intensive
- Run full suite nightly or weekly
- Use incremental mode for regular development

## Common Issues and Solutions

### Performance Issues
```json
{
  "maxConcurrentTestRunners": 2,
  "timeoutMS": 30000,
  "timeoutFactor": 2
}
```

### Memory Problems
```bash
export NODE_OPTIONS="--max_old_space_size=4096"
npm run test:mutation
```

### Flaky Tests
- Ensure tests are deterministic
- Mock external dependencies
- Fix timing issues in async tests

### False Positives
Some mutations may not be meaningful to test:
```typescript
// Logging mutations - often acceptable to ignore
console.log('Processing started');
// vs
console.error('Processing started');
```

## Integration with Development Workflow

### Pre-commit Hook
```bash
# Check mutation score before commit
npm run test:mutation:quick
```

### CI/CD Pipeline
```yaml
- name: Run Mutation Tests
  run: npm run test:mutation
- name: Upload Mutation Report
  uses: actions/upload-artifact@v2
  with:
    name: mutation-report
    path: reports/mutation/
```

### Code Review Process
1. Check mutation score impact of changes
2. Review surviving mutants for new code
3. Ensure new tests kill relevant mutations

## Metrics and Monitoring

### Track Over Time
- Overall mutation score trend
- Per-service mutation scores
- New vs surviving mutants
- Test execution performance

### Quality Gates
- Require 80%+ mutation score for critical services
- Block PRs with score regression > 5%
- Monitor test suite execution time

## Advanced Configuration

### Service-Specific Thresholds
```json
{
  "thresholds": {
    "src/app/services/api.service.ts": { "break": 90 },
    "src/app/services/auth.service.ts": { "break": 85 },
    "default": { "break": 70 }
  }
}
```

### Custom Mutators
```json
{
  "mutator": {
    "excludedMutations": [
      "StringLiteral",    // Skip string mutations
      "BooleanLiteral"    // Skip boolean mutations
    ]
  }
}
```

This mutation testing setup ensures our test suite robustly validates the critical business logic of the Conductores PWA application.