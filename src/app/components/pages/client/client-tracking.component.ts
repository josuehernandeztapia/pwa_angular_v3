import { Component, OnInit, Input, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

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
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="client-tracking-container">
      <!-- Header -->
      <div class="tracking-header">
        <div class="header-content">
          <h1 class="tracking-title">📦 Seguimiento de tu Vagoneta</h1>
          <p class="tracking-subtitle" *ngIf="clientName()">
            Hola {{ clientName() }}, aquí puedes ver el estado de tu pedido
          </p>
        </div>
        <button class="btn-refresh" (click)="refreshTracking()" [disabled]="loading()">
          {{ loading() ? '⏳' : '🔄' }} Actualizar
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-section">
        <div class="loading-spinner"></div>
        <p>Consultando el estado de tu pedido...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading() && deliveryInfo().length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No hay pedidos registrados</h3>
        <p>Aún no tienes vagonetas en proceso de entrega.</p>
      </div>

      <!-- Delivery Tracking Cards -->
      <div *ngIf="!loading() && deliveryInfo().length > 0" class="tracking-cards">
        <div *ngFor="let info of deliveryInfo(); trackBy: trackByOrderId" class="delivery-card">
          
          <!-- Card Header -->
          <div class="card-header">
            <div class="order-info">
              <h3 class="order-title">Tu Vagoneta</h3>
              <span class="order-number">Pedido {{ info.orderId }}</span>
            </div>
            <div class="status-badge" [class]="'status-' + getStatusClass(info.status)">
              {{ getStatusIcon(info.status) }} {{ info.status }}
            </div>
            <button class="btn-refresh" style="margin-left:8px" (click)="printOnePager(info)" data-cy="entregas-pdf">Imprimir/PDF</button>
          </div>

          <!-- Progress Section -->
          <div class="progress-section">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="getProgressPercentage(info.status)"></div>
            </div>
            <div class="progress-labels">
              <span class="progress-start">Pedido realizado</span>
              <span class="progress-end">Entregada</span>
            </div>
          </div>

          <!-- Main Message -->
          <div class="main-message">
            <p class="status-message">{{ info.message }}</p>
            
            <div class="eta-section" *ngIf="!info.isDelivered">
              <div class="eta-icon">📅</div>
              <div class="eta-content">
                <span class="eta-label">Fecha estimada de entrega:</span>
                <span class="eta-value">{{ info.estimatedDate }}</span>
              </div>
            </div>

            <div class="delivered-section" *ngIf="info.isDelivered">
              <div class="celebration-icon">🎉</div>
              <p class="delivered-message">
                ¡Felicidades! Tu vagoneta ha sido entregada exitosamente.
              </p>
            </div>
          </div>

          <!-- Action Section -->
          <div class="action-section" *ngIf="info.canScheduleHandover && !info.isDelivered">
            <div class="schedule-notice">
              <div class="notice-icon">📞</div>
              <div class="notice-content">
                <h4>¡Tu vagoneta está lista!</h4>
                <p>Nos pondremos en contacto contigo pronto para coordinar la entrega.</p>
              </div>
            </div>
            <button class="btn-contact" (click)="requestCallback(info.orderId)">
              Solicitar que me contacten
            </button>
          </div>

          <!-- Simple Timeline (Client Friendly) -->
          <div class="simple-timeline">
            <div class="timeline-item" [class.completed]="isTimelineStepCompleted(info.status, 'ordered')">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <h5>Pedido realizado</h5>
                <p>Tu pedido fue procesado exitosamente</p>
              </div>
            </div>
            
            <div class="timeline-item" [class.completed]="isTimelineStepCompleted(info.status, 'production')" [class.current]="isTimelineStepCurrent(info.status, 'production')">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <h5>En producción</h5>
                <p>Tu vagoneta se está fabricando</p>
              </div>
            </div>
            
            <div class="timeline-item" [class.completed]="isTimelineStepCompleted(info.status, 'shipping')" [class.current]="isTimelineStepCurrent(info.status, 'shipping')">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <h5>En camino</h5>
                <p>Tu vagoneta está viajando hacia México</p>
              </div>
            </div>
            
            <div class="timeline-item" [class.completed]="isTimelineStepCompleted(info.status, 'ready')" [class.current]="isTimelineStepCurrent(info.status, 'ready')">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <h5>Lista para entrega</h5>
                <p>Tu vagoneta llegó y está lista</p>
              </div>
            </div>
            
            <div class="timeline-item" [class.completed]="isTimelineStepCompleted(info.status, 'delivered')">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <h5>Entregada</h5>
                <p>¡Disfruta tu nueva vagoneta!</p>
              </div>
            </div>
          </div>

          <!-- FAQ Section -->
          <div class="faq-section" *ngIf="!info.isDelivered">
            <button class="faq-toggle" (click)="toggleFaq(info.orderId)" [class.active]="openFaq() === info.orderId">
              ❓ Preguntas frecuentes
            </button>
            <div class="faq-content" *ngIf="openFaq() === info.orderId">
              <div class="faq-item">
                <h6>¿Por qué tarda tanto?</h6>
                <p>Las vagonetas se fabrican especialmente para ti en China. El proceso completo toma aproximadamente 77 días desde la orden hasta la entrega.</p>
              </div>
              <div class="faq-item">
                <h6>¿Puedo acelerar mi pedido?</h6>
                <p>El tiempo de fabricación y envío es estándar para todos los pedidos. No es posible acelerar el proceso.</p>
              </div>
              <div class="faq-item">
                <h6>¿Cómo sabré cuándo está lista?</h6>
                <p>Te notificaremos por WhatsApp y llamada cuando tu vagoneta esté lista para entrega.</p>
              </div>
              <div class="faq-item">
                <h6>¿Qué documentos necesito?</h6>
                <p>Necesitarás tu identificación oficial y copia del contrato firmado para recibir tu vagoneta.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div class="contact-section">
        <div class="contact-card">
          <h3>¿Necesitas ayuda?</h3>
          <p>Si tienes preguntas sobre tu pedido, contáctanos:</p>
          <div class="contact-methods">
            <div class="contact-method">
              <span class="contact-icon">📞</span>
              <div class="contact-info">
                <span class="contact-label">Teléfono</span>
                <span class="contact-value">449 123 4567</span>
              </div>
            </div>
            <div class="contact-method">
              <span class="contact-icon">💬</span>
              <div class="contact-info">
                <span class="contact-label">WhatsApp</span>
                <span class="contact-value">449 123 4567</span>
              </div>
            </div>
            <div class="contact-method">
              <span class="contact-icon">✉️</span>
              <div class="contact-info">
                <span class="contact-label">Email</span>
                <span class="contact-value">soporte&#64;conductores.mx</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .client-tracking-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      background: #f8fafc;
      min-height: 100vh;
    }

    .tracking-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      margin-bottom: 24px;
    }

    .tracking-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #1f2937;
    }

    .tracking-subtitle {
      margin: 0;
      color: #6b7280;
      font-size: 16px;
    }

    .btn-refresh {
      padding: 10px 20px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #059669;
    }

    .btn-refresh:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-section {
      text-align: center;
      padding: 64px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-left-color: #06d6a0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 64px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      color: #6b7280;
    }

    .empty-state p {
      margin: 0;
      color: #9ca3af;
    }

    .tracking-cards {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .delivery-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 0 24px;
    }

    .order-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: #1f2937;
    }

    .order-number {
      font-size: 14px;
      color: #6b7280;
      font-family: monospace;
    }

    .status-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      color: white;
    }

    .status-production {
      background: #f59e0b;
    }

    .status-shipping {
      background: #3b82f6;
    }

    .status-ready {
      background: #10b981;
    }

    .status-delivered {
      background: #059669;
    }

    .progress-section {
      padding: 24px;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #06d6a0, #10b981);
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #6b7280;
    }

    .main-message {
      padding: 0 24px 24px 24px;
    }

    .status-message {
      font-size: 18px;
      color: #1f2937;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    .eta-section {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f0f9ff;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #06d6a0;
    }

    .eta-icon {
      font-size: 24px;
    }

    .eta-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .eta-label {
      font-size: 14px;
      color: #6b7280;
    }

    .eta-value {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }

    .delivered-section {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f0fdf4;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #10b981;
    }

    .celebration-icon {
      font-size: 32px;
    }

    .delivered-message {
      font-size: 16px;
      font-weight: 600;
      color: #059669;
      margin: 0;
    }

    .action-section {
      padding: 0 24px 24px 24px;
    }

    .schedule-notice {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      background: #fefce8;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      margin-bottom: 16px;
    }

    .notice-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .notice-content h4 {
      margin: 0 0 8px 0;
      color: #92400e;
      font-size: 16px;
    }

    .notice-content p {
      margin: 0;
      color: #a16207;
      font-size: 14px;
    }

    .btn-contact {
      width: 100%;
      padding: 12px 20px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-contact:hover {
      background: #059669;
    }

    .simple-timeline {
      padding: 24px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 0;
      position: relative;
    }

    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 11px;
      top: 48px;
      width: 2px;
      height: calc(100% - 16px);
      background: #e5e7eb;
    }

    .timeline-item.completed::after {
      background: #10b981;
    }

    .timeline-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #e5e7eb;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .timeline-item.completed .timeline-dot {
      background: #10b981;
    }

    .timeline-item.current .timeline-dot {
      background: #06d6a0;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .timeline-content h5 {
      margin: 0 0 4px 0;
      color: #1f2937;
      font-size: 14px;
    }

    .timeline-content p {
      margin: 0;
      color: #6b7280;
      font-size: 12px;
    }

    .timeline-item.completed .timeline-content h5 {
      color: #059669;
    }

    .timeline-item.current .timeline-content h5 {
      color: #06d6a0;
      font-weight: 600;
    }

    .faq-section {
      padding: 0 24px 24px 24px;
      border-top: 1px solid #e5e7eb;
    }

    .faq-toggle {
      width: 100%;
      padding: 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      color: #1f2937;
      transition: all 0.2s;
    }

    .faq-toggle:hover {
      background: #f3f4f6;
    }

    .faq-toggle.active {
      background: #eff6ff;
      border-color: #3b82f6;
      color: #1d4ed8;
    }

    .faq-content {
      margin-top: 16px;
      padding: 16px;
      background: #eff6ff;
      border-radius: 8px;
      border: 1px solid #dbeafe;
    }

    .faq-item {
      margin-bottom: 16px;
    }

    .faq-item:last-child {
      margin-bottom: 0;
    }

    .faq-item h6 {
      margin: 0 0 8px 0;
      color: #1e40af;
      font-size: 14px;
    }

    .faq-item p {
      margin: 0;
      color: #1f2937;
      font-size: 13px;
      line-height: 1.4;
    }

    .contact-section {
      margin-top: 32px;
    }

    .contact-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border: 1px solid #e5e7eb;
    }

    .contact-card h3 {
      margin: 0 0 8px 0;
      color: #1f2937;
      font-size: 18px;
    }

    .contact-card p {
      margin: 0 0 20px 0;
      color: #6b7280;
    }

    .contact-methods {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .contact-method {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .contact-icon {
      font-size: 24px;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .contact-label {
      font-size: 12px;
      color: #6b7280;
      font-weight: 600;
    }

    .contact-value {
      font-size: 14px;
      color: #1f2937;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .client-tracking-container {
        padding: 16px;
      }

      .tracking-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .contact-methods {
        gap: 12px;
      }

      .contact-method {
        padding: 16px;
      }
    }
  `]
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

  getStatusIcon(status: ClientDeliveryInfo['status']): string {
    switch (status) {
      case 'En producción': return '🏭';
      case 'En camino': return '🚢';
      case 'Lista para entrega': return '✅';
      case 'Entregada': return '🎉';
      default: return '📦';
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
      console.error('PDF error', e);
    }
  }
}
