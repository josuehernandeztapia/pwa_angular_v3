import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { VoiceValidationService } from './voice-validation.service';
import { ConsolidatedAVIResult } from './voice-validation.service';

class ApiConfigServiceStub {
  config$ = of(null);
  isMockMode(): boolean { return true; }
  loadAVIQuestions() {
    return of({
      success: true,
      data: {
        questions: [],
        version: 'test',
        lastUpdated: new Date().toISOString()
      }
    });
  }
  loadRiskThresholds() {
    return of({
      success: true,
      data: {
        thresholds: {
          low: 0.25,
          medium: 0.5,
          high: 0.75,
          critical: 0.9
        },
        coefficients: {
          global: { alpha: 0.25, beta: 0.25, gamma: 0.25, delta: 0.25 },
          byStressLevel: {}
        },
        version: 'test',
        lastUpdated: new Date().toISOString()
      }
    });
  }
  loadGeographicRisk() {
    return of({
      success: true,
      data: {
        matrix: {},
        multipliers: {},
        version: 'test',
        lastUpdated: new Date().toISOString()
      }
    });
  }
}

describe('VoiceValidationService', () => {
  let service: VoiceValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        VoiceValidationService,
        { provide: ApiConfigService, useClass: ApiConfigServiceStub }
      ]
    });

    service = TestBed.inject(VoiceValidationService);
  });

  const buildAviResult = (score: number, protection = true): ConsolidatedAVIResult => ({
    final_score: score,
    risk_level: 'LOW',
    scientific_engine_score: score,
    heuristic_engine_score: score,
    consensus_weight: 0.8,
    protection_eligible: protection,
    decision: score >= 780 ? 'GO' : score >= 551 ? 'REVIEW' : 'NO-GO',
    detailed_breakdown: [],
    red_flags: [],
    recommendations: []
  });

  it('should classify scores >= 780 as GO when protection eligible', () => {
    const result = service.calculateHASEWithAVI(90, 80, buildAviResult(800, true));
    expect(result.decision).toBe('GO');
    expect(result.protection_eligible).toBeTrue();
    expect(result.final_score).toBeGreaterThanOrEqual(780);
  });

  it('should classify scores between 551-779 as REVIEW or GO without protection', () => {
    const review = service.calculateHASEWithAVI(70, 60, buildAviResult(700, true));
    expect(review.decision).toBe('REVIEW');

    const downgraded = service.calculateHASEWithAVI(85, 80, buildAviResult(820, false));
    expect(downgraded.decision).toBe('REVIEW');
    expect(downgraded.protection_eligible).toBeFalse();
  });

  it('should classify scores below 551 as NO-GO', () => {
    const noGo = service.calculateHASEWithAVI(10, 20, buildAviResult(400, false));
    expect(noGo.decision).toBe('NO-GO');
  });

  it('should flag long responses in heuristic fallback', () => {
    const longAudio = new Blob([new Uint8Array(16000 * 6)]); // ~6s duration
    const fallback = (service as any).applyHeuristicFallback(longAudio, 'test-question');

    expect(fallback.decision).toBe('REVIEW');
    expect(fallback.fallback).toBeTrue();
    expect(fallback.flags).toContain('response_too_long');
  });

  it('should flag suspiciously short responses in heuristic fallback', () => {
    const shortAudio = new Blob([new Uint8Array(1000)]); // <2s duration
    const fallback = (service as any).applyHeuristicFallback(shortAudio, 'test-question');

    expect(fallback.flags).toContain('response_too_short');
    expect(fallback.decision).toBe('REVIEW');
  });
});
