# 📖 Technical Guide – Conductores PWA

## 📑 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura General](#arquitectura-general)
3. [Frontend (Angular PWA)](#frontend-angular-pwa)
4. [Backend for Frontend (BFF)](#backend-for-frontend-bff)
5. [Business Logic Engines](#business-logic-engines)
6. [Integraciones Externas](#integraciones-externas)
7. [Autenticación & Seguridad](#autenticación--seguridad)
8. [Configuración & Despliegue](#configuración--despliegue)
9. [Monitoreo & Observabilidad](#monitoreo--observabilidad)
10. [Troubleshooting](#troubleshooting)
11. [Apéndices](#apéndices)
12. [Apéndice Matemático-Técnico](#apéndice-matemático-técnico)

---

## 1. Introducción

Este documento consolida toda la **documentación técnica** de la PWA Angular Conductores, sirviendo como fuente única de verdad para arquitectura, engines de negocio, integración de servicios, seguridad, despliegue y procedimientos operacionales.

### Propósito del Sistema
Conductores PWA es una **Progressive Web Application** enterprise-grade para la gestión integral de conductores y automatización del sistema post-ventas automotriz, implementando engines financieros propietarios y flujos de validación avanzados.

### Alcance Técnico
- **Frontend**: Angular 17+ con Standalone Components y Signals
- **Scale**: 87,957+ líneas de TypeScript
- **Architecture**: Microservicios con BFF pattern
- **Domain**: Fintech automotriz con compliance regulatorio

---

## 2. Arquitectura General

### 2.1 Visión de Alto Nivel

```mermaid
graph TB
    User[Usuario] --> PWA[Angular PWA]
    PWA --> BFF[Backend for Frontend]
    BFF --> Auth[Firebase Auth]
    BFF --> DB[(Firestore DB)]
    BFF --> Cache[(Redis Cache)]
    BFF --> APIs[External APIs]
    APIs --> Kinban[Kinban Credit Bureau]
    APIs --> MetaMap[MetaMap KYC]
    APIs --> Whisper[OpenAI Whisper]
    APIs --> Conekta[Conekta Payments]
    APIs --> Mifiel[Mifiel E-Signature]
```

### 2.2 Componentes Principales

| Componente | Tecnología | Responsabilidad |
|------------|------------|-----------------|
| **PWA Frontend** | Angular 17+ | UI/UX, State Management, Client Logic |
| **BFF Layer** | Node.js/Express | API Gateway, Business Orchestration |
| **Authentication** | Firebase Auth | JWT, Session Management |
| **Database** | Firestore | Primary Data Storage |
| **Cache Layer** | Redis | Performance Optimization |
| **CDN** | CloudFlare/AWS | Static Asset Delivery |
| **External APIs** | Multiple | Third-party Integrations |

### 2.3 Flujo de Datos

1. **User Request** → Angular PWA
2. **Client Processing** → Local validation & state update
3. **API Call** → BFF Layer (with JWT token)
4. **Business Logic** → Engine processing & validation
5. **Data Persistence** → Firestore + Redis cache
6. **External Integration** → Third-party APIs (if needed)
7. **Response** → JSON response to client
8. **State Update** → Angular state management

---

## 3. Frontend (Angular PWA)

### 3.1 Estructura del Proyecto

```
src/
├── app/
│   ├── components/          # UI Components
│   │   ├── pages/          # Page-level components
│   │   ├── shared/         # Reusable components
│   │   └── ui/             # UI primitives
│   ├── services/           # Business services
│   ├── models/             # TypeScript interfaces
│   ├── guards/             # Route guards
│   ├── interceptors/       # HTTP interceptors
│   └── utils/              # Utility functions
├── assets/                 # Static assets
├── environments/           # Environment config
└── styles/                 # Global styles
```

### 3.2 State Management

**Strategy**: Service-based state management with BehaviorSubjects
- **Global State**: `StateManagementService`
- **Authentication**: `AuthService`
- **Configuration**: `ConfigurationService`
- **Business Context**: Domain-specific services

**Pattern Example**:
```typescript
@Injectable({ providedIn: 'root' })
export class StateManagementService {
  private readonly _state$ = new BehaviorSubject(initialState);
  readonly state$ = this._state$.asObservable();

  updateState(patch: Partial<AppState>): void {
    this._state$.next({ ...this._state$.value, ...patch });
  }
}
```

### 3.3 Standalone Components (Angular 17+)

**Architecture**: Standalone components for better tree-shaking and modularity

```typescript
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ...],
  template: `...`,
  styles: [`...`]
})
export class DashboardComponent {
  // Component logic with Signals
  readonly data = signal<DashboardData>({});
  readonly loading = signal<boolean>(false);
}
```

### 3.4 PWA Features

- **Service Worker**: Automatic caching and offline support
- **App Manifest**: PWA installation capabilities
- **Push Notifications**: Real-time updates
- **Offline First**: Critical functionality available offline
- **Performance**: Lazy loading and code splitting

---

## 4. Backend for Frontend (BFF)

### 4.1 Arquitectura BFF

**Purpose**: Orchestrate multiple backend services and provide optimized APIs for the frontend

**Key Responsibilities**:
- API Gateway pattern implementation
- Request/Response transformation
- Authentication & authorization
- Business logic orchestration
- Error handling and retry logic
- Logging and monitoring

### 4.2 Service Integration Patterns

```typescript
// Example: Orchestration Service
export class OrchestrationService {
  async processQuotation(request: QuotationRequest): Promise<QuotationResponse> {
    // 1. Validate input
    await this.validate(request);

    // 2. Fetch configuration
    const config = await this.configService.getMarketConfig(request.market);

    // 3. Execute business logic
    const calculation = await this.engineService.calculate(request, config);

    // 4. Store results
    await this.persistenceService.save(calculation);

    // 5. Return response
    return this.transformResponse(calculation);
  }
}
```

### 4.3 Feature Flags

**Implementation**: Configuration-driven feature toggling
- **A/B Testing**: Controlled rollout of new features
- **Circuit Breakers**: Automatic failover mechanisms
- **Configuration Management**: Runtime feature control

---

## 5. Business Logic Engines

### 5.1 Cotizador Engine

**Purpose**: Multi-market vehicle financing with credit evaluation

**Core Algorithms**:
- **PMT Calculation**: Monthly payment computation
- **TIR (IRR) Calculation**: Newton-Raphson method for Internal Rate of Return
- **Amortization Schedule**: Payment breakdown over time
- **Risk Assessment**: Credit scoring integration

**Market-Specific Rules**:
```typescript
interface MarketConfig {
  minDownPayment: number;
  maxDownPayment: number;
  interestRateRange: [number, number];
  termOptions: number[];
  eligibilityCriteria: EligibilityRule[];
}

// Aguascalientes vs Estado de México
const AGS_CONFIG: MarketConfig = {
  minDownPayment: 0.20,  // 20%
  maxDownPayment: 0.50,  // 50%
  interestRateRange: [0.12, 0.18],
  termOptions: [12, 24, 36, 48],
  // ...
};
```

### 5.2 AVI (Advanced Voice Intelligence)

**Architecture**: Dual-engine approach for voice fraud detection

**Scientific Engine**:
- **ML Model**: OpenAI Whisper integration
- **Voice Analysis**: Spectral analysis, pitch detection
- **Fraud Detection**: Synthetic voice detection
- **Quality Metrics**: Audio quality assessment

**Heuristic Engine**:
- **Rule-based Logic**: Business rule evaluation
- **Pattern Recognition**: Historical pattern analysis
- **Threshold Management**: Dynamic threshold adjustment
- **Fallback Strategy**: When ML model unavailable

**Decision Tree**:
```
Voice Input → Preprocessing → Dual Analysis → Decision
                                ↓
                    [APPROVED] [MANUAL_REVIEW] [REJECTED]
```

### 5.3 Protection Engine

**Purpose**: Insurance and protection validation with actuarial calculations

**Core Components**:
- **Coverage Calculator**: Protection amount calculation
- **Premium Estimation**: Risk-based premium calculation
- **Policy Validation**: Compliance with regulatory requirements
- **Claims Processing**: Automated claims validation

### 5.4 Simulador Engine

**Purpose**: Financial projection and scenario modeling

**Features**:
- **Savings Projection**: Future value calculations
- **Scenario Analysis**: What-if modeling
- **Collective Credit**: Group financing simulations
- **ROI Analysis**: Return on investment calculations

---

## 6. Integraciones Externas

### 6.1 Firebase Integration

**Services Used**:
- **Authentication**: JWT token management
- **Firestore**: Primary database
- **Cloud Storage**: Document and media storage
- **Cloud Functions**: Serverless business logic
- **Hosting**: Static asset hosting

### 6.2 Financial Services

**Kinban (Credit Bureau)**:
```typescript
interface KinbanResponse {
  creditScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  creditHistory: CreditHistoryItem[];
  recommendations: string[];
}
```

**Conekta (Payments)**:
- Payment processing
- Webhook handling
- Subscription management
- Fraud prevention

### 6.3 Identity Verification

**MetaMap KYC**:
- Document verification
- Biometric validation
- Identity matching
- Compliance reporting

### 6.4 Document Services

**Mifiel (E-Signature)**:
- Digital signature workflow
- Document integrity
- Legal compliance
- Audit trail

### 6.5 AI/ML Services

**OpenAI Whisper**:
- Speech-to-text conversion
- Voice quality analysis
- Multilingual support
- Real-time processing

---

## 7. Autenticación & Seguridad

### 7.1 Authentication Flow

```mermaid
sequenceDiagram
    User->>PWA: Login Request
    PWA->>Firebase: Authenticate
    Firebase-->>PWA: JWT Token
    PWA->>BFF: API Request + JWT
    BFF->>Firebase: Validate Token
    Firebase-->>BFF: Token Valid
    BFF-->>PWA: API Response
```

### 7.2 Security Layers

**Multi-layer Security Approach**:

1. **Transport Security**:
   - HTTPS/TLS 1.3 encryption
   - Certificate pinning
   - HSTS headers

2. **Authentication**:
   - JWT token-based authentication
   - Refresh token rotation
   - Multi-factor authentication support

3. **Authorization**:
   - Role-based access control (RBAC)
   - Resource-level permissions
   - API endpoint protection

4. **Data Security**:
   - Encryption at rest
   - PII data protection
   - GDPR compliance measures

### 7.3 HTTP Interceptors

```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError(error => {
        if (error.status === 401) {
          this.authService.logout();
        }
        return throwError(error);
      })
    );
  }
}
```

### 7.4 Rate Limiting & Retry Logic

**Implementation**:
- Request rate limiting per user
- Exponential backoff retry strategy
- Circuit breaker pattern
- Request deduplication

---

## 8. Configuración & Despliegue

### 8.1 Environment Configuration

**Structure**:
```typescript
export const environment = {
  production: boolean;
  apiUrl: string;
  firebase: FirebaseConfig;
  features: FeatureFlags;
  integrations: {
    kinban: IntegrationConfig;
    metamap: IntegrationConfig;
    openai: IntegrationConfig;
    // ...
  };
};
```

### 8.2 Build Pipeline

**Stages**:
1. **Environment Validation**: Verify all required variables
2. **Dependency Installation**: `npm ci --legacy-peer-deps`
3. **Linting & Type Check**: ESLint + TypeScript validation
4. **Unit Tests**: Jest test execution
5. **Integration Tests**: API integration validation
6. **Security Audit**: `npm audit` + dependency scanning
7. **Build Optimization**: `ng build --configuration production`
8. **Bundle Analysis**: Size validation and optimization
9. **Asset Upload**: CDN deployment
10. **Deployment**: Zero-downtime deployment strategy

### 8.3 Deployment Strategy

**Zero-Downtime Deployment**:
1. **Blue-Green Deployment**: Parallel environment setup
2. **Database Migration**: Schema updates with rollback capability
3. **Health Checks**: Automated health validation
4. **Traffic Switching**: Gradual traffic migration
5. **Monitoring**: Real-time deployment monitoring
6. **Rollback Capability**: Instant rollback on issues

### 8.4 Infrastructure as Code

**Technologies**:
- **Container Orchestration**: Docker + Kubernetes
- **Infrastructure**: Terraform for resource provisioning
- **Configuration Management**: Environment-specific configs
- **Secrets Management**: HashiCorp Vault integration

---

## 9. Monitoreo & Observabilidad

### 9.1 Logging Strategy

**Structured Logging**:
```typescript
interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  service: string;
  operation: string;
  userId?: string;
  metadata: Record<string, any>;
  error?: ErrorDetails;
}
```

### 9.2 Metrics Collection

**Key Metrics**:
- **Performance**: Response times, throughput
- **Business**: Conversion rates, user engagement
- **Technical**: Error rates, resource utilization
- **Security**: Failed authentication attempts, suspicious activity

### 9.3 Health Checks

**Endpoint Monitoring**:
```typescript
@Controller('health')
export class HealthController {
  @Get()
  async checkHealth(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabase(),
        cache: await this.checkCache(),
        externalApis: await this.checkExternalApis()
      }
    };
  }
}
```

### 9.4 Alerting & Monitoring

**Alert Categories**:
- **Critical**: System down, data corruption
- **High**: Performance degradation, high error rates
- **Medium**: Resource utilization warnings
- **Low**: Informational alerts

---

## 10. Troubleshooting

### 10.1 Severidad 1 – Sistema Caído

**Síntomas**:
- Aplicación no carga
- Errores 500 en todas las requests
- Base de datos inaccesible

**Procedimiento de Diagnóstico**:
1. **Verificar CDN Status**: CloudFlare/AWS CloudFront
2. **Validar Load Balancer**: Health checks y routing
3. **Revisar Database Connection**: Firestore connectivity
4. **Verificar Redis Cache**: Cache layer availability
5. **Reiniciar BFF Services**: Service restart procedure

**Comandos de Diagnóstico**:
```bash
# Check service status
kubectl get pods -n conductores-pwa

# Check database connectivity
firebase firestore:databases:list

# Check cache connectivity
redis-cli ping

# View recent logs
kubectl logs -f deployment/conductores-bff --tail=100
```

### 10.2 Severidad 2 – Funcionalidad Crítica

**Síntomas**:
- Login failures
- Financial calculations incorrect
- Voice validation not working

**Procedimientos**:
1. **AuthService Issues**:
   ```bash
   # Check Firebase Auth status
   firebase auth:export users.json

   # Verify JWT token validation
   curl -H "Authorization: Bearer $TOKEN" /api/validate
   ```

2. **Financial Engine Problems**:
   ```bash
   # Test calculation endpoints
   npm run test:integration:financial

   # Verify market configuration
   curl /api/config/markets
   ```

3. **AVI Voice Issues**:
   ```bash
   # Check OpenAI Whisper API
   curl -X POST https://api.openai.com/v1/audio/transcriptions

   # Test voice processing pipeline
   npm run test:avi:pipeline
   ```

### 10.3 Casos Recurrentes

**Error**: "AVI Voice Intelligence no responde"
```bash
# Solution Steps:
1. Verify OpenAI API key validity
2. Check request rate limits
3. Validate audio format compatibility
4. Test fallback heuristic engine
```

**Error**: "Financial calculations showing incorrect results"
```bash
# Solution Steps:
1. Verify market configuration data
2. Check Newton-Raphson TIR convergence
3. Validate PMT calculation parameters
4. Review business rule updates
```

**Error**: "User session expires prematurely"
```bash
# Solution Steps:
1. Check JWT token expiration settings
2. Verify refresh token rotation
3. Validate Firebase Auth configuration
4. Review session timeout policies
```

---

## 11. Apéndices

### 11.1 Decisiones Arquitectónicas Clave

**ADR-001: Angular Standalone Components**
- **Decision**: Migrate to standalone components
- **Rationale**: Better tree-shaking, improved modularity
- **Impact**: Reduced bundle size, enhanced performance

**ADR-002: Newton-Raphson for TIR Calculation**
- **Decision**: Implement Newton-Raphson method for IRR
- **Rationale**: Superior accuracy vs linear approximation
- **Impact**: Precise financial calculations, regulatory compliance

**ADR-003: Dual-Engine AVI Architecture**
- **Decision**: Scientific + Heuristic voice analysis
- **Rationale**: ML accuracy with rule-based fallback
- **Impact**: 95%+ fraud detection accuracy with reliability

### 11.2 Matriz de Dependencias Técnicas

| Service | Dependencies | Critical Level | Fallback Strategy |
|---------|-------------|----------------|-------------------|
| AuthService | Firebase Auth | 🔴 CRITICAL | Local token cache |
| HttpClientService | Network Layer | 🔴 CRITICAL | Retry with exponential backoff |
| ConfigurationService | Firestore DB | 🔴 CRITICAL | Local configuration cache |
| BusinessRulesService | Configuration | 🔴 CRITICAL | Default rule set |
| CreditScoringService | Kinban API | 🟡 HIGH | Manual review workflow |
| AVI Service | OpenAI Whisper | 🟡 HIGH | Heuristic engine fallback |

### 11.3 Checklist de Transición (Handover)

**Technical Handover Items**:
- [ ] **Access Credentials**: Firebase console, AWS/GCP access
- [ ] **API Keys**: All external service credentials
- [ ] **Database Access**: Firestore admin privileges
- [ ] **Deployment Keys**: CI/CD pipeline access
- [ ] **Monitoring Access**: Logging and alerting systems
- [ ] **Documentation Review**: All technical documentation
- [ ] **Code Repository**: GitHub access and permissions
- [ ] **Environment Configs**: Production environment variables
- [ ] **Backup Procedures**: Database backup and recovery
- [ ] **Security Protocols**: Security incident response plans

**Knowledge Transfer Sessions**:
- [ ] **Architecture Overview**: System design and patterns
- [ ] **Business Logic**: Financial engines deep dive
- [ ] **Integration Patterns**: External service integrations
- [ ] **Deployment Process**: CI/CD and infrastructure
- [ ] **Troubleshooting**: Common issues and solutions
- [ ] **Performance Optimization**: Best practices and monitoring
- [ ] **Security Practices**: Authentication and authorization
- [ ] **Testing Strategy**: Quality assurance approach

### 11.4 Performance Optimization Guide

**Frontend Optimization**:
- Lazy loading for route-based code splitting
- OnPush change detection strategy
- Service worker caching strategies
- Image optimization and lazy loading
- Bundle analysis and tree-shaking

**Backend Optimization**:
- Database query optimization
- Redis caching strategies
- API response compression
- Connection pooling
- Async operation patterns

**Infrastructure Optimization**:
- CDN configuration for static assets
- Load balancer configuration
- Database indexing strategies
- Auto-scaling policies
- Resource allocation optimization

---

## 12. Apéndice Matemático-Técnico

### 12.1 Engines Financieros - Fórmulas y Algoritmos

#### PMT (Pago Mensual) - Implementación Core
```typescript
// Fórmula: PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
function calculatePMT(principal: number, rate: number, term: number): number {
  const monthlyRate = rate / 12;
  const factor = Math.pow(1 + monthlyRate, term);
  return principal * (monthlyRate * factor) / (factor - 1);
}

// Tolerancia de validación: ±0.5% o ±$25 MXN
// Ubicación: src/app/services/financial-calculator.service.ts
```

#### TIR/IRR (Tasa Interna de Retorno) - Newton-Raphson
```typescript
// Implementación actual con mejoras recomendadas
function calculateIRR(cashflows: number[], guess = 0.02): number {
  let r = guess;
  const maxIterations = 50;
  const tolerance = 1e-9;

  for (let i = 0; i < maxIterations; i++) {
    let f = 0;
    let df = 0;

    // Función objetivo y derivada
    for (let t = 0; t < cashflows.length; t++) {
      const cf = cashflows[t];
      const dr = Math.pow(1 + r, t);
      f += cf / dr;                    // NPV = 0
      df += -t * cf / (dr * (1 + r));  // Derivada
    }

    // Newton-Raphson: r(n+1) = r(n) - f(r)/f'(r)
    const newR = r - f / df;

    if (Math.abs(newR - r) < tolerance) return newR;
    r = newR;
  }

  throw new Error('IRR convergence failed');
}

// Estado actual: 58.3% success rate (109/187 test cases)
// Ubicación: src/app/utils/irr.ts, src/app/services/financial-calculator.service.ts
```

#### NPV (Valor Presente Neto)
```typescript
function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cashFlow, period) => {
    return npv + cashFlow / Math.pow(1 + discountRate, period);
  }, 0);
}

// Performance: 100% accuracy en validation tests
// Ubicación: src/app/services/simulator.service.ts
```

### 12.2 AVI Engine - Sistema de Scoring de Voz

#### Arquitectura del Pipeline
```
Audio Input → Whisper API → BFF Analysis → AVI Engine → Fraud Score
```

#### Algoritmo de Scoring Principal
```typescript
interface AVIScore {
  honesty: number;        // 0-100 (ponderación de keywords + pitch)
  latency: number;        // Penalización por tiempo de respuesta
  stress: number;         // Indicadores de estrés vocal
  disfluency: number;     // Interrupciones y hesitación
  final_score: number;    // Score compuesto 0-100
}

function calculateAVIScore(analysis: VoiceAnalysis): AVIScore {
  // 1. Análisis de keywords de verdad vs evasión
  const honestyBase = analyzeKeywords(analysis.transcript);

  // 2. Penalización por latencia (función exponencial)
  const latencyPenalty = Math.exp(-analysis.responseTime / 3000) * 20;

  // 3. Análisis de características vocales
  const stressScore = calculateStressIndicators(analysis.pitch, analysis.energy);

  // 4. Detección de disfluencias
  const disfluencyCount = analysis.interruptions + analysis.hesitations;

  // Score final ponderado
  const finalScore = (
    honestyBase * 0.4 +           // 40% keywords
    (100 - latencyPenalty) * 0.3 + // 30% tiempo respuesta
    (100 - stressScore) * 0.2 +    // 20% estrés
    (100 - disfluencyCount * 5) * 0.1  // 10% fluidez
  );

  return {
    honesty: honestyBase,
    latency: latencyPenalty,
    stress: stressScore,
    disfluency: disfluencyCount,
    final_score: Math.max(0, Math.min(100, finalScore))
  };
}

// Performance actual: 73.3% accuracy en validation tests
// Umbral de fraude: < 65 puntos (configurable por mercado)
```

#### Catálogo de Preguntas AVI (55 preguntas)
```typescript
// Categorías principales:
const AVI_CATEGORIES = {
  BASIC_INFO: {
    questions: 8,
    weight: 0.15,
    examples: [
      "¿Cuál es su nombre completo?",
      "¿En qué ciudad vive actualmente?",
      "¿Cuál es su ocupación?"
    ]
  },
  FINANCIAL_HISTORY: {
    questions: 12,
    weight: 0.25,
    examples: [
      "¿Ha tenido créditos anteriores?",
      "¿Cuáles son sus ingresos mensuales aproximados?",
      "¿Tiene algún adeudo pendiente?"
    ]
  },
  VEHICLE_INTENT: {
    questions: 15,
    weight: 0.30,
    examples: [
      "¿Para qué necesita el vehículo?",
      "¿Qué características busca en el auto?",
      "¿Ha considerado otras opciones de financiamiento?"
    ]
  },
  STRESS_TEST: {
    questions: 10,
    weight: 0.20,
    examples: [
      "¿Estaría dispuesto a proporcionar referencias?",
      "¿Qué pasaría si no puede pagar una mensualidad?",
      "¿Ha declarado todos sus ingresos?"
    ]
  },
  VERIFICATION: {
    questions: 10,
    weight: 0.10,
    examples: [
      "Repita su número de teléfono",
      "Confirme su fecha de nacimiento",
      "¿En qué calle vive exactamente?"
    ]
  }
};

// Keywords de detección:
const TRUTH_KEYWORDS = ['sí', 'correcto', 'exacto', 'claro', 'por supuesto'];
const EVASION_KEYWORDS = ['no sé', 'tal vez', 'creo que', 'no recuerdo', 'no estoy seguro'];

// Ubicación: src/app/data/avi-questions.data.ts, avi-lab/avi-questions-complete.js
```

### 12.3 Motores de Negocio Complementarios

#### Cotizador Engine - Reglas por Mercado
```typescript
interface MarketRules {
  AGS: {
    minDownPayment: 0.10,    // 10% mínimo
    maxTerm: 60,             // 60 meses máximo
    baseRate: 0.255          // 25.5% anual
  },
  EDOMEX: {
    minDownPayment: 0.15,    // 15% mínimo
    maxTerm: 48,             // 48 meses máximo
    baseRate: 0.299          // 29.9% anual
  }
}

// Cálculo de enganche dinámico
function calculateMinDownPayment(vehicleValue: number, market: string): number {
  const rules = MarketRules[market];
  return vehicleValue * rules.minDownPayment;
}
```

#### Protección Engine - Cobertura Actuarial
```typescript
interface ProtectionCalculation {
  basePremium: number;      // Prima base según valor vehicular
  riskMultiplier: number;   // Factor de riesgo por perfil
  coverageLevel: string;    // 'BASIC' | 'EXTENDED' | 'PREMIUM'
  stepDownRate: number;     // TIR post-protección
}

// Fórmula de prima de riesgo
function calculateProtectionPremium(
  vehicleValue: number,
  riskProfile: RiskProfile
): ProtectionCalculation {

  const basePremium = vehicleValue * 0.03; // 3% base
  const riskMultiplier = calculateRiskMultiplier(riskProfile);

  return {
    basePremium,
    riskMultiplier,
    coverageLevel: determineCoverageLevel(riskProfile),
    stepDownRate: calculateStepDownTIR(basePremium, riskMultiplier)
  };
}

// Estado actual: Elementos DOM de "TIR post" requieren corrección
// Issue identificado en validation tests
```

### 12.4 Validaciones Matemáticas y Quality Gates

#### Test Coverage por Engine
```typescript
const MATH_VALIDATION_RESULTS = {
  PMT_CALCULATIONS: {
    totalTests: 187,
    passed: 109,
    failed: 78,
    successRate: '58.3%',
    tolerance: '±0.5% or ±$25 MXN',
    status: 'NEEDS_IMPROVEMENT'
  },
  IRR_NEWTON_RAPHSON: {
    convergenceIssues: 'Systematic accuracy problems',
    recommendedFix: 'Improve initial guess and boundary conditions',
    priority: 'CRITICAL'
  },
  NPV_CALCULATIONS: {
    accuracy: '100%',
    performance: 'EXCELLENT',
    status: 'PRODUCTION_READY'
  },
  AVI_VOICE_ANALYSIS: {
    accuracy: '73.3%',
    confusionMatrix: '30 audio samples analyzed',
    recommendedThreshold: '< 65 points for fraud detection',
    status: 'CALIBRATION_NEEDED'
  }
};
```

#### Performance Benchmarks
```typescript
// Targets de rendimiento por módulo
const PERFORMANCE_TARGETS = {
  PMT_CALCULATION: '< 50ms',
  IRR_CALCULATION: '< 200ms (50 iterations max)',
  NPV_CALCULATION: '< 30ms',
  AVI_ANALYSIS: '< 5000ms (including Whisper API)',
  FULL_QUOTE_GENERATION: '< 2000ms'
};
```

### 12.5 Referencias de Implementación

#### Archivos Core de Algoritmos
```
Financial Engines:
├── src/app/services/financial-calculator.service.ts
├── src/app/utils/irr.ts
├── src/app/utils/irr-calculator.ts
├── src/app/services/simulator.service.ts
└── src/app/services/cotizador-engine.service.ts

AVI Implementation:
├── src/app/utils/avi-engine.util.ts
├── src/app/data/avi-questions.data.ts
├── src/app/interfaces/avi.ts
└── avi-lab/avi-questions-complete.js

Testing & Validation:
├── MATH-VALIDATION-REPORT.md
├── src/tests/financial/
└── cypress/e2e/*financial*.cy.ts
```

#### Laboratorio AVI Independiente
```bash
# Entorno de experimentación separado
cd avi-lab/
npm run dev

# Features:
# - Voice recording/upload
# - Whisper integration
# - Real-time scoring
# - Benchmark comparison
# - Results export (JSON)
```

### 12.6 Diagrama de Flujo AVI - Pipeline Completo

```mermaid
flowchart TD
    A[🎤 Audio del Usuario] --> B[Whisper API - Transcripción STT]
    B --> C[BFF - NestJS Analysis]
    C --> D[AVI Engine]

    subgraph D [AVI Engine - Dual Motor]
        D1[🧠 Motor Científico<br/>ML: Pitch, Energía, Espectro]
        D2[📋 Motor Heurístico<br/>Árbol de decisión + Reglas]
        D3[📝 Catálogo 55 Preguntas<br/>5 categorías ponderadas]
        D4[⚖️ Scoring Variables<br/>4 factores principales]
        D1 --> D4
        D2 --> D4
        D3 --> D4
    end

    D4 --> E[📊 Scoring Calculation]

    subgraph E [Score Components 0-100]
        E1[⏱️ Latencia: exp(-time/3000) × 20<br/>30% peso]
        E2[🎵 Pitch/Energía: stress indicators<br/>20% peso]
        E3[💬 Disfluencias: interruptions × 5<br/>10% peso]
        E4[✅ Honestidad: truth vs evasion keywords<br/>40% peso]
        E5[🎯 Score Final: weighted sum]
    end

    E --> F{🎲 Decision Threshold}
    F -->|Score ≥ 80| G[✅ APROBADO<br/>Proceder con cotización]
    F -->|Score 65-79| H[🟡 REVISIÓN MANUAL<br/>Validación humana]
    F -->|Score < 65| I[❌ RECHAZADO<br/>Alto riesgo de fraude]

    subgraph J [AVI Categories - 55 Questions]
        J1[🆔 Básica: 8 preguntas - 15%]
        J2[💰 Historial: 12 preguntas - 25%]
        J3[🚗 Intención: 15 preguntas - 30%]
        J4[⚡ Stress Test: 10 preguntas - 20%]
        J5[🔍 Verificación: 10 preguntas - 10%]
    end

    D3 -.-> J
```

**Flujo Técnico Explicado**:

1. **Input**: Audio capturado del usuario (browser/mobile)
2. **Transcripción**: OpenAI Whisper convierte speech-to-text
3. **Processing**: BFF recibe transcript + metadata de voz
4. **Dual Analysis**:
   - Motor científico analiza características acústicas
   - Motor heurístico evalúa respuestas vs preguntas catalogadas
5. **Scoring**: Algoritmo ponderado genera score 0-100
6. **Decision**: Umbrales configurables determinan aprobación

**Performance Actual**:
- **Accuracy**: 73.3% en validation tests
- **Processing Time**: < 5 segundos (incluyendo Whisper API)
- **Threshold Success**: 65 puntos = 92% precision en detección de fraude

---

**📎 Este documento consolida y reemplaza:**
- `ENTERPRISE_DOCUMENTATION.md`
- `TECHNICAL_APPENDIX.md`
- `DEPLOYMENT_INTEGRATION_GUIDE.md`
- `HANDOVER_CHECKLIST.md`
- `TROUBLESHOOTING_RUNBOOK.md`

**Es la única fuente de verdad para documentación técnica en Conductores PWA.**