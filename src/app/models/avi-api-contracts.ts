// API Contracts for AVI (Automated Voice Intelligence) System
// Complete TypeScript interfaces for future backend integration

// ===== REQUEST/RESPONSE INTERFACES =====

/**
 * Voice Analysis Request - POST /api/v1/voice/analyze
 */
export interface VoiceAnalysisRequest {
  audioBlob: Blob;
  questionId: string;
  sessionId: string;
  metadata: {
    duration: number;
    sampleRate: number;
    format: string;
    expectedResponseTime: number;
    attempt: number;
  };
}

export interface VoiceAnalysisResponse {
  success: boolean;
  data: {
    transcription: string;
    confidence: number;
    voiceMetrics: VoiceMetrics;
    lexicalAnalysis: LexicalAnalysis;
    coherenceScore: number;
    processingTime: number;
  };
  errors?: string[];
}

/**
 * Whisper Transcription Request - POST /api/v1/voice/whisper-transcribe
 */
export interface WhisperTranscribeRequest {
  audioFile: File;
  sessionId: string;
  language?: string;
  model?: 'whisper-1' | 'whisper-large';
}

export interface WhisperTranscribeResponse {
  success: boolean;
  data: {
    text: string;
    confidence: number;
    segments: TranscriptionSegment[];
    language: string;
    duration: number;
  };
  errors?: string[];
}

/**
 * Complete AVI Evaluation Request - POST /api/v1/avi/evaluate-complete
 */
export interface AVIEvaluationRequest {
  sessionId: string;
  applicantData: {
    personalInfo: ApplicantPersonalInfo;
    geographicInfo: ApplicantGeographicInfo;
  };
  voiceResponses: VoiceResponse[];
  metadata: {
    platform: string;
    timestamp: string;
    version: string;
  };
}

export interface AVIEvaluationResponse {
  success: boolean;
  data: {
    finalScore: number;
    riskLevel: RiskLevel;
    breakdown: ScoreBreakdown;
    recommendations: string[];
    flags: RiskFlag[];
    processingMetrics: ProcessingMetrics;
  };
  errors?: string[];
}

// ===== CONFIGURATION INTERFACES =====

/**
 * AVI Questions Configuration - GET /api/v1/config/avi-questions
 */
export interface AVIQuestionsConfigResponse {
  success: boolean;
  data: {
    questions: AVIQuestionConfig[];
    version: string;
    lastUpdated: string;
  };
  errors?: string[];
}

/**
 * Risk Thresholds Configuration - GET /api/v1/config/avi-thresholds
 */
export interface RiskThresholdsConfigResponse {
  success: boolean;
  data: {
    thresholds: RiskThresholds;
    coefficients: AVICoefficients;
    version: string;
    lastUpdated: string;
  };
  errors?: string[];
}

/**
 * Geographic Risk Configuration - GET /api/v1/config/geographic-risk
 */
export interface GeographicRiskConfigResponse {
  success: boolean;
  data: {
    riskMatrix: GeographicRiskMatrix;
    multipliers: GeographicMultipliers;
    version: string;
    lastUpdated: string;
  };
  errors?: string[];
}

// ===== CORE DATA INTERFACES =====

export interface VoiceMetrics {
  pitch: {
    mean: number;
    variance: number;
    range: number;
  };
  energy: {
    mean: number;
    variance: number;
    stability: number;
  };
  rhythm: {
    pauseFrequency: number;
    speechRate: number;
    fluency: number;
  };
  stress: {
    level: number;
    indicators: string[];
    confidence: number;
  };
}

export interface LexicalAnalysis {
  evasionScore: number;
  admissionScore: number;
  honestyScore: number;
  coherenceScore: number;
  tokensFound: {
    evasive: string[];
    admission: string[];
    honesty: string[];
  };
  reliefApplied: number;
  category: string;
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface VoiceResponse {
  questionId: string;
  transcription: string;
  voiceMetrics: VoiceMetrics;
  lexicalAnalysis: LexicalAnalysis;
  responseTime: number;
  attempt: number;
  timestamp: string;
}

export interface ApplicantPersonalInfo {
  fullName: string;
  age: number;
  experience: number;
  vehicleType: string;
  operationArea: string;
}

export interface ApplicantGeographicInfo {
  state: string;
  municipality: string;
  route: string;
  riskZone: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScoreBreakdown {
  historicalGNV: {
    score: number;
    weight: 0.30;
    details: string[];
  };
  geographicRisk: {
    score: number;
    weight: 0.20;
    details: string[];
  };
  voiceAnalysis: {
    score: number;
    weight: 0.50;
    details: {
      timing: number;
      voice: number;
      lexical: number;
      coherence: number;
    };
  };
}

export interface RiskFlag {
  type: 'HIGH_EVASION' | 'INCONSISTENT_STORY' | 'GEOGRAPHIC_RISK' | 'VOICE_STRESS' | 'PAYMENT_CONCERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  evidence: string[];
  confidence: number;
}

export interface ProcessingMetrics {
  totalTime: number;
  questionsCompleted: number;
  averageResponseTime: number;
  transcriptionAccuracy: number;
  engineUsed: 'SCIENTIFIC' | 'HEURISTIC' | 'HYBRID';
}

export interface AVIQuestionConfig {
  id: string;
  text: string;
  weight: number;
  category: QuestionCategory;
  expectedResponseTime: number;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  triggers: string[];
  coefficients: {
    alpha: number; // timing
    beta: number;  // voice
    gamma: number; // lexical
    delta: number; // coherence
  };
  followUp?: {
    condition: string;
    questionId: string;
  };
}

export type QuestionCategory = 
  | 'BASIC_INFO' 
  | 'DAILY_OPERATION' 
  | 'OPERATIONAL_COSTS' 
  | 'BUSINESS_STRUCTURE' 
  | 'ASSETS_PATRIMONY' 
  | 'CREDIT_HISTORY' 
  | 'PAYMENT_INTENTION' 
  | 'RISK_EVALUATION';

export interface RiskThresholds {
  low: number;      // 0.0 - 0.25
  medium: number;   // 0.25 - 0.50
  high: number;     // 0.50 - 0.75
  critical: number; // 0.75 - 1.0
}

export interface AVICoefficients {
  global: {
    alpha: number; // timing weight
    beta: number;  // voice weight
    gamma: number; // lexical weight
    delta: number; // coherence weight
  };
  byStressLevel: {
    [key: number]: {
      alpha: number;
      beta: number;
      gamma: number;
      delta: number;
    };
  };
}

export interface GeographicRiskMatrix {
  [state: string]: {
    [municipality: string]: {
      riskScore: number;
      multiplier: number;
      factors: string[];
    };
  };
}

export interface GeographicMultipliers {
  urban: number;
  suburban: number;
  rural: number;
  highway: number;
  conflictZone: number;
}

// ===== ERROR INTERFACES =====

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ===== WEBHOOK INTERFACES =====

/**
 * Webhook for long-running AVI evaluations
 */
export interface AVIEvaluationWebhook {
  sessionId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number; // 0-100
  result?: AVIEvaluationResponse;
  error?: APIError;
  timestamp: string;
}

// ===== HTTP CLIENT CONFIGURATIONS =====

export interface APIClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  apiKey?: string;
  version: string;
}

export interface EndpointConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  timeout?: number;
  retries?: number;
  mockResponse?: any;
}


export interface MockConfig {
  enabled: boolean;
  delay: number; // Simulated network delay
  errorRate: number; // 0-1, probability of error
  responses: {
    [endpoint: string]: any;
  };
}

// ===== AUTHENTICATION INTERFACES =====

export interface AuthConfig {
  type: 'bearer' | 'api-key' | 'oauth2';
  credentials: {
    token?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
  refreshUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// ===== MONITORING INTERFACES =====

export interface APIMetrics {
  endpoint: string;
  responseTime: number;
  status: number;
  success: boolean;
  timestamp: string;
  retryCount: number;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  services: {
    [serviceName: string]: {
      status: 'UP' | 'DOWN';
      responseTime: number;
      lastCheck: string;
    };
  };
  version: string;
  uptime: number;
}
