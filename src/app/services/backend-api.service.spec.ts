import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { BackendApiService } from './backend-api.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

describe('BackendApiService', () => {
  let service: BackendApiService;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let storageServiceSpy: jasmine.SpyObj<StorageService>;
  let originalNavigatorOnLine: PropertyDescriptor | undefined;

  const mockClientRecord = {
    id: '1',
    name: 'Ana García López',
    curp: 'GALA850315MDFNPR08',
    rfc: 'GALA850315ABC',
    email: 'ana.garcia@email.com',
    phone: '5551234567',
    address: 'Calle Ejemplo 123',
    city: 'Aguascalientes',
    state: 'AGS',
    birth_date: '1985-03-15',
    monthly_income: 25000,
    ecosystem_id: 'eco1',
    advisor_id: 'adv1',
    stage: 'cliente' as const,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  };

  const mockContractRecord = {
    id: '1',
    client_id: '1',
    contract_number: 'CONTRACT-001',
    ecosystem_id: 'eco1',
    vehicle_value: 350000,
    down_payment: 210000,
    monthly_payment: 7500,
    term_months: 24,
    interest_rate: 0.255,
    start_date: '2024-02-01',
    end_date: '2026-01-31',
    status: 'active' as const,
    payment_method: 'monthly' as const,
    advisor_id: 'adv1',
    created_at: '2024-01-15T10:00:00Z'
  };

  const mockEcosystemRecord = {
    id: '1',
    name: 'Ruta Centro AGS',
    route: 'Centro - Plaza Vestir - Macroplaza',
    market: 'AGS' as const,
    capacity: 50,
    available_spots: 12,
    vehicle_type: 'Microbus',
    requirements: ['Licencia tipo B', 'Experiencia 2 años'],
    weekly_earnings: 3500,
    monthly_earnings: 14000,
    status: 'active' as const,
    coordinator_id: 'coord1'
  };

  const mockDashboardData = {
    totalClients: 150,
    activeContracts: 89,
    monthlyRevenue: 1250000,
    conversionRate: '59.3',
    recentActivity: [],
    ecosystemStats: [],
    lastUpdated: '2024-01-15T10:00:00Z'
  };

  beforeEach(() => {
    const httpClientSpyObj = jasmine.createSpyObj('HttpClient', [
      'get', 'post', 'put', 'patch', 'delete'
    ]);
    const storageServiceSpyObj = jasmine.createSpyObj('StorageService', [
      'saveClient', 'getClient', 'queueOfflineAction', 'getStorageStats',
      'saveQuote', 'getQuote', 'getQuotesByClient', 'getPendingActions',
      'removeCompletedAction'
    ]);
    const authServiceSpyObj = jasmine.createSpyObj('AuthService', ['getToken']);
    authServiceSpyObj.getToken.and.returnValue('test_jwt_token');

    // Seed auth token for header assertions
    localStorage.setItem('auth_token', 'test_jwt_token');
    localStorage.setItem('current_user', JSON.stringify({ id: 'u1', name: 'Tester', email: 'tester@example.com', role: 'asesor', permissions: [] }));

    TestBed.configureTestingModule({
      providers: [
        BackendApiService,
        { provide: HttpClient, useValue: httpClientSpyObj },
        { provide: StorageService, useValue: storageServiceSpyObj },
        { provide: AuthService, useValue: authServiceSpyObj }
      ]
    });

    service = TestBed.inject(BackendApiService);
    httpClientSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
    storageServiceSpy = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;

    // Safely attempt to force navigator.onLine to true only if configurable.
    try {
      originalNavigatorOnLine = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
      if (!originalNavigatorOnLine || originalNavigatorOnLine.configurable) {
        Object.defineProperty(window.navigator, 'onLine', {
          configurable: true,
          get: () => true
        });
      }
    } catch {}
  });

  afterEach(() => {
    try {
      if (originalNavigatorOnLine && originalNavigatorOnLine.configurable) {
        Object.defineProperty(window.navigator, 'onLine', originalNavigatorOnLine);
      }
    } catch {}
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with online status', (done) => {
      service.isOnline.pipe(take(1)).subscribe(online => {
        expect(online).toBe(true);
        done();
      });
    });

    it('should have correct API configuration', () => {
      expect(service['baseUrl']).toBe(environment.apiUrl);
    });
  });

  describe('Client Management', () => {
    it('should create client successfully', (done) => {
      const { id, ...newClient } = mockClientRecord;

      httpClientSpy.post.and.returnValue(of(mockClientRecord));
      storageServiceSpy.saveClient.and.returnValue(Promise.resolve());

      service.createClient(newClient).subscribe(client => {
        expect(httpClientSpy.post).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.clients}`,
          newClient,
          jasmine.objectContaining({
            headers: jasmine.objectContaining({
              'Authorization': jasmine.stringMatching(/^Bearer\s.+/),
              'Content-Type': 'application/json'
            })
          })
        );
        expect(client).toEqual(mockClientRecord);
        expect(storageServiceSpy.saveClient).toHaveBeenCalled();
        done();
      });
    });

    it('should handle create client offline mode', (done) => {
      const { id, ...newClient } = mockClientRecord;

      httpClientSpy.post.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.queueOfflineAction.and.returnValue(Promise.resolve());
      storageServiceSpy.saveClient.and.returnValue(Promise.resolve());

      service.createClient(newClient).subscribe({
        error: (error) => {
          expect(error.message).toBe('Network error');
          expect(storageServiceSpy.queueOfflineAction).toHaveBeenCalledWith({
            type: 'CREATE_CLIENT',
            data: jasmine.objectContaining({ id: jasmine.stringMatching(/^temp_/) }),
            retryCount: 0
          });
          expect(storageServiceSpy.saveClient).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should update client successfully', (done) => {
      const updateData = { name: 'Updated Name' };
      const updatedClient = { ...mockClientRecord, ...updateData };

      httpClientSpy.put.and.returnValue(of(updatedClient));
      storageServiceSpy.getClient.and.returnValue(Promise.resolve({
        id: '1',
        personalInfo: mockClientRecord,
        ecosystemId: 'eco1',
        formProgress: {},
        documents: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));
      storageServiceSpy.saveClient.and.returnValue(Promise.resolve());

      service.updateClient('1', updateData).subscribe(client => {
        expect(httpClientSpy.put).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.clients}/1`,
          updateData,
          jasmine.any(Object)
        );
        expect(client).toEqual(updatedClient);
        expect(storageServiceSpy.saveClient).toHaveBeenCalled();
        done();
      });
    });

    it('should handle update client offline mode', (done) => {
      const updateData = { name: 'Updated Name' };

      httpClientSpy.put.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.queueOfflineAction.and.returnValue(Promise.resolve());

      service.updateClient('1', updateData).subscribe({
        error: (error) => {
          expect(error.message).toBe('Network error');
          expect(storageServiceSpy.queueOfflineAction).toHaveBeenCalledWith({
            type: 'UPDATE_CLIENT',
            data: { clientId: '1', clientData: updateData },
            retryCount: 0
          });
          done();
        }
      });
    });

    it('should get client successfully', (done) => {
      httpClientSpy.get.and.returnValue(of(mockClientRecord));

      service.getClient('1').subscribe(client => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.clients}/1`,
          jasmine.any(Object)
        );
        expect(client).toEqual(mockClientRecord);
        done();
      });
    });

    it('should fallback to local storage when getting client fails', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.getClient.and.returnValue(Promise.resolve({
        id: '1',
        personalInfo: mockClientRecord,
        ecosystemId: 'eco1',
        formProgress: {},
        documents: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));

      service.getClient('1').subscribe(client => {
        expect(client).toEqual(mockClientRecord);
        expect(storageServiceSpy.getClient).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('should get clients with filters', (done) => {
      const filters = { stage: 'cliente', market: 'AGS' };
      httpClientSpy.get.and.returnValue(of([mockClientRecord]));

      service.getClients(filters).subscribe(clients => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.clients}`,
          jasmine.objectContaining({
            params: filters
          })
        );
        expect(clients).toEqual([mockClientRecord]);
        done();
      });
    });

    it('should return empty array when getting clients fails', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));

      service.getClients().subscribe(clients => {
        expect(clients).toEqual([]);
        done();
      });
    });
  });

  describe('Contract Management', () => {
    it('should create contract successfully', (done) => {
      const { id, ...newContract } = mockContractRecord;

      httpClientSpy.post.and.returnValue(of(mockContractRecord));
      storageServiceSpy.saveQuote.and.returnValue(Promise.resolve());

      service.createContract(newContract).subscribe(contract => {
        expect(httpClientSpy.post).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.quotes}`,
          newContract,
          jasmine.any(Object)
        );
        expect(contract).toEqual(mockContractRecord);
        expect(storageServiceSpy.saveQuote).toHaveBeenCalled();
        done();
      });
    });

    it('should handle create contract offline mode', (done) => {
      const { id, ...newContract } = mockContractRecord;

      httpClientSpy.post.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.queueOfflineAction.and.returnValue(Promise.resolve());
      storageServiceSpy.saveQuote.and.returnValue(Promise.resolve());

      service.createContract(newContract).subscribe({
        error: (error) => {
          expect(error.message).toBe('Network error');
          expect(storageServiceSpy.queueOfflineAction).toHaveBeenCalledWith({
            type: 'CREATE_CONTRACT',
            data: jasmine.objectContaining({ id: jasmine.stringMatching(/^temp_contract_/) }),
            retryCount: 0
          });
          expect(storageServiceSpy.saveQuote).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should get contract successfully', (done) => {
      httpClientSpy.get.and.returnValue(of(mockContractRecord));

      service.getContract('1').subscribe(contract => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.quotes}/1`,
          jasmine.any(Object)
        );
        expect(contract).toEqual(mockContractRecord);
        done();
      });
    });

    it('should fallback to local storage when getting contract fails', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.getQuote.and.returnValue(Promise.resolve({
        id: '1',
        clientId: '1',
        ecosystemId: 'eco1',
        quoteDetails: mockContractRecord,
        createdAt: Date.now(),
        status: 'approved'
      }));

      service.getContract('1').subscribe(contract => {
        expect(contract).toEqual(mockContractRecord);
        expect(storageServiceSpy.getQuote).toHaveBeenCalledWith('1');
        done();
      });
    });

    it('should get client contracts successfully', (done) => {
      httpClientSpy.get.and.returnValue(of([mockContractRecord]));

      service.getClientContracts('1').subscribe(contracts => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.clients}/1/contracts`,
          jasmine.any(Object)
        );
        expect(contracts).toEqual([mockContractRecord]);
        done();
      });
    });

    it('should fallback to local storage when getting client contracts fails', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.getQuotesByClient.and.returnValue(Promise.resolve([{
        id: '1',
        clientId: '1',
        ecosystemId: 'eco1',
        quoteDetails: mockContractRecord,
        createdAt: Date.now(),
        status: 'approved'
      }]));

      service.getClientContracts('1').subscribe(contracts => {
        expect(contracts).toEqual([mockContractRecord]);
        expect(storageServiceSpy.getQuotesByClient).toHaveBeenCalledWith('1');
        done();
      });
    });
  });

  describe('Ecosystem Management', () => {
    it('should get ecosystems successfully', (done) => {
      httpClientSpy.get.and.returnValue(of([mockEcosystemRecord]));

      service.getEcosystems().subscribe(ecosystems => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}/ecosystems`,
          jasmine.any(Object)
        );
        expect(ecosystems).toEqual([mockEcosystemRecord]);
        done();
      });
    });

    it('should get ecosystems with market filter', (done) => {
      httpClientSpy.get.and.returnValue(of([mockEcosystemRecord]));

      service.getEcosystems('AGS').subscribe(ecosystems => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}/ecosystems`,
          jasmine.objectContaining({
            params: { market: 'AGS' }
          })
        );
        expect(ecosystems).toEqual([mockEcosystemRecord]);
        done();
      });
    });

    it('should fallback to mock ecosystems for AGS when API fails', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));

      service.getEcosystems('AGS').subscribe(ecosystems => {
        expect(ecosystems.length).toBeGreaterThan(0);
        expect(ecosystems.every(eco => eco.market === 'AGS')).toBe(true);
        done();
      });
    });

    it('should fallback to mock ecosystems for EDOMEX when API fails', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));

      service.getEcosystems('EDOMEX').subscribe(ecosystems => {
        expect(ecosystems.length).toBeGreaterThan(0);
        expect(ecosystems.every(eco => eco.market === 'EDOMEX')).toBe(true);
        done();
      });
    });

    it('should combine fallback ecosystems when API fails without market filter', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));

      service.getEcosystems().subscribe(ecosystems => {
        expect(ecosystems.length).toBeGreaterThan(0);
        expect(ecosystems.some(eco => eco.market === 'AGS')).toBeTrue();
        expect(ecosystems.some(eco => eco.market === 'EDOMEX')).toBeTrue();
        done();
      });
    });

    it('should get ecosystem by ID successfully', (done) => {
      httpClientSpy.get.and.returnValue(of(mockEcosystemRecord));

      service.getEcosystem('1').subscribe(ecosystem => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}/ecosystems/1`,
          jasmine.any(Object)
        );
        expect(ecosystem).toEqual(mockEcosystemRecord);
        done();
      });
    });

    it('should update ecosystem capacity successfully', (done) => {
      const updatedEcosystem = { ...mockEcosystemRecord, available_spots: 15 };
      httpClientSpy.patch.and.returnValue(of(updatedEcosystem));

      service.updateEcosystemCapacity('1', 15).subscribe(ecosystem => {
        expect(httpClientSpy.patch).toHaveBeenCalledWith(
          `${environment.apiUrl}/ecosystems/1/capacity`,
          { available_spots: 15 },
          jasmine.any(Object)
        );
        expect(ecosystem).toEqual(updatedEcosystem);
        done();
      });
    });
  });

  describe('Dashboard and Analytics', () => {
    it('should get dashboard data successfully', (done) => {
      httpClientSpy.get.and.returnValue(of(mockDashboardData));

      service.getDashboardData().subscribe(data => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.reports}/dashboard`,
          jasmine.any(Object)
        );
        expect(data.totalClients).toBe(150);
        expect(data.lastUpdated).toBeTruthy();
        done();
      });
    });

    it('should get dashboard data with advisor filter', (done) => {
      httpClientSpy.get.and.returnValue(of(mockDashboardData));

      service.getDashboardData('adv1').subscribe(data => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.reports}/dashboard`,
          jasmine.objectContaining({
            params: { advisor_id: 'adv1' }
          })
        );
        expect(data).toEqual(jasmine.objectContaining(mockDashboardData));
        done();
      });
    });

    it('should return offline dashboard data when API fails', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.getStorageStats.and.returnValue(Promise.resolve({
        clients: 50,
        quotes: 30,
        documents: 200,
        totalSizeKB: 1024
      }));

      service.getDashboardData().subscribe(data => {
        expect(data.totalClients).toBe(50);
        expect(data.activeContracts).toBe(30);
        expect(data.conversionRate).toBe('60.0');
        expect(data.isOffline).toBe(true);
        expect(storageServiceSpy.getStorageStats).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('File Upload', () => {
    it('should upload document successfully', (done) => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse = { success: true, fileUrl: 'http://example.com/file.jpg' };
      httpClientSpy.post.and.returnValue(of(mockResponse));

      service.uploadDocument(file, '1', 'INE').subscribe(response => {
        expect(httpClientSpy.post).toHaveBeenCalledWith(
          `${environment.apiUrl}${environment.endpoints.documents}/upload`,
          jasmine.any(FormData),
          jasmine.objectContaining({
            headers: jasmine.objectContaining({ 'Authorization': jasmine.stringMatching(/^Bearer\s.+/) })
          })
        );
        expect(response).toEqual(mockResponse);
        done();
      });
    });

    it('should handle upload document offline mode', (done) => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      httpClientSpy.post.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.queueOfflineAction.and.returnValue(Promise.resolve());

      service.uploadDocument(file, '1', 'INE').subscribe({
        error: (error) => {
          expect(error.message).toBe('Network error');
          expect(storageServiceSpy.queueOfflineAction).toHaveBeenCalledWith({
            type: 'UPLOAD_DOCUMENT',
            data: { file: 'test.jpg', clientId: '1', documentType: 'INE' },
            retryCount: 0
          });
          done();
        }
      });
    });
  });

  describe('Sync Management', () => {
    it('should sync pending actions when coming online', async () => {
      const mockAction = {
        id: '1',
        type: 'CREATE_CLIENT',
        data: mockClientRecord,
        retryCount: 0
      };

      storageServiceSpy.getPendingActions.and.returnValue(Promise.resolve([mockAction]));
      httpClientSpy.post.and.returnValue(of(mockClientRecord));
      storageServiceSpy.removeCompletedAction.and.returnValue(Promise.resolve());
      spyOn(service as any, 'syncPendingData').and.callThrough();

      // Simulate going online
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(storageServiceSpy.getPendingActions).toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      const mockAction = {
        id: '1',
        type: 'CREATE_CLIENT',
        data: mockClientRecord,
        retryCount: 0
      };

      storageServiceSpy.getPendingActions.and.returnValue(Promise.resolve([mockAction]));
      httpClientSpy.post.and.returnValue(throwError(() => new Error('Sync error')));
      spyOn(console, 'error');

      const syncMethod = (service as any).syncPendingData;
      await syncMethod.call(service);

      expect(console.error).toHaveBeenCalledWith(
        'Failed to sync action:',
        'CREATE_CLIENT',
        jasmine.any(Error)
      );
    });
  });

  describe('Health Check', () => {
    it('should return online health status', (done) => {
      const mockHealthResponse = {
        status: 'online',
        timestamp: '2024-01-15T10:00:00Z'
      };
      httpClientSpy.get.and.returnValue(of(mockHealthResponse));

      service.healthCheck().subscribe(health => {
        expect(httpClientSpy.get).toHaveBeenCalledWith(
          `${environment.apiUrl}/health`,
          jasmine.any(Object)
        );
        expect(health).toEqual(mockHealthResponse);
        done();
      });
    });

    it('should return offline health status when API fails', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));

      service.healthCheck().subscribe(health => {
        expect(health.status).toBe('offline');
        expect(health.timestamp).toBeTruthy();
        done();
      });
    });
  });

  describe('Network Status Management', () => {
    it('should update online status when network changes', (done) => {
      service.isOnline.pipe(skip(1), take(1)).subscribe(online => {
        expect(online).toBe(false);
        done();
      });
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    });

    it('should trigger sync when going back online', () => {
      spyOn(service as any, 'syncPendingData').and.returnValue(Promise.resolve());

      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      expect((service as any).syncPendingData).toHaveBeenCalled();
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle null client data from local storage', (done) => {
      httpClientSpy.get.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.getClient.and.returnValue(Promise.resolve(null));

      service.getClient('1').subscribe({
        error: (error) => {
          expect(error.message).toBe('Network error');
          done();
        }
      });
    });

    it('should handle storage errors gracefully', (done) => {
      const { id, ...newClient } = mockClientRecord;

      httpClientSpy.post.and.returnValue(throwError(() => new Error('Network error')));
      storageServiceSpy.queueOfflineAction.and.returnValue(Promise.reject(new Error('Storage error')));

      service.createClient(newClient).subscribe({
        error: (error) => {
          expect(error.message).toBe('Network error');
          done();
        }
      });
    });

    it('should handle unknown action types in sync', async () => {
      const mockAction = {
        id: '1',
        type: 'UNKNOWN_ACTION',
        data: {},
        retryCount: 0
      };

      spyOn(console, 'warn');
      const executeMethod = (service as any).executeAction;
      
      await executeMethod.call(service, mockAction);

      expect(console.warn).toHaveBeenCalledWith('Unknown action type:', 'UNKNOWN_ACTION');
    });
  });
});
