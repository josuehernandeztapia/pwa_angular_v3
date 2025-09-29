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
  templateUrl: './contextual-kpis.component.html',
  styleUrls: ['./contextual-kpis.component.scss']
})
export class ContextualKPIsComponent implements OnInit {
  @Input() kpis: KPIData[] = [];
  @Input() showTrends: boolean = false;

  // Expose Math to template
  Math = Math;

  constructor() { }

  ngOnInit(): void { }

  trackByKPI(index: number, kpi: KPIData): string {
    return kpi.id;
  }

  getCardClasses(kpi: KPIData): Record<string, boolean> {
    return {
      [`contextual-kpis__card--color-${kpi.color}`]: true,
    };
  }

  getTrendClasses(kpi: KPIData): Record<string, boolean> {
    return {
      [`contextual-kpis__trend--${kpi.trend}`]: true,
    };
  }

  getValueClasses(kpi: KPIData): Record<string, boolean> {
    return {
      [`contextual-kpis__value--color-${kpi.color}`]: true,
    };
  }

  getTrendFillClasses(kpi: KPIData): Record<string, boolean> {
    return {
      [`contextual-kpis__trend-fill--${kpi.trend}`]: true,
    };
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
