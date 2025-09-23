/**
 * AVI (Automated Voice Intelligence) Thresholds Configuration
 *
 * Single source of truth for all voice validation scoring thresholds.
 * Scale: 0-1000 points
 *
 * IMPORTANT: Any changes to these values must be reviewed by:
 * - Risk Management Team
 * - QA Team
 * - Product Owner
 */

export const AVI_THRESHOLDS = {
  /** Minimum threshold for GO decision (automatic approval) */
  GO_MIN: 780,

  /** Maximum threshold for NO-GO decision (automatic rejection) */
  NOGO_MAX: 550,

  /** Review range start (requires manual review) */
  REVIEW_MIN: 551,

  /** Review range end (requires manual review) */
  REVIEW_MAX: 779
} as const;

/**
 * Helper functions for threshold validation
 */
export const ThresholdHelpers = {
  /**
   * Validate threshold consistency at runtime
   */
  validateConsistency(): void {
    if (AVI_THRESHOLDS.NOGO_MAX >= AVI_THRESHOLDS.REVIEW_MIN) {
      throw new Error('AVI_THRESHOLDS: NOGO_MAX must be less than REVIEW_MIN');
    }
    if (AVI_THRESHOLDS.REVIEW_MAX >= AVI_THRESHOLDS.GO_MIN) {
      throw new Error('AVI_THRESHOLDS: REVIEW_MAX must be less than GO_MIN');
    }
    if (AVI_THRESHOLDS.REVIEW_MIN !== AVI_THRESHOLDS.NOGO_MAX + 1) {
      throw new Error('AVI_THRESHOLDS: REVIEW_MIN should be NOGO_MAX + 1 for seamless ranges');
    }
  },

  /**
   * Get decision based on score
   */
  getDecision(score: number): 'GO' | 'REVIEW' | 'NO-GO' {
    if (score >= AVI_THRESHOLDS.GO_MIN) return 'GO';
    if (score <= AVI_THRESHOLDS.NOGO_MAX) return 'NO-GO';
    return 'REVIEW';
  },

  /**
   * Get risk level based on score
   */
  getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score >= AVI_THRESHOLDS.GO_MIN) return 'LOW';
    if (score >= AVI_THRESHOLDS.REVIEW_MIN) return 'MEDIUM';
    return 'HIGH';
  }
} as const;

// Validate consistency on import
ThresholdHelpers.validateConsistency();