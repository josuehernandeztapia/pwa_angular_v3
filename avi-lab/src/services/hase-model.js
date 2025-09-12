// HASE MODEL - COMPLETE IMPLEMENTATION
// Historical (30%) + Geographic (20%) + Voice/AVI (50%) 
// Migrado desde MAIN PWA para AVI_LAB testing

export class HASEModel {
  constructor() {
    this.weights = {
      historical: 0.30,  // 30%
      geographic: 0.20,  // 20%
      voice: 0.50        // 50%
    };

    this.thresholds = {
      GO: 750,           // >= 750 = GO + Protection eligible
      REVIEW: 600,       // 600-749 = REVIEW
      NO_GO: 599         // <= 599 = NO-GO
    };

    this.riskLevels = {
      LOW: { min: 800, max: 1000 },
      MEDIUM: { min: 650, max: 799 },
      HIGH: { min: 500, max: 649 },
      CRITICAL: { min: 0, max: 499 }
    };
  }

  /**
   * CALCULATE COMPLETE HASE SCORE
   * @param {Object} profile - Transportista profile
   * @returns {Object} Complete HASE result
   */
  calculateHASEScore(profile) {
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
      const decision = this.determineDecision(roundedScore, geographic.redFlags);
      const protectionEligible = this.isProtectionEligible(roundedScore, decision);

      const result = {
        totalScore: roundedScore,
        decision: decision,
        riskLevel: riskLevel,
        protectionEligible: protectionEligible,
        components: {
          historical: {
            score: historical.score,
            weight: this.weights.historical,
            data: historical.data
          },
          geographic: {
            score: geographic.score,
            weight: this.weights.geographic,
            data: geographic.data,
            redFlags: geographic.redFlags
          },
          voice: {
            score: voice.score,
            weight: this.weights.voice,
            data: voice.data
          }
        },
        recommendations: this.generateRecommendations(decision, riskLevel, {historical, geographic, voice}),
        redFlags: this.consolidateRedFlags(historical, geographic, voice),
        confidence: this.calculateConfidence({historical, geographic, voice}),
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      return result;
    } catch (error) {
      console.error('HASE calculation failed:', error);
      return this.getFallbackHASEResult(profile, startTime);
    }
  }

  /**
   * HISTORICAL COMPONENT (30%)
   * Based on credit bureau and payment history
   */
  calculateHistoricalComponent(profile) {
    const data = {
      bureauScore: profile.bureauScore || null,
      paymentHistory: this.determinePaymentHistory(profile),
      creditAge: this.estimateCreditAge(profile),
      creditMix: profile.hasPreviousCredits ? 0.6 : 0.2,
      defaultHistory: profile.hasDefaults || false,
      bankruptcyHistory: profile.hasBankruptcy || false
    };

    let historicalScore = 0;

    // Bureau score (40% of historical component)
    if (data.bureauScore) {
      historicalScore += ((data.bureauScore - 300) / 550) * 0.4 * 1000;
    } else {
      historicalScore += 500 * 0.4; // Neutral score
    }

    // Payment history (30% of historical)
    const paymentHistoryScores = {
      'EXCELLENT': 1000,
      'GOOD': 800,
      'REGULAR': 600,
      'POOR': 300,
      'NO_HISTORY': 500
    };
    historicalScore += paymentHistoryScores[data.paymentHistory] * 0.3;

    // Credit age (20% of historical)
    const ageScore = Math.min(1, data.creditAge / 60) * 1000; // Max at 5 years
    historicalScore += ageScore * 0.2;

    // Credit mix (10% of historical)
    historicalScore += data.creditMix * 1000 * 0.1;

    // Penalties
    if (data.defaultHistory) historicalScore -= 200;
    if (data.bankruptcyHistory) historicalScore -= 300;

    const finalScore = Math.round(Math.max(0, Math.min(1000, historicalScore)));

    return {
      score: finalScore,
      data: data,
      redFlags: this.getHistoricalRedFlags(data, finalScore)
    };
  }

  /**
   * GEOGRAPHIC COMPONENT (20%)
   * Based on municipality and route risk factors
   */
  calculateGeographicComponent(profile) {
    const geoData = this.getGeographicRiskData(profile.municipality, profile.state);
    const redFlags = this.detectGeographicRedFlags(profile, geoData);
    
    // Geographic score is directly from risk assessment (0-100) converted to 0-1000
    const geographicScore = geoData.score * 10;

    return {
      score: geographicScore,
      data: geoData,
      redFlags: redFlags
    };
  }

  /**
   * VOICE/AVI COMPONENT (50%)
   * Based on voice analysis and AVI responses
   */
  calculateVoiceComponent(profile) {
    if (!profile.voiceAnalysis && !profile.aviResponses) {
      return {
        score: 500, // Neutral
        data: {
          voiceScore: 500,
          aviScore: 500,
          resilienceScore: 0.5,
          stressLevel: 'medium'
        },
        redFlags: ['no_voice_data']
      };
    }

    let voiceScore = 500;
    let aviScore = 500;
    const redFlags = [];

    // Voice analysis (70% of voice component)
    if (profile.voiceAnalysis) {
      voiceScore = profile.voiceAnalysis.score || 500;
      if (profile.voiceAnalysis.flags) {
        redFlags.push(...profile.voiceAnalysis.flags);
      }
    }

    // AVI responses (30% of voice component)
    if (profile.aviResponses) {
      aviScore = this.calculateAVIScore(profile.aviResponses);
    }

    // Combined score
    const combinedScore = (voiceScore * 0.7) + (aviScore * 0.3);

    return {
      score: Math.round(combinedScore),
      data: {
        voiceScore: voiceScore,
        aviScore: aviScore,
        combinedScore: combinedScore,
        voiceWeight: 0.7,
        aviWeight: 0.3
      },
      redFlags: redFlags
    };
  }

  /**
   * DECISION LOGIC
   */
  determineDecision(score, geographicRedFlags) {
    // Critical geographic red flags = automatic NO-GO
    const criticalGeoFlags = geographicRedFlags?.filter(flag => flag.type === 'CRITICAL') || [];
    if (criticalGeoFlags.length > 0) {
      return 'NO-GO';
    }

    // Score-based decision
    if (score >= this.thresholds.GO) return 'GO';
    if (score >= this.thresholds.REVIEW) return 'REVIEW';
    return 'NO-GO';
  }

  /**
   * RISK LEVEL DETERMINATION
   */
  determineRiskLevel(score) {
    for (const [level, range] of Object.entries(this.riskLevels)) {
      if (score >= range.min && score <= range.max) {
        return level;
      }
    }
    return 'CRITICAL';
  }

  /**
   * PROTECTION ELIGIBILITY
   */
  isProtectionEligible(score, decision) {
    return decision === 'GO' && score >= 750;
  }

  /**
   * HELPER METHODS
   */
  determinePaymentHistory(profile) {
    if (!profile.hasPreviousCredits) return 'NO_HISTORY';
    
    if (profile.bureauScore) {
      if (profile.bureauScore >= 750) return 'EXCELLENT';
      if (profile.bureauScore >= 650) return 'GOOD';
      if (profile.bureauScore >= 550) return 'REGULAR';
      return 'POOR';
    }
    
    return 'NO_HISTORY';
  }

  estimateCreditAge(profile) {
    if (!profile.hasPreviousCredits) return 0;
    return Math.min(profile.yearsInRoute * 12, profile.age * 2);
  }

  getGeographicRiskData(municipality, state) {
    // Mock geographic data - in real implementation would use geographic-scoring.data.ts
    const municipalityScores = {
      'ecatepec': { score: 15, risk: 'CRITICAL' },
      'nezahualcoyotl': { score: 20, risk: 'CRITICAL' },
      'iztapalapa': { score: 25, risk: 'HIGH' },
      'gustavo_a_madero': { score: 30, risk: 'HIGH' },
      'tlalnepantla': { score: 35, risk: 'MEDIUM' },
      'naucalpan': { score: 40, risk: 'MEDIUM' },
      'benito_juarez': { score: 75, risk: 'LOW' },
      'default': { score: 50, risk: 'MEDIUM' }
    };

    const key = municipality?.toLowerCase().replace(/\s+/g, '_') || 'default';
    return municipalityScores[key] || municipalityScores.default;
  }

  detectGeographicRedFlags(profile, geoData) {
    const redFlags = [];

    if (geoData.score <= 25) {
      redFlags.push({
        type: 'CRITICAL',
        indicator: 'EXTREME_RISK_MUNICIPALITY',
        description: `Municipio de riesgo crítico: ${profile.municipality}`,
        impact: 'Rechazar automáticamente'
      });
    }

    if (profile.weeklyPayments && profile.weeklyPayments > 3000) {
      redFlags.push({
        type: 'CRITICAL',
        indicator: 'EXCESSIVE_WEEKLY_PAYMENTS',
        description: `Pagos semanales excesivos: $${profile.weeklyPayments}`,
        impact: 'Indica extorsión sistemática'
      });
    }

    return redFlags;
  }

  calculateAVIScore(aviResponses) {
    if (!aviResponses || aviResponses.length === 0) return 500;
    
    // Mock AVI calculation - would use real AVI service
    let totalScore = 0;
    aviResponses.forEach(response => {
      totalScore += response.score || 500;
    });
    
    return Math.round(totalScore / aviResponses.length);
  }

  getHistoricalRedFlags(data, score) {
    const flags = [];
    
    if (data.defaultHistory) {
      flags.push('previous_defaults');
    }
    
    if (data.bankruptcyHistory) {
      flags.push('bankruptcy_history');
    }
    
    if (score < 400) {
      flags.push('poor_credit_history');
    }
    
    return flags;
  }

  consolidateRedFlags(historical, geographic, voice) {
    return [
      ...historical.redFlags,
      ...geographic.redFlags.map(f => f.indicator),
      ...voice.redFlags
    ];
  }

  generateRecommendations(decision, riskLevel, components) {
    const recommendations = [];

    switch (decision) {
      case 'GO':
        recommendations.push(`✅ Cliente aprobado - Riesgo ${riskLevel}`);
        recommendations.push('✅ Protección automática activada');
        break;
      case 'REVIEW':
        recommendations.push(`⚠️ Requiere revisión manual - Riesgo ${riskLevel}`);
        if (components.historical.score < 600) {
          recommendations.push('📋 Solicitar documentación crediticia adicional');
        }
        if (components.geographic.score < 500) {
          recommendations.push('🗺️ Evaluar garantías por riesgo geográfico');
        }
        break;
      case 'NO-GO':
        recommendations.push(`❌ Cliente rechazado - Riesgo ${riskLevel}`);
        recommendations.push('❌ No elegible para protección');
        break;
    }

    return recommendations;
  }

  calculateConfidence(components) {
    let confidence = 0;
    
    // Historical confidence
    confidence += components.historical.data.bureauScore ? 0.3 : 0.15;
    
    // Geographic confidence (always high - we have data)
    confidence += 0.25;
    
    // Voice confidence
    confidence += components.voice.data.voiceScore !== 500 ? 0.4 : 0.2;
    
    return Math.min(1, confidence);
  }

  getFallbackHASEResult(profile, startTime) {
    return {
      totalScore: 500,
      decision: 'REVIEW',
      riskLevel: 'HIGH',
      protectionEligible: false,
      components: {
        historical: { score: 500, weight: 0.3, data: {} },
        geographic: { score: 500, weight: 0.2, data: {}, redFlags: [] },
        voice: { score: 500, weight: 0.5, data: {} }
      },
      recommendations: ['⚠️ Error en cálculo HASE - Revisar manualmente'],
      redFlags: ['calculation_error'],
      confidence: 0.2,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * TESTING UTILITIES
   */
  generateMockProfile() {
    return {
      name: 'Juan Pérez',
      age: 45,
      municipality: 'Naucalpan',
      state: 'edomex',
      route: 'Metro Cuatro Caminos - Satélite',
      yearsInRoute: 8,
      hasPreviousCredits: true,
      bureauScore: 650,
      hasDefaults: false,
      hasBankruptcy: false,
      weeklyPayments: 800,
      voiceAnalysis: {
        score: 750,
        flags: []
      },
      aviResponses: [
        { questionId: 'ingresos_diarios', score: 700 },
        { questionId: 'gastos_operativos', score: 800 }
      ]
    };
  }
}

// EXPORT SINGLETON
export const haseModel = new HASEModel();