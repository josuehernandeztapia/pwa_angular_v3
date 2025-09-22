import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { HttpClientService, ApiResponse } from './http-client.service';
import { Client, BusinessFlow, Document, EventLog, DocumentStatus, Actor, EventType, Market } from '../models/types';
import { Quote } from '../models/business';
import { environment } from '../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpClientSpy: jasmine.SpyObj<HttpClientService>;

  const mockClient: Client = {
    id: '1',
    name: 'Ana García López',
    email: 'ana.garcia@email.com',
    phone: '5551234567',
    rfc: 'GALA850315ABC',
    market: 'aguascalientes',
    flow: BusinessFlow.VentaPlazo,
    status: 'Activo',
    avatarUrl: '',
    createdAt: new Date('2024-01-15'),
    lastModified: new Date('2024-01-15'),
    events: [],
    documents: []
  };

  const mockQuote: Quote = {
    totalPrice: 350000,
    downPayment: 210000,
    amountToFinance: 140000,
    term: 24,
    monthlyPayment: 7500,
    market: 'aguascalientes',
    clientType: 'individual',
    flow: BusinessFlow.VentaPlazo
  };

  const mockDocument: Document = {
    id: '1',
    name: 'INE Vigente',
    status: DocumentStatus.EnRevision
  };

  const mockEvent: EventLog = {
    id: '1',
    timestamp: new Date(),
    message: 'Cliente registrado',
    actor: Actor.Sistema,
    type: EventType.System
  };

  beforeEach(() => {
    const httpClientSpyObj = jasmine.createSpyObj('HttpClientService', [
      'get', 'post', 'put', 'delete', 'uploadFile', 'checkApiHealth'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        { provide: HttpClientService, useValue: httpClientSpyObj }
      ]
    });

    service = TestBed.inject(ApiService);
    httpClientSpy = TestBed.inject(HttpClientService) as jasmine.SpyObj<HttpClientService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize clients cache as empty array', (done) => {
      service.clients$.subscribe(clients => {
        expect(clients).toEqual([]);
        done();
      });
    });
  });

  describe('Client Operations - Mock API Mode', () => {
    beforeEach(() => {
      (environment as any).features = { enableMockData: true };
    });

    it('should get clients from mock dataset', (done) => {
      service.getClients().subscribe(clients => {
        expect(clients.length).toBeGreaterThan(0);
        expect(clients[0]).toEqual(jasmine.objectContaining({
          name: jasmine.any(String),
          email: jasmine.any(String),
          market: jasmine.any(String)
        }));
        done();
      });
    });

    it('should filter clients by market', (done) => {
      const filters = { market: 'aguascalientes' };
      
      service.getClients(filters).subscribe(clients => {
        expect(clients.every(c => c.market === 'aguascalientes')).toBe(true);
        done();
      });
    });

    it('should filter clients by search term', (done) => {
      const filters = { search: 'Ana' };
      
      service.getClients(filters).subscribe(clients => {
        expect(clients.some(c => c.name.includes('Ana'))).toBe(true);
        done();
      });
    });

    it('should get client by ID after loading mock dataset', (done) => {
      service.getClients().subscribe(() => {
        service.getClientById('1').subscribe(client => {
          expect(client).toBeTruthy();
          expect(client!.id).toBe('1');
          done();
        });
      });
    });

    it('should return null for non-existent client ID', (done) => {
      service.getClientById('non-existent').subscribe(client => {
        expect(client).toBeNull();
        done();
      });
    });

    it('should create client in mock mode with generated documents', (done) => {
      const newClientData = {
        name: 'Test Client',
        email: 'test@test.com',
        phone: '5551234567',
        market: 'aguascalientes' as Market,
        flow: BusinessFlow.AhorroProgramado
      };

      service.createClient(newClientData).subscribe(client => {
        expect(client.name).toBe(newClientData.name);
        expect(client.email).toBe(newClientData.email);
        expect(client.id).toBeTruthy();
        expect(client.documents.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should update client data in mock mode', (done) => {
      const updateData = { name: 'Updated Name' };

      service.createClient(mockClient).subscribe(createdClient => {
        service.updateClient(createdClient.id, updateData).subscribe(updatedClient => {
          expect(updatedClient.name).toBe(updateData.name);
          expect(updatedClient.id).toBe(createdClient.id);
          done();
        });
      });
    });

    it('should delete client in mock mode', (done) => {
      service.createClient(mockClient).subscribe(createdClient => {
        service.deleteClient(createdClient.id).subscribe(success => {
          expect(success).toBe(true);
          done();
        });
      });
    });
  });

  describe('Client Operations - Real API Mode', () => {
    beforeEach(() => {
      (environment as any).features = { enableMockData: false };
    });

    it('should get clients from real API', (done) => {
      const mockResponse: ApiResponse<Client[]> = {
        success: true,
        data: [mockClient]
      };
      httpClientSpy.get.and.returnValue(of(mockResponse));

      service.getClients().subscribe(clients => {
        expect(httpClientSpy.get).toHaveBeenCalledWith('clients', {
          params: undefined,
          showLoading: true
        });
        expect(clients).toEqual([mockClient]);
        done();
      });
    });

    it('should get client by ID from real API', (done) => {
      const mockResponse: ApiResponse<Client> = {
        success: true,
        data: mockClient
      };
      httpClientSpy.get.and.returnValue(of(mockResponse));

      service.getClientById('1').subscribe(client => {
        expect(httpClientSpy.get).toHaveBeenCalledWith('clients/1');
        expect(client).toEqual(mockClient);
        done();
      });
    });

    it('should create client via real API', (done) => {
      const mockResponse: ApiResponse<Client> = {
        success: true,
        data: mockClient
      };
      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.createClient(mockClient).subscribe(client => {
        expect(httpClientSpy.post).toHaveBeenCalledWith(
          'clients',
          mockClient,
          { successMessage: 'Cliente creado exitosamente' }
        );
        expect(client).toEqual(mockClient);
        done();
      });
    });

    it('should update client via real API', (done) => {
      const updateData = { name: 'Updated Name' };
      const updatedClient = { ...mockClient, ...updateData };
      const mockResponse: ApiResponse<Client> = {
        success: true,
        data: updatedClient
      };
      httpClientSpy.put.and.returnValue(of(mockResponse));

      service.updateClient('1', updateData).subscribe(client => {
        expect(httpClientSpy.put).toHaveBeenCalledWith(
          'clients/1',
          updateData,
          { successMessage: 'Cliente actualizado exitosamente' }
        );
        expect(client).toEqual(updatedClient);
        done();
      });
    });

    it('should delete client via real API', (done) => {
      const mockResponse: ApiResponse<any> = {
        success: true,
        data: null
      };
      httpClientSpy.delete.and.returnValue(of(mockResponse));

      service.deleteClient('1').subscribe(success => {
        expect(httpClientSpy.delete).toHaveBeenCalledWith(
          'clients/1',
          { successMessage: 'Cliente eliminado exitosamente' }
        );
        expect(success).toBe(true);
        done();
      });
    });
  });

  describe('Quote Operations', () => {
    beforeEach(() => {
      (environment as any).features = { enableMockData: true };
    });

    it('should create quote using mock data', (done) => {
      const quoteData = mockQuote;

      service.createQuote(quoteData).subscribe(quote => {
        expect(quote.totalPrice).toBe(quoteData.totalPrice);
        expect(quote.downPayment).toBe(quoteData.downPayment);
        expect(quote.flow).toBe(quoteData.flow);
        done();
      });
    });

    it('should create quote via real API', (done) => {
      (environment as any).features = { enableMockData: false };
      const mockResponse: ApiResponse<Quote> = {
        success: true,
        data: mockQuote
      };
      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.createQuote(mockQuote).subscribe(quote => {
        expect(httpClientSpy.post).toHaveBeenCalledWith(
          'quotes',
          mockQuote,
          { successMessage: 'Cotización creada exitosamente' }
        );
        expect(quote).toEqual(mockQuote);
        done();
      });
    });

    it('should get client quotes from mock data', (done) => {
      (environment as any).features = { enableMockData: true };

      service.getClientQuotes('1').subscribe(quotes => {
        expect(quotes).toEqual([]);
        done();
      });
    });

    it('should get client quotes from real API', (done) => {
      (environment as any).features = { enableMockData: false };
      const mockResponse: ApiResponse<Quote[]> = {
        success: true,
        data: [mockQuote]
      };
      httpClientSpy.get.and.returnValue(of(mockResponse));

      service.getClientQuotes('1').subscribe(quotes => {
        expect(httpClientSpy.get).toHaveBeenCalledWith('clients/1/quotes');
        expect(quotes).toEqual([mockQuote]);
        done();
      });
    });
  });

  describe('Document Operations', () => {
    beforeEach(() => {
      (environment as any).features = { enableMockData: true };
    });

    it('should upload document using mock flow', (done) => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      service.uploadDocument('1', 'doc1', file).subscribe(document => {
        expect(document.id).toBe('doc1');
        expect(document.name).toBe('INE Vigente');
        expect(document.status).toBe(DocumentStatus.EnRevision);
        done();
      });
    });

    it('should upload document via real API', (done) => {
      (environment as any).features = { enableMockData: false };
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse: ApiResponse<Document> = {
        success: true,
        data: mockDocument
      };
      httpClientSpy.uploadFile.and.returnValue(of(mockResponse));

      service.uploadDocument('1', 'doc1', file).subscribe(document => {
        expect(httpClientSpy.uploadFile).toHaveBeenCalledWith(
          'clients/1/documents/doc1',
          file,
          { clientId: '1', documentId: 'doc1' }
        );
        expect(document).toEqual(mockDocument);
        done();
      });
    });

    it('should get client documents using mock flow', (done) => {
      service.getClientDocuments('1').subscribe(documents => {
        expect(documents).toEqual(jasmine.any(Array));
        done();
      });
    });

    it('should get client documents from real API', (done) => {
      (environment as any).features = { enableMockData: false };
      const mockResponse: ApiResponse<Document[]> = {
        success: true,
        data: [mockDocument]
      };
      httpClientSpy.get.and.returnValue(of(mockResponse));

      service.getClientDocuments('1').subscribe(documents => {
        expect(httpClientSpy.get).toHaveBeenCalledWith('clients/1/documents');
        expect(documents).toEqual([mockDocument]);
        done();
      });
    });
  });

  describe('Event Operations', () => {
    beforeEach(() => {
      (environment as any).features = { enableMockData: true };
    });

    it('should add client event using mock flow', (done) => {
      const eventData = {
        message: 'Test event',
        actor: Actor.Asesor,
        type: EventType.AdvisorAction
      };

      service.addClientEvent('1', eventData).subscribe(event => {
        expect(event.message).toBe(eventData.message);
        expect(event.actor).toBe(eventData.actor);
        expect(event.type).toBe(eventData.type);
        expect(event.id).toBeTruthy();
        done();
      });
    });

    it('should add client event via real API', (done) => {
      (environment as any).features = { enableMockData: false };
      const eventData = {
        message: 'Test event',
        actor: Actor.Asesor,
        type: EventType.AdvisorAction
      };
      const mockResponse: ApiResponse<EventLog> = {
        success: true,
        data: mockEvent
      };
      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.addClientEvent('1', eventData).subscribe(event => {
        expect(httpClientSpy.post).toHaveBeenCalledWith(
          'clients/1/events',
          jasmine.objectContaining(eventData)
        );
        expect(event).toEqual(mockEvent);
        done();
      });
    });
  });

  describe('Utility Methods', () => {
    it('should check API health', (done) => {
      httpClientSpy.checkApiHealth.and.returnValue(of(true));

      service.checkHealth().subscribe(health => {
        expect(httpClientSpy.checkApiHealth).toHaveBeenCalled();
        expect(health).toBe(true);
        done();
      });
    });

    it('should clear cache', (done) => {
      // First add some data to cache
      service.getClients().subscribe(() => {
        service.clearCache();
        
        service.clients$.subscribe(clients => {
          expect(clients).toEqual([]);
          done();
        });
      });
    });

    it('should generate default documents for VentaPlazo flow', () => {
      (environment as any).features = { enableMockData: true };
      const clientData = {
        name: 'Test',
        email: 'test@test.com',
        flow: BusinessFlow.VentaPlazo
      };

      service.createClient(clientData).subscribe(client => {
        expect(client.documents.length).toBe(5);
        expect(client.documents.some(d => d.name === 'Carta Aval de Ruta')).toBe(true);
        expect(client.documents.some(d => d.name === 'Convenio de Dación en Pago')).toBe(true);
      });
    });

    it('should generate default documents for CreditoColectivo flow', () => {
      (environment as any).features = { enableMockData: true };
      const clientData = {
        name: 'Test',
        email: 'test@test.com',
        flow: BusinessFlow.CreditoColectivo
      };

      service.createClient(clientData).subscribe(client => {
        expect(client.documents.length).toBe(4);
        expect(client.documents.some(d => d.name === 'Acta Constitutiva de la Ruta')).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (environment as any).features = { enableMockData: false };
    });

    it('should handle API errors when getting clients', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('API Error')));

      service.getClients().subscribe({
        error: (error) => {
          expect(error.message).toBe('API Error');
          done();
        }
      });
    });

    it('should handle API errors when creating client', (done) => {
      httpClientSpy.post.and.returnValue(throwError(() => new Error('Create Error')));

      service.createClient(mockClient).subscribe({
        error: (error) => {
          expect(error.message).toBe('Create Error');
          done();
        }
      });
    });

    it('should return null for missing client data', (done) => {
      const mockResponse: ApiResponse<Client> = {
        success: true,
        data: undefined
      };
      httpClientSpy.get.and.returnValue(of(mockResponse));

      service.getClientById('1').subscribe(client => {
        expect(client).toBeNull();
        done();
      });
    });

    it('should return empty array for missing clients data', (done) => {
      const mockResponse: ApiResponse<Client[]> = {
        success: true,
        data: undefined
      };
      httpClientSpy.get.and.returnValue(of(mockResponse));

      service.getClients().subscribe(clients => {
        expect(clients).toEqual([]);
        done();
      });
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      (environment as any).features = { enableMockData: false };
    });

    it('should update cache when getting clients', (done) => {
      const mockResponse: ApiResponse<Client[]> = {
        success: true,
        data: [mockClient]
      };
      httpClientSpy.get.and.returnValue(of(mockResponse));

      service.getClients().subscribe(() => {
        service.clients$.subscribe(cachedClients => {
          expect(cachedClients).toEqual([mockClient]);
          done();
        });
      });
    });

    it('should update cache when creating client', (done) => {
      const mockResponse: ApiResponse<Client> = {
        success: true,
        data: mockClient
      };
      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.createClient(mockClient).subscribe(() => {
        service.clients$.subscribe(cachedClients => {
          expect(cachedClients).toContain(mockClient);
          done();
        });
      });
    });

    it('should update cache when updating client', (done) => {
      // First add client to cache
      const mockGetResponse: ApiResponse<Client[]> = {
        success: true,
        data: [mockClient]
      };
      httpClientSpy.get.and.returnValue(of(mockGetResponse));

      service.getClients().subscribe(() => {
        const updateData = { name: 'Updated Name' };
        const updatedClient = { ...mockClient, ...updateData };
        const mockUpdateResponse: ApiResponse<Client> = {
          success: true,
          data: updatedClient
        };
        httpClientSpy.put.and.returnValue(of(mockUpdateResponse));

        service.updateClient('1', updateData).subscribe(() => {
          service.clients$.subscribe(cachedClients => {
            expect(cachedClients.find(c => c.id === '1')?.name).toBe('Updated Name');
            done();
          });
        });
      });
    });

    it('should update cache when deleting client', (done) => {
      // First add client to cache
      const mockGetResponse: ApiResponse<Client[]> = {
        success: true,
        data: [mockClient]
      };
      httpClientSpy.get.and.returnValue(of(mockGetResponse));

      service.getClients().subscribe(() => {
        const mockDeleteResponse: ApiResponse<any> = {
          success: true,
          data: null
        };
        httpClientSpy.delete.and.returnValue(of(mockDeleteResponse));

        service.deleteClient('1').subscribe(() => {
          service.clients$.subscribe(cachedClients => {
            expect(cachedClients.find(c => c.id === '1')).toBeUndefined();
            done();
          });
        });
      });
    });
  });
});
