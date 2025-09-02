// Configuration interfaces for business rules and parameters
import { BusinessFlow, Market } from './types';

export interface MarketConfiguration {
  aguascalientes: {
    interestRate: number;
    standardTerm: number;
    minimumDownPayment: number;
  };
  edomex: {
    interestRate: number;
    standardTermIndividual: number;
    standardTermCollective: number;
    minimumDownPaymentIndividual: number;
    minimumDownPaymentCollective: number;
    municipalities: MunicipalityConfig[];
  };
}

export interface MunicipalityConfig {
  code: string;
  name: string;
  zone: 'ZMVM' | 'Central' | 'Eastern' | 'Northern' | 'Southern';
  riskModifier?: number;
}

export interface ScoringConfiguration {
  businessFlowRequirements: {
    [key in BusinessFlow]: {
      minScore: number;
      preferredGrades: string[];
      maxLoanToValue: number;
      notes: string[];
    };
  };
  
  scoringThresholds: {
    grades: {
      [key: string]: {
        min: number;
        decision: 'APPROVED' | 'CONDITIONAL' | 'REJECTED';
        risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
      };
    };
  };
  
  scoringFactors: {
    documentBonus: {
      ineApproved: number;
      comprobanteApproved: number;
      kycCompleted: number;
    };
    financialFactors: {
      lowDebtRatio: { threshold: number; bonus: number };
      highDebtRatio: { threshold: number; penalty: number };
      lowLoanRatio: { threshold: number; bonus: number };
      highLoanRatio: { threshold: number; penalty: number };
    };
    marketBonus: {
      aguascalientes: number;
    };
    businessFlowModifiers: {
      [key in BusinessFlow]: number;
    };
  };
}

export interface PaymentCapacityConfiguration {
  debtToIncomeRatios: {
    maxTotalDebt: number;
    availableForNewDebt: number;
    riskThresholds: {
      low: { debt: number; payment: number };
      medium: { debt: number; payment: number };
      high: { debt: number; payment: number };
    };
  };
  
  recommendationRules: {
    excellentCapacity: { paymentRatio: number };
    edomexCollectiveThreshold: { paymentRatio: number };
    liquidationRequired: { debtRatio: number };
  };
}

export interface DocumentConfiguration {
  requiredDocuments: {
    core: string[];
    businessFlow: {
      [key in BusinessFlow]?: string[];
    };
    market: {
      [key in Market]?: string[];
    };
  };
}

export interface EarlyPaymentConfiguration {
  recommendedPaymentPercentage: number;
  breakEvenCalculation: {
    enabled: boolean;
    basedOnMonthlyRate: boolean;
  };
  savingsCalculation: {
    includeMonthsSaved: boolean;
    calculateNewPayoffDate: boolean;
  };
}

export interface DownPaymentConfiguration {
  minimumPercentages: {
    [key in BusinessFlow]: {
      aguascalientes?: number;
      edomex?: number;
    };
  };
  
  recommendations: {
    recommendedBonus: number;
    emergencyFundReserve: number;
    optimalPercentage: number;
    maxOptimalPercentage: number;
    maxCashUtilization: number;
  };
  
  scenarioPercentages: number[];
}

export interface APIConfiguration {
  kinban: {
    apiUrl: string;
    clientId: string;
    secret: string;
    timeout: number;
  };
  hase: {
    apiUrl: string;
    token: string;
    timeout: number;
  };
  estimatedProcessingTime: number;
}

export type BusinessFlowConfiguration = {
  [key in BusinessFlow]: {
    interestRate?: number;
    maxTerm?: {
      aguascalientes?: number;
      edomex?: number;
    };
    requiresImmediateCapacity?: boolean;
    focusOnSavingsCapacity?: boolean;
    groupRequirements?: {
      minMembers: number;
      avgScoreRequired: number;
    };
  };
}

export interface AVIConfiguration {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  questions: {
    core: AVIQuestion[];
    businessFlow: {
      [key in BusinessFlow]?: AVIQuestion[];
    };
    market: {
      [key in Market]?: AVIQuestion[];
    };
  };
  randomQuestions: {
    enabled: boolean;
    pool: RandomQuestion[];
    selectionCount: number;
    weightedSelection: boolean;
    optimization: {
      enabled: boolean;
      learningAlgorithm: 'simple_weighted' | 'adaptive_scoring' | 'ml_optimization';
      adjustmentFrequency: 'daily' | 'weekly' | 'monthly';
      minSampleSize: number;
    };
  };
  validation: {
    minimumConfidenceScore: number;
    requiresHumanReview: boolean;
    autoApprovalThreshold: number;
  };
  analytics: AVIAnalyticsConfiguration;
  optimization: AVIOptimizationConfiguration;
}

export interface AVIAnalyticsConfiguration {
  stressIndicators: {
    enabled: boolean;
    metrics: {
      responseTime: {
        track: boolean;
        thresholds: { normal: number; slow: number; critical: number }; // seconds
      };
      pauseAnalysis: {
        track: boolean;
        longPauseThreshold: number; // seconds
        maxPausesPerQuestion: number;
      };
      repetitionRequests: {
        track: boolean;
        maxRepetitions: number;
      };
      uncertaintyWords: {
        track: boolean;
        keywords: string[]; // ["eh", "mmm", "no sé", "creo que"]
        threshold: number; // max count per response
      };
      voiceAnalysis: {
        enabled: boolean;
        toneChanges: boolean;
        speedVariation: boolean;
        volumeChanges: boolean;
      };
    };
  };
  effectivenessMetrics: {
    enabled: boolean;
    tracking: {
      correctnessRate: boolean;
      consistencyBetweenSessions: boolean;
      confidenceCorrelation: boolean;
      abandonmentByQuestion: boolean;
      completionTime: boolean;
      humanReviewAgreement: boolean;
    };
    segmentation: {
      byDemographics: boolean;
      byExperience: boolean;
      byMarket: boolean;
      byBusinessFlow: boolean;
    };
  };
  realTimeMonitoring: {
    enabled: boolean;
    alertsThreshold: {
      highAbandonmentRate: number; // percentage
      lowConfidenceRate: number; // percentage
      longResponseTime: number; // seconds
    };
    adaptiveQuestioning: {
      enabled: boolean;
      skipOnHighStress: boolean;
      simplifyOnConfusion: boolean;
      reorderOnDifficulty: boolean;
    };
  };
}

export interface AVIOptimizationConfiguration {
  weightOptimization: {
    enabled: boolean;
    algorithm: 'performance_based' | 'ml_driven' | 'manual_override';
    factors: {
      correctnessWeight: number;
      responseTimeWeight: number;
      stressIndicatorWeight: number;
      consistencyWeight: number;
      humanAgreementWeight: number;
    };
    adjustmentRules: WeightAdjustmentRule[];
  };
  questionLifecycle: {
    enabled: boolean;
    retirement: {
      lowPerformanceThreshold: number;
      minSampleSize: number;
      autoRemove: boolean;
    };
    promotion: {
      highPerformanceThreshold: number;
      increaseWeight: boolean;
    };
    rotation: {
      enabled: boolean;
      newQuestionIntroduction: number; // percentage of sessions
      testPeriod: number; // days
    };
  };
  smartOrdering: {
    enabled: boolean;
    strategy: 'difficulty_ascending' | 'confidence_building' | 'adaptive_flow';
    rules: QuestionOrderingRule[];
    dynamicReordering: boolean;
  };
  abTesting: {
    enabled: boolean;
    testTypes: ('question_wording' | 'question_order' | 'weight_adjustment' | 'new_questions')[];
    sampleSize: number;
    confidenceLevel: number;
    maxTestDuration: number; // days
    autoImplementWinner: boolean;
  };
  learningSystem: {
    enabled: boolean;
    modelType: 'rule_based' | 'machine_learning' | 'hybrid';
    trainingData: {
      includeStressMetrics: boolean;
      includeOutcomes: boolean;
      includeHumanFeedback: boolean;
      retentionPeriod: number; // days
    };
    continuousLearning: {
      enabled: boolean;
      updateFrequency: 'real_time' | 'daily' | 'weekly';
      minSampleForUpdate: number;
    };
  };
}

export interface WeightAdjustmentRule {
  id: string;
  name: string;
  condition: {
    metric: 'correctness_rate' | 'stress_level' | 'abandonment_rate' | 'consistency_score';
    operator: 'greater_than' | 'less_than' | 'equals' | 'between';
    value: number | number[];
  };
  action: {
    type: 'increase_weight' | 'decrease_weight' | 'set_weight' | 'remove_question';
    value?: number;
    percentage?: number;
  };
  priority: number;
  enabled: boolean;
}

export interface QuestionOrderingRule {
  id: string;
  name: string;
  condition: string;
  position: 'first' | 'last' | 'before' | 'after' | 'position';
  targetPosition?: number;
  targetQuestionId?: string;
  priority: number;
}

export interface AVISessionAnalytics {
  sessionId: string;
  clientId: string;
  timestamp: Date;
  duration: number; // seconds
  questionsAsked: AVIQuestionResponse[];
  overallMetrics: {
    completionRate: number;
    averageResponseTime: number;
    stressLevel: 'low' | 'medium' | 'high';
    confidenceScore: number;
    humanReviewRequired: boolean;
  };
  optimization: {
    suggestedWeightAdjustments: WeightAdjustment[];
    problematicQuestions: string[];
    recommendedChanges: OptimizationRecommendation[];
  };
}

export interface AVIQuestionResponse {
  questionId: string;
  question: string;
  response: string;
  metrics: {
    responseTime: number; // seconds
    repetitionsRequested: number;
    pauseCount: number;
    longestPause: number; // seconds
    uncertaintyWords: number;
    confidenceScore: number;
    stressIndicators: string[];
  };
  validation: {
    passed: boolean;
    humanReviewNeeded: boolean;
    consistentWithHistory: boolean;
  };
}

export interface WeightAdjustment {
  questionId: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
  confidence: number;
}

export interface OptimizationRecommendation {
  type: 'remove_question' | 'reorder_question' | 'rephrase_question' | 'adjust_weight' | 'add_preparation';
  questionId?: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface AVIQuestion {
  id: string;
  type: 'identity' | 'financial' | 'business' | 'verification';
  question: string;
  expectedAnswerType: 'text' | 'number' | 'boolean' | 'date' | 'choice';
  choices?: string[];
  weight: number;
  required: boolean;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    range?: { min: number; max: number };
  };
  // Enhanced properties for optimization
  analytics: {
    performanceMetrics: {
      averageResponseTime: number;
      stressLevel: number; // 0-1 scale
      abandonmentRate: number; // percentage
      correctnessRate: number; // percentage
      consistencyScore: number; // 0-1 scale
    };
    lastUpdated: Date;
    sampleSize: number;
    status: 'active' | 'testing' | 'retired' | 'problematic';
  };
  optimization: {
    autoAdjustWeight: boolean;
    minWeight: number;
    maxWeight: number;
    lastWeightAdjustment: Date;
    testingVariants?: QuestionVariant[];
  };
}

export interface QuestionVariant {
  id: string;
  text: string;
  performance: {
    responseTime: number;
    stressLevel: number;
    correctnessRate: number;
    sampleSize: number;
  };
  status: 'testing' | 'winner' | 'loser';
}

export interface RandomQuestion {
  id: string;
  category: 'personal' | 'route' | 'vehicle' | 'experience' | 'family';
  question: string;
  expectedAnswerType: 'text' | 'number' | 'choice';
  choices?: string[];
  weight: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  tags: string[];
  // Enhanced properties for optimization
  analytics: {
    performanceMetrics: {
      averageResponseTime: number;
      stressLevel: number;
      abandonmentRate: number;
      correctnessRate: number;
      consistencyScore: number;
    };
    lastUpdated: Date;
    sampleSize: number;
    status: 'active' | 'testing' | 'retired' | 'problematic';
  };
  optimization: {
    autoAdjustWeight: boolean;
    minWeight: number;
    maxWeight: number;
    lastWeightAdjustment: Date;
    selectionPriority: number; // higher = more likely to be selected
    testingVariants?: QuestionVariant[];
  };
}

export interface QuestionnaireConfiguration {
  standardQuestionnaire: {
    sections: QuestionnaireSection[];
    completionRequirements: {
      minimumSections: number;
      minimumQuestionsPerSection: number;
      allowSkipOptional: boolean;
    };
  };
  dynamicQuestionnaire: {
    enabled: boolean;
    adaptiveLogic: boolean;
    branchingRules: BranchingRule[];
  };
  validation: {
    realTimeValidation: boolean;
    crossFieldValidation: boolean;
    progressSaving: boolean;
  };
}

export interface QuestionnaireSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  required: boolean;
  questions: QuestionnaireQuestion[];
  conditionalDisplay?: {
    dependsOn: string; // question ID
    values: any[];
  };
}

export interface QuestionnaireQuestion {
  id: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'date' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { value: any; label: string }[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    custom?: string; // Custom validation rule name
  };
  helpText?: string;
  conditionalDisplay?: {
    dependsOn: string;
    values: any[];
  };
}

export interface BranchingRule {
  id: string;
  condition: {
    questionId: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  };
  action: {
    type: 'show' | 'hide' | 'require' | 'skip_to';
    target: string; // question or section ID
  };
}

export interface NotificationConfiguration {
  channels: {
    email: {
      enabled: boolean;
      templates: EmailTemplate[];
    };
    sms: {
      enabled: boolean;
      templates: SMSTemplate[];
    };
    push: {
      enabled: boolean;
      templates: PushTemplate[];
    };
    whatsapp: {
      enabled: boolean;
      templates: WhatsAppTemplate[];
    };
  };
  triggers: NotificationTrigger[];
  schedules: NotificationSchedule[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  maxLength: number;
  variables: string[];
}

export interface PushTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  icon?: string;
  variables: string[];
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  templateId: string; // WhatsApp Business template ID
  parameters: string[];
}

export interface NotificationTrigger {
  id: string;
  event: string;
  conditions?: {
    field: string;
    operator: string;
    value: any;
  }[];
  channels: string[];
  templateId: string;
  delay?: number; // minutes
}

export interface NotificationSchedule {
  id: string;
  name: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:mm format
  dayOfWeek?: number; // 0-6, Sunday=0
  dayOfMonth?: number; // 1-31
  channels: string[];
  templateId: string;
  targetAudience: {
    businessFlow?: BusinessFlow[];
    market?: Market[];
    status?: string[];
    customFilter?: string;
  };
}

export interface WorkflowConfiguration {
  automations: WorkflowAutomation[];
  approvalChains: ApprovalChain[];
  escalationRules: EscalationRule[];
  slaTargets: SLATarget[];
}

export interface WorkflowAutomation {
  id: string;
  name: string;
  trigger: {
    event: string;
    conditions?: any[];
  };
  actions: WorkflowAction[];
  enabled: boolean;
}

export interface WorkflowAction {
  type: 'notify' | 'assign' | 'update_status' | 'create_task' | 'send_email' | 'api_call';
  parameters: { [key: string]: any };
  delay?: number;
}

export interface ApprovalChain {
  id: string;
  name: string;
  steps: ApprovalStep[];
  parallelApproval: boolean;
  requiredApprovals: number;
}

export interface ApprovalStep {
  id: string;
  approverRole: string;
  approverIds?: string[];
  autoApprovalConditions?: any[];
  timeoutMinutes?: number;
  escalationAction?: string;
}

export interface EscalationRule {
  id: string;
  trigger: string;
  timeThresholdMinutes: number;
  escalateTo: string[];
  actions: string[];
}

export interface SLATarget {
  process: string;
  targetMinutes: number;
  warningThresholdPercent: number;
  escalationThresholdPercent: number;
}

export interface SimpleUIConfiguration {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    buttonSize: 'compact' | 'standard' | 'large' | 'extra-large';
    spacing: 'tight' | 'standard' | 'comfortable' | 'spacious';
    contrast: 'normal' | 'high' | 'maximum';
  };
  navigation: {
    breadcrumbs: boolean;
    backButton: boolean;
    progressIndicator: boolean;
    stepNumbers: boolean;
    quickActions: boolean;
  };
  forms: {
    autoFocus: boolean;
    largeInputs: boolean;
    clearLabels: boolean;
    inlineValidation: boolean;
    helpTooltips: boolean;
    requiredIndicators: boolean;
  };
  language: {
    locale: 'es-MX' | 'es-US' | 'es';
    simplifiedTerms: boolean;
    industryJargon: boolean;
    formalLanguage: boolean;
  };
}

export interface SmartUXConfiguration {
  autoComplete: {
    enabled: boolean;
    sources: ('user_history' | 'similar_profiles' | 'regional_patterns' | 'market_data')[];
    fields: SmartField[];
    confidence: {
      minimum: number;
      showLevel: boolean;
    };
  };
  realTimeValidation: {
    enabled: boolean;
    types: ('format' | 'business_rules' | 'duplicate_check' | 'external_validation')[];
    showSuccess: boolean;
    preventSubmission: boolean;
  };
  visualProgress: {
    type: 'steps' | 'progress_bar' | 'checklist' | 'timeline';
    showTimeEstimate: boolean;
    showCompletion: boolean;
    milestones: boolean;
  };
  sessionRecovery: {
    enabled: boolean;
    autoSave: boolean;
    saveInterval: number; // seconds
    maxRetention: number; // hours
    crossDevice: boolean;
  };
  smartDefaults: {
    enabled: boolean;
    basedOn: ('user_profile' | 'market_trends' | 'advisor_patterns' | 'time_context')[];
    fields: DefaultField[];
  };
}

export interface SmartField {
  fieldId: string;
  type: 'text' | 'number' | 'select' | 'date';
  source: 'user_history' | 'similar_profiles' | 'regional_patterns' | 'market_data';
  weight: number;
  minConfidence: number;
}

export interface DefaultField {
  fieldId: string;
  strategy: 'most_common' | 'user_pattern' | 'market_typical' | 'advisor_preference';
  conditions?: string[];
}

export interface AnalyticsConfiguration {
  heatmaps: {
    enabled: boolean;
    pages: string[];
    clickTracking: boolean;
    scrollTracking: boolean;
    hoverTracking: boolean;
    formInteractions: boolean;
  };
  sessionRecording: {
    enabled: boolean;
    sampleRate: number; // percentage
    maxDuration: number; // minutes
    excludeFields: string[];
    maskSensitiveData: boolean;
  };
  funnelAnalysis: {
    enabled: boolean;
    funnels: AnalyticsFunnel[];
    dropoffAlerts: boolean;
    realTimeMonitoring: boolean;
  };
  errorTracking: {
    enabled: boolean;
    types: ('validation_errors' | 'system_errors' | 'user_errors' | 'performance_issues')[];
    autoGrouping: boolean;
    alertThreshold: number;
  };
  performanceMetrics: {
    enabled: boolean;
    metrics: PerformanceMetric[];
    realTime: boolean;
    benchmarking: boolean;
  };
  userBehavior: {
    enabled: boolean;
    trackingEvents: TrackingEvent[];
    segmentation: UserSegmentation[];
    cohortAnalysis: boolean;
  };
}

export interface AnalyticsFunnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  goals: string[];
  alerts: {
    dropoffRate: number; // percentage
    completionRate: number; // percentage
    timeThreshold: number; // minutes
  };
}

export interface FunnelStep {
  id: string;
  name: string;
  page?: string;
  action?: string;
  required: boolean;
  order: number;
}

export interface PerformanceMetric {
  name: 'page_load_time' | 'form_completion_time' | 'error_rate' | 'success_rate' | 'user_satisfaction';
  target: number;
  warning: number;
  critical: number;
  unit: 'ms' | 'seconds' | 'percentage' | 'score';
  pages?: string[];
}

export interface TrackingEvent {
  name: string;
  category: 'navigation' | 'form_interaction' | 'business_action' | 'system_event';
  trigger: string;
  properties?: string[];
  valuable: boolean;
}

export interface UserSegmentation {
  name: string;
  criteria: SegmentCriteria[];
  trackSeparately: boolean;
}

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
}

export interface UXOptimizationConfiguration {
  abTesting: {
    enabled: boolean;
    autoCreate: boolean;
    testTypes: ('ui_variant' | 'flow_optimization' | 'content_testing' | 'performance_tuning')[];
    sampleSize: number;
    confidenceLevel: number;
    maxTestDuration: number; // days
  };
  recommendations: {
    enabled: boolean;
    aiPowered: boolean;
    categories: ('performance' | 'usability' | 'conversion' | 'accessibility' | 'engagement')[];
    autoApply: {
      enabled: boolean;
      safetyThreshold: number;
      rollbackOnFailure: boolean;
    };
  };
  realTimeOptimization: {
    enabled: boolean;
    adaptiveUI: boolean;
    personalizedExperience: boolean;
    loadOptimization: boolean;
  };
}

export interface ApplicationConfiguration {
  markets: MarketConfiguration;
  scoring: ScoringConfiguration;
  paymentCapacity: PaymentCapacityConfiguration;
  documents: DocumentConfiguration;
  earlyPayment: EarlyPaymentConfiguration;
  downPayment: DownPaymentConfiguration;
  api: APIConfiguration;
  businessFlows: BusinessFlowConfiguration;
  avi: AVIConfiguration;
  questionnaire: QuestionnaireConfiguration;
  notifications: NotificationConfiguration;
  workflows: WorkflowConfiguration;
  simpleUI: SimpleUIConfiguration;
  smartUX: SmartUXConfiguration;
  analytics: AnalyticsConfiguration;
  uxOptimization: UXOptimizationConfiguration;
  version: string;
  lastUpdated: Date;
}