export const environment = {
  production: false,
  get apiUrl() { return 'http://localhost:3000/api'; },
  appName: 'Conductores PWA',
  version: '1.0.0',
  
  // BFF API maps (new)
  api: {
    flows: '/bff/flows',
    postventa: '/bff/postventa',
    quotes: '/bff/odoo/quotes',
    users: '/bff/users',
    labs: '/bff/lab'
  },
  
  // Feature flags
  features: {
    enableMockData: true,
    enableAnalytics: false,
    enablePushNotifications: true,
    enableOfflineMode: true,
    enableAVISystem: true,
    enableVoiceRecording: true,
    enableStressDetection: true,
    // Post-venta Wizard 4 fotos (feature flag)
    enablePostSalesWizard: true,
    // Dev mini KPIs panel
    enableDevKpi: true,
    // Post-venta: Chips "Agregar a cotización" (dev only)
    enablePostSalesAddToQuote: true,
    // Integraciones BFF (activar cuando haya backend real)
    enableOdooQuoteBff: false,
    // ⛽ P0.2 SURGICAL FIX - GNV T+1 BFF Activation
    enableGnvBff: true,
    // 🛡️ P0.2 SURGICAL FIX - KIBAN/HASE System Activation
    enableKibanHase: true,
    enableRiskEvaluation: true,
    enableRiskPanel: true,
    enableRiskPersistence: true,
    // LAB/Backoffice visibility
    enableTandaLab: true,
    // Dynamic configuration flags
    enableRemoteConfig: false,
    enableConfigShadowMode: false,
    enablePerfConfig: false,
    enableUiMessages: false,
    enableValidationConfig: false,
    enableFinancialRates: false,
    enableCatalogConfig: false,
    enableLocalizationConfig: false,
    enableIntegrationsConfig: false,
    enableAdminConfig: true,
    enableSecurityConfig: false,
    // Integrations (BFF) flags
    enableKycBff: false,
    enablePaymentsBff: false,
    enableContractsBff: false,
    enableAutomationBff: false,
    // 🛡️ KIBAN/HASE BFF activation
    enableRiskBff: true,
    // 🚚 P0.2 SURGICAL FIX - Delivery Tracking BFF
    enableDeliveryBff: true,
    // New feature flags for parity
    enableLabs: true,
    enablePostventa: true,
    enableFlowBuilder: true,
    enablePerfil: true
  },

  // Dynamic configuration base paths
  config: {
    assetsBasePath: '/assets/config',
    remoteBaseUrl: '' // e.g. 'https://config.conductores.mx/config'
  },
  // Integrations base URLs (optional overrides)
  integrations: {
    odoo: { baseUrl: '' },
    gnv: { baseUrl: '' },
    kyc: { baseUrl: '' },
    payments: { baseUrl: '' },
    contracts: { baseUrl: '' },
    automation: { baseUrl: '' }
  },

  // AVI System Configuration
  avi: {
    maxRecordingDuration: 300000, // 5 minutos máximo por respuesta
    autoStopBuffer: 1.5, // Factor de buffer para auto-detener grabación
    confidenceThreshold: 0.7, // Umbral mínimo de confianza
    stressDetectionEnabled: true,
    voiceAnalysisEnabled: true,
    realTimeTranscription: true,
    supportedLanguages: ['es', 'es-MX'],
    defaultLanguage: 'es',
    
    // CALIBRACIÓN QUIRÚRGICA - Quick-fix conservador
    decisionProfile: 'conservative', // 'conservative' | 'permissive'
    thresholds: {
      conservative: {
        GO_MIN: 0.78,    // ↑ más estricto (antes 0.75)
        NOGO_MAX: 0.55   // ↑ más estricto (antes 0.54)
      },
      permissive: {
        GO_MIN: 0.75,
        NOGO_MAX: 0.50
      }
    },
    
    // Pesos por categoría de preguntas (α,β,γ,δ)
    categoryWeights: {
      // Categorías de ALTO riesgo de evasión
      highEvasion: { a: 0.15, b: 0.25, c: 0.25, d: 0.35 }, // ↑γ léxico
      // Categorías normales
      normal: { a: 0.20, b: 0.25, c: 0.15, d: 0.40 }
    },
    
    // Z-score para timing (pausas)
    timing: {
      sigmaRatio: 0.45 // ↑ menos penalización por reflexión (antes 0.35)
    },
    
    // Lexical Likelihood Ratio boosts
    lexicalBoosts: {
      evasiveTokensMultiplier: 1.5, // Boost para tokens evasivos críticos
      evasiveTokens: [
        'no sé', 'eso no existe', 'no me hablas', 'qué me hablas',
        'no recuerdo exacto', 'eso no aplica', 'ya casi', 'no pasa aquí',
        'eso no es así', 'no conozco eso'
      ]
    }
  },

  // API endpoints configuration
  endpoints: {
    auth: '/auth',
    clients: '/clients',
    quotes: '/quotes',
    scenarios: '/scenarios',
    documents: '/documents',
    payments: '/payments',
    reports: '/reports'
  },

  // External services
  services: {
    metamap: {
      clientId: 'your-metamap-client-id',
      flowId: 'your-metamap-flow-id',
      baseUrl: 'https://api.metamap.com'
    },
    conekta: {
      publicKey: 'key_your-conekta-public-key',
      baseUrl: 'https://api.conekta.io'
    },
    mifiel: {
      appId: 'your-mifiel-app-id',
      baseUrl: 'https://sandbox.mifiel.com/api/v1'
    },
    openai: {
      apiKey: 'YOUR_OPENAI_API_KEY_HERE',
      baseUrl: 'https://api.openai.com/v1',
      models: {
        transcription: 'gpt-4o-transcribe',
        fallback: 'whisper-1'
      }
    }
  },

  // Timeouts and limits
  timeouts: {
    api: 30000, // 30 seconds
    fileUpload: 120000, // 2 minutes
    auth: 15000 // 15 seconds
  },

  storage: {
    prefix: 'conductores_pwa_',
    version: '1.0'
  },
  finance: {
    irrToleranceBps: 50, // 0.50% tolerancia por defecto para IRR vs contrato
    minPaymentRatio: 0.5, // PMT' mínimo como % de PMT original (política)
    // Targets de IRR por producto/colectivo (fallback a mercado)
    irrTargets: {
      bySku: {
        // Ejemplos (valores anuales como fracción):
        'H6C_STD': 0.255,
        'H6C_PREMIUM': 0.299
      },
      byEcosystem: {
        // Targets por ruta/ecosistema (ejemplos):
        // 'ruta-centro-edomex': 0.305
      },
      byCollective: {
        // Ejemplo:
        'colectivo_edomex_01': 0.305
      }
    },
    // Premiums de riesgo (bps) por ecosistema/ruta u otras dimensiones
    riskPremiums: {
      byEcosystem: {
        // 'ruta-centro-edomex': 25 // = +0.25% anual
      }
    },
    tandaCaps: {
      rescueCapPerMonth: 1.0,   // hasta 1x la aportación mensual del grupo por mes
      freezeMaxPct: 0.2,        // hasta 20% de miembros congelados simultáneamente
      freezeMaxMonths: 2,       // máximo 2 meses de congelamiento por miembro
      activeThreshold: 0.8      // se permite entregar si >=80% activos
    }
  }
};
