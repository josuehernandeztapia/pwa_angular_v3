import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Client, ImportStatus } from '../../models/types';
import { IntegratedImportTrackerService, IntegratedImportStatus } from '../../services/integrated-import-tracker.service';

interface ImportMilestone {
  key: keyof ImportStatus;
  label: string;
  description: string;
  icon: string;
  estimatedDays: number;
  color: string;
}

@Component({
  selector: 'app-import-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="import-tracker bg-gray-900 rounded-xl border border-gray-800 p-6">
      <!-- Header -->
      <div class="tracker-header mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="icon-container">
              🚢
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">Seguimiento de Importación</h3>
              <p class="text-sm text-gray-400">Unidad: {{ client?.vehicleInfo?.model || 'N/A' }}</p>
              <p *ngIf="integratedStatus()?.deliveryOrderId" class="text-xs text-blue-400">
                Orden: {{ integratedStatus()?.deliveryOrderId }}
              </p>
            </div>
          </div>
          <div class="status-indicator">
            <div class="flex items-center gap-2 px-3 py-2 rounded-full" [class]="getOverallStatusClass()">
              <span class="status-dot w-2 h-2 rounded-full animate-pulse" [class]="getStatusDotClass()"></span>
              <span class="text-sm font-medium">{{ getOverallStatus() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Timeline -->
      <div class="timeline-container">
        <div class="timeline-progress-bar mb-8">
          <div class="progress-track w-full h-2 bg-gray-700 rounded-full relative">
            <div 
              class="progress-fill h-2 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              [style.width.%]="getOverallProgress()"
            ></div>
            <div class="progress-percentage absolute -top-6 right-0 text-sm font-medium text-primary-cyan-400">
              {{ getOverallProgress() }}% Completado
            </div>
          </div>
        </div>

        <!-- Milestone Steps -->
        <div class="milestones-grid space-y-4">
          <div 
            *ngFor="let milestone of milestones; let i = index" 
            class="milestone-item p-4 rounded-lg border transition-all duration-200"
            [class]="getMilestoneClass(milestone, i)"
            (click)="onMilestoneClick(milestone)"
          >
            <div class="flex items-center gap-4">
              <!-- Status Circle -->
              <div class="milestone-circle w-12 h-12 rounded-full flex items-center justify-center relative"
                   [class]="getMilestoneCircleClass(milestone)">
                <span class="text-xl">{{ milestone.icon }}</span>
                <div *ngIf="getMilestoneStatus(milestone) === 'in-progress'" 
                     class="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-ping"></div>
                <div *ngIf="getMilestoneStatus(milestone) === 'completed'" 
                     class="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full">
                  <span class="text-xs">✔️</span>
                </div>
              </div>

              <!-- Milestone Info -->
              <div class="milestone-info flex-1">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold text-white">{{ milestone.label }}</h4>
                  <div class="milestone-actions">
                    <button 
                      *ngIf="getMilestoneStatus(milestone) === 'pending' && canUpdate(milestone)"
                      (click)="updateMilestone(milestone.key); $event.stopPropagation()"
                      class="update-btn px-3 py-1 bg-primary-cyan-600 hover:bg-primary-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Actualizar
                    </button>
                    <button 
                      *ngIf="getMilestoneStatus(milestone) === 'in-progress'"
                      (click)="completeMilestone(milestone.key); $event.stopPropagation()"
                      class="complete-btn px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Completar
                    </button>
                  </div>
                </div>
                
                <p class="text-sm text-gray-400 mb-3">{{ milestone.description }}</p>
                
                <!-- Estimated Timeline -->
                <div class="timeline-estimate flex items-center gap-4">
                  <div class="estimated-time flex items-center gap-2 text-sm">
                    <span class="time-icon">⏱️</span>
                    <span class="text-gray-300">{{ milestone.estimatedDays }} días estimados</span>
                  </div>
                  
                  <div *ngIf="getMilestoneStatus(milestone) === 'completed'" 
                       class="completed-date flex items-center gap-2 text-sm text-emerald-400">
                    <span>📅</span>
                    <span>Completado {{ getCompletionDate(milestone.key) }}</span>
                  </div>
                  
                  <div *ngIf="getMilestoneStatus(milestone) === 'in-progress'"
                       class="in-progress-indicator flex items-center gap-2 text-sm text-amber-400">
                    <span class="animate-spin">⏳</span>
                    <span>En progreso desde {{ getStartDate(milestone.key) }}</span>
                  </div>
                </div>
              </div>

              <!-- Milestone Status Badge -->
              <div class="milestone-badge">
                <span class="status-badge px-3 py-1 rounded-full text-xs font-medium"
                      [class]="getStatusBadgeClass(milestone)">
                  {{ getStatusText(milestone) }}
                </span>
              </div>
            </div>

            <!-- Additional Details (expandable) -->
            <div *ngIf="selectedMilestone === milestone.key" class="milestone-details mt-4 pt-4 border-t border-gray-700">
              <div class="details-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="detail-card p-3 bg-gray-800/50 rounded-lg">
                  <h5 class="font-medium text-white text-sm mb-2">Documentos Requeridos</h5>
                  <ul class="text-sm text-gray-400 space-y-1">
                    <li *ngFor="let doc of getMilestoneDocuments(milestone.key)">{{ doc }}</li>
                  </ul>
                </div>
                
                <div class="detail-card p-3 bg-gray-800/50 rounded-lg">
                  <h5 class="font-medium text-white text-sm mb-2">Contactos Relevantes</h5>
                  <div class="contacts-list text-sm text-gray-400 space-y-1">
                    <div *ngFor="let contact of getMilestoneContacts(milestone.key)" class="contact-item">
                      <span class="contact-role font-medium">{{ contact.role }}:</span>
                      <span class="contact-info">{{ contact.name }} - {{ contact.phone }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Action Log for this milestone -->
              <div class="milestone-actions-log mt-4">
                <h5 class="font-medium text-white text-sm mb-2">Historial de Acciones</h5>
                <div class="actions-list space-y-2">
                  <div *ngFor="let action of getMilestoneActions(milestone.key)" 
                       class="action-item p-2 bg-gray-800/30 rounded-lg text-sm">
                    <div class="flex items-center justify-between">
                      <span class="text-gray-300">{{ action.description }}</span>
                      <span class="text-gray-500 text-xs">{{ action.timestamp | date:'short' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="summary-stats mt-6 grid grid-cols-3 gap-4">
        <div class="stat-card p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/20">
          <div class="flex items-center gap-3">
            <div class="stat-icon text-2xl">✅</div>
            <div>
              <div class="stat-value text-xl font-bold text-blue-400">{{ getCompletedMilestones() }}</div>
              <div class="stat-label text-sm text-gray-400">Etapas Completadas</div>
            </div>
          </div>
        </div>
        
        <div class="stat-card p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-lg border border-amber-500/20">
          <div class="flex items-center gap-3">
            <div class="stat-icon text-2xl">⏳</div>
            <div>
              <div class="stat-value text-xl font-bold text-amber-400">{{ getEstimatedDaysRemaining() }}</div>
              <div class="stat-label text-sm text-gray-400">Días Restantes</div>
            </div>
          </div>
        </div>
        
        <div class="stat-card p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-lg border border-emerald-500/20">
          <div class="flex items-center gap-3">
            <div class="stat-icon text-2xl">📅</div>
            <div>
              <div class="stat-value text-xl font-bold text-emerald-400">{{ getExpectedDeliveryDate() }}</div>
              <div class="stat-label text-sm text-gray-400">Entrega Estimada</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="tracker-actions mt-6 flex gap-3">
        <button 
          (click)="generateTrackingReport()"
          class="generate-report-btn flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span>📄</span>
          Generar Reporte
        </button>
        
        <button 
          (click)="notifyClient()"
          class="notify-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>🔔</span>
          Notificar Cliente
        </button>
      </div>
    </div>
  `,
  styles: [`
    .import-tracker {
      position: relative;
      overflow: hidden;
    }

    .import-tracker::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #3b82f6, #10b981);
    }

    .icon-container {
      font-size: 2rem;
      opacity: 0.9;
    }

    .status-indicator.in-transit {
      background-color: rgba(59, 130, 246, 0.1);
      color: rgb(59, 130, 246);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .status-indicator.completed {
      background-color: rgba(16, 185, 129, 0.1);
      color: rgb(16, 185, 129);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .status-indicator.delayed {
      background-color: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .status-dot.active {
      background-color: rgb(59, 130, 246);
    }

    .status-dot.completed {
      background-color: rgb(16, 185, 129);
    }

    .status-dot.delayed {
      background-color: rgb(239, 68, 68);
    }

    .milestone-item {
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .milestone-item.completed {
      background-color: rgba(16, 185, 129, 0.05);
      border-color: rgba(16, 185, 129, 0.2);
    }

    .milestone-item.in-progress {
      background-color: rgba(245, 158, 11, 0.05);
      border-color: rgba(245, 158, 11, 0.2);
    }

    .milestone-item.pending {
      background-color: rgba(107, 114, 128, 0.05);
      border-color: rgba(107, 114, 128, 0.2);
    }

    .milestone-item:hover {
      transform: translateY(-1px);
      border-color: rgba(59, 130, 246, 0.3);
    }

    .milestone-circle.completed {
      background-color: rgba(16, 185, 129, 0.2);
      border: 2px solid rgb(16, 185, 129);
    }

    .milestone-circle.in-progress {
      background-color: rgba(245, 158, 11, 0.2);
      border: 2px solid rgb(245, 158, 11);
    }

    .milestone-circle.pending {
      background-color: rgba(107, 114, 128, 0.2);
      border: 2px solid rgb(107, 114, 128);
    }

    .status-badge.completed {
      background-color: rgba(16, 185, 129, 0.2);
      color: rgb(16, 185, 129);
    }

    .status-badge.in-progress {
      background-color: rgba(245, 158, 11, 0.2);
      color: rgb(245, 158, 11);
    }

    .status-badge.pending {
      background-color: rgba(107, 114, 128, 0.2);
      color: rgb(107, 114, 128);
    }

    .progress-fill {
      transition: width 0.5s ease-in-out;
    }

    @media (max-width: 768px) {
      .milestone-item .flex {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
      
      .tracker-actions {
        flex-direction: column;
      }
      
      .summary-stats {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ImportTrackerComponent implements OnInit, OnDestroy {
  @Input() client?: Client;
  @Output() onUpdateMilestone = new EventEmitter<keyof ImportStatus>();
  
  private destroy$ = new Subject<void>();
  private integratedTrackerService = inject(IntegratedImportTrackerService);
  
  selectedMilestone?: keyof ImportStatus;
  
  // Señales reactivas para el estado integrado
  integratedStatus = signal<IntegratedImportStatus | null>(null);
  loading = signal(false);
  
  // Computed para compatibilidad con template existente
  computedImportStatus = computed(() => {
    const integrated = this.integratedStatus();
    return integrated ? {
      pedidoPlanta: integrated.pedidoPlanta,
      unidadFabricada: integrated.unidadFabricada,
      transitoMaritimo: integrated.transitoMaritimo,
      enAduana: integrated.enAduana,
      liberada: integrated.liberada
    } as ImportStatus : this.client?.importStatus;
  });

  milestones: ImportMilestone[] = [
    {
      key: 'pedidoPlanta',
      label: 'Pedido a Planta',
      description: 'Solicitud de fabricación enviada a la planta manufacturera',
      icon: '📝',
      estimatedDays: 3,
      color: 'blue'
    },
    {
      key: 'unidadFabricada',
      label: 'Unidad Fabricada',
      description: 'La unidad ha sido completamente fabricada y está lista para envío',
      icon: '🏭',
      estimatedDays: 30,
      color: 'purple'
    },
    {
      key: 'transitoMaritimo',
      label: 'Tránsito Marítimo',
      description: 'La unidad está en tránsito marítimo hacia el puerto de destino',
      icon: '🚢',
      estimatedDays: 21,
      color: 'blue'
    },
    {
      key: 'enAduana',
      label: 'En Aduana',
      description: 'Procesando documentos aduaneros y trámites de importación',
      icon: '🛃',
      estimatedDays: 7,
      color: 'amber'
    },
    {
      key: 'liberada',
      label: 'Liberada',
      description: 'Unidad liberada de aduana y lista para entrega final',
      icon: '✅',
      estimatedDays: 2,
      color: 'emerald'
    }
  ];

  ngOnInit() {
    if (this.client?.id) {
      this.loadIntegratedStatus();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadIntegratedStatus() {
    if (!this.client?.id) return;
    
    this.loading.set(true);
    this.integratedTrackerService.getIntegratedImportStatus(this.client.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.integratedStatus.set(status);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading integrated import status:', error);
          this.loading.set(false);
        }
      });
  }

  getMilestoneStatus(milestone: ImportMilestone): 'completed' | 'in-progress' | 'pending' {
    const importStatus = this.computedImportStatus();
    if (!importStatus) return 'pending';
    
    const status = importStatus[milestone.key];
    if (status?.status === 'completed') return 'completed';
    if (status?.status === 'in_progress') return 'in-progress';
    return 'pending';
  }

  getMilestoneClass(milestone: ImportMilestone, index: number): string {
    const status = this.getMilestoneStatus(milestone);
    const baseClass = `milestone-item ${status}`;
    return this.selectedMilestone === milestone.key ? `${baseClass} selected` : baseClass;
  }

  getMilestoneCircleClass(milestone: ImportMilestone): string {
    return `milestone-circle ${this.getMilestoneStatus(milestone)}`;
  }

  getStatusBadgeClass(milestone: ImportMilestone): string {
    return `status-badge ${this.getMilestoneStatus(milestone)}`;
  }

  getStatusText(milestone: ImportMilestone): string {
    const status = this.getMilestoneStatus(milestone);
    const texts = {
      'completed': 'Completado',
      'in-progress': 'En Progreso',
      'pending': 'Pendiente'
    };
    return texts[status];
  }

  getOverallProgress(): number {
    const totalMilestones = this.milestones.length;
    const completedMilestones = this.milestones.filter(m => this.getMilestoneStatus(m) === 'completed').length;
    const inProgressMilestones = this.milestones.filter(m => this.getMilestoneStatus(m) === 'in-progress').length;
    
    return Math.round(((completedMilestones + (inProgressMilestones * 0.5)) / totalMilestones) * 100);
  }

  getOverallStatus(): string {
    const progress = this.getOverallProgress();
    if (progress === 100) return 'Entregada';
    if (progress > 0) return 'En Tránsito';
    return 'Pendiente Fabricación';
  }

  getOverallStatusClass(): string {
    const progress = this.getOverallProgress();
    if (progress === 100) return 'status-indicator completed';
    if (progress > 0) return 'status-indicator in-transit';
    return 'status-indicator delayed';
  }

  getStatusDotClass(): string {
    const progress = this.getOverallProgress();
    if (progress === 100) return 'status-dot completed';
    if (progress > 0) return 'status-dot active';
    return 'status-dot delayed';
  }

  getCompletedMilestones(): number {
    return this.milestones.filter(m => this.getMilestoneStatus(m) === 'completed').length;
  }

  getEstimatedDaysRemaining(): number {
    const pendingMilestones = this.milestones.filter(m => this.getMilestoneStatus(m) === 'pending');
    return pendingMilestones.reduce((total, milestone) => total + milestone.estimatedDays, 0);
  }

  getExpectedDeliveryDate(): string {
    const remainingDays = this.getEstimatedDaysRemaining();
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + remainingDays);
    
    return deliveryDate.toLocaleDateString('es-MX', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  canUpdate(milestone: ImportMilestone): boolean {
    // Only allow updating if previous milestones are completed
    const milestoneIndex = this.milestones.findIndex(m => m.key === milestone.key);
    if (milestoneIndex === 0) return true;
    
    const previousMilestone = this.milestones[milestoneIndex - 1];
    return this.getMilestoneStatus(previousMilestone) === 'completed';
  }

  updateMilestone(key: keyof ImportStatus): void {
    if (!this.client?.id) return;
    
    this.loading.set(true);
    this.integratedTrackerService.updateImportMilestone(
      this.client.id, 
      key, 
      'in_progress',
      {
        notes: `Milestone actualizado desde Import Tracker`,
        estimatedDate: new Date()
      }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedStatus) => {
        this.integratedStatus.set(updatedStatus);
        this.onUpdateMilestone.emit(key);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error updating milestone:', error);
        this.loading.set(false);
      }
    });
  }

  completeMilestone(key: keyof ImportStatus): void {
    if (!this.client?.id) return;
    
    this.loading.set(true);
    this.integratedTrackerService.updateImportMilestone(
      this.client.id, 
      key, 
      'completed',
      {
        notes: `Milestone completado desde Import Tracker`,
        actualDate: new Date()
      }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (updatedStatus) => {
        this.integratedStatus.set(updatedStatus);
        this.onUpdateMilestone.emit(key);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error completing milestone:', error);
        this.loading.set(false);
      }
    });
  }

  onMilestoneClick(milestone: ImportMilestone): void {
    this.selectedMilestone = this.selectedMilestone === milestone.key ? undefined : milestone.key;
  }

  getCompletionDate(key: keyof ImportStatus): string {
    const status = this.client?.importStatus?.[key];
    if (status?.completedAt) {
      return new Date(status.completedAt).toLocaleDateString('es-MX', {
        month: 'short',
        day: 'numeric'
      });
    }
    return '';
  }

  getStartDate(key: keyof ImportStatus): string {
    const status = this.client?.importStatus?.[key];
    if (status?.startedAt) {
      return new Date(status.startedAt).toLocaleDateString('es-MX', {
        month: 'short',
        day: 'numeric'
      });
    }
    return '';
  }

  getMilestoneDocuments(key: keyof ImportStatus): string[] {
    const docs: Record<keyof ImportStatus, string[]> = {
      pedidoPlanta: ['Orden de compra', 'Especificaciones técnicas', 'Contrato de fabricación'],
      unidadFabricada: ['Certificado de fabricación', 'Factura comercial', 'Packing list'],
      transitoMaritimo: ['Bill of lading', 'Manifiesto de carga', 'Seguro de transporte'],
      enAduana: ['Factura comercial', 'Certificado de origen', 'Pedimento de importación'],
      liberada: ['Pedimento liberado', 'Certificado de inspección', 'Documentos de entrega']
    };
    return docs[key] || [];
  }

  getMilestoneContacts(key: keyof ImportStatus): {role: string, name: string, phone: string}[] {
    const contacts: Record<keyof ImportStatus, {role: string, name: string, phone: string}[]> = {
      pedidoPlanta: [
        {role: 'Coordinador Planta', name: 'Carlos Méndez', phone: '+52 55 1234-5678'}
      ],
      unidadFabricada: [
        {role: 'QC Manager', name: 'Ana García', phone: '+52 55 2345-6789'}
      ],
      transitoMaritimo: [
        {role: 'Agente Naviero', name: 'Roberto Sánchez', phone: '+52 55 3456-7890'}
      ],
      enAduana: [
        {role: 'Agente Aduanal', name: 'María López', phone: '+52 55 4567-8901'}
      ],
      liberada: [
        {role: 'Coordinador Entrega', name: 'Juan Hernández', phone: '+52 55 5678-9012'}
      ]
    };
    return contacts[key] || [];
  }

  getMilestoneActions(key: keyof ImportStatus): {description: string, timestamp: Date}[] {
    // Mock data - in real implementation, this would come from the service
    return [
      {description: 'Etapa iniciada', timestamp: new Date()},
      {description: 'Documentos recibidos', timestamp: new Date()}
    ];
  }

  generateTrackingReport(): void {
    if (!this.client?.id) return;
    
    this.loading.set(true);
    this.integratedTrackerService.generateIntegratedTrackingReport(this.client.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          console.log('📄 Reporte de seguimiento integrado generado:', report);
          // En implementación real, abriría el reporte o descargaría el PDF
          window.open(report.reportUrl, '_blank');
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error generating integrated tracking report:', error);
          this.loading.set(false);
        }
      });
  }

  notifyClient(): void {
    if (!this.client?.id) return;
    
    console.log('📱 Notificando cliente sobre estado de importación');
    // En implementación real, enviaría notificación WhatsApp via WhatsAppService
  }
}