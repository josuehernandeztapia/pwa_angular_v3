import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AVIResponse, AVIScore, RedFlag } from '../models/avi';
import { AVIScientificEngineService } from './avi-scientific-engine.service';
import { AVIHeuristicEngineService } from './avi-heuristic-engine.service';
import { ALL_AVI_QUESTIONS } from '../data/avi-questions.data';

@Injectable({
  providedIn: 'root'
})
export class AVIDualEngineService {

  constructor(
    private scientificEngine: AVIScientificEngineService,
    private heuristicEngine: AVIHeuristicEngineService
  ) {}

  /**
   * Ejecuta ambos engines en paralelo y produce un score consolidado
   */
  calculateDualEngineScore(responses: AVIResponse[]): Observable<DualEngineResult> {
    const startTime = Date.now();

    // Ejecutar ambos engines en paralelo
    const scientific$ = of(this.scientificEngine.calculate(responses, ALL_AVI_QUESTIONS)).pipe(
      catchError(error => {
// removed by clean-audit
        return of(this.getDefaultScore('SCIENTIFIC_ENGINE_ERROR'));
      })
    );

    const heuristic$ = from(this.heuristicEngine.calculateHeuristicScore(responses)).pipe(
      catchError(error => {
// removed by clean-audit
        return of(this.getDefaultScore('HEURISTIC_ENGINE_ERROR'));
      })
    );

    return forkJoin({
      scientific: scientific$,
      heuristic: heuristic$
    }).pipe(
      map((engines) => {
        const scientificResult = engines.scientific;
        const heuristicResult = engines.heuristic;

        // Consolidar ambos resultados
        const consolidatedScore = this.consolidateScores(scientificResult, heuristicResult);
        const totalProcessingTime = Date.now() - startTime;

        const result: DualEngineResult = {
          consolidatedScore,
          scientificScore: scientificResult,
          heuristicScore: heuristicResult,
          consensus: this.analyzeConsensus(scientificResult, heuristicResult),
          processingTime: totalProcessingTime,
          engineReliability: this.calculateReliability(scientificResult, heuristicResult),
          recommendations: this.generateDualEngineRecommendations(
            scientificResult,
            heuristicResult,
            consolidatedScore
          )
        };

        return result;
      })
    );
  }

  /**
   * Consolidación inteligente de ambos scores
   */
  private consolidateScores(scientific: AVIScore, heuristic: AVIScore): AVIScore {
    // Pesos adaptativos basados en confiabilidad
    const scientificWeight = this.getEngineWeight('scientific', scientific, heuristic);
    const heuristicWeight = 1 - scientificWeight;

    // Score consolidado ponderado
    const consolidatedTotalScore = Math.round(
      scientific.totalScore * scientificWeight + 
      heuristic.totalScore * heuristicWeight
    );

    // Risk level: tomar el más conservador si hay discrepancia significativa
    const consolidatedRiskLevel = this.consolidateRiskLevels(scientific.riskLevel, heuristic.riskLevel);

    // Combinar red flags de ambos engines
    const consolidatedRedFlags = this.consolidateRedFlags(scientific.redFlags, heuristic.redFlags);

    // Combinar category scores
    const consolidatedCategoryScores: any = {};
    Object.keys(scientific.categoryScores).forEach(category => {
      const scientificCat = scientific.categoryScores[category as keyof typeof scientific.categoryScores] || 0;
      const heuristicCat = heuristic.categoryScores[category as keyof typeof heuristic.categoryScores] || 0;
      
      consolidatedCategoryScores[category] = 
        scientificCat * scientificWeight + heuristicCat * heuristicWeight;
    });

    return {
      totalScore: consolidatedTotalScore,
      riskLevel: consolidatedRiskLevel,
      categoryScores: consolidatedCategoryScores,
      redFlags: consolidatedRedFlags,
      recommendations: [], // Se llenan después
      processingTime: scientific.processingTime + heuristic.processingTime
    };
  }

  /**
   * Cálculo de peso adaptativo para cada engine
   */
  private getEngineWeight(engineType: 'scientific' | 'heuristic', scientific: AVIScore, heuristic: AVIScore): number {
    // Base weights
    let scientificWeight = 0.6; // Preferencia base por engine científico
    
    // Ajustes basados en confiabilidad
    const scientificRedFlagCount = scientific.redFlags.filter(f => f.severity === 'CRITICAL').length;
    const heuristicRedFlagCount = heuristic.redFlags.filter(f => f.severity === 'CRITICAL').length;
    
    // Si uno tiene muchas más red flags críticas, reducir su peso
    if (scientificRedFlagCount > heuristicRedFlagCount + 2) {
      scientificWeight -= 0.2;
    } else if (heuristicRedFlagCount > scientificRedFlagCount + 2) {
      scientificWeight += 0.2;
    }

    // Ajuste por diferencia de scores (consenso)
    const scoreDifference = Math.abs(scientific.totalScore - heuristic.totalScore);
    if (scoreDifference > 200) {
      // Gran discrepancia - reducir peso del científico si es muy optimista
      if (scientific.totalScore > heuristic.totalScore + 200) {
        scientificWeight -= 0.15; // El científico puede estar siendo muy optimista
      }
    }

    // Ajuste por processing time (confiabilidad por tiempo invertido)
    if (scientific.processingTime > heuristic.processingTime * 3) {
      scientificWeight += 0.05; // Más tiempo = más análisis profundo
    }

    return Math.max(0.2, Math.min(0.8, scientificWeight));
  }

  /**
   * Consolidación conservadora de risk levels
   */
  private consolidateRiskLevels(
    scientific: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    heuristic: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const riskOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
    
    const sciRisk = riskOrder[scientific];
    const heuRisk = riskOrder[heuristic];
    
    // Tomar el más conservador (mayor riesgo)
    const maxRisk = Math.max(sciRisk, heuRisk);
    
    // Si hay discrepancia de 2+ niveles, ser extra conservador
    if (Math.abs(sciRisk - heuRisk) >= 2) {
      return Object.keys(riskOrder)[Math.min(maxRisk, 3)] as any; // Máximo HIGH si hay gran discrepancia
    }
    
    return Object.keys(riskOrder)[maxRisk - 1] as any;
  }

  /**
   * Consolidación inteligente de red flags
   */
  private consolidateRedFlags(scientificFlags: RedFlag[], heuristicFlags: RedFlag[]): RedFlag[] {
    const consolidated: RedFlag[] = [];
    
    // Agregar flags críticas de ambos engines
    const criticalFlags = [
      ...scientificFlags.filter(f => f.severity === 'CRITICAL'),
      ...heuristicFlags.filter(f => f.severity === 'CRITICAL')
    ];
    
    consolidated.push(...criticalFlags);
    
    // Agregar flags HIGH que aparecen en ambos engines (consenso)
    const scientificHighIds = scientificFlags.filter(f => f.severity === 'HIGH').map(f => f.questionId);
    const heuristicHighFlags = heuristicFlags.filter(f => 
      f.severity === 'HIGH' && scientificHighIds.includes(f.questionId)
    );
    
    consolidated.push(...heuristicHighFlags);
    
    // Agregar flag de discrepancia si los engines difieren mucho
    const scientificScore = scientificFlags.length ? 1000 - (scientificFlags.length * 50) : 800;
    const heuristicScore = heuristicFlags.length ? 1000 - (heuristicFlags.length * 50) : 800;
    
    if (Math.abs(scientificScore - heuristicScore) > 300) {
      consolidated.push({
        type: 'ENGINE_DISCREPANCY',
        questionId: 'dual_engine_analysis',
        reason: `Gran discrepancia entre engines: ${Math.abs(scientificScore - heuristicScore)} puntos`,
        impact: 8,
        severity: 'HIGH'
      });
    }
    
    return consolidated;
  }

  /**
   * Análisis de consenso entre engines
   */
  private analyzeConsensus(scientific: AVIScore, heuristic: AVIScore): EngineConsensus {
    const scoreDifference = Math.abs(scientific.totalScore - heuristic.totalScore);
    const riskAgreement = scientific.riskLevel === heuristic.riskLevel;
    
    let consensusLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    let agreement: string;
    
    if (scoreDifference <= 100 && riskAgreement) {
      consensusLevel = 'HIGH';
      agreement = 'Ambos engines concuerdan en la evaluación';
    } else if (scoreDifference <= 200 || riskAgreement) {
      consensusLevel = 'MEDIUM';
      agreement = 'Concordancia parcial entre engines';
    } else {
      consensusLevel = 'LOW';
      agreement = 'Discrepancia significativa entre engines';
    }
    
    return {
      level: consensusLevel,
      scoreDifference,
      riskLevelAgreement: riskAgreement,
      agreement,
      scientificAdvantages: this.getScientificAdvantages(scientific, heuristic),
      heuristicAdvantages: this.getHeuristicAdvantages(scientific, heuristic)
    };
  }

  private getScientificAdvantages(scientific: AVIScore, heuristic: AVIScore): string[] {
    const advantages: string[] = [];
    
    if (scientific.processingTime > heuristic.processingTime) {
      advantages.push('Análisis más profundo y detallado');
    }
    
    if (scientific.redFlags.length > heuristic.redFlags.length) {
      advantages.push('Detectó más inconsistencias potenciales');
    }
    
    advantages.push('Algoritmos matemáticos avanzados');
    advantages.push('Análisis dimensional de coherencia');
    
    return advantages;
  }

  private getHeuristicAdvantages(scientific: AVIScore, heuristic: AVIScore): string[] {
    const advantages: string[] = [];
    
    advantages.push('Procesamiento rápido y eficiente');
    advantages.push('Basado en reglas de negocio probadas');
    advantages.push('Fácil interpretación y explicación');
    
    if (heuristic.processingTime < scientific.processingTime / 2) {
      advantages.push('Tiempo de respuesta muy superior');
    }
    
    return advantages;
  }

  /**
   * Cálculo de confiabilidad de cada engine
   */
  private calculateReliability(scientific: AVIScore, heuristic: AVIScore): EngineReliability {
    // Confiabilidad científica basada en tiempo de procesamiento y red flags
    let scientificReliability = 0.8; // Base alta
    if (scientific.processingTime < 100) scientificReliability -= 0.2; // Muy rápido = sospechoso
    if (scientific.redFlags.length === 0) scientificReliability -= 0.1; // Ninguna flag = posible error
    
    // Confiabilidad heurística basada en patrones conocidos
    let heuristicReliability = 0.75; // Base media-alta
    if (heuristic.redFlags.filter(f => f.severity === 'CRITICAL').length > 3) {
      heuristicReliability -= 0.15; // Muchas flags críticas = posible falso positivo
    }
    
    return {
      scientific: Math.max(0.3, Math.min(1.0, scientificReliability)),
      heuristic: Math.max(0.3, Math.min(1.0, heuristicReliability)),
      overall: (scientificReliability + heuristicReliability) / 2
    };
  }

  /**
   * Recomendaciones específicas del dual engine
   */
  private generateDualEngineRecommendations(
    scientific: AVIScore,
    heuristic: AVIScore,
    consolidated: AVIScore
  ): string[] {
    const recommendations: string[] = [];
    
    // Recomendación principal basada en consenso
    const scoreDiff = Math.abs(scientific.totalScore - heuristic.totalScore);
    
    if (scoreDiff <= 100) {
      recommendations.push(`✅ CONSENSO ALTO: Ambos engines coinciden (diferencia: ${scoreDiff} pts)`);
    } else if (scoreDiff <= 200) {
      recommendations.push(`⚠️ CONSENSO MEDIO: Revisar discrepancias (diferencia: ${scoreDiff} pts)`);
    } else {
      recommendations.push(`🚨 CONSENSO BAJO: Análisis manual requerido (diferencia: ${scoreDiff} pts)`);
    }
    
    // Recomendaciones específicas por engine
    if (scientific.totalScore < heuristic.totalScore - 150) {
      recommendations.push('Engine científico más conservador - posibles patrones matemáticos de riesgo');
    } else if (heuristic.totalScore < scientific.totalScore - 150) {
      recommendations.push('Engine heurístico más conservador - patrones de negocio indican riesgo');
    }
    
    // Recomendación final
    if (consolidated.riskLevel === 'CRITICAL') {
      recommendations.push('🔴 RECOMENDACIÓN: RECHAZAR - Ambos engines indican riesgo crítico');
    } else if (consolidated.riskLevel === 'HIGH') {
      recommendations.push('🟡 RECOMENDACIÓN: Solicitar garantías adicionales antes de aprobar');
    } else if (consolidated.riskLevel === 'MEDIUM') {
      recommendations.push('🟢 RECOMENDACIÓN: Aprobar con monitoreo cercano');
    } else {
      recommendations.push('✅ RECOMENDACIÓN: Aprobar - Cliente de bajo riesgo');
    }
    
    return recommendations;
  }

  private getDefaultScore(errorType: string): AVIScore {
    return {
      totalScore: 400, // Conservative default
      riskLevel: 'HIGH',
      categoryScores: {} as any,
      redFlags: [{
        type: 'ENGINE_ERROR',
        questionId: 'system_error',
        reason: errorType,
        impact: 10,
        severity: 'CRITICAL'
      }],
      recommendations: ['Error en procesamiento - revisar manualmente'],
      processingTime: 0
    };
  }
}

// Interfaces específicas del dual engine
export interface DualEngineResult {
  consolidatedScore: AVIScore;
  scientificScore: AVIScore;
  heuristicScore: AVIScore;
  consensus: EngineConsensus;
  processingTime: number;
  engineReliability: EngineReliability;
  recommendations: string[];
}

export interface EngineConsensus {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  scoreDifference: number;
  riskLevelAgreement: boolean;
  agreement: string;
  scientificAdvantages: string[];
  heuristicAdvantages: string[];
}

export interface EngineReliability {
  scientific: number; // 0-1
  heuristic: number; // 0-1
  overall: number; // 0-1
}
// removed by clean-audit