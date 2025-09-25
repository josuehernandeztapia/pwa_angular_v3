import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { NextBestActionService, NextBestAction, ActionInsights } from '../../../services/next-best-action.service';

@Component({
  selector: 'app-next-best-action-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="next-best-actions-widget">
      <!-- Header -->
      <div class="widget-header">
        <div class="header-content">
          <div class="icon-container">
            <span class="widget-icon">🎯</span>
          </div>
          <div class="header-text">
            <h3 class="widget-title">Próximas Acciones Recomendadas</h3>
            <p class="widget-subtitle">IA-powered • {{ insights?.totalActions || 0 }} acciones</p>
          </div>
        </div>
        <div class="loading-indicator" *ngIf="isLoading">
          <span class="spinner"></span>
        </div>
      </div>

      <!-- Quick Insights Bar -->
      <div class="insights-bar" *ngIf="insights && !isLoading">
        <div class="insight-item critical" *ngIf="insights.criticalActions > 0">
          <span class="insight-icon">⚠️</span>
          <span class="insight-text">{{ insights.criticalActions }} críticas</span>
        </div>
        <div class="insight-item value">
          <span class="insight-icon">💰</span>
          <span class="insight-text">{{ formatCurrency(insights.totalBusinessValue) }}</span>
        </div>
        <div class="insight-item focus">
          <span class="insight-icon">🎯</span>
          <span class="insight-text">{{ insights.topCategory }}</span>
        </div>
      </div>

      <!-- Actions List -->
      <div class="actions-container" *ngIf="!isLoading; else loadingTemplate">
        <div 
          *ngFor="let action of displayActions; trackBy: trackByActionId; let i = index"
          class="action-card"
          [class]="'priority-' + action.priority"
          [routerLink]="action.actionUrl"
          [class.has-client]="!!action.clientName"
        >
          <!-- Priority indicator -->
          <div class="priority-indicator" [attr.data-priority]="action.priority"></div>
          
          <!-- Action content -->
          <div class="action-content">
            <div class="action-header">
              <div class="action-type-icon">{{ getActionIcon(action.type) }}</div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-confidence" *ngIf="action.confidence >= 70">
                <span class="confidence-icon">🤖</span>
                <span class="confidence-text">{{ action.confidence }}%</span>
              </div>
            </div>
            
            <div class="action-description">{{ action.description }}</div>
            
            <!-- Client info -->
            <div class="action-client" *ngIf="action.clientName">
              <span class="client-icon">👤</span>
              <span class="client-name">{{ action.clientName }}</span>
            </div>

            <!-- Action metadata -->
            <div class="action-metadata">
              <div class="metadata-item time">
                <span class="meta-icon">⏱️</span>
                <span class="meta-text">{{ action.timeToComplete }} min</span>
              </div>
              <div class="metadata-item value" *ngIf="action.businessValue > 0">
                <span class="meta-icon">💰</span>
                <span class="meta-text">{{ formatCurrency(action.businessValue) }}</span>
              </div>
              <div class="metadata-item due-date" *ngIf="action.dueDate">
                <span class="meta-icon">📅</span>
                <span class="meta-text">{{ formatDueDate(action.dueDate) }}</span>
              </div>
            </div>

            <!-- Tags -->
            <div class="action-tags" *ngIf="action.tags.length > 0">
              <span 
                *ngFor="let tag of action.tags.slice(0, 3); trackBy: trackByTag" 
                class="action-tag"
                [class]="'tag-' + getTagClass(tag)"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>

        <!-- View all actions link -->
        <div class="view-all-container" *ngIf="allActions.length > maxDisplayActions">
          <button 
            class="view-all-btn"
            (click)="toggleShowAll()"
          >
            {{ showingAll ? 'Mostrar menos' : ('Ver todas (' + allActions.length + ')') }}
            <span class="btn-icon">{{ showingAll ? '▲' : '▼' }}</span>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="!isLoading && allActions.length === 0">
        <div class="empty-icon">✨</div>
        <div class="empty-description">No hay acciones urgentes en este momento.</div>
      </div>

      <!-- Loading template -->
      <ng-template #loadingTemplate>
        <div class="loading-container">
          <div class="skeleton-card" *ngFor="let item of [1,2,3]; trackBy: trackByIndex"></div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .next-best-actions-widget {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.06);
      backdrop-filter: blur(10px);
    }

    /* Header */
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
    }

    .icon-container {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 4px 12px rgba(6, 214, 160, 0.3);
    }

    .widget-icon {
      font-size: 20px;
      display: block;
    }

    .header-text {
      flex: 1;
    }

    .widget-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 4px 0;
      line-height: 1.3;
    }

    .widget-subtitle {
      font-size: 13px;
      color: #6b7280;
      margin: 0;
      font-weight: 500;
    }

    .loading-indicator {
      display: flex;
      align-items: center;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e5e7eb;
      border-top: 2px solid #06d6a0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Insights Bar */
    .insights-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .insight-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid transparent;
    }

    .insight-item.critical {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
      border-color: rgba(239, 68, 68, 0.2);
    }

    .insight-item.value {
      background: rgba(6, 214, 160, 0.1);
      color: #059669;
      border-color: rgba(6, 214, 160, 0.2);
    }

    .insight-item.focus {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;
      border-color: rgba(59, 130, 246, 0.2);
    }

    .insight-icon {
      font-size: 14px;
    }

    /* Actions Container */
    .actions-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .action-card {
      position: relative;
      background: #fafafa;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid #e5e7eb;
      text-decoration: none;
      color: inherit;
      overflow: hidden;
    }

    .action-card:hover {
      background: #f3f4f6;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .action-card:active {
      transform: translateY(0);
    }

    /* Priority styling */
    .action-card.priority-critical {
      border-left: 4px solid #dc2626;
      background: linear-gradient(90deg, rgba(239, 68, 68, 0.05), #fafafa);
    }

    .action-card.priority-high {
      border-left: 4px solid #f59e0b;
      background: linear-gradient(90deg, rgba(245, 158, 11, 0.05), #fafafa);
    }

    .action-card.priority-medium {
      border-left: 4px solid #3b82f6;
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.05), #fafafa);
    }

    .action-card.priority-low {
      border-left: 4px solid #6b7280;
    }

    .priority-indicator {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .priority-indicator[data-priority="critical"] {
      background: #dc2626;
      box-shadow: 0 0 8px rgba(220, 38, 38, 0.4);
    }

    .priority-indicator[data-priority="high"] {
      background: #f59e0b;
      box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
    }

    .priority-indicator[data-priority="medium"] {
      background: #3b82f6;
    }

    .priority-indicator[data-priority="low"] {
      background: #6b7280;
    }

    /* Action Content */
    .action-content {
      padding-right: 20px;
    }

    .action-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }

    .action-type-icon {
      font-size: 16px;
      margin-top: 2px;
    }

    .action-title {
      font-size: 15px;
      font-weight: 600;
      color: #1f2937;
      flex: 1;
      line-height: 1.3;
    }

    .action-confidence {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #6b7280;
      background: rgba(6, 214, 160, 0.1);
      padding: 3px 6px;
      border-radius: 6px;
    }

    .confidence-icon {
      font-size: 10px;
    }

    .action-description {
      font-size: 13px;
      color: #4b5563;
      line-height: 1.4;
      margin-bottom: 12px;
    }

    .action-client {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 12px;
      padding: 6px 10px;
      background: rgba(59, 130, 246, 0.08);
      border-radius: 6px;
      width: fit-content;
    }

    .client-icon {
      font-size: 12px;
    }

    .client-name {
      font-weight: 500;
    }

    /* Metadata */
    .action-metadata {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #6b7280;
    }

    .meta-icon {
      font-size: 12px;
    }

    /* Tags */
    .action-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .action-tag {
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 500;
      background: #e5e7eb;
      color: #6b7280;
    }

    .action-tag.tag-urgent {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }

    .action-tag.tag-payment {
      background: rgba(6, 214, 160, 0.1);
      color: #059669;
    }

    .action-tag.tag-document {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;
    }

    .action-tag.tag-opportunity {
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;
    }

    /* View All */
    .view-all-container {
      text-align: center;
      margin-top: 16px;
    }

    .view-all-btn {
      background: rgba(6, 214, 160, 0.1);
      border: 1px solid rgba(6, 214, 160, 0.2);
      color: #059669;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }

    .view-all-btn:hover {
      background: rgba(6, 214, 160, 0.15);
      transform: translateY(-1px);
    }

    .btn-icon {
      font-size: 10px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 6px;
    }

    .empty-description {
      font-size: 13px;
      line-height: 1.4;
    }

    /* Loading */
    .loading-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-card {
      height: 120px;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 12px;
    }

    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .next-best-actions-widget {
        padding: 16px;
        border-radius: 12px;
      }

      .widget-title {
        font-size: 16px;
      }

      .insights-bar {
        gap: 8px;
      }

      .insight-item {
        padding: 6px 10px;
        font-size: 11px;
      }

      .action-card {
        padding: 14px;
      }

      .action-metadata {
        gap: 12px;
      }

      .metadata-item {
        font-size: 10px;
      }
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .next-best-actions-widget {
        background: rgba(31, 41, 55, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .widget-title {
        color: #f9fafb;
      }

      .widget-subtitle {
        color: #9ca3af;
      }

      .action-card {
        background: rgba(55, 65, 81, 0.8);
        border-color: rgba(75, 85, 99, 0.6);
        color: #f9fafb;
      }

      .action-card:hover {
        background: rgba(55, 65, 81, 0.9);
      }

      .action-title {
        color: #f9fafb;
      }

      .action-description {
        color: #d1d5db;
      }
    }
  `]
})
export class NextBestActionWidgetComponent implements OnInit, OnDestroy {
  @Input() maxDisplayActions = 5;
  @Input() autoRefresh = true;
  @Input() refreshInterval = 300000; // 5 minutes

  allActions: NextBestAction[] = [];
  displayActions: NextBestAction[] = [];
  insights: ActionInsights | null = null;
  isLoading = true;
  showingAll = false;

  private destroy$ = new Subject<void>();

  constructor(private nextBestActionService: NextBestActionService) {}

  ngOnInit(): void {
    this.loadActions();
    
    if (this.autoRefresh) {
      setInterval(() => this.loadActions(), this.refreshInterval);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadActions(): void {
    this.isLoading = true;
    
    this.nextBestActionService.generateNextBestActions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (actions) => {
          this.allActions = actions;
          this.updateDisplayActions();
          this.insights = this.nextBestActionService.getActionInsights(actions);
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.allActions = [];
          this.displayActions = [];
        }
      });
  }

  private updateDisplayActions(): void {
    this.displayActions = this.showingAll 
      ? this.allActions 
      : this.allActions.slice(0, this.maxDisplayActions);
  }

  toggleShowAll(): void {
    this.showingAll = !this.showingAll;
    this.updateDisplayActions();
  }

  getActionIcon(type: string): string {
    const icons = {
      'contact': '📞',
      'document': '📋',
      'payment': '💳',
      'opportunity': '🎯',
      'system': '⚙️'
    };
    return icons[type as keyof typeof icons] || '📌';
  }

  formatCurrency(value: number): string {
    if (value === 0) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDueDate(dueDate: Date): string {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencida';
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays <= 7) return `En ${diffDays} días`;
    
    return dueDate.toLocaleDateString('es-MX', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getTagClass(tag: string): string {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('urgente') || tagLower.includes('crítico')) return 'urgent';
    if (tagLower.includes('pago') || tagLower.includes('cobranza')) return 'payment';
    if (tagLower.includes('documento')) return 'document';
    if (tagLower.includes('oportunidad')) return 'opportunity';
    return 'default';
  }

  // TrackBy functions for performance
  trackByActionId(index: number, action: NextBestAction): string {
    return action.id;
  }

  trackByTag(index: number, tag: string): string {
    return tag;
  }

  trackByIndex(index: number): number {
    return index;
  }
}

