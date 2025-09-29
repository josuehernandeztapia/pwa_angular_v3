import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconRegistryService } from './icon/icon-definitions';
import { IconComponent } from './icon/icon.component';

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
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integration-demo.component.html',
  styleUrls: ['./integration-demo.component.scss']
})
export class IntegrationDemoComponent implements OnInit, OnDestroy {
  testResults = signal<TestResult>({});
  logs = signal<string[]>([]);
  isRunning = signal(false);
  private readonly setupIcon: string;

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

  constructor(private iconRegistry: IconRegistryService) {
    this.setupIcon = this.iconRegistry.toSvg('settings', {
      className: 'icon-16',
      color: 'var(--color-text-secondary)'
    });
  }

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

  getOverallStatusClasses(): Record<string, boolean> {
    const state = this.getIntegrationState();
    return {
      'integration-demo__status-chip--completed': state === 'completed',
      'integration-demo__status-chip--in-transit': state === 'active',
      'integration-demo__status-chip--delayed': state === 'delayed'
    };
  }

  getStatusDotClasses(): Record<string, boolean> {
    const state = this.getIntegrationState();
    return {
      'integration-demo__status-dot--completed': state === 'completed',
      'integration-demo__status-dot--active': state === 'active',
      'integration-demo__status-dot--delayed': state === 'delayed'
    };
  }

  getOverallStatusLabel(): string {
    const state = this.getIntegrationState();
    switch (state) {
      case 'completed':
        return 'Integrations healthy';
      case 'active':
        return 'Integrations initializing';
      default:
        return 'Integrations offline';
    }
  }

  getIndicatorClasses(condition: boolean): Record<string, boolean> {
    return {
      'integration-demo__indicator--success': condition,
      'integration-demo__indicator--error': !condition
    };
  }

  getServiceInitializedClasses(isInitialized: boolean): Record<string, boolean> {
    return {
      'integration-demo__text--success': isInitialized,
      'integration-demo__text--error': !isInitialized
    };
  }

  getServiceLoadingClasses(isLoading: boolean): Record<string, boolean> {
    return {
      'integration-demo__text--warning': isLoading,
      'integration-demo__text--success': !isLoading
    };
  }

  getApiAuthClasses(isAuthenticated: boolean): Record<string, boolean> {
    return {
      'integration-demo__text--success': isAuthenticated,
      'integration-demo__text--error': !isAuthenticated
    };
  }

  getSyncStatusClasses(isOnline: boolean): Record<string, boolean> {
    return {
      'integration-demo__text--success': isOnline,
      'integration-demo__text--error': !isOnline
    };
  }

  getTestStatusClasses(status?: 'pending' | 'success' | 'error'): Record<string, boolean> {
    return {
      'integration-demo__status--success': status === 'success',
      'integration-demo__status--error': status === 'error',
      'integration-demo__status--pending': status === 'pending',
      'integration-demo__status--idle': !status
    };
  }

  private getIntegrationState(): 'completed' | 'active' | 'delayed' {
    const states = [
      this.serviceStatus.initialized,
      this.apiStatus.authenticated,
      this.syncStatus.online
    ];

    if (states.every(Boolean)) {
      return 'completed';
    }

    if (states.some(Boolean)) {
      return 'active';
    }

    return 'delayed';
  }

  trackByTest(_: number, test: any) {
    return test.key;
  }

  trackByLog(_: number, log: string) {
    return log;
  }

  // Initialize services simulation
  async initializeServices(): Promise<void> {
    this.addLog(`${this.setupIcon} Initializing services...`);
    
    // Simulate service initialization
    setTimeout(() => {
      this.serviceStatus.initialized = true;
      this.serviceStatus.loading = false;
      this.addLog(' Services initialized successfully');
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
        phone: '5555555555',
        rfc: 'XAXX010101000',
        curp: 'XAXX010101HDFXXX01',
        market: 'edomex',
        createdAt: new Date(),
        lastModified: new Date()
      };

      await this.simulateDelay(500);
      this.addLog(' Client stored in IndexedDB');

      await this.simulateDelay(300);
      this.addLog(' Client retrieved successfully');
      
      this.storageStats = {
        totalClients: 15,
        totalDocuments: 47,
        totalSize: 2.5 * 1024 * 1024,
        syncQueueSize: 3
      };
      this.addLog(` Storage stats: ${this.storageStats.totalClients} clients`);
      
      this.updateTestResult('storage', 'success');
    } catch (error) {
      this.addLog(` Storage test failed: ${error}`);
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
      this.addLog(' API authentication successful');

      await this.simulateDelay(600);
      this.addLog(' Retrieved 25 clients from API');

      this.updateTestResult('api', 'success');
    } catch (error) {
      this.addLog(` API test failed: ${error}`);
      this.updateTestResult('api', 'error');
    }
  }

  // Port exacto de testPayments desde React líneas 116-151
  async testPayments(): Promise<void> {
    try {
      this.addLog('Testing payment processing...');
      this.updateTestResult('payments', 'pending' as any);

      await this.simulateDelay(700);
      this.addLog(' Payment link created: pay_demo_123');
      
      await this.simulateDelay(500);
      this.addLog(' OXXO payment created: 987654321');

      this.updateTestResult('payments', 'success');
    } catch (error) {
      this.addLog(` Payment test failed: ${error}`);
      this.updateTestResult('payments', 'error');
    }
  }

  // Port exacto de testSignatures desde React líneas 154-190
  async testSignatures(): Promise<void> {
    try {
      this.addLog('Testing e-signature service...');
      this.updateTestResult('signatures', 'pending' as any);

      await this.simulateDelay(900);
      this.addLog(' E-signature connection successful');

      this.updateTestResult('signatures', 'success');
    } catch (error) {
      this.addLog(` Signature test failed: ${error}`);
      this.updateTestResult('signatures', 'error');
    }
  }

  // Port exacto de testServiceWorker desde React líneas 193-225
  async testServiceWorker(): Promise<void> {
    try {
      this.addLog('Testing Service Worker...');
      this.updateTestResult('serviceWorker', 'pending' as any);

      await this.simulateDelay(600);
      this.addLog(' Service Worker active, 47 cached items');
      
      await this.simulateDelay(400);
      this.addLog(' Document cached via Service Worker');

      this.updateTestResult('serviceWorker', 'success');
    } catch (error) {
      this.addLog(` Service Worker test failed: ${error}`);
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
      this.addLog(' Item queued for sync: sync_001');

      await this.simulateDelay(500);
      this.addLog(' Sync status: 2 pending, online: true');

      this.updateTestResult('dataSync', 'success');
    } catch (error) {
      this.addLog(` Data Sync test failed: ${error}`);
      this.updateTestResult('dataSync', 'error');
    }
  }

  async runAllTests(): Promise<void> {
    this.isRunning.set(true);
    this.testResults.set({});
    this.logs.set([]);
    this.addLog(' Starting integration tests...');

    await this.testStorage();
    await this.testOdooApi();
    await this.testPayments();
    await this.testSignatures();
    await this.testServiceWorker();
    await this.testDataSync();

    this.addLog(' Integration tests completed!');
    this.isRunning.set(false);
  }

  getTestIcon(test: string): string {
    const result = this.testResults()[test];
    switch (result) {
      case 'success': return 'PASS';
      case 'error': return 'FAIL';
      case 'pending': return 'RUN';
      default: return 'WAIT';
    }
  }

  getStatusIcon(status: boolean): string {
    return status ? 'OK' : 'ERR';
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
