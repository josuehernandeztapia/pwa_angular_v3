import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon.component';

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
  imports: [CommonModule, FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integraciones.component.html',
  styleUrls: ['./integraciones.component.scss']
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
    const integrationName = this.integrations().find(i => i.id === this.selectedIntegration)?.name;
    return this.apiLogs().filter(log => log.integration === integrationName);
  }
}
