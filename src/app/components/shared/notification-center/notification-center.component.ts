import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PushNotificationService } from '../../../services/push-notification.service';
import { NotificationHistory } from '../../../models/notification';

// ✅ Using SSOT NotificationHistory from models/notification.ts

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-center" [class.open]="isOpen">
      <!-- Header -->
      <div class="notification-header">
        <div class="header-title">
          <span class="title">🔔 Notificaciones</span>
          <span class="count" *ngIf="unreadCount$ | async as count">{{ count }}</span>
        </div>
        <div class="header-actions">
          <button 
            class="btn-mark-all" 
            (click)="markAllAsRead()"
            *ngIf="(unreadCount$ | async) && (unreadCount$ | async)! > 0"
          >
            Marcar todas
          </button>
          <button class="btn-close" (click)="close()">✕</button>
        </div>
      </div>

      <!-- Permission Request -->
      <div class="permission-banner" *ngIf="!permissionGranted && showPermissionBanner">
        <div class="banner-content">
          <span class="banner-icon">🔔</span>
          <div class="banner-text">
            <div class="banner-title">Activar Notificaciones</div>
            <div class="banner-description">Recibe alertas de pagos y actualizaciones importantes</div>
          </div>
          <div class="banner-actions">
            <button class="btn-enable" (click)="requestPermission()">Activar</button>
            <button class="btn-dismiss" (click)="dismissPermissionBanner()">Después</button>
          </div>
        </div>
      </div>

      <!-- Notification Status -->
      <div class="notification-status" *ngIf="permissionGranted">
        <div class="status-item">
          <span class="status-icon">✅</span>
          <span class="status-text">Notificaciones activadas</span>
          <button class="btn-test" (click)="sendTestNotification()">Prueba</button>
        </div>
      </div>

      <!-- Notifications List -->
      <div class="notifications-list">
        <div class="empty-state" *ngIf="(notifications$ | async)?.length === 0">
          <span class="empty-icon">📭</span>
          <div class="empty-title">No hay notificaciones</div>
          <div class="empty-description">Las notificaciones aparecerán aquí</div>
        </div>

        <div 
          class="notification-item" 
          *ngFor="let notification of notifications$ | async; trackBy: trackByNotificationId"
          [class.unread]="!notification.clicked"
          (click)="handleNotificationClick(notification)"
        >
          <div class="notification-icon" [attr.aria-label]="getTypeLabel(notification.type)">
            {{ getNotificationIcon(notification.type) }}
          </div>
          
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-body">{{ notification.body }}</div>
            <div class="notification-meta">
              <span class="notification-time">{{ formatTime(getTimeString(notification)) }}</span>
              <span class="notification-type">{{ getTypeLabel(notification.type) }}</span>
            </div>
          </div>

          <div class="notification-actions">
            <button 
              class="btn-action primary" 
              *ngIf="hasAction(notification)"
              (click)="executeAction(notification); $event.stopPropagation()"
            >
              {{ getActionLabel(notification) }}
            </button>
            <div class="unread-indicator" *ngIf="!notification.clicked"></div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="notification-footer" *ngIf="(notifications$ | async)?.length! > 0">
        <button class="btn-clear" (click)="clearAll()">
          Limpiar historial
        </button>
      </div>
    </div>

    <!-- Overlay -->
    <div class="notification-overlay" *ngIf="isOpen" (click)="close()"></div>
  `,
  styles: [`
    .notification-center {
      position: fixed;
      top: 0;
      right: -400px;
      width: 380px;
      height: 100vh;
      background: white;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
    }

    .notification-center.open {
      right: 0;
    }

    .notification-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
    }

    .count {
      background: #ef4444;
      color: white;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 600;
      min-width: 18px;
      text-align: center;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .btn-mark-all {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 0.85rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .btn-mark-all:hover {
      background: #e5e7eb;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: #6b7280;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .btn-close:hover {
      background: #e5e7eb;
    }

    .permission-banner {
      padding: 16px 20px;
      background: linear-gradient(135deg, #06d6a0, #059669);
      color: white;
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .banner-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .banner-text {
      flex: 1;
    }

    .banner-title {
      font-weight: 600;
      margin-bottom: 2px;
    }

    .banner-description {
      font-size: 0.85rem;
      opacity: 0.9;
    }

    .banner-actions {
      display: flex;
      gap: 8px;
    }

    .btn-enable, .btn-dismiss {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .btn-enable {
      background: rgba(255, 255, 255, 0.25);
      font-weight: 600;
    }

    .btn-enable:hover {
      background: rgba(255, 255, 255, 0.35);
    }

    .btn-dismiss:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .notification-status {
      padding: 12px 20px;
      background: #f0fdf4;
      border-bottom: 1px solid #e5e7eb;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-icon {
      font-size: 1rem;
    }

    .status-text {
      flex: 1;
      font-size: 0.9rem;
      color: #16a34a;
      font-weight: 500;
    }

    .btn-test {
      background: none;
      border: 1px solid #d1d5db;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-test:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .notifications-list {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .empty-description {
      font-size: 0.9rem;
      color: #6b7280;
    }

    .notification-item {
      display: flex;
      padding: 16px 20px;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background-color 0.2s;
      position: relative;
    }

    .notification-item:hover {
      background: #f9fafb;
    }

    .notification-item.unread {
      background: #f0f9ff;
      border-left: 3px solid #0ea5e9;
    }

    .notification-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      background: #f3f4f6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      margin-right: 12px;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
      font-size: 0.95rem;
      line-height: 1.3;
    }

    .notification-body {
      color: #6b7280;
      font-size: 0.9rem;
      line-height: 1.4;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notification-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.8rem;
      color: #9ca3af;
    }

    .notification-time {
      font-weight: 500;
    }

    .notification-type {
      background: #e5e7eb;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
    }

    .notification-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      margin-left: 12px;
    }

    .btn-action {
      background: #06d6a0;
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .btn-action:hover {
      background: #059669;
    }

    .unread-indicator {
      width: 8px;
      height: 8px;
      background: #0ea5e9;
      border-radius: 50%;
    }

    .notification-footer {
      padding: 16px 20px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      text-align: center;
    }

    .btn-clear {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .btn-clear:hover {
      background: #e5e7eb;
      color: #374151;
    }

    @media (max-width: 768px) {
      .notification-center {
        width: 100vw;
        right: -100vw;
      }

      .notification-center.open {
        right: 0;
      }
    }
  `]
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  isOpen = false;
  permissionGranted = false;
  showPermissionBanner = true;
  
  notifications$: Observable<NotificationHistory[]>;
  unreadCount$: Observable<number>;

  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: PushNotificationService
  ) {
    this.notifications$ = this.notificationService.notificationHistory;
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  ngOnInit(): void {
    // Check permission status
    this.notificationService.permission
      .pipe(takeUntil(this.destroy$))
      .subscribe(permission => {
        this.permissionGranted = permission === 'granted';
        if (this.permissionGranted) {
          this.showPermissionBanner = false;
        }
      });

    // Initialize notifications if supported
    if (this.notificationService.pushSupported) {
      this.notificationService.initializeNotifications();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  async requestPermission(): Promise<void> {
    try {
      const permission = await this.notificationService.requestPermission();
      if (permission === 'granted') {
        this.showPermissionBanner = false;
      }
    } catch (error) {
// removed by clean-audit
    }
  }

  dismissPermissionBanner(): void {
    this.showPermissionBanner = false;
    localStorage.setItem('notification_permission_dismissed', 'true');
  }

  async sendTestNotification(): Promise<void> {
    try {
      await this.notificationService.sendTestNotification();
    } catch (error) {
// removed by clean-audit
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearAll(): void {
    this.notificationService.clearNotificationHistory();
  }

  handleNotificationClick(notification: NotificationHistory): void {
    // Mark as read if not already
    if (!notification.clicked) {
      // This would be handled by the service
    }

    // Handle notification action based on type
    if (notification.data) {
      this.executeAction(notification);
    }
  }

  executeAction(notification: NotificationHistory): void {
    const data = notification.data;
    
    switch (notification.type) {
      case 'payment_due':
      case 'gnv_overage':
        if (data?.payment_link) {
          window.open(data.payment_link, '_blank');
        }
        break;
        
      case 'document_pending':
        if (data?.client_id) {
          window.location.href = `/clientes/${data.client_id}#documentos`;
        }
        break;
        
      case 'contract_approved':
        if (data?.client_id) {
          window.location.href = `/clientes/${data.client_id}`;
        }
        break;
        
      default:
        if (data?.action_url) {
          window.location.href = data.action_url;
        }
    }
  }

  hasAction(notification: NotificationHistory): boolean {
    const data = notification.data;
    return !!(data?.payment_link || data?.action_url || data?.client_id);
  }

  getActionLabel(notification: NotificationHistory): string {
    switch (notification.type) {
      case 'payment_due':
      case 'gnv_overage':
        return 'Pagar';
      case 'document_pending':
        return 'Ver docs';
      case 'contract_approved':
        return 'Ver contrato';
      default:
        return 'Ver';
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'payment_due':
      case 'gnv_overage':
        return '💰';
      case 'document_pending':
        return '📋';
      case 'contract_approved':
        return '✅';
      case 'general':
        return 'ℹ️';
      default:
        return '🔔';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'payment_due':
        return 'Pago';
      case 'gnv_overage':
        return 'GNV';
      case 'document_pending':
        return 'Docs';
      case 'contract_approved':
        return 'Contrato';
      case 'general':
        return 'General';
      default:
        return type.toUpperCase();
    }
  }

  getTimeString(notification: NotificationHistory): string {
    // Try sent_at first (legacy field), then timestamp (new field)
    const timeValue = notification.sent_at || notification.timestamp;
    if (timeValue instanceof Date) {
      return timeValue.toISOString();
    }
    return String(timeValue || new Date().toISOString());
  }

  formatTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return time.toLocaleDateString('es-MX', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  trackByNotificationId(index: number, notification: NotificationHistory): string {
    return notification.id;
  }
}
// removed by clean-audit
