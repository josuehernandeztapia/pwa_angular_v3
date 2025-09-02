import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { render, screen, fireEvent } from '@testing-library/angular';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../../services/dashboard.service';
import { DashboardStats, ActivityFeedItem, Market, OpportunityStage, ActionableGroup } from '../../../models/types';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDashboardService: jasmine.SpyObj<DashboardService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockDashboardStats: DashboardStats = {
    opportunitiesInPipeline: {
      nuevas: 5,
      expediente: 3,
      aprobado: 2
    },
    pendingActions: {
      clientsWithMissingDocs: 4,
      clientsWithGoalsReached: 2
    },
    activeContracts: 15,
    monthlyRevenue: {
      collected: 85000,
      projected: 120000
    }
  };

  const mockActivityFeed: ActivityFeedItem[] = [
    {
      id: '1',
      type: 'new_client',
      timestamp: new Date(),
      message: 'Nuevo cliente registrado: Ana García',
      clientName: 'Ana García',
      icon: '👤'
    },
    {
      id: '2',
      type: 'payment_received',
      timestamp: new Date(),
      message: 'Pago recibido por $5,000',
      amount: 5000,
      icon: '💰'
    }
  ];

  const mockOpportunityStages: OpportunityStage[] = [
    {
      name: 'Nuevas Oportunidades',
      clientIds: ['1', '2', '3'],
      count: 3
    },
    {
      name: 'Expediente en Proceso',
      clientIds: ['4', '5'],
      count: 2
    }
  ];

  const mockActionableGroups: ActionableGroup[] = [
    {
      title: 'Clientes con documentos pendientes',
      description: 'Estos clientes necesitan completar su documentación',
      clients: [
        {
          id: '1',
          name: 'Juan Pérez',
          avatarUrl: '',
          status: 'Pendiente'
        },
        {
          id: '2',
          name: 'María López',
          avatarUrl: '',
          status: 'Pendiente'
        }
      ]
    }
  ];

  beforeEach(async () => {
    const dashboardServiceSpy = jasmine.createSpyObj('DashboardService', [
      'getDashboardStats',
      'getActivityFeed',
      'getOpportunityStages',
      'getActionableGroups',
      'updateMarket'
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    mockDashboardService = TestBed.inject(DashboardService) as jasmine.SpyObj<DashboardService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Setup default spy returns
    mockDashboardService.getDashboardStats.and.returnValue(of(mockDashboardStats));
    mockDashboardService.getActivityFeed.and.returnValue(of(mockActivityFeed));
    mockDashboardService.getOpportunityStages.and.returnValue(of(mockOpportunityStages));
    mockDashboardService.getActionableGroups.and.returnValue(of(mockActionableGroups));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboard data on init', () => {
    component.ngOnInit();

    expect(mockDashboardService.getDashboardStats).toHaveBeenCalled();
    expect(mockDashboardService.getActivityFeed).toHaveBeenCalled();
    expect(mockDashboardService.getOpportunityStages).toHaveBeenCalled();
    expect(mockDashboardService.getActionableGroups).toHaveBeenCalled();
  });

  it('should display dashboard stats correctly', () => {
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.dashboardStats).toEqual(mockDashboardStats);
    expect(component.dashboardStats.opportunitiesInPipeline.nuevas).toBe(5);
    expect(component.dashboardStats.activeContracts).toBe(15);
  });

  it('should handle activity feed data', () => {
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.activityFeed).toEqual(mockActivityFeed);
    expect(component.activityFeed.length).toBe(2);
    expect(component.activityFeed[0].type).toBe('new_client');
  });

  it('should change market selection', () => {
    const newMarket: Market = 'edomex';
    
    component.onMarketChanged(newMarket);

    expect(mockDashboardService.updateMarket).toHaveBeenCalledWith(newMarket);
    expect(component.selectedMarket).toBe(newMarket);
  });

  it('should navigate to client details', () => {
    const clientId = '123';
    
    component.navigateToClient(clientId);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes', clientId]);
  });

  it('should navigate to opportunities pipeline', () => {
    component.navigateToOpportunities();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/opportunities']);
  });

  it('should toggle view mode', () => {
    component.currentViewMode = 'advisor';
    
    component.onViewModeChanged('client');

    expect(component.currentViewMode).toBe('client');
  });

  it('should handle error in dashboard data loading', () => {
    const errorMessage = 'Failed to load dashboard data';
    mockDashboardService.getDashboardStats.and.returnValue(
      new Subject().asObservable().pipe(() => { throw new Error(errorMessage); })
    );

    spyOn(console, 'error');
    
    component.ngOnInit();

    // Should handle error gracefully and continue loading other data
    expect(mockDashboardService.getActivityFeed).toHaveBeenCalled();
  });

  it('should calculate completion percentage correctly', () => {
    component.dashboardStats = mockDashboardStats;
    
    const percentage = component.getCompletionPercentage();
    const expected = (mockDashboardStats.monthlyRevenue.collected / mockDashboardStats.monthlyRevenue.projected) * 100;
    
    expect(percentage).toBe(Math.round(expected));
  });

  it('should format currency correctly', () => {
    const amount = 85000;
    const formatted = component.formatCurrency(amount);
    
    expect(formatted).toBe('$85,000');
  });

  it('should get next best action data', () => {
    component.dashboardStats = mockDashboardStats;
    component.actionableGroups = mockActionableGroups;
    
    const nextAction = component.getNextBestAction();
    
    expect(nextAction).toBeDefined();
    expect(nextAction.title).toContain('acción');
  });

  it('should filter actionable clients by priority', () => {
    component.actionableGroups = mockActionableGroups;
    
    const highPriorityClients = component.getHighPriorityClients();
    
    expect(highPriorityClients).toBeDefined();
    expect(Array.isArray(highPriorityClients)).toBe(true);
  });

  it('should clean up subscriptions on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});

describe('DashboardComponent Integration Tests', () => {
  it('should render dashboard header with title', async () => {
    const mockDashboardService = {
      getDashboardStats: () => of({
        opportunitiesInPipeline: { nuevas: 0, expediente: 0, aprobado: 0 },
        pendingActions: { clientsWithMissingDocs: 0, clientsWithGoalsReached: 0 },
        activeContracts: 0,
        monthlyRevenue: { collected: 0, projected: 0 }
      }),
      getActivityFeed: () => of([]),
      getOpportunityStages: () => of([]),
      getActionableGroups: () => of([]),
      updateMarket: jasmine.createSpy()
    };

    const { container } = await render(DashboardComponent, {
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    });

    expect(screen.getByText('Centro de Comando')).toBeTruthy();
    expect(container.querySelector('.command-header')).toBeTruthy();
  });

  it('should display KPI cards with data', async () => {
    const mockStats: DashboardStats = {
      opportunitiesInPipeline: { nuevas: 5, expediente: 3, aprobado: 2 },
      pendingActions: { clientsWithMissingDocs: 4, clientsWithGoalsReached: 2 },
      activeContracts: 15,
      monthlyRevenue: { collected: 85000, projected: 120000 }
    };

    const mockDashboardService = {
      getDashboardStats: () => of(mockStats),
      getActivityFeed: () => of([]),
      getOpportunityStages: () => of([]),
      getActionableGroups: () => of([]),
      updateMarket: jasmine.createSpy()
    };

    await render(DashboardComponent, {
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    });

    // Should display KPI values
    expect(screen.getByText('15')).toBeTruthy(); // Active contracts
    expect(screen.getByText('5')).toBeTruthy(); // New opportunities
  });

  it('should handle view mode toggle clicks', async () => {
    const mockDashboardService = {
      getDashboardStats: () => of({
        opportunitiesInPipeline: { nuevas: 0, expediente: 0, aprobado: 0 },
        pendingActions: { clientsWithMissingDocs: 0, clientsWithGoalsReached: 0 },
        activeContracts: 0,
        monthlyRevenue: { collected: 0, projected: 0 }
      }),
      getActivityFeed: () => of([]),
      getOpportunityStages: () => of([]),
      getActionableGroups: () => of([]),
      updateMarket: jasmine.createSpy()
    };

    const { container } = await render(DashboardComponent, {
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }
      ]
    });

    const modeToggle = container.querySelector('app-client-mode-toggle');
    expect(modeToggle).toBeTruthy();
  });
});