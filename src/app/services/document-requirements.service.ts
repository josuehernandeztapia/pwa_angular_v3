import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BusinessFlow, DOC_NAME_COMPROBANTE, DOC_NAME_INE, DOC_NAME_KYC_CONTAINS, Document, DocumentStatus } from '../models/types';
import { MarketPolicyContext, MarketPolicyService, PolicyClientType } from './market-policy.service';

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

  constructor(private readonly marketPolicy: MarketPolicyService) { }

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
    requiresIncomeProof?: boolean;
    collectiveSize?: number;
  }): Observable<Document[]> {
    const policyContext: MarketPolicyContext = {
      market: config.market,
      clientType: (config.clientType ?? 'individual') as PolicyClientType,
      saleType: config.saleType,
      businessFlow: config.businessFlow,
      requiresIncomeProof: config.requiresIncomeProof,
      collectiveSize: config.collectiveSize,
    };

    const policy = this.marketPolicy.getPolicyDocuments(policyContext);
    const documents = this.marketPolicy.toDocuments(policy);

    return of(documents).pipe(delay(50));
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
    const ine = documents.find(d => d.name === DOC_NAME_INE);
    const comprobante = documents.find(d => d.name === DOC_NAME_COMPROBANTE);
    const kyc = documents.find(d => d.name.includes(DOC_NAME_KYC_CONTAINS));
    
    const coreDocsApproved = ine?.status === DocumentStatus.Aprobado && 
                            comprobante?.status === DocumentStatus.Aprobado;
    const isKycComplete = kyc?.status === DocumentStatus.Aprobado;
    
    const missingDocs: string[] = [];
    if (ine?.status !== DocumentStatus.Aprobado) missingDocs.push(DOC_NAME_INE);
    if (comprobante?.status !== DocumentStatus.Aprobado) missingDocs.push(DOC_NAME_COMPROBANTE);

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
    const requiredDocs = documents.filter(doc => !doc.isOptional);
    const optionalDocs = documents.filter(doc => doc.isOptional);

    const completedRequired = requiredDocs.filter(doc => doc.status === DocumentStatus.Aprobado).length;
    const completedOptional = optionalDocs.filter(doc => doc.status === DocumentStatus.Aprobado).length;

    const totalRequired = requiredDocs.length;
    const totalDocs = documents.length;

    const pendingRequired = totalRequired - completedRequired;
    const completionPercentage = totalRequired > 0
      ? (completedRequired / totalRequired) * 100
      : (totalDocs > 0 ? 100 : 0);

    const allComplete = pendingRequired <= 0;

    return {
      totalDocs,
      completedDocs: completedRequired + completedOptional,
      pendingDocs: Math.max(pendingRequired, 0),
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
