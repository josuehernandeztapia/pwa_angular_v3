/**
 * 📊 NEON Database Service
 * Production-ready PostgreSQL service with connection pooling
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult } from 'pg';

export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy';
  latency: number;
  activeConnections: number;
  maxConnections: number;
  lastChecked: string;
}

@Injectable()
export class NeonService implements OnModuleDestroy {
  private readonly logger = new Logger(NeonService.name);
  private pool: Pool;

  constructor(private readonly config: ConfigService) {
    this.initializePool();
  }

  private initializePool(): void {
    const databaseUrl = this.config.get<string>('DATABASE_URL') || 'postgresql://username:password@host:5432/database';
    
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
      maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.pool.on('connect', () => {
      this.logger.debug('NEON connection established');
    });

    this.pool.on('error', (err) => {
      this.logger.error('Unexpected NEON pool error:', err);
    });
  }

  /**
   * Execute a query with automatic connection management
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    let client: PoolClient | undefined;

    try {
      client = await this.pool.connect();
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}`);
      return result;
    } catch (error) {
      this.logger.error(`Query failed: ${text}`, error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction rolled back due to error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<DatabaseHealthCheck> {
    const start = Date.now();
    
    try {
      await this.query('SELECT 1');
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency,
        activeConnections: this.pool.totalCount,
        maxConnections: this.pool.options.max || 20,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        activeConnections: this.pool.totalCount,
        maxConnections: this.pool.options.max || 20,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Create tables for KIBAN risk evaluations
   */
  async createKibanTables(): Promise<void> {
    const createTablesQuery = `
      -- Risk Evaluations Table
      CREATE TABLE IF NOT EXISTS kiban_risk_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_id VARCHAR(255) UNIQUE NOT NULL,
        driver_id VARCHAR(255) NOT NULL,
        risk_score DECIMAL(5,2) NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        historical_score DECIMAL(5,2),
        geographic_score DECIMAL(5,2), 
        voice_score DECIMAL(5,2),
        evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Risk Score History Table
      CREATE TABLE IF NOT EXISTS kiban_score_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR(255) NOT NULL,
        evaluation_id VARCHAR(255) NOT NULL,
        score_type VARCHAR(50) NOT NULL,
        score_value DECIMAL(5,2) NOT NULL,
        factors JSONB,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indices for performance
      CREATE INDEX IF NOT EXISTS idx_risk_evaluations_driver ON kiban_risk_evaluations(driver_id);
      CREATE INDEX IF NOT EXISTS idx_risk_evaluations_date ON kiban_risk_evaluations(evaluation_date);
      CREATE INDEX IF NOT EXISTS idx_score_history_driver ON kiban_score_history(driver_id);
      CREATE INDEX IF NOT EXISTS idx_score_history_type ON kiban_score_history(score_type);

      -- Create triggers for updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_risk_evaluations_updated_at ON kiban_risk_evaluations;
      CREATE TRIGGER update_risk_evaluations_updated_at
        BEFORE UPDATE ON kiban_risk_evaluations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await this.query(createTablesQuery);
      this.logger.log('KIBAN database tables created successfully');
    } catch (error) {
      this.logger.error('Failed to create KIBAN tables:', error);
      throw error;
    }
  }

  /**
   * Upsert risk evaluation result
   */
  async upsertRiskEvaluation(evaluation: {
    evaluationId: string;
    driverId: string;
    riskScore: number;
    riskLevel: string;
    historicalScore?: number;
    geographicScore?: number;
    voiceScore?: number;
    metadata?: any;
  }): Promise<void> {
    const query = `
      INSERT INTO kiban_risk_evaluations 
        (evaluation_id, driver_id, risk_score, risk_level, historical_score, geographic_score, voice_score, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (evaluation_id) 
      DO UPDATE SET 
        risk_score = EXCLUDED.risk_score,
        risk_level = EXCLUDED.risk_level,
        historical_score = EXCLUDED.historical_score,
        geographic_score = EXCLUDED.geographic_score,
        voice_score = EXCLUDED.voice_score,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;

    const params = [
      evaluation.evaluationId,
      evaluation.driverId,
      evaluation.riskScore,
      evaluation.riskLevel,
      evaluation.historicalScore || null,
      evaluation.geographicScore || null,
      evaluation.voiceScore || null,
      evaluation.metadata ? JSON.stringify(evaluation.metadata) : null
    ];

    await this.query(query, params);
  }

  /**
   * Record score history for analytics
   */
  async recordScoreHistory(history: {
    driverId: string;
    evaluationId: string;
    scoreType: string;
    scoreValue: number;
    factors?: any;
  }): Promise<void> {
    const query = `
      INSERT INTO kiban_score_history 
        (driver_id, evaluation_id, score_type, score_value, factors)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const params = [
      history.driverId,
      history.evaluationId,
      history.scoreType,
      history.scoreValue,
      history.factors ? JSON.stringify(history.factors) : null
    ];

    await this.query(query, params);
  }

  /**
   * Get driver risk evaluation history
   */
  async getDriverRiskHistory(driverId: string, limit = 10): Promise<any[]> {
    const query = `
      SELECT 
        evaluation_id,
        risk_score,
        risk_level,
        historical_score,
        geographic_score,
        voice_score,
        evaluation_date,
        metadata
      FROM kiban_risk_evaluations 
      WHERE driver_id = $1 
      ORDER BY evaluation_date DESC 
      LIMIT $2
    `;

    const result = await this.query(query, [driverId, limit]);
    return result.rows;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('NEON connection pool closed');
    }
  }
}