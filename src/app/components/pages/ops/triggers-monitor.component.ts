import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, catchError, interval, of, switchMap, takeUntil } from 'rxjs';

import { BusinessFlow } from '../../../models/types';
import { ContractPaymentSummary, ContractTriggersService, TandaPredictiveAnalysis, TriggerEvent, TriggerRule } from '../../../services/contract-triggers.service';
import { EmptyStateCardComponent } from '../../shared/empty-state-card.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { SkeletonCardComponent } from '../../shared/skeleton-card.component';

@Component({
  selector: 'app-triggers-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonCardComponent, EmptyStateCardComponent, IconComponent],
  templateUrl: './triggers-monitor.component.html',
  styleUrls: ['./triggers-monitor.component.scss']
})
export class TriggersMonitorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private contractTriggersService = inject(ContractTriggersService);
  private router = inject(Router);

  // Señales reactivas
  loading = signal(false);
  lastUpdate = signal(new Date());
  monitoringStatus = signal<'active' | 'inactive'>('active');
  
  triggerEvents = signal<TriggerEvent[]>([]);
  pendingContracts = signal<ContractPaymentSummary[]>([]);
  pendingTandas = signal<TandaPredictiveAnalysis[]>([]);
  triggerRules = signal<TriggerRule[]>([]);
  metrics = signal<any>(null);

  // Filtros
  selectedMarket = '';
  selectedFlow = '';
  selectedStatus = '';
  
  // UI state
  activeTab: 'recent' | 'pending' | 'rules' = 'recent';
  showErrorModal = false;
  selectedErrorMessage = '';

  // Computed signals
  filteredEvents = computed(() => {
    let events = this.triggerEvents();
    
    if (this.selectedMarket) {
      events = events.filter(e => this.getEventMarket(e) === this.selectedMarket);
    }
    
    if (this.selectedFlow) {
      events = events.filter(e => this.getEventFlow(e) === this.selectedFlow);
    }
    
    if (this.selectedStatus) {
      if (this.selectedStatus === 'success') {
        events = events.filter(e => e.deliveryOrderCreated && !e.errorMessage);
      } else if (this.selectedStatus === 'error') {
        events = events.filter(e => !e.deliveryOrderCreated || e.errorMessage);
      } else if (this.selectedStatus === 'pending') {
        events = events.filter(e => !e.deliveryOrderCreated && !e.errorMessage);
      }
    }
    
    return events.sort((a, b) => new Date(b.triggerDate).getTime() - new Date(a.triggerDate).getTime());
  });

  ngOnInit() {
    this.loadInitialData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData() {
    this.loading.set(true);
    
    // Cargar datos iniciales
    Promise.all([
      this.contractTriggersService.getTriggerHistory(100).toPromise(),
      this.contractTriggersService.getTriggerMetrics().toPromise()
    ]).then(([events, metrics]) => {
      this.triggerEvents.set(events || []);
      this.metrics.set(metrics);
      this.triggerRules.set(this.contractTriggersService.getTriggerRules());
      this.lastUpdate.set(new Date());
    }).catch(error => {
    }).finally(() => {
      this.loading.set(false);
    });
    
    // Cargar análisis pendientes
    this.loadPendingAnalysis();
  }

  private loadPendingAnalysis() {
    // En implementación real, estos datos vendrían del servicio
    // Por ahora simularemos algunos datos pendientes
    this.pendingContracts.set([]);
    this.pendingTandas.set([]);
  }

  private startAutoRefresh() {
    interval(30000) // Refresh cada 30 segundos
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.contractTriggersService.getTriggerHistory(50)),
        catchError(error => {
          return of([]);
        })
      )
      .subscribe(events => {
        this.triggerEvents.set(events);
        this.lastUpdate.set(new Date());
      });
  }

  forceRefresh() {
    this.loading.set(true);
    
    this.contractTriggersService.forceProcessTriggers()
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.contractTriggersService.getTriggerHistory(100))
      )
      .subscribe({
        next: (events) => {
          this.triggerEvents.set(events);
          this.lastUpdate.set(new Date());
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
        }
      });
  }

  applyFilters() {
    // Los filtros se aplicarán automáticamente via computed signal
  }

  simulateDemoTriggers() {
    this.loading.set(true);
    setTimeout(() => {
      this.loading.set(false);
    }, 800);
  }

  viewDeliveryOrder(orderId: string) {
    this.router.navigate(['/entregas', orderId]);
  }

  viewError(event: TriggerEvent) {
    this.selectedErrorMessage = event.errorMessage || 'Error desconocido';
    this.showErrorModal = true;
  }

  // Helpers para UI
  monitoringStatusModifier(): string {
    return this.monitoringStatus() === 'active'
      ? 'triggers-monitor__monitoring-indicator--active'
      : 'triggers-monitor__monitoring-indicator--inactive';
  }

  getEventStatusClass(event: TriggerEvent): string {
    if (event.deliveryOrderCreated && !event.errorMessage) {
      return 'triggers-monitor__status-dot--success';
    }

    if (event.errorMessage) {
      return 'triggers-monitor__status-dot--error';
    }

    return 'triggers-monitor__status-dot--pending';
  }

  getEventTitle(event: TriggerEvent): string {
    if (event.contractId) {
      return `Contrato ${event.contractId.substring(0, 8)}...`;
    } else if (event.tandaId) {
      return `Tanda ${event.tandaId.substring(0, 8)}...`;
    } else {
      return 'Trigger Desconocido';
    }
  }

  getEventFlow(event: TriggerEvent): BusinessFlow {
    const rule = this.triggerRules().find(r => r.id === event.triggerRuleId);
    return rule?.flow || BusinessFlow.VentaDirecta;
  }

  getEventMarket(event: TriggerEvent): string {
    const rule = this.triggerRules().find(r => r.id === event.triggerRuleId);
    return rule?.market || 'aguascalientes';
  }

  getFlowBadgeClass(flow: BusinessFlow): string {
    switch (flow) {
      case BusinessFlow.VentaDirecta:
        return 'triggers-monitor__flow-tag triggers-monitor__flow-tag--directa';
      case BusinessFlow.VentaPlazo:
        return 'triggers-monitor__flow-tag triggers-monitor__flow-tag--plazo';
      case BusinessFlow.AhorroProgramado:
        return 'triggers-monitor__flow-tag triggers-monitor__flow-tag--ahorro';
      case BusinessFlow.CreditoColectivo:
        return 'triggers-monitor__flow-tag triggers-monitor__flow-tag--colectivo';
      default:
        return 'triggers-monitor__flow-tag triggers-monitor__flow-tag--default';
    }
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedMarket || this.selectedFlow || this.selectedStatus);
  }

  clearFilters(): void {
    this.selectedMarket = '';
    this.selectedFlow = '';
    this.selectedStatus = '';
    this.applyFilters();
  }

  loadData(): void {
    // Implementación básica para evitar error de compilación
    this.forceRefresh();
  }
}
