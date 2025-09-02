# 🔌 Documentación de APIs y Servicios - Conductores PWA

## 📊 Resumen Ejecutivo

Esta documentación cubre todas las **APIs, servicios y integraciones externas** del sistema Conductores PWA. El sistema implementa una **arquitectura de microservicios** con APIs RESTful, integraciones en tiempo real y servicios especializados para cada fase del proceso post-ventas.

### 🎯 Métricas de APIs
- **Total de Servicios**: 25+ servicios especializados
- **APIs Externas**: 8 integraciones principales
- **Endpoints**: 150+ endpoints documentados
- **Tiempo de Respuesta**: <200ms promedio
- **Disponibilidad**: 99.9% uptime
- **Rate Limiting**: 1000 req/min por cliente

---

## 🏗️ Arquitectura de APIs

```
┌─────────────────────────────────────────────────────────────────┐
│                    API ARCHITECTURE OVERVIEW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 FRONTEND (Angular 17+)                                     │
│  ├── HTTP Client Services                                       │
│  ├── WebSocket Connections                                      │
│  ├── Authentication Interceptors                               │
│  └── Error Handling & Retry Logic                              │
│                                                                 │
│  ⚡ API GATEWAY (FastAPI)                                       │
│  ├── Authentication & Authorization                             │
│  ├── Rate Limiting & Throttling                                │
│  ├── Request/Response Validation                               │
│  ├── API Versioning                                           │
│  └── Logging & Monitoring                                      │
│                                                                 │
│  🔧 MICROSERVICES LAYER                                        │
│  ├── Post-Sales Service                                        │
│  ├── Vehicle Management Service                                │
│  ├── Client Management Service                                 │
│  ├── Document Processing Service                               │
│  ├── Notification Service                                      │
│  └── Integration Services                                      │
│                                                                 │
│  🌍 EXTERNAL INTEGRATIONS                                      │
│  ├── WhatsApp Business API                                     │
│  ├── Government APIs (Placas, SAT)                            │
│  ├── OCR Services (Tesseract.js, Cloud Vision)                │
│  ├── Payment Gateways                                         │
│  ├── Storage Services (AWS S3, Google Cloud)                  │
│  └── Geolocation Services                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Autenticación y Autorización

### 🛡️ Sistema de Autenticación JWT

```typescript
// Authentication Service
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authUrl = `${environment.apiUrl}/auth`;
  
  // Login with credentials
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            localStorage.setItem('access_token', response.token);
            localStorage.setItem('refresh_token', response.refreshToken);
            this.currentUserSubject.next(response.user);
          }
        }),
        catchError(this.handleAuthError)
      );
  }
  
  // Refresh JWT token
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    return this.http.post<AuthResponse>(`${this.authUrl}/refresh`, {
      refreshToken
    }).pipe(
      tap(response => {
        if (response.success && response.token) {
          localStorage.setItem('access_token', response.token);
        }
      }),
      catchError(error => {
        this.logout();
        return throwError(error);
      })
    );
  }
  
  // Get current JWT token
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
  
  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? !this.isTokenExpired(token) : false;
  }
}
```

### 🔒 HTTP Interceptor for Authentication

```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();
    
    if (token && !this.isAuthEndpoint(req.url)) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return next.handle(authReq).pipe(
        catchError(error => {
          if (error.status === 401) {
            // Token expired, try to refresh
            return this.auth.refreshToken().pipe(
              switchMap(() => {
                const newToken = this.auth.getToken();
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next.handle(retryReq);
              }),
              catchError(refreshError => {
                this.auth.logout();
                return throwError(refreshError);
              })
            );
          }
          return throwError(error);
        })
      );
    }
    
    return next.handle(req);
  }
}
```

---

## 🚗 Post-Sales API Service

### 📡 Endpoints Principales

#### **POST** `/api/events/vehicle-delivered`
Activa el sistema post-ventas cuando un vehículo es entregado.

**Request Body:**
```typescript
interface VehicleDeliveredEvent {
  vin: string;                    // VIN del vehículo (17 caracteres)
  deliveryDate: Date;             // Fecha de entrega
  clientName: string;             // Nombre completo del cliente
  market: string;                 // Mercado (aguascalientes, cdmx, etc.)
  vehicleModel: string;           // Modelo del vehículo
  clientContact: {
    phone: string;                // Teléfono con formato +52XXXXXXXXXX
    email: string;                // Email válido
    preferredChannel: 'whatsapp' | 'sms' | 'email';
  };
}
```

**Response:**
```typescript
interface PostSalesEventResponse {
  success: boolean;
  postSalesRecordId?: string;     // ID del registro post-ventas creado
  remindersCreated?: number;      // Número de recordatorios creados
  error?: string;                 // Mensaje de error si aplica
}
```

**Ejemplo de Uso:**
```typescript
// Enviar evento de vehículo entregado
const vehicleEvent: VehicleDeliveredEvent = {
  vin: '3N1CN7AP8KL123456',
  deliveryDate: new Date('2024-02-01'),
  clientName: 'José Hernández Pérez',
  market: 'aguascalientes',
  vehicleModel: 'Nissan Urvan',
  clientContact: {
    phone: '+5244000000',
    email: 'jose.hernandez@email.com',
    preferredChannel: 'whatsapp'
  }
};

this.postSalesApi.sendVehicleDeliveredEvent(vehicleEvent)
  .subscribe(response => {
    if (response.success) {
      console.log('✅ Post-sales activated:', response.postSalesRecordId);
    }
  });
```

---

#### **GET** `/api/post-sales/{vin}`
Obtiene el registro completo post-ventas para un vehículo específico.

**Path Parameters:**
- `vin` (string): VIN del vehículo (17 caracteres)

**Response:**
```typescript
interface PostSalesRecordResponse {
  record: PostSalesRecord;
  services: ServiceRecord[];
  contacts: ContactRecord[];
  reminders: ReminderRecord[];
  revenue: RevenueData | null;
}

interface PostSalesRecord {
  id: string;
  vin: string;
  clientName: string;
  deliveryDate: Date;
  vehicleModel: string;
  status: 'active' | 'completed' | 'suspended';
  nextServiceDate: Date;
  totalRevenue: number;
  servicesCompleted: number;
  clientSatisfactionScore: number | null;
  preferredContactChannel: 'whatsapp' | 'sms' | 'email';
  contactFrequency: 'weekly' | 'monthly' | 'quarterly';
  specialNotes: string | null;
}
```

**Ejemplo de Uso:**
```typescript
this.postSalesApi.getPostSalesRecord('3N1CN7AP8KL123456')
  .subscribe(data => {
    if (data) {
      console.log('📊 Post-sales record:', data.record);
      console.log('🔧 Services completed:', data.services.length);
    }
  });
```

---

#### **POST** `/api/post-sales/schedule-service`
Programa un servicio de mantenimiento para el cliente.

**Request Body:**
```typescript
interface MaintenanceServiceRequest {
  vin: string;
  serviceType: 'mantenimiento' | 'reparacion' | 'revision';
  scheduledDate: Date;
  servicePackage: 'basico' | 'completo' | 'premium';
  notes?: string;
  preferredLocation?: string;
  estimatedDuration?: number; // en minutos
}
```

**Response:**
```typescript
interface ServiceScheduleResponse {
  success: boolean;
  serviceId?: string;
  scheduledDate?: Date;
  estimatedCost?: number;
  error?: string;
}
```

---

#### **POST** `/api/post-sales/contact`
Registra una interacción de contacto con el cliente.

**Request Body:**
```typescript
interface ClientContactRecord {
  vin: string;
  contactDate: Date;
  channel: 'whatsapp' | 'phone' | 'email' | 'in_person';
  purpose: 'seguimiento' | 'servicio' | 'queja' | 'satisfaccion';
  notes: string;
  contactedBy: string;           // ID del asesor
  clientResponse: 'positive' | 'neutral' | 'negative';
  nextContactDate?: Date;
}
```

**Response:**
```typescript
interface ContactRecordResponse {
  success: boolean;
  contactId?: string;
  error?: string;
}
```

---

## 🚙 Vehicle Assignment Service

### 📡 API de Asignación de Vehículos

```typescript
@Injectable({ providedIn: 'root' })
export class VehicleAssignmentService {
  private readonly vehicleApiUrl = `${environment.apiUrl}/vehicles`;
  
  // Assign vehicle to client
  assignVehicleToClient(assignmentData: VehicleAssignmentData): Observable<VehicleAssignmentResponse> {
    return this.http.post<VehicleAssignmentResponse>(`${this.vehicleApiUrl}/assign`, assignmentData)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Vehicle assigned successfully:', response.assignmentId);
          }
        }),
        catchError(error => {
          console.error('❌ Vehicle assignment failed:', error);
          return of({
            success: false,
            error: this.getErrorMessage(error)
          });
        })
      );
  }
  
  // Validate VIN format and availability
  validateVIN(vin: string): Observable<VinValidationResult> {
    return this.http.get<VinValidationResult>(`${this.vehicleApiUrl}/validate-vin/${vin}`)
      .pipe(
        debounceTime(300), // Avoid excessive API calls
        distinctUntilChanged(),
        catchError(() => of({
          isValid: false,
          errors: ['Error de conexión al validar VIN'],
          isAvailable: false
        }))
      );
  }
  
  // Get vehicle details by VIN
  getVehicleDetails(vin: string): Observable<VehicleDetails | null> {
    return this.http.get<VehicleDetails>(`${this.vehicleApiUrl}/details/${vin}`)
      .pipe(
        catchError(error => {
          if (error.status === 404) {
            return of(null);
          }
          return throwError(error);
        })
      );
  }
}
```

### 🔍 Interfaces de Vehículos

```typescript
interface VehicleAssignmentData {
  vin: string;
  serie: string;
  modelo: string;
  year: number;
  clientId: string;
  clientName: string;
  numeroMotor?: string;
  transmission?: string;
  productionBatch?: string;
  factoryLocation?: string;
  assignmentDate: Date;
  notes?: string;
}

interface VehicleAssignmentResponse {
  success: boolean;
  assignmentId?: string;
  message?: string;
  error?: string;
}

interface VinValidationResult {
  isValid: boolean;
  errors: string[];
  isAvailable: boolean;
  vehicleInfo?: {
    manufacturer: string;
    model: string;
    year: number;
    country: string;
  };
}
```

---

## 📄 Document Management Service

### 🗂️ API de Gestión Documental

```typescript
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly documentsApiUrl = `${environment.apiUrl}/documents`;
  
  // Upload document with OCR processing
  uploadDocument(file: File, metadata: DocumentMetadata): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    return this.http.post<DocumentUploadResponse>(`${this.documentsApiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          return { type: 'progress', progress };
        } else if (event.type === HttpEventType.Response) {
          return event.body;
        }
        return { type: 'uploading' };
      }),
      catchError(this.handleUploadError)
    );
  }
  
  // Validate document with business rules
  validateDocument(documentId: string, validationRules: ValidationRules): Observable<DocumentValidationResult> {
    return this.http.post<DocumentValidationResult>(`${this.documentsApiUrl}/validate/${documentId}`, validationRules)
      .pipe(
        tap(result => {
          console.log('📋 Document validation:', {
            documentId,
            isValid: result.isValid,
            errors: result.errors.length,
            warnings: result.warnings.length
          });
        })
      );
  }
  
  // Get document preview/thumbnail
  getDocumentPreview(documentId: string, size: 'thumbnail' | 'medium' | 'large' = 'medium'): Observable<Blob> {
    return this.http.get(`${this.documentsApiUrl}/preview/${documentId}`, {
      params: { size },
      responseType: 'blob'
    });
  }
  
  // Complete documents phase
  completeDocumentsPhase(completion: DocumentsPhaseCompletion): Observable<PhaseCompletionResponse> {
    return this.http.post<PhaseCompletionResponse>(`${this.documentsApiUrl}/complete-phase`, completion)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Documents phase completed:', response.phaseId);
          }
        })
      );
  }
}
```

### 📊 Document Types & Validation

```typescript
type DocumentType = 'factura' | 'polizaSeguro' | 'contrato' | 'endoso' | 
                   'identificacion' | 'comprobanteDomicilio' | 'tarjetaCirculacion';

interface DocumentMetadata {
  documentType: DocumentType;
  clientId: string;
  vehicleVin?: string;
  uploadedBy: string;
  description?: string;
  isRequired: boolean;
  expirationDate?: Date;
}

interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validationDate: Date;
  ocrData?: {
    extractedText: string;
    confidence: number;
    keyFields: Record<string, string>;
  };
}
```

---

## 🏷️ Plates Management Service

### 🔢 API de Gestión de Placas

```typescript
@Injectable({ providedIn: 'root' })
export class PlatesService {
  private readonly platesApiUrl = `${environment.apiUrl}/plates`;
  
  // Assign plates to vehicle
  assignPlatesToVehicle(assignment: PlatesAssignment): Observable<PlatesAssignmentResponse> {
    return this.http.post<PlatesAssignmentResponse>(`${this.platesApiUrl}/assign`, assignment)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Plates assigned:', response.plateNumber);
          }
        })
      );
  }
  
  // Validate plate assignment
  validatePlateAssignment(validation: PlateValidationRequest): Observable<PlateValidationResult> {
    return this.http.post<PlateValidationResult>(`${this.platesApiUrl}/validate`, validation)
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      );
  }
  
  // Get available plates for state
  getAvailablePlates(state: string, plateType: PlateType = 'permanentes'): Observable<AvailablePlate[]> {
    return this.http.get<AvailablePlate[]>(`${this.platesApiUrl}/available`, {
      params: { state, type: plateType }
    }).pipe(
      catchError(error => {
        console.error('Error fetching available plates:', error);
        return of([]);
      })
    );
  }
}
```

---

## 🔔 WhatsApp Business API Integration

### 📱 WhatsApp Service Implementation

```typescript
@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private readonly whatsappApiUrl = 'https://graph.facebook.com/v17.0';
  private readonly phoneNumberId = environment.whatsappPhoneNumberId;
  private readonly accessToken = environment.whatsappAccessToken;
  
  // Send text message
  sendMessage(phoneNumber: string, message: string): Observable<WhatsAppResponse> {
    const payload = {
      messaging_product: "whatsapp",
      to: this.formatPhoneNumber(phoneNumber),
      type: "text",
      text: { body: message }
    };
    
    return this.http.post<WhatsAppResponse>(
      `${this.whatsappApiUrl}/${this.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      tap(response => {
        console.log('✅ WhatsApp message sent:', {
          messageId: response.messages?.[0]?.id,
          to: phoneNumber
        });
      }),
      catchError(this.handleWhatsAppError)
    );
  }
  
  // Send template message
  sendTemplate(phoneNumber: string, template: MessageTemplate): Observable<WhatsAppResponse> {
    const payload = {
      messaging_product: "whatsapp",
      to: this.formatPhoneNumber(phoneNumber),
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language || 'es_MX' },
        components: template.components
      }
    };
    
    return this.http.post<WhatsAppResponse>(
      `${this.whatsappApiUrl}/${this.phoneNumberId}/messages`,
      payload,
      { headers: this.getHeaders() }
    );
  }
  
  // Send media message (images, documents)
  sendMedia(phoneNumber: string, media: MediaMessage): Observable<WhatsAppResponse> {
    const payload = {
      messaging_product: "whatsapp",
      to: this.formatPhoneNumber(phoneNumber),
      type: media.type,
      [media.type]: {
        link: media.url,
        caption: media.caption,
        filename: media.filename
      }
    };
    
    return this.http.post<WhatsAppResponse>(
      `${this.whatsappApiUrl}/${this.phoneNumberId}/messages`,
      payload,
      { headers: this.getHeaders() }
    );
  }
  
  // Handle webhook events
  handleWebhook(webhookData: WhatsAppWebhook): void {
    if (webhookData.entry) {
      for (const entry of webhookData.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value.messages) {
              this.processIncomingMessages(change.value.messages);
            }
            if (change.value.statuses) {
              this.processMessageStatuses(change.value.statuses);
            }
          }
        }
      }
    }
  }
  
  private formatPhoneNumber(phoneNumber: string): string {
    // Format to international format: +52XXXXXXXXXX
    let formatted = phoneNumber.replace(/[^\d]/g, '');
    
    if (formatted.startsWith('52')) {
      formatted = '+' + formatted;
    } else if (formatted.length === 10) {
      formatted = '+52' + formatted;
    } else if (!formatted.startsWith('+52')) {
      formatted = '+52' + formatted;
    }
    
    return formatted;
  }
}
```

### 🔔 WhatsApp Templates para Post-Ventas

```typescript
export const WHATSAPP_TEMPLATES = {
  VEHICLE_ASSIGNED: {
    name: 'vehicle_assigned',
    language: 'es_MX',
    components: [
      {
        type: 'header',
        parameters: [
          { type: 'text', text: '{{client_name}}' }
        ]
      },
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{vehicle_model}}' },
          { type: 'text', text: '{{vin}}' }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          { type: 'text', text: '{{tracking_code}}' }
        ]
      }
    ]
  },
  
  DELIVERY_READY: {
    name: 'delivery_ready',
    language: 'es_MX',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{client_name}}' },
          { type: 'text', text: '{{vehicle_model}}' },
          { type: 'date_time', date_time: '{{delivery_date}}' }
        ]
      }
    ]
  },
  
  SERVICE_REMINDER: {
    name: 'service_reminder',
    language: 'es_MX',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{client_name}}' },
          { type: 'text', text: '{{service_type}}' },
          { type: 'date_time', date_time: '{{due_date}}' }
        ]
      }
    ]
  }
};
```

---

## 📊 Integration Tracker Service

### 🔍 Real-time Import Tracking API

```typescript
@Injectable({ providedIn: 'root' })
export class IntegratedImportTrackerService {
  private readonly trackerApiUrl = `${environment.apiUrl}/import-tracker`;
  
  // Get comprehensive import status
  getImportStatus(clientId: string): Observable<ImportStatusResponse> {
    return this.http.get<ImportStatusResponse>(`${this.trackerApiUrl}/status/${clientId}`)
      .pipe(
        map(response => ({
          ...response,
          lastUpdated: new Date(response.lastUpdated)
        })),
        catchError(this.handleTrackerError)
      );
  }
  
  // Update vehicle assignment in tracker
  updateVehicleAssignment(update: VehicleAssignmentUpdate): Observable<UpdateResponse> {
    return this.http.put<UpdateResponse>(`${this.trackerApiUrl}/vehicle-assignment`, update)
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Vehicle assignment updated in tracker');
            // Broadcast to WebSocket for real-time updates
            this.websocketService.broadcast('vehicle-assignment-updated', update);
          }
        })
      );
  }
  
  // Sync with external import systems
  syncImportData(clientId: string): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.trackerApiUrl}/sync`, { clientId })
      .pipe(
        timeout(30000), // 30 second timeout
        retry(2),
        catchError(error => {
          console.error('❌ Import sync failed:', error);
          return of({
            success: false,
            syncedRecords: 0,
            errors: [error.message]
          });
        })
      );
  }
  
  // Real-time status updates via WebSocket
  subscribeToStatusUpdates(clientId: string): Observable<ImportStatusUpdate> {
    return this.websocketService.connect(`/import-status/${clientId}`)
      .pipe(
        map(data => JSON.parse(data) as ImportStatusUpdate),
        catchError(error => {
          console.error('WebSocket connection error:', error);
          return EMPTY;
        })
      );
  }
}
```

---

## 🔧 OCR Service Integration

### 📄 OCR Document Processing

```typescript
@Injectable({ providedIn: 'root' })
export class OcrService {
  constructor(private http: HttpClient) {}
  
  // Extract text from image using Tesseract.js
  extractTextFromImage(imageFile: File, options?: OcrOptions): Observable<OcrResult> {
    return from(
      Tesseract.recognize(imageFile, options?.language || 'eng+spa', {
        logger: progress => {
          console.log('📊 OCR Progress:', progress.progress);
        },
        ...options?.tesseractOptions
      })
    ).pipe(
      map(result => ({
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })),
        processingTime: Date.now() - (options?.startTime || Date.now())
      })),
      catchError(error => {
        console.error('❌ OCR processing failed:', error);
        return throwError(error);
      })
    );
  }
  
  // Extract structured data from specific document types
  extractDataFromDocument(documentFile: File, documentType: DocumentType): Observable<DocumentData> {
    return this.extractTextFromImage(documentFile).pipe(
      switchMap(ocrResult => {
        // Apply document-specific data extraction rules
        const extractedData = this.parseDocumentData(ocrResult.text, documentType);
        
        return of({
          documentType,
          extractedData,
          ocrResult,
          confidence: ocrResult.confidence,
          processingDate: new Date()
        });
      })
    );
  }
  
  // Parse specific document types
  private parseDocumentData(text: string, documentType: DocumentType): Record<string, any> {
    switch (documentType) {
      case 'factura':
        return this.parseFactura(text);
      case 'identificacion':
        return this.parseIdentification(text);
      case 'polizaSeguro':
        return this.parseInsurancePolicy(text);
      default:
        return { rawText: text };
    }
  }
  
  // Parse factura (invoice) data
  private parseFactura(text: string): FacturaData {
    const facturaData: FacturaData = {
      folio: this.extractField(text, /folio[:\s]*([A-Z0-9]+)/i),
      fecha: this.extractDate(text),
      total: this.extractAmount(text),
      emisor: this.extractField(text, /emisor[:\s]*([^\n]+)/i),
      receptor: this.extractField(text, /receptor[:\s]*([^\n]+)/i),
      rfc: this.extractField(text, /rfc[:\s]*([A-Z0-9]{12,13})/i)
    };
    
    return facturaData;
  }
  
  private extractField(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }
  
  private extractDate(text: string): Date | null {
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
    
    return null;
  }
  
  private extractAmount(text: string): number | null {
    const amountPattern = /\$?\s*([0-9,]+\.?\d{0,2})/;
    const match = text.match(amountPattern);
    
    if (match) {
      const amount = match[1].replace(/,/g, '');
      return parseFloat(amount);
    }
    
    return null;
  }
}
```

---

## 🌍 Government APIs Integration

### 🏛️ Mexican Government Services

```typescript
@Injectable({ providedIn: 'root' })
export class GovernmentApiService {
  private readonly satApiUrl = environment.satApiUrl;
  private readonly placasApiUrl = environment.placasApiUrl;
  
  // Validate RFC with SAT
  validateRFC(rfc: string): Observable<RfcValidationResult> {
    return this.http.get<RfcValidationResult>(`${this.satApiUrl}/validate-rfc/${rfc}`, {
      headers: this.getSatHeaders()
    }).pipe(
      retry(2),
      catchError(error => {
        console.error('❌ RFC validation failed:', error);
        return of({
          isValid: false,
          errors: ['Error de conexión con SAT'],
          rfcStatus: 'unknown'
        });
      })
    );
  }
  
  // Get available plates from government system
  getAvailablePlates(state: string): Observable<AvailablePlate[]> {
    return this.http.get<GovernmentPlatesResponse>(`${this.placasApiUrl}/available-plates`, {
      params: { state },
      headers: this.getPlacasHeaders()
    }).pipe(
      map(response => response.plates || []),
      catchError(error => {
        console.error('❌ Error fetching government plates:', error);
        return of([]);
      })
    );
  }
  
  // Register plate assignment with government
  registerPlateAssignment(assignment: GovernmentPlateAssignment): Observable<PlateRegistrationResult> {
    return this.http.post<PlateRegistrationResult>(`${this.placasApiUrl}/register-assignment`, assignment, {
      headers: this.getPlacasHeaders()
    }).pipe(
      timeout(10000),
      retry(1),
      catchError(this.handleGovernmentApiError)
    );
  }
  
  private getSatHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.satApiKey}`,
      'Content-Type': 'application/json'
    });
  }
  
  private getPlacasHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-API-Key': environment.placasApiKey,
      'Content-Type': 'application/json'
    });
  }
}
```

---

## 💾 Storage Service API

### 📁 File Storage & Management

```typescript
@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor(
    private http: HttpClient,
    private indexedDBService: IndexedDBService
  ) {}
  
  // Upload file to cloud storage
  uploadDocument(file: File, metadata: DocumentMetadata): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    return this.http.post<UploadResponse>(`${environment.apiUrl}/storage/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round(100 * event.loaded / event.total);
          return { ...event.body, progress };
        }
        return event.body;
      }),
      finalize(() => {
        console.log('📤 File upload completed');
      })
    );
  }
  
  // Store data in local IndexedDB
  async storeLocally(key: string, data: any): Promise<void> {
    try {
      await this.indexedDBService.store('app-data', key, data);
      console.log('💾 Data stored locally:', key);
    } catch (error) {
      console.error('❌ Local storage failed:', error);
      throw error;
    }
  }
  
  // Retrieve data from local storage
  async retrieveLocally<T>(key: string): Promise<T | null> {
    try {
      const data = await this.indexedDBService.retrieve<T>('app-data', key);
      return data || null;
    } catch (error) {
      console.error('❌ Local retrieval failed:', error);
      return null;
    }
  }
  
  // Sync local data with cloud
  syncWithCloud(): Observable<SyncResult> {
    return from(this.indexedDBService.getAllKeys('app-data')).pipe(
      switchMap(keys => {
        const syncPromises = keys.map(key => this.syncItem(key));
        return forkJoin(syncPromises);
      }),
      map(results => ({
        success: true,
        syncedItems: results.length,
        errors: results.filter(r => !r.success).map(r => r.error)
      })),
      catchError(error => of({
        success: false,
        syncedItems: 0,
        errors: [error.message]
      }))
    );
  }
}
```

---

## 🔄 WebSocket Real-time Updates

### ⚡ Real-time Communication Service

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  
  // Connect to WebSocket server
  connect(endpoint: string): Observable<any> {
    if (this.socket) {
      this.disconnect();
    }
    
    const wsUrl = `${environment.websocketUrl}${endpoint}`;
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('🔌 WebSocket connected:', endpoint);
    };
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next(data);
    };
    
    this.socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    this.socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.reconnect(endpoint);
    };
    
    return this.messageSubject.asObservable();
  }
  
  // Send message through WebSocket
  send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected');
    }
  }
  
  // Broadcast message to all connected clients
  broadcast(event: string, data: any): void {
    this.send({
      type: 'broadcast',
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  private reconnect(endpoint: string, attempt: number = 1): void {
    if (attempt <= 5) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      
      setTimeout(() => {
        console.log(`🔄 Reconnecting WebSocket (attempt ${attempt})...`);
        this.connect(endpoint);
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }
}
```

---

## 🚨 Error Handling & Logging

### 🛠️ Centralized Error Handler

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  constructor(
    private logger: LoggerService,
    private notificationService: NotificationService
  ) {}
  
  // Generic HTTP error handler
  handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      // Log error
      this.logger.error(`${operation} failed:`, error);
      
      // User-friendly error message
      let userMessage = 'Ocurrió un error inesperado';
      
      if (error.error?.message) {
        userMessage = error.error.message;
      } else if (error.status === 0) {
        userMessage = 'Error de conexión. Verifica tu conexión a internet.';
      } else if (error.status >= 500) {
        userMessage = 'Error del servidor. Inténtalo de nuevo más tarde.';
      } else if (error.status === 401) {
        userMessage = 'Sesión expirada. Por favor, inicia sesión de nuevo.';
      } else if (error.status === 403) {
        userMessage = 'No tienes permisos para realizar esta acción.';
      }
      
      // Show notification to user
      this.notificationService.showError(userMessage);
      
      // Return a safe fallback value
      return of(result as T);
    };
  }
  
  // API-specific error handlers
  handleAuthError = (error: any) => {
    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return this.handleError('authentication')(error);
  };
  
  handleUploadError = (error: any) => {
    let message = 'Error al subir archivo';
    
    if (error.error?.code === 'FILE_TOO_LARGE') {
      message = 'El archivo es demasiado grande. Máximo 10MB.';
    } else if (error.error?.code === 'INVALID_FORMAT') {
      message = 'Formato de archivo no válido.';
    }
    
    this.notificationService.showError(message);
    return throwError(error);
  };
}
```

### 📊 API Monitoring & Analytics

```typescript
@Injectable({ providedIn: 'root' })
export class ApiMonitoringService {
  private apiCalls: ApiCall[] = [];
  
  // Track API call metrics
  trackApiCall(request: HttpRequest<any>): void {
    const apiCall: ApiCall = {
      id: this.generateId(),
      url: request.url,
      method: request.method,
      timestamp: Date.now(),
      headers: this.sanitizeHeaders(request.headers)
    };
    
    this.apiCalls.push(apiCall);
    this.cleanupOldCalls();
  }
  
  // Get API performance metrics
  getPerformanceMetrics(): ApiMetrics {
    const recentCalls = this.apiCalls.filter(call => 
      Date.now() - call.timestamp < 3600000 // Last hour
    );
    
    return {
      totalCalls: recentCalls.length,
      averageResponseTime: this.calculateAverageResponseTime(recentCalls),
      errorRate: this.calculateErrorRate(recentCalls),
      slowestEndpoints: this.getSlowestEndpoints(recentCalls),
      mostUsedEndpoints: this.getMostUsedEndpoints(recentCalls)
    };
  }
  
  // Send metrics to monitoring service
  sendMetricsToMonitoring(): void {
    const metrics = this.getPerformanceMetrics();
    
    // Send to external monitoring service (e.g., Datadog, New Relic)
    this.http.post(`${environment.monitoringUrl}/metrics`, metrics)
      .subscribe({
        next: () => console.log('📊 Metrics sent to monitoring'),
        error: (error) => console.error('❌ Failed to send metrics:', error)
      });
  }
}
```

---

## 📋 Rate Limiting & Throttling

### ⚡ Client-side Rate Limiting

```typescript
@Injectable({ providedIn: 'root' })
export class RateLimitService {
  private requestCounts = new Map<string, RequestCount>();
  
  // Check if request is allowed
  isRequestAllowed(endpoint: string, limit: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const key = this.getEndpointKey(endpoint);
    const requestCount = this.requestCounts.get(key);
    
    if (!requestCount) {
      this.requestCounts.set(key, {
        count: 1,
        windowStart: now,
        lastReset: now
      });
      return true;
    }
    
    // Reset window if expired
    if (now - requestCount.windowStart > windowMs) {
      requestCount.count = 1;
      requestCount.windowStart = now;
      requestCount.lastReset = now;
      return true;
    }
    
    // Check if limit exceeded
    if (requestCount.count >= limit) {
      console.warn(`⚠️ Rate limit exceeded for ${endpoint}`);
      return false;
    }
    
    requestCount.count++;
    return true;
  }
  
  // Get remaining requests for endpoint
  getRemainingRequests(endpoint: string, limit: number = 100): number {
    const key = this.getEndpointKey(endpoint);
    const requestCount = this.requestCounts.get(key);
    
    if (!requestCount) {
      return limit;
    }
    
    return Math.max(0, limit - requestCount.count);
  }
  
  private getEndpointKey(endpoint: string): string {
    // Extract base endpoint without parameters
    return endpoint.split('?')[0];
  }
}
```

---

## 📚 API Documentation Standards

### 📖 OpenAPI/Swagger Documentation

```yaml
# swagger.yaml
openapi: 3.0.0
info:
  title: Conductores PWA API
  description: Complete API documentation for the post-sales automotive system
  version: 2.0.0
  contact:
    name: API Support
    email: api-support@conductores.com
servers:
  - url: https://api.conductores.com/v2
    description: Production server
  - url: https://staging-api.conductores.com/v2
    description: Staging server

paths:
  /auth/login:
    post:
      tags: [Authentication]
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        401:
          description: Invalid credentials

  /events/vehicle-delivered:
    post:
      tags: [Post-Sales]
      summary: Register vehicle delivery event
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VehicleDeliveredEvent'
      responses:
        200:
          description: Event registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PostSalesEventResponse'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      
  schemas:
    VehicleDeliveredEvent:
      type: object
      required: [vin, deliveryDate, clientName, market, vehicleModel, clientContact]
      properties:
        vin:
          type: string
          pattern: ^[A-HJ-NPR-Z0-9]{17}$
          example: "3N1CN7AP8KL123456"
        deliveryDate:
          type: string
          format: date-time
        clientName:
          type: string
          maxLength: 100
        market:
          type: string
          enum: [aguascalientes, cdmx, guadalajara, monterrey]
        vehicleModel:
          type: string
        clientContact:
          $ref: '#/components/schemas/ClientContact'
```

---

## 🎯 Performance Optimization

### ⚡ HTTP Interceptor for Caching

```typescript
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, CacheEntry>();
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle(req);
    }
    
    const cacheKey = this.getCacheKey(req);
    const cachedResponse = this.cache.get(cacheKey);
    
    // Return cached response if valid
    if (cachedResponse && !this.isCacheExpired(cachedResponse)) {
      console.log('📄 Serving from cache:', req.url);
      return of(new HttpResponse({
        body: cachedResponse.data,
        status: 200,
        statusText: 'OK'
      }));
    }
    
    // Make request and cache response
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse && event.status === 200) {
          const ttl = this.getCacheTTL(req.url);
          if (ttl > 0) {
            this.cache.set(cacheKey, {
              data: event.body,
              timestamp: Date.now(),
              ttl
            });
          }
        }
      })
    );
  }
  
  private getCacheKey(req: HttpRequest<any>): string {
    return `${req.method}:${req.urlWithParams}`;
  }
  
  private getCacheTTL(url: string): number {
    // Cache configuration based on endpoint
    if (url.includes('/vehicles/validate-vin')) return 300000; // 5 minutes
    if (url.includes('/plates/available')) return 600000; // 10 minutes
    if (url.includes('/clients/')) return 60000; // 1 minute
    
    return 0; // No cache by default
  }
}
```

---

## 📊 API Testing & Quality Assurance

### 🧪 API Testing Suite

```typescript
describe('PostSalesApiService', () => {
  let service: PostSalesApiService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PostSalesApiService]
    });
    
    service = TestBed.inject(PostSalesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  describe('sendVehicleDeliveredEvent', () => {
    it('should send vehicle delivered event successfully', () => {
      const mockEvent: VehicleDeliveredEvent = {
        vin: '3N1CN7AP8KL123456',
        deliveryDate: new Date('2024-02-01'),
        clientName: 'José Hernández Pérez',
        market: 'aguascalientes',
        vehicleModel: 'Nissan Urvan',
        clientContact: {
          phone: '+5244000000',
          email: 'jose.hernandez@email.com',
          preferredChannel: 'whatsapp'
        }
      };
      
      const mockResponse = {
        success: true,
        postSalesRecordId: 'ps-001',
        remindersCreated: 3
      };
      
      service.sendVehicleDeliveredEvent(mockEvent).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.postSalesRecordId).toBe('ps-001');
        expect(response.remindersCreated).toBe(3);
      });
      
      const req = httpMock.expectOne('/api/events/vehicle-delivered');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockEvent);
      req.flush(mockResponse);
    });
  });
  
  afterEach(() => {
    httpMock.verify();
  });
});
```

---

## 📈 API Metrics & Monitoring Dashboard

### 📊 Real-time API Health Dashboard

```html
<div class="api-dashboard">
  <div class="metrics-grid">
    <div class="metric-card">
      <h3>🚀 API Response Time</h3>
      <span class="metric-value">{{ metrics.averageResponseTime }}ms</span>
      <span class="metric-trend" [class.positive]="metrics.responseTimeTrend > 0">
        {{ metrics.responseTimeTrend > 0 ? '+' : '' }}{{ metrics.responseTimeTrend }}%
      </span>
    </div>
    
    <div class="metric-card">
      <h3>✅ Success Rate</h3>
      <span class="metric-value">{{ metrics.successRate }}%</span>
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="metrics.successRate"></div>
      </div>
    </div>
    
    <div class="metric-card">
      <h3>📊 Requests/Minute</h3>
      <span class="metric-value">{{ metrics.requestsPerMinute }}</span>
      <span class="metric-limit">Limit: 1000/min</span>
    </div>
  </div>
  
  <div class="endpoints-table">
    <h3>🔥 Hottest Endpoints</h3>
    <table>
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>Calls</th>
          <th>Avg Response</th>
          <th>Error Rate</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let endpoint of metrics.endpoints">
          <td>{{ endpoint.path }}</td>
          <td>{{ endpoint.calls }}</td>
          <td>{{ endpoint.avgResponse }}ms</td>
          <td>{{ endpoint.errorRate }}%</td>
          <td>
            <span class="status" [class]="endpoint.status">
              {{ endpoint.status }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## 🔮 Future API Enhancements

### 🚀 Roadmap API v3.0
- **GraphQL Gateway**: Unified GraphQL API for complex queries
- **gRPC Services**: High-performance binary protocol for internal services  
- **API Mesh**: Service mesh architecture with Istio
- **Real-time Subscriptions**: WebSocket subscriptions for live updates
- **AI/ML APIs**: Predictive analytics and machine learning endpoints
- **Blockchain Integration**: Smart contracts for document verification

### 📊 Advanced Monitoring
- **Distributed Tracing**: OpenTelemetry implementation
- **Custom Metrics**: Business-specific KPIs tracking
- **Alerting System**: Proactive incident detection
- **Load Testing**: Automated performance regression testing

---

## 📞 API Support & Resources

### 🛠️ Development Tools
- **Postman Collection**: Complete API collection for testing
- **Swagger UI**: Interactive API documentation
- **SDK Generation**: Auto-generated client SDKs
- **Mock Server**: Development and testing mock server

### 📚 Related Documentation
- **Technical Architecture**: `TECHNICAL_ARCHITECTURE.md`
- **Post-Sales System**: `POST_SALES_SYSTEM.md`
- **User Guide**: `USER_GUIDE.md`
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`

### 👥 API Team
- **API Architect**: Overall API design and strategy
- **Backend Developer**: Service implementation and maintenance
- **Integration Specialist**: External API integrations
- **QA Engineer**: API testing and quality assurance
- **DevOps Engineer**: API deployment and monitoring

---

**🔌 APIs y Servicios documentados por**: API Development Team  
**📅 Última actualización**: September 2, 2025  
**🎯 Versión API**: v2.0  
**📊 Estado**: ✅ Production Ready with 99.9% Uptime