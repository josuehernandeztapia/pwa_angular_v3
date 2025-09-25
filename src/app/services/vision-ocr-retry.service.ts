/**
 * 🔄 Vision OCR Service with Surgical Retry/Backoff
 * Implements exponential backoff and fallback strategies for OCR
 */

import { Injectable } from '@angular/core';
import { Observable, throwError, timer, of } from 'rxjs';
import { retryWhen, mergeMap, finalize, tap, catchError } from 'rxjs/operators';

export interface OCRResult {
  confidence: number;
  fields: Record<string, any>;
  processingTime?: number;
  retryCount?: number;
  fallbackUsed?: boolean;
}

export interface OCRRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  confidenceThreshold: number;
  enableFallback: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VisionOCRRetryService {
  private defaultConfig: OCRRetryConfig = {
    maxRetries: 3,
    baseDelay: 500, // 500ms
    maxDelay: 3000, // 3s max
    confidenceThreshold: 0.7,
    enableFallback: true
  };

  private retryStats = {
    attempts: 0,
    successes: 0,
    fallbacks: 0,
    totalLatency: 0
  };

  constructor() {}

  /**
   * 🩺 SURGICAL OCR with retry/backoff
   */
  ocrWithRetry(
    imageUrl: string,
    documentType: string,
    config: Partial<OCRRetryConfig> = {}
  ): Observable<OCRResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    return this.performOCR(imageUrl, documentType).pipe(
      // Retry with exponential backoff
      retryWhen(errors =>
        errors.pipe(
          tap(() => this.retryStats.attempts++),
          mergeMap((error, retryCount) => {
            if (retryCount >= finalConfig.maxRetries) {
              return throwError(error);
            }

            const delay = Math.min(
              finalConfig.baseDelay * Math.pow(2, retryCount),
              finalConfig.maxDelay
            );

            return timer(delay);
          })
        )
      ),

      // Check confidence and potentially trigger fallback
      mergeMap(result => {
        const processingTime = Date.now() - startTime;

        if (result.confidence >= finalConfig.confidenceThreshold) {
          this.retryStats.successes++;
          return of({
            ...result,
            processingTime,
            retryCount: this.retryStats.attempts
          });
        }

        // Low confidence - trigger fallback if enabled
        if (finalConfig.enableFallback) {
          this.retryStats.fallbacks++;

          return of({
            confidence: 0, // Force manual entry
            fields: {},
            processingTime,
            retryCount: this.retryStats.attempts,
            fallbackUsed: true
          });
        }

        return of(result);
      }),

      // Final fallback for errors
      catchError(error => {
        const processingTime = Date.now() - startTime;

        if (finalConfig.enableFallback) {
          this.retryStats.fallbacks++;
          return of({
            confidence: 0,
            fields: {},
            processingTime,
            retryCount: this.retryStats.attempts,
            fallbackUsed: true
          });
        }

        return throwError(error);
      }),

      finalize(() => {
        this.retryStats.totalLatency += Date.now() - startTime;
      })
    );
  }

  /**
   */
  private performOCR(imageUrl: string, documentType: string): Observable<OCRResult> {
    return new Observable(observer => {
      // Simulate network delay
      const delay = Math.random() * 1000 + 500; // 500-1500ms

      setTimeout(() => {
        // Simulate occasional failures and varying confidence
        const shouldFail = Math.random() < 0.2; // 20% failure rate
        const confidence = shouldFail ? 0 : Math.random() * 0.5 + 0.5; // 0.5-1.0

        if (shouldFail) {
          observer.error(new Error(`OCR service error for ${documentType}`));
          return;
        }

        const result: OCRResult = {
          confidence,
          fields: this.generateMockFields(documentType, confidence)
        };

        observer.next(result);
        observer.complete();
      }, delay);
    });
  }

  private generateMockFields(documentType: string, confidence: number): Record<string, any> {
    if (confidence < 0.3) return {};

    switch (documentType) {
      case 'vin':
        return confidence > 0.7 ?
          { vin: '1HGBH41JXMN109186', year: '2021', make: 'Honda' } :
          { vin: '1HGBH41JXM?109?86' }; // Partial recognition

      case 'odometer':
        return confidence > 0.7 ?
          { kilometers: 45230, unit: 'km' } :
          { kilometers: 452 }; // Partial recognition

      case 'plate':
        return confidence > 0.7 ?
          { plate: 'ABC-123-DEF', state: 'EDOMEX' } :
          { plate: 'A?C-1?3-DEF' };

      default:
        return { extracted: true };
    }
  }

  /**
   * Get retry statistics for monitoring
   */
  getStats(): {
    attempts: number;
    successes: number;
    fallbacks: number;
    successRate: number;
    avgLatency: number;
  } {
    const total = this.retryStats.successes + this.retryStats.fallbacks;
    return {
      attempts: this.retryStats.attempts,
      successes: this.retryStats.successes,
      fallbacks: this.retryStats.fallbacks,
      successRate: total > 0 ? this.retryStats.successes / total : 0,
      avgLatency: this.retryStats.attempts > 0 ? this.retryStats.totalLatency / this.retryStats.attempts : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.retryStats = {
      attempts: 0,
      successes: 0,
      fallbacks: 0,
      totalLatency: 0
    };
  }
}
