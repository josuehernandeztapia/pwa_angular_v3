import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, retry, timeout } from 'rxjs/operators';
import { 
  APIClientConfig, 
  EndpointConfig, 
  MockConfig, 
  AuthConfig,
  APIMetrics,
  SystemHealth,
  AVIQuestionsConfigResponse,
  RiskThresholdsConfigResponse,
  GeographicRiskConfigResponse
} from '../models/avi-api-contracts';

/**
 * Centralized API Configuration Service
 * Manages all external service configurations with fallback modes
 * API-driven architecture for future backend integration
 */
@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  private readonly http = inject(HttpClient);
  
  // Configuration state
  private readonly configSubject = new BehaviorSubject<APIClientConfig | null>(null);
  public readonly config$ = this.configSubject.asObservable();
  
  // Health monitoring
  private readonly healthSubject = new BehaviorSubject<SystemHealth | null>(null);
  public readonly health$ = this.healthSubject.asObservable();
  
  // Metrics collection
  private metrics: APIMetrics[] = [];
  
  // ===== PRIMARY CONFIGURATION =====
  
  private readonly DEFAULT_CONFIG: APIClientConfig = {
    baseUrl: 'https://api.conductores.com', // Production URL (when available)
    timeout: 30000, // 30 seconds
    retries: 3,
    version: 'v1',
    apiKey: undefined // Will be loaded from environment/secure storage
  };
  
  // ===== ENDPOINT DEFINITIONS =====
  
  private readonly ENDPOINTS: { [key: string]: EndpointConfig } = {
    // Voice Analysis Endpoints
    VOICE_ANALYZE: {
      path: '/api/v1/voice/analyze',
      method: 'POST',
      timeout: 45000, // Voice processing needs more time
      retries: 2
    },
    WHISPER_TRANSCRIBE: {
      path: '/api/v1/voice/whisper-transcribe',
      method: 'POST',
      timeout: 60000, // Transcription can be slow
      retries: 1
    },
    AVI_EVALUATE: {
      path: '/api/v1/avi/evaluate-complete',
      method: 'POST',
      timeout: 90000, // Full evaluation takes time
      retries: 1
    },
    
    // Configuration Endpoints
    AVI_QUESTIONS: {
      path: '/api/v1/config/avi-questions',
      method: 'GET',
      timeout: 10000,
      retries: 2
    },
    RISK_THRESHOLDS: {
      path: '/api/v1/config/avi-thresholds',
      method: 'GET',
      timeout: 10000,
      retries: 2
    },
    GEOGRAPHIC_RISK: {
      path: '/api/v1/config/geographic-risk',
      method: 'GET',
      timeout: 10000,
      retries: 2
    },
    
    // System Endpoints
    HEALTH_CHECK: {
      path: '/api/v1/system/health',
      method: 'GET',
      timeout: 5000,
      retries: 1
    },
    SERVER_TIME: {
      path: '/api/v1/system/time',
      method: 'GET',
      timeout: 5000,
      retries: 1
    }
  };
  
  // ===== MOCK CONFIGURATION FOR DEVELOPMENT =====
  
  private readonly MOCK_CONFIG: MockConfig = {
    enabled: true, // Set to false when backend is ready
    delay: 800, // Simulate network latency
    errorRate: 0.05, // 5% error rate for testing
    responses: {
      HEALTH_CHECK: {
        success: true,
        data: {
          status: 'HEALTHY',
          services: {
            'voice-analysis': { status: 'UP', responseTime: 245, lastCheck: new Date().toISOString() },
            'whisper-api': { status: 'UP', responseTime: 1200, lastCheck: new Date().toISOString() },
            'avi-engine': { status: 'UP', responseTime: 890, lastCheck: new Date().toISOString() },
            'geo-service': { status: 'UP', responseTime: 156, lastCheck: new Date().toISOString() }
          },
          version: '1.0.0',
          uptime: 142560
        }
      },
      SERVER_TIME: {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          timezone: 'America/Mexico_City',
          epoch: Date.now()
        }
      },
      AVI_QUESTIONS: {
        success: true,
        data: {
          questions: [], // Will be populated by voice-validation service
          version: '1.0.0',
          lastUpdated: new Date().toISOString()
        }
      }
    }
  };
  
  // ===== AUTHENTICATION CONFIGURATION =====
  
  private readonly AUTH_CONFIG: AuthConfig = {
    type: 'bearer', // or 'api-key' depending on backend implementation
    credentials: {
      token: undefined, // Will be loaded from secure storage
      apiKey: undefined // Alternative authentication method
    },
    refreshUrl: '/api/v1/auth/refresh'
  };
  
  constructor() {
    this.initializeConfig();
    this.startHealthMonitoring();
  }
  
  // ===== INITIALIZATION =====
  
  private initializeConfig(): void {
    // Load configuration from environment or remote config
    const config = this.loadConfigFromEnvironment();
    this.configSubject.next(config);
    
    console.log(`🔧 API Config initialized:`, {
      baseUrl: config.baseUrl,
      mockMode: this.MOCK_CONFIG.enabled,
      endpoints: Object.keys(this.ENDPOINTS).length
    });
  }
  
  private loadConfigFromEnvironment(): APIClientConfig {
    // In production, these would come from environment variables or remote config
    return {
      ...this.DEFAULT_CONFIG,
      baseUrl: this.getEnvironmentVariable('API_BASE_URL', this.DEFAULT_CONFIG.baseUrl),
      apiKey: this.getEnvironmentVariable('API_KEY', undefined),
      timeout: parseInt(this.getEnvironmentVariable('API_TIMEOUT', '30000'), 10)
    };
  }
  
  private getEnvironmentVariable(key: string, defaultValue: any): any {
    // In Angular, environment variables are typically set at build time
    // This would be replaced with actual environment variable access
    return defaultValue;
  }
  
  // ===== PUBLIC API =====
  
  /**
   * Get endpoint configuration
   */
  getEndpoint(name: string): EndpointConfig | null {
    return this.ENDPOINTS[name] || null;
  }
  
  /**
   * Get full URL for endpoint
   */
  getEndpointUrl(name: string): string {
    const config = this.configSubject.value;
    const endpoint = this.ENDPOINTS[name];
    
    if (!config || !endpoint) {
      throw new Error(`Endpoint ${name} not found`);
    }
    
    return `${config.baseUrl}${endpoint.path}`;
  }
  
  /**
   * Check if mock mode is enabled
   */
  isMockMode(): boolean {
    return this.MOCK_CONFIG.enabled;
  }
  
  /**
   * Get mock response for endpoint
   */
  getMockResponse(endpointName: string): any {
    return this.MOCK_CONFIG.responses[endpointName] || null;
  }
  
  /**
   * Make HTTP request with configuration
   */
  request<T>(endpointName: string, data?: any): Observable<T> {
    const endpoint = this.getEndpoint(endpointName);
    if (!endpoint) {
      return throwError(() => new Error(`Endpoint ${endpointName} not configured`));
    }
    
    // Mock mode bypass
    if (this.isMockMode()) {
      return this.getMockRequest<T>(endpointName, data);
    }
    
    // Real HTTP request
    const url = this.getEndpointUrl(endpointName);
    const startTime = performance.now();
    
    let request$: Observable<T>;
    
    switch (endpoint.method) {
      case 'GET':
        request$ = this.http.get<T>(url);
        break;
      case 'POST':
        request$ = this.http.post<T>(url, data);
        break;
      case 'PUT':
        request$ = this.http.put<T>(url, data);
        break;
      case 'DELETE':
        request$ = this.http.delete<T>(url);
        break;
      default:
        return throwError(() => new Error(`Unsupported method: ${endpoint.method}`));
    }
    
    return request$.pipe(
      timeout(endpoint.timeout || this.DEFAULT_CONFIG.timeout),
      retry(endpoint.retries || this.DEFAULT_CONFIG.retries),
      map(response => {
        this.recordMetrics(endpointName, performance.now() - startTime, true, 200);
        return response;
      }),
      catchError(error => {
        this.recordMetrics(endpointName, performance.now() - startTime, false, error.status || 0);
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Get system health status
   */
  getSystemHealth(): Observable<SystemHealth> {
    return this.request<{ success: boolean; data: SystemHealth }>('HEALTH_CHECK')
      .pipe(
        map(response => response.data),
        catchError(() => of({
          status: 'DOWN' as const,
          services: {},
          version: 'unknown',
          uptime: 0
        }))
      );
  }
  
  // ===== CONFIGURATION-SPECIFIC METHODS =====
  
  /**
   * Load AVI questions configuration
   */
  loadAVIQuestions(): Observable<AVIQuestionsConfigResponse> {
    return this.request<AVIQuestionsConfigResponse>('AVI_QUESTIONS');
  }
  
  /**
   * Load risk thresholds configuration
   */
  loadRiskThresholds(): Observable<RiskThresholdsConfigResponse> {
    return this.request<RiskThresholdsConfigResponse>('RISK_THRESHOLDS');
  }
  
  /**
   * Load geographic risk configuration
   */
  loadGeographicRisk(): Observable<GeographicRiskConfigResponse> {
    return this.request<GeographicRiskConfigResponse>('GEOGRAPHIC_RISK');
  }
  
  // ===== MOCK IMPLEMENTATIONS =====
  
  private getMockRequest<T>(endpointName: string, data?: any): Observable<T> {
    const mockResponse = this.getMockResponse(endpointName);
    const delay = this.MOCK_CONFIG.delay + Math.random() * 200; // Add jitter
    
    // Simulate occasional errors
    if (Math.random() < this.MOCK_CONFIG.errorRate) {
      return throwError(() => new Error(`Mock error for ${endpointName}`)).pipe(
        timeout(delay)
      );
    }
    
    console.log(`🎭 Mock response for ${endpointName}:`, mockResponse);
    
    return of(mockResponse as T).pipe(
      timeout(delay),
      map(response => {
        this.recordMetrics(endpointName, delay, true, 200);
        return response;
      })
    );
  }
  
  // ===== HEALTH MONITORING =====
  
  private startHealthMonitoring(): void {
    // Check system health every 30 seconds
    setInterval(() => {
      this.getSystemHealth().subscribe({
        next: (health) => this.healthSubject.next(health),
        error: (error) => {
          console.warn('Health check failed:', error);
          this.healthSubject.next({
            status: 'DOWN',
            services: {},
            version: 'unknown',
            uptime: 0
          });
        }
      });
    }, 30000);
    
    // Initial health check
    this.getSystemHealth().subscribe({
      next: (health) => this.healthSubject.next(health),
      error: () => {} // Ignore initial errors
    });
  }
  
  // ===== METRICS COLLECTION =====
  
  private recordMetrics(endpoint: string, responseTime: number, success: boolean, status: number): void {
    const metric: APIMetrics = {
      endpoint,
      responseTime,
      status,
      success,
      timestamp: new Date().toISOString(),
      retryCount: 0 // Would be tracked in real implementation
    };
    
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }
  
  /**
   * Get API metrics for monitoring
   */
  getMetrics(): APIMetrics[] {
    return [...this.metrics];
  }
  
  /**
   * Get average response time for endpoint
   */
  getAverageResponseTime(endpoint?: string): number {
    const filteredMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    return filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / filteredMetrics.length;
  }
  
  /**
   * Get success rate for endpoint
   */
  getSuccessRate(endpoint?: string): number {
    const filteredMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 1;
    
    const successCount = filteredMetrics.filter(m => m.success).length;
    return successCount / filteredMetrics.length;
  }
  
  // ===== CONFIGURATION UPDATES =====
  
  /**
   * Update API configuration (for dynamic reconfiguration)
   */
  updateConfig(newConfig: Partial<APIClientConfig>): void {
    const currentConfig = this.configSubject.value || this.DEFAULT_CONFIG;
    const updatedConfig = { ...currentConfig, ...newConfig };
    
    this.configSubject.next(updatedConfig);
    
    console.log(`🔧 API Config updated:`, updatedConfig);
  }
  
  /**
   * Toggle mock mode
   */
  toggleMockMode(enabled: boolean): void {
    this.MOCK_CONFIG.enabled = enabled;
    console.log(`🎭 Mock mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Add or update mock response
   */
  setMockResponse(endpointName: string, response: any): void {
    this.MOCK_CONFIG.responses[endpointName] = response;
    console.log(`🎭 Mock response updated for ${endpointName}`);
  }
}