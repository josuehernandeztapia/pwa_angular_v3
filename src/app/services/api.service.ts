import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { HttpClientService, ApiResponse } from './http-client.service';
import { Client, BusinessFlow, Document, EventLog, DocumentStatus } from '../models/types';
import { Quote } from '../models/business';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private clientsCache = new BehaviorSubject<Client[]>([]);
  public clients$ = this.clientsCache.asObservable();

  constructor(private httpClient: HttpClientService) {}

  // ===== CLIENT OPERATIONS =====

  /**
   * Get all clients with optional filtering
   */
  getClients(filters?: {
    market?: string;
    flow?: string;
    status?: string;
    search?: string;
  }): Observable<Client[]> {
// removed by clean-audit
    if (environment.features.enableMockData) {
      return of(this.getMockClients()).pipe(
        map(clients => this.applyFilters(clients, filters)),
        tap(clients => this.clientsCache.next(clients))
      );
    }

    // Real API call
    return this.httpClient.get<Client[]>('clients', { 
      params: filters as any,
      showLoading: true 
    }).pipe(
      map(response => response.data || []),
      tap(clients => this.clientsCache.next(clients))
    );
  }

  /**
   * Search clients by free-text query (name, email, phone)
   */
  searchClients(query: string): Observable<Client[]> {
    // Reuse filtering capabilities of getClients
    return this.getClients({ search: query });
  }

  /**
   * Get client by ID
   */
  getClientById(id: string): Observable<Client | null> {
    if (environment.features.enableMockData) {
      const clients = this.getMockClients();
      const client = clients.find(c => c.id === id) || null;
      return of(client);
    }

    return this.httpClient.get<Client>(`clients/${id}`).pipe(
      map(response => response.data || null)
    );
  }

  /**
   * Create new client
   */
  createClient(clientData: Partial<Client>): Observable<Client> {
    if (environment.features.enableMockData) {
      const newClient: Client = {
        id: Date.now().toString(),
        name: clientData.name || '',
        avatarUrl: '', // Add required avatarUrl
        email: clientData.email || '',
        phone: clientData.phone || '',
        rfc: clientData.rfc,
        market: clientData.market || 'aguascalientes',
        flow: clientData.flow || BusinessFlow.VentaPlazo,
        status: 'Activo',
        createdAt: new Date(),
        lastModified: new Date(),
        events: [],
        documents: this.generateDefaultDocuments(clientData.flow || BusinessFlow.VentaPlazo)
      };

      // Update cache
      const currentClients = this.clientsCache.value;
      this.clientsCache.next([...currentClients, newClient]);

      return of(newClient);
    }

    return this.httpClient.post<Client>('clients', clientData, {
      successMessage: 'Cliente creado exitosamente'
    }).pipe(
      map(response => response.data!),
      tap(client => {
        const currentClients = this.clientsCache.value;
        this.clientsCache.next([...currentClients, client]);
      })
    );
  }

  /**
   * Update existing client
   */
  updateClient(id: string, clientData: Partial<Client>): Observable<Client> {
    if (environment.features.enableMockData) {
      const currentClients = this.clientsCache.value;
      const updatedClients = currentClients.map(client => 
        client.id === id 
          ? { ...client, ...clientData, lastModified: new Date() }
          : client
      );
      this.clientsCache.next(updatedClients);
      
      const updatedClient = updatedClients.find(c => c.id === id)!;
      return of(updatedClient);
    }

    return this.httpClient.put<Client>(`clients/${id}`, clientData, {
      successMessage: 'Cliente actualizado exitosamente'
    }).pipe(
      map(response => response.data!),
      tap(updatedClient => {
        const currentClients = this.clientsCache.value;
        const updatedClients = currentClients.map(client => 
          client.id === id ? updatedClient : client
        );
        this.clientsCache.next(updatedClients);
      })
    );
  }

  /**
   * Delete client
   */
  deleteClient(id: string): Observable<boolean> {
    if (environment.features.enableMockData) {
      const currentClients = this.clientsCache.value;
      const filteredClients = currentClients.filter(client => client.id !== id);
      this.clientsCache.next(filteredClients);
      return of(true);
    }

    return this.httpClient.delete<any>(`clients/${id}`, {
      successMessage: 'Cliente eliminado exitosamente'
    }).pipe(
      map(response => response.success),
      tap(() => {
        const currentClients = this.clientsCache.value;
        const filteredClients = currentClients.filter(client => client.id !== id);
        this.clientsCache.next(filteredClients);
      })
    );
  }

  // ===== QUOTE OPERATIONS =====

  /**
   * Create quote for client
   */
  createQuote(quoteData: Partial<Quote>): Observable<Quote> {
    if (environment.features.enableMockData) {
      const newQuote: Quote = {
        totalPrice: quoteData.totalPrice || 0,
        downPayment: quoteData.downPayment || 0,
        amountToFinance: quoteData.amountToFinance || 0,
        term: quoteData.term || 24,
        monthlyPayment: quoteData.monthlyPayment || 0,
        market: quoteData.market || 'aguascalientes',
        clientType: quoteData.clientType || 'individual',
        flow: quoteData.flow || BusinessFlow.VentaPlazo,
        id: Date.now().toString(),
        clientId: quoteData.clientId || '',
        product: quoteData.product!,
        financialSummary: quoteData.financialSummary!,
        timeline: quoteData.timeline || [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'active'
      };
      return of(newQuote);
    }

    return this.httpClient.post<Quote>('quotes', quoteData, {
      successMessage: 'Cotización creada exitosamente'
    }).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Get quotes for client
   */
  getClientQuotes(clientId: string): Observable<Quote[]> {
    if (environment.features.enableMockData) {
// removed by clean-audit
    }

    return this.httpClient.get<Quote[]>(`clients/${clientId}/quotes`).pipe(
      map(response => response.data || [])
    );
  }

  // ===== DOCUMENT OPERATIONS =====

  /**
   * Upload document for client
   */
  uploadDocument(clientId: string, documentId: string, file: File): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', clientId);
    formData.append('documentId', documentId);

    if (environment.features.enableMockData) {
      // Simulate upload delay
      return new Observable(observer => {
        setTimeout(() => {
          const mockDocument: Document = {
            id: documentId,
            name: 'INE Vigente' as any,
            status: DocumentStatus.EnRevision,
            uploadedAt: new Date(),
            fileUrl: URL.createObjectURL(file),
            fileName: file.name,
            fileSize: file.size
          };
          observer.next(mockDocument);
          observer.complete();
        }, 2000);
      });
    }

    return this.httpClient.uploadFile(`clients/${clientId}/documents/${documentId}`, file, {
      clientId,
      documentId
    }).pipe(
      map(response => response.data!)
    );
  }

  /**
   * Get client documents
   */
  getClientDocuments(clientId: string): Observable<Document[]> {
    if (environment.features.enableMockData) {
      const client = this.getMockClients().find(c => c.id === clientId);
      return of(client?.documents || []);
    }

    return this.httpClient.get<Document[]>(`clients/${clientId}/documents`).pipe(
      map(response => response.data || [])
    );
  }

  // ===== EVENT OPERATIONS =====

  /**
   * Add event to client timeline
   */
  addClientEvent(clientId: string, event: Partial<EventLog>): Observable<EventLog> {
    const newEvent: EventLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      message: event.message || '',
      actor: event.actor!,
      type: event.type!,
      details: event.details
    };

    if (environment.features.enableMockData) {
      // Update client in cache
      const currentClients = this.clientsCache.value;
      const updatedClients = currentClients.map(client => 
        client.id === clientId 
          ? { ...client, events: [newEvent, ...client.events] }
          : client
      );
      this.clientsCache.next(updatedClients);
      return of(newEvent);
    }

    return this.httpClient.post<EventLog>(`clients/${clientId}/events`, newEvent).pipe(
      map(response => response.data!)
    );
  }

  // ===== HELPER METHODS =====

  private applyFilters(clients: Client[], filters?: any): Client[] {
    if (!filters) return clients;

    return clients.filter(client => {
      if (filters.market && client.market !== filters.market) return false;
      if (filters.flow && client.flow !== filters.flow) return false;
      if (filters.status && client.status !== filters.status) return false;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return (
          client.name.toLowerCase().includes(searchTerm) ||
          (client.email?.toLowerCase().includes(searchTerm)) ||
          (client.phone?.includes(searchTerm))
        );
      }
      return true;
    });
  }

  private generateDefaultDocuments(flow: BusinessFlow): Document[] {
    const baseDocuments: Document[] = [
      { id: '1', name: 'INE Vigente', status: 'Pendiente' as any },
      { id: '2', name: 'Comprobante de domicilio', status: 'Pendiente' as any },
      { id: '3', name: 'Constancia de situación fiscal', status: 'Pendiente' as any },
    ];

    // Add flow-specific documents
    switch (flow) {
      case BusinessFlow.VentaPlazo:
        baseDocuments.push(
          { id: '4', name: 'Carta Aval de Ruta', status: 'Pendiente' as any },
          { id: '5', name: 'Convenio de Dación en Pago', status: 'Pendiente' as any }
        );
        break;
      case BusinessFlow.CreditoColectivo:
        baseDocuments.push(
          { id: '6', name: 'Acta Constitutiva de la Ruta', status: 'Pendiente' as any }
        );
        break;
    }

    return baseDocuments;
  }

  private getMockClients(): Client[] {
    return [
      {
        id: '1',
        name: 'Ana García López',
        avatarUrl: '',
        email: 'ana.garcia@email.com',
        phone: '5551234567',
        rfc: 'GALA850315ABC',
        market: 'aguascalientes',
        flow: BusinessFlow.VentaPlazo,
        status: 'Activo',
        createdAt: new Date('2024-01-15'),
        lastModified: new Date(),
        events: [
          {
            id: '1',
            timestamp: new Date('2024-01-15'),
            message: 'Cliente registrado en el sistema',
            actor: 'Sistema' as any,
            type: 'System' as any
          }
        ],
        documents: this.generateDefaultDocuments(BusinessFlow.VentaPlazo)
      },
      {
        id: '2',
        name: 'Carlos Rodríguez Martín',
        avatarUrl: '',
        email: 'carlos.rodriguez@email.com',
        phone: '5552345678',
        rfc: 'ROMC780922DEF',
        market: 'edomex',
        flow: BusinessFlow.AhorroProgramado,
        status: 'Pendiente',
        createdAt: new Date('2024-02-10'),
        lastModified: new Date(),
        events: [
          {
            id: '2',
            timestamp: new Date('2024-02-10'),
            message: 'Cotización generada para Plan de Ahorro',
            actor: 'Asesor' as any,
            type: 'AdvisorAction' as any
          }
        ],
        documents: this.generateDefaultDocuments(BusinessFlow.AhorroProgramado)
      },
      {
        id: '3',
        name: 'María Elena Sánchez',
        avatarUrl: '',
        email: 'maria.sanchez@email.com',
        phone: '5553456789',
        rfc: 'SAME901205GHI',
        market: 'aguascalientes',
        flow: BusinessFlow.CreditoColectivo,
        status: 'Activo',
        createdAt: new Date('2024-01-28'),
        lastModified: new Date(),
        events: [
          {
            id: '3',
            timestamp: new Date('2024-01-28'),
            message: 'Agregada a grupo de crédito colectivo',
            actor: 'Asesor' as any,
            type: 'AdvisorAction' as any
          }
        ],
        documents: this.generateDefaultDocuments(BusinessFlow.CreditoColectivo)
      }
    ];
  }

  /**
   * Check API health
   */
  checkHealth(): Observable<boolean> {
    return this.httpClient.checkApiHealth();
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.clientsCache.next([]);
  }
}
// removed by clean-audit