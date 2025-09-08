import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  HealthTriggerEvent,
  ProtectionApplicationRequest,
  ProtectionApplicationResponse,
  ProtectionApprovalRequest,
  ProtectionDenialRequest,
  ProtectionPlan,
  ProtectionScenario,
  ProtectionSelectRequest,
  ProtectionSignRequest,
  ProtectionSimulateRequest,
  ProtectionSimulateResponse,
  ProtectionState,
  canTransition
} from '../models/protection';

declare global {
  interface Window {
    __BFF_BASE__?: string;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ProtectionService {
  private http = inject(HttpClient);
  private baseUrl = (window as any).__BFF_BASE__ ?? '/api';

  /**
   * Get protection plan for a contract
   */
  getPlan(contractId: string): Observable<ProtectionPlan> {
    return this.http.get<ProtectionPlan>(`${this.baseUrl}/v1/protection/plan/${contractId}`)
      .pipe(
        catchError(this.handleError('getPlan'))
      );
  }

  /**
   * Simulate protection scenarios for current situation
   */
  simulate(request: ProtectionSimulateRequest): Observable<ProtectionSimulateResponse> {
    return this.http.post<ProtectionSimulateResponse>(`${this.baseUrl}/v1/protection/simulate`, request)
      .pipe(
        catchError(this.handleError('simulate'))
      );
  }

  /**
   * Select a protection scenario (moves to PENDING_APPROVAL)
   */
  select(request: ProtectionSelectRequest): Observable<{ success: boolean; newState: ProtectionState }> {
    return this.http.post<{ success: boolean; newState: ProtectionState }>(`${this.baseUrl}/v1/protection/select`, request)
      .pipe(
        map(response => {
          // Validate state transition
          if (!canTransition('ELIGIBLE', response.newState, 'select_scenario')) {
            throw new Error(`Invalid state transition: ELIGIBLE -> ${response.newState}`);
          }
          return response;
        }),
        catchError(this.handleError('select'))
      );
  }

  /**
   * Approve protection request (admin action)
   */
  approve(request: ProtectionApprovalRequest): Observable<{ success: boolean; newState: ProtectionState }> {
    return this.http.post<{ success: boolean; newState: ProtectionState }>(`${this.baseUrl}/v1/protection/approve`, request)
      .pipe(
        map(response => {
          if (!canTransition('PENDING_APPROVAL', response.newState, 'approve')) {
            throw new Error(`Invalid state transition: PENDING_APPROVAL -> ${response.newState}`);
          }
          return response;
        }),
        catchError(this.handleError('approve'))
      );
  }

  /**
   * Deny protection request (admin action)
   */
  deny(request: ProtectionDenialRequest): Observable<{ success: boolean; newState: ProtectionState }> {
    return this.http.post<{ success: boolean; newState: ProtectionState }>(`${this.baseUrl}/v1/protection/deny`, request)
      .pipe(
        map(response => {
          if (!canTransition('PENDING_APPROVAL', response.newState, 'deny')) {
            throw new Error(`Invalid state transition: PENDING_APPROVAL -> ${response.newState}`);
          }
          return response;
        }),
        catchError(this.handleError('deny'))
      );
  }

  /**
   * Sign protection document (Mifiel integration)
   */
  sign(request: ProtectionSignRequest): Observable<{ success: boolean; newState: ProtectionState }> {
    return this.http.post<{ success: boolean; newState: ProtectionState }>(`${this.baseUrl}/v1/protection/sign`, request)
      .pipe(
        map(response => {
          if (!canTransition('READY_TO_SIGN', response.newState, 'sign_document')) {
            throw new Error(`Invalid state transition: READY_TO_SIGN -> ${response.newState}`);
          }
          return response;
        }),
        catchError(this.handleError('sign'))
      );
  }

  /**
   * Apply protection changes (core integration: Odoo + NEON)
   */
  apply(request: ProtectionApplicationRequest): Observable<ProtectionApplicationResponse> {
    return this.http.post<ProtectionApplicationResponse>(`${this.baseUrl}/v1/protection/apply`, request)
      .pipe(
        catchError(this.handleError('apply'))
      );
  }

  /**
   * Expire protection window
   */
  expire(contractId: string): Observable<{ success: boolean; newState: ProtectionState }> {
    return this.http.post<{ success: boolean; newState: ProtectionState }>(`${this.baseUrl}/v1/protection/expire`, { contractId })
      .pipe(
        catchError(this.handleError('expire'))
      );
  }

  /**
   * Trigger health-based protection eligibility
   */
  triggerHealthEvent(event: HealthTriggerEvent): Observable<{ 
    triggered: boolean; 
    contractId: string; 
    newState?: ProtectionState;
    reason: string;
  }> {
    return this.http.post<{
      triggered: boolean;
      contractId: string;
      newState?: ProtectionState;
      reason: string;
    }>(`${this.baseUrl}/v1/health/events`, event)
      .pipe(
        catchError(this.handleError('triggerHealthEvent'))
      );
  }

  /**
   * Get protection usage history for contract
   */
  getUsageHistory(contractId: string): Observable<Array<{
    type: string;
    appliedAt: string;
    duration: number;
    paymentChange: number;
    status: 'completed' | 'active' | 'cancelled';
  }>> {
    return this.http.get<Array<{
      type: string;
      appliedAt: string;
      duration: number;
      paymentChange: number;
      status: 'completed' | 'active' | 'cancelled';
    }>>(`${this.baseUrl}/v1/protection/history/${contractId}`)
      .pipe(
        catchError(this.handleError('getUsageHistory'))
      );
  }

  /**
   * Get protection policy limits for contract type
   */
  getPolicyLimits(contractType: string, market: string): Observable<{
    difMax: number;
    extendMax: number;
    stepDownMaxPct: number;
    irrMin: number;
    mMin: number;
    annual: {
      maxRestructures: number;
      resetDate: string;
    };
  }> {
    return this.http.get<{
      difMax: number;
      extendMax: number;
      stepDownMaxPct: number;
      irrMin: number;
      mMin: number;
      annual: {
        maxRestructures: number;
        resetDate: string;
      };
    }>(`${this.baseUrl}/v1/protection/policy/${contractType}/${market}`)
      .pipe(
        catchError(this.handleError('getPolicyLimits'))
      );
  }

  /**
   * Check if client is eligible for protection right now
   */
  checkEligibility(contractId: string): Observable<{
    isEligible: boolean;
    reasons: string[];
    nextEligibilityDate?: string;
    usageRemaining: {
      defer: number;
      stepdown: number;
      recalendar: number;
      collective: number;
    };
    healthScore?: number;
    riskFactors?: string[];
  }> {
    return this.http.get<{
      isEligible: boolean;
      reasons: string[];
      nextEligibilityDate?: string;
      usageRemaining: {
        defer: number;
        stepdown: number;
        recalendar: number;
        collective: number;
      };
      healthScore?: number;
      riskFactors?: string[];
    }>(`${this.baseUrl}/v1/protection/eligibility/${contractId}`)
      .pipe(
        catchError(this.handleError('checkEligibility'))
      );
  }

  /**
   * Get Mifiel signing URL for protection document
   */
  getMifielSigningUrl(contractId: string, scenarioType: string): Observable<{
    signingUrl: string;
    sessionId: string;
    documentId: string;
    expiresAt: string;
  }> {
    return this.http.post<{
      signingUrl: string;
      sessionId: string;
      documentId: string;
      expiresAt: string;
    }>(`${this.baseUrl}/v1/protection/mifiel/create`, {
      contractId,
      scenarioType
    })
      .pipe(
        catchError(this.handleError('getMifielSigningUrl'))
      );
  }

  /**
   * Validate scenario parameters before selection
   */
  validateScenario(contractId: string, scenario: ProtectionScenario): Observable<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
    adjustedScenario?: ProtectionScenario;
  }> {
    return this.http.post<{
      isValid: boolean;
      warnings: string[];
      errors: string[];
      adjustedScenario?: ProtectionScenario;
    }>(`${this.baseUrl}/v1/protection/validate`, {
      contractId,
      scenario
    })
      .pipe(
        catchError(this.handleError('validateScenario'))
      );
  }

  /**
   * Get real-time protection notifications for client
   */
  getNotifications(clientId: string): Observable<Array<{
    id: string;
    type: 'eligible' | 'approved' | 'ready_to_sign' | 'applied' | 'expired';
    contractId: string;
    message: string;
    actionUrl?: string;
    createdAt: string;
    read: boolean;
  }>> {
    return this.http.get<Array<{
      id: string;
      type: 'eligible' | 'approved' | 'ready_to_sign' | 'applied' | 'expired';
      contractId: string;
      message: string;
      actionUrl?: string;
      createdAt: string;
      read: boolean;
    }>>(`${this.baseUrl}/v1/protection/notifications/${clientId}`)
      .pipe(
        catchError(this.handleError('getNotifications'))
      );
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.baseUrl}/v1/protection/notifications/${notificationId}`, {
      read: true
    })
      .pipe(
        catchError(this.handleError('markNotificationRead'))
      );
  }

  /**
   * Generic error handler for all protection service calls
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`ProtectionService.${operation} failed:`, error);
      
      // Transform HTTP errors into user-friendly messages
      let userMessage = 'Error en el servicio de protección';
      
      if (error.status === 404) {
        userMessage = 'Plan de protección no encontrado';
      } else if (error.status === 403) {
        userMessage = 'No tienes permisos para esta acción';
      } else if (error.status === 400) {
        userMessage = error.error?.message || 'Solicitud inválida';
      } else if (error.status === 409) {
        userMessage = 'Estado de protección inconsistente';
      } else if (error.status >= 500) {
        userMessage = 'Error del servidor. Intenta más tarde';
      }

      return throwError(() => ({
        operation,
        originalError: error,
        userMessage,
        timestamp: new Date().toISOString()
      }));
    };
  }

  /**
   * Utility method to check if an action is allowed for current state
   */
  canPerformAction(currentState: ProtectionState, action: string): boolean {
    const validTransitions = {
      'simulate': ['IDLE', 'ELIGIBLE'],
      'select': ['ELIGIBLE'],
      'approve': ['PENDING_APPROVAL'],
      'deny': ['PENDING_APPROVAL'],
      'sign': ['READY_TO_SIGN'],
      'apply': ['SIGNED'],
      'expire': ['ELIGIBLE', 'PENDING_APPROVAL', 'READY_TO_SIGN']
    };

    return validTransitions[action as keyof typeof validTransitions]?.includes(currentState) || false;
  }

  /**
   * Get user-friendly status message for current protection state
   */
  getStatusMessage(plan: ProtectionPlan): { 
    message: string; 
    action?: string; 
    actionLabel?: string;
    urgency: 'low' | 'medium' | 'high';
  } {
    switch (plan.state) {
      case 'IDLE':
        return {
          message: 'Tu protección está disponible si la necesitas',
          urgency: 'low'
        };
      
      case 'ELIGIBLE':
        return {
          message: 'Puedes activar tu protección ahora',
          action: 'simulate',
          actionLabel: 'Ver Opciones',
          urgency: 'high'
        };
      
      case 'PENDING_APPROVAL':
        return {
          message: 'Tu solicitud está en revisión administrativa',
          urgency: 'medium'
        };
      
      case 'READY_TO_SIGN':
        return {
          message: '¡Aprobado! Firma tu documento de protección',
          action: 'sign',
          actionLabel: 'Firmar Ahora',
          urgency: 'high'
        };
      
      case 'SIGNED':
        return {
          message: 'Aplicando cambios a tu contrato...',
          urgency: 'medium'
        };
      
      case 'APPLIED':
        return {
          message: 'Tu protección está activa',
          action: 'view_schedule',
          actionLabel: 'Ver Nuevo Calendario',
          urgency: 'low'
        };
      
      case 'REJECTED':
        return {
          message: 'Tu solicitud fue denegada. Puedes intentar más tarde',
          urgency: 'low'
        };
      
      case 'EXPIRED':
        return {
          message: 'La ventana de protección expiró. Se evaluará nuevamente si es necesario',
          urgency: 'low'
        };
      
      default:
        return {
          message: 'Estado desconocido',
          urgency: 'low'
        };
    }
  }
}