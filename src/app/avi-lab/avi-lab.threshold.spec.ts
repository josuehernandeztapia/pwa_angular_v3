import { TestBed } from '@angular/core/testing';
import { AviLabService } from './avi-lab.service';
import { AVI_THRESHOLD_TEST_CASES, AVI_THRESHOLDS_FIXTURE } from '../services/avi-thresholds.fixture';

describe('AviLab Threshold Alignment (minimal spec)', () => {
  let service: AviLabService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AviLabService],
    });
    service = TestBed.inject(AviLabService);
  });

  it('classifies scores correctly (fixture cases)', () => {
    AVI_THRESHOLD_TEST_CASES.forEach(({ score, expected }) => {
      const decision = service.classify(score);
      expect(decision).toBe(expected);
    });
  });

  it('LAB thresholds should match shared fixture constants', () => {
    expect((service as any).AVI_THRESHOLDS.GO_MIN).toBe(AVI_THRESHOLDS_FIXTURE.GO_MIN);
    expect((service as any).AVI_THRESHOLDS.NOGO_MAX).toBe(AVI_THRESHOLDS_FIXTURE.NOGO_MAX);
    expect((service as any).AVI_THRESHOLDS.REVIEW_MIN).toBe(AVI_THRESHOLDS_FIXTURE.REVIEW_MIN);
    expect((service as any).AVI_THRESHOLDS.REVIEW_MAX).toBe(AVI_THRESHOLDS_FIXTURE.REVIEW_MAX);
  });
});

