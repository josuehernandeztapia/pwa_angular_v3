import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

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

interface VoiceValidationResult {
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

// ✅ NUEVO: Voice Evaluation Types
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

  constructor(private http: HttpClient) {
    this.checkBrowserSupport();
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

  // ✅ COMPLEMENTO: Tu Cuestionario de Resiliencia (12 preguntas)
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
    const goNoGoEligible = totalScore >= 0.55 && 
                          voiceScore >= 0.6 && 
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

  // ✅ NUEVO: Core Voice Evaluation Method
  async evaluateAudio(
    audioBlob: Blob, 
    questionId: string, 
    contextId: string,
    municipality?: string
  ): Promise<VoiceEvaluationResult> {
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'response.wav');
    formData.append('questionId', questionId);
    formData.append('contextId', contextId);
    
    if (municipality) {
      formData.append('municipality', municipality);
    }
    
    const requestId = this.generateRequestId();
    
    try {
      console.log(`🎤 Evaluating audio for question: ${questionId}`);
      
      const response = await this.http.post<VoiceEvaluationResult>(
        `${this.baseUrl}/v1/voice/evaluate-audio`,
        formData,
        { 
          headers: { 'X-Request-Id': requestId }
          // Note: timeout not supported in Angular HttpClient
        }
      ).toPromise();
      
      if (!response) {
        throw new Error('Empty response from voice analysis service');
      }
      
      // ✅ Store result locally
      this.storeVoiceEvaluation(response);
      
      console.log(`✅ Voice analysis completed: ${response.decision} (score: ${response.voiceScore})`);
      
      return response;
      
    } catch (error) {
      console.warn(`⚠️ Voice analysis failed for ${questionId}:`, error);
      
      // ✅ FALLBACK: Apply heuristic analysis + mark as REVIEW
      const fallbackResult = this.applyHeuristicFallback(audioBlob, questionId);
      this.storeVoiceEvaluation(fallbackResult);
      
      return fallbackResult;
    }
  }

  // ✅ NUEVO: Heuristic Fallback Implementation
  private applyHeuristicFallback(audioBlob: Blob, questionId: string): VoiceEvaluationResult {
    console.log(`🔄 Applying heuristic fallback for question: ${questionId}`);
    
    // Basic heuristics based on audio properties
    const duration = audioBlob.size / 16000; // Rough estimate (16kHz)
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
    if (sizeToTimeRatio < 1000) {
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
  private storeVoiceEvaluation(evaluation: VoiceEvaluationResult): void {
    // Remove any existing evaluation for this question (allow re-evaluation)
    this.voiceEvaluations = this.voiceEvaluations.filter(
      evaluation => evaluation.questionId !== evaluation.questionId
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
    
    if (voiceScore >= 0.6 && noGoCount === 0 && reviewCount <= Math.floor(totalQuestions * 0.3)) {
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
}