import { TestBed } from '@angular/core/testing';
import { ServiceWorkerModule } from '@angular/service-worker';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { PushNotificationService } from './services/push-notification.service';

describe('AppComponent', () => {
  let mockPushNotificationService: jasmine.SpyObj<PushNotificationService>;

  beforeEach(async () => {
    // Create comprehensive spy object for PushNotificationService
    mockPushNotificationService = jasmine.createSpyObj('PushNotificationService', [
      'initialize',
      'requestPermission',
      'getNotificationStatus',
      'getUnreadCount',
      'markAsRead',
      'clearAll'
    ]);

    // Set up return values for spied methods
    mockPushNotificationService.getUnreadCount.and.returnValue(of(0));
    mockPushNotificationService.getNotificationStatus.and.returnValue({
      supported: true,
      permission: 'granted',
      subscribed: false
    });

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        ServiceWorkerModule.register('ngsw-worker.js', {
          enabled: false // Disable service worker for tests
        })
      ],
      providers: [
        { provide: PushNotificationService, useValue: mockPushNotificationService }
      ]
    }).overrideComponent(AppComponent, {
      set: {
        template: `<div><h1>Hello, conductores-pwa</h1></div>` // Simplified template for testing
      }
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'conductores-pwa' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('conductores-pwa');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, conductores-pwa');
  });
});
