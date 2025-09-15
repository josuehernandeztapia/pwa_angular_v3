/**
 * 🚀 Lighthouse Performance Gates - Production Readiness
 * Automated performance validation with enterprise thresholds
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// 🎯 ENTERPRISE PERFORMANCE THRESHOLDS
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals (Google Standards)
  'first-contentful-paint': 1800,        // < 1.8s (Good)
  'largest-contentful-paint': 2500,      // < 2.5s (Good) 
  'cumulative-layout-shift': 0.1,        // < 0.1 (Good)
  'first-input-delay': 100,              // < 100ms (Good)
  'interaction-to-next-paint': 200,      // < 200ms (Good)
  
  // Lighthouse Scores (0-100)
  'performance': 90,                     // > 90 (Green)
  'accessibility': 95,                   // > 95 (Excellent)
  'best-practices': 90,                  // > 90 (Green)
  'seo': 85,                            // > 85 (Good)
  'pwa': 80,                            // > 80 (PWA Ready)
  
  // Additional Metrics
  'speed-index': 3000,                   // < 3s
  'total-blocking-time': 300,            // < 300ms
  'max-potential-fid': 130               // < 130ms
};

// 🎯 TEST CONFIGURATIONS
const TEST_CONFIGS = {
  desktop: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1
      }
    }
  },
  mobile: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 360,
        height: 640,
        deviceScaleFactor: 2
      },
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4
      }
    }
  }
};

// 🌍 URLS TO TEST
const TEST_URLS = [
  { 
    name: 'Dashboard',
    url: 'http://localhost:4200/#/dashboard',
    critical: true
  },
  {
    name: 'Cotizador', 
    url: 'http://localhost:4200/#/cotizador',
    critical: true
  },
  {
    name: 'Simulator',
    url: 'http://localhost:4200/#/simulador',
    critical: false
  },
  {
    name: 'Landing Page',
    url: 'http://localhost:4200',
    critical: true
  }
];

class PerformanceGates {
  constructor() {
    this.results = [];
    this.reportDir = path.join(__dirname, '../test-results/performance');
    
    // Ensure report directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async runLighthouseAudit(url, config, formFactor = 'desktop') {
    console.log(`🔍 Running Lighthouse audit: ${url} (${formFactor})`);
    
    const chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    try {
      const result = await lighthouse(url, {
        port: chrome.port,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
        disableStorageReset: false
      }, config);

      return result;
    } finally {
      await chrome.kill();
    }
  }

  evaluatePerformance(lhr, urlInfo, formFactor) {
    const evaluation = {
      url: urlInfo.name,
      formFactor,
      timestamp: new Date().toISOString(),
      critical: urlInfo.critical,
      passed: true,
      warnings: [],
      failures: [],
      metrics: {},
      scores: {}
    };

    // Extract scores
    Object.keys(lhr.categories).forEach(categoryName => {
      const category = lhr.categories[categoryName];
      const score = Math.round(category.score * 100);
      evaluation.scores[categoryName] = score;

      const threshold = PERFORMANCE_THRESHOLDS[categoryName];
      if (threshold && score < threshold) {
        const failure = `${categoryName}: ${score} < ${threshold}`;
        evaluation.failures.push(failure);
        evaluation.passed = false;
      }
    });

    // Extract key metrics
    const metrics = lhr.audits;
    Object.keys(PERFORMANCE_THRESHOLDS).forEach(metricName => {
      if (metrics[metricName]) {
        const audit = metrics[metricName];
        let value = audit.numericValue || audit.score;
        
        // Handle different metric units
        if (metricName.includes('paint') || metricName.includes('speed-index') || 
            metricName.includes('blocking') || metricName.includes('fid')) {
          value = Math.round(value); // Convert to ms
        }

        evaluation.metrics[metricName] = value;

        const threshold = PERFORMANCE_THRESHOLDS[metricName];
        if (threshold) {
          const isWithinThreshold = metricName.includes('shift') ? 
            value <= threshold : value <= threshold;

          if (!isWithinThreshold) {
            const failure = `${metricName}: ${value} > ${threshold}`;
            evaluation.failures.push(failure);
            evaluation.passed = false;
          }
        }
      }
    });

    // Check for critical performance issues
    if (evaluation.scores.performance < 50) {
      evaluation.failures.push('CRITICAL: Performance score below 50');
      evaluation.passed = false;
    }

    if (evaluation.scores.accessibility < 90) {
      evaluation.warnings.push('Accessibility score below 90');
    }

    return evaluation;
  }

  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportDir, `lighthouse-report-${timestamp}.html`);
    const jsonPath = path.join(this.reportDir, `lighthouse-results-${timestamp}.json`);

    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      criticalPassed: this.results.filter(r => r.critical && r.passed).length,
      criticalFailed: this.results.filter(r => r.critical && !r.passed).length,
      overallSuccess: this.results.filter(r => r.critical).every(r => r.passed),
      results: this.results
    };

    // Save JSON results
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(summary);
    fs.writeFileSync(reportPath, htmlReport);

    console.log(`\n📊 Performance Report Generated:`);
    console.log(`   HTML: ${reportPath}`);
    console.log(`   JSON: ${jsonPath}`);

    return summary;
  }

  generateHTMLReport(summary) {
    const passRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
    const criticalPassRate = summary.criticalPassed + summary.criticalFailed > 0 ? 
      ((summary.criticalPassed / (summary.criticalPassed + summary.criticalFailed)) * 100).toFixed(1) : 100;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Conductores PWA - Performance Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
        .header { background: linear-gradient(135deg, #22d3ee, #0891b2); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #22d3ee; }
        .metric-value { font-size: 2em; font-weight: bold; color: #0891b2; }
        .metric-label { color: #64748b; font-size: 0.9em; }
        .results-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .results-table th, .results-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .results-table th { background: #f1f5f9; font-weight: 600; }
        .passed { color: #16a34a; }
        .failed { color: #dc2626; }
        .warning { color: #ea580c; }
        .score-bar { width: 100px; height: 20px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
        .score-fill { height: 100%; border-radius: 10px; }
        .score-green { background: #16a34a; }
        .score-yellow { background: #ea580c; }
        .score-red { background: #dc2626; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Conductores PWA - Performance Gates Report</h1>
        <p>Generated: ${summary.timestamp}</p>
        <p>Overall Success: ${summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}</p>
    </div>

    <div class="summary">
        <div class="metric-card">
            <div class="metric-value">${passRate}%</div>
            <div class="metric-label">Overall Pass Rate</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${criticalPassRate}%</div>
            <div class="metric-label">Critical Pages Pass Rate</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${summary.passed}/${summary.totalTests}</div>
            <div class="metric-label">Tests Passed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${summary.criticalPassed}/${summary.criticalPassed + summary.criticalFailed}</div>
            <div class="metric-label">Critical Tests Passed</div>
        </div>
    </div>

    <h2>📋 Detailed Results</h2>
    <table class="results-table">
        <thead>
            <tr>
                <th>Page</th>
                <th>Device</th>
                <th>Status</th>
                <th>Performance</th>
                <th>Accessibility</th>
                <th>Best Practices</th>
                <th>SEO</th>
                <th>Issues</th>
            </tr>
        </thead>
        <tbody>
            ${summary.results.map(result => `
                <tr>
                    <td>${result.url} ${result.critical ? '⭐' : ''}</td>
                    <td>${result.formFactor}</td>
                    <td class="${result.passed ? 'passed' : 'failed'}">
                        ${result.passed ? '✅ PASS' : '❌ FAIL'}
                    </td>
                    <td>
                        <div class="score-bar">
                            <div class="score-fill ${this.getScoreClass(result.scores.performance)}" 
                                 style="width: ${result.scores.performance}%"></div>
                        </div>
                        ${result.scores.performance}
                    </td>
                    <td>
                        <div class="score-bar">
                            <div class="score-fill ${this.getScoreClass(result.scores.accessibility)}" 
                                 style="width: ${result.scores.accessibility}%"></div>
                        </div>
                        ${result.scores.accessibility}
                    </td>
                    <td>
                        <div class="score-bar">
                            <div class="score-fill ${this.getScoreClass(result.scores['best-practices'])}" 
                                 style="width: ${result.scores['best-practices']}%"></div>
                        </div>
                        ${result.scores['best-practices']}
                    </td>
                    <td>
                        <div class="score-bar">
                            <div class="score-fill ${this.getScoreClass(result.scores.seo)}" 
                                 style="width: ${result.scores.seo}%"></div>
                        </div>
                        ${result.scores.seo}
                    </td>
                    <td>
                        ${result.failures.length > 0 ? `<span class="failed">${result.failures.length} failures</span>` : ''}
                        ${result.warnings.length > 0 ? `<span class="warning">${result.warnings.length} warnings</span>` : ''}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <h2>🎯 Performance Thresholds</h2>
    <p>This report validates against enterprise-grade performance standards:</p>
    <ul>
        <li><strong>Performance Score:</strong> ≥ 90 (Green)</li>
        <li><strong>Accessibility Score:</strong> ≥ 95 (Excellent)</li>
        <li><strong>First Contentful Paint:</strong> ≤ 1.8s</li>
        <li><strong>Largest Contentful Paint:</strong> ≤ 2.5s</li>
        <li><strong>Cumulative Layout Shift:</strong> ≤ 0.1</li>
    </ul>
</body>
</html>
    `;
  }

  getScoreClass(score) {
    if (score >= 90) return 'score-green';
    if (score >= 50) return 'score-yellow';
    return 'score-red';
  }

  async runPerformanceGates() {
    console.log('🚀 Starting Lighthouse Performance Gates');
    console.log('=' .repeat(60));

    const startTime = Date.now();

    try {
      // Test each URL with both desktop and mobile configs
      for (const urlInfo of TEST_URLS) {
        console.log(`\n🌐 Testing: ${urlInfo.name} (${urlInfo.url})`);
        
        // Desktop test
        try {
          const desktopResult = await this.runLighthouseAudit(
            urlInfo.url, 
            TEST_CONFIGS.desktop, 
            'desktop'
          );
          const desktopEval = this.evaluatePerformance(desktopResult.lhr, urlInfo, 'desktop');
          this.results.push(desktopEval);
          
          console.log(`   📱 Desktop: ${desktopEval.passed ? '✅ PASS' : '❌ FAIL'} (Perf: ${desktopEval.scores.performance})`);
        } catch (error) {
          console.error(`   ❌ Desktop test failed: ${error.message}`);
          this.results.push({
            ...urlInfo,
            formFactor: 'desktop',
            passed: false,
            failures: [`Test execution failed: ${error.message}`],
            scores: { performance: 0, accessibility: 0 }
          });
        }

        // Mobile test
        try {
          const mobileResult = await this.runLighthouseAudit(
            urlInfo.url, 
            TEST_CONFIGS.mobile, 
            'mobile'
          );
          const mobileEval = this.evaluatePerformance(mobileResult.lhr, urlInfo, 'mobile');
          this.results.push(mobileEval);
          
          console.log(`   📱 Mobile: ${mobileEval.passed ? '✅ PASS' : '❌ FAIL'} (Perf: ${mobileEval.scores.performance})`);
        } catch (error) {
          console.error(`   ❌ Mobile test failed: ${error.message}`);
          this.results.push({
            ...urlInfo,
            formFactor: 'mobile', 
            passed: false,
            failures: [`Test execution failed: ${error.message}`],
            scores: { performance: 0, accessibility: 0 }
          });
        }
      }

      // Generate report
      const summary = await this.generateReport();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 PERFORMANCE GATES SUMMARY');
      console.log('='.repeat(60));
      console.log(`⏱️  Total Duration: ${duration}s`);
      console.log(`🎯 Pass Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
      console.log(`⭐ Critical Pages: ${summary.criticalPassed}/${summary.criticalPassed + summary.criticalFailed} passed`);
      console.log(`📊 Overall: ${summary.overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);

      if (!summary.overallSuccess) {
        console.log('\n❌ Critical performance issues found:');
        this.results.filter(r => r.critical && !r.passed).forEach(result => {
          console.log(`   ${result.url} (${result.formFactor}): ${result.failures.join(', ')}`);
        });
        process.exit(1);
      } else {
        console.log('\n✅ All critical pages meet performance standards!');
        console.log('🚀 Ready for production deployment.');
      }

      return summary;
      
    } catch (error) {
      console.error('❌ Performance Gates failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const gates = new PerformanceGates();
  gates.runPerformanceGates().catch(console.error);
}

module.exports = { PerformanceGates, PERFORMANCE_THRESHOLDS };