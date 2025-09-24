import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ClientDataService } from './data/client-data.service';
import { EcosystemDataService } from './data/ecosystem-data.service';
import { CollectiveGroupDataService } from './data/collective-group-data.service';
import { 
  Client, 
  Ecosystem, 
  CollectiveCreditGroup,
  CompleteBusinessScenario,
  BusinessFlow 
} from '../models/types';

describe('MockApiService', () => {
  let service: MockApiService;
  let clientDataSpy: jasmine.SpyObj<ClientDataService>;
  let ecosystemDataSpy: jasmine.SpyObj<EcosystemDataService>;
  let collectiveGroupDataSpy: jasmine.SpyObj<CollectiveGroupDataService>;

  const mockClient: Client = {
    id: '1',
    name: 'Ana García López',
    email: 'ana.garcia@email.com',
    phone: '5551234567',
    rfc: 'GALA850315ABC',
    market: 'aguascalientes',
    flow: BusinessFlow.VentaPlazo,
    status: 'Activo',
    createdAt: new Date('2024-01-15'),
    lastModified: new Date('2024-01-15'),
    events: [],
    documents: []
  };

  const mockEcosystem: Ecosystem = {
    id: 'eco1',
    name: 'Ruta Centro AGS',
    market: 'aguascalientes',
    vehicleType: 'Microbus',
    capacity: 50,
    status: 'Activo',
    requirements: [],
    weeklyEarnings: 3500,
    monthlyEarnings: 14000,
    createdAt: new Date(),
    lastModified: new Date()
  };

  const mockCollectiveGroup: CollectiveCreditGroup = {
    id: 'cc1',
    name: 'CC-2405 MAYO',
    capacity: 10,
    members: [],
    totalUnits: 5,
    unitsDelivered: 2,
    savingsGoalPerUnit: 153075,
    currentSavingsProgress: 0,
    monthlyPaymentPerUnit: 25720.52,
    currentMonthPaymentProgress: 0,
    ecosystemId: 'eco1',
    status: 'active',
    createdAt: new Date(),
    totalMembers: 10
  };

  beforeEach(() => {
    const clientDataSpyObj = jasmine.createSpyObj('ClientDataService', [
      'getClients', 'getClientById', 'createClient', 'updateClient', 
      'addClientEvent', 'updateDocumentStatus'
    ]);
    const ecosystemDataSpyObj = jasmine.createSpyObj('EcosystemDataService', [
      'getEcosystems', 'getEcosystemById', 'createEcosystem', 'updateEcosystemDocumentStatus'
    ]);
    const collectiveGroupDataSpyObj = jasmine.createSpyObj('CollectiveGroupDataService', [
      'getCollectiveGroups', 'getCollectiveGroupById', 'addMemberToGroup',
      'deliverUnitToGroup', 'initializeCollectiveGroups'
    ]);

    // Configure spy return values
    clientDataSpyObj.getClients.and.returnValue(of([mockClient]));
    clientDataSpyObj.getClientById.and.returnValue(of(mockClient));
    clientDataSpyObj.createClient.and.returnValue(of(mockClient));
    clientDataSpyObj.updateClient.and.returnValue(of(mockClient));
    clientDataSpyObj.addClientEvent.and.returnValue(of(mockClient));
    clientDataSpyObj.updateDocumentStatus.and.returnValue(of(mockClient));

    ecosystemDataSpyObj.getEcosystems.and.returnValue(of([mockEcosystem]));
    ecosystemDataSpyObj.getEcosystemById.and.returnValue(of(mockEcosystem));
    ecosystemDataSpyObj.createEcosystem.and.returnValue(of(mockEcosystem));
    ecosystemDataSpyObj.updateEcosystemDocumentStatus.and.returnValue(of(mockEcosystem));

    collectiveGroupDataSpyObj.getCollectiveGroups.and.returnValue(of([mockCollectiveGroup]));
    collectiveGroupDataSpyObj.getCollectiveGroupById.and.returnValue(of(mockCollectiveGroup));
    collectiveGroupDataSpyObj.addMemberToGroup.and.returnValue(of(mockCollectiveGroup));
    collectiveGroupDataSpyObj.deliverUnitToGroup.and.returnValue(of(mockCollectiveGroup));
    collectiveGroupDataSpyObj.initializeCollectiveGroups.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        MockApiService,
        { provide: ClientDataService, useValue: clientDataSpyObj },
        { provide: EcosystemDataService, useValue: ecosystemDataSpyObj },
        { provide: CollectiveGroupDataService, useValue: collectiveGroupDataSpyObj }
      ]
    });

    service = TestBed.inject(MockApiService);
    clientDataSpy = TestBed.inject(ClientDataService) as jasmine.SpyObj<ClientDataService>;
    ecosystemDataSpy = TestBed.inject(EcosystemDataService) as jasmine.SpyObj<EcosystemDataService>;
    collectiveGroupDataSpy = TestBed.inject(CollectiveGroupDataService) as jasmine.SpyObj<CollectiveGroupDataService>;
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      (expect(service) as any).toBeTruthy();
    });

    it('should initialize data on construction', () => {
      clientDataSpy.getClients.and.returnValue(of([mockClient]));
      collectiveGroupDataSpy.initializeCollectiveGroups.and.returnValue();

      // Recreate service to trigger initialization
      service = new MockApiService(clientDataSpy, ecosystemDataSpy, collectiveGroupDataSpy);

      (expect(clientDataSpy.getClients) as any).toHaveBeenCalled();
      (expect(collectiveGroupDataSpy.initializeCollectiveGroups) as any).toHaveBeenCalledWith([mockClient]);
    });

    it('should have correct network simulation configuration', () => {
      (expect(service['NETWORK_SIMULATION']) as any).toEqual({
        fast: 200,
        normal: 500,
        slow: 1200,
        timeout: 8000
      });
    });

    it('should have correct default delay', () => {
      (expect(service['DEFAULT_DELAY']) as any).toBe(500);
    });
  });

  describe('Client API Endpoints', () => {
    it('should get clients with network delay', (done) => {
      clientDataSpy.getClients.and.returnValue(of([mockClient]));

      const startTime = Date.now();
      service.getClients().subscribe((clients: any) => {
        const endTime = Date.now();
        (expect(clients) as any).toEqual([mockClient]);
        (expect(endTime - startTime) as any).toBeGreaterThan(100); // Should have some delay
        (expect(clientDataSpy.getClients) as any).toHaveBeenCalled();
        done();
      });
    });

    it('should get client by ID with network delay', (done) => {
      clientDataSpy.getClientById.and.returnValue(of(mockClient));

      service.getClientById('1').subscribe((client: any) => {
        (expect(client) as any).toEqual(mockClient);
        (expect(clientDataSpy.getClientById) as any).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('should return null for non-existent client', (done) => {
      clientDataSpy.getClientById.and.returnValue(of(null));

      service.getClientById('non-existent').subscribe((client: any) => {
        (expect(client) as any).toBeNull();
        done();
      });
    });

    it('should create client with slow network delay', (done) => {
      const newClient: Partial<Client> = { ...mockClient };
      delete (newClient as any).id;
      clientDataSpy.createClient.and.returnValue(of(mockClient));

      const startTime = Date.now();
      service.createClient(newClient).subscribe((client: any) => {
        const endTime = Date.now();
        (expect(client) as any).toEqual(mockClient);
        (expect(endTime - startTime) as any).toBeGreaterThan(1000); // Should use slow delay
        (expect(clientDataSpy.createClient) as any).toHaveBeenCalledWith(newClient);
        done();
      });
    });

    it('should update client with normal network delay', (done) => {
      const updates = { name: 'Updated Name' };
      const updatedClient = { ...mockClient, ...updates };
      clientDataSpy.updateClient.and.returnValue(of(updatedClient));

      service.updateClient('1', updates).subscribe(client => {
        (expect(client) as any).toEqual(updatedClient);
        (expect(clientDataSpy.updateClient) as any).toHaveBeenCalledWith('1', updates);
        done();
      });
    });

    it('should add client event with fast network delay', (done) => {
      const eventData = { message: 'Test event', type: 'System' as any, actor: 'Sistema' as any };
      const updatedClient = { ...mockClient };
      clientDataSpy.addClientEvent.and.returnValue(of(updatedClient));

      service.addClientEvent('1', eventData).subscribe(client => {
        (expect(client) as any).toEqual(updatedClient);
        (expect(clientDataSpy.addClientEvent) as any).toHaveBeenCalledWith('1', eventData);
        done();
      });
    });

    it('should update document status with normal network delay', (done) => {
      const updatedClient = { ...mockClient };
      clientDataSpy.updateDocumentStatus.and.returnValue(of(updatedClient));

      service.updateDocumentStatus('1', 'doc1', 'Aprobado' as any).subscribe(client => {
        (expect(client) as any).toEqual(updatedClient);
        (expect(clientDataSpy.updateDocumentStatus) as any).toHaveBeenCalledWith('1', 'doc1', 'Aprobado' as any);
        done();
      });
    });
  });

  describe('Ecosystem API Endpoints', () => {
    it('should get ecosystems with network delay', (done) => {
      ecosystemDataSpy.getEcosystems.and.returnValue(of([mockEcosystem]));

      service.getEcosystems().subscribe(ecosystems => {
        (expect(ecosystems) as any).toEqual([mockEcosystem]);
        (expect(ecosystemDataSpy.getEcosystems) as any).toHaveBeenCalled();
        done();
      });
    });

    it('should get ecosystem by ID with network delay', (done) => {
      ecosystemDataSpy.getEcosystemById.and.returnValue(of(mockEcosystem));

      service.getEcosystemById('eco1').subscribe(ecosystem => {
        (expect(ecosystem) as any).toEqual(mockEcosystem);
        (expect(ecosystemDataSpy.getEcosystemById) as any).toHaveBeenCalledWith('eco1');
        done();
      });
    });

    it('should return null for non-existent ecosystem', (done) => {
      ecosystemDataSpy.getEcosystemById.and.returnValue(of(null));

      service.getEcosystemById('non-existent').subscribe(ecosystem => {
        (expect(ecosystem) as any).toBeNull();
        done();
      });
    });

    it('should create ecosystem with slow network delay', (done) => {
      const newEcosystem: Partial<Ecosystem> = { ...mockEcosystem };
      delete (newEcosystem as any).id;
      ecosystemDataSpy.createEcosystem.and.returnValue(of(mockEcosystem));

      const startTime = Date.now();
      service.createEcosystem(newEcosystem).subscribe(ecosystem => {
        const endTime = Date.now();
        (expect(ecosystem) as any).toEqual(mockEcosystem);
        (expect(endTime - startTime) as any).toBeGreaterThan(1000); // Should use slow delay
        (expect(ecosystemDataSpy.createEcosystem) as any).toHaveBeenCalledWith(newEcosystem);
        done();
      });
    });

    it('should update ecosystem document with normal network delay', (done) => {
      const updatedEcosystem = { ...mockEcosystem };
      ecosystemDataSpy.updateEcosystemDocumentStatus.and.returnValue(of(updatedEcosystem));

      service.updateEcosystemDocument('eco1', 'doc1', 'Aprobado' as any).subscribe(ecosystem => {
        (expect(ecosystem) as any).toEqual(updatedEcosystem);
        (expect(ecosystemDataSpy.updateEcosystemDocumentStatus) as any).toHaveBeenCalledWith('eco1', 'doc1', 'Aprobado' as any);
        done();
      });
    });
  });

  describe('Collective Groups API Endpoints', () => {
    it('should get collective groups with network delay', (done) => {
      collectiveGroupDataSpy.getCollectiveGroups.and.returnValue(of([mockCollectiveGroup]));

      service.getCollectiveGroups().subscribe(groups => {
        (expect(groups) as any).toEqual([mockCollectiveGroup]);
        (expect(collectiveGroupDataSpy.getCollectiveGroups) as any).toHaveBeenCalled();
        done();
      });
    });

    it('should get collective group by ID with network delay', (done) => {
      collectiveGroupDataSpy.getCollectiveGroupById.and.returnValue(of(mockCollectiveGroup));

      service.getCollectiveGroupById('cc1').subscribe(group => {
        (expect(group) as any).toEqual(mockCollectiveGroup);
        (expect(collectiveGroupDataSpy.getCollectiveGroupById) as any).toHaveBeenCalledWith('cc1');
        done();
      });
    });

    it('should add member to group with normal network delay', (done) => {
      const member = {
        id: 'member-1',
        clientId: '1',
        name: 'Test Member',
        avatarUrl: '',
        status: 'active' as const,
        individualContribution: 0,
        monthlyContribution: 1500
      };
      const updatedGroup = { ...mockCollectiveGroup };
      collectiveGroupDataSpy.addMemberToGroup.and.returnValue(of(updatedGroup));

      service.addMemberToGroup('cc1', member).subscribe(group => {
        (expect(group) as any).toEqual(updatedGroup);
        (expect(collectiveGroupDataSpy.addMemberToGroup) as any).toHaveBeenCalledWith('cc1', member);
        done();
      });
    });

    it('should deliver unit to group with slow network delay', (done) => {
      const updatedGroup = { ...mockCollectiveGroup, unitsDelivered: 3 };
      collectiveGroupDataSpy.deliverUnitToGroup.and.returnValue(of(updatedGroup));

      const startTime = Date.now();
      service.deliverUnitToGroup('cc1').subscribe(group => {
        const endTime = Date.now();
        (expect(group) as any).toEqual(updatedGroup);
        (expect(endTime - startTime) as any).toBeGreaterThan(1000); // Should use slow delay
        (expect(collectiveGroupDataSpy.deliverUnitToGroup) as any).toHaveBeenCalledWith('cc1');
        done();
      });
    });
  });

  describe('Business Scenarios API Endpoints', () => {
    it('should create cotizacion scenario with complete data', (done) => {
      const scenarioData = {
        clientName: 'Juan Pérez',
        flow: BusinessFlow.VentaPlazo,
        market: 'aguascalientes'
      };

      const startTime = Date.now();
      service.createCotizacionScenario(scenarioData).subscribe(scenario => {
        const endTime = Date.now();
        
        (expect(scenario.clientName) as any).toBe('Juan Pérez');
        (expect(scenario.flow) as any).toBe(BusinessFlow.VentaPlazo);
        (expect(scenario.market) as any).toBe('aguascalientes');
        (expect(scenario.stage) as any).toBe('COTIZACION');
        (expect(scenario.seniorSummary.title) as any).toBe('Cotización para Juan Pérez');
        (expect(scenario.seniorSummary.keyMetrics.length) as any).toBe(3);
        (expect(scenario.seniorSummary.timeline.length) as any).toBe(2);
        (expect(scenario.seniorSummary.whatsAppMessage) as any).toContain('cotización');
        (expect(endTime - startTime) as any).toBeGreaterThan(1000); // Should use slow delay
        done();
      });
    });

    it('should create simulacion scenario with complete data', (done) => {
      const scenarioData = {
        clientName: 'María López',
        flow: BusinessFlow.AhorroProgramado,
        market: 'edomex'
      };

      service.createSimulacionScenario(scenarioData).subscribe(scenario => {
        (expect(scenario.clientName) as any).toBe('María López');
        (expect(scenario.flow) as any).toBe(BusinessFlow.AhorroProgramado);
        (expect(scenario.market) as any).toBe('edomex');
        (expect(scenario.stage) as any).toBe('SIMULACION');
        (expect(scenario.seniorSummary.title) as any).toBe('Simulación para María López');
        (expect(scenario.seniorSummary.keyMetrics.length) as any).toBe(3);
        (expect(scenario.seniorSummary.timeline.length) as any).toBe(2);
        (expect(scenario.seniorSummary.whatsAppMessage) as any).toContain('plan de ahorro');
        done();
      });
    });
  });

  describe('Search and Analytics', () => {
    it('should perform global search with results structure', (done) => {
      service.globalSearch('test').subscribe(results => {
        (expect(results) as any).toEqual({
          clients: [],
          ecosystems: [],
          groups: [],
          total: 0
        });
        done();
      });
    });

    it('should get dashboard stats with complete data', (done) => {
      service.getDashboardStats().subscribe(stats => {
        (expect(stats.clients) as any).toEqual({
          total: 25,
          active: 18,
          new_this_month: 5
        });
        (expect(stats.ecosystems) as any).toEqual({
          total: 2,
          active: 1,
          pending: 1
        });
        (expect(stats.groups) as any).toEqual({
          total: 4,
          active: 3,
          units_delivered: 6
        });
        (expect(stats.recentActivity.length) as any).toBe(3);
        (expect(stats.recentActivity[0]) as any).toEqual(jasmine.objectContaining({
          type: jasmine.any(String),
          message: jasmine.any(String),
          timestamp: jasmine.any(Date)
        }));
        done();
      });
    });
  });

  describe('Error Simulation', () => {
    it('should simulate network error', (done) => {
      service.simulateError('network').subscribe({
        error: (error) => {
          (expect(error.message) as any).toBe('Network error - no internet connection');
          expect((error as any).status).toBe(0);
          done();
        }
      });
    });

    it('should simulate server error', (done) => {
      service.simulateError('server').subscribe({
        error: (error) => {
          (expect(error.message) as any).toBe('Internal server error');
          expect((error as any).status).toBe(500);
          done();
        }
      });
    });

    it('should simulate validation error', (done) => {
      service.simulateError('validation').subscribe({
        error: (error) => {
          (expect(error.message) as any).toBe('Validation error - invalid data provided');
          expect((error as any).status).toBe(422);
          done();
        }
      });
    });

    it('should simulate timeout error', (done) => {
      const startTime = Date.now();
      service.simulateError('timeout').subscribe({
        error: (error) => {
          const elapsedTime = Date.now() - startTime;
          (expect(error.message) as any).toBe('Request timeout');
          (expect(elapsedTime) as any).toBeGreaterThan(7000); // Should take at least 8 seconds
          done();
        }
      });
    }, 10000); // Extend timeout to 10 seconds

    it('should simulate unknown error by default', (done) => {
      service.simulateError('unknown_type' as any).subscribe({
        error: (error) => {
          (expect(error.message) as any).toBe('Unknown error occurred');
          expect((error as any).status).toBe(500);
          done();
        }
      });
    });
  });

  describe('Utility Methods', () => {
    it('should perform health check', (done) => {
      service.healthCheck().subscribe(health => {
        (expect(health.status) as any).toBe('healthy');
        (expect(health.timestamp) as any).toBeInstanceOf(Date);
        (expect(health.version) as any).toBe('1.0.0');
        done();
      });
    });

    it('should get server time', (done) => {
      service.getServerTime().subscribe(time => {
        (expect(time.timestamp) as any).toBeInstanceOf(Date);
        done();
      });
    });

    it('should simulate file upload', (done) => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

      service.uploadFile(file).subscribe(result => {
        (expect(result.url) as any).toContain('conductores.com/uploads');
        (expect(result.url) as any).toContain('test.txt');
        (expect(result.size) as any).toBe(file.size);
        (expect(result.type) as any).toBe('text/plain');
        done();
      });
    });

    it('should export data as JSON', (done) => {
      service.exportData('clients', 'json').subscribe(blob => {
        (expect(blob) as any).toBeInstanceOf(Blob);
        (expect(blob.type) as any).toBe('application/json');
        
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          const data = JSON.parse(content);
          (expect(data.exported) as any).toBe(true);
          (expect(data.type) as any).toBe('clients');
          (expect(data.format) as any).toBe('json');
          done();
        };
        reader.readAsText(blob);
      });
    });

    it('should export data as CSV', (done) => {
      service.exportData('ecosystems', 'csv').subscribe(blob => {
        (expect(blob) as any).toBeInstanceOf(Blob);
        (expect(blob.type) as any).toBe('text/csv');
        
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          (expect(content) as any).toContain('exported,true');
          (expect(content) as any).toContain('type,ecosystems');
          done();
        };
        reader.readAsText(blob);
      });
    });

    it('should use default JSON format for export', (done) => {
      service.exportData('groups').subscribe(blob => {
        (expect(blob.type) as any).toBe('application/json');
        done();
      });
    });
  });

  describe('Network Delay Simulation', () => {
    it('should use random network delays', () => {
      // Test multiple calls to ensure randomness
      const delays: number[] = [];
      for (let i = 0; i < 10; i++) {
        const delay = service['getNetworkDelay']();
        delays.push(delay);
        (expect([200, 500, 1200]) as any).toContain(delay);
      }
      
      // Should have some variation (not all the same)
      const uniqueDelays = new Set(delays);
      (expect(uniqueDelays.size) as any).toBeGreaterThan(1);
    });

    it('should clone data deeply in mockApi', (done) => {
      const originalData = {
        nested: { value: 'test' },
        array: [1, 2, 3]
      };

      service['mockApi'](originalData, 0).subscribe(result => {
        (expect(result) as any).toEqual(originalData);
        expect(result).not.toBe(originalData); // Should be different object
        expect(result.nested).not.toBe(originalData.nested); // Deep clone
        done();
      });
    });

    it('should handle errors in mockApi', (done) => {
      spyOn(console, 'error');
      
      // Force an error by mocking the private deepCloneWithDates method
      const originalMethod = (service as any).deepCloneWithDates.bind(service);
      (service as any).deepCloneWithDates = jasmine.createSpy('deepCloneWithDates').and.callFake(() => {
        throw new Error('Parse error');
      });

      service['mockApi']('test data', 0).subscribe({
        error: (error) => {
          (expect(console.error) as any).toHaveBeenCalledWith('MockApi Error:', jasmine.any(Error));
          (expect(error.message) as any).toBe('Parse error');
          // Restore original method
          (service as any).deepCloneWithDates = originalMethod;
          done();
        }
      });
    });
  });

  describe('Promise-based Delay Method', () => {
    it('should delay data using Promise', async () => {
      const testData = { test: 'data' };
      const startTime = Date.now();
      
      const result = await service.delay(testData, 100);
      const endTime = Date.now();
      
      (expect(result) as any).toEqual(testData);
      (expect(endTime - startTime) as any).toBeGreaterThanOrEqual(100);
    });

    it('should use default delay if not specified', async () => {
      const testData = { test: 'data' };
      const startTime = Date.now();
      
      const result = await service.delay(testData);
      const endTime = Date.now();
      
      (expect(result) as any).toEqual(testData);
      (expect(endTime - startTime) as any).toBeGreaterThanOrEqual(500); // DEFAULT_DELAY
    });
  });

  describe('Data Service Integration', () => {
    it('should handle client data service errors', (done) => {
      clientDataSpy.getClients.and.returnValue(throwError(() => new Error('Client service error')));

      service.getClients().subscribe({
        error: (error) => {
          (expect(error.message) as any).toBe('Client service error');
          done();
        }
      });
    });

    it('should handle ecosystem data service errors', (done) => {
      ecosystemDataSpy.getEcosystems.and.returnValue(throwError(() => new Error('Ecosystem service error')));

      service.getEcosystems().subscribe({
        error: (error) => {
          (expect(error.message) as any).toBe('Ecosystem service error');
          done();
        }
      });
    });

    it('should handle collective group data service errors', (done) => {
      collectiveGroupDataSpy.getCollectiveGroups.and.returnValue(throwError(() => new Error('Group service error')));

      service.getCollectiveGroups().subscribe({
        error: (error) => {
          (expect(error.message) as any).toBe('Group service error');
          done();
        }
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should generate unique scenario IDs', (done) => {
      const scenarioData = {
        clientName: 'Test Client',
        flow: BusinessFlow.VentaPlazo,
        market: 'aguascalientes'
      };

      service.createCotizacionScenario(scenarioData).subscribe(scenario1 => {
        service.createCotizacionScenario(scenarioData).subscribe(scenario2 => {
          expect(scenario1.id).not.toBe(scenario2.id);
          (expect(scenario1.id) as any).toMatch(/^scenario-\d+$/);
          (expect(scenario2.id) as any).toMatch(/^scenario-\d+$/);
          done();
        });
      });
    });

    it('should maintain scenario data consistency', (done) => {
      const scenarioData = {
        clientName: 'Consistency Test',
        flow: BusinessFlow.AhorroProgramado,
        market: 'edomex'
      };

      service.createSimulacionScenario(scenarioData).subscribe(scenario => {
        (expect(scenario.clientName) as any).toBe(scenarioData.clientName);
        (expect(scenario.flow) as any).toBe(scenarioData.flow);
        (expect(scenario.market) as any).toBe(scenarioData.market);
        (expect(scenario.stage) as any).toBe('SIMULACION');
        
        // Verify senior summary structure
        (expect(scenario.seniorSummary) as any).toBeDefined();
        (expect(scenario.seniorSummary.title) as any).toBeTruthy();
        (expect(scenario.seniorSummary.description) as any).toBeInstanceOf(Array);
        (expect(scenario.seniorSummary.keyMetrics) as any).toBeInstanceOf(Array);
        (expect(scenario.seniorSummary.timeline) as any).toBeInstanceOf(Array);
        (expect(scenario.seniorSummary.whatsAppMessage) as any).toBeTruthy();
        
        done();
      });
    });
  });
});
