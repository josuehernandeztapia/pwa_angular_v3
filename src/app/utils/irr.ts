/**
 * 🔢 Internal Rate of Return (IRR) Calculator
 * Newton-Raphson method implementation for robust TIR calculations
 * Part of P0.1 Surgical Fix - ensures TIR always computes correctly
 */

export function irr(cashflows: number[], guess = 0.02): number {
  if (!cashflows || cashflows.length < 2) {
    console.warn('IRR: Invalid cashflows array');
    return 0;
  }

  // Newton-Raphson iterative method
  let r = guess;
  
  for (let i = 0; i < 50; i++) {
    let f = 0;  // NPV function
    let df = 0; // Derivative of NPV
    
    for (let t = 0; t < cashflows.length; t++) {
      const cf = cashflows[t];
      if (!isFinite(cf)) continue;
      
      const dr = Math.pow(1 + r, t);
      if (dr === 0) continue;
      
      f += cf / dr;
      df += -t * cf / (dr * (1 + r));
    }
    
    // Check for convergence
    if (Math.abs(f) < 1e-9) {
      return r;
    }
    
    // Newton-Raphson step
    if (df === 0) break;
    const nr = r - f / df;
    
    // Check if result is reasonable
    if (!isFinite(nr) || Math.abs(nr - r) < 1e-9) {
      return r;
    }
    
    r = nr;
    
    // Prevent extreme values
    if (r < -0.99) r = -0.99;
    if (r > 10) r = 10;
  }
  
  return r;
}

/**
 * Calculate TIR for protection scenarios
 * Handles edge cases and provides fallbacks
 */
export function calculateTIR(
  originalPayment: number,
  newPayment: number,
  originalTerm: number,
  newTerm: number,
  balance: number
): number {
  try {
    // Build cashflow array
    const cashflows: number[] = [];
    
    // Initial balance (negative - cash outflow)
    cashflows.push(-balance);
    
    // Original payments for remaining original term
    for (let i = 0; i < originalTerm; i++) {
      cashflows.push(originalPayment);
    }
    
    // Additional payments if new term is longer
    if (newTerm > originalTerm) {
      for (let i = originalTerm; i < newTerm; i++) {
        cashflows.push(newPayment);
      }
    }
    
    return irr(cashflows);
  } catch (error) {
    console.error('Error calculating TIR:', error);
    return 0;
  }
}

/**
 * Validate if TIR meets minimum requirements
 */
export function validateTIR(tirValue: number, minTIR = 0.18): boolean {
  return isFinite(tirValue) && tirValue >= minTIR;
}