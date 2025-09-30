import { of, throwError } from 'rxjs';

import { MonitoringService } from './monitoring.service';
import { HttpClientService } from './http-client.service';
import { environment } from '../../environments/environment';

describe('MonitoringService', () => {
  let httpClient: jasmine.SpyObj<HttpClientService>;
  let service: MonitoringService;

  beforeEach(() => {
    httpClient = jasmine.createSpyObj<HttpClientService>('HttpClientService', ['post']);
    httpClient.post.and.returnValue(of({ success: true }));
    service = new MonitoringService(httpClient);
  });

  it('records audit events and posts payload to events endpoint', () => {
    const captureInfoSpy = spyOn(service, 'captureInfo').and.callThrough();

    service.auditEvent('qa_policy_saved', { performedBy: 'user-123' });

    expect(captureInfoSpy).toHaveBeenCalledWith(
      'audit',
      'qa_policy_saved',
      jasmine.stringMatching('Audit event'),
      jasmine.objectContaining({ event: 'qa_policy_saved', performedBy: 'user-123' }),
      {}
    );

    expect(httpClient.post).toHaveBeenCalledWith(
      environment.monitoring.eventsEndpoint,
      jasmine.objectContaining({
        event: 'qa_policy_saved',
        metadata: { performedBy: 'user-123' }
      }),
      { showLoading: false, showError: false }
    );
  });

  it('captures warning when audit persistence fails', () => {
    httpClient.post.and.returnValue(throwError(() => new Error('network error')));
    const warningSpy = spyOn(service, 'captureWarning').and.callThrough();

    service.auditEvent('offline_queue_flush', { performedBy: 'user-123' });

    expect(warningSpy).toHaveBeenCalledWith(
      'audit',
      'offline_queue_flush',
      'Failed to persist audit event',
      jasmine.objectContaining({
        metadata: { performedBy: 'user-123' },
        error: jasmine.any(Error)
      })
    );
  });
});
