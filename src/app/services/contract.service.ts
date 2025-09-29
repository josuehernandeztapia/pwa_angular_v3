import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Client, BusinessFlow, Market } from '../models/types';
import { VehicleUnit } from '../models/postventa';

export interface ContractTemplate {
  id: string;
  name: string;
  type: ContractType;
  market: Market;
  flow: BusinessFlow;
  template: string; // HTML template del contrato
  requiredFields: ContractField[];
  version: string;
  effectiveDate: Date;
  status?: 'active' | 'inactive';
  metadata?: Record<string, unknown>;
}

export interface ContractField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'signature';
  required: boolean;
  defaultValue?: any;
  validation?: string; // Regex pattern
  description: string;
}

export interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  templateId: string;
  contractType: ContractType;
  market: Market;
  flow: BusinessFlow;
  contractData: { [fieldId: string]: any };
  status: 'draft' | 'pending_signature' | 'signed' | 'executed' | 'cancelled';
  createdDate: Date;
  signedDate?: Date;
  executedDate?: Date;
  signatories: Signatory[];
  legalNotes?: string[];
  attachments?: ContractAttachment[];
  
  //  NUEVA PROPIEDAD: Unidad específica asignada al contrato
  assignedVehicle?: VehicleUnit;
  vehicleAssignedDate?: Date;
}

export interface Signatory {
  id: string;
  name: string;
  role: 'client' | 'representative' | 'witness' | 'legal_counsel';
  signatureDate?: Date;
  signatureMethod: 'digital' | 'physical' | 'biometric';
  signatureData?: string; // Base64 signature image
  status: 'pending' | 'signed' | 'declined';
}

export interface ContractAttachment {
  id: string;
  name: string;
  type: 'document' | 'annex' | 'amendment';
  fileUrl: string;
  uploadDate: Date;
}

export type ContractType = 
  | 'promesa_compraventa' // Compra contado/ahorro
  | 'contrato_compraventa' // Después de aportación inicial
  | 'contrato_venta_plazo_individual' // Venta a plazo individual
  | 'contrato_venta_plazo_colectivo' // Crédito colectivo
  | 'convenio_dacion_pago' // EdoMex post-onboarding
  | 'contrato_ahorro_individual' // Plan de ahorro
  | 'contrato_tanda_colectiva'; // Tanda/ahorro colectivo

export interface ContractFlowRule {
  market: Market;
  flow: BusinessFlow;
  stage: 'initial' | 'post_payment' | 'post_onboarding' | 'completion';
  requiredContract: ContractType;
  description: string;
  triggerCondition: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  private contractTemplates: ContractTemplate[] = [];
  private flowRules: ContractFlowRule[] = [];

  constructor() {
    this.initializeContractTemplates();
    this.initializeFlowRules();
  }

  /**
   * Get required contract type for client flow and stage
   */
  getRequiredContractType(
    client: Client, 
    stage: 'initial' | 'post_payment' | 'post_onboarding' | 'completion'
  ): Observable<ContractType | null> {
    
    const rule = this.flowRules.find(r => 
      r.market === client.market && 
      r.flow === client.flow && 
      r.stage === stage
    );

    return of(rule?.requiredContract || null).pipe(delay(100));
  }

  /**
   * Generate contract for client based on flow rules
   */
  generateContract(
    client: Client,
    contractType: ContractType,
    contractData: { [key: string]: any }
  ): Observable<Contract> {
    
    const template = this.contractTemplates.find(t => 
      t.type === contractType && 
      t.market === client.market &&
      t.flow === client.flow
    );

    if (!template) {
      throw new Error(`No template found for contract type: ${contractType}`);
    }

    // Validate required fields
    const missingFields = template.requiredFields
      .filter(field => field.required && !contractData[field.id])
      .map(field => field.name);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const signatories: Signatory[] = [
      {
        id: 'client',
        name: client.name,
        role: 'client',
        signatureMethod: 'digital',
        status: 'pending'
      },
      {
        id: 'company_rep',
        name: 'Representante Legal',
        role: 'representative',
        signatureMethod: 'digital',
        status: 'pending'
      }
    ];

    // Add witness for EdoMex collective contracts
    if (client.market === 'edomex' && contractType === 'contrato_venta_plazo_colectivo') {
      signatories.push({
        id: 'route_rep',
        name: 'Representante de la Ruta',
        role: 'witness',
        signatureMethod: 'physical',
        status: 'pending'
      });
    }

    const contract: Contract = {
      id: `contract-${Date.now()}-${client.id}`,
      clientId: client.id,
      clientName: client.name,
      templateId: template.id,
      contractType,
      market: (client.market || 'aguascalientes') as any,
      flow: client.flow,
      contractData,
      status: 'draft',
      createdDate: new Date(),
      signatories,
      legalNotes: this.generateLegalNotes(contractType, (client.market || 'aguascalientes') as any, client.flow)
    };

    return of(contract).pipe(delay(500));
  }

  /**
   * Get contract template with populated data
   */
  getPopulatedContract(contractId: string): Observable<string> {
    // Simulate getting contract and populating template
    const populatedHTML = `
      <div class="contract-document">
        <h1>CONTRATO DE VENTA A PLAZO</h1>
        <p>Entre [CLIENTE_NOMBRE] y [EMPRESA_NOMBRE]...</p>
        <div class="contract-content">
          <!-- Contenido del contrato poblado con datos reales -->
        </div>
        <div class="signatures">
          <div class="signature-block">
            <p>Firma del Cliente</p>
            <div class="signature-line"></div>
          </div>
          <div class="signature-block">
            <p>Representante Legal</p>
            <div class="signature-line"></div>
          </div>
        </div>
      </div>
    `;

    return of(populatedHTML).pipe(delay(300));
  }

  /**
   * Process digital signature
   */
  processSignature(
    contractId: string,
    signatoryId: string,
    signatureData: string,
    signatureMethod: 'digital' | 'biometric' = 'digital'
  ): Observable<{ success: boolean; contract: Contract }> {
    
    // Simulate signature processing
    const updatedContract: Contract = {
      id: contractId,
      clientId: 'client-123',
      clientName: 'Cliente Ejemplo',
      templateId: 'template-1',
      contractType: 'contrato_venta_plazo_individual',
      market: 'edomex',
      flow: BusinessFlow.VentaPlazo,
      contractData: {},
      status: 'signed',
      createdDate: new Date(),
      signedDate: new Date(),
      signatories: [
        {
          id: signatoryId,
          name: 'Cliente Ejemplo',
          role: 'client',
          signatureDate: new Date(),
          signatureMethod,
          signatureData,
          status: 'signed'
        }
      ]
    };

    return of({ success: true, contract: updatedContract }).pipe(delay(400));
  }

  /**
   * Get all contracts for client
   */
  getClientContracts(clientId: string): Observable<Contract[]> {
    // Simulate fetching client contracts
    const contracts: Contract[] = [];
    
    return of(contracts).pipe(delay(200));
  }

  /**
   * Get contract execution requirements
   */
  getExecutionRequirements(contractType: ContractType, market: Market): Observable<{
    requiredDocuments: string[];
    requiredApprovals: string[];
    executionSteps: string[];
    estimatedTimeframe: string;
  }> {
    
    const requirements = {
      requiredDocuments: this.getRequiredDocumentsForExecution(contractType, market),
      requiredApprovals: this.getRequiredApprovalsForExecution(contractType, market),
      executionSteps: this.getExecutionSteps(contractType, market),
      estimatedTimeframe: this.getEstimatedTimeframe(contractType)
    };

    return of(requirements).pipe(delay(200));
  }

  /**
   * Execute contract (mark as legally binding)
   */
  executeContract(contractId: string, executionNotes?: string): Observable<{
    success: boolean;
    executionDate: Date;
    legalReference: string;
  }> {
    
    const result = {
      success: true,
      executionDate: new Date(),
      legalReference: `REF-${Date.now()}`
    };

    return of(result).pipe(delay(300));
  }

  // === PRIVATE INITIALIZATION METHODS ===

  private initializeContractTemplates(): void {
    this.contractTemplates = [
      // AGS Templates
      {
        id: 'ags-promesa-compraventa',
        name: 'Promesa de Compraventa - AGS',
        type: 'promesa_compraventa',
        market: 'aguascalientes',
        flow: BusinessFlow.VentaDirecta,
        template: '<div>Template for AGS promesa compraventa</div>',
        requiredFields: [
          { id: 'cliente_nombre', name: 'Nombre del Cliente', type: 'text', required: true, description: 'Nombre completo del cliente' },
          { id: 'vehiculo_tipo', name: 'Tipo de Vehículo', type: 'text', required: true, description: 'Vagoneta H6C 19 Pasajeros' },
          { id: 'precio_total', name: 'Precio Total', type: 'currency', required: true, description: 'Precio total del vehículo' },
          { id: 'enganche', name: 'Enganche', type: 'currency', required: true, description: 'Monto del enganche (50%)' }
        ],
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        status: 'active'
      },
      {
        id: 'ags-venta-plazo',
        name: 'Contrato Venta a Plazo - AGS',
        type: 'contrato_venta_plazo_individual',
        market: 'aguascalientes',
        flow: BusinessFlow.VentaPlazo,
        template: '<div>Template for AGS venta plazo</div>',
        requiredFields: [
          { id: 'cliente_nombre', name: 'Nombre del Cliente', type: 'text', required: true, description: 'Nombre completo del cliente' },
          { id: 'precio_total', name: 'Precio Total', type: 'currency', required: true, description: 'Precio total del vehículo' },
          { id: 'enganche', name: 'Enganche', type: 'currency', required: true, description: 'Enganche 60%' },
          { id: 'plazo_meses', name: 'Plazo en Meses', type: 'number', required: true, description: '12 o 24 meses' },
          { id: 'pago_mensual', name: 'Pago Mensual', type: 'currency', required: true, description: 'Pago mensual calculado' },
          { id: 'tasa_interes', name: 'Tasa de Interés', type: 'percentage', required: true, description: '25.5% anual' }
        ],
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        status: 'active'
      },

      // EdoMex Templates
      {
        id: 'edomex-promesa-compraventa',
        name: 'Promesa de Compraventa - EdoMex',
        type: 'promesa_compraventa',
        market: 'edomex',
        flow: BusinessFlow.VentaDirecta,
        template: '<div>Template for EdoMex promesa compraventa</div>',
        requiredFields: [
          { id: 'cliente_nombre', name: 'Nombre del Cliente', type: 'text', required: true, description: 'Nombre completo del cliente' },
          { id: 'ruta_nombre', name: 'Nombre de la Ruta', type: 'text', required: true, description: 'Ruta/ecosistema del cliente' },
          { id: 'vehiculo_tipo', name: 'Tipo de Vehículo', type: 'text', required: true, description: 'Vagoneta H6C Ventanas' },
          { id: 'precio_total', name: 'Precio Total', type: 'currency', required: true, description: 'Precio total con conversión y bancas' },
          { id: 'enganche', name: 'Enganche', type: 'currency', required: true, description: 'Monto del enganche (50%)' }
        ],
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        status: 'active'
      },
      {
        id: 'edomex-venta-plazo-individual',
        name: 'Contrato Venta a Plazo Individual - EdoMex',
        type: 'contrato_venta_plazo_individual',
        market: 'edomex',
        flow: BusinessFlow.VentaPlazo,
        template: '<div>Template for EdoMex venta plazo individual</div>',
        requiredFields: [
          { id: 'cliente_nombre', name: 'Nombre del Cliente', type: 'text', required: true, description: 'Nombre completo del cliente' },
          { id: 'ruta_nombre', name: 'Nombre de la Ruta', type: 'text', required: true, description: 'Ruta/ecosistema del cliente' },
          { id: 'precio_total', name: 'Precio Total', type: 'currency', required: true, description: 'Precio total con componentes' },
          { id: 'enganche', name: 'Enganche', type: 'currency', required: true, description: 'Enganche 20-25%' },
          { id: 'plazo_meses', name: 'Plazo en Meses', type: 'number', required: true, description: '48 o 60 meses' },
          { id: 'pago_mensual', name: 'Pago Mensual', type: 'currency', required: true, description: 'Pago mensual calculado' },
          { id: 'tasa_interes', name: 'Tasa de Interés', type: 'percentage', required: true, description: '29.9% anual' }
        ],
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        status: 'active'
      },
      {
        id: 'edomex-venta-plazo-colectivo',
        name: 'Contrato Crédito Colectivo - EdoMex',
        type: 'contrato_venta_plazo_colectivo',
        market: 'edomex',
        flow: BusinessFlow.CreditoColectivo,
        template: '<div>Template for EdoMex crédito colectivo</div>',
        requiredFields: [
          { id: 'grupo_nombre', name: 'Nombre del Grupo', type: 'text', required: true, description: 'Nombre del grupo colectivo' },
          { id: 'ruta_nombre', name: 'Nombre de la Ruta', type: 'text', required: true, description: 'Ruta/ecosistema del grupo' },
          { id: 'miembros_count', name: 'Número de Miembros', type: 'number', required: true, description: 'Entre 5 y 20 miembros' },
          { id: 'precio_total', name: 'Precio Total', type: 'currency', required: true, description: 'Precio total con componentes' },
          { id: 'enganche', name: 'Enganche', type: 'currency', required: true, description: 'Enganche 15-20%' },
          { id: 'plazo_meses', name: 'Plazo en Meses', type: 'number', required: true, description: '60 meses fijo' },
          { id: 'pago_mensual', name: 'Pago Mensual', type: 'currency', required: true, description: 'Pago mensual calculado' }
        ],
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        status: 'active'
      },
      {
        id: 'edomex-convenio-dacion',
        name: 'Convenio de Dación en Pago - EdoMex',
        type: 'convenio_dacion_pago',
        market: 'edomex',
        flow: BusinessFlow.VentaPlazo,
        template: '<div>Template for EdoMex convenio dación en pago</div>',
        requiredFields: [
          { id: 'cliente_nombre', name: 'Nombre del Cliente', type: 'text', required: true, description: 'Nombre completo del cliente' },
          { id: 'ruta_nombre', name: 'Nombre de la Ruta', type: 'text', required: true, description: 'Ruta/ecosistema del cliente' },
          { id: 'vehiculo_actual', name: 'Vehículo Actual', type: 'text', required: true, description: 'Vehículo que se da en pago' },
          { id: 'valor_dacion', name: 'Valor de Dación', type: 'currency', required: true, description: 'Valor del vehículo en dación' }
        ],
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        status: 'active'
      }
    ];
  }

  private initializeFlowRules(): void {
    this.flowRules = [
      // AGS Rules
      {
        market: 'aguascalientes',
        flow: BusinessFlow.VentaDirecta,
        stage: 'initial',
        requiredContract: 'promesa_compraventa',
        description: 'Promesa de compraventa para compra de contado en AGS',
        triggerCondition: 'Al momento de solicitud'
      },
      {
        market: 'aguascalientes',
        flow: BusinessFlow.VentaDirecta,
        stage: 'post_payment',
        requiredContract: 'contrato_compraventa',
        description: 'Contrato de compraventa tras aportación inicial',
        triggerCondition: 'Después de enganche 50%'
      },
      {
        market: 'aguascalientes',
        flow: BusinessFlow.VentaPlazo,
        stage: 'initial',
        requiredContract: 'contrato_venta_plazo_individual',
        description: 'Contrato de venta a plazo individual para AGS',
        triggerCondition: 'Después de validación documental'
      },

      // EdoMex Rules
      {
        market: 'edomex',
        flow: BusinessFlow.VentaDirecta,
        stage: 'initial',
        requiredContract: 'promesa_compraventa',
        description: 'Promesa de compraventa para compra de contado en EdoMex',
        triggerCondition: 'Al momento de solicitud'
      },
      {
        market: 'edomex',
        flow: BusinessFlow.VentaDirecta,
        stage: 'post_payment',
        requiredContract: 'contrato_compraventa',
        description: 'Contrato de compraventa tras aportación inicial',
        triggerCondition: 'Después de enganche 50%'
      },
      {
        market: 'edomex',
        flow: BusinessFlow.VentaPlazo,
        stage: 'initial',
        requiredContract: 'contrato_venta_plazo_individual',
        description: 'Contrato de venta a plazo individual para EdoMex',
        triggerCondition: 'Después de validación documental y ecosistema'
      },
      {
        market: 'edomex',
        flow: BusinessFlow.VentaPlazo,
        stage: 'post_onboarding',
        requiredContract: 'convenio_dacion_pago',
        description: 'Convenio de dación en pago después del onboarding',
        triggerCondition: 'Después de completar onboarding en EdoMex'
      },
      {
        market: 'edomex',
        flow: BusinessFlow.CreditoColectivo,
        stage: 'initial',
        requiredContract: 'contrato_venta_plazo_colectivo',
        description: 'Contrato de crédito colectivo para EdoMex',
        triggerCondition: 'Después de formar grupo y validar ecosistema'
      }
    ];
  }

  private generateLegalNotes(contractType: ContractType, market: Market, flow: BusinessFlow): string[] {
    const notes: string[] = [];

    if (market === 'edomex') {
      notes.push('Aplican regulaciones específicas del Estado de México');
      notes.push('Requiere validación de ecosistema/ruta');
      
      if (contractType === 'convenio_dacion_pago') {
        notes.push('Este convenio es obligatorio para EdoMex post-onboarding');
        notes.push('El vehículo dado en pago debe tener documentación en regla');
      }
    }

    if (contractType === 'contrato_venta_plazo_colectivo') {
      notes.push('Todos los miembros del grupo son solidariamente responsables');
      notes.push('Se requiere validar firmas de todos los integrantes del colectivo');
    }

    notes.push('Este contrato se rige por las leyes mexicanas');
    notes.push('Cualquier disputa será resuelta en tribunales competentes');

    return notes;
  }

  private getRequiredDocumentsForExecution(contractType: ContractType, market: Market): string[] {
    const docs = ['Identificación oficial', 'Comprobante de domicilio'];

    if (market === 'edomex') {
      docs.push('Carta Aval de Ruta', 'Acta Constitutiva de la Ruta');
    }

    if (contractType.includes('colectivo')) {
      docs.push('Acta de constitución del grupo', 'Identificaciones de todos los miembros');
    }

    return docs;
  }

  private getRequiredApprovalsForExecution(contractType: ContractType, market: Market): string[] {
    const approvals = ['Aprobación crediticia', 'Validación documental'];

    if (market === 'edomex') {
      approvals.push('Validación de ecosistema');
    }

    if (contractType === 'contrato_venta_plazo_colectivo') {
      approvals.push('Aprobación del grupo colectivo');
    }

    return approvals;
  }

  private getExecutionSteps(contractType: ContractType, market: Market): string[] {
    const steps = [
      '1. Revisión y validación de documentos',
      '2. Firma de todas las partes',
      '3. Registro en sistema legal'
    ];

    if (market === 'edomex' && contractType === 'convenio_dacion_pago') {
      steps.push('4. Valoración del vehículo en dación');
      steps.push('5. Transferencia de propiedad');
    }

    return steps;
  }

  private getEstimatedTimeframe(contractType: ContractType): string {
    switch (contractType) {
      case 'promesa_compraventa':
        return '1-2 días hábiles';
      case 'contrato_compraventa':
        return '2-3 días hábiles';
      case 'contrato_venta_plazo_individual':
        return '3-5 días hábiles';
      case 'contrato_venta_plazo_colectivo':
        return '5-7 días hábiles';
      case 'convenio_dacion_pago':
        return '7-10 días hábiles';
      default:
        return '3-5 días hábiles';
    }
  }

  /**
   * Asigna una unidad física a un contrato existente y actualiza los datos dependientes.
   * Se ejecuta cuando se asigna una unidad al cliente en el import tracking.
   */
  assignVehicleToContract(
    contractId: string,
    assignedVehicle: VehicleUnit
  ): Observable<{ success: boolean; contract?: Contract; error?: string }> {
    console.debug('[ContractService] assignVehicleToContract invoked', {
      contractId,
      vin: assignedVehicle.vin,
      modelo: assignedVehicle.modelo,
      year: assignedVehicle.year
    });

    try {
      // Simular actualización del contrato en base de datos
      // En producción, esto sería una API call
      
      // 1. Validar que el contrato existe
      const existingContract = this.getContractById(contractId);
      if (!existingContract) {
        return of({
          success: false,
          error: `Contrato ${contractId} no encontrado`
        });
      }

      // 2. Crear contrato actualizado
      const updatedContract: Contract = {
        ...existingContract,
        assignedVehicle: assignedVehicle,
        vehicleAssignedDate: new Date(),
        // Actualizar contractData con información específica del vehículo
        contractData: {
          ...existingContract.contractData,
          // Campos específicos del vehículo para el contrato
          vehiculo_vin: assignedVehicle.vin,
          vehiculo_serie: assignedVehicle.serie,
          vehiculo_modelo: assignedVehicle.modelo,
          vehiculo_year: assignedVehicle.year,
          vehiculo_color: assignedVehicle.color,
          vehiculo_numero_motor: assignedVehicle.numeroMotor,
          vehiculo_combustible: assignedVehicle.fuelType,
          vehiculo_transmision: assignedVehicle.transmission,
          vehiculo_lote_produccion: assignedVehicle.productionBatch,
          vehiculo_planta: assignedVehicle.factoryLocation
        }
      };

      // 3. Simular guardado
      this.saveUpdatedContract(updatedContract);

      // 4. Log de asignación exitosa
      console.info('[ContractService] Vehicle assigned to contract', {
        contractId,
        vehicleId: assignedVehicle.id,
        vin: assignedVehicle.vin,
        assignedAt: updatedContract.vehicleAssignedDate
      });

      return of({
        success: true,
        contract: updatedContract
      });

    } catch (error: any) {
      console.error('[ContractService] Failed to assign vehicle to contract', error);
      return of({
        success: false,
        error: `Error interno: ${error.message}`
      });
    }
  }

  /**
   * Recupera un contrato simulado; en producción se reemplaza por llamada al backend.
   */
  private getContractById(contractId: string): Contract {
    // Simular obtención de contrato de base de datos
    // En producción, esto sería una API call
    
    const mockContract: Contract = {
      id: contractId,
      clientId: 'client-123',
      clientName: 'Cliente Ejemplo',
      templateId: 'template-1',
      contractType: 'contrato_venta_plazo_individual',
      market: 'aguascalientes',
      flow: BusinessFlow.VentaPlazo,
      contractData: {
        cliente_nombre: 'Cliente Ejemplo',
        precio_total: 850000,
        enganche: 510000,
        plazo_meses: 24,
        pago_mensual: 25000,
        tasa_interes: 25.5
      },
      status: 'signed',
      createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
      signedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 días atrás
      signatories: [
        {
          id: 'client-sig',
          name: 'Cliente Ejemplo',
          role: 'client',
          signatureDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          signatureMethod: 'digital',
          status: 'signed'
        }
      ]
    };

    return mockContract;
  }

  /**
   * Persiste en almacenamiento temporal la representación del contrato actualizado.
   */
  private saveUpdatedContract(contract: Contract): void {
    // Simular guardado en base de datos
    console.debug('[ContractService] Contract persisted (simulated)', {
      id: contract.id,
      assignedVehicle: contract.assignedVehicle?.vin,
      vehicleAssignedDate: contract.vehicleAssignedDate
    });

    // En producción, aquí sería la llamada a la API:
    // return this.http.put(`/api/contracts/${contract.id}`, contract);
  }

  /**
   * Obtiene la lista de contratos con unidades asignadas (simulado).
   */
  getContractsWithAssignedVehicles(): Observable<Contract[]> {
    // Simular obtención de contratos con vehículos asignados
    console.debug('[ContractService] Fetching contracts with assigned vehicles (mock)');

    // En producción, esto sería una API call con filtro
    const contractsWithVehicles: Contract[] = [];
    
    return of(contractsWithVehicles).pipe(delay(200));
  }

  /**
   * Recupera la unidad asignada a un contrato específico.
   */
  getVehicleFromContract(contractId: string): Observable<VehicleUnit | null> {
    console.debug('[ContractService] Retrieving vehicle for contract', { contractId });
    
    const contract = this.getContractById(contractId);
    return of(contract.assignedVehicle || null).pipe(delay(100));
  }
}
