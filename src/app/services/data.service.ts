import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import { Client } from '../models/types';
import { Quote, CompleteBusinessScenario } from '../models/business';
import { getDemoClients, getDemoQuotes } from '../demo/demo-seed';

export interface DataState {
  clients: Client[];
  quotes: Quote[];
  scenarios: CompleteBusinessScenario[];
  loading: boolean;
  error: string | null;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dataState = new BehaviorSubject<DataState>({
    clients: [],
    quotes: [],
    scenarios: [],
    loading: false,
    error: null
  });

  public dataState$ = this.dataState.asObservable();
  private initTimer: any = null;
  private readonly isTestEnv = typeof (globalThis as any).jasmine !== 'undefined' || typeof (globalThis as any).__karma__ !== 'undefined';

  constructor() {
    this.initializeData();
  }

  /**
   */
  private initializeData(): void {
    this.setLoading(true);

    // Cancel any pending initialization to avoid cross-test emissions
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }

    const load = () => {
      const demoClients: Client[] = getDemoClients();
      const demoQuotes: Quote[] = getDemoQuotes();

      this.updateDataState({
        clients: demoClients,
        quotes: demoQuotes,
        loading: false,
        error: null
      });
    };

    if (this.isTestEnv) {
      // Load immediately in test to ensure determinism
      load();
    } else {
      // Simulate data loading delay in non-test environments
      this.initTimer = setTimeout(load, 1500);
    }
  }

  /**
   * Get all clients with pagination
   */
  getClients(options?: PaginationOptions): Observable<PaginatedResult<Client>> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const clients = this.dataState.value.clients;
        const page = options?.page || 1;
        const limit = options?.limit || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        // Apply filters
        let filteredClients = clients;
        if (options?.filters) {
          filteredClients = this.applyFilters(clients, options.filters);
        }

        // Apply sorting
        if (options?.sortBy) {
          filteredClients = this.applySorting(
            filteredClients,
            options.sortBy,
            options.sortOrder || 'asc'
          );
        }

        const paginatedData = filteredClients.slice(startIndex, endIndex);

        return {
          data: paginatedData,
          total: filteredClients.length,
          page,
          limit,
          totalPages: Math.ceil(filteredClients.length / limit)
        };
      })
    );
  }

  /**
   * Get client by ID
   */
  getClientById(id: string): Observable<Client | null> {
    return of(null).pipe(
      delay(300),
      map(() => {
        const client = this.dataState.value.clients.find(c => c.id === id);
        return client || null;
      })
    );
  }

  /**
   * Create new client
   */
  createClient(clientData: Partial<Client>): Observable<Client> {
    return of(null).pipe(
      delay(1000),
      map(() => {
        const newClient: Client = {
          id: Date.now().toString(),
          name: clientData.name || '',
          avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
          flow: clientData.flow || 'Venta a Plazo' as any,
          status: 'Nuevo',
          healthScore: 0,
          documents: [],
          events: [],
          ...clientData
        };

        const currentState = this.dataState.value;
        this.updateDataState({
          clients: [...currentState.clients, newClient]
        });

        return newClient;
      }),
      catchError(error => {
        this.setError('Error creating client: ' + error.message);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update existing client
   */
  updateClient(id: string, updates: Partial<Client>): Observable<Client> {
    return of(null).pipe(
      delay(800),
      map(() => {
        const currentState = this.dataState.value;
        const clientIndex = currentState.clients.findIndex(c => c.id === id);

        if (clientIndex === -1) {
          throw new Error('Client not found');
        }

        const updatedClient = { ...currentState.clients[clientIndex], ...updates };
        const updatedClients = [...currentState.clients];
        updatedClients[clientIndex] = updatedClient;

        this.updateDataState({
          clients: updatedClients
        });

        return updatedClient;
      }),
      catchError(error => {
        this.setError('Error updating client: ' + error.message);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete client
   */
  deleteClient(id: string): Observable<boolean> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const currentState = this.dataState.value;
        const filteredClients = currentState.clients.filter(c => c.id !== id);

        if (filteredClients.length === currentState.clients.length) {
          throw new Error('Client not found');
        }

        this.updateDataState({
          clients: filteredClients
        });

        return true;
      }),
      catchError(error => {
        this.setError('Error deleting client: ' + error.message);
        return throwError(() => error);
      })
    );
  }

  /**
   * Save business scenario
   */
  saveScenario(scenario: CompleteBusinessScenario): Observable<CompleteBusinessScenario> {
    return of(null).pipe(
      delay(1000),
      map(() => {
        const currentState = this.dataState.value;
        const existingIndex = currentState.scenarios.findIndex(s => s.id === scenario.id);

        let updatedScenarios: CompleteBusinessScenario[];
        if (existingIndex >= 0) {
          // Update existing scenario
          updatedScenarios = [...currentState.scenarios];
          updatedScenarios[existingIndex] = scenario;
        } else {
          // Add new scenario
          updatedScenarios = [...currentState.scenarios, scenario];
        }

        this.updateDataState({
          scenarios: updatedScenarios
        });

        return scenario;
      }),
      catchError(error => {
        this.setError('Error saving scenario: ' + error.message);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get scenarios for a client
   */
  getClientScenarios(clientId: string): Observable<CompleteBusinessScenario[]> {
    return of(null).pipe(
      delay(300),
      map(() => {
        const scenarios = this.dataState.value.scenarios.filter(
          s => s.clientName.toLowerCase().includes(clientId.toLowerCase())
        );
        return scenarios;
      })
    );
  }

  /**
   * Search across all data
   */
  globalSearch(query: string): Observable<{
    clients: Client[];
    scenarios: CompleteBusinessScenario[];
    total: number;
  }> {
    return of(null).pipe(
      delay(400),
      map(() => {
        const lowerQuery = query.toLowerCase();
        const currentState = this.dataState.value;

        const matchingClients = currentState.clients.filter(client =>
          client.name.toLowerCase().includes(lowerQuery) ||
          client.status.toLowerCase().includes(lowerQuery)
        );

        const matchingScenarios = currentState.scenarios.filter(scenario =>
          scenario.clientName.toLowerCase().includes(lowerQuery) ||
          scenario.seniorSummary.title.toLowerCase().includes(lowerQuery)
        );

        return {
          clients: matchingClients,
          scenarios: matchingScenarios,
          total: matchingClients.length + matchingScenarios.length
        };
      })
    );
  }

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): Observable<{
    totalClients: number;
    activeClients: number;
    totalQuotes: number;
    totalScenarios: number;
    recentActivity: Array<{
      type: string;
      message: string;
      timestamp: Date;
    }>;
  }> {
    return of(null).pipe(
      delay(200),
      map(() => {
        const currentState = this.dataState.value;
        
        return {
          totalClients: currentState.clients.length,
          activeClients: currentState.clients.filter(c => c.status === 'Activo').length,
          totalQuotes: currentState.quotes.length,
          totalScenarios: currentState.scenarios.length,
          recentActivity: [
            {
              type: 'client',
              message: 'Nuevo cliente registrado: Juan Pérez',
              timestamp: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
            },
            {
              type: 'quote',
              message: 'Cotización AGS generada para María García',
              timestamp: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
            },
            {
              type: 'scenario',
              message: 'Simulación de tanda completada',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            }
          ]
        };
      })
    );
  }

  /**
   * Export data to different formats
   */
  exportData(format: 'json' | 'csv', dataType: 'clients' | 'scenarios' | 'all'): Observable<Blob> {
    return of(null).pipe(
      delay(1000),
      map(() => {
        const currentState = this.dataState.value;
        let data: any;

        switch (dataType) {
          case 'clients':
            data = currentState.clients;
            break;
          case 'scenarios':
            data = currentState.scenarios;
            break;
          case 'all':
            data = {
              clients: currentState.clients,
              scenarios: currentState.scenarios,
              exportedAt: new Date().toISOString()
            };
            break;
        }

        if (format === 'json') {
          const jsonString = JSON.stringify(data, null, 2);
          return new Blob([jsonString], { type: 'application/json' });
        } else {
          // Convert to CSV (simplified)
          const csvString = this.convertToCSV(data);
          return new Blob([csvString], { type: 'text/csv' });
        }
      })
    );
  }

  /**
   * Clear all error states
   */
  clearErrors(): void {
    this.updateDataState({ error: null });
  }

  /**
   * Refresh all data
   */
  refreshData(): Observable<boolean> {
    this.setLoading(true);
    return of(true).pipe(
      delay(this.isTestEnv ? 0 : 1000),
      map(() => {
        this.initializeData();
        return true;
      })
    );
  }

  // Private helper methods

  private updateDataState(updates: Partial<DataState>): void {
    const currentState = this.dataState.value;
    this.dataState.next({ ...currentState, ...updates });
  }

  private setLoading(loading: boolean): void {
    this.updateDataState({ loading });
  }

  private setError(error: string): void {
    this.updateDataState({ error, loading: false });
  }

  private applyFilters(data: any[], filters: Record<string, any>): any[] {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const itemValue = item[key];
        if (typeof itemValue === 'string' && typeof value === 'string') {
          // Strict equality for string filters to avoid partial matches (e.g., 'active' vs 'inactive')
          return itemValue.toLowerCase() === value.toLowerCase();
        }
        return itemValue === value;
      });
    });
  }

  private applySorting(data: any[], sortBy: string, sortOrder: 'asc' | 'desc'): any[] {
    return data.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private convertToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }
}
