import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { CotizadorEngineService } from '../../../services/cotizador-engine.service';
import { ToastService } from '../../../services/toast.service';
import { Client, BusinessFlow, Market, Quote } from '../../../models/types';

interface Opportunity {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  market: Market;
  businessFlow: BusinessFlow;
  stage: 'prospecto' | 'cotizando' | 'negociando' | 'documentando' | 'cerrando' | 'cerrado' | 'perdido';
  priority: 'alta' | 'media' | 'baja';
  estimatedValue: number;
  probability: number;
  expectedCloseDate: Date;
  lastActivity: Date;
  nextAction: string;
  tags: string[];
  quote?: Quote;
  notes: string;
  createdAt: Date;
}

interface PipelineStats {
  totalOpportunities: number;
  totalValue: number;
  averageDealSize: number;
  conversionRate: number;
  stageDistribution: { [key: string]: number };
}

@Component({
  selector: 'app-opportunities-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="opportunities-container">
      <header class="page-header">
        <div class="header-content">
          <h1>🎯 Pipeline de Oportunidades</h1>
          <p class="page-description">Gestión de prospectos y seguimiento de ventas</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="refreshPipeline()">
            🔄 Actualizar
          </button>
          <button class="btn-primary" (click)="createNewOpportunity()">
            ➕ Nueva Oportunidad
          </button>
        </div>
      </header>

      <!-- Pipeline Stats -->
      <div class="stats-grid">
        <div class="stat-card total-opportunities">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalOpportunities }}</div>
            <div class="stat-label">Oportunidades Activas</div>
          </div>
        </div>
        
        <div class="stat-card total-value">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(stats.totalValue) }}</div>
            <div class="stat-label">Valor Total Pipeline</div>
          </div>
        </div>
        
        <div class="stat-card average-deal">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(stats.averageDealSize) }}</div>
            <div class="stat-label">Ticket Promedio</div>
          </div>
        </div>
        
        <div class="stat-card conversion-rate">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <div class="stat-value">{{ (stats.conversionRate * 100).toFixed(1) }}%</div>
            <div class="stat-label">Tasa de Conversión</div>
          </div>
        </div>
      </div>

      <!-- Pipeline Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>🏢 Mercado</label>
          <select [(ngModel)]="selectedMarket" (change)="applyFilters()">
            <option value="">Todos los mercados</option>
            <option value="aguascalientes">Aguascalientes</option>
            <option value="edomex">Estado de México</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>📋 Tipo de Negocio</label>
          <select [(ngModel)]="selectedFlow" (change)="applyFilters()">
            <option value="">Todos los tipos</option>
            <option value="VentaPlazo">Venta a Plazo</option>
            <option value="VentaDirecta">Venta Directa</option>
            <option value="AhorroProgramado">Plan de Ahorro</option>
            <option value="CreditoColectivo">Crédito Colectivo</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>🎚️ Etapa</label>
          <select [(ngModel)]="selectedStage" (change)="applyFilters()">
            <option value="">Todas las etapas</option>
            <option value="prospecto">Prospecto</option>
            <option value="cotizando">Cotizando</option>
            <option value="negociando">Negociando</option>
            <option value="documentando">Documentando</option>
            <option value="cerrando">Cerrando</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>⚡ Prioridad</label>
          <select [(ngModel)]="selectedPriority" (change)="applyFilters()">
            <option value="">Todas las prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      <!-- Pipeline Kanban View -->
      <div class="pipeline-kanban">
        <div 
          *ngFor="let stage of pipelineStages" 
          class="pipeline-stage"
        >
          <div class="stage-header">
            <h3>{{ stage.icon }} {{ stage.name }}</h3>
            <span class="stage-count">{{ getStageOpportunities(stage.key).length }}</span>
            <div class="stage-value">{{ formatCurrency(getStageValue(stage.key)) }}</div>
          </div>
          
          <div class="opportunities-list">
            <div 
              *ngFor="let opportunity of getStageOpportunities(stage.key); trackBy: trackByOpportunityId"
              class="opportunity-card"
              [class.priority-alta]="opportunity.priority === 'alta'"
              [class.priority-media]="opportunity.priority === 'media'"
              [class.priority-baja]="opportunity.priority === 'baja'"
              (click)="viewOpportunity(opportunity)"
            >
              <div class="opportunity-header">
                <h4>{{ opportunity.clientName }}</h4>
                <div class="priority-badge" [class]="'priority-' + opportunity.priority">
                  {{ getPriorityIcon(opportunity.priority) }}
                </div>
              </div>
              
              <div class="opportunity-details">
                <div class="detail-row">
                  <span class="detail-label">📍 Mercado:</span>
                  <span class="detail-value">{{ getMarketLabel(opportunity.market) }}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">📊 Tipo:</span>
                  <span class="detail-value">{{ getBusinessFlowLabel(opportunity.businessFlow) }}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">💰 Valor:</span>
                  <span class="detail-value">{{ formatCurrency(opportunity.estimatedValue) }}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">📈 Probabilidad:</span>
                  <span class="detail-value">{{ opportunity.probability }}%</span>
                </div>
              </div>
              
              <div class="opportunity-progress">
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    [style.width.%]="opportunity.probability"
                  ></div>
                </div>
              </div>
              
              <div class="opportunity-meta">
                <div class="next-action">
                  <span class="action-icon">🎯</span>
                  <span class="action-text">{{ opportunity.nextAction }}</span>
                </div>
                
                <div class="last-activity">
                  <span class="activity-time">{{ formatTimeAgo(opportunity.lastActivity) }}</span>
                </div>
              </div>
              
              <div class="opportunity-tags">
                <span 
                  *ngFor="let tag of opportunity.tags" 
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>
              
              <div class="opportunity-actions">
                <button 
                  class="action-btn"
                  (click)="advanceStage(opportunity); $event.stopPropagation()"
                  *ngIf="canAdvanceStage(opportunity)"
                >
                  ➡️ Avanzar
                </button>
                <button 
                  class="action-btn secondary"
                  (click)="createQuote(opportunity); $event.stopPropagation()"
                  *ngIf="opportunity.stage === 'cotizando' && !opportunity.quote"
                >
                  📋 Cotizar
                </button>
                <button 
                  class="action-btn secondary"
                  (click)="scheduleFollowUp(opportunity); $event.stopPropagation()"
                >
                  📅 Seguimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Cargando pipeline de oportunidades...</p>
      </div>
    </div>
  `,
  styles: [`
    .opportunities-container {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .header-content h1 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 2.2rem;
      font-weight: 700;
    }

    .page-description {
      margin: 0;
      color: #718096;
      font-size: 1.1rem;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-size: 0.9rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #48bb78, #38a169);
      color: white;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #38a169, #2f855a);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #edf2f7;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
    }

    .stat-icon {
      font-size: 2.5rem;
      opacity: 0.8;
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: #2d3748;
      font-family: monospace;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #718096;
      font-weight: 500;
    }

    .filters-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .filter-group label {
      font-weight: 600;
      color: #4a5568;
      font-size: 0.9rem;
    }

    .filter-group select {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: white;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .filter-group select:focus {
      outline: none;
      border-color: #4299e1;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }

    .pipeline-kanban {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .pipeline-stage {
      background: #f7fafc;
      border-radius: 12px;
      padding: 16px;
      min-height: 400px;
    }

    .stage-header {
      padding: 12px 16px;
      background: white;
      border-radius: 8px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .stage-header h3 {
      margin: 0 0 4px 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2d3748;
    }

    .stage-count {
      background: #4299e1;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-left: 8px;
    }

    .stage-value {
      font-size: 0.9rem;
      color: #48bb78;
      font-weight: 600;
      font-family: monospace;
    }

    .opportunities-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 600px;
      overflow-y: auto;
    }

    .opportunity-card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .opportunity-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .opportunity-card.priority-alta {
      border-left: 4px solid #e53e3e;
    }

    .opportunity-card.priority-media {
      border-left: 4px solid #ed8936;
    }

    .opportunity-card.priority-baja {
      border-left: 4px solid #48bb78;
    }

    .opportunity-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .opportunity-header h4 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #2d3748;
    }

    .priority-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .priority-badge.priority-alta {
      background: #fed7d7;
      color: #c53030;
    }

    .priority-badge.priority-media {
      background: #feebc8;
      color: #c05621;
    }

    .priority-badge.priority-baja {
      background: #c6f6d5;
      color: #22543d;
    }

    .opportunity-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .detail-label {
      color: #718096;
    }

    .detail-value {
      color: #2d3748;
      font-weight: 500;
    }

    .opportunity-progress {
      margin-bottom: 12px;
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4299e1, #63b3ed);
      transition: width 0.3s ease;
    }

    .opportunity-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 0.8rem;
    }

    .next-action {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #4a5568;
    }

    .last-activity {
      color: #718096;
    }

    .opportunity-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 12px;
    }

    .tag {
      background: #e6fffa;
      color: #234e52;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .opportunity-actions {
      display: flex;
      gap: 6px;
    }

    .action-btn {
      flex: 1;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      color: #4a5568;
    }

    .action-btn:hover {
      background: #f7fafc;
      border-color: #cbd5e0;
    }

    .action-btn.secondary {
      background: #f7fafc;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #718096;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-left-color: #4299e1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .opportunities-container {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
      }

      .filters-section {
        grid-template-columns: 1fr;
      }

      .pipeline-kanban {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class OpportunitiesPipelineComponent implements OnInit {
  opportunities: Opportunity[] = [];
  filteredOpportunities: Opportunity[] = [];
  clients: Client[] = [];
  isLoading = false;

  // Filters
  selectedMarket = '';
  selectedFlow = '';
  selectedStage = '';
  selectedPriority = '';

  stats: PipelineStats = {
    totalOpportunities: 0,
    totalValue: 0,
    averageDealSize: 0,
    conversionRate: 0,
    stageDistribution: {}
  };

  pipelineStages = [
    { key: 'prospecto', name: 'Prospecto', icon: '👤' },
    { key: 'cotizando', name: 'Cotizando', icon: '💰' },
    { key: 'negociando', name: 'Negociando', icon: '🤝' },
    { key: 'documentando', name: 'Documentando', icon: '📋' },
    { key: 'cerrando', name: 'Cerrando', icon: '🎯' }
  ];

  constructor(
    private apiService: ApiService,
    private cotizadorService: CotizadorEngineService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPipelineData();
  }

  private async loadPipelineData(): Promise<void> {
    this.isLoading = true;

    try {
      // Load clients to generate opportunities
      this.clients = await this.apiService.getClients().toPromise() || [];
      this.generateOpportunities();
      this.applyFilters();
      this.calculateStats();
      
    } catch (error) {
      console.error('Error loading pipeline data:', error);
      this.toast.error('Error al cargar datos del pipeline');
    } finally {
      this.isLoading = false;
    }
  }

  private generateOpportunities(): void {
    const opportunities: Opportunity[] = [];

    this.clients.forEach((client, index) => {
      // Convert clients to opportunities based on their status and business logic
      const estimatedValue = this.calculateEstimatedValue(client);
      const stage = this.determineStage(client);
      const priority = this.determinePriority(client, estimatedValue);
      const probability = this.calculateProbability(stage, client);

      opportunities.push({
        id: `opp-${client.id}`,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        market: client.market as Market,
        businessFlow: client.flow,
        stage,
        priority,
        estimatedValue,
        probability,
        expectedCloseDate: this.calculateExpectedCloseDate(stage),
        lastActivity: client.lastModified,
        nextAction: this.getNextAction(stage, client),
        tags: this.generateTags(client),
        notes: `Oportunidad generada para ${client.name}`,
        createdAt: client.createdAt
      });
    });

    // Add some additional prospects not yet in client database
    const additionalProspects = [
      {
        id: 'opp-prospect-1',
        clientId: 'prospect-1',
        clientName: 'Transportes del Valle S.A.',
        clientPhone: '5551234567',
        clientEmail: 'contacto@transportesdelvalle.com',
        market: 'edomex' as Market,
        businessFlow: BusinessFlow.CreditoColectivo,
        stage: 'prospecto' as const,
        priority: 'alta' as const,
        estimatedValue: 4500000, // 5 units collective credit
        probability: 25,
        expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        nextAction: 'Presentar propuesta de crédito colectivo',
        tags: ['Nuevo Prospecto', 'EdoMex', 'Colectivo'],
        notes: 'Prospecto interesado en crédito colectivo para 5 unidades',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'opp-prospect-2',
        clientId: 'prospect-2',
        clientName: 'José Luis Martínez',
        clientPhone: '5552345678',
        clientEmail: 'jlmartinez@email.com',
        market: 'aguascalientes' as Market,
        businessFlow: BusinessFlow.VentaPlazo,
        stage: 'cotizando' as const,
        priority: 'media' as const,
        estimatedValue: 853000, // AGS package
        probability: 60,
        expectedCloseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        nextAction: 'Enviar cotización final con descuento',
        tags: ['AGS', 'Venta Plazo', 'Hot Lead'],
        notes: 'Cliente interesado, esperando cotización con mejor precio',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      }
    ];

    this.opportunities = [...opportunities, ...additionalProspects]
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  private calculateEstimatedValue(client: Client): number {
    // Base calculation on market and business flow
    const baseValues = {
      [BusinessFlow.VentaPlazo]: client.market === 'aguascalientes' ? 853000 : 937000,
      [BusinessFlow.VentaDirecta]: client.market === 'aguascalientes' ? 853000 : 837000,
      [BusinessFlow.AhorroProgramado]: 600000,
      [BusinessFlow.CreditoColectivo]: 937000 * 5 // Assume 5 units
    };
    
    return baseValues[client.flow] || 800000;
  }

  private determineStage(client: Client): Opportunity['stage'] {
    // Determine stage based on client status and documents
    const hasQuote = client.quotes && client.quotes.length > 0;
    const hasApprovedDocs = client.documents.some(d => d.status === 'Aprobado');
    const docCompleteness = client.documents.filter(d => d.status === 'Aprobado').length / client.documents.length;

    if (docCompleteness > 0.8) return 'cerrando';
    if (hasApprovedDocs && docCompleteness > 0.5) return 'documentando';
    if (hasQuote) return 'negociando';
    if (client.status === 'Activo') return 'cotizando';
    
    return 'prospecto';
  }

  private determinePriority(client: Client, estimatedValue: number): Opportunity['priority'] {
    const daysSinceCreated = (Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (estimatedValue > 2000000 || client.flow === BusinessFlow.CreditoColectivo) return 'alta';
    if (estimatedValue > 800000 && daysSinceCreated < 14) return 'alta';
    if (daysSinceCreated > 30) return 'baja';
    
    return 'media';
  }

  private calculateProbability(stage: string, client: Client): number {
    const baseProbabilities = {
      'prospecto': 20,
      'cotizando': 40,
      'negociando': 65,
      'documentando': 85,
      'cerrando': 95
    };

    let probability = baseProbabilities[stage as keyof typeof baseProbabilities] || 20;
    
    // Adjust based on client factors
    if (client.flow === BusinessFlow.VentaDirecta) probability += 10;
    if (client.market === 'aguascalientes') probability += 5; // Historically better conversion
    
    return Math.min(probability, 95);
  }

  private calculateExpectedCloseDate(stage: string): Date {
    const daysToClose = {
      'prospecto': 60,
      'cotizando': 30,
      'negociando': 21,
      'documentando': 14,
      'cerrando': 7
    };

    const days = daysToClose[stage as keyof typeof daysToClose] || 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private getNextAction(stage: string, client: Client): string {
    const actions = {
      'prospecto': 'Contactar y calificar prospecto',
      'cotizando': 'Generar cotización personalizada',
      'negociando': 'Ajustar términos y condiciones',
      'documentando': 'Completar expediente de documentos',
      'cerrando': 'Finalizar proceso y entrega'
    };

    return actions[stage as keyof typeof actions] || 'Definir siguiente acción';
  }

  private generateTags(client: Client): string[] {
    const tags = [];
    
    tags.push(client.market === 'aguascalientes' ? 'AGS' : 'EdoMex');
    tags.push(client.flow.replace(/([A-Z])/g, ' $1').trim());
    
    if (client.ecosystemId) tags.push('Ecosistema');
    if (client.status === 'Activo') tags.push('Cliente Activo');
    
    const daysSinceCreated = (Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) tags.push('Nuevo');
    
    return tags;
  }

  applyFilters(): void {
    this.filteredOpportunities = this.opportunities.filter(opp => {
      if (this.selectedMarket && opp.market !== this.selectedMarket) return false;
      if (this.selectedFlow && opp.businessFlow !== this.selectedFlow) return false;
      if (this.selectedStage && opp.stage !== this.selectedStage) return false;
      if (this.selectedPriority && opp.priority !== this.selectedPriority) return false;
      return true;
    });
  }

  private calculateStats(): void {
    const activeOpportunities = this.filteredOpportunities.filter(o => 
      !['cerrado', 'perdido'].includes(o.stage)
    );

    this.stats = {
      totalOpportunities: activeOpportunities.length,
      totalValue: activeOpportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0),
      averageDealSize: activeOpportunities.length > 0 ? 
        activeOpportunities.reduce((sum, opp) => sum + opp.estimatedValue, 0) / activeOpportunities.length : 0,
      conversionRate: 0.35, // Historical average
      stageDistribution: this.pipelineStages.reduce((acc, stage) => {
        acc[stage.key] = activeOpportunities.filter(o => o.stage === stage.key).length;
        return acc;
      }, {} as { [key: string]: number })
    };
  }

  getStageOpportunities(stage: string): Opportunity[] {
    return this.filteredOpportunities.filter(opp => opp.stage === stage);
  }

  getStageValue(stage: string): number {
    return this.getStageOpportunities(stage)
      .reduce((sum, opp) => sum + opp.estimatedValue, 0);
  }

  refreshPipeline(): void {
    this.loadPipelineData();
    this.toast.success('Pipeline actualizado');
  }

  createNewOpportunity(): void {
    this.router.navigate(['/nueva-oportunidad']);
  }

  viewOpportunity(opportunity: Opportunity): void {
    if (opportunity.clientId.startsWith('prospect-')) {
      // Handle prospects differently - maybe open a modal or create client first
      this.toast.info(`Viendo prospecto: ${opportunity.clientName}`);
    } else {
      this.router.navigate(['/clientes', opportunity.clientId]);
    }
  }

  advanceStage(opportunity: Opportunity): void {
    const currentIndex = this.pipelineStages.findIndex(s => s.key === opportunity.stage);
    if (currentIndex < this.pipelineStages.length - 1) {
      opportunity.stage = this.pipelineStages[currentIndex + 1].key as any;
      opportunity.probability = this.calculateProbability(opportunity.stage, {} as Client);
      opportunity.lastActivity = new Date();
      this.toast.success(`${opportunity.clientName} avanzado a ${this.pipelineStages[currentIndex + 1].name}`);
    }
  }

  canAdvanceStage(opportunity: Opportunity): boolean {
    return !['cerrando', 'cerrado', 'perdido'].includes(opportunity.stage);
  }

  createQuote(opportunity: Opportunity): void {
    this.router.navigate(['/cotizador'], { 
      queryParams: { 
        market: opportunity.market,
        flow: opportunity.businessFlow 
      }
    });
  }

  scheduleFollowUp(opportunity: Opportunity): void {
    this.toast.info(`Programando seguimiento para ${opportunity.clientName}`);
    // Here you would integrate with calendar or CRM system
  }

  getMarketLabel(market: string): string {
    return market === 'aguascalientes' ? 'AGS' : 'EdoMex';
  }

  getBusinessFlowLabel(flow: BusinessFlow): string {
    const labels = {
      [BusinessFlow.VentaPlazo]: 'Venta a Plazo',
      [BusinessFlow.VentaDirecta]: 'Venta Directa',
      [BusinessFlow.AhorroProgramado]: 'Plan de Ahorro',
      [BusinessFlow.CreditoColectivo]: 'Crédito Colectivo'
    };
    return labels[flow] || flow;
  }

  getPriorityIcon(priority: string): string {
    const icons = { alta: '🔴', media: '🟡', baja: '🟢' };
    return icons[priority as keyof typeof icons] || '⚪';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  }

  trackByOpportunityId(index: number, opportunity: Opportunity): string {
    return opportunity.id;
  }
}