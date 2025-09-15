/**
 * 🧮 IRR Calculator - Newton-Raphson Method
 * Quirúrgico calculation for post-protection TIR
 */

export interface IRRResult {
  irr: number;
  isValid: boolean;
  iterations: number;
}

export function calculateIRR(cashflows: number[], guess: number = 0.02, maxIterations: number = 100): IRRResult {
  if (cashflows.length < 2) {
    return { irr: 0, isValid: false, iterations: 0 };
  }

  let r = guess;
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;

    let npv = 0;
    let derivativeNPV = 0;

    // Calculate NPV and its derivative
    for (let t = 0; t < cashflows.length; t++) {
      const cashflow = cashflows[t];
      const discountFactor = Math.pow(1 + r, t);

      npv += cashflow / discountFactor;

      if (t > 0) {
        derivativeNPV += (-t * cashflow) / (discountFactor * (1 + r));
      }
    }

    // Newton-Raphson step
    if (Math.abs(derivativeNPV) < 1e-12) {
      break; // Avoid division by zero
    }

    const newR = r - npv / derivativeNPV;

    // Check for convergence
    if (Math.abs(newR - r) < 1e-10) {
      return { irr: newR, isValid: true, iterations };
    }

    // Check for valid range
    if (!isFinite(newR) || Math.abs(newR) > 100) {
      return { irr: r, isValid: false, iterations };
    }

    r = newR;
  }

  return { irr: r, isValid: iterations < maxIterations, iterations };
}

export function calculateModifiedPayment(
  originalPayment: number,
  originalTerm: number,
  newRate: number,
  targetPayment?: number
): { Mprime: number; nPrime: number; feasible: boolean } {

  if (targetPayment && targetPayment > 0) {
    // Calculate new term for target payment
    const monthlyRate = newRate / 12;
    const logNumerator = Math.log(1 + (targetPayment * monthlyRate) / targetPayment);
    const logDenominator = Math.log(1 + monthlyRate);
    const nPrime = Math.ceil(logNumerator / logDenominator);

    return {
      Mprime: targetPayment,
      nPrime: Math.min(nPrime, originalTerm * 1.5), // Cap at 50% extension
      feasible: nPrime <= originalTerm * 1.5
    };
  }

  // Keep original payment, extend term if needed
  const adjustmentFactor = Math.min(1.2, Math.max(0.8, newRate / 0.18)); // Rate-based adjustment
  const Mprime = originalPayment * adjustmentFactor;
  const nPrime = Math.ceil(originalTerm * (1 / adjustmentFactor));

  return {
    Mprime: Math.round(Mprime),
    nPrime: Math.min(nPrime, 84), // Max 7 years
    feasible: nPrime <= 84 && Mprime >= originalPayment * 0.7
  };
}