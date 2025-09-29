import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewChecked, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Chart } from 'chart.js/auto';
import { IconComponent } from '../../shared/icon/icon.component';

interface SimulatorScenario {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  iconType?: string;
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
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './simulador-main.component.html',
  styleUrls: ['./simulador-main.component.scss'],
})
export class SimuladorMainComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('cmpDialog') cmpDialog?: ElementRef<HTMLDivElement>;
  @ViewChild('cmpClose') cmpClose?: ElementRef<HTMLButtonElement>;
  isRedirecting = false;
  redirectMessage = '';

  // PR#6: Chart.js integration for minimalista charts
  private ahorroChart?: Chart;
  private pmtChart?: Chart;

  simulationResults = {
    loading: false,
    selectedScenario: null as string | null,
    data: {
      ahorro: 15000,
      plazo: 24,
      pmt: 3250
    }
  };
  
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
      subtitle: 'AGS Individual',
      iconType: 'bank',
      description: 'Modela un plan de ahorro con aportación fuerte y recaudación para clientes de Aguascalientes.',
      market: 'aguascalientes',
      clientType: 'Individual',
      route: '/simulador/ags-ahorro',
      gradient: 'ags-gradient'
    },
    {
      id: 'edomex-individual',
      title: 'Planificador de Enganche',
      subtitle: 'EdoMex Individual',
      iconType: 'chart',
      description: 'Proyecta el tiempo para alcanzar la meta de enganche para un cliente individual en EdoMex.',
      market: 'edomex',
      clientType: 'Individual',
      route: '/simulador/edomex-individual',
      gradient: 'edomex-individual-gradient'
    },
    {
      id: 'tanda-colectiva',
      title: 'Simulador de Tanda Colectiva',
      subtitle: 'EdoMex Colectivo',
      icon: '',
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
    this.simulationResults.selectedScenario = scenario.id;
    this.simulationResults.loading = true;

    // Simulate API call
    setTimeout(() => {
      this.simulationResults.loading = false;
      this.initializeCharts();
    }, 2000);

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
    
    const message = `*Comparación de Simulaciones*\n\n` +
      ` Analizadas: ${selected.length} opciones\n\n` +
      `*Mejor Opción General:*\n${bestOption}\n\n` +
      `*Opción Más Rápida:*\n${fastestOption}\n\n` +
      `*Menor Aportación Mensual:*\n${lowestContribution}\n\n` +
      ` *Detalles:*\n` +
      selected.map(sim => {
        const target = sim.summary.targetAmount ? `$${sim.summary.targetAmount.toLocaleString('es-MX')}` : 'N/D';
        const monthly = sim.summary.monthlyContribution ? `$${sim.summary.monthlyContribution.toLocaleString('es-MX')}` : 'N/D';
        const months = sim.summary.timeToTarget ? `${sim.summary.timeToTarget} meses` : 'N/D';
        return `• ${sim.clientName} (${sim.scenarioTitle})\n  Meta: ${target} | Mensual: ${monthly} | Tiempo: ${months}`;
      }).join('\n') +
      `\n\nGenerado desde Conductores PWA`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  closeComparisonModal(): void {
    this.showComparisonModal = false;
  }

  ngAfterViewInit(): void {
    // Initialize charts after view is ready
    if (this.simulationResults.selectedScenario && !this.simulationResults.loading) {
      this.initializeCharts();
    }
  }

  private initializeCharts(): void {
    setTimeout(() => {
      this.createAhorroChart();
      this.createPMTChart();
    }, 100);
  }

  private createAhorroChart(): void {
    const canvas = document.getElementById('chartAhorro') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.ahorroChart) {
      this.ahorroChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.ahorroChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Mes 1', 'Mes 6', 'Mes 12', 'Mes 18', 'Mes 24'],
        datasets: [{
          label: 'Ahorro Acumulado',
          data: [3250, 19500, 39000, 58500, 78000],
          borderColor: 'var(--color-accent-primary, #0EA5E9)',
          backgroundColor: 'var(--color-accent-primary-muted, rgba(14, 165, 233, 0.1))',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString('es-MX');
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  private createPMTChart(): void {
    const canvas = document.getElementById('chartPMT') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.pmtChart) {
      this.pmtChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.pmtChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Año 1', 'Año 2', 'Promedio'],
        datasets: [{
          label: 'PMT Mensual',
          data: [3250, 3250, 3250],
          backgroundColor: ['var(--color-accent-primary, #0EA5E9)', 'var(--color-accent-primary, #0EA5E9)', 'var(--color-success, #10B981)'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString('es-MX');
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
