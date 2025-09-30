import { CommonModule } from '@angular/common';
import { Component, OnInit, Optional } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Client, EventLog } from '../../../models/types';
import { ImportStatus } from '../../../models/postventa';
import { IconComponent } from '../../shared/icon/icon.component';
import { FlowContextService } from '../../../services/flow-context.service';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, IconComponent, RouterModule],
  templateUrl: './cliente-detail.component.html',
  styleUrls: ['./cliente-detail.component.scss']
})
export class ClienteDetailComponent implements OnInit {
  client: Client | null = null;
  showAviModal = false;
  clientEvents: EventLog[] = [];
  isGeneratingPDF = false;
  
  openPaymentModal = () => {
    this.generatePaymentLink('spei');
  };
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Optional() private flowContext?: FlowContextService
  ) {}

  async ngOnInit(): Promise<void> {
    this.flowContext?.setBreadcrumbs(['Dashboard', 'Clientes', 'Detalle']);
    this.client = {
      id: 'client-001',
      name: 'Juan Pérez García',
      avatarUrl: '',
      email: 'juan.perez@email.com',
      phone: '+52 449 123 4567',
      rfc: 'PEGJ850315ABC',
      status: 'Expediente en Proceso',
      market: 'aguascalientes',
      flow: 'VentaPlazo' as any,
      healthScore: 85,
      events: [],
      documents: [
        { id: 'doc1', name: 'INE Vigente', status: 'Aprobado' as any },
        { id: 'doc2', name: 'Comprobante de domicilio', status: 'Pendiente' as any },
        { id: 'doc3', name: 'Constancia de situación fiscal', status: 'En Revisión' as any }
      ],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      ecosystemId: 'ags-ruta-5',
      savingsGoal: 150000,
      currentSavings: 87500,
      totalPayments: 24,
      completedPayments: 8,
      lastPaymentDate: new Date('2024-01-18'),
      nextPaymentDue: new Date('2024-02-15'),
      vehicleInfo: {
        model: 'Nissan Sentra 2024',
        vin: 'JN1AB7AP1PM123456'
      },
      importStatus: {
        pedidoPlanta: { completed: true, completedAt: new Date('2024-01-10') },
        unidadFabricada: { completed: true, completedAt: new Date('2024-02-05') },
        transitoMaritimo: { inProgress: true, startedAt: new Date('2024-02-10') },
        enAduana: { completed: false },
        liberada: { completed: false },
        entregada: { completed: false },
        documentosTransferidos: { completed: false },
        placasEntregadas: { completed: false }
      }
    };
    this.flowContext?.setBreadcrumbs(['Dashboard', 'Clientes', this.client.name]);
    
    this.loadClientEvents();
  }

  createQuote(): void {
    if (!this.client) {
      return;
    }

    this.flowContext?.saveContext('cotizador', {
      clientId: this.client.id,
      clientName: this.client.name
    });

    this.router.navigate(['/cotizador'], {
      queryParams: {
        clientId: this.client.id,
        source: 'cliente-detail'
      }
    });
  }

  private loadClientEvents(): void {
    this.clientEvents = [
      {
        id: '1',
        type: 'Contribution' as any,
        actor: 'Cliente' as any,
        message: 'Aportación mensual realizada',
        timestamp: new Date('2024-01-18'),
        details: { amount: 8500, paymentMethod: 'Transferencia SPEI', currency: 'MXN' as const }
      },
      {
        id: '2',
        type: 'AdvisorAction' as any,
        actor: 'Asesor' as any,
        message: 'Documento INE aprobado',
        timestamp: new Date('2024-01-16'),
        details: { documentName: 'INE Vigente', status: 'Aprobado' }
      },
      {
        id: '3',
        type: 'System' as any,
        actor: 'Sistema' as any,
        message: 'Estado de cuenta generado',
        timestamp: new Date('2024-01-15'),
        details: {}
      }
    ];

    // Load heavy components lazily after initial render
    setTimeout(() => this.loadHeavyComponents(), 100);
  }

  private async loadHeavyComponents(): Promise<void> {
    try {
      // Load components in parallel for better performance
      await Promise.all([
        this.loadProtectionComponent(),
        this.loadProgressBars(),
        this.loadImportTracker(),
        this.loadEventLog()
      ]);

      // Load AVI modal when needed
      if (this.showAviModal) {
        await this.loadAviModal();
      }
    } catch (error) {
    }
  }

  private async loadProtectionComponent(): Promise<void> {
    const container = document.querySelector('[data-protection-container]') as HTMLElement;
    if (container && this.client) {
      const { ProtectionRealComponent } = await import('../protection-real/protection-real.component');
      // Note: In a real implementation, you'd use ViewContainerRef to dynamically create the component
      // For now, we'll just show a loading state or simplified version
      container.innerHTML = '<div class="cliente-placeholder">Protección disponible - Cargando...</div>';
    }
  }

  private async loadProgressBars(): Promise<void> {
    const savingsContainer = document.querySelector('[data-savings-progress]') as HTMLElement;
    const paymentContainer = document.querySelector('[data-payment-progress]') as HTMLElement;

    if (savingsContainer) {
      savingsContainer.innerHTML = `
        <div class="progress-widget">
          <div class="progress-widget__header">
            <span class="progress-widget__label">Progreso del ahorro</span>
            <span class="progress-widget__value">${this.getSavingsProgress()}%</span>
          </div>
          <div class="progress-widget__track">
            <div class="progress-widget__bar progress-widget__bar--savings" style="width: ${this.getSavingsProgress()}%"></div>
          </div>
        </div>
      `;
    }

    if (paymentContainer) {
      paymentContainer.innerHTML = `
        <div class="progress-widget">
          <div class="progress-widget__header">
            <span class="progress-widget__label">Progreso de pagos</span>
            <span class="progress-widget__value">${this.getPaymentProgress()}%</span>
          </div>
          <div class="progress-widget__track">
            <div class="progress-widget__bar progress-widget__bar--payments" style="width: ${this.getPaymentProgress()}%"></div>
          </div>
        </div>
      `;
    }
  }

  private async loadImportTracker(): Promise<void> {
    const container = document.querySelector('[data-import-tracker]') as HTMLElement;
    if (container && this.client?.importStatus) {
      container.innerHTML = '<div class="cliente-placeholder">Seguimiento de importación - Cargando...</div>';
    }
  }

  private async loadEventLog(): Promise<void> {
    const container = document.querySelector('[data-event-log]') as HTMLElement;
    if (container) {
      const eventsHtml = this.clientEvents.slice(0, 5).map(event => `
        <article class="event-feed__item">
          <div class="event-feed__title">${event.message}</div>
          <div class="event-feed__timestamp">${event.timestamp.toLocaleDateString()}</div>
        </article>
      `).join('');
      container.innerHTML = `
        <div class="event-feed">
          <h4 class="event-feed__heading">Actividad reciente</h4>
          ${eventsHtml}
        </div>
      `;
    }
  }

  private async loadAviModal(): Promise<void> {
    const container = document.querySelector('[data-avi-modal]') as HTMLElement;
    if (container) {
      // For now, show a placeholder until the actual modal component is loaded
      container.innerHTML = `
        <div class="cliente-modal cliente-modal--visible">
          <div class="cliente-modal__backdrop"></div>
          <div class="cliente-modal__panel">
            <h3 class="cliente-modal__title">Verificación AVI</h3>
            <p class="cliente-modal__message">Cargando componente de verificación...</p>
            <button type="button" class="btn btn-secondary btn-sm cliente-modal__close" onclick="this.closest('.cliente-modal').style.display='none'">
              Cerrar
            </button>
          </div>
        </div>
      `;

      try {
        // In a real implementation, you'd dynamically load and instantiate the component
        const { AviVerificationModalComponent } = await import('../../shared/avi-verification-modal/avi-verification-modal.component');
        // Component would be created here with proper inputs and event handlers
      } catch (error) {
      }
    }
  }

  // AVI Methods
  canStartAviVerification(): boolean {
    return this.client?.status === 'Expediente en Proceso';
  }
  
  startAviVerification(): void {
    this.showAviModal = true;
  }
  
  onAviCompleted(result: any): void {
    this.showAviModal = false;
    
    // Update client data with AVI results
    if (this.client) {
      // Pre-fill data extracted from AVI
      if (result.extractedData.nombre) {
        this.client.name = result.extractedData.nombre;
      }
      if (result.extractedData.rfc) {
        this.client.rfc = result.extractedData.rfc;
      }
      
      // Update status based on risk score
      if (result.riskScore < 30) {
        this.client.status = 'Verificación AVI Completada';
      } else {
        this.client.status = 'Requiere Supervisión';
      }
    }
  }
  
  onAviClosed(): void {
    this.showAviModal = false;
  }
  
  getMunicipality(): 'aguascalientes' | 'edomex' {
    return this.client?.market === 'edomex' ? 'edomex' : 'aguascalientes';
  }
  
  // Traditional Methods
  canStartKyc(): boolean {
    return this.client?.status === 'Documentos Completos';
  }
  
  startTraditionalKyc(): void {
  }
  
  canGenerateContract(): boolean {
    return this.client?.status === 'KYC Completado' || this.client?.status === 'Verificación AVI Completada';
  }
  
  generateContract(): void {
  }
  
  viewDocuments(): void {
  }
  
  // Utility Methods
  getDocumentStats(): string {
    if (!this.client?.documents) return '0/0';
    const approved = this.client.documents.filter(d => d.status === 'Aprobado').length;
    const total = this.client.documents.length;
    return `${approved}/${total}`;
  }
  
  getFlowDisplayName(flow: any): string {
    const flowNames: Record<string, string> = {
      'VentaDirecta': 'Venta Directa',
      'VentaPlazo': 'Venta a Plazo',
      'AhorroProgramado': 'Ahorro Programado',
      'CreditoColectivo': 'Crédito Colectivo'
    };
    return flowNames[flow] || flow || 'No definido';
  }
  
  getMunicipalityName(market: any): string {
    const municipalities: Record<string, string> = {
      'aguascalientes': 'Aguascalientes',
      'edomex': 'Estado de México'
    };
    return municipalities[market] || market || 'No definido';
  }

  getStatusBadgeClasses(status?: string | null): Record<string, boolean> {
    const normalized = (status ?? '').toLowerCase();

    return {
      'cliente-status-badge': true,
      'cliente-status-badge--active': normalized.includes('activo') || normalized.includes('complet'),
      'cliente-status-badge--blocked': normalized.includes('bloque') || normalized.includes('rechaz'),
      'cliente-status-badge--progress': normalized.includes('proceso') || normalized.includes('pend'),
      'cliente-status-badge--neutral': !normalized || (
        !normalized.includes('activo') &&
        !normalized.includes('complet') &&
        !normalized.includes('bloque') &&
        !normalized.includes('rechaz') &&
        !normalized.includes('proceso') &&
        !normalized.includes('pend')
      )
    };
  }
  
  private getScoreLevel(score: number | undefined): 'excellent' | 'good' | 'poor' | 'neutral' {
    if (score == null) return 'neutral';
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'poor';
    return 'poor';
  }

  getHealthScoreClasses(): Record<string, boolean> {
    const level = this.getScoreLevel(this.client?.healthScore);
    return {
      'metric-value': true,
      [`metric-value--${level}`]: true
    };
  }
  
  // Progress Methods
  getSavingsProgress(): number {
    return this.client?.currentSavings || 0;
  }
  
  getSavingsGoal(): number {
    return this.client?.savingsGoal || 100000;
  }
  
  getPaymentProgress(): number {
    return this.client?.completedPayments || 0;
  }
  
  getTotalPayments(): number {
    return this.client?.totalPayments || 24;
  }
  
  getRemainingPayments(): string {
    const completed = this.client?.completedPayments || 0;
    const total = this.client?.totalPayments || 24;
    return `${total - completed} de ${total}`;
  }
  
  getLastContributionDate(): string {
    if (!this.client?.lastPaymentDate) return 'No registrada';
    return this.client.lastPaymentDate.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  
  getNextPaymentDue(): string {
    if (!this.client?.nextPaymentDue) return 'No programado';
    return this.client.nextPaymentDue.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  
  getEstimatedCompletion(): string {
    const completed = this.client?.completedPayments || 0;
    const total = this.client?.totalPayments || 24;
    const remaining = total - completed;
    
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + remaining);
    
    return completionDate.toLocaleDateString('es-MX', {
      month: 'short',
      year: 'numeric'
    });
  }
  
  getPaymentMilestones(): { value: number, label: string }[] {
    const total = this.client?.totalPayments || 24;
    return [
      { value: Math.floor(total * 0.25), label: '25%' },
      { value: Math.floor(total * 0.5), label: '50%' },
      { value: Math.floor(total * 0.75), label: '75%' }
    ];
  }
  
  // Payment Methods
  generatePaymentLink(method: 'spei' | 'conekta'): void {
    // Implementation would create actual payment links
    const mockLinks = {
      spei: 'https://payments.conductores.mx/spei/client-001',
      conekta: 'https://payments.conductores.mx/card/client-001'
    };
    
    // In real implementation, this would open a payment modal or redirect
    window.open(mockLinks[method], '_blank');
  }
  
  // PDF Generation
  generatePDF(): void {
    this.isGeneratingPDF = true;
    
    // Simulate PDF generation
    setTimeout(() => {
      this.isGeneratingPDF = false;
      
      // In real implementation, this would trigger actual PDF generation
      const mockPdfUrl = `https://documents.conductores.mx/statements/client-001-${Date.now()}.pdf`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = mockPdfUrl;
      link.download = `estado-cuenta-${this.client?.name?.replace(/\s+/g, '-')}.pdf`;
      link.click();
    }, 2000);
  }
  
  previewAccountStatement(): void {
    // Implementation would show a modal with statement preview
  }
  
  // Import Tracker Methods
  updateImportMilestone(milestoneKey: keyof ImportStatus): void {
    if (!this.client?.importStatus) return;
    
    const milestone = this.client.importStatus[milestoneKey];
    if (!milestone || Array.isArray(milestone)) {
      return;
    }
    if ((milestone as any).completed === false || (milestone as any).inProgress === true || (milestone as any).status !== 'completed') {
      // Mark as in progress or completed
      const m = milestone as any;
      if (m.inProgress) {
        m.completed = true;
        m.status = 'completed';
        m.completedAt = new Date();
        m.inProgress = false;
      } else {
        m.inProgress = true;
        m.status = 'in_progress';
        m.startedAt = new Date();
      }
      
    }
  }
  
  // Protection System Methods
  isFinancialProduct(): boolean {
    if (!this.client?.flow) return false;
    
    const financialFlows = ['VentaPlazo', 'AhorroProgramado', 'CreditoColectivo'];
    return financialFlows.includes(this.client.flow as string);
  }
  
  getContractId(): string {
    return `contract-${this.client?.id || 'unknown'}`;
  }
  
  // Added getter methods
  get currentSavings(): number {
    return this.client?.currentSavings || 0;
  }

  get savingsGoal(): number {
    return this.client?.savingsGoal || 100000;
  }

  get completedPayments(): number {
    return this.client?.completedPayments || 0;
  }

  get totalPayments(): number {
    return this.client?.totalPayments || 24;
  }
}
