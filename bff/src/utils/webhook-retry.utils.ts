/**
 * Node.js Webhook Retry Utilities with Exponential Backoff
 * 
 * Server-side implementation for reliable webhook processing with:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Dead letter queue
 * - Retry attempt tracking
 */

import { Logger } from '@nestjs/common';
import axios, { AxiosResponse, AxiosError } from 'axios';

export interface WebhookRetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier (2 = double delay each attempt) */
  backoffMultiplier: number;
  /** Add random jitter to prevent thundering herd (0-1) */
  jitter: number;
  /** HTTP status codes that should trigger retries */
  retryableStatusCodes: number[];
  /** Timeout for each request in milliseconds */
  timeoutMs: number;
}

export interface WebhookAttempt {
  attemptNumber: number;
  timestamp: number;
  delayMs?: number;
  error?: string;
  statusCode?: number;
  success: boolean;
}

export interface WebhookJob {
  id: string;
  endpoint: string;
  payload: any;
  headers: Record<string, string>;
  attempts: WebhookAttempt[];
  createdAt: number;
  nextRetryAt?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  config: WebhookRetryConfig;
}

export const DEFAULT_WEBHOOK_CONFIG: WebhookRetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: 0.1,
  retryableStatusCodes: [429, 500, 502, 503, 504, 408, 0], // 0 = network/timeout error
  timeoutMs: 15000
};

export const WEBHOOK_PROVIDER_CONFIGS: Record<string, Partial<WebhookRetryConfig>> = {
  CONEKTA: {
    maxAttempts: 4,
    baseDelayMs: 1500,
    maxDelayMs: 25000,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    timeoutMs: 20000
  },
  MIFIEL: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryableStatusCodes: [429, 500, 502, 503, 504, 408],
    timeoutMs: 25000
  },
  WHATSAPP: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 15000,
    retryableStatusCodes: [429, 500, 502, 503, 504, 408],
    timeoutMs: 15000
  },
  METAMAP: {
    maxAttempts: 3,
    baseDelayMs: 3000,
    maxDelayMs: 30000,
    retryableStatusCodes: [429, 500, 502, 503, 504, 408],
    timeoutMs: 30000
  },
  ODOO: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 20000,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    timeoutMs: 18000
  },
  GNV: {
    maxAttempts: 4,
    baseDelayMs: 1000,
    maxDelayMs: 20000,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    timeoutMs: 15000
  }
};

export class WebhookRetryService {
  private readonly logger = new Logger(WebhookRetryService.name);
  private jobs = new Map<string, WebhookJob>();
  private retryQueues = new Map<string, WebhookJob[]>();
  private deadLetterQueue: WebhookJob[] = [];

  /**
   * Schedule a webhook with retry logic
   */
  async scheduleWebhook(
    endpoint: string,
    payload: any,
    headers: Record<string, string> = {},
    providerConfig: string = 'DEFAULT'
  ): Promise<string> {
    const config = {
      ...DEFAULT_WEBHOOK_CONFIG,
      ...(WEBHOOK_PROVIDER_CONFIGS[providerConfig] || {})
    };

    const job: WebhookJob = {
      id: this.generateJobId(),
      endpoint,
      payload,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Conductores-PWA-Webhook/1.0',
        ...headers
      },
      attempts: [],
      createdAt: Date.now(),
      status: 'pending',
      config
    };

    this.jobs.set(job.id, job);
    this.addToRetryQueue(job);
    
    this.logger.log(`🚀 Webhook scheduled: ${job.id} -> ${endpoint}`);
    
    // Process immediately
    this.processJob(job.id).catch(error => {
      this.logger.error(`Failed to process webhook ${job.id}:`, error);
    });

    return job.id;
  }

  /**
   * Process a specific webhook job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'dead_letter') {
      return;
    }

    job.status = 'processing';
    const attemptNumber = job.attempts.length + 1;
    
    this.logger.log(`🔄 Processing webhook attempt ${attemptNumber}/${job.config.maxAttempts}: ${job.id}`);

    const attempt: WebhookAttempt = {
      attemptNumber,
      timestamp: Date.now(),
      success: false
    };

    try {
      const response: AxiosResponse = await axios.post(job.endpoint, job.payload, {
        headers: job.headers,
        timeout: job.config.timeoutMs,
        validateStatus: (status) => status < 400 // Consider 200-399 as success
      });

      // Success!
      attempt.success = true;
      attempt.statusCode = response.status;
      job.attempts.push(attempt);
      job.status = 'completed';
      
      this.logger.log(`✅ Webhook completed successfully: ${job.id} (${response.status})`);
      
    } catch (error) {
      const axiosError = error as AxiosError;
      attempt.error = axiosError.message;
      attempt.statusCode = axiosError.response?.status || 0;
      job.attempts.push(attempt);

      const shouldRetry = this.shouldRetryError(axiosError, job.config);
      const hasAttemptsLeft = attemptNumber < job.config.maxAttempts;

      if (shouldRetry && hasAttemptsLeft) {
        // Schedule retry
        const delayMs = this.calculateRetryDelay(attemptNumber, job.config);
        attempt.delayMs = delayMs;
        job.nextRetryAt = Date.now() + delayMs;
        job.status = 'pending';
        
        this.logger.warn(`⏳ Webhook retry scheduled: ${job.id} (attempt ${attemptNumber + 1}/${job.config.maxAttempts} in ${delayMs}ms)`);
        
        // Schedule retry
        setTimeout(() => {
          this.processJob(jobId).catch(err => {
            this.logger.error(`Retry failed for webhook ${jobId}:`, err);
          });
        }, delayMs);
        
      } else {
        // Failed permanently
        job.status = 'failed';
        this.moveToDeadLetterQueue(job);
        
        this.logger.error(`❌ Webhook permanently failed: ${job.id} after ${attemptNumber} attempts`);
      }
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateRetryDelay(attemptNumber: number, config: WebhookRetryConfig): number {
    const baseDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);
    const jitterMs = baseDelay * config.jitter * (Math.random() - 0.5);
    return Math.min(baseDelay + jitterMs, config.maxDelayMs);
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetryError(error: AxiosError, config: WebhookRetryConfig): boolean {
    // Network/timeout errors
    if (!error.response || error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      return true;
    }

    const status = error.response.status;
    return config.retryableStatusCodes.includes(status);
  }

  /**
   * Move job to dead letter queue
   */
  private moveToDeadLetterQueue(job: WebhookJob): void {
    job.status = 'dead_letter';
    this.deadLetterQueue.push(job);
    
    // Keep only last 1000 dead letters
    if (this.deadLetterQueue.length > 1000) {
      this.deadLetterQueue = this.deadLetterQueue.slice(-1000);
    }
  }

  /**
   * Add job to retry queue
   */
  private addToRetryQueue(job: WebhookJob): void {
    const queueKey = new URL(job.endpoint).hostname;
    if (!this.retryQueues.has(queueKey)) {
      this.retryQueues.set(queueKey, []);
    }
    this.retryQueues.get(queueKey)!.push(job);
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): WebhookJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get dead letter queue (for monitoring/debugging)
   */
  getDeadLetterQueue(): WebhookJob[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Get retry statistics
   */
  getRetryStatistics(): {
    totalJobs: number;
    pendingJobs: number;
    completedJobs: number;
    failedJobs: number;
    deadLetterJobs: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      deadLetterJobs: this.deadLetterQueue.length
    };
  }

  /**
   * Clear completed jobs older than specified time
   */
  cleanupOldJobs(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - olderThanMs;
    let cleanedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' && job.createdAt < cutoffTime) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    this.logger.log(`🧹 Cleaned up ${cleanedCount} old webhook jobs`);
    return cleanedCount;
  }
}

// Singleton instance for global use
export const webhookRetryService = new WebhookRetryService();