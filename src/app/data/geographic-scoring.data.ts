// GEOGRAPHIC SCORING SYSTEM - ZMVM (Zona Metropolitana del Valle de México)
// Component: 20% of HASE Model
// Risk factors per municipality and route for transportistas

export interface GeographicRiskFactors {
  municipality: string;
  state: 'cdmx' | 'edomex' | 'hidalgo' | 'tlaxcala' | 'puebla' | 'morelos';
  score: number; // 0-100 scale (100 = lowest risk, 0 = highest risk)
  extortion_risk: number; // 0-1 scale
  political_pressure: number; // 0-1 scale  
  crime_incidence: number; // 0-1 scale
  route_stability: number; // 0-1 scale
  corruption_level: number; // 0-1 scale
  syndicate_control: number; // 0-1 scale
  factors: string[];
  high_risk_routes: string[];
  red_flag_indicators: string[];
}

// ===== OPTIONAL ROUTE-LEVEL SCORE OVERRIDES =====
// Allows adjusting municipality base score when a specific known route is operated.
// Keys are normalized to lowercase with spaces/hyphens as written here for readability.
export const ROUTE_SCORE_OVERRIDES: Record<string, number> = {
  // ZMVM (Estado de México) — corredores de alto riesgo
  'vía morelos': 20,
  'via morelos': 20, // sin acento
  'av central': 25,
  'circuito exterior mexiquense': 30,
  'periférico': 30,
  'periferico': 30, // sin acento
  'gustavo baz': 35,
  'indios verdes': 35, // tramo Edomex → Indios Verdes
  'lopez portillo': 35,
  'lópez portillo': 35,
  'valle de aragón': 30,
  'valle de aragon': 30,
  'benito juárez neza': 35,
  'benito juarez neza': 35,
  'valle de chalco - tláhuac': 25,
  'valle de chalco - tlahuac': 25,
  'valle de chalco - iztapalapa': 25,
};

// Normalize route string to a key used in overrides map
function normalizeRouteKey(route: string): string {
  return route.trim().toLowerCase();
}

export function applyRouteOverrides(
  base: GeographicRiskFactors,
  routes: string[]
): GeographicRiskFactors {
  if (!routes || routes.length === 0) return base;
  let adjusted = { ...base };
  for (const r of routes) {
    const key = normalizeRouteKey(r);
    if (ROUTE_SCORE_OVERRIDES[key] != null) {
      adjusted = {
        ...adjusted,
        score: Math.min(adjusted.score, ROUTE_SCORE_OVERRIDES[key]),
        factors: Array.from(new Set([...(adjusted.factors || []), 'route_override_applied']))
      };
    }
  }
  return adjusted;
}

// ===== CIUDAD DE MÉXICO =====
export const CDMX_GEOGRAPHIC_SCORING: Record<string, GeographicRiskFactors> = {
  // ALCALDÍAS DE ALTO RIESGO (0-30 pts)
  'iztapalapa': {
    municipality: 'Iztapalapa',
    state: 'cdmx',
    score: 25,
    extortion_risk: 0.9,
    political_pressure: 0.8,
    crime_incidence: 0.9,
    route_stability: 0.2,
    corruption_level: 0.8,
    syndicate_control: 0.9,
    factors: [
      'cobros_excesivos_sindicatos',
      'extorsion_sistemica',
      'rutas_controladas_grupos_delictivos',
      'violencia_entre_transportistas'
    ],
    high_risk_routes: [
      'eje_8_sur',
      'av_tlahuac',
      'av_ermita_iztapalapa',
      'central_abasto_periferico'
    ],
    red_flag_indicators: [
      'pagos_semanales_superiores_3000_pesos',
      'miedo_evidente_al_hablar_autoridades',
      'cambios_frecuentes_ruta',
      'menciones_grupos_delictivos'
    ]
  },
  'gustavo_a_madero': {
    municipality: 'Gustavo A. Madero',
    state: 'cdmx',
    score: 30,
    extortion_risk: 0.8,
    political_pressure: 0.7,
    crime_incidence: 0.8,
    route_stability: 0.3,
    corruption_level: 0.7,
    syndicate_control: 0.8,
    factors: [
      'control_sindical_excesivo',
      'rutas_conflictivas_villa_guadalupe',
      'extorsion_av_insurgentes_norte',
      'problemas_terminal_norte'
    ],
    high_risk_routes: [
      'av_insurgentes_norte',
      'eje_central_lazaro_cardenas',
      'av_villa_guadalupe',
      'terminal_norte_accesos'
    ],
    red_flag_indicators: [
      'pagos_terminal_norte_irregulares',
      'problemas_villa_guadalupe',
      'control_lideres_sindicales',
      'rutas_modificadas_presion'
    ]
  },
  
  // ALCALDÍAS DE RIESGO MEDIO (31-60 pts)
  'venustiano_carranza': {
    municipality: 'Venustiano Carranza',
    state: 'cdmx',
    score: 45,
    extortion_risk: 0.6,
    political_pressure: 0.5,
    crime_incidence: 0.6,
    route_stability: 0.5,
    corruption_level: 0.6,
    syndicate_control: 0.6,
    factors: [
      'aeropuerto_rutas_competidas',
      'av_congreso_union_problemas',
      'terminal_tapo_conflictos',
      'presion_comercial_centro'
    ],
    high_risk_routes: [
      'circuito_interior_aeropuerto',
      'av_congreso_union',
      'eje_1_norte_tapo',
      'av_ricardo_flores_magon'
    ],
    red_flag_indicators: [
      'competencia_excesiva_aeropuerto',
      'pagos_terminal_tapo',
      'problemas_comerciantes_centro',
      'rutas_aeropuerto_saturadas'
    ]
  },
  'cuauhtemoc': {
    municipality: 'Cuauhtémoc', 
    state: 'cdmx',
    score: 50,
    extortion_risk: 0.5,
    political_pressure: 0.6,
    crime_incidence: 0.5,
    route_stability: 0.6,
    corruption_level: 0.6,
    syndicate_control: 0.5,
    factors: [
      'centro_historico_regulacion_excesiva',
      'av_reforma_permisos_complicados',
      'zona_rosa_restricciones',
      'terminal_observatorio_competencia'
    ],
    high_risk_routes: [
      'paseo_reforma',
      'av_juarez_centro',
      'eje_central_centro_historico',
      'av_chapultepec_roma'
    ],
    red_flag_indicators: [
      'permisos_centro_historico_complicados',
      'pagos_extra_zona_turistica',
      'regulacion_excesiva_reforma',
      'problemas_estacionamiento_centro'
    ]
  },

  // ALCALDÍAS DE BAJO RIESGO (61-100 pts)
  'benito_juarez': {
    municipality: 'Benito Juárez',
    state: 'cdmx',
    score: 75,
    extortion_risk: 0.3,
    political_pressure: 0.4,
    crime_incidence: 0.3,
    route_stability: 0.7,
    corruption_level: 0.4,
    syndicate_control: 0.3,
    factors: [
      'zona_corporativa_estable',
      'rutas_del_valle_organizadas',
      'menos_presion_sindical',
      'pasajeros_poder_adquisitivo_alto'
    ],
    high_risk_routes: [
      // Muy pocas rutas de alto riesgo
      'av_universidad_insurgentes'
    ],
    red_flag_indicators: [
      'competencia_moderada_insurgentes',
      'regulaciones_del_valle',
      'estacionamientos_limitados_corporativo'
    ]
  }
};

// ===== ESTADO DE MÉXICO =====
export const EDOMEX_GEOGRAPHIC_SCORING: Record<string, GeographicRiskFactors> = {
  // MUNICIPIOS DE ALTÍSIMO RIESGO (0-25 pts)
  'ecatepec': {
    municipality: 'Ecatepec de Morelos',
    state: 'edomex',
    score: 15,
    extortion_risk: 0.95,
    political_pressure: 0.8,
    crime_incidence: 0.95,
    route_stability: 0.1,
    corruption_level: 0.9,
    syndicate_control: 0.95,
    factors: [
      'grupos_delictivos_controlan_rutas',
      'cobros_piso_sistemicos',
      'asesinatos_transportistas',
      'impunidad_total_autoridades',
      'rutas_modificadas_violencia'
    ],
    high_risk_routes: [
      'av_central_ecatepec',
      'via_morelos_completa',
      'av_revolucion_ecatepec',
      'rutas_valle_aragon',
      'accesos_ciudad_azteca'
    ],
    red_flag_indicators: [
      'pagos_semanales_superiores_5000_pesos',
      'miedo_extremo_hablar_situacion',
      'familiares_amenazados',
      'cambios_constantes_ruta_violencia',
      'conocimiento_grupos_delictivos_local',
      'unidades_robadas_anteriormente'
    ]
  },
  'nezahualcoyotl': {
    municipality: 'Nezahualcóyotl',
    state: 'edomex', 
    score: 20,
    extortion_risk: 0.9,
    political_pressure: 0.7,
    crime_incidence: 0.8,
    route_stability: 0.2,
    corruption_level: 0.8,
    syndicate_control: 0.8,
    factors: [
      'valle_aragon_extorsion_alta',
      'benito_juarez_rutas_peligrosas',
      'presion_vecinal_excesiva',
      'robos_unidades_frecuentes'
    ],
    high_risk_routes: [
      'av_valle_aragon',
      'av_benito_juarez_neza',
      'eje_6_bordo_xochiaca',
      'av_chimalhuacan_texcoco'
    ],
    red_flag_indicators: [
      'extorsion_valle_aragon',
      'problemas_benito_juarez',
      'presion_colonias_populares',
      'inseguridad_bordo_xochiaca'
    ]
  },
  'chimalhuacan': {
    municipality: 'Chimalhuacán',
    state: 'edomex',
    score: 18,
    extortion_risk: 0.9,
    political_pressure: 0.8,
    crime_incidence: 0.9,
    route_stability: 0.15,
    corruption_level: 0.85,
    syndicate_control: 0.9,
    factors: [
      'una_rutas_mas_peligrosas_edomex',
      'control_total_grupos_delictivos',
      'transportistas_desaparecidos',
      'autoridades_complicadas_delincuencia'
    ],
    high_risk_routes: [
      'av_acuitlapilco_chimalhuacan',
      'rutas_cerro_chimalhuachi',
      'av_texcoco_chimalhuacan',
      'accesos_ciudad_pantitlan'
    ],
    red_flag_indicators: [
      'transportistas_desaparecidos_area',
      'pagos_piso_excesivos',
      'control_criminal_rutas',
      'miedo_extremo_autoridades',
      'familiares_relocalizados_violencia'
    ]
  },

  // MUNICIPIOS DE ALTO RIESGO (26-40 pts) 
  'tlalnepantla': {
    municipality: 'Tlalnepantla',
    state: 'edomex',
    score: 35,
    extortion_risk: 0.7,
    political_pressure: 0.6,
    crime_incidence: 0.7,
    route_stability: 0.4,
    corruption_level: 0.7,
    syndicate_control: 0.7,
    factors: [
      'av_gustavo_baz_conflictiva',
      'problemas_sindicales_constantes',
      'rutas_industrial_vallejo',
      'extorsion_moderada_autoridades'
    ],
    high_risk_routes: [
      'av_gustavo_baz_completa',
      'periferica_norte_tlalne',
      'av_mario_colin_industrial',
      'rutas_refineria_pemex'
    ],
    red_flag_indicators: [
      'problemas_gustavo_baz',
      'conflictos_sindicales_pemex',
      'pagos_extra_zona_industrial',
      'competencia_excesiva_refineria'
    ]
  },
  'naucalpan': {
    municipality: 'Naucalpan',
    state: 'edomex',
    score: 38,
    extortion_risk: 0.6,
    political_pressure: 0.7,
    crime_incidence: 0.6,
    route_stability: 0.5,
    corruption_level: 0.7,
    syndicate_control: 0.6,
    factors: [
      'periferico_norte_problemas_constantes',
      'bloqueos_sindicales_frecuentes',
      'rutas_ciudad_satelite_saturadas',
      'presion_politica_municipal'
    ],
    high_risk_routes: [
      'periferica_boulevard_naucalpan',
      'av_lomas_verdes',
      'rutas_ciudad_satelite',
      'acceso_tecamachalco_lomas'
    ],
    red_flag_indicators: [
      'bloqueos_periferico_sindicales',
      'saturacion_ciudad_satelite',
      'presion_municipal_permisos',
      'problemas_lomas_tecamachalco'
    ]
  },

  // MUNICIPIOS DE BAJO RIESGO (61-85 pts)
  'cuautitlan_izcalli': {
    municipality: 'Cuautitlán Izcalli',
    state: 'edomex',
    score: 75,
    extortion_risk: 0.3,
    political_pressure: 0.3,
    crime_incidence: 0.4,
    route_stability: 0.8,
    corruption_level: 0.4,
    syndicate_control: 0.3,
    factors: [
      'rutas_obreras_estables',
      'menos_presion_sindical',
      'zona_industrial_ordenada',
      'autoridades_cooperativas'
    ],
    high_risk_routes: [
      // Pocas rutas problemáticas
      'av_jose_lopez_portillo_saturada'
    ],
    red_flag_indicators: [
      'saturacion_lopez_portillo',
      'competencia_moderada_obreras',
      'horarios_pico_complicados'
    ]
  },
  'huixquilucan': {
    municipality: 'Huixquilucan',
    state: 'edomex',
    score: 85,
    extortion_risk: 0.2,
    political_pressure: 0.2,
    crime_incidence: 0.2,
    route_stability: 0.9,
    corruption_level: 0.2,
    syndicate_control: 0.1,
    factors: [
      'zona_residencial_alto_nivel',
      'pasajeros_solventes',
      'rutas_estables_seguras',
      'autoridades_eficientes',
      'menos_competencia_destructiva'
    ],
    high_risk_routes: [
      // Prácticamente sin rutas de alto riesgo
    ],
    red_flag_indicators: [
      'competencia_moderada_lomas',
      'regulaciones_estrictas_residencial',
      'acceso_limitado_fraccionamientos'
    ]
  }
};

// ===== SCORING ALGORITHM =====
export function calculateGeographicRiskScore(municipality: string, state: string): GeographicRiskFactors | null {
  const municipalityKey = municipality.toLowerCase().replace(/\s+/g, '_');
  
  if (state === 'cdmx') {
    return CDMX_GEOGRAPHIC_SCORING[municipalityKey] || null;
  }
  
  if (state === 'edomex') {
    return EDOMEX_GEOGRAPHIC_SCORING[municipalityKey] || null;
  }
  
  // Default for non-implemented municipalities
  return {
    municipality,
    state: state as any,
    score: 50, // Neutral score
    extortion_risk: 0.5,
    political_pressure: 0.5,
    crime_incidence: 0.5,
    route_stability: 0.5,
    corruption_level: 0.5,
    syndicate_control: 0.5,
    factors: ['municipality_not_evaluated'],
    high_risk_routes: [],
    red_flag_indicators: ['require_manual_evaluation']
  };
}

// Variant with route-level overrides
export function calculateGeographicRiskScoreWithRoutes(
  municipality: string,
  state: string,
  routes: string[]
): GeographicRiskFactors | null {
  const base = calculateGeographicRiskScore(municipality, state);
  if (!base) return null;
  return applyRouteOverrides(base, routes || []);
}

// Backwards-compatible helper for a single route string
export function calculateGeographicRiskScoreWithRoute(
  municipality: string,
  state: string,
  route?: string
): GeographicRiskFactors | null {
  const routes = route ? [route] : [];
  return calculateGeographicRiskScoreWithRoutes(municipality, state, routes);
}

// Optional: route-level overrides (0-100). Keyed by `Municipio-RouteName` normalized
const ROUTE_OVERRIDES: Record<string, number> = {
  // Ejemplos: penalizar corredores críticos
  'ecatepec-indios_verdes': 40,
  'nezahualcoyotl-pantitlan': 35,
};

function normalizeKey(municipality: string, route?: string) {
  const mk = (municipality || '').toLowerCase().replace(/\s+/g, '_');
  const rk = (route || '').toLowerCase().replace(/\s+/g, '_');
  return `${mk}-${rk}`;
}

export function calculateGeographicRiskScoreWithRoute(
  municipality: string,
  state: string,
  route?: string
): GeographicRiskFactors | null {
  const base = calculateGeographicRiskScore(municipality, state);
  if (!base) return null;
  if (!route) return base;
  const key = normalizeKey(municipality, route);
  const override = ROUTE_OVERRIDES[key];
  if (typeof override === 'number') {
    return { ...base, score: override };
  }
  return base;
}

// ===== RED FLAGS DETECTION =====
export interface GeographicRedFlag {
  type: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  indicator: string;
  description: string;
  impact_on_credit: string;
  recommended_action: string;
}

export function detectGeographicRedFlags(
  municipality: string, 
  state: string,
  routes: string[],
  weeklyPayments?: number
): GeographicRedFlag[] {
  const geoData = calculateGeographicRiskScore(municipality, state);
  if (!geoData) return [];

  const redFlags: GeographicRedFlag[] = [];

  // Critical risk municipalities
  if (geoData.score <= 25) {
    redFlags.push({
      type: 'CRITICAL',
      indicator: 'EXTREME_RISK_MUNICIPALITY',
      description: `Municipio de riesgo crítico: ${municipality}. Score: ${geoData.score}/100`,
      impact_on_credit: 'Rechazar automáticamente o requerir garantías extraordinarias',
      recommended_action: 'NO-GO automático o garantías líquidas >80% del crédito'
    });
  }

  // High weekly payments indicator
  if (weeklyPayments && weeklyPayments > 3000) {
    redFlags.push({
      type: 'CRITICAL', 
      indicator: 'EXCESSIVE_WEEKLY_PAYMENTS',
      description: `Pagos semanales excesivos: $${weeklyPayments}. Indica extorsión sistemática`,
      impact_on_credit: 'Riesgo de incapacidad de pago por extorsión',
      recommended_action: 'Investigar origen de pagos, posible NO-GO'
    });
  }

  // High-risk routes detection
  const operatesHighRiskRoutes = routes.some(route => 
    geoData.high_risk_routes.some(riskRoute => 
      route.toLowerCase().includes(riskRoute.replace(/_/g, ' '))
    )
  );

  if (operatesHighRiskRoutes) {
    redFlags.push({
      type: 'HIGH',
      indicator: 'HIGH_RISK_ROUTES',
      description: `Opera en rutas de alto riesgo: ${municipality}`,
      impact_on_credit: 'Incrementar tasa por riesgo operativo',
      recommended_action: 'Evaluar capacidad de pago considerando gastos de seguridad'
    });
  }

  // Syndicate control indicator
  if (geoData.syndicate_control >= 0.8) {
    redFlags.push({
      type: 'HIGH',
      indicator: 'HIGH_SYNDICATE_CONTROL',
      description: `Control sindical excesivo en ${municipality}`,
      impact_on_credit: 'Riesgo de pagos forzosos que afecten capacidad de pago',
      recommended_action: 'Validar ingresos netos reales descontando pagos sindicales'
    });
  }

  return redFlags;
}

// ===== GEOGRAPHIC SCORING EXPORT =====
export const GEOGRAPHIC_SCORING_CONFIG = {
  total_municipalities_evaluated: Object.keys(CDMX_GEOGRAPHIC_SCORING).length + Object.keys(EDOMEX_GEOGRAPHIC_SCORING).length,
  risk_categories: {
    'CRITICAL_RISK': '0-25 points',
    'HIGH_RISK': '26-40 points', 
    'MEDIUM_RISK': '41-60 points',
    'LOW_RISK': '61-85 points',
    'MINIMAL_RISK': '86-100 points'
  },
  hase_weight: 0.2, // 20% of total HASE score
  last_updated: '2024-12-11',
  data_sources: [
    'INEGI Crime Statistics 2023',
    'Mexico City Transport Authority',
    'Estado de Mexico Transport Commission',
    'Transport Union Reports',
    'Field Research Transportistas 2023-2024'
  ]
};
