import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { DeliveriesService } from '../../../services/deliveries.service';
import { RiskService } from '../../../services/risk.service';
import { ToastService } from '../../../services/toast.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../shared/icon/icon-definitions';
import { 
  DeliveryOrder,
  DeliveryEventLog,
  DeliveryEvent,
  DELIVERY_EVENT_DESCRIPTIONS,
  DELIVERY_STATUS_DESCRIPTIONS,
  DeliveryStatus,
  DELIVERY_FSM
} from '../../../models/deliveries';
import { ClientDeliveryInfo } from '../../../models/deliveries';

@Component({
  selector: 'app-delivery-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  templateUrl: './delivery-detail.component.html',
  styleUrls: ['./delivery-detail.component.scss']
})
export class DeliveryDetailComponent implements OnInit {
  // Injected services
  private deliveriesService = inject(DeliveriesService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private riskService = inject(RiskService);

  // Component state
  delivery = signal<DeliveryOrder | null>(null);
  events = signal<DeliveryEventLog[]>([]);
  loading = signal<boolean>(false);
  eventsLoading = signal<boolean>(false);
  clientView = false;
  clientInfo: ClientDeliveryInfo | null = null;
  
  // Modal state
  showAdvanceStateModal = signal<boolean>(false);
  selectedAction = signal<DeliveryEvent | null>(null);
  submitting = signal<boolean>(false);
  
  // Action metadata
  actionMeta: any = {
    containerNumber: '',
    portName: '',
    vesselName: '',
    customsReference: '',
    warehouseLocation: '',
    notes: ''
  };

  // Computed properties
  availableActions = computed(() => {
    const deliveryOrder = this.delivery();
    if (!deliveryOrder) return [];
    
    return this.deliveriesService.getAvailableActions(deliveryOrder, 'ops');
  });

  ngOnInit(): void {
    const deliveryId = this.route.snapshot.paramMap.get('id');
    if (deliveryId) {
      this.loadDelivery(deliveryId);
      this.loadEvents();
    }
  }

  loadDelivery(id: string): void {
    this.loading.set(true);
    
    this.deliveriesService.get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (delivery) => {
          this.delivery.set(delivery);
          // Client-friendly snapshot
          try {
            const svc: any = this.deliveriesService as any;
            if (typeof svc['transformToClientView'] === 'function') {
              this.clientInfo = svc['transformToClientView'](delivery);
            }
          } catch {}
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Error cargando entrega');
        }
      });
  }

  loadEvents(): void {
    const delivery = this.delivery();
    if (!delivery) return;
    
    this.eventsLoading.set(true);
    
    this.deliveriesService.events(delivery.id)
      .pipe(finalize(() => this.eventsLoading.set(false)))
      .subscribe({
        next: (events) => {
          // Sort events by timestamp (most recent first for display)
          const sortedEvents = events.sort((a, b) => 
            new Date(b.at).getTime() - new Date(a.at).getTime()
          );
          this.events.set(sortedEvents);
        },
        error: (error) => {
          this.toastService.error('Error cargando eventos');
        }
      });
  }

  refreshData(): void {
    const delivery = this.delivery();
    if (!delivery) return;
    
    this.loadDelivery(delivery.id);
    this.loadEvents();
  }

  // Modal actions
  showAdvanceModal(): void {
    this.showAdvanceStateModal.set(true);
  }

  hideAdvanceModal(): void {
    this.showAdvanceStateModal.set(false);
    this.selectedAction.set(null);
    this.resetActionMeta();
  }

  selectAction(event: DeliveryEvent): void {
    this.selectedAction.set(event);
  }

  executeAction(event: DeliveryEvent): void {
    this.selectAction(event);
    this.confirmAction();
  }

  confirmAction(): void {
    const delivery = this.delivery();
    const action = this.selectedAction();
    
    if (!delivery || !action) return;
    
    this.submitting.set(true);
    
    this.deliveriesService.transition(delivery.id, {
      event: action,
      meta: this.actionMeta,
      notes: this.actionMeta.notes
    })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success(response.message);
            this.hideAdvanceModal();
            this.refreshData();
          } else {
            this.toastService.error(response.message);
          }
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Error ejecutando acción');
        }
      });
  }

  resetActionMeta(): void {
    this.actionMeta = {
      containerNumber: '',
      portName: '',
      vesselName: '',
      customsReference: '',
      warehouseLocation: '',
      notes: ''
    };
  }

  // Utility methods
  canAdvanceStatus(): boolean {
    return this.availableActions().length > 0;
  }

  hasShippingInfo(): boolean {
    const delivery = this.delivery();
    return !!(delivery?.containerNumber || delivery?.billOfLading);
  }

  isLastEvent(event: DeliveryEventLog): boolean {
    const events = this.events();
    return events.indexOf(event) === events.length - 1;
  }

  getMarketName(market: string): string {
    return market === 'aguascalientes' ? 'Aguascalientes' : 'Estado de México';
  }

  getStatusTitle(status: string): string {
    return DELIVERY_STATUS_DESCRIPTIONS[status as keyof typeof DELIVERY_STATUS_DESCRIPTIONS]?.title || status;
  }

  getStatusColor(order: DeliveryOrder | null): string {
    if (!order) {
      return this.deliveriesService.getStatusColor('PO_ISSUED');
    }

    if (order.status !== 'DELIVERED' && this.isOverdue(order.eta)) {
      return 'var(--accent-red-500)';
    }

    return this.deliveriesService.getStatusColor(order.status);
  }

  getStatusIcon(status: string): IconName {
    const icon = this.deliveriesService.getStatusIcon(status as any);
    return icon as IconName;
  }

  getProgress(status: string): number {
    return this.deliveriesService.getDeliveryProgress(status as any);
  }

  getEventTitle(event: DeliveryEvent): string {
    return DELIVERY_EVENT_DESCRIPTIONS[event]?.title || event;
  }

  getEventDescription(event: DeliveryEvent): string {
    return DELIVERY_EVENT_DESCRIPTIONS[event]?.description || '';
  }

  getEventIcon(event: DeliveryEvent): string {
    return DELIVERY_EVENT_DESCRIPTIONS[event]?.iconType || 'package';
  }

  getActionLabel(event: DeliveryEvent): string {
    const action = this.availableActions().find(a => a.event === event);
    return action ? action.label : event;
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  formatETA(eta?: string): string {
    if (!eta) return 'Por definir';
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(eta));
  }

  // Recalculate ETA with p80 buffers per tramo and show "nuevo compromiso"
  get bufferedETA(): string | undefined {
    const d = this.delivery();
    if (!d) return undefined;
    return this.calculateBufferedETA(d.createdAt, d.status);
  }

  get delayInfo(): { daysLate: number; newCommitment?: string } | null {
    const d = this.delivery();
    if (!d || !d.eta) return null;
    const now = new Date();
    const eta = new Date(d.eta);
    if (now <= eta) return null;
    const daysLate = Math.ceil((now.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24));
    const newCommitment = this.bufferedETA ? this.formatETA(this.bufferedETA) : undefined;
    return { daysLate, newCommitment };
  }

  formatEventTime(time: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(time));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  // Risk badge helper
  getRouteRiskPremiumBps(): number {
    const d = this.delivery();
    if (!d || !d.route?.id) return 0;
    return this.riskService.getIrrPremiumBps({ ecosystemId: d.route.id });
  }

  isOverdue(eta?: string): boolean {
    if (!eta) return false;
    return new Date(eta) < new Date();
  }

  private calculateBufferedETA(createdAt: string, currentStatus: DeliveryStatus): string {
    // p80 buffers by tramo (multiplicative factors)
    const p80: Record<string, number> = {
      IN_PRODUCTION: 1.2,          // 30d -> p80
      READY_AT_FACTORY: 1.1,       // 5d ground to port
      ON_VESSEL: 1.2,              // 30d vessel
      IN_CUSTOMS: 1.2,             // 10d customs
      RELEASED: 1.1,               // 2d to WH
    };

    // Build total days from base FSM with buffers applied to segments that have estimatedDays
    const base = new Date(createdAt);
    let total = 0;
    // Sum up to current status (historical segments use base estimate as reference)
    for (const t of DELIVERY_FSM) {
      const days = t.estimatedDays || 0;
      const factor = p80[t.to] || 1.0;
      total += Math.round(days * factor);
      if (t.to === currentStatus) break;
    }
    // Add remaining segments to delivery
    const currentIndex = DELIVERY_FSM.findIndex(tr => tr.to === currentStatus);
    const remaining = DELIVERY_FSM.slice(currentIndex + 1);
    for (const t of remaining) {
      const days = t.estimatedDays || 0;
      const factor = p80[t.to] || 1.0;
      total += Math.round(days * factor);
    }
    const eta = new Date(base);
    eta.setDate(eta.getDate() + total);
    return eta.toISOString();
  }

  // Form field visibility based on action
  requiresContainerNumber(event: DeliveryEvent): boolean {
    return ['LOAD_ORIGIN', 'DEPART_VESSEL', 'ARRIVE_DEST'].includes(event);
  }

  requiresPortName(event: DeliveryEvent): boolean {
    return ['LOAD_ORIGIN', 'ARRIVE_DEST'].includes(event);
  }

  requiresVesselName(event: DeliveryEvent): boolean {
    return ['DEPART_VESSEL', 'ARRIVE_DEST'].includes(event);
  }

  requiresCustomsRef(event: DeliveryEvent): boolean {
    return ['CUSTOMS_CLEAR', 'RELEASE'].includes(event);
  }

  requiresWarehouseLocation(event: DeliveryEvent): boolean {
    return ['ARRIVE_WH'].includes(event);
  }

  trackEvent(index: number, event: DeliveryEventLog): string {
    return event.id;
  }
}
