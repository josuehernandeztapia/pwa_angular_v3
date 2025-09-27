export interface PhotoMeta { kind: 'front'|'side'|'interior'|'detail'; url: string; }
export interface Suggestion { id: string; name: string; qty: number; price?: number; selected: boolean; }
export interface DraftQuote { id: string; lines: Array<{ sku:string; qty:number; }>; }

// SSOT - PostVenta System Types
// Consolidates post-sales, delivery, and import tracking types

export enum ServicePackageEnum { Basic = 'basic', Premium = 'premium', Extended = 'extended' }
export enum ServiceTypeEnum { Mantenimiento = 'mantenimiento', Reparacion = 'reparacion', Garantia = 'garantia', Revision = 'revision' }
export enum ContactChannelEnum { Whatsapp = 'whatsapp', Sms = 'sms', Email = 'email', Phone = 'phone' }
export enum ContactPurposeEnum { Delivery = 'delivery', Days30 = '30_days', Days90 = '90_days', Months6 = '6_months', Months12 = '12_months', MaintenanceReminder = 'maintenance_reminder', WarrantyClaim = 'warranty_claim' }
export enum ContactOutcomeEnum { Sent = 'sent', Answered = 'answered', Escalated = 'escalated', NoResponse = 'no_response' }

// Backwards-compatible type aliases
export type ServicePackage = `${ServicePackageEnum}`;
export type ServiceType = `${ServiceTypeEnum}`;
export type ContactChannel = `${ContactChannelEnum}`;
export type ContactPurpose = `${ContactPurposeEnum}`;
export type ContactOutcome = `${ContactOutcomeEnum}`;

// Import milestone status tracking
export type ImportMilestoneStatus = {
  status?: 'completed' | 'in_progress' | 'pending';
  startDate?: Date;
  completionDate?: Date;
  estimatedDate?: Date;
  documents?: string[];
  notes?: string;
  // Legacy compatibility - alternative property names used in codebase
  completed?: boolean;
  inProgress?: boolean;
  completedAt?: Date; // Alternative to completionDate
  startedAt?: Date; // Alternative to startDate
  estimatedDays?: number; // Alternative to estimatedDate
};

// Delivery and documentation
export interface DeliveryData {
  odometroEntrega: number;
  fechaEntrega: Date;
  horaEntrega: string;
  domicilioEntrega: string;
  fotosVehiculo: string[]; // URLs de fotos
  firmaDigitalCliente: string; // URL de firma
  checklistEntrega: DeliveryChecklistItem[];
  incidencias?: string[];
  entregadoPor: string; // ID del asesor
}

export interface DeliveryChecklistItem {
  item: string;
  status: 'approved' | 'with_issues' | 'rejected';
  notes?: string;
  photos?: string[];
}

export interface DocumentFile {
  filename: string;
  url: string;
  uploadedAt: Date;
  size: number; // bytes
  type: 'pdf' | 'image' | 'document';
}

export interface LegalDocuments {
  factura: DocumentFile;
  polizaSeguro: DocumentFile;
  endosos?: DocumentFile[];
  contratos: DocumentFile[];
  fechaTransferencia: Date;
  proveedorSeguro: string;
  duracionPoliza: number; // meses
  titular: string;
}

export interface PlatesData {
  numeroPlacas: string;
  estado: string;
  fechaAlta: Date;
  tarjetaCirculacion: DocumentFile;
  fotografiasPlacas: string[]; // URLs
  hologramas: boolean;
}

// Vehicle unit assignment
export interface VehicleUnit {
  id: string;
  vin: string;
  serie: string;
  modelo: string;
  year: number;
  color: 'Blanco'; // Solo blanco por ahora
  numeroMotor: string;
  transmission?: 'Manual' | 'Automatica';
  fuelType: 'Gasolina'; // Solo gasolina por ahora
  assignedAt: Date;
  assignedBy: string; // ID del usuario que asignó
  productionBatch?: string;
  factoryLocation?: string;
  notes?: string;
}

// Post-sales record tracking
export interface PostSalesRecord {
  id: string;
  vin: string;
  clientId: string;
  postSalesAgent: string;
  warrantyStatus: 'active' | 'expired';
  servicePackage: ServicePackage;
  nextMaintenanceDate: Date;
  nextMaintenanceKm: number;
  odometroEntrega: number;
  createdAt: Date;
  warrantyStart: Date;
  warrantyEnd: Date;
}

// Additional post-sales interfaces
export interface PostSalesService {
  id: string;
  vin: string;
  serviceType: ServiceType;
  serviceDate: Date;
  odometroKm: number;
  descripcion: string;
  costo: number;
  tecnico: string;
  customerSatisfaction: number; // 1-5
  partesUsadas?: ServicePart[];
  tiempoServicio: number; // minutos
  notas?: string;
  fotos?: string[];
}

export interface ServicePart {
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  garantia: number; // meses
}

export interface PostSalesContact {
  id: string;
  vin: string;
  contactDate: Date;
  channel: ContactChannel;
  purpose: ContactPurpose;
  outcome: ContactOutcome;
  mensaje?: string;
  respuestaCliente?: string;
  notas?: string;
  programarSeguimiento?: Date;
}

export interface MaintenanceReminder {
  id: string;
  vin: string;
  dueDate: Date;
  dueKm: number;
  serviceType: string;
  reminder30dSent: boolean;
  reminder15dSent: boolean;
  reminder7dSent: boolean;
  completed: boolean;
  scheduledService?: Date;
}

export interface PostSalesRevenue {
  id: string;
  clientId: string;
  vin: string;
  serviceRevenue: number;
  partsRevenue: number;
  warrantyWork: number;
  profitMargin: number;
  ltv: number; // Customer Lifetime Value
  updatedAt: Date;
}

export interface VehicleDeliveredEvent {
  event: 'vehicle.delivered';
  timestamp: Date;
  payload: {
    clientId: string;
    vehicle: {
      vin: string;
      modelo: string;
      numeroMotor: string;
      odometer_km_delivery: number;
      placas: string;
      estado: string;
    };
    contract: {
      id: string;
      servicePackage: ServicePackage;
      warranty_start: Date;
      warranty_end: Date;
    };
    contacts: {
      primary: {
        name: string;
        phone: string;
        email: string;
      };
      whatsapp_optin: boolean;
    };
    delivery: DeliveryData;
    legalDocuments: LegalDocuments;
    plates: PlatesData;
  };
}

// Type guards and parsing utilities
export function isDeliveryData(value: any): value is DeliveryData {
  return value && typeof value.odometroEntrega === 'number' && value.fechaEntrega instanceof Date && typeof value.horaEntrega === 'string' && Array.isArray(value.checklistEntrega);
}

export function isPostSalesRecord(value: any): value is PostSalesRecord {
  return value && typeof value.id === 'string' && typeof value.vin === 'string' && (value.servicePackage === ServicePackageEnum.Basic || value.servicePackage === ServicePackageEnum.Premium || value.servicePackage === ServicePackageEnum.Extended);
}


export interface PostSalesSurveyResponse {
  id: string;
  vin: string;
  clientId: string;
  surveyType: ContactPurpose;
  respuestas: { [pregunta: string]: string | number };
  nps?: number; // Net Promoter Score
  csat?: number; // Customer Satisfaction Score
  comentarios?: string;
  completedAt: Date;
}

// Comprehensive import status tracking
export interface ImportStatus {
  pedidoPlanta: ImportMilestoneStatus;
  unidadFabricada: ImportMilestoneStatus;
  transitoMaritimo: ImportMilestoneStatus;
  enAduana: ImportMilestoneStatus;
  liberada: ImportMilestoneStatus;
  // POST-SALES PHASES
  entregada?: ImportMilestoneStatus;
  documentosTransferidos?: ImportMilestoneStatus;
  placasEntregadas?: ImportMilestoneStatus;
  // Associated data
  assignedUnit?: VehicleUnit;
  deliveryData?: DeliveryData;
  postSalesRecord?: PostSalesRecord;
}
