// Core Business Types for Conductores PWA
// Ported from React PWA to ensure full compatibility

export enum BusinessFlow {
  VentaPlazo = 'Venta a Plazo',
  AhorroProgramado = 'Plan de Ahorro',
  CreditoColectivo = 'Crédito Colectivo',
  VentaDirecta = 'Venta Directa',
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
  GoalAchieved = 'GoalAchieved'
}

export type Market = 'all' | 'aguascalientes' | 'edomex';

export interface Document {
  id: string;
  name: 'INE Vigente' | 'Comprobante de domicilio' | 'Constancia de situación fiscal' | 'Copia de la concesión' | 'Tarjeta de circulación' | 'Factura de la unidad actual' | 'Carta de antigüedad de la ruta' | 'Verificación Biométrica (Metamap)' | 'Verificación Biométrica KYC' | 'Expediente Completo' | 'Contrato Venta a Plazo' | 'Identificación' | 'Carta Aval de Ruta' | 'Convenio de Dación en Pago' | 'Acta Constitutiva de la Ruta' | 'Poder del Representante Legal';
  status: DocumentStatus;
  isOptional?: boolean;
  tooltip?: string;
  // Additional properties for API operations (optional for compatibility)
  uploadedAt?: Date;
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
  monthlyGoal: number;
  currentMonthProgress: number;
  currency: 'MXN';
  methods: {
    collection: boolean;
    voluntary: boolean;
  };
  collectionDetails?: CollectionDetails;
}

export interface CollectiveCreditMember {
  clientId: string;
  name: string;
  avatarUrl: string;
  status: 'active' | 'pending';
  individualContribution: number;
}

export interface CollectiveCreditGroup {
  id: string;
  name: string;
  capacity: number;
  members: CollectiveCreditMember[];
  totalUnits: number;
  unitsDelivered: number;
  savingsGoalPerUnit: number;
  currentSavingsProgress: number; // Savings towards the *next* unit
  monthlyPaymentPerUnit: number;
  currentMonthPaymentProgress: number; // Payment towards the *collective debt*

  // Derived properties for UI convenience
  phase?: 'saving' | 'payment' | 'dual' | 'completed';
  savingsGoal?: number;
  currentSavings?: number;
  monthlyPaymentGoal?: number;
}

export type ImportMilestoneStatus = {
  status: 'completed' | 'in_progress' | 'pending';
  startedAt?: Date;
  completedAt?: Date;
  estimatedDays?: number;
  notes?: string;
};

// POST-SALES SYSTEM TYPES
export interface DeliveryData {
  odometroEntrega: number;
  fechaEntrega: Date;
  horaEntrega: string;
  domicilioEntrega: string;
  fotosVehiculo: string[]; // URLs de fotos
  firmaDigitalCliente: string; // URL de firma
  checklistEntrega: DeliveryChecklistItem[];
  incidencias?: string[];
  entregadoPor: string; // ID del asesor
}

export interface DeliveryChecklistItem {
  item: string;
  status: 'approved' | 'with_issues' | 'rejected';
  notes?: string;
  photos?: string[];
}

export interface LegalDocuments {
  factura: DocumentFile;
  polizaSeguro: DocumentFile;
  endosos?: DocumentFile[];
  contratos: DocumentFile[];
  fechaTransferencia: Date;
  proveedorSeguro: string;
  duracionPoliza: number; // meses
  titular: string;
}

export interface PlatesData {
  numeroPlacas: string;
  estado: string;
  fechaAlta: Date;
  tarjetaCirculacion: DocumentFile;
  fotografiasPlacas: string[]; // URLs
  hologramas: boolean;
}

export interface DocumentFile {
  filename: string;
  url: string;
  uploadedAt: Date;
  size: number; // bytes
  type: 'pdf' | 'image' | 'document';
}

export type ServicePackage = 'basic' | 'premium' | 'extended';
export type ServiceType = 'mantenimiento' | 'reparacion' | 'garantia' | 'revision';
export type ContactChannel = 'whatsapp' | 'sms' | 'email' | 'phone';
export type ContactPurpose = 'delivery' | '30_days' | '90_days' | '6_months' | '12_months' | 'maintenance_reminder' | 'warranty_claim';
export type ContactOutcome = 'sent' | 'answered' | 'escalated' | 'no_response';

export interface PostSalesRecord {
  id: string;
  vin: string;
  clientId: string;
  postSalesAgent: string;
  warrantyStatus: 'active' | 'expired';
  servicePackage: ServicePackage;
  nextMaintenanceDate: Date;
  nextMaintenanceKm: number;
  odometroEntrega: number;
  createdAt: Date;
  warrantyStart: Date;
  warrantyEnd: Date;
}

export interface PostSalesService {
  id: string;
  vin: string;
  serviceType: ServiceType;
  serviceDate: Date;
  odometroKm: number;
  descripcion: string;
  costo: number;
  tecnico: string;
  customerSatisfaction: number; // 1-5
  partesUsadas?: ServicePart[];
  tiempoServicio: number; // minutos
  notas?: string;
  fotos?: string[];
}

export interface ServicePart {
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  garantia: number; // meses
}

export interface PostSalesContact {
  id: string;
  vin: string;
  contactDate: Date;
  channel: ContactChannel;
  purpose: ContactPurpose;
  outcome: ContactOutcome;
  mensaje?: string;
  respuestaCliente?: string;
  notas?: string;
  programarSeguimiento?: Date;
}

export interface MaintenanceReminder {
  id: string;
  vin: string;
  dueDate: Date;
  dueKm: number;
  serviceType: string;
  reminder30dSent: boolean;
  reminder15dSent: boolean;
  reminder7dSent: boolean;
  completed: boolean;
  scheduledService?: Date;
}

export interface PostSalesRevenue {
  id: string;
  clientId: string;
  vin: string;
  serviceRevenue: number;
  partsRevenue: number;
  warrantyWork: number;
  profitMargin: number;
  ltv: number; // Customer Lifetime Value
  updatedAt: Date;
}

export interface VehicleDeliveredEvent {
  event: 'vehicle.delivered';
  timestamp: Date;
  payload: {
    clientId: string;
    vehicle: {
      vin: string;
      modelo: string;
      numeroMotor: string;
      odometer_km_delivery: number;
      placas: string;
      estado: string;
    };
    contract: {
      id: string;
      servicePackage: ServicePackage;
      warranty_start: Date;
      warranty_end: Date;
    };
    contacts: {
      primary: {
        name: string;
        phone: string;
        email: string;
      };
      whatsapp_optin: boolean;
    };
    delivery: DeliveryData;
    legalDocuments: LegalDocuments;
    plates: PlatesData;
  };
}

export interface PostSalesSurveyResponse {
  id: string;
  vin: string;
  clientId: string;
  surveyType: ContactPurpose;
  respuestas: { [pregunta: string]: string | number };
  nps?: number; // Net Promoter Score
  csat?: number; // Customer Satisfaction Score
  comentarios?: string;
  completedAt: Date;
}

// Información específica de la unidad asignada
export interface VehicleUnit {
  id: string;
  vin: string;
  serie: string;
  modelo: string;
  year: number;
  color: 'Blanco'; // Solo blanco por ahora
  numeroMotor: string;
  transmission?: 'Manual' | 'Automatica';
  fuelType: 'Gasolina'; // Solo gasolina por ahora
  assignedAt: Date;
  assignedBy: string; // ID del usuario que asignó
  productionBatch?: string;
  factoryLocation?: string;
  notes?: string;
}

export type ImportStatus = {
    pedidoPlanta: ImportMilestoneStatus;
    unidadFabricada: ImportMilestoneStatus;
    transitoMaritimo: ImportMilestoneStatus;
    enAduana: ImportMilestoneStatus;
    liberada: ImportMilestoneStatus;
    // POST-SALES PHASES
    entregada?: ImportMilestoneStatus;
    documentosTransferidos?: ImportMilestoneStatus;
    placasEntregadas?: ImportMilestoneStatus;
    // Unidad asignada cuando se completa unidadFabricada
    assignedUnit?: VehicleUnit;
    // Post-sales delivery data
    deliveryData?: DeliveryData;
    postSalesRecord?: PostSalesRecord;
};

export interface Ecosystem {
    id: string;
    name: string;
    documents: Document[];
    status: 'Activo' | 'Expediente Pendiente';
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

export interface ProtectionScenario {
  type: 'defer' | 'step-down' | 'recalendar';
  title: string;
  description: string;
  newMonthlyPayment: number;
  newTerm: number;
  termChange: number;
  details: string[];
}

export interface Client {
  id: string;
  name: string;
  avatarUrl: string;
  flow: BusinessFlow;
  status: string;
  savingsPlan?: SavingsPlan;
  paymentPlan?: PaymentPlan;
  documents: Document[];
  events: EventLog[];
  collectiveCreditGroupId?: string;
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
    ASSETS = 'assets',
    CREDIT_HISTORY = 'credit_history',
    PAYMENT_INTENTION = 'payment_intention',
    RISK_ASSESSMENT = 'risk_assessment'
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

export interface Notification {
    id: number;
    message: string;
    type: NotificationType;
    timestamp: Date;
    clientId?: string;
    action?: NotificationAction;
}

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

export type TandaMilestone = {
    type: 'ahorro' | 'entrega';
    unitNumber?: number;
    duration: number; // in months
    label: string;
};

export interface NavigationContext {
  ecosystem?: Ecosystem;
  group?: CollectiveCreditGroup;
}

// --- Tanda Simulator Types ---

export type TandaMemberStatus = 'active' | 'frozen' | 'left' | 'delivered';

export interface TandaMember {
  id: string;
  name: string;
  prio: number;
  status: TandaMemberStatus;
  C: number; // Base monthly contribution
}

export interface TandaProduct {
  price: number;
  dpPct: number;
  term: number;
  rateAnnual: number;
  fees?: number;
}

export interface TandaGroupInput {
  name: string;
  members: TandaMember[];
  product: TandaProduct;
  rules: {
    allocRule: 'debt_first';
    eligibility: { requireThisMonthPaid: boolean };
  };
  seed: number;
}

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

export interface TandaAward {
  memberId: string;
  name: string;
  month: number;
  mds: number; // monthly payment
}

export type TandaRiskBadge = 'ok' | 'debtDeficit' | 'lowInflow';

export interface TandaMonthState {
  t: number;
  inflow: number;
  debtDue: number;
  deficit: number;
  savings: number;
  awards: TandaAward[];
  riskBadge: TandaRiskBadge;
}

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
  group: TandaGroupInput;
  config: TandaSimConfig;
}

// Additional types for cotizador
export type ClientType = 'Individual' | 'Colectivo';
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