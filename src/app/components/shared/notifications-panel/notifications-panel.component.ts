import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, interval, takeUntil, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { Client, EventType, Actor, BusinessFlow } from '../../../models/types';
import { NotificationUI } from '../../../models/notification';
import { ToastService } from '../../../services/toast.service';

//  Using SSOT NotificationUI from models/notification.ts

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './notifications-panel.component.html',
  styleUrls: ['./notifications-panel.component.scss'],
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() onClose = new EventEmitter<void>();

  notifications: NotificationUI[] = [];
  filteredNotifications: NotificationUI[] = [];
  clients: Client[] = [];
  showUnreadOnly = false;
  isLoading = false;

  private destroy$ = new Subject<void>();

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getPanelStateClasses(): Record<string, boolean> {
    return {
      'notifications-panel--open': this.isOpen,
    };
  }

  getFilterButtonClasses(): Record<string, boolean> {
    return {
      'notifications-panel__filter--active': this.showUnreadOnly,
    };
  }

  getNotificationItemClasses(notification: NotificationUI): Record<string, boolean> {
    const classes: Record<string, boolean> = {
      'notifications-panel__item--unread': !notification.isRead,
    };

    if (notification.priority) {
      classes[`notifications-panel__item--priority-${notification.priority}`] = true;
    }

    return classes;
  }

  getPriorityClasses(notification: NotificationUI): Record<string, boolean> {
    const classes: Record<string, boolean> = {};

    if (notification.priority) {
      classes[`notifications-panel__priority--${notification.priority}`] = true;
    }

    return classes;
  }

  constructor(
    private apiService: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.startNotificationPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Load clients and generate business-relevant notifications
      const clients = await this.apiService.getClients().toPromise();
      this.clients = clients || [];
      
      this.generateBusinessNotifications();
      this.filterNotifications();
      
    } catch (error) {
      this.toast.error('Error al cargar notificaciones');
    } finally {
      this.isLoading = false;
    }
  }

  private generateBusinessNotifications(): void {
    const notifications: NotificationUI[] = [];
    const now = new Date();

    this.clients.forEach(client => {
      // Payment reminders for venta a plazo clients
      if (client.flow === BusinessFlow.VentaPlazo && client.paymentPlan) {
        const daysSinceLastPayment = Math.floor(
          (now.getTime() - (client.lastPayment?.getTime() || client.createdAt.getTime())) 
          / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastPayment > 30) {
          notifications.push({
            id: `payment-reminder-${client.id}`,
            type: 'payment_reminder',
            title: 'Pago Pendiente',
            message: `${client.name} tiene ${daysSinceLastPayment} días sin realizar pago mensual`,
            timestamp: new Date(now.getTime() - (daysSinceLastPayment - 30) * 24 * 60 * 60 * 1000),
            isRead: false,
            priority: daysSinceLastPayment > 60 ? 'high' : 'medium',
            clientId: client.id,
            actionUrl: `/clientes/${client.id}`,
            actionLabel: 'Ver Cliente'
          });
        }
      }

      // Document requirements
      const pendingDocs = client.documents.filter(doc => doc.status === 'Pendiente');
      if (pendingDocs.length > 0) {
        notifications.push({
          id: `docs-required-${client.id}`,
          type: 'document_required',
          title: 'Documentos Pendientes',
          message: `${client.name} tiene ${pendingDocs.length} documento(s) pendiente(s)`,
          timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
          isRead: false,
          priority: pendingDocs.length > 3 ? 'high' : 'medium',
          clientId: client.id,
          actionUrl: `/expedientes`,
          actionLabel: 'Ver Expedientes',
          metadata: { pendingDocs: pendingDocs.length }
        });
      }

      // New client opportunities (recently created)
      const isNewClient = (now.getTime() - client.createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000);
      if (isNewClient && client.status === 'Activo') {
        notifications.push({
          id: `new-opportunity-${client.id}`,
          type: 'opportunity',
          title: 'Nueva Oportunidad',
          message: `Cliente ${client.name} registrado recientemente - seguimiento recomendado`,
          timestamp: client.createdAt,
          isRead: false,
          priority: 'medium',
          clientId: client.id,
          actionUrl: `/clientes/${client.id}`,
          actionLabel: 'Hacer Seguimiento'
        });
      }

      // Ecosystem validation for EdoMex clients
      if (client.market === 'edomex' && client.ecosystemId) {
        const hasEcosystemDocs = client.documents.some(doc => 
          doc.name.includes('Acta Constitutiva') && doc.status === 'Aprobado'
        );
        
        if (!hasEcosystemDocs) {
          notifications.push({
            id: `ecosystem-validation-${client.id}`,
            type: 'system_alert',
            title: 'Validación de Ecosistema',
            message: `${client.name} requiere validación de documentos de ecosistema`,
            timestamp: new Date(now.getTime() - Math.random() * 48 * 60 * 60 * 1000),
            isRead: false,
            priority: 'high',
            clientId: client.id,
            actionUrl: `/expedientes`,
            actionLabel: 'Validar Documentos'
          });
        }
      }
    });

    // System notifications
    notifications.push(
      {
        id: 'system-backup',
        type: 'system_alert',
        title: 'Respaldo del Sistema',
        message: 'Respaldo diario completado exitosamente',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        isRead: true,
        priority: 'low',
        actionLabel: 'Ver Detalles'
      },
      {
        id: 'monthly-report-ready',
        type: 'system_alert',
        title: 'Reporte Mensual Listo',
        message: 'El reporte mensual de ventas está disponible',
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        isRead: false,
        priority: 'medium',
        actionUrl: '/reportes',
        actionLabel: 'Ver Reportes'
      }
    );

    // Sort by timestamp (newest first)
    this.notifications = notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private startNotificationPolling(): void {
    // Poll for new notifications every 5 minutes
    interval(5 * 60 * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshNotifications();
      });
  }

  toggleUnreadFilter(): void {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.filterNotifications();
  }

  private filterNotifications(): void {
    this.filteredNotifications = this.showUnreadOnly 
      ? this.notifications.filter(n => !n.isRead)
      : this.notifications;
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.filterNotifications();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.isRead = true);
    this.filterNotifications();
    this.toast.success('Todas las notificaciones marcadas como leídas');
  }

  refreshNotifications(): void {
    this.loadData();
    this.toast.success('Notificaciones actualizadas');
  }

  onNotificationClick(notification: NotificationUI): void {
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      // Navigate to action URL
      this.closePanel();
    }
  }

  closePanel(): void {
    this.onClose.emit();
  }

  getNotificationIcon(type: string): string {
    const icons = {
      'payment_reminder': '',
      'document_required': '',
      'client_action': '',
      'system_alert': '',
      'opportunity': ''
    };
    return icons[type as keyof typeof icons] || 'info';
  }

  getPriorityIcon(priority: string): string {
    const icons = {
      'high': '●',
      'medium': '●',
      'low': '●'
    };
    return icons[priority as keyof typeof icons] || '●';
  }

  getClientName(clientId: string): string {
    const client = this.clients.find(c => c.id === clientId);
    return client?.name || 'Cliente';
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return timestamp.toLocaleDateString('es-MX', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  trackByNotificationId(index: number, notification: NotificationUI): string {
    return notification.id;
  }
}
