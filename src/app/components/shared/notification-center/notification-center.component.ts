import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PushNotificationService } from '../../../services/push-notification.service';
import { NotificationHistory } from '../../../models/notification';

//  Using SSOT NotificationHistory from models/notification.ts

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss'],
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  isOpen = false;
  permissionGranted = false;
  showPermissionBanner = true;
  
  notifications$: Observable<NotificationHistory[]>;
  unreadCount$: Observable<number>;

  private destroy$ = new Subject<void>();

  getPanelClasses(): Record<string, boolean> {
    return {
      'notification-center--open': this.isOpen,
    };
  }

  getNotificationItemClasses(notification: NotificationHistory): Record<string, boolean> {
    return {
      'notification-center__item--unread': !notification.clicked,
    };
  }

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

  getNotificationIcon(type: string): IconName {
    switch (type) {
      case 'payment_due':
      case 'gnv_overage':
        return 'currency-dollar';
      case 'document_pending':
        return 'document-text';
      case 'contract_approved':
        return 'check-circle';
      case 'general':
        return 'information-circle';
      default:
        return 'bell';
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
