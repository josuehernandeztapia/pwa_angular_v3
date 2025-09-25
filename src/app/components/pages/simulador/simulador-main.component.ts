import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewChecked, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Chart } from 'chart.js/auto';

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
    <!-- Skip Link for Accessibility -->
    <a class="skip-link" href="#main-content">Saltar al contenido principal</a>

    <div class="ui-container ui-section" *ngIf="!isRedirecting">
      <!-- Header -->
      <div class="mb-8">
        <button (click)="goBack()" class="ui-btn ui-btn-ghost mb-4">← Dashboard</button>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Hub de Simuladores</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Herramientas de simulación financiera para diferentes escenarios</p>
      </div>

      <!-- Hub de escenarios -->
      <div id="main-content" class="grid gap-4 md:grid-cols-3 mb-8">
        <div
          *ngFor="let scenario of availableScenarios"
          class="ui-card hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          [attr.data-cy]="'sim-' + scenario.id.replace('_', '-').toLowerCase()"
          (click)="selectScenario(scenario)"
        >
          <div class="text-2xl mb-3">{{ scenario.icon }}</div>
          <h3 class="text-sm font-semibold mb-2">{{ scenario.title }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">{{ scenario.subtitle }}</p>
          <p class="text-xs text-slate-600 dark:text-slate-300">{{ scenario.description }}</p>
        </div>
      </div>

      <!-- Context Info -->
      <div *ngIf="smartContext.hasContext" class="ui-alert ui-alert-info mb-6">
        <div class="flex items-center space-x-2">
          <span class="text-lg">⚡</span>
          <div>
            <strong>Contexto detectado:</strong>
            {{ smartContext.market }} • {{ smartContext.clientType }}
            <span *ngIf="smartContext.clientName"> • {{ smartContext.clientName }}</span>
          </div>
        </div>
      </div>

      <section class="ui-card mb-6" *ngIf="simulationResults.selectedScenario">
        <h2 class="text-sm font-semibold mb-3">Resultado de Simulación</h2>

        <!-- Skeleton loader -->
        <div *ngIf="simulationResults.loading" class="animate-pulse space-y-3">
          <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>

        <!-- KPIs -->
        <div *ngIf="!simulationResults.loading" class="grid gap-3 md:grid-cols-3">
          <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
            <div class="text-xs text-slate-500 dark:text-slate-400">Ahorro</div>
            <div class="text-xl font-semibold" data-cy="sim-ahorro">
              {{ formatCurrency(simulationResults.data.ahorro) }}
            </div>
          </div>
          <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
            <div class="text-xs text-slate-500 dark:text-slate-400">Plazo</div>
            <div class="text-xl font-semibold" data-cy="sim-plazo">
              {{ simulationResults.data.plazo }} meses
            </div>
          </div>
          <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
            <div class="text-xs text-slate-500 dark:text-slate-400">PMT Proyectado</div>
            <div class="text-xl font-semibold" data-cy="sim-pmt">
              {{ formatCurrency(simulationResults.data.pmt) }}
            </div>
          </div>
        </div>
      </section>

      <!-- Charts -->
      <div class="grid gap-4 md:grid-cols-2 mb-6" *ngIf="simulationResults.selectedScenario && !simulationResults.loading">
        <div class="ui-card">
          <h2 class="text-sm font-semibold mb-3">Ahorro acumulado</h2>
          <canvas id="chartAhorro" data-cy="chart-ahorro"></canvas>
        </div>
        <div class="ui-card">
          <h2 class="text-sm font-semibold mb-3">PMT mensual</h2>
          <canvas id="chartPMT" data-cy="chart-pmt"></canvas>
        </div>
      </div>

      <!-- Simulaciones Guardadas -->
      <section class="mb-8" *ngIf="savedSimulations.length > 0">
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">💾 Simulaciones Recientes</h2>
          <p class="text-sm text-slate-600 dark:text-slate-400">Continúa donde lo dejaste</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            *ngFor="let simulation of savedSimulations.slice(0, 5)"
            class="ui-card relative"
            [class.ring-2]="selectedForComparison.has(simulation.id)"
            [class.ring-sky-500]="selectedForComparison.has(simulation.id)"
          >
            <!-- Comparison Checkbox -->
            <div class="absolute top-3 left-3" *ngIf="comparisonMode">
              <input
                type="checkbox"
                [id]="'compare-' + simulation.id"
                [checked]="selectedForComparison.has(simulation.id)"
                [disabled]="!selectedForComparison.has(simulation.id) && selectedForComparison.size >= 3"
                (change)="toggleSimulationSelection(simulation.id)"
                class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
              />
            </div>

            <div class="flex items-start justify-between mb-3" [class.ml-8]="comparisonMode">
              <div class="flex-1">
                <h4 class="font-medium text-slate-900 dark:text-slate-100">{{ simulation.clientName || 'Cliente sin nombre' }}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ simulation.scenarioTitle }}</p>
              </div>
              <div class="flex space-x-2" *ngIf="!comparisonMode">
                <button
                  (click)="continueSimulation(simulation)"
                  class="ui-btn ui-btn-ghost ui-btn-xs"
                >
                  Continuar
                </button>
                <button
                  (click)="deleteSimulation(simulation.id)"
                  class="text-slate-400 hover:text-red-500 text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div class="space-y-2 mb-3">
              <div class="flex justify-between text-xs">
                <span class="text-slate-500 dark:text-slate-400">Mercado:</span>
                <span class="text-slate-700 dark:text-slate-300">{{ getMarketLabel(simulation.market) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-slate-500 dark:text-slate-400">Tipo:</span>
                <span class="text-slate-700 dark:text-slate-300">{{ simulation.clientType }}</span>
              </div>
              <div class="flex justify-between text-xs" *ngIf="simulation.summary.targetAmount">
                <span class="text-slate-500 dark:text-slate-400">Meta:</span>
                <span class="text-slate-700 dark:text-slate-300 font-medium">{{ formatCurrency(simulation.summary.targetAmount) }}</span>
              </div>
              <div class="flex justify-between text-xs" *ngIf="simulation.summary.monthlyContribution">
                <span class="text-slate-500 dark:text-slate-400">Mensual:</span>
                <span class="text-slate-700 dark:text-slate-300 font-medium">{{ formatCurrency(simulation.summary.monthlyContribution) }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <span class="text-xs text-slate-500 dark:text-slate-400">
                {{ formatLastModified(simulation.lastModified) }}
              </span>
              <span class="text-xs px-2 py-1 rounded"
                    [class]="simulation.summary.status === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'">
                {{ simulation.summary.status === 'draft' ? 'Borrador' : 'Completado' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Comparison Controls -->
        <div class="mt-6" *ngIf="savedSimulations.length > 1" data-cy="comparison-controls">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button
              (click)="toggleComparisonMode()"
              class="ui-btn ui-btn-secondary"
              [class.ui-btn-primary]="comparisonMode"
              data-cy="toggle-compare"
            >
              {{ comparisonMode ? '✅ Modo Comparación' : '📊 Comparar Escenarios' }}
            </button>

            <div class="flex items-center space-x-3" *ngIf="comparisonMode">
              <span class="text-sm text-slate-600 dark:text-slate-400">
                {{ selectedForComparison.size }}/3 seleccionados
              </span>
              <button
                (click)="clearSelection()"
                *ngIf="selectedForComparison.size > 0"
                class="ui-btn ui-btn-ghost ui-btn-sm"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div class="mt-4" *ngIf="comparisonMode && selectedForComparison.size > 1">
            <button
              (click)="compareSelectedSimulations()"
              [disabled]="selectedForComparison.size < 2"
              class="ui-btn ui-btn-primary"
              data-cy="open-comparison"
            >
              🔬 Comparar {{ selectedForComparison.size }} Escenarios
            </button>
          </div>
        </div>
      </section>

      <div class="text-center" *ngIf="savedSimulations.length > 5">
        <button (click)="showAllSimulations()" class="ui-btn ui-btn-ghost">
          Ver todas las simulaciones ({{ savedSimulations.length }})
        </button>
      </div>

      <!-- Empty State -->
      <div class="text-center py-12" *ngIf="savedSimulations.length === 0 && !smartContext.hasContext">
        <div class="text-4xl mb-4">📊</div>
        <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Primera vez en el Hub de Simuladores</h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">Selecciona un escenario arriba para comenzar tu primera simulación. Tus borradores aparecerán aquí para continuar más tarde.</p>
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

    <!-- Comparison Modal -->
    <div class="fixed inset-0 z-50 overflow-y-auto" *ngIf="showComparisonModal" data-cy="comparison-modal">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-slate-900/50 transition-opacity" (click)="closeComparisonModal()"></div>

        <div class="inline-block align-bottom bg-white dark:bg-slate-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full" role="dialog" aria-modal="true" aria-labelledby="cmp-title" tabindex="-1" #cmpDialog>
          <!-- Header -->
          <div class="px-4 py-5 sm:px-6 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between">
              <h2 id="cmp-title" class="text-lg font-semibold text-slate-900 dark:text-slate-100">📊 Comparación de Escenarios</h2>
              <button (click)="closeComparisonModal()" class="ui-btn ui-btn-ghost ui-btn-sm" #cmpClose aria-label="Cerrar">×</button>
            </div>
          </div>

          <!-- Table -->
          <div class="px-4 py-5 sm:p-6">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead>
                  <tr>
                    <th class="px-3 py-3 bg-slate-50 dark:bg-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Métrica</th>
                    <th *ngFor="let sim of getSelectedSimulations()" class="px-3 py-3 bg-slate-50 dark:bg-slate-800 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <div>
                        <div class="font-semibold text-slate-900 dark:text-slate-100">{{ sim.clientName }}</div>
                        <div class="text-xs">{{ sim.scenarioTitle }}</div>
                        <div class="text-xs">{{ getMarketLabel(sim.market) }}</div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                  <tr>
                    <td class="px-3 py-4 text-sm text-slate-900 dark:text-slate-100">🎯 Meta Total</td>
                    <td *ngFor="let sim of getSelectedSimulations()" class="px-3 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {{ sim.summary.targetAmount ? formatCurrency(sim.summary.targetAmount) : 'N/D' }}
                    </td>
                  </tr>
                  <tr class="bg-slate-50 dark:bg-slate-800">
                    <td class="px-3 py-4 text-sm text-slate-900 dark:text-slate-100">💰 Aportación Mensual</td>
                    <td *ngFor="let sim of getSelectedSimulations()" class="px-3 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {{ sim.summary.monthlyContribution ? formatCurrency(sim.summary.monthlyContribution) : 'N/D' }}
                    </td>
                  </tr>
                  <tr>
                    <td class="px-3 py-4 text-sm text-slate-900 dark:text-slate-100">⏱️ Tiempo a la Meta</td>
                    <td *ngFor="let sim of getSelectedSimulations()" class="px-3 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {{ sim.summary.timeToTarget ? (sim.summary.timeToTarget + ' meses') : 'N/D' }}
                    </td>
                  </tr>
                  <tr class="bg-slate-50 dark:bg-slate-800">
                    <td class="px-3 py-4 text-sm text-slate-900 dark:text-slate-100">📊 Tipo de Cliente</td>
                    <td *ngFor="let sim of getSelectedSimulations()" class="px-3 py-4 text-sm text-slate-900 dark:text-slate-100">
                      {{ sim.clientType }}
                    </td>
                  </tr>
                  <tr>
                    <td class="px-3 py-4 text-sm text-slate-900 dark:text-slate-100">📅 Estado</td>
                    <td *ngFor="let sim of getSelectedSimulations()" class="px-3 py-4 text-sm">
                      <span class="text-xs px-2 py-1 rounded"
                            [class]="sim.summary.status === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'">
                        {{ sim.summary.status === 'draft' ? 'Borrador' : 'Completado' }}
                      </span>
                    </td>
                  </tr>
                  <tr class="bg-slate-50 dark:bg-slate-800">
                    <td class="px-3 py-4 text-sm text-slate-900 dark:text-slate-100">🎯 Eficiencia</td>
                    <td *ngFor="let sim of getSelectedSimulations()" class="px-3 py-4 text-sm">
                      <span class="text-xs px-2 py-1 rounded font-medium"
                            [class]="getEfficiencyClass(sim) === 'excellent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    getEfficiencyClass(sim) === 'good' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    getEfficiencyClass(sim) === 'fair' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'">
                        {{ getEfficiencyScore(sim) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Insights -->
          <div class="px-4 py-5 sm:px-6 border-t border-slate-200 dark:border-slate-700">
            <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">💡 Insights Automáticos</h3>
            <div class="grid gap-4 md:grid-cols-3">
              <div class="ui-card">
                <div class="text-lg mb-2">👑</div>
                <div class="text-xs font-medium text-slate-900 dark:text-slate-100 mb-1">Mejor Opción</div>
                <div class="text-xs text-slate-600 dark:text-slate-400">{{ getBestOption() }}</div>
              </div>
              <div class="ui-card">
                <div class="text-lg mb-2">⚡</div>
                <div class="text-xs font-medium text-slate-900 dark:text-slate-100 mb-1">Más Rápido</div>
                <div class="text-xs text-slate-600 dark:text-slate-400">{{ getFastestOption() }}</div>
              </div>
              <div class="ui-card">
                <div class="text-lg mb-2">💰</div>
                <div class="text-xs font-medium text-slate-900 dark:text-slate-100 mb-1">Menor Aportación</div>
                <div class="text-xs text-slate-600 dark:text-slate-400">{{ getLowestContributionOption() }}</div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200 dark:border-slate-700">
            <button (click)="closeComparisonModal()" class="ui-btn ui-btn-primary sm:ml-3">
              Cerrar
            </button>
            <button (click)="shareComparison()" class="ui-btn ui-btn-secondary sm:mr-3 mb-2 sm:mb-0">
              📱 Compartir WhatsApp
            </button>
            <button (click)="exportComparison()" class="ui-btn ui-btn-ghost">
              📋 Exportar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
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
          borderColor: '#0EA5E9',
          backgroundColor: '#0EA5E9/10',
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
          backgroundColor: ['#0EA5E9', '#0EA5E9', '#10B981'],
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

