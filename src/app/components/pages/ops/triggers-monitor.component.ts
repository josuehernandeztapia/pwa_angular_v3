import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, catchError, interval, of, switchMap, takeUntil } from 'rxjs';

import { BusinessFlow } from '../../../models/types';
import { ContractPaymentSummary, ContractTriggersService, TandaPredictiveAnalysis, TriggerEvent, TriggerRule } from '../../../services/contract-triggers.service';
import { EmptyStateCardComponent } from '../../shared/empty-state-card.component';
import { SkeletonCardComponent } from '../../shared/skeleton-card.component';

@Component({
  selector: 'app-triggers-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonCardComponent, EmptyStateCardComponent],
  template: `
    <div class="container-neutral min-h-screen bg-neutral-50 p-6">
      <!-- Header (compact) -->
      <div class="mb-4">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-neutral-100 mb-1">Monitor de Triggers</h1>
            <p class="text-neutral-100 text-sm">Actividad reciente y pendientes según filtros</p>
          </div>

          <div class="flex items-center gap-3 mt-3 lg:mt-0">
            <!-- Estado del monitoreo -->
            <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border">
              <div class="flex items-center gap-2">
                <div [class]="monitoringStatus() === 'active' ? 'w-3 h-3 bg-green-400 rounded-full animate-pulse' : 'w-3 h-3 bg-red-400 rounded-full'"></div>
                <span class="text-sm font-medium">
                  {{ monitoringStatus() === 'active' ? 'Monitoreo Activo' : 'Monitoreo Inactivo' }}
                </span>
              </div>
            </div>
            
            <!-- Última actualización -->
            <div class="text-sm text-neutral-400">
              Última actualización: {{ lastUpdate() | date:'HH:mm:ss' }}
            </div>
            
            <!-- Botón de refresh manual -->
            <button
              (click)="forceRefresh()"
              [disabled]="loading()"
              class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="Actualizar"
            >
              <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ loading() ? 'Actualizando...' : 'Actualizar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Métricas rápidas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-sm border">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-300 mb-1">Total Triggers</p>
              <p class="text-2xl font-bold text-neutral-100">{{ metrics()?.totalTriggers || 0 }}</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-lg">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-sm border">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-300 mb-1">Exitosos</p>
              <p class="text-2xl font-bold text-green-600">{{ metrics()?.successfulTriggers || 0 }}</p>
            </div>
            <div class="p-3 bg-green-100 rounded-lg">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-sm border">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-300 mb-1">Fallidos</p>
              <p class="text-2xl font-bold text-red-600">{{ metrics()?.failedTriggers || 0 }}</p>
            </div>
            <div class="p-3 bg-red-100 rounded-lg">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-sm border">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-300 mb-1">Pendientes</p>
              <p class="text-2xl font-bold text-orange-600">{{ metrics()?.pendingAnalysis || 0 }}</p>
            </div>
            <div class="p-3 bg-orange-100 rounded-lg">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white p-6 rounded-xl shadow-sm border mb-8">
        <div class="flex flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-neutral-100">Mercado:</label>
            <select
              [(ngModel)]="selectedMarket"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="aguascalientes">Aguascalientes</option>
              <option value="edomex">Estado de México</option>
            </select>
          </div>
          
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-neutral-100">Flujo:</label>
            <select
              [(ngModel)]="selectedFlow"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="Venta Directa">Venta Directa</option>
              <option value="Venta a Plazo">Venta a Plazo</option>
              <option value="Plan de Ahorro">Plan de Ahorro</option>
              <option value="Crédito Colectivo">Crédito Colectivo</option>
            </select>
          </div>
          
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-neutral-100">Estado:</label>
            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="success">Exitoso</option>
              <option value="error">Error</option>
              <option value="pending">Pendiente</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-6">
        <div class="border-b border-neutral-200">
          <nav class="-mb-px flex space-x-8">
            <button
              (click)="activeTab = 'recent'"
              [class]="activeTab === 'recent' 
                ? 'border-blue-500 text-blue-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-100 hover:border-neutral-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'"
            >
              Triggers Recientes
              <span class="ml-2 py-0.5 px-2 bg-neutral-100 rounded-full text-xs">{{ filteredEvents().length }}</span>
            </button>
            <button
              (click)="activeTab = 'pending'"
              [class]="activeTab === 'pending' 
                ? 'border-blue-500 text-blue-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-100 hover:border-neutral-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'"
            >
              Análisis Pendientes
              <span class="ml-2 py-0.5 px-2 bg-orange-100 rounded-full text-xs">{{ pendingContracts().length + pendingTandas().length }}</span>
            </button>
            <button
              (click)="activeTab = 'rules'"
              [class]="activeTab === 'rules' 
                ? 'border-blue-500 text-blue-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
                : 'border-transparent text-neutral-400 hover:text-neutral-100 hover:border-neutral-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'"
            >
              Reglas de Trigger
              <span class="ml-2 py-0.5 px-2 bg-blue-100 rounded-full text-xs">{{ triggerRules().length }}</span>
            </button>
          </nav>
        </div>
      </div>

      <!-- Contenido de tabs -->
      <div class="space-y-6">
        <!-- Tab: Triggers Recientes -->
        <div *ngIf="activeTab === 'recent'" class="space-y-4">
          <div *ngIf="loading()">
            <app-skeleton-card [titleWidth]="50" [subtitleWidth]="80" [buttonWidth]="30"></app-skeleton-card>
          </div>
          <div *ngFor="let event of filteredEvents()" class="bg-white p-6 rounded-xl shadow-sm border">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-3">
                  <div [class]="getEventStatusClass(event)"></div>
                  <h3 class="font-semibold text-neutral-100">
                    {{ getEventTitle(event) }}
                  </h3>
                  <span class="px-2 py-1 text-xs font-medium rounded-full"
                        [class]="getFlowBadgeClass(getEventFlow(event))">
                    {{ getEventFlow(event) }}
                  </span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p class="text-sm text-neutral-300">Umbral Objetivo</p>
                    <p class="font-medium">\${{ event.thresholdAmount | number:'1.2-2' }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-neutral-300">Monto Actual</p>
                    <p class="font-medium">\${{ event.actualAmount | number:'1.2-2' }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-neutral-300">Porcentaje</p>
                    <p class="font-medium">{{ event.triggerPercentage.toFixed(1) }}%</p>
                  </div>
                </div>
                
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <span class="text-sm text-neutral-400">
                      {{ event.triggerDate | date:'dd/MM/yyyy HH:mm' }}
                    </span>
                    <span class="text-sm text-neutral-400">
                      Procesado: {{ event.processedBy === 'system' ? 'Automático' : 'Manual' }}
                    </span>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <button
                      *ngIf="event.deliveryOrderId"
                      (click)="viewDeliveryOrder(event.deliveryOrderId!)"
                      class="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg"
                      aria-label="Ver orden de entrega"
                    >
                      Ver Orden
                    </button>
                    <button
                      *ngIf="event.errorMessage"
                      (click)="viewError(event)"
                      class="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
                      aria-label="Ver error"
                    >
                      Ver Error
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="filteredEvents().length === 0 && !loading()" class="bg-white p-8 rounded-xl border text-center" style="min-height:160px;display:flex;align-items:center;justify-content:center;">
            <div>
              <p class="text-neutral-100">No hay registros con los filtros seleccionados.</p>
            </div>
          </div>
        </div>

        <!-- Tab: Análisis Pendientes -->
        <div *ngIf="activeTab === 'pending'" class="space-y-4">
          <!-- Contratos pendientes -->
          <div *ngFor="let contract of pendingContracts()" class="bg-white p-6 rounded-xl shadow-sm border border-orange-200">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
              <h3 class="font-semibold text-neutral-100">{{ contract.clientName }}</h3>
              <span class="px-2 py-1 text-xs font-medium rounded-full"
                    [class]="getFlowBadgeClass(contract.flow)">
                {{ contract.flow }}
              </span>
              <span class="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-100 rounded-full">
                {{ contract.market }}
              </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p class="text-sm text-neutral-300">Umbral Requerido</p>
                <p class="font-medium">\${{ contract.thresholdAmount | number:'1.2-2' }}</p>
              </div>
              <div>
                <p class="text-sm text-neutral-300">Pagado Actualmente</p>
                <p class="font-medium">\${{ contract.currentPaidAmount | number:'1.2-2' }}</p>
              </div>
              <div>
                <p class="text-sm text-neutral-300">Progreso</p>
                <div class="flex items-center gap-2">
                  <div class="flex-1 bg-neutral-200 rounded-full h-2">
                    <div class="bg-orange-500 h-2 rounded-full" [style.width.%]="contract.thresholdPercentage"></div>
                  </div>
                  <span class="text-sm font-medium">{{ contract.thresholdPercentage.toFixed(1) }}%</span>
                </div>
              </div>
              <div>
                <p class="text-sm text-neutral-300">Estado</p>
                <p class="font-medium text-orange-600">
                  {{ contract.thresholdReached ? 'Listo para Trigger' : 'Esperando Pagos' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Tandas pendientes -->
          <div *ngFor="let tanda of pendingTandas()" class="bg-white p-6 rounded-xl shadow-sm border border-purple-200">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              <h3 class="font-semibold text-neutral-100">{{ tanda.groupName }}</h3>
              <span class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                Tanda Colectiva
              </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p class="text-sm text-neutral-300">Miembros Activos</p>
                <p class="font-medium">{{ tanda.activeMembersCount }}</p>
              </div>
              <div>
                <p class="text-sm text-neutral-300">Meses Colectando</p>
                <p class="font-medium">{{ tanda.monthsCollecting }}</p>
              </div>
              <div>
                <p class="text-sm text-neutral-300">Total Colectado</p>
                <p class="font-medium">\${{ tanda.totalCollected | number:'1.2-2' }}</p>
              </div>
              <div>
                <p class="text-sm text-neutral-300">Confianza</p>
                <p class="font-medium">{{ (tanda.confidenceLevel * 100).toFixed(1) }}%</p>
              </div>
            </div>
            
            <div class="mt-4 p-4 bg-purple-50 rounded-lg">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="flex items-center gap-2">
                  <div [class]="tanda.meetsMinimumMembers ? 'w-2 h-2 bg-green-500 rounded-full' : 'w-2 h-2 bg-red-500 rounded-full'"></div>
                  <span>{{ tanda.meetsMinimumMembers ? '✓' : '✗' }} Mín. 5 miembros</span>
                </div>
                <div class="flex items-center gap-2">
                  <div [class]="tanda.meetsMinimumDuration ? 'w-2 h-2 bg-green-500 rounded-full' : 'w-2 h-2 bg-red-500 rounded-full'"></div>
                  <span>{{ tanda.meetsMinimumDuration ? '✓' : '✗' }} Mín. 1 mes</span>
                </div>
                <div class="flex items-center gap-2">
                  <div [class]="tanda.meetsThreshold ? 'w-2 h-2 bg-green-500 rounded-full' : 'w-2 h-2 bg-red-500 rounded-full'"></div>
                  <span>{{ tanda.meetsThreshold ? '✓' : '✗' }} Umbral 50%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="pendingContracts().length === 0 && pendingTandas().length === 0 && !loading()" class="bg-white p-8 rounded-xl border text-center" style="min-height:160px;display:flex;align-items:center;justify-content:center;">
            <div>
              <p class="text-neutral-100">No hay registros con los filtros seleccionados.</p>
            </div>
          </div>
        </div>

        <!-- Tab: Reglas de Trigger -->
        <div *ngIf="activeTab === 'rules'" class="space-y-4">
          <div *ngFor="let rule of triggerRules()" class="bg-white p-6 rounded-xl shadow-sm border">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="font-semibold text-neutral-100 mb-2">{{ rule.description }}</h3>
                <div class="flex items-center gap-4 mb-2">
                  <span class="px-2 py-1 text-xs font-medium rounded-full"
                        [class]="getFlowBadgeClass(rule.flow)">
                    {{ rule.flow }}
                  </span>
                  <span class="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-100 rounded-full">
                    {{ rule.market }}
                  </span>
                  <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    {{ rule.thresholdPercentage * 100 }}% umbral
                  </span>
                </div>
                <p class="text-sm text-neutral-300">{{ rule.triggerLogic }}</p>
              </div>
              <div class="text-right">
                <div class="w-3 h-3 bg-green-400 rounded-full"></div>
                <span class="text-xs text-neutral-400">Activo</span>
              </div>
            </div>
            
            <div *ngIf="rule.additionalCriteria" class="mt-4 p-3 bg-blue-50 rounded-lg">
              <p class="text-sm font-medium text-blue-900 mb-1">Criterios Adicionales:</p>
              <ul class="text-sm text-blue-800 space-y-1">
                <li *ngIf="rule.additionalCriteria.minimumMembers">• Mínimo {{ rule.additionalCriteria.minimumMembers }} miembros</li>
                <li *ngIf="rule.additionalCriteria.minimumDuration">• Mínimo {{ rule.additionalCriteria.minimumDuration }} mes(es) de duración</li>
                <li *ngIf="rule.additionalCriteria.predictiveAnalysis">• Análisis predictivo activado</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de error (accesible) -->
    <div *ngIf="showErrorModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-xl max-w-md w-full mx-4" role="dialog" aria-modal="true" aria-labelledby="trigger-error-title">
        <h3 id="trigger-error-title" class="text-lg font-semibold text-red-900 mb-4">Error en Trigger</h3>
        <p class="text-neutral-100 mb-4">{{ selectedErrorMessage }}</p>
        <div class="flex justify-end">
          <button
            (click)="showErrorModal = false"
            class="px-4 py-2 bg-neutral-200 text-neutral-100 rounded-lg hover:bg-neutral-300"
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: .5;
      }
    }
  `]
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
    this.router.navigate(['/ops/deliveries', orderId]);
  }

  viewError(event: TriggerEvent) {
    this.selectedErrorMessage = event.errorMessage || 'Error desconocido';
    this.showErrorModal = true;
  }

  // Helpers para UI
  getEventStatusClass(event: TriggerEvent): string {
    if (event.deliveryOrderCreated && !event.errorMessage) {
      return 'w-3 h-3 bg-green-400 rounded-full';
    } else if (event.errorMessage) {
      return 'w-3 h-3 bg-red-400 rounded-full';
    } else {
      return 'w-3 h-3 bg-orange-400 rounded-full';
    }
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
        return 'bg-blue-100 text-blue-800';
      case BusinessFlow.VentaPlazo:
        return 'bg-green-100 text-green-800';
      case BusinessFlow.AhorroProgramado:
        return 'bg-purple-100 text-purple-800';
      case BusinessFlow.CreditoColectivo:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-neutral-100 text-neutral-100';
    }
  }
}
