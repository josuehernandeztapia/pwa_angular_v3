import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { BusinessFlow, Market, Quote } from '../models/types';
import { monthsToYearsCeil, round2, toAnnualFromMonthly } from '../utils/math.util';
import { FinancialCalculatorService } from './financial-calculator.service';

// Port exacto de React getProductPackage types
export interface ProductComponent {
  id: string;
  name: string;
  price: number;
  isOptional: boolean;
  isMultipliedByTerm?: boolean;
}

export interface ProductPackage {
  name: string;
  rate: number;
  terms: number[];
  minDownPaymentPercentage: number;
  maxDownPaymentPercentage?: number; // Para rangos variables como EdoMex
  defaultMembers?: number;
  maxMembers?: number; // Máximo lógico para crédito colectivo
  components: ProductComponent[];
}

export interface CotizadorConfig {
  totalPrice: number;
  downPayment: number;
  term: number;
  market: Market;
  clientType: 'Individual' | 'Colectivo';
  businessFlow: BusinessFlow;
}

export interface AmortizationRow {
  payment: number;
  principalPayment: number;
  interestPayment: number;
  balance: number;
}

@Injectable({
  providedIn: 'root'
})
export class CotizadorEngineService {

  constructor(private financialCalc: FinancialCalculatorService) { }

  /**
   * Port exacto de getProductPackage desde React simulationService.ts líneas 550-613
   */
  getProductPackage(market: string): Observable<ProductPackage> {
    const packages: { [key: string]: ProductPackage } = {
      // --- Aguascalientes ---
      'aguascalientes-plazo': {
        name: "Paquete Venta a Plazo - Aguascalientes",
        rate: 0.255,
        terms: [12, 24],
        minDownPaymentPercentage: 0.60,
        components: [
          { id: 'vagoneta_19p', name: 'Vagoneta H6C (19 Pasajeros)', price: 799000, isOptional: false },
          { id: 'gnv', name: 'Conversión GNV', price: 54000, isOptional: false }
        ]
      },
      'aguascalientes-directa': {
        name: "Paquete Compra de Contado - Aguascalientes",
        rate: 0,
        terms: [],
        minDownPaymentPercentage: 0.50, // 50% para compra de contado
        components: [
          { id: 'vagoneta_19p', name: 'Vagoneta H6C (19 Pasajeros)', price: 799000, isOptional: false },
          { id: 'gnv', name: 'Conversión GNV', price: 54000, isOptional: true } // Opcional en contado
        ]
      },
      // --- Estado de México ---
      'edomex-plazo': {
        name: "Paquete Venta a Plazo (Individual) - EdoMex",
        rate: 0.299,
        terms: [48, 60],
        minDownPaymentPercentage: 0.20, // Rango 20-25%, este es el mínimo
        maxDownPaymentPercentage: 0.25, // Máximo sugerido para individual
        components: [
          { id: 'vagoneta_ventanas', name: 'Vagoneta H6C (Ventanas)', price: 749000, isOptional: false },
          { id: 'gnv', name: 'Conversión GNV', price: 54000, isOptional: false },
          { id: 'tec', name: 'Paquete Tec (GPS, Cámaras)', price: 12000, isOptional: false },
          { id: 'bancas', name: 'Bancas', price: 22000, isOptional: false },
          { id: 'seguro', name: 'Seguro Anual', price: 36700, isOptional: false, isMultipliedByTerm: true }
        ]
      },
      'edomex-directa': {
        name: "Paquete Compra de Contado - EdoMex",
        rate: 0,
        terms: [],
        minDownPaymentPercentage: 0.50, // 50% para compra de contado
        components: [
          { id: 'vagoneta_ventanas', name: 'Vagoneta H6C (Ventanas)', price: 749000, isOptional: false },
          { id: 'gnv', name: 'Conversión GNV', price: 54000, isOptional: false }, // Obligatorio en EdoMex contado
          { id: 'bancas', name: 'Bancas', price: 22000, isOptional: false }, // Obligatorio en EdoMex contado
          // GPS+Cámaras+Seguro SOLO para venta a plazo/crédito, NO contado
        ]
      },
      'edomex-colectivo': {
        name: "Paquete Crédito Colectivo - EdoMex",
        rate: 0.299,
        terms: [60],
        minDownPaymentPercentage: 0.15, // Rango 15-20%, este es el mínimo
        maxDownPaymentPercentage: 0.20, // Máximo sugerido para colectivo
        defaultMembers: 5, // Mínimo 5 miembros
        maxMembers: 20, // Sin límite rígido, máximo lógico ~20
        components: [
          { id: 'vagoneta_ventanas', name: 'Vagoneta H6C (Ventanas)', price: 749000, isOptional: false },
          { id: 'gnv', name: 'Conversión GNV', price: 54000, isOptional: false },
          { id: 'tec', name: 'Paquete Tec (GPS, Cámaras)', price: 12000, isOptional: false },
          { id: 'bancas', name: 'Bancas', price: 22000, isOptional: false },
          { id: 'seguro', name: 'Seguro Anual', price: 36700, isOptional: false, isMultipliedByTerm: true }
        ]
      }
    };

    const selectedPackage = packages[market];
    if (!selectedPackage) {
      return throwError(() => new Error(`Paquete no encontrado para mercado: ${market}`));
    }

    // Port exacto de mockApi delay desde React
    return of(selectedPackage).pipe(delay(600));
  }

  /**
   * Calculate total package price including optional components
   */
  calculatePackagePrice(packageData: ProductPackage, term: number = 1, selectedOptionals: string[] = []): number {
    return round2(packageData.components.reduce((total, component) => {
      // Skip optional components not selected
      if (component.isOptional && !selectedOptionals.includes(component.id)) {
        return total;
      }

      let price = component.price;

      // Multiply by term if specified (like annual insurance). Use safe years calculation
      if (component.isMultipliedByTerm) {
        const years = monthsToYearsCeil(term);
        price = price * years;
      }

      return total + price;
    }, 0));
  }

  /**
   * Port exacto de getBalance calculation desde React
   */
  getBalance(principal: number, rate: number, term: number, paymentsMade: number): number {
    if (rate === 0) return principal - (principal / term * paymentsMade);
    
    const monthlyRate = rate / 12;
    const monthlyPayment = this.financialCalc.annuity(principal, monthlyRate, term);
    
    let balance = principal;
    for (let i = 0; i < paymentsMade; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance = Math.max(0, balance - principalPayment);
    }
    
    return round2(balance);
  }

  // Generate complete quote with financial calculations using real product packages
  generateQuoteWithPackage(market: string, selectedOptionals: string[] = [], downPayment: number = 0, term: number = 12): Observable<Quote & { packageData: ProductPackage }> {
    return this.getProductPackage(market).pipe(
      delay(100),
      map((packageData: ProductPackage) => {
        // Validate term against package allowed terms (if any)
        const validatedTerm = (packageData.terms && packageData.terms.length > 0)
          ? (packageData.terms.includes(term) ? term : packageData.terms[0])
          : term;

        const totalPrice = this.calculatePackagePrice(packageData, validatedTerm, selectedOptionals);

        // Determine default down payment if not provided
        let computedDownPayment = downPayment && Number.isFinite(downPayment)
          ? downPayment
          : totalPrice * packageData.minDownPaymentPercentage;

        // Clamp down payment within [min, max] if max provided; never >= total price
        const minDP = round2(totalPrice * packageData.minDownPaymentPercentage);
        const maxDP = round2(
          packageData.maxDownPaymentPercentage != null
            ? totalPrice * packageData.maxDownPaymentPercentage
            : Math.max(0, totalPrice - 0.01)
        );
        const finalDownPayment = round2(Math.min(Math.max(computedDownPayment, minDP), maxDP));

        const amountToFinance = round2(Math.max(0, totalPrice - finalDownPayment));

        // Use nominal monthly rate from annual package rate for consistency with tests and legacy
        const monthlyRate = packageData.rate > 0 ? packageData.rate / 12 : 0;
        const monthlyPayment = monthlyRate > 0
          ? round2(this.financialCalc.annuity(amountToFinance, monthlyRate, validatedTerm))
          : 0; // For direct sales

        return {
          totalPrice: round2(totalPrice),
          downPayment: finalDownPayment,
          amountToFinance,
          term: validatedTerm,
          monthlyPayment,
          market: market as Market,
          clientType: packageData.defaultMembers ? 'Colectivo' : 'Individual',
          flow: this.getBusinessFlowFromMarket(market),
          packageData
        };
      })
    );
  }

  // Generate complete quote with financial calculations (legacy method)
  generateQuote(config: CotizadorConfig): Quote {
    const amountToFinance = config.totalPrice - config.downPayment;
    const monthlyRate = this.getMonthlyRate(config.market);
    const monthlyPayment = this.financialCalc.annuity(amountToFinance, monthlyRate, config.term);

    return {
      totalPrice: config.totalPrice,
      downPayment: config.downPayment,
      amountToFinance,
      term: config.term,
      monthlyPayment,
      market: config.market,
      clientType: config.clientType,
      flow: config.businessFlow
    };
  }

  /**
   * Port exacto de business flow logic desde React
   */
  private getBusinessFlowFromMarket(market: string): BusinessFlow {
    if (market.includes('directa')) return BusinessFlow.VentaDirecta;
    if (market.includes('colectivo')) return BusinessFlow.CreditoColectivo;
    if (market.includes('plazo')) return BusinessFlow.VentaPlazo;
    return BusinessFlow.AhorroProgramado;
  }

  // Generate complete amortization table
  generateAmortizationTable(quote: Quote): AmortizationRow[] {
    const monthlyRate = this.getMonthlyRate(quote.market as Market);
    const rows: AmortizationRow[] = [];
    let balance = quote.amountToFinance;

    for (let payment = 1; payment <= quote.term; payment++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = quote.monthlyPayment - interestPayment;
      balance = Math.max(0, balance - principalPayment);

      rows.push({
        payment,
        principalPayment,
        interestPayment,
        balance
      });
    }

    return rows;
  }

  // Get monthly interest rate based on market
  private getMonthlyRate(market: Market): number {
    const annualRate = this.financialCalc.getTIRMin(market);
    return annualRate / 12;
  }

  // Validate quote configuration against business rules
  validateConfiguration(config: CotizadorConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Minimum down payment validation
    const minDownPaymentPct = this.getMinimumDownPayment(config.market, config.clientType);
    const actualDownPaymentPct = config.downPayment / config.totalPrice;
    
    if (actualDownPaymentPct < minDownPaymentPct) {
      errors.push(`El enganche mínimo para ${config.clientType} en ${config.market} es ${(minDownPaymentPct * 100).toFixed(0)}%`);
    }

    // Term validation
    const allowedTerms = this.getAllowedTerms(config.market);
    if (!allowedTerms.includes(config.term)) {
      errors.push(`Los plazos permitidos para ${config.market} son: ${allowedTerms.join(', ')} meses`);
    }

    // Price validation
    if (config.totalPrice <= 0) {
      errors.push('El precio total debe ser mayor a cero');
    }

    if (config.downPayment >= config.totalPrice) {
      errors.push('El enganche no puede ser igual o mayor al precio total');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get minimum down payment percentage based on market and client type
  private getMinimumDownPayment(market: Market, clientType: string): number {
    if (market === 'aguascalientes') {
      return 0.60; // 60% for Aguascalientes (matches package requirement)
    }
    if (market === 'edomex') {
      return clientType === 'Colectivo' ? 0.15 : 0.25; // 15% for Colectivo, 25% for Individual in EdoMex
    }
    return 0.20; // Default fallback
  }

  // Get allowed terms based on market
  private getAllowedTerms(market: Market): number[] {
    if (market === 'aguascalientes') {
      return [12, 24]; // AGS: 12/24 months
    }
    if (market === 'edomex') {
      return [48, 60]; // EdoMex: 48/60 months
    }
    return [12, 24]; // Default fallback
  }

  // Calculate total interest paid over the loan term
  getTotalInterest(quote: Quote): number {
    const totalPayments = round2(quote.monthlyPayment * quote.term);
    return round2(totalPayments - quote.amountToFinance);
  }

  // Get financial summary for display
  getFinancialSummary(quote: Quote): {
    totalCost: number;
    totalInterest: number;
    effectiveRate: number;
    paymentToIncomeRatio?: number;
  } {
    const totalInterest = this.getTotalInterest(quote);
    const totalCost = round2(quote.totalPrice + totalInterest);
    const effectiveRate = this.financialCalc.getTIRMin(quote.market as Market);

    return {
      totalCost,
      totalInterest,
      effectiveRate: effectiveRate * 100 // Convert to percentage
    };
  }

  // New: total cost of financing helper (price + interest)
  getTotalCost(quote: Quote): number {
    return round2(quote.totalPrice + this.getTotalInterest(quote));
  }

  // New: approximate CAT (Costo Anual Total) using effective annual rate from monthly rate
  getCAT(quote: Quote): number {
    const monthlyRate = this.getMonthlyRate(quote.market as Market);
    const annualEffective = toAnnualFromMonthly(monthlyRate) * 100;
    return round2(annualEffective);
  }

  // New: explicit down payment validation including max, returning semantic errors
  validateDownPaymentRange(pkg: ProductPackage, totalPrice: number, downPayment: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const pct = totalPrice > 0 ? downPayment / totalPrice : 0;
    if (pct < pkg.minDownPaymentPercentage) {
      errors.push(`El enganche mínimo es ${(pkg.minDownPaymentPercentage * 100).toFixed(0)}%`);
    }
    if (pkg.maxDownPaymentPercentage != null && pct > pkg.maxDownPaymentPercentage) {
      errors.push(`El enganche máximo sugerido es ${(pkg.maxDownPaymentPercentage * 100).toFixed(0)}%`);
    }
    if (downPayment <= 0) {
      errors.push('El enganche debe ser mayor a $0');
    }
    if (downPayment >= totalPrice) {
      errors.push('El enganche no puede ser igual o mayor al precio total');
    }
    return { valid: errors.length === 0, errors };
  }
}