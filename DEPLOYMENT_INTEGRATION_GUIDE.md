# 🚀 DEPLOYMENT & INTEGRATION GUIDE
# Production Setup & API Integration Manual

**System:** Conductores PWA Angular System  
**Target:** Production Deployment Team  
**Scope:** Complete deployment and integration procedures  

---

## 🎯 DEPLOYMENT OVERVIEW

### Infrastructure Requirements

| Component | Minimum Specs | Recommended | Purpose |
|-----------|---------------|-------------|---------|
| Frontend CDN | Global distribution | CloudFlare/AWS CloudFront | Static asset delivery |
| API Server | 4 vCPU, 8GB RAM | 8 vCPU, 16GB RAM | Backend API services |
| Database | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM | Client data storage |
| Redis Cache | 1GB memory | 4GB memory | Session & config cache |
| File Storage | 100GB SSD | 500GB SSD | Document storage |

### Technology Stack

```yaml
Frontend:
  - Angular 17 (Standalone Components)
  - TypeScript 5.4.2
  - SCSS styling
  - PWA with service worker
  - Firebase Authentication

Backend Services:
  - Node.js/Express (assumed)
  - Firebase Firestore
  - Redis for caching
  - File storage (AWS S3/Google Cloud)

External Integrations:
  - Kinban API (Credit bureau)
  - HASE API (Financial services)
  - Metamap (KYC verification)
  - OpenAI Whisper (Voice processing)
  - Mifiel (Digital signatures)
  - Conekta (Payments)
```

---

## 🔧 ENVIRONMENT SETUP

### 1. Production Environment Variables

Create `/etc/conductores-pwa/production.env`:

```bash
# Application Configuration
NODE_ENV=production
APP_URL=https://conductores-pwa.com
API_BASE_URL=https://api.conductores-pwa.com
APP_VERSION=1.0.0

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=conductores-pwa.firebaseapp.com
FIREBASE_PROJECT_ID=conductores-pwa
FIREBASE_STORAGE_BUCKET=conductores-pwa.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
FIREBASE_MEASUREMENT_ID=G-ABCDEF1234

# External API Keys
KINBAN_API_URL=https://api.kinban.com/v2
KINBAN_CLIENT_ID=your_kinban_client_id
KINBAN_SECRET=your_kinban_secret_key
KINBAN_TIMEOUT=30000

HASE_API_URL=https://api.hase.mx/v1
HASE_TOKEN=your_hase_api_token
HASE_TIMEOUT=30000

# AI/ML Services
AVI_API_URL=https://api.avi-service.com/v1
AVI_API_KEY=your_avi_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORGANIZATION_ID=your_openai_org_id

# KYC & Document Services
METAMAP_CLIENT_ID=your_metamap_client_id
METAMAP_CLIENT_SECRET=your_metamap_secret
MIFIEL_APP_ID=your_mifiel_app_id
MIFIEL_SECRET=your_mifiel_secret

# Payment Services
CONEKTA_PUBLIC_KEY=your_conekta_public_key
CONEKTA_PRIVATE_KEY=your_conekta_private_key
CONEKTA_WEBHOOK_SECRET=your_webhook_secret

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/conductores_pwa
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=true

# Redis Configuration
REDIS_URL=redis://username:password@host:6379
REDIS_PREFIX=conductores_pwa:
REDIS_TTL=3600

# File Storage
STORAGE_PROVIDER=gcp|aws|azure
GCP_PROJECT_ID=your_gcp_project
GCP_BUCKET_NAME=conductores-pwa-documents
AWS_REGION=us-east-1
AWS_S3_BUCKET=conductores-pwa-documents
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Security & Monitoring
JWT_SECRET=your_jwt_secret_key_min_256_bits
ENCRYPTION_KEY=your_encryption_key_32_bytes
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEWRELIC_LICENSE_KEY=your_newrelic_license

# Email & SMS
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Integration
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_account_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=1000
API_RATE_LIMIT_WINDOW=60000
API_RATE_LIMIT_MAX_REQUESTS=100

# Logging & Debug
LOG_LEVEL=info
DEBUG_FINANCIAL_CALCULATOR=false
DEBUG_AVI_SERVICE=false
DEBUG_STATE_MANAGEMENT=false
```

### 2. Angular Environment Files

**src/environments/environment.prod.ts:**
```typescript
export const environment = {
  production: true,
  appVersion: '1.0.0',
  
  // API Configuration
  apiUrl: 'https://api.conductores-pwa.com',
  apiTimeout: 30000,
  
  // Firebase Configuration
  firebase: {
    apiKey: 'your_firebase_api_key',
    authDomain: 'conductores-pwa.firebaseapp.com',
    projectId: 'conductores-pwa',
    storageBucket: 'conductores-pwa.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef123456',
    measurementId: 'G-ABCDEF1234'
  },
  
  // External Services
  kinban: {
    apiUrl: 'https://api.kinban.com/v2',
    clientId: 'your_kinban_client_id',
    timeout: 30000
  },
  
  hase: {
    apiUrl: 'https://api.hase.mx/v1',
    timeout: 30000
  },
  
  // AI Services
  avi: {
    enabled: true,
    apiUrl: 'https://api.avi-service.com/v1',
    timeout: 30000,
    retryAttempts: 3
  },
  
  // Document Services
  metamap: {
    clientId: 'your_metamap_client_id',
    environment: 'production'
  },
  
  // Payment Services
  conekta: {
    publicKey: 'key_your_conekta_public_key'
  },
  
  // Feature Flags
  features: {
    aviVoiceAnalysis: true,
    documentOCR: true,
    realTimeNotifications: true,
    advancedAnalytics: true,
    multiMarketSupport: true
  },
  
  // Performance Configuration
  caching: {
    enabled: true,
    ttl: 300000, // 5 minutes
    configurationTtl: 900000 // 15 minutes
  },
  
  // Monitoring
  analytics: {
    enabled: true,
    googleAnalyticsId: 'GA-MEASUREMENT-ID',
    sentryDsn: 'https://your-sentry-dsn@sentry.io/project-id'
  },
  
  // PWA Configuration
  pwa: {
    enabled: true,
    updateStrategy: 'registerWhenStable:30000',
    notificationIcon: '/assets/icons/notification-icon.png'
  }
};
```

---

## 📦 BUILD & DEPLOYMENT PROCESS

### 1. Production Build Pipeline

**build-production.sh:**
```bash
#!/bin/bash
set -e

echo "🏗️ Starting production build process..."

# Environment validation
echo "📋 Validating environment..."
if [[ -z "$NODE_ENV" ]]; then
  echo "❌ NODE_ENV not set"
  exit 1
fi

if [[ -z "$FIREBASE_API_KEY" ]]; then
  echo "❌ Firebase configuration missing"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Run tests
echo "🧪 Running tests..."
npm run test:unit:production
npm run test:integration:production

# Security audit
echo "🔒 Running security audit..."
npm audit --audit-level moderate

# Build optimization
echo "🚀 Building for production..."
npm run build:prod:performance

# Bundle analysis
echo "📊 Analyzing bundle size..."
npm run build:analyze

# Size validation
echo "📏 Validating bundle sizes..."
node scripts/validate-bundle-sizes.js

# PWA validation
echo "📱 Validating PWA configuration..."
npm run build:validate-pwa

# Generate build manifest
echo "📄 Generating build manifest..."
node scripts/generate-build-manifest.js

echo "✅ Production build completed successfully!"
```

**validate-bundle-sizes.js:**
```javascript
const fs = require('fs');
const path = require('path');

const BUDGET_LIMITS = {
  'main': 500 * 1024, // 500KB
  'polyfills': 50 * 1024, // 50KB
  'runtime': 10 * 1024, // 10KB
  'vendor': 1024 * 1024, // 1MB
  'styles': 50 * 1024 // 50KB per component
};

function validateBundleSizes() {
  const distPath = path.join(__dirname, '../dist/conductores-pwa');
  const files = fs.readdirSync(distPath);
  
  const violations = [];
  
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.css')) {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      const size = stats.size;
      
      // Determine budget category
      let category;
      if (file.includes('main')) category = 'main';
      else if (file.includes('polyfills')) category = 'polyfills';
      else if (file.includes('runtime')) category = 'runtime';
      else if (file.includes('vendor')) category = 'vendor';
      else if (file.endsWith('.css')) category = 'styles';
      
      if (category && BUDGET_LIMITS[category] && size > BUDGET_LIMITS[category]) {
        violations.push({
          file,
          size,
          limit: BUDGET_LIMITS[category],
          category
        });
      }
    }
  });
  
  if (violations.length > 0) {
    console.error('❌ Bundle size violations:');
    violations.forEach(v => {
      console.error(`  ${v.file}: ${(v.size/1024).toFixed(2)}KB > ${(v.limit/1024).toFixed(2)}KB`);
    });
    process.exit(1);
  }
  
  console.log('✅ All bundles within size limits');
}

validateBundleSizes();
```

### 2. Deployment Scripts

**deploy-production.sh:**
```bash
#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
./scripts/pre-deployment-checks.sh

# Database migrations
echo "💾 Running database migrations..."
npm run db:migrate:production

# Upload static assets to CDN
echo "📤 Uploading static assets..."
aws s3 sync dist/conductores-pwa s3://conductores-pwa-cdn \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "*.html" \
  --exclude "ngsw.json" \
  --exclude "ngsw-worker.js"

# Upload HTML files with short cache
aws s3 sync dist/conductores-pwa s3://conductores-pwa-cdn \
  --cache-control "max-age=300" \
  --include "*.html" \
  --include "ngsw.json" \
  --include "ngsw-worker.js"

# Update CDN invalidation
echo "🔄 Invalidating CDN cache..."
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"

# Deploy backend services
echo "🖥️ Deploying backend services..."
./scripts/deploy-backend.sh

# Run smoke tests
echo "🧪 Running smoke tests..."
npm run test:smoke:production

# Update monitoring
echo "📊 Updating monitoring configuration..."
./scripts/update-monitoring.sh

# Notify team
echo "📢 Notifying deployment completion..."
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H 'Content-type: application/json' \
  --data '{"text":"🚀 Conductores PWA deployed to production successfully!"}'

echo "✅ Production deployment completed!"
```

---

## 🔗 API INTEGRATION GUIDE

### 1. Backend API Structure

**Expected API endpoints for the Angular frontend:**

```yaml
# Authentication Endpoints
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/profile

# Client Management
GET    /api/clients
POST   /api/clients
GET    /api/clients/:id
PUT    /api/clients/:id
DELETE /api/clients/:id

# Opportunity Management
GET    /api/opportunities
POST   /api/opportunities
GET    /api/opportunities/:id
PUT    /api/opportunities/:id
DELETE /api/opportunities/:id

# Financial Calculations
POST /api/financial/calculate-tir
POST /api/financial/calculate-payment
POST /api/financial/generate-scenarios
POST /api/financial/validate-policy

# AVI Voice Processing
POST /api/avi/start-session
POST /api/avi/submit-response
GET  /api/avi/calculate-score/:sessionId
GET  /api/avi/questions/:category?

# Document Management
POST /api/documents/upload
GET  /api/documents/:id
POST /api/documents/validate
POST /api/documents/ocr-process

# Configuration Management
GET  /api/configuration
POST /api/configuration/refresh
GET  /api/configuration/health

# Credit Scoring
POST /api/scoring/calculate
GET  /api/scoring/history/:clientId
POST /api/scoring/validate-business-rules

# Dashboard Data
GET /api/dashboard/stats
GET /api/dashboard/kpis
GET /api/dashboard/activity-feed
GET /api/dashboard/next-best-action
```

### 2. API Response Formats

**Standard Response Structure:**
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

**Client Data Response:**
```typescript
interface ClientResponse {
  id: string;
  personalInfo: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno?: string;
    rfc: string;
    curp: string;
    fechaNacimiento: string;
    telefono: string;
    email: string;
  };
  address: {
    calle: string;
    numeroExterior: string;
    numeroInterior?: string;
    colonia: string;
    municipio: string;
    estado: string;
    codigoPostal: string;
  };
  financial: {
    ingresosMensuales: number;
    gastosMensuales: number;
    deudasExistentes: number;
    capacidadPago: number;
  };
  vehicle: {
    tipo: string;
    marca: string;
    modelo: string;
    año: number;
    precio: number;
  };
  documents: DocumentInfo[];
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}
```

**Financial Calculation Response:**
```typescript
interface FinancialCalculationResponse {
  principal: number;
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  effectiveRate: number;
  tir: number;
  scenarios: PaymentScenario[];
  validationResults: ValidationResult[];
  market: Market;
  businessFlow: BusinessFlow;
  calculatedAt: string;
}
```

### 3. API Client Implementation

**HttpClientService Implementation:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class HttpClientService {
  private readonly baseUrl = environment.apiUrl;
  private readonly timeout = environment.apiTimeout;
  
  constructor(private http: HttpClient) {}
  
  get<T>(endpoint: string, options?: HttpOptions): Observable<APIResponse<T>> {
    return this.http.get<APIResponse<T>>(`${this.baseUrl}${endpoint}`, {
      ...options,
      timeout: this.timeout,
      headers: this.getHeaders(options?.headers)
    }).pipe(
      retry(2),
      timeout(this.timeout),
      catchError(this.handleError)
    );
  }
  
  post<T>(endpoint: string, data: any, options?: HttpOptions): Observable<APIResponse<T>> {
    return this.http.post<APIResponse<T>>(`${this.baseUrl}${endpoint}`, data, {
      ...options,
      timeout: this.timeout,
      headers: this.getHeaders(options?.headers)
    }).pipe(
      retry(1),
      timeout(this.timeout),
      catchError(this.handleError)
    );
  }
  
  private getHeaders(customHeaders?: HttpHeaders): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-App-Version': environment.appVersion,
      'X-Request-ID': this.generateRequestId()
    });
    
    // Add authentication token
    const token = this.authService.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Merge custom headers
    if (customHeaders) {
      customHeaders.keys().forEach(key => {
        headers = headers.set(key, customHeaders.get(key) || '');
      });
    }
    
    return headers;
  }
  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error ${error.status}: ${error.message}`;
      
      // Log specific error types
      switch (error.status) {
        case 401:
          this.authService.logout();
          this.router.navigate(['/login']);
          break;
        case 403:
          this.router.navigate(['/unauthorized']);
          break;
        case 500:
          console.error('Server error - check backend services');
          break;
      }
    }
    
    console.error('HTTP Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4. External API Integration

**Kinban Credit Bureau Integration:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class KinbanIntegrationService {
  private readonly baseUrl = environment.kinban.apiUrl;
  private readonly clientId = environment.kinban.clientId;
  
  constructor(private http: HttpClient) {}
  
  async getCreditReport(rfc: string): Promise<KinbanCreditReport> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${await this.getAccessToken()}`,
      'Content-Type': 'application/json',
      'X-Client-ID': this.clientId
    });
    
    const response = await this.http.post<KinbanResponse<KinbanCreditReport>>(
      `${this.baseUrl}/credit-report`,
      { rfc, requestId: this.generateRequestId() },
      { headers }
    ).toPromise();
    
    if (!response?.success) {
      throw new Error(`Kinban API error: ${response?.error?.message}`);
    }
    
    return response.data;
  }
  
  private async getAccessToken(): Promise<string> {
    // Implement OAuth2 token management
    const cachedToken = this.tokenCache.get('kinban_token');
    if (cachedToken && !this.isTokenExpired(cachedToken)) {
      return cachedToken.access_token;
    }
    
    const tokenResponse = await this.http.post<TokenResponse>(
      `${this.baseUrl}/oauth/token`,
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: environment.kinban.secret
      }
    ).toPromise();
    
    this.tokenCache.set('kinban_token', tokenResponse);
    return tokenResponse.access_token;
  }
}
```

---

## 🔒 SECURITY CONFIGURATION

### 1. Firebase Security Rules

**firestore.rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Clients data - restricted to authenticated advisors
    match /clients/{clientId} {
      allow read, write: if request.auth != null 
        && request.auth.token.role in ['advisor', 'supervisor', 'admin']
        && resource.data.advisorId == request.auth.uid;
    }
    
    // Opportunities - restricted to creator or supervisor
    match /opportunities/{opportunityId} {
      allow read, write: if request.auth != null 
        && (resource.data.createdBy == request.auth.uid 
            || request.auth.token.role in ['supervisor', 'admin']);
    }
    
    // Configuration - read-only for advisors, write for admins
    match /configuration/{configId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.auth.token.role == 'admin';
    }
    
    // AVI Sessions - private to user
    match /avi_sessions/{sessionId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

**storage.rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Documents - access restricted to document owner
    match /documents/{userId}/{documentId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
      allow read: if request.auth != null 
        && request.auth.token.role in ['supervisor', 'admin'];
    }
    
    // Profile pictures
    match /profiles/{userId}/avatar.{extension} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId
        && extension.matches(/(jpg|jpeg|png)$/)
        && request.resource.size < 5 * 1024 * 1024; // 5MB max
    }
    
    // System files - admin only
    match /system/{allPaths=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.role == 'admin';
    }
  }
}
```

### 2. Content Security Policy

**nginx.conf CSP header:**
```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://api.conductores-pwa.com https://api.kinban.com https://api.hase.mx https://api.openai.com wss://;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  media-src 'self' blob:;
" always;
```

### 3. API Rate Limiting

**rate-limiting.conf:**
```nginx
# Define rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=upload:10m rate=5r/m;

server {
  # API endpoints
  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
  }
  
  # Authentication endpoints
  location /api/auth/ {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://backend;
  }
  
  # File upload endpoints
  location /api/documents/upload {
    limit_req zone=upload burst=2 nodelay;
    client_max_body_size 10M;
    proxy_pass http://backend;
  }
}
```

---

## 📊 MONITORING & OBSERVABILITY

### 1. Application Performance Monitoring

**New Relic Configuration:**
```javascript
// newrelic.js
exports.config = {
  app_name: ['Conductores PWA'],
  license_key: process.env.NEWRELIC_LICENSE_KEY,
  logging: {
    level: 'info',
    rules: {
      ignore: [
        {level: 'trace'},
        {level: 'debug'}
      ]
    }
  },
  error_collector: {
    enabled: true,
    ignore_status_codes: [404, 401],
    attributes: {
      exclude: ['request.headers.authorization', 'request.body.password']
    }
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 2000, // 2 seconds
    attributes: {
      exclude: ['request.headers.authorization']
    }
  },
  browser_monitoring: {
    enable: true,
    attributes: {
      enabled: true,
      exclude: ['request.headers.authorization']
    }
  },
  custom_insights_events: {
    enabled: true
  }
};
```

### 2. Error Tracking (Sentry)

**Sentry Configuration:**
```typescript
// sentry.config.ts
import * as Sentry from '@sentry/angular';
import { Router } from '@angular/router';

Sentry.init({
  dsn: environment.analytics.sentryDsn,
  environment: environment.production ? 'production' : 'development',
  release: environment.appVersion,
  
  // Performance monitoring
  tracesSampleRate: 0.1,
  
  // Error filtering
  beforeSend(event, hint) {
    // Don't send errors for specific scenarios
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        return null; // Don't send network errors
      }
    }
    
    // Scrub sensitive data
    if (event.request) {
      delete event.request.headers?.authorization;
      delete event.request.data?.password;
      delete event.request.data?.rfc;
    }
    
    return event;
  },
  
  // Integration configuration
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['localhost', environment.apiUrl, /^\//],
      routingInstrumentation: Sentry.routingInstrumentation
    }),
  ],
  
  // User context
  initialScope: {
    tags: {
      component: 'angular-frontend'
    }
  }
});
```

### 3. Custom Metrics

**Application Metrics Service:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  
  constructor(private analytics: AnalyticsService) {}
  
  // Business Metrics
  trackOpportunityCreated(opportunity: OpportunityData): void {
    this.analytics.track('opportunity_created', {
      market: opportunity.market,
      businessFlow: opportunity.businessFlow,
      vehiclePrice: opportunity.vehicle.price,
      estimatedMonthlyPayment: opportunity.financing.monthlyPayment,
      advisorId: opportunity.createdBy
    });
  }
  
  trackAVISessionCompleted(sessionData: AVISessionData): void {
    this.analytics.track('avi_session_completed', {
      sessionDuration: sessionData.duration,
      questionsAnswered: sessionData.questionsAnswered,
      finalScore: sessionData.finalScore,
      riskLevel: sessionData.riskLevel,
      processingTime: sessionData.processingTime
    });
  }
  
  trackFinancialCalculation(calculationData: FinancialCalculationData): void {
    this.analytics.track('financial_calculation_performed', {
      market: calculationData.market,
      businessFlow: calculationData.businessFlow,
      vehiclePrice: calculationData.vehiclePrice,
      downPaymentPercentage: calculationData.downPaymentPercentage,
      term: calculationData.term,
      calculatedTIR: calculationData.tir,
      processingTimeMs: calculationData.processingTime
    });
  }
  
  // Performance Metrics
  trackPageLoadTime(page: string, loadTime: number): void {
    this.analytics.track('page_load_performance', {
      page,
      loadTimeMs: loadTime,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType()
    });
  }
  
  trackAPIResponseTime(endpoint: string, responseTime: number, status: number): void {
    this.analytics.track('api_response_performance', {
      endpoint,
      responseTimeMs: responseTime,
      statusCode: status,
      timestamp: new Date().toISOString()
    });
  }
  
  // Error Metrics
  trackBusinessRuleViolation(rule: string, context: any): void {
    this.analytics.track('business_rule_violation', {
      rule,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  private getConnectionType(): string {
    const connection = (navigator as any).connection;
    return connection ? connection.effectiveType : 'unknown';
  }
}
```

---

## 🧪 TESTING & QUALITY ASSURANCE

### 1. Automated Testing Pipeline

**test-pipeline.yml (GitHub Actions):**
```yaml
name: Test Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --watch=false --browsers=ChromeHeadless --code-coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start mock services
        run: |
          npm run mock:api &
          npm run mock:firebase &
          sleep 10
      
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install
      
      - name: Build application
        run: npm run build:test
      
      - name: Run E2E tests
        run: npm run test:visual
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build:test
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Generate accessibility report
        run: npm run test:a11y:report

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build:prod
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
```

### 2. Quality Gates

**quality-gates.js:**
```javascript
const fs = require('fs');
const path = require('path');

const QUALITY_THRESHOLDS = {
  unitTestCoverage: 85,
  integrationTestCoverage: 70,
  e2eTestCoverage: 50,
  accessibilityScore: 95,
  performanceScore: 90,
  bundleSizeLimit: 500 * 1024, // 500KB
  duplicateCodeThreshold: 3,
  cyclomaticComplexity: 10,
  maintainabilityIndex: 80
};

async function checkQualityGates() {
  const results = {
    passed: true,
    failures: [],
    metrics: {}
  };
  
  // Check test coverage
  const coverageReport = JSON.parse(
    fs.readFileSync('coverage/coverage-summary.json', 'utf8')
  );
  
  const unitCoverage = coverageReport.total.lines.pct;
  results.metrics.unitTestCoverage = unitCoverage;
  
  if (unitCoverage < QUALITY_THRESHOLDS.unitTestCoverage) {
    results.passed = false;
    results.failures.push(`Unit test coverage ${unitCoverage}% below threshold ${QUALITY_THRESHOLDS.unitTestCoverage}%`);
  }
  
  // Check bundle size
  const statsFile = path.join(__dirname, '../dist/conductores-pwa/stats.json');
  if (fs.existsSync(statsFile)) {
    const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    const mainBundleSize = stats.assets
      .filter(asset => asset.name.includes('main'))
      .reduce((sum, asset) => sum + asset.size, 0);
    
    results.metrics.bundleSize = mainBundleSize;
    
    if (mainBundleSize > QUALITY_THRESHOLDS.bundleSizeLimit) {
      results.passed = false;
      results.failures.push(`Bundle size ${(mainBundleSize/1024).toFixed(2)}KB exceeds limit ${(QUALITY_THRESHOLDS.bundleSizeLimit/1024).toFixed(2)}KB`);
    }
  }
  
  // Check Lighthouse scores
  const lighthouseReport = path.join(__dirname, '../lighthouse-report.json');
  if (fs.existsSync(lighthouseReport)) {
    const report = JSON.parse(fs.readFileSync(lighthouseReport, 'utf8'));
    const performanceScore = report.lhr.categories.performance.score * 100;
    const accessibilityScore = report.lhr.categories.accessibility.score * 100;
    
    results.metrics.performanceScore = performanceScore;
    results.metrics.accessibilityScore = accessibilityScore;
    
    if (performanceScore < QUALITY_THRESHOLDS.performanceScore) {
      results.passed = false;
      results.failures.push(`Performance score ${performanceScore.toFixed(1)} below threshold ${QUALITY_THRESHOLDS.performanceScore}`);
    }
    
    if (accessibilityScore < QUALITY_THRESHOLDS.accessibilityScore) {
      results.passed = false;
      results.failures.push(`Accessibility score ${accessibilityScore.toFixed(1)} below threshold ${QUALITY_THRESHOLDS.accessibilityScore}`);
    }
  }
  
  // Output results
  console.log('📊 Quality Gates Report');
  console.log('======================');
  console.log(`Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('\n📈 Metrics:');
  Object.entries(results.metrics).forEach(([key, value]) => {
    console.log(`  ${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
  });
  
  if (results.failures.length > 0) {
    console.log('\n❌ Failures:');
    results.failures.forEach(failure => {
      console.log(`  - ${failure}`);
    });
  }
  
  process.exit(results.passed ? 0 : 1);
}

checkQualityGates().catch(console.error);
```

---

This deployment and integration guide provides comprehensive procedures for setting up the Conductores PWA system in production environments with proper monitoring, security, and quality assurance measures.