import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewContainerRef, ComponentRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Client, EventLog } from '../../../models/types';
import { ImportStatus } from '../../../models/postventa';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cliente-detail-container">
      <!-- Header -->
      <div class="detail-header">
        <div class="client-info">
          <h1 class="client-name">{{ client?.name || 'Cliente' }}</h1>
          <div class="client-status">
            <span class="status-badge" [class]="'status-' + (client?.status || 'unknown').toLowerCase().replace(' ', '-')">
              {{ client?.status || 'Sin estado' }}
            </span>
          </div>
        </div>
        <div class="client-score" *ngIf="client?.healthScore != null">
          <span class="score-label">Score de Salud</span>
          <span class="score-value" [class]="getScoreClass(client?.healthScore || 0)">{{ client?.healthScore != null ? client?.healthScore : 'N/A' }}%</span>
        </div>
        
        <!-- Protection Status Indicator (Financial Products Only) -->
        <div class="protection-status" *ngIf="isFinancialProduct() && client">
          <span class="status-label">🛡️ Protección</span>
          <span class="status-indicator protection-available">
            Disponible
          </span>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat-card">
          <div class="stat-icon">📄</div>
          <div class="stat-info">
            <span class="stat-label">Documentos</span>
            <span class="stat-value">{{ getDocumentStats() }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-info">
            <span class="stat-label">Flujo</span>
            <span class="stat-value">{{ getFlowDisplayName(client?.flow) }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📍</div>
          <div class="stat-info">
            <span class="stat-label">Municipio</span>
            <span class="stat-value">{{ getMunicipalityName(client?.market) }}</span>
          </div>
        </div>
      </div>

      <!-- Main Actions -->
      <div class="main-actions">
        <div class="action-section">
          <h2>Verificación y Validación</h2>
          <div class="action-buttons">
            
            <!-- AVI Button - Revolutionary -->
            <button 
              class="btn-avi-verification"
              [disabled]="!canStartAviVerification()"
              (click)="startAviVerification()">
              <span class="btn-icon">🎤</span>
              <div class="btn-content">
                <span class="btn-title">Iniciar Verificación Inteligente AVI</span>
                <span class="btn-subtitle">Validación por voz con preguntas micro-locales</span>
              </div>
              <span class="btn-arrow">→</span>
            </button>

            <!-- Traditional KYC (Backup) -->
            <button 
              class="btn-secondary-action"
              [disabled]="!canStartKyc()"
              (click)="startTraditionalKyc()">
              <span class="btn-icon">🔍</span>
              <div class="btn-content">
                <span class="btn-title">KYC Tradicional</span>
                <span class="btn-subtitle">Verificación biométrica estándar</span>
              </div>
            </button>
          </div>
        </div>

        <div class="action-section">
          <h2>Documentos y Contratos</h2>
          <div class="action-buttons">
            <button class="btn-secondary-action" (click)="viewDocuments()">
              <span class="btn-icon">📋</span>
              <div class="btn-content">
                <span class="btn-title">Ver Documentos</span>
                <span class="btn-subtitle">Revisar estado de documentación</span>
              </div>
            </button>
            
            <button class="btn-secondary-action" [disabled]="!canGenerateContract()" (click)="generateContract()">
              <span class="btn-icon">📜</span>
              <div class="btn-content">
                <span class="btn-title">Generar Contrato</span>
                <span class="btn-subtitle">Crear documentos legales</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Protection Section (Financial Products Only) -->
      <div class="protection-section" *ngIf="isFinancialProduct() && client">
        <div class="section-header mb-6">
          <h2 class="text-xl font-semibold text-gray-800">🛡️ Sistema de Protección</h2>
          <p class="text-sm text-gray-600 mt-2">
            Gestión de protección financiera para productos con plazo
          </p>
        </div>
        
        <!-- Lazy loaded protection component -->
        <div data-protection-container></div>
      </div>

      <!-- Client Details -->
      <div class="client-details" *ngIf="client">
        <div class="details-grid">
          <div class="detail-card">
            <h3>Información Personal</h3>
            <div class="detail-items">
              <div class="detail-item">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{{ client.email || 'No proporcionado' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Teléfono:</span>
                <span class="detail-value">{{ client.phone || 'No proporcionado' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">RFC:</span>
                <span class="detail-value">{{ client.rfc || 'No proporcionado' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-card">
            <h3>Información del Proceso</h3>
            <div class="detail-items">
              <div class="detail-item">
                <span class="detail-label">Fecha de Creación:</span>
                <span class="detail-value">{{ client.createdAt | date:'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Última Actualización:</span>
                <span class="detail-value">{{ client.updatedAt | date:'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Ecosistema:</span>
                <span class="detail-value">{{ client.ecosystemId || 'No asignado' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Tracking Section -->
      <div class="progress-tracking-section" *ngIf="client">
        <div class="section-header mb-6">
          <h2 class="text-xl font-semibold text-gray-800">📈 Progreso Financiero</h2>
        </div>
        
        <div class="progress-cards grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Savings Progress -->
          <div class="progress-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">💰 Plan de Ahorro</h3>
            <!-- Lazy loaded savings progress -->
            <div data-savings-progress></div>
            
            <div class="savings-details mt-4 pt-4 border-t border-gray-200">
              <div class="flex justify-between text-sm text-gray-600">
                <span>Última aportación:</span>
                <span class="font-medium">{{ getLastContributionDate() }}</span>
              </div>
              <div class="flex justify-between text-sm text-gray-600 mt-1">
                <span>Próximo vencimiento:</span>
                <span class="font-medium text-amber-600">{{ getNextPaymentDue() }}</span>
              </div>
            </div>
          </div>
          
          <!-- Payment Progress -->
          <div class="progress-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">💳 Plan de Pagos</h3>
            <!-- Lazy loaded payment progress -->
            <div data-payment-progress></div>
            
            <div class="payment-details mt-4 pt-4 border-t border-gray-200">
              <div class="flex justify-between text-sm text-gray-600">
                <span>Pagos restantes:</span>
                <span class="font-medium">{{ getRemainingPayments() }}</span>
              </div>
              <div class="flex justify-between text-sm text-gray-600 mt-1">
                <span>Fecha estimada de liquidación:</span>
                <span class="font-medium text-emerald-600">{{ getEstimatedCompletion() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Import Tracker Section -->
      <div class="import-tracker-section" *ngIf="client && client.importStatus">
        <div class="section-header mb-6">
          <h2 class="text-xl font-semibold text-gray-800">🚢 Seguimiento de Importación</h2>
        </div>
        <!-- Lazy loaded import tracker -->
        <div data-import-tracker></div>
      </div>

      <!-- Event Log Section -->
      <div class="event-log-section">
        <div class="section-header mb-6">
          <h2 class="text-xl font-semibold text-gray-800">📜 Historial de Actividad</h2>
        </div>
        <!-- Lazy loaded event log -->
        <div data-event-log></div>
      </div>

      <!-- Payment Actions Section -->
      <div class="payment-actions-section" *ngIf="client">
        <div class="section-header mb-6">
          <h2 class="text-xl font-semibold text-gray-800">💳 Opciones de Pago</h2>
        </div>
        
        <div class="payment-options grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button 
            (click)="generatePaymentLink('spei')"
            class="payment-option-card p-6 bg-white rounded-xl shadow-lg border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-200 text-left group"
          >
            <div class="flex items-center space-x-4">
              <div class="payment-icon w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <span class="text-2xl">🏦</span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">Transferencia SPEI</h3>
                <p class="text-sm text-gray-600">Pago inmediato desde tu banco</p>
                <p class="text-xs text-blue-600 mt-1">Sin comisiones adicionales</p>
              </div>
            </div>
          </button>
          
          <button 
            (click)="generatePaymentLink('conekta')"
            class="payment-option-card p-6 bg-white rounded-xl shadow-lg border border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all duration-200 text-left group"
          >
            <div class="flex items-center space-x-4">
              <div class="payment-icon w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <span class="text-2xl">💳</span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">Tarjeta de Crédito/Débito</h3>
                <p class="text-sm text-gray-600">Pago seguro con Conekta</p>
                <p class="text-xs text-purple-600 mt-1">Meses sin intereses disponibles</p>
              </div>
            </div>
          </button>
        </div>
        
        <!-- Account Statement -->
        <div class="account-statement-section">
          <div class="bg-neutral-50 p-6 rounded-xl border border-gray-200">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="font-semibold text-gray-800">📄 Estado de Cuenta</h3>
                <p class="text-sm text-gray-600 mt-1">Genera y descarga tu estado de cuenta actualizado</p>
              </div>
              <div class="flex space-x-3">
                <button 
                  (click)="previewAccountStatement()"
                  class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <span>👁️</span>
                  <span>Vista Previa</span>
                </button>
                <button 
                  (click)="generatePDF()"
                  [disabled]="isGeneratingPDF"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                >
                  <span *ngIf="!isGeneratingPDF">📄</span>
                  <span *ngIf="isGeneratingPDF" class="animate-spin">⏳</span>
                  <span>{{ isGeneratingPDF ? 'Generando...' : 'Descargar PDF' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AVI Modal - Lazy loaded -->
      <div data-avi-modal *ngIf="showAviModal"></div>
    </div>
  `,
  styles: [`
    .cliente-detail-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      background: #f8fafc;
      min-height: 100vh;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: white;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      margin-bottom: 24px;
    }

    .client-info {
      flex: 1;
    }

    .client-name {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 12px 0;
    }

    .client-status {
      margin-bottom: 8px;
    }

    .status-badge {
      padding: 8px 16px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 600;
    }

    .status-expediente-en-proceso {
      background: #fef3c7;
      color: #92400e;
    }

    .status-verificación-avi-completada {
      background: #dcfce7;
      color: #166534;
    }

    .status-requiere-supervisión {
      background: #fecaca;
      color: #991b1b;
    }

    .client-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e5e7eb;
    }
    
    .protection-status {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      background: #f0fdfa;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #06d6a0;
    }

    .score-label, .status-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-indicator {
      font-size: 14px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 8px;
    }
    
    .status-indicator.protection-available {
      background: #06d6a0;
      color: white;
    }

    .score-value {
      font-size: 24px;
      font-weight: 700;
    }

    .score-excellent { color: #059669; }
    .score-good { color: #0891b2; }
    .score-fair { color: #d97706; }
    .score-poor { color: #dc2626; }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      border-left: 4px solid #3b82f6;
    }

    .stat-icon {
      font-size: 32px;
      opacity: 0.8;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }

    .main-actions {
      display: flex;
      flex-direction: column;
      gap: 32px;
      margin-bottom: 32px;
    }

    .action-section {
      background: white;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }

    .action-section h2 {
      margin: 0 0 24px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 12px;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .btn-avi-verification {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      color: white;
      border: none;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    }

    .btn-avi-verification::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }

    .btn-avi-verification:hover:not(:disabled)::before {
      left: 100%;
    }

    .btn-avi-verification:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
    }

    .btn-avi-verification:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary-action {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: white;
      color: #374151;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary-action:hover:not(:disabled) {
      border-color: #3b82f6;
      background: #f8fafc;
    }

    .btn-secondary-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 24px;
      min-width: 24px;
    }

    .btn-content {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      flex: 1;
    }

    .btn-title {
      font-size: 16px;
      font-weight: 600;
    }

    .btn-subtitle {
      font-size: 14px;
      opacity: 0.8;
    }

    .btn-arrow {
      font-size: 20px;
      opacity: 0.8;
    }

    .client-details {
      background: white;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .detail-card {
      background: #f8fafc;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .detail-card h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 12px;
    }

    .detail-items {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 14px;
    }

    .detail-value {
      color: #1f2937;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .cliente-detail-container {
        padding: 16px;
      }

      .detail-header {
        flex-direction: column;
        gap: 20px;
        padding: 24px;
      }

      .client-score, .protection-status {
        width: 100%;
      }

      .quick-stats {
        grid-template-columns: 1fr;
      }

      .action-section {
        padding: 24px;
      }

      .btn-avi-verification,
      .btn-secondary-action {
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }

      .btn-content {
        align-items: center;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .protection-section {
      background: white;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      margin-bottom: 32px;
      border-left: 4px solid #06d6a0;
    }
    
    .protection-section .section-header h2 {
      color: #1f2937;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .protection-section .section-header p {
      color: #6b7280;
      font-size: 14px;
      margin: 8px 0 0 0;
    }
    
    @media (max-width: 768px) {
      .protection-section {
        padding: 24px;
        margin-bottom: 24px;
      }
    }
  `]
})
export class ClienteDetailComponent implements OnInit {
  client: Client | null = null;
  showAviModal = false;
  clientEvents: EventLog[] = [];
  isGeneratingPDF = false;
  
  openPaymentModal = () => {
    this.generatePaymentLink('spei');
  };
  
  constructor(private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
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
    
    this.loadClientEvents();
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
      container.innerHTML = '<div class="text-center py-4 text-gray-500">Protección disponible - Cargando...</div>';
    }
  }

  private async loadProgressBars(): Promise<void> {
    const savingsContainer = document.querySelector('[data-savings-progress]') as HTMLElement;
    const paymentContainer = document.querySelector('[data-payment-progress]') as HTMLElement;

    if (savingsContainer) {
      savingsContainer.innerHTML = `
        <div class="bg-neutral-100 rounded-lg p-4">
          <div class="flex justify-between mb-2">
            <span class="text-sm text-gray-600">Progreso del ahorro</span>
            <span class="text-sm font-medium">${this.getSavingsProgress()}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-green-500 h-2 rounded-full" style="width: ${this.getSavingsProgress()}%"></div>
          </div>
        </div>
      `;
    }

    if (paymentContainer) {
      paymentContainer.innerHTML = `
        <div class="bg-neutral-100 rounded-lg p-4">
          <div class="flex justify-between mb-2">
            <span class="text-sm text-gray-600">Progreso de pagos</span>
            <span class="text-sm font-medium">${this.getPaymentProgress()}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-500 h-2 rounded-full" style="width: ${this.getPaymentProgress()}%"></div>
          </div>
        </div>
      `;
    }
  }

  private async loadImportTracker(): Promise<void> {
    const container = document.querySelector('[data-import-tracker]') as HTMLElement;
    if (container && this.client?.importStatus) {
      container.innerHTML = '<div class="text-center py-4 text-gray-500">Seguimiento de importación - Cargando...</div>';
    }
  }

  private async loadEventLog(): Promise<void> {
    const container = document.querySelector('[data-event-log]') as HTMLElement;
    if (container) {
      const eventsHtml = this.clientEvents.slice(0, 5).map(event => `
        <div class="border-b border-gray-200 py-2">
          <div class="text-sm font-medium text-gray-900">${event.message}</div>
          <div class="text-xs text-gray-500">${event.timestamp.toLocaleDateString()}</div>
        </div>
      `).join('');
      container.innerHTML = `
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <h4 class="font-medium text-gray-900 mb-3">Actividad reciente</h4>
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
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h3 class="text-lg font-semibold mb-4">🎤 Verificación AVI</h3>
            <p class="text-neutral-100 mb-4">Cargando componente de verificación...</p>
            <button onclick="this.parentElement.parentElement.parentElement.style.display='none'"
                    class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
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
  
  getScoreClass(score: number | undefined): string {
    if (!score) return 'text-neutral-100';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  getHealthScoreClass(): string {
    const score = this.client?.healthScore;
    if (score == null) {
      return '';
    }
    return this.getScoreClass(score);
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
