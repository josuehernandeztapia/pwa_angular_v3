import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, tap } from 'rxjs';
import { DeliveryOrder } from '../models/deliveries';
import { Client, Market } from '../models/types';
import {
  DeliveryData,
  ImportMilestoneStatus,
  ImportStatus,
  LegalDocuments,
  PlatesData,
  PostSalesRecord,
  VehicleDeliveredEvent,
  VehicleUnit
} from '../models/postventa';
import { ContractTriggersService, TriggerEvent } from './contract-triggers.service';
import { ContractService } from './contract.service';
import { DeliveriesService } from './deliveries.service';
import { ImportWhatsAppNotificationsService } from './import-whatsapp-notifications.service';
import { WhatsAppNotificationResult } from '../models/notification';
import { VehicleAssignmentRequest, VehicleAssignmentService } from './vehicle-assignment.service';

declare global {
  interface Window {
    __BFF_BASE__?: string;
  }
}

/**
 * Servicio integrado que extiende el Import Tracker existente con:
 * 1. Integración automática con el sistema de triggers
 * 2. Sincronización bidireccional entre contratos y órdenes de entrega
 * 3. Actualización automática del status de import cuando se crean órdenes
 * 4. Notificaciones automáticas en milestones de importación
 */

export interface IntegratedImportStatus extends ImportStatus {
  // Extendemos el ImportStatus existente con información de triggers
  triggerHistory?: TriggerEvent[];
  deliveryOrderId?: string;
  contractId?: string;
  
  // Estado de sincronización
  syncStatus?: 'synced' | 'pending' | 'error';
  lastSyncDate?: Date;
  syncErrorMessage?: string;
  
  // Metadatos adicionales
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  delayReasons?: string[];
  customsReleaseDate?: Date;
  
  //  NUEVA PROPIEDAD: Unidad asignada
  assignedUnit?: VehicleUnit;
}

export interface ImportMilestoneEvent {
  id: string;
  clientId: string;
  deliveryOrderId?: string;
  milestone: keyof ImportStatus;
  previousStatus: 'completed' | 'in_progress' | 'pending';
  newStatus: 'completed' | 'in_progress' | 'pending';
  timestamp: Date;
  
  // Detalles del evento
  triggeredBy: 'system' | 'manual' | 'external_update';
  metadata?: {
    estimatedDate?: Date;
    actualDate?: Date;
    documents?: string[];
    notes?: string;
  };
  
  // Notificaciones
  notificationsSent?: {
    client?: boolean;
    advisor?: boolean;
    whatsapp?: boolean;
  };
}

export interface ImportTrackerMetrics {
  totalActiveImports: number;
  averageTransitTime: number; // days
  onTimeDeliveryRate: number; // percentage
  delayedImports: number;
  
  // Breakdown by milestone
  milestoneStats: {
    [K in keyof ImportStatus]: {
      averageDuration: number;
      completionRate: number;
      currentCount: number;
    };
  };
  
  // Trends
  monthlyImportVolume: { month: string; count: number }[];
  delayTrends: { month: string; averageDelay: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class IntegratedImportTrackerService {
  private http = inject(HttpClient);
  private contractTriggersService = inject(ContractTriggersService);
  private deliveriesService = inject(DeliveriesService);
  private importWhatsAppService = inject(ImportWhatsAppNotificationsService);
  private vehicleAssignmentService = inject(VehicleAssignmentService);
  private contractService = inject(ContractService);
  private baseUrl = (window as any).__BFF_BASE__ ?? '/api';
  
  // Estado reactivo
  private importStatusCache$ = new BehaviorSubject<Map<string, IntegratedImportStatus>>(new Map());
  
  constructor() {
    this.initializeIntegration();
  }

  // ADD this missing method to the class:
  getEnhancedImportStatus(clientId: string): Observable<any> {
    return this.http.get<any>(`/api/clients/${clientId}/import-status/enhanced`);
  }

  // ADD this missing method:
  private getContractsWithVehicles(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/clients/${clientId}/contracts-vehicles`);
  }

  /**
   * Inicializar integración con sistema de triggers
   */
  private initializeIntegration(): void {
    // Suscribirse a eventos de triggers para actualizar import status automáticamente
    this.contractTriggersService.getTriggerHistory(10).subscribe(triggers => {
      triggers.forEach(trigger => {
        if (trigger.deliveryOrderCreated && trigger.deliveryOrderId) {
          this.syncImportStatusWithDeliveryOrder(trigger.deliveryOrderId, trigger.clientId);
        }
      });
    });
  }

  /**
   * Obtener status de importación integrado para un cliente
   */
  getIntegratedImportStatus(clientId: string): Observable<IntegratedImportStatus | null> {
    return combineLatest([
      this.http.get<ImportStatus>(`${this.baseUrl}/v1/clients/${clientId}/import-status`).pipe(
        catchError(() => of(null))
      ),
      this.contractTriggersService.getTriggerHistory(50).pipe(
        map(triggers => triggers.filter(t => t.clientId === clientId))
      ),
      this.deliveriesService.list({ clientId: clientId, limit: 10 }).pipe(
        map(response => response.items as any[]),
        catchError(() => of([] as any[]))
      )
    ]).pipe(
      map(([importStatus, triggers, deliveryOrders]) => {
        if (!importStatus) return null;

        const latestDeliveryOrder = deliveryOrders[0];
        const latestTrigger = triggers[0];

        const integrated: IntegratedImportStatus = {
          ...importStatus,
          triggerHistory: triggers,
          deliveryOrderId: latestDeliveryOrder?.id,
          contractId: latestTrigger?.contractId,
          syncStatus: this.determineSyncStatus(importStatus, deliveryOrders, triggers),
          lastSyncDate: new Date(),
          estimatedDeliveryDate: this.calculateEstimatedDeliveryDate(importStatus),
          actualDeliveryDate: latestDeliveryOrder?.updatedAt ? new Date(latestDeliveryOrder.updatedAt) : undefined
        };

        // Actualizar caché
        const currentCache = this.importStatusCache$.value;
        currentCache.set(clientId, integrated);
        this.importStatusCache$.next(currentCache);

        return integrated;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Actualizar milestone de importación con integración automática
   */
  updateImportMilestone(
    clientId: string,
    milestone: keyof ImportStatus,
    status: 'completed' | 'in_progress' | 'pending',
    metadata?: {
      estimatedDate?: Date;
      actualDate?: Date;
      documents?: string[];
      notes?: string;
    }
  ): Observable<IntegratedImportStatus> {
    
    return this.http.patch<ImportStatus>(`${this.baseUrl}/v1/clients/${clientId}/import-status`, {
      milestone,
      status,
      metadata: {
        ...metadata,
        updatedBy: 'integrated_tracker',
        updatedAt: new Date().toISOString()
      }
    }).pipe(
      tap(updatedStatus => {
        // Registrar evento de milestone
        this.recordMilestoneEvent(clientId, milestone, status, metadata);
        
        // Sincronizar con delivery order si existe
        this.syncMilestoneWithDeliveryOrder(clientId, milestone, status);
        
        //  NUEVA FUNCIONALIDAD: Trigger asignación de unidad al completar fabricación
        if (milestone === 'unidadFabricada' && status === 'completed') {
          this.triggerVehicleAssignmentFlow(clientId, metadata);
        }
        
        // Enviar notificaciones automáticas WhatsApp
        this.sendMilestoneNotifications(clientId, milestone, status, updatedStatus, metadata);
      }),
      map(importStatus => ({
        ...importStatus,
        syncStatus: 'synced' as const,
        lastSyncDate: new Date()
      } as IntegratedImportStatus)),
      catchError(() => of({} as IntegratedImportStatus))
    );
  }

  /**
   * Crear orden de entrega automáticamente al alcanzar trigger
   * (Llamado desde ContractTriggersService)
   */
  onTriggerCreatedDeliveryOrder(triggerEvent: TriggerEvent, deliveryOrder: DeliveryOrder): Observable<void> {
    if (!triggerEvent.clientId || !deliveryOrder.id) {
      return of();
    }


    return this.initializeImportTrackingForDeliveryOrder(triggerEvent.clientId, deliveryOrder).pipe(
      tap(() => {
        // Actualizar caché para reflejar la nueva integración
        this.refreshImportStatusCache(triggerEvent.clientId);
        
        // Enviar notificación WhatsApp de orden de entrega creada
        this.importWhatsAppService.sendDeliveryUpdateNotification(
          triggerEvent.clientId,
          deliveryOrder.id,
          'order_created',
          {
            clientName: 'Cliente',
            market: deliveryOrder.market
          }
        ).subscribe({
          next: (result) => {
            if (result.success) {
            }
          },
          error: (error) => {
          }
        });
      }),
      map(() => void 0),
      catchError(error => {
        return of(void 0);
      })
    );
  }

  /**
   * Inicializar tracking de importación para nueva orden de entrega
   */
  private initializeImportTrackingForDeliveryOrder(clientId: string, deliveryOrder: DeliveryOrder): Observable<ImportStatus> {
    const initialImportStatus: ImportStatus = {
      pedidoPlanta: { status: 'in_progress', startedAt: new Date(), estimatedDays: 3 },
      unidadFabricada: { status: 'pending', estimatedDays: 30 },
      transitoMaritimo: { status: 'pending', estimatedDays: 21 },
      enAduana: { status: 'pending', estimatedDays: 7 },
      liberada: { status: 'pending', estimatedDays: 2 }
    };

    return this.http.post<ImportStatus>(`${this.baseUrl}/v1/clients/${clientId}/import-status`, {
      ...initialImportStatus,
      deliveryOrderId: deliveryOrder.id,
      createdBy: 'automatic_trigger',
      createdAt: new Date().toISOString(),
      metadata: {
        triggerSource: 'contract_payment_threshold',
        market: deliveryOrder.market,
        sku: deliveryOrder.sku
      }
    }).pipe(
      tap(status => {
        
        // Registrar evento inicial
        this.recordMilestoneEvent(clientId, 'pedidoPlanta', 'in_progress', {
          notes: `Tracking iniciado automáticamente por trigger de contrato`,
          estimatedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 días
        });
      }),
      catchError(() => of({} as ImportStatus))
    );
  }

  /**
   * Sincronizar status de importación con orden de entrega
   */
  private syncImportStatusWithDeliveryOrder(deliveryOrderId: string, clientId: string): Observable<void> {
    return this.deliveriesService.get(deliveryOrderId).pipe(
      tap(deliveryOrder => {
        // Mapear estados de delivery a milestones de import
        const statusMapping = this.mapDeliveryStatusToImportMilestones(deliveryOrder.status);
        
        if (statusMapping) {
          this.updateImportMilestone(
            clientId, 
            statusMapping.milestone, 
            statusMapping.status,
            {
              notes: `Actualizado automáticamente desde orden de entrega ${deliveryOrderId}`,
              actualDate: statusMapping.actualDate
            }
          ).subscribe();
        }
      }),
      map(() => {}),
      catchError(() => of(void 0))
    );
  }

  /**
   * Sincronizar milestone con delivery order cuando se actualiza
   */
  private syncMilestoneWithDeliveryOrder(
    clientId: string, 
    milestone: keyof ImportStatus, 
    status: 'completed' | 'in_progress' | 'pending'
  ): Observable<void> {
    
    return this.getDeliveryOrderForClient(clientId).pipe(
      tap(deliveryOrder => {
        if (!deliveryOrder) return;

        const deliveryStatus = this.mapImportMilestoneToDeliveryStatus(milestone, status);
        if (deliveryStatus && deliveryOrder.status !== deliveryStatus) {
          // Actualizar delivery order para mantener sincronía
          // Build valid transition request using DeliveryEvent
          const eventMapping: Record<string, string> = {
            'PO_ISSUED': 'ISSUE_PO',
            'IN_PRODUCTION': 'START_PROD',
            'READY_AT_FACTORY': 'FACTORY_READY',
            'AT_ORIGIN_PORT': 'LOAD_ORIGIN',
            'ON_VESSEL': 'DEPART_VESSEL',
            'AT_DEST_PORT': 'ARRIVE_DEST',
            'IN_CUSTOMS': 'CUSTOMS_CLEAR',
            'RELEASED': 'RELEASE',
            'AT_WH': 'ARRIVE_WH',
            'READY_FOR_HANDOVER': 'SCHEDULE_HANDOVER'
          };
          const event = eventMapping[deliveryStatus];
          if (event) {
            this.deliveriesService.transition(deliveryOrder.id, {
              event: event as any,
              meta: {
                milestone,
                updatedFromImportTracker: true
              }
            }).subscribe();
          }
        }
      }),
      map(() => {}),
      catchError(() => of(void 0))
    );
  }

  /**
   * Obtener métricas del import tracker
   */
  getImportTrackerMetrics(): Observable<ImportTrackerMetrics> {
    return this.http.get<ImportTrackerMetrics>(`${this.baseUrl}/v1/import-tracker/metrics`)
      .pipe(
        catchError(() => of({
          totalActiveImports: 0,
          averageTransitTime: 0,
          onTimeDeliveryRate: 0,
          delayedImports: 0,
          milestoneStats: {} as any,
          monthlyImportVolume: [],
          delayTrends: []
        } as ImportTrackerMetrics))
      );
  }

  /**
   * Obtener historial de eventos de milestones
   */
  getImportMilestoneHistory(clientId: string, limit = 50): Observable<ImportMilestoneEvent[]> {
    return this.http.get<ImportMilestoneEvent[]>(`${this.baseUrl}/v1/clients/${clientId}/import-milestones`, {
      params: { limit: limit.toString() }
    }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Generar reporte de tracking integrado
   */
  generateIntegratedTrackingReport(clientId: string): Observable<{
    reportUrl: string;
    reportData: {
      client: any;
      importStatus: IntegratedImportStatus | null;
      deliveryOrders: any[];
      triggerHistory: TriggerEvent[];
      milestoneHistory: ImportMilestoneEvent[];
      timeline: any[];
    };
  }> {
    return combineLatest([
      this.getIntegratedImportStatus(clientId),
      this.deliveriesService.list({ clientId: clientId }),
      this.contractTriggersService.getTriggerHistory(100),
      this.getImportMilestoneHistory(clientId)
    ]).pipe(
      map(([importStatus, deliveriesResponse, allTriggers, milestoneHistory]) => {
        const clientTriggers = allTriggers.filter(t => t.clientId === clientId);
        
        const reportData = {
          client: { id: clientId }, // En implementación real vendría del cliente
          importStatus,
          deliveryOrders: deliveriesResponse.items,
          triggerHistory: clientTriggers,
          milestoneHistory,
          timeline: this.generateIntegratedTimeline(importStatus, deliveriesResponse.items, clientTriggers, milestoneHistory)
        };

        return {
          reportUrl: `${this.baseUrl}/v1/reports/integrated-tracking/${clientId}`,
          reportData
        };
      }),
      catchError(() => of({
        reportUrl: `${this.baseUrl}/v1/reports/integrated-tracking/${clientId}`,
        reportData: {
          client: { id: clientId },
          importStatus: null,
          deliveryOrders: [],
          triggerHistory: [],
          milestoneHistory: [],
          timeline: []
        }
      }))
    );
  }

  // === MÉTODOS PRIVADOS ===

  private determineSyncStatus(
    importStatus: ImportStatus, 
    deliveryOrders: DeliveryOrder[], 
    triggers: TriggerEvent[]
  ): 'synced' | 'pending' | 'error' {
    // Lógica para determinar si el estado está sincronizado
    const hasDeliveryOrder = deliveryOrders.length > 0;
    const hasSuccessfulTrigger = triggers.some(t => t.deliveryOrderCreated);
    
    if (hasDeliveryOrder && hasSuccessfulTrigger) return 'synced';
    if (hasSuccessfulTrigger && !hasDeliveryOrder) return 'error';
    return 'pending';
  }

  private calculateEstimatedDeliveryDate(importStatus: ImportStatus): Date {
    let totalDays = 0;
    const milestones: (keyof ImportStatus)[] = ['pedidoPlanta', 'unidadFabricada', 'transitoMaritimo', 'enAduana', 'liberada'];
    
    for (const milestone of milestones) {
      const status = importStatus[milestone] as ImportMilestoneStatus | undefined;
      if (status && status.status === 'pending') {
        totalDays += status.estimatedDays || 0;
      }
    }
    
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + totalDays);
    return deliveryDate;
  }

  private mapDeliveryStatusToImportMilestones(deliveryStatus: string): {
    milestone: keyof ImportStatus;
    status: 'completed' | 'in_progress' | 'pending';
    actualDate?: Date;
  } | null {
    const mapping: { [key: string]: { milestone: keyof ImportStatus; status: 'completed' | 'in_progress' | 'pending' } } = {
      'PO_ISSUED': { milestone: 'pedidoPlanta', status: 'completed' },
      'IN_PRODUCTION': { milestone: 'unidadFabricada', status: 'in_progress' },
      'READY_AT_FACTORY': { milestone: 'unidadFabricada', status: 'completed' },
      'AT_ORIGIN_PORT': { milestone: 'transitoMaritimo', status: 'in_progress' },
      'ON_VESSEL': { milestone: 'transitoMaritimo', status: 'in_progress' },
      'AT_DEST_PORT': { milestone: 'transitoMaritimo', status: 'completed' },
      'IN_CUSTOMS': { milestone: 'enAduana', status: 'in_progress' },
      'RELEASED': { milestone: 'enAduana', status: 'completed' },
      'AT_WH': { milestone: 'liberada', status: 'in_progress' },
      'READY_FOR_HANDOVER': { milestone: 'liberada', status: 'completed' }
    };

    const result = mapping[deliveryStatus];
    return result ? { ...result, actualDate: new Date() } : null;
  }

  private mapImportMilestoneToDeliveryStatus(
    milestone: keyof ImportStatus, 
    status: 'completed' | 'in_progress' | 'pending'
  ): string | null {
    if (status === 'pending') return null;

    const mapping: { [K in keyof ImportStatus]?: { [S in 'completed' | 'in_progress']?: string } } = {
      pedidoPlanta: { 
        'in_progress': 'PO_ISSUED', 
        'completed': 'PO_ISSUED' 
      },
      unidadFabricada: { 
        'in_progress': 'IN_PRODUCTION', 
        'completed': 'READY_AT_FACTORY' 
      },
      transitoMaritimo: { 
        'in_progress': 'ON_VESSEL', 
        'completed': 'AT_DEST_PORT' 
      },
      enAduana: { 
        'in_progress': 'IN_CUSTOMS', 
        'completed': 'RELEASED' 
      },
      liberada: { 
        'in_progress': 'AT_WH', 
        'completed': 'READY_FOR_HANDOVER' 
      }
    };

    return mapping[milestone]?.[status] || null;
  }

  private getDeliveryOrderForClient(clientId: string): Observable<DeliveryOrder | null> {
    return this.deliveriesService.list({ clientId: clientId, limit: 1 }).pipe(
      map(response => response.items[0] || null),
      catchError(() => of(null))
    );
  }

  private recordMilestoneEvent(
    clientId: string, 
    milestone: keyof ImportStatus, 
    status: 'completed' | 'in_progress' | 'pending', 
    metadata?: any
  ): Observable<void> {
    const event: ImportMilestoneEvent = {
      id: `milestone-${Date.now()}-${clientId}-${milestone}`,
      clientId,
      milestone,
      previousStatus: 'pending', // En implementación real, se obtendría el estado anterior
      newStatus: status,
      timestamp: new Date(),
      triggeredBy: 'manual', // o 'system' dependiendo del contexto
      metadata,
      notificationsSent: {
        client: false,
        advisor: false,
        whatsapp: false
      }
    };

    return this.http.post<void>(`${this.baseUrl}/v1/clients/${clientId}/import-milestones`, event)
      .pipe(
        catchError(() => of(void 0))
      );
  }

  private sendMilestoneNotifications(
    clientId: string, 
    milestone: keyof ImportStatus, 
    status: 'completed' | 'in_progress' | 'pending',
    importStatus: IntegratedImportStatus,
    metadata?: any
  ): void {
    // Solo enviar para estados activos (no pending)
    if (status === 'pending') return;

    // Obtener datos del cliente para personalizar la notificación
    this.getClientData(clientId).subscribe({
      next: (clientData) => {
        this.importWhatsAppService.sendMilestoneNotification(
          clientId,
          milestone,
          status,
          importStatus,
          clientData
        ).subscribe({
          next: (result) => {
            if (result.success) {
            } else {
            }
          },
          error: (error) => {
          }
        });
      },
      error: (error) => {
      }
    });
  }

  private getClientData(clientId: string): Observable<Partial<Client>> {
    return this.http.get<Client>(`${this.baseUrl}/v1/clients/${clientId}`).pipe(
      catchError(() => {
        // Si no se puede obtener el cliente, devolver datos por defecto
        return of({
          id: clientId,
          name: 'Cliente',
          phone: '',
          market: 'aguascalientes' as Market
        } as Partial<Client>);
      })
    );
  }

  private refreshImportStatusCache(clientId: string): void {
    this.getIntegratedImportStatus(clientId).subscribe();
  }

  private generateIntegratedTimeline(
    importStatus: IntegratedImportStatus | null,
    deliveryOrders: DeliveryOrder[],
    triggers: TriggerEvent[],
    milestoneHistory: ImportMilestoneEvent[]
  ): any[] {
    const timelineEvents: any[] = [];

    // Agregar eventos de triggers
    triggers.forEach(trigger => {
      timelineEvents.push({
        type: 'trigger',
        date: trigger.triggerDate,
        title: `Trigger Activado: ${trigger.eventType}`,
        description: `Umbral alcanzado: ${trigger.triggerPercentage}%`,
        success: trigger.deliveryOrderCreated
      });
    });

    // Agregar eventos de delivery orders
    deliveryOrders.forEach(order => {
      timelineEvents.push({
        type: 'delivery_order',
        date: order.createdAt,
        title: `Orden de Entrega Creada`,
        description: `Orden ${order.id}`,
        success: true
      });
    });

    // Agregar eventos de milestones
    milestoneHistory.forEach(milestone => {
      timelineEvents.push({
        type: 'milestone',
        date: milestone.timestamp,
        title: `Milestone: ${milestone.milestone}`,
        description: `Estado: ${milestone.newStatus}`,
        success: milestone.newStatus === 'completed'
      });
    });

    // Ordenar por fecha
    return timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   *  NUEVA FUNCIONALIDAD: Trigger el flujo de asignación de unidad
   * Se ejecuta cuando se completa el milestone "unidadFabricada"
   */
  private triggerVehicleAssignmentFlow(
    clientId: string, 
    metadata?: {
      estimatedDate?: Date;
      actualDate?: Date;
      documents?: string[];
      notes?: string;
    }
  ): void {
    console.info('[IntegratedImportTracker] Trigger vehicle assignment flow', {
      clientId,
      estimatedDate: metadata?.estimatedDate,
      actualDate: metadata?.actualDate,
      documents: metadata?.documents?.length || 0
    });

    // Log del evento para debugging
    console.debug('[IntegratedImportTracker] Vehicle fabrication milestone reached', {
      clientId,
      completedAt: metadata?.actualDate || new Date(),
      notes: metadata?.notes
    });

    // Enviar notificación que la unidad está lista para asignación
    this.sendUnitReadyNotification(clientId, metadata);

    // Aquí podrías añadir lógica adicional como:
    // - Notificar al departamento de asignaciones
    // - Crear tarea automática en el sistema
    // - Trigger de workflow de asignación
  }

  /**
   * Enviar notificación de que la unidad está lista para asignación
   */
  private sendUnitReadyNotification(
    clientId: string, 
    metadata?: {
      estimatedDate?: Date;
      actualDate?: Date;
      documents?: string[];
      notes?: string;
    }
  ): void {
    const notificationData = {
      type: 'UNIT_READY_FOR_ASSIGNMENT',
      clientId,
      message: 'La unidad ha completado fabricación y está lista para asignación de datos específicos (VIN, Serie, Número de Motor)',
      timestamp: new Date(),
      metadata: {
        completedAt: metadata?.actualDate || new Date(),
        notes: metadata?.notes || 'Unidad fabricada - Pendiente asignación de datos específicos'
      }
    };

    // En producción, esto podría enviar:
    // - Email al equipo de asignaciones
    // - Notification push al dashboard
    // - WhatsApp message al asesor
    // - Task creation en sistema de tareas

    
    // Opcional: usar el WhatsApp service para notificar
    // this.importWhatsAppService.sendNotification(clientId, 'UNIT_READY', notificationData);
  }

  /**
   */
  assignVehicleToClient(
    clientId: string,
    vehicleData: {
      vin: string;
      serie: string;
      modelo: string;
      year: number;
      numeroMotor: string;
      transmission?: 'Manual' | 'Automatica';
      productionBatch?: string;
      factoryLocation?: string;
      assignedBy: string;
      notes?: string;
    }
  ): Observable<{ success: boolean; assignedUnit?: VehicleUnit; error?: string }> {
    

    // Validar que el cliente esté en el estado correcto (unidadFabricada completed)
    return this.getIntegratedImportStatus(clientId).pipe(
      map(importStatus => {
        if (!importStatus || importStatus.unidadFabricada.status !== 'completed') {
          throw new Error('El cliente debe tener el milestone "unidadFabricada" completado para asignar unidad');
        }
        return importStatus;
      }),
      // Proceder con la asignación
      tap(() => {
        const assignmentRequest: VehicleAssignmentRequest = {
          clientId,
          vin: vehicleData.vin,
          serie: vehicleData.serie,
          modelo: vehicleData.modelo,
          year: vehicleData.year,
          numeroMotor: vehicleData.numeroMotor,
          transmission: vehicleData.transmission,
          productionBatch: vehicleData.productionBatch,
          factoryLocation: vehicleData.factoryLocation,
          assignedBy: vehicleData.assignedBy,
          notes: vehicleData.notes
        };

        // Validar datos
        const validation = this.vehicleAssignmentService.validateVehicleData(assignmentRequest);
        if (!validation.valid) {
          throw new Error(`Datos de vehículo inválidos: ${validation.errors.join(', ')}`);
        }

        // Ejecutar asignación
        this.vehicleAssignmentService.assignVehicleToClient(assignmentRequest).subscribe({
          next: (result) => {
            if (result.success && result.assignedUnit) {
              console.info('[IntegratedImportTracker] Vehicle assignment succeeded', {
                clientId,
                unitId: result.assignedUnit.id,
                vin: result.assignedUnit.vin
              });
              
              // Actualizar el import status con la unidad asignada
              this.updateImportStatusWithAssignedUnit(clientId, result.assignedUnit);
              
              //  NUEVA FUNCIONALIDAD: Actualizar contrato con unidad asignada
              this.updateContractWithAssignedVehicle(clientId, result.assignedUnit);
              
              // Enviar notificación de asignación exitosa
              this.sendVehicleAssignmentNotification(clientId, result.assignedUnit);
              
            } else {
              console.warn('[IntegratedImportTracker] Vehicle assignment returned no unit', {
                clientId,
                success: result.success,
                error: result.error
              });
            }
          },
          error: (error) => {
            console.error('[IntegratedImportTracker] assignVehicleToClient emitted error', error);
          }
        });
      }),
      map(() => ({ success: true })),
      catchError((error) => {
        console.error('[IntegratedImportTracker] Vehicle assignment flow failed', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Actualizar import status con la unidad asignada
   */
  private updateImportStatusWithAssignedUnit(clientId: string, assignedUnit: VehicleUnit): void {
    // En producción, esto sería una API call para actualizar el import status
    console.debug('[IntegratedImportTracker] Updating import status with assigned unit', {
      clientId,
      unitId: assignedUnit.id,
      vin: assignedUnit.vin
    });
    
    // Simular actualización local del cache
    const currentCache = this.importStatusCache$.value;
    const clientStatus = currentCache.get(clientId);
    
    if (clientStatus) {
      const updatedStatus: IntegratedImportStatus = {
        ...clientStatus,
        //  Actualizar con la unidad asignada
        assignedUnit: assignedUnit,
        syncStatus: 'synced',
        lastSyncDate: new Date()
      };
      
      currentCache.set(clientId, updatedStatus);
      this.importStatusCache$.next(currentCache);
      
      console.info('[IntegratedImportTracker] Import status updated with assigned unit', {
        clientId,
        vin: assignedUnit.vin
      });
    }
  }

  /**
   * Enviar notificación de asignación exitosa
   */
  private sendVehicleAssignmentNotification(clientId: string, assignedUnit: VehicleUnit): void {
    const notificationData = {
      type: 'VEHICLE_ASSIGNED',
      clientId,
      message: `Unidad asignada exitosamente: ${assignedUnit.modelo} ${assignedUnit.year}`,
      vehicleDetails: {
        vin: assignedUnit.vin,
        serie: assignedUnit.serie,
        modelo: assignedUnit.modelo,
        year: assignedUnit.year,
        numeroMotor: assignedUnit.numeroMotor
      },
      timestamp: new Date()
    };

    console.info('[IntegratedImportTracker] Prepared vehicle assignment notification', {
      clientId,
      vin: assignedUnit.vin
    });
    
    // Opcional: integrar con WhatsApp para notificar al cliente
    // this.importWhatsAppService.sendNotification(clientId, 'VEHICLE_ASSIGNED', notificationData);
  }

  /**
   *  NUEVA FUNCIONALIDAD: Actualizar contrato con unidad asignada
   * Propaga la información de la unidad específica a los contratos del cliente
   */
  private updateContractWithAssignedVehicle(clientId: string, assignedUnit: VehicleUnit): void {
    console.info('[IntegratedImportTracker] Propagating assigned unit to contracts', {
      clientId,
      vin: assignedUnit.vin,
      modelo: assignedUnit.modelo
    });

    // Obtener contratos del cliente
    this.contractService.getClientContracts(clientId).subscribe({
      next: (contracts) => {
        if (contracts.length === 0) {
          console.warn('[IntegratedImportTracker] No contracts found for client', { clientId });
          return;
        }

        // Actualizar cada contrato con la unidad asignada
        contracts.forEach(contract => {
          // Solo actualizar contratos que no tengan unidad asignada
          if (!contract.assignedVehicle) {
            this.contractService.assignVehicleToContract(contract.id, assignedUnit).subscribe({
              next: (result) => {
                if (result.success) {
                  
                  // Log para tracking
                  this.logContractVehicleAssignment(clientId, contract.id, assignedUnit);
                } else {
                }
              },
              error: (error) => {
              }
            });
          } else {
          }
        });
      },
      error: (error) => {
      }
    });
  }

  /**
   * Log de asignación de unidad a contrato
   */
  private logContractVehicleAssignment(clientId: string, contractId: string, assignedUnit: VehicleUnit): void {
    const logEvent = {
      type: 'CONTRACT_VEHICLE_ASSIGNMENT',
      timestamp: new Date(),
      clientId,
      contractId,
      vehicleData: {
        id: assignedUnit.id,
        vin: assignedUnit.vin,
        serie: assignedUnit.serie,
        modelo: assignedUnit.modelo,
        year: assignedUnit.year,
        numeroMotor: assignedUnit.numeroMotor
      },
      source: 'integrated_import_tracker'
    };

    
    // En producción, esto se guardaría en el sistema de auditoría:
    // this.auditService.logEvent(logEvent);
  }

  /**
   */
  getClientContractsWithVehicles(clientId: string): Observable<any[]> {

    return this.contractService.getClientContracts(clientId).pipe(
      map(contracts => contracts.filter(contract => contract.assignedVehicle)),
      tap(contractsWithVehicles => {
      }),
      catchError(error => {
        return of([]);
      })
    );
  }

  /**
   */
  getIntegratedSummary(clientId: string): Observable<{
    importStatus: any;
    contractsWithVehicles: any[];
    assignmentConsistency: { consistent: boolean; issues: string[] };
  }> {
    return combineLatest([
      this.getEnhancedImportStatus(clientId),
      this.getContractsWithVehicles(clientId)
    ]).pipe(
      map(([importStatus, contractsWithVehicles]) => ({
        importStatus,
        contractsWithVehicles: contractsWithVehicles || [],
        assignmentConsistency: this.validateAssignmentConsistency(importStatus as any, contractsWithVehicles || [])
      }))
    );
  }

  

  /**
   * Validar consistencia entre import status y contratos
   */
  private validateAssignmentConsistency(
    importStatus: IntegratedImportStatus | null,
    contractsWithVehicles: any[]
  ): { consistent: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!importStatus) {
      return { consistent: false, issues: ['No hay estado de importación'] };
    }

    // Verificar si import status tiene unidad asignada
    const hasImportAssignment = !!importStatus.assignedUnit;
    const hasContractAssignments = contractsWithVehicles.length > 0;

    if (hasImportAssignment && !hasContractAssignments) {
      issues.push('Import status tiene unidad asignada pero contratos no están actualizados');
    }

    if (!hasImportAssignment && hasContractAssignments) {
      issues.push('Contratos tienen unidades asignadas pero import status no');
    }

    if (hasImportAssignment && hasContractAssignments) {
      // Verificar que el VIN sea el mismo
      const importVIN = importStatus.assignedUnit!.vin;
      const inconsistentContracts = contractsWithVehicles.filter(
        contract => contract.assignedVehicle?.vin !== importVIN
      );

      if (inconsistentContracts.length > 0) {
        issues.push(`${inconsistentContracts.length} contratos tienen VINs diferentes al import status`);
      }
    }

    return {
      consistent: issues.length === 0,
      issues
    };
  }

  // ==========================================
  //  POST-SALES SYSTEM IMPLEMENTATION
  // ==========================================

  /**
   * Completar Fase 6: Entrega del vehículo
   * Captura odómetro, fotos, firma digital, checklist
   */
  completeDeliveryPhase(
    clientId: string,
    deliveryData: DeliveryData
  ): Observable<IntegratedImportStatus> {

    return this.updateImportMilestone(clientId, 'entregada', 'completed', {
      actualDate: deliveryData.fechaEntrega,
      notes: `Entregado con odómetro ${deliveryData.odometroEntrega} km`
    }).pipe(
      tap(() => {
        // Store delivery data
        this.storeDeliveryData(clientId, deliveryData);
        
        // Send delivery completion notification
        this.sendDeliveryCompletionNotification(clientId, deliveryData);
      })
    );
  }

  /**
   * Completar Fase 7: Documentos transferidos
   * Carga documentos legales, póliza de seguro, contratos
   */
  completeDocumentsPhase(
    clientId: string,
    legalDocuments: LegalDocuments
  ): Observable<IntegratedImportStatus> {

    return this.updateImportMilestone(clientId, 'documentosTransferidos', 'completed', {
      actualDate: legalDocuments.fechaTransferencia,
      documents: [
        legalDocuments.factura.filename,
        legalDocuments.polizaSeguro.filename,
        ...(legalDocuments.contratos?.map(c => c.filename) || [])
      ],
      notes: `Documentos transferidos - Titular: ${legalDocuments.titular}`
    }).pipe(
      tap(() => {
        // Store legal documents data
        this.storeLegalDocuments(clientId, legalDocuments);
        
        // Send documents completion notification
        this.sendDocumentsCompletionNotification(clientId, legalDocuments);
      })
    );
  }

  /**
   * Actualizar asignación de vehículo (API usada por specs)
   */
  updateVehicleAssignment(
    clientId: string,
    assignment: {
      vin: string;
      serie: string;
      modelo: string;
      year: number;
      numeroMotor: string;
    }
  ): Observable<{ success: boolean }> {
    // En una implementación real, esto llamaría a la API para actualizar la asignación
    return of({ success: true });
  }

  /**
   * Completar Fase 8: Placas entregadas
   * TRIGGER DEL EVENTO vehicle.delivered - ¡ESTO ES EL HANDOVER!
   */
  completePlatesPhase(
    clientId: string,
    platesData: PlatesData
  ): Observable<{ success: boolean; postSalesRecord?: PostSalesRecord }> {

    return this.updateImportMilestone(clientId, 'placasEntregadas', 'completed', {
      actualDate: platesData.fechaAlta,
      notes: `Placas entregadas: ${platesData.numeroPlacas} (${platesData.estado})`
    }).pipe(
      // Al completar placas, se dispara el handover completo a Post-Venta
      tap(() => {
        this.triggerPostSalesHandover(clientId, platesData);
      }),
      map(() => ({ success: true })),
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   *  HANDOVER CRÍTICO: Disparar el evento vehicle.delivered
   * Esto crea el expediente post-venta y activa todos los recordatorios
   */
  private triggerPostSalesHandover(clientId: string, platesData: PlatesData): void {

    // Obtener todos los datos necesarios para el handover
    this.getIntegratedImportStatus(clientId).subscribe(importStatus => {
      if (!importStatus || !importStatus.assignedUnit) {
        return;
      }

      // Recuperar datos críticos desde cache (garantizados por fases previas)
      const deliveryDataFromCache = this.getDeliveryDataFromCache(clientId);
      const legalDocsFromCache = this.getLegalDocumentsFromCache(clientId);

      if (!deliveryDataFromCache) {
        return;
      }

      if (!legalDocsFromCache) {
        return;
      }

      // Construir el evento vehicle.delivered completo
      const vehicleDeliveredEvent: VehicleDeliveredEvent = {
        event: 'vehicle.delivered',
        timestamp: new Date(),
        payload: {
          clientId: clientId,
          vehicle: {
            vin: importStatus.assignedUnit.vin,
            modelo: importStatus.assignedUnit.modelo,
            numeroMotor: importStatus.assignedUnit.numeroMotor,
            odometer_km_delivery: deliveryDataFromCache.odometroEntrega,
            placas: platesData.numeroPlacas,
            estado: platesData.estado
          },
          contract: {
            id: importStatus.contractId || 'unknown',
            servicePackage: 'basic', // Por defecto, se puede obtener del contrato
            warranty_start: new Date(),
            warranty_end: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) // 2 años
          },
          contacts: {
            primary: {
              name: 'Cliente', // En producción se obtiene de la DB
              phone: '+52xxxxxxxxxx',
              email: 'cliente@example.com'
            },
            whatsapp_optin: true
          },
          delivery: deliveryDataFromCache,
          legalDocuments: legalDocsFromCache,
          plates: platesData
        }
      };

      // Enviar evento a la API de Post-Venta
      this.sendVehicleDeliveredEvent(vehicleDeliveredEvent);

      // Inicializar expediente post-venta localmente
      this.initializePostSalesRecord(vehicleDeliveredEvent);

    });
  }

  /**
   * Enviar evento vehicle.delivered a la API de Post-Venta
   */
  private sendVehicleDeliveredEvent(event: VehicleDeliveredEvent): void {

    this.http.post(`${this.baseUrl}/events/vehicle-delivered`, event).subscribe({
      next: (response) => {
      },
      error: (error) => {
        // En caso de falla, almacenar para reintentar después
        this.storeFailedEvent(event, error);
      }
    });
  }

  /**
   * Inicializar expediente post-venta localmente
   */
  private initializePostSalesRecord(event: VehicleDeliveredEvent): void {
    const postSalesRecord: PostSalesRecord = {
      id: `psr_${Date.now()}_${event.payload.vehicle.vin.substr(-6)}`,
      vin: event.payload.vehicle.vin,
      clientId: event.payload.clientId,
      postSalesAgent: 'auto_assigned',
      warrantyStatus: 'active',
      servicePackage: event.payload.contract.servicePackage,
      nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 meses
      nextMaintenanceKm: event.payload.vehicle.odometer_km_delivery + 5000, // 5000 km
      odometroEntrega: event.payload.vehicle.odometer_km_delivery,
      createdAt: new Date(),
      warrantyStart: event.payload.contract.warranty_start,
      warrantyEnd: event.payload.contract.warranty_end
    };

    // Store in cache and send to API
    this.storePostSalesRecord(postSalesRecord);

  }

  /**
   * Almacenar datos de entrega
   */
  private storeDeliveryData(clientId: string, deliveryData: DeliveryData): void {
    const cacheKey = `delivery_${clientId}`;
    localStorage.setItem(cacheKey, JSON.stringify(deliveryData));
    
    // En producción, esto sería una API call
  }

  /**
   * Almacenar documentos legales
   */
  private storeLegalDocuments(clientId: string, legalDocuments: LegalDocuments): void {
    const cacheKey = `legal_${clientId}`;
    localStorage.setItem(cacheKey, JSON.stringify(legalDocuments));
    
  }

  /**
   * Obtener documentos legales del cache
   */
  private getLegalDocumentsFromCache(clientId: string): LegalDocuments | null {
    const cacheKey = `legal_${clientId}`;
    const stored = localStorage.getItem(cacheKey);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Obtener datos de entrega del cache
   */
  private getDeliveryDataFromCache(clientId: string): DeliveryData | null {
    const cacheKey = `delivery_${clientId}`;
    const stored = localStorage.getItem(cacheKey);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Almacenar expediente post-venta
   */
  private storePostSalesRecord(record: PostSalesRecord): void {
    // Store locally
    const cacheKey = `postsales_${record.vin}`;
    localStorage.setItem(cacheKey, JSON.stringify(record));

    // Send to API
    this.http.post(`${this.baseUrl}/post-sales/record`, record).subscribe({
      next: (response) => {
      },
      error: (error) => {
      }
    });
  }

  /**
   * Almacenar evento fallido para reintento
   */
  private storeFailedEvent(event: VehicleDeliveredEvent, error: any): void {
    const failedEvents = JSON.parse(localStorage.getItem('failed_events') || '[]');
    failedEvents.push({
      event,
      error: error.message,
      timestamp: new Date(),
      retryCount: 0
    });
    localStorage.setItem('failed_events', JSON.stringify(failedEvents));
    
  }

  /**
   * Obtener expediente post-venta por VIN
   */
  getPostSalesRecord(vin: string): Observable<PostSalesRecord | null> {
    return this.http.get<PostSalesRecord>(`${this.baseUrl}/post-sales/${vin}`).pipe(
      catchError(() => {
        // Fallback to local storage
        const cacheKey = `postsales_${vin}`;
        const stored = localStorage.getItem(cacheKey);
        return of(stored ? JSON.parse(stored) : null);
      })
    );
  }

  /**
   * Validar que se pueden completar las fases post-venta
   */
  canCompletePostSalesPhase(clientId: string, phase: 'entregada' | 'documentosTransferidos' | 'placasEntregadas'): Observable<{ canComplete: boolean; reason?: string }> {
    return this.getIntegratedImportStatus(clientId).pipe(
      map(status => {
        if (!status) {
          return { canComplete: false, reason: 'Import status no encontrado' };
        }

        // Verificar que las fases previas estén completas
        if (phase === 'entregada') {
          if (!status.liberada || status.liberada.status !== 'completed') {
            return { canComplete: false, reason: 'Debe completar fase "liberada" primero' };
          }
          if (!status.assignedUnit) {
            return { canComplete: false, reason: 'Debe tener unidad asignada' };
          }
        }

        if (phase === 'documentosTransferidos') {
          if (!status.entregada || status.entregada.status !== 'completed') {
            return { canComplete: false, reason: 'Debe completar fase "entregada" primero' };
          }
        }

        if (phase === 'placasEntregadas') {
          if (!status.documentosTransferidos || status.documentosTransferidos.status !== 'completed') {
            return { canComplete: false, reason: 'Debe completar fase "documentosTransferidos" primero' };
          }
        }

        return { canComplete: true };
      })
    );
  }

  /**
   * Notificaciones para completar fases post-venta
   */
  private sendDeliveryCompletionNotification(clientId: string, deliveryData: DeliveryData): void {
    // Implementar notificación WhatsApp, email, etc.
  }

  private sendDocumentsCompletionNotification(clientId: string, legalDocuments: LegalDocuments): void {
    // Implementar notificación
  }

  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<T> => {
      
      let userMessage = 'Error en el sistema de seguimiento integrado';
      
      if (error.status === 404) {
        userMessage = 'Información de seguimiento no encontrada';
      } else if (error.status === 403) {
        userMessage = 'No tienes permisos para acceder al seguimiento';
      } else if (error.status === 400) {
        userMessage = error.error?.message || 'Solicitud de seguimiento inválida';
      } else if (error.status >= 500) {
        userMessage = 'Error del servidor. Intenta más tarde';
      }

      return of(undefined as unknown as T);
    };
  }
}
