export interface AccessibilityTestResult {
  component: string;
  violations: Array<{ id: string; impact: 'critical' | 'serious' | 'moderate' | 'minor'; description: string; helpUrl: string; nodes: Array<{ element?: string }> }>;
  passes: number;
}

export interface ReportConfig {
  projectName?: string;
  includeHtml?: boolean;
  includeJson?: boolean;
  includeCsv?: boolean;
  includeDetails?: boolean;
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

export const generateAccessibilityReport = (
  results: AccessibilityTestResult[],
  config?: Partial<ReportConfig>
): AccessibilityReport => {
  const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
  const totalPasses = results.reduce((sum, r) => sum + r.passes, 0);
  const violationsByImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  results.forEach(r => r.violations.forEach(v => { (violationsByImpact as any)[v.impact]++; }));
  const totalTests = totalViolations + totalPasses;
  const complianceScore = totalTests > 0 ? Math.round((totalPasses / totalTests) * 100) : 100;
  return {
    summary: {
      totalComponents: results.length,
      totalViolations,
      totalPasses,
      violationsByImpact,
      complianceScore,
      wcagLevel: 'AA'
    },
    results,
    timestamp: new Date().toISOString(),
    projectName: config?.projectName || 'Conductores PWA'
  };
};

