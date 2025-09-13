import { RiskService } from './risk.service';
import { ApiConfigService } from './api-config.service';

describe('RiskService', () => {
  let svc: RiskService;
  let api: jasmine.SpyObj<ApiConfigService>;

  beforeEach(() => {
    api = jasmine.createSpyObj('ApiConfigService', ['loadGeographicRisk']);
    // Mock returns an observable with empty config (so env premiums apply)
    (api.loadGeographicRisk as any).and.returnValue({ subscribe: ({ next }: any) => next({ success: true, data: { riskMatrix: {}, multipliers: { urban: 1, rural: 1, highway: 1, conflictZone: 1 } } }) });
    svc = new RiskService(api as unknown as ApiConfigService);
  });

  it('returns 0 bps when no context is provided', () => {
    const bps = svc.getIrrPremiumBps({});
    expect(bps).toBe(0);
  });
});

