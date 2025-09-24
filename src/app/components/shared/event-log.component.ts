import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventLog, Actor, EventType } from '../../models/types';

interface EventGroup {
  date: string;
  events: EventLog[];
}

@Component({
  selector: 'app-event-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-log bg-neutral-950 rounded-xl border border-neutral-800 p-6">
      <!-- Header -->
      <div class="log-header mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="icon-container">
              📜
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">Historial de Eventos</h3>
              <p class="text-sm text-neutral-400">Registro cronológico de actividades</p>
            </div>
          </div>
          <div class="log-controls flex items-center gap-3">
            <!-- Filter Buttons -->
            <div class="filter-buttons flex items-center gap-2">
              <button 
                (click)="setEventFilter('all')"
                class="filter-btn px-3 py-1 text-xs font-medium rounded-full transition-colors"
                [class]="eventFilter === 'all' ? 'bg-primary-cyan-600 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'"
              >
                Todos
              </button>
              <button 
                (click)="setEventFilter('payments')"
                class="filter-btn px-3 py-1 text-xs font-medium rounded-full transition-colors"
                [class]="eventFilter === 'payments' ? 'bg-emerald-600 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'"
              >
                Pagos
              </button>
              <button 
                (click)="setEventFilter('documents')"
                class="filter-btn px-3 py-1 text-xs font-medium rounded-full transition-colors"
                [class]="eventFilter === 'documents' ? 'bg-amber-600 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'"
              >
                Documentos
              </button>
              <button 
                (click)="setEventFilter('system')"
                class="filter-btn px-3 py-1 text-xs font-medium rounded-full transition-colors"
                [class]="eventFilter === 'system' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'"
              >
                Sistema
              </button>
            </div>
            
            <!-- View Mode Toggle -->
            <div class="view-toggle flex items-center bg-neutral-700 rounded-lg p-1">
              <button 
                (click)="setViewMode('timeline')"
                class="toggle-btn px-3 py-1 text-xs font-medium rounded-md transition-colors"
                [class]="viewMode === 'timeline' ? 'bg-primary-cyan-600 text-white' : 'text-neutral-300 hover:text-white'"
              >
                Timeline
              </button>
              <button 
                (click)="setViewMode('list')"
                class="toggle-btn px-3 py-1 text-xs font-medium rounded-md transition-colors"
                [class]="viewMode === 'list' ? 'bg-primary-cyan-600 text-white' : 'text-neutral-300 hover:text-white'"
              >
                Lista
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline View -->
      <div class="timeline-view" *ngIf="viewMode === 'timeline' && filteredEvents.length > 0">
        <div class="timeline-container relative">
          <!-- Timeline Line -->
          <div class="timeline-line absolute left-8 top-0 bottom-0 w-0.5 bg-primary-cyan-600"></div>
          
          <!-- Event Groups by Date -->
          <div class="event-groups space-y-8">
            <div *ngFor="let group of getEventGroups(); trackBy: trackByDate" class="event-group">
              <!-- Date Header -->
              <div class="date-header sticky top-0 z-10 bg-neutral-900/80 backdrop-blur-sm py-3 mb-4">
                <div class="flex items-center gap-4">
                  <div class="date-marker w-4 h-4 bg-primary-cyan-500 rounded-full relative z-10 flex-shrink-0 ml-6"></div>
                  <h4 class="text-lg font-semibold text-white">{{ group.date }}</h4>
                  <div class="date-line flex-1 h-px bg-neutral-700"></div>
                  <span class="event-count px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full text-sm">
                    {{ group.events.length }} evento{{ group.events.length !== 1 ? 's' : '' }}
                  </span>
                </div>
              </div>

              <!-- Events for this date -->
              <div class="events-list space-y-4 ml-4">
                <div 
                  *ngFor="let event of group.events; trackBy: trackByEventId" 
                  class="event-item relative"
                >
                  <!-- Event Node -->
                  <div class="event-node absolute left-4 top-4 w-3 h-3 rounded-full border-2 border-neutral-900 z-10"
                       [class]="getEventNodeClass(event)"></div>
                  
                  <!-- Event Card -->
                  <div class="event-card ml-12 p-4 rounded-lg border transition-all duration-200 hover:scale-[1.02]"
                       [class]="getEventCardClass(event)">
                    
                    <!-- Event Header -->
                    <div class="event-header flex items-center justify-between mb-3">
                      <div class="flex items-center gap-3">
                        <div class="event-icon text-xl">{{ getEventIcon(event) }}</div>
                        <div class="event-meta">
                          <h5 class="event-title font-semibold text-white text-sm">{{ event.message }}</h5>
                          <div class="event-details flex items-center gap-2 text-xs text-neutral-400 mt-1">
                            <span class="actor-badge px-2 py-1 rounded-full font-medium"
                                  [class]="getActorBadgeClass(event.actor)">
                              {{ event.actor }}
                            </span>
                            <span>•</span>
                            <span>{{ formatTime(event.timestamp) }}</span>
                            <span *ngIf="event.type !== 'System'">•</span>
                            <span *ngIf="event.type !== 'System'" class="event-type">{{ getEventTypeLabel(event.type) }}</span>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Event Amount (if applicable) -->
                      <div *ngIf="event.details?.amount" class="event-amount">
                        <div class="amount-display px-3 py-2 rounded-lg" [class]="getAmountDisplayClass(event)">
                          <span class="amount-value font-bold text-lg">{{ formatCurrency(event.details?.amount || 0) }}</span>
                          <div class="amount-label text-xs opacity-80">{{ getAmountLabel(event.type) }}</div>
                        </div>
                      </div>
                    </div>

                    <!-- Event Details -->
                    <div *ngIf="hasEventDetails(event)" class="event-details-section">
                      <div class="details-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Payment Details -->
                        <div *ngIf="event.details?.paymentMethod" class="detail-item">
                          <span class="detail-value text-white text-sm font-medium">{{ event.details?.paymentMethod }}</span>
                        </div>
                        
                        <!-- Reference Number -->
                        <div *ngIf="event.details?.reference" class="detail-item">
                          <span class="detail-label text-neutral-400 text-xs">Referencia:</span>
                          <span class="detail-value text-white text-sm font-medium font-mono">{{ event.details?.reference }}</span>
                        </div>
                        
                        <!-- Document Name -->
                        <div *ngIf="event.details?.documentName" class="detail-item">
                          <span class="detail-label text-neutral-400 text-xs">Documento:</span>
                          <span class="detail-value text-white text-sm font-medium">{{ event.details?.documentName }}</span>
                        </div>
                        
                        <!-- Status -->
                        <div *ngIf="event.details?.status" class="detail-item">
                          <span class="detail-label text-neutral-400 text-xs">Estado:</span>
                          <span class="detail-value text-white text-sm font-medium">{{ event.details?.status }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Event Actions -->
                    <div class="event-actions mt-3 flex items-center gap-2" *ngIf="hasEventActions(event)">
                      <button 
                        *ngIf="canViewDetails(event)"
                        (click)="viewEventDetails(event)"
                        class="action-btn px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white rounded-md text-xs transition-colors"
                      >
                        Ver Detalles
                      </button>
                      
                      <button 
                        *ngIf="canDownloadReceipt(event)"
                        (click)="downloadReceipt(event)"
                        class="action-btn px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs transition-colors"
                      >
                        Descargar Recibo
                      </button>
                      
                      <button 
                        *ngIf="canReverseAction(event)"
                        (click)="reverseAction(event)"
                        class="action-btn px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs transition-colors"
                      >
                        Revertir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div class="list-view" *ngIf="viewMode === 'list' && filteredEvents.length > 0">
        <div class="events-table">
          <div class="table-header grid grid-cols-12 gap-4 p-3 bg-neutral-800 rounded-t-lg text-sm font-medium text-neutral-300">
            <div class="col-span-1">Tipo</div>
            <div class="col-span-4">Evento</div>
            <div class="col-span-2">Actor</div>
            <div class="col-span-2">Monto</div>
            <div class="col-span-2">Fecha</div>
            <div class="col-span-1">Acciones</div>
          </div>
          
          <div class="table-body">
            <div 
              *ngFor="let event of filteredEvents; trackBy: trackByEventId" 
              class="table-row grid grid-cols-12 gap-4 p-3 border-b border-neutral-700 hover:bg-neutral-800/50 transition-colors"
            >
              <div class="col-span-1 flex items-center">
                <span class="event-type-icon text-lg">{{ getEventIcon(event) }}</span>
              </div>
              
              <div class="col-span-4 flex items-center">
                <span class="text-white text-sm">{{ event.message }}</span>
              </div>
              
              <div class="col-span-2 flex items-center">
                <span class="actor-badge px-2 py-1 rounded-full text-xs font-medium"
                      [class]="getActorBadgeClass(event.actor)">
                  {{ event.actor }}
                </span>
              </div>
              
              <div class="col-span-2 flex items-center">
                <span *ngIf="event.details?.amount" class="amount-text font-mono text-sm" [class]="getAmountTextClass(event)">
                  {{ formatCurrency(event.details?.amount || 0) }}
                </span>
                <span *ngIf="!event.details?.amount" class="text-neutral-500 text-sm">-</span>
              </div>
              
              <div class="col-span-2 flex items-center">
                <span class="text-neutral-300 text-sm">{{ formatDateTime(event.timestamp) }}</span>
              </div>
              
              <div class="col-span-1 flex items-center">
                <button 
                  *ngIf="hasEventActions(event)"
                  (click)="showEventActions(event)"
                  class="action-menu-btn p-1 hover:bg-neutral-700 rounded-md transition-colors"
                >
                  <span class="text-neutral-400 hover:text-white">⋮</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state text-center py-12" *ngIf="filteredEvents.length === 0">
        <div class="empty-icon text-6xl mb-4">🗒️</div>
        <h4 class="text-xl font-semibold text-neutral-300 mb-2">No hay eventos</h4>
        <p class="text-neutral-500">{{ getEmptyStateMessage() }}</p>
      </div>

      <!-- Load More Button -->
      <div class="load-more text-center mt-6" *ngIf="hasMoreEvents">
        <button 
          (click)="loadMoreEvents()"
          [disabled]="isLoadingMore"
          class="load-more-btn px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {{ isLoadingMore ? 'Cargando...' : 'Cargar Más Eventos' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .event-log {
      position: relative;
      max-height: 600px;
      overflow-y: auto;
    }

    .icon-container {
      font-size: 2rem;
      opacity: 0.9;
    }

    .timeline-line { background-color: #0891b2; }

    .event-node.payment {
      background-color: #10b981;
      border-color: #059669;
    }

    .event-node.document {
      background-color: #f59e0b;
      border-color: #d97706;
    }

    .event-node.system {
      background-color: #3b82f6;
      border-color: #2563eb;
    }

    .event-node.collection {
      background-color: #06b6d4;
      border-color: #0891b2;
    }

    .event-card {
      background: rgba(31, 41, 55, 0.5);
      border-color: rgba(75, 85, 99, 0.3);
      backdrop-filter: blur(4px);
    }

    .event-card.payment {
      border-left: 4px solid #10b981;
    }

    .event-card.document {
      border-left: 4px solid #f59e0b;
    }

    .event-card.system {
      border-left: 4px solid #3b82f6;
    }

    .event-card.collection {
      border-left: 4px solid #06b6d4;
    }

    .actor-badge.asesor {
      background-color: rgba(59, 130, 246, 0.2);
      color: rgb(59, 130, 246);
    }

    .actor-badge.cliente {
      background-color: rgba(16, 185, 129, 0.2);
      color: rgb(16, 185, 129);
    }

    .actor-badge.sistema {
      background-color: rgba(107, 114, 128, 0.2);
      color: rgb(107, 114, 128);
    }

    .amount-display.income {
      background-color: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: rgb(16, 185, 129);
    }

    .amount-display.expense {
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: rgb(239, 68, 68);
    }

    .amount-text.positive {
      color: #10b981;
    }

    .amount-text.negative {
      color: #ef4444;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .event-item:hover .event-card {
      background: rgba(31, 41, 55, 0.8);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .event-item {
      animation: fadeIn 0.3s ease-out;
    }

    .date-header {
      backdrop-filter: blur(8px);
    }

    @media (max-width: 768px) {
      .log-controls {
        flex-direction: column;
        gap: 0.75rem;
      }
      
      .filter-buttons {
        flex-wrap: wrap;
      }
      
      .event-card {
        margin-left: 1rem;
      }
      
      .table-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
      
      .table-header {
        display: none;
      }
      
      .table-row > div {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .table-row > div::before {
        content: attr(data-label);
        font-weight: 600;
        color: #9ca3af;
        font-size: 0.75rem;
      }
    }
  `]
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
    const icons: Record<EventType, string> = {
      [EventType.Contribution]: '💰',
      [EventType.Collection]: '🚚',
      [EventType.AdvisorAction]: '👤',
      [EventType.ClientAction]: '🚗',
      [EventType.System]: '⚙️',
      [EventType.GoalAchieved]: '🎯',
      [EventType.StatusChange]: '🔄',
      [EventType.DocumentSubmission]: '📤',
      [EventType.DocumentReview]: '📝',
      [EventType.KYCCompleted]: '🪪'
    };
    return icons[event.type] || '📝';
  }

  getEventNodeClass(event: EventLog): string {
    if (event.type === EventType.Contribution) return 'event-node payment';
    if (event.type === EventType.Collection) return 'event-node collection';
    if (event.type === EventType.AdvisorAction) return 'event-node document';
    return 'event-node system';
  }

  getEventCardClass(event: EventLog): string {
    if (event.type === EventType.Contribution) return 'event-card payment';
    if (event.type === EventType.Collection) return 'event-card collection';
    if (event.type === EventType.AdvisorAction) return 'event-card document';
    return 'event-card system';
  }

  getActorBadgeClass(actor: Actor): string {
    const classes = {
      [Actor.Asesor]: 'actor-badge asesor',
      [Actor.Cliente]: 'actor-badge cliente',
      [Actor.Sistema]: 'actor-badge sistema'
    };
    return classes[actor] || 'actor-badge sistema';
  }

  getAmountDisplayClass(event: EventLog): string {
    if (event.type === EventType.Contribution || event.type === EventType.Collection) {
      return 'amount-display income';
    }
    return 'amount-display expense';
  }

  getAmountTextClass(event: EventLog): string {
    if (event.type === EventType.Contribution || event.type === EventType.Collection) {
      return 'amount-text positive';
    }
    return 'amount-text negative';
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
