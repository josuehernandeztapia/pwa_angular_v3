import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, retry, finalize, tap, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  message: string;
  status: number;
  statusText: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private readonly baseUrl = environment.apiUrl || 'http://localhost:3000/api';
  private readonly maxRetries = 3;
  
  // Connection status
  private connectionSubject = new BehaviorSubject<boolean>(true);
  public isConnected$ = this.connectionSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private loadingService: LoadingService,
    private toast: ToastService
  ) {
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.connectionSubject.next(true);
      this.toast.success('Conexión restaurada');
    });

    window.addEventListener('offline', () => {
      this.connectionSubject.next(false);
      this.toast.error('Sin conexión a internet');
    });
  }

  /**
   * GET request
   */
  get<T>(url: string, options: {
    params?: HttpParams | { [param: string]: string | string[] };
    headers?: HttpHeaders;
    showLoading?: boolean;
    showError?: boolean;
  } = {}): Observable<ApiResponse<T>> {
    const { showLoading = true, showError = true } = options;

    if (showLoading) {
      this.loadingService.setLoading(true, `GET ${url}`);
    }

    const fullUrl = this.buildUrl(url);
    const httpOptions = this.buildHttpOptions(options);

    return this.http.get<ApiResponse<T>>(fullUrl, { ...httpOptions, observe: 'body' as const, responseType: 'json' as const }).pipe(
      retry(this.maxRetries),
      tap(response => this.handleSuccess(response)),
      catchError(error => this.handleError(error, showError)),
      finalize(() => {
        if (showLoading) {
          this.loadingService.setLoading(false, `GET ${url}`);
        }
      })
    );
  }

  /**
   * POST request
   */
  post<T>(url: string, body: any, options: {
    headers?: HttpHeaders;
    showLoading?: boolean;
    showError?: boolean;
    successMessage?: string;
  } = {}): Observable<ApiResponse<T>> {
    const { showLoading = true, showError = true, successMessage } = options;

    if (showLoading) {
      this.loadingService.setLoading(true, `POST ${url}`);
    }

    const fullUrl = this.buildUrl(url);
    const httpOptions = this.buildHttpOptions(options);

    return this.http.post<ApiResponse<T>>(fullUrl, body, { ...httpOptions, observe: 'body' as const, responseType: 'json' as const }).pipe(
      retry(1), // POST requests typically shouldn't be retried as aggressively
      tap(response => {
        this.handleSuccess(response);
        if (successMessage) {
          this.toast.success(successMessage);
        }
      }),
      catchError(error => this.handleError(error, showError)),
      finalize(() => {
        if (showLoading) {
          this.loadingService.setLoading(false, `POST ${url}`);
        }
      })
    );
  }

  /**
   * PUT request
   */
  put<T>(url: string, body: any, options: {
    headers?: HttpHeaders;
    showLoading?: boolean;
    showError?: boolean;
    successMessage?: string;
  } = {}): Observable<ApiResponse<T>> {
    const { showLoading = true, showError = true, successMessage } = options;

    if (showLoading) {
      this.loadingService.setLoading(true, `PUT ${url}`);
    }

    const fullUrl = this.buildUrl(url);
    const httpOptions = this.buildHttpOptions(options);

    return this.http.put<ApiResponse<T>>(fullUrl, body, { ...httpOptions, observe: 'body' as const, responseType: 'json' as const }).pipe(
      tap(response => {
        this.handleSuccess(response);
        if (successMessage) {
          this.toast.success(successMessage);
        }
      }),
      catchError(error => this.handleError(error, showError)),
      finalize(() => {
        if (showLoading) {
          this.loadingService.setLoading(false, `PUT ${url}`);
        }
      })
    );
  }

  /**
   * DELETE request
   */
  delete<T>(url: string, options: {
    headers?: HttpHeaders;
    showLoading?: boolean;
    showError?: boolean;
    successMessage?: string;
  } = {}): Observable<ApiResponse<T>> {
    const { showLoading = true, showError = true, successMessage } = options;

    if (showLoading) {
      this.loadingService.setLoading(true, `DELETE ${url}`);
    }

    const fullUrl = this.buildUrl(url);
    const httpOptions = this.buildHttpOptions(options);

    return this.http.delete<ApiResponse<T>>(fullUrl, { ...httpOptions, observe: 'body' as const, responseType: 'json' as const }).pipe(
      tap(response => {
        this.handleSuccess(response);
        if (successMessage) {
          this.toast.success(successMessage);
        }
      }),
      catchError(error => this.handleError(error, showError)),
      finalize(() => {
        if (showLoading) {
          this.loadingService.setLoading(false, `DELETE ${url}`);
        }
      })
    );
  }

  /**
   * File upload
   */
  uploadFile(url: string, file: File, additionalData?: Record<string, any>): Observable<ApiResponse<any>> {
    this.loadingService.setLoading(true, 'Uploading file');

    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const fullUrl = this.buildUrl(url);
    const headers = this.getAuthHeaders();

    return this.http.post<ApiResponse<any>>(fullUrl, formData, { headers }).pipe(
      tap(response => {
        this.handleSuccess(response);
        this.toast.success('Archivo subido exitosamente');
      }),
      catchError(error => this.handleError(error)),
      finalize(() => this.loadingService.setLoading(false, 'Uploading file'))
    );
  }

  /**
   * Build full URL
   */
  private buildUrl(endpoint: string): string {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Build HTTP options with authentication headers
   */
  private buildHttpOptions(options: { params?: HttpParams | { [param: string]: string | string[] }; headers?: HttpHeaders } = {}): { params?: HttpParams | { [param: string]: string | string[] }; headers?: HttpHeaders } {
    const { params, headers } = options;
    return {
      params,
      headers: this.mergeHeaders(headers)
    };
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Merge custom headers with default headers
   */
  private mergeHeaders(customHeaders?: HttpHeaders): HttpHeaders {
    const defaultHeaders = this.getAuthHeaders();
    
    if (!customHeaders) {
      return defaultHeaders;
    }

    let mergedHeaders = defaultHeaders;
    customHeaders.keys().forEach(key => {
      mergedHeaders = mergedHeaders.set(key, customHeaders.get(key) || '');
    });

    return mergedHeaders;
  }

  /**
   * Handle successful responses
   */
  private handleSuccess<T>(response: ApiResponse<T>): void {
    if (response.success && response.message) {
      try {
        console.log('API Success:', response.message);
      } catch {}
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: HttpErrorResponse, showError: boolean = true): Observable<never> {
    let errorMessage = 'Ha ocurrido un error inesperado';

    // Prefer client-side ErrorEvent messages when present
    if (error.error instanceof ErrorEvent && error.error.message) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 0) {
      // Connectivity issues
      errorMessage = 'No se puede conectar al servidor';
      this.connectionSubject.next(false);
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Solicitud inválida';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          break;
        case 401:
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente';
          this.authService.logout();
          break;
        case 403:
          errorMessage = 'No tienes permisos para realizar esta acción';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado';
          break;
        case 422:
          errorMessage = 'Datos de entrada inválidos';
          if (error.error?.errors) {
            const validationErrors = Object.values(error.error.errors).flat();
            errorMessage = validationErrors.join(', ');
          }
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        case 503:
          errorMessage = 'Servicio no disponible temporalmente';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.statusText}`;
      }
    }

    const apiError: ApiError = {
      message: errorMessage,
      status: error.status,
      statusText: error.statusText,
      url: error.url || undefined
    };


    if (showError) {
      this.toast.error(errorMessage);
    }

    return throwError(() => apiError);
  }

  /**
   * Check if API is available
   */
  checkApiHealth(): Observable<boolean> {
    return this.get<{ status: string }>('health', { 
      showLoading: false, 
      showError: false 
    }).pipe(
      map(response => response.success && response.data?.status === 'ok'),
      catchError(() => {
        this.connectionSubject.next(false);
        return of(false);
      })
    );
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.connectionSubject.value && navigator.onLine;
  }
}

