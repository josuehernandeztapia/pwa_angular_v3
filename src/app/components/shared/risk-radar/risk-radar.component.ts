import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RiskRadarClient {
  id: string;
  name: string;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  position: { x: number; y: number }; // 0-100 for positioning
  issues: string[];
  lastContact: string;
  value: number; // Portfolio value
  urgency: number; // 1-10 scale
}

@Component({
  selector: 'app-risk-radar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="risk-radar-container">
      <div class="radar-header">
        <div class="radar-title-section">
          <h3 class="radar-title">🔥 Radar de Riesgo</h3>
          <p class="radar-subtitle">Visualización proactiva de la salud de tu cartera</p>
        </div>
        <div class="radar-legend">
          <div class="legend-item" *ngFor="let level of riskLevels">
            <div class="legend-dot" [class]="'risk-' + level.key"></div>
            <span class="legend-text">{{ level.label }}</span>
          </div>
        </div>
      </div>

      <div class="radar-visualization">
        <div class="radar-grid">
          <!-- Background concentric circles -->
          <div class="radar-circle" *ngFor="let i of [1,2,3,4]" 
               [style.width.%]="i * 25" 
               [style.height.%]="i * 25">
          </div>
          
          <!-- Axis lines -->
          <div class="radar-axis horizontal"></div>
          <div class="radar-axis vertical"></div>
          
          <!-- Risk zones labels -->
          <div class="risk-zone-label safe">Zona Segura</div>
          <div class="risk-zone-label warning">Atención</div>
          <div class="risk-zone-label danger">Riesgo Alto</div>
          <div class="risk-zone-label critical">Crítico</div>
          
          <!-- Client dots -->
          <div 
            *ngFor="let client of clients; trackBy: trackByClient"
            class="client-dot"
            [class]="'risk-' + client.riskLevel"
            [style.left.%]="client.position.x"
            [style.top.%]="client.position.y"
            [title]="getClientTooltip(client)"
            (click)="selectClient(client)"
          >
            <div class="client-pulse" [class]="'pulse-' + client.riskLevel"></div>
            <div class="client-initials">{{ getClientInitials(client.name) }}</div>
          </div>
        </div>
        
        <!-- Selected client info -->
        <div class="client-info-panel" *ngIf="selectedClient">
          <div class="client-info-header">
            <h4 class="client-info-name">{{ selectedClient.name }}</h4>
            <button class="close-info" (click)="selectedClient = undefined">×</button>
          </div>
          
          <div class="client-info-content">
            <div class="health-score-display">
              <span class="health-label">Health Score:</span>
              <span class="health-value" [class]="getHealthScoreClass(selectedClient.healthScore)">
                {{ selectedClient.healthScore }}
              </span>
            </div>
            
            <div class="client-metrics">
              <div class="metric">
                <span class="metric-icon">💰</span>
                <span class="metric-text">\${{ formatCurrency(selectedClient.value) }}</span>
              </div>
              <div class="metric">
                <span class="metric-icon">📅</span>
                <span class="metric-text">{{ selectedClient.lastContact }}</span>
              </div>
              <div class="metric">
                <span class="metric-icon">⚠️</span>
                <span class="metric-text">Urgencia: {{ selectedClient.urgency }}/10</span>
              </div>
            </div>
            
            <div class="client-issues" *ngIf="selectedClient.issues.length > 0">
              <h5 class="issues-title">Issues Identificados:</h5>
              <ul class="issues-list">
                <li *ngFor="let issue of selectedClient.issues">{{ issue }}</li>
              </ul>
            </div>
            
            <button class="btn-accent take-action-btn" (click)="takeAction(selectedClient)">
              <span>🎯</span>
              Tomar Acción
            </button>
          </div>
        </div>
      </div>
      
      <!-- Quick stats -->
      <div class="radar-stats">
        <div class="stat-item" *ngFor="let stat of getRadarStats()">
          <div class="stat-value" [style.color]="stat.color">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .risk-radar-container {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: var(--glass-backdrop);
      -webkit-backdrop-filter: var(--glass-backdrop);
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 32px;
      position: relative;
    }

    .radar-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 20px;
    }

    .radar-title {
      color: var(--bg-gray-100);
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 4px 0;
    }

    .radar-subtitle {
      color: var(--bg-gray-400);
      font-size: 0.9rem;
      margin: 0;
    }

    .radar-legend {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .legend-text {
      color: var(--bg-gray-300);
      font-size: 0.85rem;
      font-weight: 500;
    }

    .risk-low { background: var(--success-500); }
    .risk-medium { background: var(--accent-amber-500); }
    .risk-high { background: var(--warning-500); }
    .risk-critical { background: var(--error-500); }

    .radar-visualization {
      position: relative;
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
      min-height: 400px;
    }

    .radar-grid {
      position: relative;
      aspect-ratio: 1;
      background: radial-gradient(
        circle,
        rgba(16, 185, 129, 0.1) 0%,
        rgba(245, 158, 11, 0.1) 40%,
        rgba(249, 115, 22, 0.1) 70%,
        rgba(239, 68, 68, 0.1) 100%
      );
      border-radius: 50%;
      border: 1px solid var(--glass-border);
      overflow: visible;
    }

    .radar-circle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
    }

    .radar-axis {
      position: absolute;
      background: rgba(255, 255, 255, 0.1);
    }

    .radar-axis.horizontal {
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      transform: translateY(-50%);
    }

    .radar-axis.vertical {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      transform: translateX(-50%);
    }

    .risk-zone-label {
      position: absolute;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
    }

    .risk-zone-label.safe {
      top: 45%;
      left: 45%;
      color: var(--success-400);
    }

    .risk-zone-label.warning {
      top: 25%;
      left: 35%;
      color: var(--accent-amber-400);
    }

    .risk-zone-label.danger {
      top: 15%;
      left: 25%;
      color: var(--warning-500);
    }

    .risk-zone-label.critical {
      top: 8%;
      left: 15%;
      color: var(--error-500);
    }

    .client-dot {
      position: absolute;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translate(-50%, -50%);
      transition: all 0.3s ease;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .client-dot:hover {
      transform: translate(-50%, -50%) scale(1.2);
      z-index: 10;
    }

    .client-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      animation: pulse-radar 2s infinite;
    }

    .pulse-critical {
      background: radial-gradient(circle, var(--error-500) 0%, transparent 70%);
    }

    .pulse-high {
      background: radial-gradient(circle, var(--warning-500) 0%, transparent 70%);
    }

    .pulse-medium {
      background: radial-gradient(circle, var(--accent-amber-500) 0%, transparent 70%);
    }

    .pulse-low {
      background: radial-gradient(circle, var(--success-500) 0%, transparent 70%);
    }

    @keyframes pulse-radar {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.3); }
      100% { opacity: 1; transform: scale(1); }
    }

    .client-initials {
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      z-index: 2;
    }

    .client-info-panel {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
    }

    .client-info-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .client-info-name {
      color: var(--bg-gray-100);
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0;
    }

    .close-info {
      background: none;
      border: none;
      color: var(--bg-gray-400);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-info:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--bg-gray-200);
    }

    .health-score-display {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .health-label {
      color: var(--bg-gray-300);
      font-weight: 600;
    }

    .health-value {
      font-size: 1.5rem;
      font-weight: 800;
    }

    .health-excellent { color: var(--success-500); }
    .health-good { color: var(--primary-cyan-400); }
    .health-warning { color: var(--accent-amber-500); }
    .health-critical { color: var(--error-500); }

    .client-metrics {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--bg-gray-300);
      font-size: 0.9rem;
    }

    .metric-icon {
      font-size: 1rem;
    }

    .client-issues {
      margin-bottom: 16px;
    }

    .issues-title {
      color: var(--accent-amber-400);
      font-size: 0.9rem;
      font-weight: 600;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .issues-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .issues-list li {
      color: var(--bg-gray-300);
      font-size: 0.85rem;
      padding: 4px 0;
      padding-left: 16px;
      position: relative;
    }

    .issues-list li::before {
      content: '•';
      color: var(--error-500);
      position: absolute;
      left: 0;
    }

    .take-action-btn {
      width: 100%;
      padding: 12px 16px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .radar-stats {
      display: flex;
      justify-content: space-around;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .stat-label {
      color: var(--bg-gray-400);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    @media (max-width: 768px) {
      .radar-visualization {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .radar-header {
        flex-direction: column;
        gap: 16px;
      }

      .radar-legend {
        justify-content: center;
      }

      .radar-stats {
        flex-wrap: wrap;
        gap: 16px;
      }
    }
  `]
})
export class RiskRadarComponent implements OnInit {
  @Input() clients: RiskRadarClient[] = [];
  @Output() clientSelected = new EventEmitter<RiskRadarClient>();
  @Output() actionRequested = new EventEmitter<RiskRadarClient>();

  selectedClient?: RiskRadarClient;

  riskLevels = [
    { key: 'low', label: 'Bajo' },
    { key: 'medium', label: 'Medio' },
    { key: 'high', label: 'Alto' },
    { key: 'critical', label: 'Crítico' }
  ];

  constructor() { }

  ngOnInit(): void { }

  trackByClient(index: number, client: RiskRadarClient): string {
    return client.id;
  }

  getClientInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getClientTooltip(client: RiskRadarClient): string {
    return `${client.name} - Health Score: ${client.healthScore} - Issues: ${client.issues.length}`;
  }

  getHealthScoreClass(score: number): string {
    if (score >= 80) return 'health-excellent';
    if (score >= 65) return 'health-good';
    if (score >= 40) return 'health-warning';
    return 'health-critical';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  selectClient(client: RiskRadarClient): void {
    this.selectedClient = client;
    this.clientSelected.emit(client);
  }

  takeAction(client: RiskRadarClient): void {
    this.actionRequested.emit(client);
  }

  getRadarStats() {
    const stats = this.clients.reduce((acc, client) => {
      acc[client.riskLevel] = (acc[client.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<'low' | 'medium' | 'high' | 'critical', number>);

    return [
      {
        value: stats['critical'] || 0,
        label: 'Críticos',
        color: 'var(--error-500)'
      },
      {
        value: stats['high'] || 0,
        label: 'Alto Riesgo',
        color: 'var(--warning-500)'
      },
      {
        value: stats['medium'] || 0,
        label: 'Atención',
        color: 'var(--accent-amber-500)'
      },
      {
        value: stats['low'] || 0,
        label: 'Estables',
        color: 'var(--success-500)'
      }
    ];
  }
}