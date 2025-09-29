import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Client } from '../../models/types';
import { ImportStatus } from '../../models/postventa';
import { IntegratedImportTrackerService, IntegratedImportStatus } from '../../services/integrated-import-tracker.service';
import { IconComponent } from './icon/icon.component';
import { IconName } from './icon/icon-definitions';

interface ImportMilestone {
  key: keyof ImportStatus;
  label: string;
  description: string;
  icon: IconName;
  estimatedDays: number;
  color: string;
}

@Component({
  selector: 'app-import-tracker',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './import-tracker.component.html',
  styleUrls: ['./import-tracker.component.scss']
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
      icon: 'edit',
      estimatedDays: 3,
      color: 'blue'
    },
    {
      key: 'unidadFabricada',
      label: 'Unidad Fabricada',
      description: 'La unidad ha sido completamente fabricada y está lista para envío',
      icon: 'factory',
      estimatedDays: 30,
      color: 'purple'
    },
    {
      key: 'transitoMaritimo',
      label: 'Tránsito Marítimo',
      description: 'La unidad está en tránsito marítimo hacia el puerto de destino',
      icon: 'ship',
      estimatedDays: 21,
      color: 'blue'
    },
    {
      key: 'enAduana',
      label: 'En Aduana',
      description: 'Procesando documentos aduaneros y trámites de importación',
      icon: 'customs',
      estimatedDays: 7,
      color: 'amber'
    },
    {
      key: 'liberada',
      label: 'Liberada',
      description: 'Unidad liberada de aduana y lista para entrega final',
      icon: 'check-circle',
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
          this.loading.set(false);
        }
      });
  }

  getMilestoneStatus(milestone: ImportMilestone): 'completed' | 'in-progress' | 'pending' {
    const importStatus = this.computedImportStatus();
    if (!importStatus) return 'pending';
    
    const entry = importStatus[milestone.key] as any;
    if (entry?.status === 'completed') return 'completed';
    if (entry?.status === 'in_progress') return 'in-progress';
    return 'pending';
  }

  getMilestoneClasses(milestone: ImportMilestone): Record<string, boolean> {
    const status = this.getMilestoneStatus(milestone);
    return {
      'import-tracker__milestone--completed': status === 'completed',
      'import-tracker__milestone--in-progress': status === 'in-progress',
      'import-tracker__milestone--pending': status === 'pending',
      'import-tracker__milestone--selected': this.selectedMilestone === milestone.key
    };
  }

  getMilestoneCircleClasses(milestone: ImportMilestone): Record<string, boolean> {
    const status = this.getMilestoneStatus(milestone);
    return {
      'import-tracker__milestone-circle--completed': status === 'completed',
      'import-tracker__milestone-circle--in-progress': status === 'in-progress',
      'import-tracker__milestone-circle--pending': status === 'pending'
    };
  }

  getStatusBadgeClasses(milestone: ImportMilestone): Record<string, boolean> {
    const status = this.getMilestoneStatus(milestone);
    return {
      'import-tracker__status-badge--completed': status === 'completed',
      'import-tracker__status-badge--in-progress': status === 'in-progress',
      'import-tracker__status-badge--pending': status === 'pending'
    };
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

  getOverallStatusClasses(): Record<string, boolean> {
    const state = this.getOverallState();
    return {
      'import-tracker__status-chip--completed': state === 'completed',
      'import-tracker__status-chip--in-transit': state === 'in-transit',
      'import-tracker__status-chip--delayed': state === 'delayed'
    };
  }

  getStatusDotClasses(): Record<string, boolean> {
    const state = this.getOverallState();
    return {
      'import-tracker__status-dot--completed': state === 'completed',
      'import-tracker__status-dot--active': state === 'in-transit',
      'import-tracker__status-dot--delayed': state === 'delayed'
    };
  }

  private getOverallState(): 'completed' | 'in-transit' | 'delayed' {
    const progress = this.getOverallProgress();

    if (progress === 100) {
      return 'completed';
    }

    if (progress > 0) {
      return 'in-transit';
    }

    return 'delayed';
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
        this.loading.set(false);
      }
    });
  }

  onMilestoneClick(milestone: ImportMilestone): void {
    this.selectedMilestone = this.selectedMilestone === milestone.key ? undefined : milestone.key;
  }

  getCompletionDate(key: keyof ImportStatus): string {
    const status = this.client?.importStatus?.[key] as any;
    if (status?.completedAt) {
      return new Date(status.completedAt).toLocaleDateString('es-MX', {
        month: 'short',
        day: 'numeric'
      });
    }
    return '';
  }

  getStartDate(key: keyof ImportStatus): string {
    const status = this.client?.importStatus?.[key] as any;
    if (status?.startedAt) {
      return new Date(status.startedAt).toLocaleDateString('es-MX', {
        month: 'short',
        day: 'numeric'
      });
    }
    return '';
  }

  getMilestoneDocuments(key: keyof ImportStatus): string[] {
    const docs: Partial<Record<keyof ImportStatus, string[]>> = {
      pedidoPlanta: ['Orden de compra', 'Especificaciones técnicas', 'Contrato de fabricación'],
      unidadFabricada: ['Certificado de fabricación', 'Factura comercial', 'Packing list'],
      transitoMaritimo: ['Bill of lading', 'Manifiesto de carga', 'Seguro de transporte'],
      enAduana: ['Factura comercial', 'Certificado de origen', 'Pedimento de importación'],
      liberada: ['Pedimento liberado', 'Certificado de inspección', 'Documentos de entrega']
    };
    return docs[key] || [];
  }

  getMilestoneContacts(key: keyof ImportStatus): {role: string, name: string, phone: string}[] {
    const contacts: Partial<Record<keyof ImportStatus, {role: string, name: string, phone: string}[]>> = {
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
          // En implementación real, abriría el reporte o descargaría el PDF
          window.open(report.reportUrl, '_blank');
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
        }
      });
  }

  notifyClient(): void {
    if (!this.client?.id) return;
    
    // En implementación real, enviaría notificación WhatsApp via WhatsAppService
  }
}
