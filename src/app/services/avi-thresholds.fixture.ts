// ✅ Single Source of Truth for AVI threshold test data
// Thresholds: NO-GO ≤ 550, REVIEW 551–779, GO ≥ 780

export const AVI_THRESHOLDS_FIXTURE = {
  GO_MIN: 780,
  REVIEW_MIN: 551,
  REVIEW_MAX: 779,
  NOGO_MAX: 550,
} as const;

// Casos de borde e intermedios para validar consistencia
export const AVI_THRESHOLD_TEST_CASES: { score: number; expected: 'GO' | 'REVIEW' | 'NO-GO' }[] = [
  { score: 500, expected: 'NO-GO' },
  { score: 550, expected: 'NO-GO' },
  { score: 551, expected: 'REVIEW' },
  { score: 600, expected: 'REVIEW' },
  { score: 779, expected: 'REVIEW' },
  { score: 780, expected: 'GO' },
  { score: 900, expected: 'GO' },
  { score: 1000, expected: 'GO' },
];

