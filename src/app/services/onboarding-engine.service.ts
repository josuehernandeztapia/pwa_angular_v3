import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Actor, Document as AppDocument, BusinessFlow, Client, EventType } from '../models/types';
import { ClientDataService } from './data/client-data.service';
import { DocumentRequirementsService } from './document-requirements.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingEngineService {

  constructor(
    private documentReqs: DocumentRequirementsService,
    private clientData: ClientDataService
  ) { }

  /**
   * Port exacto de createClientFromOnboarding desde React simulationService.ts líneas 287-340
   * Core onboarding engine that determines document requirements and creates client
   */
  createClientFromOnboarding(config: {
    name: string;
    market: 'aguascalientes' | 'edomex';
    saleType: 'contado' | 'financiero';
    ecosystemId?: string;
  }): Observable<Client> {
    const newId = `onboard-${Date.now()}`;
    let flow: BusinessFlow;

    // Exact port from React logic
    if (config.saleType === 'contado') {
      flow = BusinessFlow.VentaDirecta;
    } else { // Financiero
      flow = BusinessFlow.VentaPlazo;
    }

    // Get documents using our DocumentRequirementsService
    return new Observable<Client>((observer: any) => {
      this.documentReqs.getDocumentRequirements({
        market: config.market,
        saleType: config.saleType,
        ecosystemId: config.ecosystemId
      }).subscribe((documents: AppDocument[]) => {
        // Apply unique client ID to each document
        const clientDocs = documents.map((d: AppDocument) => ({ 
          ...d, 
          id: `${newId}-${d.id}` 
        }));

        const newClient: Client = {
          id: newId,
          name: config.name,
          avatarUrl: `https://picsum.photos/seed/${newId}/100/100`,
          flow,
          status: 'Nuevas Oportunidades',
          healthScore: 70,
          documents: clientDocs,
          events: [{
            id: `${newId}-evt-1`,
            timestamp: new Date(),
            message: `Oportunidad creada desde el flujo de ${config.market}.`,
            actor: Actor.Asesor,
            type: EventType.AdvisorAction
          }],
          ecosystemId: config.ecosystemId,
        };

        // Store in clientsDB simulation (exact port from React)
        this.clientData.addClient(newClient).subscribe(() => {
          observer.next(newClient);
          observer.complete();
        });
      });
    }).pipe(delay(800)); // Mock API delay like React
  }

  /**
   * Port exacto de createSavingsOpportunity desde React simulationService.ts
   * Create savings/collective credit opportunity with specific document requirements
   */
  createSavingsOpportunity(config: {
    name: string;
    market: 'aguascalientes' | 'edomex';
    ecosystemId?: string;
    clientType: 'individual' | 'colectivo';
  }): Observable<Client> {
    const newId = `saving-${Date.now()}`;
    const flow = config.clientType === 'colectivo' 
      ? BusinessFlow.CreditoColectivo 
      : BusinessFlow.AhorroProgramado;

    return new Observable<Client>((observer: any) => {
      this.documentReqs.getDocumentRequirements({
        market: config.market,
        saleType: 'financiero', // Savings use financiero docs but simplified
        businessFlow: flow
      }).subscribe((documents: AppDocument[]) => {
        const clientDocs = documents.map((d: AppDocument) => ({ 
          ...d, 
          id: `${newId}-${d.id}` 
        }));

        const newClient: Client = {
          id: newId,
          name: config.name,
          avatarUrl: `https://picsum.photos/seed/${newId}/100/100`,
          flow,
          status: 'Nuevas Oportunidades',
          healthScore: 70,
          documents: clientDocs,
          events: [{
            id: `${newId}-evt-1`,
            timestamp: new Date(),
            message: `Oportunidad de ${flow} creada en ${config.market}.`,
            actor: Actor.Asesor,
            type: EventType.AdvisorAction
          }],
          ecosystemId: config.ecosystemId,
        };

        this.clientData.addClient(newClient).subscribe(() => {
          observer.next(newClient);
          observer.complete();
        });
      });
    }).pipe(delay(900));
  }

  /**
   * Port exacto de bulk member creation for collective credit groups
   */
  createCollectiveCreditMembers(config: {
    groupName: string;
    memberNames: string[];
    market: 'aguascalientes' | 'edomex';
    ecosystemId: string;
  }): Observable<Client[]> {
    const members: Client[] = [];
    const baseTimestamp = Date.now();

    return new Observable<Client[]>((observer: any) => {
      let processedCount = 0;

      config.memberNames.forEach((memberName, index) => {
        const memberId = `collective-${baseTimestamp}-${index + 1}`;
        
        this.documentReqs.getDocumentRequirements({
          market: config.market,
          saleType: 'financiero',
          businessFlow: BusinessFlow.CreditoColectivo
        }).subscribe((documents: AppDocument[]) => {
          const memberDocs = documents.map((d: AppDocument) => ({ 
            ...d, 
            id: `${memberId}-${d.id}` 
          }));

          const member: Client = {
            id: memberId,
            name: memberName,
            avatarUrl: `https://picsum.photos/seed/${memberId}/100/100`,
            flow: BusinessFlow.CreditoColectivo,
            status: 'Nuevas Oportunidades',
            healthScore: 75,
            documents: memberDocs,
            events: [{
              id: `${memberId}-evt-1`,
              timestamp: new Date(baseTimestamp + (index * 100)),
              message: `Miembro agregado al grupo ${config.groupName}.`,
              actor: Actor.Asesor,
              type: EventType.AdvisorAction
            }],
            ecosystemId: config.ecosystemId,
            // Group metadata
            collectiveCreditGroupId: `group-${baseTimestamp}`,
            collectiveGroupName: config.groupName
          };

          this.clientData.addClient(member).subscribe(() => {
            members.push(member);
            processedCount++;

            if (processedCount === config.memberNames.length) {
              observer.next(members);
              observer.complete();
            }
          });
        });
      });
    }).pipe(delay(1200));
  }

  /**
   * Port exacto de client status progression from React
   */
  advanceClientStatus(clientId: string, newStatus: string, reason?: string): Observable<Client> {
    return new Observable<Client>((observer: any) => {
      this.clientData.getClientById(clientId).subscribe((client: Client | null) => {
        if (!client) {
          observer.error('Client not found');
          return;
        }

        const updatedClient: Client = {
          ...client,
          status: newStatus,
          events: [
            ...client.events,
            {
              id: `${clientId}-evt-${Date.now()}`,
              timestamp: new Date(),
              message: reason || `Estado actualizado a: ${newStatus}`,
              actor: Actor.Asesor,
              type: EventType.StatusChange
            }
          ]
        };

        this.clientData.updateClient(updatedClient.id, updatedClient).subscribe(() => {
          observer.next(updatedClient);
          observer.complete();
        });
      });
    }).pipe(delay(400));
  }

  /**
   * Port exacto de document submission logic from React
   */
  submitDocument(
    clientId: string, 
    documentId: string, 
    file?: File,
    notes?: string
  ): Observable<Client> {
    return new Observable<Client>((observer: any) => {
      this.clientData.getClientById(clientId).subscribe((client: Client | null) => {
        if (!client) {
          observer.error('Client not found');
          return;
        }

        const updatedDocs = client.documents.map((doc: AppDocument) => {
          if (doc.id === documentId) {
            return {
              ...doc,
              status: 'En Revisión' as any,
              submittedAt: new Date(),
              fileName: file?.name,
              notes
            };
          }
          return doc;
        });

        const updatedClient: Client = {
          ...client,
          documents: updatedDocs,
          events: [
            ...client.events,
            {
              id: `${clientId}-evt-${Date.now()}`,
              timestamp: new Date(),
              message: `Documento "${client.documents.find(d => d.id === documentId)?.name}" enviado para revisión.`,
              actor: Actor.Cliente,
              type: EventType.DocumentSubmission
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
   * Port exacto de document approval/rejection logic
   */
  reviewDocument(
    clientId: string,
    documentId: string,
    approved: boolean,
    reviewNotes?: string
  ): Observable<Client> {
    return new Observable<Client>((observer: any) => {
      this.clientData.getClientById(clientId).subscribe((client: Client | null) => {
        if (!client) {
          observer.error('Client not found');
          return;
        }

        const updatedDocs = client.documents.map((doc: AppDocument) => {
          if (doc.id === documentId) {
            return {
              ...doc,
              status: approved ? 'Aprobado' as any : 'Rechazado' as any,
              reviewedAt: new Date(),
              reviewNotes
            };
          }
          return doc;
        });

        const docName = client.documents.find(d => d.id === documentId)?.name;
        const updatedClient: Client = {
          ...client,
          documents: updatedDocs,
          events: [
            ...client.events,
            {
              id: `${clientId}-evt-${Date.now()}`,
              timestamp: new Date(),
              message: `Documento "${docName}" ${approved ? 'aprobado' : 'rechazado'}.${reviewNotes ? ` Notas: ${reviewNotes}` : ''}`,
              actor: Actor.Asesor,
              type: EventType.DocumentReview
            }
          ]
        };

        this.clientData.updateClient(updatedClient.id, updatedClient).subscribe(() => {
          observer.next(updatedClient);
          observer.complete();
        });
      });
    }).pipe(delay(500));
  }

  /**
   * Get onboarding progress summary for client - Updated flow with proper prerequisites
   */
  getOnboardingProgress(client: Client): {
    currentStep: string;
    stepsCompleted: number;
    totalSteps: number;
    nextAction: string;
    canProceed: boolean;
    completionPercentage: number;
    canStartKyc: boolean;
    canStartScoring: boolean;
    canStartContract: boolean;
  } {
    const docStatus = this.documentReqs.getDocumentCompletionStatus(client.documents);
    const kycValidation = this.documentReqs.validateKycPrerequisites(client.documents);
    
    // Check if core documents are approved (prerequisite for KYC)
    const ine = client.documents.find(d => d.name === 'INE Vigente');
    const comprobante = client.documents.find(d => d.name === 'Comprobante de domicilio');
    const kyc = client.documents.find(d => d.name.includes('Verificación Biométrica'));
    
    const coreDocsApproved = ine?.status === 'Aprobado' && comprobante?.status === 'Aprobado';
    const isKycComplete = kyc?.status === 'Aprobado';
    const allDocsComplete = docStatus.allComplete;
    
    let currentStep = 'Registro inicial';
    let nextAction = 'Subir documentos requeridos';
    let stepsCompleted = 1;
    const totalSteps = client.flow === BusinessFlow.VentaDirecta ? 4 : 6; // Cash: Docs->Contract, Credit: Docs->KYC->Scoring->Contract
    
    // Step 2: Document submission
    if (docStatus.completedDocs > 0) {
      currentStep = 'Documentos en proceso';
      nextAction = 'Completar y aprobar todos los documentos';
      stepsCompleted = 2;
    }
    
    // For Venta de Contado (cash sales) - skip KYC and Scoring
    if (client.flow === BusinessFlow.VentaDirecta) {
      if (allDocsComplete) {
        currentStep = 'Documentos completos';
        nextAction = 'Firmar contrato de promesa';
        stepsCompleted = 3;
      }
      
      return {
        currentStep,
        stepsCompleted,
        totalSteps,
        nextAction,
        canProceed: allDocsComplete,
        completionPercentage: Math.round((stepsCompleted / totalSteps) * 100),
        canStartKyc: false, // No KYC for cash sales
        canStartScoring: false, // No scoring for cash sales
        canStartContract: allDocsComplete
      };
    }
    
    // For credit flows (Venta a Plazo, Crédito Colectivo, Ahorro)
    // Step 3: KYC (requires core docs approved)
    if (coreDocsApproved && !isKycComplete) {
      currentStep = 'Listo para KYC';
      nextAction = 'Completar verificación biométrica';
      stepsCompleted = 3;
    }
    
    // Step 4: KYC completed
    if (isKycComplete && !allDocsComplete) {
      currentStep = 'KYC completado';
      nextAction = 'Completar documentos restantes';
      stepsCompleted = 4;
    }
    
    // Step 5: Ready for Credit Scoring
    if (isKycComplete && allDocsComplete) {
      currentStep = 'Listo para análisis crediticio';
      nextAction = 'Ejecutar scoring KINBAN/HASE';
      stepsCompleted = 5;
    }
    
    // Step 6: Ready for contract (scoring assumed complete)
    if (isKycComplete && allDocsComplete) {
      currentStep = 'Listo para contrato';
      nextAction = 'Generar y firmar contrato';
      stepsCompleted = 6;
    }

    return {
      currentStep,
      stepsCompleted,
      totalSteps,
      nextAction,
      canProceed: stepsCompleted >= 5, // Can proceed after scoring
      completionPercentage: Math.round((stepsCompleted / totalSteps) * 100),
      canStartKyc: coreDocsApproved && !isKycComplete,
      canStartScoring: isKycComplete && allDocsComplete,
      canStartContract: isKycComplete && allDocsComplete // Assuming scoring passed
    };
  }

  /**
   * Port exacto de ecosystem member validation
   */
  validateEcosystemMembership(
    clientId: string,
    ecosystemId: string
  ): Observable<{ isValid: boolean; reason?: string; }> {
    // Simulate ecosystem validation (exact port from React logic)
    return new Observable<{ isValid: boolean; reason?: string }>((observer: any) => {
      if (!ecosystemId) {
        observer.next({ isValid: false, reason: 'ID de ecosistema requerido' });
      } else if (ecosystemId.includes('invalid')) {
        observer.next({ isValid: false, reason: 'Ecosistema no encontrado' });
      } else {
        observer.next({ isValid: true });
      }
      observer.complete();
    }).pipe(delay(300));
  }
}