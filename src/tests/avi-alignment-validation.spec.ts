import { AVIAlignmentValidator } from './avi-alignment-validation';

describe('AVI Alignment Validation', () => {
  let validator: AVIAlignmentValidator;

  beforeEach(() => {
    validator = new AVIAlignmentValidator();
  });

  it('should validate MAIN vs LAB algorithm alignment', async () => {
    const results = await validator.executeValidation();

    // At least 95% alignment is required for production
    expect(results.identicalPercentage).toBeGreaterThanOrEqual(95);
    expect(results.status).toBe('✅ ALIGNED');
  });

  it('should validate threshold alignment with expected decisions', async () => {
    const results = await validator.executeValidation();

    // All tests should align with expected GO/REVIEW/NO-GO decisions
    expect(results.thresholdPercentage).toBe(100);
  });
});