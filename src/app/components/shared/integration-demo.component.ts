import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TestResult {
  [key: string]: 'pending' | 'success' | 'error' | undefined;
}

interface ServiceStatus {
  initialized: boolean;
  loading: boolean;
  error?: string;
}

interface StorageStatistics {
  totalClients: number;
  totalDocuments: number;
  totalSize: number;
  syncQueueSize: number;
}

@Component({
// removed by clean-audit
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ui-card">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-sm font-semibold mb-2 text-slate-900 dark:text-slate-100">
          🔗 Integraciones Externas
        </h2>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Panel de monitoreo y gestión de servicios externos e APIs
        </p>
      </div>

      <!-- API Status Cards -->
      <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Services Status -->
        <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">📦 Services</h3>
            <div class="w-2 h-2 rounded-full" [class.bg-green-500]="serviceStatus.initialized" [class.bg-red-500]="!serviceStatus.initialized"></div>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-600 dark:text-slate-400">Initialized:</span>
              <span class="font-mono" [class.text-green-600]="serviceStatus.initialized" [class.text-red-600]="!serviceStatus.initialized">
                {{ serviceStatus.initialized ? 'Active' : 'Offline' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600 dark:text-slate-400">Status:</span>
              <span class="font-mono" [class.text-yellow-600]="serviceStatus.loading" [class.text-green-600]="!serviceStatus.loading">
                {{ serviceStatus.loading ? 'Loading' : 'Ready' }}
              </span>
            </div>
          </div>
        </div>

        <!-- API Status -->
        <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">🚀 APIs</h3>
            <div class="w-2 h-2 rounded-full" [class.bg-green-500]="apiStatus.authenticated" [class.bg-red-500]="!apiStatus.authenticated"></div>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-600 dark:text-slate-400">Auth:</span>
              <span class="font-mono" [class.text-green-600]="apiStatus.authenticated" [class.text-red-600]="!apiStatus.authenticated">
                {{ apiStatus.authenticated ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600 dark:text-slate-400">Session:</span>
              <span class="font-mono text-slate-900 dark:text-slate-100">{{ apiStatus.session || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <!-- Sync Status -->
        <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">🔄 Sync</h3>
            <div class="w-2 h-2 rounded-full" [class.bg-green-500]="syncStatus.online" [class.bg-red-500]="!syncStatus.online"></div>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-600 dark:text-slate-400">Online:</span>
              <span class="font-mono" [class.text-green-600]="syncStatus.online" [class.text-red-600]="!syncStatus.online">
                {{ syncStatus.online ? 'Connected' : 'Offline' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600 dark:text-slate-400">Pending:</span>
              <span class="font-mono text-slate-900 dark:text-slate-100">{{ syncStatus.pendingItems }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Integration Tests Section -->
      <div class="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">🧪 Integration Tests</h3>
          <button (click)="runAllTests()" [disabled]="isRunning()" class="ui-btn ui-btn-secondary text-xs">
            {{ isRunning() ? '⏳ Running...' : '▶️ Run Tests' }}
          </button>
        </div>

        <!-- Test Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div *ngFor="let test of testCategories; trackBy: trackByTest" class="p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-lg">{{ getTestIcon(test.key) }}</span>
                <span class="text-xs font-medium text-slate-900 dark:text-slate-100">{{ test.name }}</span>
              </div>
              <span class="text-xs px-2 py-1 rounded"
                   [class.bg-green-100]="testResults()[test.key] === 'success'"
                   [class.text-green-700]="testResults()[test.key] === 'success'"
                   [class.dark:bg-green-900/30]="testResults()[test.key] === 'success'"
                   [class.dark:text-green-400]="testResults()[test.key] === 'success'"
                   [class.bg-red-100]="testResults()[test.key] === 'error'"
                   [class.text-red-700]="testResults()[test.key] === 'error'"
                   [class.dark:bg-red-900/30]="testResults()[test.key] === 'error'"
                   [class.dark:text-red-400]="testResults()[test.key] === 'error'"
                   [class.bg-yellow-100]="testResults()[test.key] === 'pending'"
                   [class.text-yellow-700]="testResults()[test.key] === 'pending'"
                   [class.dark:bg-yellow-900/30]="testResults()[test.key] === 'pending'"
                   [class.dark:text-yellow-400]="testResults()[test.key] === 'pending'"
                   [class.bg-slate-100]="!testResults()[test.key]"
                   [class.text-slate-600]="!testResults()[test.key]"
                   [class.dark:bg-slate-800]="!testResults()[test.key]"
                   [class.dark:text-slate-400]="!testResults()[test.key]">
                {{ getStatusText(testResults()[test.key]) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Storage Statistics -->
      <div *ngIf="storageStats" class="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4">📊 Storage Statistics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ storageStats.totalClients }}</div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Clients</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ storageStats.totalDocuments }}</div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Documents</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ (storageStats.totalSize / 1024 / 1024) | number:'1.1-1' }}MB</div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Storage</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ storageStats.syncQueueSize }}</div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Queue</div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isRunning()" class="mb-6 animate-pulse">
        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
        <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
      </div>

      <!-- Live Logs -->
      <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">📝 Live Logs</h3>
        <div class="bg-slate-900 dark:bg-slate-950 rounded-lg p-3 font-mono text-xs text-green-400 max-h-48 overflow-y-auto">
          <div *ngIf="logs().length === 0" class="text-slate-500 dark:text-slate-600">
            Waiting for test execution...
          </div>
          <div *ngFor="let log of logs(); trackBy: trackByLog" class="mb-1 border-b border-slate-800 dark:border-slate-700 pb-1 last:border-b-0">
            {{ log }}
          </div>
        </div>
      </div>
    </section>
  `,
  styles: []
})
export class IntegrationDemoComponent implements OnInit, OnDestroy {
  testResults = signal<TestResult>({});
  logs = signal<string[]>([]);
  isRunning = signal(false);

  // Service status tracking
  serviceStatus: ServiceStatus = {
    initialized: false,
    loading: true,
    error: undefined
  };

  apiStatus = {
    authenticated: false,
    loading: false,
    session: undefined
  };

  syncStatus = {
    online: false,
    pendingItems: 0,
    syncing: false
  };

  storageStats: StorageStatistics | null = null;

  // Port exacto de testCategories desde React líneas 339-346
  testCategories = [
    { key: 'storage', name: 'IndexedDB Storage' },
    { key: 'api', name: 'API Integration (50+ endpoints)' },
    { key: 'payments', name: 'Payment Processing' },
    { key: 'signatures', name: 'E-signature Service' },
    { key: 'serviceWorker', name: 'PWA Service Worker' },
    { key: 'dataSync', name: 'Data Synchronization' }
  ];

  ngOnInit(): void {
    this.initializeServices();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.set([...this.logs().slice(-9), `${timestamp}: ${message}`]);
  }

  updateTestResult(test: string, result: 'success' | 'error'): void {
    this.testResults.set({ ...this.testResults(), [test]: result });
  }

  getStatusText(status?: string): string {
    switch (status) {
      case 'success': return 'Passed';
      case 'error': return 'Failed';
      case 'pending': return 'Running';
      default: return 'Pending';
    }
  }

  trackByTest(_: number, test: any) {
    return test.key;
  }

  trackByLog(_: number, log: string) {
    return log;
  }

  // Initialize services simulation
  async initializeServices(): Promise<void> {
    this.addLog('🔧 Initializing services...');
    
    // Simulate service initialization
    setTimeout(() => {
      this.serviceStatus.initialized = true;
      this.serviceStatus.loading = false;
      this.addLog('✅ Services initialized successfully');
      this.runAllTests();
    }, 2000);
  }

  // Port exacto de testStorage desde React líneas 52-87
  async testStorage(): Promise<void> {
    try {
      this.addLog('Testing IndexedDB storage...');
      this.updateTestResult('storage', 'pending' as any);

      // Simulate storage operations
      const testClient = {
        id: 'test_001',
// removed by clean-audit
// removed by clean-audit
        phone: '5555555555',
        rfc: 'XAXX010101000',
        curp: 'XAXX010101HDFXXX01',
        market: 'edomex',
        createdAt: new Date(),
        lastModified: new Date()
      };

      await this.simulateDelay(500);
      this.addLog('✅ Client stored in IndexedDB');

      await this.simulateDelay(300);
      this.addLog('✅ Client retrieved successfully');
      
      this.storageStats = {
        totalClients: 15,
        totalDocuments: 47,
        totalSize: 2.5 * 1024 * 1024,
        syncQueueSize: 3
      };
      this.addLog(`📊 Storage stats: ${this.storageStats.totalClients} clients`);
      
      this.updateTestResult('storage', 'success');
    } catch (error) {
      this.addLog(`❌ Storage test failed: ${error}`);
      this.updateTestResult('storage', 'error');
    }
  }

  // Port exacto de testOdooApi desde React líneas 90-113
  async testOdooApi(): Promise<void> {
    try {
      this.addLog('Testing API integration...');
      this.updateTestResult('api', 'pending' as any);

      await this.simulateDelay(800);
      this.apiStatus.authenticated = true;
      this.apiStatus.session = 'demo_session_123';
      this.addLog('✅ API authentication successful');

      await this.simulateDelay(600);
      this.addLog('✅ Retrieved 25 clients from API');

      this.updateTestResult('api', 'success');
    } catch (error) {
      this.addLog(`❌ API test failed: ${error}`);
      this.updateTestResult('api', 'error');
    }
  }

  // Port exacto de testPayments desde React líneas 116-151
  async testPayments(): Promise<void> {
    try {
      this.addLog('Testing payment processing...');
      this.updateTestResult('payments', 'pending' as any);

      await this.simulateDelay(700);
      this.addLog('✅ Payment link created: pay_demo_123');
      
      await this.simulateDelay(500);
      this.addLog('✅ OXXO payment created: 987654321');

      this.updateTestResult('payments', 'success');
    } catch (error) {
      this.addLog(`❌ Payment test failed: ${error}`);
      this.updateTestResult('payments', 'error');
    }
  }

  // Port exacto de testSignatures desde React líneas 154-190
  async testSignatures(): Promise<void> {
    try {
      this.addLog('Testing e-signature service...');
      this.updateTestResult('signatures', 'pending' as any);

      await this.simulateDelay(900);
      this.addLog('✅ E-signature connection successful');

      this.updateTestResult('signatures', 'success');
    } catch (error) {
      this.addLog(`❌ Signature test failed: ${error}`);
      this.updateTestResult('signatures', 'error');
    }
  }

  // Port exacto de testServiceWorker desde React líneas 193-225
  async testServiceWorker(): Promise<void> {
    try {
      this.addLog('Testing Service Worker...');
      this.updateTestResult('serviceWorker', 'pending' as any);

      await this.simulateDelay(600);
      this.addLog('✅ Service Worker active, 47 cached items');
      
      await this.simulateDelay(400);
      this.addLog('✅ Document cached via Service Worker');

      this.updateTestResult('serviceWorker', 'success');
    } catch (error) {
      this.addLog(`❌ Service Worker test failed: ${error}`);
      this.updateTestResult('serviceWorker', 'error');
    }
  }

  // Port exacto de testDataSync desde React líneas 228-257
  async testDataSync(): Promise<void> {
    try {
      this.addLog('Testing Data Sync...');
      this.updateTestResult('dataSync', 'pending' as any);

      await this.simulateDelay(700);
      this.syncStatus.online = true;
      this.syncStatus.pendingItems = 2;
      this.addLog('✅ Item queued for sync: sync_001');

      await this.simulateDelay(500);
      this.addLog('📊 Sync status: 2 pending, online: true');

      this.updateTestResult('dataSync', 'success');
    } catch (error) {
      this.addLog(`❌ Data Sync test failed: ${error}`);
      this.updateTestResult('dataSync', 'error');
    }
  }

  async runAllTests(): Promise<void> {
    this.isRunning.set(true);
    this.testResults.set({});
    this.logs.set([]);
    this.addLog('🚀 Starting integration tests...');

    await this.testStorage();
    await this.testOdooApi();
    await this.testPayments();
    await this.testSignatures();
    await this.testServiceWorker();
    await this.testDataSync();

    this.addLog('✨ Integration tests completed!');
    this.isRunning.set(false);
  }

  getTestIcon(test: string): string {
    const result = this.testResults()[test];
    switch (result) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  }

  getStatusIcon(status: boolean): string {
    return status ? '✅' : '❌';
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
// removed by clean-audit