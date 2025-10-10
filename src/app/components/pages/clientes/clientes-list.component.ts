import { Component, HostBinding, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { Client, BusinessFlow } from '../../../models/types';
import { IconComponent } from '../../shared/icon/icon.component';
import { FlowContextService } from '../../../services/flow-context.service';
import { RiskEvaluationService } from '../../../services/risk-evaluation.service';
import { RiskEvaluation } from '../../risk-evaluation/risk-panel.component';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, IconComponent],
  templateUrl: './clientes-list.component.html',
  styleUrls: ['./clientes-list.component.scss'],
})
export class ClientesListComponent implements OnInit {
  @HostBinding('class') readonly hostClass = 'clientes-list command-container';
  // Core Data
  clientes: Client[] = [];
  filteredClientes: Client[] = [];
  paginatedClientes: Client[] = [];
  
  // Search & Filters
  searchTerm = '';
  filterMarket = '';
  filterFlow = '';
  filterStatus = '';
  filterHealthScore = '';
  
  // Selection Management
  selectedClientes = new Set<string>();
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  
  // State
  isLoading = true;
  totalClientes = 0;
  private readonly riskFeatureEnabled = environment.features.enableRiskEvaluation === true;
  private riskEvaluations = new Map<string, RiskEvaluation>();

  constructor(
    private apiService: ApiService,
    private toast: ToastService,
    private riskEvaluationService: RiskEvaluationService,
    @Optional() private flowContext?: FlowContextService
  ) {}

  ngOnInit(): void {
    this.flowContext?.setBreadcrumbs(['Dashboard', 'Clientes']);
    this.loadClientes();
  }

  private loadClientes(): void {
    this.isLoading = true;
    
    this.apiService.getClients().subscribe({
      next: (clientes) => {
        this.clientes = clientes;
        this.filteredClientes = [...this.clientes];
        this.totalClientes = this.clientes.length;
        this.hydrateRiskEvaluations(this.clientes);
        this.updatePagination();
        this.isLoading = false;
      },
      error: (error) => {
        this.toast.error('Error al cargar los clientes');
        this.isLoading = false;
      }
    });
  }


  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredClientes = this.clientes.filter(cliente => {
      // Search filter
      const matchesSearch = !this.searchTerm || 
        cliente.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (cliente.email && cliente.email.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (cliente.phone && cliente.phone.includes(this.searchTerm));
      
      // Basic filters
      const matchesMarket = !this.filterMarket || cliente.market === this.filterMarket;
      const matchesFlow = !this.filterFlow || cliente.flow === this.filterFlow;
      const matchesStatus = !this.filterStatus || cliente.status === this.filterStatus;
      
      // Health Score filter
      const matchesHealthScore = !this.filterHealthScore || this.matchesHealthScoreFilter(cliente, this.filterHealthScore);

      return matchesSearch && matchesMarket && matchesFlow && matchesStatus && matchesHealthScore;
    });
    
    // Reset to first page when filters change
    this.currentPage = 1;
    this.updatePagination();
  }

  private matchesHealthScoreFilter(cliente: Client, filter: string): boolean {
    const score = cliente.healthScore;
    if (score === undefined) return filter === 'critical'; // Clients without score are considered critical
    
    switch (filter) {
      case 'critical': return score < 40;
      case 'poor': return score >= 40 && score < 60;
      case 'good': return score >= 60 && score < 80;
      case 'excellent': return score >= 80;
      default: return true;
    }
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredClientes.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedClientes = this.filteredClientes.slice(startIndex, endIndex);
    
    // Clear selection if clients are no longer visible
    this.selectedClientes.forEach(clientId => {
      if (!this.paginatedClientes.some(c => c.id === clientId)) {
        // Keep selection, but user should be aware
      }
    });
  }

  trackByClientId(index: number, cliente: Client): string {
    return cliente.id;
  }

  getClientInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getCardClasses(cliente: Client): Record<string, boolean> {
    return {
      'clientes-list__card': true,
      'clientes-list__card--selected': this.selectedClientes.has(cliente.id)
    };
  }

  getStatusClasses(status: string): Record<string, boolean> {
    const normalized = status.toLowerCase();
    return {
      'clientes-list__status-badge': true,
      'clientes-list__status-badge--active': normalized === 'activo',
      'clientes-list__status-badge--pending': normalized === 'pendiente' || normalized === 'en expediente',
      'clientes-list__status-badge--risk': normalized === 'en riesgo' || normalized === 'documentos incompletos',
      'clientes-list__status-badge--inactive': normalized === 'inactivo'
    };
  }

  getMarketName(market: string): string {
    switch (market) {
      case 'aguascalientes': return 'Aguascalientes';
      case 'edomex': return 'Estado de México';
      default: return market;
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'No registrado';
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  // === STRATEGIC FILTER METHODS ===
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterMarket || this.filterFlow || this.filterStatus || this.filterHealthScore);
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.filterMarket = '';
    this.filterFlow = '';
    this.filterStatus = '';
    this.filterHealthScore = '';
    this.applyFilters();
  }

  getHealthScoreLabel(filter: string): string {
    const labels: Record<string, string> = {
      'critical': 'Crítico (< 40)',
      'poor': 'Regular (40-59)',
      'good': 'Bueno (60-79)',
      'excellent': 'Excelente (80+)'
    };
    return labels[filter] || filter;
  }

  // === HEALTH SCORE & STRATEGIC INDICATORS ===
  private getHealthScoreLevel(score: number | undefined): 'excellent' | 'good' | 'poor' | 'critical' | 'unknown' {
    if (score === undefined) return 'unknown';
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  getAvatarClasses(score: number | undefined): Record<string, boolean> {
    const level = this.getHealthScoreLevel(score);
    return {
      'clientes-list__avatar': true,
      [`clientes-list__avatar--${level}`]: true
    };
  }

  getScoreValueClasses(score: number | undefined): Record<string, boolean> {
    const level = this.getHealthScoreLevel(score);
    return {
      'clientes-list__score-value': true,
      [`clientes-list__score-value--${level}`]: true
    };
  }

  private hydrateRiskEvaluations(clientes: Client[]): void {
    if (!this.riskFeatureEnabled || clientes.length === 0) {
      return;
    }

    const evaluationRequests = clientes.map(cliente =>
      this.riskEvaluationService.getEvaluationHistory(cliente.id).pipe(
        map(history => ({ clientId: cliente.id, evaluation: history[0] ?? null })),
        catchError(() => of({ clientId: cliente.id, evaluation: null }))
      )
    );

    forkJoin(evaluationRequests).subscribe(results => {
      let updated = false;
      results.forEach(result => {
        if (result.evaluation) {
          this.riskEvaluations.set(result.clientId, result.evaluation);
          updated = true;
        }
      });

      if (updated) {
        this.paginatedClientes = [...this.paginatedClientes];
      }
    });
  }

  private getRiskEvaluation(cliente: Client): RiskEvaluation | null {
    return this.riskEvaluations.get(cliente.id) ?? null;
  }

  getRiskBadge(cliente: Client): string | null {
    const evaluation = this.getRiskEvaluation(cliente);
    if (!evaluation) {
      return null;
    }

    const decisionLabelMap: Record<RiskEvaluation['decision'], string> = {
      GO: 'GO',
      REVIEW: 'Revision',
      'NO-GO': 'No-Go'
    };

    const categoryLabelMap: Record<RiskEvaluation['riskCategory'], string> = {
      BAJO: 'bajo',
      MEDIO: 'medio',
      ALTO: 'alto',
      CRITICO: 'critico'
    };

    return `${decisionLabelMap[evaluation.decision]} · Riesgo ${categoryLabelMap[evaluation.riskCategory]}`;
  }

  getRiskIndicatorClasses(cliente: Client): Record<string, boolean> {
    const evaluation = this.getRiskEvaluation(cliente);
    const baseClasses: Record<string, boolean> = {
      'clientes-list__indicator': true,
      'clientes-list__indicator--risk': true
    };

    if (!evaluation) {
      return baseClasses;
    }

    const normalized = evaluation.riskCategory.toLowerCase();
    return {
      ...baseClasses,
      [`clientes-list__indicator--risk-${normalized}`]: true
    };
  }

  isClientUrgent(cliente: Client): boolean {
    const evaluation = this.getRiskEvaluation(cliente);
    if (evaluation) {
      return evaluation.decision === 'NO-GO' || evaluation.riskCategory === 'CRITICO';
    }

    return (cliente.healthScore !== undefined && cliente.healthScore < 40) ||
           cliente.status === 'En Riesgo' ||
           cliente.status === 'Documentos Incompletos';
  }

  isHighValueClient(cliente: Client): boolean {
    const evaluation = this.getRiskEvaluation(cliente);
    if (evaluation) {
      return evaluation.decision === 'GO' && evaluation.scoreBreakdown.finalScore >= 80;
    }

    return (cliente.healthScore !== undefined && cliente.healthScore >= 90) &&
           cliente.status === 'Activo';
  }

  isAtRisk(cliente: Client): boolean {
    const evaluation = this.getRiskEvaluation(cliente);
    if (evaluation) {
      return evaluation.decision === 'NO-GO' ||
             evaluation.decision === 'REVIEW' ||
             evaluation.riskCategory === 'ALTO' ||
             evaluation.riskCategory === 'CRITICO';
    }

    return (cliente.healthScore !== undefined && cliente.healthScore < 60) ||
           cliente.status === 'En Riesgo';
  }
  
  hasProtectionAvailable(cliente: Client): boolean {
    const flowsWithProtection = new Set<BusinessFlow>([
      BusinessFlow.VentaPlazo,
      BusinessFlow.AhorroProgramado,
      BusinessFlow.CreditoColectivo,
    ]);

    return flowsWithProtection.has(cliente.flow);
  }

  // === SELECTION MANAGEMENT ===
  get allSelected(): boolean {
    return this.paginatedClientes.length > 0 && 
           this.paginatedClientes.every(cliente => this.selectedClientes.has(cliente.id));
  }

  get someSelected(): boolean {
    return this.paginatedClientes.some(cliente => this.selectedClientes.has(cliente.id));
  }

  toggleSelectAll(): void {
    if (this.allSelected) {
      // Deselect all visible
      this.paginatedClientes.forEach(cliente => {
        this.selectedClientes.delete(cliente.id);
      });
    } else {
      // Select all visible
      this.paginatedClientes.forEach(cliente => {
        this.selectedClientes.add(cliente.id);
      });
    }
  }

  toggleClientSelection(clientId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.selectedClientes.has(clientId)) {
      this.selectedClientes.delete(clientId);
    } else {
      this.selectedClientes.add(clientId);
    }
  }

  clearSelection(): void {
    this.selectedClientes.clear();
  }

  // === PAGINATION METHODS ===
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getDisplayRange(): string {
    if (this.filteredClientes.length === 0) return '0';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.filteredClientes.length);
    return `${start}-${end}`;
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      pages.push(1);
      
      if (current > 4) {
        pages.push('...');
      }
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < total - 3) {
        pages.push('...');
      }
      
      pages.push(total);
    }
    
    return pages;
  }

  // === EXPORT FUNCTIONALITY ===
  exportSelected(): void {
    if (this.selectedClientes.size === 0) {
      this.toast.error('Selecciona al menos un cliente para exportar');
      return;
    }
    
    const selectedClientsData = this.clientes.filter(cliente => 
      this.selectedClientes.has(cliente.id)
    );
    
    this.exportToCSV(selectedClientsData);
  }

  private exportToCSV(clientes: Client[]): void {
    const headers = [
      'Nombre',
      'Email', 
      'Teléfono',
      'Estado',
      'Health Score',
      'Mercado',
      'Producto',
      'Fecha Creación'
    ];
    
    const csvData = [
      headers.join(','),
      ...clientes.map(cliente => [
        `"${cliente.name}"`,
        `"${cliente.email || ''}"`,
        `"${cliente.phone || ''}"`,
        `"${cliente.status}"`,
        cliente.healthScore?.toString() || '',
        `"${this.getMarketName(cliente.market || '')}"`,
        `"${cliente.flow}"`,
        cliente.createdAt ? this.formatDate(cliente.createdAt) : ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toast.success(`${clientes.length} clientes exportados exitosamente`);
  }

  // === QUICK ACTIONS ===
  callClient(cliente: Client): void {
    if (cliente.phone) {
      window.open(`tel:${cliente.phone}`, '_self');
    } else {
      this.toast.error('Este cliente no tiene teléfono registrado');
    }
  }

  emailClient(cliente: Client): void {
    if (cliente.email) {
      window.open(`mailto:${cliente.email}?subject=Seguimiento Conductores PWA`, '_self');
    } else {
      this.toast.error('Este cliente no tiene email registrado');
    }
  }

  viewClientDetails(clientId: string): void {
    // Navigation handled by routerLink
  }
}
