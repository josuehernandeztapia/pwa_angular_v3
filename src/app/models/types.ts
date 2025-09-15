// Core Business Types for Conductores PWA
// Ported from React PWA to ensure full compatibility

import { ImportStatus } from './postventa';
import { CollectiveCreditGroup } from './tanda';

export enum BusinessFlow {
  VentaPlazo = 'Venta a Plazo',
  AhorroProgramado = 'Plan de Ahorro',
  CreditoColectivo = 'Crédito Colectivo',
  VentaDirecta = 'Venta Directa',
  Individual = 'Individual'
}

export enum DocumentStatus {
  Pendiente = 'Pendiente',
  EnRevision = 'En Revisión',
  Aprobado = 'Aprobado',
  Rechazado = 'Rechazado',
}

export enum Actor {
  Asesor = 'Asesor',
  Cliente = 'Cliente',
  Sistema = 'Sistema',
}

export enum EventType {
  Contribution = 'Contribution',
  Collection = 'Collection',
  System = 'System',
  AdvisorAction = 'AdvisorAction',
  ClientAction = 'ClientAction',
  GoalAchieved = 'GoalAchieved',
  StatusChange = 'StatusChange',
  DocumentSubmission = 'DocumentSubmission',
  DocumentReview = 'DocumentReview',
  KYCCompleted = 'KYCCompleted'
}

// Shared document name constants used across services/components
export const DOC_NAME_INE = 'INE Vigente';
export const DOC_NAME_COMPROBANTE = 'Comprobante de domicilio';
// KYC doc occurrences may include provider suffix, so services use string includes()
export const DOC_NAME_KYC_CONTAINS = 'Verificación Biométrica';

export type Market = 'all' | 'aguascalientes' | 'edomex';

export interface Document {
  id: string;
  name: string;
  status: DocumentStatus;
  isOptional?: boolean;
  tooltip?: string;
  // Additional properties for API operations (optional for compatibility)
  uploadedAt?: Date;
  // Optional expiration for documents that expire
  expirationDate?: Date;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  // Extended lifecycle fields used in tests and services
  reviewedAt?: Date;
  completedAt?: Date;
  verificationId?: string;
  verificationScore?: number;
  reviewNotes?: string;
}

export interface EventLog {
  id: string;
  timestamp: Date;
  message: string;
  actor: Actor;
  type: EventType;
  details?: {
    amount?: number;
    currency?: 'MXN';
    plate?: string;
    paymentMethod?: string;
    reference?: string;
    documentName?: string;
    status?: string;
  }
}

export interface CollectionDetails {
  plates: string[];
  pricePerLiter: number;
}

export interface SavingsPlan {
  progress: number;
  goal: number;
  currency: 'MXN';
  totalValue: number; // Total value of the unit being saved for
  methods: {
    collection: boolean;
    voluntary: boolean;
  };
  collectionDetails?: CollectionDetails;
}

export interface PaymentPlan {
  monthlyGoal?: number;
  currentMonthProgress?: number;
  currency?: 'MXN';
  methods?: {
    collection: boolean;
    voluntary: boolean;
  };
  collectionDetails?: CollectionDetails;
  // Extended fields used by business rules and services
  downPaymentPercentage?: number;
  term?: number; // in months
  monthlyPayment?: number;
  interestRate?: number; // monthly/annual interest rate as fraction
}

// TANDA/CollectiveCreditGroup types moved to models/tanda.ts for SSOT
// Import from: import { CollectiveCreditMember, CollectiveCreditGroup } from '../models/tanda';

export type ImportMilestoneStatus = {
  status?: 'completed' | 'in_progress' | 'pending';
  startedAt?: Date;
  completedAt?: Date;
  estimatedDays?: number;
  notes?: string;
  // Backwards-compatibility flags used in legacy UI code
  completed?: boolean;
  inProgress?: boolean;
};

// DELIVERY AND DOCUMENT TYPES moved to models/postventa.ts for SSOT
// Import from: import { DeliveryData, DeliveryChecklistItem, LegalDocuments, PlatesData, DocumentFile } from '../models/postventa';

// POST-SALES TYPES moved to models/postventa.ts for SSOT
// Import from: import { ServicePackage, ServiceType, ContactChannel, ContactPurpose, ContactOutcome } from '../models/postventa';

// PostSalesRecord moved to models/postventa.ts for SSOT
// Import from: import { PostSalesRecord } from '../models/postventa';

// PostSalesService, ServicePart, PostSalesContact, MaintenanceReminder, PostSalesRevenue moved to models/postventa.ts for SSOT
// Import from: import { PostSalesService, ServicePart, PostSalesContact, MaintenanceReminder, PostSalesRevenue } from '../models/postventa';

// VehicleDeliveredEvent moved to models/postventa.ts for SSOT
// Import from: import { VehicleDeliveredEvent } from '../models/postventa';

// PostSalesSurveyResponse moved to models/postventa.ts for SSOT
// Import from: import { PostSalesSurveyResponse } from '../models/postventa';

// VehicleUnit moved to models/postventa.ts for SSOT
// Import from: import { VehicleUnit } from '../models/postventa';

// ImportStatus moved to models/postventa.ts for SSOT
// Import from: import { ImportStatus } from '../models/postventa';

export interface Ecosystem {
    id: string;
    name: string;
    documents?: Document[];
    status: 'Activo' | 'Expediente Pendiente' | string;
    // Extended fields for mock service specs
    market?: Market;
    vehicleType?: string;
    capacity?: number;
    requirements?: string[];
    weeklyEarnings?: number;
    monthlyEarnings?: number;
    createdAt?: Date;
    lastModified?: Date;
}

export interface Quote {
    totalPrice: number;
    downPayment: number;
    amountToFinance: number;
    term: number;
    monthlyPayment: number;
    market: string;
    clientType: string;
    flow: BusinessFlow;
    // Additional properties for API operations (optional for compatibility)
    id?: string;
    clientId?: string;
    product?: any;
    financialSummary?: any;
    timeline?: any[];
    createdAt?: Date;
    expiresAt?: Date;
    status?: string;
}

export interface ProtectionPlan {
  type: 'Esencial' | 'Total';
  restructuresAvailable: number;
  restructuresUsed: number;
  annualResets: number;
}

// ProtectionScenario moved to models/protection.ts for SSOT

export interface Client {
  id: string;
  name: string;
  avatarUrl?: string;
  flow: BusinessFlow;
  status: string;
  savingsPlan?: SavingsPlan;
  paymentPlan?: PaymentPlan;
  documents: Document[];
  events: EventLog[];
  collectiveCreditGroupId?: string;
  collectiveGroupName?: string;
  importStatus?: ImportStatus;
  remainderAmount?: number;
  downPayment?: number;
  healthScore?: number;
  ecosystemId?: string;
  protectionPlan?: ProtectionPlan;
  // Missing properties used by business-rules.service.ts
  market?: Market;
  monthlyIncome?: number;
  birthDate?: Date;
  groupId?: string;
  // Additional properties used by components
  email?: string;
  phone?: string;
  rfc?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastPayment?: Date;
  lastModified?: Date;
  // Convenience fields for UI components
  currentSavings?: number;
  savingsGoal?: number;
  totalPayments?: number;
  completedPayments?: number;
  lastPaymentDate?: Date;
  nextPaymentDue?: Date;
  // Optional vehicle info summary for UI
  vehicleInfo?: {
    model: string;
    vin: string;
  };
}

// Dashboard data interfaces
export interface DashboardStats {
  opportunitiesInPipeline: {
    nuevas: number;
    expediente: number;
    aprobado: number;
  };
  pendingActions: {
    clientsWithMissingDocs: number;
    clientsWithGoalsReached: number;
  };
  activeContracts: number;
  monthlyRevenue: {
    collected: number;
    projected: number;
  };
}

export interface ActivityFeedItem {
  id: string;
  type: 'new_client' | 'doc_approved' | 'payment_received' | 'goal_reached' | 'contract_signed';
  timestamp: Date;
  message: string;
  clientName?: string;
  amount?: number;
  icon: string;
}

export interface PaymentLinkDetails {
    type: 'Conekta' | 'SPEI';
    amount: number;
    details: {
        link?: string;
        clabe?: string;
        reference?: string;
        bank?: string;
    };
}

export enum NotificationType {
    Lead = 'lead',
    Milestone = 'milestone',
    Risk = 'risk',
    System = 'system'
}

// === AVI SYSTEM TYPES ===
export enum AVICategory {
    BASIC_INFO = 'basic_info',
    DAILY_OPERATION = 'daily_operation',
    OPERATIONAL_COSTS = 'operational_costs', 
    BUSINESS_STRUCTURE = 'business_structure',
    ASSETS_PATRIMONY = 'assets_patrimony',
    CREDIT_HISTORY = 'credit_history',
    PAYMENT_INTENTION = 'payment_intention',
    RISK_EVALUATION = 'risk_evaluation'
}

export enum QuestionType {
    OPEN_NUMERIC = 'open_numeric',
    OPEN_TEXT = 'open_text',
    MULTIPLE_CHOICE = 'multiple_choice',
    YES_NO = 'yes_no',
    RANGE_ESTIMATE = 'range_estimate'
}

export interface AVIQuestionAnalytics {
    expectedResponseTime: number;
    stressIndicators: string[];
    truthVerificationKeywords: string[];
    sigmaRatio?: number;
}

export interface AVIQuestionEnhanced {
    id: string;
    category: AVICategory;
    question: string;
    weight: number; // 1-10
    riskImpact: 'HIGH' | 'MEDIUM' | 'LOW';
    stressLevel: number; // 1-5
    estimatedTime: number; // segundos
    verificationTriggers: string[];
    followUpQuestions?: string[];
    analytics: AVIQuestionAnalytics;
}

export interface AVIResponse {
    questionId: string;
    value: string;
    responseTime: number; // milliseconds
    transcription: string;
    voiceAnalysis?: VoiceAnalysis;
    stressIndicators: string[];
    coherenceScore?: number;
}

export interface VoiceAnalysis {
    pitch_variance: number;     // 0-1
    speech_rate_change: number; // 0-1  
    pause_frequency: number;    // 0-1
    voice_tremor: number;       // 0-1
    confidence_level: number;   // 0-1 from Whisper
}

export interface AVIScore {
    totalScore: number; // 0-1000
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    categoryScores: { [key in AVICategory]: number };
    redFlags: RedFlag[];
    recommendations: string[];
    processingTime: number;
}

export interface RedFlag {
    type: string;
    questionId: string;
    reason: string;
    impact: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export type NotificationAction = {
    text: string;
    type: 'convert' | 'assign_unit' | 'configure_plan';
}

// 🔥 Notification interface moved to models/notification.ts as SSOT

export type OpportunityStage = {
    name: 'Nuevas Oportunidades' | 'Expediente en Proceso' | 'Aprobado' | 'Activo' | 'Completado';
    clientIds: string[];
    count: number;
};

export type ActionableClient = {
    id: string;
    name: string;
    avatarUrl: string;
    status: string;
};

export type ActionableGroup = {
    title: string;
    description: string;
    clients: ActionableClient[];
};

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

// TandaMilestone moved to models/tanda.ts for SSOT
// Import from: import { TandaMilestone } from '../models/tanda';

export interface NavigationContext {
  ecosystem?: Ecosystem;
  group?: CollectiveCreditGroup;
}

// --- Tanda Simulator Types ---

// TANDA Simulator types moved to models/tanda.ts for SSOT
// Import from: import { TandaMemberStatus, TandaMember, TandaProduct, TandaGroupSim, TandaEventType, TandaSimEvent, TandaSimConfig, TandaAward, TandaRiskBadge, TandaMonthState, TandaSimulationResult, TandaSimDraft } from '../models/tanda';

// Additional types for cotizador
export type ClientType = 'individual' | 'colectivo';
export type SimulatorMode = 'acquisition' | 'savings';

export interface ProductPackage {
  name: string;
  rate: number;
  terms: number[];
  minDownPaymentPercentage: number;
  maxDownPaymentPercentage?: number;
  defaultMembers?: number;
  maxMembers?: number;
  components: ProductComponent[];
}

export interface ProductComponent {
  id: string;
  name: string;
  price: number;
  isOptional: boolean;
  isMultipliedByTerm?: boolean;
}

export interface CompleteBusinessScenario {
  id: string;
  clientName: string;
  flow: BusinessFlow;
  market: Market;
  stage: 'COTIZACION' | 'SIMULACION' | 'ACTIVO' | 'PROTECCION';
  
  quote?: Quote;
  amortizationTable?: any[];
  savingsScenario?: any;
  tandaSimulation?: any;
  protectionScenarios?: any[];
  
  seniorSummary: {
    title: string;
    description: string[];
    keyMetrics: Array<{ label: string; value: string; emoji: string }>;
    timeline: Array<{ month: number; event: string; emoji: string }>;
    whatsAppMessage: string;
  };
}