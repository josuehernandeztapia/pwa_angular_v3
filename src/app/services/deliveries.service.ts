import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { 
  DeliveryOrder,
  DeliveryEventLog,
  DeliveryListRequest,
  DeliveryListResponse,
  DeliveryTransitionRequest,
  DeliveryTransitionResponse,
  ClientDeliveryInfo,
  DeliveryStatus,
  DeliveryEvent,
  Market,
  canTransition,
  getValidTransitions,
  DELIVERY_STATUS_DESCRIPTIONS
} from '../models/deliveries';

declare global {
  interface Window {
    __BFF_BASE__?: string;
  }
}

@Injectable({
  providedIn: 'root'
})
export class DeliveriesService {
  private http = inject(HttpClient);
  private baseUrl = (window as any).__BFF_BASE__ ?? '/api';

  /**
   * List deliveries with hierarchical filtering
   * Supports: Market > Route > Client > Order filtering
   */
  list(request: DeliveryListRequest): Observable<DeliveryListResponse> {
    const params: any = {};
    
    if (request.market) params.market = request.market;
    if (request.routeId) params.routeId = request.routeId;
    if (request.clientId) params.clientId = request.clientId;
    if (request.cursor) params.cursor = request.cursor;
    if (request.limit) params.limit = request.limit.toString();
    if (request.status && request.status.length > 0) {
      params.status = request.status.join(',');
    }

    return this.http.get<DeliveryListResponse>(`${this.baseUrl}/v1/deliveries`, { params })
      .pipe(
        catchError(this.handleError('list deliveries'))
      );
  }

  /**
   * Get detailed delivery information
   */
  get(id: string): Observable<DeliveryOrder> {
    return this.http.get<DeliveryOrder>(`${this.baseUrl}/v1/deliveries/${id}`)
      .pipe(
        catchError(this.handleError('get delivery'))
      );
  }

  /**
   * Get delivery event timeline
   */
  events(id: string): Observable<DeliveryEventLog[]> {
    return this.http.get<DeliveryEventLog[]>(`${this.baseUrl}/v1/deliveries/${id}/events`)
      .pipe(
        catchError(this.handleError('get delivery events'))
      );
  }

  /**
   * Transition delivery to next state (FSM validation)
   */
  transition(id: string, request: DeliveryTransitionRequest): Observable<DeliveryTransitionResponse> {
    return this.http.post<DeliveryTransitionResponse>(`${this.baseUrl}/v1/deliveries/${id}/transition`, request)
      .pipe(
        map(response => {
          // Client-side validation of FSM transition (double-check)
          if (response.success && !response.validationErrors?.length) {
            console.log(`Delivery ${id} transitioned via ${request.event} to ${response.newStatus}`);
          }
          return response;
        }),
        catchError(this.handleError('transition delivery'))
      );
  }

  /**
   * Get simplified delivery tracking for client view
   * Hides operational details, shows only client-friendly status
   */
  getClientTracking(clientId: string): Observable<ClientDeliveryInfo[]> {
    return this.http.get<DeliveryOrder[]>(`${this.baseUrl}/v1/deliveries/client/${clientId}`)
      .pipe(
        map(orders => orders.map(order => this.transformToClientView(order))),
        catchError(this.handleError('get client tracking'))
      );
  }

  /**
   * Create new delivery order (triggered by contract/payment events)
   */
  create(order: Partial<DeliveryOrder>): Observable<DeliveryOrder> {
    return this.http.post<DeliveryOrder>(`${this.baseUrl}/v1/deliveries`, order)
      .pipe(
        catchError(this.handleError('create delivery'))
      );
  }

  /**
   * Get deliveries ready for handover (for scheduling)
   */
  getReadyForHandover(market?: Market): Observable<DeliveryOrder[]> {
    const params: any = { status: 'READY_FOR_HANDOVER' };
    if (market) params.market = market;

    return this.http.get<DeliveryListResponse>(`${this.baseUrl}/v1/deliveries`, { params })
      .pipe(
        map(response => response.items),
        catchError(this.handleError('get ready for handover'))
      );
  }

  /**
   * Get delivery statistics for ops dashboard
   */
  getStats(market?: Market, routeId?: string): Observable<{
    totalOrders: number;
    byStatus: Record<DeliveryStatus, number>;
    averageTransitDays: number;
    onTimeDeliveries: number;
    delayedOrders: DeliveryOrder[];
  }> {
    const params: any = {};
    if (market) params.market = market;
    if (routeId) params.routeId = routeId;

    return this.http.get<any>(`${this.baseUrl}/v1/deliveries/stats`, { params })
      .pipe(
        catchError(this.handleError('get delivery stats'))
      );
  }

  /**
   * Schedule delivery handover with client
   */
  scheduleHandover(deliveryId: string, scheduledDate: string, notes?: string): Observable<{
    success: boolean;
    message: string;
    scheduledDate: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/v1/deliveries/${deliveryId}/schedule`, {
      scheduledDate,
      notes
    })
      .pipe(
        catchError(this.handleError('schedule handover'))
      );
  }

  /**
   * Get available routes for market (for filtering)
   */
  getRoutes(market: Market): Observable<Array<{ id: string; name: string; market: Market }>> {
    return this.http.get<Array<{ id: string; name: string; market: Market }>>(`${this.baseUrl}/v1/routes`, {
      params: { market }
    })
      .pipe(
        catchError(this.handleError('get routes'))
      );
  }

  // Utility methods for FSM validation and business logic
  
  /**
   * Check if transition is valid for current status
   */
  canPerformTransition(currentStatus: DeliveryStatus, event: DeliveryEvent): boolean {
    const validTransitions = getValidTransitions(currentStatus);
    return validTransitions.some(t => t.event === event);
  }

  /**
   * Get available actions for current delivery status
   */
  getAvailableActions(delivery: DeliveryOrder, userRole: 'admin' | 'ops' | 'advisor' | 'client'): Array<{
    event: DeliveryEvent;
    label: string;
    description: string;
    requiresConfirmation: boolean;
  }> {
    const validTransitions = getValidTransitions(delivery.status);
    
    return validTransitions
      .filter(transition => {
        // Filter by user role
        if (!transition.requiredRole) return true;
        return transition.requiredRole.includes(userRole);
      })
      .map(transition => ({
        event: transition.event,
        label: this.getActionLabel(transition.event),
        description: this.getActionDescription(transition.event),
        requiresConfirmation: this.requiresConfirmation(transition.event)
      }));
  }

  /**
   * Transform delivery order to client-friendly view
   * Hides operational complexity, shows simple status
   */
  private transformToClientView(order: DeliveryOrder): ClientDeliveryInfo {
    const statusDesc = DELIVERY_STATUS_DESCRIPTIONS[order.status];
    
    return {
      orderId: order.id,
      status: statusDesc.clientFriendly as any,
      estimatedDate: this.formatClientDate(order.eta),
      message: this.getClientMessage(order.status, order.eta),
      canScheduleHandover: order.status === 'READY_FOR_HANDOVER',
      isDelivered: order.status === 'DELIVERED'
    };
  }

  /**
   * Format date for client display (user-friendly)
   */
  private formatClientDate(eta?: string): string {
    if (!eta) return 'Fecha por confirmar';
    
    const date = new Date(eta);
    const formatter = new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long'
    });
    
    return `${formatter.format(date)} (aproximadamente)`;
  }

  /**
   * Get client-friendly message based on status
   */
  private getClientMessage(status: DeliveryStatus, eta?: string): string {
    switch (status) {
      case 'PO_ISSUED':
      case 'IN_PRODUCTION':
      case 'READY_AT_FACTORY':
        return 'Tu vagoneta se está fabricando. Te notificaremos cuando esté lista.';
      
      case 'AT_ORIGIN_PORT':
      case 'ON_VESSEL':
      case 'AT_DEST_PORT':
      case 'IN_CUSTOMS':
      case 'RELEASED':
        return `Tu vagoneta está en camino. Llegará ${this.formatClientDate(eta)}.`;
      
      case 'AT_WH':
      case 'READY_FOR_HANDOVER':
        return 'Tu vagoneta está lista. Te contactaremos para coordinar la entrega.';
      
      case 'DELIVERED':
        return '¡Tu vagoneta ha sido entregada exitosamente!';
      
      default:
        return 'Procesando tu pedido...';
    }
  }

  /**
   * Get human-readable label for action
   */
  private getActionLabel(event: DeliveryEvent): string {
    const labels: Record<DeliveryEvent, string> = {
      ISSUE_PO: 'Emitir Orden',
      START_PROD: 'Iniciar Producción',
      FACTORY_READY: 'Marcar Lista en Fábrica',
      LOAD_ORIGIN: 'Cargar en Puerto',
      DEPART_VESSEL: 'Confirmar Zarpe',
      ARRIVE_DEST: 'Confirmar Arribo',
      CUSTOMS_CLEAR: 'Iniciar Proceso Aduanal',
      RELEASE: 'Confirmar Liberación',
      ARRIVE_WH: 'Confirmar Llegada a Bodega',
      SCHEDULE_HANDOVER: 'Agendar Entrega',
      CONFIRM_DELIVERY: 'Confirmar Entrega'
    };
    return labels[event] || event;
  }

  /**
   * Get description for action
   */
  private getActionDescription(event: DeliveryEvent): string {
    const descriptions: Record<DeliveryEvent, string> = {
      ISSUE_PO: 'Enviar orden de compra a proveedor',
      START_PROD: 'Comenzar proceso de fabricación',
      FACTORY_READY: 'Producción completada exitosamente',
      LOAD_ORIGIN: 'Cargar en contenedor para embarque',
      DEPART_VESSEL: 'Embarcación inició tránsito marítimo',
      ARRIVE_DEST: 'Arribó al puerto de destino',
      CUSTOMS_CLEAR: 'Iniciar trámites de liberación aduanal',
      RELEASE: 'Completar liberación de aduanas',
      ARRIVE_WH: 'Confirmar llegada a bodega local',
      SCHEDULE_HANDOVER: 'Coordinar entrega con cliente',
      CONFIRM_DELIVERY: 'Cliente recibió su vagoneta'
    };
    return descriptions[event] || '';
  }

  /**
   * Check if action requires confirmation dialog
   */
  private requiresConfirmation(event: DeliveryEvent): boolean {
    const criticalEvents: DeliveryEvent[] = [
      'ISSUE_PO', 
      'CONFIRM_DELIVERY',
      'SCHEDULE_HANDOVER'
    ];
    return criticalEvents.includes(event);
  }

  /**
   * Generic error handler for all delivery service calls
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`DeliveriesService.${operation} failed:`, error);
      
      // Transform HTTP errors into user-friendly messages
      let userMessage = 'Error en el servicio de entregas';
      
      if (error.status === 404) {
        userMessage = 'Pedido no encontrado';
      } else if (error.status === 403) {
        userMessage = 'No tienes permisos para esta acción';
      } else if (error.status === 400) {
        userMessage = error.error?.message || 'Solicitud inválida';
      } else if (error.status === 409) {
        userMessage = 'Transición de estado no válida';
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
   * Utility method to check if user can perform action
   */
  canUserPerformAction(userRole: 'admin' | 'ops' | 'advisor' | 'client', event: DeliveryEvent): boolean {
    // Admin and ops can perform any action
    if (userRole === 'admin' || userRole === 'ops') return true;
    
    // Advisors can only schedule handovers and confirm deliveries
    if (userRole === 'advisor') {
      return ['SCHEDULE_HANDOVER', 'CONFIRM_DELIVERY'].includes(event);
    }
    
    // Clients can only confirm delivery
    if (userRole === 'client') {
      return event === 'CONFIRM_DELIVERY';
    }
    
    return false;
  }

  /**
   * Get status color for UI components
   */
  getStatusColor(status: DeliveryStatus): string {
    return DELIVERY_STATUS_DESCRIPTIONS[status]?.color || '#6b7280';
  }

  /**
   * Get status icon for UI components
   */
  getStatusIcon(status: DeliveryStatus): string {
    return DELIVERY_STATUS_DESCRIPTIONS[status]?.icon || '📦';
  }

  /**
   * Calculate delivery progress percentage (0-100)
   */
  getDeliveryProgress(status: DeliveryStatus): number {
    const statusOrder: DeliveryStatus[] = [
      'PO_ISSUED', 'IN_PRODUCTION', 'READY_AT_FACTORY',
      'AT_ORIGIN_PORT', 'ON_VESSEL', 'AT_DEST_PORT',
      'IN_CUSTOMS', 'RELEASED', 'AT_WH',
      'READY_FOR_HANDOVER', 'DELIVERED'
    ];
    
    const currentIndex = statusOrder.indexOf(status);
    if (currentIndex === -1) return 0;
    
    return Math.round((currentIndex / (statusOrder.length - 1)) * 100);
  }
}