/**
 * IndexedDB Test State Manager
 * 
 * Manages test database state to prevent memory leaks and ensure clean test isolation.
 * Prevents JavaScript heap crashes during extensive test runs.
 */
export class IndexedDBTestStateManager {
  private static instance: IndexedDBTestStateManager;
  private openDatabases: Set<IDBDatabase> = new Set();
  private testDatabases: Set<string> = new Set();

  private constructor() {}

  static getInstance(): IndexedDBTestStateManager {
    if (!IndexedDBTestStateManager.instance) {
      IndexedDBTestStateManager.instance = new IndexedDBTestStateManager();
    }
    return IndexedDBTestStateManager.instance;
  }

  /**
   * Initialize clean state for test suite
   */
  async initializeTestSuite(): Promise<void> {
    await this.cleanupAllTestDatabases();
    this.clearRegistries();
  }

  /**
   * Setup clean state before each test
   */
  async beforeEach(): Promise<void> {
    // Force garbage collection if available
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }

  /**
   * Cleanup after each test
   */
  async afterEach(): Promise<void> {
    await this.closeAllConnections();
    await this.cleanupTestDatabases();
    
    // Force memory cleanup
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }

  /**
   * Final cleanup after test suite
   */
  async finalizeTestSuite(): Promise<void> {
    await this.closeAllConnections();
    await this.cleanupAllTestDatabases();
    this.clearRegistries();
  }

  /**
   * Register a database connection for tracking
   */
  registerDatabase(db: IDBDatabase): void {
    this.openDatabases.add(db);
    this.testDatabases.add(db.name);
  }

  /**
   * Close all tracked database connections
   */
  private async closeAllConnections(): Promise<void> {
    const promises = Array.from(this.openDatabases).map(db => {
      return new Promise<void>((resolve) => {
        try {
          if (db && db.readyState === 'done') {
            db.close();
          }
        } catch (error) {
          console.warn('Error closing database:', error);
        }
        resolve();
      });
    });

    await Promise.all(promises);
    this.openDatabases.clear();
  }

  /**
   * Delete test-specific databases
   */
  private async cleanupTestDatabases(): Promise<void> {
    const testDbNames = Array.from(this.testDatabases);
    const deletePromises = testDbNames.map(dbName => this.deleteDatabase(dbName));
    
    await Promise.allSettled(deletePromises);
  }

  /**
   * Delete all tracked databases
   */
  private async cleanupAllTestDatabases(): Promise<void> {
    // Get all test database names
    const testDbNames = [
      'test-conductores-db',
      'test-temp-db',
      'temp-test-db',
      'karma-test-db'
    ];

    const deletePromises = testDbNames.map(dbName => this.deleteDatabase(dbName));
    await Promise.allSettled(deletePromises);
  }

  /**
   * Delete a specific database
   */
  private deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        
        deleteRequest.onsuccess = () => {
          resolve();
        };

        deleteRequest.onerror = () => {
          console.warn(`Failed to delete database ${dbName}:`, deleteRequest.error);
          resolve(); // Resolve anyway to prevent blocking
        };

        deleteRequest.onblocked = () => {
          console.warn(`Database deletion blocked for ${dbName}`);
          // Try to resolve after timeout
          setTimeout(() => resolve(), 1000);
        };

      } catch (error) {
        console.warn(`Error initiating database deletion for ${dbName}:`, error);
        resolve();
      }
    });
  }

  /**
   * Clear internal registries
   */
  private clearRegistries(): void {
    this.openDatabases.clear();
    this.testDatabases.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): any {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        openDatabases: this.openDatabases.size,
        trackedDatabases: this.testDatabases.size
      };
    }
    return {
      openDatabases: this.openDatabases.size,
      trackedDatabases: this.testDatabases.size
    };
  }

  /**
   * Create a test database with cleanup tracking
   */
  async createTestDatabase(dbName: string, version: number = 1): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        this.registerDatabase(db);
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Default object store for testing
        if (!db.objectStoreNames.contains('testStore')) {
          db.createObjectStore('testStore', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  /**
   * Mock IndexedDB for testing environments that don't support it
   */
  static mockIndexedDB(): void {
    if (typeof globalThis.indexedDB === 'undefined') {
      // Simple IndexedDB mock for testing
      const mockIndexedDB = {
        open: () => ({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: {
            close: () => {},
            name: 'mock-db',
            readyState: 'done'
          }
        }),
        deleteDatabase: () => ({
          onsuccess: null,
          onerror: null,
          onblocked: null
        })
      };

      (globalThis as any).indexedDB = mockIndexedDB;
    }
  }
}

/**
 * Utility function for test setup
 */
export const setupMemoryLeakPrevention = () => {
  const manager = IndexedDBTestStateManager.getInstance();

  beforeAll(async () => {
    await manager.initializeTestSuite();
  });

  beforeEach(async () => {
    await manager.beforeEach();
  });

  afterEach(async () => {
    await manager.afterEach();
  });

  afterAll(async () => {
    await manager.finalizeTestSuite();
  });
};

/**
 * Global test helpers
 */
export const testHelpers = {
  /**
   * Force garbage collection if available
   */
  forceGC: () => {
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }
  },

  /**
   * Wait for next event loop tick
   */
  nextTick: (): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 0));
  },

  /**
   * Create a temporary test database
   */
  createTempDB: async (name?: string): Promise<IDBDatabase> => {
    const manager = IndexedDBTestStateManager.getInstance();
    const dbName = name || `temp-test-db-${Date.now()}`;
    return manager.createTestDatabase(dbName);
  },

  /**
   * Get current memory usage
   */
  getMemoryUsage: (): any => {
    const manager = IndexedDBTestStateManager.getInstance();
    return manager.getMemoryStats();
  }
};