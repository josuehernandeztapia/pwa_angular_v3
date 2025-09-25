import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { VoiceValidationService } from './voice-validation.service';
import { ConsolidatedAVIResult } from './voice-validation.service';
import { AVI_THRESHOLDS, ThresholdHelpers } from './voice-validation.config';
import { AVI_THRESHOLD_TEST_CASES, AVI_THRESHOLDS_FIXTURE } from './avi-thresholds.fixture';

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

  // Use shared configuration for single source of truth
  const buildAviResult = (score: number, protection = true): ConsolidatedAVIResult => ({
    final_score: score,
    risk_level: ThresholdHelpers.getRiskLevel(score),
    scientific_engine_score: score,
    heuristic_engine_score: score,
    consensus_weight: 0.8,
    protection_eligible: protection,
    decision: ThresholdHelpers.getDecision(score),
    detailed_breakdown: [],
    red_flags: [],
    recommendations: []
  });

  // Test NO-GO case (score ≤ 550)
  it('should classify scores ≤ 550 as NO-GO', () => {
    const noGo = service.calculateHASEWithAVI(500, 450, buildAviResult(500, false));
    (expect(noGo.decision) as any).toBe('NO-GO');
    (expect(noGo.final_score) as any).toBeLessThanOrEqual(AVI_THRESHOLDS.NOGO_MAX);
  });

  // Test boundary case (exactly 550 → NO-GO)
  it('should classify score 550 as NO-GO (boundary)', () => {
    const boundary = service.calculateHASEWithAVI(550, 500, buildAviResult(550, true));
    (expect(boundary.decision) as any).toBe('NO-GO');
    (expect(boundary.final_score) as any).toBe(550);
  });

  // Test REVIEW range (551-779)
  it('should classify scores between 551-779 as REVIEW', () => {
    const review551 = service.calculateHASEWithAVI(551, 500, buildAviResult(551, true));
    (expect(review551.decision) as any).toBe('REVIEW');
    (expect(review551.final_score) as any).toBe(551);

    const review650 = service.calculateHASEWithAVI(650, 600, buildAviResult(650, true));
    (expect(review650.decision) as any).toBe('REVIEW');
    (expect(review650.final_score) as any).toBe(650);

    const review779 = service.calculateHASEWithAVI(779, 750, buildAviResult(779, true));
    (expect(review779.decision) as any).toBe('REVIEW');
    (expect(review779.final_score) as any).toBe(779);
  });

  // Test GO case (score ≥ 780)
  it('should classify scores >= 780 as GO when protection eligible', () => {
    const go780 = service.calculateHASEWithAVI(780, 750, buildAviResult(780, true));
    (expect(go780.decision) as any).toBe('GO');
    (expect(go780.protection_eligible) as any).toBeTrue();
    (expect(go780.final_score) as any).toBe(780);

    const go850 = service.calculateHASEWithAVI(850, 820, buildAviResult(850, true));
    (expect(go850.decision) as any).toBe('GO');
    (expect(go850.protection_eligible) as any).toBeTrue();
    (expect(go850.final_score) as any).toBe(850);
  });

  // Test protection eligibility downgrade
  it('should downgrade GO to REVIEW when protection not eligible', () => {
    const downgraded = service.calculateHASEWithAVI(850, 820, buildAviResult(850, false));
    (expect(downgraded.decision) as any).toBe('REVIEW');
    (expect(downgraded.protection_eligible) as any).toBeFalse();
    (expect(downgraded.final_score) as any).toBe(850);
  });

  it('should classify scores correctly according to thresholds (fixture cases)', () => {
    AVI_THRESHOLD_TEST_CASES.forEach(({ score, expected }) => {
      const result = service.calculateHASEWithAVI(score, score, buildAviResult(score, true));
      (expect(result.decision) as any).toBe(expected);
    });
  });

  it('service thresholds should match fixture constants', () => {
    const svcThresholds = (service as any).AVI_THRESHOLDS;
    (expect(svcThresholds.GO_MIN) as any).toBe(AVI_THRESHOLDS_FIXTURE.GO_MIN);
    (expect(svcThresholds.NOGO_MAX) as any).toBe(AVI_THRESHOLDS_FIXTURE.NOGO_MAX);
    (expect(svcThresholds.REVIEW_MIN) as any).toBe(AVI_THRESHOLDS_FIXTURE.REVIEW_MIN);
    (expect(svcThresholds.REVIEW_MAX) as any).toBe(AVI_THRESHOLDS_FIXTURE.REVIEW_MAX);
  });

  it('should have consistent thresholds (NO-GO < REVIEW < GO)', () => {
    (expect(AVI_THRESHOLDS.NOGO_MAX) as any).toBeLessThan(AVI_THRESHOLDS.REVIEW_MIN);
    (expect(AVI_THRESHOLDS.REVIEW_MAX) as any).toBeLessThan(AVI_THRESHOLDS.GO_MIN);
    (expect(AVI_THRESHOLDS.REVIEW_MIN) as any).toBe(AVI_THRESHOLDS.NOGO_MAX + 1);
  });

  it('should flag long responses in heuristic fallback', () => {
    const longAudio = new Blob([new Uint8Array(16000 * 6)]); // ~6s duration
    const fallback = (service as any).applyHeuristicFallback(longAudio, 'test-question');

    (expect(fallback.decision) as any).toBe('REVIEW');
    (expect(fallback.fallback) as any).toBeTrue();
    (expect(fallback.flags) as any).toContain('response_too_long');
  });

  it('should flag suspiciously short responses in heuristic fallback', () => {
    const shortAudio = new Blob([new Uint8Array(1000)]); // <2s duration
    const fallback = (service as any).applyHeuristicFallback(shortAudio, 'test-question');

    (expect(fallback.flags) as any).toContain('response_too_short');
    (expect(fallback.decision) as any).toBe('REVIEW');
  });
});