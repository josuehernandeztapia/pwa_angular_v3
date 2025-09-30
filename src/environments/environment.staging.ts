export const environment = {
  production: true,
  apiUrl: 'https://bff-staging.conductores.com/api',
  appName: 'Conductores PWA (Staging)',
  version: '1.0.0-stg',
  
  // BFF API maps (new)
  api: {
    flows: '/bff/flows',
    postventa: '/bff/postventa',
    quotes: '/bff/odoo/quotes',
    users: '/bff/users',
    labs: '/bff/lab'
  },

  features: {
    enableMockData: false,
    enableAnalytics: true,
    enablePushNotifications: true,
    enableOfflineMode: true,
    enableDocumentValidationMock: false,
    forceOfflineQueueMock: false,
    enableAVISystem: true,
    enableVoiceRecording: true,
    enableStressDetection: true,
    enablePostSalesWizard: true,
    enableDevKpi: true,
    enablePostSalesAddToQuote: true,
    enableOdooQuoteBff: true,
    enableGnvBff: true,
    enableTandaLab: false,
    enableRemoteConfig: false,
    enableConfigShadowMode: false,
    enablePerfConfig: true,
    enableUiMessages: true,
    enableValidationConfig: true,
    enableFinancialRates: true,
    enableCatalogConfig: true,
    enableLocalizationConfig: true,
    enableIntegrationsConfig: true,
    enableAdminConfig: true,
    enableUsageModule: false,
    enableGlobalSearch: true,
    enableSecurityConfig: true,
    // Integrations (BFF) flags
    enableKycBff: true,
    enablePaymentsBff: true,
    enableContractsBff: true,
    enableAutomationBff: true,
    enableAviMicroLocalBff: true,
    // New parity flags (staging enabled)
    enableLabs: true,
    enablePostventa: true,
    enableClaimsModule: true,
    enablePostSaleBff: false,
    enableClaimsBff: false,
    enableAdminBff: false,
    enableFlowBuilder: true,
    enablePerfil: true,
    enableQaTools: true
  },
  // Optional overrides for BFF base URLs per integration
  integrations: {
    odoo: { baseUrl: '' },
    gnv: { baseUrl: '' },
    kyc: { baseUrl: '' },
    payments: { baseUrl: '' },
    contracts: { baseUrl: '' },
    automation: { baseUrl: '' }
  },
  // External services (staging safe defaults)
  services: {
    metamap: {
      clientId: '',
      flowId: '',
      baseUrl: 'https://api.metamap.com'
    },
    conekta: {
      publicKey: '',
      baseUrl: 'https://api.conekta.io'
    },
    mifiel: {
      appId: '',
      baseUrl: 'https://sandbox.mifiel.com/api/v1'
    }
  },
  endpoints: {
    auth: '/auth',
    clients: '/clients',
    quotes: '/quotes',
    scenarios: '/scenarios',
    documents: '/documents',
    payments: '/payments',
    reports: '/reports'
  },
  analytics: {
    eventsEndpoint: 'analytics/events',
    metricsEndpoint: 'analytics/metrics',
    flushIntervalMs: 12000
  },
  monitoring: {
    eventsEndpoint: 'monitoring/events',
    datadogEndpoint: 'monitoring/datadog',
    slackWebhook: ''
  },
  // Finance config required by several components/services
  finance: {
    irrToleranceBps: 50,
    minPaymentRatio: 0.5,
    irrTargets: {
      bySku: {
        'H6C_STD': 0.255,
        'H6C_PREMIUM': 0.299
      },
      byEcosystem: {},
      byCollective: {
        'colectivo_edomex_01': 0.305
      }
    },
    riskPremiums: {
      byEcosystem: {}
    },
    tandaCaps: {
      rescueCapPerMonth: 1.0,
      freezeMaxPct: 0.2,
      freezeMaxMonths: 2,
      activeThreshold: 0.8
    }
  }
};
