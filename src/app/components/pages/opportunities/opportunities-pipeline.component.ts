import { Component, HostBinding, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../../shared/icon/icon.component';
import { ApiService } from '../../../services/api.service';
import { CotizadorEngineService } from '../../../services/cotizador-engine.service';
import { ToastService } from '../../../services/toast.service';
import { Client, BusinessFlow, Market } from '../../../models/types';
import { Quote } from '../../../models/business';
import { getDataColor } from '../../../styles/design-tokens';

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
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  templateUrl: './opportunities-pipeline.component.html',
  styleUrls: ['./opportunities-pipeline.component.scss']
})
export class OpportunitiesPipelineComponent implements OnInit {
  @HostBinding('class') readonly hostClass = 'pipeline-page';
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
    { key: 'prospecto', name: 'Prospecto', icon: '' },
    { key: 'cotizando', name: 'Cotizando', icon: '' },
    { key: 'negociando', name: 'Negociando', icon: '🤝' },
    { key: 'documentando', name: 'Documentando', icon: '' },
    { key: 'cerrando', name: 'Cerrando', icon: '' }
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
        clientPhone: client.phone || '',
        clientEmail: client.email || '',
        market: client.market as Market,
        businessFlow: client.flow,
        stage,
        priority,
        estimatedValue,
        probability,
        expectedCloseDate: this.calculateExpectedCloseDate(stage),
        lastActivity: client.lastModified || new Date(),
        nextAction: this.getNextAction(stage, client),
        tags: this.generateTags(client),
        notes: `Oportunidad generada para ${client.name}`,
        createdAt: client.createdAt || new Date()
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
    const baseValues: Record<BusinessFlow, number> = {
      [BusinessFlow.VentaPlazo]: client.market === 'aguascalientes' ? 853000 : 937000,
      [BusinessFlow.VentaDirecta]: client.market === 'aguascalientes' ? 853000 : 837000,
      [BusinessFlow.AhorroProgramado]: 600000,
      [BusinessFlow.CreditoColectivo]: 937000 * 5,
      [BusinessFlow.Individual]: 700000
    };
    
    return baseValues[client.flow] || 800000;
  }

  private determineStage(client: Client): Opportunity['stage'] {
    // Determine stage based on client status and documents
    const hasQuote = (client as any).quotes && (client as any).quotes.length > 0;
    const hasApprovedDocs = client.documents.some(d => d.status === 'Aprobado');
    const docCompleteness = client.documents.filter(d => d.status === 'Aprobado').length / client.documents.length;

    if (docCompleteness > 0.8) return 'cerrando';
    if (hasApprovedDocs && docCompleteness > 0.5) return 'documentando';
    if (hasQuote) return 'negociando';
    if (client.status === 'Activo') return 'cotizando';
    
    return 'prospecto';
  }

  private determinePriority(client: Client, estimatedValue: number): Opportunity['priority'] {
    const createdAt = client.createdAt || new Date();
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
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
    
    const createdAt = client.createdAt || new Date();
    const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
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
    const labels: Record<BusinessFlow, string> = {
      [BusinessFlow.VentaPlazo]: 'Venta a Plazo',
      [BusinessFlow.VentaDirecta]: 'Venta Directa',
      [BusinessFlow.AhorroProgramado]: 'Plan de Ahorro',
      [BusinessFlow.CreditoColectivo]: 'Crédito Colectivo',
      [BusinessFlow.Individual]: 'Individual'
    };
    return labels[flow] || flow;
  }

  getPriorityClasses(priority: Opportunity['priority']): Record<string, boolean> {
    return {
      'opportunities-pipeline__card--priority-alta': priority === 'alta',
      'opportunities-pipeline__card--priority-media': priority === 'media',
      'opportunities-pipeline__card--priority-baja': priority === 'baja'
    };
  }

  getPriorityBadgeClasses(priority: Opportunity['priority']): Record<string, boolean> {
    return {
      'opportunities-pipeline__card-priority--alta': priority === 'alta',
      'opportunities-pipeline__card-priority--media': priority === 'media',
      'opportunities-pipeline__card-priority--baja': priority === 'baja'
    };
  }

  getPriorityIcon(priority: string): string {
    const icons = { alta: '<svg class="priority-icon priority-icon--high" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/></svg>', media: '<svg class="priority-icon priority-icon--medium" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/></svg>', baja: '<svg class="priority-icon priority-icon--low" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8"/></svg>' };
    return icons[priority as keyof typeof icons] || '⚪';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getProgressColor(probability: number): string {
    // Use OpenAI data visualization colors based on probability ranges
    if (probability >= 80) {
      return getDataColor('secondary'); // Green for high probability
    } else if (probability >= 50) {
      return getDataColor('primary'); // Blue for medium probability
    } else if (probability >= 25) {
      return getDataColor('warning'); // Orange for low probability
    } else {
      return getDataColor('danger'); // Red for very low probability
    }
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
