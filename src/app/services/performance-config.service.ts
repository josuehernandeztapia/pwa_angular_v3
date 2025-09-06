import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigurationService } from './configuration.service';

export interface PerformanceConfig {
  delays?: Partial<Record<'document_load' | 'contract_generation' | 'status_update' | 'validation' | 'ecosystem_check', number>>;
  timeouts?: Partial<Record<'api_call' | 'file_upload' | 'pdf_generation' | 'kyc_verification', number>>;
  retries?: { max_attempts: number; backoff_ms: number; exponential?: boolean };
  profiles?: Record<string, PerformanceConfig>;
}

@Injectable({ providedIn: 'root' })
export class PerformanceConfigService {
  private readonly DEFAULTS: PerformanceConfig = {
    delays: {
      document_load: 100,
      contract_generation: 200,
      status_update: 300,
      validation: 500,
      ecosystem_check: 800
    },
    timeouts: {
      api_call: 30000,
      file_upload: 60000,
      pdf_generation: 45000,
      kyc_verification: 120000
    },
    retries: { max_attempts: 3, backoff_ms: 1000, exponential: true }
  };

  constructor(private config: ConfigurationService) {}

  getConfig(profile?: string): Observable<PerformanceConfig> {
    return this.config.loadNamespace<PerformanceConfig>('system/performance', this.DEFAULTS).pipe(
      map(cfg => {
        if (profile && cfg.profiles && cfg.profiles[profile]) {
          return this.merge(this.merge(this.DEFAULTS, cfg), cfg.profiles[profile]);
        }
        return this.merge(this.DEFAULTS, cfg);
      })
    );
  }

  getDelay(key: keyof NonNullable<PerformanceConfig['delays']>, profile?: string): Observable<number> {
    return this.getConfig(profile).pipe(map(c => c.delays?.[key] ?? this.DEFAULTS.delays![key]!));
  }

  getTimeout(key: keyof NonNullable<PerformanceConfig['timeouts']>, profile?: string): Observable<number> {
    return this.getConfig(profile).pipe(map(c => c.timeouts?.[key] ?? this.DEFAULTS.timeouts![key]!));
  }

  private merge<T>(base: T, extra?: Partial<T>): T {
    if (!extra) return base;
    const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
    for (const k of Object.keys(extra)) {
      const v: any = (extra as any)[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = this.merge((base as any)[k] || {}, v);
      } else {
        out[k] = v;
      }
    }
    return out as T;
  }
}

