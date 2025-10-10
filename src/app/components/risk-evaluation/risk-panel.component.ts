/**
 * KIBAN/HASE risk panel component
 * Premium UX component with enterprise-grade risk evaluation display
 */

import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, NgIf, NgFor, AsyncPipe, DecimalPipe } from '@angular/common';
import { Subject, takeUntil, timer } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

// PremiumIconsService removed
import { HumanMicrocopyService } from '../../services/human-microcopy.service';

// Premium component imports (standalone components)
import { IconComponent } from "../shared/icon/icon.component"
import { HumanMessageComponent } from '../shared/human-message/human-message.component';

export interface RiskEvaluation {
  evaluationId: string;
  processedAt: Date;
  processingTimeMs: number;
  algorithmVersion: string;
  decision: 'GO' | 'REVIEW' | 'NO-GO';
  riskCategory: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  confidenceLevel: number;
  
  scoreBreakdown: {
    creditScore: number;
    financialStability: number;
    behaviorHistory: number;
    paymentCapacity: number;
    geographicRisk: number;
    vehicleProfile: number;
    finalScore: number;
  };
  
  kiban: {
    scoreRaw: number;
    scoreBand: string;
    status: string;
    reasons: Array<{ code: string; desc: string }>;
    bureauRef: string;
  };
  
  hase: {
    riskScore01: number;
    category: string;
    explain: Array<{ factor: string; weight: number; impact: string }>;
  };
  
  riskFactors: Array<{
    factorId: string;
    factorName: string;
    description: string;
    severity: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    scoreImpact: number;
    mitigationRecommendations: string[];
  }>;
  
  financialRecommendations?: {
    maxLoanAmount: number;
    minDownPayment: number;
    maxTermMonths: number;
    suggestedInterestRate: number;
    estimatedMonthlyPayment: number;
    resultingDebtToIncomeRatio: number;
    specialConditions?: string[];
  };
  
  mitigationPlan?: {
    required: boolean;
    actions: string[];
    estimatedDays: number;
    expectedRiskReduction: number;
  };
  
  decisionReasons?: string[];
  nextSteps?: string[];
}

@Component({
  selector: 'app-risk-panel',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    AsyncPipe,
    DecimalPipe,
    IconComponent,
    HumanMessageComponent
  ],
  templateUrl: './risk-panel.component.html',
  styleUrls: ['./risk-panel.component.scss']
})
export class RiskPanelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private humanMicrocopyService = inject(HumanMicrocopyService);

  // Component signals
  @Input() riskEvaluation = signal<RiskEvaluation | null>(null);
  @Input() isLoading = signal(false);
  @Input() hasError = signal(false);
  
  // Computed properties
  isVisible = computed(() => !this.isLoading() && !!this.riskEvaluation());
  
  ngOnInit() {
    // Start entrance animations after component initializes
    timer(100).pipe(takeUntil(this.destroy$)).subscribe(() => {
      // Trigger premium UX animations
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Score-related methods
  getScoreClass(): string {
    const score = this.riskEvaluation()?.kiban?.scoreRaw || 0;
    if (score >= 750) return 'risk-panel__score-value--excellent';
    if (score >= 650) return 'risk-panel__score-value--good';
    if (score >= 550) return 'risk-panel__score-value--fair';
    return 'risk-panel__score-value--poor';
  }

  getBandClass(): string {
    const band = this.riskEvaluation()?.kiban?.scoreBand || '';
    const normalized = this.normalizeClassSegment(band || '');
    return normalized ? `risk-panel__score-band--${normalized}` : '';
  }

  getScorePercentage(): number {
    const score = this.riskEvaluation()?.kiban?.scoreRaw || 0;
    return Math.min(100, Math.max(0, ((score - 300) / 550) * 100));
  }

  getScoreProgressClass(): string {
    const category = this.riskEvaluation()?.riskCategory || '';
    const normalized = this.normalizeClassSegment(category || '');
    return normalized ? `risk-panel__score-progress--${normalized}` : '';
  }

  // HASE-related methods
  getHaseCategoryClass(): string {
    const category = this.riskEvaluation()?.hase.category || '';
    const normalized = this.normalizeClassSegment(category || '');
    return normalized ? `risk-panel__hase-category--${normalized}` : '';
  }

  getFactorIcon(factor: string): 'shield' | 'microphone' | 'truck' | 'information-circle' | 'alert-circle' {
    const iconMap: Record<string, 'shield' | 'microphone' | 'truck' | 'information-circle' | 'alert-circle'> = {
      'KIBAN_SCORE': 'shield',
      'AVI_VOICE': 'microphone',
      'GNV_HISTORY': 'truck',
      'GEO_RISK': 'information-circle'
    };
    return iconMap[factor] || 'alert-circle';
  }

  getFactorDisplayName(factor: string): string {
    const nameMap: Record<string, string> = {
      'KIBAN_SCORE': 'Score Crediticio',
      'AVI_VOICE': 'Análisis de Voz',
      'GNV_HISTORY': 'Historial GNV',
      'GEO_RISK': 'Riesgo Geográfico'
    };
    return nameMap[factor] || factor;
  }

  getFactorImpactClass(impact: string): string {
    const normalized = this.normalizeClassSegment(impact || '');
    return normalized ? `risk-panel__explain-item--impact-${normalized}` : '';
  }

  getImpactClass(impact: string): string {
    const normalized = this.normalizeClassSegment(impact || '');
    return normalized ? `risk-panel__impact-badge--${normalized}` : '';
  }

  getImpactDisplay(impact: string): string {
    const displayMap: Record<string, string> = {
      'POS': 'Positivo',
      'NEU': 'Neutral', 
      'NEG': 'Negativo'
    };
    return displayMap[impact] || impact;
  }

  // Risk factors methods
  getDisplayRiskFactors() {
    const factors = this.riskEvaluation()?.riskFactors || [];
    // Show maximum 3 factors for clean UX
    return factors.slice(0, 3);
  }

  getSeverityClass(severity: string): string {
    const normalized = this.normalizeClassSegment(severity || '');
    return normalized ? `risk-panel__risk-factor--severity-${normalized}` : '';
  }

  getSeverityIcon(severity: string): 'information-circle' | 'alert-triangle' | 'x-circle' | 'alert-circle' {
    const iconMap: Record<string, 'information-circle' | 'alert-triangle' | 'x-circle' | 'alert-circle'> = {
      'BAJA': 'information-circle',
      'MEDIA': 'alert-triangle',
      'ALTA': 'x-circle',
      'CRITICA': 'x-circle'
    };
    return iconMap[severity] || 'alert-circle';
  }

  // Decision methods
  getDecisionIcon(): 'check-circle' | 'information-circle' | 'x-circle' | 'alert-circle' {
    const decision = this.riskEvaluation()?.decision || '';
    const iconMap: Record<string, 'check-circle' | 'information-circle' | 'x-circle' | 'alert-circle'> = {
      'GO': 'check-circle',
      'REVIEW': 'information-circle',
      'NO-GO': 'x-circle'
    };
    return iconMap[decision] || 'alert-circle';
  }

  getDecisionClass(): string {
    const decision = this.riskEvaluation()?.decision || '';
    const normalized = this.normalizeClassSegment(decision || '');
    return normalized ? `risk-panel__decision-chip--${normalized}` : '';
  }

  getDecisionDisplay(): string {
    const decision = this.riskEvaluation()?.decision || '';
    const displayMap: Record<string, string> = {
      'GO': 'APROBADO',
      'REVIEW': 'REQUIERE REVISIÓN',
      'NO-GO': 'NO APROBADO'
    };
    return displayMap[decision] || decision;
  }

  getDecisionMicrocopyId(): string {
    const decision = this.riskEvaluation()?.decision;
    switch (decision) {
      case 'GO':
        return 'decision-go';
      case 'NO-GO':
        return 'decision-nogo';
      case 'REVIEW':
      default:
        return 'decision-review';
    }
  }

  getDecisionMessageContext(): string {
    const decision = this.riskEvaluation()?.decision || 'REVIEW';
    return `decision-${decision.toLowerCase().replace('-', '')}`;
  }

  private normalizeClassSegment(value: string): string {
    return value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // Financial methods
  getDebtRatioClass(): string {
    const ratio = this.riskEvaluation()?.financialRecommendations?.resultingDebtToIncomeRatio || 0;
    if (ratio <= 35) return 'risk-panel__financial-value--ratio-good';
    if (ratio <= 45) return 'risk-panel__financial-value--ratio-acceptable';
    return 'risk-panel__financial-value--ratio-high';
  }

  // Action methods
  getSuggestions(): string[] {
    const mitigationActions = this.riskEvaluation()?.mitigationPlan?.actions || [];
    const nextSteps = this.riskEvaluation()?.nextSteps || [];
    return [...mitigationActions, ...nextSteps].slice(0, 3); // Max 3 for clean UX
  }

  onAddGuarantor() {
    // Navigate to guarantor form or trigger guarantor flow
  }

  onReduceTerm() {
    // Navigate to cotizador with reduced term
  }

  onUploadDocuments() {
    // Open document upload modal
  }

  onRetryEvaluation() {
    // Emit retry event or call evaluation service again
  }

  // Financial helper methods for cleaner template
  getMaxLoanAmount(): number {
    return this.riskEvaluation()?.financialRecommendations?.maxLoanAmount || 0;
  }

  getMinDownPayment(): number {
    return this.riskEvaluation()?.financialRecommendations?.minDownPayment || 0;
  }

  getEstimatedMonthlyPayment(): number {
    return this.riskEvaluation()?.financialRecommendations?.estimatedMonthlyPayment || 0;
  }

  // Formatted methods to avoid template parsing issues with complex expressions
  getFormattedMaxLoanAmount(): string {
    const amount = this.getMaxLoanAmount();
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  getFormattedMinDownPayment(): string {
    const amount = this.getMinDownPayment();
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  getFormattedEstimatedMonthlyPayment(): string {
    const amount = this.getEstimatedMonthlyPayment();
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  // Personalization data for human messages
  getPersonalizationData() {
    return {
      decision: this.riskEvaluation()?.decision,
      riskCategory: this.riskEvaluation()?.riskCategory,
      score: this.riskEvaluation()?.kiban?.scoreRaw,
      band: this.riskEvaluation()?.kiban?.scoreBand
    };
  }
}
