import { Injectable } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Client, BusinessFlow, EventType, Market, Document } from '../models/types';

export interface NextBestAction {
  id: string;
  type: 'contact' | 'document' | 'payment' | 'opportunity' | 'system';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  clientId?: string;
  clientName?: string;
  actionUrl?: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  timeToComplete: number; // in minutes
  businessValue: number; // estimated value in MXN
  confidence: number; // AI confidence 0-100
  dueDate?: Date;
  category: string;
  tags: string[];
  metadata?: any;
}

export interface ActionInsights {
  totalActions: number;
  criticalActions: number;
  totalBusinessValue: number;
  topCategory: string;
  recommendedFocus: string;
  timeAllocation: { category: string; minutes: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class NextBestActionService {

  constructor(private apiService: ApiService) {}

  /**
   * Generate AI-powered next best actions based on current business state
   */
  generateNextBestActions(): Observable<NextBestAction[]> {
    return combineLatest([
      this.apiService.getClients(),
      this.apiService.checkHealth()
    ]).pipe(
      map(([clients, systemHealth]) => {
        const actions: NextBestAction[] = [];
        const now = new Date();

        // 1. PAYMENT-RELATED ACTIONS (Highest Business Impact)
        this.generatePaymentActions(clients, actions, now);

        // 2. DOCUMENT-RELATED ACTIONS (Compliance & Process)
        this.generateDocumentActions(clients, actions, now);

        // 3. OPPORTUNITY-RELATED ACTIONS (Growth & Sales)
        this.generateOpportunityActions(clients, actions, now);

        // 4. CLIENT ENGAGEMENT ACTIONS (Retention & Service)
        this.generateEngagementActions(clients, actions, now);

        // 5. SYSTEM & OPERATIONAL ACTIONS (Efficiency)
        this.generateSystemActions(clients, actions, now, systemHealth);

        // Sort by priority and business value
        return actions
          .sort((a, b) => {
            const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return b.businessValue - a.businessValue;
          })
          .slice(0, 20); // Return top 20 actions
      }),
      delay(800) // Simulate AI processing time
    );
  }

  private generatePaymentActions(clients: Client[], actions: NextBestAction[], now: Date): void {
    clients.forEach(client => {
      if (client.flow !== BusinessFlow.VentaPlazo) return;

      const daysSinceLastPayment = client.lastPayment
        ? Math.floor((now.getTime() - client.lastPayment.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Critical: Overdue payments > 45 days
      if (daysSinceLastPayment > 45) {
        actions.push({
          id: `payment-critical-${client.id}`,
          type: 'payment',
          priority: 'critical',
          title: 'Pago Crítico Vencido',
          description: `${client.name} tiene ${daysSinceLastPayment} días sin pagar. Riesgo de incumplimiento alto.`,
          clientId: client.id,
          clientName: client.name,
          actionUrl: `/clientes/${client.id}`,
          estimatedImpact: 'high',
          timeToComplete: 15,
          businessValue: client.paymentPlan?.monthlyGoal || 25000,
          confidence: 95,
          dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
          category: 'Cobranza',
          tags: ['Urgente', 'Riesgo Alto', 'Cobranza'],
          metadata: { daysSinceLastPayment, riskLevel: 'high' }
        });
      }
      // High: Payments 30-45 days overdue
      else if (daysSinceLastPayment > 30) {
        actions.push({
          id: `payment-overdue-${client.id}`,
          type: 'payment',
          priority: 'high',
          title: 'Seguimiento de Pago',
          description: `${client.name} requiere seguimiento de pago (${daysSinceLastPayment} días).`,
          clientId: client.id,
          clientName: client.name,
          actionUrl: `/clientes/${client.id}`,
          estimatedImpact: 'high',
          timeToComplete: 10,
          businessValue: (client.paymentPlan?.monthlyGoal || 25000) * 0.8,
          confidence: 85,
          dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
          category: 'Cobranza',
          tags: ['Seguimiento', 'Cobranza'],
          metadata: { daysSinceLastPayment, riskLevel: 'medium' }
        });
      }
    });
  }

  private generateDocumentActions(clients: Client[], actions: NextBestAction[], now: Date): void {
    clients.forEach(client => {
      const pendingDocs = client.documents.filter(doc => doc.status === 'Pendiente');
      const rejectedDocs = client.documents.filter(doc => doc.status === 'Rechazado');

      // Critical: Rejected documents blocking process
      if (rejectedDocs.length > 0) {
        actions.push({
          id: `docs-rejected-${client.id}`,
          type: 'document',
          priority: 'critical',
          title: 'Documentos Rechazados',
          description: `${client.name} tiene ${rejectedDocs.length} documento(s) rechazado(s) que bloquean el proceso.`,
          clientId: client.id,
          clientName: client.name,
          actionUrl: `/expedientes`,
          estimatedImpact: 'high',
          timeToComplete: 20,
          businessValue: this.calculateClientValue(client) * 0.9,
          confidence: 90,
          dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          category: 'Documentación',
          tags: ['Documentos', 'Rechazado', 'Proceso Bloqueado'],
          metadata: { rejectedDocs: rejectedDocs.length }
        });
      }

      // High: Many pending documents
      if (pendingDocs.length >= 3) {
        actions.push({
          id: `docs-pending-${client.id}`,
          type: 'document',
          priority: 'high',
          title: 'Documentos Pendientes',
          description: `${client.name} tiene ${pendingDocs.length} documentos pendientes por revisar.`,
          clientId: client.id,
          clientName: client.name,
          actionUrl: `/expedientes`,
          estimatedImpact: 'medium',
          timeToComplete: 15,
          businessValue: this.calculateClientValue(client) * 0.6,
          confidence: 75,
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          category: 'Documentación',
          tags: ['Documentos', 'Revisión Pendiente'],
          metadata: { pendingDocs: pendingDocs.length }
        });
      }

      // EdoMex specific: Ecosystem validation
      if (client.market === 'edomex' && client.ecosystemId) {
        const hasEcosystemDocs = client.documents.some(doc => 
          doc.name.includes('Acta Constitutiva') && doc.status === 'Aprobado'
        );
        
        if (!hasEcosystemDocs) {
          actions.push({
            id: `ecosystem-validation-${client.id}`,
            type: 'document',
            priority: 'high',
            title: 'Validación de Ecosistema',
            description: `${client.name} requiere validación de documentos de ecosistema para EdoMex.`,
            clientId: client.id,
            clientName: client.name,
            actionUrl: `/expedientes`,
            estimatedImpact: 'high',
            timeToComplete: 25,
            businessValue: this.calculateClientValue(client),
            confidence: 80,
            dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            category: 'Ecosistema',
            tags: ['EdoMex', 'Ecosistema', 'Validación'],
            metadata: { market: 'edomex', needsEcosystem: true }
          });
        }
      }
    });
  }

  private generateOpportunityActions(clients: Client[], actions: NextBestAction[], now: Date): void {
    // New client opportunities (high potential)
    const newClients = clients.filter(client => {
      const daysSinceCreated = (now.getTime() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated <= 7 && client.status === 'Activo';
    });

    newClients.forEach(client => {
      actions.push({
        id: `opportunity-new-${client.id}`,
        type: 'opportunity',
        priority: 'high',
        title: 'Cliente Reciente - Oportunidad de Seguimiento',
        description: `${client.name} es un cliente nuevo con alto potencial de conversión.`,
        clientId: client.id,
        clientName: client.name,
        actionUrl: `/clientes/${client.id}`,
        estimatedImpact: 'high',
        timeToComplete: 10,
        businessValue: this.calculateClientValue(client) * 1.2, // Higher potential
        confidence: 70,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        category: 'Oportunidades',
        tags: ['Nuevo Cliente', 'Alto Potencial', 'Seguimiento'],
        metadata: { isNewClient: true, daysSinceCreated: Math.floor((now.getTime() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24)) }
      });
    });

    // Collective credit opportunities
    const collectiveClients = clients.filter(client => client.flow === BusinessFlow.CreditoColectivo);
    if (collectiveClients.length >= 3 && collectiveClients.length < 5) {
      actions.push({
        id: 'opportunity-collective-group',
        type: 'opportunity',
        priority: 'medium',
        title: 'Grupo de Crédito Colectivo Casi Completo',
        description: `Tienes ${collectiveClients.length} clientes para crédito colectivo. Faltan ${5 - collectiveClients.length} para completar grupo.`,
        actionUrl: '/oportunidades',
        estimatedImpact: 'high',
        timeToComplete: 30,
        businessValue: 937000 * (5 - collectiveClients.length), // Value of missing members
        confidence: 65,
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        category: 'Oportunidades',
        tags: ['Crédito Colectivo', 'Grupo Incompleto', 'EdoMex'],
        metadata: { currentMembers: collectiveClients.length, targetMembers: 5 }
      });
    }

    // Cross-sell opportunities
    const agsClients = clients.filter(client => client.market === 'aguascalientes' && client.flow === BusinessFlow.VentaPlazo);
    agsClients.forEach(client => {
      const daysSinceCreated = (now.getTime() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated > 180 && !client.documents.some(d => d.name.includes('Ahorro'))) { // 6 months+
        actions.push({
          id: `cross-sell-ahorro-${client.id}`,
          type: 'opportunity',
          priority: 'medium',
          title: 'Oportunidad de Cross-sell: Plan de Ahorro',
          description: `${client.name} es candidato ideal para Plan de Ahorro.`,
          clientId: client.id,
          clientName: client.name,
          actionUrl: `/clientes/${client.id}`,
          estimatedImpact: 'medium',
          timeToComplete: 20,
          businessValue: 600000, // Ahorro programado average
          confidence: 45,
          dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          category: 'Cross-sell',
          tags: ['Cross-sell', 'Plan Ahorro', 'Cliente Establecido'],
          metadata: { currentFlow: client.flow, suggestedFlow: 'AhorroProgramado' }
        });
      }
    });
  }

  private generateEngagementActions(clients: Client[], actions: NextBestAction[], now: Date): void {
    clients.forEach(client => {
      const daysSinceLastActivity = client.lastModified
        ? Math.floor((now.getTime() - client.lastModified.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Medium: Long inactive clients
      if (daysSinceLastActivity > 30 && client.status === 'Activo') {
        actions.push({
          id: `engagement-inactive-${client.id}`,
          type: 'contact',
          priority: 'medium',
          title: 'Cliente Inactivo - Reactivación',
          description: `${client.name} no ha tenido actividad en ${daysSinceLastActivity} días.`,
          clientId: client.id,
          clientName: client.name,
          actionUrl: `/clientes/${client.id}`,
          estimatedImpact: 'medium',
          timeToComplete: 8,
          businessValue: this.calculateClientValue(client) * 0.3,
          confidence: 55,
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          category: 'Reactivación',
          tags: ['Cliente Inactivo', 'Reactivación', 'Seguimiento'],
          metadata: { daysSinceLastActivity, riskOfChurn: daysSinceLastActivity > 60 }
        });
      }

      // Birthday/Anniversary actions
      const monthsSinceCreated = Math.floor((now.getTime() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
      if (monthsSinceCreated === 12 || monthsSinceCreated === 24) { // 1 or 2 year anniversary
        actions.push({
          id: `anniversary-${client.id}`,
          type: 'contact',
          priority: 'low',
          title: `Aniversario de Cliente - ${monthsSinceCreated === 12 ? '1 año' : '2 años'}`,
          description: `${client.name} cumple ${monthsSinceCreated === 12 ? '1 año' : '2 años'} como cliente. Oportunidad de reconocimiento.`,
          clientId: client.id,
          clientName: client.name,
          actionUrl: `/clientes/${client.id}`,
          estimatedImpact: 'low',
          timeToComplete: 5,
          businessValue: 0, // Relationship value
          confidence: 30,
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          category: 'Relaciones',
          tags: ['Aniversario', 'Reconocimiento', 'Fidelización'],
          metadata: { anniversaryYears: monthsSinceCreated / 12 }
        });
      }
    });
  }

  private generateSystemActions(clients: Client[], actions: NextBestAction[], now: Date, systemHealth: boolean): void {
    // Data quality actions
    const incompleteClients = clients.filter(client => !client.phone || !client.email);
    if (incompleteClients.length > 0) {
      actions.push({
        id: 'system-data-quality',
        type: 'system',
        priority: 'medium',
        title: 'Mejorar Calidad de Datos',
        description: `${incompleteClients.length} clientes tienen datos incompletos (teléfono/email faltante).`,
        actionUrl: '/clientes',
        estimatedImpact: 'medium',
        timeToComplete: 45,
        businessValue: 0, // Process improvement
        confidence: 80,
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        category: 'Calidad de Datos',
        tags: ['Datos Incompletos', 'Proceso', 'Mejora'],
        metadata: { incompleteClients: incompleteClients.length }
      });
    }

    // Report generation
    const isMonthEnd = now.getDate() >= 28;
    if (isMonthEnd) {
      actions.push({
        id: 'system-monthly-report',
        type: 'system',
        priority: 'medium',
        title: 'Generar Reporte Mensual',
        description: 'Es tiempo de generar el reporte mensual de ventas y cobranza.',
        actionUrl: '/reportes',
        estimatedImpact: 'low',
        timeToComplete: 30,
        businessValue: 0, // Administrative value
        confidence: 90,
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5), // 5th of next month
        category: 'Reportes',
        tags: ['Reporte Mensual', 'Administración'],
        metadata: { month: now.getMonth() + 1, year: now.getFullYear() }
      });
    }

    // Performance optimization
    if (clients.length > 50) {
      actions.push({
        id: 'system-performance',
        type: 'system',
        priority: 'low',
        title: 'Optimización de Performance',
        description: 'Con más de 50 clientes, considera optimizar consultas y rendimiento.',
        actionUrl: '/dashboard',
        estimatedImpact: 'low',
        timeToComplete: 60,
        businessValue: 0, // System improvement
        confidence: 40,
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        category: 'Sistema',
        tags: ['Performance', 'Optimización', 'Escalabilidad'],
        metadata: { clientCount: clients.length }
      });
    }
  }

  private calculateClientValue(client: Client): number {
    const baseValues = {
      [BusinessFlow.VentaPlazo]: client.market === 'aguascalientes' ? 853000 : 937000,
      [BusinessFlow.VentaDirecta]: client.market === 'aguascalientes' ? 853000 : 837000,
      [BusinessFlow.AhorroProgramado]: 600000,
      [BusinessFlow.CreditoColectivo]: 937000
    };
    
    return baseValues[client.flow] || 800000;
  }

  /**
   * Get insights and analytics about recommended actions
   */
  getActionInsights(actions: NextBestAction[]): ActionInsights {
    const categories = actions.reduce((acc, action) => {
      acc[action.category] = (acc[action.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const topCategory = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'General';

    const timeAllocation = Object.entries(
      actions.reduce((acc, action) => {
        acc[action.category] = (acc[action.category] || 0) + action.timeToComplete;
        return acc;
      }, {} as { [key: string]: number })
    ).map(([category, minutes]) => ({ category, minutes }))
     .sort((a, b) => b.minutes - a.minutes)
     .slice(0, 5);

    return {
      totalActions: actions.length,
      criticalActions: actions.filter(a => a.priority === 'critical').length,
      totalBusinessValue: actions.reduce((sum, a) => sum + a.businessValue, 0),
      topCategory,
      recommendedFocus: this.getRecommendedFocus(actions),
      timeAllocation
    };
  }

  private getRecommendedFocus(actions: NextBestAction[]): string {
    const criticalActions = actions.filter(a => a.priority === 'critical').length;
    const paymentActions = actions.filter(a => a.type === 'payment').length;
    const opportunityActions = actions.filter(a => a.type === 'opportunity').length;

    if (criticalActions > 3) return 'Resolver acciones críticas urgentemente';
    if (paymentActions > 5) return 'Enfoque en cobranza y seguimiento de pagos';
    if (opportunityActions > 5) return 'Capitalizar oportunidades de crecimiento';
    
    return 'Mantener balance entre todas las áreas';
  }

  /**
   * Mark an action as completed
   */
  completeAction(actionId: string): Observable<boolean> {
    // In a real implementation, this would update the backend
    return of(true).pipe(delay(200));
  }

  /**
   * Snooze an action for later
   */
  snoozeAction(actionId: string, hours: number): Observable<boolean> {
    // In a real implementation, this would update the action's due date
    return of(true).pipe(delay(200));
  }
}