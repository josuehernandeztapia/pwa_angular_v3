import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewChecked, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface SimulatorScenario {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  market: 'aguascalientes' | 'edomex';
  clientType: 'Individual' | 'Colectivo';
  route: string;
  gradient: string;
}

interface SavedSimulation {
  id: string;
  clientName: string;
  scenarioType: string;
  scenarioTitle: string;
  market: string;
  clientType: string;
  lastModified: number;
  draftKey: string;
  summary: {
    targetAmount?: number;
    monthlyContribution?: number;
    timeToTarget?: number;
    status: 'draft' | 'completed';
  };
}

@Component({
  selector: 'app-simulador-main',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './simulador-main.component.scss',
  template: `
    <div class="simulator-hub" *ngIf="!isRedirecting">
      <!-- Header -->
      <div class="hub-header">
        <button (click)="goBack()" class="back-btn">← Dashboard</button>
        <h1>🧠 Hub de Simuladores</h1>
        <p>Cerebro de orquestación para escenarios de valor</p>
      </div>

      <!-- Visual Selector - 3 Strategic Cards -->
      <div class="scenarios-grid">
        <div 
          *ngFor="let scenario of availableScenarios" 
          class="scenario-card"
          [class]="scenario.gradient"
          (click)="selectScenario(scenario)"
        >
          <div class="scenario-icon">{{ scenario.icon }}</div>
          <div class="scenario-content">
            <h3>{{ scenario.title }}</h3>
            <p class="scenario-subtitle">{{ scenario.subtitle }}</p>
            <p class="scenario-description">{{ scenario.description }}</p>
          </div>
          <div class="scenario-arrow">→</div>
        </div>
      </div>

      <!-- Quick Context Info -->
      <div class="context-info" *ngIf="smartContext.hasContext">
        <div class="context-banner">
          <span class="context-icon">⚡</span>
          <div class="context-text">
            <strong>Contexto detectado:</strong> 
            {{ smartContext.market }} • {{ smartContext.clientType }} 
            <span *ngIf="smartContext.clientName"> • {{ smartContext.clientName }}</span>
          </div>
        </div>
      </div>

      <!-- FASE 2: Dashboard de Simulaciones Previas -->
      <div class="saved-simulations" *ngIf="savedSimulations.length > 0">
        <div class="section-header">
          <h2>💾 Simulaciones Recientes (Borradores)</h2>
          <p>Continúa donde lo dejaste</p>
        </div>
        
        <div class="simulations-grid">
          <div 
            *ngFor="let simulation of savedSimulations.slice(0, 5)" 
            class="simulation-card"
            [class.draft]="simulation.summary.status === 'draft'"
            [class.completed]="simulation.summary.status === 'completed'"
            [class.comparison-mode]="comparisonMode"
            [class.selected-for-comparison]="selectedForComparison.has(simulation.id)"
          >
            <!-- FASE 3: Comparison Checkbox -->
            <div class="comparison-checkbox" *ngIf="comparisonMode">
              <input 
                type="checkbox" 
                [id]="'compare-' + simulation.id"
                [checked]="selectedForComparison.has(simulation.id)"
                [disabled]="!selectedForComparison.has(simulation.id) && selectedForComparison.size >= 3"
                (change)="toggleSimulationSelection(simulation.id)"
              />
              <label [for]="'compare-' + simulation.id" class="checkbox-label"></label>
            </div>

            <div class="simulation-header">
              <div class="simulation-meta">
                <h4>{{ simulation.clientName || 'Cliente sin nombre' }}</h4>
                <span class="simulation-type">{{ simulation.scenarioTitle }}</span>
              </div>
              <div class="simulation-actions" *ngIf="!comparisonMode">
                <button (click)="continueSimulation(simulation)" class="continue-btn">
                  📂 Continuar
                </button>
                <button (click)="deleteSimulation(simulation.id)" class="delete-btn">
                  🗑️
                </button>
              </div>
            </div>

            <div class="simulation-details">
              <div class="detail-row">
                <span class="detail-label">Mercado:</span>
                <span class="detail-value">{{ getMarketLabel(simulation.market) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Tipo:</span>
                <span class="detail-value">{{ simulation.clientType }}</span>
              </div>
              <div class="detail-row" *ngIf="simulation.summary.targetAmount">
                <span class="detail-label">Meta:</span>
                <span class="detail-value">{{ simulation.summary.targetAmount | currency:'MXN':'symbol':'1.0-0' }}</span>
              </div>
              <div class="detail-row" *ngIf="simulation.summary.monthlyContribution">
                <span class="detail-label">Mensual:</span>
                <span class="detail-value">{{ simulation.summary.monthlyContribution | currency:'MXN':'symbol':'1.0-0' }}</span>
              </div>
            </div>

            <div class="simulation-footer">
              <span class="last-modified">
                {{ formatLastModified(simulation.lastModified) }}
              </span>
              <span class="simulation-status" [class]="simulation.summary.status">
                {{ simulation.summary.status === 'draft' ? '📝 Borrador' : '✅ Completado' }}
              </span>
            </div>
          </div>
        </div>

        <!-- FASE 3: Comparison Controls -->
          <div class="comparison-controls" *ngIf="savedSimulations.length > 1" data-cy="comparison-controls">
            <div class="comparison-header">
              <button 
                (click)="toggleComparisonMode()" 
                [class.active]="comparisonMode"
              class="comparison-toggle-btn" data-cy="toggle-compare">
                {{ comparisonMode ? '✅ Modo Comparación' : '📊 Comparar Escenarios' }}
              </button>
            
            <div class="comparison-counter" *ngIf="comparisonMode">
              <span class="counter-text">
                {{ selectedForComparison.size }}/3 seleccionados
              </span>
              <button 
                (click)="clearSelection()" 
                *ngIf="selectedForComparison.size > 0"
                class="clear-selection-btn">
                Limpiar
              </button>
            </div>
          </div>

          <div class="comparison-actions" *ngIf="comparisonMode && selectedForComparison.size > 1">
            <button 
              (click)="compareSelectedSimulations()" 
              [disabled]="selectedForComparison.size < 2"
              class="compare-btn" data-cy="open-comparison">
              🔬 Comparar {{ selectedForComparison.size }} Escenarios
            </button>
          </div>
        </div>

        <div class="simulations-actions" *ngIf="savedSimulations.length > 5">
          <button (click)="showAllSimulations()" class="show-all-btn">
            Ver todas las simulaciones ({{ savedSimulations.length }})
          </button>
        </div>
      </div>

      <!-- Empty State for No Simulations -->
      <div class="empty-simulations" *ngIf="savedSimulations.length === 0 && !smartContext.hasContext">
        <div class="empty-content">
          <div class="empty-icon">📊</div>
          <h3>Primera vez en el Hub de Simuladores</h3>
          <p>Selecciona un escenario arriba para comenzar tu primera simulación. Tus borradores aparecerán aquí para continuar más tarde.</p>
        </div>
      </div>
    </div>

    <!-- Smart Redirection Loading -->
    <div class="smart-redirect" *ngIf="isRedirecting">
      <div class="redirect-content">
        <div class="redirect-spinner"></div>
        <h2>🧠 Analizando contexto...</h2>
        <p>{{ redirectMessage }}</p>
      </div>
    </div>

    <!-- FASE 3: Comparison Modal -->
    <div class="comparison-modal" *ngIf="showComparisonModal" data-cy="comparison-modal">
      <div class="modal-overlay" (click)="closeComparisonModal()"></div>
      <div class="comparison-modal-content" role="dialog" aria-modal="true" aria-labelledby="cmp-title" tabindex="-1" #cmpDialog>
        <div class="comparison-modal-header">
          <h2 id="cmp-title">📊 Comparación de Escenarios</h2>
          <button (click)="closeComparisonModal()" class="modal-close-btn" #cmpClose aria-label="Cerrar">×</button>
        </div>

        <div class="comparison-table-container">
          <table class="comparison-table table-lg">
            <thead>
              <tr>
                <th class="metric-column">Métrica</th>
                <th *ngFor="let sim of getSelectedSimulations()" class="scenario-column">
                  <div class="scenario-header">
                    <div class="scenario-name">{{ sim.clientName }}</div>
                    <div class="scenario-type">{{ sim.scenarioTitle }}</div>
                    <div class="scenario-market">{{ getMarketLabel(sim.market) }}</div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="metric-row">
                <td class="metric-label">🎯 Meta Total</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value num">
                  {{ sim.summary.targetAmount ? (sim.summary.targetAmount | currency:'MXN':'symbol':'1.0-0') : 'N/D' }}
                </td>
              </tr>
              <tr class="metric-row">
                <td class="metric-label">💰 Aportación Mensual</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value num">
                  {{ sim.summary.monthlyContribution ? (sim.summary.monthlyContribution | currency:'MXN':'symbol':'1.0-0') : 'N/D' }}
                </td>
              </tr>
              <tr class="metric-row">
                <td class="metric-label">⏱️ Tiempo a la Meta</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value num">
                  {{ sim.summary.timeToTarget ? (sim.summary.timeToTarget + ' meses') : 'N/D' }}
                </td>
              </tr>
              <tr class="metric-row">
                <td class="metric-label">📊 Tipo de Cliente</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value">
                  {{ sim.clientType }}
                </td>
              </tr>
              <tr class="metric-row">
                <td class="metric-label">📅 Estado</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value">
                  <span class="status-badge" [class]="sim.summary.status">
                    {{ sim.summary.status === 'draft' ? '📝 Borrador' : '✅ Completado' }}
                  </span>
                </td>
              </tr>
              <tr class="metric-row highlight-row">
                <td class="metric-label">🎯 Eficiencia</td>
                <td *ngFor="let sim of getSelectedSimulations()" class="metric-value">
                  <div class="efficiency-score" [class]="getEfficiencyClass(sim)">
                    {{ getEfficiencyScore(sim) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="comparison-insights">
          <h3>💡 Insights Automáticos</h3>
          <div class="insights-grid">
            <div class="insight-card">
              <div class="insight-icon">👑</div>
              <div class="insight-content">
                <h4>Mejor Opción</h4>
                <p>{{ getBestOption() }}</p>
              </div>
            </div>
            <div class="insight-card">
              <div class="insight-icon">⚡</div>
              <div class="insight-content">
                <h4>Más Rápido</h4>
                <p>{{ getFastestOption() }}</p>
              </div>
            </div>
            <div class="insight-card">
              <div class="insight-icon">💰</div>
              <div class="insight-content">
                <h4>Menor Aportación</h4>
                <p>{{ getLowestContributionOption() }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="comparison-modal-actions">
          <button (click)="exportComparison()" class="export-btn">
            📋 Exportar Comparación
          </button>
          <button (click)="shareComparison()" class="share-btn">
            📱 Compartir WhatsApp
          </button>
          <button (click)="closeComparisonModal()" class="close-modal-btn">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `
})
export class SimuladorMainComponent implements OnInit, AfterViewChecked {
  @ViewChild('cmpDialog') cmpDialog?: ElementRef<HTMLDivElement>;
  @ViewChild('cmpClose') cmpClose?: ElementRef<HTMLButtonElement>;
  isRedirecting = false;
  redirectMessage = '';
  
  smartContext = {
    hasContext: false,
    market: '',
    clientType: '',
    clientName: '',
    source: ''
  };

  // FASE 2: Saved Simulations
  savedSimulations: SavedSimulation[] = [];

  // FASE 3: Comparison Tool
  selectedForComparison: Set<string> = new Set();
  showComparisonModal = false;
  comparisonMode = false;

  availableScenarios: SimulatorScenario[] = [
    {
      id: 'ags-ahorro',
      title: 'Proyector de Ahorro y Liquidación',
      subtitle: '🌵 AGS Individual',
      icon: '🏦',
      description: 'Modela un plan de ahorro con aportación fuerte y recaudación para clientes de Aguascalientes.',
      market: 'aguascalientes',
      clientType: 'Individual',
      route: '/simulador/ags-ahorro',
      gradient: 'ags-gradient'
    },
    {
      id: 'edomex-individual',
      title: 'Planificador de Enganche',
      subtitle: '🏢 EdoMex Individual',
      icon: '📊',
      description: 'Proyecta el tiempo para alcanzar la meta de enganche para un cliente individual en EdoMex.',
      market: 'edomex',
      clientType: 'Individual',
      route: '/simulador/edomex-individual',
      gradient: 'edomex-individual-gradient'
    },
    {
      id: 'tanda-colectiva',
      title: 'Simulador de Tanda Colectiva',
      subtitle: '👥 EdoMex Colectivo',
      icon: '🔄',
      description: 'Modela el "efecto bola de nieve" para un grupo de crédito colectivo.',
      market: 'edomex',
      clientType: 'Colectivo',
      route: '/simulador/tanda-colectiva',
      gradient: 'edomex-collective-gradient'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.analyzeContext();
    this.loadSavedSimulations();
  }

  ngAfterViewChecked(): void {
    // Move focus to dialog when it opens
    if (this.showComparisonModal && this.cmpDialog?.nativeElement) {
      const el = this.cmpDialog.nativeElement;
      if (document.activeElement !== el) {
        el.focus();
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.showComparisonModal) this.closeComparisonModal();
  }

  private analyzeContext(): void {
    // Check for smart context from Nueva Oportunidad or other sources
    this.route.queryParams.subscribe((params: any) => {
      const market = params['market'];
      const clientType = params['clientType'];
      const clientName = params['clientName'];
      const source = params['source'];

      if (market && clientType) {
        this.smartContext = {
          hasContext: true,
          market,
          clientType,
          clientName: clientName || '',
          source: source || 'unknown'
        };

        // SMART CONTEXT INTEGRATION: Automatic redirection
        this.performSmartRedirection();
      }
    });
  }

  private performSmartRedirection(): void {
    if (!this.smartContext.hasContext) return;

    this.isRedirecting = true;
    this.redirectMessage = `Detecté contexto: ${this.smartContext.market} ${this.smartContext.clientType}. Navegando al simulador óptimo...`;

    // Find the matching scenario
    const targetScenario = this.availableScenarios.find(scenario => 
      scenario.market === this.smartContext.market && 
      scenario.clientType === this.smartContext.clientType
    );

    if (targetScenario) {
      // Simulate intelligent processing time
      setTimeout(() => {
        this.redirectMessage = `Lanzando ${targetScenario.title}...`;
        
        setTimeout(() => {
          this.router.navigate([targetScenario.route], {
            queryParams: {
              market: this.smartContext.market,
              clientType: this.smartContext.clientType,
              clientName: this.smartContext.clientName,
              fromHub: 'true'
            }
          });
        }, 800);
      }, 1200);
    } else {
      // Fallback: show selector
      this.isRedirecting = false;
    }
  }

  selectScenario(scenario: SimulatorScenario): void {
    // Navigate to Nueva Oportunidad with pre-selected context for full onboarding
    this.router.navigate(['/nueva-oportunidad'], {
      queryParams: {
        market: scenario.market,
        clientType: scenario.clientType,
        preselectedFlow: 'SIMULACION',
        targetSimulator: scenario.id,
        fromHub: 'true'
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // === FASE 2: SAVED SIMULATIONS MANAGEMENT ===
  
  private loadSavedSimulations(): void {
    const allKeys = Object.keys(localStorage);
    const draftKeys = allKeys.filter(key => 
      key.includes('-draft') || 
      key.includes('Scenario') ||
      key.includes('agsScenario') ||
      key.includes('edomexScenario')
    );

    this.savedSimulations = [];

    draftKeys.forEach(key => {
      try {
        const draftData = JSON.parse(localStorage.getItem(key) || '{}');
        
        if (this.isValidSimulationDraft(draftData)) {
          const simulation: SavedSimulation = {
            id: key,
            clientName: draftData.clientName || draftData.client?.name || 'Cliente sin nombre',
            scenarioType: this.inferScenarioType(key, draftData),
            scenarioTitle: this.getScenarioTitle(key, draftData),
            market: draftData.market || this.inferMarket(key),
            clientType: draftData.clientType || this.inferClientType(key),
            lastModified: draftData.timestamp || draftData.lastModified || Date.now(),
            draftKey: key,
            summary: this.extractSummary(draftData, key)
          };

          this.savedSimulations.push(simulation);
        }
      } catch (error) {
        console.warn(`Error parsing draft ${key}:`, error);
      }
    });

    // Sort by last modified (most recent first)
    this.savedSimulations.sort((a, b) => b.lastModified - a.lastModified);
  }

  private isValidSimulationDraft(data: any): boolean {
    return data && (
      data.clientName || 
      data.targetAmount || 
      data.monthlyContribution ||
      data.scenario ||
      data.configParams
    );
  }

  private inferScenarioType(key: string, data: any): string {
    if (key.includes('ags') || data.market === 'aguascalientes') return 'ags-ahorro';
    if (key.includes('edomex-individual') || data.type === 'EDOMEX_INDIVIDUAL') return 'edomex-individual';
    if (key.includes('tanda') || key.includes('collective') || data.type === 'EDOMEX_COLLECTIVE') return 'tanda-colectiva';
    return 'unknown';
  }

  private getScenarioTitle(key: string, data: any): string {
    const scenarioType = this.inferScenarioType(key, data);
    const scenario = this.availableScenarios.find(s => s.id === scenarioType);
    return scenario?.title || 'Simulación';
  }

  private inferMarket(key: string): string {
    if (key.includes('ags')) return 'aguascalientes';
    if (key.includes('edomex')) return 'edomex';
    return 'unknown';
  }

  private inferClientType(key: string): string {
    if (key.includes('individual')) return 'Individual';
    if (key.includes('collective') || key.includes('tanda')) return 'Colectivo';
    return 'Individual';
  }

  private extractSummary(data: any, key: string): SavedSimulation['summary'] {
    // Try different data structures based on simulator type
    const summary: SavedSimulation['summary'] = {
      status: 'draft'
    };

    // AGS Ahorro format
    if (data.scenario) {
      summary.targetAmount = data.scenario.targetAmount;
      summary.monthlyContribution = data.scenario.monthlyContribution;
      summary.timeToTarget = data.scenario.monthsToTarget;
    }

    // EdoMex Individual format  
    if (data.targetDownPayment || data.configParams?.targetDownPayment) {
      summary.targetAmount = data.targetDownPayment || data.configParams?.targetDownPayment;
    }

    // Tanda Colectiva format
    if (data.simulationResult) {
      summary.targetAmount = data.simulationResult.scenario?.targetAmount;
      summary.monthlyContribution = data.simulationResult.scenario?.monthlyContribution;
      summary.timeToTarget = data.simulationResult.scenario?.monthsToTarget;
    }

    // Generic formats
    if (data.targetAmount) summary.targetAmount = data.targetAmount;
    if (data.monthlyContribution) summary.monthlyContribution = data.monthlyContribution;

    return summary;
  }

  continueSimulation(simulation: SavedSimulation): void {
    const scenario = this.availableScenarios.find(s => s.id === simulation.scenarioType);
    
    if (scenario) {
      // Navigate directly to the specific simulator with the draft data
      this.router.navigate([scenario.route], {
        queryParams: {
          market: simulation.market,
          clientType: simulation.clientType,
          clientName: simulation.clientName,
          resumeDraft: 'true',
          draftKey: simulation.draftKey
        }
      });
    } else {
      console.error('Scenario not found:', simulation.scenarioType);
    }
  }

  deleteSimulation(simulationId: string): void {
    if (confirm('¿Estás seguro de eliminar esta simulación? Esta acción no se puede deshacer.')) {
      localStorage.removeItem(simulationId);
      this.loadSavedSimulations(); // Refresh the list
    }
  }

  showAllSimulations(): void {
    // Future implementation: navigate to a full simulations management page
    console.log('Show all simulations - Future implementation');
  }

  getMarketLabel(market: string): string {
    switch (market) {
      case 'aguascalientes': return 'Aguascalientes';
      case 'edomex': return 'Estado de México';
      default: return market;
    }
  }

  formatLastModified(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days} días`;
    
    return new Date(timestamp).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short'
    });
  }

  // === FASE 3: COMPARISON TOOL METHODS ===
  
  toggleComparisonMode(): void {
    this.comparisonMode = !this.comparisonMode;
    if (!this.comparisonMode) {
      this.selectedForComparison.clear();
    }
  }

  toggleSimulationSelection(simulationId: string): void {
    if (this.selectedForComparison.has(simulationId)) {
      this.selectedForComparison.delete(simulationId);
    } else {
      if (this.selectedForComparison.size < 3) {
        this.selectedForComparison.add(simulationId);
      }
    }
  }

  clearSelection(): void {
    this.selectedForComparison.clear();
  }

  compareSelectedSimulations(): void {
    if (this.selectedForComparison.size >= 2) {
      this.showComparisonModal = true;
    }
  }

  getSelectedSimulations(): SavedSimulation[] {
    return this.savedSimulations.filter(sim => 
      this.selectedForComparison.has(sim.id)
    );
  }

  getEfficiencyScore(simulation: SavedSimulation): string {
    if (!simulation.summary.targetAmount || !simulation.summary.monthlyContribution) {
      return 'N/D';
    }

    const targetAmount = simulation.summary.targetAmount;
    const monthlyContribution = simulation.summary.monthlyContribution;
    const timeToTarget = simulation.summary.timeToTarget || 0;
    
    // Calculate efficiency score based on contribution to target ratio
    const contributionRatio = monthlyContribution / targetAmount;
    const timeEfficiency = timeToTarget > 0 ? (1 / timeToTarget) * 100 : 0;
    
    // Weighted score: 60% contribution efficiency, 40% time efficiency
    const score = (contributionRatio * 60000) + (timeEfficiency * 40);
    
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Buena';
    if (score >= 40) return 'Regular';
    return 'Baja';
  }

  getEfficiencyClass(simulation: SavedSimulation): string {
    const score = this.getEfficiencyScore(simulation);
    switch (score) {
      case 'Excelente': return 'excellent';
      case 'Buena': return 'good';
      case 'Regular': return 'fair';
      default: return 'poor';
    }
  }

  getBestOption(): string {
    const selected = this.getSelectedSimulations();
    if (selected.length === 0) return 'No hay simulaciones seleccionadas';
    
    let bestSim = selected[0];
    let bestScore = -1;
    
    selected.forEach(sim => {
      const score = this.calculateOverallScore(sim);
      if (score > bestScore) {
        bestScore = score;
        bestSim = sim;
      }
    });
    
    return `${bestSim.clientName} - ${bestSim.scenarioTitle}`;
  }

  getFastestOption(): string {
    const selected = this.getSelectedSimulations();
    if (selected.length === 0) return 'No hay simulaciones seleccionadas';
    
    const withTime = selected.filter(sim => sim.summary.timeToTarget);
    if (withTime.length === 0) return 'Información de tiempo no disponible';
    
    const fastest = withTime.reduce((min, sim) => 
      (sim.summary.timeToTarget || 999) < (min.summary.timeToTarget || 999) ? sim : min
    );
    
    return `${fastest.clientName} - ${fastest.summary.timeToTarget} meses`;
  }

  getLowestContributionOption(): string {
    const selected = this.getSelectedSimulations();
    if (selected.length === 0) return 'No hay simulaciones seleccionadas';
    
    const withContribution = selected.filter(sim => sim.summary.monthlyContribution);
    if (withContribution.length === 0) return 'Información de aportación no disponible';
    
    const lowest = withContribution.reduce((min, sim) => 
      (sim.summary.monthlyContribution || 999999) < (min.summary.monthlyContribution || 999999) ? sim : min
    );
    
    return `${lowest.clientName} - $${lowest.summary.monthlyContribution?.toLocaleString('es-MX')}`;
  }

  private calculateOverallScore(simulation: SavedSimulation): number {
    let score = 0;
    
    // Status weight (completed simulations score higher)
    if (simulation.summary.status === 'completed') score += 30;
    
    // Target amount reasonable range (middle scores higher)
    if (simulation.summary.targetAmount) {
      const amount = simulation.summary.targetAmount;
      if (amount >= 50000 && amount <= 500000) score += 20;
      else if (amount >= 20000 && amount <= 1000000) score += 10;
    }
    
    // Monthly contribution feasibility (lower is better for accessibility)
    if (simulation.summary.monthlyContribution) {
      const monthly = simulation.summary.monthlyContribution;
      if (monthly <= 3000) score += 25;
      else if (monthly <= 7000) score += 15;
      else if (monthly <= 15000) score += 5;
    }
    
    // Time to target efficiency
    if (simulation.summary.timeToTarget) {
      const months = simulation.summary.timeToTarget;
      if (months <= 12) score += 15;
      else if (months <= 24) score += 10;
      else if (months <= 36) score += 5;
    }
    
    // Recent activity bonus
    const daysSinceModified = (Date.now() - simulation.lastModified) / (1000 * 60 * 60 * 24);
    if (daysSinceModified <= 1) score += 10;
    else if (daysSinceModified <= 7) score += 5;
    
    return score;
  }

  exportComparison(): void {
    const selected = this.getSelectedSimulations();
    const comparisonData = {
      timestamp: new Date().toISOString(),
      simulations: selected.map(sim => ({
        clientName: sim.clientName,
        scenarioTitle: sim.scenarioTitle,
        market: this.getMarketLabel(sim.market),
        clientType: sim.clientType,
        targetAmount: sim.summary.targetAmount,
        monthlyContribution: sim.summary.monthlyContribution,
        timeToTarget: sim.summary.timeToTarget,
        status: sim.summary.status,
        efficiency: this.getEfficiencyScore(sim)
      })),
      insights: {
        bestOption: this.getBestOption(),
        fastestOption: this.getFastestOption(),
        lowestContribution: this.getLowestContributionOption()
      }
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(comparisonData, null, 2)], { 
      type: 'application/json' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparacion-simulaciones-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  shareComparison(): void {
    const selected = this.getSelectedSimulations();
    const bestOption = this.getBestOption();
    const fastestOption = this.getFastestOption();
    const lowestContribution = this.getLowestContributionOption();
    
    const message = `📊 *Comparación de Simulaciones*\n\n` +
      `🔬 Analizadas: ${selected.length} opciones\n\n` +
      `👑 *Mejor Opción General:*\n${bestOption}\n\n` +
      `⚡ *Opción Más Rápida:*\n${fastestOption}\n\n` +
      `💰 *Menor Aportación Mensual:*\n${lowestContribution}\n\n` +
      `📋 *Detalles:*\n` +
      selected.map(sim => {
        const target = sim.summary.targetAmount ? `$${sim.summary.targetAmount.toLocaleString('es-MX')}` : 'N/D';
        const monthly = sim.summary.monthlyContribution ? `$${sim.summary.monthlyContribution.toLocaleString('es-MX')}` : 'N/D';
        const months = sim.summary.timeToTarget ? `${sim.summary.timeToTarget} meses` : 'N/D';
        return `• ${sim.clientName} (${sim.scenarioTitle})\n  Meta: ${target} | Mensual: ${monthly} | Tiempo: ${months}`;
      }).join('\n') +
      `\n\n🚗 Generado desde Conductores PWA`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  closeComparisonModal(): void {
    this.showComparisonModal = false;
  }
}
