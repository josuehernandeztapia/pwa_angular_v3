import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, interval } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { 
  Client, 
  Notification, 
  Quote, 
  NavigationContext,
  View,
  CompleteBusinessScenario 
} from '../models/types';
import { ClientDataService } from './data/client-data.service';
import { EcosystemDataService } from './data/ecosystem-data.service';
import { CollectiveGroupDataService } from './data/collective-group-data.service';
// removed by clean-audit

@Injectable({
  providedIn: 'root'
})
export class StateManagementService {
  
  // Port exacto de App.tsx state
  private activeViewSubject = new BehaviorSubject<View>('dashboard');
  private clientsSubject = new BehaviorSubject<Client[]>([]);
  private selectedClientSubject = new BehaviorSubject<Client | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private simulatingClientSubject = new BehaviorSubject<Client | null>(null);
  private simulationModeSubject = new BehaviorSubject<'acquisition' | 'savings'>('acquisition');
  private sidebarAlertsSubject = new BehaviorSubject<{ [key in View]?: number }>({});
  private isSidebarCollapsedSubject = new BehaviorSubject<boolean>(false);
  private isOpportunityModalOpenSubject = new BehaviorSubject<boolean>(false);
  private navigationContextSubject = new BehaviorSubject<NavigationContext | null>(null);

  // Public observables - Port exacto de React state getters
  public activeView$ = this.activeViewSubject.asObservable();
  public clients$ = this.clientsSubject.asObservable();
  public selectedClient$ = this.selectedClientSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public simulatingClient$ = this.simulatingClientSubject.asObservable();
  public simulationMode$ = this.simulationModeSubject.asObservable();
  public sidebarAlerts$ = this.sidebarAlertsSubject.asObservable();
  public isSidebarCollapsed$ = this.isSidebarCollapsedSubject.asObservable();
  public isOpportunityModalOpen$ = this.isOpportunityModalOpenSubject.asObservable();
  public navigationContext$ = this.navigationContextSubject.asObservable();

  // Getters for current state values
  get currentActiveView(): View { return this.activeViewSubject.value; }
  get currentClients(): Client[] { return this.clientsSubject.value; }
  get currentSelectedClient(): Client | null { return this.selectedClientSubject.value; }
  get currentIsLoading(): boolean { return this.isLoadingSubject.value; }
  get currentNotifications(): Notification[] { return this.notificationsSubject.value; }
  get currentUnreadCount(): number { return this.unreadCountSubject.value; }
  get currentSimulatingClient(): Client | null { return this.simulatingClientSubject.value; }
  get currentSimulationMode(): 'acquisition' | 'savings' { return this.simulationModeSubject.value; }
  get currentSidebarAlerts(): { [key in View]?: number } { return this.sidebarAlertsSubject.value; }
  get currentIsSidebarCollapsed(): boolean { return this.isSidebarCollapsedSubject.value; }
  get currentIsOpportunityModalOpen(): boolean { return this.isOpportunityModalOpenSubject.value; }
  get currentNavigationContext(): NavigationContext | null { return this.navigationContextSubject.value; }

  constructor(
    private clientDataService: ClientDataService,
    private ecosystemDataService: EcosystemDataService,
    private collectiveGroupDataService: CollectiveGroupDataService,
    private mockApiService: MockApiService
  ) {
    this.initializeState();
    this.startNotificationPolling();
  }

  /**
   * Port exacto de useEffect(() => { fetchClients(); }, [fetchClients])
   */
  private initializeState(): void {
    this.fetchClients().subscribe();
  }

  /**
   * Port exacto de calculateSidebarAlerts callback desde App.tsx
   */
  calculateSidebarAlerts(clients: Client[]): Observable<{ [key in View]?: number }> {
    if (clients.length === 0) {
      return new BehaviorSubject({}).asObservable();
    }

    return this.mockApiService.getDashboardStats().pipe(
      map(stats => {
        // Port exacto de getSidebarAlertCounts logic desde simulationService
        const alerts: { [key in View]?: number } = {};
        
        // Calculate alerts based on client states and business logic
        const pendingDocs = clients.filter(c => 
          c.status === 'Expediente Pendiente' || 
          c.documents?.some(doc => doc.status === 'Pendiente')
        ).length;
        
        const overduePayers = clients.filter(c => 
          c.paymentPlan && 
          c.paymentPlan.currentMonthProgress < c.paymentPlan.monthlyGoal * 0.8
        ).length;

        if (pendingDocs > 0) alerts.clientes = pendingDocs;
        if (overduePayers > 0) alerts.oportunidades = overduePayers;
        if (stats.ecosystems.pending > 0) alerts.ecosistemas = stats.ecosystems.pending;
        if (stats.groups.active > 0) alerts['grupos-colectivos'] = stats.groups.active;

        return alerts;
      }),
      catchError(() => new BehaviorSubject({}).asObservable())
    );
  }

  /**
   * Port exacto de fetchClients callback desde App.tsx
   */
  fetchClients(clientIdToSelect?: string): Observable<Client[]> {
    this.isLoadingSubject.next(true);
    
    return this.mockApiService.getClients().pipe(
      map(rawData => {
        // Port exacto de data transformation desde App.tsx
        const data = rawData.map(client => ({
          ...client,
          events: client.events.map(event => ({
            ...event,
            timestamp: new Date(event.timestamp as any),
          })),
        }));
        
        this.clientsSubject.next(data);
        
        // Port exacto de calculateSidebarAlerts call
        this.calculateSidebarAlerts(data).subscribe(alerts => {
          this.sidebarAlertsSubject.next(alerts);
        });

        // Port exacto de clientIdToSelect logic
        if (clientIdToSelect) {
          const clientToSelect = data.find(c => c.id === clientIdToSelect);
          this.selectedClientSubject.next(clientToSelect || null);
        }

        this.isLoadingSubject.next(false);
        return data;
      }),
      catchError(error => {
// removed by clean-audit
        this.isLoadingSubject.next(false);
        throw error;
      })
    );
  }

  /**
   * Port exacto de notification polling useEffect desde App.tsx
   */
  private startNotificationPolling(): void {
    interval(8000).pipe(
      switchMap(() => this.clients$),
      switchMap(clients => {
        if (clients.length === 0) return new BehaviorSubject(null).asObservable();
        
        // Simulate getSimulatedAlert call
        return this.mockApiService.getDashboardStats().pipe(
          map(stats => {
            // Generate simulated notifications based on dashboard stats
            if (Math.random() > 0.7) { // 30% chance of notification
              const notifications = [
                `Nuevo cliente registrado: ${clients[Math.floor(Math.random() * clients.length)].name}`,
                `Pago recibido de ${clients[Math.floor(Math.random() * clients.length)].name}`,
                `Documentos aprobados para ${clients[Math.floor(Math.random() * clients.length)].name}`,
              ];
              
              return {
                id: `notif-${Date.now()}`,
                type: 'info' as const,
                title: 'Actividad del sistema',
                message: notifications[Math.floor(Math.random() * notifications.length)],
                timestamp: new Date(),
                clientId: clients[Math.floor(Math.random() * clients.length)].id
              };
            }
            return null;
          }),
          catchError(() => new BehaviorSubject(null).asObservable())
        );
      })
    ).subscribe(newAlert => {
      if (newAlert) {
        const currentNotifications = this.currentNotifications;
        this.notificationsSubject.next([newAlert, ...currentNotifications]);
        this.unreadCountSubject.next(this.currentUnreadCount + 1);
      }
    });
  }

  /**
   * Port exacto de handleClientUpdate callback desde App.tsx
   */
  handleClientUpdate(updatedClient: Client): void {
    // Port exacto de sanitizedClient logic
    const sanitizedClient = {
      ...updatedClient,
      events: updatedClient.events.map(e => ({
        ...e, 
        timestamp: new Date(e.timestamp as any)
      }))
    };
    
    const currentClients = this.currentClients;
    const updatedClients = currentClients.map(c => 
      c.id === sanitizedClient.id ? sanitizedClient : c
    );
    
    this.clientsSubject.next(updatedClients);
    this.selectedClientSubject.next(sanitizedClient);
    
    // Recalculate sidebar alerts
    this.calculateSidebarAlerts(updatedClients).subscribe(alerts => {
      this.sidebarAlertsSubject.next(alerts);
    });
  }

  /**
   * Port exacto de handleClientCreated callback desde App.tsx
   */
  handleClientCreated(newClient: Client, mode: 'acquisition' | 'savings'): void {
    const currentClients = this.currentClients;
    const newClients = [...currentClients, newClient];
    
    this.clientsSubject.next(newClients);
    this.simulatingClientSubject.next(newClient);
    this.simulationModeSubject.next(mode);
    this.activeViewSubject.next('simulador');
    this.selectedClientSubject.next(null);
    
    // Recalculate sidebar alerts
    this.calculateSidebarAlerts(newClients).subscribe(alerts => {
      this.sidebarAlertsSubject.next(alerts);
    });
  }

  /**
   * Port exacto de handleFormalize callback desde App.tsx
   */
  handleFormalize(quote: Quote): Observable<void> {
    const simulatingClient = this.currentSimulatingClient;
    if (!simulatingClient) {
      throw new Error('No simulating client found');
    }

    return this.mockApiService.createCotizacionScenario({
      clientName: simulatingClient.name,
      flow: simulatingClient.flow,
      market: 'default'
    }).pipe(
      switchMap(() => {
        // Simulate saveQuoteToClient
        return this.clientDataService.updateClient(simulatingClient.id, {
          status: 'Activo',
          healthScore: 85
        });
      }),
      switchMap(() => {
        this.simulatingClientSubject.next(null);
        return this.fetchClients(simulatingClient.id);
      }),
      map(() => void 0)
    );
  }

  /**
   * Port exacto de handleNotificationAction callback desde App.tsx
   */
  handleNotificationAction(notification: Notification): void {
    if (notification.clientId) {
      const currentClients = this.currentClients;
      const client = currentClients.find(c => c.id === notification.clientId);
      if (client) {
        this.selectedClientSubject.next(client);
        this.simulatingClientSubject.next(null);
        this.activeViewSubject.next('dashboard');
      }
    }
  }

  /**
   * Port exacto de handleMarkAsRead callback desde App.tsx
   */
  handleMarkAsRead(): void {
    this.unreadCountSubject.next(0);
  }

  /**
   * Port exacto de handleSelectClient callback desde App.tsx
   */
  handleSelectClient(client: Client | null, context?: NavigationContext): void {
    this.selectedClientSubject.next(client);
    this.navigationContextSubject.next(context || null);
  }

  /**
   * Port exacto de handleViewChange function desde App.tsx
   */
  handleViewChange(view: View): void {
    this.selectedClientSubject.next(null);
    this.simulatingClientSubject.next(null);
    this.navigationContextSubject.next(null);
    this.activeViewSubject.next(view);
  }

  /**
   * Port exacto de handleBackFromDetail function desde App.tsx
   */
  handleBackFromDetail(): void {
    this.selectedClientSubject.next(null);
    this.navigationContextSubject.next(null);
  }

  /**
   * State setters for direct manipulation
   */
  setActiveView(view: View): void {
    this.activeViewSubject.next(view);
  }

  setSelectedClient(client: Client | null): void {
    this.selectedClientSubject.next(client);
  }

  setSimulatingClient(client: Client | null): void {
    this.simulatingClientSubject.next(client);
  }

  setSimulationMode(mode: 'acquisition' | 'savings'): void {
    this.simulationModeSubject.next(mode);
  }

  setIsSidebarCollapsed(collapsed: boolean): void {
    this.isSidebarCollapsedSubject.next(collapsed);
  }

  setIsOpportunityModalOpen(open: boolean): void {
    this.isOpportunityModalOpenSubject.next(open);
  }

  setNavigationContext(context: NavigationContext | null): void {
    this.navigationContextSubject.next(context);
  }

  /**
   * Utility method to get current state snapshot
   */
  getCurrentState() {
    return {
      activeView: this.currentActiveView,
      clients: this.currentClients,
      selectedClient: this.currentSelectedClient,
      isLoading: this.currentIsLoading,
      notifications: this.currentNotifications,
      unreadCount: this.currentUnreadCount,
      simulatingClient: this.currentSimulatingClient,
      simulationMode: this.currentSimulationMode,
      sidebarAlerts: this.currentSidebarAlerts,
      isSidebarCollapsed: this.currentIsSidebarCollapsed,
      isOpportunityModalOpen: this.currentIsOpportunityModalOpen,
      navigationContext: this.currentNavigationContext
    };
  }

  /**
   * Reset all state to initial values
   */
  resetState(): void {
    this.activeViewSubject.next('dashboard');
    this.clientsSubject.next([]);
    this.selectedClientSubject.next(null);
    this.isLoadingSubject.next(true);
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.simulatingClientSubject.next(null);
    this.simulationModeSubject.next('acquisition');
    this.sidebarAlertsSubject.next({});
    this.isSidebarCollapsedSubject.next(false);
    this.isOpportunityModalOpenSubject.next(false);
    this.navigationContextSubject.next(null);
  }
}
// removed by clean-audit