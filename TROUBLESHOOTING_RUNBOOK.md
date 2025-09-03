# 🚨 TROUBLESHOOTING RUNBOOK
# Critical System Issue Resolution Guide

**For:** Conductores PWA Angular System  
**Target Audience:** Development Team, DevOps, Support Engineers  
**Escalation Path:** Defined per issue category  

---

## 🎯 QUICK REFERENCE - CRITICAL ISSUES

### 🔴 SEVERITY 1 - SYSTEM DOWN (Immediate Response Required)

| Symptom | Probable Cause | Quick Fix | Full Resolution |
|---------|---------------|-----------|-----------------|
| App won't load / White screen | Build failure, CDN issues | Check browser console, verify CDN | Rebuild & redeploy |
| Firebase auth failures | Firebase config/quota | Check Firebase console | Update config/increase quota |
| API endpoints returning 500 | Backend service down | Check API health endpoints | Restart backend services |
| Database connection failures | Network/credentials issue | Verify network connectivity | Check DB credentials/firewall |

### 🟡 SEVERITY 2 - CRITICAL BUSINESS FUNCTION DOWN (4-hour SLA)

| Symptom | Probable Cause | Quick Fix | Full Resolution |
|---------|---------------|-----------|-----------------|
| Financial calculations wrong | Config service issues | Refresh configuration cache | Validate config service |
| AVI scoring not working | Voice service API down | Check external API status | Implement fallback scoring |
| Document upload failing | Storage service issues | Check cloud storage status | Verify storage permissions |
| Credit scoring errors | Scoring service malfunction | Use manual scoring override | Debug scoring algorithm |

---

## 🔧 DETAILED TROUBLESHOOTING PROCEDURES

### 1. 💰 FINANCIAL CALCULATION SYSTEM ISSUES

#### Issue: TIR Calculations Returning NaN/Infinity

**Symptoms:**
- Monthly payment showing as NaN
- Financial projections displaying Infinity
- Quote generation failing with math errors

**Debug Steps:**
```typescript
// 1. Enable financial calculator debugging
localStorage.setItem('debug_financial', 'true');

// 2. Check cash flow array in browser console
console.log('Debug: Cash Flow Array', cashFlows);
console.log('Debug: Initial Disbursement', cashFlows[0]);
console.log('Debug: Payment Sum', cashFlows.slice(1).reduce((a, b) => a + b, 0));

// 3. Validate Newton-Raphson parameters
console.log('Debug: Guess Parameter', guessParameter);
console.log('Debug: Max Iterations', maxIterations);
console.log('Debug: Tolerance', tolerance);
```

**Root Cause Analysis:**
1. **Invalid Cash Flow Structure:** First element must be negative (disbursement)
2. **Zero or Negative Payments:** All payments must be positive
3. **Mathematical Edge Cases:** Extreme values causing convergence failure
4. **Configuration Issues:** Wrong market rates being applied

**Resolution Steps:**

**Step 1: Validate Input Data**
```bash
# Check configuration service
curl -X GET "https://api.conductores-pwa.com/config/markets" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected response structure:
{
  "aguascalientes": { "interestRate": 0.255 },
  "edomex": { "interestRate": 0.299 }
}
```

**Step 2: Fix Cash Flow Validation**
```typescript
// Add to FinancialCalculatorService
private validateCashFlows(cashFlows: number[]): ValidationResult {
  if (cashFlows.length < 2) {
    return { valid: false, reason: 'Need at least disbursement + 1 payment' };
  }
  
  if (cashFlows[0] >= 0) {
    return { valid: false, reason: 'Initial disbursement must be negative' };
  }
  
  const hasInvalidPayments = cashFlows.slice(1).some(payment => payment <= 0);
  if (hasInvalidPayments) {
    return { valid: false, reason: 'All payments must be positive' };
  }
  
  return { valid: true };
}
```

**Step 3: Implement Fallback Calculation**
```typescript
// Fallback if Newton-Raphson fails
calculateTIRWithFallback(cashFlows: number[]): number {
  try {
    return this.calculateTIR(cashFlows);
  } catch (error) {
    console.warn('Newton-Raphson failed, using approximation method', error);
    return this.approximateTIR(cashFlows);
  }
}

private approximateTIR(cashFlows: number[]): number {
  // Simple approximation method as fallback
  const totalPayments = cashFlows.slice(1).reduce((sum, payment) => sum + payment, 0);
  const principal = Math.abs(cashFlows[0]);
  const term = cashFlows.length - 1;
  
  return ((totalPayments - principal) / principal) / term * 12; // Annualized
}
```

**Verification:**
```bash
# Test financial calculations
npm run test:services -- --grep "FinancialCalculatorService"

# Manual verification with known values
curl -X POST "https://api.conductores-pwa.com/calculate/tir" \
  -H "Content-Type: application/json" \
  -d '{"cashFlows": [-100000, 5000, 5000, 5000, 5000]}'
```

---

### 2. 🎤 AVI VOICE SYSTEM ISSUES

#### Issue: AVI Scoring Inconsistent or Failing

**Symptoms:**
- Voice analysis returning error codes
- Inconsistent scoring between similar responses  
- Audio transcription failing
- Client risk scores not updating

**Debug Steps:**
```typescript
// 1. Enable AVI debugging
localStorage.setItem('debug_avi', 'true');

// 2. Check media permissions
navigator.permissions.query({name: 'microphone'}).then(result => {
  console.log('Microphone permission:', result.state);
});

// 3. Test voice analysis pipeline
console.log('Voice Analysis Result:', voiceAnalysisResult);
console.log('Transcription Confidence:', transcriptionConfidence);
console.log('Audio Quality Metrics:', audioQualityMetrics);
```

**Root Cause Analysis:**
1. **Media Permissions:** Microphone access denied/revoked
2. **Audio Quality:** Poor audio quality affecting analysis
3. **API Connectivity:** External voice service API issues
4. **Configuration:** Wrong AVI service configuration

**Resolution Steps:**

**Step 1: Verify Media Permissions**
```typescript
// Add to MediaPermissionsService
async debugPermissions(): Promise<PermissionStatus[]> {
  const permissions = await Promise.all([
    navigator.permissions.query({name: 'microphone'}),
    navigator.permissions.query({name: 'camera'})
  ]);
  
  permissions.forEach((permission, index) => {
    const type = index === 0 ? 'microphone' : 'camera';
    console.log(`${type} permission:`, permission.state);
    
    if (permission.state === 'denied') {
      console.error(`${type} permission denied. User must manually enable in browser.`);
    }
  });
  
  return permissions;
}
```

**Step 2: Test Voice Analysis Pipeline**
```bash
# Check OpenAI Whisper API connectivity
curl -X POST "https://api.openai.com/v1/audio/transcriptions" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F file="@test-audio.wav" \
  -F model="whisper-1"
```

**Step 3: Implement Audio Quality Validation**
```typescript
// Add to VoiceValidationService
validateAudioQuality(audioData: Blob): AudioQualityResult {
  return new Promise((resolve) => {
    const audioContext = new AudioContext();
    const fileReader = new FileReader();
    
    fileReader.onload = async (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Analyze audio characteristics
      const channelData = audioBuffer.getChannelData(0);
      const rms = this.calculateRMS(channelData);
      const peakAmplitude = Math.max(...channelData.map(Math.abs));
      const duration = audioBuffer.duration;
      
      resolve({
        rms,
        peakAmplitude,
        duration,
        sampleRate: audioBuffer.sampleRate,
        quality: rms > 0.01 && peakAmplitude > 0.1 ? 'GOOD' : 'POOR'
      });
    };
    
    fileReader.readAsArrayBuffer(audioData);
  });
}
```

**Step 4: Add AVI Fallback Scoring**
```typescript
// Add to AVIService  
private calculateFallbackScore(responses: AVIResponse[]): AVIScore {
  // Simple rule-based scoring when AI analysis fails
  let score = 500; // Base score
  
  responses.forEach(response => {
    const question = this.getQuestionById(response.questionId);
    if (!question) return;
    
    // Basic response time evaluation
    const expectedTime = question.analytics.expectedResponseTime;
    if (response.responseTime <= expectedTime * 1.5) {
      score += 10; // Normal timing
    } else {
      score -= 5; // Slow response
    }
    
    // Text length evaluation (very basic)
    if (response.transcription.length > 10) {
      score += 5; // Detailed response
    }
  });
  
  return {
    totalScore: Math.max(0, Math.min(1000, score)),
    riskLevel: this.calculateRiskLevel(score),
    categoryScores: {},
    redFlags: [],
    recommendations: ['Fallback scoring used - manual review recommended'],
    processingTime: 0
  };
}
```

**Verification:**
```bash
# Test AVI system
npm run test:services -- --grep "AVIService"

# Check voice processing pipeline
curl -X POST "https://api.conductores-pwa.com/avi/test-pipeline" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "audio=@test-voice.wav"
```

---

### 3. ⚙️ CONFIGURATION SERVICE ISSUES

#### Issue: Business Rules Not Applied Correctly

**Symptoms:**
- Wrong interest rates being applied
- Incorrect document requirements
- Business flow validations failing
- Market-specific rules not working

**Debug Steps:**
```typescript
// 1. Check current configuration
const config = this.configService.getCurrentConfiguration();
console.log('Current Config Version:', config.version);
console.log('Last Updated:', config.lastUpdated);
console.log('Market Config:', config.markets);

// 2. Verify configuration loading
console.log('Config Load Status:', this.configService.isLoaded);
console.log('Config Errors:', this.configService.loadErrors);

// 3. Test specific market rules
const agsConfig = config.markets.aguascalientes;
console.log('AGS Interest Rate:', agsConfig.interestRate);
console.log('AGS Standard Term:', agsConfig.standardTerm);
```

**Root Cause Analysis:**
1. **Configuration API Down:** External config service unreachable
2. **Cache Issues:** Stale configuration cached in browser/service
3. **Environment Variables:** Missing or incorrect environment configuration
4. **Version Conflicts:** Different configuration versions across environments

**Resolution Steps:**

**Step 1: Check Configuration API**
```bash
# Test configuration endpoint
curl -X GET "https://api.conductores-pwa.com/configuration" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Accept: application/json"

# Expected response structure:
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-09T10:00:00Z", 
  "markets": {
    "aguascalientes": { "interestRate": 0.255 },
    "edomex": { "interestRate": 0.299 }
  }
}
```

**Step 2: Clear Configuration Cache**
```typescript
// Add to ConfigurationService
clearCache(): void {
  localStorage.removeItem('app_configuration_cache');
  sessionStorage.removeItem('app_configuration_temp');
  this.configurationSubject.next(this.getDefaultConfiguration());
  console.log('Configuration cache cleared, using defaults');
}

// Force refresh from API
forceRefresh(): Observable<ApplicationConfiguration> {
  this.clearCache();
  return this.loadConfigurationFromAPI().pipe(
    tap(config => {
      this.configurationSubject.next(config);
      console.log('Configuration force refreshed');
    }),
    catchError(error => {
      console.error('Force refresh failed, using defaults', error);
      const defaultConfig = this.getDefaultConfiguration();
      this.configurationSubject.next(defaultConfig);
      return of(defaultConfig);
    })
  );
}
```

**Step 3: Add Configuration Validation**
```typescript
// Add to ConfigurationService
private validateConfiguration(config: ApplicationConfiguration): ValidationResult {
  const errors: string[] = [];
  
  // Validate market configurations
  if (!config.markets.aguascalientes || !config.markets.edomex) {
    errors.push('Missing required market configurations');
  }
  
  // Validate interest rates
  if (config.markets.aguascalientes?.interestRate <= 0) {
    errors.push('Invalid AGS interest rate');
  }
  
  if (config.markets.edomex?.interestRate <= 0) {
    errors.push('Invalid EdoMex interest rate');
  }
  
  // Validate scoring thresholds
  const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'E'];
  grades.forEach(grade => {
    if (!config.scoring.scoringThresholds.grades[grade]) {
      errors.push(`Missing scoring threshold for grade ${grade}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Step 4: Implement Configuration Health Check**
```typescript
// Add configuration health check endpoint
healthCheck(): Observable<ConfigHealthStatus> {
  return this.loadConfigurationFromAPI().pipe(
    map(config => {
      const validation = this.validateConfiguration(config);
      return {
        status: validation.valid ? 'HEALTHY' : 'UNHEALTHY',
        version: config.version,
        lastUpdated: config.lastUpdated,
        issues: validation.errors,
        timestamp: new Date()
      };
    }),
    catchError(error => {
      return of({
        status: 'UNHEALTHY',
        version: 'UNKNOWN',
        lastUpdated: null,
        issues: [`Configuration API unreachable: ${error.message}`],
        timestamp: new Date()
      });
    })
  );
}
```

**Verification:**
```bash
# Test configuration service
npm run test:services -- --grep "ConfigurationService"

# Manual configuration validation
curl -X GET "https://api.conductores-pwa.com/configuration/health" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

### 4. 🔄 STATE MANAGEMENT ISSUES

#### Issue: Components Not Receiving State Updates

**Symptoms:**
- Dashboard not updating with new data
- Client selection not propagating
- Notifications not appearing
- Component data out of sync

**Debug Steps:**
```typescript
// 1. Check service injection
console.log('StateManagement Service:', this.stateManagement);
console.log('Is service defined:', !!this.stateManagement);

// 2. Check subscriptions
console.log('Active subscriptions count:', this.subscriptions.length);
console.log('Subscription closed:', this.subscriptions.some(s => s.closed));

// 3. Check BehaviorSubject values
console.log('Current clients:', this.stateManagement.currentClients);
console.log('Current view:', this.stateManagement.currentActiveView);
console.log('Loading state:', this.stateManagement.currentIsLoading);
```

**Root Cause Analysis:**
1. **Memory Leaks:** Subscriptions not properly closed
2. **Service Injection:** StateManagementService not injected correctly
3. **Async Issues:** Race conditions in state updates
4. **Change Detection:** Angular change detection not triggered

**Resolution Steps:**

**Step 1: Fix Subscription Management**
```typescript
// Proper subscription pattern
export class ExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit(): void {
    // ✅ CORRECT: Use takeUntil for automatic cleanup
    this.stateManagement.clients$
      .pipe(takeUntil(this.destroy$))
      .subscribe(clients => {
        this.clients = clients;
        this.cdr.detectChanges(); // Force change detection if needed
      });
  }
  
  ngOnDestroy(): void {
    // ✅ CRITICAL: Always cleanup subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Step 2: Add State Management Debugging**
```typescript
// Add to StateManagementService
enableDebugMode(): void {
  this.isDebugMode = true;
  
  // Log all state changes
  this.activeView$.subscribe(view => 
    console.log('🔄 State Change - Active View:', view)
  );
  
  this.clients$.subscribe(clients => 
    console.log('🔄 State Change - Clients:', clients.length)
  );
  
  this.isLoading$.subscribe(loading => 
    console.log('🔄 State Change - Loading:', loading)
  );
}

// Check for memory leaks
getSubscriptionStatus(): SubscriptionStatus {
  return {
    activeView: !this.activeViewSubject.closed,
    clients: !this.clientsSubject.closed,
    selectedClient: !this.selectedClientSubject.closed,
    isLoading: !this.isLoadingSubject.closed,
    notifications: !this.notificationsSubject.closed
  };
}
```

**Step 3: Implement State Synchronization Check**
```typescript
// Add to StateManagementService
synchronizeState(): Observable<boolean> {
  return forkJoin([
    this.clientDataService.getClients(),
    this.ecosystemDataService.getEcosystemData(),
    this.mockApiService.getDashboardStats()
  ]).pipe(
    map(([clients, ecosystem, stats]) => {
      // Update all state subjects
      this.clientsSubject.next(clients);
      this.sidebarAlertsSubject.next(this.calculateAlerts(clients));
      this.isLoadingSubject.next(false);
      
      console.log('✅ State synchronized successfully');
      return true;
    }),
    catchError(error => {
      console.error('❌ State synchronization failed:', error);
      return of(false);
    })
  );
}
```

**Step 4: Add Component Health Check**
```typescript
// Add to components that use StateManagement
checkStateHealth(): ComponentHealthStatus {
  const subscriptions = [
    { name: 'clients$', active: !this.clientsSubscription?.closed },
    { name: 'activeView$', active: !this.activeViewSubscription?.closed },
    { name: 'notifications$', active: !this.notificationsSubscription?.closed }
  ];
  
  const healthySubscriptions = subscriptions.filter(s => s.active);
  
  return {
    component: this.constructor.name,
    subscriptionsHealthy: healthySubscriptions.length === subscriptions.length,
    activeSubscriptions: healthySubscriptions.length,
    totalSubscriptions: subscriptions.length,
    stateServiceInjected: !!this.stateManagement,
    lastStateUpdate: this.lastStateUpdateTime
  };
}
```

**Verification:**
```bash
# Test state management
npm run test:services -- --grep "StateManagementService"

# Check for memory leaks
npm run test:memory-leaks
```

---

### 5. 📝 FORM VALIDATION ISSUES

#### Issue: Custom Validators Not Working

**Symptoms:**
- Form showing as valid when it should be invalid
- Custom validation messages not appearing
- Cross-field validation not triggering
- Business rule validation bypassed

**Debug Steps:**
```typescript
// 1. Check form control validation
const control = this.form.get('fieldName');
console.log('Control value:', control?.value);
console.log('Control valid:', control?.valid);
console.log('Control errors:', control?.errors);
console.log('Control validators:', control?.validators);

// 2. Check form-level validation  
console.log('Form valid:', this.form.valid);
console.log('Form errors:', this.form.errors);
console.log('Form dirty:', this.form.dirty);
console.log('Form touched:', this.form.touched);

// 3. Test validator functions directly
const validationResult = this.rfcValidator(new FormControl('INVALID_RFC'));
console.log('Direct validator result:', validationResult);
```

**Root Cause Analysis:**
1. **Validator Registration:** Validators not properly registered in FormBuilder
2. **Validator Logic:** Logic errors in custom validator functions
3. **Async Validation:** Race conditions with async validators
4. **Form Control Configuration:** Incorrect FormControl setup

**Resolution Steps:**

**Step 1: Fix Validator Registration**
```typescript
// ❌ INCORRECT: Validator not called as function
this.fb.group({
  rfc: ['', [Validators.required, this.rfcValidator]]
});

// ✅ CORRECT: Validator called as function or bound to this
this.fb.group({
  rfc: ['', [Validators.required, this.rfcValidator.bind(this)]]
});

// OR use arrow function in constructor
constructor(private fb: FormBuilder) {
  this.rfcValidator = (control: AbstractControl): ValidationErrors | null => {
    // Validator logic here
  };
}
```

**Step 2: Implement Robust Custom Validators**
```typescript
// Robust RFC validator with detailed error info
rfcValidator = (control: AbstractControl): ValidationErrors | null => {
  const rfc = control.value;
  
  if (!rfc) return null; // Let required validator handle empty values
  
  // Remove spaces and convert to uppercase
  const cleanRFC = rfc.replace(/\s/g, '').toUpperCase();
  
  // RFC pattern for individuals (13 chars) and companies (12 chars)
  const pattern = /^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/;
  
  if (!pattern.test(cleanRFC)) {
    return {
      invalidRFC: {
        message: 'RFC format is invalid',
        providedValue: rfc,
        expectedPattern: 'ABCD123456ABC (13 chars) or ABC123456AB1 (12 chars)',
        cleanedValue: cleanRFC
      }
    };
  }
  
  // Additional business logic validation
  if (this.isRFCBlacklisted(cleanRFC)) {
    return {
      blacklistedRFC: {
        message: 'This RFC is in the blacklist',
        rfc: cleanRFC
      }
    };
  }
  
  return null;
};

// Cross-field validator for income coherence
incomeCoherenceValidator = (formGroup: AbstractControl): ValidationErrors | null => {
  const ingresos = formGroup.get('ingresosMensuales')?.value;
  const gastos = formGroup.get('gastosMensuales')?.value;
  
  if (!ingresos || !gastos) return null;
  
  const gastoRatio = gastos / ingresos;
  
  if (gastoRatio > 0.8) {
    return {
      gastosMuyAltos: {
        message: 'Los gastos no pueden exceder el 80% de los ingresos',
        ingresos,
        gastos,
        ratio: gastoRatio,
        maxAllowedRatio: 0.8
      }
    };
  }
  
  if (gastoRatio < 0.3) {
    return {
      gastosDemasiadoBajos: {
        message: 'Los gastos parecen demasiado bajos para ser realistas',
        ingresos,
        gastos,
        ratio: gastoRatio,
        minExpectedRatio: 0.3
      }
    };
  }
  
  return null;
};
```

**Step 3: Add Async Validator for RFC Uniqueness**
```typescript
// Async validator for RFC uniqueness check
rfcUniquenessValidator = (control: AbstractControl): Observable<ValidationErrors | null> => {
  const rfc = control.value;
  
  if (!rfc || this.rfcValidator(control)) {
    return of(null); // Don't check uniqueness if RFC format is invalid
  }
  
  return this.clientService.checkRFCExists(rfc).pipe(
    map(exists => {
      return exists ? { rfcAlreadyExists: { rfc } } : null;
    }),
    catchError(error => {
      console.warn('RFC uniqueness check failed:', error);
      return of(null); // Don't fail validation if service is down
    }),
    debounceTime(300) // Debounce API calls
  );
};
```

**Step 4: Add Form Validation Debugging**
```typescript
// Debug helper for form validation issues
debugFormValidation(form: FormGroup, controlName?: string): void {
  console.group('🔍 Form Validation Debug');
  
  if (controlName) {
    const control = form.get(controlName);
    console.log(`Control: ${controlName}`);
    console.log('Value:', control?.value);
    console.log('Valid:', control?.valid);
    console.log('Errors:', control?.errors);
    console.log('Touched:', control?.touched);
    console.log('Dirty:', control?.dirty);
  } else {
    console.log('Form Valid:', form.valid);
    console.log('Form Errors:', form.errors);
    
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control?.invalid) {
        console.log(`❌ ${key}:`, control.errors);
      } else {
        console.log(`✅ ${key}: Valid`);
      }
    });
  }
  
  console.groupEnd();
}
```

**Verification:**
```bash
# Test form validators
npm run test:components -- --grep "FormValidation"

# Test specific validator functions
npm run test:utilities -- --grep "validators"
```

---

### 6. 📄 DOCUMENT UPLOAD & OCR ISSUES

#### Issue: Document Processing Failures

**Symptoms:**
- File uploads timing out
- OCR not extracting text correctly
- Document validation failing
- Image quality rejected

**Debug Steps:**
```typescript
// 1. Check file upload status
console.log('File size:', file.size, 'bytes');
console.log('File type:', file.type);
console.log('Upload progress:', uploadProgress);

// 2. Check OCR processing
console.log('OCR confidence:', ocrResult.confidence);
console.log('Extracted text:', ocrResult.text);
console.log('Processing time:', ocrResult.processingTime);

// 3. Check document validation
console.log('Validation rules:', validationRules);
console.log('Validation results:', validationResults);
```

**Root Cause Analysis:**
1. **File Size Limits:** Files exceeding size limits
2. **Image Quality:** Poor image quality affecting OCR
3. **Network Issues:** Slow/unreliable uploads
4. **OCR Service Limits:** Tesseract.js performance issues

**Resolution Steps:**

**Step 1: Implement File Validation**
```typescript
// Add to DocumentUploadService
validateFileBeforeUpload(file: File): FileValidationResult {
  const errors: string[] = [];
  
  // File size validation (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of 5MB`);
  }
  
  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} not allowed. Use JPG, PNG, or PDF`);
  }
  
  // Image dimension validation (for images)
  if (file.type.startsWith('image/')) {
    return this.validateImageDimensions(file).then(dimensionErrors => ({
      valid: errors.length === 0 && dimensionErrors.length === 0,
      errors: [...errors, ...dimensionErrors],
      file
    }));
  }
  
  return Promise.resolve({
    valid: errors.length === 0,
    errors,
    file
  });
}
```

**Step 2: Add Image Quality Enhancement**
```typescript
// Add image preprocessing before OCR
async preprocessImageForOCR(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set optimal dimensions for OCR (min 1200px width)
      const scale = Math.max(1, 1200 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Draw image with enhancement
      ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Apply image enhancements
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      this.enhanceImageForOCR(imageData);
      ctx!.putImageData(imageData, 0, 0);
      
      // Convert back to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const enhancedFile = new File([blob], file.name, { type: 'image/png' });
          resolve(enhancedFile);
        } else {
          reject(new Error('Failed to enhance image'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

private enhanceImageForOCR(imageData: ImageData): void {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    
    // Increase contrast
    const contrast = 1.5;
    const enhanced = ((gray - 128) * contrast) + 128;
    
    // Apply threshold for black/white
    const threshold = enhanced > 128 ? 255 : 0;
    
    data[i] = threshold;     // R
    data[i + 1] = threshold; // G
    data[i + 2] = threshold; // B
    // Alpha channel (i + 3) unchanged
  }
}
```

**Step 3: Implement Progressive Upload**
```typescript
// Add chunked upload for large files
async uploadFileWithProgress(
  file: File, 
  progressCallback: (progress: number) => void
): Promise<UploadResult> {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedChunks = 0;
  
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      await this.uploadChunk(uploadId, i, chunk, totalChunks);
      
      uploadedChunks++;
      progressCallback((uploadedChunks / totalChunks) * 100);
    }
    
    // Finalize upload
    const result = await this.finalizeUpload(uploadId);
    return result;
    
  } catch (error) {
    // Cleanup failed upload
    await this.cleanupFailedUpload(uploadId);
    throw error;
  }
}
```

**Step 4: Add OCR Fallback Strategy**
```typescript
// Add multiple OCR processing strategies
async processDocumentWithFallback(file: File): Promise<OCRResult> {
  try {
    // Primary: Enhanced Tesseract.js
    const enhancedFile = await this.preprocessImageForOCR(file);
    const result = await this.processWithTesseract(enhancedFile);
    
    if (result.confidence > 0.7) {
      return result;
    }
    
    // Fallback 1: Different Tesseract settings
    const fallback1 = await this.processWithTesseract(enhancedFile, {
      tessedit_pageseg_mode: 6, // Single uniform block
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    });
    
    if (fallback1.confidence > 0.6) {
      return fallback1;
    }
    
    // Fallback 2: External OCR service
    return await this.processWithExternalOCR(file);
    
  } catch (error) {
    console.error('All OCR methods failed:', error);
    return {
      text: '',
      confidence: 0,
      error: error.message,
      processingTime: 0
    };
  }
}
```

**Verification:**
```bash
# Test document upload system
npm run test:services -- --grep "DocumentUpload"

# Test OCR processing
npm run test:integration -- --grep "OCRProcessing"
```

---

## 📞 ESCALATION PROCEDURES

### Severity Level Definitions

#### 🔴 Severity 1 - Critical System Down
- **Response Time:** Immediate (< 15 minutes)
- **Stakeholders:** CTO, Tech Lead, DevOps Lead
- **Communication:** Slack incident channel + Phone calls
- **Resolution SLA:** 2 hours

#### 🟡 Severity 2 - Major Feature Down  
- **Response Time:** 1 hour
- **Stakeholders:** Tech Lead, Product Manager
- **Communication:** Slack + Email
- **Resolution SLA:** 8 hours

#### 🟢 Severity 3 - Minor Issues
- **Response Time:** 4 hours  
- **Stakeholders:** Assigned Developer
- **Communication:** Ticket system
- **Resolution SLA:** 2 business days

### Escalation Contacts

| Role | Primary Contact | Backup Contact | Phone | Slack |
|------|-----------------|----------------|-------|-------|
| CTO | [Name] | [Backup] | +52-XXX-XXX-XXXX | @cto |
| Tech Lead | [Name] | [Backup] | +52-XXX-XXX-XXXX | @tech-lead |
| DevOps Lead | [Name] | [Backup] | +52-XXX-XXX-XXXX | @devops-lead |
| Product Manager | [Name] | [Backup] | +52-XXX-XXX-XXXX | @product |

### External Service Contacts

| Service | Support Contact | Status Page | Documentation |
|---------|-----------------|-------------|---------------|
| Firebase | firebase-support@google.com | https://status.firebase.google.com | https://firebase.google.com/docs |
| OpenAI | support@openai.com | https://status.openai.com | https://platform.openai.com/docs |
| Metamap | support@metamap.com | N/A | https://docs.metamap.com |

---

## 📋 MONITORING & HEALTH CHECKS

### Application Health Endpoints

```bash
# Basic health check
curl -X GET "https://api.conductores-pwa.com/health"

# Detailed system health
curl -X GET "https://api.conductores-pwa.com/health/detailed" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Service-specific health checks
curl -X GET "https://api.conductores-pwa.com/health/financial-calculator"
curl -X GET "https://api.conductores-pwa.com/health/avi-service"
curl -X GET "https://api.conductores-pwa.com/health/configuration"
```

### Key Metrics to Monitor

| Metric | Threshold | Alert Level | Action Required |
|--------|-----------|-------------|-----------------|
| Page Load Time | > 3 seconds | Warning | Performance optimization |
| API Response Time | > 2 seconds | Warning | Backend investigation |
| Error Rate | > 5% | Critical | Immediate investigation |
| Memory Usage | > 85% | Warning | Resource scaling |
| Database Connections | > 80% | Warning | Connection pool tuning |

### Log Analysis Commands

```bash
# Search for financial calculation errors
grep -E "TIR.*NaN|Financial.*Error" /var/log/conductores-pwa/app.log

# Search for AVI processing failures  
grep -E "AVI.*failed|Voice.*error" /var/log/conductores-pwa/app.log

# Search for authentication issues
grep -E "Auth.*failed|Firebase.*error" /var/log/conductores-pwa/app.log

# Monitor real-time errors
tail -f /var/log/conductores-pwa/app.log | grep -E "ERROR|FATAL"
```

---

This troubleshooting runbook provides comprehensive procedures for resolving critical issues in the Conductores PWA system. Keep this document updated as new issues are discovered and resolved.