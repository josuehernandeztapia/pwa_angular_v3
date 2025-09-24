import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ActivityItem {
  id: string;
  type: 'system' | 'advisor' | 'client' | 'automated';
  category: 'payment' | 'document' | 'communication' | 'opportunity' | 'renewal' | 'achievement';
  timestamp: Date;
  client?: {
    id: string;
    name: string;
  };
  title: string;
  description: string;
  metadata?: {
    amount?: number;
    documentType?: string;
    channel?: string;
    achievement?: string;
  };
  suggestedAction?: {
    label: string;
    action: string;
    params?: any;
  };
  priority: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-human-activity-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="activity-feed-container">
      <div class="feed-header">
        <h3 class="feed-title">🛰️ Feed de Actividad en Tiempo Real</h3>
        <div class="feed-controls">
          <button 
            class="filter-btn"
            [class.active]="selectedFilter === 'all'"
            (click)="setFilter('all')"
          >
            Todos
          </button>
          <button 
            class="filter-btn"
            [class.active]="selectedFilter === 'actions'"
            (click)="setFilter('actions')"
          >
            Acciones
          </button>
          <button 
            class="filter-btn"
            [class.active]="selectedFilter === 'achievements'"
            (click)="setFilter('achievements')"
          >
            Logros
          </button>
        </div>
      </div>

      <div class="activity-stream">
        <div 
          *ngFor="let activity of filteredActivities; trackBy: trackByActivity"
          class="activity-item"
          [class]="'priority-' + activity.priority"
        >
          <div class="activity-timeline">
            <div class="activity-dot" [class]="'category-' + activity.category">
              {{ getCategoryIcon(activity.category) }}
            </div>
            <div class="timeline-line" *ngIf="!isLastItem(activity)"></div>
          </div>

          <div class="activity-content">
            <div class="activity-header">
              <div class="activity-meta">
                <span class="activity-type" [class]="'type-' + activity.type">
                  {{ getTypeLabel(activity.type) }}
                </span>
                <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
              </div>
              <div class="activity-priority" *ngIf="activity.priority === 'high'">
                <span class="priority-indicator">🔥</span>
              </div>
            </div>

            <div class="activity-body">
              <h4 class="activity-title">{{ activity.title }}</h4>
              <p class="activity-description">
                <ng-container *ngIf="activity.client?.name as clientName; else plainDesc">
                  {{ activity.description.replace(clientName, '') || activity.description }}
                  <span class="client-name">{{ clientName }}</span>
                </ng-container>
                <ng-template #plainDesc>{{ activity.description }}</ng-template>
              </p>
              
              <div class="activity-metadata" *ngIf="hasMetadata(activity)">
                <div class="metadata-item" *ngIf="activity.metadata?.amount">
                  <span class="metadata-icon">💰</span>
                  <span class="metadata-text">\${{ formatCurrency(activity.metadata?.amount || 0) }}</span>
                </div>
                <div class="metadata-item" *ngIf="activity.metadata?.documentType">
                  <span class="metadata-icon">📄</span>
                  <span class="metadata-text">{{ activity.metadata?.documentType }}</span>
                </div>
                <div class="metadata-item" *ngIf="activity.metadata?.channel">
                  <span class="metadata-icon">📱</span>
                  <span class="metadata-text">{{ activity.metadata?.channel }}</span>
                </div>
              </div>

              <button 
                *ngIf="activity.suggestedAction"
                class="suggested-action-btn"
                (click)="executeSuggestedAction(activity)"
              >
                <span class="action-icon">{{ getSuggestedActionIcon(activity.category) }}</span>
                <span class="action-text">{{ activity.suggestedAction.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="feed-empty" *ngIf="filteredActivities.length === 0">
          <div class="empty-icon">📭</div>
          <h4 class="empty-title">Sin actividad reciente</h4>
          <p class="empty-description">
            Las nuevas actividades aparecerán aquí en tiempo real
          </p>
        </div>
      </div>

      <div class="feed-footer" *ngIf="activities.length > 0">
        <button class="load-more-btn" (click)="loadMoreActivities()">
          <span>⬇️</span>
          Cargar más actividades
        </button>
      </div>
    </div>
  `,
  styles: [`
    .activity-feed-container {
      background: var(--flat-surface-bg); // FIXED (verify-ux)
      border: 1px solid var(--neutral-800); // FIXED (verify-ux)
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 32px;
    }

    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .feed-title {
      color: var(--neutral-100);
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .feed-controls {
      display: flex;
      gap: 8px;
    }

    .filter-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--neutral-300);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .filter-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .filter-btn.active {
      background: var(--primary-cyan-400);
      border-color: var(--primary-cyan-400);
      color: white;
    }

    .activity-stream {
      max-height: 500px;
      overflow-y: auto;
      padding-right: 8px;
    }

    .activity-stream::-webkit-scrollbar {
      width: 4px;
    }

    .activity-stream::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 2px;
    }

    .activity-stream::-webkit-scrollbar-thumb {
      background: var(--primary-cyan-600);
      border-radius: 2px;
    }

    .activity-item {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      opacity: 0;
      animation: fadeInUp 0.6s ease-out forwards;
    }

    .activity-item.priority-high {
      background: rgba(245, 158, 11, 0.05);
      border-left: 3px solid var(--accent-amber-500);
      padding-left: 16px;
      border-radius: 0 8px 8px 0;
    }

    .activity-timeline {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .activity-dot {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      border: 2px solid var(--neutral-800); // FIXED (verify-ux)
      z-index: 2;
    }

    .category-payment {
      background: linear-gradient(135deg, var(--success-500), var(--success-600));
      color: white;
    }

    .category-document {
      background: linear-gradient(135deg, var(--info-500), var(--info-600));
      color: white;
    }

    .category-communication {
      background: linear-gradient(135deg, var(--primary-cyan-400), var(--primary-cyan-600));
      color: white;
    }

    .category-opportunity {
      background: linear-gradient(135deg, var(--accent-amber-400), var(--accent-amber-600));
      color: var(--neutral-950);
    }

    .category-renewal {
      background: linear-gradient(135deg, var(--warning-500), var(--warning-600));
      color: white;
    }

    .category-achievement {
      background: linear-gradient(135deg, var(--success-400), var(--success-500));
      color: white;
    }

    .timeline-line {
      width: 2px;
      height: 40px;
      background: var(--flat-surface-bg); // FIXED (verify-ux)
      margin-top: 8px;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .activity-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .activity-type {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .type-system {
      background: rgba(59, 130, 246, 0.2);
      color: var(--info-400);
    }

    .type-advisor {
      background: rgba(34, 211, 238, 0.2);
      color: var(--primary-cyan-400);
    }

    .type-client {
      background: rgba(245, 158, 11, 0.2);
      color: var(--accent-amber-400);
    }

    .type-automated {
      background: rgba(156, 163, 175, 0.2);
      color: var(--neutral-400);
    }

    .activity-time {
      color: var(--neutral-400);
      font-size: 0.8rem;
    }

    .priority-indicator {
      font-size: 1rem;
    }

    .activity-title {
      color: var(--neutral-100);
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 6px 0;
      line-height: 1.3;
    }

    .activity-description {
      color: var(--neutral-300);
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0 0 12px 0;
    }

    .activity-metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }

    .metadata-item {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.8rem;
    }

    .metadata-icon {
      font-size: 0.9rem;
    }

    .metadata-text {
      color: var(--neutral-300);
      font-weight: 500;
    }

    .suggested-action-btn {
      background: linear-gradient(135deg, var(--accent-amber-500), var(--accent-amber-600));
      color: var(--neutral-950);
      border: none;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .suggested-action-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }

    .action-icon {
      font-size: 0.9rem;
    }

    .feed-empty {
      text-align: center;
      padding: 40px 20px;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .empty-title {
      color: var(--neutral-200);
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .empty-description {
      color: var(--neutral-400);
      font-size: 0.9rem;
      margin: 0;
    }

    .feed-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .load-more-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--neutral-300);
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 auto;
      transition: all 0.2s ease;
    }

    .load-more-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }

    /* Highlight mentions and important text */
    .activity-description ::ng-deep .highlight {
      color: var(--accent-amber-400);
      font-weight: 600;
    }

    .activity-description ::ng-deep .client-name {
      color: var(--primary-cyan-300);
      font-weight: 600;
    }

    .activity-description ::ng-deep .action-suggestion {
      color: var(--accent-amber-400);
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .feed-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .activity-item {
        gap: 12px;
      }

      .activity-dot {
        width: 32px;
        height: 32px;
        font-size: 1rem;
      }

      .activity-metadata {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class HumanActivityFeedComponent implements OnInit, OnChanges {
  @Input() activities: ActivityItem[] = [];
  @Input() maxItems: number = 10;
  @Input() showSuggestedActions: boolean = false;
  
  selectedFilter: 'all' | 'actions' | 'achievements' = 'all';
  filteredActivities: ActivityItem[] = [];

  constructor() { }

  ngOnInit(): void {
    this.updateFilteredActivities();
  }

  ngOnChanges(): void {
    this.updateFilteredActivities();
  }

  trackByActivity(index: number, activity: ActivityItem): string {
    return activity.id;
  }

  setFilter(filter: 'all' | 'actions' | 'achievements'): void {
    this.selectedFilter = filter;
    this.updateFilteredActivities();
  }

  private updateFilteredActivities(): void {
    let base = [...this.activities];
    if (this.maxItems > 0) {
      base = base.slice(0, this.maxItems);
    }
    switch (this.selectedFilter) {
      case 'actions':
        this.filteredActivities = base.filter(a => 
          (this.showSuggestedActions && a.suggestedAction) || a.priority === 'high'
        );
        break;
      case 'achievements':
        this.filteredActivities = base.filter(a => 
          a.category === 'achievement' || a.category === 'payment'
        );
        break;
      default:
        this.filteredActivities = base;
    }
  }

  getCategoryIcon(category: string): string {
    const icons = {
      payment: '💰',
      document: '📄',
      communication: '💬',
      opportunity: '💡',
      renewal: '🔄',
      achievement: '🏆'
    };
    return icons[category as keyof typeof icons] || '📋';
  }

  getTypeLabel(type: string): string {
    const labels = {
      system: 'Sistema',
      advisor: 'Asesor',
      client: 'Cliente',
      automated: 'Auto'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getSuggestedActionIcon(category: string): string {
    const icons = {
      payment: '👏',
      document: '📎',
      communication: '📞',
      opportunity: '🎯',
      renewal: '⏰',
      achievement: '🎉'
    };
    return icons[category as keyof typeof icons] || '➡️';
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'hace un momento';
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours}h`;
    if (days === 1) return 'ayer';
    return `hace ${days} días`;
  }

  formatDescription(activity: ActivityItem): string {
    let description = activity.description;
    
    // Highlight client names
    if (activity.client?.name) {
      description = description.replace(
        activity.client.name,
        `<span class="client-name">${activity.client.name}</span>`
      );
    }
    
    // Highlight suggested actions
    if (activity.suggestedAction) {
      const actionWords = ['¡Felicítalo!', '¡Llámalo!', '¡Revisalo!', '¡Contactalo!'];
      actionWords.forEach(word => {
        description = description.replace(
          word,
          `<span class="action-suggestion">${word}</span>`
        );
      });
    }
    
    return description;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  hasMetadata(activity: ActivityItem): boolean {
    return !!(
      activity.metadata?.amount ||
      activity.metadata?.documentType ||
      activity.metadata?.channel
    );
  }

  isLastItem(activity: ActivityItem): boolean {
    return this.filteredActivities.indexOf(activity) === this.filteredActivities.length - 1;
  }

  executeSuggestedAction(activity: ActivityItem): void {
    if (activity.suggestedAction) {
      // Here you would implement the actual action execution
      // this.actionService.execute(activity.suggestedAction.action, activity.suggestedAction.params);
    }
  }

  loadMoreActivities(): void {
    // Here you would implement loading more activities from the service
  }
}
