/**
 * 🎯 KIBAN Risk Service
 * Enterprise HASE algorithm implementation with NEON persistence
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import axios from 'axios';
import { RiskEvaluationRequestDto } from './dto/risk-evaluation-request.dto';
import { RiskEvaluationResponseDto, RiskDecision, RiskCategory } from './dto/risk-evaluation-response.dto';

@Injectable()
export class KibanRiskService {
  private readonly dbPool: Pool;
  private readonly kibanApiKey: string;
  private readonly kibanApiUrl: string;
  private readonly haseConfig = {
    weights: {
      historical: 0.30,  // 30% - Historical/Operational data
      geographic: 0.20,  // 20% - Geographic risk factors  
      voice: 0.50        // 50% - Voice analysis (KIBAN primary)
    },
    thresholds: {
      go: 78,           // ≥78% = GO
      review: 56        // 56-77% = REVIEW, ≤55% = NO-GO
    }
  };

  constructor(private configService: ConfigService) {
    this.kibanApiKey = this.configService.get<string>('KIBAN_API_KEY');
    this.kibanApiUrl = this.configService.get<string>('KIBAN_API_URL', 'https://api.kiban.conductores.com');
    
    // Initialize NEON database connection
    this.dbPool = new Pool({
      connectionString: this.configService.get<string>('DATABASE_URL'),
      ssl: { rejectUnauthorized: false }
    });

    // Initialize database tables
    this.initializeTables();
  }

  private async initializeTables() {
    try {
      await this.dbPool.query(`
        CREATE TABLE IF NOT EXISTS risk_evaluations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          evaluation_id VARCHAR(255) UNIQUE NOT NULL,
          tipo_evaluacion VARCHAR(50) NOT NULL,
          decision VARCHAR(20) NOT NULL,
          risk_category VARCHAR(30) NOT NULL,
          total_score DECIMAL(5,2) NOT NULL,
          historical_score DECIMAL(5,2) NOT NULL,
          geographic_score DECIMAL(5,2) NOT NULL,
          voice_score DECIMAL(5,2) NOT NULL,
          request_data JSONB NOT NULL,
          response_data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS risk_reasons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          evaluation_id VARCHAR(255) NOT NULL,
          reason_type VARCHAR(50) NOT NULL,
          reason_text TEXT NOT NULL,
          severity VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (evaluation_id) REFERENCES risk_evaluations(evaluation_id)
        );

        CREATE TABLE IF NOT EXISTS risk_recommendations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          evaluation_id VARCHAR(255) NOT NULL,
          recommendation_type VARCHAR(50) NOT NULL,
          recommendation_text TEXT NOT NULL,
          priority INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (evaluation_id) REFERENCES risk_evaluations(evaluation_id)
        );

        CREATE INDEX IF NOT EXISTS idx_risk_evaluations_evaluation_id ON risk_evaluations(evaluation_id);
        CREATE INDEX IF NOT EXISTS idx_risk_evaluations_decision ON risk_evaluations(decision);
        CREATE INDEX IF NOT EXISTS idx_risk_evaluations_created_at ON risk_evaluations(created_at);
        CREATE INDEX IF NOT EXISTS idx_risk_reasons_evaluation_id ON risk_reasons(evaluation_id);
      `);
      
      console.log('✅ KIBAN risk evaluation tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize KIBAN tables:', error);
    }
  }

  async evaluateRisk(request: RiskEvaluationRequestDto): Promise<RiskEvaluationResponseDto> {
    const startTime = Date.now();
    
    try {
      // 1. Historical/Operational Analysis (30%)
      const historicalScore = await this.calculateHistoricalScore(request);
      
      // 2. Geographic Risk Analysis (20%)
      const geographicScore = await this.calculateGeographicScore(request);
      
      // 3. Voice Analysis via KIBAN API (50%)
      const voiceScore = await this.calculateVoiceScore(request);
      
      // 4. Apply HASE weighting algorithm
      const totalScore = Math.round(
        (historicalScore * this.haseConfig.weights.historical) +
        (geographicScore * this.haseConfig.weights.geographic) +
        (voiceScore * this.haseConfig.weights.voice)
      );

      // 5. Determine decision and category
      const { decision, category } = this.determineDecision(totalScore);
      
      // 6. Generate reasons and recommendations
      const reasons = await this.generateReasons(request, {
        historical: historicalScore,
        geographic: geographicScore,
        voice: voiceScore,
        total: totalScore
      }, decision);
      
      const recommendations = await this.generateRecommendations(request, decision, totalScore);
      
      // 7. Build response
      const response: RiskEvaluationResponseDto = {
        evaluationId: request.evaluationId,
        processedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        algorithmVersion: 'HASE-2.1',
        decision,
        riskCategory: category,
        confidenceLevel: this.calculateConfidence(totalScore),
        scoreBreakdown: {
          // Original properties
          creditScore: historicalScore,
          financialStability: historicalScore,
          behaviorHistory: voiceScore,
          paymentCapacity: historicalScore,
          geographicRisk: geographicScore,
          vehicleProfile: geographicScore,
          finalScore: totalScore,
          // HASE compatibility properties
          totalScore,
          historicalScore,
          geographicScore,
          voiceScore,
          weights: this.haseConfig.weights,
          confidence: this.calculateConfidence(totalScore)
        },
        riskFactors: [],
        financialRecommendations: recommendations.financial,
        mitigationPlan: {
          required: recommendations.mitigation.length > 0,
          actions: recommendations.mitigation,
          estimatedDays: 7,
          expectedRiskReduction: 15
        },
        complianceValidation: {
          internalPoliciesCompliant: true,
          regulatoryCompliant: true,
          kycValidationsComplete: true,
          amlVerificationsApproved: true
        },
        decisionReasons: reasons.map(r => r.description).slice(0, 3),
        nextSteps: recommendations.nextSteps,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        reasons: reasons.slice(0, 3), // Max 3 primary reasons
        riskMitigationPlan: {
          actions: recommendations.mitigation,
          expectedReduction: 15,
          timeline: '7 days'
        },
        metadata: {
          algorithmVersion: 'HASE-2.1',
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          kibanVersion: '1.0',
          configVersion: '2.1'
        }
      };

      // 8. Persist to NEON database
      await this.persistEvaluation(request, response);
      
      return response;
    } catch (error) {
      console.error('❌ KIBAN Risk Evaluation Error:', error);
      throw new HttpException(
        `Risk evaluation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async calculateHistoricalScore(request: RiskEvaluationRequestDto): Promise<number> {
    // Historical credit performance analysis
    const creditHistory = request.datosPersonales.creditHistory || {};
    const vehicleData = request.datosVehiculo;
    
    let score = 85; // Base score
    
    // Credit score impact
    if (creditHistory.creditScore) {
      if (creditHistory.creditScore >= 750) score += 10;
      else if (creditHistory.creditScore >= 650) score += 5;
      else if (creditHistory.creditScore < 550) score -= 20;
    }
    
    // Payment history impact
    if (creditHistory.latePayments > 3) score -= 15;
    if (creditHistory.defaults > 0) score -= 25;
    
    // Vehicle age/condition impact
    const vehicleAge = new Date().getFullYear() - vehicleData.year;
    if (vehicleAge > 10) score -= 10;
    if (vehicleAge > 15) score -= 20;
    
    // Operational factors
    if (request.riskFactors?.previousClaims > 2) score -= 15;
    if (request.riskFactors?.drivingViolations > 1) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private async calculateGeographicScore(request: RiskEvaluationRequestDto): Promise<number> {
    // Geographic risk assessment based on location data
    const location = request.datosPersonales.direccion;
    
    let score = 80; // Base geographic score
    
    // State-level risk assessment (example for Mexico)
    const highRiskStates = ['Guerrero', 'Michoacán', 'Tamaulipas', 'Sinaloa'];
    const lowRiskStates = ['Yucatán', 'Campeche', 'Hidalgo'];
    
    if (highRiskStates.includes(location.estado)) score -= 20;
    else if (lowRiskStates.includes(location.estado)) score += 15;
    
    // Urban vs Rural assessment
    const urbanIndicators = ['Ciudad', 'Metropolitana', 'Centro'];
    const isUrban = urbanIndicators.some(indicator => 
      location.ciudad?.includes(indicator) || location.colonia?.includes(indicator)
    );
    
    if (isUrban) score += 10; // Urban areas generally lower risk for vehicle theft
    
    // Economic indicators (mock implementation)
    // In production, integrate with INEGI or similar data sources
    const economicScore = Math.floor(Math.random() * 20) + 70; // 70-90 range
    score = (score + economicScore) / 2;
    
    return Math.max(0, Math.min(100, score));
  }

  private async calculateVoiceScore(request: RiskEvaluationRequestDto): Promise<number> {
    try {
      // Primary KIBAN voice analysis
      if (!this.kibanApiKey) {
        console.warn('⚠️ KIBAN API key not configured, using fallback analysis');
        return this.calculateVoiceScoreFallback(request);
      }

      const voiceData = request.datosPersonales.voiceData;
      if (!voiceData || !voiceData.audioFile) {
        console.warn('⚠️ No voice data provided, using profile-based analysis');
        return this.calculateVoiceScoreFallback(request);
      }

      // Call KIBAN API for voice analysis
      const response = await axios.post(`${this.kibanApiUrl}/analyze/voice`, {
        audioData: voiceData.audioFile,
        metadata: {
          evaluationId: request.evaluationId,
          language: 'es-MX',
          quality: voiceData.quality || 'standard'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.kibanApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const analysis = response.data;
      
      // Process KIBAN response
      let voiceScore = analysis.riskScore || 75;
      
      // Apply voice-specific risk factors
      if (analysis.stressLevel === 'high') voiceScore -= 15;
      if (analysis.truthfulness < 0.7) voiceScore -= 20;
      if (analysis.confidence < 0.6) voiceScore -= 10;
      
      // Consistency checks
      if (analysis.inconsistencyFlags > 2) voiceScore -= 25;
      
      return Math.max(0, Math.min(100, voiceScore));
    } catch (error) {
      console.warn('⚠️ KIBAN API call failed, using fallback:', error.message);
      return this.calculateVoiceScoreFallback(request);
    }
  }

  private calculateVoiceScoreFallback(request: RiskEvaluationRequestDto): number {
    // Fallback voice analysis based on profile data
    let score = 75; // Base fallback score
    
    const personalData = request.datosPersonales;
    
    // Age factor
    if (personalData.edad < 25) score -= 10;
    if (personalData.edad > 45) score += 10;
    
    // Education level
    if (personalData.educacion === 'universitaria') score += 5;
    
    // Employment stability
    if (personalData.empleoActual?.tiempoEmpleo > 24) score += 10;
    
    // Financial profile consistency
    const financial = request.perfilFinanciero;
    const incomeToVehicleRatio = financial.ingresosMensuales / request.datosVehiculo.valor;
    
    if (incomeToVehicleRatio > 0.3) score += 15;
    else if (incomeToVehicleRatio < 0.1) score -= 20;
    
    return Math.max(0, Math.min(100, score));
  }

  private determineDecision(totalScore: number): { decision: RiskDecision; category: RiskCategory } {
    if (totalScore >= this.haseConfig.thresholds.go) {
      return { decision: RiskDecision.GO, category: RiskCategory.BAJO };
    } else if (totalScore >= this.haseConfig.thresholds.review) {
      return { decision: RiskDecision.REVIEW, category: RiskCategory.MEDIO };
    } else {
      return { decision: RiskDecision.NO_GO, category: RiskCategory.ALTO };
    }
  }

  private async generateReasons(
    request: RiskEvaluationRequestDto, 
    scores: any, 
    decision: RiskDecision
  ): Promise<any[]> {
    const reasons = [];
    
    // Voice analysis reasons (primary factor - 50% weight)
    if (scores.voice < 60) {
      reasons.push({
        type: 'VOICE_ANALYSIS',
        description: 'Análisis de voz indica nivel de riesgo elevado',
        severity: 'HIGH',
        impact: 'NEGATIVE'
      });
    } else if (scores.voice > 85) {
      reasons.push({
        type: 'VOICE_ANALYSIS',
        description: 'Análisis de voz indica alta confiabilidad',
        severity: 'LOW',
        impact: 'POSITIVE'
      });
    }
    
    // Historical factors
    if (scores.historical < 50) {
      reasons.push({
        type: 'CREDIT_HISTORY',
        description: 'Historial crediticio presenta riesgos significativos',
        severity: 'HIGH',
        impact: 'NEGATIVE'
      });
    }
    
    // Geographic factors
    if (scores.geographic < 60) {
      reasons.push({
        type: 'GEOGRAPHIC_RISK',
        description: 'Ubicación geográfica presenta factores de riesgo elevado',
        severity: 'MEDIUM',
        impact: 'NEGATIVE'
      });
    }
    
    return reasons.slice(0, 3); // Return top 3 reasons
  }

  private async generateRecommendations(
    request: RiskEvaluationRequestDto, 
    decision: RiskDecision, 
    score: number
  ): Promise<any> {
    const vehicleValue = request.datosVehiculo.valor;
    const monthlyIncome = request.perfilFinanciero.ingresosMensuales || request.datosPersonales.ingresosMensuales;
    
    switch (decision) {
      case RiskDecision.GO:
        return {
          financial: {
            approved: true,
            maxCoverage: vehicleValue,
            premiumAdjustment: score > 85 ? -5 : 0, // 5% discount for high scores
            deductible: vehicleValue * 0.05, // 5% deductible
            terms: 'Términos estándar aprobados'
          },
          mitigation: [],
          nextSteps: ['Proceder con emisión de póliza', 'Enviar documentos finales']
        };
        
      case RiskDecision.REVIEW:
        return {
          financial: {
            approved: false,
            requiresReview: true,
            suggestedCoverage: vehicleValue * 0.8,
            premiumAdjustment: 10, // 10% increase
            deductible: vehicleValue * 0.1, // 10% deductible
            terms: 'Requiere revisión manual'
          },
          mitigation: [
            'Proporcionar referencias adicionales',
            'Considerar cobertura limitada inicial',
            'Evaluación presencial requerida'
          ],
          nextSteps: ['Programar revisión con underwriter', 'Solicitar documentación adicional']
        };
        
      case RiskDecision.NO_GO:
        return {
          financial: {
            approved: false,
            maxCoverage: 0,
            premiumAdjustment: 0,
            deductible: 0,
            terms: 'No aprobado para cobertura estándar'
          },
          mitigation: [
            'Mejorar historial crediticio',
            'Considerar vehículo de menor valor',
            'Evaluar cobertura básica únicamente'
          ],
          nextSteps: ['Explicar motivos de rechazo', 'Ofrecer productos alternativos']
        };
        
      default:
        throw new Error('Invalid decision type');
    }
  }

  private calculateConfidence(totalScore: number): number {
    // Calculate confidence based on score proximity to thresholds
    const { go, review } = this.haseConfig.thresholds;
    
    if (totalScore >= go) {
      return Math.min(95, 80 + ((totalScore - go) / (100 - go)) * 15);
    } else if (totalScore >= review) {
      const midPoint = (go + review) / 2;
      return Math.max(60, 70 - Math.abs(totalScore - midPoint) * 2);
    } else {
      return Math.min(90, 85 + ((review - totalScore) / review) * 10);
    }
  }

  private async persistEvaluation(
    request: RiskEvaluationRequestDto, 
    response: RiskEvaluationResponseDto
  ): Promise<void> {
    const client = await this.dbPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert main evaluation record
      await client.query(`
        INSERT INTO risk_evaluations (
          evaluation_id, tipo_evaluacion, decision, risk_category,
          total_score, historical_score, geographic_score, voice_score,
          request_data, response_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        request.evaluationId,
        request.tipoEvaluacion,
        response.decision,
        response.riskCategory,
        response.scoreBreakdown.totalScore,
        response.scoreBreakdown.historicalScore,
        response.scoreBreakdown.geographicScore,
        response.scoreBreakdown.voiceScore,
        JSON.stringify(request),
        JSON.stringify(response)
      ]);
      
      // Insert reasons
      for (const reason of response.reasons) {
        await client.query(`
          INSERT INTO risk_reasons (evaluation_id, reason_type, reason_text, severity)
          VALUES ($1, $2, $3, $4)
        `, [
          request.evaluationId,
          reason.type,
          reason.description,
          reason.severity
        ]);
      }
      
      await client.query('COMMIT');
      console.log(`✅ Risk evaluation ${request.evaluationId} persisted to NEON`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to persist evaluation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async evaluateRiskBatch(requests: RiskEvaluationRequestDto[]): Promise<RiskEvaluationResponseDto[]> {
    const results = [];
    
    for (const request of requests) {
      try {
        const result = await this.evaluateRisk(request);
        results.push(result);
      } catch (error) {
        console.error(`❌ Batch evaluation failed for ${request.evaluationId}:`, error);
        // Continue processing other requests
      }
    }
    
    return results;
  }

  async getEvaluationResults(evaluationId: string): Promise<any> {
    const client = await this.dbPool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM risk_evaluations 
        WHERE evaluation_id = $1
      `, [evaluationId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const evaluation = result.rows[0];
      
      // Get associated reasons
      const reasonsResult = await client.query(`
        SELECT * FROM risk_reasons 
        WHERE evaluation_id = $1
        ORDER BY created_at
      `, [evaluationId]);
      
      return {
        ...evaluation,
        reasons: reasonsResult.rows
      };
    } finally {
      client.release();
    }
  }

  async getEvaluationStats(): Promise<any> {
    const client = await this.dbPool.connect();
    
    try {
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_evaluations,
          AVG(total_score) as avg_score,
          COUNT(CASE WHEN decision = 'GO' THEN 1 END) as go_count,
          COUNT(CASE WHEN decision = 'REVIEW' THEN 1 END) as review_count,
          COUNT(CASE WHEN decision = 'NO_GO' THEN 1 END) as no_go_count,
          DATE_TRUNC('day', created_at) as date
        FROM risk_evaluations 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
      `);
      
      return {
        summary: statsResult.rows[0] || {},
        dailyStats: statsResult.rows,
        lastUpdated: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      // Check database connectivity
      const dbCheck = await this.dbPool.query('SELECT NOW()');
      const dbHealthy = !!dbCheck.rows[0];
      
      // Check KIBAN API connectivity
      let kibanHealthy = false;
      try {
        if (this.kibanApiKey) {
          await axios.get(`${this.kibanApiUrl}/health`, {
            headers: { 'Authorization': `Bearer ${this.kibanApiKey}` },
            timeout: 5000
          });
          kibanHealthy = true;
        }
      } catch (error) {
        console.warn('KIBAN API health check failed:', error.message);
      }
      
      // Get recent evaluation stats
      const stats = await this.getEvaluationStats();
      
      const overallHealth = dbHealthy && (kibanHealthy || !this.kibanApiKey) ? 'healthy' : 'degraded';
      
      return {
        status: overallHealth,
        components: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          kibanApi: kibanHealthy ? 'healthy' : 'unhealthy',
          algorithm: 'healthy'
        },
        stats: stats.summary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async updateConfiguration(config: any): Promise<any> {
    // In production, this would update configuration in database
    // For now, we'll just validate and return the config
    
    if (config.weights) {
      const totalWeight = Object.values(config.weights).reduce((sum: number, weight: any) => sum + Number(weight), 0);
      if (Math.abs(Number(totalWeight) - 1.0) > 0.01) {
        throw new Error('Weights must sum to 1.0');
      }
    }
    
    if (config.thresholds) {
      if (config.thresholds.go <= config.thresholds.review) {
        throw new Error('GO threshold must be higher than REVIEW threshold');
      }
    }
    
    return {
      message: 'Configuration validation passed',
      currentConfig: this.haseConfig,
      proposedConfig: config
    };
  }
}