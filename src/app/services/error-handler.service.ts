import { Injectable, ErrorHandler } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  timestamp: Date;
  details?: any;
  actions?: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  private errorsSubject = new BehaviorSubject<AppError[]>([]);
  public errors$: Observable<AppError[]> = this.errorsSubject.asObservable();

  constructor() {}

  /**
   * Global error handler implementation
   */
  handleError(error: any): void {

    let errorMessage = 'An unexpected error occurred';
    let errorType: AppError['type'] = 'error';

    if (error instanceof HttpErrorResponse) {
      errorMessage = this.getHttpErrorMessage(error);
    } else if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Create error object
    const appError: AppError = {
      id: this.generateErrorId(),
      message: errorMessage,
      type: errorType,
      timestamp: new Date(),
      details: error,
      actions: this.getErrorActions(error)
    };

    // Add to errors list
    this.addError(appError);

    // Log to external service in production
    this.logToExternalService(appError);
  }

  /**
   * Add error to the error list
   */
  addError(error: AppError): void {
    const currentErrors = this.errorsSubject.value;
    this.errorsSubject.next([...currentErrors, error]);

    // Auto-remove error after 10 seconds for non-critical errors
    if (error.type !== 'error') {
      setTimeout(() => {
        this.removeError(error.id);
      }, 10000);
    }
  }

  /**
   * Remove specific error
   */
  removeError(errorId: string): void {
    const currentErrors = this.errorsSubject.value;
    const filteredErrors = currentErrors.filter(error => error.id !== errorId);
    this.errorsSubject.next(filteredErrors);
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    this.errorsSubject.next([]);
  }

  /**
   * Show success message
   */
  showSuccess(message: string, duration: number = 5000): void {
    const successError: AppError = {
      id: this.generateErrorId(),
      message,
      type: 'success',
      timestamp: new Date()
    };

    this.addError(successError);

    setTimeout(() => {
      this.removeError(successError.id);
    }, duration);
  }

  /**
   * Show info message
   */
  showInfo(message: string, duration: number = 7000): void {
    const infoError: AppError = {
      id: this.generateErrorId(),
      message,
      type: 'info',
      timestamp: new Date()
    };

    this.addError(infoError);

    setTimeout(() => {
      this.removeError(infoError.id);
    }, duration);
  }

  /**
   * Show warning message
   */
  showWarning(message: string, actions?: ErrorAction[]): void {
    const warningError: AppError = {
      id: this.generateErrorId(),
      message,
      type: 'warning',
      timestamp: new Date(),
      actions
    };

    this.addError(warningError);
  }

  /**
   * Handle HTTP errors specifically
   */
  handleHttpError(error: HttpErrorResponse): AppError {
    const errorMessage = this.getHttpErrorMessage(error);
    
    const appError: AppError = {
      id: this.generateErrorId(),
      message: errorMessage,
      type: 'error',
      timestamp: new Date(),
      details: {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        error: error.error
      },
      actions: this.getHttpErrorActions(error)
    };

    this.addError(appError);
    return appError;
  }

  /**
   * Handle business logic errors
   */
  handleBusinessError(message: string, details?: any, actions?: ErrorAction[]): AppError {
    const businessError: AppError = {
      id: this.generateErrorId(),
      message,
      type: 'warning',
      timestamp: new Date(),
      details,
      actions
    };

    this.addError(businessError);
    return businessError;
  }

  /**
   * Handle validation errors
   */
  handleValidationError(message: string, fieldErrors?: Record<string, string[]>): AppError {
    const validationError: AppError = {
      id: this.generateErrorId(),
      message,
      type: 'warning',
      timestamp: new Date(),
      details: { fieldErrors }
    };

    this.addError(validationError);
    return validationError;
  }

  // Private helper methods

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getHttpErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'No se puede conectar al servidor. Verifica tu conexión a internet.';
      case 400:
        return error.error?.message || 'Datos inválidos enviados al servidor.';
      case 401:
        return 'Sesión expirada. Por favor inicia sesión nuevamente.';
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      case 404:
        return 'El recurso solicitado no fue encontrado.';
      case 409:
        return 'Conflicto con el estado actual del recurso.';
      case 422:
        return error.error?.message || 'Los datos enviados no son válidos.';
      case 429:
        return 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.';
      case 500:
        return 'Error interno del servidor. Intenta nuevamente más tarde.';
      case 502:
        return 'El servidor no está disponible temporalmente.';
      case 503:
        return 'Servicio no disponible. El servidor está en mantenimiento.';
      case 504:
        return 'Tiempo de espera agotado. El servidor tardó demasiado en responder.';
      default:
        return error.error?.message || `Error del servidor (${error.status}). Intenta nuevamente.`;
    }
  }

  private getErrorActions(error: any): ErrorAction[] | undefined {
    if (error instanceof HttpErrorResponse) {
      return this.getHttpErrorActions(error);
    }
    
    return [{
      label: 'Reintentar',
      action: () => {
        window.location.reload();
      },
      style: 'primary'
    }];
  }

  private getHttpErrorActions(error: HttpErrorResponse): ErrorAction[] {
    const actions: ErrorAction[] = [];

    switch (error.status) {
      case 0:
        actions.push({
          label: 'Reintentar',
          action: () => window.location.reload(),
          style: 'primary'
        });
        break;
        
      case 401:
        actions.push({
          label: 'Iniciar Sesión',
          action: () => {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          },
          style: 'primary'
        });
        break;
        
      case 403:
        actions.push({
          label: 'Contactar Soporte',
          action: () => {
            window.open('mailto:soporte@conductores.com', '_blank');
          },
          style: 'secondary'
        });
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        actions.push({
          label: 'Reintentar',
          action: () => window.location.reload(),
          style: 'primary'
        }, {
          label: 'Reportar Problema',
          action: () => {
            window.open('mailto:soporte@conductores.com?subject=Error del Servidor', '_blank');
          },
          style: 'secondary'
        });
        break;
    }

    return actions;
  }

  private logToExternalService(error: AppError): void {
    // In production, send errors to external logging service
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      
      // Example: Send to logging service
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     level: error.type,
      //     message: error.message,
      //     details: error.details,
      //     timestamp: error.timestamp,
      //     userAgent: navigator.userAgent,
      //     url: window.location.href
      //   })
      // }).catch(console.error);
    }
  }
}
