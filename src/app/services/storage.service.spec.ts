import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

// Mock IndexedDB
const mockIDBDatabase = {
  createObjectStore: jasmine.createSpy('createObjectStore').and.returnValue({
    createIndex: jasmine.createSpy('createIndex')
  }),
  objectStoreNames: {
    contains: jasmine.createSpy('contains').and.returnValue(false)
  },
  transaction: jasmine.createSpy('transaction').and.returnValue({
    objectStore: jasmine.createSpy('objectStore').and.returnValue({
      put: jasmine.createSpy('put').and.returnValue({ onsuccess: null, onerror: null }),
      get: jasmine.createSpy('get').and.returnValue({ onsuccess: null, onerror: null }),
      getAll: jasmine.createSpy('getAll').and.returnValue({ onsuccess: null, onerror: null }),
      delete: jasmine.createSpy('delete').and.returnValue({ onsuccess: null, onerror: null }),
      clear: jasmine.createSpy('clear').and.returnValue({ onsuccess: null, onerror: null }),
      count: jasmine.createSpy('count').and.returnValue({ onsuccess: null, onerror: null }),
      index: jasmine.createSpy('index').and.returnValue({
        getAll: jasmine.createSpy('getAll').and.returnValue({ onsuccess: null, onerror: null })
      })
    })
  })
};

const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  result: mockIDBDatabase
};

describe('StorageService', () => {
  let service: StorageService;
  let mockIndexedDB: jasmine.Spy;

  beforeEach(async () => {
    // Mock IndexedDB
    mockIndexedDB = jasmine.createSpy('indexedDB.open').and.returnValue(mockIDBRequest);
    (global as any).indexedDB = { open: mockIndexedDB };
    
    // Mock navigator
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Mock window events
    spyOn(window, 'addEventListener').and.callFake(((event: any, listener: any) => {
      if (event === 'online' || event === 'offline') {
        // Store callbacks for testing
      }
    }) as any);

    TestBed.configureTestingModule({
      providers: [StorageService]
    });
    
    service = TestBed.inject(StorageService);
    
    // Simulate successful DB initialization
    if (mockIDBRequest.onsuccess) {
      (mockIDBRequest.onsuccess as any)();
    }
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize IndexedDB on construction', () => {
      expect(mockIndexedDB).toHaveBeenCalledWith('ConductoresPWADB', 1);
    });

    it('should setup online/offline event listeners', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('online', jasmine.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', jasmine.any(Function));
    });

    it('should provide online status observable', (done) => {
      service.isOnline.subscribe(status => {
        expect(typeof status).toBe('boolean');
        done();
      });
    });
  });

  describe('Database Schema Creation', () => {
    it('should create all required object stores on upgrade', () => {
      const mockEvent = {
        target: { result: mockIDBDatabase }
      };
      
      if (mockIDBRequest.onupgradeneeded) {
        (mockIDBRequest.onupgradeneeded as any)(mockEvent as any);
      }
      
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('clients', { keyPath: 'id' });
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('quotes', { keyPath: 'id' });
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('formCache', { keyPath: 'id' });
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('syncQueue', { keyPath: 'id' });
      expect(mockIDBDatabase.createObjectStore).toHaveBeenCalledWith('offlineActions', { keyPath: 'id' });
    });

    it('should handle database initialization errors', () => {
      spyOn(console, 'error');
      
      if (mockIDBRequest.onerror) {
        (mockIDBRequest as any).error = new Error('DB init failed');
        (mockIDBRequest.onerror as any)();
      }
      
      expect(console.error).toHaveBeenCalledWith('Failed to open IndexedDB:', jasmine.any(Error));
    });
  });

  describe('Client Data Management', () => {
    const mockClientData = {
      id: 'client-123',
      personalInfo: { name: 'Juan Pérez', email: 'juan@example.com' },
      ecosystemId: 'ags-001',
      formProgress: { step: 3, completed: true },
      documents: [{ id: 'doc-1', name: 'INE', status: 'approved' }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    it('should save client data successfully', async () => {
      const putRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jasmine.createSpy('put').and.returnValue(putRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const savePromise = service.saveClient(mockClientData);
      
      // Simulate successful save
      if (putRequest.onsuccess) {
        (putRequest.onsuccess as any)();
      }
      
      await expectAsync(savePromise).toBeResolved();
      expect(mockStore.put).toHaveBeenCalledWith(jasmine.objectContaining({
        ...mockClientData,
        updatedAt: jasmine.any(Number)
      }));
    });

    it('should get client data by ID', async () => {
      const getRequest = { onsuccess: null, onerror: null, result: mockClientData };
      const mockStore = {
        get: jasmine.createSpy('get').and.returnValue(getRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const getPromise = service.getClient('client-123');
      
      // Simulate successful retrieval
      if (getRequest.onsuccess) {
        (getRequest.onsuccess as any)();
      }
      
      const result = await getPromise;
      expect(result).toEqual(mockClientData);
      expect(mockStore.get).toHaveBeenCalledWith('client-123');
    });

    it('should return null for non-existent client', async () => {
      const getRequest = { onsuccess: null, onerror: null, result: undefined };
      const mockStore = {
        get: jasmine.createSpy('get').and.returnValue(getRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const getPromise = service.getClient('non-existent');
      
      if (getRequest.onsuccess) {
        (getRequest.onsuccess as any)();
      }
      
      const result = await getPromise;
      expect(result).toBeNull();
    });

    it('should get clients by ecosystem', async () => {
      const mockClients = [mockClientData, { ...mockClientData, id: 'client-124' }];
      const getAllRequest = { onsuccess: null, onerror: null, result: mockClients };
      const mockIndex = {
        getAll: jasmine.createSpy('getAll').and.returnValue(getAllRequest)
      };
      const mockStore = {
        index: jasmine.createSpy('index').and.returnValue(mockIndex)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const getPromise = service.getClientsByEcosystem('ags-001');
      
      if (getAllRequest.onsuccess) {
        (getAllRequest.onsuccess as any)();
      }
      
      const result = await getPromise;
      expect(result).toEqual(mockClients);
      expect(mockStore.index).toHaveBeenCalledWith('ecosystemId');
      expect(mockIndex.getAll).toHaveBeenCalledWith('ags-001');
    });

    it('should handle client data errors', async () => {
      const putRequest = { onsuccess: null, onerror: null, error: new Error('Save failed') };
      const mockStore = {
        put: jasmine.createSpy('put').and.returnValue(putRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const savePromise = service.saveClient(mockClientData);
      
      if (putRequest.onerror) {
        (putRequest.onerror as any)();
      }
      
      await expectAsync(savePromise).toBeRejectedWith(jasmine.any(Error));
    });
  });

  describe('Quote Data Management', () => {
    const mockQuoteData = {
      id: 'quote-123',
      clientId: 'client-123',
      ecosystemId: 'ags-001',
      quoteDetails: { amount: 150000, term: 24 },
      createdAt: Date.now(),
      status: 'draft' as const
    };

    it('should save quote data', async () => {
      const putRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jasmine.createSpy('put').and.returnValue(putRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const savePromise = service.saveQuote(mockQuoteData);
      
      if (putRequest.onsuccess) {
        (putRequest.onsuccess as any)();
      }
      
      await expectAsync(savePromise).toBeResolved();
      expect(mockStore.put).toHaveBeenCalledWith(mockQuoteData);
    });

    it('should get quote by ID', async () => {
      const getRequest = { onsuccess: null, onerror: null, result: mockQuoteData };
      const mockStore = {
        get: jasmine.createSpy('get').and.returnValue(getRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const getPromise = service.getQuote('quote-123');
      
      if (getRequest.onsuccess) {
        (getRequest.onsuccess as any)();
      }
      
      const result = await getPromise;
      expect(result).toEqual(mockQuoteData);
    });

    it('should get quotes by client ID', async () => {
      const mockQuotes = [mockQuoteData];
      const getAllRequest = { onsuccess: null, onerror: null, result: mockQuotes };
      const mockIndex = {
        getAll: jasmine.createSpy('getAll').and.returnValue(getAllRequest)
      };
      const mockStore = {
        index: jasmine.createSpy('index').and.returnValue(mockIndex)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const getPromise = service.getQuotesByClient('client-123');
      
      if (getAllRequest.onsuccess) {
        (getAllRequest.onsuccess as any)();
      }
      
      const result = await getPromise;
      expect(result).toEqual(mockQuotes);
      expect(mockIndex.getAll).toHaveBeenCalledWith('client-123');
    });
  });

  describe('Form Cache Management', () => {
    const mockFormData = {
      personalInfo: { name: 'Test User' },
      currentStep: 2,
      validationState: { isValid: true }
    };

    it('should cache form data with TTL', async () => {
      const putRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jasmine.createSpy('put').and.returnValue(putRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const cachePromise = service.cacheFormData('form-123', mockFormData, 1800000); // 30 minutes
      
      if (putRequest.onsuccess) {
        (putRequest.onsuccess as any)();
      }
      
      await expectAsync(cachePromise).toBeResolved();
      
      const cachedItem = (mockStore.put as jasmine.Spy).calls.mostRecent().args[0];
      expect(cachedItem.id).toBe('form-123');
      expect(cachedItem.data).toEqual(mockFormData);
      expect(cachedItem.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should retrieve cached form data', async () => {
      const cachedItem = {
        id: 'form-123',
        data: mockFormData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 1800000
      };
      
      const getRequest = { onsuccess: null, onerror: null, result: cachedItem };
      const mockStore = {
        get: jasmine.createSpy('get').and.returnValue(getRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const getPromise = service.getCachedFormData('form-123');
      
      if (getRequest.onsuccess) {
        (getRequest.onsuccess as any)();
      }
      
      const result = await getPromise;
      expect(result).toEqual(mockFormData);
    });

    it('should return null for expired form cache', async () => {
      const expiredItem = {
        id: 'form-123',
        data: mockFormData,
        timestamp: Date.now() - 3600000,
        expiresAt: Date.now() - 1800000 // Expired
      };
      
      const getRequest = { onsuccess: null, onerror: null, result: expiredItem };
      const deleteRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        get: jasmine.createSpy('get').and.returnValue(getRequest),
        delete: jasmine.createSpy('delete').and.returnValue(deleteRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const getPromise = service.getCachedFormData('form-123');
      
      if (getRequest.onsuccess) {
        (getRequest.onsuccess as any)();
      }
      
      const result = await getPromise;
      expect(result).toBeNull();
    });

    it('should delete cached form data', async () => {
      const deleteRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        delete: jasmine.createSpy('delete').and.returnValue(deleteRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const deletePromise = service.deleteCachedFormData('form-123');
      
      if (deleteRequest.onsuccess) {
        (deleteRequest.onsuccess as any)();
      }
      
      await expectAsync(deletePromise).toBeResolved();
      expect(mockStore.delete).toHaveBeenCalledWith('form-123');
    });
  });

  describe('Offline Actions Queue', () => {
    const mockAction = {
      type: 'CREATE_CLIENT',
      data: { name: 'Test Client' },
      endpoint: '/api/clients'
    };

    it('should queue offline action', async () => {
      const putRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jasmine.createSpy('put').and.returnValue(putRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const queuePromise = service.queueOfflineAction(mockAction);
      
      if (putRequest.onsuccess) {
        (putRequest.onsuccess as any)();
      }
      
      await expectAsync(queuePromise).toBeResolved();
      
      const queuedAction = (mockStore.put as jasmine.Spy).calls.mostRecent().args[0];
      expect(queuedAction.type).toBe('CREATE_CLIENT');
      expect(queuedAction.data).toEqual(mockAction.data);
      expect(queuedAction.id).toMatch(/^action_\d+_/);
      expect(queuedAction.createdAt).toBeCloseTo(Date.now(), -2);
    });

    it('should get pending actions', async () => {
      const mockActions = [
        { id: 'action-1', type: 'CREATE_CLIENT', createdAt: Date.now() },
        { id: 'action-2', type: 'UPDATE_CLIENT', createdAt: Date.now() }
      ];
      
      const getAllRequest = { onsuccess: null, onerror: null, result: mockActions };
      const mockStore = {
        getAll: jasmine.createSpy('getAll').and.returnValue(getAllRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const getPromise = service.getPendingActions();
      
      if (getAllRequest.onsuccess) {
        (getAllRequest.onsuccess as any)();
      }
      
      const result = await getPromise;
      expect(result).toEqual(mockActions);
    });

    it('should remove completed action', async () => {
      const deleteRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        delete: jasmine.createSpy('delete').and.returnValue(deleteRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const removePromise = service.removeCompletedAction('action-123');
      
      if (deleteRequest.onsuccess) {
        (deleteRequest.onsuccess as any)();
      }
      
      await expectAsync(removePromise).toBeResolved();
      expect(mockStore.delete).toHaveBeenCalledWith('action-123');
    });
  });

  describe('Utility Methods', () => {
    it('should clear cache', async () => {
      const clearRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        clear: jasmine.createSpy('clear').and.returnValue(clearRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const clearPromise = service.clearCache();
      
      // Simulate successful clear for both stores
      if (clearRequest.onsuccess) {
        (clearRequest.onsuccess as any)();
      }
      
      await expectAsync(clearPromise).toBeResolved();
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['formCache'], 'readwrite');
      expect(mockIDBDatabase.transaction).toHaveBeenCalledWith(['offlineActions'], 'readwrite');
    });

    it('should get storage statistics', async () => {
      const countRequest = { onsuccess: null, onerror: null, result: 5 };
      const mockStore = {
        count: jasmine.createSpy('count').and.returnValue(countRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const statsPromise = service.getStorageStats();
      
      // Simulate count responses for all stores
      if (countRequest.onsuccess) {
        (countRequest.onsuccess as any)();
      }
      
      const stats = await statsPromise;
      
      expect(stats).toEqual({
        clients: 5,
        quotes: 5,
        cachedForms: 5,
        pendingActions: 5
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when database not initialized', async () => {
      const uninitializedService = new StorageService();
      (uninitializedService as any).db = null;
      
      await expectAsync(uninitializedService.saveClient({} as any)).toBeRejectedWith(new Error('Database not initialized'));
      await expectAsync(uninitializedService.getClient('test')).toBeRejectedWith(new Error('Database not initialized'));
      await expectAsync(uninitializedService.cacheFormData('test', {})).toBeRejectedWith(new Error('Database not initialized'));
      await expectAsync(uninitializedService.queueOfflineAction({})).toBeRejectedWith(new Error('Database not initialized'));
    });

    it('should handle transaction errors', async () => {
      const errorRequest = { onsuccess: null, onerror: null, error: new Error('Transaction failed') };
      const mockStore = {
        put: jasmine.createSpy('put').and.returnValue(errorRequest)
      };
      const mockTransaction = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockStore)
      };
      
      mockIDBDatabase.transaction.and.returnValue(mockTransaction);
      
      const savePromise = service.saveClient({} as any);
      
      if (errorRequest.onerror) {
        (errorRequest.onerror as any)();
      }
      
      await expectAsync(savePromise).toBeRejectedWith(jasmine.any(Error));
    });
  });

  describe('Network Status Management', () => {
    it('should update online status when going online', () => {
      spyOn(console, 'log');
      
      // Simulate going online
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
      
      service.isOnline.subscribe(status => {
        expect(status).toBe(true);
      });
    });

    it('should update online status when going offline', () => {
      // Simulate going offline
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
      
      service.isOnline.subscribe(status => {
        expect(status).toBe(false);
      });
    });
  });
});