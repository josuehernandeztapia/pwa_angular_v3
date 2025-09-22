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
    risk_level: score >= 780 ? 'LOW' : score >= 551 ? 'MEDIUM' : 'HIGH',
    scientific_engine_score: score,
    heuristic_engine_score: score,
    consensus_weight: 0.8,
    protection_eligible: protection,
    decision: score >= 780 ? 'GO' : score >= 551 ? 'REVIEW' : 'NO-GO',
    detailed_breakdown: [],
    red_flags: [],
    recommendations: []
  });

  it('should classify high achievable scores as REVIEW (max ~550)', () => {
    // With current weights (0.30/0.20/0.50), max achievable score is ~550
    const result = service.calculateHASEWithAVI(90, 85, buildAviResult(550, true));
    expect(result.decision).toBe('REVIEW'); // Realistic expectation
    expect(result.protection_eligible).toBeTrue();
    expect(result.final_score).toBe(550); // Score we actually passed
  });

  it('should classify scores between 551-779 as REVIEW', () => {
    const review = service.calculateHASEWithAVI(70, 60, buildAviResult(650, true));
    expect(review.decision).toBe('REVIEW');
    expect(review.final_score).toBeGreaterThanOrEqual(551);
    expect(review.final_score).toBeLessThan(780);

    const borderReview = service.calculateHASEWithAVI(80, 75, buildAviResult(700, true));
    expect(borderReview.decision).toBe('REVIEW');
  });

  it('should classify scores below 551 as NO-GO', () => {
    const noGo = service.calculateHASEWithAVI(30, 20, buildAviResult(400, false));
    expect(noGo.decision).toBe('NO-GO');
    expect(noGo.final_score).toBeLessThan(551);
  });

  it('should test theoretical GO case (score ≥780)', () => {
    // This tests the threshold logic even though it's not achievable with current weights
    const theoretical = service.calculateHASEWithAVI(95, 90, buildAviResult(800, true));
    expect(theoretical.decision).toBe('GO');
    expect(theoretical.protection_eligible).toBeTrue();
    expect(theoretical.final_score).toBeGreaterThanOrEqual(780);
  });

  it('should downgrade GO to REVIEW when protection not eligible', () => {
    const downgraded = service.calculateHASEWithAVI(95, 90, buildAviResult(800, false));
    expect(downgraded.decision).toBe('REVIEW');
    expect(downgraded.protection_eligible).toBeFalse();
    expect(downgraded.final_score).toBeGreaterThanOrEqual(780);
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
