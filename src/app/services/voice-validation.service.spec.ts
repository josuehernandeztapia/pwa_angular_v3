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

  // FIXED: Use correct thresholds from TECHNICAL_GUIDE.md (<65, 65-79, ≥80)
  const buildAviResult = (score: number, protection = true): ConsolidatedAVIResult => ({
    final_score: score,
    risk_level: score >= 80 ? 'LOW' : score >= 65 ? 'MEDIUM' : 'HIGH',
    scientific_engine_score: score,
    heuristic_engine_score: score,
    consensus_weight: 0.8,
    protection_eligible: protection,
    decision: score >= 80 ? 'GO' : score >= 65 ? 'REVIEW' : 'NO-GO',
    detailed_breakdown: [],
    red_flags: [],
    recommendations: []
  });

  // FIXED: Test NO-GO case (score < 65)
  it('should classify scores below 65 as NO-GO', () => {
    const noGo = service.calculateHASEWithAVI(60, 55, buildAviResult(60, false));
    expect(noGo.decision).toBe('NO-GO');
    expect(noGo.final_score).toBeLessThan(65);
  });

  // FIXED: Test boundary case (exactly 64 → NO-GO)
  it('should classify score 64 as NO-GO (boundary)', () => {
    const boundary = service.calculateHASEWithAVI(64, 60, buildAviResult(64, true));
    expect(boundary.decision).toBe('NO-GO');
    expect(boundary.final_score).toBe(64);
  });

  // FIXED: Test REVIEW range (65-79)
  it('should classify scores between 65-79 as REVIEW', () => {
    const review65 = service.calculateHASEWithAVI(65, 60, buildAviResult(65, true));
    expect(review65.decision).toBe('REVIEW');
    expect(review65.final_score).toBe(65);

    const review70 = service.calculateHASEWithAVI(70, 68, buildAviResult(70, true));
    expect(review70.decision).toBe('REVIEW');
    expect(review70.final_score).toBe(70);

    const review79 = service.calculateHASEWithAVI(79, 75, buildAviResult(79, true));
    expect(review79.decision).toBe('REVIEW');
    expect(review79.final_score).toBe(79);
  });

  // FIXED: Test GO case (score ≥ 80)
  it('should classify scores >= 80 as GO when protection eligible', () => {
    const go80 = service.calculateHASEWithAVI(80, 78, buildAviResult(80, true));
    expect(go80.decision).toBe('GO');
    expect(go80.protection_eligible).toBeTrue();
    expect(go80.final_score).toBe(80);

    const go85 = service.calculateHASEWithAVI(85, 82, buildAviResult(85, true));
    expect(go85.decision).toBe('GO');
    expect(go85.protection_eligible).toBeTrue();
    expect(go85.final_score).toBe(85);
  });

  // FIXED: Test protection eligibility downgrade
  it('should downgrade GO to REVIEW when protection not eligible', () => {
    const downgraded = service.calculateHASEWithAVI(85, 82, buildAviResult(85, false));
    expect(downgraded.decision).toBe('REVIEW');
    expect(downgraded.protection_eligible).toBeFalse();
    expect(downgraded.final_score).toBe(85);
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