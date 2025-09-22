import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AVIResponse, VoiceAnalysis } from '../models/avi';
import { AVI_VOICE_THRESHOLDS, AVILexiconAnalyzer } from '../data/avi-lexicons.data';

export interface HASEProfile {
  bureauScore?: number;
  paymentHistory?: any[];
  creditUtilization?: number;
  location: {
    state: string;
    municipality: string;
    coordinates?: [number, number];
  };
  voiceAnalysis?: VoiceAnalysis;
  aviResponses?: AVIResponse[];
}

export interface HASEResult {
  totalScore: number;
  decision: 'GO' | 'REVIEW' | 'NO-GO';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  protectionEligible: boolean;
  components: {
    historical: HASEComponent;
    geographic: HASEComponent;
    voice: HASEComponent;
  };
  recommendations: string[];
  redFlags: HASERedFlag[];
  confidence: number;
  processingTime: number;
  timestamp: string;
}

export interface HASEComponent {
  score: number;
  weight: number;
  data: any;
  redFlags?: HASERedFlag[];
}

export interface HASERedFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  component: 'historical' | 'geographic' | 'voice';
}

@Injectable({
  providedIn: 'root'
})
export class HASEModelService {

  private readonly weights = {
    historical: 0.30,  // 30%
    geographic: 0.20,  // 20%
    voice: 0.50        // 50% - Voice has highest weight
  };

  private readonly thresholds = {
    GO: 750,           // >= 750 = GO + Protection eligible
    REVIEW: 600,       // 600-749 = REVIEW
    NO_GO: 599         // <= 599 = NO-GO
  };

  private readonly riskLevels = {
    LOW: { min: 750, max: 1000 },     // Aligned with AVI_LAB
    MEDIUM: { min: 600, max: 749 },
    HIGH: { min: 500, max: 599 },
    CRITICAL: { min: 0, max: 499 }
  };

  // High-risk geographic areas (simplified dataset)
  private readonly riskZones = {
    HIGH_RISK_STATES: ['guerrero', 'michoacan', 'tamaulipas', 'sinaloa'],
    MEDIUM_RISK_MUNICIPALITIES: ['tepito', 'doctores', 'lagunilla']
  };

  /**
   * Calculate complete HASE score
   */
  calculateHASEScore(profile: HASEProfile): Observable<HASEResult> {
    const startTime = Date.now();

    try {
      // Calculate each component
      const historical = this.calculateHistoricalComponent(profile);
      const geographic = this.calculateGeographicComponent(profile);
      const voice = this.calculateVoiceComponent(profile);

      // Weighted total
      const totalScore =
        (historical.score * this.weights.historical) +
        (geographic.score * this.weights.geographic) +
        (voice.score * this.weights.voice);

      const roundedScore = Math.round(totalScore);
      const riskLevel = this.determineRiskLevel(roundedScore);

      // HARD STOP BY VOICE - Critical rule from AVI_LAB
      const voiceFlags = voice.redFlags || [];
      const hasVoiceHardStop = voiceFlags.some(flag =>
        flag.severity === 'CRITICAL' ||
        voiceFlags.filter(f => f.severity === 'HIGH').length >= 3
      );

      const decision = hasVoiceHardStop
        ? 'NO-GO'
        : this.determineDecision(roundedScore, geographic.redFlags || []);

      const protectionEligible = this.isProtectionEligible(roundedScore, decision);

      const result: HASEResult = {
        totalScore: roundedScore,
        decision,
        riskLevel,
        protectionEligible,
        components: { historical, geographic, voice },
        recommendations: this.generateRecommendations(decision, riskLevel, { historical, geographic, voice }),
        redFlags: this.consolidateRedFlags(historical, geographic, voice),
        confidence: this.calculateConfidence({ historical, geographic, voice }),
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      return of(result);

    } catch (error) {
// removed by clean-audit
      return of(this.getFallbackHASEResult(profile, startTime));
    }
  }

  /**
   * Historical Component (30%)
   * Based on credit bureau and payment history
   */
  private calculateHistoricalComponent(profile: HASEProfile): HASEComponent {
    const data = {
      bureauScore: profile.bureauScore || null,
      paymentHistory: profile.paymentHistory || [],
      creditUtilization: profile.creditUtilization || null
    };

    let score = 500; // Base score
    const redFlags: HASERedFlag[] = [];

    // Bureau score analysis
    if (profile.bureauScore) {
      if (profile.bureauScore >= 700) score += 200;
      else if (profile.bureauScore >= 600) score += 100;
      else if (profile.bureauScore < 500) {
        score -= 100;
        redFlags.push({
          type: 'LOW_BUREAU_SCORE',
          severity: 'HIGH',
          reason: `Bureau score too low: ${profile.bureauScore}`,
          component: 'historical'
        });
      }
    }

    // Credit utilization
    if (profile.creditUtilization !== undefined) {
      if (profile.creditUtilization > 0.8) {
        score -= 50;
        redFlags.push({
          type: 'HIGH_CREDIT_UTILIZATION',
          severity: 'MEDIUM',
          reason: `High credit utilization: ${(profile.creditUtilization * 100).toFixed(1)}%`,
          component: 'historical'
        });
      }
    }

    return {
      score: Math.max(0, Math.min(1000, score)),
      weight: this.weights.historical,
      data,
      redFlags
    };
  }

  /**
   * Geographic Component (20%)
   * Based on location risk analysis
   */
  private calculateGeographicComponent(profile: HASEProfile): HASEComponent {
    const location = profile.location;
    const data = { location };

    let score = 650; // Base score
    const redFlags: HASERedFlag[] = [];

    const stateLower = location.state.toLowerCase();
    const municipalityLower = location.municipality.toLowerCase();

    // High-risk state analysis
    if (this.riskZones.HIGH_RISK_STATES.includes(stateLower)) {
      score -= 150;
      redFlags.push({
        type: 'HIGH_RISK_STATE',
        severity: 'HIGH',
        reason: `High-risk state: ${location.state}`,
        component: 'geographic'
      });
    }

    // Medium-risk municipality analysis
    if (this.riskZones.MEDIUM_RISK_MUNICIPALITIES.some(zone =>
      municipalityLower.includes(zone))) {
      score -= 75;
      redFlags.push({
        type: 'MEDIUM_RISK_MUNICIPALITY',
        severity: 'MEDIUM',
        reason: `Medium-risk municipality: ${location.municipality}`,
        component: 'geographic'
      });
    }

    return {
      score: Math.max(0, Math.min(1000, score)),
      weight: this.weights.geographic,
      data,
      redFlags
    };
  }

  /**
   * Voice Component (50%) - Highest weight
   * Uses AVI voice analysis results
   */
  private calculateVoiceComponent(profile: HASEProfile): HASEComponent {
    const voiceAnalysis = profile.voiceAnalysis;
    const aviResponses = profile.aviResponses || [];

    if (!voiceAnalysis) {
      return {
        score: 500, // Neutral score when no voice data
        weight: this.weights.voice,
        data: null,
        redFlags: [{
          type: 'NO_VOICE_DATA',
          severity: 'MEDIUM',
          reason: 'No voice analysis available',
          component: 'voice'
        }]
      };
    }

    const transcription = voiceAnalysis.transcription || '';
    const words = transcription.toLowerCase().split(/\s+/).filter(Boolean);

    // Use AVI_LAB algorithm components
    const disfluencyRate = AVILexiconAnalyzer.calculateDisfluencyRate(words);
    const honestyScore = AVILexiconAnalyzer.calculateHonestyScore(words);
    const lexiconAnalysis = AVILexiconAnalyzer.analyzeLexicons(words);

    let score = 500; // Base score
    const redFlags: HASERedFlag[] = [];

    // Voice quality indicators
    if (voiceAnalysis.pitch_variance > 0.7) {
      score -= 100;
      redFlags.push({
        type: 'HIGH_PITCH_VARIANCE',
        severity: 'HIGH',
        reason: `High pitch variability: ${voiceAnalysis.pitch_variance.toFixed(2)}`,
        component: 'voice'
      });
    }

    // Disfluency analysis
    if (disfluencyRate > 0.3) {
      score -= 75;
      redFlags.push({
        type: 'HIGH_DISFLUENCY',
        severity: 'MEDIUM',
        reason: `High hesitation rate: ${(disfluencyRate * 100).toFixed(1)}%`,
        component: 'voice'
      });
    }

    // Honesty lexicon analysis
    if (honestyScore < 0.3) {
      score -= 100;
      redFlags.push({
        type: 'DECEPTION_INDICATORS',
        severity: 'HIGH',
        reason: `Low honesty score: ${honestyScore.toFixed(2)}`,
        component: 'voice'
      });
    }

    // Confidence level
    if (voiceAnalysis.confidence_level < 0.6) {
      score -= 50;
      redFlags.push({
        type: 'LOW_VOICE_CONFIDENCE',
        severity: 'MEDIUM',
        reason: `Low recognition confidence: ${(voiceAnalysis.confidence_level * 100).toFixed(1)}%`,
        component: 'voice'
      });
    }

    const data = {
      voiceAnalysis,
      disfluencyRate,
      honestyScore,
      lexiconAnalysis
    };

    return {
      score: Math.max(0, Math.min(1000, score)),
      weight: this.weights.voice,
      data,
      redFlags
    };
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= this.riskLevels.LOW.min) return 'LOW';
    if (score >= this.riskLevels.MEDIUM.min) return 'MEDIUM';
    if (score >= this.riskLevels.HIGH.min) return 'HIGH';
    return 'CRITICAL';
  }

  private determineDecision(score: number, geoRedFlags: HASERedFlag[]): 'GO' | 'REVIEW' | 'NO-GO' {
    // Geographic hard stops
    const hasCriticalGeoFlag = geoRedFlags.some(flag => flag.severity === 'CRITICAL');
    if (hasCriticalGeoFlag) return 'NO-GO';

    // Score-based decision (aligned with AVI_LAB)
    if (score >= AVI_VOICE_THRESHOLDS.GO) return 'GO';
    if (score >= AVI_VOICE_THRESHOLDS.REVIEW) return 'REVIEW';
    return 'NO-GO';
  }

  private isProtectionEligible(score: number, decision: 'GO' | 'REVIEW' | 'NO-GO'): boolean {
    return score >= this.thresholds.GO && decision === 'GO';
  }

  private generateRecommendations(
    decision: 'GO' | 'REVIEW' | 'NO-GO',
    riskLevel: string,
    components: any
  ): string[] {
    const recommendations: string[] = [];

    switch (decision) {
      case 'GO':
        recommendations.push('Cliente aprobado - puede proceder con la operación');
        if (riskLevel === 'LOW') {
          recommendations.push('Elegible para productos de protección premium');
        }
        break;
      case 'REVIEW':
        recommendations.push('Requiere revisión manual adicional');
        recommendations.push('Solicitar documentación complementaria');
        break;
      case 'NO-GO':
        recommendations.push('No recomendado - alto riesgo identificado');
        recommendations.push('Considerar productos alternativos con mayor cobertura');
        break;
    }

    return recommendations;
  }

  private consolidateRedFlags(
    historical: HASEComponent,
    geographic: HASEComponent,
    voice: HASEComponent
  ): HASERedFlag[] {
    return [
      ...(historical.redFlags || []),
      ...(geographic.redFlags || []),
      ...(voice.redFlags || [])
    ];
  }

  private calculateConfidence(components: { historical: HASEComponent, geographic: HASEComponent, voice: HASEComponent }): number {
    let confidence = 0.5; // Base confidence

    // Historical data availability
    if (components.historical.data.bureauScore) confidence += 0.2;
    if (components.historical.data.paymentHistory.length > 0) confidence += 0.1;

    // Geographic data quality
    if (components.geographic.data.location) confidence += 0.1;

    // Voice data quality
    if (components.voice.data?.voiceAnalysis?.confidence_level) {
      confidence += components.voice.data.voiceAnalysis.confidence_level * 0.2;
    }

    return Math.min(1, confidence);
  }

  private getFallbackHASEResult(profile: HASEProfile, startTime: number): HASEResult {
    return {
      totalScore: 400, // Conservative fallback
      decision: 'NO-GO',
      riskLevel: 'CRITICAL',
      protectionEligible: false,
      components: {
        historical: { score: 400, weight: this.weights.historical, data: null },
        geographic: { score: 400, weight: this.weights.geographic, data: null },
        voice: { score: 400, weight: this.weights.voice, data: null }
      },
      recommendations: ['Error en análisis - requiere revisión manual urgente'],
      redFlags: [{
        type: 'CALCULATION_ERROR',
        severity: 'CRITICAL',
        reason: 'Failed to calculate HASE score',
        component: 'voice'
      }],
      confidence: 0.1,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
}
// removed by clean-audit