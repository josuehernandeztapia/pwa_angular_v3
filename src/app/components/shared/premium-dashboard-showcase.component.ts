/**
 * Demonstrates world-class iconography, microcopy, and animations in action
 */

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, takeUntil } from 'rxjs';

import { UiIconComponent } from '../ui/ui-icon/ui-icon.component';
import { HumanMessageComponent } from './human-message/human-message.component'; // Path verified: exists
// Removed dependency on PremiumIconsService
import { HumanMicrocopyService } from '../../services/human-microcopy.service';

interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  iconName: string;
  semanticContext: string;
}

interface SystemStatus {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastUpdate: Date;
}

@Component({
  selector: 'app-ui-dashboard-showcase',
  standalone: true,
  imports: [CommonModule, UiIconComponent, HumanMessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './premium-dashboard-showcase.component.html',
  styleUrls: ['./premium-dashboard-showcase.component.scss']
})
export class PremiumDashboardShowcaseComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Reactive state using Angular signals
  dashboardMetrics = signal<DashboardMetric[]>([
    {
      id: 'active-contracts',
      label: 'Contratos Activos',
      value: 247,
      change: 12.5,
      trend: 'up',
      iconName: 'protection-shield',
      semanticContext: 'protection-active'
    },
    {
      id: 'monthly-revenue',
      label: 'Ingresos del Mes',
      value: 1250000,
      change: -3.2,
      trend: 'down',
      iconName: 'financial-health',
      semanticContext: 'financial-healthy'
    },
    {
      id: 'pipeline-opportunities',
      label: 'Oportunidades',
      value: 89,
      change: 0,
      trend: 'stable',
      iconName: 'pipeline-opportunities',
      semanticContext: 'pipeline-active'
    },
    {
      id: 'customer-satisfaction',
      label: 'Satisfacción Cliente',
      value: 4.8,
      change: 8.3,
      trend: 'up',
      iconName: 'customer-verification',
      semanticContext: 'verification-approved'
    }
  ]);

  systemStatuses = signal<SystemStatus[]>([
    {
      component: 'BFF API',
      status: 'healthy',
      message: 'All systems operational',
      lastUpdate: new Date()
    },
    {
      component: 'Webhooks',
      status: 'healthy',
      message: '96% success rate',
      lastUpdate: new Date()
    },
    {
      component: 'Database',
      status: 'warning',
      message: 'High load detected',
      lastUpdate: new Date()
    }
  ]);

  paymentSuccessTriggered = signal(false);
  contractSignedTriggered = signal(false);
  kycVerifiedTriggered = signal(false);

  userContext = {
    user: { name: 'Ana García' },
    timeOfDay: 'morning',
    business: { context: 'insurance-sales' }
  };

  constructor(
    private microcopyService: HumanMicrocopyService
  ) {}

  ngOnInit(): void {
    // Simulate real-time data updates
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateMetrics();
        this.updateSystemStatus();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatMetricValue(value: number): string {
    if (value < 10) {
      return value.toFixed(1);
    } else if (value < 1000) {
      return value.toString();
    } else if (value < 1000000) {
      return `${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
  }

  formatChange(change: number): string {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}`;
  }

  getTrendIcon(trend: string): string {
    const iconMap = {
      up: 'kpi-growth',
      down: 'system-warning',
      stable: 'system-healthy'
    };
    return iconMap[trend as keyof typeof iconMap] || 'system-healthy';
  }

  getTrendTheme(trend: string): string {
    const themeMap = {
      up: 'success',
      down: 'error',
      stable: 'neutral'
    };
    return themeMap[trend as keyof typeof themeMap] || 'neutral';
  }

  getStatusClasses(status: SystemStatus): Record<string, boolean> {
    return {
      'premium-dashboard__status--healthy': status.status === 'healthy',
      'premium-dashboard__status--warning': status.status === 'warning',
      'premium-dashboard__status--error': status.status === 'error',
    };
  }

  getTrendClasses(trend: DashboardMetric['trend']): Record<string, boolean> {
    return {
      'premium-dashboard__metric-change--up': trend === 'up',
      'premium-dashboard__metric-change--down': trend === 'down',
      'premium-dashboard__metric-change--stable': trend === 'stable',
    };
  }

  getJourneyActionClasses(isActive: boolean): Record<string, boolean> {
    return {
      'premium-dashboard__journey-action--active': isActive,
    };
  }

  getStatusIcon(status: string): string {
    const iconMap = {
      healthy: 'system-healthy',
      warning: 'system-warning',
      error: 'system-error'
    };
    return iconMap[status as keyof typeof iconMap] || 'system-healthy';
  }

  getStatusTheme(status: string): string {
    const themeMap = {
      healthy: 'success',
      warning: 'warning',
      error: 'error'
    };
    return themeMap[status as keyof typeof themeMap] || 'neutral';
  }

  triggerPaymentSuccess(): void {
    this.paymentSuccessTriggered.set(true);
    setTimeout(() => this.paymentSuccessTriggered.set(false), 2000);
  }

  triggerContractSigning(): void {
    this.contractSignedTriggered.set(true);
    setTimeout(() => this.contractSignedTriggered.set(false), 1500);
  }

  triggerKYCVerification(): void {
    this.kycVerifiedTriggered.set(true);
    setTimeout(() => this.kycVerifiedTriggered.set(false), 3000);
  }

  trackByMetric(index: number, metric: DashboardMetric): string {
    return metric.id;
  }

  trackByStatus(index: number, status: SystemStatus): string {
    return status.component;
  }

  private updateMetrics(): void {
    const metrics = this.dashboardMetrics();
    const updatedMetrics = metrics.map(metric => ({
      ...metric,
      value: metric.value + (Math.random() - 0.5) * 10,
      change: metric.change + (Math.random() - 0.5) * 2
    }));
    this.dashboardMetrics.set(updatedMetrics);
  }

  private updateSystemStatus(): void {
    const statuses = this.systemStatuses();
    const randomIndex = Math.floor(Math.random() * statuses.length);
    const updatedStatuses = [...statuses];
    updatedStatuses[randomIndex] = {
      ...updatedStatuses[randomIndex],
      lastUpdate: new Date()
    };
    this.systemStatuses.set(updatedStatuses);
  }
}
