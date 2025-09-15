/**
 * 🔄 Enhanced Webhook Retry Service
 * P0.4 Surgical Fix - Enterprise-grade webhook reliability ≥95%
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export enum WebhookProvider {
  CONEKTA = 'conekta',
  MIFIEL = 'mifiel',
  METAMAP = 'metamap',
  GNV = 'gnv',
  ODOO = 'odoo'
}

export enum WebhookStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter'
}

export interface WebhookEvent {
  id?: number;
  provider: WebhookProvider;
  eventType: string;
  externalId?: string;
  payload: any;
  status: WebhookStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  priority: number;
  signatureHeader?: string;
  signatureValid?: boolean;
  errorMessage?: string;
  errorDetails?: any;
}

export interface WebhookStats {
  provider: WebhookProvider;
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  deadLetterEvents: number;
  pendingEvents: number;
  successRate: number;
  avgRetryCount: number;
  avgProcessingTimeMs: number;
}

@Injectable()
export class WebhookRetryEnhancedService {
  private readonly logger = new Logger(WebhookRetryEnhancedService.name);
  private readonly dbPool: Pool;
  private readonly maxConcurrentProcessing = 10;
  private currentlyProcessing = 0;

  // Exponential backoff configuration
  private readonly backoffConfig = {
    initialDelay: 5000,     // 5 seconds
    maxDelay: 300000,       // 5 minutes
    multiplier: 2,          // Double each retry
    jitter: 0.1             // 10% random jitter
  };

  // HMAC secrets by provider
  private readonly hmacSecrets: Record<WebhookProvider, string> = {
    [WebhookProvider.CONEKTA]: this.configService.get('CONEKTA_WEBHOOK_SECRET', ''),
    [WebhookProvider.MIFIEL]: this.configService.get('MIFIEL_WEBHOOK_SECRET', ''),
    [WebhookProvider.METAMAP]: this.configService.get('METAMAP_WEBHOOK_SECRET', ''),
    [WebhookProvider.GNV]: this.configService.get('GNV_WEBHOOK_SECRET', ''),
    [WebhookProvider.ODOO]: this.configService.get('ODOO_WEBHOOK_SECRET', '')
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.dbPool = new Pool({
      connectionString: this.configService.get('DATABASE_URL')
    });
  }

  /**
   * Store new webhook event for processing
   */
  async storeWebhookEvent(
    provider: WebhookProvider,
    eventType: string,
    payload: any,
    options: {
      externalId?: string;
      priority?: number;
      signatureHeader?: string;
      maxRetries?: number;
    } = {}
  ): Promise<WebhookEvent> {
    const client = await this.dbPool.connect();

    try {
      // Validate HMAC signature if provided
      let signatureValid = undefined;
      if (options.signatureHeader && this.hmacSecrets[provider]) {
        signatureValid = this.validateHmacSignature(
          provider,
          JSON.stringify(payload),
          options.signatureHeader
        );
      }

      const query = `
        INSERT INTO webhook_events (
          provider, event_type, external_id, payload, priority,
          signature_header, signature_valid, max_retries
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        provider,
        eventType,
        options.externalId || null,
        JSON.stringify(payload),
        options.priority || 0,
        options.signatureHeader || null,
        signatureValid,
        options.maxRetries || 5
      ];

      const result = await client.query(query, values);
      const event = this.mapRowToWebhookEvent(result.rows[0]);

      this.logger.log(`📥 Stored webhook event: ${provider}/${eventType} (ID: ${event.id})`);

      // Trigger immediate processing for high priority events
      if (options.priority && options.priority > 5) {
        setImmediate(() => this.processNextEvents());
      }

      return event;

    } finally {
      client.release();
    }
  }

  /**
   * Process pending webhook events (cron job)
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processWebhookEvents(): Promise<void> {
    if (this.currentlyProcessing >= this.maxConcurrentProcessing) {
      return; // Skip if already at max concurrency
    }

    await this.processNextEvents();
  }

  /**
   * Process next batch of webhook events
   */
  private async processNextEvents(): Promise<void> {
    if (this.currentlyProcessing >= this.maxConcurrentProcessing) {
      return;
    }

    const client = await this.dbPool.connect();

    try {
      // Get next events to process (ordered by priority and age)
      const query = `
        SELECT * FROM webhook_events
        WHERE status = 'pending'
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
          AND retry_count < max_retries
        ORDER BY priority DESC, created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `;

      const result = await client.query(query, [this.maxConcurrentProcessing - this.currentlyProcessing]);
      const events = result.rows.map(row => this.mapRowToWebhookEvent(row));

      // Process events concurrently
      const promises = events.map(event => this.processWebhookEvent(event));
      await Promise.allSettled(promises);

    } catch (error) {
      this.logger.error('Error in processNextEvents:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Process individual webhook event
   */
  private async processWebhookEvent(event: WebhookEvent): Promise<void> {
    this.currentlyProcessing++;
    const startTime = Date.now();

    try {
      await this.updateEventStatus(event.id!, WebhookStatus.PROCESSING, {
        processingStartedAt: new Date()
      });

      this.logger.log(`🔄 Processing webhook: ${event.provider}/${event.eventType} (ID: ${event.id}, Attempt: ${event.retryCount + 1})`);

      // Get target URL for provider
      const targetUrl = this.getProviderWebhookUrl(event.provider);

      if (!targetUrl) {
        throw new Error(`No webhook URL configured for provider: ${event.provider}`);
      }

      // Make HTTP request with timeout
      const response = await this.httpService.axiosRef.request({
        method: 'POST',
        url: targetUrl,
        data: event.payload,
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Conductores-BFF/1.0',
          'X-Webhook-Provider': event.provider,
          'X-Webhook-Event': event.eventType,
          'X-Webhook-ID': event.id?.toString() || '',
          'X-Webhook-Attempt': (event.retryCount + 1).toString()
        }
      });

      // Record successful attempt
      await this.recordRetryAttempt(event.id!, event.retryCount + 1, {
        httpStatus: response.status,
        responseBody: response.data,
        responseHeaders: response.headers,
        durationMs: Date.now() - startTime
      });

      // Mark as processed
      await this.updateEventStatus(event.id!, WebhookStatus.PROCESSED, {
        processedAt: new Date(),
        responseStatus: response.status,
        responseBody: response.data,
        responseHeaders: response.headers
      });

      this.logger.log(`✅ Webhook processed successfully: ${event.provider}/${event.eventType} (ID: ${event.id})`);

    } catch (error) {
      await this.handleWebhookFailure(event, error, Date.now() - startTime);

    } finally {
      this.currentlyProcessing--;
    }
  }

  /**
   * Handle webhook processing failure
   */
  private async handleWebhookFailure(
    event: WebhookEvent,
    error: any,
    durationMs: number
  ): Promise<void> {
    const newRetryCount = event.retryCount + 1;

    // Record failed attempt
    await this.recordRetryAttempt(event.id!, newRetryCount, {
      httpStatus: error.response?.status,
      responseBody: error.response?.data,
      responseHeaders: error.response?.headers,
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorDetails: {
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        }
      },
      durationMs
    });

    if (newRetryCount >= event.maxRetries) {
      // Move to dead letter queue
      await this.updateEventStatus(event.id!, WebhookStatus.DEAD_LETTER, {
        failedAt: new Date(),
        errorMessage: `Max retries (${event.maxRetries}) exceeded: ${error.message}`,
        errorDetails: error.response?.data || error.message,
        retryCount: newRetryCount
      });

      this.logger.error(`💀 Webhook moved to dead letter: ${event.provider}/${event.eventType} (ID: ${event.id}) - ${error.message}`);

    } else {
      // Schedule retry with exponential backoff
      const nextRetryAt = this.calculateNextRetryTime(newRetryCount);

      await this.updateEventStatus(event.id!, WebhookStatus.FAILED, {
        errorMessage: error.message,
        errorDetails: error.response?.data || error.message,
        retryCount: newRetryCount,
        nextRetryAt
      });

      this.logger.warn(`⚠️ Webhook retry scheduled: ${event.provider}/${event.eventType} (ID: ${event.id}) - Attempt ${newRetryCount}/${event.maxRetries} at ${nextRetryAt.toISOString()}`);
    }
  }

  /**
   * Calculate next retry time with exponential backoff and jitter
   */
  private calculateNextRetryTime(attemptNumber: number): Date {
    const baseDelay = Math.min(
      this.backoffConfig.initialDelay * Math.pow(this.backoffConfig.multiplier, attemptNumber - 1),
      this.backoffConfig.maxDelay
    );

    // Add random jitter to prevent thundering herd
    const jitter = baseDelay * this.backoffConfig.jitter * Math.random();
    const totalDelay = baseDelay + jitter;

    return new Date(Date.now() + totalDelay);
  }

  /**
   * Get webhook stats for monitoring
   */
  async getWebhookStats(
    provider?: WebhookProvider,
    hoursBack: number = 24
  ): Promise<WebhookStats[]> {
    const client = await this.dbPool.connect();

    try {
      const query = `SELECT * FROM get_webhook_stats($1, $2)`;
      const result = await client.query(query, [provider || null, hoursBack]);

      return result.rows.map(row => ({
        provider: row.provider,
        totalEvents: parseInt(row.total_events),
        processedEvents: parseInt(row.processed_events),
        failedEvents: parseInt(row.failed_events),
        deadLetterEvents: parseInt(row.dead_letter_events),
        pendingEvents: parseInt(row.pending_events),
        successRate: parseFloat(row.success_rate) || 0,
        avgRetryCount: parseFloat(row.avg_retry_count) || 0,
        avgProcessingTimeMs: parseFloat(row.avg_processing_time_ms) || 0
      }));

    } finally {
      client.release();
    }
  }

  /**
   * Validate HMAC signature
   */
  private validateHmacSignature(
    provider: WebhookProvider,
    payload: string,
    signatureHeader: string
  ): boolean {
    const secret = this.hmacSecrets[provider];
    if (!secret) return false;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Handle different signature formats by provider
      const providedSignature = signatureHeader.replace(/^sha256=/, '');
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(providedSignature)
      );

    } catch (error) {
      this.logger.error(`HMAC validation error for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Get provider-specific webhook URL
   */
  private getProviderWebhookUrl(provider: WebhookProvider): string | null {
    const baseUrl = this.configService.get('WEBHOOK_BASE_URL', 'http://localhost:3001');

    switch (provider) {
      case WebhookProvider.CONEKTA:
        return `${baseUrl}/api/bff/webhooks/conekta`;
      case WebhookProvider.MIFIEL:
        return `${baseUrl}/api/bff/webhooks/mifiel`;
      case WebhookProvider.METAMAP:
        return `${baseUrl}/api/bff/webhooks/metamap`;
      case WebhookProvider.GNV:
        return `${baseUrl}/api/bff/webhooks/gnv`;
      case WebhookProvider.ODOO:
        return `${baseUrl}/api/bff/webhooks/odoo`;
      default:
        return null;
    }
  }

  // Helper methods
  private async updateEventStatus(
    eventId: number,
    status: WebhookStatus,
    updates: Record<string, any> = {}
  ): Promise<void> {
    const client = await this.dbPool.connect();

    try {
      const setClause = Object.keys(updates).map((key, index) =>
        `${this.camelToSnake(key)} = $${index + 3}`
      ).join(', ');

      const query = `
        UPDATE webhook_events
        SET status = $1, updated_at = NOW()${setClause ? ', ' + setClause : ''}
        WHERE id = $2
      `;

      const values = [status, eventId, ...Object.values(updates)];
      await client.query(query, values);

    } finally {
      client.release();
    }
  }

  private async recordRetryAttempt(
    webhookEventId: number,
    attemptNumber: number,
    details: Record<string, any>
  ): Promise<void> {
    const client = await this.dbPool.connect();

    try {
      const query = `
        INSERT INTO webhook_retry_attempts (
          webhook_event_id, attempt_number, http_status, response_body,
          response_headers, error_type, error_message, error_details,
          duration_ms, backoff_delay_ms, next_retry_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      const values = [
        webhookEventId,
        attemptNumber,
        details.httpStatus || null,
        details.responseBody ? JSON.stringify(details.responseBody) : null,
        details.responseHeaders ? JSON.stringify(details.responseHeaders) : null,
        details.errorType || null,
        details.errorMessage || null,
        details.errorDetails ? JSON.stringify(details.errorDetails) : null,
        details.durationMs || null,
        details.backoffDelayMs || null,
        details.nextRetryAt || null
      ];

      await client.query(query, values);

    } finally {
      client.release();
    }
  }

  private mapRowToWebhookEvent(row: any): WebhookEvent {
    return {
      id: row.id,
      provider: row.provider,
      eventType: row.event_type,
      externalId: row.external_id,
      payload: row.payload,
      status: row.status,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      nextRetryAt: row.next_retry_at,
      priority: row.priority,
      signatureHeader: row.signature_header,
      signatureValid: row.signature_valid,
      errorMessage: row.error_message,
      errorDetails: row.error_details
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Cleanup old dead letter events
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupDeadLetterEvents(): Promise<void> {
    const client = await this.dbPool.connect();

    try {
      const result = await client.query('SELECT cleanup_dead_letter_webhooks(30)');
      const deletedCount = result.rows[0].cleanup_dead_letter_webhooks;

      if (deletedCount > 0) {
        this.logger.log(`🧹 Cleaned up ${deletedCount} old dead letter webhook events`);
      }

    } catch (error) {
      this.logger.error('Error cleaning up dead letter events:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Health check for webhook system
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    stats: WebhookStats[];
    issues: string[];
  }> {
    const stats = await this.getWebhookStats(undefined, 1); // Last hour
    const issues: string[] = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    for (const stat of stats) {
      if (stat.successRate < 90) {
        issues.push(`${stat.provider} success rate is ${stat.successRate}% (< 90%)`);
        overallStatus = 'critical';
      } else if (stat.successRate < 95) {
        issues.push(`${stat.provider} success rate is ${stat.successRate}% (< 95%)`);
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }

      if (stat.avgRetryCount > 2) {
        issues.push(`${stat.provider} average retry count is ${stat.avgRetryCount} (> 2)`);
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }
    }

    return { status: overallStatus, stats, issues };
  }
}