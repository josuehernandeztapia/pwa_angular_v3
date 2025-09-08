/**
 * Accessibility Report Generator
 * 
 * Generates comprehensive accessibility reports in multiple formats
 * Supports HTML, JSON, and CSV output formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { AccessibilityTestResult, AccessibilityViolation } from '../../src/test-helpers/accessibility-test-framework';

export interface ReportConfig {
  outputDir: string;
  projectName: string;
  includeHtml: boolean;
  includeJson: boolean;
  includeCsv: boolean;
  includeDetails: boolean;
}

export interface AccessibilityReport {
  summary: {
    totalComponents: number;
    totalViolations: number;
    totalPasses: number;
    violationsByImpact: {
      critical: number;
      serious: number;
      moderate: number;
      minor: number;
    };
    complianceScore: number;
    wcagLevel: string;
  };
  results: AccessibilityTestResult[];
  timestamp: string;
  projectName: string;
}

export class AccessibilityReportGenerator {
  private config: ReportConfig;

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = {
      outputDir: 'reports/accessibility',
      projectName: 'Conductores PWA',
      includeHtml: true,
      includeJson: true,
      includeCsv: false,
      includeDetails: true,
      ...config
    };

    this.ensureOutputDirectory();
  }

  /**
   * Generate complete accessibility report
   */
  generateReport(results: AccessibilityTestResult[]): AccessibilityReport {
    const report: AccessibilityReport = {
      summary: this.generateSummary(results),
      results,
      timestamp: new Date().toISOString(),
      projectName: this.config.projectName
    };

    if (this.config.includeJson) {
      this.generateJsonReport(report);
    }

    if (this.config.includeHtml) {
      this.generateHtmlReport(report);
    }

    if (this.config.includeCsv) {
      this.generateCsvReport(report);
    }

    return report;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(results: AccessibilityTestResult[]): AccessibilityReport['summary'] {
    const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
    const totalPasses = results.reduce((sum, r) => sum + r.passes, 0);
    
    const violationsByImpact = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0
    };

    results.forEach(result => {
      result.violations.forEach(violation => {
        violationsByImpact[violation.impact]++;
      });
    });

    // Calculate compliance score (0-100)
    const totalTests = totalViolations + totalPasses;
    const complianceScore = totalTests > 0 ? Math.round((totalPasses / totalTests) * 100) : 100;

    return {
      totalComponents: results.length,
      totalViolations,
      totalPasses,
      violationsByImpact,
      complianceScore,
      wcagLevel: 'AA'
    };
  }

  /**
   * Generate JSON report
   */
  private generateJsonReport(report: AccessibilityReport): void {
    const filename = `accessibility-report-${this.getTimestamp()}.json`;
    const filepath = path.join(this.config.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📋 JSON report generated: ${filepath}`);
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: AccessibilityReport): void {
    const html = this.generateHtmlContent(report);
    const filename = `accessibility-report-${this.getTimestamp()}.html`;
    const filepath = path.join(this.config.outputDir, filename);
    
    fs.writeFileSync(filepath, html, 'utf8');
    console.log(`📄 HTML report generated: ${filepath}`);
  }

  /**
   * Generate CSV report
   */
  private generateCsvReport(report: AccessibilityReport): void {
    const csv = this.generateCsvContent(report);
    const filename = `accessibility-violations-${this.getTimestamp()}.csv`;
    const filepath = path.join(this.config.outputDir, filename);
    
    fs.writeFileSync(filepath, csv, 'utf8');
    console.log(`📊 CSV report generated: ${filepath}`);
  }

  /**
   * Generate HTML content
   */
  private generateHtmlContent(report: AccessibilityReport): string {
    const { summary } = report;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Report - ${report.projectName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: white; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6c757d; font-size: 0.9em; }
        .violations { margin: 30px 0; }
        .violation { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; }
        .violation.critical { background: #f8d7da; border-color: #dc3545; }
        .violation.serious { background: #f5c2c7; border-color: #fd7e14; }
        .violation.moderate { background: #fff3cd; border-color: #ffc107; }
        .violation.minor { background: #d4edda; border-color: #20c997; }
        .component-results { margin: 20px 0; }
        .component { border: 1px solid #e9ecef; border-radius: 8px; margin: 15px 0; overflow: hidden; }
        .component-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .component-content { padding: 15px; }
        .score { font-size: 1.2em; font-weight: bold; }
        .score.excellent { color: #28a745; }
        .score.good { color: #20c997; }
        .score.fair { color: #ffc107; }
        .score.poor { color: #dc3545; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Accessibility Report</h1>
        <h2>${report.projectName}</h2>
        <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        <p><strong>WCAG Level:</strong> ${summary.wcagLevel}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value score ${this.getScoreClass(summary.complianceScore)}">${summary.complianceScore}%</div>
            <div class="metric-label">Compliance Score</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.totalComponents}</div>
            <div class="metric-label">Components Tested</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.totalViolations}</div>
            <div class="metric-label">Total Violations</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.totalPasses}</div>
            <div class="metric-label">Tests Passed</div>
        </div>
    </div>

    <div class="violations">
        <h3>Violations by Impact</h3>
        <div class="summary">
            <div class="metric">
                <div class="metric-value" style="color: #dc3545">${summary.violationsByImpact.critical}</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #fd7e14">${summary.violationsByImpact.serious}</div>
                <div class="metric-label">Serious</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #ffc107">${summary.violationsByImpact.moderate}</div>
                <div class="metric-label">Moderate</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #20c997">${summary.violationsByImpact.minor}</div>
                <div class="metric-label">Minor</div>
            </div>
        </div>
    </div>

    ${this.config.includeDetails ? this.generateComponentDetails(report.results) : ''}
</body>
</html>`;
  }

  /**
   * Generate component details section
   */
  private generateComponentDetails(results: AccessibilityTestResult[]): string {
    return `
    <div class="component-results">
        <h3>Component Results</h3>
        ${results.map(result => `
            <div class="component">
                <div class="component-header">
                    ${result.component} 
                    <span style="float: right;">
                        ${result.violations.length === 0 ? '✅' : '🚨'} 
                        ${result.violations.length} violations, ${result.passes} passes
                    </span>
                </div>
                ${result.violations.length > 0 ? `
                <div class="component-content">
                    ${result.violations.map(violation => `
                        <div class="violation ${violation.impact}">
                            <strong>${violation.id}</strong> (${violation.impact})
                            <p>${violation.description}</p>
                            <p><a href="${violation.helpUrl}" target="_blank">Learn more</a></p>
                        </div>
                    `).join('')}
                </div>
                ` : '<div class="component-content">✅ No violations found</div>'}
            </div>
        `).join('')}
    </div>`;
  }

  /**
   * Generate CSV content
   */
  private generateCsvContent(report: AccessibilityReport): string {
    const headers = 'Component,Violation ID,Impact,Description,Help URL,Element\n';
    
    const rows = report.results.flatMap(result => 
      result.violations.map(violation => 
        `"${result.component}","${violation.id}","${violation.impact}","${violation.description}","${violation.helpUrl}","${violation.nodes[0]?.element || 'N/A'}"`
      )
    );

    return headers + rows.join('\n');
  }

  /**
   * Get CSS class for score
   */
  private getScoreClass(score: number): string {
    if (score >= 95) return 'excellent';
    if (score >= 85) return 'good';
    if (score >= 70) return 'fair';
    return 'poor';
  }

  /**
   * Get timestamp string for filenames
   */
  private getTimestamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }
}

/**
 * Utility function to generate report from results
 */
export const generateAccessibilityReport = (
  results: AccessibilityTestResult[],
  config?: Partial<ReportConfig>
): AccessibilityReport => {
  const generator = new AccessibilityReportGenerator(config);
  return generator.generateReport(results);
};

/**
 * Quick report generation for common use cases
 */
export const quickReport = (results: AccessibilityTestResult[]): void => {
  generateAccessibilityReport(results, {
    includeHtml: true,
    includeJson: true,
    includeCsv: false,
    includeDetails: true
  });
};