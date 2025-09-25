import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import {
  PostSalesRecord,
  PostSalesService,
  PostSalesContact,
  MaintenanceReminder,
  PostSalesRevenue,
  PostSalesSurveyResponse,
  VehicleDeliveredEvent,
  ServicePackage,
  ServiceType,
  ContactChannel,
  ContactPurpose
} from '../models/postventa';

declare global {
  interface Window {
    __BFF_BASE__?: string;
  }
}

/**
 * POST-SALES API SERVICE
 * Implementa todos los endpoints para el sistema post-venta
 * Conecta con FastAPI backend y Neon database
 */
@Injectable({
  providedIn: 'root'
})
export class PostSalesApiService {
  private http = inject(HttpClient);
  private baseUrl = (window as any).__BFF_BASE__ ?? '/api';

  // ==========================================
  // 🎯 CORE POST-SALES ENDPOINTS
  // ==========================================

  /**
   * POST /events/vehicle-delivered
   */
  sendVehicleDeliveredEvent(event: VehicleDeliveredEvent): Observable<{
    success: boolean;
    postSalesRecordId?: string;
    remindersCreated?: number;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      postSalesRecordId?: string;
      remindersCreated?: number;
      error?: string;
    }>(`${this.baseUrl}/events/vehicle-delivered`, event).pipe(
      catchError(() => of({ success: false, error: 'Error en evento de entrega' }))
    );
  }

  // ==========================================
  // 📊 POST-SALES RECORD MANAGEMENT
  // ==========================================

  /**
   * GET /post-sales/{vin}
   * Obtener expediente post-venta completo
   */
  getPostSalesRecord(vin: string): Observable<{
    record: any;
    services: PostSalesService[];
    contacts: PostSalesContact[];
    reminders: MaintenanceReminder[];
    revenue: PostSalesRevenue | null;
  } | null> {
    return this.http.get<{
      record: any;
      services: PostSalesService[];
      contacts: PostSalesContact[];
      reminders: MaintenanceReminder[];
      revenue: PostSalesRevenue | null;
    }>(`${this.baseUrl}/post-sales/${vin}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * GET /post-sales/client/{clientId}
   * Obtener todos los vehículos de un cliente
   */
  getClientPostSalesRecords(clientId: string): Observable<PostSalesRecord[]> {
    return this.http.get<PostSalesRecord[]>(`${this.baseUrl}/post-sales/client/${clientId}`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * PATCH /post-sales/{vin}
   * Actualizar expediente post-venta
   */
  updatePostSalesRecord(vin: string, updates: Partial<PostSalesRecord>): Observable<{
    success: boolean;
    record?: PostSalesRecord;
    error?: string;
  }> {
    return this.http.patch<{
      success: boolean;
      record?: PostSalesRecord;
      error?: string;
    }>(`${this.baseUrl}/post-sales/${vin}`, updates).pipe(
      catchError(() => of({ success: false, error: 'Error al actualizar expediente' }))
    );
  }

  // ==========================================
  // 🔧 SERVICE MANAGEMENT
  // ==========================================

  /**
   * POST /post-sales/{vin}/service
   * Registrar nuevo servicio (mantenimiento, reparación, garantía)
   */
  registerService(vin: string, serviceData: {
    serviceType: ServiceType;
    serviceDate: Date;
    odometroKm: number;
    descripcion: string;
    costo: number;
    tecnico: string;
    customerSatisfaction?: number;
    partesUsadas?: any[];
    tiempoServicio?: number;
    notas?: string;
    fotos?: string[];
  }): Observable<{
    success: boolean;
    service?: PostSalesService;
    nextMaintenance?: { date: Date; km: number };
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      service?: PostSalesService;
      nextMaintenance?: { date: Date; km: number };
      error?: string;
    }>(`${this.baseUrl}/post-sales/${vin}/service`, serviceData).pipe(
      catchError(() => of({ success: false, error: 'Error al registrar servicio' }))
    );
  }

  /**
   * GET /post-sales/{vin}/services
   * Obtener historial de servicios
   */
  getServiceHistory(vin: string, filters?: {
    serviceType?: ServiceType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Observable<PostSalesService[]> {
    let params = new HttpParams();
    if (filters?.serviceType) params = params.set('serviceType', filters.serviceType);
    if (filters?.startDate) params = params.set('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params = params.set('endDate', filters.endDate.toISOString());
    if (filters?.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<PostSalesService[]>(`${this.baseUrl}/post-sales/${vin}/services`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  // ==========================================
  // 📅 MAINTENANCE REMINDERS
  // ==========================================

  /**
   * GET /post-sales/{vin}/reminders
   * Obtener recordatorios de mantenimiento
   */
  getMaintenanceReminders(vin: string): Observable<MaintenanceReminder[]> {
    return this.http.get<MaintenanceReminder[]>(`${this.baseUrl}/post-sales/${vin}/reminders`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * POST /post-sales/{vin}/reminders/schedule
   * Programar recordatorio personalizado
   */
  scheduleMaintenanceReminder(vin: string, reminderData: {
    dueDate: Date;
    dueKm: number;
    serviceType: string;
  }): Observable<{
    success: boolean;
    reminder?: MaintenanceReminder;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      reminder?: MaintenanceReminder;
      error?: string;
    }>(`${this.baseUrl}/post-sales/${vin}/reminders/schedule`, reminderData).pipe(
      catchError(() => of({ success: false, error: 'Error al programar recordatorio' }))
    );
  }

  /**
   * GET /post-sales/reminders/upcoming
   * Obtener recordatorios próximos (global)
   */
  getUpcomingReminders(filters?: {
    urgencyLevel?: 'urgent' | 'soon' | 'scheduled';
    postSalesAgent?: string;
    limit?: number;
  }): Observable<{
    urgent: MaintenanceReminder[];
    soon: MaintenanceReminder[];
    scheduled: MaintenanceReminder[];
    total: number;
  }> {
    let params = new HttpParams();
    if (filters?.urgencyLevel) params = params.set('urgencyLevel', filters.urgencyLevel);
    if (filters?.postSalesAgent) params = params.set('postSalesAgent', filters.postSalesAgent);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<{
      urgent: MaintenanceReminder[];
      soon: MaintenanceReminder[];
      scheduled: MaintenanceReminder[];
      total: number;
    }>(`${this.baseUrl}/post-sales/reminders/upcoming`, { params }).pipe(
      catchError(() => of({ urgent: [], soon: [], scheduled: [], total: 0 }))
    );
  }

  // ==========================================
  // 📞 CONTACT & SURVEY MANAGEMENT
  // ==========================================

  /**
   * POST /surveys/send
   * Enviar encuesta al cliente
   */
  sendSurvey(data: {
    vin: string;
    clientId: string;
    surveyType: ContactPurpose;
    channel: ContactChannel;
    message?: string;
  }): Observable<{
    success: boolean;
    contactId?: string;
    estimatedDelivery?: Date;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      contactId?: string;
      estimatedDelivery?: Date;
      error?: string;
    }>(`${this.baseUrl}/surveys/send`, data).pipe(
      catchError(() => of({ success: false, error: 'Error al enviar encuesta' }))
    );
  }

  /**
   * POST /post-sales/{vin}/contact
   * Registrar contacto con cliente
   */
  registerContact(vin: string, contactData: {
    channel: ContactChannel;
    purpose: ContactPurpose;
    mensaje?: string;
    respuestaCliente?: string;
    notas?: string;
    programarSeguimiento?: Date;
  }): Observable<{
    success: boolean;
    contact?: PostSalesContact;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      contact?: PostSalesContact;
      error?: string;
    }>(`${this.baseUrl}/post-sales/${vin}/contact`, contactData).pipe(
      catchError(() => of({ success: false, error: 'Error al registrar contacto' }))
    );
  }

  /**
   * GET /post-sales/{vin}/contacts
   * Obtener historial de contactos
   */
  getContactHistory(vin: string, filters?: {
    purpose?: ContactPurpose;
    channel?: ContactChannel;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Observable<PostSalesContact[]> {
    let params = new HttpParams();
    if (filters?.purpose) params = params.set('purpose', filters.purpose);
    if (filters?.channel) params = params.set('channel', filters.channel);
    if (filters?.startDate) params = params.set('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params = params.set('endDate', filters.endDate.toISOString());
    if (filters?.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<PostSalesContact[]>(`${this.baseUrl}/post-sales/${vin}/contacts`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  // ==========================================
  // 📋 SURVEY RESPONSES
  // ==========================================

  /**
   * POST /surveys/{vin}/response
   * Procesar respuesta de encuesta
   */
  processSurveyResponse(vin: string, response: {
    surveyType: ContactPurpose;
    respuestas: { [pregunta: string]: string | number };
    nps?: number;
    csat?: number;
    comentarios?: string;
  }): Observable<{
    success: boolean;
    surveyResponse?: PostSalesSurveyResponse;
    followUpRequired?: boolean;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      surveyResponse?: PostSalesSurveyResponse;
      followUpRequired?: boolean;
      error?: string;
    }>(`${this.baseUrl}/surveys/${vin}/response`, response).pipe(
      catchError(() => of({ success: false, error: 'Error al procesar encuesta' }))
    );
  }

  /**
   * GET /surveys/analytics
   * Obtener analytics de encuestas
   */
  getSurveyAnalytics(filters?: {
    surveyType?: ContactPurpose;
    startDate?: Date;
    endDate?: Date;
    servicePackage?: ServicePackage;
  }): Observable<{
    averageNPS: number;
    averageCSAT: number;
    responseRate: number;
    totalResponses: number;
    satisfactionTrend: { month: string; nps: number; csat: number }[];
    topIssues: { issue: string; count: number }[];
  }> {
    let params = new HttpParams();
    if (filters?.surveyType) params = params.set('surveyType', filters.surveyType);
    if (filters?.startDate) params = params.set('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params = params.set('endDate', filters.endDate.toISOString());
    if (filters?.servicePackage) params = params.set('servicePackage', filters.servicePackage);

    return this.http.get<{
      averageNPS: number;
      averageCSAT: number;
      responseRate: number;
      totalResponses: number;
      satisfactionTrend: { month: string; nps: number; csat: number }[];
      topIssues: { issue: string; count: number }[];
    }>(`${this.baseUrl}/surveys/analytics`, { params }).pipe(
      catchError(() => of({
        averageNPS: 0,
        averageCSAT: 0,
        responseRate: 0,
        totalResponses: 0,
        satisfactionTrend: [],
        topIssues: []
      }))
    );
  }

  // ==========================================
  // 🎫 WARRANTY MANAGEMENT
  // ==========================================

  /**
   * POST /warranty/ticket
   * Crear ticket de garantía
   */
  createWarrantyTicket(data: {
    vin: string;
    clientId: string;
    descripcionFalla: string;
    fechaIncidente: Date;
    kilometraje: number;
    fotos?: string[];
    prioridad: 'low' | 'medium' | 'high' | 'critical';
  }): Observable<{
    success: boolean;
    ticketId?: string;
    estimatedResolution?: Date;
    odooOrderId?: string;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      ticketId?: string;
      estimatedResolution?: Date;
      odooOrderId?: string;
      error?: string;
    }>(`${this.baseUrl}/warranty/ticket`, data).pipe(
      catchError(() => of({ success: false, error: 'Error al crear ticket' }))
    );
  }

  /**
   * GET /warranty/{vin}/status
   * Obtener status de garantía
   */
  getWarrantyStatus(vin: string): Observable<{
    isActive: boolean;
    warrantyStart: Date;
    warrantyEnd: Date;
    remainingDays: number;
    coverageDetails: {
      engine: boolean;
      transmission: boolean;
      electrical: boolean;
      bodywork: boolean;
    };
    activeTickets: number;
    completedTickets: number;
  } | null> {
    return this.http.get<{
      isActive: boolean;
      warrantyStart: Date;
      warrantyEnd: Date;
      remainingDays: number;
      coverageDetails: {
        engine: boolean;
        transmission: boolean;
        electrical: boolean;
        bodywork: boolean;
      };
      activeTickets: number;
      completedTickets: number;
    }>(`${this.baseUrl}/warranty/${vin}/status`).pipe(
      catchError(() => of(null))
    );
  }

  // ==========================================
  // 💰 REVENUE & ANALYTICS
  // ==========================================

  /**
   * GET /post-sales/revenue/{vin}
   * Obtener análisis financiero de un vehículo
   */
  getVehicleRevenue(vin: string): Observable<PostSalesRevenue | null> {
    return this.http.get<PostSalesRevenue>(`${this.baseUrl}/post-sales/revenue/${vin}`).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * GET /post-sales/analytics/kpis
   * Obtener KPIs generales de post-venta
   */
  getPostSalesKPIs(filters?: {
    startDate?: Date;
    endDate?: Date;
    postSalesAgent?: string;
    servicePackage?: ServicePackage;
  }): Observable<{
    totalVehiclesDelivered: number;
    vehiclesUnderWarranty: number;
    premiumPackages: number;
    extendedPackages: number;
    overallSatisfaction: number;
    overdueMaintenances: number;
    monthlyServiceRevenue: { month: string; revenue: number }[];
    satisfactionTrend: { month: string; satisfaction: number }[];
    topServiceTypes: { type: ServiceType; count: number; revenue: number }[];
  }> {
    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params = params.set('endDate', filters.endDate.toISOString());
    if (filters?.postSalesAgent) params = params.set('postSalesAgent', filters.postSalesAgent);
    if (filters?.servicePackage) params = params.set('servicePackage', filters.servicePackage);

    return this.http.get<{
      totalVehiclesDelivered: number;
      vehiclesUnderWarranty: number;
      premiumPackages: number;
      extendedPackages: number;
      overallSatisfaction: number;
      overdueMaintenances: number;
      monthlyServiceRevenue: { month: string; revenue: number }[];
      satisfactionTrend: { month: string; satisfaction: number }[];
      topServiceTypes: { type: ServiceType; count: number; revenue: number }[];
    }>(`${this.baseUrl}/post-sales/analytics/kpis`, { params }).pipe(
      catchError(() => of({
        totalVehiclesDelivered: 0,
        vehiclesUnderWarranty: 0,
        premiumPackages: 0,
        extendedPackages: 0,
        overallSatisfaction: 0,
        overdueMaintenances: 0,
        monthlyServiceRevenue: [],
        satisfactionTrend: [],
        topServiceTypes: []
      }))
    );
  }

  /**
   * GET /post-sales/analytics/ltv
   * Análisis de Customer Lifetime Value
   */
  getLTVAnalytics(filters?: {
    servicePackage?: ServicePackage;
    clientSegment?: string;
    startDate?: Date;
    endDate?: Date;
  }): Observable<{
    averageLTV: number;
    topCustomers: { clientId: string; vin: string; ltv: number }[];
    ltvByPackage: { package: ServicePackage; averageLTV: number; count: number }[];
    projectedRevenue: { month: string; projected: number; actual: number }[];
  }> {
    let params = new HttpParams();
    if (filters?.servicePackage) params = params.set('servicePackage', filters.servicePackage);
    if (filters?.clientSegment) params = params.set('clientSegment', filters.clientSegment);
    if (filters?.startDate) params = params.set('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params = params.set('endDate', filters.endDate.toISOString());

    return this.http.get<{
      averageLTV: number;
      topCustomers: { clientId: string; vin: string; ltv: number }[];
      ltvByPackage: { package: ServicePackage; averageLTV: number; count: number }[];
      projectedRevenue: { month: string; projected: number; actual: number }[];
    }>(`${this.baseUrl}/post-sales/analytics/ltv`, { params }).pipe(
      catchError(() => of({
        averageLTV: 0,
        topCustomers: [],
        ltvByPackage: [],
        projectedRevenue: []
      }))
    );
  }

  // ==========================================
  // 📋 MAINTENANCE & CONTACT METHODS
  // ==========================================

  /**
   * POST /post-sales/schedule-service
   * Programar servicio de mantenimiento
   */
  scheduleMaintenanceService(request: {
    vin: string;
    serviceType: ServiceType;
    scheduledDate: Date;
    servicePackage: ServicePackage;
    notes?: string;
  }): Observable<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      serviceId?: string;
      error?: string;
    }>(`${this.baseUrl}/post-sales/schedule-service`, request).pipe(
      catchError(() => of({ success: false, error: 'Error al programar servicio' }))
    );
  }

  /**
   * POST /post-sales/contact
   * Registrar contacto con cliente
   */
  recordClientContact(contact: {
    vin: string;
    contactDate: Date;
    channel: ContactChannel;
    purpose: ContactPurpose;
    notes?: string;
    contactedBy: string;
    clientResponse?: string;
    nextContactDate?: Date;
  }): Observable<{
    success: boolean;
    contactId?: string;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      contactId?: string;
      error?: string;
    }>(`${this.baseUrl}/post-sales/contact`, contact).pipe(
      catchError(() => of({ success: false, error: 'Error al registrar contacto' }))
    );
  }

  // ==========================================
  // 🔄 UTILITY METHODS
  // ==========================================

  /**
   * GET /post-sales/health-check
   * Verificar status de la API post-venta
   */
  healthCheck(): Observable<{
    status: 'healthy' | 'degraded' | 'down';
    database: 'connected' | 'disconnected';
    externalIntegrations: {
      makeN8n: 'connected' | 'disconnected';
      odoo: 'connected' | 'disconnected';
      whatsapp: 'connected' | 'disconnected';
    };
    version: string;
    uptime: number;
  }> {
    return this.http.get<{
      status: 'healthy' | 'degraded' | 'down';
      database: 'connected' | 'disconnected';
      externalIntegrations: {
        makeN8n: 'connected' | 'disconnected';
        odoo: 'connected' | 'disconnected';
        whatsapp: 'connected' | 'disconnected';
      };
      version: string;
      uptime: number;
    }>(`${this.baseUrl}/post-sales/health-check`).pipe(
      catchError(() => of({
        status: 'down' as const,
        database: 'disconnected' as const,
        externalIntegrations: {
          makeN8n: 'disconnected' as const,
          odoo: 'disconnected' as const,
          whatsapp: 'disconnected' as const
        },
        version: 'unknown',
        uptime: 0
      }))
    );
  }

  // ==========================================
  // 🚨 ERROR HANDLING
  // ==========================================

  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<T> => {
      
      let userMessage = 'Error en el sistema de post-venta';
      
      if (error.status === 404) {
        userMessage = 'Registro post-venta no encontrado';
      } else if (error.status === 403) {
        userMessage = 'No tienes permisos para acceder a post-venta';
      } else if (error.status === 400) {
        userMessage = error.error?.message || 'Solicitud post-venta inválida';
      } else if (error.status >= 500) {
        userMessage = 'Error del servidor post-venta. Intenta más tarde';
      }

      // Return a safe fallback
      const fallback = {
        success: false,
        error: userMessage
      } as any;

      return of(fallback);
    };
  }
}
