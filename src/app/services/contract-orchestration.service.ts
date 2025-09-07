import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { delay, switchMap, map } from 'rxjs/operators';
import { Client, BusinessFlow } from '../models/types';
import { MifielService } from './mifiel.service';
import { CreditScoringService } from './credit-scoring.service';
import { ClientDataService } from './data/client-data.service';

// Contract Flow Types by Product
type ContractFlow = 
  | 'venta_contado' 
  | 'venta_plazo_individual' 
  | 'venta_plazo_colectivo' 
  | 'ahorro_individual' 
  | 'ahorro_colectivo';

interface ContractStep {
  id: string;
  name: string;
  description: string;
  contractType: 'promesa' | 'compraventa' | 'convenio_plazo' | 'convenio_ahorro';
  required: boolean;
  order: number;
  prerequisites: string[];
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed';
}

interface ContractFlowDefinition {
  flow: ContractFlow;
  name: string;
  description: string;
  steps: ContractStep[];
  totalSteps: number;
}

interface ContractOrchestrationResult {
  clientId: string;
  flow: ContractFlow;
  currentStep: ContractStep | null;
  completedSteps: ContractStep[];
  pendingSteps: ContractStep[];
  canProceed: boolean;
  nextAction: string;
  completionPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class ContractOrchestrationService {

  private contractFlows: Map<ContractFlow, ContractFlowDefinition> = new Map();

  constructor(
    private mifielService: MifielService,
    private creditScoring: CreditScoringService,
    private clientData: ClientDataService
  ) {
    this.initializeContractFlows();
  }

  /**
   * Initialize contract flows by product type
   */
  private initializeContractFlows(): void {
    // Venta de Contado Flow
    this.contractFlows.set('venta_contado', {
      flow: 'venta_contado',
      name: 'Venta de Contado',
      description: 'Proceso para compra al contado (50% enganche)',
      totalSteps: 2,
      steps: [
        {
          id: 'promesa_contado',
          name: 'Contrato de Promesa',
          description: 'Firma de contrato de promesa de compraventa',
          contractType: 'promesa',
          required: true,
          order: 1,
          prerequisites: ['documents_complete'],
          status: 'pending'
        },
        {
          id: 'compraventa_contado',
          name: 'Contrato de Compraventa',
          description: 'Firma definitiva tras pago del 50% restante',
          contractType: 'compraventa',
          required: true,
          order: 2,
          prerequisites: ['promesa_contado', 'payment_50_percent'],
          status: 'pending'
        }
      ]
    });

    // Venta a Plazo Individual Flow
    this.contractFlows.set('venta_plazo_individual', {
      flow: 'venta_plazo_individual',
      name: 'Venta a Plazo Individual',
      description: 'Proceso crediticio individual con scoring',
      totalSteps: 2,
      steps: [
        {
          id: 'promesa_plazo_individual',
          name: 'Contrato de Promesa',
          description: 'Firma de promesa tras aprobación crediticia',
          contractType: 'promesa',
          required: true,
          order: 1,
          prerequisites: ['documents_complete', 'kyc_complete', 'scoring_approved'],
          status: 'pending'
        },
        {
          id: 'convenio_plazo_individual',
          name: 'Convenio de Venta a Plazo',
          description: 'Contrato definitivo con términos de financiamiento',
          contractType: 'convenio_plazo',
          required: true,
          order: 2,
          prerequisites: ['promesa_plazo_individual', 'down_payment_received'],
          status: 'pending'
        }
      ]
    });

    // Venta a Plazo Colectivo (Crédito Colectivo)
    this.contractFlows.set('venta_plazo_colectivo', {
      flow: 'venta_plazo_colectivo',
      name: 'Crédito Colectivo',
      description: 'Proceso crediticio grupal con garantía solidaria',
      totalSteps: 2,
      steps: [
        {
          id: 'convenio_colectivo',
          name: 'Convenio de Crédito Colectivo',
          description: 'Contrato grupal con garantía solidaria',
          contractType: 'convenio_plazo',
          required: true,
          order: 1,
          prerequisites: ['all_members_approved', 'group_scoring_approved'],
          status: 'pending'
        },
        {
          id: 'contratos_individuales',
          name: 'Contratos Individuales de Compraventa',
          description: 'Contratos por cada miembro según entregas programadas',
          contractType: 'compraventa',
          required: true,
          order: 2,
          prerequisites: ['convenio_colectivo', 'delivery_schedule_defined'],
          status: 'pending'
        }
      ]
    });

    // Ahorro Individual
    this.contractFlows.set('ahorro_individual', {
      flow: 'ahorro_individual',
      name: 'Ahorro Programado Individual',
      description: 'Programa de ahorro individual con opción de anticipo',
      totalSteps: 2,
      steps: [
        {
          id: 'promesa_ahorro_individual',
          name: 'Contrato de Promesa de Ahorro',
          description: 'Compromiso de ahorro programado',
          contractType: 'promesa',
          required: true,
          order: 1,
          prerequisites: ['documents_complete'],
          status: 'pending'
        },
        {
          id: 'compraventa_ahorro_individual',
          name: 'Contrato de Compraventa (si hay anticipo)',
          description: 'Activado solo si cliente da anticipo/aportación',
          contractType: 'compraventa',
          required: false,
          order: 2,
          prerequisites: ['promesa_ahorro_individual', 'advance_payment_received'],
          status: 'pending'
        }
      ]
    });

    // Ahorro Colectivo (Tanda)
    this.contractFlows.set('ahorro_colectivo', {
      flow: 'ahorro_colectivo',
      name: 'Ahorro Colectivo (Tanda)',
      description: 'Sistema de tanda con entregas programadas',
      totalSteps: 2,
      steps: [
        {
          id: 'convenio_ahorro_colectivo',
          name: 'Convenio de Ahorro Colectivo',
          description: 'Acuerdo de tanda con schedule de entregas',
          contractType: 'convenio_ahorro',
          required: true,
          order: 1,
          prerequisites: ['tanda_members_complete', 'delivery_schedule_approved'],
          status: 'pending'
        },
        {
          id: 'contratos_entrega_tanda',
          name: 'Contratos de Entrega por Posición',
          description: 'Contratos individuales según posición en tanda',
          contractType: 'compraventa',
          required: true,
          order: 2,
          prerequisites: ['convenio_ahorro_colectivo', 'member_turn_arrived'],
          status: 'pending'
        }
      ]
    });
  }

  /**
   * Get contract flow based on client's business flow and market
   */
  getContractFlow(client: Client): Observable<ContractFlow> {
    return of(this.determineContractFlow(client.flow, client.ecosystemId));
  }

  private determineContractFlow(businessFlow: BusinessFlow, ecosystemId?: string): ContractFlow {
    switch (businessFlow) {
      case BusinessFlow.VentaDirecta:
        return 'venta_contado';
      
      case BusinessFlow.VentaPlazo:
        return 'venta_plazo_individual';
      
      case BusinessFlow.CreditoColectivo:
        return 'venta_plazo_colectivo';
      
      case BusinessFlow.AhorroProgramado:
        // Check if individual or collective based on ecosystem
        return ecosystemId?.includes('tanda') || ecosystemId?.includes('colectivo') 
          ? 'ahorro_colectivo' 
          : 'ahorro_individual';
      
      default:
        return 'venta_plazo_individual';
    }
  }

  /**
   * Get current contract orchestration status for client
   */
  getContractOrchestrationStatus(client: Client): Observable<ContractOrchestrationResult> {
    return this.getContractFlow(client).pipe(
      switchMap(flow => {
        const flowDefinition = this.contractFlows.get(flow);
        if (!flowDefinition) {
          throw new Error(`Contract flow ${flow} not found`);
        }

        // Evaluate prerequisites for each step
        const evaluatedSteps = flowDefinition.steps.map(step => ({
          ...step,
          status: this.evaluateStepStatus(step, client, flow)
        }));

        const completedSteps = evaluatedSteps.filter(s => s.status === 'completed');
        const pendingSteps = evaluatedSteps.filter(s => s.status === 'pending' || s.status === 'ready');
        const currentStep = evaluatedSteps.find(s => s.status === 'ready' || s.status === 'in_progress') || null;
        
        const canProceed = currentStep !== null;
        const nextAction = currentStep 
          ? `Proceder con: ${currentStep.name}`
          : completedSteps.length === flowDefinition.totalSteps
            ? 'Proceso contractual completo'
            : 'Completar prerrequisitos';

        const completionPercentage = Math.round((completedSteps.length / flowDefinition.totalSteps) * 100);

        return of({
          clientId: client.id,
          flow,
          currentStep,
          completedSteps,
          pendingSteps,
          canProceed,
          nextAction,
          completionPercentage
        });
      }),
      delay(200)
    );
  }

  /**
   * Evaluate if a contract step can be executed
   */
  private evaluateStepStatus(
    step: ContractStep, 
    client: Client, 
    flow: ContractFlow
  ): ContractStep['status'] {
    // Check if step prerequisites are met
    const prerequisitesMet = step.prerequisites.every(prereq => {
      switch (prereq) {
        case 'documents_complete':
          // All required documents approved
          return client.documents.every(doc => doc.status === 'Aprobado');
        
        case 'kyc_complete':
          return client.documents.some(doc => 
            doc.name.includes('Verificación Biométrica') && doc.status === 'Aprobado'
          );
        
        case 'scoring_approved':
          // This would check actual scoring result - simplified for now
          return true; // Assume scoring passed if we reached contract phase
        
        case 'all_members_approved':
          // For collective flows - check if all group members completed onboarding
          return flow === 'venta_plazo_colectivo' || flow === 'ahorro_colectivo';
        
        case 'group_scoring_approved':
          // Group scoring validation
          return true; // Simplified
        
        case 'delivery_schedule_defined':
          // Check if tanda delivery schedule exists
          return (client as any).deliverySchedule !== undefined;
        
        case 'tanda_members_complete':
          // All tanda members ready
          return true; // Simplified
        
        case 'delivery_schedule_approved':
          // Tanda schedule approved by all members
          return true; // Simplified
        
        case 'payment_50_percent':
        case 'down_payment_received':
        case 'advance_payment_received':
          // Payment validations - would integrate with payment service
          return false; // Default to false until payment confirmed
        
        case 'promesa_contado':
        case 'promesa_plazo_individual':
        case 'promesa_ahorro_individual':
        case 'convenio_colectivo':
        case 'convenio_ahorro_colectivo':
          // Check if previous step contract was signed
          return this.isContractSigned(client, prereq);
        
        case 'member_turn_arrived':
          // Check if it's member's turn in tanda
          return this.isMemberTurnInTanda(client);
        
        default:
          return false;
      }
    });

    if (prerequisitesMet) {
      return 'ready';
    } else if (this.isContractSigned(client, step.id)) {
      return 'completed';
    } else {
      return 'pending';
    }
  }

  /**
   * Check if a specific contract was signed (simplified)
   */
  private isContractSigned(client: Client, contractStepId: string): boolean {
    // This would check MIFIEL service for signed contracts
    // Simplified for now
    return false;
  }

  /**
   * Check if it's member's turn in tanda delivery
   */
  private isMemberTurnInTanda(client: Client): boolean {
    // This would check tanda delivery schedule
    // Simplified for now
    return true;
  }

  /**
   * Execute contract step (create and send for signature)
   */
  executeContractStep(
    client: Client, 
    stepId: string, 
    contractContent?: string
  ): Observable<{
    success: boolean;
    contractId?: string;
    signatureUrl?: string;
    message: string;
  }> {
    return this.getContractFlow(client).pipe(
      switchMap(flow => {
        const flowDefinition = this.contractFlows.get(flow);
        const step = flowDefinition?.steps.find(s => s.id === stepId);
        
        if (!step) {
          throw new Error(`Contract step ${stepId} not found`);
        }

        if (step.status !== 'ready') {
          return of({
            success: false,
            message: 'Step prerequisites not met'
          });
        }

        // Generate contract content based on type
        const contractData = this.generateContractContent(client, step, contractContent);
        
        // Create contract through MIFIEL
        return this.mifielService.createContractForClient(
          client.id,
          {
            name: client.name,
            email: `${client.id}@temp.com`, // Would get from client data
            rfc: 'TEMP123456', // Would get from client data
            phone: '5555555555'
          },
          this.mapContractTypeToMifiel(step.contractType),
          contractData
        ).pipe(
          map(document => ({
            success: true,
            contractId: document.id,
            signatureUrl: document.signatureUrl,
            message: `Contrato ${step.name} creado exitosamente`
          }))
        );
      })
    );
  }

  /**
   * Generate contract content based on step type
   */
  private generateContractContent(
    client: Client, 
    step: ContractStep, 
    customContent?: string
  ): string {
    if (customContent) return customContent;

    // Generate standard contract content based on type
    const baseContent = `
CONTRATO DE ${step.name.toUpperCase()}

Cliente: ${client.name}
ID: ${client.id}
Fecha: ${new Date().toLocaleDateString('es-MX')}

Términos y condiciones específicos para ${step.description}...

[Este es contenido de contrato simulado para desarrollo]
    `.trim();

    return baseContent;
  }

  /**
   * Map internal contract types to MIFIEL contract types
   */
  private mapContractTypeToMifiel(
    contractType: ContractStep['contractType']
  ): 'venta_plazo' | 'venta_directa' | 'plan_ahorro' | 'credito_colectivo' {
    switch (contractType) {
      case 'promesa':
      case 'compraventa':
        return 'venta_directa';
      case 'convenio_plazo':
        return 'venta_plazo';
      case 'convenio_ahorro':
        return 'plan_ahorro';
      default:
        return 'venta_plazo';
    }
  }

  /**
   * Get available contract flows
   */
  getAvailableFlows(): Observable<ContractFlowDefinition[]> {
    return of(Array.from(this.contractFlows.values()));
  }

  /**
   * Get flow definition by type
   */
  getFlowDefinition(flow: ContractFlow): Observable<ContractFlowDefinition | null> {
    return of(this.contractFlows.get(flow) || null);
  }

  /**
   * Mark contract step as completed (when signature is received)
   */
  markStepCompleted(clientId: string, stepId: string): Observable<boolean> {
    return new Observable(observer => {
      // This would update the step status in database
      // For now, just simulate success
      setTimeout(() => {
        observer.next(true);
        observer.complete();
      }, 500);
    });
  }

  /**
   * Get contract signing statistics
   */
  getContractStats(): Observable<{
    totalContracts: number;
    contractsByFlow: { [key: string]: number };
    pendingSignatures: number;
    completedContracts: number;
    averageSigningTime: number;
  }> {
    // This would integrate with MIFIEL service and client data
    return of({
      totalContracts: 0,
      contractsByFlow: {},
      pendingSignatures: 0,
      completedContracts: 0,
      averageSigningTime: 0
    }).pipe(delay(300));
  }
}