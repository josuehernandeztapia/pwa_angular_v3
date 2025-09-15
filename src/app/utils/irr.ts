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
      df += -t * cf / (dr * (1 + r));
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
    console.warn('IRR calculation failed:', error);
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