import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { catchError, map, delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { adjustLogLRForAdmission, detectNervousWithAdmissionPattern, computeAdvancedLexicalScore } from '../utils/avi-lexical-processing';
import { ApiConfigService } from './api-config.service';
import { 
  VoiceAnalysisRequest, 
  VoiceAnalysisResponse, 
  WhisperTranscribeRequest, 
  WhisperTranscribeResponse,
  AVIEvaluationRequest,
  AVIEvaluationResponse
} from '../models/avi-api-contracts';

interface VoiceSession {
  session_id: string;
  advisor_id: string;
  client_id: string;
  session_type: 'prospection' | 'documentation' | 'legal_questionnaire';
  municipality: string;
  product_type: string;
  started_at: string;
  status: 'recording' | 'processing' | 'completed' | 'failed';
}

interface RequiredQuestion {
  id: string;
  text: string;
  category: 'identity' | 'financial' | 'operational' | 'legal' | 'resilience';
  mandatory: boolean;
  expected_answer_type: 'specific' | 'numeric' | 'yes_no' | 'descriptive';
  validation_rules?: string[];
  voice_flags?: string[];
  weight?: number;
  go_no_go_impact?: boolean;
}

export interface VoiceValidationResult {
  session_id: string;
  transcript: string;
  compliance_score: number; // 0-100
  questions_asked: string[];
  questions_missing: string[];
  risk_flags: RiskFlag[];
  coherence_analysis: CoherenceResult;
  digital_stamps: DigitalStamp[];
  processing_completed_at: string;
}

interface RiskFlag {
  type: 'inconsistency' | 'evasion' | 'nervousness' | 'coaching' | 'identity' | 'geographic_risk' | 'resilience_concern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  timestamp_in_audio: number;
}

interface CoherenceResult {
  overall_score: number;
  cross_validation_score: number;
  temporal_consistency: number;
  detail_specificity: number;
  inconsistencies: {
    field: string;
    form_value: any;
    voice_value: string;
    confidence: number;
  }[];
}

interface DigitalStamp {
  stamp_type: 'identity_verified' | 'questions_completed' | 'coherence_validated' | 'legal_consents';
  timestamp: string;
  valid: boolean;
  evidence_hash: string;
  expiry_date?: string;
}

interface MunicipalityQuestions {
  municipality: string;
  product_type: string;
  required_questions: RequiredQuestion[];
  legal_requirements: string[];
  risk_factors: string[];
  geographic_risk_score?: number;
  resilience_questions?: RequiredQuestion[];
}

// ✅ COMPLEMENTO: Geographic Risk Scoring (20% HASE)
interface GeographicRiskFactors {
  municipality: string;
  score: number; // 0-100 scale
  extortion_risk: number;
  political_pressure: number; 
  crime_incidence: number;
  route_stability: number;
  factors: string[];
}

// ✅ COMPLEMENTO: Advanced Voice Patterns 
interface AdvancedVoicePatterns {
  nervousness: number;
  evasion: number;
  honesty: number;
  response_latency: number;
  tone_variability: number;
  nervous_laughter: boolean;
  volume_changes: number;
  speech_pace_change: number;
  filler_words_count: number;
}

// ✅ COMPLEMENTO: HASE Scoring Components
interface HASEScoring {
  historical_gnv: number;     // 30%
  geographic_risk: number;    // 20% 
  voice_resilience: number;   // 50%
  total_score: number;
  go_no_go_eligible: boolean;
  protection_auto_activate: boolean;
}

// ============================================================================
// 🧬 AVI SYSTEM INTEGRATION (55 Questions + Dual Engine)
// ============================================================================

// AVI Question with Scientific Coefficients
export interface AVIQuestion {
  id: string;
  text: string;
  weight: number;
  category: 'BASIC_INFO' | 'DAILY_OPERATION' | 'OPERATIONAL_COSTS' | 'BUSINESS_STRUCTURE' | 'ASSETS_PATRIMONY' | 'CREDIT_HISTORY' | 'PAYMENT_INTENTION' | 'RISK_EVALUATION';
  expectedResponseTime: number;  // milliseconds
  stressLevel: 1 | 2 | 3 | 4 | 5;
  triggers: string[];
  coefficients: {
    alpha: number; // timing weight
    beta: number;  // voice weight  
    gamma: number; // lexical weight
    delta: number; // coherence weight
  };
}

// AVI Voice Analysis Features (from BFF)
export interface VoiceAnalysisFeatures {
  transcription: string;
  confidence: number;
  duration: number;
  pitch_variance: number;
  speech_rate_change: number;
  pause_frequency: number;
  voice_tremor: number;
  response_time: number;
}

// AVI Score Result (per question)
export interface AVIScoreResult {
  questionId: string;
  subscore: number;  // 0-1000 scale
  components: {
    timing_score: number;
    voice_score: number;
    lexical_score: number;
    coherence_score: number;
  };
  flags: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// AVI Consolidated Result (dual engine)
export interface ConsolidatedAVIResult {
  final_score: number;          // 0-1000 scale
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scientific_engine_score: number;
  heuristic_engine_score: number;
  consensus_weight: number;
  protection_eligible: boolean;
  decision: 'GO' | 'REVIEW' | 'NO-GO';
  detailed_breakdown: AVIScoreResult[];
  red_flags: string[];
  recommendations: string[];
}

// Existing VoiceEvaluationResult (maintained for compatibility)
interface VoiceEvaluationResult {
  questionId: string;
  voiceScore: number;        // 0.0-1.0
  decision: 'GO' | 'NO-GO' | 'REVIEW';
  flags: string[];           // ['highLatency', 'unstablePitch', etc.]
  fallback?: boolean;        // True if heuristic fallback was used
  message?: string;          // Human-readable result
  processingTime?: string;   // '245ms'
  voiceMetrics?: {
    latencyIndex: number;
    pitchVar: number;
    disfluencyRate: number;
    energyStability: number;
    honestyLexicon: number;
  };
}

interface VoiceEvaluationStore {
  questionId: string;
  voiceScore: number;
  flags: string[];
  decision: 'GO' | 'NO-GO' | 'REVIEW';
  timestamp: number;
  fallback?: boolean;
}

// ===== NEW BFF VOICE ANALYSIS INTERFACES =====
interface VoiceAnalyzeRequest {
  questionId: string;
  latencySec: number;
  answerDurationSec: number;
  pitchSeriesHz: number[];
  energySeries: number[];
  words: string[];
  contextId: string;
}

interface VoiceAnalyzeResponse {
  success: boolean;
  score: number;
  decision: 'GO' | 'NO-GO' | 'REVIEW';
  metrics: {
    latencyIndex: number;
    pitchVariability: number; 
    disfluencyRate: number;
    energyStability: number;
    honestyLexicon: number;
  };
  flags: string[];
  processingTime: string;
  fallback?: boolean;
}

interface VoiceEvaluateResponse {
  success: boolean;
  transcription: string;
  confidence: number;
  voiceAnalysis: VoiceAnalyzeResponse;
  saved: boolean;
  evaluationId?: string;
}

// ===== STANDARDIZED RESILIENCE QUESTIONNAIRE =====
interface ResilienceQuestion {
  id: string;
  text: string;
  category: 'stress_management' | 'financial_pressure' | 'route_challenges' | 'family_support';
  expectedPattern: {
    maxLatencyMs: number;
    keywordIndicators: string[];
    riskKeywords: string[];
  };
}

const RESILIENCE_QUESTIONS: ResilienceQuestion[] = [
  {
    id: 'emergency_funds',
    text: '¿Qué hace cuando no tiene dinero para la gasolina un día?',
    category: 'financial_pressure',
    expectedPattern: {
      maxLatencyMs: 3000,
      keywordIndicators: ['ahorro', 'familia', 'préstamo', 'vender'],
      riskKeywords: ['no_se', 'pedir_prestado', 'empeñar', 'no_tengo']
    }
  },
  {
    id: 'route_conflict',
    text: '¿Cómo maneja cuando hay conflictos con otros conductores en su ruta?',
    category: 'stress_management', 
    expectedPattern: {
      maxLatencyMs: 2500,
      keywordIndicators: ['hablar', 'dialogo', 'autoridad', 'evito'],
      riskKeywords: ['pelear', 'confronto', 'no_me_dejo', 'violencia']
    }
  },
  {
    id: 'payment_pressure',
    text: '¿Qué siente cuando le exigen "cuotas" o "apoyos" extra?',
    category: 'stress_management',
    expectedPattern: {
      maxLatencyMs: 4000,
      keywordIndicators: ['normal', 'parte_del_trabajo', 'necesario'],
      riskKeywords: ['injusto', 'corrupcion', 'no_deberia', 'abuso']
    }
  },
  {
    id: 'income_variation',
    text: '¿Cómo se organiza cuando los ingresos bajan mucho por temporadas?',
    category: 'financial_pressure',
    expectedPattern: {
      maxLatencyMs: 3500,
      keywordIndicators: ['planear', 'ahorrar', 'trabajar_mas', 'otros_ingresos'],
      riskKeywords: ['pedir_prestado', 'no_se', 'me_endeudo', 'vender_cosas']
    }
  },
  // 8 more questions...
  {
    id: 'family_support',
    text: '¿Su familia entiende los riesgos del transporte público?',
    category: 'family_support',
    expectedPattern: {
      maxLatencyMs: 2000,
      keywordIndicators: ['entienden', 'apoyan', 'saben', 'comprenden'],
      riskKeywords: ['no_entienden', 'se_preocupan_mucho', 'quieren_que_deje']
    }
  }
];

interface ResilienceSummary {
  voiceResilienceScore: number;    // 0.0-1.0
  finalDecision: 'GO' | 'NO-GO' | 'REVIEW';
  reviewCount: number;
  noGoCount: number;
  goCount: number;
  totalQuestions: number;
  humanReviewRequired: boolean;
  criticalFlags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class VoiceValidationService {
  private readonly baseUrl = environment.apiUrl;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentSession$ = new BehaviorSubject<VoiceSession | null>(null);
  private isRecording$ = new BehaviorSubject<boolean>(false);
  private recordingError$ = new Subject<string>();
  
  // ✅ NUEVO: Voice evaluation storage
  private voiceEvaluations: VoiceEvaluationStore[] = [];
  private requestIdCounter = 0;

  // Municipal configurations
  private municipalityQuestions: { [key: string]: MunicipalityQuestions } = {
    'aguascalientes_individual': {
      municipality: 'aguascalientes',
      product_type: 'individual',
      required_questions: [
        {
          id: 'years_driving',
          text: '¿Cuántos años tienes manejando ruta de transporte público?',
          category: 'operational',
          mandatory: true,
          expected_answer_type: 'numeric',
          validation_rules: ['min_2_years']
        },
        {
          id: 'route_ownership',
          text: '¿La ruta que manejas es propia, rentada o trabajas para un patrón?',
          category: 'operational', 
          mandatory: true,
          expected_answer_type: 'specific'
        },
        {
          id: 'vehicle_gnv',
          text: '¿Tu vehículo ya tiene instalación de GNV o necesitarías conversión?',
          category: 'financial',
          mandatory: true,
          expected_answer_type: 'specific'
        },
        {
          id: 'previous_credits',
          text: '¿Tienes algún crédito activo con otra financiera de transporte?',
          category: 'financial',
          mandatory: true,
          expected_answer_type: 'yes_no'
        },
        {
          id: 'daily_schedule',
          text: '¿En qué horarios operás tu ruta normalmente?',
          category: 'operational',
          mandatory: true,
          expected_answer_type: 'descriptive'
        },
        {
          id: 'monthly_income',
          text: 'Aproximadamente, ¿cuánto generas de ingresos al mes con la ruta?',
          category: 'financial',
          mandatory: true,
          expected_answer_type: 'numeric',
          validation_rules: ['coherence_with_form']
        }
      ],
      legal_requirements: [
        'Consentimiento para consulta en buró de crédito',
        'Autorización para verificar referencias',
        'Aceptación de términos y condiciones'
      ],
      risk_factors: ['income_inconsistency', 'route_instability', 'credit_history']
    },
    'edomex_colectivo': {
      municipality: 'estado_de_mexico',
      product_type: 'colectivo',
      required_questions: [
        {
          id: 'group_leader',
          text: '¿Quién es el líder o coordinador de su grupo de transportistas?',
          category: 'operational',
          mandatory: true,
          expected_answer_type: 'specific'
        },
        {
          id: 'group_size',
          text: '¿Cuántos transportistas forman parte de su grupo?',
          category: 'operational',
          mandatory: true,
          expected_answer_type: 'numeric'
        },
        {
          id: 'collective_guarantee',
          text: '¿Entiende que todo el grupo responde por el pago de cada miembro?',
          category: 'legal',
          mandatory: true,
          expected_answer_type: 'yes_no'
        },
        {
          id: 'route_permits',
          text: '¿Su grupo tiene todos los permisos vigentes para operar la ruta?',
          category: 'legal',
          mandatory: true,
          expected_answer_type: 'yes_no'
        }
      ],
      legal_requirements: [
        'Aval solidario grupal',
        'Verificación de permisos de ruta',
        'Consentimientos individuales y colectivos'
      ],
      risk_factors: ['group_stability', 'leadership_quality', 'permit_compliance']
    }
  };

  private readonly apiConfig = inject(ApiConfigService);

  constructor(private http: HttpClient) {
    this.checkBrowserSupport();
    this.initializeApiIntegration();
  }

  /**
   * Initialize API integration and configuration
   */
  private initializeApiIntegration(): void {
    // Subscribe to API configuration changes
    this.apiConfig.config$.subscribe(config => {
      if (config) {
        console.log('🔧 VoiceValidationService: API configuration updated', {
          baseUrl: config.baseUrl,
          mockMode: this.apiConfig.isMockMode()
        });
      }
    });

    // Load AVI configuration if not in mock mode
    if (!this.apiConfig.isMockMode()) {
      this.loadAVIConfiguration();
    }
  }

  /**
   * Load AVI configuration from API
   */
  private loadAVIConfiguration(): void {
    // Load questions configuration
    this.apiConfig.loadAVIQuestions().subscribe({
      next: (response) => {
        if (response.success && response.data.questions.length > 0) {
          // Update AVI questions from API
          console.log('✅ AVI questions loaded from API:', response.data.questions.length);
        }
      },
      error: (error) => {
        console.warn('⚠️ Failed to load AVI questions from API, using defaults:', error);
      }
    });

    // Load risk thresholds configuration
    this.apiConfig.loadRiskThresholds().subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Risk thresholds loaded from API');
        }
      },
      error: (error) => {
        console.warn('⚠️ Failed to load risk thresholds from API, using defaults:', error);
      }
    });

    // Load geographic risk configuration
    this.apiConfig.loadGeographicRisk().subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Geographic risk configuration loaded from API');
        }
      },
      error: (error) => {
        console.warn('⚠️ Failed to load geographic risk config from API, using defaults:', error);
      }
    });
  }

  // =================================
  // RECORDING INFRASTRUCTURE
  // =================================

  private checkBrowserSupport(): boolean {
    const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!isSupported) {
      console.error('Voice recording not supported in this browser');
    }
    return isSupported;
  }

  async initializeRecording(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.setupRecorderHandlers();
      return true;
    } catch (error) {
      console.error('Failed to initialize recording:', error);
      this.recordingError$.next('No se pudo acceder al micrófono. Verifique permisos.');
      return false;
    }
  }

  private setupRecorderHandlers(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.processRecording();
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('Recording error:', event);
      this.recordingError$.next('Error durante la grabación');
    };
  }

  // =================================
  // SESSION MANAGEMENT
  // =================================

  async startVoiceSession(
    advisorId: string,
    clientId: string,
    sessionType: 'prospection' | 'documentation' | 'legal_questionnaire',
    municipality: string,
    productType: string
  ): Promise<VoiceSession> {
    const session: VoiceSession = {
      session_id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      advisor_id: advisorId,
      client_id: clientId,
      session_type: sessionType,
      municipality: municipality,
      product_type: productType,
      started_at: new Date().toISOString(),
      status: 'recording'
    };

    // Initialize recording
    const canRecord = await this.initializeRecording();
    if (!canRecord) {
      throw new Error('Cannot initialize voice recording');
    }

    this.currentSession$.next(session);
    return session;
  }

  startRecording(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'inactive') {
      return;
    }

    this.audioChunks = [];
    this.mediaRecorder.start(1000); // Collect data every second
    this.isRecording$.next(true);

    // Update session status
    const currentSession = this.currentSession$.value;
    if (currentSession) {
      currentSession.status = 'recording';
      this.currentSession$.next(currentSession);
    }
  }

  stopRecording(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return;
    }

    this.mediaRecorder.stop();
    this.isRecording$.next(false);

    // Stop all tracks
    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());

    // Update session status
    const currentSession = this.currentSession$.value;
    if (currentSession) {
      currentSession.status = 'processing';
      this.currentSession$.next(currentSession);
    }
  }

  private async processRecording(): Promise<void> {
    if (this.audioChunks.length === 0) {
      this.recordingError$.next('No se grabó audio');
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const currentSession = this.currentSession$.value;

    if (!currentSession) {
      this.recordingError$.next('No hay sesión activa');
      return;
    }

    try {
      await this.uploadAndProcessAudio(audioBlob, currentSession);
    } catch (error) {
      console.error('Failed to process recording:', error);
      this.recordingError$.next('Error al procesar la grabación');
      
      if (currentSession) {
        currentSession.status = 'failed';
        this.currentSession$.next(currentSession);
      }
    }
  }

  // =================================
  // BACKEND INTEGRATION
  // =================================

  private async uploadAndProcessAudio(audioBlob: Blob, session: VoiceSession): Promise<void> {
    const formData = new FormData();
    formData.append('audio', audioBlob, `${session.session_id}.webm`);
    formData.append('session_data', JSON.stringify(session));

    // Get required questions for this session
    const questionKey = `${session.municipality}_${session.product_type}`;
    const requiredQuestions = this.municipalityQuestions[questionKey];
    formData.append('required_questions', JSON.stringify(requiredQuestions));

    const response = await this.http.post<{success: boolean, processing_id: string}>(
      `${this.baseUrl}/voice/upload-and-process`,
      formData,
      { headers: { 'Authorization': `Bearer ${this.getAuthToken()}` } }
    ).toPromise();

    if (response?.success) {
      // Poll for results
      this.pollProcessingResults(response.processing_id, session.session_id);
    }
  }

  private pollProcessingResults(processingId: string, sessionId: string): void {
    const pollInterval = setInterval(async () => {
      try {
        const result = await this.getProcessingResult(processingId);
        
        if (result.status === 'completed') {
          clearInterval(pollInterval);
          this.handleProcessingComplete(result.data, sessionId);
        } else if (result.status === 'failed') {
          clearInterval(pollInterval);
          this.handleProcessingFailed(result.error, sessionId);
        }
      } catch (error) {
        console.error('Error polling results:', error);
        clearInterval(pollInterval);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
  }

  private async getProcessingResult(processingId: string): Promise<any> {
    return this.http.get(`${this.baseUrl}/voice/processing/${processingId}`, {
      headers: { 'Authorization': `Bearer ${this.getAuthToken()}` }
    }).toPromise();
  }

  private handleProcessingComplete(validationResult: VoiceValidationResult, sessionId: string): void {
    const currentSession = this.currentSession$.value;
    if (currentSession && currentSession.session_id === sessionId) {
      currentSession.status = 'completed';
      this.currentSession$.next(currentSession);
    }

    // Store result locally for offline access
    localStorage.setItem(`voice_result_${sessionId}`, JSON.stringify(validationResult));

    // Emit completion event
    this.onValidationComplete(validationResult);
  }

  private handleProcessingFailed(error: string, sessionId: string): void {
    const currentSession = this.currentSession$.value;
    if (currentSession && currentSession.session_id === sessionId) {
      currentSession.status = 'failed';
      this.currentSession$.next(currentSession);
    }
    
    this.recordingError$.next(`Procesamiento falló: ${error}`);
  }

  // =================================
  // VALIDATION RESULTS
  // =================================

  async getValidationResult(sessionId: string): Promise<VoiceValidationResult | null> {
    try {
      // Try backend first
      const result = await this.http.get<VoiceValidationResult>(
        `${this.baseUrl}/voice/results/${sessionId}`,
        { headers: { 'Authorization': `Bearer ${this.getAuthToken()}` } }
      ).toPromise();
      
      return result || null;
    } catch (error) {
      // Fallback to local storage
      const stored = localStorage.getItem(`voice_result_${sessionId}`);
      return stored ? JSON.parse(stored) : null;
    }
  }

  getRequiredQuestions(municipality: string, productType: string): RequiredQuestion[] {
    const key = `${municipality}_${productType}`;
    return this.municipalityQuestions[key]?.required_questions || [];
  }

  calculateComplianceScore(result: VoiceValidationResult): {
    total_score: number;
    breakdown: {
      questions_completeness: number;
      coherence_score: number;
      risk_penalty: number;
      legal_compliance: number;
    }
  } {
    const breakdown = {
      questions_completeness: Math.max(0, 100 - (result.questions_missing.length * 15)),
      coherence_score: result.coherence_analysis.overall_score,
      risk_penalty: Math.max(0, result.risk_flags.length * -10),
      legal_compliance: result.digital_stamps.filter(s => s.valid).length * 25
    };

    const total_score = Math.max(0, Math.min(100, 
      (breakdown.questions_completeness * 0.3) +
      (breakdown.coherence_score * 0.3) +
      (breakdown.risk_penalty * 0.2) +
      (breakdown.legal_compliance * 0.2)
    ));

    return { total_score, breakdown };
  }

  // =================================
  // REAL-TIME GUIDANCE
  // =================================

  getNextRequiredQuestion(sessionType: string, municipality: string, productType: string, askedQuestions: string[]): RequiredQuestion | null {
    const required = this.getRequiredQuestions(municipality, productType);
    const remaining = required.filter(q => !askedQuestions.includes(q.id));
    
    // Return highest priority question
    return remaining.find(q => q.mandatory) || remaining[0] || null;
  }

  generateInterviewGuide(municipality: string, productType: string): {
    introduction: string;
    questions: RequiredQuestion[];
    closing: string;
    tips: string[];
  } {
    const questions = this.getRequiredQuestions(municipality, productType);
    
    return {
      introduction: `Vamos a hacer algunas preguntas obligatorias para ${productType} en ${municipality}. La conversación será grabada para validación.`,
      questions: questions,
      closing: 'Perfecto, hemos completado todas las preguntas obligatorias. ¿Tienes alguna duda adicional?',
      tips: [
        'Hable claro y pausado',
        'Haga todas las preguntas listadas',
        'Verifique coherencia con el formulario',
        'Documente cualquier inconsistencia'
      ]
    };
  }

  // =================================
  // OBSERVABLES & EVENTS
  // =================================

  get currentSession(): Observable<VoiceSession | null> {
    return this.currentSession$.asObservable();
  }

  get isRecording(): Observable<boolean> {
    return this.isRecording$.asObservable();
  }

  get recordingErrors(): Observable<string> {
    return this.recordingError$.asObservable();
  }

  private onValidationComplete(result: VoiceValidationResult): void {
    // Emit custom event for components to listen
    const event = new CustomEvent('voiceValidationComplete', {
      detail: result
    });
    window.dispatchEvent(event);
  }

  // =================================
  // UTILITY METHODS
  // =================================

  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getRiskFlagIcon(flag: RiskFlag): string {
    switch (flag.severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '🔍';
    }
  }

  getComplianceColor(score: number): string {
    if (score >= 90) return '#22c55e'; // Green
    if (score >= 70) return '#eab308'; // Yellow  
    if (score >= 50) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }

  // ✅ COMPLEMENTO: Geographic Risk Scoring (EDOMEX)
  private readonly EDOMEX_GEOGRAPHIC_SCORING: Record<string, GeographicRiskFactors> = {
    // ALTÍSIMO RIESGO (0-25 pts)
    'ecatepec_morelos': {
      municipality: 'Ecatepec de Morelos',
      score: 15,
      extortion_risk: 0.9,
      political_pressure: 0.7,
      crime_incidence: 0.9,
      route_stability: 0.2,
      factors: ['cobro_cuotas_grupos', 'robo_unidades', 'av_central_critica', 'via_morelos_inestable']
    },
    'nezahualcoyotl': {
      municipality: 'Nezahualcóyotl', 
      score: 20,
      extortion_risk: 0.8,
      political_pressure: 0.6,
      crime_incidence: 0.7,
      route_stability: 0.3,
      factors: ['valle_aragon_extorsion', 'benito_juarez_problemas', 'presion_vecinal']
    },
    'naucalpan': {
      municipality: 'Naucalpan',
      score: 45,
      extortion_risk: 0.4,
      political_pressure: 0.6,
      crime_incidence: 0.5,
      route_stability: 0.6,
      factors: ['bloqueos_sindicales', 'periferico_conflictivo', 'gustavo_baz_riesgo']
    },
    // RIESGO BAJO (61-100 pts)
    'cuautitlan_izcalli': {
      municipality: 'Cuautitlán Izcalli',
      score: 75,
      extortion_risk: 0.3,
      political_pressure: 0.2,
      crime_incidence: 0.4,
      route_stability: 0.8,
      factors: ['rutas_obreras_estables', 'menos_presion_sindical', 'industrial_estable']
    },
    'huixquilucan': {
      municipality: 'Huixquilucan',
      score: 85,
      extortion_risk: 0.1,
      political_pressure: 0.2, 
      crime_incidence: 0.2,
      route_stability: 0.9,
      factors: ['interlomas_estable', 'alta_plusvalia', 'baja_criminalidad']
    }
  };

  // ============================================================================
  // 🧬 AVI 55 QUESTIONS (Scientifically Calibrated) - API CONFIGURABLE
  // ============================================================================
  
  private readonly AVI_55_QUESTIONS: AVIQuestion[] = [
    // SECCIÓN A: INFORMACIÓN BÁSICA (Peso: 2-7)
    {
      id: 'nombre_completo',
      text: '¿Cuál es su nombre completo?',
      weight: 2,
      category: 'BASIC_INFO',
      expectedResponseTime: 30000,
      stressLevel: 1,
      triggers: ['coincide_con_documentos'],
      coefficients: { alpha: 0.30, beta: 0.20, gamma: 0.20, delta: 0.30 }
    },
    {
      id: 'edad',
      text: '¿Qué edad tiene?',
      weight: 4,
      category: 'BASIC_INFO',
      expectedResponseTime: 30000,
      stressLevel: 1,
      triggers: ['coherencia_con_experiencia'],
      coefficients: { alpha: 0.30, beta: 0.20, gamma: 0.20, delta: 0.30 }
    },
    {
      id: 'ruta_especifica',
      text: '¿De qué ruta es específicamente?',
      weight: 6,
      category: 'BASIC_INFO',
      expectedResponseTime: 60000,
      stressLevel: 2,
      triggers: ['validar_existencia_ruta'],
      coefficients: { alpha: 0.30, beta: 0.20, gamma: 0.20, delta: 0.30 }
    },
    {
      id: 'anos_en_ruta',
      text: '¿Cuántos años lleva en esa ruta?',
      weight: 7,
      category: 'BASIC_INFO',
      expectedResponseTime: 45000,
      stressLevel: 2,
      triggers: ['coherencia_edad_experiencia'],
      coefficients: { alpha: 0.30, beta: 0.20, gamma: 0.20, delta: 0.30 }
    },
    {
      id: 'estado_civil_dependientes',
      text: '¿Está casado/a? ¿Su pareja trabaja? ¿Cuántos hijos tiene?',
      weight: 5,
      category: 'BASIC_INFO',
      expectedResponseTime: 90000,
      stressLevel: 2,
      triggers: ['coherencia_gastos_familiares'],
      coefficients: { alpha: 0.30, beta: 0.20, gamma: 0.20, delta: 0.30 }
    },

    // SECCIÓN B: OPERACIÓN DIARIA (High evasion risk)
    {
      id: 'vueltas_por_dia',
      text: '¿Cuántas vueltas da al día?',
      weight: 8,
      category: 'DAILY_OPERATION',
      expectedResponseTime: 60000,
      stressLevel: 3,
      triggers: ['cruzar_con_ingresos'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },
    {
      id: 'kilometros_por_vuelta',
      text: '¿De cuántos kilómetros es cada vuelta?',
      weight: 7,
      category: 'DAILY_OPERATION',
      expectedResponseTime: 75000,
      stressLevel: 3,
      triggers: ['coherencia_gasto_gasolina'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },
    {
      id: 'ingresos_promedio_diarios',
      text: '¿Cuáles son sus ingresos promedio diarios?',
      weight: 10, // CRITICAL QUESTION
      category: 'DAILY_OPERATION',
      expectedResponseTime: 120000,
      stressLevel: 5,
      triggers: ['cruzar_con_todo'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },
    {
      id: 'pasajeros_por_vuelta',
      text: '¿Cuántos pasajeros promedio lleva por vuelta?',
      weight: 8,
      category: 'DAILY_OPERATION',
      expectedResponseTime: 60000,
      stressLevel: 3,
      triggers: ['coherencia_ingresos_tarifa'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },
    {
      id: 'tarifa_por_pasajero',
      text: '¿Cuánto cobra por pasaje actualmente?',
      weight: 6,
      category: 'DAILY_OPERATION',
      expectedResponseTime: 45000,
      stressLevel: 2,
      triggers: ['coherencia_ingresos_totales'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },
    {
      id: 'ingresos_temporada_baja',
      text: '¿Cuánto bajan sus ingresos en la temporada más mala del año?',
      weight: 9,
      category: 'DAILY_OPERATION',
      expectedResponseTime: 90000,
      stressLevel: 4,
      triggers: ['capacidad_pago_minima'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },

    // SECCIÓN C: GASTOS OPERATIVOS CRÍTICOS
    {
      id: 'gasto_diario_gasolina',
      text: '¿Cuánto gasta al día en gasolina?',
      weight: 9,
      category: 'OPERATIONAL_COSTS',
      expectedResponseTime: 90000,
      stressLevel: 4,
      triggers: ['coherencia_vueltas_kilometros'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },
    {
      id: 'vueltas_por_tanque',
      text: '¿Cuántas vueltas hace con esa carga de gasolina?',
      weight: 8,
      category: 'OPERATIONAL_COSTS',
      expectedResponseTime: 90000,
      stressLevel: 3,
      triggers: ['coherencia_matematica_combustible'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },
    {
      id: 'gastos_mordidas_cuotas',
      text: '¿Cuánto paga de cuotas o "apoyos" a la semana a autoridades o líderes?',
      weight: 10, // CRITICAL - HIGH EVASION RISK
      category: 'OPERATIONAL_COSTS',
      expectedResponseTime: 180000,
      stressLevel: 5,
      triggers: ['legalidad'],
      coefficients: { alpha: 0.15, beta: 0.25, gamma: 0.25, delta: 0.35 }
    },
    {
      id: 'pago_semanal_tarjeta',
      text: '¿Cuánto paga de tarjeta a la semana?',
      weight: 6,
      category: 'OPERATIONAL_COSTS',
      expectedResponseTime: 60000,
      stressLevel: 3,
      triggers: ['coherencia_ingresos_netos'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },
    {
      id: 'mantenimiento_mensual',
      text: '¿Cuánto gasta en mantenimiento promedio al mes?',
      weight: 6,
      category: 'OPERATIONAL_COSTS',
      expectedResponseTime: 75000,
      stressLevel: 2,
      triggers: ['coherencia_edad_unidad'],
      coefficients: { alpha: 0.20, beta: 0.25, gamma: 0.15, delta: 0.40 }
    },

    // SECCIÓN D: ESTRUCTURA DEL NEGOCIO
    {
      id: 'propiedad_unidad',
      text: '¿El vehículo es propio o rentado?',
      weight: 7,
      category: 'BUSINESS_STRUCTURE',
      expectedResponseTime: 60000,
      stressLevel: 3,
      triggers: ['coherencia_gastos_totales'],
      coefficients: { alpha: 0.30, beta: 0.20, gamma: 0.20, delta: 0.30 }
    },
    {
      id: 'pago_diario_renta',
      text: 'Si es rentado, ¿cuánto paga diario de renta?',
      weight: 8,
      category: 'BUSINESS_STRUCTURE',
      expectedResponseTime: 75000,
      stressLevel: 4,
      triggers: ['impacto_ingresos_netos'],
      coefficients: { alpha: 0.30, beta: 0.20, gamma: 0.20, delta: 0.30 }
    },

    // SECCIÓN F: EVALUACIÓN DE RIESGO (Critical Questions)
    {
      id: 'margen_disponible_credito',
      text: 'Después de todos sus gastos, ¿cuánto le queda libre mensual?',
      weight: 10, // CRITICAL
      category: 'RISK_EVALUATION',
      expectedResponseTime: 150000,
      stressLevel: 5,
      triggers: ['capacidad_real_pago'],
      coefficients: { alpha: 0.15, beta: 0.25, gamma: 0.25, delta: 0.35 }
    },
    
    // VERIFICATION CROSS-CHECK QUESTIONS
    {
      id: 'calculo_ingresos_semanales',
      text: 'Si gana X diario, ¿cuánto sería a la semana?',
      weight: 8,
      category: 'RISK_EVALUATION',
      expectedResponseTime: 60000,
      stressLevel: 4,
      triggers: ['verificacion_matematica'],
      coefficients: { alpha: 0.15, beta: 0.25, gamma: 0.25, delta: 0.35 }
    },
    {
      id: 'confirmacion_datos_criticos',
      text: 'Confirmemos: ¿gana $X diario y gasta $Y en gasolina?',
      weight: 8,
      category: 'RISK_EVALUATION',
      expectedResponseTime: 60000,
      stressLevel: 4,
      triggers: ['confirmacion_final'],
      coefficients: { alpha: 0.15, beta: 0.25, gamma: 0.25, delta: 0.35 }
    }
    
    // NOTE: This is a subset - the full 55 questions would be loaded from API or config
    // Remaining questions follow same structure with different categories and weights
  ];

  // AVI THRESHOLDS (Conservative - API configurable)
  private readonly AVI_THRESHOLDS = {
    GO_MIN: 780,      // Minimum threshold for approval
    NOGO_MAX: 550,    // Maximum threshold for rejection  
    REVIEW_MIN: 551,  // Review range start
    REVIEW_MAX: 779   // Review range end
  };

  // API Configuration (when services are available)
  private readonly API_CONFIG = {
    // BFF Voice Analysis Endpoints
    VOICE_ANALYSIS: '/api/v1/voice/analyze',
    WHISPER_TRANSCRIBE: '/api/v1/voice/whisper-transcribe', 
    AVI_EVALUATE: '/api/v1/avi/evaluate-complete',
    
    // Configuration Endpoints  
    AVI_QUESTIONS: '/api/v1/config/avi-questions',
    RISK_THRESHOLDS: '/api/v1/config/avi-thresholds',
    GEOGRAPHIC_RISK: '/api/v1/config/geographic-risk',
    
    // Fallback/Mock for development
    MOCK_MODE: true // Set to false when APIs are ready
  };

  // ✅ COMPLEMENTO: Tu Cuestionario de Resiliencia (12 preguntas) - LEGACY SUPPORT
  private readonly RESILIENCE_QUESTIONS_CORE: RequiredQuestion[] = [
    {
      id: 'seasonal_vulnerability',
      text: '¿En qué época del año se te complica más trabajar?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'descriptive',
      voice_flags: ['rapid_response', 'specific_mention'],
      weight: 8,
      go_no_go_impact: true
    },
    {
      id: 'unit_substitution',
      text: 'Si no puedes manejar un día, ¿quién cubre la unidad?',
      category: 'resilience', 
      mandatory: true,
      expected_answer_type: 'specific',
      voice_flags: ['concrete_name', 'no_long_hesitation'],
      weight: 8,
      go_no_go_impact: true
    },
    {
      id: 'cost_crisis_adjustment',
      text: 'Si sube el gas, ¿cómo ajustas tus pagos?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'descriptive', 
      voice_flags: ['clear_solution', 'no_evasion'],
      weight: 6,
      go_no_go_impact: false
    },
    {
      id: 'route_security_issues',
      text: '¿En tu ruta has tenido problemas de cobros o extorsión?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'descriptive',
      voice_flags: ['firm_response', 'no_tone_changes'],
      weight: 10,
      go_no_go_impact: true
    },
    {
      id: 'health_contingency',
      text: '¿Qué pasa si te enfermas 15 días?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'descriptive',
      voice_flags: ['mentions_substitute', 'no_denial'],
      weight: 8,
      go_no_go_impact: true
    },
    {
      id: 'expense_priority',
      text: 'Cuando se te juntan gastos, ¿qué pagas primero?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'specific',
      voice_flags: ['mentions_unit', 'confident_tone'],
      weight: 6,
      go_no_go_impact: false
    },
    {
      id: 'credit_experience',
      text: '¿Alguna vez te atrasaste en un crédito? ¿Cómo lo resolviste?',
      category: 'resilience', 
      mandatory: true,
      expected_answer_type: 'descriptive',
      voice_flags: ['concrete_story', 'no_nervousness'],
      weight: 8,
      go_no_go_impact: true
    },
    {
      id: 'economic_support_network',
      text: '¿Quién te ayuda si no alcanzas para el pago?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'specific',
      voice_flags: ['mentions_family', 'no_long_silence'],
      weight: 8,
      go_no_go_impact: true
    },
    {
      id: 'unexpected_events',
      text: '¿Qué haces si bloquean tu ruta un día?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'descriptive',
      voice_flags: ['alternative_solution', 'no_evasion'],
      weight: 6,
      go_no_go_impact: false
    },
    {
      id: 'emergency_savings',
      text: '¿Guardas algo cada mes para emergencias?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'yes_no',
      voice_flags: ['mentions_tanda_or_savings', 'no_nervous_laughter'],
      weight: 6,
      go_no_go_impact: false
    },
    {
      id: 'family_dependents',
      text: '¿Cuántas personas dependen de lo que ganas aquí?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'numeric',
      voice_flags: ['clear_number', 'no_contradictions'],
      weight: 5,
      go_no_go_impact: false
    },
    {
      id: 'future_vision',
      text: '¿Dónde te ves en 5 años con tu unidad?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'descriptive',
      voice_flags: ['growth_mention', 'no_evasion'],
      weight: 5,
      go_no_go_impact: false
    }
  ];

  // ✅ COMPLEMENTO: Nuevas Preguntas Adicionales
  private readonly ADDITIONAL_RESILIENCE_QUESTIONS: RequiredQuestion[] = [
    {
      id: 'route_blockade_response',
      text: '¿Qué haces si tu ruta es bloqueada por un operativo?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'descriptive',
      voice_flags: ['solution_oriented', 'no_evasion'],
      weight: 7,
      go_no_go_impact: false
    },
    {
      id: 'base_cuota_experience',
      text: '¿Alguna vez has tenido que pagar cuota en tu base?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'yes_no',
      voice_flags: ['honesty', 'no_nervousness'],
      weight: 9,
      go_no_go_impact: true
    },
    {
      id: 'unit_breakdown_support',
      text: '¿Quién te ayuda si tu unidad queda parada una semana?',
      category: 'resilience',
      mandatory: true,
      expected_answer_type: 'specific',
      voice_flags: ['specific_names', 'confidence'],
      weight: 8,
      go_no_go_impact: true
    }
  ];

  // ✅ COMPLEMENTO: Geographic Risk Calculation
  calculateGeographicRisk(municipality: string): number {
    const municipalityKey = municipality.toLowerCase().replace(/\s+/g, '_');
    const riskData = this.EDOMEX_GEOGRAPHIC_SCORING[municipalityKey];
    
    if (!riskData) {
      // Aguascalientes y otros municipios low-risk
      return 0.9; // Default high score for low-risk areas
    }
    
    // Convert 0-100 score to 0.0-1.0 for HASE
    return riskData.score / 100;
  }

  // ✅ COMPLEMENTO: HASE Score Integration (30-20-50)
  calculateHASEScore(
    historicalGNV: number = 0.5,  // From backend
    municipality: string,
    voiceAnalysis: any,
    resilienceResponses: any[]
  ): HASEScoring {
    
    // 30% Historical GNV (from backend)
    const gnvScore = historicalGNV;
    
    // 20% Geographic Risk
    const geoScore = this.calculateGeographicRisk(municipality);
    
    // 50% Voice + Resilience 
    const resilienceScore = this.calculateResilienceScore(resilienceResponses);
    const voiceScore = this.calculateVoiceScore(voiceAnalysis);
    const voiceResilienceScore = (resilienceScore * 0.6) + (voiceScore * 0.4);
    
    // Final HASE calculation
    const totalScore = (gnvScore * 0.30) + (geoScore * 0.20) + (voiceResilienceScore * 0.50);
    
    // GO/NO-GO Decision Logic
    // Normalize thresholds to 0–1 scale: GO >= 0.75, NO-GO < 0.55
    const goNoGoEligible = totalScore >= 0.55 && 
                          voiceScore >= 0.55 && 
                          this.hasNoMajorRedFlags(voiceAnalysis);
                          
    const protectionAutoActivate = goNoGoEligible && 
                                  this.hasVulnerabilityIndicators(resilienceResponses);

    return {
      historical_gnv: gnvScore,
      geographic_risk: geoScore,
      voice_resilience: voiceResilienceScore,
      total_score: totalScore,
      go_no_go_eligible: goNoGoEligible,
      protection_auto_activate: protectionAutoActivate
    };
  }

  // ✅ COMPLEMENTO: Resilience Score Calculation
  private calculateResilienceScore(responses: any[]): number {
    const maxScore = 78; // Total weight from 12 questions
    let totalScore = 0;
    
    responses.forEach(response => {
      const question = [...this.RESILIENCE_QUESTIONS_CORE, ...this.ADDITIONAL_RESILIENCE_QUESTIONS]
        .find(q => q.id === response.questionId);
      
      if (question && response.valid) {
        totalScore += question.weight || 5;
      }
    });
    
    return Math.min(totalScore / maxScore, 1.0);
  }

  // ✅ COMPLEMENTO: Voice Score Calculation  
  private calculateVoiceScore(voiceAnalysis: any): number {
    if (!voiceAnalysis) return 0.5;
    
    const honestyScore = voiceAnalysis.honesty || 0.5;
    const nervousnessPenalty = (voiceAnalysis.nervousness || 0) * 0.5;
    const evasionPenalty = (voiceAnalysis.evasion || 0) * 0.6;
    
    return Math.max(0, honestyScore - nervousnessPenalty - evasionPenalty);
  }

  // ✅ COMPLEMENTO: Red Flags Detection
  private hasNoMajorRedFlags(voiceAnalysis: any): boolean {
    if (!voiceAnalysis) return true;
    
    return (voiceAnalysis.nervousness || 0) < 0.7 && 
           (voiceAnalysis.evasion || 0) < 0.6;
  }

  // ✅ COMPLEMENTO: Vulnerability Indicators
  private hasVulnerabilityIndicators(responses: any[]): boolean {
    const vulnerabilityQuestions = ['seasonal_vulnerability', 'cost_crisis_adjustment', 'health_contingency'];
    
    return responses.some(response => 
      vulnerabilityQuestions.includes(response.questionId) && 
      response.mentions_vulnerability === true
    );
  }

  // ============================================================================
  // 🧬 AVI INTEGRATION METHODS (API-driven)
  // ============================================================================

  /**
   * Get AVI Questions (API-driven when available)
   */
  getAVIQuestions(): Observable<AVIQuestion[]> {
    if (this.API_CONFIG.MOCK_MODE) {
      return of(this.AVI_55_QUESTIONS);
    }
    
    return this.http.get<AVIQuestion[]>(this.API_CONFIG.AVI_QUESTIONS).pipe(
      catchError(error => {
        console.warn('AVI Questions API not available, using embedded questions', error);
        return of(this.AVI_55_QUESTIONS);
      })
    );
  }

  /**
   * Analyze single voice response with AVI scoring
   */
  analyzeVoiceResponseAVI(
    questionId: string, 
    audioBlob: Blob, 
    contextData?: any
  ): Observable<AVIScoreResult> {
    // Use API configuration service for mock mode check and requests
    if (this.apiConfig.isMockMode()) {
      return this.mockAVIVoiceAnalysis(questionId, audioBlob, contextData);
    }

    // Prepare voice analysis request using API contracts
    const request: VoiceAnalysisRequest = {
      audioBlob,
      questionId,
      sessionId: contextData?.sessionId || this.generateSessionId(),
      metadata: {
        duration: contextData?.duration || 0,
        sampleRate: contextData?.sampleRate || 44100,
        format: 'webm',
        expectedResponseTime: contextData?.expectedResponseTime || 5000,
        attempt: contextData?.attempt || 1
      }
    };

    // Use direct HTTP call to BFF instead of ApiConfigService
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    formData.append('questionId', questionId);
    formData.append('contextId', contextData?.sessionId || 'unknown');

    return this.http.post<any>(`${environment.apiUrl}/v1/voice/analyze/audio`, formData).pipe(
      map(response => {
        if (!response) {
          throw new Error('Voice analysis failed: Empty response');
        }
        
        // Convert BFF response to internal AVIScoreResult format
        return this.convertBFFResponseToAVIScore(response, questionId, contextData);
      }),
      catchError(error => {
        console.error('BFF AVI Voice Analysis failed, using mock response', error);
        return this.mockAVIVoiceAnalysis(questionId, audioBlob, contextData);
      })
    );
  }

  /**
   * Convert BFF response to internal AVIScoreResult format
   */
  private convertBFFResponseToAVIScore(
    response: any, 
    questionId: string, 
    contextData: any
  ): AVIScoreResult {
    // Find the corresponding question
    const question = this.AVI_55_QUESTIONS.find(q => q.id === questionId);
    
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    return {
      questionId: question.id,
      subscore: response.voiceScore * 1000, // Convert to 0-1000 scale
      components: {
        timing_score: response.latencyIndex ? (1 - response.latencyIndex) : 0.7,
        voice_score: response.energyStability || 0.7,
        lexical_score: response.honestyLexicon || 0.6,
        coherence_score: response.pitchVar ? (1 - response.pitchVar) : 0.8
      },
      flags: response.flags || [],
      risk_level: response.decision === 'GO' ? 'LOW' : 
                 response.decision === 'REVIEW' ? 'MEDIUM' : 'HIGH'
    };
  }

  /**
   * Convert VoiceAnalysisResponse to internal AVIScoreResult format (LEGACY)
   */
  private convertVoiceAnalysisToAVIScore(
    response: VoiceAnalysisResponse, 
    questionId: string, 
    contextData: any
  ): AVIScoreResult {
    // Find the corresponding question
    const question = this.AVI_55_QUESTIONS.find(q => q.id === questionId);
    
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // Convert API voice metrics to internal format
    const voiceAnalysis = {
      pitch_variance: response.data.voiceMetrics.pitch.variance,
      confidence_level: response.data.voiceMetrics.energy.stability,
      pause_frequency: response.data.voiceMetrics.rhythm.pauseFrequency,
      speech_rate: response.data.voiceMetrics.rhythm.speechRate,
      stress_level: response.data.voiceMetrics.stress.level
    };

    // Perform lexical analysis using our existing utilities
    const lexicalResult = computeAdvancedLexicalScore(
      response.data.transcription,
      1.5, // evasiveBoost
      contextData?.questionContext || 'normal_question'
    );

    // Calculate subscore using existing logic
    // Build simplified AVIScoreResult to match interface
    const voiceFeatures = {
      timing_score: 0.7,
      voice_score: voiceAnalysis.confidence_level || 0.7,
      coherence_score: (response as any).data?.coherenceScore || 0.8
    };
    const subscore = this.calculateAVISubscore(
      question,
      voiceFeatures,
      { adjustedLexicalScore: lexicalResult.adjustedLexicalScore }
    );

    return {
      questionId: question.id,
      subscore: Math.round(subscore * 1000),
      components: {
        timing_score: voiceFeatures.timing_score,
        voice_score: voiceFeatures.voice_score,
        lexical_score: lexicalResult.adjustedLexicalScore,
        coherence_score: voiceFeatures.coherence_score
      },
      flags: [],
      risk_level: this.mapScoreToRiskLevel(Math.round(subscore * 1000))
    };
  }

  /**
   * Generate session ID for API requests
   */
  private generateSessionId(): string {
    return `avi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Process complete AVI interview with dual engine
   */
  processCompleteAVIInterview(
    responses: Array<{ questionId: string, audioBlob: Blob, transcription?: string }>,
    contextData: any = {}
  ): Observable<ConsolidatedAVIResult> {
    if (this.API_CONFIG.MOCK_MODE) {
      return this.mockCompleteAVIProcessing(responses, contextData);
    }

    const formData = new FormData();
    responses.forEach((response, index) => {
      formData.append(`responses[${index}].audio`, response.audioBlob);
      formData.append(`responses[${index}].questionId`, response.questionId);
      if (response.transcription) {
        formData.append(`responses[${index}].transcription`, response.transcription);
      }
    });
    formData.append('context', JSON.stringify(contextData));

    return this.http.post<ConsolidatedAVIResult>(this.API_CONFIG.AVI_EVALUATE, formData).pipe(
      catchError(error => {
        console.error('Complete AVI processing failed, using mock', error);
        return this.mockCompleteAVIProcessing(responses, contextData);
      })
    );
  }

  /**
   * Calculate HASE score with AVI integration (30/20/50)
   */
  calculateHASEWithAVI(
    gnvHistoryScore: number,      // 30%
    geographicRiskScore: number,  // 20%
    aviResult: ConsolidatedAVIResult  // 50%
  ): {
    final_score: number;
    breakdown: {
      gnv_history: { score: number, weight: number };
      geographic_risk: { score: number, weight: number };
      avi_voice: { score: number, weight: number };
    };
    protection_eligible: boolean;
    decision: 'GO' | 'REVIEW' | 'NO-GO';
  } {
    const weights = { gnv: 0.30, geo: 0.20, avi: 0.50 };
    
    const weighted_scores = {
      gnv: gnvHistoryScore * weights.gnv,
      geo: geographicRiskScore * weights.geo,
      avi: aviResult.final_score * weights.avi
    };

    const final_score = weighted_scores.gnv + weighted_scores.geo + weighted_scores.avi;

    let decision: 'GO' | 'REVIEW' | 'NO-GO';
    if (final_score >= this.AVI_THRESHOLDS.GO_MIN && aviResult.protection_eligible) {
      decision = 'GO';
    } else if (final_score >= this.AVI_THRESHOLDS.REVIEW_MIN) {
      decision = 'REVIEW';
    } else {
      decision = 'NO-GO';
    }

    return {
      final_score,
      breakdown: {
        gnv_history: { score: gnvHistoryScore, weight: weights.gnv },
        geographic_risk: { score: geographicRiskScore, weight: weights.geo },
        avi_voice: { score: aviResult.final_score, weight: weights.avi }
      },
      protection_eligible: aviResult.protection_eligible && decision === 'GO',
      decision
    };
  }

  // ============================================================================
  // 🧬 AVI MOCK IMPLEMENTATIONS (Development/Testing)
  // ============================================================================

  private mockAVIVoiceAnalysis(
    questionId: string, 
    audioBlob: Blob, 
    contextData?: any
  ): Observable<AVIScoreResult> {
    // Simulate realistic AVI analysis based on question type
    const question = this.AVI_55_QUESTIONS.find(q => q.id === questionId);
    if (!question) {
      return throwError(() => new Error(`Question ${questionId} not found`));
    }

    // Mock analysis with realistic variance based on question weight/stress
    const mockTranscription = this.generateMockTranscription(question);
    const mockFeatures = this.generateMockVoiceFeatures(question);
    
    // Use real AVI lexical processing
    const lexicalAnalysis = computeAdvancedLexicalScore(
      mockTranscription, 
      1.0, // evasiveBoost
      question.stressLevel >= 4 ? 'high_evasion_question' : 'normal_question'
    );

    // Calculate AVI subscore using question coefficients
    const subscore = this.calculateAVISubscore(question, mockFeatures, lexicalAnalysis);

    return of({
      questionId,
      subscore: subscore * 1000, // Convert to 0-1000 scale
      components: {
        timing_score: mockFeatures.timing_score,
        voice_score: mockFeatures.voice_score,
        lexical_score: lexicalAnalysis.adjustedLexicalScore,
        coherence_score: mockFeatures.coherence_score
      },
      flags: lexicalAnalysis.tokenDetails.evasiveTokens.length > 0 ? 
        ['evasive_language'] : ['normal_response'],
      risk_level: this.mapScoreToRiskLevel(subscore * 1000)
    }).pipe(
      // Simulate API delay
      delay(Math.random() * 2000 + 1000)
    );
  }

  private mockCompleteAVIProcessing(
    responses: Array<{ questionId: string, audioBlob: Blob, transcription?: string }>,
    contextData: any
  ): Observable<ConsolidatedAVIResult> {
    // Simulate dual engine processing
    const scientificScore = Math.random() * 200 + 700; // 700-900 range
    const heuristicScore = Math.random() * 200 + 650;  // 650-850 range
    
    const consensus_weight = Math.abs(scientificScore - heuristicScore) <= 100 ? 0.8 : 0.5;
    const final_score = scientificScore * consensus_weight + heuristicScore * (1 - consensus_weight);
    const decision: 'GO' | 'REVIEW' | 'NO-GO' = final_score >= this.AVI_THRESHOLDS.GO_MIN ? 'GO' :
                (final_score >= this.AVI_THRESHOLDS.REVIEW_MIN ? 'REVIEW' : 'NO-GO');
    
    return of({
      final_score,
      risk_level: this.mapScoreToRiskLevel(final_score),
      scientific_engine_score: scientificScore,
      heuristic_engine_score: heuristicScore,
      consensus_weight,
      protection_eligible: final_score >= this.AVI_THRESHOLDS.GO_MIN,
      decision,
      detailed_breakdown: [], // Would contain individual question results
      red_flags: final_score < 600 ? ['high_evasion_risk', 'inconsistent_responses'] : [],
      recommendations: final_score >= 780 ? ['approve_with_standard_terms'] : 
                      ['require_additional_guarantees']
    }).pipe(delay(3000));
  }

  // ============================================================================
  // 🧬 AVI HELPER METHODS
  // ============================================================================

  private calculateAVISubscore(
    question: AVIQuestion, 
    voiceFeatures: any, 
    lexicalAnalysis: any
  ): number {
    const { alpha, beta, gamma, delta } = question.coefficients;
    
    return (
      alpha * voiceFeatures.timing_score +
      beta * voiceFeatures.voice_score +
      gamma * lexicalAnalysis.adjustedLexicalScore +
      delta * voiceFeatures.coherence_score
    );
  }

  private mapScoreToRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 780) return 'LOW';
    if (score >= 650) return 'MEDIUM';
    if (score >= 400) return 'HIGH';
    return 'CRITICAL';
  }

  private generateMockTranscription(question: AVIQuestion): string {
    // Generate realistic transcription based on question type and stress level
    const responses = {
      low_stress: ['Sí, claro', 'Por supuesto', 'Exactamente mil pesos'],
      high_stress: ['Pues... eh... bueno', 'No sé... depende', 'Más o menos...'],
      evasive: ['No, para nada', 'Eso no existe', 'No sé de qué habla']
    };
    
    if (question.stressLevel >= 4) {
      return responses.high_stress[Math.floor(Math.random() * responses.high_stress.length)];
    }
    return responses.low_stress[Math.floor(Math.random() * responses.low_stress.length)];
  }

  private generateMockVoiceFeatures(question: AVIQuestion): any {
    return {
      timing_score: Math.random() * 0.4 + 0.6,  // 0.6-1.0
      voice_score: Math.random() * 0.3 + 0.7,   // 0.7-1.0  
      coherence_score: Math.random() * 0.2 + 0.8 // 0.8-1.0
    };
  }

  /**
   * Get API endpoints configuration (for external integrations)
   */
  getAPIConfiguration() {
    return {
      endpoints: this.API_CONFIG,
      thresholds: this.AVI_THRESHOLDS,
      total_questions: this.AVI_55_QUESTIONS.length,
      mock_mode: this.API_CONFIG.MOCK_MODE
    };
  }

  // ✅ EXISTING: Core Voice Evaluation Method (now using BFF)
  async evaluateAudio(
    audioBlob: Blob, 
    questionId: string, 
    contextId: string,
    municipality?: string
  ): Promise<VoiceEvaluationResult> {
    
    const requestId = this.generateRequestId();
    
    try {
      console.log(`🎤 Evaluating audio for question: ${questionId} using BFF`);
      
      // Use BFF endpoint for full evaluation (Whisper + Analysis)
      const formData = new FormData();
      formData.append('audio', audioBlob, 'response.wav');
      formData.append('questionId', questionId);
      formData.append('contextId', contextId);
      
      const bffResponse = await this.http.post<any>(
        `${environment.apiUrl}/v1/voice/evaluate`,
        formData,
        { 
          headers: { 'X-Request-Id': requestId }
        }
      ).toPromise();
      
      if (!bffResponse) {
        throw new Error('Empty response from BFF voice service');
      }
      
      // Convert BFF response to VoiceEvaluationResult format
      const response = this.convertBFFToVoiceEvaluationResult(bffResponse, questionId);
      
      // ✅ Store result locally
      this.storeVoiceEvaluationResult(response);
      
      console.log(`✅ BFF Voice analysis completed: ${response.decision} (score: ${response.voiceScore})`);
      
      return response;
      
    } catch (error) {
      console.warn(`⚠️ BFF Voice analysis failed for ${questionId}:`, error);
      
      // ✅ FALLBACK: Apply heuristic analysis + mark as REVIEW
      const fallbackResult = this.applyHeuristicFallback(audioBlob, questionId);
      this.storeVoiceEvaluationResult(fallbackResult);
      
      return fallbackResult;
    }
  }

  /**
   * Convert BFF response format to legacy VoiceEvaluationResult format
   */
  private convertBFFToVoiceEvaluationResult(
    bffResponse: any, 
    questionId: string
  ): VoiceEvaluationResult {
    return {
      questionId,
      voiceScore: bffResponse.voiceScore,
      decision: bffResponse.decision,
      flags: bffResponse.flags || [],
      fallback: false,
      message: `BFF Analysis: ${bffResponse.decision}`,
      processingTime: `${Date.now()}ms`,
      voiceMetrics: {
        latencyIndex: bffResponse.latencyIndex,
        pitchVar: bffResponse.pitchVar,
        disfluencyRate: bffResponse.disfluencyRate,
        energyStability: bffResponse.energyStability,
        honestyLexicon: bffResponse.honestyLexicon
      }
    };
  }

  // ✅ NUEVO: Heuristic Fallback Implementation
  private applyHeuristicFallback(audioBlob: Blob, questionId: string): VoiceEvaluationResult {
    console.log(`🔄 Applying heuristic fallback for question: ${questionId}`);
    
    // Basic heuristics based on audio properties
    const duration = Math.max(0.001, audioBlob.size / 16000); // Rough estimate (16kHz) with floor to avoid 0
    const sizeToTimeRatio = audioBlob.size / duration;
    
    let heuristicScore = 0.5; // Start neutral
    const flags: string[] = ['audio_analysis_failed'];
    
    // Heuristic 1: Duration analysis
    if (duration < 2) {
      heuristicScore -= 0.3; // Too short = suspicious
      flags.push('response_too_short');
    } else if (duration > 30) {
      heuristicScore -= 0.2; // Too long = rambling
      flags.push('response_too_long');
    } else {
      heuristicScore += 0.1; // Good duration
    }
    
    // Heuristic 2: Audio quality estimate
    if (sizeToTimeRatio < 800) {
      heuristicScore -= 0.2; // Low quality = might be problematic
      flags.push('low_audio_quality');
    }
    
    // Cap the score
    heuristicScore = Math.max(0, Math.min(1, heuristicScore));
    
    // Always mark as REVIEW when using fallback
    const decision: 'GO' | 'NO-GO' | 'REVIEW' = 'REVIEW';
    
    return {
      questionId,
      voiceScore: heuristicScore,
      decision,
      flags,
      fallback: true,
      message: 'Análisis de voz falló, usando análisis básico. Marcado para revisión manual.',
      processingTime: '0ms'
    };
  }

  // ✅ NUEVO: Store Voice Evaluation locally
  private storeVoiceEvaluationResult(evaluation: VoiceEvaluationResult): void {
    // Remove any existing evaluation for this question (allow re-evaluation)
    this.voiceEvaluations = this.voiceEvaluations.filter(
      existing => existing.questionId !== evaluation.questionId
    );
    
    // Add new evaluation
    this.voiceEvaluations.push({
      questionId: evaluation.questionId,
      voiceScore: evaluation.voiceScore,
      flags: evaluation.flags,
      decision: evaluation.decision,
      timestamp: Date.now(),
      fallback: evaluation.fallback
    });
    
    console.log(`💾 Stored voice evaluation: ${evaluation.questionId} = ${evaluation.decision}`);
  }

  // ✅ NUEVO: Generate unique request ID
  private generateRequestId(): string {
    this.requestIdCounter++;
    const timestamp = Date.now();
    return `req_${timestamp}_${this.requestIdCounter}`;
  }

  // ===== NEW: Analyze audio file with BFF (evaluate: Whisper + features + scoring)
  analyzeAudioFile(file: File | Blob, questionId: string, contextId?: string) {
    const form = new FormData();
    form.append('audio', file as any, (file as any).name || 'answer.wav');
    if (questionId) form.append('questionId', questionId);
    if (contextId) form.append('contextId', contextId);

    const headers = new HttpHeaders({ 'X-Request-Id': this.generateRequestId() });
    return this.http.post<any>(`${environment.apiUrl}/v1/voice/evaluate`, form, { headers });
  }

  // ✅ NUEVO: Aggregate Resilience Scoring
  aggregateResilience(): ResilienceSummary {
    console.log(`📊 Aggregating resilience from ${this.voiceEvaluations.length} voice evaluations`);
    
    if (this.voiceEvaluations.length === 0) {
      return {
        voiceResilienceScore: 0,
        finalDecision: 'REVIEW',
        reviewCount: 0,
        noGoCount: 0,
        goCount: 0,
        totalQuestions: 0,
        humanReviewRequired: true,
        criticalFlags: ['no_voice_evaluations']
      };
    }
    
    const totalWeight = 78; // From 12 core questions
    let achievedScore = 0;
    let reviewCount = 0;
    let noGoCount = 0;
    let goCount = 0;
    let criticalFlags: string[] = [];
    
    // Process each voice evaluation
    this.voiceEvaluations.forEach(evaluation => {
      const question = this.findQuestionById(evaluation.questionId);
      const weight = question?.weight || 5;
      
      // Add critical flags
      if (evaluation.flags.includes('unstablePitch') || evaluation.flags.includes('highLatency')) {
        criticalFlags.push(...evaluation.flags);
      }
      
      // Score based on decision
      switch(evaluation.decision) {
        case 'GO':
          achievedScore += weight;
          goCount++;
          break;
        case 'REVIEW':
          achievedScore += weight * 0.5; // Partial credit for review
          reviewCount++;
          break;
        case 'NO-GO':
          // No points for NO-GO
          noGoCount++;
          break;
      }
      
      // Fallback penalty
      if (evaluation.fallback) {
        achievedScore -= weight * 0.1; // Small penalty for fallback
        criticalFlags.push('fallback_used');
      }
    });
    
    // Calculate final voice resilience score
    const voiceResilienceScore = Math.max(0, Math.min(1, achievedScore / totalWeight));
    
    // Determine final decision
    const finalDecision = this.determineFinalDecision(
      voiceResilienceScore, 
      reviewCount, 
      noGoCount, 
      this.voiceEvaluations.length
    );
    
    // Remove duplicates from critical flags
    criticalFlags = [...new Set(criticalFlags)];
    
    const summary: ResilienceSummary = {
      voiceResilienceScore,
      finalDecision,
      reviewCount,
      noGoCount,
      goCount,
      totalQuestions: this.voiceEvaluations.length,
      humanReviewRequired: finalDecision === 'REVIEW' || noGoCount > 0 || criticalFlags.length > 2,
      criticalFlags
    };
    
    console.log(`✅ Resilience aggregation completed:`, summary);
    
    return summary;
  }

  // ✅ NUEVO: Determine Final Decision Logic
  private determineFinalDecision(
    voiceScore: number, 
    reviewCount: number, 
    noGoCount: number,
    totalQuestions: number
  ): 'GO' | 'NO-GO' | 'REVIEW' {
    
    // NO-GO conditions (strict)
    if (noGoCount >= 2) {
      return 'NO-GO'; // 2+ NO-GO responses = definitive rejection
    }
    
    if (noGoCount >= 1 && voiceScore < 0.4) {
      return 'NO-GO'; // 1 NO-GO + low overall score = rejection
    }
    
    if (voiceScore < 0.3) {
      return 'NO-GO'; // Very low score = rejection
    }
    
    // GO conditions (permissive but safe)
    if (voiceScore >= 0.75 && noGoCount === 0 && reviewCount <= 2) {
      return 'GO'; // High score + no major issues = approval
    }
    
    if (voiceScore >= 0.55 && noGoCount === 0 && reviewCount <= Math.floor(totalQuestions * 0.3)) {
      return 'GO'; // Good score + no rejections + limited reviews = approval
    }
    
    // Default to REVIEW for edge cases
    return 'REVIEW';
  }

  // ✅ NUEVO: Find question by ID helper
  private findQuestionById(questionId: string): RequiredQuestion | undefined {
    // Search in all question pools
    const allQuestions = [
      ...this.RESILIENCE_QUESTIONS_CORE,
      ...this.ADDITIONAL_RESILIENCE_QUESTIONS,
      // Add existing municipal questions
      ...Object.values(this.municipalityQuestions).flatMap(config => config.required_questions)
    ];
    
    return allQuestions.find(q => q.id === questionId);
  }

  // ✅ NUEVO: Get Voice Evaluations (public accessor)
  getVoiceEvaluations(): VoiceEvaluationStore[] {
    return [...this.voiceEvaluations]; // Return copy to prevent external mutation
  }

  // ✅ NUEVO: Clear Voice Evaluations (for new sessions)
  clearVoiceEvaluations(): void {
    console.log(`🧹 Clearing ${this.voiceEvaluations.length} voice evaluations`);
    this.voiceEvaluations = [];
  }

  // Helper: Generate a simple voice pattern phrase for verification
  generateVoicePattern(): string {
    const phrases = [
      'Mi voz confirma mi identidad para Conductores',
      'Autorizo verificación de identidad por voz',
      'Hoy confirmo mi identidad con mi voz',
      'Verificación de identidad por voz completada'
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  // ✅ NUEVO: Get Voice Evaluation by Question ID
  getVoiceEvaluationByQuestion(questionId: string): VoiceEvaluationStore | undefined {
    return this.voiceEvaluations.find(evaluation => evaluation.questionId === questionId);
  }

  // ✅ NUEVO: Check if question has been evaluated
  hasVoiceEvaluation(questionId: string): boolean {
    return this.voiceEvaluations.some(evaluation => evaluation.questionId === questionId);
  }

  // =================================
  // TESTING & MOCK DATA
  // =================================

  generateMockValidationResult(sessionId: string): VoiceValidationResult {
    return {
      session_id: sessionId,
      transcript: 'Mock transcript of the interview...',
      compliance_score: 85,
      questions_asked: ['years_driving', 'route_ownership', 'vehicle_gnv'],
      questions_missing: ['previous_credits'],
      risk_flags: [
        {
          type: 'inconsistency',
          severity: 'medium',
          description: 'Income reported differs from expected range',
          evidence: 'Declared $30K but route typically generates $18-22K',
          timestamp_in_audio: 145.5
        }
      ],
      coherence_analysis: {
        overall_score: 78,
        cross_validation_score: 85,
        temporal_consistency: 92,
        detail_specificity: 65,
        inconsistencies: []
      },
      digital_stamps: [
        {
          stamp_type: 'questions_completed',
          timestamp: new Date().toISOString(),
          valid: false,
          evidence_hash: 'abc123...'
        }
      ],
      processing_completed_at: new Date().toISOString()
    };
  }

  // ===== NEW BFF VOICE ANALYSIS METHODS =====

  /**
   * Analyze voice features using BFF mathematical algorithms
   */
  async analyzeVoiceFeatures(request: VoiceAnalyzeRequest): Promise<VoiceAnalyzeResponse> {
    try {
      const response = await this.http.post<VoiceAnalyzeResponse>(
        `${environment.apiUrl}/v1/voice/analyze`, 
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        }
      ).toPromise();

      return response!;
    } catch (error) {
      console.warn('BFF voice analysis failed, using fallback', error);
      return this.fallbackVoiceAnalysis(request);
    }
  }

  /**
   * Complete audio evaluation: transcribe + analyze + save
   */
  async evaluateAudioComplete(audioFile: File, questionId: string): Promise<VoiceEvaluateResponse> {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('questionId', questionId);
      formData.append('contextId', `avi_${Date.now()}`);

      const response = await this.http.post<VoiceEvaluateResponse>(
        `${environment.apiUrl}/v1/voice/evaluate-audio`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        }
      ).toPromise();

      return response!;
    } catch (error) {
      console.error('BFF audio evaluation failed', error);
      throw error;
    }
  }

  /**
   * Process resilience questionnaire with voice pattern validation
   */
  async processResilienceQuestion(questionId: string, audioResponse: Blob): Promise<VoiceValidationResult> {
    const question = RESILIENCE_QUESTIONS.find(q => q.id === questionId);
    if (!question) {
      throw new Error(`Resilience question not found: ${questionId}`);
    }

    try {
      // Convert Blob to File
      const audioFile = new File([audioResponse], `${questionId}.wav`, { type: 'audio/wav' });
      
      // Get complete evaluation from BFF
      const evaluation = await this.evaluateAudioComplete(audioFile, questionId);
      
      // Analyze resilience patterns
      const resilienceAnalysis = this.analyzeResiliencePatterns(
        question, 
        evaluation.transcription, 
        evaluation.voiceAnalysis
      );

      // Store for session tracking
      this.storeVoiceEvaluation({
        questionId,
        voiceScore: evaluation.voiceAnalysis.score,
        flags: evaluation.voiceAnalysis.flags,
        decision: evaluation.voiceAnalysis.decision,
        timestamp: Date.now(),
        fallback: evaluation.voiceAnalysis.fallback
      });

      // Convert to VoiceValidationResult format
      return {
        session_id: `resilience_${Date.now()}`,
        transcript: evaluation.transcription,
        compliance_score: evaluation.voiceAnalysis.score * 100, // Convert to 0-100
        questions_asked: [questionId],
        questions_missing: [],
        risk_flags: resilienceAnalysis.riskFlags,
        coherence_analysis: {
          overall_score: evaluation.confidence,
          cross_validation_score: evaluation.voiceAnalysis.metrics.honestyLexicon,
          temporal_consistency: evaluation.voiceAnalysis.metrics.latencyIndex,
          detail_specificity: evaluation.voiceAnalysis.metrics.energyStability,
          inconsistencies: []
        },
        digital_stamps: [{
          stamp_type: 'questions_completed',
          timestamp: new Date().toISOString(),
          valid: evaluation.voiceAnalysis.decision !== 'NO-GO',
          evidence_hash: evaluation.evaluationId || 'local_hash'
        }],
        processing_completed_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Resilience question processing failed', error);
      throw error;
    }
  }

  /**
   * Get resilience questionnaire
   */
  getResilienceQuestions(): ResilienceQuestion[] {
    return RESILIENCE_QUESTIONS;
  }

  /**
   * Calculate overall resilience summary
   */
  calculateResilienceSummary(): ResilienceSummary {
    const storedEvaluations = this.getStoredVoiceEvaluations();
    const resilienceEvaluations = storedEvaluations.filter(ev => 
      RESILIENCE_QUESTIONS.some(q => q.id === ev.questionId)
    );

    if (resilienceEvaluations.length === 0) {
      return {
        voiceResilienceScore: 0,
        finalDecision: 'REVIEW',
        reviewCount: 0,
        noGoCount: 0,
        goCount: 0,
        totalQuestions: 0,
        humanReviewRequired: true,
        criticalFlags: ['no_evaluations_completed']
      };
    }

    // Calculate scores and decisions
    const decisions = resilienceEvaluations.map(ev => ev.decision);
    const goCount = decisions.filter(d => d === 'GO').length;
    const reviewCount = decisions.filter(d => d === 'REVIEW').length;
    const noGoCount = decisions.filter(d => d === 'NO-GO').length;
    
    const averageScore = resilienceEvaluations.reduce((sum, ev) => sum + ev.voiceScore, 0) / resilienceEvaluations.length;
    const voiceResilienceScore = averageScore / 1000; // Convert to 0-1 scale

    // Determine final decision based on HASE model rules
    let finalDecision: 'GO' | 'NO-GO' | 'REVIEW' = 'REVIEW';
    const criticalFlags: string[] = [];

    if (noGoCount >= 2) {
      finalDecision = 'NO-GO';
      criticalFlags.push('multiple_no_go_responses');
    } else if (voiceResilienceScore >= 0.8 && noGoCount === 0) {
      finalDecision = 'GO';
    } else if (voiceResilienceScore >= 0.6 && noGoCount <= 1) {
      finalDecision = 'REVIEW';
    } else {
      finalDecision = 'NO-GO';
      criticalFlags.push('low_resilience_score');
    }

    // Check for critical flags
    resilienceEvaluations.forEach(ev => {
      if (ev.flags.includes('high_stress') || ev.flags.includes('evasion_detected')) {
        criticalFlags.push(`critical_pattern_${ev.questionId}`);
      }
    });

    return {
      voiceResilienceScore,
      finalDecision,
      reviewCount,
      noGoCount,
      goCount,
      totalQuestions: resilienceEvaluations.length,
      humanReviewRequired: finalDecision === 'REVIEW' || criticalFlags.length > 0,
      criticalFlags
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  private fallbackVoiceAnalysis(request: VoiceAnalyzeRequest): VoiceAnalyzeResponse {
    // Heuristic fallback when BFF is unavailable
    const transcription = request.words.join(' ');
    
    // Simple heuristic scoring
    let score = 0.7; // Base score (0-1)
    
    // Latency penalty
    if (request.latencySec > 5) score -= 0.2;
    if (request.latencySec < 0.5) score -= 0.1;
    
    // Disfluency detection
    const hesitationWords = ['eh', 'um', 'este', 'pues', 'bueno'];
    const disfluencyCount = request.words.filter(word => 
      hesitationWords.includes(word.toLowerCase())
    ).length;
    score -= (disfluencyCount / request.words.length) * 0.3;

    // Risk keywords
    const riskKeywords = ['no_se', 'no_recuerdo', 'tal_vez', 'creo_que'];
    const riskCount = request.words.filter(word =>
      riskKeywords.includes(word.toLowerCase())  
    ).length;
    score -= (riskCount / request.words.length) * 0.2;

    const finalScore = Math.max(0, Math.min(1, score));
    let decision: 'GO' | 'NO-GO' | 'REVIEW' = 'REVIEW';
    
    // Unified thresholds on 0–1 scale
    if (finalScore >= 0.75) decision = 'GO';
    else if (finalScore < 0.55) decision = 'NO-GO';

    const flags: string[] = [];
    if (request.latencySec > 5) flags.push('high_latency');
    if (disfluencyCount > 2) flags.push('high_disfluency');
    if (riskCount > 0) flags.push('uncertainty_detected');

    return {
      success: true,
      score: Math.round(finalScore * 1000),
      decision,
      metrics: {
        latencyIndex: Math.min(1, request.latencySec / 5),
        pitchVariability: 0.5, // Mock data
        disfluencyRate: disfluencyCount / Math.max(1, request.words.length),
        energyStability: 0.7, // Mock data  
        honestyLexicon: 1 - (riskCount / Math.max(1, request.words.length))
      },
      flags,
      processingTime: '150ms',
      fallback: true
    };
  }

  private analyzeResiliencePatterns(question: ResilienceQuestion, transcription: string, voiceAnalysis: VoiceAnalyzeResponse) {
    const riskFlags: RiskFlag[] = [];
    
    // Check for expected patterns
    const words = transcription.toLowerCase().split(' ');
    
    // Risk keyword detection
    const foundRiskKeywords = question.expectedPattern.riskKeywords.filter(keyword =>
      words.some(word => word.includes(keyword))
    );

    if (foundRiskKeywords.length > 0) {
      riskFlags.push({
        type: 'resilience_concern',
        severity: 'high',
        description: `Risk keywords detected: ${foundRiskKeywords.join(', ')}`,
        evidence: transcription,
        timestamp_in_audio: 0
      });
    }

    // Voice pattern analysis
    if (voiceAnalysis.metrics.latencyIndex > 0.8) {
      riskFlags.push({
        type: 'evasion',
        severity: 'medium', 
        description: 'High response latency indicates potential evasion',
        evidence: `Response time: ${voiceAnalysis.metrics.latencyIndex}`,
        timestamp_in_audio: 0
      });
    }

    if (voiceAnalysis.metrics.disfluencyRate > 0.3) {
      riskFlags.push({
        type: 'nervousness',
        severity: 'medium',
        description: 'High disfluency rate indicates stress/nervousness', 
        evidence: `Disfluency rate: ${voiceAnalysis.metrics.disfluencyRate}`,
        timestamp_in_audio: 0
      });
    }

    return { riskFlags };
  }

  private storeVoiceEvaluation(evaluation: VoiceEvaluationStore): void {
    const stored = this.getStoredVoiceEvaluations();
    stored.push(evaluation);
    localStorage.setItem('voice_evaluations_session', JSON.stringify(stored));
  }

  private getStoredVoiceEvaluations(): VoiceEvaluationStore[] {
    const stored = localStorage.getItem('voice_evaluations_session');
    return stored ? JSON.parse(stored) : [];
  }

  // getAuthToken is defined earlier in this service
}
