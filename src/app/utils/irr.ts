/**
 * 🧮 IRR (Internal Rate of Return) Calculator
 * Newton-Raphson method implementation for financial calculations
 */

export function irr(cashflows: number[], guess = 0.02): number {
  if (!cashflows || cashflows.length < 2) {
    throw new Error('IRR requires at least 2 cashflow values');
  }

  // Newton-Raphson iteration
  let r = guess;
  const maxIterations = 50;
  const tolerance = 1e-9;

  for (let i = 0; i < maxIterations; i++) {
    let f = 0;
    let df = 0;

    // Calculate NPV and its derivative
    for (let t = 0; t < cashflows.length; t++) {
      const cf = cashflows[t];
      const dr = Math.pow(1 + r, t);

      if (dr === 0) return NaN; // Avoid division by zero

      f += cf / dr;
      df += -t * cf / Math.pow(1 + r, t + 1);
    }

    if (Math.abs(f) < tolerance) {
      return r; // Converged
    }

    if (Math.abs(df) < tolerance) {
      break; // Derivative too small, can't continue
    }

    const newR = r - f / df;

    // Check for convergence
    if (Math.abs(newR - r) < tolerance) {
      return newR;
    }

    r = newR;

    // Prevent extreme values
    if (!isFinite(r) || Math.abs(r) > 10) {
      break;
    }
  }

  return r;
}

/**
 * Calculate effective rate considering fees and insurance
 */
export function calculateEffectiveRate(
  principal: number,
  monthlyPayment: number,
  termMonths: number,
  fees: number = 0
): number {
  // Create cashflow array: -principal (outflow), then monthly payments (inflows)
  const cashflows = [-principal - fees];

  for (let i = 0; i < termMonths; i++) {
    cashflows.push(monthlyPayment);
  }

  try {
    const monthlyRate = irr(cashflows);
    return monthlyRate * 12; // Convert to annual rate
  } catch (error) {
    // Try bisection method as fallback
    try {
      return irrBisection(cashflows, -0.99, 5.0, 1e-6, 1000);
    } catch (bisectionError) {
      console.warn('IRR calculation failed (Newton-Raphson and Bisection):', error);
      return approximateIRR(cashflows);
    }
    return NaN;
  }
}

/**
 * Validate IRR result against minimum acceptable rate
 */
export function validateIRR(
  irrValue: number,
  minRate: number = 0.18,
  maxRate: number = 0.35
): {
  isValid: boolean;
  reason?: string;
  severity: 'info' | 'warning' | 'error';
} {
  if (!isFinite(irrValue) || isNaN(irrValue)) {
    return {
      isValid: false,
      reason: 'IRR calculation resulted in invalid value',
      severity: 'error'
    };
  }

  if (irrValue < minRate) {
    return {
      isValid: false,
      reason: `IRR (${(irrValue * 100).toFixed(2)}%) below minimum required rate (${(minRate * 100).toFixed(2)}%)`,
      severity: 'error'
    };
  }

  if (irrValue > maxRate) {
    return {
      isValid: false,
      reason: `IRR (${(irrValue * 100).toFixed(2)}%) exceeds maximum acceptable rate (${(maxRate * 100).toFixed(2)}%)`,
      severity: 'warning'
    };
  }

  return {
    isValid: true,
    severity: 'info'
  };
}

/**
 * Bisection method fallback for TIR calculation
 */
export function irrBisection(cashflows: number[], low = -0.99, high = 5.0, tolerance = 1e-6, maxIterations = 1000): number {
  if (!cashflows || cashflows.length < 2) {
    throw new Error('IRR requires at least 2 cashflow values');
  }

  function calculateNPV(rate: number): number {
    let npv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      npv += cashflows[t] / Math.pow(1 + rate, t);
    }
    return npv;
  }

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const npvMid = calculateNPV(mid);

    if (Math.abs(npvMid) < tolerance) {
      return mid;
    }

    const npvLow = calculateNPV(low);
    if ((npvLow > 0 && npvMid > 0) || (npvLow < 0 && npvMid < 0)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  throw new Error('Bisection method failed to converge');
}

/**
 * Simple approximation fallback for TIR
 */
export function approximateIRR(cashflows: number[]): number {
  if (!cashflows || cashflows.length < 2) return NaN;

  const totalInflow = cashflows.slice(1).reduce((sum, cf) => sum + Math.max(0, cf), 0);
  const initialOutflow = Math.abs(cashflows[0]);

  if (initialOutflow === 0 || totalInflow === 0) return 0;

  // Simple approximation: (total return / initial investment)^(1/periods) - 1
  const periods = cashflows.length - 1;
  const totalReturn = totalInflow / initialOutflow;

  return Math.pow(totalReturn, 1 / periods) - 1;
}