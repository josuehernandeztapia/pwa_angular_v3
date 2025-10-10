export interface MathValidationSnapshot {
  principal: number;
  monthlyPayment: number;
  term: number;
  annualRate?: number;
  expectedMonthlyPayment?: number;
  tirMonthly?: number;
  tirAnnual?: number;
  deltaPayment?: number;
  deltaPercent?: number;
  withinTolerance: boolean;
  tolerance?: number;
  lastUpdated: number;
}
