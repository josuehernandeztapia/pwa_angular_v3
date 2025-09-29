import { Component, OnInit, OnDestroy, Input, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IconComponent } from '../../shared/icon/icon.component';

import { ProtectionStateService } from '../../../services/protection-state.service';
import { ProtectionService } from '../../../services/protection.service';
import { ToastService } from '../../../services/toast.service';
import { 
  ProtectionPlan,
  ProtectionScenario,
  ProtectionType,
  PROTECTION_TYPE_DESCRIPTIONS,
  PROTECTION_STATE_DESCRIPTIONS
} from '../../../models/protection';
import { Client } from '../../../models/types';

@Component({
  selector: 'app-protection-real',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './protection-real.component.html',
  styleUrls: ['./protection-real.component.scss']
})
export class ProtectionRealComponent implements OnInit, OnDestroy {
  @Input() client?: Client;
  @Input() contractId?: string;

  private destroy$ = new Subject<void>();

  // Injected services
  private router = inject(Router);
  private toastService = inject(ToastService);
  
  // State service
  protectionState = inject(ProtectionStateService);

  // Component state
  showDenyModal = false;
  denyReason = '';
  canApprove = false; // This would come from user permissions

  // Computed signals from state service
  currentPlan = this.protectionState.currentPlan;
  statusInfo = this.protectionState.statusInfo;
  eligibilityInfo = this.protectionState.eligibilityInfo;

  constructor() {
    // React to plan changes
    effect(() => {
      const plan = this.currentPlan();
      if (plan) {
      }
    });
  }

  ngOnInit(): void {
    // Load protection plan on init
    if (this.contractId || this.client?.id) {
      const id = this.contractId || `contract-${this.client!.id}`;
      this.protectionState.loadPlan(id);
    }

    // Set up permissions (this would come from auth service)
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Action methods
  checkEligibility(): void {
    if (this.contractId || this.client?.id) {
      const id = this.contractId || `contract-${this.client!.id}`;
      this.protectionState.loadPlan(id);
    }
  }

  simulateScenarios(): void {
    if (this.contractId || this.client?.id) {
      const id = this.contractId || `contract-${this.client!.id}`;
      const currentMonth = 12;
      this.protectionState.simulateScenarios(id, currentMonth, {
        triggerReason: 'Manual request from client'
      });
    }
  }

  selectScenario(scenario: ProtectionScenario): void {
    if (this.contractId || this.client?.id) {
      const id = this.contractId || `contract-${this.client!.id}`;
      this.protectionState.selectScenario(id, scenario, 'Client selection from available options');
    }
  }

  approveScenario(): void {
    if (this.contractId || this.client?.id) {
      const id = this.contractId || `contract-${this.client!.id}`;
      this.protectionState.approveScenario(id, 'admin-user', 'Approved by admin');
    }
  }

  showDenyDialog(): void {
    this.showDenyModal = true;
    this.denyReason = '';
  }

  hideDenyDialog(): void {
    this.showDenyModal = false;
    this.denyReason = '';
  }

  confirmDeny(): void {
    if (!this.denyReason.trim()) {
      this.toastService.error('Debes proporcionar un motivo para el rechazo');
      return;
    }

    if (this.contractId || this.client?.id) {
      const id = this.contractId || `contract-${this.client!.id}`;
      this.protectionState.denyScenario(id, 'admin-user', this.denyReason);
      this.hideDenyDialog();
    }
  }

  signDocument(): void {
    if (this.contractId || this.client?.id) {
      const id = this.contractId || `contract-${this.client!.id}`;
      this.protectionState.signDocument(id);
    }
  }

  viewNewSchedule(): void {
    // Scroll to schedule section
    const scheduleSection = document.querySelector('.schedule-section');
    if (scheduleSection) {
      scheduleSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  performStatusAction(): void {
    const status = this.statusInfo();
    if (!status?.action) return;

    switch (status.action) {
      case 'simulate':
        this.simulateScenarios();
        break;
      case 'sign':
        this.signDocument();
        break;
      case 'view_schedule':
        this.viewNewSchedule();
        break;
      default:
    }
  }

  retryLastAction(): void {
    this.protectionState.clearError();
    const lastAction = this.protectionState.lastAction();
    
    switch (lastAction) {
      case 'loading':
        this.checkEligibility();
        break;
      case 'simulating':
        this.simulateScenarios();
        break;
      default:
        this.checkEligibility();
    }
  }

  // Utility methods
  getLoadingMessage(): string {
    const action = this.protectionState.lastAction();
    switch (action) {
      case 'loading': return 'Cargando plan de protección...';
      case 'simulating': return 'Simulando escenarios de protección...';
      case 'selecting': return 'Seleccionando escenario...';
      case 'approving': return 'Procesando aprobación...';
      case 'signing': return 'Procesando firma...';
      case 'applying': return 'Aplicando cambios al contrato...';
      default: return 'Procesando...';
    }
  }

  isSelectedScenario(scenario: ProtectionScenario): boolean {
    const selected = this.protectionState.selectedScenario();
    return selected?.type === scenario.type;
  }

  getScenarioIcon(type: ProtectionType): string {
    return PROTECTION_TYPE_DESCRIPTIONS[type]?.iconType || 'shield';
  }

  getScenarioTitle(type: ProtectionType): string {
    return PROTECTION_TYPE_DESCRIPTIONS[type]?.title || type;
  }

  getScenarioDescription(type: ProtectionType): string {
    return PROTECTION_TYPE_DESCRIPTIONS[type]?.description || 'Opción de protección';
  }

  getDisplaySchedule(): any[] {
    const schedule = this.currentPlan()?.newPaymentSchedule || [];
    // Show only first 12 months for display
    return schedule.slice(0, 12);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  // TrackBy functions for ngFor performance
  trackScenario(index: number, scenario: ProtectionScenario): string {
    return scenario.type;
  }

  trackPayment(index: number, payment: any): number {
    return payment.month;
  }

  getStatusBadgeStyles(): Record<string, string> {
    const info = this.statusInfo();
    if (!info?.color) {
      return {};
    }
    return {
      'background-color': info.color,
      color: 'var(--color-surface-primary)'
    };
  }

  getScenarioClasses(scenario: ProtectionScenario): Record<string, boolean> {
    return {
      'protection-real__scenario--selected': this.isSelectedScenario(scenario),
      'protection-real__scenario--warning': !scenario.tirOK
    };
  }

  getScenarioBadgeClasses(scenario: ProtectionScenario): Record<string, boolean> {
    return {
      'protection-real__scenario-chip': true,
      'protection-real__scenario-chip--ok': !!scenario.tirOK
    };
  }
}
