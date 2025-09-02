#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Comprehensive Coverage Report Generator
 * Combines different coverage metrics into a unified report
 */

const COVERAGE_DIR = 'coverage';
const REPORTS_DIR = 'reports';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

class CoverageReportGenerator {
  constructor() {
    this.metrics = {
      unit: null,
      mutation: null,
      e2e: null,
      accessibility: null,
      overall: null
    };
  }

  async generateComprehensiveReport() {
    console.log('🚀 Generating comprehensive coverage report...');
    
    try {
      // Ensure directories exist
      this.ensureDirectories();
      
      // Collect coverage data from different sources
      await this.collectUnitTestCoverage();
      await this.collectMutationTestData();
      await this.collectAccessibilityTestData();
      
      // Generate combined report
      await this.generateCombinedReport();
      
      // Generate summary dashboard
      await this.generateSummaryDashboard();
      
      console.log('✅ Comprehensive coverage report generated successfully!');
      console.log(`📁 Report location: ${path.join(REPORTS_DIR, 'coverage-dashboard.html')}`);
      
    } catch (error) {
      console.error('❌ Error generating coverage report:', error);
      process.exit(1);
    }
  }

  ensureDirectories() {
    const dirs = [COVERAGE_DIR, REPORTS_DIR, path.join(REPORTS_DIR, 'assets')];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async collectUnitTestCoverage() {
    console.log('📊 Collecting unit test coverage...');
    
    const coverageFile = path.join(COVERAGE_DIR, 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      this.metrics.unit = this.processCoverageData(coverage);
      console.log('✅ Unit test coverage collected');
    } else {
      console.warn('⚠️  Unit test coverage file not found');
      this.metrics.unit = this.getEmptyMetrics();
    }
  }

  async collectMutationTestData() {
    console.log('🧬 Collecting mutation test data...');
    
    const mutationReportFile = path.join(REPORTS_DIR, 'mutation', 'report.json');
    if (fs.existsSync(mutationReportFile)) {
      const mutationData = JSON.parse(fs.readFileSync(mutationReportFile, 'utf8'));
      this.metrics.mutation = this.processMutationData(mutationData);
      console.log('✅ Mutation test data collected');
    } else {
      console.warn('⚠️  Mutation test report not found');
      this.metrics.mutation = { score: 0, killed: 0, survived: 0, timeout: 0 };
    }
  }

  async collectAccessibilityTestData() {
    console.log('♿ Collecting accessibility test data...');
    
    // This would be collected from axe-core reports if available
    this.metrics.accessibility = {
      passed: 0,
      failed: 0,
      violations: 0,
      score: 0
    };
    console.log('✅ Accessibility test data collected');
  }

  processCoverageData(coverage) {
    const total = coverage.total;
    return {
      lines: {
        covered: total.lines.covered || 0,
        total: total.lines.total || 0,
        percentage: total.lines.pct || 0
      },
      functions: {
        covered: total.functions.covered || 0,
        total: total.functions.total || 0,
        percentage: total.functions.pct || 0
      },
      statements: {
        covered: total.statements.covered || 0,
        total: total.statements.total || 0,
        percentage: total.statements.pct || 0
      },
      branches: {
        covered: total.branches.covered || 0,
        total: total.branches.total || 0,
        percentage: total.branches.pct || 0
      }
    };
  }

  processMutationData(mutationData) {
    // Process Stryker mutation test results
    return {
      score: mutationData.mutationScore || 0,
      killed: mutationData.killed || 0,
      survived: mutationData.survived || 0,
      timeout: mutationData.timeout || 0,
      total: mutationData.totalMutants || 0
    };
  }

  getEmptyMetrics() {
    return {
      lines: { covered: 0, total: 0, percentage: 0 },
      functions: { covered: 0, total: 0, percentage: 0 },
      statements: { covered: 0, total: 0, percentage: 0 },
      branches: { covered: 0, total: 0, percentage: 0 }
    };
  }

  async generateCombinedReport() {
    console.log('📋 Generating combined coverage report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      project: 'Conductores PWA',
      version: this.getProjectVersion(),
      summary: this.calculateOverallMetrics(),
      details: {
        unitTests: this.metrics.unit,
        mutationTesting: this.metrics.mutation,
        accessibilityTesting: this.metrics.accessibility
      },
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(REPORTS_DIR, `coverage-report-${TIMESTAMP}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Also save as latest
    fs.writeFileSync(path.join(REPORTS_DIR, 'latest-coverage-report.json'), JSON.stringify(report, null, 2));
    
    console.log('✅ Combined report generated');
    return report;
  }

  calculateOverallMetrics() {
    const unit = this.metrics.unit;
    const mutation = this.metrics.mutation;
    
    return {
      overallScore: this.calculateWeightedScore(),
      coverageHealth: this.getCoverageHealthStatus(),
      testQuality: this.getTestQualityScore(),
      recommendations: this.getTopRecommendations()
    };
  }

  calculateWeightedScore() {
    const weights = {
      lines: 0.3,
      functions: 0.25,
      statements: 0.25,
      branches: 0.2
    };

    if (!this.metrics.unit) return 0;

    return Math.round(
      (this.metrics.unit.lines.percentage * weights.lines) +
      (this.metrics.unit.functions.percentage * weights.functions) +
      (this.metrics.unit.statements.percentage * weights.statements) +
      (this.metrics.unit.branches.percentage * weights.branches)
    );
  }

  getCoverageHealthStatus() {
    const score = this.calculateWeightedScore();
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'FAIR';
    if (score >= 60) return 'POOR';
    return 'CRITICAL';
  }

  getTestQualityScore() {
    const mutationScore = this.metrics.mutation.score || 0;
    if (mutationScore >= 90) return 'HIGH';
    if (mutationScore >= 70) return 'MEDIUM';
    return 'LOW';
  }

  getTopRecommendations() {
    const recommendations = [];
    
    if (this.metrics.unit.branches.percentage < 80) {
      recommendations.push('Improve branch coverage by adding more conditional test cases');
    }
    
    if (this.metrics.unit.functions.percentage < 85) {
      recommendations.push('Increase function coverage by testing all public methods');
    }
    
    if (this.metrics.mutation.score < 75) {
      recommendations.push('Enhance test quality to catch more code mutations');
    }
    
    return recommendations.slice(0, 3);
  }

  generateRecommendations() {
    const recommendations = [];
    const unit = this.metrics.unit;
    const mutation = this.metrics.mutation;

    // Coverage recommendations
    if (unit.lines.percentage < 80) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        title: 'Improve Line Coverage',
        description: `Current line coverage is ${unit.lines.percentage}%. Target: 80%+`,
        action: 'Add tests for uncovered lines of code'
      });
    }

    if (unit.branches.percentage < 75) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        title: 'Improve Branch Coverage',
        description: `Current branch coverage is ${unit.branches.percentage}%. Target: 75%+`,
        action: 'Add tests for conditional logic and error handling paths'
      });
    }

    // Mutation testing recommendations
    if (mutation.score < 70) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        title: 'Improve Test Quality',
        description: `Mutation score is ${mutation.score}%. Target: 70%+`,
        action: 'Review surviving mutants and add more specific assertions'
      });
    }

    return recommendations;
  }

  async generateSummaryDashboard() {
    console.log('📊 Generating coverage dashboard...');
    
    const htmlContent = this.generateDashboardHTML();
    const dashboardPath = path.join(REPORTS_DIR, 'coverage-dashboard.html');
    fs.writeFileSync(dashboardPath, htmlContent);
    
    // Generate CSS
    const cssContent = this.generateDashboardCSS();
    fs.writeFileSync(path.join(REPORTS_DIR, 'assets', 'dashboard.css'), cssContent);
    
    console.log('✅ Coverage dashboard generated');
  }

  generateDashboardHTML() {
    const unit = this.metrics.unit;
    const mutation = this.metrics.mutation;
    const overallScore = this.calculateWeightedScore();
    const healthStatus = this.getCoverageHealthStatus();
    const recommendations = this.generateRecommendations();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Dashboard - Conductores PWA</title>
    <link rel="stylesheet" href="assets/dashboard.css">
</head>
<body>
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>🧪 Test Coverage Dashboard</h1>
            <p>Conductores PWA - Generated on ${new Date().toLocaleString()}</p>
        </header>

        <div class="metrics-grid">
            <div class="metric-card overall">
                <h2>Overall Score</h2>
                <div class="score ${healthStatus.toLowerCase()}">${overallScore}%</div>
                <div class="status">${healthStatus}</div>
            </div>

            <div class="metric-card">
                <h3>Line Coverage</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${unit.lines.percentage}%"></div>
                </div>
                <div class="metric-details">${unit.lines.covered}/${unit.lines.total} (${unit.lines.percentage}%)</div>
            </div>

            <div class="metric-card">
                <h3>Function Coverage</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${unit.functions.percentage}%"></div>
                </div>
                <div class="metric-details">${unit.functions.covered}/${unit.functions.total} (${unit.functions.percentage}%)</div>
            </div>

            <div class="metric-card">
                <h3>Branch Coverage</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${unit.branches.percentage}%"></div>
                </div>
                <div class="metric-details">${unit.branches.covered}/${unit.branches.total} (${unit.branches.percentage}%)</div>
            </div>

            <div class="metric-card">
                <h3>Statement Coverage</h3>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${unit.statements.percentage}%"></div>
                </div>
                <div class="metric-details">${unit.statements.covered}/${unit.statements.total} (${unit.statements.percentage}%)</div>
            </div>

            <div class="metric-card mutation">
                <h3>Mutation Score</h3>
                <div class="score">${mutation.score}%</div>
                <div class="mutation-details">
                    <div>Killed: ${mutation.killed}</div>
                    <div>Survived: ${mutation.survived}</div>
                    <div>Timeout: ${mutation.timeout}</div>
                </div>
            </div>
        </div>

        <div class="recommendations">
            <h2>📋 Recommendations</h2>
            ${recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <h3>${rec.title}</h3>
                    <p>${rec.description}</p>
                    <div class="action">${rec.action}</div>
                </div>
            `).join('')}
        </div>

        <div class="links">
            <h2>📊 Detailed Reports</h2>
            <ul>
                <li><a href="../coverage/lcov-report/index.html">Unit Test Coverage Report</a></li>
                <li><a href="mutation/index.html">Mutation Test Report</a></li>
                <li><a href="visual/index.html">Visual Test Report</a></li>
            </ul>
        </div>
    </div>
</body>
</html>`;
  }

  generateDashboardCSS() {
    return `
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
    color: #333;
}

.dashboard {
    max-width: 1200px;
    margin: 0 auto;
}

.dashboard-header {
    text-align: center;
    margin-bottom: 30px;
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.dashboard-header h1 {
    margin: 0;
    color: #2c3e50;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.metric-card {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.metric-card.overall {
    grid-column: 1 / -1;
    text-align: center;
}

.metric-card h2, .metric-card h3 {
    margin: 0 0 15px 0;
    color: #2c3e50;
}

.score {
    font-size: 2.5em;
    font-weight: bold;
    margin: 10px 0;
}

.score.excellent { color: #27ae60; }
.score.good { color: #2ecc71; }
.score.fair { color: #f39c12; }
.score.poor { color: #e74c3c; }
.score.critical { color: #c0392b; }

.status {
    font-size: 1.2em;
    font-weight: bold;
    text-transform: uppercase;
}

.progress-bar {
    width: 100%;
    height: 20px;
    background-color: #ecf0f1;
    border-radius: 10px;
    overflow: hidden;
    margin: 10px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3498db, #2ecc71);
    transition: width 0.3s ease;
}

.metric-details {
    font-size: 0.9em;
    color: #7f8c8d;
}

.mutation-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 10px;
    font-size: 0.9em;
}

.recommendations {
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 30px;
}

.recommendation {
    border-left: 4px solid #3498db;
    padding: 15px;
    margin: 15px 0;
    background: #f8f9fa;
    border-radius: 0 4px 4px 0;
}

.recommendation.high { border-left-color: #e74c3c; }
.recommendation.medium { border-left-color: #f39c12; }
.recommendation.low { border-left-color: #27ae60; }

.recommendation h3 {
    margin: 0 0 10px 0;
    color: #2c3e50;
}

.recommendation p {
    margin: 0 0 10px 0;
    color: #7f8c8d;
}

.action {
    font-weight: bold;
    color: #2c3e50;
}

.links {
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.links ul {
    list-style: none;
    padding: 0;
}

.links li {
    margin: 10px 0;
}

.links a {
    color: #3498db;
    text-decoration: none;
    font-weight: bold;
}

.links a:hover {
    text-decoration: underline;
}

@media (max-width: 768px) {
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    
    .metric-card.overall {
        grid-column: 1;
    }
    
    .mutation-details {
        grid-template-columns: 1fr;
        text-align: center;
    }
}
    `;
  }

  getProjectVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}

// Run the coverage report generator
if (require.main === module) {
  const generator = new CoverageReportGenerator();
  generator.generateComprehensiveReport().catch(console.error);
}

module.exports = CoverageReportGenerator;
`;