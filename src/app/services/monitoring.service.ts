import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClientService } from './http-client.service';
import { environment } from '../../environments/environment';

export interface MonitoringEvent {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  operation: string;
  message: string;
  metadata?: any;
  stackTrace?: string;
  businessImpact?: 'critical' | 'high' | 'medium' | 'low';
  userId?: string;
  correlationId?: string;
}

export interface MonitoringMetrics {
  totalEvents: number;
  errorRate: number;
  warningRate: number;
  criticalEvents: number;
  serviceHealthScore: number;
  uptime: number;
}

interface MonitoringDispatchOptions {
  notifyExternally?: boolean;
  channels?: Array<'datadog' | 'slack'>;
}

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  private events: MonitoringEvent[] = [];
  private maxEvents = 1000;
  private correlationIdCounter = 1;

  private eventsSubject = new BehaviorSubject<MonitoringEvent[]>([]);
  private metricsSubject = new BehaviorSubject<MonitoringMetrics>(this.calculateMetrics());

  public events$ = this.eventsSubject.asObservable();
  public metrics$ = this.metricsSubject.asObservable();

  constructor(@Optional() private readonly httpClient?: HttpClientService) {
    // Auto-cleanup old events every 5 minutes
    setInterval(() => this.cleanupOldEvents(), 5 * 60 * 1000);
  }

  /**
   * Generate unique correlation ID for request tracking
   */
  generateCorrelationId(): string {
    return `mon-${Date.now()}-${this.correlationIdCounter++}`;
  }

  /**
   * Capture critical errors that impact business operations
   */
  captureError(
    service: string,
    operation: string,
    error: Error | any,
    metadata?: any,
    businessImpact: 'critical' | 'high' | 'medium' | 'low' = 'high',
    options: MonitoringDispatchOptions = {}
  ): string {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      level: 'error',
      service,
      operation,
      message: error?.message || String(error),
      metadata,
      stackTrace: error?.stack,
      businessImpact,
      correlationId: this.generateCorrelationId()
    };

    this.addEvent(event);

    // Send to external monitoring if configured
    if (options.notifyExternally) {
      this.sendToExternalMonitoring(event, options.channels);
    }

    // Log to console in development only
    if (!this.isProduction()) {
      // eslint-disable-next-line no-console
      console.error('[monitoring:error]', {
        service,
        operation,
        message: event.message,
        metadata,
        stack: event.stackTrace,
        businessImpact
      });
    }

    return event.id;
  }

  /**
   * Capture warnings for non-critical issues
   */
  captureWarning(
    service: string,
    operation: string,
    message: string,
    metadata?: any,
    options: MonitoringDispatchOptions = {}
  ): string {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      level: 'warn',
      service,
      operation,
      message,
      metadata,
      businessImpact: 'low',
      correlationId: this.generateCorrelationId()
    };

    this.addEvent(event);

    // Log to console in development only
    if (!this.isProduction()) {
      // eslint-disable-next-line no-console
      console.warn('[monitoring:warn]', {
        service,
        operation,
        message,
        metadata
      });
    }

    if (options.notifyExternally) {
      this.sendToExternalMonitoring(event, options.channels);
    }

    return event.id;
  }

  /**
   * Capture informational events for debugging
   */
  captureInfo(
    service: string,
    operation: string,
    message: string,
    metadata?: any,
    options: MonitoringDispatchOptions = {}
  ): string {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      level: 'info',
      service,
      operation,
      message,
      metadata,
      businessImpact: 'low'
    };

    this.addEvent(event);
    if (options.notifyExternally) {
      this.sendToExternalMonitoring(event, options.channels);
    }
    if (!this.isProduction()) {
      // eslint-disable-next-line no-console
      console.info('[monitoring:info]', {
        service,
        operation,
        message,
        metadata
      });
    }
    return event.id;
  }

  /**
   * Record audit trail event and persist remotely when configured
   */
  auditEvent(
    event: string,
    metadata: Record<string, any> = {},
    options: MonitoringDispatchOptions = {}
  ): string {
    const enrichedMetadata = { event, ...metadata };
    const message = `Audit event ${event}`;
    const eventId = this.captureInfo('audit', event, message, enrichedMetadata, options);

    const endpoint = environment.monitoring?.eventsEndpoint;
    if (this.httpClient && endpoint) {
      this.httpClient
        .post(endpoint, {
          event,
          timestamp: new Date().toISOString(),
          metadata
        }, {
          showLoading: false,
          showError: false
        })
        .subscribe({
          error: error => {
            this.captureWarning('audit', event, 'Failed to persist audit event', {
              error,
              metadata
            });
          }
        });
    }

    return eventId;
  }

  /**
   * Get events filtered by criteria
   */
  getEvents(filter?: {
    level?: MonitoringEvent['level'];
    service?: string;
    businessImpact?: MonitoringEvent['businessImpact'];
    since?: Date;
  }): MonitoringEvent[] {
    let filteredEvents = [...this.events];

    if (filter?.level) {
      filteredEvents = filteredEvents.filter(e => e.level === filter.level);
    }

    if (filter?.service) {
      filteredEvents = filteredEvents.filter(e => e.service === filter.service);
    }

    if (filter?.businessImpact) {
      filteredEvents = filteredEvents.filter(e => e.businessImpact === filter.businessImpact);
    }

    if (filter?.since) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= filter.since!);
    }

    return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get current system metrics
   */
  getMetrics(): MonitoringMetrics {
    return this.calculateMetrics();
  }

  /**
   * Check service health status
   */
  getServiceHealth(service: string): {
    status: 'healthy' | 'degraded' | 'critical';
    errorRate: number;
    lastError?: Date;
    recommendations: string[];
  } {
    const serviceEvents = this.events.filter(e => e.service === service);
    const errors = serviceEvents.filter(e => e.level === 'error');
    const totalEvents = serviceEvents.length;

    const errorRate = totalEvents > 0 ? errors.length / totalEvents : 0;
    const lastError = errors.length > 0 ? errors[0].timestamp : undefined;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    if (errorRate > 0.1) { // >10% error rate
      status = 'critical';
      recommendations.push('High error rate detected - investigate immediately');
    } else if (errorRate > 0.05) { // >5% error rate
      status = 'degraded';
      recommendations.push('Elevated error rate - monitor closely');
    }

    // Check for critical business impact errors
    const criticalErrors = errors.filter(e => e.businessImpact === 'critical');
    if (criticalErrors.length > 0) {
      status = 'critical';
      recommendations.push('Critical business impact errors detected');
    }

    return {
      status,
      errorRate,
      lastError,
      recommendations
    };
  }

  /**
   * Export monitoring data for analysis
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.eventsToCSV();
    }
    return JSON.stringify({
      exportDate: new Date(),
      events: this.events,
      metrics: this.calculateMetrics()
    }, null, 2);
  }

  private addEvent(event: MonitoringEvent): void {
    this.events.unshift(event);

    // Maintain max events limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Update observables
    this.eventsSubject.next([...this.events]);
    this.metricsSubject.next(this.calculateMetrics());
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateMetrics(): MonitoringMetrics {
    const total = this.events.length;
    const errors = this.events.filter(e => e.level === 'error').length;
    const warnings = this.events.filter(e => e.level === 'warn').length;
    const critical = this.events.filter(e => e.businessImpact === 'critical').length;

    const errorRate = total > 0 ? errors / total : 0;
    const warningRate = total > 0 ? warnings / total : 0;

    // Calculate service health score (0-100)
    let healthScore = 100;
    healthScore -= errorRate * 50; // Errors heavily impact score
    healthScore -= warningRate * 20; // Warnings moderately impact score
    healthScore -= critical * 10; // Critical events impact score
    healthScore = Math.max(0, healthScore);

    return {
      totalEvents: total,
      errorRate,
      warningRate,
      criticalEvents: critical,
      serviceHealthScore: healthScore,
      uptime: this.calculateUptime()
    };
  }

  private calculateUptime(): number {
    // Simple uptime calculation - can be enhanced with actual downtime tracking
    const criticalErrors = this.events.filter(e => e.businessImpact === 'critical').length;
    return Math.max(95, 100 - criticalErrors * 2); // Each critical error reduces uptime by 2%
  }

  private cleanupOldEvents(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const originalLength = this.events.length;

    this.events = this.events.filter(event => event.timestamp > oneHourAgo);

    if (this.events.length !== originalLength) {
      this.eventsSubject.next([...this.events]);
      this.metricsSubject.next(this.calculateMetrics());
    }
  }

  private eventsToCSV(): string {
    const headers = ['Timestamp', 'Level', 'Service', 'Operation', 'Message', 'Business Impact'];
    const rows = this.events.map(e => [
      e.timestamp.toISOString(),
      e.level,
      e.service,
      e.operation,
      e.message.replace(/,/g, ';'), // Escape commas
      e.businessImpact || 'low'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private sendToExternalMonitoring(event: MonitoringEvent, channels: Array<'datadog' | 'slack'> = ['datadog']): void {
    if (!this.httpClient) {
      return;
    }

    const config = environment.monitoring ?? {};
    const payload = {
      ...event,
      channels,
      sentAt: new Date().toISOString()
    };

    if (config.eventsEndpoint) {
      this.httpClient.post(config.eventsEndpoint, payload, {
        showLoading: false,
        showError: false
      }).subscribe({
        error: () => undefined
      });
    }
  }

  private isProduction(): boolean {
    return typeof window !== 'undefined' &&
           window.location.hostname !== 'localhost' &&
           !window.location.hostname.includes('dev');
  }
}
