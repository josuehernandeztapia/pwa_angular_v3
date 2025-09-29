import { Component, OnInit, Input, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../shared/icon/icon-definitions';

import { DeliveriesService } from '../../../services/deliveries.service';
import { ToastService } from '../../../services/toast.service';
import { 
  ClientDeliveryInfo,
  DeliveryOrder,
  DELIVERY_STATUS_DESCRIPTIONS
} from '../../../models/deliveries';

@Component({
  selector: 'app-client-tracking',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './client-tracking.component.html',
  styleUrls: ['./client-tracking.component.scss']
})
export class ClientTrackingComponent implements OnInit {
  @Input() clientId?: string;

  // Injected services
  private deliveriesService = inject(DeliveriesService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);

  // Component state
  deliveryInfo = signal<ClientDeliveryInfo[]>([]);
  clientName = signal<string>('');
  loading = signal<boolean>(false);
  openFaq = signal<string>('');

  ngOnInit(): void {
    // Get client ID from route or input
    const clientIdFromRoute = this.route.snapshot.paramMap.get('clientId');
    const targetClientId = this.clientId || clientIdFromRoute;
    
    if (targetClientId) {
      this.loadClientTracking(targetClientId);
    }
  }

  loadClientTracking(clientId: string): void {
    this.loading.set(true);
    
    this.deliveriesService.getClientTracking(clientId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (deliveries) => {
          this.deliveryInfo.set(deliveries);
          // Extract client name from first delivery if available
          // In real implementation, this would come from client service
          this.clientName.set(''); // We don't have client name in ClientDeliveryInfo
        },
        error: (error) => {
          this.toastService.error(error.userMessage || 'Error cargando seguimiento');
        }
      });
  }

  refreshTracking(): void {
    const clientIdFromRoute = this.route.snapshot.paramMap.get('clientId');
    const targetClientId = this.clientId || clientIdFromRoute;
    
    if (targetClientId) {
      this.loadClientTracking(targetClientId);
    }
  }

  requestCallback(orderId: string): void {
    // In real implementation, this would create a callback request
    this.toastService.success('Solicitud enviada. Te contactaremos pronto.');
  }

  toggleFaq(orderId: string): void {
    if (this.openFaq() === orderId) {
      this.openFaq.set('');
    } else {
      this.openFaq.set(orderId);
    }
  }

  // Utility methods
  getStatusClass(status: ClientDeliveryInfo['status']): string {
    switch (status) {
      case 'En producción': return 'production';
      case 'En camino': return 'shipping';
      case 'Lista para entrega': return 'ready';
      case 'Entregada': return 'delivered';
      default: return 'production';
    }
  }

  getStatusIcon(status: ClientDeliveryInfo['status']): IconName | string {
    switch (status) {
      case 'En producción': return 'factory';
      case 'En camino': return 'truck';
      case 'Lista para entrega': return 'check-circle';
      case 'Entregada': return 'badge-check';
      default: return 'cube';
    }
  }

  getProgressPercentage(status: ClientDeliveryInfo['status']): number {
    switch (status) {
      case 'En producción': return 25;
      case 'En camino': return 60;
      case 'Lista para entrega': return 90;
      case 'Entregada': return 100;
      default: return 10;
    }
  }

  isTimelineStepCompleted(status: ClientDeliveryInfo['status'], step: string): boolean {
    const statusOrder = ['ordered', 'production', 'shipping', 'ready', 'delivered'];
    const currentIndex = this.getStatusIndex(status);
    const stepIndex = statusOrder.indexOf(step);
    return currentIndex > stepIndex;
  }

  isTimelineStepCurrent(status: ClientDeliveryInfo['status'], step: string): boolean {
    const statusOrder = ['ordered', 'production', 'shipping', 'ready', 'delivered'];
    const currentIndex = this.getStatusIndex(status);
    const stepIndex = statusOrder.indexOf(step);
    return currentIndex === stepIndex;
  }

  private getStatusIndex(status: ClientDeliveryInfo['status']): number {
    switch (status) {
      case 'En producción': return 1;
      case 'En camino': return 2;
      case 'Lista para entrega': return 3;
      case 'Entregada': return 4;
      default: return 0;
    }
  }

  trackByOrderId(index: number, item: ClientDeliveryInfo): string {
    return item.orderId;
  }

  async printOnePager(info: ClientDeliveryInfo) {
    try {
      const mod = await import('../../../services/pdf-export.service');
      const svc = new mod.PdfExportService();
      const blob = await svc.generateDeliveryOnePager({
        orderId: info.orderId,
        status: info.status,
        estimatedDate: info.estimatedDate,
        message: info.message,
        clientName: this.clientName()
      });
      svc.downloadPDF(blob, `entrega-${info.orderId}.pdf`);
    } catch (e) {
    }
  }
}
