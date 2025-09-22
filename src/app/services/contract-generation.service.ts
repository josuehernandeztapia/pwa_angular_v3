import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { BusinessFlow, Client, Document } from '../models/types';
import { ClientDataService } from './data/client-data.service';

interface ContractTemplate {
  id: string;
  name: string;
  type: 'venta_plazo' | 'venta_directa' | 'plan_ahorro' | 'credito_colectivo' | 'dacion_pago' | 'adenda_proteccion';
  market: 'aguascalientes' | 'edomex' | 'all';
  templateContent: string;
  requiredSigners: number;
  isPackageDocument: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ContractGenerationService {

  // Port exacto de contract templates desde React contract logic
  // ENHANCED: Includes protection addendum templates
  private contractTemplates: ContractTemplate[] = [
    {
      id: 'contrato_venta_plazo_ags',
      name: 'Contrato de Venta a Plazo - Aguascalientes',
      type: 'venta_plazo',
      market: 'aguascalientes',
      templateContent: 'CONTRATO DE COMPRAVENTA A PLAZOS DE VEHÍCULO AUTOMOTOR\n\nPOR UNA PARTE, CONDUCTORES DEL MUNDO S.A. DE C.V...',
      requiredSigners: 2,
      isPackageDocument: false
    },
    {
      id: 'contrato_venta_plazo_edomex',
      name: 'Contrato de Venta a Plazo - EdoMex',
      type: 'venta_plazo',
      market: 'edomex',
      templateContent: 'CONTRATO DE COMPRAVENTA A PLAZOS CON GARANTÍA COLATERAL\n\nPOR UNA PARTE, CONDUCTORES DEL MUNDO S.A. DE C.V...',
      requiredSigners: 2,
      isPackageDocument: true
    },
    {
      id: 'convenio_dacion_pago',
      name: 'Convenio de Dación en Pago',
      type: 'dacion_pago',
      market: 'edomex',
      templateContent: 'CONVENIO DE DACIÓN EN PAGO\n\nPor el presente instrumento, las partes convienen en lo siguiente...',
      requiredSigners: 3,
      isPackageDocument: true
    },
    {
      id: 'promesa_compraventa',
      name: 'Contrato Promesa de Compraventa',
      type: 'venta_directa',
      market: 'all',
      templateContent: 'CONTRATO DE PROMESA DE COMPRAVENTA\n\nLas partes celebran el presente contrato...',
      requiredSigners: 2,
      isPackageDocument: false
    },
    {
      id: 'plan_ahorro_individual',
      name: 'Plan de Ahorro Individual',
      type: 'plan_ahorro',
      market: 'edomex',
      templateContent: 'CONTRATO DE PLAN DE AHORRO INDIVIDUAL\n\nPor medio del presente documento...',
      requiredSigners: 1,
      isPackageDocument: false
    },
    {
      id: 'credito_colectivo_grupo',
      name: 'Contrato de Crédito Colectivo',
      type: 'credito_colectivo',
      market: 'edomex',
      templateContent: 'CONTRATO DE CRÉDITO COLECTIVO GARANTIZADO\n\nLos miembros del grupo se comprometen...',
      requiredSigners: 6, // 5 members + advisor
      isPackageDocument: false
    },
    // PROTECTION ADDENDUM TEMPLATES
    {
      id: 'adenda_proteccion_universal',
      name: 'Adenda de Protección Conductores',
      type: 'adenda_proteccion' as any,
      market: 'all',
      templateContent: `ADENDA DE PROTECCIÓN CONDUCTORES

Fecha: {{CONTRACT_DATE}}
Cliente: {{CLIENT_NAME}}
Contrato Principal: {{MAIN_CONTRACT_TYPE}}

CLÁUSULA DE PROTECCIÓN:

El presente contrato incluye el Plan de Protección Conductores tipo {{PROTECTION_TYPE}} que otorga al cliente los siguientes derechos:

MODALIDADES DE PROTECCIÓN DISPONIBLES:
1. DIFERIMIENTO: Suspensión temporal de pagos hasta por 6 meses
2. REDUCCIÓN: Disminución temporal de mensualidad hasta 50%
3. RECALENDARIZACIÓN: Extensión del plazo contractual

CONDICIONES DE ACTIVACIÓN:
- Sistema automático: healthScore < 40% 
- Solicitud manual del cliente
- Incapacidad médica temporal (con comprobante)
- Pérdida involuntaria de empleo (con comprobante)

LÍMITES Y RESTRICCIONES:
- Reestructuras disponibles por año: {{PROTECTION_RESTRUCTURES}}
- Renovación anual automática
- TIR mínima garantizada: 25.5% anual

Esta adenda forma parte integral del contrato principal y sus términos son vinculantes para ambas partes.

FIRMAS:

_____________________              _____________________
Conductores del Mundo S.A.         {{CLIENT_NAME}}
Representante Legal                 Cliente

Fecha: {{CONTRACT_DATE}}`,
      requiredSigners: 2,
      isPackageDocument: true
    }
  ];

  constructor(private clientData: ClientDataService) { }

  /**
   * Port exacto de sendContract desde React simulationService.ts líneas 496-514
   * Dynamic contract generation based on client market and business flow
   * ENHANCED: Includes protection addendum for financial products
   */
  sendContract(clientId: string): Observable<{ message: string; documents: Document[] }> {
    return new Observable<{ message: string; documents: Document[] }>(observer => {
      this.clientData.getClientById(clientId).subscribe((client: Client | null) => {
        if (!client) {
          observer.error('Client not found');
          return;
        }

        const isEdoMex = !!client.ecosystemId;
        const market = isEdoMex ? 'edomex' : 'aguascalientes';
        let message = '';
        let contractDocs: Document[] = [];

        // Port exacto de contract selection logic desde React
        // ENHANCED: Includes protection addendum for financial products
        const isFinancialProduct = this.isFinancialProduct(client.flow);
        
        if (client.flow === BusinessFlow.VentaPlazo) {
          if (isEdoMex) {
            // Paquete de Venta (Contrato, Dación en Pago + Protección)
            message = `Paquete de Venta con Protección (Contrato, Dación en Pago y Adenda de Protección) enviado a ${client.name} para firma.`;
            contractDocs = [
              {
                id: `${clientId}-contract-venta`,
                name: 'Contrato Venta a Plazo',
                status: 'Pendiente' as any
              },
              {
                id: `${clientId}-contract-dacion`,
                name: 'Convenio de Dación en Pago', 
                status: 'Pendiente' as any
              },
              {
                id: `${clientId}-contract-protection`,
                name: 'Adenda de Protección Conductores',
                status: 'Pendiente' as any
              }
            ];
          } else { // Aguascalientes
            message = `Contrato de Venta a Plazo con Protección enviado a ${client.name} para firma.`;
            contractDocs = [
              {
                id: `${clientId}-contract-venta-ags`,
                name: 'Contrato Venta a Plazo',
                status: 'Pendiente' as any
              },
              {
                id: `${clientId}-contract-protection-ags`,
                name: 'Adenda de Protección Conductores',
                status: 'Pendiente' as any
              }
            ];
          }
        } else if (client.flow === BusinessFlow.VentaDirecta) {
          // NO PROTECTION for cash sales
          message = `Contrato Promesa de Compraventa enviado a ${client.name} para firma.`;
          contractDocs = [{
            id: `${clientId}-contract-promesa`,
            name: 'Contrato Promesa de Compraventa',
            status: 'Pendiente' as any
          }];
        } else if (client.flow === BusinessFlow.AhorroProgramado) {
          message = `Plan de Ahorro Individual con Protección enviado a ${client.name} para firma.`;
          contractDocs = [
            {
              id: `${clientId}-contract-ahorro`,
              name: 'Plan de Ahorro Individual',
              status: 'Pendiente' as any
            },
            {
              id: `${clientId}-contract-protection-savings`,
              name: 'Adenda de Protección Conductores',
              status: 'Pendiente' as any
            }
          ];
        } else if (client.flow === BusinessFlow.CreditoColectivo) {
          message = `Contrato de Crédito Colectivo con Protección enviado al grupo para firma.`;
          contractDocs = [
            {
              id: `${clientId}-contract-colectivo`,
              name: 'Contrato de Crédito Colectivo',
              status: 'Pendiente' as any
            },
            {
              id: `${clientId}-contract-protection-collective`,
              name: 'Adenda de Protección Conductores',
              status: 'Pendiente' as any
            }
          ];
        }

        // Initialize protection plan for financial products and update client
        if (isFinancialProduct) {
          const protectionPlan = this.initializeProtectionPlan(client.flow);
          const updatedClient: Client = {
            ...client,
            protectionPlan,
            events: [
              ...client.events,
              {
                id: `${clientId}-evt-protection-init`,
                timestamp: new Date(),
                message: 'Plan de Protección Conductores inicializado en contrato.',
                actor: 'Sistema' as any,
                type: 'PROTECTION_INITIALIZED' as any
              }
            ]
          };
          
          // Update client with protection plan
          this.clientData.updateClient(updatedClient.id, updatedClient).subscribe(() => {
            observer.next({ message, documents: contractDocs });
            observer.complete();
          });
        } else {
          observer.next({ message, documents: contractDocs });
          observer.complete();
        }
      });
    });
  }

  /**
   * Generate contract content with client data interpolation
   */
  generateContractContent(
    templateId: string, 
    clientData: {
      name: string;
      rfc?: string;
      address?: string;
      phone?: string;
      email?: string;
    },
    contractData: {
      vehicleModel?: string;
      vehiclePrice?: number;
      downPayment?: number;
      monthlyPayment?: number;
      term?: number;
      interestRate?: number;
    },
    protectionData?: {
      type?: 'Esencial' | 'Total';
      restructuresAvailable?: number;
      mainContractType?: string;
    }
  ): Observable<{ content: string; metadata: any }> {
    const template = this.contractTemplates.find(t => t.id === templateId);
    
    if (!template) {
      return of({ content: '', metadata: null }).pipe(delay(100));
    }

    // Dynamic content generation (exact port from React template logic)
    let content = template.templateContent;
    const currentDate = new Date().toLocaleDateString('es-MX');
    
    // Client data interpolation
    content = content.replace('{{CLIENT_NAME}}', clientData.name || '[NOMBRE CLIENTE]');
    content = content.replace('{{CLIENT_RFC}}', clientData.rfc || '[RFC CLIENTE]');
    content = content.replace('{{CLIENT_ADDRESS}}', clientData.address || '[DOMICILIO CLIENTE]');
    content = content.replace('{{CONTRACT_DATE}}', currentDate);
    
    // Contract data interpolation
    if (contractData.vehicleModel) {
      content = content.replace('{{VEHICLE_MODEL}}', contractData.vehicleModel);
    }
    if (contractData.vehiclePrice) {
      const priceText = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(contractData.vehiclePrice);
      content = content.replace('{{VEHICLE_PRICE}}', priceText);
    }
    if (contractData.monthlyPayment) {
      const paymentText = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(contractData.monthlyPayment);
      content = content.replace('{{MONTHLY_PAYMENT}}', paymentText);
    }
    if (contractData.term) {
      content = content.replace('{{TERM_MONTHS}}', contractData.term.toString());
    }
    
    // Protection data interpolation (for protection addendum)
    if (protectionData) {
      content = content.replace('{{PROTECTION_TYPE}}', protectionData.type || 'Esencial');
      content = content.replace('{{PROTECTION_RESTRUCTURES}}', (protectionData.restructuresAvailable || 3).toString());
      content = content.replace('{{MAIN_CONTRACT_TYPE}}', protectionData.mainContractType || 'Contrato de Venta a Plazo');
    }

    const metadata = {
      template: template.name,
      templateId,
      requiredSigners: template.requiredSigners,
      isPackage: template.isPackageDocument,
      isProtectionAddendum: template.type === 'adenda_proteccion',
      protectionType: protectionData?.type,
      generatedAt: new Date(),
      clientName: clientData.name
    };

    return of({ content, metadata }).pipe(delay(800));
  }

  /**
   * Get available contract templates for a specific client configuration
   */
  getAvailableTemplates(config: {
    businessFlow: BusinessFlow;
    market: 'aguascalientes' | 'edomex';
    hasEcosystem?: boolean;
  }): Observable<ContractTemplate[]> {
    const availableTemplates = this.contractTemplates.filter(template => {
      // Market filter
      if (template.market !== 'all' && template.market !== config.market) {
        return false;
      }

      // Business flow filter
      switch (config.businessFlow) {
        case BusinessFlow.VentaPlazo:
          return template.type === 'venta_plazo' || 
                 (template.type === 'dacion_pago' && config.hasEcosystem);
        
        case BusinessFlow.VentaDirecta:
          return template.type === 'venta_directa';
        
        case BusinessFlow.AhorroProgramado:
          return template.type === 'plan_ahorro';
        
        case BusinessFlow.CreditoColectivo:
          return template.type === 'credito_colectivo';
        
        default:
          return false;
      }
    });

    return of(availableTemplates).pipe(delay(300));
  }

  /**
   * Check if business flow requires protection (financial products only)
   */
  private isFinancialProduct(flow: BusinessFlow): boolean {
    return flow === BusinessFlow.VentaPlazo || 
           flow === BusinessFlow.AhorroProgramado || 
           flow === BusinessFlow.CreditoColectivo;
  }

  /**
   * Initialize protection plan for financial products
   */
  private initializeProtectionPlan(flow: BusinessFlow): any {
    if (!this.isFinancialProduct(flow)) {
      return null;
    }

    // Default protection configuration
    return {
      type: 'Esencial' as 'Esencial' | 'Total',
      restructuresAvailable: 3,
      restructuresUsed: 0,
      annualResets: 1,
      activationTriggers: [
        'healthScore < 40%',
        'Solicitud manual del cliente',
        'Incapacidad médica temporal',
        'Pérdida de empleo'
      ],
      contractClause: `
ADENDA DE PROTECCIÓN CONDUCTORES

El cliente tendrá derecho a activar la Protección Conductores en caso de:
- Dificultades económicas temporales (healthScore < 40%)
- Incapacidad médica temporal
- Pérdida de empleo involuntaria

MODALIDADES DE PROTECCIÓN DISPONIBLES:
- Diferimiento de pagos (hasta 6 meses)
- Reducción temporal de mensualidad (hasta 50%)
- Recalendarización de plazo

Reestructuras disponibles: 3 por año contractual
Activación: Automática por sistema o solicitud manual

Esta protección es parte integral del presente contrato.
      `.trim()
    };
  }

  /**
   * Update contract document status after signature
   */
  updateContractStatus(
    clientId: string,
    contractId: string,
    status: 'signed' | 'rejected' | 'expired',
    signatureData?: any
  ): Observable<Client> {
    return new Observable<Client>(observer => {
      this.clientData.getClientById(clientId).subscribe((client: Client | null) => {
        if (!client) {
          observer.error('Client not found');
          return;
        }

        const updatedDocs = client.documents.map((doc: Document) => {
          if (doc.id === contractId) {
            return {
              ...doc,
              status: status === 'signed' ? 'Aprobado' as any : 'Rechazado' as any,
              signedAt: status === 'signed' ? new Date() : undefined,
              signatureData: status === 'signed' ? signatureData : undefined
            };
          }
          return doc;
        });

        const statusMessage = {
          signed: 'firmado exitosamente',
          rejected: 'rechazado por el cliente',
          expired: 'expirado sin firma'
        };

        const updatedClient: Client = {
          ...client,
          documents: updatedDocs,
          events: [
            ...client.events,
            {
              id: `${clientId}-evt-${Date.now()}`,
              timestamp: new Date(),
              message: `Contrato ${statusMessage[status]}.`,
              actor: 'Cliente' as any,
              type: 'CONTRACT_STATUS_UPDATE' as any
            }
          ]
        };

        this.clientData.updateClient(updatedClient.id, updatedClient).subscribe(() => {
          observer.next(updatedClient);
          observer.complete();
        });
      });
    }).pipe(delay(600));
  }

  /**
   * Get contract generation summary for client
   */
  getContractSummary(client: Client): {
    hasContracts: boolean;
    contractCount: number;
    signedCount: number;
    pendingCount: number;
    canGenerateNew: boolean;
    nextAction: string;
  } {
    const contractDocs = client.documents.filter(doc => 
      doc.name.includes('Contrato') || 
      doc.name.includes('Convenio') ||
      doc.name.includes('Plan de Ahorro')
    );

    const signedCount = contractDocs.filter(d => d.status === 'Aprobado').length;
    const pendingCount = contractDocs.filter(d => d.status === 'Pendiente').length;
    
    // Check if KYC is complete (prerequisite for contracts)
    const kycDoc = client.documents.find(d => d.name.includes('Verificación Biométrica'));
    const kycComplete = kycDoc?.status === 'Aprobado';
    
    let nextAction = 'Completar KYC primero';
    if (kycComplete && pendingCount === 0) {
      nextAction = 'Generar contrato';
    } else if (pendingCount > 0) {
      nextAction = 'Esperar firma de contrato';
    } else if (signedCount > 0) {
      nextAction = 'Contratos completos';
    }

    return {
      hasContracts: contractDocs.length > 0,
      contractCount: contractDocs.length,
      signedCount,
      pendingCount,
      canGenerateNew: kycComplete && pendingCount === 0,
      nextAction
    };
  }

  /**
   * Validate contract requirements for client
   */
  validateContractRequirements(client: Client): {
    canGenerate: boolean;
    missingRequirements: string[];
    warningMessages: string[];
  } {
    const missingRequirements: string[] = [];
    const warningMessages: string[] = [];

    // Check KYC completion
    const kycDoc = client.documents.find(d => d.name.includes('Verificación Biométrica'));
    if (!kycDoc || kycDoc.status !== 'Aprobado') {
      missingRequirements.push('Verificación biométrica (KYC)');
    }

    // Check core documents
    const ine = client.documents.find(d => d.name === 'INE Vigente');
    const comprobante = client.documents.find(d => d.name === 'Comprobante de domicilio');
    
    if (!ine || ine.status !== 'Aprobado') {
      missingRequirements.push('INE Vigente aprobada');
    }
    if (!comprobante || comprobante.status !== 'Aprobado') {
      missingRequirements.push('Comprobante de domicilio aprobado');
    }

    // Flow-specific validations
    if (client.flow === BusinessFlow.VentaPlazo) {
      const concesion = client.documents.find(d => d.name === 'Copia de la concesión');
      if (!concesion || concesion.status !== 'Aprobado') {
        warningMessages.push('Copia de concesión recomendada para venta a plazo');
      }
    }

    if (client.ecosystemId && client.flow === BusinessFlow.VentaPlazo) {
      const cartaAval = client.documents.find(d => d.name === 'Carta Aval de Ruta');
      if (!cartaAval || cartaAval.status !== 'Aprobado') {
        missingRequirements.push('Carta Aval de Ruta');
      }
    }

    return {
      canGenerate: missingRequirements.length === 0,
      missingRequirements,
      warningMessages
    };
  }
}
