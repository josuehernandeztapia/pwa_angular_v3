import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AviLabService {
  // Thresholds aligned with MAIN and shared fixture
  public readonly AVI_THRESHOLDS = {
    GO_MIN: 780,
    REVIEW_MIN: 551,
    REVIEW_MAX: 779,
    NOGO_MAX: 550
  } as const;

  classify(score: number): 'GO' | 'REVIEW' | 'NO-GO' {
    if (score >= this.AVI_THRESHOLDS.GO_MIN) return 'GO';
    if (score >= this.AVI_THRESHOLDS.REVIEW_MIN && score <= this.AVI_THRESHOLDS.REVIEW_MAX) return 'REVIEW';
    return 'NO-GO';
  }
}

