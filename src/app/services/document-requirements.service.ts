import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BusinessFlow, Document, DocumentStatus } from '../models/types';

// Port exacto de document requirement checklists desde React simulationService.ts líneas 10-33
const VENTA_DIRECTA_CONTADO_DOCS: Document[] = [
  { id: '1', name: 'INE Vigente', status: DocumentStatus.Pendiente },
  { id: '2', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
  { id: '3', name: 'Constancia de situación fiscal', status: DocumentStatus.Pendiente },
];

const AGUASCALIENTES_FINANCIERO_DOCS: Document[] = [
  { id: '1', name: 'INE Vigente', status: DocumentStatus.Pendiente },
  { id: '2', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
  { id: '3', name: 'Tarjeta de circulación', status: DocumentStatus.Pendiente },
  { id: '4', name: 'Copia de la concesión', status: DocumentStatus.Pendiente },
  { id: '5', name: 'Constancia de situación fiscal', status: DocumentStatus.Pendiente },
  { id: '6', name: 'Verificación Biométrica (Metamap)', status: DocumentStatus.Pendiente },
];

const EDOMEX_MIEMBRO_DOCS: Document[] = [
  ...AGUASCALIENTES_FINANCIERO_DOCS,
  { 
    id: '7', 
    name: 'Carta Aval de Ruta', 
    status: DocumentStatus.Pendiente, 
    tooltip: "Documento emitido y validado por el Ecosistema/Ruta." 
  },
  { 
    id: '8', 
    name: 'Convenio de Dación en Pago', 
    status: DocumentStatus.Pendiente, 
    tooltip: "Convenio que formaliza el colateral social." 
  },
];

const AHORRO_PROGRAMADO_DOCS: Document[] = [
  { id: '1', name: 'INE Vigente', status: DocumentStatus.Pendiente },
  { id: '2', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
  { 
    id: '3', 
    name: 'Tarjeta de circulación', 
    status: DocumentStatus.Pendiente,
    tooltip: "Requerida para identificar la unidad que se dará de alta en el programa de ahorro"
  },
  { 
    id: '4', 
    name: 'Copia de la factura (Opcional)', 
    status: DocumentStatus.Pendiente,
    tooltip: "Documento adicional para validar la propiedad del vehículo"
  }
];

// Port exacto de contract signature documents desde React
const CONTRATO_VENTA_PLAZO_DOCS: Document[] = [
  { id: 'contract1', name: 'Contrato Venta a Plazo', status: DocumentStatus.Pendiente },
];

const CONTRATO_PROMESA_COMPRAVENTA_DOCS: Document[] = [
  { id: 'contract2', name: 'Contrato Promesa de Compraventa', status: DocumentStatus.Pendiente },
];

const PAQUETE_DACION_PAGO_DOCS: Document[] = [
  { id: 'contract3', name: 'Contrato Venta a Plazo', status: DocumentStatus.Pendiente },
  { id: 'contract4', name: 'Convenio de Dación en Pago', status: DocumentStatus.Pendiente },
];

@Injectable({
  providedIn: 'root'
})
export class DocumentRequirementsService {

  constructor() { }

  /**
   * Port exacto de document requirements logic desde React simulationService.ts
   * Determines required documents based on market, sale type, and business flow
   */
  getDocumentRequirements(config: {
    market: 'aguascalientes' | 'edomex';
    saleType: 'contado' | 'financiero';
    businessFlow?: BusinessFlow;
    clientType?: 'individual' | 'colectivo';
    ecosystemId?: string;
  }): Observable<Document[]> {
    let documents: Document[] = [];

    // Exact port from React logic
    if (config.saleType === 'contado' || config.businessFlow === BusinessFlow.VentaDirecta) {
      documents = VENTA_DIRECTA_CONTADO_DOCS.map(d => ({ ...d }));
    } else if (config.saleType === 'financiero') {
      if (config.market === 'aguascalientes') {
        documents = AGUASCALIENTES_FINANCIERO_DOCS.map(d => ({ ...d }));
      } else { // EdoMex
        documents = EDOMEX_MIEMBRO_DOCS.map(d => ({ ...d }));
      }
    }

    // Special case for savings 
    if (config.businessFlow === BusinessFlow.AhorroProgramado) {
      if (config.market === 'aguascalientes') {
        // AGS: Solo documentos básicos de ahorro
        documents = AHORRO_PROGRAMADO_DOCS.map(d => ({ ...d }));
      } else {
        // EdoMex: Documentos base + documentos de ahorro (tarjeta circulación)
        documents = [
          ...EDOMEX_MIEMBRO_DOCS.map(d => ({ ...d })),
          { 
            id: '9', 
            name: 'Copia de la factura (Opcional)', 
            status: DocumentStatus.Pendiente,
            tooltip: "Documento adicional para validar la propiedad del vehículo"
          }
        ];
      }
    }

    return of(documents).pipe(delay(100));
  }

  /**
   * Port exacto de contract document generation desde React sendContract logic
   */
  getContractDocuments(config: {
    businessFlow: BusinessFlow;
    market: 'aguascalientes' | 'edomex';
    hasEcosystem?: boolean;
  }): Observable<Document[]> {
    let contractDocs: Document[] = [];

    if (config.businessFlow === BusinessFlow.VentaPlazo) {
      if (config.market === 'edomex' && config.hasEcosystem) {
        // Paquete de Venta (Contrato y Dación en Pago)
        contractDocs = PAQUETE_DACION_PAGO_DOCS.map(d => ({ ...d }));
      } else {
        // Contrato de Venta a Plazo (Aguascalientes)
        contractDocs = CONTRATO_VENTA_PLAZO_DOCS.map(d => ({ ...d }));
      }
    } else {
      // VentaDirecta or other flows - Contrato Promesa de Compraventa
      contractDocs = CONTRATO_PROMESA_COMPRAVENTA_DOCS.map(d => ({ ...d }));
    }

    return of(contractDocs).pipe(delay(200));
  }

  /**
   * Port exacto de KYC prerequisite validation desde React KycButton component
   */
  validateKycPrerequisites(documents: Document[]): {
    canStartKyc: boolean;
    missingDocs: string[];
    isKycComplete: boolean;
    tooltipMessage: string;
  } {
    const ine = documents.find(d => d.name === 'INE Vigente');
    const comprobante = documents.find(d => d.name === 'Comprobante de domicilio');
    const kyc = documents.find(d => d.name.includes('Verificación Biométrica'));
    
    const coreDocsApproved = ine?.status === DocumentStatus.Aprobado && 
                            comprobante?.status === DocumentStatus.Aprobado;
    const isKycComplete = kyc?.status === DocumentStatus.Aprobado;
    
    const missingDocs: string[] = [];
    if (ine?.status !== DocumentStatus.Aprobado) missingDocs.push('INE Vigente');
    if (comprobante?.status !== DocumentStatus.Aprobado) missingDocs.push('Comprobante de domicilio');

    let tooltipMessage = '';
    if (isKycComplete) {
      tooltipMessage = 'El KYC ya ha sido aprobado.';
    } else if (!coreDocsApproved) {
      tooltipMessage = 'Se requiere aprobar INE y Comprobante de Domicilio para iniciar KYC.';
    } else {
      tooltipMessage = 'Listo para iniciar verificación biométrica.';
    }

    return {
      canStartKyc: coreDocsApproved && !isKycComplete,
      missingDocs,
      isKycComplete,
      tooltipMessage
    };
  }

  /**
   * Update document status (exact port from React simulation service)
   */
  updateDocumentStatus(
    documents: Document[], 
    documentId: string, 
    status: DocumentStatus
  ): Observable<Document[]> {
    const updatedDocs = documents.map(doc => 
      doc.id === documentId ? { ...doc, status } : doc
    );
    
    return of(updatedDocs).pipe(delay(300));
  }

  /**
   * Port exacto de document completion validation
   */
  getDocumentCompletionStatus(documents: Document[]): {
    totalDocs: number;
    completedDocs: number;
    pendingDocs: number;
    completionPercentage: number;
    allComplete: boolean;
  } {
    const totalDocs = documents.length;
    const completedDocs = documents.filter(d => d.status === DocumentStatus.Aprobado).length;
    const pendingDocs = totalDocs - completedDocs;
    const completionPercentage = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0;
    const allComplete = completedDocs === totalDocs;

    return {
      totalDocs,
      completedDocs,
      pendingDocs,
      completionPercentage: Math.round(completionPercentage),
      allComplete
    };
  }

  /**
   * Get document requirements message for UI display
   */
  getRequirementsMessage(config: {
    market: 'aguascalientes' | 'edomex';
    saleType: 'contado' | 'financiero';
    businessFlow?: BusinessFlow;
  }): string {
    if (config.saleType === 'contado' || config.businessFlow === BusinessFlow.VentaDirecta) {
      return 'Documentos requeridos para venta directa/contado - proceso simplificado';
    }
    
    if (config.businessFlow === BusinessFlow.AhorroProgramado) {
      return `Documentos requeridos para programa de ahorro en ${config.market === 'aguascalientes' ? 'Aguascalientes' : 'Estado de México'} - incluye identificación de unidad`;
    }
    
    if (config.market === 'aguascalientes') {
      return 'Documentos requeridos para financiamiento en Aguascalientes';
    }
    
    if (config.businessFlow === BusinessFlow.CreditoColectivo) {
      return 'Documentos requeridos para crédito colectivo en EdoMex';
    }
    
    return 'Documentos requeridos para financiamiento en Estado de México';
  }

  /**
   * Port exacto de tooltip logic for special documents
   */
  getDocumentTooltip(documentName: string): string | undefined {
    switch (documentName) {
      case 'Carta Aval de Ruta':
        return "Documento emitido y validado por el Ecosistema/Ruta.";
      case 'Convenio de Dación en Pago':
        return "Convenio que formaliza el colateral social.";
      case 'Verificación Biométrica (Metamap)':
        return "Verificación de identidad mediante biometría facial.";
      case 'Tarjeta de circulación':
        return "Requerida para identificar la unidad que se dará de alta en el programa de ahorro.";
      case 'Copia de la factura (Opcional)':
        return "Documento adicional para validar la propiedad del vehículo.";
      default:
        return undefined;
    }
  }
}