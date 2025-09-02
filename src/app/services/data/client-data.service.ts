import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { 
  Client, 
  Document, 
  DocumentStatus, 
  BusinessFlow, 
  Actor, 
  EventType,
  CollectiveCreditMember,
  ImportStatus
} from '../../models/types';

// --- Document Checklists - Port exacto desde React ---
const CONTADO_DOCS: Document[] = [
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
    { id: '7', name: 'Carta Aval de Ruta', status: DocumentStatus.Pendiente, tooltip: "Documento emitido y validado por el Ecosistema/Ruta." },
    { id: '8', name: 'Convenio de Dación en Pago', status: DocumentStatus.Pendiente, tooltip: "Convenio que formaliza el colateral social." },
];

const EDOMEX_AHORRO_DOCS: Document[] = [
    { id: '1', name: 'INE Vigente', status: DocumentStatus.Pendiente },
    { id: '2', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
];

@Injectable({
  providedIn: 'root'
})
export class ClientDataService {
  private clientsDB = new Map<string, Client>();
  private clientsSubject = new BehaviorSubject<Client[]>([]);

  public clients$ = this.clientsSubject.asObservable();

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize with exact data from React simulationService.ts
   */
  private initializeClients(): void {
    // Port exacto de collectiveCreditClients
    const collectiveCreditClients: Client[] = Array.from({ length: 12 }, (_, i) => ({
      id: `cc-${i + 1}`,
      name: `Miembro Crédito Colectivo ${i + 1}`,
      avatarUrl: `https://picsum.photos/seed/cc-member-${i+1}/100/100`,
      flow: BusinessFlow.CreditoColectivo,
      status: 'Activo en Grupo',
      healthScore: 80,
      documents: EDOMEX_AHORRO_DOCS.map(d => ({ ...d, status: DocumentStatus.Aprobado })),
      events: [
          { 
            id: `evt-cc-${i+1}`, 
            timestamp: new Date(Date.now() - (i*5*24*60*60*1000)), 
            message: `Aportación individual realizada.`, 
            actor: Actor.Cliente, 
            type: EventType.Contribution, 
            details: {amount: 15000 * Math.random(), currency: 'MXN'} 
          }
      ],
      collectiveCreditGroupId: i < 5 ? 'cc-2405' : (i < 9 ? 'cc-2406' : 'cc-2408'),
      ecosystemId: 'eco-1'
    }));

    // Port exacto de initialClients
    const initialClients: Client[] = [
      {
        id: '1',
        name: 'Juan Pérez (Venta a Plazo AGS)',
        avatarUrl: 'https://picsum.photos/seed/juan/100/100',
        flow: BusinessFlow.VentaPlazo,
        status: 'Activo',
        healthScore: 85,
        remainderAmount: 341200, // For Venta a Plazo
        paymentPlan: {
            monthlyGoal: 18282.88,
            currentMonthProgress: 6000,
            currency: 'MXN',
            methods: {
                collection: true,
                voluntary: true
            },
            collectionDetails: {
                plates: ['XYZ-123-A'],
                pricePerLiter: 5
            }
        },
        protectionPlan: {
            type: 'Esencial',
            restructuresAvailable: 1,
            restructuresUsed: 0,
            annualResets: 1,
        },
        documents: AGUASCALIENTES_FINANCIERO_DOCS.map((doc, i) => ({
          ...doc,
          status: i < 2 ? DocumentStatus.Aprobado : DocumentStatus.Pendiente
        })),
        events: [
          { id: 'evt1-3', timestamp: new Date(), message: 'Aportación Voluntaria confirmada.', actor: Actor.Sistema, type: EventType.Contribution, details: { amount: 5000, currency: 'MXN' } },
          { id: 'evt1-4', timestamp: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000), message: 'Recaudación Flota (Placa XYZ-123-A).', actor: Actor.Sistema, type: EventType.Collection, details: { amount: 1000, currency: 'MXN', plate: 'XYZ-123-A' } },
          { id: 'evt1-2', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), message: 'Documento INE/IFE cargado.', actor: Actor.Cliente, type: EventType.ClientAction },
          { id: 'evt1-1', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), message: 'Plan de Venta a Plazo creado.', actor: Actor.Asesor, type: EventType.AdvisorAction },
        ],
      },
      {
        id: '2',
        name: 'Maria García (EdoMex)',
        avatarUrl: 'https://picsum.photos/seed/maria/100/100',
        flow: BusinessFlow.VentaPlazo,
        status: 'Pagos al Corriente',
        healthScore: 92,
        ecosystemId: 'eco-1',
        remainderAmount: 818500,
        paymentPlan: {
            monthlyGoal: 22836.83,
            currentMonthProgress: 9500,
            currency: 'MXN',
            methods: {
                collection: true,
                voluntary: true,
            },
            collectionDetails: {
                plates: ['MGA-789-C'],
                pricePerLiter: 7,
            }
        },
        protectionPlan: {
            type: 'Total',
            restructuresAvailable: 3,
            restructuresUsed: 1,
            annualResets: 3,
        },
        documents: EDOMEX_MIEMBRO_DOCS.map(doc => ({ ...doc, status: DocumentStatus.Aprobado })),
        events: [
          { id: 'evt2-3', timestamp: new Date(), message: 'Aportación a mensualidad confirmada.', actor: Actor.Sistema, type: EventType.Contribution, details: { amount: 5000, currency: 'MXN' } },
          { id: 'evt2-2', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), message: 'Recaudación Flota (Placa MGA-789-C).', actor: Actor.Sistema, type: EventType.Collection, details: { amount: 4500, currency: 'MXN', plate: 'MGA-789-C' } },
          { id: 'evt2-1', timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), message: 'Plan de Pagos Híbrido configurado.', actor: Actor.Asesor, type: EventType.AdvisorAction },
        ],
      },
      { 
        id: '3', 
        name: 'Carlos Rodriguez', 
        avatarUrl: 'https://picsum.photos/seed/carlos/100/100', 
        flow: BusinessFlow.CreditoColectivo, 
        status: 'Esperando Sorteo', 
        healthScore: 78, 
        documents: EDOMEX_AHORRO_DOCS.map(d => ({ ...d, status: DocumentStatus.Aprobado })), 
        events: [{ id: 'evt3-1', timestamp: new Date(), message: 'Se unió al grupo de Crédito Colectivo "CC-2405 MAYO".', actor: Actor.Asesor, type: EventType.AdvisorAction }], 
        collectiveCreditGroupId: 'cc-2405', 
        ecosystemId: 'eco-1' 
      },
      { 
        id: '4', 
        name: 'Ana López', 
        avatarUrl: 'https://picsum.photos/seed/ana/100/100', 
        flow: BusinessFlow.AhorroProgramado, 
        status: 'Meta Alcanzada', 
        healthScore: 98, 
        savingsPlan: { 
          progress: 153075, 
          goal: 153075, 
          currency: 'MXN', 
          totalValue: 1020500, 
          methods: { voluntary: true, collection: false } 
        }, 
        documents: EDOMEX_AHORRO_DOCS.map(d => ({ ...d, status: DocumentStatus.Aprobado })), 
        events: [
          { id: 'evt4-1', timestamp: new Date(), message: '¡Meta de ahorro completada! Listo para iniciar Venta a Plazo.', actor: Actor.Sistema, type: EventType.GoalAchieved }
        ], 
        ecosystemId: 'eco-2' 
      },
      { 
        id: 'laura-1', 
        name: 'Laura Jimenez', 
        avatarUrl: 'https://picsum.photos/seed/laura/100/100', 
        flow: BusinessFlow.VentaPlazo, 
        status: 'Aprobado', 
        healthScore: 95, 
        documents: EDOMEX_MIEMBRO_DOCS.map(d => ({ ...d, status: DocumentStatus.Aprobado })), 
        events: [{ id: 'evt-laura-1', timestamp: new Date(), message: 'Crédito aprobado. Pendiente de configurar plan de pagos.', actor: Actor.Sistema, type: EventType.System }], 
        ecosystemId: 'eco-1' 
      },
      { 
        id: 'sofia-1', 
        name: 'Sofia Vargas', 
        avatarUrl: 'https://picsum.photos/seed/sofia/100/100', 
        flow: BusinessFlow.CreditoColectivo, 
        status: 'Turno Adjudicado', 
        healthScore: 96, 
        documents: EDOMEX_AHORRO_DOCS.map(d => ({ ...d, status: DocumentStatus.Aprobado })), 
        events: [{ id: 'evt-sofia-1', timestamp: new Date(), message: 'Turno de crédito adjudicado. ¡Felicidades!', actor: Actor.Sistema, type: EventType.GoalAchieved }], 
        collectiveCreditGroupId: 'cc-2405', 
        ecosystemId: 'eco-1' 
      },
      { 
        id: 'roberto-1', 
        name: 'Roberto Mendoza (Contado AGS)', 
        avatarUrl: 'https://picsum.photos/seed/roberto/100/100', 
        flow: BusinessFlow.VentaDirecta, 
        status: 'Unidad Lista para Entrega', 
        healthScore: 88, 
        documents: CONTADO_DOCS.map(doc => ({...doc, status: DocumentStatus.Aprobado})),
        events: [ 
          {id: 'evt-roberto-1', timestamp: new Date(), message: 'Contrato Promesa de Compraventa firmado para Venta Directa.', actor: Actor.Sistema, type: EventType.System }, 
          {id: 'evt-roberto-2', timestamp: new Date(), message: 'Pago de enganche recibido.', actor: Actor.Cliente, type: EventType.Contribution, details: {amount: 400000, currency: 'MXN'}}, 
        ], 
        downPayment: 400000, 
        remainderAmount: 453000, // 853000 (AGS Package) - 400000
        importStatus: { 
          pedidoPlanta: 'completed', 
          unidadFabricada: 'completed', 
          transitoMaritimo: 'completed', 
          enAduana: 'completed', 
          liberada: 'completed' 
        } 
      },
      ...collectiveCreditClients,
    ];

    // Initialize clientsDB Map
    this.clientsDB.clear();
    initialClients.forEach(client => this.clientsDB.set(client.id, client));

    // Update observable
    this.clientsSubject.next(Array.from(this.clientsDB.values()));
  }

  /**
   * Get all clients
   */
  getClients(): Observable<Client[]> {
    return of(Array.from(this.clientsDB.values())).pipe(delay(300));
  }

  /**
   * Get client by ID
   */
  getClientById(id: string): Observable<Client | null> {
    return of(this.clientsDB.get(id) || null).pipe(delay(200));
  }

  /**
   * Get clients by business flow
   */
  getClientsByFlow(flow: BusinessFlow): Observable<Client[]> {
    return of(Array.from(this.clientsDB.values()).filter(client => client.flow === flow))
      .pipe(delay(250));
  }

  /**
   * Get clients by ecosystem
   */
  getClientsByEcosystem(ecosystemId: string): Observable<Client[]> {
    return of(Array.from(this.clientsDB.values()).filter(client => client.ecosystemId === ecosystemId))
      .pipe(delay(250));
  }

  /**
   * Get clients in collective credit group
   */
  getClientsInGroup(groupId: string): Observable<Client[]> {
    return of(Array.from(this.clientsDB.values()).filter(client => client.collectiveCreditGroupId === groupId))
      .pipe(delay(300));
  }

  /**
   * Create new client
   */
  createClient(clientData: Partial<Client>): Observable<Client> {
    const newClient: Client = {
      id: `client-${Date.now()}`,
      name: clientData.name || 'Cliente Nuevo',
      avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
      flow: clientData.flow || BusinessFlow.VentaPlazo,
      status: 'Nuevo',
      healthScore: 0,
      documents: this.getDocumentsByFlow(clientData.flow || BusinessFlow.VentaPlazo),
      events: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date(),
          message: 'Cliente registrado en el sistema.',
          actor: Actor.Asesor,
          type: EventType.AdvisorAction
        }
      ],
      ...clientData
    };

    this.clientsDB.set(newClient.id, newClient);
    this.clientsSubject.next(Array.from(this.clientsDB.values()));

    return of(newClient).pipe(delay(500));
  }

  /**
   * Update client
   */
  updateClient(id: string, updates: Partial<Client>): Observable<Client | null> {
    const existingClient = this.clientsDB.get(id);
    if (!existingClient) {
      return of(null).pipe(delay(300));
    }

    const updatedClient = { ...existingClient, ...updates };
    this.clientsDB.set(id, updatedClient);
    this.clientsSubject.next(Array.from(this.clientsDB.values()));

    return of(updatedClient).pipe(delay(400));
  }

  /**
   * Add event to client
   */
  addClientEvent(clientId: string, eventData: Omit<Client['events'][0], 'id' | 'timestamp'>): Observable<Client | null> {
    const client = this.clientsDB.get(clientId);
    if (!client) {
      return of(null).pipe(delay(200));
    }

    const newEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date(),
      ...eventData
    };

    const updatedClient = {
      ...client,
      events: [newEvent, ...client.events]
    };

    this.clientsDB.set(clientId, updatedClient);
    this.clientsSubject.next(Array.from(this.clientsDB.values()));

    return of(updatedClient).pipe(delay(300));
  }

  /**
   * Update client document status
   */
  updateDocumentStatus(clientId: string, documentId: string, status: DocumentStatus): Observable<Client | null> {
    const client = this.clientsDB.get(clientId);
    if (!client) {
      return of(null).pipe(delay(200));
    }

    const updatedDocuments = client.documents.map(doc =>
      doc.id === documentId ? { ...doc, status } : doc
    );

    const updatedClient = {
      ...client,
      documents: updatedDocuments
    };

    this.clientsDB.set(clientId, updatedClient);
    this.clientsSubject.next(Array.from(this.clientsDB.values()));

    // Add event for document update
    this.addClientEvent(clientId, {
      message: `Documento "${updatedDocuments.find(d => d.id === documentId)?.name}" actualizado a ${status}.`,
      actor: Actor.Asesor,
      type: EventType.AdvisorAction
    });

    return of(updatedClient).pipe(delay(400));
  }

  /**
   * Get document checklist by business flow
   */
  private getDocumentsByFlow(flow: BusinessFlow): Document[] {
    switch (flow) {
      case BusinessFlow.VentaDirecta:
        return CONTADO_DOCS.map(doc => ({ ...doc }));
      case BusinessFlow.VentaPlazo:
        return AGUASCALIENTES_FINANCIERO_DOCS.map(doc => ({ ...doc }));
      case BusinessFlow.CreditoColectivo:
        return EDOMEX_MIEMBRO_DOCS.map(doc => ({ ...doc }));
      case BusinessFlow.AhorroProgramado:
        return EDOMEX_AHORRO_DOCS.map(doc => ({ ...doc }));
      default:
        return AGUASCALIENTES_FINANCIERO_DOCS.map(doc => ({ ...doc }));
    }
  }

  /**
   * Search clients
   */
  searchClients(query: string): Observable<Client[]> {
    const lowerQuery = query.toLowerCase();
    const matchingClients = Array.from(this.clientsDB.values()).filter(client =>
      client.name.toLowerCase().includes(lowerQuery) ||
      client.status.toLowerCase().includes(lowerQuery)
    );

    return of(matchingClients).pipe(delay(400));
  }

  /**
   * Get clients statistics
   */
  getClientsStats(): Observable<{
    total: number;
    byFlow: Record<BusinessFlow, number>;
    byStatus: Record<string, number>;
    averageHealthScore: number;
  }> {
    const clients = Array.from(this.clientsDB.values());
    
    const byFlow = clients.reduce((acc, client) => {
      acc[client.flow] = (acc[client.flow] || 0) + 1;
      return acc;
    }, {} as Record<BusinessFlow, number>);

    const byStatus = clients.reduce((acc, client) => {
      acc[client.status] = (acc[client.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageHealthScore = clients.reduce((sum, client) => 
      sum + (client.healthScore || 0), 0) / clients.length;

    return of({
      total: clients.length,
      byFlow,
      byStatus,
      averageHealthScore
    }).pipe(delay(300));
  }
}