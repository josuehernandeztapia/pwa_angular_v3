import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfigurationService } from './configuration.service';
import { PerformanceConfig, PerformanceConfigService } from './performance-config.service';

class MockConfigurationService {
	private mockValue: any = undefined;

	setValue(value: any) {
		this.mockValue = value;
	}

	loadNamespace<T = any>(namespace: string, defaultValue: T) {
		return of((this.mockValue as T) ?? defaultValue);
	}
}

describe('PerformanceConfigService', () => {
	let service: PerformanceConfigService;
	let config: MockConfigurationService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				PerformanceConfigService,
				{ provide: ConfigurationService, useClass: MockConfigurationService }
			]
		});
		service = TestBed.inject(PerformanceConfigService);
		config = TestBed.inject(ConfigurationService) as unknown as MockConfigurationService;
	});

	it('should return defaults when no config provided', (done) => {
		config.setValue(undefined);
		service.getConfig().subscribe(cfg => {
			expect(cfg.delays?.document_load).toBe(100);
			expect(cfg.timeouts?.api_call).toBe(30000);
			expect(cfg.retries?.max_attempts).toBe(3);
			done();
		});
	});

	it('should override defaults with provided config', (done) => {
		const override: PerformanceConfig = { delays: { validation: 900 } };
		config.setValue(override);
		service.getDelay('validation').subscribe(value => {
			expect(value).toBe(900);
			done();
		});
	});

	it('should merge profile-specific overrides', (done) => {
		const cfg: PerformanceConfig = {
			profiles: {
				test: {
					delays: { document_load: 5 },
					timeouts: { api_call: 2000 },
					retries: { max_attempts: 1, backoff_ms: 10, exponential: false }
				}
			}
		};
		config.setValue(cfg);
		service.getConfig('test').subscribe(merged => {
			expect(merged.delays?.document_load).toBe(5);
			// Inherit other defaults
			expect(merged.delays?.validation).toBe(500);
			expect(merged.timeouts?.api_call).toBe(2000);
			expect(merged.timeouts?.file_upload).toBe(60000);
			expect(merged.retries?.max_attempts).toBe(1);
			expect(merged.retries?.backoff_ms).toBe(10);
			expect(merged.retries?.exponential).toBe(false);
			done();
		});
	});

	it('getDelay/getTimeout should return numeric values from profile or defaults', (done) => {
		config.setValue({ profiles: { qa: { delays: { ecosystem_check: 123 }, timeouts: { pdf_generation: 9999 } } } });
		let pending = 2;
		service.getDelay('ecosystem_check', 'qa').subscribe(value => {
			expect(value).toBe(123);
			if (--pending === 0) done();
		});
		service.getTimeout('pdf_generation', 'qa').subscribe(value => {
			expect(value).toBe(9999);
			if (--pending === 0) done();
		});
	});
});