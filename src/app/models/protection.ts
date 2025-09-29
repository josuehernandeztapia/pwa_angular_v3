// Real Protection System Types
// As defined in the architectural specification

export type ProtectionType = 'DEFER' | 'RECALENDAR' | 'STEPDOWN' | 'COLLECTIVE';

export type ProtectionState = 
  | 'IDLE' 
  | 'ELIGIBLE' 
  | 'PENDING_APPROVAL' 
  | 'READY_TO_SIGN' 
  | 'SIGNED' 
  | 'APPLIED' 
  | 'REJECTED' 
  | 'EXPIRED';

export interface ProtectionPolicyCaps {
  difMax: number;           // maximum deferral months
  extendMax: number;        // maximum Δn extension
  stepDownMaxPct: number;   // 0..1 maximum reduction percentage
  irrMin: number;           // minimum acceptable TIR
  mMin: number;             // minimum payment amount
}

export interface ProtectionScenario {
  type: ProtectionType;
  params: any;              // { d, capitalizeInterest } | { delta } | { months, alpha } | { useFund }
  Mprime?: number;          // new monthly payment
  nPrime?: number;          // new term
  balloon?: number;         // balloon payment if any
  irr?: number;             // internal rate of return
  tirOK?: boolean;          // TIR validation passed
  warnings?: string[];      // validation warnings
  description?: string;     // human readable description
  impact?: {                // financial impact summary
    paymentChange: number;
    termChange: number;
    totalCostChange: number;
  };
  // Legacy compatibility fields for migration
  id?: string;
  title?: string;
  score?: number;
  newPayment?: number;
  newTerm?: number;
  totalCost?: number;
  savings?: number;
  eligible?: boolean;
  details?: string[];
  newMonthlyPayment?: number;
  termChange?: number;
  cashFlows?: number[];
  capitalizedInterest?: number;
  principalBalance?: number;
}

// UI-specific extension for components that need presentational data
export interface ProtectionScenarioUI extends ProtectionScenario {
  monthlyPaymentBefore?: number;
  monthlyPaymentAfter?: number;
  benefits?: string[];
  drawbacks?: string[];
  recommended?: boolean;
  displayTitle?: string;
  displayDescription?: string;
}

export interface ProtectionUsageCounters {
  defer: number;
  stepdown: number;
  recalendar: number;
  collective: number;
}

export interface ProtectionAudit {
  createdAt: string;
  updatedAt: string;
  reason?: string;
  healthAtTrigger?: number;
  triggeredBy?: 'automatic' | 'manual' | 'health_score' | 'operational_event';
  approvedBy?: string;
  rejectedReason?: string;
}

export interface ProtectionPlan {
  contractId: string;
  clientId: string;
  state: ProtectionState;
  scenarios: ProtectionScenario[];
  selected?: ProtectionScenario;
  policy: ProtectionPolicyCaps;
  used: ProtectionUsageCounters;
  audit: ProtectionAudit;
  
  // Additional context for UI
  eligibilityReason?: string;
  currentBalance?: number;
  currentMonthlyPayment?: number;
  remainingTerm?: number;
  nextEligibilityDate?: string;
  
  // Mifiel integration
  mifielSessionId?: string;
  signedDocumentUrl?: string;
  
  // Application results
  newPaymentSchedule?: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

// Health trigger events
export interface HealthTriggerEvent {
  type: 'low_gnv' | 'downtime' | 'overdue_pred' | 'manual_request' | 'health_score_drop';
  contractId: string;
  clientId: string;
  timestamp: string;
  data: {
    delta?: number;        // percentage change
    window?: string;       // time window
    hours?: number;        // downtime hours
    prob?: number;         // prediction probability
    healthScore?: number;  // current health score
    threshold?: number;    // threshold crossed
  };
  processed: boolean;
  result?: 'eligible' | 'not_eligible' | 'already_active';
}

// API request/response types
export interface ProtectionSimulateRequest {
  contractId: string;
  monthK: number;  // current month in contract
  options: {
    triggerReason?: string;
    requestedType?: ProtectionType;
    customParams?: any;
  };
}

export interface ProtectionSimulateResponse {
  scenarios: ProtectionScenario[];
  eligibilityCheck: {
    isEligible: boolean;
    reason: string;
    usageRemaining: ProtectionUsageCounters;
  };
}

export interface ProtectionSelectRequest {
  contractId: string;
  scenario: ProtectionScenario;
  reason?: string;
}

export interface ProtectionApprovalRequest {
  contractId: string;
  approvedBy: string;
  notes?: string;
}

export interface ProtectionDenialRequest {
  contractId: string;
  deniedBy: string;
  reason: string;
}

export interface ProtectionSignRequest {
  contractId: string;
  mifielSessionId: string;
  signedDocumentUrl: string;
}

export interface ProtectionApplicationRequest {
  contractId: string;
  effectiveDate?: string;  // when the new payment schedule starts
}

export interface ProtectionApplicationResponse {
  success: boolean;
  newSchedule: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
  odooContractId?: string;
  neonTransactionId?: string;
  notifications: {
    whatsapp: boolean;
    email: boolean;
    push: boolean;
  };
}

// State transition validation
export interface StateTransition {
  from: ProtectionState;
  to: ProtectionState;
  action: string;
  requiredRole?: 'client' | 'advisor' | 'admin' | 'system';
  preconditions?: string[];
}

// Valid state transitions (FSM definition)
export const PROTECTION_FSM: StateTransition[] = [
  { from: 'IDLE', to: 'ELIGIBLE', action: 'trigger', requiredRole: 'system' },
  { from: 'ELIGIBLE', to: 'PENDING_APPROVAL', action: 'select_scenario', requiredRole: 'client' },
  { from: 'PENDING_APPROVAL', to: 'READY_TO_SIGN', action: 'approve', requiredRole: 'admin' },
  { from: 'PENDING_APPROVAL', to: 'REJECTED', action: 'deny', requiredRole: 'admin' },
  { from: 'READY_TO_SIGN', to: 'SIGNED', action: 'sign_document', requiredRole: 'client' },
  { from: 'SIGNED', to: 'APPLIED', action: 'apply_changes', requiredRole: 'system' },
  { from: 'APPLIED', to: 'IDLE', action: 'reset_eligibility', requiredRole: 'system' },
  { from: 'ELIGIBLE', to: 'EXPIRED', action: 'expire_window', requiredRole: 'system' },
  { from: 'REJECTED', to: 'IDLE', action: 'cooldown_complete', requiredRole: 'system' },
  { from: 'EXPIRED', to: 'IDLE', action: 'reset_after_expiry', requiredRole: 'system' }
];

// Utility functions for state validation
export function canTransition(from: ProtectionState, to: ProtectionState, action: string): boolean {
  return PROTECTION_FSM.some(t => 
    t.from === from && 
    t.to === to && 
    t.action === action
  );
}

export function getValidTransitions(currentState: ProtectionState): StateTransition[] {
  return PROTECTION_FSM.filter(t => t.from === currentState);
}

export function getRequiredRole(from: ProtectionState, to: ProtectionState, action: string): string | undefined {
  const transition = PROTECTION_FSM.find(t => 
    t.from === from && 
    t.to === to && 
    t.action === action
  );
  return transition?.requiredRole;
}

// Protection type descriptions for UI
export const PROTECTION_TYPE_DESCRIPTIONS: Record<ProtectionType, {
  title: string;
  description: string;
  iconType: string;
  maxDuration: string;
}> = {
  DEFER: {
    title: 'Diferimiento',
    description: 'Suspende pagos temporalmente, capitaliza interés',
    iconType: 'pause-circle',
    maxDuration: '6 meses'
  },
  STEPDOWN: {
    title: 'Reducción Temporal',
    description: 'Reduce el pago mensual por período limitado',
    iconType: 'trending-down',
    maxDuration: '12 meses'
  },
  RECALENDAR: {
    title: 'Recalendarización',
    description: 'Extiende el plazo del contrato',
    iconType: 'calendar-extension',
    maxDuration: '24 meses adicionales'
  },
  COLLECTIVE: {
    title: 'Fondo Colectivo',
    description: 'Usa fondo grupal para cubrir pagos',
    iconType: 'user-group',
    maxDuration: 'Según disponibilidad'
  }
};

// State descriptions for UI
export const PROTECTION_STATE_DESCRIPTIONS: Record<ProtectionState, {
  title: string;
  description: string;
  color: string;
  iconType: string;
}> = {
  IDLE: {
    title: 'Inactivo',
    description: 'Protección disponible si es necesaria',
    color: 'var(--color-text-secondary, #737373)', /* OpenAI neutral */
    iconType: 'moon'
  },
  ELIGIBLE: {
    title: 'Elegible',
    description: 'Puede activar protección ahora',
    color: 'var(--color-text-secondary, #737373)', /* OpenAI neutral */
    iconType: 'exclamation-circle'
  },
  PENDING_APPROVAL: {
    title: 'Pendiente Aprobación',
    description: 'Esperando revisión administrativa',
    color: 'var(--color-text-secondary, #737373)', /* OpenAI neutral */
    iconType: 'clock'
  },
  READY_TO_SIGN: {
    title: 'Listo para Firmar',
    description: 'Aprobado, esperando firma digital',
    color: 'var(--color-text-secondary, #737373)', /* OpenAI neutral */
    iconType: 'pencil'
  },
  SIGNED: {
    title: 'Firmado',
    description: 'Documento firmado, aplicando cambios',
    color: 'var(--color-text-secondary, #737373)', /* OpenAI neutral */
    iconType: 'document-check'
  },
  APPLIED: {
    title: 'Aplicado',
    description: 'Protección activa en el contrato',
    color: 'var(--color-text-secondary, #737373)', /* OpenAI neutral */
    iconType: 'check-circle'
  },
  REJECTED: {
    title: 'Rechazado',
    description: 'Solicitud denegada por políticas',
    color: 'var(--color-text-secondary, #737373)', /* OpenAI neutral */
    iconType: 'x-circle'
  },
  EXPIRED: {
    title: 'Expirado',
    description: 'Ventana de oportunidad cerrada',
    color: 'var(--color-text-secondary, #737373)', /* OpenAI neutral */
    iconType: 'clock'
  }
};
