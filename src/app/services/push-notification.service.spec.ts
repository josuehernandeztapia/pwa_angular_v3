import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SwPush } from '@angular/service-worker';
import { of, throwError } from 'rxjs';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let httpMock: HttpTestingController;
  let mockSwPush: jasmine.SpyObj<SwPush>;

  beforeEach(() => {
    // Create comprehensive spy object for SwPush
    mockSwPush = jasmine.createSpyObj('SwPush', ['requestSubscription', 'unsubscribe'], {
      isEnabled: true,
      messages: of({}),
      notificationClicks: of({})
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PushNotificationService,
        { provide: SwPush, useValue: mockSwPush }
      ]
    });

    service = TestBed.inject(PushNotificationService);
    httpMock = TestBed.inject(HttpTestingController);

    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'default',
        requestPermission: jasmine.createSpy('requestPermission').and.returnValue(Promise.resolve('granted'))
      }
    });

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should check push notification support', () => {
      expect(service.pushSupported).toBe(true);
    });

    it('should initialize with default permission', (done) => {
      service.permission.subscribe(permission => {
        expect(permission).toBe('default');
        done();
      });
    });

    it('should initialize with no subscription', (done) => {
      service.currentSubscription.subscribe(subscription => {
        expect(subscription).toBeNull();
        done();
      });
    });

    it('should initialize with empty notification history', (done) => {
      service.notificationHistory.subscribe(history => {
        expect(history).toEqual([]);
        done();
      });
    });
  });

  describe('Permission Management', () => {
    it('should request notification permission', async () => {
      const mockPermission = jasmine.createSpy('requestPermission').and.returnValue(Promise.resolve('granted'));
      Object.defineProperty(window.Notification, 'requestPermission', {
        value: mockPermission
      });

      const permission = await service.requestPermission();
      
      expect(permission).toBe('granted');
      expect(mockPermission).toHaveBeenCalled();
    });

    it('should handle permission denied', async () => {
      const mockPermission = jasmine.createSpy('requestPermission').and.returnValue(Promise.resolve('denied'));
      Object.defineProperty(window.Notification, 'requestPermission', {
        value: mockPermission
      });

      const permission = await service.requestPermission();
      
      expect(permission).toBe('denied');
    });

    it('should throw error when push notifications not supported', async () => {
      // Mock unsupported environment
      spyOnProperty(service, 'pushSupported', 'get').and.returnValue(false);

      try {
        await service.requestPermission();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Push notifications not supported');
      }
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      Object.defineProperty(window.Notification, 'permission', {
        writable: true,
        value: 'granted'
      });
      
      // Mock current user
      localStorage.setItem('currentUser', JSON.stringify({ id: 'user123' }));
      localStorage.setItem('auth_token', 'mock_token');
    });

    it('should subscribe to push notifications', async () => {
      const mockSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        getKey: jasmine.createSpy('getKey').and.returnValue(new Uint8Array([1, 2, 3]).buffer)
      };

      mockSwPush.requestSubscription.and.returnValue(Promise.resolve(mockSubscription as any));

      const result = await service.subscribeToNotifications();

      expect(mockSwPush.requestSubscription).toHaveBeenCalled();
      expect(result).toBeTruthy();
      expect(result?.endpoint).toBe(mockSubscription.endpoint);

      // Check API call
      const req = httpMock.expectOne(req => req.url.includes('/notifications/subscriptions'));
      expect(req.request.method).toBe('POST');
      
      req.flush({
        subscription_id: 'sub123',
        ...req.request.body
      });
    });

    it('should return null when permission not granted', async () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied'
      });

      const result = await service.subscribeToNotifications();
      expect(result).toBeNull();
    });

    it('should handle subscription failures', async () => {
      mockSwPush.requestSubscription.and.returnValue(Promise.reject(new Error('Subscription failed')));

      try {
        await service.subscribeToNotifications();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Subscription failed');
      }
    });

    it('should unsubscribe from push notifications', async () => {
      // Set up existing subscription
      const existingSubscription = {
        subscription_id: 'sub123',
        endpoint: 'https://test.com',
        keys: { p256dh: 'test', auth: 'test' },
        user_id: 'user123',
        device_info: { browser: 'Chrome', os: 'Windows', device_type: 'desktop' as const },
        active: true
      };

      localStorage.setItem('push_subscription', JSON.stringify(existingSubscription));
      service['subscription$'].next(existingSubscription);

      mockSwPush.unsubscribe.and.returnValue(Promise.resolve());

      const result = await service.unsubscribeFromNotifications();

      expect(result).toBeTrue();
      expect(mockSwPush.unsubscribe).toHaveBeenCalled();

      // Check API call
      const req = httpMock.expectOne(req => req.url.includes('/notifications/subscriptions/sub123'));
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      expect(localStorage.getItem('push_subscription')).toBeNull();
    });

    it('should handle unsubscribe failures gracefully', async () => {
      mockSwPush.unsubscribe.and.returnValue(Promise.reject(new Error('Unsubscribe failed')));

      const result = await service.unsubscribeFromNotifications();
      expect(result).toBeFalse();
    });

    it('should load existing subscription from localStorage', () => {
      const subscription = {
        subscription_id: 'sub123',
        endpoint: 'https://test.com',
        keys: { p256dh: 'test', auth: 'test' },
        user_id: 'user123',
        device_info: { browser: 'Chrome', os: 'Windows', device_type: 'desktop' as const },
        active: true
      };

      localStorage.setItem('push_subscription', JSON.stringify(subscription));

      // Create new service instance to trigger loading
      const newService = TestBed.inject(PushNotificationService);

      newService.currentSubscription.subscribe(sub => {
        expect(sub).toEqual(subscription);
      });
    });

    it('should handle corrupted localStorage subscription data', () => {
      localStorage.setItem('push_subscription', 'invalid-json');

      // Create new service instance to trigger loading
      const newService = TestBed.inject(PushNotificationService);

      expect(localStorage.getItem('push_subscription')).toBeNull();
    });
  });

  describe('Notification Handling', () => {
    beforeEach(() => {
      localStorage.setItem('currentUser', JSON.stringify({ id: 'user123' }));
    });

    it('should setup notification handlers', () => {
      spyOn(service['swPush'].messages, 'subscribe');
      spyOn(service['swPush'].notificationClicks, 'subscribe');

      service.setupNotificationHandlers();

      expect(service['swPush'].messages.subscribe).toHaveBeenCalled();
      expect(service['swPush'].notificationClicks.subscribe).toHaveBeenCalled();
    });

    it('should handle incoming notification message', () => {
      const mockNotification = {
        type: 'payment_due' as const,
        title: 'Payment Due',
        body: 'Your payment is due soon',
        data: { client_id: 'client123', amount: 1000 }
      };

      spyOn(service as any, 'addNotificationToHistory');
      spyOn(service as any, 'showNotification');

      Object.defineProperty(document, 'hidden', { value: true });

      service['handleIncomingNotification'](mockNotification);

      expect(service['addNotificationToHistory']).toHaveBeenCalled();
      expect(service['showNotification']).toHaveBeenCalledWith(mockNotification);
    });

    it('should show in-app notification when document is visible', () => {
      const mockNotification = {
        type: 'general' as const,
        title: 'Test',
        body: 'Test body'
      };

      spyOn(service as any, 'showInAppNotification');
      spyOn(service as any, 'showNotification');

      Object.defineProperty(document, 'hidden', { value: false });

      service['handleIncomingNotification'](mockNotification);

      expect(service['showInAppNotification']).toHaveBeenCalledWith(mockNotification);
      expect(service['showNotification']).not.toHaveBeenCalled();
    });

    it('should handle notification clicks', () => {
      const mockEvent = {
        notification: {
          data: {
            type: 'payment_due',
            client_id: 'client123',
            payment_link: 'https://payment.com',
            notification_id: 'notif123'
          },
          close: jasmine.createSpy('close')
        }
      };

      spyOn(window, 'open');
      spyOn(service as any, 'markNotificationAsClicked');

      service['handleNotificationClick'](mockEvent);

      expect(service['markNotificationAsClicked']).toHaveBeenCalledWith('notif123');
      expect(window.open).toHaveBeenCalledWith('https://payment.com', '_blank');
      expect(mockEvent.notification.close).toHaveBeenCalled();
    });

    it('should navigate to client page for document_pending notifications', () => {
      const mockEvent = {
        notification: {
          data: {
            type: 'document_pending',
            client_id: 'client123',
            notification_id: 'notif123'
          },
          close: jasmine.createSpy('close')
        }
      };

      spyOnProperty(window, 'location', 'get').and.returnValue({
        href: jasmine.createSpy('href')
      } as any);

      service['handleNotificationClick'](mockEvent);

      expect(window.location.href).toBe('/clientes/client123#documentos');
    });
  });

  describe('Notification History', () => {
    it('should get unread notification count', (done) => {
      const notifications = [
        {
          id: '1', user_id: 'user123', title: 'Test 1', body: 'Body 1',
          type: 'general', sent_at: new Date().toISOString(),
          delivered: true, clicked: false
        },
        {
          id: '2', user_id: 'user123', title: 'Test 2', body: 'Body 2',
          type: 'general', sent_at: new Date().toISOString(),
          delivered: true, clicked: true
        }
      ];

      service['notifications$'].next(notifications);

      service.getUnreadCount().subscribe(count => {
        expect(count).toBe(1);
        done();
      });
    });

    it('should mark all notifications as read', () => {
      const notifications = [
        {
          id: '1', user_id: 'user123', title: 'Test 1', body: 'Body 1',
          type: 'general', sent_at: new Date().toISOString(),
          delivered: true, clicked: false
        },
        {
          id: '2', user_id: 'user123', title: 'Test 2', body: 'Body 2',
          type: 'general', sent_at: new Date().toISOString(),
          delivered: true, clicked: false
        }
      ];

      service['notifications$'].next(notifications);

      service.markAllAsRead();

      service.notificationHistory.subscribe(history => {
        expect(history.every(n => n.clicked)).toBeTrue();
      });
    });

    it('should clear notification history', () => {
      const notifications = [
        {
          id: '1', user_id: 'user123', title: 'Test', body: 'Body',
          type: 'general', sent_at: new Date().toISOString(),
          delivered: true, clicked: false
        }
      ];

      service['notifications$'].next(notifications);

      service.clearNotificationHistory();

      service.notificationHistory.subscribe(history => {
        expect(history).toEqual([]);
      });

      expect(localStorage.getItem('notification_history')).toBeNull();
    });

    it('should load stored notifications on initialization', () => {
      const notifications = [
        {
          id: '1', user_id: 'user123', title: 'Test', body: 'Body',
          type: 'general', sent_at: new Date().toISOString(),
          delivered: true, clicked: false
        }
      ];

      localStorage.setItem('notification_history', JSON.stringify(notifications));

      // Create new service instance to trigger loading
      const newService = TestBed.inject(PushNotificationService);

      newService.notificationHistory.subscribe(history => {
        expect(history).toEqual(notifications);
      });
    });

    it('should handle corrupted notification history data', () => {
      localStorage.setItem('notification_history', 'invalid-json');

      // Create new service instance to trigger loading
      const newService = TestBed.inject(PushNotificationService);

      expect(localStorage.getItem('notification_history')).toBeNull();
    });

    it('should limit notification history to 50 items', () => {
      const existingNotifications = Array.from({ length: 49 }, (_, i) => ({
        id: `existing-${i}`,
        user_id: 'user123',
        title: `Test ${i}`,
        body: `Body ${i}`,
        type: 'general',
        sent_at: new Date().toISOString(),
        delivered: true,
        clicked: false
      }));

      service['notifications$'].next(existingNotifications);

      const newNotification = {
        id: 'new-notification',
        user_id: 'user123',
        title: 'New Test',
        body: 'New Body',
        type: 'general',
        sent_at: new Date().toISOString(),
        delivered: true,
        clicked: false
      };

      service['addNotificationToHistory'](newNotification);

      service.notificationHistory.subscribe(history => {
        expect(history.length).toBe(50);
        expect(history[0]).toEqual(newNotification);
      });
    });
  });

  describe('Test and Debugging', () => {
    beforeEach(() => {
      localStorage.setItem('currentUser', JSON.stringify({ id: 'user123' }));
      localStorage.setItem('auth_token', 'mock_token');
    });

    it('should send test notification via API', async () => {
      service.sendTestNotification();

      const req = httpMock.expectOne(req => req.url.includes('/notifications/send-test'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body.user_id).toBe('user123');
      expect(req.request.body.payload.title).toBe('Prueba de Notificación');

      req.flush({ success: true });
    });

    it('should fallback to local notification on API failure', async () => {
      spyOn(service as any, 'showNotification');

      service.sendTestNotification();

      const req = httpMock.expectOne(req => req.url.includes('/notifications/send-test'));
      req.error(new ErrorEvent('Network error'));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(service['showNotification']).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should get notification status', () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'granted'
      });

      const subscription = {
        subscription_id: 'sub123',
        endpoint: 'https://test.com',
        keys: { p256dh: 'test', auth: 'test' },
        user_id: 'user123',
        device_info: { browser: 'Chrome', os: 'Windows', device_type: 'desktop' as const },
        active: true
      };

      service['subscription$'].next(subscription);

      const status = service.getNotificationStatus();

      expect(status.supported).toBe(true);
      expect(status.permission).toBe('granted');
      expect(status.subscribed).toBe(true);
      expect(status.subscription_id).toBe('sub123');
    });

    it('should detect browser name correctly', () => {
      const originalUserAgent = navigator.userAgent;

      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });

      const browserName = service['getBrowserName']();
      expect(browserName).toBe('Chrome');

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent
      });
    });

    it('should detect OS name correctly', () => {
      const originalUserAgent = navigator.userAgent;

      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      const osName = service['getOSName']();
      expect(osName).toBe('Windows');

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent
      });
    });

    it('should convert ArrayBuffer to Base64', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
      const base64 = service['arrayBufferToBase64'](buffer);
      expect(base64).toBe(btoa('Hello'));
    });

    it('should get current user ID', () => {
      localStorage.setItem('currentUser', JSON.stringify({ id: 'user123' }));
      const userId = service['getCurrentUserId']();
      expect(userId).toBe('user123');
    });

    it('should return anonymous for missing user', () => {
      localStorage.removeItem('currentUser');
      const userId = service['getCurrentUserId']();
      expect(userId).toBe('anonymous');
    });

    it('should get auth token', () => {
      localStorage.setItem('auth_token', 'test_token');
      const token = service['getAuthToken']();
      expect(token).toBe('test_token');
    });
  });

  describe('Initialization Flow', () => {
    it('should initialize notifications with granted permission', async () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'granted'
      });

      spyOn(service, 'subscribeToNotifications').and.returnValue(Promise.resolve(null));
      spyOn(service, 'setupNotificationHandlers');

      const result = await service.initializeNotifications();

      expect(result).toBe(true);
      expect(service.subscribeToNotifications).toHaveBeenCalled();
      expect(service.setupNotificationHandlers).toHaveBeenCalled();
    });

    it('should request permission for default permission', async () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'default'
      });

      spyOn(service, 'requestPermission').and.returnValue(Promise.resolve('granted'));
      spyOn(service, 'setupNotificationHandlers');

      const result = await service.initializeNotifications();

      expect(result).toBe(true);
      expect(service.requestPermission).toHaveBeenCalled();
      expect(service.setupNotificationHandlers).toHaveBeenCalled();
    });

    it('should return false for unsupported environment', async () => {
      spyOnProperty(service, 'pushSupported', 'get').and.returnValue(false);

      const result = await service.initializeNotifications();

      expect(result).toBe(false);
    });

    it('should return false for denied permission', async () => {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied'
      });

      const result = await service.initializeNotifications();

      expect(result).toBe(false);
    });
  });
});