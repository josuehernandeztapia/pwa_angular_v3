/**
 * 🎯 KIBAN/HASE Risk Evaluation - Response DTOs
 * Enterprise-grade response models with comprehensive risk insights
 */

import { ApiProperty } from '@nestjs/swagger';
import { RiskCategory, EvaluationType } from './risk-evaluation-request.dto';

export enum RiskDecision {
  APROBADO = 'aprobado',
  APROBADO_CONDICIONAL = 'aprobado_condicional', 
  PENDIENTE_REVISION = 'pendiente_revision',
  RECHAZADO = 'rechazado'
}

export enum RiskFactorSeverity {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica'
}

export class RiskScoreBreakdownDto {
  @ApiProperty({ description: 'Puntaje crediticio ponderado (0-100)' })
  creditScore: number;

  @ApiProperty({ description: 'Puntaje de estabilidad financiera (0-100)' })
  financialStability: number;

  @ApiProperty({ description: 'Puntaje de comportamiento histórico (0-100)' })
  behaviorHistory: number;

  @ApiProperty({ description: 'Puntaje de capacidad de pago (0-100)' })
  paymentCapacity: number;

  @ApiProperty({ description: 'Puntaje de riesgo geográfico (0-100)' })
  geographicRisk: number;

  @ApiProperty({ description: 'Puntaje de perfil del vehículo (0-100)' })
  vehicleProfile: number;

  @ApiProperty({ description: 'Puntaje final consolidado (0-100)' })
  finalScore: number;
}

export class RiskFactorDetailDto {
  @ApiProperty({ description: 'Identificador del factor de riesgo' })
  factorId: string;

  @ApiProperty({ description: 'Nombre del factor de riesgo' })
  factorName: string;

  @ApiProperty({ description: 'Descripción detallada del factor' })
  description: string;

  @ApiProperty({ description: 'Severidad del factor', enum: RiskFactorSeverity })
  severity: RiskFactorSeverity;

  @ApiProperty({ description: 'Impacto en el score final (-100 a +100)' })
  scoreImpact: number;

  @ApiProperty({ description: 'Recomendaciones para mitigar el riesgo', type: [String] })
  mitigationRecommendations: string[];

  @ApiProperty({ description: 'Documentación adicional requerida', type: [String] })
  requiredDocumentation?: string[];
}

export class FinancialRecommendationsDto {
  @ApiProperty({ description: 'Monto máximo recomendado para préstamo' })
  maxLoanAmount: number;

  @ApiProperty({ description: 'Enganche mínimo recomendado' })
  minDownPayment: number;

  @ApiProperty({ description: 'Plazo máximo recomendado en meses' })
  maxTermMonths: number;

  @ApiProperty({ description: 'Tasa de interés sugerida (%)' })
  suggestedInterestRate: number;

  @ApiProperty({ description: 'Pago mensual estimado' })
  estimatedMonthlyPayment: number;

  @ApiProperty({ description: 'Ratio deuda-ingreso resultante (%)' })
  resultingDebtToIncomeRatio: number;

  @ApiProperty({ description: 'Condiciones especiales requeridas', type: [String] })
  specialConditions?: string[];
}

export class RiskMitigationPlanDto {
  @ApiProperty({ description: 'Plan de mitigación requerido' })
  required: boolean;

  @ApiProperty({ description: 'Acciones de mitigación recomendadas', type: [String] })
  actions: string[];

  @ApiProperty({ description: 'Tiempo estimado para implementar plan (días)' })
  estimatedDays: number;

  @ApiProperty({ description: 'Costo estimado de implementación' })
  estimatedCost?: number;

  @ApiProperty({ description: 'Reducción esperada en score de riesgo' })
  expectedRiskReduction: number;
}

export class ComplianceValidationDto {
  @ApiProperty({ description: 'Cumple con políticas internas' })
  internalPoliciesCompliant: boolean;

  @ApiProperty({ description: 'Cumple con regulaciones financieras' })
  regulatoryCompliant: boolean;

  @ApiProperty({ description: 'Validaciones KYC completadas' })
  kycValidationsComplete: boolean;

  @ApiProperty({ description: 'Verificaciones AML aprobadas' })
  amlVerificationsApproved: boolean;

  @ApiProperty({ description: 'Observaciones de cumplimiento', type: [String] })
  complianceNotes?: string[];

  @ApiProperty({ description: 'Documentación faltante para cumplimiento', type: [String] })
  missingDocumentation?: string[];
}

export class RiskEvaluationResponseDto {
  @ApiProperty({ description: 'ID único de la evaluación' })
  evaluationId: string;

  @ApiProperty({ description: 'Timestamp de procesamiento' })
  processedAt: Date;

  @ApiProperty({ description: 'Tiempo total de procesamiento en ms' })
  processingTimeMs: number;

  @ApiProperty({ description: 'Versión del algoritmo de evaluación' })
  algorithmVersion: string;

  @ApiProperty({ description: 'Decisión final de riesgo', enum: RiskDecision })
  decision: RiskDecision;

  @ApiProperty({ description: 'Categoría de riesgo asignada', enum: RiskCategory })
  riskCategory: RiskCategory;

  @ApiProperty({ description: 'Nivel de confianza en la evaluación (0-100)' })
  confidenceLevel: number;

  @ApiProperty({ description: 'Desglose detallado del score', type: RiskScoreBreakdownDto })
  scoreBreakdown: RiskScoreBreakdownDto;

  @ApiProperty({ description: 'Factores de riesgo identificados', type: [RiskFactorDetailDto] })
  riskFactors: RiskFactorDetailDto[];

  @ApiProperty({ description: 'Recomendaciones financieras', type: FinancialRecommendationsDto })
  financialRecommendations: FinancialRecommendationsDto;

  @ApiProperty({ description: 'Plan de mitigación de riesgos', type: RiskMitigationPlanDto })
  mitigationPlan: RiskMitigationPlanDto;

  @ApiProperty({ description: 'Validaciones de cumplimiento', type: ComplianceValidationDto })
  complianceValidation: ComplianceValidationDto;

  @ApiProperty({ description: 'Razones principales de la decisión', type: [String] })
  decisionReasons: string[];

  @ApiProperty({ description: 'Próximos pasos recomendados', type: [String] })
  nextSteps: string[];

  @ApiProperty({ description: 'Fecha de vencimiento de la evaluación' })
  expirationDate: Date;

  @ApiProperty({ description: 'Metadatos adicionales del procesamiento' })
  metadata?: Record<string, any>;
}

export class BatchRiskEvaluationResponseDto {
  @ApiProperty({ description: 'ID del lote procesado' })
  batchId: string;

  @ApiProperty({ description: 'Timestamp de inicio del procesamiento' })
  startedAt: Date;

  @ApiProperty({ description: 'Timestamp de finalización del procesamiento' })
  completedAt: Date;

  @ApiProperty({ description: 'Total de evaluaciones procesadas' })
  totalProcessed: number;

  @ApiProperty({ description: 'Total de evaluaciones exitosas' })
  totalSuccessful: number;

  @ApiProperty({ description: 'Total de evaluaciones fallidas' })
  totalFailed: number;

  @ApiProperty({ description: 'Resultados individuales', type: [RiskEvaluationResponseDto] })
  results: RiskEvaluationResponseDto[];

  @ApiProperty({ description: 'Errores de procesamiento por evaluación' })
  processingErrors?: Record<string, string>;

  @ApiProperty({ description: 'Estadísticas del lote' })
  batchStats: {
    averageProcessingTime: number;
    approvalRate: number;
    highRiskCount: number;
    conditionalApprovals: number;
  };
}

export class RiskAnalyticsDto {
  @ApiProperty({ description: 'Distribución de decisiones por categoría' })
  decisionDistribution: Record<RiskDecision, number>;

  @ApiProperty({ description: 'Distribución de categorías de riesgo' })
  riskCategoryDistribution: Record<RiskCategory, number>;

  @ApiProperty({ description: 'Factores de riesgo más comunes' })
  commonRiskFactors: Array<{
    factor: string;
    frequency: number;
    averageImpact: number;
  }>;

  @ApiProperty({ description: 'Tendencias temporales de aprobación' })
  approvalTrends: Array<{
    period: string;
    approvalRate: number;
    averageScore: number;
  }>;

  @ApiProperty({ description: 'Métricas de rendimiento del modelo' })
  modelPerformance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}