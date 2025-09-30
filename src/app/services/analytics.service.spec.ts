import { of, throwError } from 'rxjs';

import { AnalyticsService } from './analytics.service';
import { HttpClientService } from './http-client.service';
import { MonitoringService } from './monitoring.service';
import { environment } from '../../environments/environment';

defineGlobalNavigator();

describe('AnalyticsService', () => {
  let httpClient: jasmine.SpyObj<HttpClientService>;
  let monitoring: jasmine.SpyObj<MonitoringService>;
  let service: AnalyticsService | null;

  let originalEnableAnalytics: boolean;
  let originalEventsEndpoint: string;
  let originalMetricsEndpoint: string;
  let originalDatadogEndpoint: string | undefined;
  let originalSlackWebhook: string | undefined;

  beforeEach(() => {
    originalEnableAnalytics = environment.features.enableAnalytics;
    originalEventsEndpoint = environment.analytics.eventsEndpoint;
    originalMetricsEndpoint = environment.analytics.metricsEndpoint;
    originalDatadogEndpoint = environment.monitoring?.datadogEndpoint;
    originalSlackWebhook = environment.monitoring?.slackWebhook;

    environment.monitoring.datadogEndpoint = 'monitoring/datadog';
    environment.monitoring.slackWebhook = 'monitoring/slack';

    httpClient = jasmine.createSpyObj<HttpClientService>('HttpClientService', ['post']);
    monitoring = jasmine.createSpyObj<MonitoringService>('MonitoringService', ['captureInfo', 'captureWarning']);

    spyOn(window.localStorage, 'getItem').and.returnValue(null);
    spyOn(window.localStorage, 'setItem').and.stub();
    service = null;
  });

  afterEach(() => {
    environment.features.enableAnalytics = originalEnableAnalytics;
    environment.analytics.eventsEndpoint = originalEventsEndpoint;
    environment.analytics.metricsEndpoint = originalMetricsEndpoint;
    environment.monitoring.datadogEndpoint = originalDatadogEndpoint ?? '';
    environment.monitoring.slackWebhook = originalSlackWebhook ?? '';

    if (service) {
      const handle = (service as any).flushHandle as ReturnType<typeof setInterval> | null;
      if (handle) {
        clearInterval(handle);
        (service as any).flushHandle = null;
      }
    }
  });

  it('dispatches events and notifies auxiliary sinks when analytics is enabled', () => {
    environment.features.enableAnalytics = true;
    environment.analytics.eventsEndpoint = '/api/analytics/track';
    environment.analytics.metricsEndpoint = '/api/analytics/metric';
    httpClient.post.and.returnValue(of({ success: true }));

    service = new AnalyticsService(httpClient, monitoring);
    service.track('avi_event_completed', { advisorId: '123' });

    expect(httpClient.post).toHaveBeenCalledWith('/api/analytics/track', jasmine.objectContaining({ event: 'avi_event_completed' }), {
      showLoading: false,
      showError: false,
    });
    expect(monitoring.captureInfo).toHaveBeenCalledWith('analytics', 'event_delivered', jasmine.objectContaining({
      event: 'avi_event_completed',
      analyticsId: jasmine.any(String),
    }));

    const calledEndpoints = httpClient.post.calls.allArgs().map(args => args[0]);
    expect(calledEndpoints).toContain('/api/analytics/track');
    expect(calledEndpoints).toContain('monitoring/datadog');
    expect(calledEndpoints).toContain('monitoring/slack');

    expect(monitoring.captureWarning).not.toHaveBeenCalled();
  });

  it('skips dispatch when analytics is disabled', () => {
    environment.features.enableAnalytics = false;
    httpClient.post.and.returnValue(of({ success: true }));

    service = new AnalyticsService(httpClient, monitoring);
    service.track('avi_event_completed', {});

    expect(httpClient.post).not.toHaveBeenCalled();
    expect(monitoring.captureInfo).not.toHaveBeenCalled();
  });

  it('captures warning when dispatch fails', () => {
    environment.features.enableAnalytics = true;
    environment.analytics.eventsEndpoint = '/api/analytics/track';
    httpClient.post.and.returnValue(throwError(() => new Error('network failure')));

    service = new AnalyticsService(httpClient, monitoring);
    service.track('protection_flow_started', {});

    expect(monitoring.captureWarning).toHaveBeenCalledWith('analytics', 'dispatch_failed', jasmine.any(String), jasmine.objectContaining({
      endpoint: '/api/analytics/track',
    }));
  });
});

function defineGlobalNavigator(): void {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return;
  }

  Object.defineProperty(window, 'navigator', {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });
}
