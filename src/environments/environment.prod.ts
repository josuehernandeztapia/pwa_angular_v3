import { createEnvironment } from './environment.base';

export const environment = createEnvironment({
  production: true,
  apiUrl: 'https://api.conductores-pwa.com/v1',
  appName: 'Conductores PWA',
  version: '1.0.0',
  features: {
    enableMockData: false,
    enableAnalytics: true,
    enablePushNotifications: true,
    enableOfflineMode: true,
    enableDocumentValidationMock: false,
    forceOfflineQueueMock: false,
    enablePostSalesWizard: false,
    enableDevKpi: false,
    enablePostSalesAddToQuote: false,
    enableOdooQuoteBff: true,
    enableGnvBff: true,
    enableTandaLab: false,
    enableRemoteConfig: true,
    enableConfigShadowMode: false,
    enablePerfConfig: true,
    enableUiMessages: true,
    enableValidationConfig: true,
    enableFinancialRates: true,
    enableCatalogConfig: true,
    enableLocalizationConfig: true,
    enableIntegrationsConfig: true,
    enableSecurityConfig: true,
    enableKycBff: true,
    enablePaymentsBff: true,
    enableContractsBff: true,
    enableAutomationBff: true,
    enableAviMicroLocalBff: true,
    enableLabs: false,
    enablePostventa: false,
    enableClaimsModule: false,
    enableFlowBuilder: true,
    enablePostSaleBff: false,
    enableClaimsBff: false,
    enableAdminBff: false,
    enablePerfil: true,
    enableQaTools: false,
    enableUsageModule: false,
    enableGlobalSearch: false
  },
  config: {
    assetsBasePath: '/assets/config',
    remoteBaseUrl: process.env['CONFIG_REMOTE_BASE_URL'] || ''
  },
  integrations: {
    odoo: { baseUrl: '' },
    gnv: { baseUrl: '' },
    kyc: { baseUrl: '' },
    payments: { baseUrl: '' },
    contracts: { baseUrl: '' },
    automation: { baseUrl: '' }
  },
  analytics: {
    eventsEndpoint: 'analytics/events',
    metricsEndpoint: 'analytics/metrics',
    flushIntervalMs: 10000
  },
  monitoring: {
    eventsEndpoint: 'monitoring/events',
    datadogEndpoint: 'monitoring/datadog',
    slackWebhook: process.env['SLACK_MONITORING_WEBHOOK'] || ''
  },
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
  timeouts: {
    api: 30000,
    fileUpload: 120000,
    auth: 15000
  },
  finance: {
    irrToleranceBps: Number(process.env['IRR_TOLERANCE_BPS'] || 50),
    minPaymentRatio: Number(process.env['MIN_PAYMENT_RATIO'] || 0.5),
    irrTargets: {
      bySku: {},
      byEcosystem: {},
      byCollective: {}
    },
    riskPremiums: {
      byEcosystem: {}
    },
    tandaCaps: {
      rescueCapPerMonth: Number(process.env['TANDA_RESCUE_CAP_PER_MONTH'] || 1.0),
      freezeMaxPct: Number(process.env['TANDA_FREEZE_MAX_PCT'] || 0.2),
      freezeMaxMonths: Number(process.env['TANDA_FREEZE_MAX_MONTHS'] || 2),
      activeThreshold: Number(process.env['TANDA_ACTIVE_THRESHOLD'] || 0.8)
    }
  }
});
