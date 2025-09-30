import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

import { FlowContextEntry, FlowContextService } from '../../../services/flow-context.service';
import { ErrorBoundaryService, BoundaryIssue } from '../../../services/error-boundary.service';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';
import { BusinessFlow, Market } from '../../../models/types';
import { ProtectionScenario } from '../../../models/protection';
import { DeliveryStatus } from '../../../models/deliveries';
import { OfflineService } from '../../../services/offline.service';
import { ToastService } from '../../../services/toast.service';
import { ContractContextSnapshot } from '../../../models/contract-context';
import { MarketPolicyService, MarketPolicyContext, MarketPolicyMetadata } from '../../../services/market-policy.service';

interface ContextSummaryMeta {
  label: string;
  value: string;
}

interface ContextSummaryAction {
  id: string;
  label: string;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

interface ContextSummary {
  key: string;
  title: string;
  icon: string;
  meta: ContextSummaryMeta[];
  statusLabel?: string;
  statusAccent?: 'info' | 'warning' | 'success' | 'danger';
  updatedAt: string;
  issues: BoundaryIssue[];
  actions?: ContextSummaryAction[];
  raw?: any;
}

interface DocumentFlowContextState {
  flowContext: {
    clientId?: string;
    clientName?: string;
    businessFlow: BusinessFlow;
    market: 'aguascalientes' | 'edomex';
    clientType: 'individual' | 'colectivo';
    contract?: {
      status?: 'pending' | 'ready' | 'blocked';
      lastUpdated?: number;
    };
  };
  completionStatus: {
    totalDocs: number;
    completedDocs: number;
    pendingDocs: number;
    completionPercentage: number;
    allComplete: boolean;
  };
  contractContext?: ContractContextSnapshot;
  policyContext?: MarketPolicyContext;
  policyMetadata?: MarketPolicyMetadata;
}

interface CotizadorContextSnapshot {
  market?: 'aguascalientes' | 'edomex';
  clientType?: 'individual' | 'colectivo';
  downPaymentPercentage?: number;
  downPaymentAmountDirect?: string;
  term?: number;
  includeInsurance?: boolean;
  clientId?: string;
  clientName?: string;
}

interface OnboardingSnapshot {
  form?: {
    market?: 'aguascalientes' | 'edomex';
    clientType?: 'individual' | 'colectivo';
    saleType?: 'contado' | 'financiero';
  };
  currentStep?: string;
  currentStepIndex?: number;
  steps?: Array<{ id: string; label: string }>;
  currentClient?: { id?: string; name?: string } | null;
  aviDecision?: 'GO' | 'REVIEW' | 'NO_GO' | null;
  aviScore?: number | null;
}

interface ProtectionContextSnapshot {
  form?: any;
  scenarios?: ProtectionScenario[];
  cobertura?: string;
  healthScore?: number;
  lastUpdated?: number;
}

interface DeliveriesContextSnapshot {
  selectedMarket?: Market | '';
  selectedRoute?: string;
  clientSearch?: string;
  selectedStatus?: DeliveryStatus | '';
  currentPage?: number;
  pageSize?: number;
  timestamp?: number;
}

@Component({
  selector: 'app-context-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './context-panel.component.html',
  styleUrls: ['./context-panel.component.scss']
})
export class ContextPanelComponent {
  @Input() keys: string[] = [];

  private readonly actionState$ = new BehaviorSubject<number>(0);

  readonly summaries$: Observable<ContextSummary[]> = combineLatest([
    this.flowContext.contexts$,
    this.errorBoundary.issues$,
    this.actionState$
  ]).pipe(
    map(([entries, issues]) => this.buildSummaries(entries, issues))
  );

  constructor(
    private readonly flowContext: FlowContextService,
    private readonly errorBoundary: ErrorBoundaryService,
    private readonly offline: OfflineService,
    private readonly toast: ToastService,
    private readonly marketPolicy: MarketPolicyService
  ) {}

  retryIssue(id: string): void {
    this.errorBoundary.retryIssue(id);
  }

  executeIssueAction(issueId: string, actionId: string): void {
    this.errorBoundary.executeAction(issueId, actionId);
  }

  executeSummaryAction(summary: ContextSummary, action: ContextSummaryAction): void {
    if (action.disabled) {
      return;
    }

    switch (summary.key) {
      case 'documentos':
        this.handleDocumentAction(action.id, summary.raw as DocumentFlowContextState | undefined);
        break;
      default:
        break;
    }
  }

  getIconName(icon: string): IconName {
    const iconMap: Record<string, IconName> = {
      document: 'document',
      calculator: 'calculator',
      users: 'users',
      user: 'user',
      home: 'home',
      settings: 'settings',
      search: 'search',
      package: 'package',
      calendar: 'calendar',
      check: 'check',
      factory: 'factory',
      ship: 'ship',
      store: 'store',
      keyboard: 'keyboard',
      x: 'x',
      shield: 'shield',
      truck: 'truck'
    };

    return iconMap[icon] || 'document';
  }

  private buildSummaries(entries: FlowContextEntry<any>[], issues: BoundaryIssue[]): ContextSummary[] {
    const relevantEntries = this.keys.length ? entries.filter(entry => this.keys.includes(entry.key)) : entries;

    return relevantEntries
      .map(entry => this.mapEntry(entry, issues))
      .filter((summary): summary is ContextSummary => summary !== null);
  }

  private mapEntry(entry: FlowContextEntry<any>, issues: BoundaryIssue[]): ContextSummary | null {
    switch (entry.key) {
      case 'documentos':
        return this.mapDocumentContext(entry, issues);
      case 'cotizador':
        return this.mapCotizadorContext(entry, issues);
      case 'onboarding-wizard':
        return this.mapOnboardingContext(entry, issues);
      case 'proteccion':
        return this.mapProtectionContext(entry, issues);
      case 'entregas':
        return this.mapDeliveriesContext(entry, issues);
      default:
        return null;
    }
  }

  private mapDocumentContext(entry: FlowContextEntry<any>, issues: BoundaryIssue[]): ContextSummary | null {
    const data = entry.data as DocumentFlowContextState | undefined;
    if (!data || !data.flowContext) {
      return null;
    }

    const completion = data.completionStatus;
    const fc = data.flowContext;

    const contract = data.contractContext;
    const inferredStatus = contract ? this.deriveStatus(contract) : undefined;
    const status = fc.contract?.status ?? inferredStatus;

    const completed = completion.completedDocs ?? 0;
    const total = completion.totalDocs ?? 0;
    const pending = completion.pendingDocs ?? Math.max(total - completed, 0);
    const percentage = Math.round(completion.completionPercentage || 0);

    const meta: ContextSummaryMeta[] = [
      { label: 'Cliente', value: fc.clientName || fc.clientId || 'Sin asignar' },
      { label: 'Flujo', value: this.formatBusinessFlow(fc.businessFlow) },
      { label: 'Documentos', value: `${completed}/${total} completados (${percentage}%)` }
    ];

    if (contract) {
      meta.push({ label: 'Pendientes offline', value: String(contract.pendingOfflineRequests) });
      const aviLabel = contract.aviDecision ? contract.aviDecision.toUpperCase() : contract.aviStatus ?? 'Sin ejecutar';
      meta.push({ label: 'AVI', value: aviLabel });

      if (contract.protectionRequired) {
        meta.push({ label: 'Protección', value: contract.protectionApplied ? 'Aplicada' : 'Pendiente' });
      }
    }

    if (data.policyContext) {
      meta.push({ label: 'Mercado policy', value: this.formatMarket(data.policyContext.market) });
      meta.push({ label: 'Tipo policy', value: this.formatClientType(data.policyContext.clientType) });
    }

    if (data.policyMetadata?.ocrThreshold != null) {
      meta.push({ label: 'OCR threshold', value: (data.policyMetadata.ocrThreshold * 100).toFixed(0) + '%' });
    }

    const remoteUpdatedAt = this.marketPolicy.getRemoteConfigUpdatedAt();
    if (remoteUpdatedAt) {
      meta.push({ label: 'Política actualizada', value: this.formatRelativeTime(remoteUpdatedAt) });
    }

    const contextIssues = issues.filter(issue => {
      if (issue.context?.module !== 'documentos') {
        return false;
      }
      if (!issue.context?.clientId || !fc.clientId) {
        return true;
      }
      return issue.context.clientId === fc.clientId;
    });

    const summary: ContextSummary = {
      key: entry.key,
      title: 'Documentos',
      icon: 'document',
      meta,
      statusLabel: this.buildContractStatusLabel(status) ?? this.buildDocumentStatusLabel(completion, pending),
      statusAccent: this.buildDocumentStatusAccent(completion, pending, status),
      updatedAt: this.formatRelativeTime(entry.timestamp),
      issues: contextIssues,
      raw: data
    };

    if (contract) {
      summary.actions = this.buildDocumentActions(contract);
    }

    return summary;
  }

  private buildDocumentStatusLabel(completion: DocumentFlowContextState['completionStatus'], pending: number): string {
    if (completion.allComplete && pending === 0) {
      return 'Carga completa';
    }

    if (pending > 0) {
      return `${pending} documento(s) pendiente(s)`;
    }

    return 'En progreso';
  }

  private buildDocumentStatusAccent(
    completion: DocumentFlowContextState['completionStatus'],
    pending: number,
    status?: 'pending' | 'ready' | 'blocked'
  ): 'info' | 'warning' | 'success' | 'danger' {
    if (status === 'blocked') {
      return 'danger';
    }

    if (status === 'ready') {
      return 'success';
    }

    if (completion.allComplete && pending === 0) {
      return 'success';
    }

    if (pending > 0) {
      return 'warning';
    }

    return 'info';
  }

  private buildContractStatusLabel(status?: 'pending' | 'ready' | 'blocked'): string | undefined {
    if (!status) {
      return undefined;
    }

    switch (status) {
      case 'ready':
        return 'Listo para contrato';
      case 'blocked':
        return 'Bloqueado';
      case 'pending':
      default:
        return 'En progreso';
    }
  }

  private buildContractStatusAccent(status?: 'pending' | 'ready' | 'blocked'): 'info' | 'warning' | 'success' | 'danger' | undefined {
    if (!status) {
      return undefined;
    }

    switch (status) {
      case 'ready':
        return 'success';
      case 'blocked':
        return 'danger';
      case 'pending':
      default:
        return 'warning';
    }
  }

  private buildDocumentActions(contract: ContractContextSnapshot): ContextSummaryAction[] {
    const actions: ContextSummaryAction[] = [];

    const flushBusy = this.isActionBusy('documentos', 'flush-offline-queue');
    const clearBusy = this.isActionBusy('documentos', 'clear-offline-queue');

    actions.push({
      id: 'flush-offline-queue',
      label: contract.pendingOfflineRequests > 0
        ? `Procesar cola (${contract.pendingOfflineRequests})`
        : 'Procesar cola',
      kind: 'primary',
      disabled: flushBusy || contract.pendingOfflineRequests === 0
    });

    actions.push({
      id: 'clear-offline-queue',
      label: 'Descartar pendientes',
      kind: 'secondary',
      disabled: clearBusy || contract.pendingOfflineRequests === 0
    });

    actions.push({
      id: 'reload-market-policies',
      label: 'Refrescar políticas',
      kind: 'secondary',
      disabled: this.isActionBusy('documentos', 'reload-market-policies')
    });

    return actions;
  }

  private mapCotizadorContext(entry: FlowContextEntry<any>, issues: BoundaryIssue[]): ContextSummary | null {
    const snapshot = entry.data as CotizadorContextSnapshot | undefined;
    if (!snapshot) {
      return null;
    }

    const meta: ContextSummaryMeta[] = [
      { label: 'Cliente', value: snapshot.clientName || snapshot.clientId || 'Sin asignar' },
      { label: 'Mercado', value: this.formatMarket(snapshot.market) },
      { label: 'Tipo de cliente', value: this.formatClientType(snapshot.clientType) }
    ];

    if (snapshot.downPaymentPercentage !== undefined) {
      meta.push({ label: 'Enganche', value: `${snapshot.downPaymentPercentage}%` });
    } else if (snapshot.downPaymentAmountDirect) {
      meta.push({ label: 'Enganche', value: snapshot.downPaymentAmountDirect });
    }

    if (snapshot.term) {
      meta.push({ label: 'Plazo', value: `${snapshot.term} meses` });
    }

    const contextIssues = issues.filter(issue => issue.context?.module === 'cotizador');

    return {
      key: entry.key,
      title: 'Cotizador',
      icon: 'calculator',
      meta,
      statusLabel: snapshot.includeInsurance ? 'Incluye seguro' : undefined,
      statusAccent: snapshot.includeInsurance ? 'info' : undefined,
      updatedAt: this.formatRelativeTime(entry.timestamp),
      issues: contextIssues
    };
  }

  private mapOnboardingContext(entry: FlowContextEntry<any>, issues: BoundaryIssue[]): ContextSummary | null {
    const snapshot = entry.data as OnboardingSnapshot | undefined;
    if (!snapshot) {
      return null;
    }

    const stepLabel = snapshot.steps?.[snapshot.currentStepIndex ?? 0]?.label || this.formatStepId(snapshot.currentStep);
    const form = snapshot.form ?? {};

    const meta: ContextSummaryMeta[] = [
      { label: 'Paso actual', value: stepLabel ?? 'Sin paso' },
      { label: 'Mercado', value: this.formatMarket(form.market as any) },
      { label: 'Tipo de cliente', value: this.formatClientType(form.clientType as any) }
    ];

    if (snapshot.aviDecision) {
      meta.push({
        label: 'AVI',
        value: this.formatAviDecision(snapshot.aviDecision, snapshot.aviScore)
      });
    }

    const contextIssues = issues.filter(issue => issue.context?.module === 'onboarding');

    const statusLabel = snapshot.aviDecision ? this.formatAviDecision(snapshot.aviDecision, snapshot.aviScore) : undefined;
    const statusAccent = snapshot.aviDecision ? this.getAviAccent(snapshot.aviDecision) : undefined;

    return {
      key: entry.key,
      title: 'Onboarding',
      icon: 'users',
      meta,
      statusLabel,
      statusAccent,
      updatedAt: this.formatRelativeTime(entry.timestamp),
      issues: contextIssues
    };
  }

  private mapProtectionContext(entry: FlowContextEntry<any>, issues: BoundaryIssue[]): ContextSummary | null {
    const snapshot = entry.data as ProtectionContextSnapshot | undefined;
    if (!snapshot) {
      return null;
    }

    const form = snapshot.form ?? {};
    const meta: ContextSummaryMeta[] = [
      { label: 'Cobertura', value: snapshot.cobertura ?? 'Sin definir' },
      { label: 'Salud', value: this.formatHealthScore(snapshot.healthScore) },
      { label: 'Escenarios', value: `${snapshot.scenarios?.length ?? 0} generados` }
    ];

    if (form.currentBalance) {
      meta.push({ label: 'Saldo actual', value: this.formatCurrency(form.currentBalance) });
    }
    if (form.remainingTerm) {
      meta.push({ label: 'Plazo restante', value: `${form.remainingTerm} meses` });
    }

    const contextIssues = issues.filter(issue => issue.context?.module === 'proteccion');
    const statusAccent = this.getHealthAccent(snapshot.healthScore);

    return {
      key: entry.key,
      title: 'Protección',
      icon: 'shield',
      meta,
      statusLabel: meta[1]?.value,
      statusAccent,
      updatedAt: this.formatRelativeTime(snapshot.lastUpdated ?? entry.timestamp),
      issues: contextIssues
    };
  }

  private mapDeliveriesContext(entry: FlowContextEntry<any>, issues: BoundaryIssue[]): ContextSummary | null {
    const snapshot = entry.data as DeliveriesContextSnapshot | undefined;
    if (!snapshot) {
      return null;
    }

    const meta: ContextSummaryMeta[] = [
      { label: 'Mercado', value: this.formatOpsMarket(snapshot.selectedMarket) },
      { label: 'Ruta', value: snapshot.selectedRoute ? snapshot.selectedRoute : 'Todas' },
      { label: 'Estado', value: this.formatDeliveryStatus(snapshot.selectedStatus) },
      { label: 'Búsqueda', value: snapshot.clientSearch ? `“${snapshot.clientSearch}”` : 'Sin filtro' },
      { label: 'Página', value: `${snapshot.currentPage ?? 1}/${snapshot.pageSize ?? 20}` }
    ];

    const filtersActive = !!(snapshot.selectedMarket || snapshot.selectedRoute || snapshot.selectedStatus || snapshot.clientSearch);
    const contextIssues = issues.filter(issue => issue.context?.module === 'entregas');

    return {
      key: entry.key,
      title: 'Entregas',
      icon: 'truck',
      meta,
      statusLabel: filtersActive ? 'Filtros activos' : undefined,
      statusAccent: filtersActive ? 'info' : undefined,
      updatedAt: this.formatRelativeTime(snapshot.timestamp ?? entry.timestamp),
      issues: contextIssues
    };
  }

  private formatRelativeTime(timestamp: number): string {
    const delta = Date.now() - timestamp;
    if (delta < 60_000) {
      return 'Hace instantes';
    }
    const minutes = Math.round(delta / 60_000);
    if (minutes < 60) {
      return `Hace ${minutes} min`;
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `Hace ${hours} h`;
    }
    const days = Math.round(hours / 24);
    return `Hace ${days} d`;
  }

  private formatMarket(market?: 'aguascalientes' | 'edomex' | 'otros' | '' | null): string {
    switch (market) {
      case 'aguascalientes':
        return 'Aguascalientes';
      case 'edomex':
        return 'Estado de México';
      case 'otros':
        return 'Otros';
      default:
        return 'No definido';
    }
  }

  private formatOpsMarket(market?: Market | '' | null): string {
    switch (market) {
      case 'aguascalientes':
        return 'Aguascalientes';
      case 'edomex':
        return 'Estado de México';
      default:
        return 'Todos';
    }
  }

  private formatClientType(type?: 'individual' | 'colectivo' | '' | null): string {
    switch (type) {
      case 'colectivo':
        return 'Crédito Colectivo';
      case 'individual':
        return 'Individual';
      default:
        return 'Sin definir';
    }
  }

  private formatAviDecision(decision?: 'GO' | 'REVIEW' | 'NO_GO' | null, score?: number | null): string {
    switch (decision) {
      case 'GO':
        return score != null ? `GO • ${this.formatScore(score)}` : 'GO';
      case 'REVIEW':
        return score != null ? `REVIEW • ${this.formatScore(score)}` : 'REVIEW';
      case 'NO_GO':
        return score != null ? `NO-GO • ${this.formatScore(score)}` : 'NO-GO';
      default:
        return 'Pendiente';
    }
  }

  private getAviAccent(decision?: 'GO' | 'REVIEW' | 'NO_GO' | null): 'success' | 'warning' | 'danger' | undefined {
    switch (decision) {
      case 'GO':
        return 'success';
      case 'NO_GO':
        return 'danger';
      case 'REVIEW':
        return 'warning';
      default:
        return undefined;
    }
  }

  private formatScore(score: number): string {
    const normalized = score > 1 ? score : score * 100;
    return `${normalized.toFixed(0)}%`;
  }

  private formatHealthScore(score?: number | null): string {
    if (score == null) {
      return 'Sin datos';
    }
    return `${Math.round(score)}%`;
  }

  private getHealthAccent(score?: number | null): 'success' | 'warning' | 'danger' | undefined {
    if (score == null) {
      return undefined;
    }
    if (score >= 90) {
      return 'success';
    }
    if (score >= 70) {
      return 'warning';
    }
    return 'danger';
  }

  private readonly busyActions = new Set<string>();

  private deriveStatus(contract: ContractContextSnapshot): 'pending' | 'ready' | 'blocked' {
    if (contract.pendingOfflineRequests > 0) {
      return 'pending';
    }
    if (contract.protectionRequired && !contract.protectionApplied) {
      return 'blocked';
    }
    const decision = contract.aviDecision?.toLowerCase();
    if (decision === 'no_go') {
      return 'blocked';
    }
    if (contract.documentsComplete) {
      return 'ready';
    }
    return 'pending';
  }

  private getActionKey(summaryKey: string, actionId: string): string {
    return `${summaryKey}:${actionId}`;
  }

  private isActionBusy(summaryKey: string, actionId: string): boolean {
    return this.busyActions.has(this.getActionKey(summaryKey, actionId));
  }

  private setActionBusy(summaryKey: string, actionId: string, busy: boolean): void {
    const key = this.getActionKey(summaryKey, actionId);
    const hasKey = this.busyActions.has(key);

    if (busy && !hasKey) {
      this.busyActions.add(key);
      this.emitActionState();
    } else if (!busy && hasKey) {
      this.busyActions.delete(key);
      this.emitActionState();
    }
  }

  private emitActionState(): void {
    this.actionState$.next(this.actionState$.value + 1);
  }

  private handleDocumentAction(actionId: string, data?: DocumentFlowContextState): void {
    const contract = data?.contractContext;
    if (!contract) {
      return;
    }

    switch (actionId) {
      case 'flush-offline-queue': {
        if (contract.pendingOfflineRequests === 0) {
          return;
        }
        this.setActionBusy('documentos', actionId, true);
        this.offline.flushQueueNow()
          .then(() => this.toast.success('Procesando cola offline…'))
          .catch(error => this.toast.error(`No se pudo procesar la cola: ${error instanceof Error ? error.message : error}`))
          .finally(() => this.setActionBusy('documentos', actionId, false));
        break;
      }
      case 'clear-offline-queue': {
        if (contract.pendingOfflineRequests === 0) {
          return;
        }
        this.setActionBusy('documentos', actionId, true);
        try {
          this.offline.clearPendingRequests('manual');
          this.toast.info('Solicitudes en cola descartadas.');
        } finally {
          this.setActionBusy('documentos', actionId, false);
        }
        break;
      }
      case 'reload-market-policies': {
        this.setActionBusy('documentos', actionId, true);
        this.marketPolicy.reloadRemotePolicies()
          .then(() => this.toast.success('Políticas de mercado actualizadas.'))
          .catch(error => this.toast.error('No se pudo recargar políticas: ' + (error instanceof Error ? error.message : String(error))))
          .finally(() => this.setActionBusy('documentos', actionId, false));
        break;
      }
      default:
        break;
    }
  }

  private formatDeliveryStatus(status?: DeliveryStatus | '' | null): string {
    if (!status) {
      return 'Todos';
    }
    return status.replace(/_/g, ' ').toLowerCase();
  }

  private formatBusinessFlow(flow: BusinessFlow): string {
    switch (flow) {
      case BusinessFlow.VentaPlazo:
        return 'Venta a Plazo';
      case BusinessFlow.VentaDirecta:
        return 'Venta Directa';
      case BusinessFlow.CreditoColectivo:
        return 'Crédito Colectivo';
      case BusinessFlow.AhorroProgramado:
        return 'Plan de Ahorro';
      default:
        return flow;
    }
  }

  private formatStepId(step?: string): string {
    switch (step) {
      case 'selection':
        return 'Configuración';
      case 'client_info':
        return 'Información del Cliente';
      case 'documents':
        return 'Documentos';
      case 'kyc':
        return 'KYC';
      case 'contracts':
        return 'Contratos';
      case 'completed':
        return 'Completado';
      default:
        return 'Sin paso';
    }
  }

  private formatCurrency(amount: number): string {
    if (!Number.isFinite(amount)) {
      return '—';
    }
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  }
}
