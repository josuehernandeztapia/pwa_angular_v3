import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, map, catchError, tap } from 'rxjs';
import { WhatsappService } from './whatsapp.service';
import { IntegratedImportStatus, ImportMilestoneEvent } from './integrated-import-tracker.service';
import { Client, ImportStatus } from '../models/types';

declare global {
  interface Window {
    __BFF_BASE__?: string;
  }
}

/**
 * Servicio especializado para notificaciones WhatsApp en milestones de importación
 * Integra con el sistema de triggers automáticos y seguimiento de importaciones
 */

export interface ImportMilestoneNotificationTemplate {
  client_name: string;
  milestone_name: string;
  milestone_description: string;
  vehicle_type: string;
  estimated_days?: number;
  estimated_date?: string;
  current_status: string;
  delivery_order_id?: string;
  tracking_url: string;
  advisor_name: string;
  advisor_phone: string;
}

export interface ImportNotificationSettings {
  clientId: string;
  phoneNumber: string;
  
  // Configuración de notificaciones por milestone
  milestones: {
    [K in keyof ImportStatus]?: {
      onStart: boolean;
      onCompletion: boolean;
      onDelay: boolean;
    };
  };
  
  // Configuración general
  language: 'es_MX' | 'es_ES' | 'en_US';
  timezone: string;
  notificationHours: {
    start: number; // 8 = 8:00 AM
    end: number;   // 20 = 8:00 PM
  };
  
  // Estado
  isActive: boolean;
  lastNotificationSent?: Date;
}

export interface NotificationResult {
  messageId: string;
  clientId: string;
  phoneNumber: string;
  milestone: keyof ImportStatus;
  notificationType: 'milestone_start' | 'milestone_completed' | 'milestone_delayed' | 'delivery_update';
  templateUsed: string;
  sentAt: Date;
  success: boolean;
  errorMessage?: string;
  whatsappResponse?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ImportWhatsAppNotificationsService {
  private http = inject(HttpClient);
  private whatsappService = inject(WhatsappService);
  private baseUrl = (window as any).__BFF_BASE__ ?? '/api';

  // Templates pre-configurados para diferentes milestones
  private milestoneTemplates: { [K in keyof ImportStatus]: any } = {
    pedidoPlanta: {
      name: 'import_milestone_factory_order',
      title: '📋 Pedido Enviado a Planta',
      description: 'Tu vagoneta ha sido solicitada a la planta manufacturera'
    },
    unidadFabricada: {
      name: 'import_milestone_unit_manufactured',
      title: '🏭 Unidad Fabricada',
      description: 'Tu vagoneta ha sido fabricada y está lista para envío'
    },
    transitoMaritimo: {
      name: 'import_milestone_maritime_transit',
      title: '🚢 En Tránsito Marítimo',
      description: 'Tu vagoneta está navegando hacia México'
    },
    enAduana: {
      name: 'import_milestone_in_customs',
      title: '🛃 En Proceso Aduanal',
      description: 'Tu vagoneta está siendo procesada en aduana'
    },
    liberada: {
      name: 'import_milestone_customs_released',
      title: '✅ Liberada de Aduana',
      description: 'Tu vagoneta ha sido liberada y está lista para entrega'
    }
  };

  constructor() {}

  /**
   * Enviar notificación automática cuando cambia un milestone
   */
  sendMilestoneNotification(
    clientId: string,
    milestone: keyof ImportStatus,
    status: 'in_progress' | 'completed' | 'delayed',
    importStatus: IntegratedImportStatus,
    clientData?: Partial<Client>
  ): Observable<NotificationResult> {
    
    console.log(`📱 Enviando notificación de milestone ${milestone} (${status}) para cliente ${clientId}`);

    return this.getNotificationSettings(clientId).pipe(
      map(settings => {
        if (!settings || !settings.isActive) {
          throw new Error('Notificaciones desactivadas para este cliente');
        }

        if (!this.shouldSendNotification(settings, milestone, status)) {
          throw new Error('Notificación filtrada por configuración del cliente');
        }

        return settings;
      }),
      map(settings => this.buildNotificationTemplate(
        settings,
        milestone,
        status,
        importStatus,
        clientData
      )),
      map(template => this.selectWhatsAppTemplate(milestone, status, template)),
      // Send and unwrap response
      // Note: sendTemplateMessage returns Observable<WhatsAppResponse>
      // We will subscribe via map since we are inside Rx chain
      // but ensure the type is WhatsAppResponse for property access
      switchMap(({ templateName, templateData }) => 
        this.whatsappService.sendTemplateMessage(
          templateData.client_phone,
          templateName,
          templateData.language || 'es_MX',
          this.buildWhatsAppComponents(templateData)
        )
      ),
      map((whatsappResponse: any) => {
        const result: NotificationResult = {
          messageId: whatsappResponse.messages?.[0]?.id || 'unknown',
          clientId,
          phoneNumber: clientData?.phone || 'unknown',
          milestone,
          notificationType: this.getNotificationType(status),
          templateUsed: this.milestoneTemplates[milestone].name,
          sentAt: new Date(),
          success: true,
          whatsappResponse
        };

        // Registrar la notificación enviada
        this.logNotificationSent(result).subscribe();

        return result;
      }),
      catchError(error => {
        console.error(`❌ Error enviando notificación de milestone:`, error);
        
        const result: NotificationResult = {
          messageId: 'failed',
          clientId,
          phoneNumber: clientData?.phone || 'unknown',
          milestone,
          notificationType: this.getNotificationType(status),
          templateUsed: this.milestoneTemplates[milestone].name,
          sentAt: new Date(),
          success: false,
          errorMessage: error.message || 'Error desconocido'
        };

        return of(result);
      })
    );
  }

  /**
   * Enviar notificación de actualización de entrega
   */
  sendDeliveryUpdateNotification(
    clientId: string,
    deliveryOrderId: string,
    updateType: 'order_created' | 'status_changed' | 'delay_alert' | 'ready_for_pickup',
    metadata?: any
  ): Observable<NotificationResult> {
    
    console.log(`📦 Enviando notificación de delivery ${updateType} para cliente ${clientId}`);

    return this.getNotificationSettings(clientId).pipe(
      map(settings => {
        if (!settings || !settings.isActive) {
          throw new Error('Notificaciones desactivadas para este cliente');
        }
        return settings;
      }),
      map(settings => {
        const templateData = {
          client_name: metadata?.clientName || 'Cliente',
          client_phone: settings.phoneNumber,
          delivery_order_id: deliveryOrderId,
          update_type: updateType,
          message: this.getDeliveryUpdateMessage(updateType, metadata),
          tracking_url: `${window.location.origin}/tracking/client/${clientId}`,
          language: settings.language || 'es_MX'
        };

        return { templateData, settings };
      }),
      switchMap(({ templateData }) => 
        this.whatsappService.sendTemplateMessage(
          templateData.client_phone,
          'delivery_update_notification',
          templateData.language,
          [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: templateData.client_name },
                { type: 'text', text: templateData.delivery_order_id },
                { type: 'text', text: templateData.message }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [
                { type: 'text', text: templateData.tracking_url }
              ]
            }
          ]
        )
      ),
      map((whatsappResponse: any) => {
        const result: NotificationResult = {
          messageId: whatsappResponse.messages?.[0]?.id || 'unknown',
          clientId,
          phoneNumber: metadata?.clientPhone || 'unknown',
          milestone: 'liberada', // Default para delivery updates
          notificationType: 'delivery_update',
          templateUsed: 'delivery_update_notification',
          sentAt: new Date(),
          success: true,
          whatsappResponse
        };

        this.logNotificationSent(result).subscribe();
        return result;
      }),
      catchError(error => {
        console.error(`❌ Error enviando notificación de delivery:`, error);
        
        return of({
          messageId: 'failed',
          clientId,
          phoneNumber: metadata?.clientPhone || 'unknown',
          milestone: 'liberada' as keyof ImportStatus,
          notificationType: 'delivery_update' as const,
          templateUsed: 'delivery_update_notification',
          sentAt: new Date(),
          success: false,
          errorMessage: error.message || 'Error desconocido'
        });
      })
    );
  }

  /**
   * Configurar notificaciones para un cliente
   */
  updateNotificationSettings(
    clientId: string, 
    settings: Partial<ImportNotificationSettings>
  ): Observable<ImportNotificationSettings> {
    
    return this.http.patch<ImportNotificationSettings>(
      `${this.baseUrl}/v1/clients/${clientId}/import-notification-settings`,
      settings
    ).pipe(
      tap(updatedSettings => {
        console.log(`⚙️ Configuración de notificaciones actualizada para cliente ${clientId}`);
      }),
      catchError(() => of(this.getDefaultNotificationSettings(clientId)))
    );
  }

  /**
   * Obtener configuración de notificaciones de un cliente
   */
  getNotificationSettings(clientId: string): Observable<ImportNotificationSettings> {
    return this.http.get<ImportNotificationSettings>(
      `${this.baseUrl}/v1/clients/${clientId}/import-notification-settings`
    ).pipe(
      catchError(() => {
        // Si no existe configuración, devolver configuración por defecto
        return of(this.getDefaultNotificationSettings(clientId));
      })
    );
  }

  /**
   * Obtener historial de notificaciones enviadas
   */
  getNotificationHistory(
    clientId: string, 
    limit = 50
  ): Observable<NotificationResult[]> {
    
    return this.http.get<NotificationResult[]>(
      `${this.baseUrl}/v1/clients/${clientId}/import-notifications`,
      { params: { limit: limit.toString() } }
    ).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Enviar notificaciones masivas por milestone
   */
  sendBulkMilestoneNotifications(
    milestone: keyof ImportStatus,
    clientIds: string[],
    status: 'in_progress' | 'completed' | 'delayed'
  ): Observable<NotificationResult[]> {
    
    console.log(`📢 Enviando notificaciones masivas de ${milestone} (${status}) a ${clientIds.length} clientes`);

    const notificationPromises = clientIds.map(clientId => 
      this.sendMilestoneNotification(clientId, milestone, status, {} as any).toPromise()
    );

    return forkJoin(notificationPromises).pipe(
      map(results => results.filter(r => r !== null) as NotificationResult[]),
      tap(results => {
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        console.log(`📊 Notificaciones masivas completadas: ${successful} exitosas, ${failed} fallidas`);
      }),
      catchError(error => {
        console.error('Error en notificaciones masivas:', error);
        return of([]);
      })
    );
  }

  // === MÉTODOS PRIVADOS ===

  private getDefaultNotificationSettings(clientId: string): ImportNotificationSettings {
    return {
      clientId,
      phoneNumber: '',
      milestones: {
        pedidoPlanta: { onStart: true, onCompletion: true, onDelay: true },
        unidadFabricada: { onStart: true, onCompletion: true, onDelay: true },
        transitoMaritimo: { onStart: true, onCompletion: true, onDelay: true },
        enAduana: { onStart: true, onCompletion: true, onDelay: true },
        liberada: { onStart: true, onCompletion: true, onDelay: false }
      },
      language: 'es_MX',
      timezone: 'America/Mexico_City',
      notificationHours: { start: 8, end: 20 },
      isActive: true
    };
  }

  private shouldSendNotification(
    settings: ImportNotificationSettings,
    milestone: keyof ImportStatus,
    status: 'in_progress' | 'completed' | 'delayed'
  ): boolean {
    
    const milestoneSettings = settings.milestones[milestone];
    if (!milestoneSettings) return false;

    // Verificar si el tipo de notificación está habilitado
    if (status === 'in_progress' && !milestoneSettings.onStart) return false;
    if (status === 'completed' && !milestoneSettings.onCompletion) return false;
    if (status === 'delayed' && !milestoneSettings.onDelay) return false;

    // Verificar horario permitido
    const now = new Date();
    const hour = now.getHours();
    if (hour < settings.notificationHours.start || hour > settings.notificationHours.end) {
      return false;
    }

    return true;
  }

  private buildNotificationTemplate(
    settings: ImportNotificationSettings,
    milestone: keyof ImportStatus,
    status: 'in_progress' | 'completed' | 'delayed',
    importStatus: IntegratedImportStatus,
    clientData?: Partial<Client>
  ): ImportMilestoneNotificationTemplate {
    
    const milestoneConfig = this.milestoneTemplates[milestone];
    const statusText = status === 'in_progress' ? 'En Progreso' : 
                      status === 'completed' ? 'Completado' : 'Con Retraso';

    return {
      client_name: clientData?.name || 'Cliente',
      milestone_name: milestoneConfig.title,
      milestone_description: milestoneConfig.description,
      vehicle_type: 'Vagoneta H6C', // En implementación real vendría de los datos del cliente
      estimated_days: (importStatus as any)?.[milestone]?.estimatedDays,
      estimated_date: importStatus?.estimatedDeliveryDate?.toLocaleDateString('es-MX'),
      current_status: statusText,
      delivery_order_id: importStatus?.deliveryOrderId,
      tracking_url: `${window.location.origin}/tracking/client/${settings.clientId}`,
      advisor_name: 'Tu Asesor', // En implementación real vendría de los datos del asesor
      advisor_phone: '+52 55 1234-5678'
    };
  }

  private selectWhatsAppTemplate(
    milestone: keyof ImportStatus,
    status: 'in_progress' | 'completed' | 'delayed',
    templateData: ImportMilestoneNotificationTemplate
  ): { templateName: string; templateData: any } {
    
    const milestoneConfig = this.milestoneTemplates[milestone];
    const templateName = status === 'delayed' ? 
      `${milestoneConfig.name}_delayed` : 
      milestoneConfig.name;

    return {
      templateName,
      templateData: {
        ...templateData,
        client_phone: templateData.tracking_url, // Se ajustará en implementación real
        language: 'es_MX'
      }
    };
  }

  private buildWhatsAppComponents(templateData: any): any[] {
    return [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: templateData.client_name },
          { type: 'text', text: templateData.milestone_name },
          { type: 'text', text: templateData.milestone_description },
          { type: 'text', text: templateData.current_status }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          { type: 'text', text: templateData.tracking_url }
        ]
      }
    ];
  }

  private getNotificationType(status: string): 'milestone_start' | 'milestone_completed' | 'milestone_delayed' | 'delivery_update' {
    switch (status) {
      case 'in_progress': return 'milestone_start';
      case 'completed': return 'milestone_completed';
      case 'delayed': return 'milestone_delayed';
      default: return 'delivery_update';
    }
  }

  private getDeliveryUpdateMessage(updateType: string, metadata?: any): string {
    const messages = {
      order_created: 'Tu orden de entrega ha sido creada y el proceso de importación ha iniciado.',
      status_changed: `El estado de tu orden ha cambiado a: ${metadata?.newStatus || 'actualizado'}.`,
      delay_alert: `Se ha detectado un retraso en tu entrega. Tiempo estimado adicional: ${metadata?.delayDays || 'por determinar'} días.`,
      ready_for_pickup: 'Tu vagoneta está lista para entrega. Por favor contacta a tu asesor para coordinar la entrega.'
    };
    
    return messages[updateType as keyof typeof messages] || 'Tu entrega ha sido actualizada.';
  }

  private logNotificationSent(result: NotificationResult): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/v1/import-notifications/log`,
      result
    ).pipe(
      catchError(() => of())
    );
  }

  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<T> => {
      console.error(`ImportWhatsAppNotificationsService.${operation} failed:`, error);
      
      let userMessage = 'Error en el sistema de notificaciones de importación';
      
      if (error.status === 404) {
        userMessage = 'Configuración de notificaciones no encontrada';
      } else if (error.status === 403) {
        userMessage = 'No tienes permisos para gestionar notificaciones';
      } else if (error.status === 400) {
        userMessage = error.error?.message || 'Solicitud de notificación inválida';
      } else if (error.status >= 500) {
        userMessage = 'Error del servidor. Intenta más tarde';
      }

      throw ({
        operation,
        originalError: error,
        userMessage,
        timestamp: new Date().toISOString()
      });
    };
  }
}