import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface StorageItem {
  id: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

interface ClientData {
  id?: string;
  personalInfo: any;
  ecosystemId: string;
  formProgress: any;
  documents: any[];
  createdAt: number;
  updatedAt: number;
}

interface QuoteData {
  id: string;
  clientId: string;
  ecosystemId: string;
  quoteDetails: any;
  createdAt: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbName = 'ConductoresPWADB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  private useMemoryStore = false;
  private memClients = new Map<string, any>();
  private memQuotes = new Map<string, any>();
  private memFormCache = new Map<string, any>();

  constructor() {
    this.initDB();
    this.setupOnlineListener();
  }

  get isOnline(): Observable<boolean> {
    return this.isOnline$.asObservable();
  }

  private async initDB(): Promise<void> {
    // Fallback to in-memory store if IndexedDB is unavailable (e.g., test environment)
    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB not available; using in-memory storage for StorageService');
      this.useMemoryStore = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Clients store
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientStore.createIndex('ecosystemId', 'ecosystemId', { unique: false });
          clientStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Quotes store
        if (!db.objectStoreNames.contains('quotes')) {
          const quoteStore = db.createObjectStore('quotes', { keyPath: 'id' });
          quoteStore.createIndex('clientId', 'clientId', { unique: false });
          quoteStore.createIndex('ecosystemId', 'ecosystemId', { unique: false });
          quoteStore.createIndex('status', 'status', { unique: false });
          quoteStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Forms cache store
        if (!db.objectStoreNames.contains('formCache')) {
          db.createObjectStore('formCache', { keyPath: 'id' });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Offline actions store
        if (!db.objectStoreNames.contains('offlineActions')) {
          const actionStore = db.createObjectStore('offlineActions', { keyPath: 'id' });
          actionStore.createIndex('type', 'type', { unique: false });
          actionStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline$.next(true);
      this.syncPendingActions();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline$.next(false);
    });
  }

  // Client Data Management
  async saveClient(clientData: ClientData): Promise<void> {
    if (this.useMemoryStore) {
      const id = clientData.id || String(Date.now());
      const clientWithTimestamp = { ...clientData, id, updatedAt: Date.now() };
      this.memClients.set(id, clientWithTimestamp);
      return Promise.resolve();
    }
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['clients'], 'readwrite');
      const store = transaction.objectStore('clients');
      
      const clientWithTimestamp = {
        ...clientData,
        updatedAt: Date.now()
      };

      const request = store.put(clientWithTimestamp);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getClient(id: string): Promise<ClientData | null> {
    if (this.useMemoryStore) {
      return Promise.resolve(this.memClients.get(id) || null);
    }
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['clients'], 'readonly');
      const store = transaction.objectStore('clients');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getClientsByEcosystem(ecosystemId: string): Promise<ClientData[]> {
    if (this.useMemoryStore) {
      const res: ClientData[] = [] as any;
      this.memClients.forEach(v => { if (v.ecosystemId === ecosystemId) res.push(v); });
      return Promise.resolve(res);
    }
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['clients'], 'readonly');
      const store = transaction.objectStore('clients');
      const index = store.index('ecosystemId');
      const request = index.getAll(ecosystemId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Quote Data Management
  async saveQuote(quoteData: QuoteData): Promise<void> {
    if (this.useMemoryStore) {
      this.memQuotes.set(quoteData.id, quoteData);
      return Promise.resolve();
    }
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['quotes'], 'readwrite');
      const store = transaction.objectStore('quotes');
      const request = store.put(quoteData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getQuote(id: string): Promise<QuoteData | null> {
    if (this.useMemoryStore) {
      return Promise.resolve(this.memQuotes.get(id) || null);
    }
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['quotes'], 'readonly');
      const store = transaction.objectStore('quotes');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getQuotesByClient(clientId: string): Promise<QuoteData[]> {
    if (this.useMemoryStore) {
      const res: QuoteData[] = [] as any;
      this.memQuotes.forEach(v => { if (v.clientId === clientId) res.push(v); });
      return Promise.resolve(res);
    }
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['quotes'], 'readonly');
      const store = transaction.objectStore('quotes');
      const index = store.index('clientId');
      const request = index.getAll(clientId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Form Cache Management
  async cacheFormData(formId: string, data: any, ttl: number = 3600000): Promise<void> {
    if (this.useMemoryStore) {
      const item: StorageItem = { id: formId, data, timestamp: Date.now(), expiresAt: Date.now() + ttl };
      this.memFormCache.set(formId, item);
      return Promise.resolve();
    }
    if (!this.db) throw new Error('Database not initialized');

    const item: StorageItem = {
      id: formId,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['formCache'], 'readwrite');
      const store = transaction.objectStore('formCache');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedFormData(formId: string): Promise<any | null> {
    if (this.useMemoryStore) {
      const item = this.memFormCache.get(formId);
      if (!item) return Promise.resolve(null);
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.memFormCache.delete(formId);
        return Promise.resolve(null);
      }
      return Promise.resolve(item.data);
    }
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['formCache'], 'readonly');
      const store = transaction.objectStore('formCache');
      const request = store.get(formId);

      request.onsuccess = () => {
        const item = request.result;
        if (!item) {
          resolve(null);
          return;
        }

        // Check if expired
        if (item.expiresAt && Date.now() > item.expiresAt) {
          this.deleteCachedFormData(formId);
          resolve(null);
          return;
        }

        resolve(item.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCachedFormData(formId: string): Promise<void> {
    if (this.useMemoryStore) {
      this.memFormCache.delete(formId);
      return Promise.resolve();
    }
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['formCache'], 'readwrite');
      const store = transaction.objectStore('formCache');
      const request = store.delete(formId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Offline Actions Queue
  async queueOfflineAction(action: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const actionItem = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...action,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.put(actionItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeCompletedAction(actionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.delete(actionId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Management
  private async syncPendingActions(): Promise<void> {
    try {
      const pendingActions = await this.getPendingActions();
      
      for (const action of pendingActions) {
        try {
          await this.executeAction(action);
          await this.removeCompletedAction(action.id);
          console.log('Synced action:', action.type);
        } catch (error) {
          console.error('Failed to sync action:', action.type, error);
        }
      }
    } catch (error) {
      console.error('Failed to sync pending actions:', error);
    }
  }

  private async executeAction(action: any): Promise<void> {
    switch (action.type) {
      case 'CREATE_CLIENT':
        // Implement API call to create client
        break;
      case 'UPDATE_CLIENT':
        // Implement API call to update client
        break;
      case 'CREATE_QUOTE':
        // Implement API call to create quote
        break;
      case 'SUBMIT_FORM':
        // Implement API call to submit form
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  // Utility Methods
  async clearCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stores = ['formCache', 'offlineActions'];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getStorageStats(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = {
      clients: 0,
      quotes: 0,
      cachedForms: 0,
      pendingActions: 0
    };

    const stores = ['clients', 'quotes', 'formCache', 'offlineActions'];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => {
          switch (storeName) {
            case 'clients':
              stats.clients = request.result;
              break;
            case 'quotes':
              stats.quotes = request.result;
              break;
            case 'formCache':
              stats.cachedForms = request.result;
              break;
            case 'offlineActions':
              stats.pendingActions = request.result;
              break;
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }

    return stats;
  }
}
