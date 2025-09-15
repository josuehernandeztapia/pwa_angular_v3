// SSOT - Single Source of Truth for TANDA System
// Consolidates 4+ different TandaMember/Group definitions across the codebase

export type TandaMemberStatus = 'active' | 'frozen' | 'left' | 'delivered' | 'pending' | 'cancelled';

export type TandaGroupStatus = 'forming' | 'active' | 'completed' | 'cancelled' | 'inactive';

export type TandaDeliveryStatus = 'pending' | 'scheduled' | 'ready' | 'delivered' | 'delayed' | 'cancelled';

export type TandaPaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';

export type TandaPaymentMethod = 'efectivo' | 'transferencia' | 'spei' | 'tarjeta';

export type TandaPhase = 'saving' | 'payment' | 'dual' | 'completed';

export type TandaRiskBadge = 'ok' | 'debtDeficit' | 'lowInflow';

// Core SSOT Base Member interface
export interface TandaMemberBase {
  id: string;
  clientId: string;
  name: string;
  status: TandaMemberStatus;

  // Financial
  monthlyContribution: number;
  totalContributed?: number;
  individualContribution?: number;

  // Position & Delivery
  position?: number; // 1-based position in tanda
  prio?: number; // priority for simulator
  deliveryMonth?: number; // Which month they receive delivery
  deliveryStatus?: TandaDeliveryStatus;

  // Timing
  joinedAt?: Date;
  lastPayment?: Date;

  // Legacy compatibility
  avatarUrl?: string;
  isActive?: boolean;
}

// Payment history for delivery system
export interface TandaPayment {
  id: string;
  memberId: string;
  amount: number;
  paymentDate: Date;
  month: number; // Tanda month (1-based)
  status: TandaPaymentStatus;
  paymentMethod: TandaPaymentMethod;
  receiptUrl?: string;
}

// Extended member for delivery system with full payment tracking
export interface TandaMemberDelivery extends TandaMemberBase {
  paymentHistory: TandaPayment[];
}

// Simplified member for simulator with minimal data
export interface TandaMemberSim extends TandaMemberBase {
  C: number; // Base monthly contribution (alias for monthlyContribution)
}

// Core SSOT Base Group interface
export interface TandaGroupBase {
  id: string;
  name: string;
  status: TandaGroupStatus;

  // Member management
  capacity: number;
  totalMembers: number;
  members: TandaMemberBase[];

  // Financial structure
  monthlyAmount?: number; // Amount each member pays
  totalAmount?: number; // Total vehicle/package value
  totalUnits?: number;
  unitsDelivered?: number;

  // Savings tracking
  savingsGoalPerUnit?: number;
  currentSavingsProgress?: number; // Savings towards the *next* unit

  // Payment tracking
  monthlyPaymentPerUnit?: number;
  currentMonthPaymentProgress?: number; // Payment towards the *collective debt*

  // Timing
  startDate?: Date;
  expectedEndDate?: Date;
  currentMonth?: number;
  createdAt?: Date;

  // Market & Context
  market?: 'aguascalientes' | 'edomex' | 'all';
  packageType?: string; // Vehicle package being saved for
  ecosystemId?: string;

  // Derived UI properties
  phase?: TandaPhase;
  savingsGoal?: number;
  currentSavings?: number;
  monthlyPaymentGoal?: number;

  // Leader
  groupLeader?: string; // Client ID of group organizer
}

// Extended group for delivery system with full tracking
export interface TandaGroupDelivery extends TandaGroupBase {
  members: TandaMemberDelivery[];
  deliverySchedule: TandaDeliverySchedule[];
  transferEvents?: TransferEvent[];
  consensusRequests?: ConsensusRequest[];
}

// Product definition for simulator
export interface TandaProduct {
  price: number;
  dpPct: number; // Down payment percentage
  term: number;
  rateAnnual: number;
  fees?: number;
}

// Group input for simulator with rules
export interface TandaGroupSim extends TandaGroupBase {
  members: TandaMemberSim[];
  product: TandaProduct;
  rules: {
    allocRule: 'debt_first';
    eligibility: { requireThisMonthPaid: boolean };
  };
  seed: number;
}

// Delivery schedule tracking
export interface TandaDeliverySchedule {
  month: number;
  memberId: string;
  memberName: string;
  memberPosition: number;
  scheduledDate: Date;
  deliveryStatus: TandaDeliveryStatus;
  requiredAmount: number; // Total amount needed for delivery
  contributedAmount: number; // Amount contributed by all members
  remainingAmount: number;
  deliveryNotes?: string;
}

// Transfer system for turn changes
export interface TransferEvent {
  id: string;
  type: 'TURN_TRANSFER';
  timestamp: Date;
  fromMemberId: string;
  toMemberId: string;
  fromPosition: number;
  toPosition: number;
  reason: string;
  executedBy: string;
  status: 'pending_consensus' | 'approved' | 'rejected' | 'executed';
  consensusId?: string;
}

export interface ConsensusRequest {
  id: string;
  transferEventId: string;
  requestedAt: Date;
  expiresAt: Date;
  status: 'open' | 'approved' | 'rejected' | 'expired';
  requiredApprovals: number; // Total votes needed
  currentApprovals: number;
  votes: ConsensusVote[];
}

export interface ConsensusVote {
  memberId: string;
  memberName: string;
  vote: 'approve' | 'reject';
  timestamp: Date;
  reason?: string;
}

// Simulator event types
export type TandaEventType = 'miss' | 'extra';

export interface TandaSimEvent {
  t: number; // month
  type: TandaEventType;
  data: {
    memberId: string;
    amount: number;
  };
  id: string;
}

export interface TandaSimConfig {
  horizonMonths: number;
  events: TandaSimEvent[];
}

// Award tracking for simulator
export interface TandaAward {
  memberId: string;
  name: string;
  month: number;
  mds: number; // monthly payment
}

// Monthly state for simulation
export interface TandaMonthState {
  t: number;
  inflow: number;
  debtDue: number;
  deficit: number;
  savings: number;
  awards: TandaAward[];
  riskBadge: TandaRiskBadge;
}

// Simulation results
export interface TandaSimulationResult {
  months: TandaMonthState[];
  awardsByMember: Record<string, TandaAward | undefined>;
  firstAwardT?: number;
  lastAwardT?: number;
  kpis: {
    coverageRatioMean: number;
    deliveredCount: number;
    avgTimeToAward: number;
  };
}

export interface TandaSimDraft {
  group: TandaGroupSim;
  config: TandaSimConfig;
}

// Milestone tracking for UI
export type TandaMilestone = {
  type: 'ahorro' | 'entrega';
  unitNumber?: number;
  duration: number; // in months
  label: string;
  month?: number;
  completed?: boolean;
  current?: boolean;
  emoji?: string;
  title?: string;
  description?: string;
  amount?: number;
  details?: string[];
  memberName?: string;
};

// Delivery result tracking
export interface TandaDeliveryResult {
  success: boolean;
  deliveryId: string;
  clientId: string;
  month: number;
  deliveredAmount: number;
  deliveryDate: Date;
  contractId?: string; // MIFIEL contract for the delivery
  message: string;
}

// Navigation context
export interface TandaNavigationContext {
  group?: TandaGroupBase;
}

// Legacy compatibility types (to be phased out)
export type CollectiveCreditMember = TandaMemberBase & {
  avatarUrl: string;
  status: 'active' | 'pending'; // More restrictive legacy status
};

export type CollectiveCreditGroup = TandaGroupBase & {
  members: CollectiveCreditMember[];
  // All other fields are already in TandaGroupBase
};