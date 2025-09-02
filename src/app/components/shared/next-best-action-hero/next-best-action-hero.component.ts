import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface NextBestActionData {
  id: string;
  type: 'contact' | 'document' | 'renewal' | 'opportunity' | 'payment';
  priority: 'critical' | 'high' | 'medium';
  client: {
    id: string;
    name: string;
    healthScore: number;
    route?: string;
    avatar?: string;
  };
  action: {
    title: string;
    description: string;
    reasoning: string;
    timeEstimate: string;
  };
  context: {
    daysWaiting?: number;
    amountInvolved?: number;
    expirationDate?: string;
    lastContact?: string;
  };
  suggestedActions: {
    primary: ActionButton;
    secondary: ActionButton[];
  };
}

export interface ActionButton {
  label: string;
  icon: string;
  action: string;
  params?: any;
}

@Component({
  selector: 'app-next-best-action-hero',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="next-best-action-hero" *ngIf="actionData">
      <div class="hero-header">
        <div class="action-indicator">
          <div class="priority-pulse" [class]="'priority-' + actionData.priority"></div>
          <span class="action-icon">{{ getActionIcon() }}</span>
        </div>
        <div class="hero-title-section">
          <h2 class="hero-title">{{ actionData.action.title }}</h2>
          <p class="hero-subtitle">Tu próxima mejor acción para maximizar el impacto</p>
        </div>
        <div class="time-indicator">
          <span class="time-icon">⏱️</span>
          <span class="time-text">{{ actionData.action.timeEstimate }}</span>
        </div>
      </div>

      <div class="hero-content">
        <div class="client-context">
          <div class="client-avatar">
            <div class="avatar-image" [style.background-image]="getAvatarUrl()">
              {{ !actionData.client.avatar ? getInitials() : '' }}
            </div>
            <div class="health-score" [class]="getHealthScoreClass()">
              {{ actionData.client.healthScore }}
            </div>
          </div>
          
          <div class="client-details">
            <h3 class="client-name">{{ actionData.client.name }}</h3>
            <div class="client-meta" *ngIf="actionData.client.route">
              <span class="route-badge">{{ actionData.client.route }}</span>
            </div>
            <p class="action-description">{{ actionData.action.description }}</p>
          </div>
        </div>

        <div class="action-reasoning">
          <div class="reasoning-header">
            <span class="reasoning-icon">🧠</span>
            <span class="reasoning-title">Inteligencia de Negocio</span>
          </div>
          <p class="reasoning-text">{{ actionData.action.reasoning }}</p>
          
          <div class="context-metrics" *ngIf="hasContextMetrics()">
            <div class="metric" *ngIf="actionData.context.daysWaiting">
              <span class="metric-icon">📅</span>
              <span class="metric-value">{{ actionData.context.daysWaiting }} días</span>
              <span class="metric-label">esperando</span>
            </div>
            <div class="metric" *ngIf="actionData.context.amountInvolved">
              <span class="metric-icon">💰</span>
              <span class="metric-value">\${{ formatCurrency(actionData.context.amountInvolved) }}</span>
              <span class="metric-label">en juego</span>
            </div>
            <div class="metric" *ngIf="actionData.context.expirationDate">
              <span class="metric-icon">⚠️</span>
              <span class="metric-value">{{ formatDate(actionData.context.expirationDate) }}</span>
              <span class="metric-label">vencimiento</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-actions">
        <button 
          class="btn-accent primary-action"
          (click)="executeAction(actionData.suggestedActions.primary)"
        >
          <span class="action-icon">{{ actionData.suggestedActions.primary.icon }}</span>
          <span class="action-text">{{ actionData.suggestedActions.primary.label }}</span>
        </button>

        <div class="secondary-actions">
          <button 
            *ngFor="let action of actionData.suggestedActions.secondary"
            class="btn-primary secondary-action"
            (click)="executeAction(action)"
          >
            <span class="action-icon">{{ action.icon }}</span>
            <span class="action-text">{{ action.label }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .next-best-action-hero {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: var(--glass-backdrop);
      -webkit-backdrop-filter: var(--glass-backdrop);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }

    .next-best-action-hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--accent-amber-500), var(--primary-cyan-400));
      opacity: 0.8;
    }

    /* ===== HERO HEADER ===== */
    .hero-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }

    .action-indicator {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.1);
      border: 2px solid var(--accent-amber-500);
    }

    .priority-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      animation: pulse-priority 2s infinite;
    }

    .priority-critical {
      background: radial-gradient(circle, var(--error-500) 0%, transparent 70%);
    }

    .priority-high {
      background: radial-gradient(circle, var(--accent-amber-500) 0%, transparent 70%);
    }

    .priority-medium {
      background: radial-gradient(circle, var(--primary-cyan-400) 0%, transparent 70%);
    }

    @keyframes pulse-priority {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }

    .action-icon {
      font-size: 1.8rem;
      z-index: 2;
      position: relative;
    }

    .hero-title-section {
      flex: 1;
    }

    .hero-title {
      color: var(--accent-amber-400);
      font-size: 1.8rem;
      font-weight: 700;
      margin: 0 0 4px 0;
      line-height: 1.2;
    }

    .hero-subtitle {
      color: var(--bg-gray-300);
      font-size: 0.95rem;
      margin: 0;
      opacity: 0.9;
    }

    .time-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 211, 238, 0.1);
      border: 1px solid var(--primary-cyan-400);
      border-radius: 12px;
      padding: 8px 16px;
    }

    .time-icon {
      font-size: 1.1rem;
    }

    .time-text {
      color: var(--primary-cyan-300);
      font-weight: 600;
      font-size: 0.9rem;
    }

    /* ===== HERO CONTENT ===== */
    .hero-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }

    .client-context {
      display: flex;
      gap: 16px;
    }

    .client-avatar {
      position: relative;
      flex-shrink: 0;
    }

    .avatar-image {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-cyan-400), var(--primary-cyan-600));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.2rem;
      background-size: cover;
      background-position: center;
      border: 3px solid var(--glass-border);
    }

    .health-score {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      border: 2px solid var(--bg-gray-950);
    }

    .health-excellent { background: var(--success-500); color: white; }
    .health-good { background: var(--primary-cyan-400); color: white; }
    .health-warning { background: var(--accent-amber-500); color: var(--bg-gray-950); }
    .health-critical { background: var(--error-500); color: white; }

    .client-details {
      flex: 1;
    }

    .client-name {
      color: var(--bg-gray-100);
      font-size: 1.3rem;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .client-meta {
      margin-bottom: 12px;
    }

    .route-badge {
      background: rgba(34, 211, 238, 0.2);
      color: var(--primary-cyan-300);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .action-description {
      color: var(--bg-gray-300);
      font-size: 1rem;
      line-height: 1.5;
      margin: 0;
    }

    /* ===== ACTION REASONING ===== */
    .action-reasoning {
      background: rgba(245, 158, 11, 0.05);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 16px;
      padding: 20px;
    }

    .reasoning-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .reasoning-icon {
      font-size: 1.2rem;
    }

    .reasoning-title {
      color: var(--accent-amber-400);
      font-weight: 600;
      font-size: 1rem;
    }

    .reasoning-text {
      color: var(--bg-gray-200);
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }

    .context-metrics {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(245, 158, 11, 0.1);
      border-radius: 10px;
      padding: 8px 12px;
    }

    .metric-icon {
      font-size: 0.9rem;
    }

    .metric-value {
      color: var(--accent-amber-300);
      font-weight: 700;
      font-size: 0.9rem;
    }

    .metric-label {
      color: var(--bg-gray-400);
      font-size: 0.8rem;
    }

    /* ===== HERO ACTIONS ===== */
    .hero-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .primary-action {
      padding: 16px 32px;
      font-size: 1.1rem;
      font-weight: 700;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 200px;
      justify-content: center;
    }

    .secondary-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .secondary-action {
      padding: 12px 20px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-icon {
      font-size: 1.1rem;
    }

    /* ===== RESPONSIVE DESIGN ===== */
    @media (max-width: 768px) {
      .next-best-action-hero {
        padding: 24px;
      }

      .hero-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .action-indicator {
        width: 50px;
        height: 50px;
      }

      .action-icon {
        font-size: 1.5rem;
      }

      .hero-title {
        font-size: 1.5rem;
      }

      .hero-content {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .context-metrics {
        flex-direction: column;
        gap: 12px;
      }

      .hero-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .primary-action {
        min-width: auto;
      }

      .secondary-actions {
        justify-content: center;
      }
    }
  `]
})
export class NextBestActionHeroComponent implements OnInit {
  @Input() actionData?: NextBestActionData;
  @Output() actionExecuted = new EventEmitter<{action: ActionButton, context: NextBestActionData}>();

  constructor() { }

  ngOnInit(): void { }

  getActionIcon(): string {
    if (!this.actionData) return '🎯';
    
    const icons = {
      contact: '📞',
      document: '📄',
      renewal: '🔄',
      opportunity: '💡',
      payment: '💰'
    };
    
    return icons[this.actionData.type] || '🎯';
  }

  getAvatarUrl(): string {
    if (this.actionData?.client.avatar) {
      return `url(${this.actionData.client.avatar})`;
    }
    return '';
  }

  getInitials(): string {
    if (!this.actionData?.client.name) return '?';
    
    return this.actionData.client.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getHealthScoreClass(): string {
    if (!this.actionData?.client.healthScore) return 'health-critical';
    
    const score = this.actionData.client.healthScore;
    if (score >= 80) return 'health-excellent';
    if (score >= 65) return 'health-good';
    if (score >= 40) return 'health-warning';
    return 'health-critical';
  }

  hasContextMetrics(): boolean {
    if (!this.actionData?.context) return false;
    
    return !!(
      this.actionData.context.daysWaiting ||
      this.actionData.context.amountInvolved ||
      this.actionData.context.expirationDate
    );
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric'
    });
  }

  executeAction(action: ActionButton): void {
    if (this.actionData) {
      this.actionExecuted.emit({
        action,
        context: this.actionData
      });
    }
  }
}