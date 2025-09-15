/**
 * 🚀 Production Endpoints Configuration
 * Enterprise-ready BFF endpoints activation for staging/production
 */

export interface EndpointConfig {
  enabled: boolean;
  url: string;
  timeout: number;
  retries: number;
  rateLimit?: number;
  apiKey?: string;
  webhookSecret?: string;
}

export interface ProductionConfig {
  environment: 'development' | 'staging' | 'production';
  endpoints: {
    odoo: EndpointConfig;
    conekta: EndpointConfig;
    mifiel: EndpointConfig;
    metamap: EndpointConfig;
    gnv: EndpointConfig;
  };
  features: {
    webhookRetry: boolean;
    neonPersistence: boolean;
    performanceMonitoring: boolean;
    rateLimiting: boolean;
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
      idleTimeoutMillis: number;
    };
  };
}

// 🎯 PRODUCTION-READY CONFIGURATION
export const productionConfig: ProductionConfig = {
  environment: (process.env.NODE_ENV as any) || 'development',
  
  endpoints: {
    // 🏭 Odoo ERP Integration
    odoo: {
      enabled: true, // ✅ ACTIVATED FOR PRODUCTION
      url: process.env.ODOO_BASE_URL || 'https://api.conductores-erp.com',
      timeout: 30000, // 30 seconds
      retries: 3,
      rateLimit: 100, // requests per minute
      apiKey: process.env.ODOO_API_KEY,
    },

    // 💳 Conekta Payment Processing  
    conekta: {
      enabled: true, // ✅ ACTIVATED FOR PRODUCTION
      url: process.env.CONEKTA_API_URL || 'https://api.conekta.io',
      timeout: 15000, // 15 seconds
      retries: 5, // Payment critical
      rateLimit: 200,
      apiKey: process.env.CONEKTA_PRIVATE_KEY,
      webhookSecret: process.env.CONEKTA_WEBHOOK_SECRET,
    },

    // 📝 Mifiel Digital Signatures
    mifiel: {
      enabled: true, // ✅ ACTIVATED FOR PRODUCTION  
      url: process.env.MIFIEL_API_URL || 'https://api.mifiel.com',
      timeout: 45000, // 45 seconds (document processing)
      retries: 3,
      rateLimit: 50,
      apiKey: process.env.MIFIEL_API_KEY,
      webhookSecret: process.env.MIFIEL_WEBHOOK_SECRET,
    },

    // 🔍 MetaMap KYC Verification
    metamap: {
      enabled: true, // ✅ ACTIVATED FOR PRODUCTION
      url: process.env.METAMAP_API_URL || 'https://api.metamap.com',
      timeout: 30000,
      retries: 3,
      rateLimit: 100,
      apiKey: process.env.METAMAP_API_KEY,
      webhookSecret: process.env.METAMAP_WEBHOOK_SECRET,
    },

    // ⛽ GNV Health Monitoring
    gnv: {
      enabled: true, // ✅ ACTIVATED FOR PRODUCTION
      url: process.env.GNV_API_URL || 'https://api.gnv-health.com',
      timeout: 20000,
      retries: 7, // Critical for health monitoring
      rateLimit: 300, // High frequency health checks
      apiKey: process.env.GNV_API_KEY,
      webhookSecret: process.env.GNV_WEBHOOK_SECRET,
    },
  },

  features: {
    webhookRetry: true,
    neonPersistence: true,
    performanceMonitoring: true,
    rateLimiting: true,
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/conductores_pwa',
    pool: {
      min: 5,
      max: 20,
      idleTimeoutMillis: 30000,
    },
  },
};

// 🧪 STAGING CONFIGURATION (less aggressive)
export const stagingConfig: ProductionConfig = {
  ...productionConfig,
  environment: 'staging',
  
  endpoints: {
    ...productionConfig.endpoints,
    
    // Staging URLs
    odoo: {
      ...productionConfig.endpoints.odoo,
      url: process.env.ODOO_STAGING_URL || 'https://staging-api.conductores-erp.com',
      retries: 2,
    },
    
    conekta: {
      ...productionConfig.endpoints.conekta,
      url: 'https://api.conekta.io', // Conekta has test/live keys
      retries: 3,
    },
    
    mifiel: {
      ...productionConfig.endpoints.mifiel,
      url: process.env.MIFIEL_STAGING_URL || 'https://api-staging.mifiel.com',
      timeout: 30000,
    },
    
    metamap: {
      ...productionConfig.endpoints.metamap,
      url: process.env.METAMAP_STAGING_URL || 'https://api-staging.metamap.com',
      retries: 2,
    },
    
    gnv: {
      ...productionConfig.endpoints.gnv,
      url: process.env.GNV_STAGING_URL || 'https://staging-api.gnv-health.com',
      retries: 5,
    },
  },
};

// 🛠️ DEVELOPMENT CONFIGURATION (mocked/disabled)
export const developmentConfig: ProductionConfig = {
  ...productionConfig,
  environment: 'development',
  
  endpoints: {
    odoo: { ...productionConfig.endpoints.odoo, enabled: false },
    conekta: { ...productionConfig.endpoints.conekta, enabled: false },
    mifiel: { ...productionConfig.endpoints.mifiel, enabled: false },
    metamap: { ...productionConfig.endpoints.metamap, enabled: false },
    gnv: { ...productionConfig.endpoints.gnv, enabled: false },
  },
  
  features: {
    ...productionConfig.features,
    performanceMonitoring: false,
    rateLimiting: false,
  },
};

// 📊 Get current configuration based on environment
export function getCurrentConfig(): ProductionConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    default:
      return developmentConfig;
  }
}

// 🔒 Validate configuration on startup
export function validateConfig(config: ProductionConfig): void {
  const requiredEnvVars: string[] = [];
  
  if (config.endpoints.odoo.enabled && !config.endpoints.odoo.apiKey) {
    requiredEnvVars.push('ODOO_API_KEY');
  }
  
  if (config.endpoints.conekta.enabled && !config.endpoints.conekta.apiKey) {
    requiredEnvVars.push('CONEKTA_PRIVATE_KEY');
  }
  
  if (config.endpoints.mifiel.enabled && !config.endpoints.mifiel.apiKey) {
    requiredEnvVars.push('MIFIEL_API_KEY');
  }
  
  if (config.endpoints.metamap.enabled && !config.endpoints.metamap.apiKey) {
    requiredEnvVars.push('METAMAP_API_KEY');
  }
  
  if (config.endpoints.gnv.enabled && !config.endpoints.gnv.apiKey) {
    requiredEnvVars.push('GNV_API_KEY');
  }
  
  if (requiredEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${requiredEnvVars.join(', ')}`);
  }
}

// 🎯 Export current config for use in services
export const config = getCurrentConfig();

// Validate on module load
try {
  validateConfig(config);
  console.log(`✅ BFF Configuration loaded for ${config.environment} environment`);
  console.log(`📡 Active endpoints: ${Object.entries(config.endpoints)
    .filter(([, endpoint]) => endpoint.enabled)
    .map(([name]) => name)
    .join(', ')}`);
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  
  if (config.environment === 'production') {
    process.exit(1); // Fail fast in production
  } else {
    console.warn('⚠️ Running with incomplete configuration in development mode');
  }
}