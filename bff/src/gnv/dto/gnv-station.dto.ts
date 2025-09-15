/**
 * 🚀 GNV Station DTOs
 * Enterprise-grade data transfer objects for GNV health monitoring
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, Min, Max } from 'class-validator';

export enum HealthStatus {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
  // Additional values for service compatibility
  healthy = 'healthy',
  degraded = 'degraded',
  critical = 'critical'
}

export enum StationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE'
}

export class GnvHealthDto {
  @ApiProperty({ example: 'ST001', description: 'Station unique identifier' })
  @IsString()
  stationId: string;

  @ApiProperty({ example: 87.5, description: 'Health percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  healthPercentage: number;

  @ApiProperty({ example: 87.5, description: 'Health score (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  healthScore?: number;

  @ApiProperty({ enum: HealthStatus, example: HealthStatus.GREEN })
  @IsEnum(HealthStatus)
  status: HealthStatus;

  @ApiProperty({ example: 'OPERATIONAL', description: 'Ingestion status', required: false })
  @IsOptional()
  @IsString()
  ingestionStatus?: string;

  @ApiProperty({ example: '2025-09-15T10:30:00Z', description: 'Last health check timestamp' })
  lastCheck: string;

  @ApiProperty({ type: [String], example: ['Pump 2 offline', 'Payment terminal slow'] })
  @IsArray()
  @IsString({ each: true })
  observations: string[];

  @ApiProperty({ example: 145, description: 'Total transactions processed today' })
  @IsNumber()
  totalTransactions: number;

  @ApiProperty({ example: 142, description: 'Successful transactions' })
  @IsNumber()
  successfulTransactions: number;

  @ApiProperty({ example: 3, description: 'Failed transactions' })
  @IsNumber()
  failedTransactions: number;

  @ApiProperty({ example: 150, description: 'Rows processed', required: false })
  @IsOptional()
  @IsNumber()
  rowsProcessed?: number;

  @ApiProperty({ example: 5, description: 'Rows rejected', required: false })
  @IsOptional()
  @IsNumber()
  rowsRejected?: number;

  @ApiProperty({ example: 3.2, description: 'Error rate percentage', required: false })
  @IsOptional()
  @IsNumber()
  errorRate?: number;

  @ApiProperty({ example: 125.5, description: 'Average processing time in ms', required: false })
  @IsOptional()
  @IsNumber()
  avgProcessingTime?: number;

  @ApiProperty({ example: '2025-09-15T10:30:00Z', description: 'Data timestamp', required: false })
  @IsOptional()
  timestamp?: string;
}

export class GnvIngestionDto {
  @ApiProperty({ example: 'ST001', description: 'Station identifier' })
  @IsString()
  stationId: string;

  @ApiProperty({ example: '2025-09-15', description: 'Date for ingestion (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'CSV file upload' })
  file: Express.Multer.File | string;

  @ApiProperty({ type: 'array', description: 'Ingested data records', required: false })
  @IsOptional()
  data?: any[];

  @ApiProperty({ example: false, description: 'Force overwrite existing data' })
  @IsOptional()
  @IsBoolean()
  forceOverwrite?: boolean;
}

export class StationMetricsQueryDto {
  @ApiProperty({ example: 'ST001', description: 'Station ID filter', required: false })
  @IsOptional()
  @IsString()
  stationId?: string;

  @ApiProperty({ example: '2025-09-01', description: 'Start date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ example: '2025-09-15', description: 'End date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ enum: HealthStatus, description: 'Filter by health status', required: false })
  @IsOptional()
  @IsEnum(HealthStatus)
  healthStatus?: HealthStatus;

  @ApiProperty({ example: 10, description: 'Number of records to return', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ example: 7, description: 'Number of days for metrics', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  days?: number;

  @ApiProperty({ example: 'hour', description: 'Data aggregation interval', required: false })
  @IsOptional()
  @IsString()
  interval?: string;
}

export class StationSummaryDto {
  @ApiProperty({ example: 'ST001', description: 'Station identifier' })
  stationId: string;

  @ApiProperty({ example: 'Central Station Polanco', description: 'Station name' })
  name: string;

  @ApiProperty({ example: 'Av. Presidente Masaryk 111, Polanco', description: 'Station address' })
  address: string;

  @ApiProperty({ enum: StationStatus, example: StationStatus.ACTIVE })
  status: StationStatus;

  @ApiProperty({ example: 87.5, description: 'Current health percentage' })
  healthPercentage: number;

  @ApiProperty({ enum: HealthStatus, example: HealthStatus.GREEN })
  healthStatus: HealthStatus;

  @ApiProperty({ example: 145, description: 'Transactions today' })
  transactionsToday: number;

  @ApiProperty({ example: 2.3, description: 'Revenue today in thousands' })
  revenueToday: number;

  @ApiProperty({ example: '2025-09-15T10:30:00Z', description: 'Last activity timestamp' })
  lastActivity: Date;

  @ApiProperty({ type: [String], example: ['Pump maintenance needed'] })
  alerts: string[];
}

export class IngestionResultDto {
  @ApiProperty({ example: true, description: 'Whether ingestion was successful' })
  success: boolean;

  @ApiProperty({ example: 150, description: 'Number of records processed' })
  recordsProcessed: number;

  @ApiProperty({ example: 148, description: 'Number of valid records' })
  recordsValid: number;

  @ApiProperty({ example: 2, description: 'Number of invalid records' })
  recordsInvalid: number;

  @ApiProperty({ type: [String], example: ['Row 15: Invalid transaction amount', 'Row 23: Missing station ID'] })
  errors: string[];

  @ApiProperty({ example: '2025-09-15T10:30:00Z', description: 'Ingestion timestamp' })
  ingestedAt: Date;

  @ApiProperty({ example: 'data_2025_09_15_ST001.csv', description: 'Original filename' })
  filename: string;
}

export class HealthReportDto {
  @ApiProperty({ example: '2025-09-15', description: 'Report date' })
  reportDate: string;

  @ApiProperty({ example: 25, description: 'Total number of stations' })
  totalStations: number;

  @ApiProperty({ example: 18, description: 'Stations with GREEN health status' })
  greenStations: number;

  @ApiProperty({ example: 5, description: 'Stations with YELLOW health status' })
  yellowStations: number;

  @ApiProperty({ example: 2, description: 'Stations with RED health status' })
  redStations: number;

  @ApiProperty({ example: 88.2, description: 'Overall network health percentage' })
  overallHealth: number;

  @ApiProperty({ type: [StationSummaryDto], description: 'Individual station summaries' })
  stations: StationSummaryDto[];

  @ApiProperty({ type: [String], example: ['ST001: Pump maintenance', 'ST005: Payment issues'] })
  criticalAlerts: string[];

  @ApiProperty({ example: 3450, description: 'Total transactions across all stations today' })
  totalTransactionsToday: number;

  @ApiProperty({ example: 45.7, description: 'Total revenue today in thousands' })
  totalRevenueToday: number;
}