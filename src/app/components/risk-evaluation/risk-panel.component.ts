/**
 * 🎯 KIBAN/HASE Risk Panel Component
 * Premium UX component with enterprise-grade risk evaluation display
 */

import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, timer } from 'rxjs';

import { PremiumIconsService } from '../../services/premium-icons.service';
import { HumanMicrocopyService } from '../../services/human-microcopy.service';

// Premium component imports (standalone components)
import { PremiumIconComponent } from '../ui/premium-icon.component';
import { HumanMessageComponent } from '../ui/human-message.component';

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
  
  financialRecommendations: {
    maxLoanAmount: number;
    minDownPayment: number;
    maxTermMonths: number;
    suggestedInterestRate: number;
    estimatedMonthlyPayment: number;
    resultingDebtToIncomeRatio: number;
    specialConditions?: string[];
  };
  
  mitigationPlan: {
    required: boolean;
    actions: string[];
    estimatedDays: number;
    expectedRiskReduction: number;
  };
  
  decisionReasons: string[];
  nextSteps: string[];
}

@Component({
  selector: 'app-risk-panel',
  standalone: true,
  imports: [CommonModule, PremiumIconComponent, HumanMessageComponent],
  template: `
    <div class="risk-panel" 
         [attr.data-testid]="'risk-panel'"
         [class.animate-fadeIn]="isVisible()"
         [class.loading]="isLoading()">
      
      <!-- Loading State -->
      <div *ngIf="isLoading()" 
           class="loading-state animate-pulse"
           [attr.data-testid]="'evaluation-loading'">
        <app-premium-icon 
          icon-type="spinner"
          semantic-context="loading"
          [animate]="true">
        </app-premium-icon>
        <app-human-message 
          message-context="loading-evaluation"
          [show-animation]="true">
        </app-human-message>
      </div>

      <!-- Risk Evaluation Results -->
      <div *ngIf="!isLoading() && riskEvaluation()" class="evaluation-results">
        
        <!-- Header Section -->
        <div class="evaluation-header">
          <div class="score-section">
            <h3 class="section-title">
              <app-premium-icon 
                icon-type="shield"
                semantic-context="risk-evaluation">
              </app-premium-icon>
              Evaluación de Riesgo KIBAN/HASE
            </h3>
            
            <div class="processing-info">
              <span class="processing-time">
                Procesado en {{ riskEvaluation()?.processingTimeMs }}ms
              </span>
              <span class="algorithm-version">
                {{ riskEvaluation()?.algorithmVersion }}
              </span>
            </div>
          </div>
        </div>

        <!-- KIBAN Score Display -->
        <div class="kiban-section card-section">
          <div class="score-display">
            <div class="score-main">
              <span class="score-value" 
                    [attr.data-testid]="'kiban-score'"
                    [class]="getScoreClass()">
                {{ riskEvaluation()?.kiban.scoreRaw || 'N/A' }}
              </span>
              <span class="score-band" 
                    [attr.data-testid]="'score-band'"
                    [class]="getBandClass()">
                Banda {{ riskEvaluation()?.kiban.scoreBand }}
              </span>
            </div>
            
            <div class="score-breakdown">
              <app-premium-icon 
                icon-type="chart-bar"
                semantic-context="analytics">
              </app-premium-icon>
              <div class="breakdown-details">
                <div class="breakdown-item">
                  <span>Score Final:</span>
                  <span class="breakdown-value">{{ riskEvaluation()?.scoreBreakdown.finalScore }}/100</span>
                </div>
                <div class="breakdown-item">
                  <span>Confianza:</span>
                  <span class="breakdown-value">{{ riskEvaluation()?.confidenceLevel }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Score Visualization -->
          <div class="score-visualization" [attr.data-testid]="'score-visualization'">
            <div class="score-bar">
              <div class="score-progress" 
                   [style.width.%]="getScorePercentage()"
                   [class]="getScoreProgressClass()">
              </div>
            </div>
            <div class="score-labels">
              <span>0</span>
              <span>300</span>
              <span>500</span>
              <span>700</span>
              <span>850</span>
            </div>
          </div>
        </div>

        <!-- HASE Risk Category -->
        <div class="hase-section card-section">
          <div class="hase-header">
            <app-premium-icon 
              icon-type="target"
              semantic-context="risk-analysis">
            </app-premium-icon>
            <h4>HASE - Análisis Integral</h4>
          </div>
          
          <div class="hase-category" 
               [attr.data-testid]="'hase-category'"
               [class]="getHaseCategoryClass()">
            <span class="category-label">{{ riskEvaluation()?.hase.category }}</span>
            <span class="category-score">{{ (riskEvaluation()?.hase.riskScore01 * 100 | number:'1.1-1') }}%</span>
          </div>

          <!-- HASE Factors Breakdown -->
          <div class="hase-factors">
            <div *ngFor="let factor of riskEvaluation()?.hase.explain" 
                 class="factor-item"
                 [class]="getFactorImpactClass(factor.impact)">
              <app-premium-icon 
                [icon-type]="getFactorIcon(factor.factor)"
                [semantic-context]="'hase-factor'">
              </app-premium-icon>
              <div class="factor-details">
                <span class="factor-name">{{ getFactorDisplayName(factor.factor) }}</span>
                <div class="factor-weight">
                  <span class="weight-value">{{ (factor.weight * 100 | number:'1.0-0') }}%</span>
                  <span class="impact-indicator" [class]="'impact-' + factor.impact.toLowerCase()">
                    {{ getImpactDisplay(factor.impact) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk Factors -->
        <div class="risk-factors-section card-section" 
             *ngIf="riskEvaluation()?.riskFactors && riskEvaluation()?.riskFactors.length > 0">
          <div class="factors-header">
            <app-premium-icon 
              icon-type="warning-circle"
              semantic-context="risk-factors">
            </app-premium-icon>
            <h4>Factores de Riesgo Identificados</h4>
          </div>
          
          <div class="factors-list">
            <div *ngFor="let factor of getDisplayRiskFactors(); let i = index" 
                 class="factor-card"
                 [class]="getSeverityClass(factor.severity)"
                 [attr.data-testid]="'risk-reason'">
              
              <div class="factor-icon">
                <app-premium-icon 
                  [icon-type]="getSeverityIcon(factor.severity)"
                  [semantic-context]="'risk-severity'">
                </app-premium-icon>
              </div>
              
              <div class="factor-content">
                <h5 class="factor-name">{{ factor.factorName }}</h5>
                <p class="factor-description">{{ factor.description }}</p>
                
                <div class="factor-impact">
                  <span class="impact-label">Impacto en Score:</span>
                  <span class="impact-value" [class]="factor.scoreImpact >= 0 ? 'positive' : 'negative'">
                    {{ factor.scoreImpact >= 0 ? '+' : '' }}{{ factor.scoreImpact }}
                  </span>
                </div>
                
                <!-- Mitigation recommendations -->
                <div *ngIf="factor.mitigationRecommendations && factor.mitigationRecommendations.length > 0" 
                     class="mitigation-recommendations">
                  <h6>Recomendaciones:</h6>
                  <ul>
                    <li *ngFor="let rec of factor.mitigationRecommendations">{{ rec }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Decision Section -->
        <div class="decision-section card-section">
          <div class="decision-header">
            <app-premium-icon 
              [icon-type]="getDecisionIcon()"
              [semantic-context]="'decision'">
            </app-premium-icon>
            <h4>Decisión Final</h4>
          </div>
          
          <div class="decision-result">
            <div class="decision-chip" 
                 [attr.data-testid]="'decision-chip'"
                 [class]="getDecisionClass()">
              <span class="decision-label" [attr.data-testid]="'decision-gate'">
                {{ getDecisionDisplay() }}
              </span>
            </div>
            
            <div class="decision-confidence">
              Confianza: {{ riskEvaluation()?.confidenceLevel }}%
            </div>
          </div>

          <!-- Human Message for Decision -->
          <div class="decision-message">
            <app-human-message 
              [message-context]="getDecisionMessageContext()"
              [personalization-data]="getPersonalizationData()"
              [show-animation]="true">
            </app-human-message>
          </div>

          <!-- Decision Reasons -->
          <div class="decision-reasons" *ngIf="riskEvaluation()?.decisionReasons">
            <h5>Razones de la Decisión:</h5>
            <ul>
              <li *ngFor="let reason of riskEvaluation()?.decisionReasons">{{ reason }}</li>
            </ul>
          </div>
        </div>

        <!-- Financial Recommendations -->
        <div class="financial-recommendations card-section" 
             *ngIf="riskEvaluation()?.financialRecommendations">
          <div class="recommendations-header">
            <app-premium-icon 
              icon-type="calculator"
              semantic-context="financial-advice">
            </app-premium-icon>
            <h4>Recomendaciones Financieras</h4>
          </div>
          
          <div class="recommendations-grid">
            <div class="recommendation-item">
              <span class="label">Monto Máximo:</span>
              <span class="value currency">
                ${{ riskEvaluation()?.financialRecommendations.maxLoanAmount | number:'1.0-0' }}
              </span>
            </div>
            
            <div class="recommendation-item">
              <span class="label">Enganche Mínimo:</span>
              <span class="value currency">
                ${{ riskEvaluation()?.financialRecommendations.minDownPayment | number:'1.0-0' }}
              </span>
            </div>
            
            <div class="recommendation-item">
              <span class="label">Plazo Máximo:</span>
              <span class="value">
                {{ riskEvaluation()?.financialRecommendations.maxTermMonths }} meses
              </span>
            </div>
            
            <div class="recommendation-item">
              <span class="label">Tasa Sugerida:</span>
              <span class="value">
                {{ riskEvaluation()?.financialRecommendations.suggestedInterestRate }}% anual
              </span>
            </div>
            
            <div class="recommendation-item">
              <span class="label">Pago Mensual:</span>
              <span class="value currency">
                ${{ riskEvaluation()?.financialRecommendations.estimatedMonthlyPayment | number:'1.0-0' }}
              </span>
            </div>
            
            <div class="recommendation-item">
              <span class="label">Ratio Deuda/Ingreso:</span>
              <span class="value" [class]="getDebtRatioClass()">
                {{ riskEvaluation()?.financialRecommendations.resultingDebtToIncomeRatio }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Next Steps & Actions -->
        <div class="next-steps-section card-section" 
             *ngIf="riskEvaluation()?.nextSteps || getSuggestions().length > 0">
          <div class="steps-header">
            <app-premium-icon 
              icon-type="checklist"
              semantic-context="action-items">
            </app-premium-icon>
            <h4>Siguientes Pasos</h4>
          </div>
          
          <div class="steps-list">
            <div *ngFor="let step of riskEvaluation()?.nextSteps; let i = index" 
                 class="step-item animate-slideUp"
                 [style.animation-delay]="(i * 100) + 'ms'">
              <div class="step-number">{{ i + 1 }}</div>
              <div class="step-content">{{ step }}</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons" *ngIf="getSuggestions().length > 0">
            <div *ngFor="let suggestion of getSuggestions()" 
                 class="action-button-container"
                 [attr.data-testid]="'mitigation-cta'">
              
              <button *ngIf="suggestion.includes('aval')" 
                      class="btn btn-premium-hover"
                      [attr.data-testid]="'add-guarantor-btn'"
                      (click)="onAddGuarantor()">
                <app-premium-icon icon-type="user-plus" semantic-context="guarantor"></app-premium-icon>
                Agregar Aval
              </button>
              
              <button *ngIf="suggestion.includes('plazo')" 
                      class="btn btn-secondary"
                      [attr.data-testid]="'reduce-term-btn'"
                      (click)="onReduceTerm()">
                <app-premium-icon icon-type="clock" semantic-context="term-adjustment"></app-premium-icon>
                Ajustar Plazo
              </button>
              
              <button *ngIf="suggestion.includes('comprobantes')" 
                      class="btn btn-outline"
                      [attr.data-testid]="'upload-documents-btn'"
                      (click)="onUploadDocuments()">
                <app-premium-icon icon-type="document-plus" semantic-context="documentation"></app-premium-icon>
                Cargar Documentos
              </button>
            </div>
          </div>
        </div>

        <!-- Error/Fallback Messages -->
        <div *ngIf="riskEvaluation()?.kiban.status === 'NOT_FOUND'" 
             class="fallback-message card-section"
             [attr.data-testid]="'fallback-message'">
          <app-premium-icon icon-type="info-circle" semantic-context="information"></app-premium-icon>
          <app-human-message 
            message-context="not-found-fallback"
            [personalization-data]="getPersonalizationData()">
          </app-human-message>
        </div>

        <div *ngIf="riskEvaluation()?.decision === 'NO-GO'" 
             class="rejection-message card-section"
             [attr.data-testid]="'rejection-message'">
          <app-premium-icon icon-type="x-circle" semantic-context="rejection"></app-premium-icon>
          <app-human-message 
            message-context="rejection-explanation"
            [personalization-data]="getPersonalizationData()">
          </app-human-message>
        </div>
      </div>

      <!-- Error States -->
      <div *ngIf="hasError()" 
           class="error-state"
           [attr.data-testid]="'api-error-message'">
        <app-premium-icon icon-type="alert-triangle" semantic-context="error"></app-premium-icon>
        <app-human-message 
          message-context="evaluation-error"
          [show-retry]="true"
          (retry)="onRetryEvaluation()">
        </app-human-message>
        
        <button class="btn btn-primary" 
                [attr.data-testid]="'retry-evaluation-btn'"
                (click)="onRetryEvaluation()">
          Reintentar Evaluación
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./risk-panel.component.scss']
})
export class RiskPanelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private premiumIconsService = inject(PremiumIconsService);
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
    const score = this.riskEvaluation()?.kiban.scoreRaw || 0;
    if (score >= 750) return 'score-excellent';
    if (score >= 650) return 'score-good';
    if (score >= 550) return 'score-fair';
    return 'score-poor';
  }

  getBandClass(): string {
    const band = this.riskEvaluation()?.kiban.scoreBand || '';
    return `band-${band.toLowerCase()}`;
  }

  getScorePercentage(): number {
    const score = this.riskEvaluation()?.kiban.scoreRaw || 0;
    return Math.min(100, Math.max(0, ((score - 300) / 550) * 100));
  }

  getScoreProgressClass(): string {
    const category = this.riskEvaluation()?.riskCategory || '';
    return `progress-${category.toLowerCase()}`;
  }

  // HASE-related methods
  getHaseCategoryClass(): string {
    const category = this.riskEvaluation()?.hase.category || '';
    return `hase-category-${category.toLowerCase()}`;
  }

  getFactorIcon(factor: string): string {
    const iconMap: Record<string, string> = {
      'KIBAN_SCORE': 'shield',
      'AVI_VOICE': 'microphone',
      'GNV_HISTORY': 'truck',
      'GEO_RISK': 'map-pin'
    };
    return iconMap[factor] || 'circle';
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
    return `factor-impact-${impact.toLowerCase()}`;
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
    return `severity-${severity.toLowerCase()}`;
  }

  getSeverityIcon(severity: string): string {
    const iconMap: Record<string, string> = {
      'BAJA': 'info',
      'MEDIA': 'alert-triangle',
      'ALTA': 'alert-octagon',
      'CRITICA': 'x-octagon'
    };
    return iconMap[severity] || 'alert-circle';
  }

  // Decision methods
  getDecisionIcon(): string {
    const decision = this.riskEvaluation()?.decision || '';
    const iconMap: Record<string, string> = {
      'GO': 'check-circle',
      'REVIEW': 'clock',
      'NO-GO': 'x-circle'
    };
    return iconMap[decision] || 'help-circle';
  }

  getDecisionClass(): string {
    const decision = this.riskEvaluation()?.decision || '';
    return `chip-${decision.toLowerCase().replace('-', '')}`;
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

  getDecisionMessageContext(): string {
    const decision = this.riskEvaluation()?.decision || '';
    return `decision-${decision.toLowerCase().replace('-', '')}`;
  }

  // Financial methods
  getDebtRatioClass(): string {
    const ratio = this.riskEvaluation()?.financialRecommendations.resultingDebtToIncomeRatio || 0;
    if (ratio <= 35) return 'ratio-good';
    if (ratio <= 45) return 'ratio-acceptable';
    return 'ratio-high';
  }

  // Action methods
  getSuggestions(): string[] {
    const mitigationActions = this.riskEvaluation()?.mitigationPlan?.actions || [];
    const nextSteps = this.riskEvaluation()?.nextSteps || [];
    return [...mitigationActions, ...nextSteps].slice(0, 3); // Max 3 for clean UX
  }

  onAddGuarantor() {
    // Navigate to guarantor form or trigger guarantor flow
    console.log('Adding guarantor...');
  }

  onReduceTerm() {
    // Navigate to cotizador with reduced term
    console.log('Reducing term...');
  }

  onUploadDocuments() {
    // Open document upload modal
    console.log('Uploading documents...');
  }

  onRetryEvaluation() {
    // Emit retry event or call evaluation service again
    console.log('Retrying evaluation...');
  }

  // Personalization data for human messages
  getPersonalizationData() {
    return {
      decision: this.riskEvaluation()?.decision,
      riskCategory: this.riskEvaluation()?.riskCategory,
      score: this.riskEvaluation()?.kiban.scoreRaw,
      band: this.riskEvaluation()?.kiban.scoreBand
    };
  }
}