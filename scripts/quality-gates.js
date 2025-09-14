#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚦 Evaluating Quality Gates...\n');

const results = {
  coverage: false,
  bundleSize: false,
  lighthouse: false,
  accessibility: false,
  passed: 0,
  total: 0
};

// Check Coverage
try {
  if (fs.existsSync('coverage/merged/lcov.info')) {
    results.total++;
    const lcovContent = fs.readFileSync('coverage/merged/lcov.info', 'utf8');
    const coverageMatch = lcovContent.match(/lines\.*: (\d+\.?\d*)%/);
    if (coverageMatch) {
      const coverage = parseFloat(coverageMatch[1]);
      const minCoverage = parseInt(process.env.MINIMUM_COVERAGE || '90');
      results.coverage = coverage >= minCoverage;
      if (results.coverage) results.passed++;
      console.log(`📊 Coverage: ${coverage}% (Required: ${minCoverage}%) ${results.coverage ? '✅' : '❌'}`);
    }
  }
} catch (error) {
  console.log('📊 Coverage: Not available ⚠️');
}

// Check Bundle Size
try {
  if (fs.existsSync('dist/conductores-pwa')) {
    results.total++;
    const mainFiles = fs.readdirSync('dist/conductores-pwa').filter(f => f.startsWith('main.'));
    if (mainFiles.length > 0) {
      const stats = fs.statSync(path.join('dist/conductores-pwa', mainFiles[0]));
      const maxSize = parseInt(process.env.MAX_BUNDLE_SIZE || '5242880'); // 5MB
      results.bundleSize = stats.size <= maxSize;
      if (results.bundleSize) results.passed++;
      console.log(`📦 Bundle Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB (Max: ${(maxSize / 1024 / 1024).toFixed(2)}MB) ${results.bundleSize ? '✅' : '❌'}`);
    }
  }
} catch (error) {
  console.log('📦 Bundle Size: Cannot evaluate ⚠️');
}

// Check Lighthouse Score
try {
  if (fs.existsSync('lighthouse-reports') && fs.readdirSync('lighthouse-reports').length > 0) {
    results.total++;
    const reportFiles = fs.readdirSync('lighthouse-reports').filter(f => f.endsWith('.json'));
    if (reportFiles.length > 0) {
      const report = JSON.parse(fs.readFileSync(path.join('lighthouse-reports', reportFiles[0]), 'utf8'));
      const performanceScore = report.categories.performance.score * 100;
      const minScore = parseInt(process.env.MAX_LIGHTHOUSE_SCORE || '90');
      results.lighthouse = performanceScore >= minScore;
      if (results.lighthouse) results.passed++;
      console.log(`🔍 Lighthouse Performance: ${performanceScore}% (Required: ${minScore}%) ${results.lighthouse ? '✅' : '❌'}`);
    }
  }
} catch (error) {
  console.log('🔍 Lighthouse: Not available ⚠️');
}

// Check Accessibility
try {
  if (fs.existsSync('reports/accessibility/results.json')) {
    results.total++;
    const a11yReport = JSON.parse(fs.readFileSync('reports/accessibility/results.json', 'utf8'));
    const violations = a11yReport.violations || [];
    const maxViolations = parseInt(process.env.MAX_ACCESSIBILITY_VIOLATIONS || '0');
    results.accessibility = violations.length <= maxViolations;
    if (results.accessibility) results.passed++;
    console.log(`♿ Accessibility: ${violations.length} violations (Max: ${maxViolations}) ${results.accessibility ? '✅' : '❌'}`);
  }
} catch (error) {
  console.log('♿ Accessibility: Not available ⚠️');
}

console.log(`\n🏆 Quality Gates: ${results.passed}/${results.total} passed`);

// If no artifacts were generated for any gate (e.g., smoke-only runs), do not block CI
if (results.total === 0) {
  console.log('ℹ️ No quality artifacts found (coverage/bundle/lighthouse/a11y). Skipping gates.');
  process.exit(0);
}

if (results.passed === results.total) {
  console.log('✅ All quality gates passed! Ready for deployment.');
  process.exit(0);
} else {
  console.log('❌ Some quality gates failed. Deployment blocked.');
  process.exit(1);
}
