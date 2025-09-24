/**
 * Webhook Retry Utilities with Exponential Backoff
 * 
 * Provides robust retry logic for webhook operations with:
 * - Exponential backoff with jitter
 * - Configurable retry strategies
 * - Circuit breaker pattern
 * - Dead letter queue simulation
 */

import { Observable, timer, throwError } from 'rxjs';
import { mergeMap, retryWhen, tap, take, concat } from 'rxjs/operators';

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
  /** Enable circuit breaker */
  enableCircuitBreaker: boolean;
  /** HTTP status codes that should trigger retries */
  retryableStatusCodes: number[];
}

export interface WebhookRetryState {
  attemptNumber: number;
  delayMs: number;
  totalElapsedMs: number;
  error?: any;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

export const DEFAULT_WEBHOOK_RETRY_CONFIG: WebhookRetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,        // Start with 1 second
  maxDelayMs: 30000,        // Cap at 30 seconds
  backoffMultiplier: 2,     // Double the delay each time
  jitter: 0.1,              // 10% random jitter
  enableCircuitBreaker: true,
  retryableStatusCodes: [429, 500, 502, 503, 504, 408, 0] // 0 = network error
};

export class WebhookRetryService {
  private circuitBreakerStates = new Map<string, CircuitBreakerState>();
  private failureThreshold = 5;
  private recoveryTimeout = 60000; // 60 seconds

  /**
   * Apply exponential backoff retry logic to an Observable
   */
  static withExponentialBackoff<T>(
    source: Observable<T>,
    config: Partial<WebhookRetryConfig> = {}
  ): Observable<T> {
    const finalConfig = { ...DEFAULT_WEBHOOK_RETRY_CONFIG, ...config };
    let attemptNumber = 0;
    const startTime = Date.now();

    return source.pipe(
      retryWhen(errors => 
        errors.pipe(
          mergeMap(error => {
            attemptNumber++;
            const elapsedTime = Date.now() - startTime;

            // Check if we should retry this error
            if (!WebhookRetryService.shouldRetryError(error, finalConfig)) {
            console.error('[WebhookRetry] Non-retryable error encountered', error);
            return throwError(() => error);
            }

            // Check max attempts
            if (attemptNumber > finalConfig.maxAttempts) {
              console.error('[WebhookRetry] Max retry attempts exceeded', {
                attempts: attemptNumber - 1,
                error: error?.message || 'Unknown error'
              });
              return throwError(() => new Error(`Max retry attempts exceeded after ${attemptNumber - 1} attempts`));
            }

            // Calculate delay with exponential backoff and jitter
            const baseDelay = finalConfig.baseDelayMs * Math.pow(finalConfig.backoffMultiplier, attemptNumber - 1);
            const jitterMs = baseDelay * finalConfig.jitter * (Math.random() - 0.5);
            const delayMs = Math.min(baseDelay + jitterMs, finalConfig.maxDelayMs);

            const retryState: WebhookRetryState = {
              attemptNumber,
              delayMs,
              totalElapsedMs: elapsedTime,
              error
            };

            console.warn('[WebhookRetry] Scheduling retry', {
              attempt: attemptNumber,
              delay: `${delayMs.toFixed(0)}ms`,
              elapsed: `${elapsedTime}ms`,
              error: error.message || error.status
            });

            // Emit retry state for monitoring
            WebhookRetryService.emitRetryEvent(retryState);

            return timer(delayMs);
          }),
          take(finalConfig.maxAttempts)
        )
      )
    );
  }

  /**
   * Determine if an error should trigger a retry
   */
  private static shouldRetryError(error: any, config: WebhookRetryConfig): boolean {
    // Network errors
    if (!error.status || error.status === 0) return true;
    
    // Check retryable status codes
    if (error.status && config.retryableStatusCodes.includes(error.status)) return true;
    
    // Client errors (4xx) should generally not be retried, except for specific codes
    if (error.status >= 400 && error.status < 500) {
      return config.retryableStatusCodes.includes(error.status);
    }
    
    // Server errors (5xx) should be retried
    if (error.status >= 500) return true;
    
    return false;
  }

  /**
   * Emit retry events for monitoring/logging
   */
  private static emitRetryEvent(state: WebhookRetryState): void {
    // Could be enhanced to emit to external monitoring service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'webhook_retry', {
        attempt_number: state.attemptNumber,
        delay_ms: state.delayMs,
        total_elapsed_ms: state.totalElapsedMs
      });
    }
  }

  /**
   * Circuit breaker implementation for webhook endpoints
   */
  checkCircuitBreaker(endpointId: string): boolean {
    if (!this.circuitBreakerStates.has(endpointId)) {
      this.circuitBreakerStates.set(endpointId, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      });
    }

    const state = this.circuitBreakerStates.get(endpointId)!;
    const now = Date.now();

    switch (state.state) {
      case 'OPEN':
        // Check if recovery timeout has passed
        if (now - state.lastFailureTime > this.recoveryTimeout) {
          state.state = 'HALF_OPEN';
          state.successCount = 0;
        }
        return state.state !== 'OPEN';

      case 'HALF_OPEN':
        // Allow limited requests to test recovery
        return state.successCount < 3;

      case 'CLOSED':
      default:
        return true;
    }
  }

  /**
   * Record webhook success for circuit breaker
   */
  recordSuccess(endpointId: string): void {
    const state = this.circuitBreakerStates.get(endpointId);
    if (!state) return;

    state.successCount++;
    state.failureCount = 0;

    if (state.state === 'HALF_OPEN' && state.successCount >= 3) {
      state.state = 'CLOSED';
    }
  }

  /**
   * Record webhook failure for circuit breaker
   */
  recordFailure(endpointId: string): void {
    const state = this.circuitBreakerStates.get(endpointId);
    if (!state) return;

    state.failureCount++;
    state.lastFailureTime = Date.now();
    state.successCount = 0;

    if (state.state === 'CLOSED' && state.failureCount >= this.failureThreshold) {
      state.state = 'OPEN';
    } else if (state.state === 'HALF_OPEN') {
      state.state = 'OPEN';
    }
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState(endpointId: string): CircuitBreakerState | null {
    return this.circuitBreakerStates.get(endpointId) || null;
  }

  /**
   * Reset circuit breaker state (for testing/admin purposes)
   */
  resetCircuitBreaker(endpointId: string): void {
    this.circuitBreakerStates.delete(endpointId);
  }
}

/**
 * Webhook-specific retry configurations for different providers
 */
export const WEBHOOK_PROVIDER_CONFIGS: Record<string, Partial<WebhookRetryConfig>> = {
  ODOO: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 20000,
    retryableStatusCodes: [429, 500, 502, 503, 504]
  },
  MIFIEL: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryableStatusCodes: [429, 500, 502, 503, 504, 408]
  },
  CONEKTA: {
    maxAttempts: 4,
    baseDelayMs: 1500,
    maxDelayMs: 25000,
    retryableStatusCodes: [429, 500, 502, 503, 504]
  },
  METAMAP: {
    maxAttempts: 3,
    baseDelayMs: 3000,
    maxDelayMs: 30000,
    retryableStatusCodes: [429, 500, 502, 503, 504, 408]
  },
  GNV: {
    maxAttempts: 4,
    baseDelayMs: 1000,
    maxDelayMs: 20000,
    retryableStatusCodes: [429, 500, 502, 503, 504]
  },
  WHATSAPP: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 15000,
    retryableStatusCodes: [429, 500, 502, 503, 504, 408]
  }
};

/**
 * Dead letter queue simulation for failed webhooks
 */
export class WebhookDeadLetterQueue {
  private static instance: WebhookDeadLetterQueue;
  private failedWebhooks: Array<{
    id: string;
    endpoint: string;
    payload: any;
    error: any;
    failedAt: number;
    attempts: number;
  }> = [];

  static getInstance(): WebhookDeadLetterQueue {
    if (!WebhookDeadLetterQueue.instance) {
      WebhookDeadLetterQueue.instance = new WebhookDeadLetterQueue();
    }
    return WebhookDeadLetterQueue.instance;
  }

  addFailedWebhook(endpoint: string, payload: any, error: any, attempts: number): void {
    const id = `${endpoint}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.failedWebhooks.push({
      id,
      endpoint,
      payload,
      error: {
        message: error.message || 'Unknown error',
        status: error.status || 0,
        code: error.code || 'UNKNOWN'
      },
      failedAt: Date.now(),
      attempts
    });

    console.warn('[WebhookRetry] Stored failed webhook event', {
      endpoint,
      attempts,
      message: error.message
    });

    // Keep only last 100 failed webhooks
    if (this.failedWebhooks.length > 100) {
      this.failedWebhooks = this.failedWebhooks.slice(-100);
    }
  }

  getFailedWebhooks(): Array<any> {
    return [...this.failedWebhooks];
  }

  clearDeadLetterQueue(): void {
    this.failedWebhooks = [];
  }
}
