// SSOT - Business & Cotizador System Types
// Consolidates all business scenarios, quoting, and product configuration types

import { BusinessFlow, Market } from './types';

// Client classification types
export type ClientType = 'individual' | 'colectivo';

// Simulator operational modes
export type SimulatorMode = 'acquisition' | 'savings';

// Business scenario stages for complete workflow tracking
export type BusinessStage = 'COTIZACION' | 'SIMULACION' | 'ACTIVO' | 'PROTECCION';

// Core quote structure for financial calculations
export interface Quote {
    totalPrice: number;
    downPayment: number;
    amountToFinance: number;
    term: number; // months
    monthlyPayment: number;
    market: string;
    clientType: string;
    flow: BusinessFlow;
    // Extended properties for API operations and compatibility
    id?: string;
    clientId?: string;
    product?: any;
    financialSummary?: any;
    timeline?: any[];
    createdAt?: Date;
    expiresAt?: Date;
    status?: string;
    // Enhanced quote properties
    interestRate?: number;
    processingFees?: number;
    insuranceCost?: number;
    taxAmount?: number;
}

// Product component for modular pricing
export interface ProductComponent {
    id: string;
    name: string;
    price: number;
    isOptional: boolean;
    isMultipliedByTerm?: boolean;
    description?: string;
    category?: 'base' | 'insurance' | 'service' | 'accessory';
    dependency?: string[]; // IDs of required components
}

// Product package configuration for business offerings
export interface ProductPackage {
    name: string;
    rate: number; // interest rate
    terms: number[]; // available term options in months
    minDownPaymentPercentage: number;
    maxDownPaymentPercentage?: number;
    defaultMembers?: number; // for collective products
    maxMembers?: number; // for collective products
    components: ProductComponent[];
    // Enhanced package properties
    id?: string;
    description?: string;
    category?: 'basic' | 'premium' | 'enterprise';
    isActive?: boolean;
    marketRestrictions?: Market[];
    clientTypeRestrictions?: ClientType[];
    minimumIncome?: number;
    maximumFinanceAmount?: number;
}

// Senior executive summary for business scenarios
export interface BusinessSeniorSummary {
    title: string;
    description: string[];
    keyMetrics: Array<{
        label: string;
        value: string;
        emoji: string;
        category?: 'financial' | 'timeline' | 'risk' | 'opportunity';
    }>;
    timeline: Array<{
        month: number;
        event: string;
        emoji: string;
        category?: 'milestone' | 'payment' | 'delivery' | 'completion';
    }>;
    whatsAppMessage: string;
}

// Complete business scenario with all related data
export interface CompleteBusinessScenario {
    id: string;
    clientName: string;
    flow: BusinessFlow;
    market: Market;
    stage: BusinessStage;

    // Core scenario data
    quote?: Quote;
    amortizationTable?: any[];
    savingsScenario?: any;
    tandaSimulation?: any;
    protectionScenarios?: any[];

    // Executive summary
    seniorSummary: BusinessSeniorSummary;

    // Enhanced scenario properties
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    assignedTo?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    notes?: string;
    status?: 'draft' | 'active' | 'completed' | 'cancelled';
}

// Amortization table entry for payment schedules
export interface AmortizationEntry {
    period: number;
    paymentDate: Date;
    paymentAmount: number;
    principalAmount: number;
    interestAmount: number;
    remainingBalance: number;
    cumulativeInterest: number;
    cumulativePrincipal: number;
}

// Financial summary for business calculations
export interface FinancialSummary {
    totalCost: number;
    totalInterest: number;
    totalPrincipal: number;
    effectiveRate: number;
    apr: number; // Annual Percentage Rate
    totalPayments: number;
    paymentFrequency: 'monthly' | 'biweekly' | 'weekly';
}

// Business metrics for performance tracking
export interface BusinessMetrics {
    conversionRate: number;
    averageTicketSize: number;
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    profitMargin: number;
    defaultRate: number;
    portfolioGrowth: number;
    marketPenetration: number;
}

// Quote request for business scenario initiation
export interface QuoteRequest {
    clientType: ClientType;
    market: Market;
    flow: BusinessFlow;
    requestedAmount: number;
    preferredTerm?: number;
    downPaymentAmount?: number;
    clientIncome?: number;
    productPackageId?: string;
    specialRequirements?: string[];
    urgency?: 'standard' | 'priority' | 'urgent';
}

// Quote response with detailed breakdown
export interface QuoteResponse {
    quote: Quote;
    alternatives?: Quote[]; // alternative quote options
    financialSummary: FinancialSummary;
    amortizationTable: AmortizationEntry[];
    requiredDocuments: string[];
    validUntil: Date;
    conditions: string[];
    riskAssessment?: {
        score: number;
        level: 'low' | 'medium' | 'high';
        factors: string[];
    };
}