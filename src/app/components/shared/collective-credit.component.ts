import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TandaSimDraft, TandaSimulationResult, TandaMonthState, TandaSimEvent } from '../../models/types';
import { TandaEngineService } from '../../services/tanda-engine.service';
import { ToastService } from '../../services/toast.service';

interface KpiCardData {
  title: string;
  value: string;
  icon: string;
}

interface NewEventForm {
  t: string;
  type: 'miss' | 'extra';
  memberId: string;
  amount: string;
}

@Component({
  selector: 'app-collective-credit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="collective-credit-container">
      <!-- Header -->
      <div class="header">
        <h2 class="title">
          👥 Crédito Colectivo
        </h2>
      </div>

      <div class="main-layout">
        <!-- Configuration Panel -->
        <div class="config-panel">
          <h3 class="panel-title">1. Configuración del Escenario</h3>
          
          <!-- Product Parameters -->
          <div class="config-section">
            <label class="section-label">Parámetros del Producto</label>
            <div class="params-grid">
              <input 
                type="number" 
                [(ngModel)]="draft.group.product.price"
                (input)="onProductPriceChange($event)"
                placeholder="Precio Unidad"
                class="param-input"
              />
              <input 
                type="number" 
                [ngModel]="draft.group.product.dpPct * 100"
                (input)="onDownPaymentPctChange($event)"
                placeholder="% Enganche"
                class="param-input"
              />
              <input 
                type="number" 
                [ngModel]="draft.group.members[0]?.C || 5000"
                (input)="onMonthlyContributionChange($event)"
                placeholder="Aporte Mensual"
                class="param-input"
              />
              <input 
                type="number" 
                [ngModel]="draft.group.members.length"
                (input)="onMemberCountChange($event)"
                placeholder="# Miembros"
                class="param-input"
              />
            </div>
          </div>
          
          <!-- What-if Event Builder -->
          <div class="config-section event-builder">
            <label class="section-label">Añadir Evento "What-If"</label>
            <div class="event-form">
              <div class="event-row">
                <input 
                  type="number" 
                  [(ngModel)]="newEvent.t"
                  placeholder="Mes"
                  class="event-input"
                />
                <select 
                  [(ngModel)]="newEvent.type"
                  class="event-input"
                >
                  <option value="extra">Aporte Extra</option>
                  <option value="miss">Atraso</option>
                </select>
              </div>
              
              <div class="event-row">
                <select 
                  [(ngModel)]="newEvent.memberId"
                  class="event-input"
                >
                  <option *ngFor="let member of draft.group.members" [value]="member.id">
                    {{ member.name }}
                  </option>
                </select>
                <input 
                  type="number" 
                  [(ngModel)]="newEvent.amount"
                  placeholder="Monto"
                  class="event-input"
                />
              </div>
              
              <button (click)="handleAddEvent()" class="btn-add-event">
                ➕ Añadir Evento a la Simulación
              </button>
            </div>
            
            <!-- Event List -->
            <div class="event-list">
              <div *ngFor="let event of draft.config.events" class="event-item">
                <span class="event-description">
                  Mes {{ event.t }}: {{ getMemberName(event.data.memberId) }} 
                  {{ event.type === 'extra' ? 'aportó' : 'se atrasó con' }} 
                  {{ formatCurrency(event.data.amount) }}
                </span>
                <button (click)="handleRemoveEvent(event.id)" class="btn-remove">
                  ❌
                </button>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="action-section">
            <button 
              (click)="handleSimulate()"
              [disabled]="isLoading"
              class="btn-simulate"
            >
              {{ isLoading ? 'Calculando...' : 'Simular Escenario' }}
            </button>
            <button 
              (click)="handleFormalize()"
              [disabled]="!result"
              class="btn-formalize"
            >
              Formalizar Grupo
            </button>
          </div>
        </div>

        <!-- Results Panel -->
        <div class="results-panel">
          <h3 class="panel-title">2. Resultados de la Simulación</h3>
          
          <!-- Loading State -->
          <div *ngIf="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
          </div>
          
          <!-- Results -->
          <div *ngIf="!isLoading && result && kpis" class="results-content">
            <!-- KPI Cards -->
            <div class="kpi-grid">
              <div *ngFor="let kpi of kpis" class="kpi-card">
                <div class="kpi-icon">{{ kpi.icon }}</div>
                <div class="kpi-content">
                  <p class="kpi-label">{{ kpi.title }}</p>
                  <p class="kpi-value">{{ kpi.value }}</p>
                </div>
              </div>
            </div>
            
            <!-- Timeline -->
            <h4 class="timeline-title">Línea de Tiempo Mensual</h4>
            <div class="timeline-container">
              <div *ngFor="let month of result.months" class="month-item">
                <!-- Month Header -->
                <div class="month-header">
                  <h5 class="month-title">Mes {{ month.t }}</h5>
                  <span 
                    *ngIf="month.riskBadge === 'debtDeficit'"
                    class="risk-badge"
                  >
                    Déficit de Deuda
                  </span>
                </div>
                
                <!-- Month Details -->
                <div class="month-details">
                  <div class="detail-row">
                    <span class="detail-label">Aportaciones:</span>
                    <span class="detail-value inflow">
                      +{{ formatCurrency(month.inflow) }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Deuda del Mes:</span>
                    <span class="detail-value debt">
                      -{{ formatCurrency(month.debtDue) }}
                    </span>
                  </div>
                  <div class="detail-row total-row">
                    <span class="detail-label">Ahorro Neto:</span>
                    <span class="detail-value savings">
                      {{ formatCurrency(month.savings) }}
                    </span>
                  </div>
                </div>
                
                <!-- Awards -->
                <div *ngIf="month.awards.length > 0" class="awards-section">
                  <div *ngFor="let award of month.awards" class="award-item">
                    ✨ ¡Unidad entregada a {{ award.name }}!
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div *ngIf="!isLoading && !result" class="empty-state">
            <div class="empty-icon">📈</div>
            <p class="empty-title">Los resultados de la simulación aparecerán aquí.</p>
            <p class="empty-subtitle">Configura tu escenario y presiona "Simular".</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .collective-credit-container {
      padding: 24px;
      background: #0f1419;
      color: white;
      min-height: 100vh;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      color: white;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .main-layout {
      display: grid;
      grid-template-columns: 2fr 3fr;
      gap: 32px;
    }

    .config-panel,
    .results-panel {
      background: #1a202c;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #2d3748;
    }

    .config-panel {
      align-self: start;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .panel-title {
      font-size: 20px;
      font-weight: 600;
      color: white;
      margin: 0;
    }

    .config-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .config-section.event-builder {
      padding-top: 16px;
      border-top: 1px solid rgba(45, 55, 72, 0.5);
    }

    .section-label {
      font-size: 14px;
      font-weight: 500;
      color: #a0aec0;
    }

    .params-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }

    .param-input {
      width: 100%;
      padding: 8px 12px;
      background: #2d3748;
      border: 1px solid #4a5568;
      border-radius: 6px;
      color: white;
      font-size: 14px;
    }

    .param-input:focus {
      outline: none;
      border-color: #06d6a0;
    }

    .event-form {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .event-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .event-input {
      width: 100%;
      padding: 8px 12px;
      background: #2d3748;
      border: 1px solid #4a5568;
      border-radius: 6px;
      color: white;
      font-size: 14px;
    }

    .event-input:focus {
      outline: none;
      border-color: #06d6a0;
    }

    .btn-add-event {
      width: 100%;
      padding: 8px;
      background: transparent;
      border: 2px dashed #4a5568;
      border-radius: 6px;
      color: #06d6a0;
      cursor: pointer;
      font-size: 12px;
      margin-top: 8px;
      transition: border-color 0.2s;
    }

    .btn-add-event:hover {
      border-color: #06d6a0;
    }

    .event-list {
      max-height: 128px;
      overflow-y: auto;
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-right: 4px;
    }

    .event-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: #2d3748;
      border-radius: 4px;
    }

    .event-description {
      font-size: 12px;
      color: #a0aec0;
    }

    .btn-remove {
      background: none;
      border: none;
      color: #f56565;
      cursor: pointer;
      font-size: 12px;
    }

    .btn-remove:hover {
      color: #fc8181;
    }

    .action-section {
      padding-top: 24px;
      border-top: 1px solid rgba(45, 55, 72, 0.5);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn-simulate,
    .btn-formalize {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-simulate {
      background: #06d6a0;
      color: white;
    }

    .btn-simulate:hover:not(:disabled) {
      background: #059669;
    }

    .btn-simulate:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-formalize {
      background: #10b981;
      color: white;
    }

    .btn-formalize:hover:not(:disabled) {
      background: #059669;
    }

    .btn-formalize:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 384px;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 2px solid #4a5568;
      border-left-color: #06d6a0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .results-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .kpi-card {
      background: #2d3748;
      padding: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .kpi-icon {
      padding: 12px;
      border-radius: 50%;
      background: rgba(6, 214, 160, 0.1);
      font-size: 20px;
      flex-shrink: 0;
    }

    .kpi-content {
      flex: 1;
    }

    .kpi-label {
      font-size: 14px;
      color: #9ca3af;
      margin: 0 0 4px 0;
    }

    .kpi-value {
      font-size: 20px;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .timeline-title {
      font-size: 16px;
      font-weight: 600;
      color: white;
      margin: 0 0 12px 0;
    }

    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 60vh;
      overflow-y: auto;
      padding-right: 8px;
    }

    .month-item {
      padding: 12px;
      background: rgba(45, 55, 72, 0.6);
      border: 1px solid rgba(55, 65, 81, 0.5);
      border-radius: 8px;
    }

    .month-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .month-title {
      font-size: 16px;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .risk-badge {
      padding: 4px 8px;
      background: rgba(248, 113, 113, 0.2);
      color: #fca5a5;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .month-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
    }

    .detail-row.total-row {
      padding-top: 4px;
      border-top: 1px solid #4a5568;
      font-weight: 600;
    }

    .detail-label {
      color: #9ca3af;
    }

    .detail-value {
      font-family: monospace;
      font-weight: 600;
    }

    .detail-value.inflow {
      color: #10b981;
    }

    .detail-value.debt {
      color: #f59e0b;
    }

    .detail-value.savings {
      color: white;
    }

    .awards-section {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 2px dashed #4a5568;
    }

    .award-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #10b981;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 384px;
      text-align: center;
      color: #718096;
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .empty-title {
      margin: 0 0 8px 0;
      font-size: 16px;
    }

    .empty-subtitle {
      margin: 0;
      font-size: 14px;
    }

    /* Custom scrollbar */
    .timeline-container::-webkit-scrollbar {
      width: 4px;
    }

    .timeline-container::-webkit-scrollbar-track {
      background: #1a202c;
    }

    .timeline-container::-webkit-scrollbar-thumb {
      background: #06d6a0;
      border-radius: 4px;
    }

    .event-list::-webkit-scrollbar {
      width: 4px;
    }

    .event-list::-webkit-scrollbar-track {
      background: #1a202c;
    }

    .event-list::-webkit-scrollbar-thumb {
      background: #4a5568;
      border-radius: 4px;
    }

    @media (max-width: 1024px) {
      .main-layout {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .params-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CollectiveCreditComponent implements OnInit {
  // Port exacto de state desde React líneas 72-75
  draft: TandaSimDraft = this.createDefaultDraft();
  result: TandaSimulationResult | null = null;
  isLoading = false;
  newEvent: NewEventForm = { 
    t: '1', 
    type: 'extra', 
    memberId: 'M1', 
    amount: '5000' 
  };

  constructor(
    private tandaEngine: TandaEngineService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Initialize newEvent with first member if available
    if (this.draft.group.members.length > 0) {
      this.newEvent.memberId = this.draft.group.members[0].id;
    }
  }

  // Port exacto de createDefaultDraft desde React líneas 7-34
  private createDefaultDraft(): TandaSimDraft {
    return {
      group: {
        name: 'Tanda Ruta 25',
        members: Array.from({ length: 5 }, (_, i) => ({
          id: `M${i + 1}`,
          name: `Miembro ${i + 1}`,
          prio: i + 1,
          status: 'active',
          C: 5000,
        })),
        product: {
          price: 950000,
          dpPct: 0.15,
          term: 60,
          rateAnnual: 0.299,
          fees: 10000,
        },
        rules: {
          allocRule: 'debt_first',
          eligibility: { requireThisMonthPaid: true },
        },
        seed: 12345,
      },
      config: {
        horizonMonths: 48,
        events: [],
      },
    };
  }

  // Port exacto de kpis computation desde React líneas 132-140
  get kpis(): KpiCardData[] | null {
    if (!this.result) return null;
    return [
      { 
        title: 'Unidades Entregadas', 
        value: `${this.result.kpis.deliveredCount} / ${this.draft.group.members.length}`, 
        icon: '✅'
      },
      { 
        title: 'Primera Entrega', 
        value: `Mes ${this.result.firstAwardT || 'N/A'}`, 
        icon: '✨'
      },
      { 
        title: 'Última Entrega', 
        value: `Mes ${this.result.lastAwardT || 'N/A'}`, 
        icon: '👥'
      },
      { 
        title: 'Tiempo Promedio', 
        value: `${this.result.kpis.avgTimeToAward.toFixed(1)} meses`, 
        icon: '📈'
      },
    ];
  }

  // Port exacto de handleSimulate desde React líneas 77-90
  handleSimulate(): void {
    this.isLoading = true;
    this.result = null;

    this.tandaEngine.simulateTanda(this.draft.group, this.draft.config).subscribe({
      next: (res) => {
        this.result = res;
        this.toast.success("Simulación completada con éxito.");
        this.isLoading = false;
      },
      error: (error) => {
        console.error(error);
        this.toast.error("Error al ejecutar la simulación.");
        this.isLoading = false;
      }
    });
  }

  // Port exacto de handleAddEvent desde React líneas 92-113
  handleAddEvent(): void {
    const event: TandaSimEvent = {
      t: parseInt(this.newEvent.t, 10),
      type: this.newEvent.type,
      data: {
        memberId: this.newEvent.memberId,
        amount: parseFloat(this.newEvent.amount)
      },
      id: `evt-${Date.now()}`
    };

    if (isNaN(event.t) || isNaN(event.data.amount) || !event.data.memberId) {
      this.toast.error("Por favor, introduce valores válidos para el evento.");
      return;
    }

    this.draft = {
      ...this.draft,
      config: {
        ...this.draft.config,
        events: [...this.draft.config.events, event]
      }
    };
  }

  // Port exacto de handleRemoveEvent desde React líneas 115-120
  handleRemoveEvent(id: string): void {
    this.draft = {
      ...this.draft,
      config: { 
        ...this.draft.config, 
        events: this.draft.config.events.filter(e => e.id !== id) 
      }
    };
  }

  // Port exacto de handleFormalize desde React líneas 122-130
  handleFormalize(): void {
    if (!this.result) {
      this.toast.error("Primero debes correr una simulación exitosa.");
      return;
    }
    this.toast.info(`Formalizando grupo "${this.draft.group.name}"... (Simulado)`);
  }

  // Input handlers for product parameters
  onProductPriceChange(event: any): void {
    this.draft = {
      ...this.draft,
      group: {
        ...this.draft.group,
        product: {
          ...this.draft.group.product,
          price: +event.target.value
        }
      }
    };
  }

  onDownPaymentPctChange(event: any): void {
    this.draft = {
      ...this.draft,
      group: {
        ...this.draft.group,
        product: {
          ...this.draft.group.product,
          dpPct: +event.target.value / 100
        }
      }
    };
  }

  onMonthlyContributionChange(event: any): void {
    const newContribution = +event.target.value;
    this.draft = {
      ...this.draft,
      group: {
        ...this.draft.group,
        members: this.draft.group.members.map(m => ({
          ...m,
          C: newContribution
        }))
      }
    };
  }

  onMemberCountChange(event: any): void {
    const newCount = +event.target.value;
    const currentContribution = this.draft.group.members[0]?.C || 5000;
    
    this.draft = {
      ...this.draft,
      group: {
        ...this.draft.group,
        members: Array.from({ length: newCount }, (_, i) => ({
          id: `M${i + 1}`,
          name: `Miembro ${i + 1}`,
          prio: i + 1,
          status: 'active',
          C: currentContribution,
        }))
      }
    };

    // Update newEvent memberId if current selection is no longer valid
    if (!this.draft.group.members.find(m => m.id === this.newEvent.memberId)) {
      this.newEvent.memberId = this.draft.group.members[0]?.id || 'M1';
    }
  }

  // Utility methods
  getMemberName(memberId: string): string {
    const member = this.draft.group.members.find(m => m.id === memberId);
    return member ? member.name : memberId;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }
}