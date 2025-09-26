import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  type: 'webhook' | 'api' | 'sync';
  lastSync?: string;
  endpoint?: string;
  requests: number;
  errors: number;
}

interface APILog {
  id: string;
  integration: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  status: number;
  timestamp: string;
  duration: number;
  request?: any;
  response?: any;
}

@Component({
  selector: 'app-integraciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Skip Link for Accessibility -->
    <a class="skip-link" href="#main-content">Saltar al contenido principal</a>

    <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
      <!-- Header -->
      <header class="bg-surface border-b border-border px-4 sm:px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1 truncate">
              🔗 Integraciones
            </h1>
            <p class="text-sm text-slate-600 dark:text-slate-400 truncate">
              Gestión de APIs externas y sincronizaciones
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <div class="text-xs text-slate-600 dark:text-slate-400">
              Última actualización: {{ lastUpdate() | date:'short' }}
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main id="main-content" class="max-w-7xl mx-auto p-6 space-y-6">

        <!-- System Status -->
        <section class="ui-card">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Estado del Sistema
            </h2>
            <button class="ui-btn ui-btn-secondary text-sm" (click)="refreshStatus()">
              🔄 Actualizar
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ getTotalIntegrations() }}</div>
              <div class="text-xs text-slate-600 dark:text-slate-400">Total Integraciones</div>
            </div>
            <div class="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div class="text-2xl font-bold text-green-700 dark:text-green-400">{{ getActiveIntegrations() }}</div>
              <div class="text-xs text-green-600 dark:text-green-500">Activas</div>
            </div>
            <div class="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div class="text-2xl font-bold text-red-700 dark:text-red-400">{{ getTotalErrors() }}</div>
              <div class="text-xs text-red-600 dark:text-red-500">Errores 24h</div>
            </div>
            <div class="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div class="text-2xl font-bold text-blue-700 dark:text-blue-400">{{ getTotalRequests() }}</div>
              <div class="text-xs text-blue-600 dark:text-blue-500">Requests 24h</div>
            </div>
          </div>
        </section>

        <!-- Integrations List -->
        <section class="ui-card">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Integraciones Configuradas
            </h2>
            <button class="ui-btn ui-btn-primary">
              ➕ Nueva Integración
            </button>
          </div>

          <div class="space-y-4">
            <div *ngFor="let integration of integrations(); trackBy: trackByIntegration"
                 class="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">

              <!-- Integration Header -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                  <div class="w-3 h-3 rounded-full"
                       [class.bg-green-500]="integration.status === 'active'"
                       [class.bg-yellow-500]="integration.status === 'testing'"
                       [class.bg-red-500]="integration.status === 'error'"
                       [class.bg-slate-400]="integration.status === 'inactive'"></div>
                  <h3 class="text-base font-medium text-slate-900 dark:text-slate-100">{{ integration.name }}</h3>
                  <span class="px-2 py-1 text-xs rounded"
                        [class.bg-blue-100]="integration.type === 'api'"
                        [class.text-blue-700]="integration.type === 'api'"
                        [class.dark:bg-blue-900/30]="integration.type === 'api'"
                        [class.dark:text-blue-400]="integration.type === 'api'"
                        [class.bg-purple-100]="integration.type === 'webhook'"
                        [class.text-purple-700]="integration.type === 'webhook'"
                        [class.dark:bg-purple-900/30]="integration.type === 'webhook'"
                        [class.dark:text-purple-400]="integration.type === 'webhook'"
                        [class.bg-orange-100]="integration.type === 'sync'"
                        [class.text-orange-700]="integration.type === 'sync'"
                        [class.dark:bg-orange-900/30]="integration.type === 'sync'"
                        [class.dark:text-orange-400]="integration.type === 'sync'">
                    {{ integration.type.toUpperCase() }}
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <button class="ui-btn ui-btn-secondary text-xs" (click)="testIntegration(integration)">
                    🧪 Test
                  </button>
                  <button class="ui-btn ui-btn-secondary text-xs" (click)="editIntegration(integration)">
                    ⚙️ Config
                  </button>
                </div>
              </div>

              <!-- Integration Details -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div class="text-slate-600 dark:text-slate-400 text-xs mb-1">Descripción</div>
                  <div class="text-slate-900 dark:text-slate-100">{{ integration.description }}</div>
                </div>
                <div>
                  <div class="text-slate-600 dark:text-slate-400 text-xs mb-1">Última Sincronización</div>
                  <div class="text-slate-900 dark:text-slate-100">
                    {{ integration.lastSync ? (integration.lastSync | date:'short') : 'Nunca' }}
                  </div>
                </div>
                <div>
                  <div class="text-slate-600 dark:text-slate-400 text-xs mb-1">Requests / Errores</div>
                  <div class="text-slate-900 dark:text-slate-100">
                    <span class="text-green-600 dark:text-green-400">{{ integration.requests }}</span> /
                    <span class="text-red-600 dark:text-red-400">{{ integration.errors }}</span>
                  </div>
                </div>
              </div>

              <!-- Endpoint Info -->
              <div *ngIf="integration.endpoint" class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div class="text-slate-600 dark:text-slate-400 text-xs mb-1">Endpoint</div>
                <code class="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-900 dark:text-slate-100">{{ integration.endpoint }}</code>
              </div>
            </div>
          </div>
        </section>

        <!-- API Logs -->
        <section class="ui-card">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Logs de API
            </h2>
            <div class="flex items-center space-x-2">
              <select class="ui-input text-sm" [(ngModel)]="selectedIntegration">
                <option value="">Todas las integraciones</option>
                <option *ngFor="let integration of integrations()" [value]="integration.id">
                  {{ integration.name }}
                </option>
              </select>
              <button class="ui-btn ui-btn-secondary text-sm" (click)="refreshLogs()">
                🔄 Actualizar
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading()" class="space-y-3">
            <div *ngFor="let i of [1,2,3,4,5]" class="animate-pulse">
              <div class="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
          </div>

          <!-- Logs List -->
          <div *ngIf="!isLoading()" class="space-y-2">
            <div *ngFor="let log of getFilteredLogs(); trackBy: trackByLog"
                 class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">

              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-3">
                  <span class="px-2 py-1 text-xs rounded font-mono"
                        [class.bg-green-100]="log.status < 300"
                        [class.text-green-700]="log.status < 300"
                        [class.dark:bg-green-900/30]="log.status < 300"
                        [class.dark:text-green-400]="log.status < 300"
                        [class.bg-yellow-100]="log.status >= 300 && log.status < 400"
                        [class.text-yellow-700]="log.status >= 300 && log.status < 400"
                        [class.dark:bg-yellow-900/30]="log.status >= 300 && log.status < 400"
                        [class.dark:text-yellow-400]="log.status >= 300 && log.status < 400"
                        [class.bg-red-100]="log.status >= 400"
                        [class.text-red-700]="log.status >= 400"
                        [class.dark:bg-red-900/30]="log.status >= 400"
                        [class.dark:text-red-400]="log.status >= 400">
                    {{ log.status }}
                  </span>
                  <span class="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 rounded font-mono text-slate-700 dark:text-slate-300">
                    {{ log.method }}
                  </span>
                  <span class="text-sm text-slate-900 dark:text-slate-100">{{ log.integration }}</span>
                </div>
                <div class="flex items-center space-x-3 text-xs text-slate-600 dark:text-slate-400">
                  <span>{{ log.duration }}ms</span>
                  <span>{{ log.timestamp | date:'short' }}</span>
                </div>
              </div>

              <div class="text-xs text-slate-600 dark:text-slate-400 mb-2">
                <code class="bg-slate-200 dark:bg-slate-700 px-1 rounded">{{ log.endpoint }}</code>
              </div>

              <div *ngIf="expandedLog === log.id" class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div *ngIf="log.request">
                    <div class="text-xs text-slate-600 dark:text-slate-400 mb-2">Request</div>
                    <pre class="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto text-slate-900 dark:text-slate-100">{{ log.request | json }}</pre>
                  </div>
                  <div *ngIf="log.response">
                    <div class="text-xs text-slate-600 dark:text-slate-400 mb-2">Response</div>
                    <pre class="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto text-slate-900 dark:text-slate-100">{{ log.response | json }}</pre>
                  </div>
                </div>
              </div>

              <button class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      (click)="toggleLogExpansion(log.id)">
                {{ expandedLog === log.id ? '🔼 Ocultar detalles' : '🔽 Ver detalles' }}
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  `,
  styles: []
})
export class IntegracionesComponent implements OnInit {
  integrations = signal<Integration[]>([]);
  apiLogs = signal<APILog[]>([]);
  isLoading = signal(true);
  lastUpdate = signal(new Date());
  selectedIntegration = '';
  expandedLog: string | null = null;

  ngOnInit(): void {
    this.loadIntegrations();
    this.loadAPILogs();
  }

  private loadIntegrations(): void {
    // Simulate loading integrations
    const mockIntegrations: Integration[] = [
      {
        id: '1',
        name: 'Odoo ERP',
        description: 'Sincronización de clientes y cotizaciones',
        status: 'active',
        type: 'api',
        lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        endpoint: 'https://api.odoo.company.com/v1/sync',
        requests: 1247,
        errors: 3
      },
      {
        id: '2',
        name: 'NEON Banking',
        description: 'Validación de cuentas bancarias',
        status: 'active',
        type: 'webhook',
        lastSync: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        endpoint: 'https://api.neon.com/validate',
        requests: 456,
        errors: 0
      },
      {
        id: '3',
        name: 'SMS Gateway',
        description: 'Notificaciones automáticas',
        status: 'testing',
        type: 'api',
        lastSync: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        endpoint: 'https://sms.provider.com/send',
        requests: 89,
        errors: 2
      },
      {
        id: '4',
        name: 'Callback System',
        description: 'Webhooks para actualizaciones externas',
        status: 'inactive',
        type: 'webhook',
        requests: 0,
        errors: 0
      }
    ];

    setTimeout(() => {
      this.integrations.set(mockIntegrations);
      this.isLoading.set(false);
    }, 1000);
  }

  private loadAPILogs(): void {
    // Simulate loading API logs
    const mockLogs: APILog[] = [
      {
        id: '1',
        integration: 'Odoo ERP',
        method: 'POST',
        endpoint: '/v1/sync/clients',
        status: 200,
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        duration: 234,
        request: { client_id: '12345', action: 'sync' },
        response: { success: true, synced: 15 }
      },
      {
        id: '2',
        integration: 'NEON Banking',
        method: 'GET',
        endpoint: '/validate/account',
        status: 200,
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        duration: 156,
        request: { account: '1234567890' },
        response: { valid: true, bank: 'BBVA' }
      },
      {
        id: '3',
        integration: 'SMS Gateway',
        method: 'POST',
        endpoint: '/send',
        status: 429,
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        duration: 89,
        request: { to: '+52555123456', message: 'Test' },
        response: { error: 'Rate limit exceeded' }
      }
    ];

    this.apiLogs.set(mockLogs);
  }

  refreshStatus(): void {
    this.lastUpdate.set(new Date());
    this.loadIntegrations();
  }

  refreshLogs(): void {
    this.isLoading.set(true);
    this.loadAPILogs();
    setTimeout(() => this.isLoading.set(false), 500);
  }

  testIntegration(integration: Integration): void {
  }

  editIntegration(integration: Integration): void {
  }

  toggleLogExpansion(logId: string): void {
    this.expandedLog = this.expandedLog === logId ? null : logId;
  }

  trackByIntegration(_: number, integration: Integration): string {
    return integration.id;
  }

  trackByLog(_: number, log: APILog): string {
    return log.id;
  }

  getTotalIntegrations(): number {
    return this.integrations().length;
  }

  getActiveIntegrations(): number {
    return this.integrations().filter(i => i.status === 'active').length;
  }

  getTotalErrors(): number {
    return this.integrations().reduce((sum, i) => sum + i.errors, 0);
  }

  getTotalRequests(): number {
    return this.integrations().reduce((sum, i) => sum + i.requests, 0);
  }

  getFilteredLogs(): APILog[] {
    if (!this.selectedIntegration) {
      return this.apiLogs();
    }
    return this.apiLogs().filter(log =>
      log.integration === this.integrations().find(i => i.id === this.selectedIntegration)?.name
    );
  }
}
