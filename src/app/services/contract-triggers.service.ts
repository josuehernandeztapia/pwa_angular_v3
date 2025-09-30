import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of, switchMap, takeUntil, timer } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';
import { Market as DeliveryMarket, DeliveryOrder } from '../models/deliveries';
import { BusinessFlow, Market } from '../models/types';
import { round2 } from '../utils/math.util';
import { DeliveriesService } from './deliveries.service';

declare global {
  interface Window {
    __BFF_BASE__?: string;
  }
}

/**
 * Sistema de triggers automáticos para creación de órdenes de entrega
 * basado en umbrales de pago del 50% según tipo de contrato
 */

export interface PaymentRecord {
  id: string;
  contractId: string;
  clientId: string;
  amount: number;
  paymentDate: Date;
  paymentType: 'enganche' | 'mensualidad' | 'ahorro' | 'aportacion_adicional';
  reference?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface ContractPaymentSummary {
  contractId: string;
  clientId: string;
  clientName: string;
  market: Market;
  flow: BusinessFlow;
  contractType: string;
  
  // Montos del contrato
  totalAmount: number;
  requiredEnganche: number; // Enganche mínimo requerido según tipo de contrato
  currentPaidAmount: number; // Monto total pagado hasta ahora
  
  // Cálculos de threshold
  thresholdAmount: number; // 50% del enganche requerido
  thresholdReached: boolean;
  thresholdPercentage: number; // Porcentaje actual vs threshold
  
  // Estado del trigger
  deliveryOrderTriggered: boolean;
  triggerDate?: Date;
  deliveryOrderId?: string;
  
  // Historial de pagos
  payments: PaymentRecord[];
  lastPaymentDate?: Date;
}

export interface TandaPredictiveAnalysis {
  tandaId: string;
  groupName: string;
  routeId: string;
  
  // Estado actual
  activeMembersCount: number;
  monthsCollecting: number;
  totalCollected: number;
  averageMonthlyCollection: number;
  
  // Análisis predictivo
  projectedFirstEnganche: number;
  projectedFirstEngancheMonth: number;
  confidenceLevel: number; // 0-1
  
  // Criterios de trigger
  meetsMinimumMembers: boolean; // >= 5 miembros
  meetsMinimumDuration: boolean; // >= 1 mes colectando
  meetsThreshold: boolean; // 50% del primer enganche
  
  // Estado del trigger
  triggerReady: boolean;
  deliveryOrderTriggered: boolean;
  triggerDate?: Date;
  deliveryOrderId?: string;
}

export interface TriggerRule {
  id: string;
  flow: BusinessFlow;
  market: Market;
  description: string;
  triggerLogic: string;
  
  // Configuración específica
  thresholdPercentage: number; // 50% para todos los casos
  minimumAmount?: number;
  additionalCriteria?: {
    minimumMembers?: number; // Para tandas
    minimumDuration?: number; // Para tandas (meses)
    predictiveAnalysis?: boolean; // Para tandas
  };
}

export interface TriggerEvent {
  id: string;
  clientId: string;
  contractId?: string;
  tandaId?: string;
  triggerRuleId: string;
  
  eventType: 'payment_threshold_reached' | 'tanda_prediction_ready';
  triggerDate: Date;
  
  // Datos del trigger
  thresholdAmount: number;
  actualAmount: number;
  triggerPercentage: number;
  
  // Resultado
  deliveryOrderCreated: boolean;
  deliveryOrderId?: string;
  errorMessage?: string;
  
  // Metadatos
  processedBy: 'system' | 'manual';
  notifications: {
    advisorNotified: boolean;
    clientNotified: boolean;
    whatsappSent: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ContractTriggersService {
  private http = inject(HttpClient);
  private deliveriesService = inject(DeliveriesService);
  private baseUrl = (window as any).__BFF_BASE__ ?? '/api';
  
  // Monitoreo en tiempo real
  private monitoringActive = new BehaviorSubject<boolean>(false);
  private stopMonitoring$ = new Subject<void>();
  
  // Caché de reglas de trigger
  private triggerRules: TriggerRule[] = [];
  
  constructor() {
    this.initializeTriggerRules();
    this.startMonitoring();
  }

  /**
   * Inicializar reglas de trigger según especificaciones del usuario
   */
  private initializeTriggerRules(): void {
    this.triggerRules = [
      // VENTA DIRECTA - 50% payment triggers order
      {
        id: 'venta-directa-ags',
        flow: BusinessFlow.VentaDirecta,
        market: 'aguascalientes',
        description: 'Venta Directa AGS: 50% del pago total',
        triggerLogic: 'cuando se pague el 50% del monto total',
        thresholdPercentage: 0.50
      },
      {
        id: 'venta-directa-edomex',
        flow: BusinessFlow.VentaDirecta,
        market: 'edomex',
        description: 'Venta Directa EdoMex: 50% del pago total',
        triggerLogic: 'cuando se pague el 50% del monto total',
        thresholdPercentage: 0.50
      },
      
      // VENTA A PLAZO - 50% of required down payment triggers order
      {
        id: 'venta-plazo-ags',
        flow: BusinessFlow.VentaPlazo,
        market: 'aguascalientes',
        description: 'Venta a Plazo AGS: 50% del enganche requerido (60%)',
        triggerLogic: 'cuando se pague el 50% del enganche (30% del total)',
        thresholdPercentage: 0.50 // 50% del enganche de 60%
      },
      {
        id: 'venta-plazo-edomex',
        flow: BusinessFlow.VentaPlazo,
        market: 'edomex',
        description: 'Venta a Plazo EdoMex: 50% del enganche requerido (20-25%)',
        triggerLogic: 'cuando se pague el 50% del enganche (10-12.5% del total)',
        thresholdPercentage: 0.50 // 50% del enganche de 20-25%
      },
      
      // AHORRO PROGRAMADO - 50% of required down payment triggers order
      {
        id: 'ahorro-ags',
        flow: BusinessFlow.AhorroProgramado,
        market: 'aguascalientes',
        description: 'Ahorro AGS: 50% del enganche requerido',
        triggerLogic: 'cuando ahorro alcance el 50% del enganche requerido',
        thresholdPercentage: 0.50
      },
      {
        id: 'ahorro-edomex',
        flow: BusinessFlow.AhorroProgramado,
        market: 'edomex',
        description: 'Ahorro EdoMex: 50% del enganche requerido',
        triggerLogic: 'cuando ahorro alcance el 50% del enganche requerido',
        thresholdPercentage: 0.50
      },
      
      // TANDAS - Predictive based on savings consumption
      {
        id: 'tandas-edomex',
        flow: BusinessFlow.CreditoColectivo,
        market: 'edomex',
        description: 'Tandas EdoMex: Análisis predictivo + 5 miembros + 1 mes',
        triggerLogic: 'análisis predictivo cuando 5+ miembros colecten por 1+ mes y se proyecte alcanzar 50% del primer enganche',
        thresholdPercentage: 0.50,
        additionalCriteria: {
          minimumMembers: 5,
          minimumDuration: 1, // meses
          predictiveAnalysis: true
        }
      }
    ];
  }

  /**
   * Iniciar monitoreo automático de contratos
   */
  startMonitoring(): void {
    if (this.monitoringActive.value) return;
    
    this.monitoringActive.next(true);
    
    // Monitoreo cada 30 segundos
    timer(0, 30000).pipe(
      filter(() => this.monitoringActive.value),
      switchMap(() => this.processAllTriggers()),
      takeUntil(this.stopMonitoring$),
      catchError((error) => {
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Detener monitoreo automático
   */
  stopMonitoringService(): void {
    this.monitoringActive.next(false);
    this.stopMonitoring$.next();
  }

  /**
   * Procesar todos los triggers pendientes
   */
  processAllTriggers(): Observable<TriggerEvent[]> {
    
    return this.http.get<{
      contractSummaries: ContractPaymentSummary[];
      tandaAnalyses: TandaPredictiveAnalysis[];
    }>(`${this.baseUrl}/v1/triggers/pending-analysis`)
      .pipe(
        switchMap(({ contractSummaries, tandaAnalyses }: { contractSummaries: ContractPaymentSummary[]; tandaAnalyses: TandaPredictiveAnalysis[]; }) => {
          const triggerPromises: Promise<TriggerEvent | null>[] = [];
          
          // Procesar triggers de contratos individuales
          contractSummaries.forEach((summary: ContractPaymentSummary) => {
            if (!summary.deliveryOrderTriggered && summary.thresholdReached) {
              triggerPromises.push(this.processTriggerForContract(summary).toPromise().then(v => v ?? null));
            }
          });
          
          // Procesar triggers de tandas
          tandaAnalyses.forEach((analysis: TandaPredictiveAnalysis) => {
            if (!analysis.deliveryOrderTriggered && analysis.triggerReady) {
              triggerPromises.push(this.processTriggerForTanda(analysis).toPromise().then(v => v ?? null));
            }
          });
          
          return Promise.all(triggerPromises);
        }),
        map((events: Array<TriggerEvent | null>) => events.filter((e: TriggerEvent | null) => e !== null) as TriggerEvent[]),
        tap(events => {
          if (events.length > 0) {
          }
        }),
        catchError(() => of([] as TriggerEvent[]))
      );
  }

  /**
   * Procesar trigger para contrato individual
   */
  private processTriggerForContract(summary: ContractPaymentSummary): Observable<TriggerEvent> {
    const rule = this.findTriggerRule(summary.flow, summary.market);
    if (!rule) {
      throw new Error(`No se encontró regla de trigger para ${summary.flow} en ${summary.market}`);
    }


    // Crear orden de entrega
    return this.createDeliveryOrder(summary.clientId, {
      contractId: summary.contractId,
      flow: summary.flow,
      market: summary.market as DeliveryMarket,
      triggerType: 'payment_threshold',
      triggerAmount: summary.currentPaidAmount,
      thresholdAmount: summary.thresholdAmount
    }).pipe(
      map((deliveryOrder: DeliveryOrder) => {
        const triggerEvent: TriggerEvent = {
          id: `trigger-${Date.now()}-${summary.contractId}`,
          clientId: summary.clientId,
          contractId: summary.contractId,
          triggerRuleId: rule.id,
          eventType: 'payment_threshold_reached',
          triggerDate: new Date(),
          thresholdAmount: summary.thresholdAmount,
          actualAmount: summary.currentPaidAmount,
          triggerPercentage: summary.thresholdAmount > 0 ? round2((summary.currentPaidAmount / summary.thresholdAmount) * 100) : 0,
          deliveryOrderCreated: true,
          deliveryOrderId: deliveryOrder.id,
          processedBy: 'system',
          notifications: {
            advisorNotified: false, // Se procesará después
            clientNotified: false, // Se procesará después
            whatsappSent: false // Se procesará después
          }
        };

        // Enviar notificación al BFF para actualizar el estado
        this.updateTriggerStatus(summary.contractId, triggerEvent).subscribe();

        return triggerEvent;
      }),
      catchError((error: any) => {
        const triggerEvent: TriggerEvent = {
          id: `trigger-error-${Date.now()}-${summary.contractId}`,
          clientId: summary.clientId,
          contractId: summary.contractId,
          triggerRuleId: rule.id,
          eventType: 'payment_threshold_reached',
          triggerDate: new Date(),
          thresholdAmount: summary.thresholdAmount,
          actualAmount: summary.currentPaidAmount,
          triggerPercentage: summary.thresholdPercentage,
          deliveryOrderCreated: false,
          errorMessage: error.message || 'Error desconocido',
          processedBy: 'system',
          notifications: {
            advisorNotified: false,
            clientNotified: false,
            whatsappSent: false
          }
        };

        return of(triggerEvent);
      })
    );
  }

  /**
   * Procesar trigger para tanda colectiva
   */
  private processTriggerForTanda(analysis: TandaPredictiveAnalysis): Observable<TriggerEvent> {
    const rule = this.findTriggerRule(BusinessFlow.CreditoColectivo, 'edomex');
    if (!rule) {
      throw new Error('No se encontró regla de trigger para Tandas');
    }


    // Para tandas, creamos la orden para el grupo completo
    return this.createDeliveryOrderForTanda(analysis).pipe(
      map((deliveryOrder: DeliveryOrder) => {
        const triggerEvent: TriggerEvent = {
          id: `trigger-tanda-${Date.now()}-${analysis.tandaId}`,
          clientId: 'group', // Grupo colectivo
          tandaId: analysis.tandaId,
          triggerRuleId: rule.id,
          eventType: 'tanda_prediction_ready',
          triggerDate: new Date(),
          thresholdAmount: analysis.projectedFirstEnganche,
          actualAmount: analysis.totalCollected,
          triggerPercentage: round2(analysis.confidenceLevel * 100),
          deliveryOrderCreated: true,
          deliveryOrderId: deliveryOrder.id,
          processedBy: 'system',
          notifications: {
            advisorNotified: false,
            clientNotified: false,
            whatsappSent: false
          }
        };

        // Actualizar estado de la tanda
        this.updateTandaTriggerStatus(analysis.tandaId, triggerEvent).subscribe();

        return triggerEvent;
      }),
      catchError((error: any) => {
        const triggerEvent: TriggerEvent = {
          id: `trigger-tanda-error-${Date.now()}-${analysis.tandaId}`,
          clientId: 'group',
          tandaId: analysis.tandaId,
          triggerRuleId: rule.id,
          eventType: 'tanda_prediction_ready',
          triggerDate: new Date(),
          thresholdAmount: analysis.projectedFirstEnganche,
          actualAmount: analysis.totalCollected,
          triggerPercentage: analysis.confidenceLevel * 100,
          deliveryOrderCreated: false,
          errorMessage: error.message || 'Error desconocido',
          processedBy: 'system',
          notifications: {
            advisorNotified: false,
            clientNotified: false,
            whatsappSent: false
          }
        };

        return of(triggerEvent);
      })
    );
  }

  /**
   * Crear orden de entrega automática para contrato individual
   */
  private createDeliveryOrder(clientId: string, trigger: {
    contractId: string;
    flow: BusinessFlow;
    market: DeliveryMarket;
    triggerType: string;
    triggerAmount: number;
    thresholdAmount: number;
  }): Observable<DeliveryOrder> {
    
    const orderData = {
      clientId,
      market: trigger.market,
      businessFlow: trigger.flow,
      sku: this.getDefaultSKU(this.mapDeliveryMarket(trigger.market), trigger.flow),
      totalAmount: 0, // Se calculará en el BFF
      paidAmount: trigger.triggerAmount,
      
      // Metadatos del trigger automático
      createdBy: 'system',
      triggerSource: 'contract_payment_threshold',
      triggerMetadata: {
        contractId: trigger.contractId,
        thresholdAmount: trigger.thresholdAmount,
        triggerPercentage: 50,
        automaticTrigger: true
      }
    };

    return this.deliveriesService.create(orderData);
  }

  /**
   * Crear orden de entrega para tanda colectiva
   */
  private createDeliveryOrderForTanda(analysis: TandaPredictiveAnalysis): Observable<DeliveryOrder> {
    const orderData = {
      clientId: analysis.tandaId, // Usar tanda ID como cliente para orden grupal
      market: 'edomex' as DeliveryMarket,
      businessFlow: BusinessFlow.CreditoColectivo,
      sku: this.getDefaultSKU('edomex', BusinessFlow.CreditoColectivo),
      totalAmount: 0, // Se calculará en el BFF
      paidAmount: analysis.totalCollected,
      
      // Metadatos específicos de tanda
      createdBy: 'system',
      triggerSource: 'tanda_predictive_analysis',
      triggerMetadata: {
        tandaId: analysis.tandaId,
        routeId: analysis.routeId,
        activeMembersCount: analysis.activeMembersCount,
        monthsCollecting: analysis.monthsCollecting,
        confidenceLevel: analysis.confidenceLevel,
        projectedFirstEnganche: analysis.projectedFirstEnganche,
        automaticTrigger: true,
        predictiveAnalysis: true
      }
    };

    return this.deliveriesService.create(orderData);
  }

  /**
   * Obtener resumen de pagos para un contrato
   */
  getContractPaymentSummary(contractId: string): Observable<ContractPaymentSummary> {
    return this.http.get<ContractPaymentSummary>(`${this.baseUrl}/v1/triggers/contract/${contractId}/payment-summary`)
      .pipe(
        catchError(() => of({} as ContractPaymentSummary))
      );
  }

  /**
   * Obtener análisis predictivo para una tanda
   */
  getTandaPredictiveAnalysis(tandaId: string): Observable<TandaPredictiveAnalysis> {
    return this.http.get<TandaPredictiveAnalysis>(`${this.baseUrl}/v1/triggers/tanda/${tandaId}/predictive-analysis`)
      .pipe(
        catchError(() => of({} as TandaPredictiveAnalysis))
      );
  }

  /**
   * Obtener todos los triggers procesados
   */
  getTriggerHistory(limit = 50): Observable<TriggerEvent[]> {
    return this.http.get<TriggerEvent[]>(`${this.baseUrl}/v1/triggers/history`, {
      params: { limit: limit.toString() }
    }).pipe(
      catchError(() => of([] as TriggerEvent[]))
    );
  }

  /**
   * Forzar procesamiento manual de triggers
   */
  forceProcessTriggers(): Observable<{ processed: number; events: TriggerEvent[] }> {
    
    return this.processAllTriggers().pipe(
      map(events => ({
        processed: events.length,
        events
      }))
    );
  }

  /**
   * Obtener reglas de trigger activas
   */
  getTriggerRules(): TriggerRule[] {
    return [...this.triggerRules];
  }

  /**
   * Obtener métricas del sistema de triggers
   */
  getTriggerMetrics(): Observable<{
    totalTriggers: number;
    successfulTriggers: number;
    failedTriggers: number;
    pendingAnalysis: number;
    averageProcessingTime: number;
    lastProcessingTime: Date;
  }> {
    return this.http.get<any>(`${this.baseUrl}/v1/triggers/metrics`)
      .pipe(
        catchError(() => of({
          totalTriggers: 0,
          successfulTriggers: 0,
          failedTriggers: 0,
          pendingAnalysis: 0,
          averageProcessingTime: 0,
          lastProcessingTime: new Date()
        }))
      );
  }

  // === MÉTODOS PRIVADOS ===

  private findTriggerRule(flow: BusinessFlow, market: Market): TriggerRule | undefined {
    return this.triggerRules.find(rule => rule.flow === flow && rule.market === market);
  }

  private getDefaultSKU(market: Market, flow: BusinessFlow): string {
    // SKUs basados en los configurados en el sistema de entregas
    if (market === 'aguascalientes') {
      return 'H6C-19P-AGS'; // Vagoneta H6C 19 Pasajeros
    } else {
      return flow === BusinessFlow.CreditoColectivo ? 'H6C-VENT-COL' : 'H6C-VENT-IND';
    }
  }

  private mapDeliveryMarket(deliveryMarket: DeliveryMarket): Market {
    return deliveryMarket === 'aguascalientes' ? 'aguascalientes' : 'edomex';
  }

  private updateTriggerStatus(contractId: string, triggerEvent: TriggerEvent): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/v1/triggers/contract/${contractId}/status`, {
      triggerId: triggerEvent.id,
      triggerDate: triggerEvent.triggerDate,
      deliveryOrderId: triggerEvent.deliveryOrderId,
      triggered: triggerEvent.deliveryOrderCreated
    }).pipe(
      catchError(error => {
        return of();
      })
    );
  }

  private updateTandaTriggerStatus(tandaId: string, triggerEvent: TriggerEvent): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/v1/triggers/tanda/${tandaId}/status`, {
      triggerId: triggerEvent.id,
      triggerDate: triggerEvent.triggerDate,
      deliveryOrderId: triggerEvent.deliveryOrderId,
      triggered: triggerEvent.deliveryOrderCreated
    }).pipe(
      catchError(error => {
        return of();
      })
    );
  }

  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<T> => {
      
      let userMessage = 'Error en el sistema de triggers automáticos';
      
      if (error.status === 404) {
        userMessage = 'Información de trigger no encontrada';
      } else if (error.status === 403) {
        userMessage = 'No tienes permisos para gestionar triggers';
      } else if (error.status === 400) {
        userMessage = error.error?.message || 'Solicitud de trigger inválida';
      } else if (error.status >= 500) {
        userMessage = 'Error del servidor. Intenta más tarde';
      }

      return of(undefined as unknown as T);
    };
  }
}
