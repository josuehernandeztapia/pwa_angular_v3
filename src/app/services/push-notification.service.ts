import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface NotificationPayload {
  type: 'payment_due' | 'gnv_overage' | 'document_pending' | 'contract_approved' | 'general';
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    client_id?: string;
    payment_link?: string;
    amount?: number;
    due_date?: string;
    action_url?: string;
    [key: string]: any;
  };
  actions?: {
    action: string;
    title: string;
    icon?: string;
  }[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface PushSubscription {
  subscription_id?: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_id: string;
  device_info: {
    browser: string;
    os: string;
    device_type: 'mobile' | 'desktop';
  };
  created_at?: string;
  last_used?: string;
  active: boolean;
}

interface NotificationHistory {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  sent_at: string;
  delivered: boolean;
  clicked: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly baseUrl = environment.apiUrl;
  private readonly vapidKey = 'BF8Q_rBv2d2wQc7k8Kh4Dm1cJ3z2b7Rm4nFjQ-8rTxF5vN9pKjHgFdSaQwEr7Ty6uI3oP1qW5eR2tY7uI8oP0aS'; // Replace with actual VAPID key
  
  private isSupported = false;
  private permission$ = new BehaviorSubject<NotificationPermission>('default');
  private subscription$ = new BehaviorSubject<PushSubscription | null>(null);
  private notifications$ = new BehaviorSubject<NotificationHistory[]>([]);

  constructor(
    private swPush: SwPush,
    private http: HttpClient
  ) {
    this.checkSupport();
    this.loadStoredNotifications();
  }

  // ==============================
  // INITIALIZATION & SUPPORT
  // ==============================

  private checkSupport(): void {
    this.isSupported = this.swPush.isEnabled && 'Notification' in window;
    if (this.isSupported) {
      this.permission$.next(Notification.permission);
      this.loadExistingSubscription();
    }
  }

  get pushSupported(): boolean {
    return this.isSupported;
  }

  get permission(): Observable<NotificationPermission> {
    return this.permission$.asObservable();
  }

  get currentSubscription(): Observable<PushSubscription | null> {
    return this.subscription$.asObservable();
  }

  get notificationHistory(): Observable<NotificationHistory[]> {
    return this.notifications$.asObservable();
  }

  // ==============================
  // SUBSCRIPTION MANAGEMENT
  // ==============================

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    this.permission$.next(permission);
    
    if (permission === 'granted') {
      await this.subscribeToNotifications();
    }
    
    return permission;
  }

  async subscribeToNotifications(): Promise<PushSubscription | null> {
    try {
      if (!this.isSupported || Notification.permission !== 'granted') {
        return null;
      }

      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.vapidKey
      });

      if (subscription) {
        const pushSub: PushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
          },
          user_id: this.getCurrentUserId(),
          device_info: this.getDeviceInfo(),
          active: true
        };

        // Save to backend
        const savedSub = await this.savePushSubscription(pushSub);
        this.subscription$.next(savedSub);
        
        // Store locally
        localStorage.setItem('push_subscription', JSON.stringify(savedSub));
        
        return savedSub;
      }
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      throw error;
    }
    
    return null;
  }

  async unsubscribeFromNotifications(): Promise<boolean> {
    try {
      const currentSub = this.subscription$.value;
      if (currentSub) {
        // Unsubscribe from backend
        await this.removePushSubscription(currentSub.subscription_id!);
      }

      // Unsubscribe from service worker
      await this.swPush.unsubscribe();
      
      this.subscription$.next(null);
      localStorage.removeItem('push_subscription');
      
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error);
      return false;
    }
  }

  private loadExistingSubscription(): void {
    const stored = localStorage.getItem('push_subscription');
    if (stored) {
      try {
        const subscription = JSON.parse(stored);
        this.subscription$.next(subscription);
      } catch (error) {
        localStorage.removeItem('push_subscription');
      }
    }
  }

  // ==============================
  // BACKEND INTEGRATION
  // ==============================

  private async savePushSubscription(subscription: PushSubscription): Promise<PushSubscription> {
    const response = await this.http.post<PushSubscription>(
      `${this.baseUrl}/notifications/subscriptions`,
      subscription,
      { headers: { 'Authorization': `Bearer ${this.getAuthToken()}` } }
    ).toPromise();
    
    return response!;
  }

  private async removePushSubscription(subscriptionId: string): Promise<void> {
    await this.http.delete(
      `${this.baseUrl}/notifications/subscriptions/${subscriptionId}`,
      { headers: { 'Authorization': `Bearer ${this.getAuthToken()}` } }
    ).toPromise();
  }

  // ==============================
  // NOTIFICATION HANDLING
  // ==============================

  setupNotificationHandlers(): void {
    if (!this.isSupported) return;

    // Handle incoming notifications
    this.swPush.messages.subscribe((message: any) => {
      this.handleIncomingNotification(message);
    });

    // Handle notification clicks
    this.swPush.notificationClicks.subscribe((event: any) => {
      this.handleNotificationClick(event);
    });
  }

  private handleIncomingNotification(message: NotificationPayload): void {
    // Store notification history
    const notification: NotificationHistory = {
      id: Date.now().toString(),
      user_id: this.getCurrentUserId(),
      title: message.title,
      body: message.body,
      type: message.type,
      sent_at: new Date().toISOString(),
      delivered: true,
      clicked: false,
      data: message.data
    };

    this.addNotificationToHistory(notification);

    // Show notification if app is in background
    if (document.hidden) {
      this.showNotification(message);
    } else {
      // Show in-app toast/banner
      this.showInAppNotification(message);
    }
  }

  private handleNotificationClick(event: any): void {
    if (!event || !event.notification || !event.notification.data) {
      return;
    }
    const data = event.notification.data;
    
    // Mark as clicked
    this.markNotificationAsClicked(data.notification_id);

    // Handle different notification types
    switch (data.type) {
      case 'payment_due':
      case 'gnv_overage':
        if (data.payment_link) {
          window.open(data.payment_link, '_blank');
        }
        break;
        
      case 'document_pending':
        if (data.client_id) {
          // Navigate to client documents
          window.location.assign(`/clientes/${data.client_id}#documentos`);
        }
        break;
        
      case 'contract_approved':
        if (data.client_id) {
          window.location.assign(`/clientes/${data.client_id}`);
        }
        break;
        
      default:
        if (data.action_url) {
          window.location.assign(data.action_url);
        }
    }

    event.notification.close();
  }

  private showNotification(payload: NotificationPayload): void {
    if (!this.isSupported || Notification.permission !== 'granted') return;

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/assets/icons/icon-192x192.png',
      badge: payload.badge || '/assets/icons/icon-72x72.png',
      tag: payload.tag || payload.type,
      data: payload.data,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      ...(payload.actions && { actions: payload.actions })
    };

    new Notification(payload.title, options);
  }

  private showInAppNotification(payload: NotificationPayload): void {
    // This would integrate with your existing toast/notification system
    console.log('In-app notification:', payload);
    
    // You could emit an event or call a toast service here
    // Example: this.toastService.show(payload.title, payload.body, payload.type);
  }

  // ==============================
  // NOTIFICATION HISTORY
  // ==============================

  private loadStoredNotifications(): void {
    const stored = localStorage.getItem('notification_history');
    if (stored) {
      try {
        const notifications = JSON.parse(stored);
        this.notifications$.next(notifications);
      } catch (error) {
        localStorage.removeItem('notification_history');
      }
    }
  }

  private addNotificationToHistory(notification: NotificationHistory): void {
    const current = this.notifications$.value;
    const updated = [notification, ...current].slice(0, 50); // Keep last 50
    this.notifications$.next(updated);
    localStorage.setItem('notification_history', JSON.stringify(updated));
  }

  private markNotificationAsClicked(notificationId: string): void {
    const current = this.notifications$.value;
    const updated = current.map(n => 
      n.id === notificationId ? { ...n, clicked: true } : n
    );
    this.notifications$.next(updated);
    localStorage.setItem('notification_history', JSON.stringify(updated));
  }

  getUnreadCount(): Observable<number> {
    return new Observable(observer => {
      this.notifications$.subscribe(notifications => {
        const unreadCount = notifications.filter(n => !n.clicked).length;
        observer.next(unreadCount);
      });
    });
  }

  markAllAsRead(): void {
    const current = this.notifications$.value;
    const updated = current.map(n => ({ ...n, clicked: true }));
    this.notifications$.next(updated);
    localStorage.setItem('notification_history', JSON.stringify(updated));
  }

  clearNotificationHistory(): void {
    this.notifications$.next([]);
    localStorage.removeItem('notification_history');
  }

  // ==============================
  // TEST & DEBUGGING
  // ==============================

  async sendTestNotification(): Promise<void> {
    const testPayload: NotificationPayload = {
      type: 'general',
      title: 'Prueba de Notificación',
      body: 'Esta es una notificación de prueba del sistema Conductores PWA',
      icon: '/assets/icons/icon-192x192.png',
      data: {
        test: true,
        timestamp: Date.now()
      },
      actions: [
        { action: 'view', title: 'Ver Detalles' },
        { action: 'dismiss', title: 'Cerrar' }
      ]
    };

    // Send via backend API
    try {
      await this.http.post(`${this.baseUrl}/notifications/send-test`, {
        user_id: this.getCurrentUserId(),
        payload: testPayload
      }, {
        headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
      }).toPromise();
      
      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      
      // Fallback: show local notification
      this.showNotification(testPayload);
    }
  }

  // ==============================
  // UTILITY METHODS
  // ==============================

  private getCurrentUserId(): string {
    // Get from your auth service
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user).id : 'anonymous';
  }

  private getAuthToken(): string {
    // Get from your auth service
    return localStorage.getItem('auth_token') || '';
  }

  private getDeviceInfo(): { browser: string; os: string; device_type: 'mobile' | 'desktop' } {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    return {
      browser: this.getBrowserName(),
      os: this.getOSName(),
      device_type: isMobile ? 'mobile' : 'desktop'
    };
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOSName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  // ==============================
  // PUBLIC API METHODS
  // ==============================

  async initializeNotifications(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      if (Notification.permission === 'granted') {
        await this.subscribeToNotifications();
        this.setupNotificationHandlers();
        return true;
      } else if (Notification.permission === 'default') {
        const permission = await this.requestPermission();
        if (permission === 'granted') {
          this.setupNotificationHandlers();
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }

    return false;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }

  getNotificationStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
    subscription_id?: string;
  } {
    return {
      supported: this.isSupported,
      permission: Notification.permission,
      subscribed: this.subscription$.value !== null,
      subscription_id: this.subscription$.value?.subscription_id
    };
  }
}
