// SSOT - AVI System Types
// Consolidates Advanced Voice Interview system types for risk evaluation and voice analysis

// AVI Categories for risk evaluation questions
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

// Question types supported by AVI system
export enum QuestionType {
    OPEN_NUMERIC = 'open_numeric',
    OPEN_TEXT = 'open_text',
    MULTIPLE_CHOICE = 'multiple_choice',
    YES_NO = 'yes_no',
    RANGE_ESTIMATE = 'range_estimate'
}

// Risk levels for AVI scoring system
export type AVIRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Risk impact levels for questions
export type AVIRiskImpact = 'HIGH' | 'MEDIUM' | 'LOW';

// Red flag severity levels
export type AVIFlagSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

// Analytics data for AVI questions to detect stress and truth indicators
export interface AVIQuestionAnalytics {
    expectedResponseTime: number;
    stressIndicators: string[];
    truthVerificationKeywords: string[];
    sigmaRatio?: number;
}

// Enhanced question structure with risk evaluation capabilities
export interface AVIQuestionEnhanced {
    id: string;
    category: AVICategory;
    question: string;
    weight: number; // 1-10
    riskImpact: AVIRiskImpact;
    stressLevel: number; // 1-5
    estimatedTime: number; // segundos
    verificationTriggers: string[];
    followUpQuestions?: string[];
    analytics: AVIQuestionAnalytics;
}

// Voice analysis metrics from audio processing
export interface VoiceAnalysis {
    pitch_variance: number;     // 0-1
    speech_rate_change: number; // 0-1
    pause_frequency: number;    // 0-1
    voice_tremor: number;       // 0-1
    confidence_level: number;   // 0-1 from Whisper
    transcription?: string;     // Transcribed text from voice
    latency_seconds?: number;   // Response latency in seconds
    recognition_accuracy?: number; // 0-1 recognition confidence
}

// Response data for AVI system including voice analysis
export interface AVIResponse {
    questionId: string;
    value: string;
    responseTime: number; // milliseconds
    transcription: string;
    voiceAnalysis?: VoiceAnalysis;
    stressIndicators: string[];
    coherenceScore?: number;
    sessionId?: string;
    timestamp?: string;
}

// Red flags detected during AVI evaluation
export interface RedFlag {
    type: string;
    questionId: string;
    reason: string;
    impact: number;
    severity: AVIFlagSeverity;
}

// Complete AVI score with risk assessment
export interface AVIScore {
    totalScore: number; // 0-1000
    riskLevel: AVIRiskLevel;
    categoryScores: { [key in AVICategory]: number };
    redFlags: RedFlag[];
    recommendations: string[];
    processingTime: number;
    confidence: number; // 0-1, aligned with HASE model
}

// AVI Session for tracking complete evaluation process
export interface AVISession {
    id: string;
    clientId: string;
    startTime: Date;
    endTime?: Date;
    responses: AVIResponse[];
    finalScore?: AVIScore;
    status: 'in_progress' | 'completed' | 'aborted';
    metadata?: {
        deviceInfo?: string;
        networkLatency?: number;
        audioQuality?: number;
    };
}

// AVI Calibration data for system tuning
export interface AVICalibration {
    id: string;
    version: string;
    categoryWeights: { [key in AVICategory]: number };
    thresholds: {
        lowRisk: number;
        mediumRisk: number;
        highRisk: number;
        criticalRisk: number;
    };
    voiceAnalysisWeights: {
        pitchVariance: number;
        speechRateChange: number;
        pauseFrequency: number;
        voiceTremor: number;
        confidenceLevel: number;
    };
    updatedAt: Date;
    updatedBy: string;
}

// AVI System Configuration
export interface AVIConfig {
    maxSessionDuration: number; // minutes
    questionTimeouts: { [key in QuestionType]: number }; // seconds
    retryAttempts: number;
    audioSampleRate: number;
    enableVoiceAnalysis: boolean;
    enableStressDetection: boolean;
    calibrationVersion: string;
}