# 🔧 TECHNICAL APPENDIX - CONDUCTORES PWA

## Complete Service Dependency Matrix & Technical Reference

This appendix provides surgical precision technical documentation for all services, components, and their interdependencies in the Conductores PWA system.

---

## 📊 COMPLETE SERVICE INVENTORY & DEPENDENCIES

### **Tier 1: Foundation Services (5 services)**

#### 1. AuthService (486 lines)
**Purpose**: Firebase authentication and session management  
**Dependencies**: None (foundation)  
**Used by**: 45+ services and components  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface AuthServiceAPI {
  signIn(email: string, password: string): Observable<AuthResult>;
  signOut(): Observable<void>;
  getCurrentUser(): Observable<User | null>;
  refreshToken(): Observable<string>;
  validateToken(token: string): Observable<boolean>;
}

// Critical integrations:
// - All HTTP interceptors depend on this
// - All protected routes depend on this
// - State management depends on user session
```

#### 2. StorageService (409 lines)
**Purpose**: Centralized localStorage/sessionStorage management  
**Dependencies**: None (foundation)  
**Used by**: 32+ services  
**Risk Level**: 🟠 HIGH  

```typescript
interface StorageServiceAPI {
  set<T>(key: string, value: T, persistent?: boolean): void;
  get<T>(key: string): T | null;
  remove(key: string): void;
  clear(): void;
  exists(key: string): boolean;
}

// Critical data stored:
// - User authentication tokens
// - Configuration cache
// - Form state preservation
// - AVI calibration data
```

#### 3. LoadingService (85 lines)
**Purpose**: Global loading state management  
**Dependencies**: None (foundation)  
**Used by**: ALL HTTP services  
**Risk Level**: 🟡 MEDIUM  

#### 4. ToastService (61 lines)
**Purpose**: User notification system  
**Dependencies**: None (foundation)  
**Used by**: ALL business operations  
**Risk Level**: 🟡 MEDIUM  

#### 5. ErrorHandlerService (326 lines)
**Purpose**: Global error handling and logging  
**Dependencies**: None (foundation)  
**Used by**: ALL services via error propagation  
**Risk Level**: 🟠 HIGH  

---

### **Tier 2: HTTP & Communication Layer (3 services)**

#### 1. HttpClientService (378 lines)
**Purpose**: Enhanced HTTP client with interceptors  
**Dependencies**: AuthService, LoadingService, ToastService  
**Used by**: ALL data services  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface HttpClientServiceAPI {
  get<T>(url: string, options?: HttpOptions): Observable<ApiResponse<T>>;
  post<T>(url: string, data: any, options?: HttpOptions): Observable<ApiResponse<T>>;
  put<T>(url: string, data: any, options?: HttpOptions): Observable<ApiResponse<T>>;
  delete<T>(url: string, options?: HttpOptions): Observable<ApiResponse<T>>;
  patch<T>(url: string, data: any, options?: HttpOptions): Observable<ApiResponse<T>>;
}

// Critical features:
// - Automatic token injection
// - Request/response logging
// - Error handling with retry logic
// - Loading state management
```

#### 2. BackendApiService (518 lines)
**Purpose**: Backend API abstraction layer  
**Dependencies**: HttpClientService, StorageService  
**Used by**: Business services  
**Risk Level**: 🟠 HIGH  

#### 3. ApiService (418 lines)
**Purpose**: Generic CRUD operations  
**Dependencies**: HttpClientService  
**Used by**: Components for direct API access  
**Risk Level**: 🟠 HIGH  

---

### **Tier 3: Business Logic Services (25+ services)**

#### Configuration & Rules Engine

#### 1. ConfigurationService (972 lines)
**Purpose**: Market-specific business configuration  
**Dependencies**: ApiService  
**Used by**: 50+ components/services  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface ConfigurationServiceAPI {
  getMarketConfiguration(market: Market): Observable<MarketConfiguration>;
  updateConfiguration(market: Market, config: Partial<MarketConfiguration>): Observable<void>;
  reloadConfiguration(): Observable<void>;
  getBusinessRules(market: Market, flow: BusinessFlow): Observable<BusinessRules>;
  getDocumentRequirements(market: Market, flow: BusinessFlow): Observable<DocumentRequirement[]>;
  getAVIConfiguration(market: Market): Observable<AVIConfiguration>;
}

// Configuration structure per market:
interface MarketConfiguration {
  aguascalientes: {
    interestRates: { ventaPlazo: 25.5, ventaDirecta: 0 },
    downPaymentRules: { minimum: 60, cashSaleMinimum: 50 },
    availableTerms: [12, 24],
    requiredDocuments: [...],
    compliance: { framework: 'AGS_2024' }
  },
  edomex: {
    interestRates: { ventaPlazo: 29.9, ventaDirecta: 0 },
    downPaymentRules: { minimum: 20, maximum: 25, cashSaleMinimum: 50 },
    availableTerms: [48, 60],
    requiredDocuments: [...],
    compliance: { framework: 'EDOMEX_2024' }
  }
}
```

#### 2. BusinessRulesService (601 lines)
**Purpose**: Business rule validation engine  
**Dependencies**: ConfigurationService  
**Used by**: Financial engines, form validation  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface BusinessRulesServiceAPI {
  validateBusinessFlow(data: ClientData, market: Market, flow: BusinessFlow): Observable<ValidationResult>;
  validateFinancialCapacity(clientData: ClientData, config: MarketConfiguration): ValidationResult;
  validateDocumentRequirements(clientData: ClientData, config: MarketConfiguration): ValidationResult;
  validateCreditTerms(clientData: ClientData, config: MarketConfiguration): ValidationResult;
  getDownPaymentRules(market: Market, flow: BusinessFlow): DownPaymentRules;
  getInterestRate(market: Market, flow: BusinessFlow): number;
}
```

#### Financial Calculation Engine (6 services)

#### 3. CotizadorEngineService (333 lines)
**Purpose**: Vehicle financing quotation engine  
**Dependencies**: FinancialCalculatorService, ConfigurationService  
**Used by**: Quotation components  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface CotizadorEngineServiceAPI {
  getProductPackage(market: string): Observable<ProductPackage>;
  calculateQuotation(config: CotizadorConfig): Observable<QuotationResult>;
  generateAmortizationTable(principal: number, rate: number, term: number): AmortizationRow[];
  validateQuotationParameters(config: CotizadorConfig): ValidationResult;
}

// Product packages by market:
const productPackages = {
  'aguascalientes-plazo': {
    name: "Paquete Venta a Plazo - AGS",
    rate: 0.255,
    terms: [12, 24],
    minDownPaymentPercentage: 0.60,
    components: [
      { id: 'vagoneta_19p', price: 799000, isOptional: false },
      { id: 'gnv', price: 54000, isOptional: false }
    ]
  },
  'edomex-plazo': {
    name: "Paquete Venta a Plazo - EdoMex",
    rate: 0.299,
    terms: [48, 60],
    minDownPaymentPercentage: 0.20,
    maxDownPaymentPercentage: 0.25,
    components: [
      { id: 'vagoneta_ventanas', price: 749000, isOptional: false },
      { id: 'gnv', price: 54000, isOptional: false },
      { id: 'tec', price: 12000, isOptional: false },
      { id: 'bancas', price: 22000, isOptional: false },
      { id: 'seguro', price: 36700, isOptional: false, isMultipliedByTerm: true }
    ]
  }
};
```

#### 4. SimuladorEngineService (286 lines)
**Purpose**: Financial simulation and savings projection  
**Dependencies**: TandaEngineService, FinancialCalculatorService  
**Used by**: Simulator components  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface SimuladorEngineServiceAPI {
  generateAGSLiquidationScenario(params: AGSScenarioParams): SavingsScenario;
  generateEdoMexIndividualScenario(params: IndividualScenarioParams): SavingsScenario;
  generateCollectiveScenario(params: CollectiveScenarioParams): SavingsScenario;
  calculateProjectedReturns(scenario: SavingsScenario): ProjectionResult;
}
```

#### 5. PaymentCalculatorService (480 lines)
**Purpose**: Payment processing and validation  
**Dependencies**: ConfigurationService, FinancialCalculatorService  
**Used by**: Payment components  
**Risk Level**: 🟠 HIGH  

#### 6. CreditScoringService (421 lines)
**Purpose**: Credit evaluation and scoring  
**Dependencies**: BusinessRulesService, ConfigurationService  
**Used by**: Opportunity creation, AVI validation  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface CreditScoringServiceAPI {
  calculateCreditScore(clientData: ClientData): Observable<CreditScore>;
  evaluateFinancialCapacity(income: number, expenses: number, debt: number): CapacityResult;
  validateCreditHistory(rfc: string): Observable<CreditHistoryResult>;
  generateScoreReport(clientId: string): Observable<ScoreReport>;
}

// Credit scoring algorithm:
interface CreditScore {
  score: number; // 300-850 range
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    paymentHistory: number;
    creditUtilization: number;
    creditHistory: number;
    creditMix: number;
    newCredit: number;
  };
  recommendations: string[];
  approvalProbability: number;
}
```

#### 7. FinancialCalculatorService (107 lines)
**Purpose**: Core mathematical financial calculations  
**Dependencies**: None  
**Used by**: All financial engines  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface FinancialCalculatorServiceAPI {
  calculateMonthlyPayment(principal: number, rate: number, term: number): number;
  calculateTIR(cashFlows: number[]): number;
  calculateNPV(cashFlows: number[], discountRate: number): number;
  calculateCompoundInterest(principal: number, rate: number, periods: number): number;
  calculatePresentValue(futureValue: number, rate: number, periods: number): number;
}

// Newton-Raphson TIR implementation:
calculateTIR(cashFlows: number[], guess: number = 0.1): number {
  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-6;
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = this.calculateNPV(cashFlows, rate);
    const derivativeNPV = this.calculateNPVDerivative(cashFlows, rate);
    
    if (Math.abs(npv) < tolerance) break;
    
    rate = rate - npv / derivativeNPV;
  }
  
  return rate;
}
```

#### 8. ProtectionEngineService (335 lines)
**Purpose**: Insurance and protection product calculations  
**Dependencies**: ConfigurationService  
**Used by**: Protection components  
**Risk Level**: 🟡 MEDIUM  

#### AVI Voice Intelligence System (12 services)

#### 9. VoiceValidationService (1,265 lines)
**Purpose**: Main voice verification orchestration  
**Dependencies**: OpenAIWhisperService, AVIDualEngineService, AVICalibrationService  
**Used by**: AVI components  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface VoiceValidationServiceAPI {
  validateVoice(audioBuffer: ArrayBuffer, expectedText: string, clientId: string): Observable<VoiceValidationResult>;
  calibrateSystem(): Observable<CalibrationResult>;
  getValidationHistory(clientId: string): Observable<ValidationHistory[]>;
  updateValidationThresholds(thresholds: ValidationThresholds): Observable<void>;
}

interface VoiceValidationResult {
  isValid: boolean;
  confidence: number; // 0-100%
  fraudProbability: number; // 0-100%
  voiceprint: string;
  textAccuracy: number;
  emotionalState: 'calm' | 'nervous' | 'stressed';
  riskFactors: string[];
  requiresManualReview: boolean;
  processingTimeMs: number;
}
```

#### 10. AVISystemValidatorService (658 lines)
**Purpose**: Advanced validation engine with multiple algorithms  
**Dependencies**: AVIScientificEngineService, AVIHeuristicEngineService  
**Used by**: VoiceValidationService  
**Risk Level**: 🟠 HIGH  

#### 11. AVIScientificEngineService (488 lines)
**Purpose**: ML-based voice analysis using OpenAI  
**Dependencies**: OpenAIWhisperService  
**Used by**: AVISystemValidatorService  
**Risk Level**: 🟠 HIGH  

#### 12. AVIHeuristicEngineService (391 lines)
**Purpose**: Pattern-based voice analysis  
**Dependencies**: None  
**Used by**: AVISystemValidatorService  
**Risk Level**: 🟡 MEDIUM  

#### 13. AVIDualEngineService (376 lines)
**Purpose**: Combines scientific and heuristic engines  
**Dependencies**: AVIScientificEngineService, AVIHeuristicEngineService  
**Used by**: VoiceValidationService  
**Risk Level**: 🟠 HIGH  

#### 14. AVICalibrationService (512 lines)
**Purpose**: System calibration and threshold management  
**Dependencies**: StorageService  
**Used by**: All AVI engines  
**Risk Level**: 🟡 MEDIUM  

#### 15. AVIQuestionGeneratorService (330 lines)
**Purpose**: Dynamic question generation for voice verification  
**Dependencies**: ConfigurationService  
**Used by**: AVI components  
**Risk Level**: 🟡 MEDIUM  

#### 16. AVISimpleConfigService (417 lines)
**Purpose**: Configuration management for AVI system  
**Dependencies**: ConfigurationService  
**Used by**: AVI engines  
**Risk Level**: 🟡 MEDIUM  

#### 17. VoiceFraudDetectionService (435 lines)
**Purpose**: Fraud detection algorithms for voice  
**Dependencies**: None  
**Used by**: VoiceValidationService  
**Risk Level**: 🟠 HIGH  

#### 18. OpenAIWhisperService (488 lines)
**Purpose**: OpenAI Whisper API integration  
**Dependencies**: HttpClientService  
**Used by**: AVI engines  
**Risk Level**: 🟠 HIGH  

```typescript
interface OpenAIWhisperServiceAPI {
  transcribeAudio(audioBuffer: ArrayBuffer): Observable<TranscriptionResult>;
  analyzeVoicePatterns(audioBuffer: ArrayBuffer): Observable<VoiceAnalysis>;
  detectLanguage(audioBuffer: ArrayBuffer): Observable<LanguageResult>;
}

interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  segments: TranscriptionSegment[];
  processingTimeMs: number;
}
```

#### State & Data Management (8 services)

#### 19. StateManagementService (390 lines)
**Purpose**: Global application state orchestration  
**Dependencies**: ClientDataService, EcosystemDataService, CollectiveGroupDataService, MockApiService  
**Used by**: ALL components  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface StateManagementServiceAPI {
  state$: Observable<ApplicationState>;
  selectClient(client: Client): Observable<void>;
  updateBusinessContext(context: BusinessContext): void;
  addNotification(notification: Notification): void;
  updateOperationsQueue(operations: Operation[]): void;
  switchMarket(market: Market): Observable<void>;
}

interface ApplicationState {
  user: UserState;
  clients: ClientState;
  businessContext: BusinessContextState;
  operations: OperationsState;
  ui: UIState;
}
```

#### 20. ClientDataService (518 lines)
**Purpose**: Client data management and CRUD operations  
**Dependencies**: ApiService, StorageService  
**Used by**: Client components, StateManagementService  
**Risk Level**: 🟠 HIGH  

#### 21. EcosystemDataService (445 lines)
**Purpose**: Ecosystem and collective group data management  
**Dependencies**: ApiService  
**Used by**: Collective credit components  
**Risk Level**: 🟡 MEDIUM  

#### 22. CollectiveGroupDataService (392 lines)
**Purpose**: Collective credit group management  
**Dependencies**: ApiService  
**Used by**: Collective components  
**Risk Level**: 🟡 MEDIUM  

#### 23. MockApiService (680 lines)
**Purpose**: Mock data generation for development/testing  
**Dependencies**: None  
**Used by**: Development environment  
**Risk Level**: 🟢 LOW  

#### 24. DataService (486 lines)
**Purpose**: Generic data operations and demo data  
**Dependencies**: None  
**Used by**: Components for demo functionality  
**Risk Level**: 🟢 LOW  

#### Integration Services (15+ services)

#### 25. IntegratedImportTrackerService (1,367 lines)
**Purpose**: Import tracking and post-sales integration  
**Dependencies**: ContractTriggersService, DeliveriesService, ImportWhatsAppNotificationsService, VehicleAssignmentService, ContractService  
**Used by**: Post-sales components  
**Risk Level**: 🔴 CRITICAL  

```typescript
interface IntegratedImportTrackerServiceAPI {
  getIntegratedImportStatus(clientId: string): Observable<IntegratedImportStatus>;
  updateImportMilestone(clientId: string, milestone: keyof ImportStatus, status: string, metadata?: any): Observable<IntegratedImportStatus>;
  completeDeliveryPhase(clientId: string, deliveryData: DeliveryData): Observable<IntegratedImportStatus>;
  completeDocumentsPhase(clientId: string, legalDocuments: LegalDocuments): Observable<IntegratedImportStatus>;
  completePlatesPhase(clientId: string, platesData: PlatesData): Observable<{ success: boolean; postSalesRecord?: PostSalesRecord }>;
  assignVehicleToClient(clientId: string, vehicleData: VehicleData): Observable<AssignmentResult>;
}
```

#### 26. ContractTriggersService (892 lines)
**Purpose**: Contract milestone and trigger management  
**Dependencies**: PaymentCalculatorService, DeliveriesService, ContractService  
**Used by**: Contract components, IntegratedImportTrackerService  
**Risk Level**: 🟠 HIGH  

#### 27. DeliveriesService (640 lines)
**Purpose**: Delivery order management  
**Dependencies**: ApiService  
**Used by**: Operations components, IntegratedImportTrackerService  
**Risk Level**: 🟠 HIGH  

#### 28. ImportWhatsAppNotificationsService (558 lines)
**Purpose**: WhatsApp notifications for import milestones  
**Dependencies**: ConfigurationService  
**Used by**: IntegratedImportTrackerService  
**Risk Level**: 🟡 MEDIUM  

#### 29. VehicleAssignmentService (445 lines)
**Purpose**: Vehicle assignment and VIN management  
**Dependencies**: ApiService  
**Used by**: Assignment components, IntegratedImportTrackerService  
**Risk Level**: 🟠 HIGH  

#### 30. ContractService (523 lines)
**Purpose**: Contract management and generation  
**Dependencies**: ApiService  
**Used by**: Contract components, IntegratedImportTrackerService  
**Risk Level**: 🟠 HIGH  

#### Additional Services (10+ more)

#### 31. ContractGenerationService (445 lines)
**Purpose**: Contract document generation  
**Dependencies**: PDFExportService  
**Used by**: Contract workflow  
**Risk Level**: 🟡 MEDIUM  

#### 32. DocumentRequirementsService (380 lines)
**Purpose**: Dynamic document requirement generation  
**Dependencies**: BusinessRulesService, ConfigurationService  
**Used by**: Onboarding, document upload  
**Risk Level**: 🟠 HIGH  

#### 33. OnboardingEngineService (290 lines)
**Purpose**: Client onboarding workflow engine  
**Dependencies**: DocumentRequirementsService, ClientDataService  
**Used by**: Onboarding components  
**Risk Level**: 🟠 HIGH  

#### 34. NavigationService (156 lines)
**Purpose**: Application navigation and routing  
**Dependencies**: StateManagementService  
**Used by**: Navigation components  
**Risk Level**: 🟡 MEDIUM  

#### 35. ScenarioOrchestratorService (445 lines)
**Purpose**: Business scenario orchestration  
**Dependencies**: ConfigurationService, StateManagementService  
**Used by**: Flow components  
**Risk Level**: 🟡 MEDIUM  

#### 36. TandaEngineService (335 lines)
**Purpose**: Collective credit (tanda) calculations  
**Dependencies**: FinancialCalculatorService  
**Used by**: Collective components  
**Risk Level**: 🟡 MEDIUM  

#### 37. AhorroService (280 lines)
**Purpose**: Savings product management  
**Dependencies**: FinancialCalculatorService  
**Used by**: Savings components  
**Risk Level**: 🟡 MEDIUM  

#### 38. DocumentValidationService (256 lines)
**Purpose**: Document validation and OCR integration  
**Dependencies**: None  
**Used by**: Document upload components  
**Risk Level**: 🟡 MEDIUM  

#### 39. MetamapService (445 lines)
**Purpose**: Metamap KYC integration  
**Dependencies**: HttpClientService  
**Used by**: KYC components  
**Risk Level**: 🟠 HIGH  

#### 40. PDFExportService (389 lines)
**Purpose**: PDF generation and export  
**Dependencies**: None  
**Used by**: Report components  
**Risk Level**: 🟡 MEDIUM  

---

## 🔗 SERVICE DEPENDENCY CHAINS

### **Critical Dependency Chains**

#### Chain 1: Opportunity Creation
```
User Input
  ↓
NuevaOportunidadComponent
  ↓
ConfigurationService ← ApiService ← HttpClientService ← AuthService
  ↓
BusinessRulesService
  ↓
CreditScoringService
  ↓
StateManagementService ← ClientDataService
```

#### Chain 2: Financial Calculation
```
User Input
  ↓
CotizadorMainComponent
  ↓
CotizadorEngineService ← FinancialCalculatorService
  ↓
ConfigurationService
  ↓
BusinessRulesService
```

#### Chain 3: Voice Verification
```
Audio Input
  ↓
AVIComponent
  ↓
VoiceValidationService
  ↓
OpenAIWhisperService ← HttpClientService
  ↓
AVIDualEngineService ← AVIScientificEngineService + AVIHeuristicEngineService
  ↓
AVICalibrationService ← StorageService
```

#### Chain 4: Post-Sales Automation
```
Plates Completion
  ↓
PlatesPhaseComponent
  ↓
IntegratedImportTrackerService
  ↓
Multiple Services: ContractTriggersService, DeliveriesService, ImportWhatsAppNotificationsService
  ↓
vehicle.delivered Event
  ↓
Post-Sales System Activation
```

---

## 🧩 COMPONENT-SERVICE INJECTION MATRIX

### **Mega-Components Service Dependencies**

#### NuevaOportunidadComponent (2,126 lines)
```typescript
// 8 Critical Service Injections:
private formBuilder = inject(FormBuilder);                    // Angular
private router = inject(Router);                             // Angular
private configService = inject(ConfigurationService);        // Business Config
private stateManager = inject(StateManagementService);       // Global State
private creditScoring = inject(CreditScoringService);        // Credit Analysis
private businessRules = inject(BusinessRulesService);        // Validation Rules
private documentValidation = inject(DocumentValidationService); // Doc Validation
private apiService = inject(ApiService);                     // API Operations

// Risk Analysis:
// - ConfigurationService failure = No business rules
// - StateManagementService failure = No global state sync
// - CreditScoringService failure = No credit evaluation
// - BusinessRulesService failure = No validation
```

#### FlowBuilderComponent (1,978 lines)
```typescript
// 2 Service Injections:
private configService = inject(ConfigurationService);        // Heavy usage
// No other service dependencies - self-contained visual editor

// Risk Analysis:
// - ConfigurationService failure = No flow configuration
// - Relatively isolated - low cascade risk
```

#### SimuladorMainComponent (1,755 lines)
```typescript
// 5 Critical Service Injections:
private simuladorEngine = inject(SimuladorEngineService);     // Simulation Logic
private financialCalc = inject(FinancialCalculatorService);   // Math Operations
private configService = inject(ConfigurationService);        // Market Config
private stateManager = inject(StateManagementService);       // State Sync
private paymentCalc = inject(PaymentCalculatorService);      // Payment Logic

// Risk Analysis:
// - SimuladorEngineService failure = No simulations
// - FinancialCalculatorService failure = No calculations
// - High complexity due to multiple financial service dependencies
```

#### OnboardingMainComponent (1,625 lines)
```typescript
// 6 Service Injections:
private onboardingEngine = inject(OnboardingEngineService);   // Onboarding Logic
private documentReqs = inject(DocumentRequirementsService);   // Doc Requirements
private clientData = inject(ClientDataService);              // Client Operations
private configService = inject(ConfigurationService);        // Market Config
private stateManager = inject(StateManagementService);       // State Management
private businessRules = inject(BusinessRulesService);        // Business Validation

// Risk Analysis:
// - OnboardingEngineService failure = No client creation
// - DocumentRequirementsService failure = No doc validation
// - Medium to high complexity
```

### **Component Risk Matrix by Service Dependencies**

| Component | Service Count | Critical Services | Risk Level | Failure Impact |
|-----------|---------------|------------------|------------|----------------|
| NuevaOportunidadComponent | 8 | 6 | 🔴 CRITICAL | Core business process fails |
| SimuladorMainComponent | 5 | 4 | 🔴 CRITICAL | Financial simulations fail |
| OnboardingMainComponent | 6 | 4 | 🟠 HIGH | Client onboarding fails |
| FlowBuilderComponent | 1 | 1 | 🟡 MEDIUM | Configuration UI fails |
| CotizadorMainComponent | 4 | 3 | 🟠 HIGH | Quotations fail |
| AVIVerificationModalComponent | 3 | 2 | 🟠 HIGH | Voice verification fails |
| ClientesListComponent | 4 | 2 | 🟡 MEDIUM | Client list fails |
| DualModeCotizadorComponent | 5 | 3 | 🟠 HIGH | Dual pricing fails |

---

## 📋 FORM VALIDATION ARCHITECTURE

### **Custom Validators Complete Reference**

#### CustomValidators Class (328 lines)
```typescript
export class CustomValidators {
  // Mexican Business Validators
  static rfc(): ValidatorFn;           // Mexican tax ID validation
  static curp(): ValidatorFn;          // Mexican national ID validation
  static mexicanPhone(): ValidatorFn;   // Mexican phone format
  static mexicanCurrency(): ValidatorFn; // Mexican peso validation
  static mexicanPlate(): ValidatorFn;   // Vehicle plate format
  
  // Business Logic Validators
  static clientName(): ValidatorFn;     // Client name format rules
  static downPaymentPercentage(market: Market, flow: BusinessFlow): ValidatorFn;
  static compareFields(fieldName: string): ValidatorFn; // Cross-field validation
  
  // Financial Validators
  static positiveNumber(): ValidatorFn;  // Must be > 0
  static percentage(): ValidatorFn;      // 0-100% range
  static creditTerm(availableTerms: number[]): ValidatorFn; // Valid credit terms
}
```

#### Validation Rules by Market

#### Aguascalientes Market Validations
```typescript
const agsValidationRules = {
  downPayment: {
    ventaPlazo: { minimum: 60, maximum: 100 }, // 60-100%
    ventaDirecta: { minimum: 50, maximum: 100 } // 50-100%
  },
  creditTerms: [12, 24], // months
  vehiclePrice: { minimum: 500000, maximum: 2000000 }, // pesos
  monthlyIncome: { minimum: 15000 }, // pesos
  debtToIncomeRatio: { maximum: 30 } // percentage
};
```

#### Estado de México Market Validations
```typescript
const edomexValidationRules = {
  downPayment: {
    ventaPlazo: { minimum: 20, maximum: 25 }, // 20-25%
    ventaDirecta: { minimum: 50, maximum: 100 } // 50-100%
  },
  creditTerms: [48, 60], // months
  vehiclePrice: { minimum: 600000, maximum: 2500000 }, // pesos
  monthlyIncome: { minimum: 20000 }, // pesos
  debtToIncomeRatio: { maximum: 30 }, // percentage
  ecosystemRequired: true // Must belong to ecosystem for collective credit
};
```

### **Form State Management Patterns**

#### Complex Form Architecture
```typescript
// Multi-step form with cross-validation
class MultiStepFormManager {
  // Step 1: Basic Information
  private basicInfoGroup = this.fb.group({
    name: ['', [Validators.required, CustomValidators.clientName()]],
    phone: ['', [Validators.required, CustomValidators.mexicanPhone()]],
    email: ['', [Validators.required, Validators.email]],
    rfc: ['', [Validators.required, CustomValidators.rfc()]],
    curp: ['', [Validators.required, CustomValidators.curp()]]
  });
  
  // Step 2: Business Context (market-dependent)
  private businessContextGroup = this.fb.group({
    market: ['', [Validators.required]],
    businessFlow: ['', [Validators.required]],
    ecosystemId: [''] // Required for EdoMex collective
  });
  
  // Step 3: Financial Information (cross-validated)
  private financialInfoGroup = this.fb.group({
    vehiclePrice: ['', [Validators.required, CustomValidators.mexicanCurrency()]],
    downPayment: ['', [Validators.required, CustomValidators.mexicanCurrency()]],
    requestedTerm: ['', [Validators.required]],
    monthlyIncome: ['', [Validators.required, CustomValidators.mexicanCurrency()]]
  });
  
  // Master form with cross-field validation
  masterForm = this.fb.group({
    basicInfo: this.basicInfoGroup,
    businessContext: this.businessContextGroup,
    financialInfo: this.financialInfoGroup
  }, {
    validators: [
      this.crossFieldValidator,
      this.marketSpecificValidator,
      this.financialCapacityValidator
    ]
  });
}
```

#### Dynamic Validation Based on Business Context
```typescript
// Market-dependent validation updates
setupDynamicValidation() {
  this.masterForm.get('businessContext.market')?.valueChanges.pipe(
    debounceTime(300),
    switchMap(market => this.updateValidationRulesForMarket(market)),
    takeUntil(this.destroy$)
  ).subscribe();
  
  this.masterForm.get('businessContext.businessFlow')?.valueChanges.pipe(
    debounceTime(300),
    switchMap(flow => this.updateValidationRulesForFlow(flow)),
    takeUntil(this.destroy$)
  ).subscribe();
}

private updateValidationRulesForMarket(market: Market): Observable<void> {
  return this.configService.getMarketConfig(market).pipe(
    tap(config => {
      // Update down payment validation
      const downPaymentControl = this.masterForm.get('financialInfo.downPayment');
      const vehiclePriceControl = this.masterForm.get('financialInfo.vehiclePrice');
      
      if (downPaymentControl && vehiclePriceControl) {
        downPaymentControl.setValidators([
          Validators.required,
          CustomValidators.mexicanCurrency(),
          CustomValidators.downPaymentPercentage(market, this.currentBusinessFlow)
        ]);
        downPaymentControl.updateValueAndValidity();
      }
      
      // Update credit term validation
      const termControl = this.masterForm.get('financialInfo.requestedTerm');
      if (termControl) {
        termControl.setValidators([
          Validators.required,
          CustomValidators.creditTerm(config.businessRules.availableTerms)
        ]);
        termControl.updateValueAndValidity();
      }
    }),
    map(() => void 0)
  );
}
```

---

## 🔍 DEBUGGING & INSPECTION TOOLS

### **Runtime Service Inspection**

#### Browser Console Debugging
```typescript
// Access any service from browser console
const getService = (serviceName: string) => {
  const injector = ng.getInjector();
  return injector.get(serviceName);
};

// Examples:
const configService = getService('ConfigurationService');
const stateManager = getService('StateManagementService');
const aviService = getService('VoiceValidationService');

// Inspect current configuration
configService.getCurrentConfiguration().then(config => 
  console.table(config)
);

// Monitor state changes
stateManager.state$.subscribe(state => 
  console.log('State update:', state)
);

// Check AVI calibration status
aviService.getCalibrationStatus().then(status => 
  console.log('AVI Status:', status)
);
```

#### Component Instance Access
```typescript
// Access component instances
const getComponent = (selector: string) => {
  const element = document.querySelector(selector);
  return ng.getComponent(element);
};

// Examples:
const nuevaOportunidad = getComponent('app-nueva-oportunidad');
const simulador = getComponent('app-simulador-main');
const flowBuilder = getComponent('app-flow-builder');

// Inspect form state
console.log('Form valid:', nuevaOportunidad.opportunityForm.valid);
console.log('Form value:', nuevaOportunidad.opportunityForm.value);
console.log('Form errors:', nuevaOportunidad.opportunityForm.errors);

// Access service dependencies
console.log('Config service:', nuevaOportunidad.configService);
console.log('State manager:', nuevaOportunidad.stateManager);
```

### **Performance Monitoring**

#### Service Performance Metrics
```typescript
// Monitor HTTP request performance
const httpService = getService('HttpClientService');
httpService.requestMetrics$.subscribe(metrics => {
  console.log('Request metrics:', {
    totalRequests: metrics.totalRequests,
    averageResponseTime: metrics.averageResponseTime,
    errorRate: metrics.errorRate,
    slowQueries: metrics.slowQueries
  });
});

// Monitor memory usage
const memoryMonitor = setInterval(() => {
  if (performance.memory) {
    console.log('Memory usage:', {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
      total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
    });
  }
}, 10000);
```

### **Error Tracking & Logging**

#### Comprehensive Error Monitoring
```typescript
// Global error handler configuration
const errorHandler = getService('ErrorHandlerService');

// Monitor all application errors
errorHandler.errors$.subscribe(error => {
  console.error('Application error:', {
    message: error.message,
    stack: error.stack,
    component: error.component,
    service: error.service,
    timestamp: error.timestamp,
    userAgent: navigator.userAgent,
    url: window.location.href
  });
});

// Service-specific error monitoring
const financialService = getService('CotizadorEngineService');
financialService.errors$.subscribe(error => {
  console.error('Financial calculation error:', error);
  
  // Alert for critical financial errors
  if (error.severity === 'critical') {
    alert('Critical financial error detected. Please contact support.');
  }
});
```

---

**This technical appendix provides complete surgical precision documentation of all services, dependencies, and technical patterns in the Conductores PWA system. Development teams can use this as the definitive technical reference for system maintenance and enhancement.**