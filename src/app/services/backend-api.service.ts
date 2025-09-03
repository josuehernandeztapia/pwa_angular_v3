import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, retry, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

interface ClientRecord {
  id?: string;
  name: string;
  curp: string;
  rfc?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  birth_date?: string;
  monthly_income?: number;
  ecosystem_id?: string;
  advisor_id?: string;
  stage: 'prospecto' | 'cliente' | 'activo' | 'inactivo';
  created_at?: string;
  updated_at?: string;
}

interface ContractRecord {
  id?: string;
  client_id: string;
  contract_number: string;
  ecosystem_id: string;
  vehicle_value: number;
  down_payment: number;
  monthly_payment: number;
  term_months: number;
  interest_rate: number;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  payment_method: 'weekly' | 'biweekly' | 'monthly';
  advisor_id: string;
  created_at?: string;
}

interface EcosystemRecord {
  id?: string;
  name: string;
  route: string;
  market: 'AGS' | 'EDOMEX';
  capacity: number;
  available_spots: number;
  vehicle_type: string;
  requirements: string[];
  weekly_earnings: number;
  monthly_earnings: number;
  status: 'active' | 'inactive' | 'full';
  coordinator_id?: string;
}

interface DashboardData {
  totalClients: number;
  activeContracts: number;
  monthlyRevenue: number;
  conversionRate: string;
  recentActivity: any[];
  ecosystemStats: any[];
  lastUpdated: string;
  isOffline?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BackendApiService {
  private readonly baseUrl = environment.apiUrl;
  private readonly apiKey = '0f06041281c1be1e31b8610ef33da294dda8e64e';
  private isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);

  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) {
    this.setupOnlineListener();
  }

  get isOnline(): Observable<boolean> {
    return this.isOnline$.asObservable();
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline$.next(true);
      this.syncPendingData();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline$.next(false);
    });
  }

  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Client Management
  createClient(clientData: Omit<ClientRecord, 'id'>): Observable<ClientRecord> {
    const url = `${this.baseUrl}${environment.endpoints.clients}`;
    
    return this.http.post<ClientRecord>(url, clientData, { headers: this.getAuthHeaders() }).pipe(
      tap(async (response) => {
        // Cache locally
        await this.storage.saveClient({
          id: response.id!,
          personalInfo: response,
          ecosystemId: clientData.ecosystem_id || '',
          formProgress: {},
          documents: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }),
      catchError((error) => {
        // Queue for offline sync
        (async () => {
          const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const clientWithId = { ...clientData, id: tempId };
          await this.storage.queueOfflineAction({
            type: 'CREATE_CLIENT',
            data: clientWithId,
            retryCount: 0
          });
          await this.storage.saveClient({
            id: tempId,
            personalInfo: clientWithId,
            ecosystemId: clientData.ecosystem_id || '',
            formProgress: {},
            documents: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        })();
        return throwError(() => error);
      })
    );
  }

  updateClient(clientId: string, clientData: Partial<ClientRecord>): Observable<ClientRecord> {
    const url = `${this.baseUrl}${environment.endpoints.clients}/${clientId}`;
    
    return this.http.put<ClientRecord>(url, clientData, { headers: this.getAuthHeaders() }).pipe(
      tap(async (response) => {
        // Update local cache
        const existingClient = await this.storage.getClient(clientId);
        if (existingClient) {
          await this.storage.saveClient({
            ...existingClient,
            personalInfo: response,
            updatedAt: Date.now()
          });
        }
      }),
      catchError((error) => {
        // Queue for offline sync
        (async () => {
          await this.storage.queueOfflineAction({
            type: 'UPDATE_CLIENT',
            data: { clientId, clientData },
            retryCount: 0
          });
        })();
        return throwError(() => error);
      })
    );
  }

  getClient(clientId: string): Observable<ClientRecord> {
    const url = `${this.baseUrl}${environment.endpoints.clients}/${clientId}`;
    
    return this.http.get<ClientRecord>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        // Try to get from local storage
        return new Observable<ClientRecord>((observer) => {
          (async () => {
            const localClient = await this.storage.getClient(clientId);
            if (localClient) {
              observer.next(localClient.personalInfo as ClientRecord);
              observer.complete();
              return;
            }
            observer.error(error);
          })();
        });
      })
    );
  }

  getClients(filters?: any): Observable<ClientRecord[]> {
    const url = `${this.baseUrl}${environment.endpoints.clients}`;
    const options = {
      headers: this.getAuthHeaders(),
      ...(filters ? { params: filters } : {})
    };
    
    return this.http.get<ClientRecord[]>(url, options).pipe(
      catchError((error) => {
        console.error('Error fetching clients:', error);
        // Return empty array for offline mode
        return of([]);
      })
    );
  }

  // Contract Management
  createContract(contractData: Omit<ContractRecord, 'id'>): Observable<ContractRecord> {
    const url = `${this.baseUrl}${environment.endpoints.quotes}`;
    
    return this.http.post<ContractRecord>(url, contractData, { headers: this.getAuthHeaders() }).pipe(
      tap(async (response) => {
        // Cache locally
        await this.storage.saveQuote({
          id: response.id!,
          clientId: contractData.client_id,
          ecosystemId: contractData.ecosystem_id,
          quoteDetails: response,
          createdAt: Date.now(),
          status: 'approved'
        });
      }),
      catchError((error) => {
        // Queue for offline sync
        (async () => {
          const tempId = `temp_contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const contractWithId = { ...contractData, id: tempId };
          await this.storage.queueOfflineAction({
            type: 'CREATE_CONTRACT',
            data: contractWithId,
            retryCount: 0
          });
          await this.storage.saveQuote({
            id: tempId,
            clientId: contractData.client_id,
            ecosystemId: contractData.ecosystem_id,
            quoteDetails: contractWithId,
            createdAt: Date.now(),
            status: 'draft'
          });
        })();
        return throwError(() => error);
      })
    );
  }

  getContract(contractId: string): Observable<ContractRecord> {
    const url = `${this.baseUrl}${environment.endpoints.quotes}/${contractId}`;
    
    return this.http.get<ContractRecord>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        // Try local storage
        return new Observable<ContractRecord>((observer) => {
          (async () => {
            const localQuote = await this.storage.getQuote(contractId);
            if (localQuote) {
              observer.next(localQuote.quoteDetails as ContractRecord);
              observer.complete();
              return;
            }
            observer.error(error);
          })();
        });
      })
    );
  }

  getClientContracts(clientId: string): Observable<ContractRecord[]> {
    const url = `${this.baseUrl}${environment.endpoints.clients}/${clientId}/contracts`;
    
    return this.http.get<ContractRecord[]>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(() => {
        // Try local storage
        return new Observable<ContractRecord[]>((observer) => {
          (async () => {
            const localQuotes = await this.storage.getQuotesByClient(clientId);
            observer.next(localQuotes.map(q => q.quoteDetails as ContractRecord));
            observer.complete();
          })();
        });
      })
    );
  }

  // Ecosystem Management
  getEcosystems(market?: 'AGS' | 'EDOMEX'): Observable<EcosystemRecord[]> {
    const url = `${this.baseUrl}/ecosystems`;
    const options = {
      headers: this.getAuthHeaders(),
      ...(market ? { params: { market } } : {})
    };
    
    return this.http.get<EcosystemRecord[]>(url, options).pipe(
      catchError((error) => {
        console.error('Error fetching ecosystems:', error);
        // Return mock data for offline mode
        return this.getMockEcosystems(market);
      })
    );
  }

  getEcosystem(ecosystemId: string): Observable<EcosystemRecord> {
    const url = `${this.baseUrl}/ecosystems/${ecosystemId}`;
    
    return this.http.get<EcosystemRecord>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error fetching ecosystem:', error);
        return throwError(() => error);
      })
    );
  }

  updateEcosystemCapacity(ecosystemId: string, availableSpots: number): Observable<EcosystemRecord> {
    const url = `${this.baseUrl}/ecosystems/${ecosystemId}/capacity`;
    
    return this.http.patch<EcosystemRecord>(url, { available_spots: availableSpots }, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error updating ecosystem capacity:', error);
        return throwError(() => error);
      })
    );
  }

  // Dashboard and Analytics
  getDashboardData(advisorId?: string): Observable<DashboardData> {
    const url = `${this.baseUrl}${environment.endpoints.reports}/dashboard`;
    const options = {
      headers: this.getAuthHeaders(),
      ...(advisorId ? { params: { advisor_id: advisorId } } : {})
    };
    
    return this.http.get<DashboardData>(url, options).pipe(
      map(data => ({
        ...data,
        lastUpdated: new Date().toISOString()
      })),
      catchError(async (error) => {
        console.error('Error fetching dashboard data:', error);
        
        // Try to get cached stats
        const stats = await this.storage.getStorageStats();
        
        return {
          totalClients: stats.clients,
          activeContracts: stats.quotes,
          monthlyRevenue: 0,
          conversionRate: stats.clients > 0 ? ((stats.quotes / stats.clients) * 100).toFixed(1) : '0',
          recentActivity: [],
          ecosystemStats: [],
          lastUpdated: new Date().toISOString(),
          isOffline: true
        } as DashboardData;
      })
    );
  }

  // File Upload
  uploadDocument(file: File, clientId: string, documentType: string): Observable<any> {
    const url = `${this.baseUrl}${environment.endpoints.documents}/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', clientId);
    formData.append('document_type', documentType);
    
    return this.http.post(url, formData, { headers: { 'Authorization': `Bearer ${this.apiKey}` } }).pipe(
      catchError(async (error) => {
        // Queue for offline sync
        await this.storage.queueOfflineAction({
          type: 'UPLOAD_DOCUMENT',
          data: { file: file.name, clientId, documentType },
          retryCount: 0
        });

        return throwError(() => error);
      })
    );
  }

  // Sync Management
  private async syncPendingData(): Promise<void> {
    try {
      const pendingActions = await this.storage.getPendingActions();
      const actionsArray = Array.isArray(pendingActions) ? pendingActions : [];
      
      for (const action of actionsArray) {
        try {
          await this.executeAction(action);
          await this.storage.removeCompletedAction(action.id);
          console.log('Synced action:', action.type);
        } catch (error) {
          console.error('Failed to sync action:', action.type, error);
          // Could implement exponential backoff here
        }
      }
    } catch (error) {
      console.error('Failed to sync pending data:', error);
    }
  }

  private async executeAction(action: any): Promise<void> {
    switch (action.type) {
      case 'CREATE_CLIENT':
        await this.createClient(action.data).toPromise();
        break;
      case 'UPDATE_CLIENT':
        await this.updateClient(action.data.clientId, action.data.clientData).toPromise();
        break;
      case 'CREATE_CONTRACT':
        await this.createContract(action.data).toPromise();
        break;
      case 'UPLOAD_DOCUMENT':
        // Would need to re-implement file upload from cached data
        console.warn('Document upload sync not implemented yet');
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  // Mock data for development/offline mode
  private getMockEcosystems(market?: 'AGS' | 'EDOMEX'): Observable<EcosystemRecord[]> {
    const mockData: EcosystemRecord[] = [
      {
        id: '1',
        name: 'Ruta Centro AGS',
        route: 'Centro - Plaza Vestir - Macroplaza',
        market: 'AGS',
        capacity: 50,
        available_spots: 12,
        vehicle_type: 'Microbus',
        requirements: ['Licencia tipo B', 'Experiencia 2 años'],
        weekly_earnings: 3500,
        monthly_earnings: 14000,
        status: 'active'
      },
      {
        id: '2',
        name: 'Ruta Norte EdoMex',
        route: 'Ecatepec - Tlalnepantla - Metro Cuatro Caminos',
        market: 'EDOMEX',
        capacity: 80,
        available_spots: 5,
        vehicle_type: 'Combi',
        requirements: ['Licencia tipo A', 'Aval solidario'],
        weekly_earnings: 4200,
        monthly_earnings: 16800,
        status: 'active'
      },
      {
        id: '3',
        name: 'Ruta Sur AGS',
        route: 'San Marcos - Universidad - Centro',
        market: 'AGS',
        capacity: 40,
        available_spots: 8,
        vehicle_type: 'Microbus',
        requirements: ['Licencia tipo B', 'Aval familiar'],
        weekly_earnings: 3200,
        monthly_earnings: 12800,
        status: 'active'
      },
      {
        id: '4',
        name: 'Ruta Oriente EdoMex',
        route: 'Chimalhuacán - Metro Los Reyes - Centro',
        market: 'EDOMEX',
        capacity: 60,
        available_spots: 15,
        vehicle_type: 'Combi',
        requirements: ['Licencia tipo A', 'Experiencia 1 año'],
        weekly_earnings: 3800,
        monthly_earnings: 15200,
        status: 'active'
      },
      {
        id: '5',
        name: 'Nueva Ruta en Prospección AGS',
        route: 'Ruta por definir - En evaluación',
        market: 'AGS',
        capacity: 0,
        available_spots: 0,
        vehicle_type: 'Por definir',
        requirements: ['Por definir'],
        weekly_earnings: 0,
        monthly_earnings: 0,
        status: 'inactive'
      },
      {
        id: '6',
        name: 'Nueva Ruta en Prospección EdoMex',
        route: 'Ruta por definir - En evaluación',
        market: 'EDOMEX',
        capacity: 0,
        available_spots: 0,
        vehicle_type: 'Por definir',
        requirements: ['Por definir'],
        weekly_earnings: 0,
        monthly_earnings: 0,
        status: 'inactive'
      }
    ];
    
    const filtered = market ? mockData.filter(eco => eco.market === market) : mockData;
    return new Observable(observer => {
      observer.next(filtered);
      observer.complete();
    });
  }

  // Health check
  healthCheck(): Observable<{ status: string; timestamp: string }> {
    const url = `${this.baseUrl}/health`;
    
    return this.http.get<{ status: string; timestamp: string }>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError(() => of({ status: 'offline', timestamp: new Date().toISOString() }))
    );
  }
}