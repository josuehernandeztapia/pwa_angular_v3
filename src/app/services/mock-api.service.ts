import { Injectable } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import { ClientDataService } from './data/client-data.service';
import { EcosystemDataService } from './data/ecosystem-data.service';
import { CollectiveGroupDataService } from './data/collective-group-data.service';
import {
  Client,
  Ecosystem,
  CompleteBusinessScenario,
  BusinessFlow
} from '../models/types';
import { CollectiveCreditGroup } from '../models/tanda';

@Injectable({
  providedIn: 'root'
})
export class MockApiService {
  
  // Port exacto de la configuración de delays desde React
  private readonly DEFAULT_DELAY = 500;
  private readonly NETWORK_SIMULATION = {
    fast: 200,
    normal: 500,
    slow: 1200,
    timeout: 8000
  };

  constructor(
    private clientDataService: ClientDataService,
    private ecosystemDataService: EcosystemDataService,
    private collectiveGroupDataService: CollectiveGroupDataService
  ) {
    this.initializeData();
  }

  /**
   * Initialize data - Port exacto de initializeDB desde React
   */
  private initializeData(): void {
    // Get initial clients and initialize collective groups
    this.clientDataService.getClients().subscribe(clients => {
      this.collectiveGroupDataService.initializeCollectiveGroups(clients);
    });
  }

  /**
   * Port exacto de mockApi function desde React
   */
  private mockApi<T>(data: T, delayMs: number = this.DEFAULT_DELAY): Observable<T> {
    return new Observable<T>(observer => {
      try {
        // Deep clone data but preserve Date objects (unlike JSON.parse/stringify)
        const clonedData = this.deepCloneWithDates(data);
        observer.next(clonedData);
        observer.complete();
      } catch (error) {
        // Log error for observability in tests
        console.error('MockApi Error:', error as any);
        observer.error(error);
      }
    }).pipe(
      delay(delayMs),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Deep clone preserving Date objects
   */
  private deepCloneWithDates<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCloneWithDates(item)) as any;
    }
    
    const cloned = {} as any;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepCloneWithDates((obj as any)[key]);
      }
    }
    return cloned;
  }

  /**
   * Simulate network conditions
   */
  private getNetworkDelay(): number {
    const conditions = ['fast', 'normal', 'slow'] as const;
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    return this.NETWORK_SIMULATION[randomCondition];
  }

  // ===========================================
  // CLIENT API ENDPOINTS
  // ===========================================

  /**
   * GET /api/clients
   */
  getClients(): Observable<Client[]> {
    return this.clientDataService.getClients().pipe(
      delay(this.getNetworkDelay())
    );
  }

  /**
   * GET /api/clients/:id
   */
  getClientById(id: string): Observable<Client | null> {
    return this.clientDataService.getClientById(id).pipe(
      delay(this.getNetworkDelay())
    );
  }

  /**
   * POST /api/clients
   */
  createClient(clientData: Partial<Client>): Observable<Client> {
    return this.clientDataService.createClient(clientData).pipe(
      delay(this.NETWORK_SIMULATION.slow) // Creation takes longer
    );
  }

  /**
   * PUT /api/clients/:id
   */
  updateClient(id: string, updates: Partial<Client>): Observable<Client | null> {
    return this.clientDataService.updateClient(id, updates).pipe(
      delay(this.NETWORK_SIMULATION.normal)
    );
  }

  /**
   * POST /api/clients/:id/events
   */
  addClientEvent(clientId: string, eventData: any): Observable<Client | null> {
    return this.clientDataService.addClientEvent(clientId, eventData).pipe(
      delay(this.NETWORK_SIMULATION.fast)
    );
  }

  /**
   * PUT /api/clients/:id/documents/:docId
   */
  updateDocumentStatus(clientId: string, documentId: string, status: any): Observable<Client | null> {
    return this.clientDataService.updateDocumentStatus(clientId, documentId, status).pipe(
      delay(this.NETWORK_SIMULATION.normal)
    );
  }

  // ===========================================
  // ECOSYSTEM API ENDPOINTS
  // ===========================================

  /**
   * GET /api/ecosystems
   */
  getEcosystems(): Observable<Ecosystem[]> {
    return this.ecosystemDataService.getEcosystems().pipe(
      delay(this.getNetworkDelay())
    );
  }

  /**
   * GET /api/ecosystems/:id
   */
  getEcosystemById(id: string): Observable<Ecosystem | null> {
    return this.ecosystemDataService.getEcosystemById(id).pipe(
      delay(this.getNetworkDelay())
    );
  }

  /**
   * POST /api/ecosystems
   */
  createEcosystem(ecosystemData: Partial<Ecosystem>): Observable<Ecosystem> {
    return this.ecosystemDataService.createEcosystem(ecosystemData).pipe(
      delay(this.NETWORK_SIMULATION.slow)
    );
  }

  /**
   * PUT /api/ecosystems/:id/documents/:docId
   */
  updateEcosystemDocument(ecosystemId: string, documentId: string, status: any): Observable<Ecosystem | null> {
    return this.ecosystemDataService.updateEcosystemDocumentStatus(ecosystemId, documentId, status).pipe(
      delay(this.NETWORK_SIMULATION.normal)
    );
  }

  // ===========================================
  // COLLECTIVE GROUPS API ENDPOINTS
  // ===========================================

  /**
   * GET /api/collective-groups
   */
  getCollectiveGroups(): Observable<CollectiveCreditGroup[]> {
    return this.collectiveGroupDataService.getCollectiveGroups().pipe(
      delay(this.getNetworkDelay())
    );
  }

  /**
   * GET /api/collective-groups/:id
   */
  getCollectiveGroupById(id: string): Observable<CollectiveCreditGroup | null> {
    return this.collectiveGroupDataService.getCollectiveGroupById(id).pipe(
      delay(this.getNetworkDelay())
    );
  }

  /**
   * POST /api/collective-groups/:id/members
   */
  addMemberToGroup(groupId: string, member: any): Observable<CollectiveCreditGroup | null> {
    return this.collectiveGroupDataService.addMemberToGroup(groupId, member).pipe(
      delay(this.NETWORK_SIMULATION.normal)
    );
  }

  /**
   * POST /api/collective-groups/:id/deliver
   */
  deliverUnitToGroup(groupId: string): Observable<CollectiveCreditGroup | null> {
    return this.collectiveGroupDataService.deliverUnitToGroup(groupId).pipe(
      delay(this.NETWORK_SIMULATION.slow) // Unit delivery is a significant operation
    );
  }

  // ===========================================
  // BUSINESS SCENARIOS API ENDPOINTS
  // ===========================================

  /**
   * POST /api/scenarios/cotizacion
   */
  createCotizacionScenario(scenarioData: any): Observable<CompleteBusinessScenario> {
    // Simulate scenario creation with business logic
    const scenario: CompleteBusinessScenario = {
      id: `scenario-${Date.now()}`,
      clientName: scenarioData.clientName,
      flow: scenarioData.flow,
      market: scenarioData.market,
      stage: 'COTIZACION',
      seniorSummary: {
        title: `Cotización para ${scenarioData.clientName}`,
        description: [
          'Cotización generada exitosamente',
          'Revisa los términos y condiciones',
          'Envía por WhatsApp al cliente'
        ],
        keyMetrics: [
          { label: 'Precio Total', value: '$850,000', icon: 'currency-dollar' },
          { label: 'Enganche', value: '$170,000', icon: 'bank' },
          { label: 'Mensualidad', value: '$18,500', icon: 'calendar' }
        ],
        timeline: [
          { month: 0, event: 'Firma de Contrato', icon: 'document-text' },
          { month: 1, event: 'Primer Pago', icon: 'currency-dollar' }
        ],
        whatsAppMessage: 'Tu cotización está lista'
      }
    };

    return this.mockApi(scenario, this.NETWORK_SIMULATION.slow);
  }

  /**
   * POST /api/scenarios/simulacion
   */
  createSimulacionScenario(scenarioData: any): Observable<CompleteBusinessScenario> {
    // Simulate scenario creation with projections
    const scenario: CompleteBusinessScenario = {
      id: `scenario-${Date.now()}`,
      clientName: scenarioData.clientName,
      flow: scenarioData.flow,
      market: scenarioData.market,
      stage: 'SIMULACION',
      seniorSummary: {
        title: `Simulación para ${scenarioData.clientName}`,
        description: [
          'Plan de ahorro simulado',
          'Proyección de 24 meses',
          'Meta alcanzable identificada'
        ],
        keyMetrics: [
          { label: 'Meta Ahorro', value: '$200,000', icon: 'target' },
          { label: 'Tiempo', value: '18 meses', icon: 'clock' },
          { label: 'Aportación', value: '$12,000/mes', icon: 'currency-dollar' }
        ],
        timeline: [
          { month: 6, event: '30% de Meta', icon: 'chart' },
          { month: 18, event: 'Meta Completa', icon: 'check-circle' }
        ],
        whatsAppMessage: 'Tu plan de ahorro está listo '
      }
    };

    return this.mockApi(scenario, this.NETWORK_SIMULATION.slow);
  }

  // ===========================================
  // SEARCH AND ANALYTICS
  // ===========================================

  /**
   * GET /api/search?q=:query
   */
  globalSearch(query: string): Observable<{
    clients: Client[];
    quotes: Array<{
      id: string;
      label: string;
      clientId: string;
      clientName: string;
      market?: string;
      amount?: number;
      status?: string;
    }>;
    documents: Array<{
      id: string;
      name: string;
      status?: string;
      clientId: string;
      clientName: string;
    }>;
    contracts: Array<{
      id: string;
      label: string;
      contractId: string;
      clientId: string;
      clientName: string;
      market?: string;
      status?: string;
      documentsComplete: boolean;
      protectionRequired: boolean;
      protectionApplied: boolean;
      pendingOfflineRequests: number;
      updatedAt: number;
      businessFlow?: BusinessFlow;
      aviDecision?: string;
      aviStatus?: string;
      requiresVoiceVerification?: boolean;
    }>;
    total: number;
  }> {
    const sanitized = (query || '').trim();
    if (!sanitized) {
      return of({ clients: [], quotes: [], documents: [], contracts: [], total: 0 });
    }

    return forkJoin({
      clients: this.clientDataService.searchClients(sanitized),
      groups: this.collectiveGroupDataService.searchGroups(sanitized)
    }).pipe(
      map(({ clients, groups }) => {
        const topClients = clients.slice(0, 10);
        const documents = this.buildDocumentMatches(topClients, sanitized);
        const quotes = this.buildQuoteMatches(topClients, sanitized, groups);
        const contracts = this.buildContractMatches(topClients);

        return {
          clients: topClients,
          quotes,
          documents,
          contracts,
          total: topClients.length + quotes.length + documents.length + contracts.length
        };
      })
    );
  }

  private buildDocumentMatches(clients: Client[], query: string): Array<{
    id: string;
    name: string;
    status?: string;
    clientId: string;
    clientName: string;
  }> {
    const lower = query.toLowerCase();
    const matches: Array<{ id: string; name: string; status?: string; clientId: string; clientName: string }> = [];

    clients.forEach(client => {
      (client.documents || []).forEach((doc, index) => {
        const docName = (doc.name || '').toString();
        if (docName.toLowerCase().includes(lower)) {
          matches.push({
            id: `${client.id}-doc-${doc.id || index}`,
            name: docName,
            status: (doc.status as any) ?? undefined,
            clientId: client.id,
            clientName: client.name
          });
        }
      });
    });

    return matches.slice(0, 10);
  }

  private buildQuoteMatches(
    clients: Client[],
    query: string,
    groups: CollectiveCreditGroup[]
  ): Array<{
    id: string;
    label: string;
    clientId: string;
    clientName: string;
    market?: string;
    amount?: number;
    status?: string;
  }> {
    const lower = query.toLowerCase();
    const matches: Array<{ id: string; label: string; clientId: string; clientName: string; market?: string; amount?: number; status?: string }> = [];

    clients.forEach((client, idx) => {
      const quoteId = `Q-${client.id}-${idx + 1}`;
      const label = `Cotización ${client.name}`;
      if (label.toLowerCase().includes(lower) || quoteId.toLowerCase().includes(lower)) {
        matches.push({
          id: quoteId,
          label,
          clientId: client.id,
          clientName: client.name,
          market: client.market as any,
          amount: (client as any).remainderAmount ?? undefined,
          status: client.status
        });
      }
    });

    groups.forEach(group => {
      if (group.name.toLowerCase().includes(lower)) {
        const syntheticId = `GROUP-${group.id}`;
        matches.push({
          id: syntheticId,
          label: `Cotización colectiva ${group.name}`,
          clientId: group.id,
          clientName: group.name,
          amount: group.savingsGoalPerUnit,
          status: group.status as any
        });
      }
    });

    return matches.slice(0, 10);
  }

  private buildContractMatches(clients: Client[]): Array<{
    id: string;
    label: string;
    contractId: string;
    clientId: string;
    clientName: string;
    market?: string;
    status?: string;
    documentsComplete: boolean;
    protectionRequired: boolean;
    protectionApplied: boolean;
    pendingOfflineRequests: number;
    updatedAt: number;
    businessFlow?: BusinessFlow;
    aviDecision?: string;
    aviStatus?: string;
    requiresVoiceVerification?: boolean;
  }> {
    const now = Date.now();
    return clients
      .filter(client => ['Aprobado', 'Activo', 'En seguimiento'].includes(client.status))
      .map((client, index) => {
        const contractId = `CON-${client.id}-${index + 1}`;
        const label = `Contrato ${client.name}`;
        const protectionRequired = client.flow !== BusinessFlow.VentaDirecta;
        const protectionApplied = !!client.protectionPlan;
        const documentsComplete = Boolean(
          client.documents?.length &&
          client.documents.every(doc => doc.status === 'Aprobado')
        );

        return {
          id: `${client.id}-contract-${index + 1}`,
          label,
          contractId,
          clientId: client.id,
          clientName: client.name,
          market: client.market as any,
          status: client.status,
          documentsComplete,
          protectionRequired,
          protectionApplied,
          pendingOfflineRequests: 0,
          updatedAt: now - index * 45_000,
          businessFlow: client.flow,
          aviDecision: 'go',
          aviStatus: 'completed',
          requiresVoiceVerification: protectionRequired
        };
      })
      .slice(0, 10);
  }

  /**
   * GET /api/dashboard/stats
   */
  getDashboardStats(): Observable<{
    clients: any;
    ecosystems: any;
    groups: any;
    recentActivity: any[];
  }> {
    return of(null).pipe(
      delay(this.NETWORK_SIMULATION.normal),
      map(() => ({
        clients: {
          total: 25,
          active: 18,
          new_this_month: 5
        },
        ecosystems: {
          total: 2,
          active: 1,
          pending: 1
        },
        groups: {
          total: 4,
          active: 3,
          units_delivered: 6
        },
        recentActivity: [
          {
            type: 'client',
            message: 'Nuevo cliente registrado: Juan Pérez',
            timestamp: new Date(Date.now() - 15 * 60 * 1000)
          },
          {
            type: 'group',
            message: 'Unidad entregada en CC-2405 MAYO',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            type: 'ecosystem',
            message: 'Documentos aprobados para Ruta 27',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
          }
        ]
      }))
    );
  }

  // ===========================================
  // ERROR SIMULATION
  // ===========================================

  /**
   * Simulate API errors for testing
   */
  simulateError(errorType: 'network' | 'server' | 'validation' | 'timeout' | any = 'server'): Observable<never> {
    let errorMessage: string;
    let statusCode: number;

    switch (errorType) {
      case 'network':
        errorMessage = 'Network error - no internet connection';
        statusCode = 0;
        break;
      case 'server':
        errorMessage = 'Internal server error';
        statusCode = 500;
        break;
      case 'validation':
        errorMessage = 'Validation error - invalid data provided';
        statusCode = 422;
        break;
      case 'timeout':
        return of(null).pipe(
          delay(this.NETWORK_SIMULATION.timeout),
          map(() => {
            throw new Error('Request timeout');
          })
        );
      case undefined:
      case null:
      default:
        errorMessage = 'Unknown error occurred';
        statusCode = 500;
    }

    return of(null).pipe(
      delay(this.NETWORK_SIMULATION.normal),
      map(() => {
        const error = new Error(errorMessage);
        (error as any).status = statusCode;
        throw error;
      })
    );
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Check API health
   */
  healthCheck(): Observable<{ status: string; timestamp: Date; version: string }> {
    return this.mockApi({
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0'
    }, this.NETWORK_SIMULATION.fast);
  }

  /**
   * Get server time
   */
  getServerTime(): Observable<{ timestamp: Date }> {
    return this.mockApi({
      timestamp: new Date()
    }, this.NETWORK_SIMULATION.fast);
  }

  /**
   * Simulate file upload
   */
  uploadFile(file: File): Observable<{ url: string; size: number; type: string }> {
    const uploadTime = Math.min(file.size / 1000, 5000); // Simulate upload based on file size
    
    return this.mockApi({
      url: `https://storage.conductores.com/uploads/${Date.now()}-${file.name}`,
      size: file.size,
      type: file.type
    }, uploadTime);
  }

  /**
   * Export data
   */
  exportData(dataType: 'clients' | 'ecosystems' | 'groups', format: 'json' | 'csv' = 'json'): Observable<Blob> {
    return of(null).pipe(
      delay(this.NETWORK_SIMULATION.slow),
      map(() => {
        const mockData = { exported: true, type: dataType, format, timestamp: new Date() };
        const content = format === 'json' 
          ? JSON.stringify(mockData, null, 2)
          : 'exported,true\ntype,' + dataType;
        
        return new Blob([content], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        });
      })
    );
  }

  /**
   * Promise-based delay method for SimulationService
   * Port exacto de mockApi desde React simulationService
   */
  delay<T>(data: T, delayMs: number = this.DEFAULT_DELAY): Promise<T> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(data), delayMs);
    });
  }
}
