import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

enum InterviewStatus {
  NOT_REQUIRED = 'not_required',
  REQUIRED_PENDING = 'required_pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED_VALID = 'completed_valid',
  COMPLETED_INVALID = 'completed_invalid',
  EXPIRED = 'expired'
}

interface InterviewRequirement {
  required: boolean;
  trigger: 'first_document' | 'amount_threshold' | 'risk_score_high' | 'product_mandatory';
  reason: string;
  questions_template: string;
  min_duration_seconds?: number;
  max_attempts?: number;
  validity_hours?: number;
}

interface InterviewCheckpoint {
  client_id: string;
  product_type: string;
  municipality: string;
  status: InterviewStatus;
  requirement: InterviewRequirement;
  completed_at?: string;
  expires_at?: string;
  attempts: number;
  last_validation_result?: any;
  blocking_reason?: string;
}

interface DocumentUploadAttempt {
  client_id: string;
  document_type: string;
  attempted_at: string;
  blocked: boolean;
  block_reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InterviewCheckpointService {
  private checkpoints$ = new BehaviorSubject<{ [clientId: string]: InterviewCheckpoint }>({});
  private documentAttempts$ = new BehaviorSubject<DocumentUploadAttempt[]>([]);

  // Business Rules Matrix
  private readonly INTERVIEW_REQUIREMENTS: { [key: string]: { [key: string]: InterviewRequirement } } = {
    'aguascalientes': {
      'individual': {
        required: true,
        trigger: 'first_document',
        reason: 'Validación de identidad obligatoria para productos individuales en Aguascalientes',
        questions_template: 'ags_individual_full',
        min_duration_seconds: 300, // 5 minutos mínimo
        max_attempts: 3,
        validity_hours: 24
      },
      'contado': {
        required: true,
        trigger: 'first_document', 
        reason: 'Confirmación de identidad para venta de contado',
        questions_template: 'contado_basico',
        min_duration_seconds: 30, // 30 segundos mínimo
        max_attempts: 2,
        validity_hours: 48
      },
      'credito_simple': {
        required: false,
        trigger: 'amount_threshold',
        reason: 'No requiere entrevista para montos menores',
        questions_template: 'none'
      }
    },
    'estado_de_mexico': {
      'colectivo': {
        required: true,
        trigger: 'product_mandatory',
        reason: 'Aval solidario requiere entrevista grupal obligatoria',
        questions_template: 'edomex_colectivo_grupal',
        min_duration_seconds: 180, // 3 minutos mínimo
        max_attempts: 2,
        validity_hours: 12 // Más estricto para colectivos
      },
      'individual': {
        required: true,
        trigger: 'amount_threshold',
        reason: 'Montos altos requieren validación en Estado de México',
        questions_template: 'edomex_individual_standard',
        min_duration_seconds: 240,
        max_attempts: 3,
        validity_hours: 24
      }
    },
    'default': {
      'high_risk': {
        required: true,
        trigger: 'risk_score_high',
        reason: 'Perfil de riesgo requiere validación adicional por voz',
        questions_template: 'high_risk_validation',
        min_duration_seconds: 180,
        max_attempts: 2,
        validity_hours: 6 // Más restrictivo
      },
      'standard': {
        required: false,
        trigger: 'first_document',
        reason: 'Producto estándar sin requerimientos especiales',
        questions_template: 'none'
      }
    }
  };

  // Question Templates
  private readonly QUESTION_TEMPLATES: { [key: string]: string[] } = {
    'contado_basico': [
      'Por favor confirme su nombre completo tal como aparece en su identificación',
      'Confirme que el vehículo será para uso personal y no comercial',
      '¿Acepta los términos y condiciones de la venta de contado?'
    ],
    'ags_individual_full': [
      '¿Cuántos años tiene manejando ruta de transporte público?',
      '¿La ruta que maneja es propia, rentada o trabaja para un patrón?',
      '¿Su vehículo ya tiene instalación de GNV o necesitaría conversión?',
      '¿Tiene algún crédito activo con otra financiera de transporte?',
      '¿En qué horarios opera su ruta normalmente?',
      'Aproximadamente, ¿cuánto genera de ingresos al mes con la ruta?',
      '¿Puede proporcionar el nombre y teléfono de una referencia comercial?'
    ],
    'edomex_colectivo_grupal': [
      '¿Quién es el líder o coordinador de su grupo de transportistas?',
      '¿Cuántos transportistas forman parte de su grupo?',
// removed by clean-audit
      '¿Su grupo tiene todos los permisos vigentes para operar la ruta?',
      '¿Han trabajado juntos como grupo anteriormente en otros proyectos?'
    ],
    'edomex_individual_standard': [
      '¿Cuánto tiempo tiene operando en esta ruta específica?',
      '¿Cuál es el promedio de pasajeros que transporta diariamente?',
      '¿Tiene experiencia previa con financiamientos para transporte?',
      '¿Conoce y acepta las regulaciones municipales para su ruta?'
    ],
    'high_risk_validation': [
      'Confirme nuevamente su ocupación principal',
      '¿Ha tenido problemas de pago con créditos anteriores?',
      '¿Puede explicar cualquier inconsistencia en su información financiera?',
      '¿Está dispuesto a proporcionar garantías adicionales si es necesario?'
    ]
  };

  constructor() {
    this.loadStoredCheckpoints();
  }

  // =================================
  // CHECKPOINT VALIDATION
  // =================================

  canUploadDocument(
    clientId: string, 
    documentType: string,
    clientData: any
  ): { allowed: boolean; blockReason?: string; checkpoint?: InterviewCheckpoint } {
    
    const checkpoint = this.getOrCreateCheckpoint(clientId, clientData);
    
    // Log attempt
    this.logDocumentAttempt(clientId, documentType, checkpoint.status !== InterviewStatus.COMPLETED_VALID);

    switch (checkpoint.status) {
      case InterviewStatus.NOT_REQUIRED:
        return { allowed: true };
        
      case InterviewStatus.COMPLETED_VALID:
        // Check if still valid (not expired)
        if (this.isCheckpointValid(checkpoint)) {
          return { allowed: true };
        } else {
          checkpoint.status = InterviewStatus.EXPIRED;
          checkpoint.blocking_reason = 'La entrevista ha expirado, debe repetirla';
          this.updateCheckpoint(checkpoint);
          return { 
            allowed: false, 
            blockReason: checkpoint.blocking_reason,
            checkpoint 
          };
        }
        
      case InterviewStatus.REQUIRED_PENDING:
        checkpoint.blocking_reason = `${checkpoint.requirement.reason}. Debe completar la entrevista antes de subir documentos.`;
        return { 
          allowed: false, 
          blockReason: checkpoint.blocking_reason,
          checkpoint 
        };
        
      case InterviewStatus.IN_PROGRESS:
        checkpoint.blocking_reason = 'Entrevista en progreso. Complete la grabación actual.';
        return { 
          allowed: false, 
          blockReason: checkpoint.blocking_reason,
          checkpoint 
        };
        
      case InterviewStatus.COMPLETED_INVALID:
        if (checkpoint.attempts >= (checkpoint.requirement.max_attempts || 3)) {
          checkpoint.blocking_reason = 'Máximo de intentos alcanzado. Contacte a su supervisor.';
        } else {
          checkpoint.blocking_reason = 'La entrevista anterior no fue válida. Debe repetirla.';
        }
        return { 
          allowed: false, 
          blockReason: checkpoint.blocking_reason,
          checkpoint 
        };
        
      case InterviewStatus.EXPIRED:
        checkpoint.blocking_reason = 'La entrevista ha expirado. Debe realizar una nueva.';
        return { 
          allowed: false, 
          blockReason: checkpoint.blocking_reason,
          checkpoint 
        };
        
      default:
        return { 
          allowed: false, 
          blockReason: 'Estado de entrevista desconocido',
          checkpoint 
        };
    }
  }

  // =================================
  // CHECKPOINT MANAGEMENT
  // =================================

  private getOrCreateCheckpoint(clientId: string, clientData: any): InterviewCheckpoint {
    const existing = this.checkpoints$.value[clientId];
    
    if (existing) {
      return existing;
    }

    // Create new checkpoint
    const requirement = this.determineRequirement(clientData);
    const checkpoint: InterviewCheckpoint = {
      client_id: clientId,
      product_type: clientData.productType || 'standard',
      municipality: clientData.municipality || 'default',
      status: requirement.required ? InterviewStatus.REQUIRED_PENDING : InterviewStatus.NOT_REQUIRED,
      requirement: requirement,
      attempts: 0
    };

    this.updateCheckpoint(checkpoint);
    return checkpoint;
  }

  private determineRequirement(clientData: any): InterviewRequirement {
    const municipality = this.normalizeMunicipality(clientData.municipality || 'default');
    const productType = clientData.productType || 'standard';
    
    // Try specific municipality + product
    let requirement = this.INTERVIEW_REQUIREMENTS[municipality]?.[productType];
    
    if (!requirement) {
      // Try municipality + default
      requirement = this.INTERVIEW_REQUIREMENTS[municipality]?.['standard'];
    }
    
    if (!requirement) {
      // Check risk-based requirements
      if (this.isHighRisk(clientData)) {
        requirement = this.INTERVIEW_REQUIREMENTS['default']['high_risk'];
      } else {
        requirement = this.INTERVIEW_REQUIREMENTS['default']['standard'];
      }
    }

    return requirement;
  }

  private normalizeMunicipality(municipality: string): string {
    const normalized = municipality.toLowerCase().replace(/\s+/g, '_');
    
    const municipalityMap: { [key: string]: string } = {
      'aguascalientes': 'aguascalientes',
      'ags': 'aguascalientes',
      'estado_de_mexico': 'estado_de_mexico',
      'edomex': 'estado_de_mexico',
      'mexico': 'estado_de_mexico',
      'cdmx': 'estado_de_mexico',
      'ciudad_de_mexico': 'estado_de_mexico'
    };

    return municipalityMap[normalized] || 'default';
  }

  private isHighRisk(clientData: any): boolean {
    // Risk scoring logic
    let riskScore = 0;
    
    // Income inconsistencies
    if (clientData.monthlyIncome > 50000) riskScore += 2;
    if (clientData.monthlyIncome < 10000) riskScore += 1;
    
    // Previous credits
    if (clientData.hasActiveCreditCount > 2) riskScore += 3;
    
    // Experience
    if (clientData.yearsExperience < 1) riskScore += 2;
    
    // Document quality flags
    if (clientData.documentsIncomplete) riskScore += 2;
    
    return riskScore >= 4; // High risk threshold
  }

  // =================================
  // INTERVIEW LIFECYCLE
  // =================================

  startInterview(clientId: string): InterviewCheckpoint {
    const checkpoint = this.checkpoints$.value[clientId];
    
    if (!checkpoint) {
      throw new Error('No checkpoint found for client');
    }

    checkpoint.status = InterviewStatus.IN_PROGRESS;
    checkpoint.attempts += 1;
    
    this.updateCheckpoint(checkpoint);
    return checkpoint;
  }

  completeInterview(clientId: string, validationResult: any): InterviewCheckpoint {
    const checkpoint = this.checkpoints$.value[clientId];
    
    if (!checkpoint) {
      throw new Error('No checkpoint found for client');
    }

    // Validate result
    const isValid = this.validateInterviewResult(validationResult, checkpoint.requirement);
    
    checkpoint.status = isValid ? InterviewStatus.COMPLETED_VALID : InterviewStatus.COMPLETED_INVALID;
    checkpoint.completed_at = new Date().toISOString();
    checkpoint.last_validation_result = validationResult;
    
    if (isValid && checkpoint.requirement.validity_hours) {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + checkpoint.requirement.validity_hours);
      checkpoint.expires_at = expiryDate.toISOString();
    }

    this.updateCheckpoint(checkpoint);
    return checkpoint;
  }

  private validateInterviewResult(result: any, requirement: InterviewRequirement): boolean {
    // Compliance score threshold
    if (result.compliance_score < 70) {
      return false;
    }

    // Duration requirement
    if (requirement.min_duration_seconds) {
      const durationSeconds = (result.session_duration || 0) / 1000;
      if (durationSeconds < requirement.min_duration_seconds) {
        return false;
      }
    }

    // Critical risk flags
    const criticalFlags = result.risk_flags?.filter((flag: any) => flag.severity === 'critical') || [];
    if (criticalFlags.length > 0) {
      return false;
    }

    // Required questions completeness
    if (result.questions_missing?.length > 0) {
      // Check if missing questions are mandatory
      const template = requirement.questions_template;
      const mandatoryQuestions = this.QUESTION_TEMPLATES[template] || [];
      const missingMandatory = result.questions_missing.some((missing: string) => 
        mandatoryQuestions.some(q => q.includes(missing))
      );
      
      if (missingMandatory) {
        return false;
      }
    }

    return true;
  }

  private isCheckpointValid(checkpoint: InterviewCheckpoint): boolean {
    if (!checkpoint.expires_at) {
      return true; // No expiry set
    }
    
    return new Date() < new Date(checkpoint.expires_at);
  }

  // =================================
  // DATA ACCESS
  // =================================

  getCheckpoint(clientId: string): InterviewCheckpoint | null {
    return this.checkpoints$.value[clientId] || null;
  }

  getCheckpoints(): Observable<{ [clientId: string]: InterviewCheckpoint }> {
    return this.checkpoints$.asObservable();
  }

  getQuestionTemplate(templateName: string): string[] {
    return this.QUESTION_TEMPLATES[templateName] || [];
  }

  getDocumentAttempts(): Observable<DocumentUploadAttempt[]> {
    return this.documentAttempts$.asObservable();
  }

  // =================================
  // UTILITIES
  // =================================

  private updateCheckpoint(checkpoint: InterviewCheckpoint): void {
    const current = this.checkpoints$.value;
    current[checkpoint.client_id] = checkpoint;
    this.checkpoints$.next(current);
    this.saveCheckpoints();
  }

  private logDocumentAttempt(clientId: string, documentType: string, blocked: boolean): void {
    const attempt: DocumentUploadAttempt = {
      client_id: clientId,
      document_type: documentType,
      attempted_at: new Date().toISOString(),
      blocked: blocked,
      block_reason: blocked ? 'Entrevista requerida' : undefined
    };

    const current = this.documentAttempts$.value;
    current.unshift(attempt); // Add to beginning
    
    // Keep only last 100 attempts
    if (current.length > 100) {
      current.splice(100);
    }
    
    this.documentAttempts$.next(current);
    localStorage.setItem('document_attempts', JSON.stringify(current));
  }

  private loadStoredCheckpoints(): void {
    const stored = localStorage.getItem('interview_checkpoints');
    if (stored) {
      try {
        const checkpoints = JSON.parse(stored);
        this.checkpoints$.next(checkpoints);
      } catch (error) {
// removed by clean-audit
      }
    }

    const storedAttempts = localStorage.getItem('document_attempts');
    if (storedAttempts) {
      try {
        const attempts = JSON.parse(storedAttempts);
        this.documentAttempts$.next(attempts);
      } catch (error) {
// removed by clean-audit
      }
    }
  }

  private saveCheckpoints(): void {
    localStorage.setItem('interview_checkpoints', JSON.stringify(this.checkpoints$.value));
  }

  // =================================
  // ADMIN & DEBUGGING
  // =================================

  resetCheckpoint(clientId: string): void {
    const current = this.checkpoints$.value;
    delete current[clientId];
    this.checkpoints$.next(current);
    this.saveCheckpoints();
  }

  overrideCheckpoint(clientId: string, status: InterviewStatus, reason: string = 'Manual override'): void {
    const checkpoint = this.checkpoints$.value[clientId];
    if (checkpoint) {
      checkpoint.status = status;
      checkpoint.blocking_reason = reason;
      checkpoint.completed_at = new Date().toISOString();
      this.updateCheckpoint(checkpoint);
    }
  }

  getCheckpointStats(): {
    total: number;
    by_status: { [status: string]: number };
    by_municipality: { [municipality: string]: number };
    blocked_uploads_today: number;
  } {
    const checkpoints = Object.values(this.checkpoints$.value);
    const attempts = this.documentAttempts$.value;
    
    const today = new Date().toDateString();
    const blockedToday = attempts.filter(a => 
      a.blocked && new Date(a.attempted_at).toDateString() === today
    ).length;

    return {
      total: checkpoints.length,
      by_status: checkpoints.reduce((acc, cp) => {
        acc[cp.status] = (acc[cp.status] || 0) + 1;
        return acc;
      }, {} as { [status: string]: number }),
      by_municipality: checkpoints.reduce((acc, cp) => {
        acc[cp.municipality] = (acc[cp.municipality] || 0) + 1;
        return acc;
      }, {} as { [municipality: string]: number }),
      blocked_uploads_today: blockedToday
    };
  }

  // =================================
// removed by clean-audit
  // =================================

  createMockCheckpoint(clientId: string, status: InterviewStatus): InterviewCheckpoint {
    const mockCheckpoint: InterviewCheckpoint = {
      client_id: clientId,
      product_type: 'individual',
      municipality: 'aguascalientes',
      status: status,
      requirement: this.INTERVIEW_REQUIREMENTS['aguascalientes']['individual'],
      attempts: status === InterviewStatus.COMPLETED_INVALID ? 2 : 1,
      completed_at: status.includes('COMPLETED') ? new Date().toISOString() : undefined,
      expires_at: status === InterviewStatus.COMPLETED_VALID ? 
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined
    };

    this.updateCheckpoint(mockCheckpoint);
    return mockCheckpoint;
  }
}
// removed by clean-audit