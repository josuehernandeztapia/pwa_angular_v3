import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';

export interface KPIData {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  format: 'number' | 'currency' | 'percentage';
  icon?: IconName;
  color: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  subtitle?: string;
}

@Component({
  selector: 'app-contextual-kpis',
  standalone: true,
  imports: [CommonModule, IconComponent],
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

  getTrendIcon(trend: 'up' | 'down' | 'stable'): IconName {
    const map: Record<'up' | 'down' | 'stable', IconName> = {
      up: 'trending-up',
      down: 'trending-down',
      stable: 'minus'
    };
    return map[trend];
  }

  getValueIcon(kpi: KPIData): IconName {
    return kpi.icon ?? 'information-circle';
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
