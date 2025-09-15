// SSOT - PostVenta System Types
// Consolidates post-sales, delivery, and import tracking types

export type ServicePackage = 'basic' | 'premium' | 'extended';
export type ServiceType = 'mantenimiento' | 'reparacion' | 'garantia' | 'revision';
export type ContactChannel = 'whatsapp' | 'sms' | 'email' | 'phone';
export type ContactPurpose = 'delivery' | '30_days' | '90_days' | '6_months' | '12_months' | 'maintenance_reminder' | 'warranty_claim';
export type ContactOutcome = 'sent' | 'answered' | 'escalated' | 'no_response';

// Import milestone status tracking
export type ImportMilestoneStatus = {
  status?: 'completed' | 'in_progress' | 'pending';
  startDate?: Date;
  completionDate?: Date;
  estimatedDate?: Date;
  documents?: string[];
  notes?: string;
  // Legacy compatibility
  completed?: boolean;
  inProgress?: boolean;
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
