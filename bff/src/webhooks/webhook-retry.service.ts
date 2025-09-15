/**
 * 🔄 Webhook Retry Service
 * Enterprise-grade webhook processing with exponential backoff and persistence
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool } from 'pg';
import axios from 'axios';
import * as crypto from 'crypto';

export enum WebhookStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter'
}

export enum WebhookProvider {
  CONEKTA = 'conekta',
  MIFIEL = 'mifiel',
  METAMAP = 'metamap',
  GNV = 'gnv'
}

interface WebhookEvent {
  id: string;
  provider: WebhookProvider;
  event_type: string;
  payload: any;
  headers: any;
  status: WebhookStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at: Date;
  created_at: Date;
  updated_at: Date;
  processing_log: any[];
  signature?: string;
}

@Injectable()
export class WebhookRetryService {
  private readonly logger = new Logger(WebhookRetryService.name);
  private readonly dbPool: Pool;
  private readonly maxRetries = 5;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 300000; // 5 minutes

  constructor(private configService: ConfigService) {
    this.dbPool = new Pool({
      connectionString: this.configService.get<string>('DATABASE_URL'),
      ssl: { rejectUnauthorized: false }
    });

    this.initializeTables();
  }

  private async initializeTables() {
    try {
      await this.dbPool.query(`
        CREATE TABLE IF NOT EXISTS webhook_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider VARCHAR(50) NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL,
          headers JSONB DEFAULT '{}',
          signature VARCHAR(255),
          status VARCHAR(20) DEFAULT 'pending',
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 5,
          next_retry_at TIMESTAMP,
          last_error TEXT,
          processing_log JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS webhook_processing_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          webhook_event_id UUID NOT NULL,
          processor_type VARCHAR(50) NOT NULL,
          result JSONB NOT NULL,
          processing_time_ms INTEGER,
          success BOOLEAN NOT NULL,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (webhook_event_id) REFERENCES webhook_events(id)
        );

        CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
        CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry ON webhook_events(next_retry_at);
        CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
        CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
      `);
      
      this.logger.log('✅ Webhook retry tables initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize webhook tables:', error);
    }
  }

  /**
   * Queue webhook event for processing
   */
  async queueWebhookEvent(
    provider: WebhookProvider,
    eventType: string,
    payload: any,
    headers: any = {},
    signature?: string
  ): Promise<string> {
    const client = await this.dbPool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO webhook_events (
          provider, event_type, payload, headers, signature,
          status, next_retry_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [
        provider,
        eventType,
        JSON.stringify(payload),
        JSON.stringify(headers),
        signature,
        WebhookStatus.PENDING
      ]);

      const webhookId = result.rows[0].id;
      this.logger.log(`📥 Webhook queued: ${provider}/${eventType} - ID: ${webhookId}`);
      
      // Process immediately in background
      this.processWebhookEvent(webhookId).catch(error => {
        this.logger.error(`❌ Immediate processing failed for ${webhookId}:`, error);
      });
      
      return webhookId;
    } finally {
      client.release();
    }
  }

  /**
   * Process individual webhook event
   */
  async processWebhookEvent(webhookId: string): Promise<void> {
    const client = await this.dbPool.connect();
    
    try {
      // Lock and fetch webhook event
      const result = await client.query(`
        UPDATE webhook_events 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND status IN ($3, $4)
        RETURNING *
      `, [
        WebhookStatus.PROCESSING, 
        webhookId, 
        WebhookStatus.PENDING, 
        WebhookStatus.FAILED
      ]);

      if (result.rows.length === 0) {
        this.logger.warn(`⚠️ Webhook ${webhookId} not found or already processing`);
        return;
      }

      const webhook = result.rows[0] as WebhookEvent;
      const startTime = Date.now();
      
      this.logger.log(`🔄 Processing webhook: ${webhook.provider}/${webhook.event_type} - Attempt ${webhook.retry_count + 1}`);

      try {
        // Process based on provider
        const processingResult = await this.processWebhookByProvider(webhook);
        
        const processingTime = Date.now() - startTime;
        
        // Update success status
        await client.query(`
          UPDATE webhook_events 
          SET 
            status = $1,
            processing_log = processing_log || $2,
            updated_at = NOW()
          WHERE id = $3
        `, [
          WebhookStatus.COMPLETED,
          JSON.stringify([{
            attempt: webhook.retry_count + 1,
            timestamp: new Date().toISOString(),
            success: true,
            processing_time_ms: processingTime,
            result: processingResult
          }]),
          webhookId
        ]);

        // Store processing result
        await client.query(`
          INSERT INTO webhook_processing_results (
            webhook_event_id, processor_type, result, processing_time_ms, success
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          webhookId,
          webhook.provider,
          JSON.stringify(processingResult),
          processingTime,
          true
        ]);

        this.logger.log(`✅ Webhook processed successfully: ${webhookId} in ${processingTime}ms`);
        
      } catch (error) {
        const processingTime = Date.now() - startTime;
        const newRetryCount = webhook.retry_count + 1;
        
        this.logger.error(`❌ Webhook processing failed: ${webhookId} - ${error.message}`);

        if (newRetryCount >= this.maxRetries) {
          // Move to dead letter queue
          await client.query(`
            UPDATE webhook_events 
            SET 
              status = $1,
              retry_count = $2,
              last_error = $3,
              processing_log = processing_log || $4,
              updated_at = NOW()
            WHERE id = $5
          `, [
            WebhookStatus.DEAD_LETTER,
            newRetryCount,
            error.message,
            JSON.stringify([{
              attempt: newRetryCount,
              timestamp: new Date().toISOString(),
              success: false,
              error: error.message,
              processing_time_ms: processingTime
            }]),
            webhookId
          ]);

          this.logger.error(`💀 Webhook moved to dead letter: ${webhookId} after ${newRetryCount} attempts`);
        } else {
          // Schedule retry with exponential backoff
          const delay = this.calculateRetryDelay(newRetryCount);
          const nextRetryAt = new Date(Date.now() + delay);

          await client.query(`
            UPDATE webhook_events 
            SET 
              status = $1,
              retry_count = $2,
              next_retry_at = $3,
              last_error = $4,
              processing_log = processing_log || $5,
              updated_at = NOW()
            WHERE id = $6
          `, [
            WebhookStatus.FAILED,
            newRetryCount,
            nextRetryAt,
            error.message,
            JSON.stringify([{
              attempt: newRetryCount,
              timestamp: new Date().toISOString(),
              success: false,
              error: error.message,
              processing_time_ms: processingTime,
              next_retry_at: nextRetryAt.toISOString()
            }]),
            webhookId
          ]);

          this.logger.warn(`⏰ Webhook scheduled for retry: ${webhookId} at ${nextRetryAt.toISOString()}`);
        }

        // Store failed processing result
        await client.query(`
          INSERT INTO webhook_processing_results (
            webhook_event_id, processor_type, result, processing_time_ms, success, error_message
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          webhookId,
          webhook.provider,
          JSON.stringify({ error: error.message }),
          processingTime,
          false,
          error.message
        ]);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Process webhook based on provider
   */
  private async processWebhookByProvider(webhook: WebhookEvent): Promise<any> {
    switch (webhook.provider) {
      case WebhookProvider.CONEKTA:
        return this.processConektaWebhook(webhook);
      case WebhookProvider.MIFIEL:
        return this.processMifieldWebhook(webhook);
      case WebhookProvider.METAMAP:
        return this.processMetamapWebhook(webhook);
      case WebhookProvider.GNV:
        return this.processGnvWebhook(webhook);
      default:
        throw new Error(`Unknown webhook provider: ${webhook.provider}`);
    }
  }

  /**
   * Process Conekta payment webhook
   */
  private async processConektaWebhook(webhook: WebhookEvent): Promise<any> {
    const payload = webhook.payload;
    
    // Verify HMAC signature
    if (webhook.signature) {
      const expectedSignature = this.generateHMAC(payload, this.configService.get('CONEKTA_WEBHOOK_SECRET'));
      if (webhook.signature !== expectedSignature) {
        throw new Error('Invalid Conekta webhook signature');
      }
    }

    switch (payload.event) {
      case 'payment.paid':
        return this.processConektaPaymentPaid(payload);
      case 'payment.failed':
        return this.processConektaPaymentFailed(payload);
      case 'order.paid':
        return this.processConektaOrderPaid(payload);
      default:
        this.logger.warn(`⚠️ Unhandled Conekta event: ${payload.event}`);
        return { processed: false, reason: 'Unhandled event type' };
    }
  }

  private async processConektaPaymentPaid(payload: any): Promise<any> {
    const order = payload.data.object;
    
    // Update payment status in database
    await this.dbPool.query(`
      UPDATE cotizaciones 
      SET 
        payment_status = 'paid',
        payment_id = $1,
        payment_method = $2,
        paid_at = NOW(),
        updated_at = NOW()
      WHERE conekta_order_id = $3
    `, [
      order.id,
      order.charges?.data?.[0]?.payment_method?.type || 'unknown',
      order.id
    ]);

    // Trigger policy issuance
    await axios.post(`${this.configService.get('BFF_URL')}/api/policies/issue`, {
      orderId: order.id,
      customerEmail: order.customer?.email,
      amount: order.amount
    });

    return {
      processed: true,
      action: 'payment_confirmed',
      orderId: order.id,
      amount: order.amount
    };
  }

  private async processConektaPaymentFailed(payload: any): Promise<any> {
    const order = payload.data.object;
    
    // Update payment status and send notification
    await this.dbPool.query(`
      UPDATE cotizaciones 
      SET 
        payment_status = 'failed',
        payment_error = $1,
        updated_at = NOW()
      WHERE conekta_order_id = $2
    `, [
      payload.data.object.failure_message || 'Payment failed',
      order.id
    ]);

    return {
      processed: true,
      action: 'payment_failed',
      orderId: order.id,
      error: payload.data.object.failure_message
    };
  }

  private async processConektaOrderPaid(payload: any): Promise<any> {
    // Similar to payment.paid but for order-level events
    return this.processConektaPaymentPaid(payload);
  }

  /**
   * Process Mifiel signature webhook
   */
  private async processMifieldWebhook(webhook: WebhookEvent): Promise<any> {
    const payload = webhook.payload;
    
    switch (payload.event) {
      case 'document.signed':
        return this.processMifieldDocumentSigned(payload);
      case 'document.completed':
        return this.processMifieldDocumentCompleted(payload);
      default:
        this.logger.warn(`⚠️ Unhandled Mifiel event: ${payload.event}`);
        return { processed: false, reason: 'Unhandled event type' };
    }
  }

  private async processMifieldDocumentSigned(payload: any): Promise<any> {
    const document = payload.document;
    
    // Update document status
    await this.dbPool.query(`
      UPDATE proteccion_documents 
      SET 
        status = 'signed',
        signed_at = NOW(),
        mifiel_signature_data = $1,
        updated_at = NOW()
      WHERE mifiel_document_id = $2
    `, [
      JSON.stringify(document),
      document.id
    ]);

    return {
      processed: true,
      action: 'document_signed',
      documentId: document.id,
      signers: document.signers
    };
  }

  private async processMifieldDocumentCompleted(payload: any): Promise<any> {
    const document = payload.document;
    
    // Mark protection contract as active
    await this.dbPool.query(`
      UPDATE proteccion_policies 
      SET 
        status = 'active',
        contract_signed_at = NOW(),
        updated_at = NOW()
      WHERE document_id = (
        SELECT id FROM proteccion_documents 
        WHERE mifiel_document_id = $1
      )
    `, [document.id]);

    return {
      processed: true,
      action: 'contract_activated',
      documentId: document.id
    };
  }

  /**
   * Process MetaMap KYC webhook
   */
  private async processMetamapWebhook(webhook: WebhookEvent): Promise<any> {
    const payload = webhook.payload;
    
    if (payload.resource === 'verification') {
      return this.processMetamapVerification(payload);
    }

    this.logger.warn(`⚠️ Unhandled MetaMap resource: ${payload.resource}`);
    return { processed: false, reason: 'Unhandled resource type' };
  }

  private async processMetamapVerification(payload: any): Promise<any> {
    const verification = payload;
    
    // Update KYC status
    await this.dbPool.query(`
      UPDATE cliente_kyc 
      SET 
        metamap_verification_id = $1,
        verification_status = $2,
        risk_level = $3,
        verification_data = $4,
        verified_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE cliente_id = (
        SELECT cliente_id FROM cotizaciones 
        WHERE metamap_verification_id = $1
      )
    `, [
      verification.verificationId,
      verification.verificationStatus,
      verification.identity?.riskLevel || 'medium',
      JSON.stringify(verification)
    ]);

    // If approved, trigger next step in onboarding
    if (verification.verificationStatus === 'approved') {
      await axios.post(`${this.configService.get('BFF_URL')}/api/onboarding/kyc-approved`, {
        verificationId: verification.verificationId,
        riskLevel: verification.identity?.riskLevel
      });
    }

    return {
      processed: true,
      action: 'kyc_updated',
      verificationId: verification.verificationId,
      status: verification.verificationStatus,
      riskLevel: verification.identity?.riskLevel
    };
  }

  /**
   * Process GNV station health webhook
   */
  private async processGnvWebhook(webhook: WebhookEvent): Promise<any> {
    const payload = webhook.payload;
    
    // Update GNV station health metrics
    await this.dbPool.query(`
      INSERT INTO gnv_station_health (
        station_id, health_score, ingestion_status, 
        rows_processed, rows_rejected, metrics_timestamp, webhook_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (station_id, metrics_timestamp) 
      DO UPDATE SET
        health_score = EXCLUDED.health_score,
        ingestion_status = EXCLUDED.ingestion_status,
        rows_processed = EXCLUDED.rows_processed,
        rows_rejected = EXCLUDED.rows_rejected,
        webhook_data = EXCLUDED.webhook_data,
        updated_at = NOW()
    `, [
      payload.stationId,
      payload.healthScore,
      payload.ingestionStatus,
      payload.rowsProcessed || 0,
      payload.rowsRejected || 0,
      payload.timestamp || new Date().toISOString(),
      JSON.stringify(payload)
    ]);

    // Check if health score is below threshold
    if (payload.healthScore < 85) {
      // Trigger alert
      await axios.post(`${this.configService.get('BFF_URL')}/api/alerts/gnv-health-degraded`, {
        stationId: payload.stationId,
        healthScore: payload.healthScore,
        timestamp: payload.timestamp
      });
    }

    return {
      processed: true,
      action: 'health_metrics_updated',
      stationId: payload.stationId,
      healthScore: payload.healthScore,
      alertTriggered: payload.healthScore < 85
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: baseDelay * 2^(retryCount-1) + jitter
    const delay = this.baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second jitter
    return Math.min(delay + jitter, this.maxDelay);
  }

  /**
   * Generate HMAC signature for webhook validation
   */
  private generateHMAC(payload: any, secret: string): string {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  }

  /**
   * Cron job to process retry queue
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processRetryQueue() {
    const client = await this.dbPool.connect();
    
    try {
      // Find webhooks ready for retry
      const result = await client.query(`
        SELECT id FROM webhook_events 
        WHERE status = $1 AND next_retry_at <= NOW()
        ORDER BY next_retry_at
        LIMIT 50
      `, [WebhookStatus.FAILED]);

      if (result.rows.length > 0) {
        this.logger.log(`🔄 Processing ${result.rows.length} webhook retries`);
        
        for (const row of result.rows) {
          this.processWebhookEvent(row.id).catch(error => {
            this.logger.error(`❌ Retry processing failed for ${row.id}:`, error);
          });
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<any> {
    const client = await this.dbPool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          provider,
          status,
          COUNT(*) as count,
          AVG(retry_count) as avg_retries,
          DATE_TRUNC('hour', created_at) as hour
        FROM webhook_events 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY provider, status, DATE_TRUNC('hour', created_at)
        ORDER BY hour DESC
      `);

      const summary = await client.query(`
        SELECT 
          COUNT(*) as total_webhooks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'dead_letter' THEN 1 END) as dead_letter,
          AVG(retry_count) as avg_retries
        FROM webhook_events 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      return {
        summary: summary.rows[0],
        hourlyBreakdown: result.rows,
        successRate: summary.rows[0]?.total_webhooks > 0 
          ? (summary.rows[0].completed / summary.rows[0].total_webhooks * 100).toFixed(2)
          : 0,
        timestamp: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get webhook system health
   */
  async getWebhookHealth(): Promise<any> {
    const stats = await this.getWebhookStats();
    const successRate = parseFloat(stats.successRate);
    
    let status = 'healthy';
    if (successRate < 90) status = 'degraded';
    if (successRate < 70) status = 'unhealthy';
    
    return {
      status,
      successRate,
      stats: stats.summary,
      timestamp: new Date().toISOString()
    };
  }
}