/**
 * 🎯 KIBAN/HASE Risk Evaluation - Request DTOs
 * Enterprise-grade validation with class-validator decorators
 */

import { 
  IsNotEmpty, 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsEnum, 
  IsObject,
  ValidateNested,
  IsArray,
  Min,
  Max,
  Length
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum RiskCategory {
  BAJO = 'bajo',
  MEDIO = 'medio',
  ALTO = 'alto',
  CRITICO = 'critico'
}

export enum EvaluationType {
  INDIVIDUAL = 'individual',
  GRUPO = 'grupo',
  COLECTIVA = 'colectiva'
}

export class PersonalDataDto {
  @ApiProperty({ description: 'Edad del evaluado', minimum: 18, maximum: 100 })
  @IsNumber()
  @Min(18)
  @Max(100)
  edad: number;

  @ApiProperty({ description: 'Género del evaluado', enum: ['M', 'F', 'O'] })
  @IsString()
  @IsEnum(['M', 'F', 'O'])
  genero: string;

  @ApiProperty({ description: 'Ocupación principal' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  ocupacion: string;

  @ApiProperty({ description: 'Ingresos mensuales aproximados', minimum: 0 })
  @IsNumber()
  @Min(0)
  ingresosMensuales: number;

  @ApiProperty({ description: 'Estado civil', enum: ['soltero', 'casado', 'divorciado', 'viudo', 'union_libre'] })
  @IsString()
  @IsEnum(['soltero', 'casado', 'divorciado', 'viudo', 'union_libre'])
  estadoCivil: string;
}

export class FinancialProfileDto {
  @ApiProperty({ description: 'Score crediticio (300-850)', minimum: 300, maximum: 850 })
  @IsNumber()
  @Min(300)
  @Max(850)
  scoreCrediticio: number;

  @ApiProperty({ description: 'Historial de pagos puntuales (%)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  historialPagos: number;

  @ApiProperty({ description: 'Deuda actual total', minimum: 0 })
  @IsNumber()
  @Min(0)
  deudaActual: number;

  @ApiProperty({ description: 'Capacidad de pago mensual', minimum: 0 })
  @IsNumber()
  @Min(0)
  capacidadPago: number;

  @ApiProperty({ description: 'Años de historial crediticio', minimum: 0, maximum: 50 })
  @IsNumber()
  @Min(0)
  @Max(50)
  antiguedadCrediticia: number;
}

export class VehicleDataDto {
  @ApiProperty({ description: 'Marca del vehículo' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  marca: string;

  @ApiProperty({ description: 'Modelo del vehículo' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  modelo: string;

  @ApiProperty({ description: 'Año del vehículo', minimum: 1990, maximum: 2030 })
  @IsNumber()
  @Min(1990)
  @Max(2030)
  año: number;

  @ApiProperty({ description: 'Precio del vehículo', minimum: 50000 })
  @IsNumber()
  @Min(50000)
  precio: number;

  @ApiProperty({ description: 'Enganche propuesto', minimum: 0 })
  @IsNumber()
  @Min(0)
  enganche: number;

  @ApiProperty({ description: 'Plazo de financiamiento en meses', minimum: 12, maximum: 96 })
  @IsNumber()
  @Min(12)
  @Max(96)
  plazoMeses: number;
}

export class RiskFactorsDto {
  @ApiProperty({ description: 'Factores de riesgo detectados', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  factoresDetectados?: string[];

  @ApiProperty({ description: 'Puntaje de estabilidad laboral (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  estabilidadLaboral: number;

  @ApiProperty({ description: 'Nivel de endeudamiento (%)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  nivelEndeudamiento: number;

  @ApiProperty({ description: 'Análisis geográfico de riesgo', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  riesgoGeografico: number;
}

export class RiskEvaluationRequestDto {
  @ApiProperty({ description: 'ID único de la evaluación' })
  @IsString()
  @IsNotEmpty()
  @Length(10, 50)
  evaluationId: string;

  @ApiProperty({ description: 'Tipo de evaluación', enum: EvaluationType })
  @IsEnum(EvaluationType)
  tipoEvaluacion: EvaluationType;

  @ApiProperty({ description: 'ID del cliente/usuario' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 50)
  clienteId: string;

  @ApiProperty({ description: 'ID del asesor que realiza la evaluación' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 50)
  asesorId: string;

  @ApiProperty({ description: 'Datos personales del evaluado', type: PersonalDataDto })
  @ValidateNested()
  @Type(() => PersonalDataDto)
  datosPersonales: PersonalDataDto;

  @ApiProperty({ description: 'Perfil financiero del evaluado', type: FinancialProfileDto })
  @ValidateNested()
  @Type(() => FinancialProfileDto)
  perfilFinanciero: FinancialProfileDto;

  @ApiProperty({ description: 'Datos del vehículo a financiar', type: VehicleDataDto })
  @ValidateNested()
  @Type(() => VehicleDataDto)
  datosVehiculo: VehicleDataDto;

  @ApiProperty({ description: 'Factores de riesgo adicionales', type: RiskFactorsDto })
  @ValidateNested()
  @Type(() => RiskFactorsDto)
  factoresRiesgo: RiskFactorsDto;

  @ApiProperty({ description: 'Metadatos adicionales para la evaluación', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BatchRiskEvaluationRequestDto {
  @ApiProperty({ description: 'Lista de evaluaciones a procesar', type: [RiskEvaluationRequestDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RiskEvaluationRequestDto)
  evaluaciones: RiskEvaluationRequestDto[];

  @ApiProperty({ description: 'ID del lote de procesamiento' })
  @IsString()
  @IsNotEmpty()
  @Length(10, 50)
  batchId: string;

  @ApiProperty({ description: 'Prioridad del procesamiento (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  prioridad: number = 3;
}