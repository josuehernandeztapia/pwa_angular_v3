/**
 * 📝 Human-First Microcopy Service - Mobility Tech Premium Experience
 * Contextual, empathetic messaging that converts + delights users
 */

import { Injectable } from '@angular/core';

export interface MicrocopyConfig {
  id: string;
  context: 'onboarding' | 'success' | 'error' | 'guidance' | 'encouragement' | 'reassurance' | 'celebration' | 'risk-evaluation' | 'decision' | 'loading';
  tone: 'professional' | 'friendly' | 'supportive' | 'celebratory' | 'urgent' | 'reassuring' | 'empathetic' | 'explanatory';
  primaryText: string;
  secondaryText?: string;
  actionText?: string;
  accessibility?: {
    screenReader: string;
    description: string;
  };
  triggerCondition?: string;
  personalization?: {
    includeUserName?: boolean;
    timeOfDay?: boolean;
    businessContext?: boolean;
    riskData?: {
      decision?: string;
      riskCategory?: string;
      score?: number;
      band?: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class HumanMicrocopyService {

  // 🚀 Onboarding & Welcome Messages
  private readonly onboardingMicrocopy: Record<string, MicrocopyConfig> = {
    'welcome-first-time': {
      id: 'welcome-first-time',
      context: 'onboarding',
      tone: 'friendly',
      primaryText: '¡Bienvenido a Conductores! 🚗',
      secondaryText: 'Estamos aquí para hacer tu gestión de movilidad más inteligente y eficiente.',
      actionText: 'Comenzar tour',
      accessibility: {
        screenReader: 'Bienvenido a Conductores. Comienza el tour de introducción.',
        description: 'Mensaje de bienvenida para nuevos usuarios'
      },
      personalization: {
        includeUserName: true,
        timeOfDay: true
      }
    },
    'setup-profile-guidance': {
      id: 'setup-profile-guidance',
      context: 'guidance',
      tone: 'supportive',
      primaryText: 'Personalicemos tu experiencia',
      secondaryText: 'Solo necesitamos algunos datos para ofrecerte las mejores recomendaciones.',
      actionText: 'Configurar perfil',
      accessibility: {
        screenReader: 'Configuración de perfil. Solo necesitamos algunos datos básicos.',
        description: 'Guía para configuración inicial de perfil'
      }
    },
    'first-quote-encouragement': {
      id: 'first-quote-encouragement',
      context: 'encouragement',
      tone: 'supportive',
      primaryText: 'Tu primera cotización está a un clic',
      secondaryText: 'Nuestro cotizador inteligente te ayudará a encontrar la mejor protección.',
      actionText: 'Crear cotización',
      triggerCondition: 'user.quotes.length === 0'
    }
  };

  // ✅ Success & Celebration Messages
  private readonly successMicrocopy: Record<string, MicrocopyConfig> = {
    'quote-generated-success': {
      id: 'quote-generated-success',
      context: 'success',
      tone: 'celebratory',
      primaryText: '¡Cotización lista! 🎉',
      secondaryText: 'Tu propuesta personalizada está disponible. Compártela con tu cliente o conviértela en póliza.',
      actionText: 'Ver cotización',
      accessibility: {
        screenReader: 'Cotización generada exitosamente. Tu propuesta está disponible.',
        description: 'Confirmación de cotización generada'
      }
    },
    'payment-processed': {
      id: 'payment-processed',
      context: 'celebration',
      tone: 'celebratory',
      primaryText: '¡Pago procesado exitosamente! 💳',
      secondaryText: 'Tu cliente recibirá la confirmación por email. La póliza estará disponible en breve.',
      accessibility: {
        screenReader: 'Pago procesado exitosamente. El cliente recibirá confirmación por email.',
        description: 'Confirmación de pago procesado'
      }
    },
    'kyc-approved': {
      id: 'kyc-approved',
      context: 'success',
      tone: 'professional',
      primaryText: 'Verificación completada ✓',
      secondaryText: 'El cliente ha sido verificado exitosamente. Puede proceder con la contratación.',
      personalization: {
        businessContext: true
      }
    },
    'contract-signed': {
      id: 'contract-signed',
      context: 'celebration',
      tone: 'celebratory',
      primaryText: '¡Contrato firmado digitalmente! ✍️',
      secondaryText: 'La protección está activa. Tu cliente recibirá todos los documentos por email.',
      actionText: 'Ver póliza'
    }
  };

  // ⚠️ Error & Recovery Messages
  private readonly errorMicrocopy: Record<string, MicrocopyConfig> = {
    'payment-failed-recoverable': {
      id: 'payment-failed-recoverable',
      context: 'error',
      tone: 'supportive',
      primaryText: 'El pago no pudo procesarse',
      secondaryText: 'No te preocupes, estos errores son comunes. Verifica los datos de la tarjeta y vuelve a intentar.',
      actionText: 'Intentar de nuevo',
      accessibility: {
        screenReader: 'Error en el procesamiento del pago. Verifica los datos de la tarjeta.',
        description: 'Error recoverable de pago con guía de solución'
      }
    },
    'system-maintenance': {
      id: 'system-maintenance',
      context: 'reassurance',
      tone: 'reassuring',
      primaryText: 'Sistema en mantenimiento',
      secondaryText: 'Estamos mejorando tu experiencia. Regresa en unos minutos.',
      accessibility: {
        screenReader: 'Sistema en mantenimiento. Regresa en unos minutos.',
        description: 'Mensaje de mantenimiento del sistema'
      }
    },
    'connection-lost': {
      id: 'connection-lost',
      context: 'error',
      tone: 'supportive',
      primaryText: 'Sin conexión a internet',
      secondaryText: 'Tus datos están seguros. Reconectaremos automáticamente cuando vuelvas a tener internet.',
      accessibility: {
        screenReader: 'Sin conexión a internet. Los datos están seguros.',
        description: 'Error de conexión con información tranquilizadora'
      }
    },
    'validation-error-friendly': {
      id: 'validation-error-friendly',
      context: 'guidance',
      tone: 'supportive',
      primaryText: 'Revisa estos campos',
      secondaryText: 'Algunos datos necesitan corrección para continuar.',
      actionText: 'Revisar',
      accessibility: {
        screenReader: 'Errores de validación en el formulario. Revisa los campos marcados.',
        description: 'Errores de validación con tono amigable'
      }
    }
  };

  // 🎯 Guidance & Help Messages  
  private readonly guidanceMicrocopy: Record<string, MicrocopyConfig> = {
    'quote-optimization-tip': {
      id: 'quote-optimization-tip',
      context: 'guidance',
      tone: 'professional',
      primaryText: '💡 Tip para maximizar valor',
      secondaryText: 'Considera incluir protección de cristales. El 80% de nuestros clientes lo agradecen.',
      triggerCondition: 'quote.glassProtection === false'
    },
    'customer-communication-suggestion': {
      id: 'customer-communication-suggestion',
      context: 'guidance',
      tone: 'supportive',
      primaryText: 'Momento ideal para contactar',
      secondaryText: 'Tu cliente vio la cotización hace 2 horas. Una llamada ahora tiene 3x más probabilidad de conversión.',
      actionText: 'Llamar ahora',
      triggerCondition: 'quote.lastViewed < 3 hours && !customer.contacted'
    },
    'pipeline-optimization': {
      id: 'pipeline-optimization',
      context: 'guidance',
      tone: 'professional',
      primaryText: 'Optimiza tu pipeline',
      secondaryText: 'Tienes 5 cotizaciones pendientes de seguimiento. Prioriza por valor y probabilidad.',
      actionText: 'Ver pipeline'
    },
    'seasonal-opportunity': {
      id: 'seasonal-opportunity',
      context: 'encouragement',
      tone: 'friendly',
      primaryText: '🌟 Oportunidad estacional',
      secondaryText: 'Es temporada alta para seguros de viaje. Perfecto para cross-selling.',
      triggerCondition: 'date.month in [6,7,12]'
    }
  };

  // 🔄 Loading & Progress Messages
  private readonly progressMicrocopy: Record<string, MicrocopyConfig> = {
    'quote-generating': {
      id: 'quote-generating',
      context: 'reassurance',
      tone: 'professional',
      primaryText: 'Creando tu cotización...',
      secondaryText: 'Analizamos 15+ variables para encontrar la mejor propuesta.',
      accessibility: {
        screenReader: 'Generando cotización. Analizando variables para la mejor propuesta.',
        description: 'Indicador de progreso durante generación de cotización'
      }
    },
    'payment-processing': {
      id: 'payment-processing',
      context: 'reassurance',
      tone: 'professional',
      primaryText: 'Procesando pago...',
      secondaryText: 'Conectando con el banco de forma segura. No cierres esta ventana.',
      accessibility: {
        screenReader: 'Procesando pago de forma segura. No cierres la ventana.',
        description: 'Indicador de progreso durante procesamiento de pago'
      }
    },
    'document-generating': {
      id: 'document-generating',
      context: 'reassurance',
      tone: 'professional',
      primaryText: 'Preparando documentos...',
      secondaryText: 'Generando tu póliza y documentos legales. Esto toma unos segundos.',
      accessibility: {
        screenReader: 'Generando póliza y documentos legales.',
        description: 'Progreso de generación de documentos'
      }
    }
  };

  // 🎯 KIBAN/HASE Risk Evaluation Microcopy
  private readonly riskEvaluationMicrocopy: Record<string, MicrocopyConfig> = {
    'loading-evaluation': {
      id: 'loading-evaluation',
      context: 'loading',
      tone: 'reassuring',
      primaryText: 'Analizando perfil crediticio con KIBAN/HASE...',
      secondaryText: 'Esto puede tomar unos segundos mientras procesamos tu información.',
      accessibility: {
        screenReader: 'Analizando perfil crediticio. Por favor espera.',
        description: 'Mensaje de carga durante evaluación de riesgo'
      },
      triggerCondition: 'risk-evaluation-in-progress'
    },
    
    'decision-go': {
      id: 'decision-go',
      context: 'decision',
      tone: 'celebratory',
      primaryText: '¡Excelente! Tu perfil ha sido aprobado 🎉',
      secondaryText: 'Tu score crediticio y análisis HASE muestran un riesgo bajo. Puedes continuar con tu solicitud.',
      actionText: 'Continuar con financiamiento',
      accessibility: {
        screenReader: 'Aprobado. Tu perfil crediticio ha sido aceptado.',
        description: 'Mensaje de aprobación para riesgo bajo'
      },
      personalization: {
        includeUserName: true,
        businessContext: true,
        riskData: {}
      }
    },
    
    'decision-review': {
      id: 'decision-review',
      context: 'decision',
      tone: 'empathetic',
      primaryText: 'Tu solicitud requiere revisión adicional',
      secondaryText: 'Hemos identificado algunos factores que necesitan atención. Nuestro equipo especializado te ayudará a encontrar la mejor solución.',
      actionText: 'Ver opciones disponibles',
      accessibility: {
        screenReader: 'Tu solicitud requiere revisión adicional por parte de un especialista.',
        description: 'Mensaje para casos que requieren revisión manual'
      },
      personalization: {
        includeUserName: true,
        riskData: {}
      }
    },
    
    'decision-nogo': {
      id: 'decision-nogo',
      context: 'decision',
      tone: 'empathetic',
      primaryText: 'No podemos procesar tu solicitud en este momento',
      secondaryText: 'Hemos identificado factores críticos en tu perfil crediticio. Te ayudamos a crear un plan de mejora para futuras solicitudes.',
      actionText: 'Ver plan de mejora',
      accessibility: {
        screenReader: 'Solicitud no aprobada. Opciones de mejora disponibles.',
        description: 'Mensaje empático para solicitudes no aprobadas'
      },
      personalization: {
        includeUserName: true,
        riskData: {}
      }
    },
    
    'not-found-fallback': {
      id: 'not-found-fallback',
      context: 'guidance',
      tone: 'reassuring',
      primaryText: 'No encontramos tu historial en buró de crédito',
      secondaryText: 'Esto no es problema. Podemos evaluar tu solicitud usando nuestro análisis AVI de voz y historial GNV. Solo necesitamos documentación adicional.',
      actionText: 'Subir documentos',
      accessibility: {
        screenReader: 'Sin historial crediticio encontrado. Evaluación alternativa disponible.',
        description: 'Mensaje explicativo para clientes sin historial crediticio'
      },
      personalization: {
        businessContext: true
      }
    },
    
    'evaluation-error': {
      id: 'evaluation-error',
      context: 'error',
      tone: 'reassuring',
      primaryText: 'Hubo un problema técnico con la evaluación',
      secondaryText: 'Nuestros sistemas están experimentando una demora temporal. Podemos intentar nuevamente o proceder con evaluación manual.',
      actionText: 'Reintentar',
      accessibility: {
        screenReader: 'Error técnico en evaluación. Opciones de reintento disponibles.',
        description: 'Mensaje de error técnico con alternativas'
      },
      triggerCondition: 'api-error'
    },
    
    'rejection-explanation': {
      id: 'rejection-explanation',
      context: 'guidance',
      tone: 'explanatory',
      primaryText: 'Entendemos que esto puede ser frustrante',
      secondaryText: 'Los factores críticos identificados (como moras recientes o alto endeudamiento) requieren atención antes de proceder. Estamos aquí para ayudarte a mejorar tu perfil.',
      actionText: 'Plan de mejora personalizado',
      accessibility: {
        screenReader: 'Explicación de rechazo con opciones de mejora disponibles.',
        description: 'Explicación empática para solicitudes rechazadas'
      },
      personalization: {
        includeUserName: true,
        riskData: {}
      }
    },
    
    'high-risk-mitigation': {
      id: 'high-risk-mitigation',
      context: 'guidance',
      tone: 'supportive',
      primaryText: 'Podemos hacer que esto funcione',
      secondaryText: 'Tu perfil muestra riesgo alto, pero tenemos opciones. Un aval o mayor enganche pueden cambiar significativamente tu aprobación.',
      actionText: 'Ver opciones de mitigación',
      accessibility: {
        screenReader: 'Opciones de mitigación disponibles para riesgo alto.',
        description: 'Mensaje de apoyo con alternativas de mitigación'
      },
      personalization: {
        businessContext: true
      }
    },
    
    'alternative-products': {
      id: 'alternative-products',
      context: 'guidance',
      tone: 'supportive',
      primaryText: 'Tenemos otras opciones para ti',
      secondaryText: 'Aunque el financiamiento tradicional no es viable ahora, nuestros programas de ahorro programado y tandas colectivas pueden ser perfectos para tu situación.',
      actionText: 'Ver alternativas',
      accessibility: {
        screenReader: 'Productos alternativos disponibles según tu perfil.',
        description: 'Sugerencias de productos alternativos'
      },
      personalization: {
        businessContext: true
      }
    },
    
    'hase-factors-explanation': {
      id: 'hase-factors-explanation',
      context: 'guidance',
      tone: 'explanatory',
      primaryText: 'HASE: Evaluación integral de riesgo',
      secondaryText: 'Combinamos tu Historial crediticio (KIBAN), Análisis de voz (AVI), Score operativo (GNV) y Evaluación geográfica para una decisión más justa.',
      accessibility: {
        screenReader: 'Explicación del sistema HASE de evaluación integral.',
        description: 'Descripción del algoritmo HASE'
      },
      triggerCondition: 'user-requests-explanation'
    }
  };

  // 📊 Performance & Achievement Messages
  private readonly achievementMicrocopy: Record<string, MicrocopyConfig> = {
    'monthly-goal-reached': {
      id: 'monthly-goal-reached',
      context: 'celebration',
      tone: 'celebratory',
      primaryText: '🎯 ¡Meta del mes alcanzada!',
      secondaryText: 'Has superado tu objetivo de ventas. Excelente trabajo.',
      personalization: {
        includeUserName: true
      }
    },
    'first-million-milestone': {
      id: 'first-million-milestone',
      context: 'celebration',
      tone: 'celebratory',
      primaryText: '🏆 ¡Primer millón en ventas!',
      secondaryText: 'Un logro extraordinario. Tu dedicación marca la diferencia.',
      triggerCondition: 'user.totalSales >= 1000000'
    },
    'customer-satisfaction-high': {
      id: 'customer-satisfaction-high',
      context: 'celebration',
      tone: 'celebratory',
      primaryText: '⭐ Excelencia en servicio',
      secondaryText: 'Tus clientes te califican 4.9/5. Sigues estableciendo el estándar.',
      triggerCondition: 'user.averageRating >= 4.9'
    }
  };

  // 🎯 Consolidated Microcopy Registry
  private readonly microcopyRegistry: Record<string, MicrocopyConfig> = {
    ...this.onboardingMicrocopy,
    ...this.successMicrocopy,
    ...this.errorMicrocopy,
    ...this.guidanceMicrocopy,
    ...this.progressMicrocopy,
    ...this.achievementMicrocopy,
    ...this.riskEvaluationMicrocopy
  };

  /**
   * Get microcopy by ID with personalization
   */
  getMicrocopy(id: string, context?: any): MicrocopyConfig | null {
    const microcopy = this.microcopyRegistry[id];
    if (!microcopy) return null;

    // Clone to avoid modifying original
    const personalized = { ...microcopy };

    // Apply personalization
    if (microcopy.personalization && context) {
      personalized.primaryText = this.personalize(microcopy.primaryText, context, microcopy.personalization);
      if (microcopy.secondaryText) {
        personalized.secondaryText = this.personalize(microcopy.secondaryText, context, microcopy.personalization);
      }
    }

    return personalized;
  }

  /**
   * Get contextual microcopies
   */
  getMicrocopiesByContext(context: MicrocopyConfig['context']): MicrocopyConfig[] {
    return Object.values(this.microcopyRegistry).filter(microcopy => microcopy.context === context);
  }

  /**
   * Get conditional microcopies that match current state
   */
  getConditionalMicrocopies(userState: any): MicrocopyConfig[] {
    return Object.values(this.microcopyRegistry).filter(microcopy => {
      if (!microcopy.triggerCondition) return false;
      
      try {
        // Simple condition evaluation (in production, use a proper expression evaluator)
        return this.evaluateCondition(microcopy.triggerCondition, userState);
      } catch {
        return false;
      }
    });
  }

  /**
   * Get tone-specific microcopies
   */
  getMicrocopiesByTone(tone: MicrocopyConfig['tone']): MicrocopyConfig[] {
    return Object.values(this.microcopyRegistry).filter(microcopy => microcopy.tone === tone);
  }

  /**
   * Search microcopies by text content
   */
  searchMicrocopies(query: string): MicrocopyConfig[] {
    const lowerQuery = query.toLowerCase();
    return Object.values(this.microcopyRegistry).filter(microcopy =>
      microcopy.primaryText.toLowerCase().includes(lowerQuery) ||
      (microcopy.secondaryText && microcopy.secondaryText.toLowerCase().includes(lowerQuery)) ||
      microcopy.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Apply personalization to text
   */
  private personalize(text: string, context: any, personalization: MicrocopyConfig['personalization']): string {
    let personalized = text;

    if (personalization?.includeUserName && context.user?.name) {
      personalized = personalized.replace(/\{userName\}/g, context.user.name);
    }

    if (personalization?.timeOfDay && context.timeOfDay) {
      const greetings = {
        morning: 'Buenos días',
        afternoon: 'Buenas tardes', 
        evening: 'Buenas noches'
      };
      personalized = personalized.replace(/\{greeting\}/g, greetings[context.timeOfDay] || 'Hola');
    }

    if (personalization?.businessContext && context.business) {
      personalized = personalized.replace(/\{businessContext\}/g, context.business.context || '');
    }

    return personalized;
  }

  /**
   * Simple condition evaluation
   */
  private evaluateCondition(condition: string, userState: any): boolean {
    // In production, use a proper expression evaluator like jsonata or similar
    // This is a simplified implementation for demo purposes
    
    if (condition.includes('user.quotes.length === 0')) {
      return userState.user?.quotes?.length === 0;
    }
    
    if (condition.includes('user.totalSales >= 1000000')) {
      return userState.user?.totalSales >= 1000000;
    }
    
    if (condition.includes('user.averageRating >= 4.9')) {
      return userState.user?.averageRating >= 4.9;
    }
    
    if (condition.includes('quote.glassProtection === false')) {
      return userState.quote?.glassProtection === false;
    }
    
    if (condition.includes('date.month in [6,7,12]')) {
      const currentMonth = new Date().getMonth() + 1;
      return [6, 7, 12].includes(currentMonth);
    }
    
    return false;
  }

  /**
   * Get all available microcopy IDs
   */
  getAllMicrocopyIds(): string[] {
    return Object.keys(this.microcopyRegistry);
  }

  /**
   * Validate microcopy exists
   */
  hasMicrocopy(id: string): boolean {
    return id in this.microcopyRegistry;
  }
}