import { Injectable } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Data imports
import { calculateGeographicRiskScore, detectGeographicRedFlags, GeographicRiskFactors, GeographicRedFlag } from '../data/geographic-scoring.data';
import { ALL_AVI_QUESTIONS, AVI_CONFIG } from '../data/avi-questions.data';

// Service imports  
import { AVIService } from './avi.service';
import { VoiceValidationService } from './voice-validation.service';

// Types
import { AVIScore, AVIResponse } from '../models/types';

// ===== HASE MODEL INTERFACES =====
export interface HASEComponents {
  historical: {
    score: number;
    weight: number;
    data: HistoricalCreditData;
  };
  geographic: {
    score: number;
    weight: number;
    data: GeographicRiskFactors;
    redFlags: GeographicRedFlag[];
  };
  voice: {
    score: number;
    weight: number;
    data: VoiceResilienceData;
  };
}

export interface HASEResult {
  totalScore: number;           // 0-1000 scale
  decision: 'GO' | 'NO-GO' | 'REVIEW';
  components: HASEComponents;
  protectionEligible: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  redFlags: string[];
  processingTime: number;
  confidence: number;           // 0-1 scale
}

export interface HistoricalCreditData {
  bureauScore?: number;         // 300-850 scale
  paymentHistory: 'EXCELLENT' | 'GOOD' | 'REGULAR' | 'POOR' | 'NO_HISTORY';
  creditUtilization: number;    // 0-1 scale  
  creditAge: number;           // months
  creditMix: number;           // 0-1 scale
  recentInquiries: number;
  defaultHistory: boolean;
  bankruptcyHistory: boolean;
}

export interface VoiceResilienceData {
  voiceScore: number;          // 0-1000 scale
  resilienceScore: number;     // 0-1 scale
  stressIndicators: string[];
  coherenceScore: number;      // 0-1 scale
  responseConsistency: number; // 0-1 scale
  emotionalStability: number;  // 0-1 scale
}

export interface TransportistaProfile {
  // Basic Info
  name: string;
  age: number;
  municipality: string;
  state: string;
  route: string;
  yearsInRoute: number;

  // Financial
  dailyIncome: number;
  monthlyExpenses: number;
  hasOtherIncome: boolean;
  
  // Credit History
  hasPreviousCredits: boolean;
  bureauScore?: number;
  
  // Voice & Behavioral
  aviResponses: AVIResponse[];
  resilienceQuestionnaireCompleted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HASEModelService {

  constructor(
    private aviService: AVIService,
    private voiceValidationService: VoiceValidationService
  ) {}

  /**
   * Calculate complete HASE score for transportista
   * HASE = Historical (30%) + Geographic (20%) + Voice/AVI (50%)
   */
  calculateHASEScore(profile: TransportistaProfile): Observable<HASEResult> {
    const startTime = Date.now();

    return combineLatest([
      this.calculateHistoricalComponent(profile),
      this.calculateGeographicComponent(profile),
      this.calculateVoiceComponent(profile)
    ]).pipe(
      map(([historical, geographic, voice]) => {
        return this.consolidateHASEResult({
          historical,
          geographic,
          voice
        }, startTime);
      }),
      catchError(error => {
        console.error('HASE calculation failed', error);
        return of(this.getFallbackHASEResult(profile, startTime));
      })
    );
  }

  /**
   * Historical Component: 30% of HASE score
   * Based on credit bureau and payment history
   */
  private calculateHistoricalComponent(profile: TransportistaProfile): Observable<HASEComponents['historical']> {
    const historicalData: HistoricalCreditData = {
      bureauScore: profile.bureauScore,
      paymentHistory: this.determinePaymentHistory(profile),
      creditUtilization: this.estimateCreditUtilization(profile),
      creditAge: this.estimateCreditAge(profile),
      creditMix: profile.hasPreviousCredits ? 0.6 : 0.2,
      recentInquiries: 1, // Assume current application
      defaultHistory: false, // Would come from bureau
      bankruptcyHistory: false // Would come from bureau
    };

    let historicalScore = 0;

    // Bureau score component (40% of historical)
    if (historicalData.bureauScore) {
      historicalScore += ((historicalData.bureauScore - 300) / 550) * 0.4 * 1000;
    } else {
      // No bureau score = neutral (500 points)
      historicalScore += 500 * 0.4;
    }

    // Payment history component (30% of historical)
    const paymentHistoryScores = {
      'EXCELLENT': 1000,
      'GOOD': 800,
      'REGULAR': 600,
      'POOR': 300,
      'NO_HISTORY': 500
    };
    historicalScore += paymentHistoryScores[historicalData.paymentHistory] * 0.3;

    // Credit utilization component (20% of historical)  
    const utilizationScore = (1 - historicalData.creditUtilization) * 1000;
    historicalScore += utilizationScore * 0.2;

    // Credit age component (10% of historical)
    const ageScore = Math.min(1, historicalData.creditAge / 60) * 1000; // Max at 5 years
    historicalScore += ageScore * 0.1;

    const finalHistoricalScore = Math.round(Math.max(0, Math.min(1000, historicalScore)));

    return of({
      score: finalHistoricalScore,
      weight: 0.3, // 30% of HASE
      data: historicalData
    });
  }

  /**
   * Geographic Component: 20% of HASE score  
   * Based on municipality and route risk factors
   */
  private calculateGeographicComponent(profile: TransportistaProfile): Observable<HASEComponents['geographic']> {
    const geoRisk = calculateGeographicRiskScore(profile.municipality, profile.state);
    
    if (!geoRisk) {
      return of({
        score: 500, // Neutral score for unknown municipalities
        weight: 0.2,
        data: {
          municipality: profile.municipality,
          state: profile.state as any,
          score: 50,
          extortion_risk: 0.5,
          political_pressure: 0.5,
          crime_incidence: 0.5,
          route_stability: 0.5,
          corruption_level: 0.5,
          syndicate_control: 0.5,
          factors: ['municipality_not_evaluated'],
          high_risk_routes: [],
          red_flag_indicators: ['require_manual_evaluation']
        },
        redFlags: []
      });
    }

    // Detect red flags
    const redFlags = detectGeographicRedFlags(
      profile.municipality,
      profile.state,
      [profile.route],
      undefined // Weekly payments not available in basic profile
    );

    // Geographic score is directly from the scoring table (0-100) converted to 0-1000
    const geographicScore = geoRisk.score * 10; // Convert 0-100 to 0-1000

    return of({
      score: geographicScore,
      weight: 0.2, // 20% of HASE
      data: geoRisk,
      redFlags
    });
  }

  /**
   * Voice Component: 50% of HASE score
   * Based on AVI responses and resilience questionnaire
   */
  private calculateVoiceComponent(profile: TransportistaProfile): Observable<HASEComponents['voice']> {
    // If no AVI responses, return neutral score
    if (!profile.aviResponses || profile.aviResponses.length === 0) {
      return of({
        score: 500, // Neutral score
        weight: 0.5,
        data: {
          voiceScore: 500,
          resilienceScore: 0.5,
          stressIndicators: ['no_voice_data'],
          coherenceScore: 0.5,
          responseConsistency: 0.5,
          emotionalStability: 0.5
        }
      });
    }

    // Get AVI score from service
    return this.aviService.calculateScore().pipe(
      map(aviScore => {
        // Get resilience summary
        const resilienceSummary = this.voiceValidationService.calculateResilienceSummary();
        
        // Combine AVI and resilience scores
        const aviWeight = 0.7; // 70% AVI
        const resilienceWeight = 0.3; // 30% resilience
        
        const combinedVoiceScore = 
          (aviScore.totalScore * aviWeight) + 
          (resilienceSummary.voiceResilienceScore * 1000 * resilienceWeight);

        const voiceData: VoiceResilienceData = {
          voiceScore: Math.round(combinedVoiceScore),
          resilienceScore: resilienceSummary.voiceResilienceScore,
          stressIndicators: this.extractStressIndicators(profile.aviResponses),
          coherenceScore: this.calculateCoherenceScore(profile.aviResponses),
          responseConsistency: this.calculateResponseConsistency(profile.aviResponses),
          emotionalStability: this.calculateEmotionalStability(profile.aviResponses)
        };

        return {
          score: Math.round(combinedVoiceScore),
          weight: 0.5, // 50% of HASE
          data: voiceData
        };
      })
    );
  }

  /**
   * Consolidate HASE components into final result
   */
  private consolidateHASEResult(components: HASEComponents, startTime: number): HASEResult {
    // Calculate weighted total score
    const totalScore = 
      (components.historical.score * components.historical.weight) +
      (components.geographic.score * components.geographic.weight) +
      (components.voice.score * components.voice.weight);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (totalScore >= 800) riskLevel = 'LOW';
    else if (totalScore >= 650) riskLevel = 'MEDIUM'; 
    else if (totalScore >= 500) riskLevel = 'HIGH';
    else riskLevel = 'CRITICAL';

    // Determine decision based on HASE rules
    let decision: 'GO' | 'NO-GO' | 'REVIEW' = 'REVIEW';
    let protectionEligible = false;

    if (totalScore >= 750 && components.geographic.redFlags.length === 0) {
      decision = 'GO';
      protectionEligible = true;
    } else if (totalScore < 400 || components.geographic.redFlags.some(f => f.type === 'CRITICAL')) {
      decision = 'NO-GO';
      protectionEligible = false;
    } else {
      decision = 'REVIEW';
      protectionEligible = totalScore >= 600;
    }

    // Collect all red flags
    const redFlags: string[] = [
      ...components.geographic.redFlags.map(f => f.indicator),
      ...components.voice.data.stressIndicators
    ];

    // Generate recommendations
    const recommendations = this.generateHASERecommendations(decision, riskLevel, components);

    // Calculate confidence based on data quality
    const confidence = this.calculateHASEConfidence(components);

    return {
      totalScore: Math.round(totalScore),
      decision,
      components,
      protectionEligible,
      riskLevel,
      recommendations,
      redFlags,
      processingTime: Date.now() - startTime,
      confidence
    };
  }

  // ===== HELPER METHODS =====

  private determinePaymentHistory(profile: TransportistaProfile): HistoricalCreditData['paymentHistory'] {
    if (!profile.hasPreviousCredits) return 'NO_HISTORY';
    
    // This would come from credit bureau data
    // For now, assume based on profile completeness
    if (profile.bureauScore) {
      if (profile.bureauScore >= 750) return 'EXCELLENT';
      if (profile.bureauScore >= 650) return 'GOOD';
      if (profile.bureauScore >= 550) return 'REGULAR';
      return 'POOR';
    }
    
    return 'NO_HISTORY';
  }

  private estimateCreditUtilization(profile: TransportistaProfile): number {
    // Estimate based on income vs expenses ratio
    const utilizationRatio = profile.monthlyExpenses / (profile.dailyIncome * 30);
    return Math.min(1, Math.max(0, utilizationRatio));
  }

  private estimateCreditAge(profile: TransportistaProfile): number {
    // Estimate based on years in route and age
    if (!profile.hasPreviousCredits) return 0;
    
    // Assume credit age correlates with work stability
    return Math.min(profile.yearsInRoute * 12, profile.age * 2);
  }

  private extractStressIndicators(responses: AVIResponse[]): string[] {
    const stressIndicators: string[] = [];
    
    responses.forEach(response => {
      if (response.stressIndicators && response.stressIndicators.length > 0) {
        stressIndicators.push(...response.stressIndicators);
      }
    });

    return [...new Set(stressIndicators)]; // Remove duplicates
  }

  private calculateCoherenceScore(responses: AVIResponse[]): number {
    // Calculate based on response consistency and logical coherence
    if (responses.length === 0) return 0.5;
    
    let coherenceSum = 0;
    responses.forEach(response => {
      // Mock coherence calculation - in real implementation would analyze response patterns
      coherenceSum += response.value.length > 10 ? 0.8 : 0.4;
    });
    
    return coherenceSum / responses.length;
  }

  private calculateResponseConsistency(responses: AVIResponse[]): number {
    if (responses.length < 2) return 0.5;
    
    // Mock consistency calculation
    return 0.7; // Would analyze response timing, patterns, etc.
  }

  private calculateEmotionalStability(responses: AVIResponse[]): number {
    if (responses.length === 0) return 0.5;
    
    // Mock emotional stability based on stress indicators
    const avgStressLevel = responses.reduce((sum, r) => 
      sum + (r.stressIndicators?.length || 0), 0) / responses.length;
    
    return Math.max(0, Math.min(1, 1 - (avgStressLevel / 5)));
  }

  private generateHASERecommendations(
    decision: 'GO' | 'NO-GO' | 'REVIEW',
    riskLevel: string,
    components: HASEComponents
  ): string[] {
    const recommendations: string[] = [];

    switch (decision) {
      case 'GO':
        recommendations.push(`✅ Cliente elegible - Score HASE: ${riskLevel}`);
        recommendations.push('✅ Protección automática activada');
        if (components.voice.score < 700) {
          recommendations.push('⚠️ Monitorear patrones de voz en futuras interacciones');
        }
        break;

      case 'NO-GO':
        recommendations.push(`❌ Cliente NO elegible - Riesgo ${riskLevel}`);
        if (components.geographic.redFlags.length > 0) {
          recommendations.push('❌ Red flags geográficos críticos detectados');
        }
        if (components.voice.score < 400) {
          recommendations.push('❌ Patrones de voz indican alto riesgo de incumplimiento');
        }
        break;

      case 'REVIEW':
        recommendations.push(`⚡ Requiere revisión manual - Riesgo ${riskLevel}`);
        if (components.historical.score < 600) {
          recommendations.push('📋 Solicitar documentación crediticia adicional');
        }
        if (components.geographic.score < 500) {
          recommendations.push('🗺️ Evaluar garantías adicionales por riesgo geográfico');
        }
        if (components.voice.score < 600) {
          recommendations.push('🎤 Realizar entrevista adicional con analista senior');
        }
        break;
    }

    return recommendations;
  }

  private calculateHASEConfidence(components: HASEComponents): number {
    let confidence = 0;
    let weights = 0;

    // Historical confidence
    if (components.historical.data.bureauScore) {
      confidence += 0.9 * 0.3; // High confidence with bureau score
    } else {
      confidence += 0.5 * 0.3; // Medium confidence without bureau score
    }
    weights += 0.3;

    // Geographic confidence
    if (components.geographic.data.score > 0) {
      confidence += 0.8 * 0.2; // High confidence - we have geographic data
    }
    weights += 0.2;

    // Voice confidence  
    if (components.voice.data.voiceScore > 0) {
      confidence += 0.7 * 0.5; // Good confidence with voice analysis
    } else {
      confidence += 0.3 * 0.5; // Low confidence without voice data
    }
    weights += 0.5;

    return confidence / weights;
  }

  private getFallbackHASEResult(profile: TransportistaProfile, startTime: number): HASEResult {
    return {
      totalScore: 500, // Neutral score
      decision: 'REVIEW',
      components: {
        historical: {
          score: 500,
          weight: 0.3,
          data: {
            paymentHistory: 'NO_HISTORY',
            creditUtilization: 0.5,
            creditAge: 0,
            creditMix: 0.2,
            recentInquiries: 1,
            defaultHistory: false,
            bankruptcyHistory: false
          }
        },
        geographic: {
          score: 500,
          weight: 0.2,
          data: {
            municipality: profile.municipality,
            state: profile.state as any,
            score: 50,
            extortion_risk: 0.5,
            political_pressure: 0.5,
            crime_incidence: 0.5,
            route_stability: 0.5,
            corruption_level: 0.5,
            syndicate_control: 0.5,
            factors: ['fallback_data'],
            high_risk_routes: [],
            red_flag_indicators: []
          },
          redFlags: []
        },
        voice: {
          score: 500,
          weight: 0.5,
          data: {
            voiceScore: 500,
            resilienceScore: 0.5,
            stressIndicators: ['system_error'],
            coherenceScore: 0.5,
            responseConsistency: 0.5,
            emotionalStability: 0.5
          }
        }
      },
      protectionEligible: false,
      riskLevel: 'HIGH',
      recommendations: ['⚠️ Error en cálculo HASE - Revisar manualmente'],
      redFlags: ['system_error'],
      processingTime: Date.now() - startTime,
      confidence: 0.3
    };
  }
}