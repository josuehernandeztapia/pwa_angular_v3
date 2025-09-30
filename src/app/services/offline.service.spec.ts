import { of } from 'rxjs';

import { OfflineService } from './offline.service';
import { AnalyticsService } from './analytics.service';
import { HttpClientService } from './http-client.service';
import { MonitoringService } from './monitoring.service';
import { environment } from '../../environments/environment';

describe('OfflineService (audit integration)', () => {
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let httpClient: jasmine.SpyObj<HttpClientService>;
  let monitoring: jasmine.SpyObj<MonitoringService>;
  let service: OfflineService;
  let originalOfflineMode: boolean;
  let originalMockData: boolean;

  beforeEach(() => {
    originalOfflineMode = environment.features.enableOfflineMode;
    originalMockData = environment.features.enableMockData;
    environment.features.enableOfflineMode = true;
    environment.features.enableMockData = false;

    localStorage.clear();

    analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['track']);
    httpClient = jasmine.createSpyObj<HttpClientService>('HttpClientService', ['get', 'post', 'put', 'delete']);
    monitoring = jasmine.createSpyObj<MonitoringService>('MonitoringService', ['auditEvent']);

    httpClient.post.and.returnValue(of({ success: true }));
    httpClient.get.and.returnValue(of({ success: true }));
    httpClient.put.and.returnValue(of({ success: true }));
    httpClient.delete.and.returnValue(of({ success: true }));

    service = new OfflineService(analytics, httpClient, undefined, monitoring, undefined);
  });

  afterEach(() => {
    environment.features.enableOfflineMode = originalOfflineMode;
    environment.features.enableMockData = originalMockData;
  });

  it('audits enqueue of offline requests', () => {
    service.storeOfflineRequest('/api/test', 'POST', { foo: 'bar' });

    expect(monitoring.auditEvent).toHaveBeenCalledWith('offline_queue_enqueued', jasmine.objectContaining({
      endpoint: '/api/test',
      method: 'POST'
    }));
  });

  it('audits flush lifecycle', async () => {
    service.storeOfflineRequest('/api/flush', 'POST', { foo: 'bar' });
    monitoring.auditEvent.calls.reset();

    await service.flushQueueNow();

    expect(monitoring.auditEvent).toHaveBeenCalledWith('offline_queue_flush_start', jasmine.objectContaining({
      pending: 1
    }));
    expect(monitoring.auditEvent).toHaveBeenCalledWith('offline_queue_flush_complete', jasmine.objectContaining({
      processed: 1,
      remaining: 0
    }));
  });

  it('audits manual clear of pending requests', () => {
    service.storeOfflineRequest('/api/clear', 'POST', {});
    monitoring.auditEvent.calls.reset();

    service.clearPendingRequests('test');

    expect(monitoring.auditEvent).toHaveBeenCalledWith('offline_queue_cleared', jasmine.objectContaining({
      reason: 'test'
    }));
  });
});
