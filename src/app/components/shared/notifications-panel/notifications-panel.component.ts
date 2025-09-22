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

// ✅ Using SSOT NotificationUI from models/notification.ts

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="notifications-panel" [class.open]="isOpen">
      <!-- Panel Header -->
      <div class="panel-header">
        <div class="header-title">
          <h3>🔔 Notificaciones</h3>
          <span class="notification-count" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
        </div>
        <div class="header-actions">
          <button 
            class="filter-btn" 
            [class.active]="showUnreadOnly"
            (click)="toggleUnreadFilter()"
            title="Solo no leídas"
          >
            {{ showUnreadOnly ? '📬' : '📭' }}
          </button>
          <button 
            class="mark-all-read-btn"
            (click)="markAllAsRead()"
            *ngIf="unreadCount > 0"
            title="Marcar todas como leídas"
          >
            ✅
          </button>
          <button 
            class="close-btn"
            (click)="closePanel()"
            title="Cerrar panel"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando notificaciones...</p>
      </div>

      <!-- Notifications List -->
      <div *ngIf="!isLoading" class="notifications-list">
        <div 
          *ngFor="let notification of filteredNotifications; trackBy: trackByNotificationId"
          class="notification-item"
          [class.unread]="!notification.isRead"
          [class.priority-high]="notification.priority === 'high'"
          [class.priority-medium]="notification.priority === 'medium'"
          (click)="onNotificationClick(notification)"
        >
          <div class="notification-icon">
            {{ getNotificationIcon(notification.type) }}
          </div>
          
          <div class="notification-content">
            <div class="notification-header">
              <h4 class="notification-title">{{ notification.title }}</h4>
              <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
            </div>
            
            <p class="notification-message">{{ notification.message }}</p>
            
            <div class="notification-meta" *ngIf="notification.clientId || notification.actionLabel">
              <span class="client-name" *ngIf="notification.clientId">
                👤 {{ getClientName(notification.clientId) }}
              </span>
              <span class="action-available" *ngIf="notification.actionLabel">
                🎯 {{ notification.actionLabel }}
              </span>
            </div>
          </div>
          
          <div class="notification-actions">
            <button 
              *ngIf="!notification.isRead"
              class="mark-read-btn"
              (click)="markAsRead(notification.id); $event.stopPropagation()"
              title="Marcar como leída"
            >
              👁️
            </button>
            <div class="priority-indicator" [class]="'priority-' + notification.priority">
              {{ getPriorityIcon(notification.priority) }}
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredNotifications.length === 0" class="empty-state">
          <div class="empty-icon">
            {{ showUnreadOnly ? '📪' : '🎉' }}
          </div>
// removed by clean-audit
          <p>{{ showUnreadOnly ? 'No hay notificaciones sin leer' : 'No hay notificaciones pendientes' }}</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions" *ngIf="!isLoading">
        <button 
          class="quick-action-btn"
          (click)="refreshNotifications()"
          [disabled]="isLoading"
        >
          🔄 Actualizar
        </button>
        <button 
          class="quick-action-btn"
          routerLink="/clientes"
          (click)="closePanel()"
        >
          👥 Ver Clientes
        </button>
        <button 
          class="quick-action-btn"
          routerLink="/dashboard"
          (click)="closePanel()"
        >
          📊 Dashboard
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <div 
      class="panel-backdrop" 
      *ngIf="isOpen"
      (click)="closePanel()"
    ></div>
  `,
  styles: [`
    .notifications-panel {
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      z-index: 1001;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
      border-left: 1px solid #e2e8f0;
    }

    .notifications-panel.open {
      right: 0;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e2e8f0;
      background: #f7fafc;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-title h3 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
      color: #2d3748;
    }

    .notification-count {
      background: #e53e3e;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .filter-btn, .mark-all-read-btn, .close-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      transition: all 0.2s;
    }

    .filter-btn {
      background: #edf2f7;
      color: #4a5568;
    }

    .filter-btn.active {
      background: #4299e1;
      color: white;
    }

    .mark-all-read-btn {
      background: #48bb78;
      color: white;
    }

    .mark-all-read-btn:hover {
      background: #38a169;
    }

    .close-btn {
      background: #fed7d7;
      color: #c53030;
    }

    .close-btn:hover {
      background: #feb2b2;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #718096;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid #e2e8f0;
      border-left-color: #4299e1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .notifications-list {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .notification-item:hover {
      background: #f8fafc;
    }

    .notification-item.unread {
      background: #f0f9ff;
      border-left: 4px solid #4299e1;
    }

    .notification-item.priority-high {
      border-left-color: #e53e3e;
    }

    .notification-item.priority-medium {
      border-left-color: #ed8936;
    }

    .notification-icon {
      font-size: 1.5rem;
      margin-right: 12px;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .notification-title {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #2d3748;
      line-height: 1.3;
    }

    .notification-time {
      font-size: 0.75rem;
      color: #718096;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .notification-message {
      margin: 0 0 8px 0;
      font-size: 0.85rem;
      color: #4a5568;
      line-height: 1.4;
    }

    .notification-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.75rem;
    }

    .client-name, .action-available {
      background: #edf2f7;
      color: #4a5568;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    }

    .notification-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-left: 8px;
    }

    .mark-read-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: #edf2f7;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .mark-read-btn:hover {
      background: #e2e8f0;
    }

    .priority-indicator {
      font-size: 0.8rem;
      opacity: 0.7;
    }

    .priority-indicator.priority-high {
      color: #e53e3e;
    }

    .priority-indicator.priority-medium {
      color: #ed8936;
    }

    .priority-indicator.priority-low {
      color: #48bb78;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: #718096;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .empty-state h4 {
      margin: 0 0 8px 0;
      color: #4a5568;
      font-size: 1.2rem;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.9rem;
    }

    .quick-actions {
      padding: 16px 20px;
      border-top: 1px solid #e2e8f0;
      background: #f7fafc;
      display: flex;
      gap: 8px;
    }

    .quick-action-btn {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      color: #4a5568;
      text-decoration: none;
      text-align: center;
    }

    .quick-action-btn:hover {
      background: #edf2f7;
      border-color: #cbd5e0;
    }

    .panel-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      z-index: 1000;
      opacity: 0;
      animation: fadeIn 0.3s ease forwards;
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .notifications-panel {
        width: 100vw;
        right: -100vw;
      }
      
      .notifications-panel.open {
        right: 0;
      }
    }

    /* Scrollbar styling */
    .notifications-list::-webkit-scrollbar {
      width: 6px;
    }

    .notifications-list::-webkit-scrollbar-track {
      background: #f1f5f9;
    }

    .notifications-list::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 3px;
    }

    .notifications-list::-webkit-scrollbar-thumb:hover {
      background: #a0aec0;
    }
  `]
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
// removed by clean-audit
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
// removed by clean-audit
      this.closePanel();
    }
  }

  closePanel(): void {
    this.onClose.emit();
  }

  getNotificationIcon(type: string): string {
    const icons = {
      'payment_reminder': '💰',
      'document_required': '📋',
      'client_action': '👤',
      'system_alert': '⚠️',
      'opportunity': '🎯'
    };
    return icons[type as keyof typeof icons] || '📢';
  }

  getPriorityIcon(priority: string): string {
    const icons = {
      'high': '🔴',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[priority as keyof typeof icons] || '⚪';
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
// removed by clean-audit