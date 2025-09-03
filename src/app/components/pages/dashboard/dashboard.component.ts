import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NextBestActionHeroComponent, NextBestActionData, ActionButton } from '../../shared/next-best-action-hero/next-best-action-hero.component';
import { ContextualKPIsComponent, KPIData } from '../../shared/contextual-kpis/contextual-kpis.component';
import { RiskRadarComponent, RiskRadarClient } from '../../shared/risk-radar/risk-radar.component';
import { HumanActivityFeedComponent, ActivityItem } from '../../shared/human-activity-feed/human-activity-feed.component';
import { ClientModeToggleComponent, ViewMode } from '../../shared/client-mode-toggle/client-mode-toggle.component';
import { DashboardService } from '../../../services/dashboard.service';
import { DashboardStats, ActivityFeedItem, Market, OpportunityStage, ActionableGroup, ActionableClient } from '../../../models/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    NextBestActionHeroComponent,
    ContextualKPIsComponent,
    RiskRadarComponent,
    HumanActivityFeedComponent,
    ClientModeToggleComponent
  ],
  template: `
    <div class="command-center-dashboard">
      <!-- Premium Header with Client Mode Toggle -->
      <header class="command-header">
        <div class="command-title-section">
          <h1 class="command-title">
            <span class="command-icon">✨</span>
            Centro de Comando
          </h1>
          <p class="command-subtitle">Tu plan de acción para hoy, Ricardo.</p>
        </div>
        
        <div class="command-controls">
          <app-client-mode-toggle 
            [currentMode]="currentViewMode" 
            (modeChanged)="onViewModeChanged($event)">
          </app-client-mode-toggle>
          
          <div class="user-info">
            <span class="user-name">👤 {{ userName }} ⏷</span>
            <button 
              class="client-mode-badge" 
              [class.active]="currentViewMode === 'client'"
              (click)="toggleProfileDropdown()"
            >
              🚚 Modo Cliente
            </button>
          </div>
        </div>
      </header>

      <main class="command-dashboard-main">
        <!-- Tu Próxima Mejor Acción (The Brain) -->
        <section class="next-best-action-hero">
          <div class="hero-header">
            <h2 class="hero-title">💡 TU PRÓXIMA MEJOR ACCIÓN</h2>
          </div>
          
          <app-next-best-action-hero 
            *ngIf="nextBestAction"
            [data]="nextBestAction"
            (actionExecuted)="onActionExecuted($event)">
          </app-next-best-action-hero>
        </section>

        <!-- KPIs Contextuales & Radar de Riesgo -->
        <section class="intelligence-grid">
          <div class="kpis-section">
            <h3 class="section-title">📊 KPIs Clave (vs. Semana Pasada)</h3>
            <app-contextual-kpis 
              [kpis]="contextualKPIs"
              [showTrends]="true">
            </app-contextual-kpis>
          </div>
          
          <div class="risk-radar-section">
            <h3 class="section-title">🔥 Radar de Riesgo</h3>
            <p class="section-subtitle">(Visualización de clientes por Health Score)</p>
            <app-risk-radar 
              [clients]="riskRadarClients"
              (clientSelected)="onRiskClientSelected($event)"
              (actionRequested)="onRiskActionRequested($event)">
            </app-risk-radar>
          </div>
        </section>

        <!-- Feed de Actividad Humano -->
        <section class="human-activity-section">
          <h2 class="section-title">🛰️ Feed de Actividad en Tiempo Real</h2>
          <div class="activity-feed-container">
            <app-human-activity-feed 
              [activities]="premiumActivityFeed"
              [maxItems]="4"
              [showSuggestedActions]="true">
            </app-human-activity-feed>
          </div>
        </section>

      </main>
    </div>
  `,
  styles: [`
    /* ===== COMMAND CENTER DASHBOARD ===== */
    .command-center-dashboard {
      min-height: 100vh;
      background: var(--bg-gray-950);
      background-image: 
        radial-gradient(circle at 25% 25%, var(--primary-cyan-900) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, var(--accent-amber-900) 0%, transparent 50%);
    }

    /* ===== PREMIUM HEADER ===== */
    .command-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: var(--glass-backdrop);
      border-radius: 0 0 24px 24px;
      margin-bottom: 32px;
      box-shadow: var(--shadow-premium);
    }

    .command-title-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .command-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 2rem;
      font-weight: 800;
      color: var(--primary-cyan-300);
      letter-spacing: -0.025em;
    }

    .command-icon {
      font-size: 2.5rem;
      animation: glow-pulse 3s ease-in-out infinite;
    }

    @keyframes glow-pulse {
      0%, 100% { 
        filter: drop-shadow(0 0 10px var(--primary-cyan-400));
      }
      50% { 
        filter: drop-shadow(0 0 20px var(--accent-amber-500));
      }
    }

    .command-subtitle {
      margin: 0;
      color: var(--bg-gray-300);
      font-size: 1.1rem;
      font-weight: 500;
      opacity: 0.9;
    }

    .command-controls {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-name {
      color: var(--bg-gray-200);
      font-weight: 600;
      font-size: 1rem;
    }

    .client-mode-badge {
      background: var(--accent-amber-500);
      color: var(--bg-gray-950);
      padding: 8px 16px;
      border: none;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }

    .client-mode-badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
    }

    .client-mode-badge.active {
      background: var(--accent-amber-400);
      box-shadow: 0 0 20px var(--accent-amber-500);
    }

    /* ===== MAIN DASHBOARD LAYOUT ===== */
    .command-dashboard-main {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 32px 32px 32px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    /* ===== NEXT BEST ACTION HERO ===== */
    .next-best-action-hero {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: var(--glass-backdrop);
      border-radius: 24px;
      padding: 32px;
      box-shadow: var(--shadow-premium);
      position: relative;
      overflow: hidden;
    }

    .next-best-action-hero::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(135deg, var(--primary-cyan-400), transparent, var(--accent-amber-500));
      border-radius: 24px;
      z-index: -1;
      opacity: 0.5;
    }

    .hero-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .hero-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--primary-cyan-300);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ===== INTELLIGENCE GRID ===== */
    .intelligence-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }

    .kpis-section, .risk-radar-section {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: var(--glass-backdrop);
      border-radius: 24px;
      padding: 32px;
      box-shadow: var(--shadow-premium);
    }

    .section-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--primary-cyan-300);
      margin: 0 0 8px 0;
    }

    .section-subtitle {
      font-size: 0.95rem;
      color: var(--bg-gray-400);
      margin: 0 0 24px 0;
      font-style: italic;
    }

    /* ===== HUMAN ACTIVITY FEED ===== */
    .human-activity-section {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: var(--glass-backdrop);
      border-radius: 24px;
      padding: 32px;
      box-shadow: var(--shadow-premium);
    }

    .activity-feed-container {
      margin-top: 16px;
    }

    /* ===== RESPONSIVE DESIGN ===== */
    @media (max-width: 1200px) {
      .intelligence-grid {
        grid-template-columns: 1fr;
      }
      
      .command-header {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }
    }

    @media (max-width: 768px) {
      .command-dashboard-main {
        padding: 0 16px 16px 16px;
      }
      
      .command-header {
        padding: 20px 16px;
        border-radius: 0;
      }
      
      .command-title {
        font-size: 1.6rem;
      }
      
      .next-best-action-hero,
      .kpis-section, 
      .risk-radar-section,
      .human-activity-section {
        padding: 24px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State management
  userName = 'Ricardo Montoya';
  selectedMarket: Market = 'all';
  isLoading = true;
  showProfileDropdown = false;
  
  // Dashboard data
  stats: DashboardStats | null = null;
  activityFeed: ActivityFeedItem[] = [];
  funnelData: OpportunityStage[] = [];
  actionableGroups: ActionableGroup[] = [];
  allClients: ActionableClient[] = [];

  // Premium components data
  currentViewMode: ViewMode = 'advisor';
  nextBestAction?: NextBestActionData;
  contextualKPIs: KPIData[] = [];
  riskRadarClients: RiskRadarClient[] = [];
  premiumActivityFeed: ActivityItem[] = [];

  constructor(
    private router: Router,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.subscribeToActivityFeed();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Strategic Implementation: Center of Command
   * Creates new opportunity using guided modal flow with SMART CONTEXT
   */
  createNewOpportunity(): void {
    // Smart Context Integration: Pass current dashboard state as intelligence
    const smartContext = {
      // Market intelligence from current filter
      market: this.selectedMarket !== 'all' ? this.selectedMarket : undefined,
      // Business intelligence from current stats
      suggestedFlow: this.getSuggestedFlowFromStats(),
      // Temporal context
      timestamp: Date.now(),
      // Dashboard context for return navigation
      returnContext: 'dashboard-filtered'
    };
    
    this.router.navigate(['/nueva-oportunidad'], { 
      queryParams: smartContext
    });
  }

  /**
   * Intelligent Flow Suggestion based on current pipeline stats
   */
  private getSuggestedFlowFromStats(): string | undefined {
    if (!this.stats) return undefined;
    
    const { nuevas, expediente, aprobado } = this.stats.opportunitiesInPipeline;
    
    // Business Intelligence: Suggest based on pipeline balance
    if (nuevas > expediente + aprobado) {
      return 'COTIZACION'; // Pipeline needs more conversions
    } else if (aprobado > nuevas) {
      return 'SIMULACION'; // Pipeline is healthy, focus on long-term planning
    }
    
    return undefined; // Let user choose
  }

  /**
   * Toggle profile dropdown menu
   */
  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  /**
   * Filter dashboard by market
   */
  onMarketFilter(market: Market): void {
    this.selectedMarket = market;
    this.loadDashboardData();
  }

  /**
   * Load dashboard statistics
   */
  private loadDashboardData(): void {
    this.isLoading = true;
    
    Promise.all([
      this.dashboardService.getDashboardStats(this.selectedMarket).toPromise(),
      this.dashboardService.getOpportunityStages(this.selectedMarket).toPromise(),
      this.dashboardService.getActionableGroups(this.selectedMarket).toPromise(),
      this.dashboardService.getAllClients(this.selectedMarket).toPromise()
    ]).then(([stats, funnel, groups, clients]) => {
      this.stats = stats || null;
      this.funnelData = funnel || [];
      this.actionableGroups = groups || [];
      this.allClients = clients || [];
      
      // Initialize premium components with loaded data
      this.initializePremiumComponents();
      
      this.isLoading = false;
    }).catch((error) => {
      console.error('Error loading dashboard data:', error);
      this.isLoading = false;
      
      // Fallback mock data for development
      this.loadMockData();
      // Initialize premium components with mock data
      this.initializePremiumComponents();
    });
  }

  /**
   * Subscribe to real-time activity feed
   */
  private subscribeToActivityFeed(): void {
    this.dashboardService.activityFeed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(activities => {
        this.activityFeed = activities;
      });
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  /**
   * Format time ago for activity feed
   */
  formatTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} días`;
  }

  // Premium Component Event Handlers
  onViewModeChanged(mode: ViewMode): void {
    this.currentViewMode = mode;
    if (mode === 'client') {
      this.loadClientViewData();
    }
  }

  onActionExecuted(event: {action: ActionButton, context: NextBestActionData}): void {
    console.log('Executing action:', event.action, 'for context:', event.context);
    switch (event.action.action) {
      case 'call_client':
        // Navigate to client detail or trigger call interface
        break;
      case 'send_whatsapp':
        // Trigger WhatsApp integration
        break;
      case 'view_expediente':
        // Navigate to client expediente
        this.router.navigate(['/clientes', event.context.client.id]);
        break;
    }
  }

  onRiskClientSelected(client: RiskRadarClient): void {
    console.log('Risk client selected:', client);
  }

  onRiskActionRequested(client: RiskRadarClient): void {
    console.log('Risk action requested for:', client);
    this.convertRiskClientToNextBestAction(client);
  }

  private convertRiskClientToNextBestAction(riskClient: RiskRadarClient): void {
    this.nextBestAction = {
      id: `risk-action-${riskClient.id}`,
      type: 'contact',
      priority: riskClient.riskLevel === 'critical' ? 'critical' : 'high',
      client: {
        id: riskClient.id,
        name: riskClient.name,
        healthScore: riskClient.healthScore
      },
      action: {
        title: `Contactar a ${riskClient.name}`,
        description: `Cliente en riesgo ${riskClient.riskLevel} requiere atención inmediata`,
        reasoning: `Health Score: ${riskClient.healthScore}. Issues: ${riskClient.issues.join(', ')}`,
        timeEstimate: '10 min'
      },
      context: {
        daysWaiting: Math.floor((Date.now() - new Date(riskClient.lastContact).getTime()) / (1000 * 60 * 60 * 24)),
        amountInvolved: riskClient.value
      },
      suggestedActions: {
        primary: {
          label: 'Llamar Ahora',
          icon: '📞',
          action: 'call_client',
          params: { clientId: riskClient.id }
        },
        secondary: [
          {
            label: 'Enviar WhatsApp',
            icon: '📱',
            action: 'send_whatsapp',
            params: { clientId: riskClient.id }
          },
          {
            label: 'Ver Expediente',
            icon: '📄',
            action: 'view_expediente',
            params: { clientId: riskClient.id }
          }
        ]
      }
    };
  }

  private loadClientViewData(): void {
    // Load simplified data for client view mode
    console.log('Loading client view data');
  }

  private initializePremiumComponents(): void {
    this.loadNextBestAction();
    this.loadContextualKPIs();
    this.loadRiskRadarData();
    this.loadPremiumActivityFeed();
  }

  private loadNextBestAction(): void {
    // Generate NextBestAction from current actionable groups
    if (this.actionableGroups.length > 0) {
      const highPriorityGroup = this.actionableGroups.find(g => (g as any).priority === 'high');
      if (highPriorityGroup && highPriorityGroup.clients.length > 0) {
        const client = highPriorityGroup.clients[0];
        this.nextBestAction = {
          id: `action-${client.id}`,
          type: 'document',
          priority: 'high',
          client: {
            id: client.id,
            name: client.name,
            healthScore: 78,
            route: 'Ruta 27'
          },
          action: {
            title: `Contactar a ${client.name}`,
            description: `Su expediente está incompleto (falta INE). Tiene un Health Score de 78.`,
            reasoning: `Cliente con alto potencial, requiere atención inmediata para mantener el momentum.`,
            timeEstimate: '5 min'
          },
          context: {
            daysWaiting: (client as any).daysInStage || 5,
            amountInvolved: 15000
          },
          suggestedActions: {
            primary: {
              label: 'Ver Expediente',
              icon: '📄',
              action: 'view_expediente'
            },
            secondary: [
              {
                label: 'Llamar Ahora',
                icon: '📞',
                action: 'call_client'
              },
              {
                label: 'Enviar Recordatorio por WhatsApp',
                icon: '📱',
                action: 'send_whatsapp'
              }
            ]
          }
        };
      }
    }

    // Fallback mock action if no actionable groups
    if (!this.nextBestAction) {
      this.nextBestAction = {
        id: 'mock-action-1',
        type: 'contact',
        priority: 'high',
        client: {
          id: 'client-1',
          name: 'María García',
          healthScore: 78,
          route: 'Ruta 27'
        },
        action: {
          title: 'Contactar a María García (Ruta 27)',
          description: 'Su expediente está incompleto (falta INE). Tiene un Health Score de 78.',
          reasoning: 'Cliente con alto potencial que necesita completar documentación para avanzar en el proceso.',
          timeEstimate: '5 min'
        },
        context: {
          daysWaiting: 5,
          amountInvolved: 15000
        },
        suggestedActions: {
          primary: {
            label: 'Ver Expediente',
            icon: '📄',
            action: 'view_expediente'
          },
          secondary: [
            {
              label: 'Llamar Ahora',
              icon: '📞',
              action: 'call_client'
            },
            {
              label: 'Enviar Recordatorio por WhatsApp',
              icon: '📱',
              action: 'send_whatsapp'
            }
          ]
        }
      };
    }
  }

  private loadContextualKPIs(): void {
    if (!this.stats) {
      // Mock KPIs for development
      this.contextualKPIs = [
        {
          id: 'opportunities',
          title: 'Oportunidades',
          value: 5,
          previousValue: 4,
          trend: 'up',
          trendPercentage: 25,
          format: 'number',
          icon: '💡',
          color: 'primary',
          subtitle: 'Nuevas esta semana'
        },
        {
          id: 'conversion',
          title: 'Tasa de Cierre',
          value: 28,
          previousValue: 32,
          trend: 'down',
          trendPercentage: 12.5,
          format: 'percentage',
          icon: '🎯',
          color: 'accent'
        },
        {
          id: 'contracts',
          title: 'Contratos Activos',
          value: 28,
          previousValue: 26,
          trend: 'stable',
          trendPercentage: 7.7,
          format: 'number',
          icon: '📋',
          color: 'success'
        },
        {
          id: 'revenue',
          title: 'Revenue del Mes',
          value: 1250000,
          previousValue: 1115000,
          trend: 'up',
          trendPercentage: 12.1,
          format: 'currency',
          icon: '💰',
          color: 'accent'
        }
      ];
      return;
    }

    this.contextualKPIs = [
      {
        id: 'opportunities',
        title: 'Oportunidades',
        value: this.stats.opportunitiesInPipeline.nuevas,
        previousValue: this.stats.opportunitiesInPipeline.nuevas - 1,
        trend: this.stats.opportunitiesInPipeline.nuevas > 4 ? 'up' : 'down',
        trendPercentage: 25,
        format: 'number',
        icon: '💡',
        color: 'primary',
        subtitle: 'Nuevas esta semana'
      },
      {
        id: 'conversion',
        title: 'Tasa de Cierre',
        value: 28,
        previousValue: 32,
        trend: 28 > 25 ? 'up' : 'down',
        trendPercentage: 15,
        format: 'percentage',
        icon: '🎯',
        color: 'accent'
      },
      {
        id: 'contracts',
        title: 'Contratos Activos',
        value: this.stats.activeContracts,
        previousValue: this.stats.activeContracts - 2,
        trend: 'stable',
        trendPercentage: 0,
        format: 'number',
        icon: '📋',
        color: 'success'
      },
      {
        id: 'revenue',
        title: 'Revenue del Mes',
        value: this.stats.monthlyRevenue.collected,
        previousValue: this.stats.monthlyRevenue.collected * 0.88,
        trend: 'up',
        trendPercentage: 12,
        format: 'currency',
        icon: '💰',
        color: 'accent'
      }
    ];
  }

  private loadRiskRadarData(): void {
    // Mock risk radar data
    this.riskRadarClients = [
      {
        id: 'client-risk-1',
        name: 'María González',
        healthScore: 45,
        riskLevel: 'critical',
        position: { x: 20, y: 80 },
        issues: ['Documentos Vencidos', 'Sin contacto 7 días'],
        lastContact: 'hace 7 días',
        value: 25000,
        urgency: 9
      },
      {
        id: 'client-risk-2',
        name: 'Carlos Méndez', 
        healthScore: 62,
        riskLevel: 'medium',
        position: { x: 65, y: 45 },
        issues: ['INE Vencida'],
        lastContact: 'hace 3 días',
        value: 18000,
        urgency: 6
      },
      {
        id: 'client-risk-3',
        name: 'Ana Ruiz',
        healthScore: 85,
        riskLevel: 'low',
        position: { x: 80, y: 20 },
        issues: ['Meta Completada'],
        lastContact: 'hace 1 día',
        value: 30000,
        urgency: 2
      },
      {
        id: 'client-risk-4',
        name: 'José Hernández',
        healthScore: 38,
        riskLevel: 'critical',
        position: { x: 15, y: 70 },
        issues: ['Pago Vencido', 'Sin respuesta'],
        lastContact: 'hace 12 días',
        value: 22000,
        urgency: 10
      }
    ];
  }

  private loadPremiumActivityFeed(): void {
    // Mock premium activity feed
    this.premiumActivityFeed = [
      {
        id: 'activity-1',
        type: 'system',
        category: 'payment',
        timestamp: new Date(Date.now() - 2 * 60000), // 2 minutes ago
        client: {
          id: 'client-1',
          name: 'Juan Pérez'
        },
        title: 'Pago de $5,000 MXN recibido de Juan Pérez.',
        description: 'Pago de $5,000 MXN recibido de Juan Pérez. ¡Felicítalo!',
        metadata: {
          amount: 5000
        },
        suggestedAction: {
          label: '¡Felicítalo!',
          action: 'congratulate_client',
          params: { clientName: 'Juan Pérez' }
        },
        priority: 'medium'
      },
      {
        id: 'activity-2',
        type: 'advisor',
        category: 'document',
        timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        client: {
          id: 'client-2',
          name: 'Ana López'
        },
        title: 'Documento \'INE\' de Ana López marcado como \'En Revisión\'.',
        description: 'El documento ha sido recibido y está siendo procesado por el equipo de validación.',
        priority: 'low'
      },
      {
        id: 'activity-3',
        type: 'system',
        category: 'opportunity',
        timestamp: new Date(Date.now() - 60 * 60000), // 1 hour ago
        client: {
          id: 'client-3',
          name: 'Carlos Sánchez'
        },
        title: 'Nueva oportunidad \'Carlos Sánchez\' asignada.',
        description: 'Se ha creado una nueva oportunidad de negocio que requiere tu atención.',
        priority: 'high'
      }
    ];
  }

  // Mock data loader for development
  private loadMockData(): void {
    this.stats = {
      opportunitiesInPipeline: {
        nuevas: 5,
        expediente: 3,
        aprobado: 2
      },
      pendingActions: {
        clientsWithMissingDocs: 7,
        clientsWithGoalsReached: 2
      },
      activeContracts: 28,
      monthlyRevenue: {
        collected: 1250000,
        projected: 1450000
      }
    };

    this.actionableGroups = [
      {
        title: 'Documentos Vencidos',
        description: 'Clientes con documentación que requiere renovación',
        clients: [
          {
            id: '1',
            name: 'María González',
            status: 'Documentos Vencidos',
            avatarUrl: 'https://via.placeholder.com/40'
          },
          {
            id: '2',
            name: 'Carlos Méndez',
            status: 'INE Vencida',
            avatarUrl: 'https://via.placeholder.com/40'
          }
        ]
      }
    ];
  }
}