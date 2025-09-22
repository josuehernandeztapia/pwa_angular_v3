import { Component, OnInit, OnDestroy, Input, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="protection-container">
      <!-- Header Section -->
      <div class="protection-header">
        <div class="header-content">
          <h2 class="protection-title">
            🛡️ Sistema de Protección Conductores
          </h2>
          <p class="protection-subtitle" *ngIf="client">
            Gestión de protección para {{ client.name }}
          </p>
        </div>
        
        <!-- Status Badge -->
        <div class="status-section" *ngIf="statusInfo()">
          <div class="status-badge" [class]="'status-' + statusInfo()!.color.replace('#', '')">
            <span class="status-icon">{{ statusInfo()!.icon }}</span>
            <span class="status-text">{{ statusInfo()!.title }}</span>
          </div>
          <p class="status-description">{{ statusInfo()!.message }}</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="protectionState.loading()" class="loading-section">
        <div class="loading-spinner"></div>
        <p>{{ getLoadingMessage() }}</p>
      </div>

      <!-- Error State -->
      <div *ngIf="protectionState.error()" class="error-section">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <div class="error-text">
            <h4>Error en Protección</h4>
            <p>{{ protectionState.error() }}</p>
          </div>
          <button class="btn-retry" (click)="retryLastAction()">
            Reintentar
          </button>
        </div>
      </div>

      <!-- No Plan State (First Time) -->
      <div *ngIf="!protectionState.hasActivePlan() && !protectionState.loading() && !protectionState.error()" 
           class="no-plan-section">
        <div class="no-plan-content">
          <div class="no-plan-icon">🛡️</div>
          <h3>Protección No Activada</h3>
          <p>Este contrato no tiene un plan de protección activo o no es elegible.</p>
          <button class="btn-check-eligibility" (click)="checkEligibility()" [disabled]="protectionState.loading()">
            Verificar Elegibilidad
          </button>
        </div>
      </div>

      <!-- Main Protection Dashboard -->
      <div *ngIf="protectionState.hasActivePlan() && !protectionState.loading()" class="protection-dashboard">
        
        <!-- Eligibility Banner (if eligible) -->
        <div *ngIf="protectionState.isEligible()" class="eligibility-banner">
          <div class="banner-content">
            <span class="banner-icon">🚨</span>
            <div class="banner-text">
              <h4>¡Protección Disponible!</h4>
              <p>{{ eligibilityInfo()?.reason || 'Puedes activar tu protección ahora' }}</p>
            </div>
            <button class="btn-simulate" (click)="simulateScenarios()" [disabled]="protectionState.simulatingScenarios()">
              {{ protectionState.simulatingScenarios() ? 'Simulando...' : 'Ver Opciones' }}
            </button>
          </div>
        </div>

        <!-- Current Plan Info -->
        <div class="plan-info-section">
          <h3>📊 Estado del Plan</h3>
          <div class="plan-grid">
            <div class="plan-card">
              <div class="card-header">
                <span class="card-icon">📈</span>
                <h4>Estado Actual</h4>
              </div>
              <div class="card-content">
                <div class="state-info">
                  <span class="state-badge" [style.background-color]="statusInfo()?.color">
                    {{ protectionState.currentState() }}
                  </span>
                  <p>{{ statusInfo()?.description }}</p>
                </div>
              </div>
            </div>

            <div class="plan-card">
              <div class="card-header">
                <span class="card-icon">🔄</span>
                <h4>Uso Anual</h4>
              </div>
              <div class="card-content">
                <div class="usage-info" *ngIf="currentPlan()">
                  <div class="usage-item">
                    <span>Diferimientos:</span>
                    <span>{{ currentPlan()!.used.defer }}/{{ currentPlan()!.policy.difMax }}</span>
                  </div>
                  <div class="usage-item">
                    <span>Reducciones:</span>
                    <span>{{ currentPlan()!.used.stepdown }}/3</span>
                  </div>
                  <div class="usage-item">
                    <span>Recalendarizaciones:</span>
                    <span>{{ currentPlan()!.used.recalendar }}/2</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="plan-card">
              <div class="card-header">
                <span class="card-icon">⚙️</span>
                <h4>Políticas</h4>
              </div>
              <div class="card-content">
                <div class="policy-info" *ngIf="currentPlan()">
                  <div class="policy-item">
                    <span>Diferimiento máx:</span>
                    <span>{{ currentPlan()!.policy.difMax }} meses</span>
                  </div>
                  <div class="policy-item">
                    <span>TIR mínima:</span>
                    <span>{{ (currentPlan()!.policy.irrMin * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="policy-item">
                    <span>Pago mínimo:</span>
                    <span>{{ formatCurrency(currentPlan()!.policy.mMin) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Available Scenarios -->
        <div *ngIf="protectionState.availableScenarios().length > 0" class="scenarios-section">
          <h3>🎯 Opciones de Protección Disponibles</h3>
          <div class="scenarios-grid">
            <div *ngFor="let scenario of protectionState.availableScenarios(); trackBy: trackScenario" 
                 class="scenario-card"
                 [class.selected]="isSelectedScenario(scenario)">
              
              <div class="scenario-header">
                <span class="scenario-icon">{{ getScenarioIcon(scenario.type) }}</span>
                <h4>{{ getScenarioTitle(scenario.type) }}</h4>
                <div class="scenario-badge" [class.tir-ok]="scenario.tirOK">
                  {{ scenario.tirOK ? '✅ TIR OK' : '⚠️ TIR Bajo' }}
                </div>
              </div>

              <div class="scenario-content">
                <p class="scenario-description">{{ getScenarioDescription(scenario.type) }}</p>
                
                <div class="scenario-details">
                  <div class="detail-item" *ngIf="scenario.Mprime">
                    <span>Nuevo pago:</span>
                    <span class="value">{{ formatCurrency(scenario.Mprime) }}</span>
                  </div>
                  <div class="detail-item" *ngIf="scenario.nPrime">
                    <span>Nuevo plazo:</span>
                    <span class="value">{{ scenario.nPrime }} meses</span>
                  </div>
                  <div class="detail-item" *ngIf="scenario.balloon">
                    <span>Pago global:</span>
                    <span class="value">{{ formatCurrency(scenario.balloon) }}</span>
                  </div>
                  <div class="detail-item" *ngIf="scenario.irr">
                    <span>TIR:</span>
                    <span class="value">{{ (scenario.irr * 100).toFixed(2) }}%</span>
                  </div>
                </div>

                <div class="scenario-warnings" *ngIf="scenario.warnings && scenario.warnings.length > 0">
                  <div *ngFor="let warning of scenario.warnings" class="warning-item">
                    ⚠️ {{ warning }}
                  </div>
                </div>

                <div class="scenario-actions">
                  <button 
                    class="btn-select-scenario" 
                    (click)="selectScenario(scenario)"
                    [disabled]="!protectionState.canSelect() || !scenario.tirOK"
                    [class.selected]="isSelectedScenario(scenario)">
                    {{ isSelectedScenario(scenario) ? 'Seleccionado' : 'Seleccionar' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Scenario Actions -->
        <div *ngIf="protectionState.selectedScenario()" class="selected-scenario-section">
          <h3>✅ Escenario Seleccionado</h3>
          <div class="selected-scenario-card">
            <div class="selected-header">
              <span class="selected-icon">{{ getScenarioIcon(protectionState.selectedScenario()!.type) }}</span>
              <h4>{{ getScenarioTitle(protectionState.selectedScenario()!.type) }}</h4>
            </div>
            
            <div class="selected-actions">
              <div *ngIf="protectionState.currentState() === 'PENDING_APPROVAL'" class="approval-actions">
                <p>Esperando aprobación administrativa...</p>
                <div class="admin-actions" *ngIf="canApprove">
                  <button class="btn-approve" (click)="approveScenario()">
                    Aprobar
                  </button>
                  <button class="btn-deny" (click)="showDenyDialog()">
                    Denegar
                  </button>
                </div>
              </div>

              <div *ngIf="protectionState.currentState() === 'READY_TO_SIGN'" class="signing-actions">
                <p>✅ Aprobado - Listo para firmar</p>
                <button class="btn-sign" (click)="signDocument()">
                  Firmar Documento
                </button>
              </div>

              <div *ngIf="protectionState.currentState() === 'SIGNED'" class="applying-actions">
                <p>📝 Documento firmado - Aplicando cambios...</p>
                <div class="progress-indicator">
                  <div class="progress-bar">
                    <div class="progress-fill"></div>
                  </div>
                </div>
              </div>

              <div *ngIf="protectionState.currentState() === 'APPLIED'" class="applied-actions">
                <p>🎉 ¡Protección aplicada exitosamente!</p>
                <button class="btn-view-schedule" (click)="viewNewSchedule()">
                  Ver Nuevo Calendario de Pagos
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Schedule (if applied) -->
        <div *ngIf="currentPlan()?.newPaymentSchedule" class="schedule-section">
          <h3>📅 Nuevo Calendario de Pagos</h3>
          <div class="schedule-table-container">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Pago</th>
                  <th>Capital</th>
                  <th>Interés</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let payment of getDisplaySchedule(); trackBy: trackPayment">
                  <td>{{ payment.month }}</td>
                  <td class="amount">{{ formatCurrency(payment.payment) }}</td>
                  <td class="amount principal">{{ formatCurrency(payment.principal) }}</td>
                  <td class="amount interest">{{ formatCurrency(payment.interest) }}</td>
                  <td class="amount balance">{{ formatCurrency(payment.balance) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons" *ngIf="statusInfo()?.action">
        <button 
          class="btn-primary action-btn"
          (click)="performStatusAction()"
          [disabled]="protectionState.loading()">
          {{ statusInfo()!.actionLabel || 'Acción' }}
        </button>
      </div>

      <!-- Deny Scenario Modal -->
      <div *ngIf="showDenyModal" class="modal-overlay" (click)="hideDenyDialog()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Denegar Solicitud de Protección</h3>
          <textarea 
            [(ngModel)]="denyReason" 
            placeholder="Motivo del rechazo..."
            class="deny-textarea"></textarea>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="hideDenyDialog()">Cancelar</button>
            <button class="btn-confirm-deny" (click)="confirmDeny()">Confirmar Rechazo</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .protection-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      background: #0f1419;
      color: white;
      min-height: 100vh;
    }

    .protection-header {
      margin-bottom: 32px;
    }

    .header-content {
      text-align: center;
      margin-bottom: 24px;
    }

    .protection-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #06d6a0;
    }

    .protection-subtitle {
      margin: 0;
      color: #a0aec0;
      font-size: 16px;
    }

    .status-section {
      text-align: center;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .status-description {
      margin: 0;
      color: #a0aec0;
    }

    .loading-section {
      text-align: center;
      padding: 64px;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #2d3748;
      border-left-color: #06d6a0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-section {
      background: #2d1b1b;
      border: 1px solid #e53e3e;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .error-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .error-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .error-text h4 {
      margin: 0 0 8px 0;
      color: #feb2b2;
    }

    .error-text p {
      margin: 0;
      color: #fca5a5;
    }

    .btn-retry {
      padding: 8px 16px;
      background: #e53e3e;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .no-plan-section {
      text-align: center;
      padding: 64px;
      background: #1a1f2e;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .no-plan-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .no-plan-section h3 {
      margin: 0 0 8px 0;
      color: #a0aec0;
    }

    .no-plan-section p {
      margin: 0 0 24px 0;
      color: #718096;
    }

    .btn-check-eligibility {
      padding: 12px 24px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .eligibility-banner {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .banner-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .banner-text {
      flex: 1;
    }

    .banner-text h4 {
      margin: 0 0 4px 0;
      color: white;
    }

    .banner-text p {
      margin: 0;
      color: rgba(255,255,255,0.9);
    }

    .btn-simulate {
      padding: 12px 20px;
      background: white;
      color: #d97706;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .plan-info-section {
      margin-bottom: 32px;
    }

    .plan-info-section h3 {
      margin: 0 0 16px 0;
      color: #06d6a0;
    }

    .plan-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .plan-card {
      background: #1a1f2e;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #2d3748;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .card-icon {
      font-size: 24px;
    }

    .card-header h4 {
      margin: 0;
      color: #e2e8f0;
    }

    .state-badge {
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      margin-bottom: 8px;
      display: inline-block;
    }

    .usage-info, .policy-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .usage-item, .policy-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #a0aec0;
    }

    .scenarios-section {
      margin-bottom: 32px;
    }

    .scenarios-section h3 {
      margin: 0 0 16px 0;
      color: #06d6a0;
    }

    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
    }

    .scenario-card {
      background: #1a1f2e;
      border: 2px solid #2d3748;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }

    .scenario-card.selected {
      border-color: #06d6a0;
      background: #0d2818;
    }

    .scenario-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .scenario-icon {
      font-size: 24px;
    }

    .scenario-header h4 {
      margin: 0;
      flex: 1;
      color: #e2e8f0;
    }

    .scenario-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .scenario-badge.tir-ok {
      background: #065f46;
      color: #10b981;
    }

    .scenario-badge:not(.tir-ok) {
      background: #7c2d12;
      color: #f59e0b;
    }

    .scenario-description {
      color: #a0aec0;
      margin: 0 0 16px 0;
      font-size: 14px;
    }

    .scenario-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #a0aec0;
      font-size: 14px;
    }

    .detail-item .value {
      color: #e2e8f0;
      font-weight: 600;
      font-family: monospace;
    }

    .scenario-warnings {
      margin-bottom: 16px;
    }

    .warning-item {
      color: #fbbf24;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .scenario-actions {
      text-align: center;
    }

    .btn-select-scenario {
      width: 100%;
      padding: 10px;
      background: #2d3748;
      color: #a0aec0;
      border: 2px solid #4a5568;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-select-scenario:not(:disabled):hover {
      background: #4a5568;
      border-color: #06d6a0;
      color: #06d6a0;
    }

    .btn-select-scenario.selected {
      background: #065f46;
      border-color: #10b981;
      color: #10b981;
    }

    .btn-select-scenario:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .selected-scenario-section {
      margin-bottom: 32px;
    }

    .selected-scenario-section h3 {
      margin: 0 0 16px 0;
      color: #06d6a0;
    }

    .selected-scenario-card {
      background: #0d2818;
      border: 2px solid #065f46;
      border-radius: 12px;
      padding: 20px;
    }

    .selected-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .selected-icon {
      font-size: 24px;
    }

    .selected-header h4 {
      margin: 0;
      color: #10b981;
    }

    .approval-actions, .signing-actions, .applying-actions, .applied-actions {
      text-align: center;
    }

    .admin-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 16px;
    }

    .btn-approve {
      padding: 10px 20px;
      background: #059669;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-deny {
      padding: 10px 20px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-sign, .btn-view-schedule {
      padding: 12px 24px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
    }

    .progress-indicator {
      margin-top: 16px;
    }

    .progress-bar {
      width: 100%;
      height: 6px;
      background: #2d3748;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #06d6a0, #10b981);
      animation: progress-fill 3s ease-in-out infinite;
    }

    @keyframes progress-fill {
      0%, 100% { transform: translateX(-100%); }
      50% { transform: translateX(0%); }
    }

    .schedule-section {
      margin-bottom: 32px;
    }

    .schedule-section h3 {
      margin: 0 0 16px 0;
      color: #06d6a0;
    }

    .schedule-table-container {
      background: #1a1f2e;
      border-radius: 12px;
      padding: 20px;
      overflow-x: auto;
    }

    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .schedule-table th {
      background: #2d3748;
      color: #a0aec0;
      font-weight: 600;
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #4a5568;
    }

    .schedule-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #2d3748;
    }

    .schedule-table .amount {
      font-family: monospace;
      text-align: right;
    }

    .schedule-table .principal {
      color: #10b981;
    }

    .schedule-table .interest {
      color: #f59e0b;
    }

    .schedule-table .balance {
      font-weight: 600;
    }

    .action-buttons {
      text-align: center;
      margin-top: 32px;
    }

    .btn-primary.action-btn {
      padding: 16px 32px;
      background: #06d6a0;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary.action-btn:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-primary.action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #1a1f2e;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      border: 1px solid #2d3748;
    }

    .modal-content h3 {
      margin: 0 0 16px 0;
      color: #e2e8f0;
    }

    .deny-textarea {
      width: 100%;
      height: 100px;
      background: #2d3748;
      border: 1px solid #4a5568;
      border-radius: 8px;
      padding: 12px;
      color: white;
      font-family: inherit;
      resize: vertical;
      margin-bottom: 16px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn-cancel {
      padding: 10px 20px;
      background: #4a5568;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-confirm-deny {
      padding: 10px 20px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .protection-container {
        padding: 16px;
      }

      .banner-content {
        flex-direction: column;
        text-align: center;
      }

      .plan-grid, .scenarios-grid {
        grid-template-columns: 1fr;
      }

      .admin-actions {
        flex-direction: column;
      }

      .schedule-table-container {
        padding: 16px;
      }

      .schedule-table {
        font-size: 12px;
      }

      .schedule-table th,
      .schedule-table td {
        padding: 8px;
      }
    }
  `]
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
// removed by clean-audit
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
// removed by clean-audit
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
// removed by clean-audit
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
// removed by clean-audit
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
    return PROTECTION_TYPE_DESCRIPTIONS[type]?.icon || '🛡️';
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
}
// removed by clean-audit