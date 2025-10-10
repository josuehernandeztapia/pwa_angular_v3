/**
 *  KIBAN/HASE Risk Evaluation Service
 * Enterprise Angular service integrating with BFF for risk evaluation
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer, of, TimeoutError } from 'rxjs';
import { catchError, retry, timeout, map, tap } from 'rxjs/operators';

import { RiskEvaluation } from '../components/risk-evaluation/risk-panel.component';
import { WebhookRetryService } from './webhook-retry.service';
import { HumanMicrocopyService } from './human-microcopy.service';
import { RiskPersistenceService } from './risk-persistence.service';

export interface RiskEvaluationRequest {
  clientId: string;
  document: {
    country: string;
    idType: string;
    idNumber: string;
    curp?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  meta?: {
    market?: string;
    routeId?: string;
    product?: string;
    voiceScore01?: number;
    gnvScore01?: number;
    geoScore01?: number;
  };
}

export interface RiskEvaluationResponse {
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
  decision: {
    gate: 'GO' | 'REVIEW' | 'NO-GO';
    hardStops: string[];
    suggestions: string[];
  };
  latencyMs: number;
  processingId?: string;
  webhookStatus?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RiskEvaluationService {
  private http = inject(HttpClient);
  private webhookRetryService = inject(WebhookRetryService);
  private humanMicrocopyService = inject(HumanMicrocopyService);
  private riskPersistenceService = inject(RiskPersistenceService);

  private readonly BFF_BASE_URL = '/api/bff/risk';
  private readonly EVALUATION_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 2;

  // State management
  private evaluationState$ = new BehaviorSubject<{
    loading: boolean;
    error: string | null;
    lastEvaluation: RiskEvaluation | null;
  }>({
    loading: false,
    error: null,
    lastEvaluation: null
  });

  // Public observables
  readonly isLoading$ = this.evaluationState$.pipe(map(state => state.loading));
  readonly error$ = this.evaluationState$.pipe(map(state => state.error));
  readonly lastEvaluation$ = this.evaluationState$.pipe(map(state => state.lastEvaluation));

  // Performance metrics
  private performanceMetrics = signal({
    averageResponseTime: 0,
    successRate: 100,
    totalEvaluations: 0,
    failedEvaluations: 0
  });

  /**
   * Evaluate risk for a client using KIBAN/HASE integration
   */
  evaluateRisk(request: RiskEvaluationRequest): Observable<RiskEvaluation> {
    this.setLoadingState(true, null);
    
    const startTime = Date.now();
    
    return this.http.post<RiskEvaluationResponse>(`${this.BFF_BASE_URL}/evaluate`, request).pipe(
      timeout(this.EVALUATION_TIMEOUT),
      retry({
        count: this.MAX_RETRIES,
        delay: (error, retryCount) => {
          return timer(Math.pow(2, retryCount) * 1000); // Exponential backoff
        }
      }),
      map(response => this.transformResponse(response, request, startTime)),
      tap(evaluation => {
        this.updatePerformanceMetrics(startTime, true);
        this.setLoadingState(false, null, evaluation);

        //  P0.2 SURGICAL FIX - Persist evaluation
        this.riskPersistenceService.storeEvaluation(
          request.clientId,
          evaluation,
          { requestData: request, processingTime: Date.now() - startTime }
        ).subscribe({
        });

        // Track successful evaluation for analytics
        this.trackEvaluationEvent('success', evaluation);
      }),
      catchError(error => {
        this.updatePerformanceMetrics(startTime, false);
        this.setLoadingState(false, this.getErrorMessage(error));
        
        // Track failed evaluation
        this.trackEvaluationEvent('error', null, error);
        
        return throwError(() => error);
      })
    );
  }

  /**
   * Get evaluation history for a client
   */
  getEvaluationHistory(clientId: string): Observable<RiskEvaluation[]> {
    //  P0.2 SURGICAL FIX - Use persistence service for history
    return this.riskPersistenceService.getEvaluationHistory(clientId).pipe(
      map(storedEvaluations => storedEvaluations.map(stored => stored.evaluation)),
      catchError(error => {
        // Fallback to direct API call
        return this.http.get<RiskEvaluationResponse[]>(`${this.BFF_BASE_URL}/evaluations/${clientId}`).pipe(
          map(responses => responses.map(response =>
            this.transformResponse(response, { clientId } as RiskEvaluationRequest, 0)
          )),
          catchError(() => of([]))
        );
      })
    );
  }

  /**
   * Get risk evaluation analytics
   */
  getEvaluationAnalytics(dateRange?: { start: Date; end: Date }): Observable<any> {
    const params: any = {};
    if (dateRange) {
      params.startDate = dateRange.start.toISOString();
      params.endDate = dateRange.end.toISOString();
    }

    return this.http.get(`${this.BFF_BASE_URL}/analytics`, { params }).pipe(
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Process batch risk evaluations
   */
  evaluateBatchRisk(requests: RiskEvaluationRequest[]): Observable<{
    batchId: string;
    results: RiskEvaluation[];
    summary: any;
  }> {
    const batchRequest = {
      batchId: this.generateBatchId(),
      evaluations: requests
    };

    return this.http.post(`${this.BFF_BASE_URL}/evaluate-batch`, batchRequest).pipe(
      timeout(this.EVALUATION_TIMEOUT * 2), // Longer timeout for batch
      map((response: any) => ({
        batchId: response.batchId,
        results: response.results.map((r: RiskEvaluationResponse) => 
          this.transformResponse(r, {} as RiskEvaluationRequest, 0)
        ),
        summary: response.batchStats
      })),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current evaluation state
   */
  getCurrentState() {
    return this.evaluationState$.value;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMetrics();
  }

  /**
   * Clear evaluation state
   */
  clearState() {
    this.evaluationState$.next({
      loading: false,
      error: null,
      lastEvaluation: null
    });
  }

  /**
   *  P0.2 SURGICAL FIX - Access persistence service
   */
  get persistenceService() {
    return this.riskPersistenceService;
  }

  /**
   * Get persisted evaluations observable
   */
  get persistedEvaluations$() {
    return this.riskPersistenceService.evaluations$;
  }

  /**
   * Get evaluation summary observable
   */
  get evaluationSummary$() {
    return this.riskPersistenceService.summary$;
  }

  /**
   * Transform BFF response to internal RiskEvaluation model
   */
  private transformResponse(
    response: RiskEvaluationResponse, 
    request: RiskEvaluationRequest,
    startTime: number
  ): RiskEvaluation {
    const processingTime = startTime > 0 ? Date.now() - startTime : response.latencyMs;
    
    return {
      evaluationId: response.processingId || this.generateEvaluationId(),
      processedAt: new Date(),
      processingTimeMs: processingTime,
      algorithmVersion: 'KIBAN-HASE-v2.1.0',
      decision: response.decision.gate,
      riskCategory: this.mapRiskCategory(response.hase.category),
      confidenceLevel: this.calculateConfidenceLevel(response),
      
      scoreBreakdown: {
        creditScore: this.normalizeScore(response.kiban.scoreRaw),
        financialStability: this.calculateFinancialStability(response),
        behaviorHistory: this.calculateBehaviorHistory(response),
        paymentCapacity: this.calculatePaymentCapacity(response),
        geographicRisk: this.calculateGeographicRisk(response),
        vehicleProfile: this.calculateVehicleProfile(response),
        finalScore: Math.round(response.hase.riskScore01 * 100)
      },
      
      kiban: response.kiban,
      hase: response.hase,
      
      riskFactors: this.identifyRiskFactors(response),
      financialRecommendations: this.generateFinancialRecommendations(response),
      mitigationPlan: this.createMitigationPlan(response),
      
      decisionReasons: this.generateDecisionReasons(response),
      nextSteps: this.generateNextSteps(response)
    };
  }

  /**
   * Map HASE category to internal risk category
   */
  private mapRiskCategory(haseCategory: string): 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO' {
    switch (haseCategory.toUpperCase()) {
      case 'LOW': return 'BAJO';
      case 'MEDIUM': return 'MEDIO';
      case 'HIGH': return 'ALTO';
      case 'CRITICAL': return 'CRITICO';
      default: return 'MEDIO';
    }
  }

  /**
   * Calculate confidence level based on various factors
   */
  private calculateConfidenceLevel(response: RiskEvaluationResponse): number {
    let confidence = 85; // Base confidence
    
    // Adjust based on KIBAN status
    if (response.kiban.status === 'NOT_FOUND') {
      confidence -= 25;
    } else if (response.kiban.status === 'ERROR') {
      confidence -= 35;
    }
    
    // Adjust based on processing time (faster = more confident)
    if (response.latencyMs < 1000) {
      confidence += 5;
    } else if (response.latencyMs > 5000) {
      confidence -= 10;
    }
    
    // Adjust based on hard stops
    if (response.decision.hardStops?.length > 0) {
      confidence += 10; // Hard stops increase confidence in rejection
    }
    
    return Math.max(50, Math.min(95, confidence));
  }

  /**
   * Normalize KIBAN score to 0-100 scale
   */
  private normalizeScore(rawScore: number): number {
    if (rawScore === 0) return 0;
    
    // Assuming KIBAN uses 300-850 scale
    const minScore = 300;
    const maxScore = 850;
    
    return Math.round(((rawScore - minScore) / (maxScore - minScore)) * 100);
  }

  /**
   * Calculate financial stability score
   */
  private calculateFinancialStability(response: RiskEvaluationResponse): number {
    // Based on HASE factors and decision
    let stability = 70; // Base score
    
    const factors = response.hase.explain || [];
    const kibanFactor = factors.find(f => f.factor === 'KIBAN_SCORE');
    
    if (kibanFactor) {
      if (kibanFactor.impact === 'POS') stability += 20;
      else if (kibanFactor.impact === 'NEG') stability -= 20;
    }
    
    if (response.decision.gate === 'GO') stability += 15;
    else if (response.decision.gate === 'NO-GO') stability -= 25;
    
    return Math.max(0, Math.min(100, stability));
  }

  /**
   * Calculate behavior history score
   */
  private calculateBehaviorHistory(response: RiskEvaluationResponse): number {
    let behavior = 75; // Base score
    
    // Check for payment-related reasons
    const paymentReasons = response.kiban.reasons?.filter(r => 
      r.code.includes('MORA') || r.code.includes('PAYMENT') || r.code.includes('DEFAULT')
    ) || [];
    
    behavior -= (paymentReasons.length * 15);
    
    return Math.max(0, Math.min(100, behavior));
  }

  /**
   * Calculate payment capacity score  
   */
  private calculatePaymentCapacity(response: RiskEvaluationResponse): number {
    let capacity = 80; // Base score
    
    // Adjust based on decision
    if (response.decision.gate === 'GO') capacity += 10;
    else if (response.decision.gate === 'NO-GO') capacity -= 30;
    
    // Check for capacity-related reasons
    const capacityReasons = response.kiban.reasons?.filter(r => 
      r.code.includes('UTIL') || r.code.includes('DEBT') || r.code.includes('INCOME')
    ) || [];
    
    capacity -= (capacityReasons.length * 10);
    
    return Math.max(0, Math.min(100, capacity));
  }

  /**
   * Calculate geographic risk score
   */
  private calculateGeographicRisk(response: RiskEvaluationResponse): number {
    const factors = response.hase.explain || [];
    const geoFactor = factors.find(f => f.factor === 'GEO_RISK');
    
    if (!geoFactor) return 70; // Default neutral score
    
    let geoScore = 70;
    
    if (geoFactor.impact === 'POS') geoScore += 20;
    else if (geoFactor.impact === 'NEG') geoScore -= 20;
    
    return Math.max(0, Math.min(100, geoScore));
  }

  /**
   * Calculate vehicle profile score
   */
  private calculateVehicleProfile(response: RiskEvaluationResponse): number {
    // This would typically come from vehicle data analysis
    // For now, derive from overall decision
    let vehicleScore = 75; // Base score
    
    if (response.decision.gate === 'GO') vehicleScore += 10;
    else if (response.decision.gate === 'NO-GO') vehicleScore -= 20;
    
    return Math.max(0, Math.min(100, vehicleScore));
  }

  /**
   * Identify risk factors from response
   */
  private identifyRiskFactors(response: RiskEvaluationResponse): Array<{
    factorId: string;
    factorName: string;
    description: string;
    severity: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    scoreImpact: number;
    mitigationRecommendations: string[];
  }> {
    const factors: any[] = [];
    
    // Process KIBAN reasons
    response.kiban.reasons?.forEach(reason => {
      let severity: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA' = 'MEDIA';
      let scoreImpact = -10;
      
      // Determine severity based on reason code
      if (reason.code.includes('MORA_90') || reason.code.includes('FRAUDE')) {
        severity = 'CRITICA';
        scoreImpact = -30;
      } else if (reason.code.includes('MORA') || reason.code.includes('DEFAULT')) {
        severity = 'ALTA';
        scoreImpact = -20;
      } else if (reason.code.includes('UTIL') || reason.code.includes('INQUIRY')) {
        severity = 'MEDIA';
        scoreImpact = -10;
      } else {
        severity = 'BAJA';
        scoreImpact = -5;
      }
      
      factors.push({
        factorId: reason.code,
        factorName: this.getFactorDisplayName(reason.code),
        description: reason.desc,
        severity,
        scoreImpact,
        mitigationRecommendations: this.getMitigationRecommendations(reason.code)
      });
    });
    
    return factors;
  }

  /**
   * Get display name for risk factor
   */
  private getFactorDisplayName(code: string): string {
    const displayNames: Record<string, string> = {
      'MORA_90': 'Mora Severa',
      'MORA_30': 'Mora Reciente',
      'UTIL_85': 'Alto Uso de Crédito',
      'UTIL_75': 'Uso Elevado de Crédito',
      'RECENT_INQUIRY': 'Consultas Recientes',
      'DEFAULTS': 'Historial de Incumplimientos',
      'FRAUDE': 'Indicadores de Fraude'
    };
    
    return displayNames[code] || code.replace(/_/g, ' ');
  }

  /**
   * Get mitigation recommendations for risk factor
   */
  private getMitigationRecommendations(code: string): string[] {
    const recommendations: Record<string, string[]> = {
      'MORA_90': ['Requiere aval solidario', 'Seguro contra desempleo', 'Revisión trimestral'],
      'UTIL_85': ['Reducir límites existentes', 'Plan de reducción de deuda', 'Mayor enganche'],
      'RECENT_INQUIRY': ['Explicación de consultas', 'Verificación de propósito', 'Esperar 30 días'],
      'DEFAULTS': ['Aval con historial limpio', 'Garantía adicional', 'Plazo reducido']
    };
    
    return recommendations[code] || ['Evaluación adicional requerida'];
  }

  /**
   * Generate financial recommendations
   */
  private generateFinancialRecommendations(response: RiskEvaluationResponse): any {
    // This would typically come from the BFF response
    // For now, generate based on decision and risk level
    const baseAmount = 200000; // Base loan amount
    const baseRate = 15.5; // Base interest rate
    
    let maxLoanAmount = baseAmount;
    let suggestedRate = baseRate;
    let maxTermMonths = 60;
    let minDownPayment = baseAmount * 0.2;
    
    // Adjust based on decision
    switch (response.decision.gate) {
      case 'GO':
        maxLoanAmount *= 1.2;
        suggestedRate -= 2;
        maxTermMonths = 72;
        minDownPayment *= 0.8;
        break;
      case 'REVIEW':
        maxLoanAmount *= 0.9;
        suggestedRate += 1;
        maxTermMonths = 48;
        minDownPayment *= 1.2;
        break;
      case 'NO-GO':
        maxLoanAmount *= 0.6;
        suggestedRate += 4;
        maxTermMonths = 36;
        minDownPayment *= 1.5;
        break;
    }
    
    const monthlyRate = suggestedRate / 100 / 12;
    const estimatedPayment = maxLoanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, maxTermMonths)) /
      (Math.pow(1 + monthlyRate, maxTermMonths) - 1);
    
    return {
      maxLoanAmount: Math.round(maxLoanAmount),
      minDownPayment: Math.round(minDownPayment),
      maxTermMonths,
      suggestedInterestRate: suggestedRate,
      estimatedMonthlyPayment: Math.round(estimatedPayment),
      resultingDebtToIncomeRatio: 35, // Would be calculated based on actual income
      specialConditions: response.decision.suggestions || []
    };
  }

  /**
   * Create mitigation plan
   */
  private createMitigationPlan(response: RiskEvaluationResponse): any {
    const hasHighRiskFactors = response.decision.hardStops?.length > 0 || 
                              response.decision.gate === 'NO-GO';
    
    if (!hasHighRiskFactors && response.decision.gate === 'GO') {
      return {
        required: false,
        actions: [],
        estimatedDays: 0,
        expectedRiskReduction: 0
      };
    }
    
    return {
      required: true,
      actions: response.decision.suggestions || ['Evaluación adicional requerida'],
      estimatedDays: response.decision.gate === 'NO-GO' ? 30 : 15,
      expectedRiskReduction: response.decision.gate === 'NO-GO' ? 25 : 15
    };
  }

  /**
   * Generate decision reasons
   */
  private generateDecisionReasons(response: RiskEvaluationResponse): string[] {
    const reasons: string[] = [];
    
    // Add KIBAN score reason
    if (response.kiban.scoreRaw > 0) {
      reasons.push(`Score KIBAN: ${response.kiban.scoreRaw} (Banda ${response.kiban.scoreBand})`);
    }
    
    // Add HASE score reason
    reasons.push(`HASE Score: ${Math.round(response.hase.riskScore01 * 100)}% (${response.hase.category})`);
    
    // Add specific risk reasons
    if (response.kiban.reasons && response.kiban.reasons.length > 0) {
      reasons.push(`${response.kiban.reasons.length} factores de riesgo identificados`);
      
      // Add top 2 most critical reasons
      response.kiban.reasons.slice(0, 2).forEach(reason => {
        reasons.push(reason.desc);
      });
    }
    
    // Add decision-specific reason
    switch (response.decision.gate) {
      case 'GO':
        reasons.push('Perfil de riesgo aceptable para aprobación automática');
        break;
      case 'REVIEW':
        reasons.push('Requiere revisión manual y condiciones adicionales');
        break;
      case 'NO-GO':
        if (response.decision.hardStops?.length > 0) {
          reasons.push(`Hard stops identificados: ${response.decision.hardStops.join(', ')}`);
        } else {
          reasons.push('Perfil de riesgo excede límites de aprobación');
        }
        break;
    }
    
    return reasons;
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(response: RiskEvaluationResponse): string[] {
    const steps: string[] = [];
    
    switch (response.decision.gate) {
      case 'GO':
        steps.push('Proceder con documentación estándar');
        steps.push('Generar propuesta de financiamiento');
        steps.push('Preparar contrato para firma');
        break;
        
      case 'REVIEW':
        steps.push('Asignar a especialista en crédito');
        if (response.decision.suggestions) {
          response.decision.suggestions.forEach(suggestion => {
            steps.push(`Implementar: ${suggestion}`);
          });
        }
        steps.push('Programar seguimiento en 7 días');
        break;
        
      case 'NO-GO':
        steps.push('Comunicar decisión al cliente con explicación detallada');
        steps.push('Ofrecer plan de mejora crediticia');
        if (response.decision.suggestions) {
          response.decision.suggestions.forEach(suggestion => {
            steps.push(`Alternativa: ${suggestion}`);
          });
        }
        steps.push('Agendar reevaluación en 3-6 meses');
        break;
    }
    
    return steps;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(startTime: number, success: boolean) {
    const currentMetrics = this.performanceMetrics();
    const responseTime = Date.now() - startTime;
    
    const totalEvaluations = currentMetrics.totalEvaluations + 1;
    const failedEvaluations = currentMetrics.failedEvaluations + (success ? 0 : 1);
    const averageResponseTime = 
      (currentMetrics.averageResponseTime * currentMetrics.totalEvaluations + responseTime) / totalEvaluations;
    const successRate = ((totalEvaluations - failedEvaluations) / totalEvaluations) * 100;
    
    this.performanceMetrics.set({
      averageResponseTime: Math.round(averageResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      totalEvaluations,
      failedEvaluations
    });
  }

  /**
   * Set loading state
   */
  private setLoadingState(loading: boolean, error: string | null = null, evaluation: RiskEvaluation | null = null) {
    this.evaluationState$.next({
      loading,
      error,
      lastEvaluation: evaluation || this.evaluationState$.value.lastEvaluation
    });
  }

  /**
   * Get error message from HTTP error
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'Timeout en evaluación. El proceso tomó demasiado tiempo.';
    }

    if (!(error instanceof HttpErrorResponse)) {
      return 'Error desconocido en la evaluación de riesgo.';
    }

    if (error.status === 0) {
      return 'Sin conexión al servidor. Verificar conectividad.';
    }

    if (error.status >= 500) {
      return 'Error interno del servidor. Intente nuevamente.';
    }
    
    if (error.status === 404) {
      return 'Servicio de evaluación no disponible.';
    }

    if (error.status === 408) {
      return 'Timeout en evaluación. El proceso tomó demasiado tiempo.';
    }

    return error.error?.message || 'Error desconocido en la evaluación de riesgo.';
  }

  /**
   * Track evaluation event for analytics
   */
  private trackEvaluationEvent(eventType: 'success' | 'error', evaluation: RiskEvaluation | null, error?: any) {
    // Integration point for analytics tracking
    const eventData = {
      type: eventType,
      timestamp: new Date(),
      evaluation: evaluation ? {
        decision: evaluation.decision,
        riskCategory: evaluation.riskCategory,
        processingTime: evaluation.processingTimeMs,
        confidenceLevel: evaluation.confidenceLevel
      } : null,
      error: error ? {
        status: error.status,
        message: error.message
      } : null
    };
    
    // Send to analytics service or log for monitoring
  }

  /**
   * Generate unique evaluation ID
   */
  private generateEvaluationId(): string {
    return `EVAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
