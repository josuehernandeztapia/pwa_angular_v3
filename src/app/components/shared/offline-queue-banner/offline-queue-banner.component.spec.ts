import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';

import { OfflineQueueBannerComponent } from './offline-queue-banner.component';
import { OfflineService, OfflineData, OfflineProcessResult } from '../../../services/offline.service';
import { AnalyticsService } from '../../../services/analytics.service';

class OfflineServiceStub {
  online$ = new BehaviorSubject<boolean>(true);
  pendingRequests$ = new BehaviorSubject<OfflineData[]>([]);
  processedRequests$ = new Subject<OfflineProcessResult>();
}

class AnalyticsServiceStub {
  track = jasmine.createSpy('track');
}

describe('OfflineQueueBannerComponent', () => {
  let component: OfflineQueueBannerComponent;
  let fixture: ComponentFixture<OfflineQueueBannerComponent>;
  let offlineStub: OfflineServiceStub;
  let analyticsStub: AnalyticsServiceStub;

  beforeEach(async () => {
    offlineStub = new OfflineServiceStub();
    analyticsStub = new AnalyticsServiceStub();

    await TestBed.configureTestingModule({
      imports: [OfflineQueueBannerComponent],
      providers: [
        { provide: OfflineService, useValue: offlineStub },
        { provide: AnalyticsService, useValue: analyticsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineQueueBannerComponent);
    component = fixture.componentInstance;
  });

  it('toggles offline flag based on connectivity', () => {
    component.contextLabel = 'documentos';
    fixture.detectChanges();

    expect(component.isOffline).toBeFalse();

    offlineStub.online$.next(false);
    fixture.detectChanges();

    expect(component.isOffline).toBeTrue();
  });

  it('filters pending requests by endpoint prefix', () => {
    component.contextLabel = 'documentos';
    component.endpointPrefix = 'documents';
    fixture.detectChanges();

    offlineStub.pendingRequests$.next([
      { id: '1', timestamp: Date.now(), data: {}, endpoint: 'documents/upload', method: 'POST' },
      { id: '2', timestamp: Date.now(), data: {}, endpoint: 'avi/analyze', method: 'POST' },
    ]);

    fixture.detectChanges();

    expect(component.pendingCount).toBe(1);
  });

  it('announces flush completion and clears message after delay', fakeAsync(() => {
    component.contextLabel = 'documentos';
    fixture.detectChanges();

    offlineStub.pendingRequests$.next([]);
    offlineStub.processedRequests$.next({
      request: { id: 'flush', timestamp: Date.now(), data: {}, endpoint: 'documents/upload', method: 'POST' },
      success: true,
    });

    fixture.detectChanges();

    expect(component.lastSyncMessage).toContain('documentos');
    expect(analyticsStub.track).toHaveBeenCalledWith('offline_queue_flush', jasmine.objectContaining({ context: 'documentos' }));

    tick(4000);
    fixture.detectChanges();

    expect(component.lastSyncMessage).toBeNull();
  }));
});
