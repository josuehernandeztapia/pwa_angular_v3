import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface KPIData {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  format: 'number' | 'currency' | 'percentage';
  icon: string;
  color: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  subtitle?: string;
}

@Component({
  selector: 'app-contextual-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="contextual-kpis-container">
      <div class="kpis-header">
        <h3 class="kpis-title">📊 KPIs Clave</h3>
        <p class="kpis-subtitle">vs. Semana Pasada</p>
      </div>
      
      <div class="kpis-grid">
        <div 
          *ngFor="let kpi of kpis; trackBy: trackByKPI"
          class="kpi-card"
          [class]="'kpi-' + kpi.color"
        >
          <div class="kpi-header">
            <div class="kpi-icon">{{ kpi.icon }}</div>
            <div class="kpi-trend" [class]="'trend-' + kpi.trend">
              <span class="trend-icon">{{ getTrendIcon(kpi.trend) }}</span>
              <span class="trend-percentage">{{ kpi.trendPercentage }}%</span>
            </div>
          </div>
          
          <div class="kpi-content">
            <div class="kpi-value">{{ formatValue(kpi.value, kpi.format) }}</div>
            <div class="kpi-title-text">{{ kpi.title }}</div>
            <div class="kpi-subtitle" *ngIf="kpi.subtitle">{{ kpi.subtitle }}</div>
          </div>
          
          <div class="kpi-trend-bar">
            <div 
              class="trend-fill"
              [class]="'trend-fill-' + kpi.trend"
              [style.width.%]="Math.abs(kpi.trendPercentage)"
            ></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contextual-kpis-container {
      margin-bottom: 32px;
    }

    .kpis-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .kpis-title {
      color: var(--bg-gray-100);
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .kpis-subtitle {
      color: var(--bg-gray-400);
      font-size: 0.9rem;
      margin: 0;
      font-weight: 500;
    }

    .kpis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .kpi-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: var(--glass-backdrop);
      -webkit-backdrop-filter: var(--glass-backdrop);
      border-radius: 16px;
      padding: 24px;
      position: relative;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .kpi-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-elevated);
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      border-radius: 16px 16px 0 0;
    }

    .kpi-primary::before { background: var(--primary-cyan-400); }
    .kpi-accent::before { background: var(--accent-amber-500); }
    .kpi-success::before { background: var(--success-500); }
    .kpi-warning::before { background: var(--warning-500); }
    .kpi-error::before { background: var(--error-500); }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .kpi-icon {
      font-size: 2rem;
      opacity: 0.8;
    }

    .kpi-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .trend-up {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid var(--success-500);
      color: var(--success-500);
    }

    .trend-down {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--error-500);
      color: var(--error-500);
    }

    .trend-stable {
      background: rgba(156, 163, 175, 0.1);
      border: 1px solid var(--bg-gray-500);
      color: var(--bg-gray-400);
    }

    .trend-icon {
      font-size: 0.9rem;
    }

    .kpi-content {
      text-align: left;
    }

    .kpi-value {
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 8px;
      background: linear-gradient(135deg, var(--bg-gray-100), var(--bg-gray-300));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .kpi-primary .kpi-value {
      background: linear-gradient(135deg, var(--primary-cyan-300), var(--primary-cyan-500));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .kpi-accent .kpi-value {
      background: linear-gradient(135deg, var(--accent-amber-400), var(--accent-amber-600));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .kpi-title-text {
      color: var(--bg-gray-200);
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .kpi-subtitle {
      color: var(--bg-gray-400);
      font-size: 0.85rem;
    }

    .kpi-trend-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(255, 255, 255, 0.05);
      overflow: hidden;
    }

    .trend-fill {
      height: 100%;
      transition: width 0.8s ease-out;
      border-radius: 0 4px 4px 0;
    }

    .trend-fill-up {
      background: linear-gradient(90deg, var(--success-500), var(--success-400));
    }

    .trend-fill-down {
      background: linear-gradient(90deg, var(--error-500), var(--error-400));
    }

    .trend-fill-stable {
      background: linear-gradient(90deg, var(--bg-gray-500), var(--bg-gray-400));
    }

    @media (max-width: 768px) {
      .kpis-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .kpi-card {
        padding: 20px;
      }

      .kpi-value {
        font-size: 2rem;
      }

      .kpis-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  `]
})
export class ContextualKPIsComponent implements OnInit {
  @Input() kpis: KPIData[] = [];

  // Expose Math to template
  Math = Math;

  constructor() { }

  ngOnInit(): void { }

  trackByKPI(index: number, kpi: KPIData): string {
    return kpi.id;
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    const icons = {
      up: '▲',
      down: '▼',
      stable: '→'
    };
    return icons[trend];
  }

  formatValue(value: number | string, format: 'number' | 'currency' | 'percentage'): string {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return '$' + new Intl.NumberFormat('es-MX', {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      
      case 'percentage':
        return value.toFixed(1) + '%';
      
      case 'number':
      default:
        return new Intl.NumberFormat('es-MX').format(value);
    }
  }
}