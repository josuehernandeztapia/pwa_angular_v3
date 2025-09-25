import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import { ClientDataService } from './data/client-data.service';
import { EcosystemDataService } from './data/ecosystem-data.service';
import { CollectiveGroupDataService } from './data/collective-group-data.service';
import {
  Client,
  Ecosystem,
  CompleteBusinessScenario
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
          { label: 'Precio Total', value: '$850,000', emoji: '💰' },
          { label: 'Enganche', value: '$170,000', emoji: '💸' },
          { label: 'Mensualidad', value: '$18,500', emoji: '📅' }
        ],
        timeline: [
          { month: 0, event: 'Firma de Contrato', emoji: '✍️' },
          { month: 1, event: 'Primer Pago', emoji: '💳' }
        ],
        whatsAppMessage: 'Tu cotización está lista 🚐'
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
          { label: 'Meta Ahorro', value: '$200,000', emoji: '🎯' },
          { label: 'Tiempo', value: '18 meses', emoji: '⏰' },
          { label: 'Aportación', value: '$12,000/mes', emoji: '💰' }
        ],
        timeline: [
          { month: 6, event: '30% de Meta', emoji: '📈' },
          { month: 18, event: 'Meta Completa', emoji: '🎉' }
        ],
        whatsAppMessage: 'Tu plan de ahorro está listo 🎯'
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
    ecosystems: Ecosystem[];
    groups: CollectiveCreditGroup[];
    total: number;
  }> {
    return of(null).pipe(
      delay(this.NETWORK_SIMULATION.normal),
      map(() => {
        // This would typically call search methods on each service
        return {
          clients: [], // Would call clientDataService.searchClients(query)
          ecosystems: [], // Would call ecosystemDataService.searchEcosystems(query)  
          groups: [], // Would call collectiveGroupDataService.searchGroups(query)
          total: 0
        };
      })
    );
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
