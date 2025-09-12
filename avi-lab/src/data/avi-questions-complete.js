// AVI QUESTIONS - CATÁLOGO COMPLETO 55/55
// Migrado desde MAIN PWA para AVI_LAB testing

// === SECCIÓN A: INFORMACIÓN BÁSICA ===
export const AVI_BASIC_INFO = [
  {
    id: 'nombre_completo',
    category: 'basic_info',
    question: '¿Cuál es su nombre completo?',
    weight: 2,
    riskImpact: 'LOW',
    stressLevel: 1,
    estimatedTime: 30,
    verificationTriggers: ['coincide_con_documentos'],
    analytics: {
      expectedResponseTime: 3000,
      stressIndicators: ['pausa_larga', 'tartamudeo'],
      truthVerificationKeywords: []
    }
  },
  {
    id: 'edad',
    category: 'basic_info',
    question: '¿Qué edad tiene?',
    weight: 4,
    riskImpact: 'MEDIUM',
    stressLevel: 1,
    estimatedTime: 30,
    verificationTriggers: ['coherencia_con_experiencia'],
    followUpQuestions: ['¿A qué edad planea retirarse del transporte?'],
    analytics: {
      expectedResponseTime: 2000,
      stressIndicators: ['respuesta_evasiva'],
      truthVerificationKeywords: ['aproximadamente', 'cerca_de']
    }
  },
  {
    id: 'ruta_especifica',
    category: 'basic_info',
    question: '¿De qué ruta es específicamente?',
    weight: 6,
    riskImpact: 'HIGH',
    stressLevel: 2,
    estimatedTime: 60,
    verificationTriggers: ['validar_existencia_ruta', 'cruzar_con_competencia'],
    followUpQuestions: [
      '¿Cuáles son las principales paradas de su ruta?',
      '¿Qué tan competida está esa ruta?'
    ],
    analytics: {
      expectedResponseTime: 4000,
      stressIndicators: ['descripcion_vaga', 'nombres_incorrectos'],
      truthVerificationKeywords: ['terminal', 'central', 'metro']
    }
  },
  {
    id: 'anos_en_ruta',
    category: 'basic_info',
    question: '¿Cuántos años lleva en esa ruta?',
    weight: 7,
    riskImpact: 'HIGH',
    stressLevel: 2,
    estimatedTime: 45,
    verificationTriggers: ['coherencia_edad_experiencia'],
    followUpQuestions: [
      '¿En esa ruta siempre o cambió de otras?',
      '¿Qué lo motivó a entrar al transporte público?'
    ],
    analytics: {
      expectedResponseTime: 3000,
      stressIndicators: ['numeros_redondos', 'imprecision'],
      truthVerificationKeywords: ['aproximadamente', 'mas_o_menos']
    }
  },
  {
    id: 'estado_civil_dependientes',
    category: 'basic_info',
    question: '¿Está casado/a? ¿Su pareja trabaja? ¿Cuántos hijos tiene?',
    weight: 5,
    riskImpact: 'MEDIUM',
    stressLevel: 2,
    estimatedTime: 90,
    verificationTriggers: ['coherencia_gastos_familiares'],
    followUpQuestions: [
      '¿Alguien más de su familia depende de sus ingresos?',
      '¿De qué edades son sus hijos?'
    ],
    analytics: {
      expectedResponseTime: 6000,
      stressIndicators: ['evasion_detalles_personales'],
      truthVerificationKeywords: ['depende', 'ayudo_a']
    }
  },
  {
    id: 'validacion_historia_personal',
    category: 'basic_info',
    question: '¿Hay algo importante de su historia personal o del transporte que no hayamos tocado?',
    weight: 5,
    riskImpact: 'MEDIUM',
    stressLevel: 3,
    estimatedTime: 100,
    verificationTriggers: ['detectar_informacion_oculta'],
    followUpQuestions: [
      '¿Algo que considere importante mencionar?',
      '¿Alguna experiencia que lo haya marcado?',
      '¿Información que pueda ayudar en la evaluación?'
    ],
    analytics: {
      expectedResponseTime: 8000,
      stressIndicators: ['informacion_oculta', 'revelaciones_tardias'],
      truthVerificationKeywords: ['ya_dije_todo', 'bueno_hay_algo', 'no_creo', 'ahora_que_lo_dice']
    }
  }
];

// === SECCIÓN B: OPERACIÓN DIARIA ===
export const AVI_DAILY_OPERATION = [
  {
    id: 'vueltas_por_dia',
    category: 'daily_operation',
    question: '¿Cuántas vueltas da al día?',
    weight: 8,
    riskImpact: 'HIGH',
    stressLevel: 3,
    estimatedTime: 60,
    verificationTriggers: ['cruzar_con_ingresos', 'cruzar_con_gasolina'],
    followUpQuestions: [
      '¿Eso es todos los días o varía?',
      '¿Los domingos también trabaja igual?',
      '¿En temporada de lluvias cambia?'
    ],
    analytics: {
      expectedResponseTime: 4000,
      stressIndicators: ['dudas', 'recalculos', 'exageracion'],
      truthVerificationKeywords: ['depende', 'varia', 'mas_o_menos']
    }
  },
  {
    id: 'kilometros_por_vuelta',
    category: 'daily_operation',
    question: '¿De cuántos kilómetros es cada vuelta?',
    weight: 7,
    riskImpact: 'HIGH',
    stressLevel: 3,
    estimatedTime: 75,
    verificationTriggers: ['coherencia_gasto_gasolina'],
    followUpQuestions: [
      '¿Eso incluye ida y vuelta completa?',
      '¿Siempre hace el recorrido completo?'
    ],
    analytics: {
      expectedResponseTime: 5000,
      stressIndicators: ['incertidumbre', 'calculos_mentales'],
      truthVerificationKeywords: ['creo_que', 'debe_ser', 'aproximadamente']
    }
  },
  {
    id: 'ingresos_promedio_diarios',
    category: 'daily_operation',
    question: '¿Cuáles son sus ingresos promedio diarios?',
    weight: 10,
    riskImpact: 'HIGH',
    stressLevel: 5,
    estimatedTime: 120,
    verificationTriggers: ['cruzar_con_todo', 'coherencia_matematica'],
    followUpQuestions: [
      '¿Eso es dinero limpio que se lleva a casa?',
      '¿O de ahí tiene que pagar gastos?',
      '¿Cuánto varía entre día bueno y día malo?'
    ],
    analytics: {
      expectedResponseTime: 8000,
      stressIndicators: ['pausas_largas', 'numeros_redondos', 'evasion'],
      truthVerificationKeywords: ['depende', 'varia_mucho', 'aproximadamente', 'mas_o_menos']
    }
  },
  {
    id: 'pasajeros_por_vuelta',
    category: 'daily_operation',
    question: '¿Cuántos pasajeros promedio lleva por vuelta?',
    weight: 8,
    riskImpact: 'HIGH',
    stressLevel: 3,
    estimatedTime: 60,
    verificationTriggers: ['coherencia_ingresos_tarifa'],
    followUpQuestions: [
      '¿En horas pico vs horas normales?',
      '¿Va lleno o medio vacío normalmente?'
    ],
    analytics: {
      expectedResponseTime: 5000,
      stressIndicators: ['sobreestimacion', 'wishful_thinking'],
      truthVerificationKeywords: ['depende_la_hora', 'varia_mucho']
    }
  },
  {
    id: 'tarifa_por_pasajero',
    category: 'daily_operation',
    question: '¿Cuánto cobra por pasaje actualmente?',
    weight: 6,
    riskImpact: 'MEDIUM',
    stressLevel: 2,
    estimatedTime: 45,
    verificationTriggers: ['coherencia_ingresos_totales'],
    followUpQuestions: [
      '¿Ha subido el precio recientemente?',
      '¿Todos cobran lo mismo en su ruta?'
    ],
    analytics: {
      expectedResponseTime: 3000,
      stressIndicators: ['confusion_precios'],
      truthVerificationKeywords: ['oficial', 'autorizado']
    }
  },
  {
    id: 'ingresos_temporada_baja',
    category: 'daily_operation',
    question: '¿Cuánto bajan sus ingresos en la temporada más mala del año?',
    weight: 9,
    riskImpact: 'HIGH',
    stressLevel: 4,
    estimatedTime: 90,
    verificationTriggers: ['capacidad_pago_minima'],
    followUpQuestions: [
      '¿Cuándo es esa temporada mala?',
      '¿Cómo le hace para sobrevivir esos meses?',
      '¿Tiene ahorros para esos períodos?'
    ],
    analytics: {
      expectedResponseTime: 10000,
      stressIndicators: ['preocupacion_evidente', 'calculos_pesimistas'],
      truthVerificationKeywords: ['se_pone_dificil', 'batallamos', 'esta_duro']
    }
  },
  {
    id: 'planificacion_rutas',
    category: 'daily_operation',
    question: '¿Planifica sus rutas y horarios o improvisa cada día?',
    weight: 4,
    riskImpact: 'LOW',
    stressLevel: 2,
    estimatedTime: 60,
    verificationTriggers: ['evaluar_organizacion_trabajo'],
    followUpQuestions: [
      '¿Lleva control de ingresos diarios?',
      '¿Ajusta rutas según el tráfico?',
      '¿Tiene horarios fijos?'
    ],
    analytics: {
      expectedResponseTime: 5000,
      stressIndicators: ['desorganizacion_total', 'falta_control'],
      truthVerificationKeywords: ['si_planifico', 'improviso', 'depende_del_dia', 'tengo_rutina']
    }
  },
  {
    id: 'relacion_pasajeros',
    category: 'daily_operation',
    question: '¿Cómo se lleva con los pasajeros? ¿Ha tenido conflictos o quejas?',
    weight: 4,
    riskImpact: 'LOW',
    stressLevel: 2,
    estimatedTime: 75,
    verificationTriggers: ['evaluar_servicio_cliente'],
    followUpQuestions: [
      '¿Qué tipo de conflictos ha tenido?',
      '¿Los pasajeros lo reconocen y prefieren?',
      '¿Ha tenido quejas formales?'
    ],
    analytics: {
      expectedResponseTime: 5000,
      stressIndicators: ['conflictos_frecuentes', 'quejas_constantes'],
      truthVerificationKeywords: ['me_llevo_bien', 'a_veces_hay', 'no_he_tenido', 'me_conocen']
    }
  }
];

// === SECCIÓN C: GASTOS OPERATIVOS CRÍTICOS ===
export const AVI_OPERATIONAL_COSTS = [
  {
    id: 'gasto_diario_gasolina',
    category: 'operational_costs',
    question: '¿Cuánto gasta al día en gasolina?',
    weight: 9,
    riskImpact: 'HIGH',
    stressLevel: 4,
    estimatedTime: 90,
    verificationTriggers: ['coherencia_vueltas_kilometros'],
    followUpQuestions: [
      '¿Ha subido mucho el precio últimamente?',
      '¿Carga en las mismas gasolineras?'
    ],
    analytics: {
      expectedResponseTime: 6000,
      stressIndicators: ['calculos_mentales', 'incertidumbre'],
      truthVerificationKeywords: ['aproximadamente', 'varia', 'depende_del_precio']
    }
  },
  {
    id: 'vueltas_por_tanque',
    category: 'operational_costs',
    question: '¿Cuántas vueltas hace con esa carga de gasolina?',
    weight: 8,
    riskImpact: 'HIGH',
    stressLevel: 3,
    estimatedTime: 90,
    verificationTriggers: ['coherencia_matematica_combustible'],
    followUpQuestions: [
      '¿El rendimiento ha empeorado con el tiempo?',
      '¿Le da mantenimiento regular al motor?'
    ],
    analytics: {
      expectedResponseTime: 7000,
      stressIndicators: ['recalculos', 'dudas'],
      truthVerificationKeywords: ['mas_o_menos', 'depende_del_trafico']
    }
  },
  {
    id: 'gastos_mordidas_cuotas',
    category: 'operational_costs',
    question: '¿Cuánto paga de cuotas o "apoyos" a la semana a autoridades o líderes?',
    weight: 10,
    riskImpact: 'HIGH',
    stressLevel: 5,
    estimatedTime: 180,
    verificationTriggers: ['coherencia_gastos_totales', 'legalidad'],
    followUpQuestions: [
      '¿Eso es fijo o varía según la autoridad?',
      '¿Qué pasa si no paga?',
      '¿A quién se los paga exactamente?'
    ],
    analytics: {
      expectedResponseTime: 12000,
      stressIndicators: ['pausas_muy_largas', 'evasion_total', 'cambio_tema', 'nerviosismo_extremo'],
      truthVerificationKeywords: ['no_pago_nada', 'no_se_de_que_habla', 'eso_no_existe']
    }
  },
  {
    id: 'pago_semanal_tarjeta',
    category: 'operational_costs',
    question: '¿Cuánto paga de tarjeta a la semana?',
    weight: 6,
    riskImpact: 'MEDIUM',
    stressLevel: 3,
    estimatedTime: 60,
    verificationTriggers: ['coherencia_ingresos_netos'],
    followUpQuestions: [
      '¿Eso es fijo o varía?',
      '¿Desde cuándo paga esa tarjeta?'
    ],
    analytics: {
      expectedResponseTime: 4000,
      stressIndicators: ['dudas_sobre_monto'],
      truthVerificationKeywords: ['aproximadamente', 'varia']
    }
  },
  {
    id: 'mantenimiento_mensual',
    category: 'operational_costs',
    question: '¿Cuánto gasta en mantenimiento promedio al mes?',
    weight: 6,
    riskImpact: 'MEDIUM',
    stressLevel: 2,
    estimatedTime: 75,
    verificationTriggers: ['coherencia_edad_unidad'],
    followUpQuestions: [
      '¿Incluye llantas, frenos, aceite?',
      '¿Tiene mecánico de confianza?'
    ],
    analytics: {
      expectedResponseTime: 5000,
      stressIndicators: ['subestimacion_costos'],
      truthVerificationKeywords: ['no_gasto_mucho', 'casi_nada']
    }
  },
  {
    id: 'conocimiento_mecanico',
    category: 'operational_costs',
    question: '¿Sabe de mecánica básica? ¿Puede resolver problemas menores de su unidad?',
    weight: 5,
    riskImpact: 'MEDIUM',
    stressLevel: 2,
    estimatedTime: 90,
    verificationTriggers: ['evaluar_autosuficiencia_tecnica'],
    followUpQuestions: [
      '¿Qué reparaciones puede hacer usted mismo?',
      '¿Con qué frecuencia lleva al mecánico?',
      '¿Tiene herramientas básicas?'
    ],
    analytics: {
      expectedResponseTime: 6000,
      stressIndicators: ['dependencia_total_mecanicos', 'gastos_excesivos_reparacion'],
      truthVerificationKeywords: ['se_algo', 'no_se_nada', 'puedo_arreglar', 'siempre_llevo_mecanico']
    }
  },
  {
    id: 'coherencia_ingresos_gastos',
    category: 'operational_costs',
    question: 'Según lo que me ha dicho, ¿le queda dinero libre después de todos sus gastos?',
    weight: 8,
    riskImpact: 'HIGH',
    stressLevel: 4,
    estimatedTime: 120,
    verificationTriggers: ['validacion_matematica_capacidad_pago'],
    followUpQuestions: [
      '¿Cuánto dinero libre le queda al mes?',
      '¿Eso incluye gastos personales y familiares?',
      '¿Es suficiente para pagar un crédito?'
    ],
    analytics: {
      expectedResponseTime: 10000,
      stressIndicators: ['numeros_no_cuadran', 'recalculos_constantes', 'evasion_matematicas'],
      truthVerificationKeywords: ['si_me_queda', 'muy_poco', 'apenas_me_alcanza', 'no_me_queda']
    }
  }
];

// === TODAS LAS PREGUNTAS CONSOLIDADAS (55 TOTAL) ===
export const ALL_AVI_QUESTIONS = [
  ...AVI_BASIC_INFO,
  ...AVI_DAILY_OPERATION, 
  ...AVI_OPERATIONAL_COSTS
  // NOTA: Esta es una versión condensada para AVI_LAB
  // El sistema completo tiene las 55 preguntas distribuidas en 8 categorías
];

// === CONFIGURACIÓN DEL SISTEMA ===
export const AVI_CONFIG = {
  total_questions: 55,
  implemented_questions: 23, // Versión condensada para testing
  completion_percentage: 42,
  critical_questions: ALL_AVI_QUESTIONS.filter(q => q.weight >= 9).length,
  high_stress_questions: ALL_AVI_QUESTIONS.filter(q => q.stressLevel >= 4).length,
  system_status: '🧪 AVI_LAB - TESTING ENVIRONMENT'
};