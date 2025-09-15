/**
 * 🎨 Premium Dashboard Showcase - UX/UI Integration Demo
 * Demonstrates world-class iconography, microcopy, and animations in action
 */

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, takeUntil } from 'rxjs';

import { PremiumIconComponent } from './premium-icon/premium-icon.component';
import { HumanMessageComponent } from './human-message/human-message.component';
import { PremiumIconsService } from '../../services/premium-icons.service';
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
  selector: 'app-premium-dashboard-showcase',
  standalone: true,
  imports: [CommonModule, PremiumIconComponent, HumanMessageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="premium-dashboard command-center-layout">
      <!-- Dashboard Header with Welcome Message -->
      <header class="dashboard-header animate-fluid-enter">
        <div class="header-content premium-container">
          <div class="welcome-section">
            <app-human-message
              microcopyId="welcome-first-time"
              [context]="userContext"
              [showAction]="false"
              size="comfortable">
            </app-human-message>
          </div>
          
          <!-- Real-time System Status -->
          <div class="status-indicators animate-staggered-enter">
            <div 
              *ngFor="let status of systemStatuses(); trackBy: trackByStatus"
              class="status-indicator"
              [ngClass]="'status-' + status.status">
              <app-premium-icon 
                [iconName]="getStatusIcon(status.status)"
                [theme]="getStatusTheme(status.status)"
                size="sm"
                [animate]="status.status !== 'healthy'">
              </app-premium-icon>
              <span class="status-label">{{ status.component }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Key Metrics Dashboard -->
      <section class="metrics-section premium-container">
        <div class="section-header">
          <h2 class="section-title text-gradient-primary">
            <app-premium-icon iconName="dashboard-insights" size="lg" theme="primary"></app-premium-icon>
            Métricas en Tiempo Real
          </h2>
        </div>

        <div class="metrics-grid stagger-container">
          <div 
            *ngFor="let metric of dashboardMetrics(); let i = index; trackBy: trackByMetric"
            class="metric-card premium-card card-premium-interact stagger-item animate-kpi-count-up"
            [style.--stagger-index]="i">
            
            <!-- Metric Icon with Animation -->
            <div class="metric-icon">
              <app-premium-icon 
                [iconName]="metric.iconName"
                [semanticContext]="metric.semanticContext"
                size="xl"
                [animate]="true">
              </app-premium-icon>
            </div>

            <!-- Metric Value -->
            <div class="metric-value">
              <span class="value animate-kpi-count-up">{{ formatMetricValue(metric.value) }}</span>
              <div class="metric-change" [ngClass]="'trend-' + metric.trend">
                <app-premium-icon 
                  [iconName]="getTrendIcon(metric.trend)"
                  size="sm"
                  [theme]="getTrendTheme(metric.trend)">
                </app-premium-icon>
                {{ formatChange(metric.change) }}%
              </div>
            </div>

            <!-- Metric Label -->
            <div class="metric-label">{{ metric.label }}</div>
          </div>
        </div>
      </section>

      <!-- Interactive Success Demonstrations -->
      <section class="demo-section premium-container">
        <div class="section-header">
          <h2 class="section-title text-gradient-primary">
            <app-premium-icon iconName="integration-active" size="lg" theme="primary"></app-premium-icon>
            Sistema de Experiencia Premium
          </h2>
        </div>

        <div class="demo-grid">
          <!-- Payment Success Demo -->
          <div class="demo-card premium-card card-premium-interact">
            <h3>
              <app-premium-icon iconName="payment-processing" size="md" theme="success"></app-premium-icon>
              Procesamiento de Pagos
            </h3>
            
            <app-human-message
              microcopyId="payment-processed"
              size="compact"
              [dismissible]="false">
            </app-human-message>

            <button 
              class="demo-button btn-premium-hover btn-primary gpu-accelerated"
              (click)="triggerPaymentSuccess()"
              [class.animate-payment-success]="paymentSuccessTriggered()">
              <app-premium-icon iconName="action-save" size="sm"></app-premium-icon>
              Simular Pago Exitoso
            </button>
          </div>

          <!-- Contract Signing Demo -->
          <div class="demo-card premium-card card-premium-interact">
            <h3>
              <app-premium-icon iconName="protection-shield" size="md" theme="info"></app-premium-icon>
              Firma Digital
            </h3>
            
            <app-human-message
              microcopyId="contract-signed"
              size="compact"
              [dismissible]="false">
            </app-human-message>

            <button 
              class="demo-button btn-premium-hover btn-accent gpu-accelerated"
              (click)="triggerContractSigning()"
              [class.animate-contract-signed]="contractSignedTriggered()">
              <app-premium-icon iconName="customer-verification" size="sm"></app-premium-icon>
              Simular Firma
            </button>
          </div>

          <!-- KYC Verification Demo -->
          <div class="demo-card premium-card card-premium-interact">
            <h3>
              <app-premium-icon iconName="customer-verification" size="md" theme="success"></app-premium-icon>
              Verificación KYC
            </h3>
            
            <app-human-message
              microcopyId="kyc-approved"
              size="compact"
              [dismissible]="false">
            </app-human-message>

            <button 
              class="demo-button btn-premium-hover btn-secondary gpu-accelerated"
              (click)="triggerKYCVerification()"
              [class.animate-success-pulse]="kycVerifiedTriggered()">
              <app-premium-icon iconName="system-healthy" size="sm"></app-premium-icon>
              Verificar Cliente
            </button>
          </div>
        </div>
      </section>

      <!-- Loading States Demo -->
      <section class="loading-demo-section premium-container">
        <div class="section-header">
          <h2 class="section-title text-gradient-primary">
            <app-premium-icon iconName="system-processing" size="lg" theme="info"></app-premium-icon>
            Estados de Carga Premium
          </h2>
        </div>

        <div class="loading-grid">
          <!-- Shimmer Loading -->
          <div class="loading-demo premium-card">
            <h4>Shimmer Effect</h4>
            <div class="shimmer-container animate-shimmer">
              <div class="shimmer-line"></div>
              <div class="shimmer-line"></div>
              <div class="shimmer-line short"></div>
            </div>
          </div>

          <!-- Pulsing Dots -->
          <div class="loading-demo premium-card">
            <h4>Pulsing Dots</h4>
            <div class="dots-container">
              <div class="dot animate-pulsing-dots"></div>
              <div class="dot animate-pulsing-dots"></div>
              <div class="dot animate-pulsing-dots"></div>
            </div>
          </div>

          <!-- Spinner -->
          <div class="loading-demo premium-card">
            <h4>Smart Spinner</h4>
            <div class="spinner-container">
              <app-premium-icon 
                iconName="system-processing" 
                size="xl" 
                theme="primary"
                [customClasses]="'animate-loading-spinner'">
              </app-premium-icon>
            </div>
          </div>
        </div>
      </section>

      <!-- Contextual Guidance Examples -->
      <section class="guidance-section premium-container">
        <div class="section-header">
          <h2 class="section-title text-gradient-primary">
            <app-premium-icon iconName="customer-communication" size="lg" theme="primary"></app-premium-icon>
            Mensajería Contextual
          </h2>
        </div>

        <div class="guidance-examples">
          <app-human-message
            microcopyId="quote-optimization-tip"
            [context]="{ quote: { glassProtection: false } }"
            size="normal"
            class="animate-staggered-enter">
          </app-human-message>

          <app-human-message
            microcopyId="seasonal-opportunity"
            size="normal"
            class="animate-staggered-enter">
          </app-human-message>

          <app-human-message
            microcopyId="pipeline-optimization"
            size="normal"
            class="animate-staggered-enter">
          </app-human-message>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .premium-dashboard {
      min-height: 100vh;
      padding-bottom: 4rem;
    }

    .dashboard-header {
      background: var(--glass-bg);
      border-bottom: 1px solid var(--glass-border);
      padding: 2rem 0;
      backdrop-filter: var(--glass-backdrop);
      -webkit-backdrop-filter: var(--glass-backdrop);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
    }

    .status-indicators {
      display: flex;
      gap: 1rem;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .status-healthy {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .status-warning {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .status-error {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .metrics-section {
      margin: 3rem 0;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }

    .metric-icon {
      margin-bottom: 1rem;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }

    .metric-value {
      margin-bottom: 1rem;
    }

    .value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--primary-cyan-300);
      display: block;
      margin-bottom: 0.5rem;
    }

    .metric-change {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .trend-up { color: #22c55e; }
    .trend-down { color: #ef4444; }
    .trend-stable { color: #6b7280; }

    .metric-label {
      font-size: 1rem;
      font-weight: 600;
      color: var(--bg-gray-100);
      opacity: 0.9;
    }

    .demo-section {
      margin: 3rem 0;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }

    .demo-card {
      padding: 2rem;
    }

    .demo-card h3 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--bg-gray-100);
    }

    .demo-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      margin-top: 1.5rem;
    }

    .loading-demo-section {
      margin: 3rem 0;
    }

    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }

    .loading-demo {
      padding: 2rem;
      text-align: center;
    }

    .loading-demo h4 {
      margin-bottom: 1.5rem;
      color: var(--bg-gray-100);
      font-weight: 600;
    }

    .shimmer-container {
      padding: 1rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
    }

    .shimmer-line {
      height: 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .shimmer-line.short {
      width: 60%;
    }

    .dots-container {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary-cyan-400);
    }

    .spinner-container {
      display: flex;
      justify-content: center;
    }

    .guidance-section {
      margin: 3rem 0;
    }

    .guidance-examples {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-top: 2rem;
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1rem;
      }

      .status-indicators {
        flex-wrap: wrap;
        justify-content: center;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .demo-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .loading-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
    }
  `]
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

  // Demo triggers
  paymentSuccessTriggered = signal(false);
  contractSignedTriggered = signal(false);
  kycVerifiedTriggered = signal(false);

  userContext = {
    user: { name: 'Ana García' },
    timeOfDay: 'morning',
    business: { context: 'insurance-sales' }
  };

  constructor(
    private iconService: PremiumIconsService,
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