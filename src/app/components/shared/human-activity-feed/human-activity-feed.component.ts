
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';

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
  imports: [CommonModule, IconComponent],
  templateUrl: './human-activity-feed.component.html',
  styleUrls: ['./human-activity-feed.component.scss'],
})
export class HumanActivityFeedComponent implements OnInit, OnChanges {
  @Input() activities: ActivityItem[] = [];
  @Input() maxItems: number = 10;
  @Input() showSuggestedActions: boolean = false;

  selectedFilter: 'all' | 'actions' | 'achievements' = 'all';
  filteredActivities: ActivityItem[] = [];

  ngOnInit(): void {
    this.updateFilteredActivities();
  }

  ngOnChanges(): void {
    this.updateFilteredActivities();
  }

  trackByActivity(_: number, activity: ActivityItem): string {
    return activity.id;
  }

  setFilter(filter: 'all' | 'actions' | 'achievements'): void {
    if (this.selectedFilter === filter) return;
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
        this.filteredActivities = base.filter(activity =>
          (this.showSuggestedActions && activity.suggestedAction) || activity.priority === 'high'
        );
        break;
      case 'achievements':
        this.filteredActivities = base.filter(activity =>
          activity.category === 'achievement' || activity.category === 'payment'
        );
        break;
      default:
        this.filteredActivities = base;
    }
  }

  getCategoryIconName(category: ActivityItem['category']): IconName {
    const iconMap: Record<ActivityItem['category'], IconName> = {
      payment: 'chart',
      document: 'document',
      communication: 'chat',
      opportunity: 'target',
      renewal: 'refresh',
      achievement: 'badge-check',
    };

    return iconMap[category] ?? 'more';
  }

  getSuggestedActionIconName(category: ActivityItem['category']): IconName {
    const iconMap: Record<ActivityItem['category'], IconName> = {
      payment: 'badge-check',
      document: 'link',
      communication: 'phone',
      opportunity: 'target',
      renewal: 'clock',
      achievement: 'star',
    };

    return iconMap[category] ?? 'arrow-right';
  }

  getTypeLabel(type: ActivityItem['type']): string {
    const labels: Record<ActivityItem['type'], string> = {
      system: 'Sistema',
      advisor: 'Asesor',
      client: 'Cliente',
      automated: 'Automatizado',
    };

    return labels[type] ?? type;
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'hace un momento';
    if (minutes < 60) return `hace ${minutes} min`;
    if (hours < 24) return `hace ${hours} h`;
    if (days === 1) return 'ayer';
    return `hace ${days} días`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
    if (!activity.suggestedAction) return;
    // Evento futuro para analytics / integración
    console.info('Acción sugerida', activity.suggestedAction);
  }

  loadMoreActivities(): void {
    console.info('Solicitar más actividades');
  }

  getFilterClasses(filter: 'all' | 'actions' | 'achievements'): Record<string, boolean> {
    return {
      'activity-feed__filter': true,
      'activity-feed__filter--active': this.selectedFilter === filter,
    };
  }

  getItemClasses(activity: ActivityItem): Record<string, boolean> {
    return {
      'activity-feed__item': true,
      'activity-feed__item--high': activity.priority === 'high',
      'activity-feed__item--medium': activity.priority === 'medium',
      'activity-feed__item--low': activity.priority === 'low',
    };
  }

  getMarkerClasses(activity: ActivityItem): Record<string, boolean> {
    return {
      'activity-feed__marker': true,
      [`activity-feed__marker--${activity.category}`]: true,
    };
  }

  getTypeClasses(type: ActivityItem['type']): Record<string, boolean> {
    return {
      'activity-feed__type': true,
      [`activity-feed__type--${type}`]: true,
    };
  }
}
