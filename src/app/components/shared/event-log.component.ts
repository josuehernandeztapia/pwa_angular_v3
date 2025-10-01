import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Actor, EventLog, EventType } from '../../models/types';
import { IconComponent } from './icon/icon.component';
import { IconRegistryService } from './icon/icon-definitions';

interface EventGroup {
  date: string;
  events: EventLog[];
}

@Component({
  selector: 'app-event-log',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './event-log.component.html',
  styleUrls: ['./event-log.component.scss'],
})
export class EventLogComponent implements OnInit {
  @Input() events: EventLog[] = [];
  @Input() maxEvents: number = 50;
  @Input() showFilters: boolean = true;
  @Input() showActions: boolean = true;
  @Input() autoRefresh: boolean = false;

  viewMode: 'timeline' | 'list' = 'timeline';
  eventFilter: 'all' | 'payments' | 'documents' | 'system' = 'all';
  filteredEvents: EventLog[] = [];
  hasMoreEvents: boolean = false;
  isLoadingMore: boolean = false;
  private readonly iconCache = new Map<EventType, string>();
  private readonly defaultDocumentIcon: string;

  constructor(private iconRegistry: IconRegistryService) {
    this.iconCache.set(
      EventType.Contribution,
      this.iconRegistry.toSvg('handshake', {
        className: 'icon-16',
        color: 'var(--color-success)'
      })
    );

    this.iconCache.set(
      EventType.Collection,
      this.iconRegistry.toSvg('collection', {
        className: 'icon-16',
        color: 'var(--accent-muted)'
      })
    );

    this.iconCache.set(
      EventType.AdvisorAction,
      this.iconRegistry.toSvg('document', {
        className: 'icon-16',
        color: 'var(--color-warning)'
      })
    );

    this.iconCache.set(
      EventType.ClientAction,
      this.iconRegistry.toSvg('user', {
        className: 'icon-16',
        color: 'var(--color-success)'
      })
    );

    this.iconCache.set(
      EventType.System,
      this.iconRegistry.toSvg('settings', {
        className: 'icon-16',
        color: 'var(--color-text-tertiary)'
      })
    );

    this.iconCache.set(
      EventType.GoalAchieved,
      this.iconRegistry.toSvg('target', {
        className: 'icon-16',
        color: 'var(--accent-primary)'
      })
    );

    this.iconCache.set(
      EventType.StatusChange,
      this.iconRegistry.toSvg('chart', {
        className: 'icon-16',
        color: 'var(--color-info)'
      })
    );

    this.iconCache.set(
      EventType.DocumentSubmission,
      this.iconRegistry.toSvg('cloud-upload', {
        className: 'icon-16',
        color: 'var(--color-success)'
      })
    );

    this.iconCache.set(
      EventType.DocumentReview,
      this.iconRegistry.toSvg('document', {
        className: 'icon-16',
        color: 'var(--color-warning)'
      })
    );

    this.iconCache.set(
      EventType.KYCCompleted,
      this.iconRegistry.toSvg('badge-check', {
        className: 'icon-16',
        color: 'var(--accent-primary)'
      })
    );

    this.defaultDocumentIcon = this.iconRegistry.toSvg('document', {
      className: 'icon-16',
      color: 'var(--color-text-secondary)'
    });
  }

  ngOnInit(): void {
    this.updateFilteredEvents();
  }

  setViewMode(mode: 'timeline' | 'list'): void {
    this.viewMode = mode;
  }

  setEventFilter(filter: 'all' | 'payments' | 'documents' | 'system'): void {
    this.eventFilter = filter;
    this.updateFilteredEvents();
  }

  updateFilteredEvents(): void {
    let filtered = [...this.events];

    // Apply filter
    switch (this.eventFilter) {
      case 'payments':
        filtered = filtered.filter(event => 
          event.type === EventType.Contribution || 
          event.type === EventType.Collection
        );
        break;
      case 'documents':
        filtered = filtered.filter(event => 
          event.type === EventType.AdvisorAction && 
          event.message.toLowerCase().includes('documento')
        );
        break;
      case 'system':
        filtered = filtered.filter(event => 
          event.type === EventType.System
        );
        break;
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to maxEvents
    this.filteredEvents = filtered.slice(0, this.maxEvents);
    this.hasMoreEvents = filtered.length > this.maxEvents;
  }

  getEventGroups(): EventGroup[] {
    const groups: { [date: string]: EventLog[] } = {};
    
    this.filteredEvents.forEach(event => {
      const date = this.formatDate(event.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    return Object.keys(groups).map(date => ({
      date,
      events: groups[date]
    }));
  }

  getEventIcon(event: EventLog): string {
    return this.iconCache.get(event.type) ?? this.defaultDocumentIcon;
  }

  getFilterButtonClasses(filter: 'all' | 'payments' | 'documents' | 'system'): Record<string, boolean> {
    const isActive = this.eventFilter === filter;
    return {
      'event-log__filter-btn--active': isActive,
      [`event-log__filter-btn--${filter}`]: isActive,
      'event-log__filter-btn--inactive': !isActive,
    };
  }

  getViewModeClasses(mode: 'timeline' | 'list'): Record<string, boolean> {
    const isActive = this.viewMode === mode;
    return {
      'event-log__mode-btn--active': isActive,
      'event-log__mode-btn--inactive': !isActive,
    };
  }

  getEventNodeClass(event: EventLog): string {
    if (event.type === EventType.Contribution) return 'event-log__timeline-node--payment';
    if (event.type === EventType.Collection) return 'event-log__timeline-node--collection';
    if (event.type === EventType.AdvisorAction) return 'event-log__timeline-node--document';
    return 'event-log__timeline-node--system';
  }

  getEventCardClass(event: EventLog): string {
    if (event.type === EventType.Contribution) return 'event-log__card--payment';
    if (event.type === EventType.Collection) return 'event-log__card--collection';
    if (event.type === EventType.AdvisorAction) return 'event-log__card--document';
    return 'event-log__card--system';
  }

  getActorBadgeClass(actor: Actor): string {
    const classes = {
      [Actor.Asesor]: 'event-log__actor-badge--asesor',
      [Actor.Cliente]: 'event-log__actor-badge--cliente',
      [Actor.Sistema]: 'event-log__actor-badge--sistema'
    };
    return classes[actor] || 'event-log__actor-badge--sistema';
  }

  getAmountDisplayClass(event: EventLog): string {
    if (event.type === EventType.Contribution || event.type === EventType.Collection) {
      return 'event-log__amount-card--income';
    }
    return 'event-log__amount-card--expense';
  }

  getAmountTextClass(event: EventLog): string {
    if (event.type === EventType.Contribution || event.type === EventType.Collection) {
      return 'event-log__amount-text--positive';
    }
    return 'event-log__amount-text--negative';
  }

  getAmountLabel(eventType: EventType): string {
    const labels: Record<EventType, string> = {
      [EventType.Contribution]: 'Aportación',
      [EventType.Collection]: 'Recaudación',
      [EventType.AdvisorAction]: 'Transacción',
      [EventType.ClientAction]: 'Transacción',
      [EventType.System]: 'Ajuste',
      [EventType.GoalAchieved]: 'Meta',
      [EventType.StatusChange]: 'Cambio de Estado',
      [EventType.DocumentSubmission]: 'Envío de Documento',
      [EventType.DocumentReview]: 'Revisión de Documento',
      [EventType.KYCCompleted]: 'KYC Completado'
    };
    return labels[eventType];
  }

  getEventTypeLabel(eventType: EventType): string {
    const labels: Record<EventType, string> = {
      [EventType.Contribution]: 'Contribución',
      [EventType.Collection]: 'Recaudación',
      [EventType.AdvisorAction]: 'Acción del Asesor',
      [EventType.ClientAction]: 'Acción del Cliente',
      [EventType.System]: 'Sistema',
      [EventType.GoalAchieved]: 'Meta Alcanzada',
      [EventType.StatusChange]: 'Cambio de Estado',
      [EventType.DocumentSubmission]: 'Envío de Documento',
      [EventType.DocumentReview]: 'Revisión de Documento',
      [EventType.KYCCompleted]: 'KYC Completado'
    };
    return labels[eventType];
  }

  getEmptyStateMessage(): string {
    const messages = {
      'all': 'No se han registrado eventos aún',
      'payments': 'No se han registrado pagos',
      'documents': 'No se han subido documentos',
      'system': 'No hay eventos del sistema'
    };
    return messages[this.eventFilter];
  }

  hasEventDetails(event: EventLog): boolean {
    return !!(event.details && (
      event.details.paymentMethod || 
      event.details.reference || 
      event.details.documentName || 
      event.details.status
    ));
  }

  hasEventActions(event: EventLog): boolean {
    return this.showActions && (
      this.canViewDetails(event) || 
      this.canDownloadReceipt(event) || 
      this.canReverseAction(event)
    );
  }

  canViewDetails(event: EventLog): boolean {
    return !!(event.details && Object.keys(event.details).length > 0);
  }

  canDownloadReceipt(event: EventLog): boolean {
    return event.type === EventType.Contribution || event.type === EventType.Collection;
  }

  canReverseAction(event: EventLog): boolean {
    return event.actor === Actor.Asesor && event.type === EventType.AdvisorAction;
  }

  formatDate(date: Date | string): string {
    const eventDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (eventDate.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (eventDate.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return eventDate.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  trackByDate(index: number, group: EventGroup): string {
    return group.date;
  }

  trackByEventId(index: number, event: EventLog): string {
    return event.id;
  }

  viewEventDetails(event: EventLog): void {
  }

  downloadReceipt(event: EventLog): void {
  }

  reverseAction(event: EventLog): void {
  }

  showEventActions(event: EventLog): void {
  }

  loadMoreEvents(): void {
    this.isLoadingMore = true;
    // Simulate loading more events
    setTimeout(() => {
      this.isLoadingMore = false;
      // Add more events logic here
    }, 1000);
  }
}
