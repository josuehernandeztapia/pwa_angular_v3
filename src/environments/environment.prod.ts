export const environment = {
  production: true,
  apiUrl: 'https://api.conductores-pwa.com/v1',
  appName: 'Conductores PWA',
  version: '1.0.0',
  
  // Feature flags for production
  features: {
    enableMockData: false,
    enableAnalytics: true,
    enablePushNotifications: true,
    enableOfflineMode: true,
    enablePostSalesWizard: false,
    // LAB/Backoffice visibility (oculto por defecto en prod)
    enableTandaLab: false,
    // Dynamic configuration flags
    enableRemoteConfig: true,
    enableConfigShadowMode: false,
    enablePerfConfig: true,
    enableUiMessages: true,
    enableValidationConfig: true,
    enableFinancialRates: true,
    enableCatalogConfig: true,
    enableLocalizationConfig: true,
    enableIntegrationsConfig: true,
    enableSecurityConfig: true
  },

  // Dynamic configuration base paths
  config: {
    assetsBasePath: '/assets/config',
    remoteBaseUrl: process.env['CONFIG_REMOTE_BASE_URL'] || ''
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

  // External services - production keys
  services: {
    metamap: {
      clientId: process.env['METAMAP_CLIENT_ID'] || '',
      flowId: process.env['METAMAP_FLOW_ID'] || '',
      baseUrl: 'https://api.metamap.com'
    },
    conekta: {
      publicKey: process.env['CONEKTA_PUBLIC_KEY'] || '',
      baseUrl: 'https://api.conekta.io'
    },
    mifiel: {
      appId: process.env['MIFIEL_APP_ID'] || '',
      baseUrl: 'https://api.mifiel.com/api/v1'
    }
  },

  // Timeouts and limits
  timeouts: {
    api: 30000,
    fileUpload: 120000,
    auth: 15000
  },

  storage: {
    prefix: 'conductores_pwa_',
    version: '1.0'
  },
  finance: {
    irrToleranceBps: Number(process.env['IRR_TOLERANCE_BPS'] || 50),
    irrTargets: {
      bySku: {
        // Puede configurarse vía remote config o build-time
      },
      byEcosystem: {
        // Configurable por ruta/ecosistema
      },
      byCollective: {
      }
    },
    riskPremiums: {
      byEcosystem: {
        // 'ruta-centro-edomex': Number(process.env['RISK_PREMIUM_RUTA_CENTRO_EDOMEX_BPS'] || 0)
      }
    },
    tandaCaps: {
      rescueCapPerMonth: Number(process.env['TANDA_RESCUE_CAP_PER_MONTH'] || 1.0),
      freezeMaxPct: Number(process.env['TANDA_FREEZE_MAX_PCT'] || 0.2),
      freezeMaxMonths: Number(process.env['TANDA_FREEZE_MAX_MONTHS'] || 2),
      activeThreshold: Number(process.env['TANDA_ACTIVE_THRESHOLD'] || 0.8)
    }
  }
};
