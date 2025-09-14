import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CotizadorEngineService } from '../../../../services/cotizador-engine.service';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { SavingsScenario, SimuladorEngineService } from '../../../../services/simulador-engine.service';
import { SpeechService } from '../../../../services/speech.service';
import { ToastService } from '../../../../services/toast.service';
import { FormFieldComponent } from '../../../shared/form-field.component';
import { SkeletonCardComponent } from '../../../shared/skeleton-card.component';
import { SummaryPanelComponent } from '../../../shared/summary-panel/summary-panel.component';

@Component({
  selector: 'app-ags-ahorro',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SummaryPanelComponent, SkeletonCardComponent, FormFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ags-ahorro-simulator command-container">
      <!-- Header -->
      <div class="simulator-header">
        <button (click)="goBack()" class="back-btn">← Volver</button>
        <h1>🌵 Simulador AGS Ahorro</h1>
        <p>Proyecta tu ahorro, calcula liquidación en entrega</p>
      </div>

      <!-- Resumen KPIs -->
      <div class="premium-card kpi-summary" *ngIf="!isLoading">
        <h2 class="section-title">Resumen</h2>
        <div class="kpi-grid">
          <div class="kpi-item">
            <span class="kpi-label">Mensualidad</span>
            <strong class="kpi-value">{{ (currentScenario?.monthlyContribution || 0) | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
          <div class="kpi-item">
            <span class="kpi-label">Tiempo</span>
            <strong class="kpi-value">{{ (currentScenario?.monthsToTarget || simuladorForm.value.deliveryMonths) }} meses</strong>
          </div>
          <div class="kpi-item">
            <span class="kpi-label">Meta Total</span>
            <strong class="kpi-value">{{ (currentScenario?.targetAmount || simuladorForm.value.unitValue) | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
        </div>
      </div>

      <div class="simulator-content grid-aside" *ngIf="!isLoading" data-loading="false">
        <!-- Left: Configuration Panel -->
        <div class="premium-card config-panel">
          <form [formGroup]="simuladorForm">
            
            <!-- Unidad y Valor -->
            <div class="section">
              <h2>🚐 Unidad</h2>
              <app-form-field size="sm" [label]="'Valor Total de la Unidad'" [id]="'unitValue'" [helper]="'Precio típico AGS: $799,000 (vagoneta + GNV)'">
                <div class="currency-input">
                  <span>$</span>
                  <input class="input-sm" id="unitValue" type="number" formControlName="unitValue" min="700000" max="1000000" (input)="onConfigChange()" placeholder="799000" aria-describedby="unitValue-helper">
                </div>
                <input class="input-sm" type="range" formControlName="unitValue" min="700000" max="1000000" step="10000" (input)="onConfigChange()" aria-label="Ajustar valor de unidad" />
              </app-form-field>

              <app-form-field size="sm" [label]="'Enganche Inicial Disponible'" [id]="'initialDown'" [helper]="'Monto que tienes disponible ahora'">
                <div class="currency-input">
                  <span>$</span>
                  <input class="input-sm" id="initialDown" type="number" formControlName="initialDownPayment" min="0" (input)="onConfigChange()" placeholder="400000" aria-describedby="initialDown-helper">
                </div>
                <input class="input-sm" type="range" formControlName="initialDownPayment" min="0" [max]="simuladorForm.value.unitValue || 1000000" step="10000" (input)="onConfigChange()" aria-label="Ajustar enganche" />
              </app-form-field>

              <app-form-field size="sm" [label]="'Meses Estimados para Entrega'" [id]="'deliveryMonths'">
                <select class="input-sm" id="deliveryMonths" formControlName="deliveryMonths" (change)="onConfigChange()">
                  <option value="">Seleccionar</option>
                  <option value="3">3 meses (entrega rápida)</option>
                  <option value="6">6 meses (estándar)</option>
                  <option value="9">9 meses (planificado)</option>
                  <option value="12">12 meses (extendido)</option>
                </select>
                <input class="input-sm" type="range" formControlName="deliveryMonths" min="3" max="12" step="3" (input)="onConfigChange()" aria-label="Ajustar meses de entrega" />
              </app-form-field>
            </div>

            <!-- Placas y Consumo -->
            <div class="section">
              <h2>⛽ Consumo</h2>
              
              <div class="plates-section">
                <label>Placas de Unidades Actuales</label>
                <div class="plates-input">
                  <input type="text" [(ngModel)]="newPlate" placeholder="ABC-1234" (keyup.enter)="addPlate()" #plateInput>
                  <button type="button" (click)="addPlate(); plateInput.value=''" class="add-btn">+ Agregar</button>
                </div>
                
                <div class="plates-list" *ngIf="plates.length > 0">
                  <div *ngFor="let plate of plates; let i = index" class="plate-item">
                    <span class="plate-number">{{ plate }}</span>
                    <input type="number" [(ngModel)]="consumptions[i]" min="0" max="10000" placeholder="Litros/mes">
                    <button type="button" (click)="removePlate(i)" class="remove-btn" aria-label="Eliminar placa" title="Eliminar placa">×</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Finanzas -->
            <div class="section">
              <h2>💳 Finanzas</h2>
              <div class="form-group">
                <app-form-field size="sm" [label]="'Sobreprecio por Litro'" [id]="'overprice'" [helper]="'Cantidad extra por litro que vas a ahorrar'">
                  <div class="currency-input">
                    <span>$</span>
                    <input class="input-sm" id="overprice" type="number" formControlName="overpricePerLiter" min="1" max="20" step="0.5" (input)="onConfigChange()" placeholder="5.00" aria-describedby="overprice-helper">
                  </div>
                  <input class="input-sm" type="range" formControlName="overpricePerLiter" min="1" max="20" step="0.5" (input)="onConfigChange()" aria-label="Ajustar sobreprecio por litro" />
                </app-form-field>
              </div>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button type="button" (click)="simulateScenario()" [disabled]="!canSimulate()" class="simulate-btn">
                {{ isSimulating ? 'Simulando...' : '📊 Simular Escenario' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Right: Summary Aside -->
        <app-summary-panel class="aside" *ngIf="currentScenario"
          [metrics]="[
            { label: 'Mensualidad', value: (currentScenario.monthlyContribution | currency:'MXN':'symbol':'1.0-0')!, badge: 'success' },
            { label: 'Meses a Meta', value: (currentScenario.monthsToTarget + ' meses')! },
            { label: 'Ahorro Total', value: (currentScenario.targetAmount | currency:'MXN':'symbol':'1.0-0')! },
            { label: (remainderAmount <= 0 ? 'Validez' : 'Remanente'), value: (remainderAmount | currency:'MXN':'symbol':'1.0-0')!, badge: (remainderAmount <= 0 ? 'success' : 'warning') }
          ]"
          [actions]="asideActions"
        ></app-summary-panel>

        <!-- Results Panel (left column visual details) -->
        <div class="premium-card results-panel" *ngIf="currentScenario">
          <h3>📈 Proyección de Ahorro AGS</h3>
          
          <!-- Key Metrics -->
          <div class="metrics-grid">
            <div class="metric-card highlight">
              <div class="metric-icon">🎯</div>
              <div class="metric-content">
                <span class="metric-label">Meta Total</span>
                <span class="metric-value">{{ currentScenario.targetAmount | currency:'MXN':'symbol':'1.0-0' }}</span>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-icon">⏱️</div>
              <div class="metric-content">
                <span class="metric-label">Tiempo</span>
                <span class="metric-value">{{ currentScenario.monthsToTarget }} meses</span>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-icon">💰</div>
              <div class="metric-content">
                <span class="metric-label">Recaudación Mensual</span>
                <span class="metric-value">{{ currentScenario.monthlyContribution | currency:'MXN':'symbol':'1.0-0' }}</span>
              </div>
            </div>
            
            <div class="metric-card" [class.success]="remainderAmount <= 0" [class.warning]="remainderAmount > 0">
              <div class="metric-icon">{{ remainderAmount <= 0 ? '✅' : '⚠️' }}</div>
              <div class="metric-content">
                <span class="metric-label">{{ remainderAmount <= 0 ? 'Ahorro Completo' : 'Remanente' }}</span>
                <span class="metric-value">{{ remainderAmount | currency:'MXN':'symbol':'1.0-0' }}</span>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="timeline-section">
            <h4>📅 Cronología de Ahorro</h4>
            <div class="timeline">
              <div *ngFor="let event of displayTimeline" class="timeline-item" [class]="getTimelineClass(event)">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <span class="timeline-month">Mes {{ event.month }}</span>
                  <span class="timeline-event">{{ event.event }}</span>
                  <span class="timeline-amount">{{ event.amount | currency:'MXN':'symbol':'1.0-0' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Balance Chart -->
          <div class="chart-section">
            <h4>📊 Proyección de Balance</h4>
            <div class="balance-chart">
              <div *ngFor="let balance of currentScenario.projectedBalance; let i = index" 
                   class="balance-bar" 
                   [style.height.%]="(balance / currentScenario.targetAmount) * 100"
                   [title]="'Mes ' + (i + 1) + ': ' + (balance | currency:'MXN':'symbol':'1.0-0')">
                <span class="bar-label">{{ i + 1 }}</span>
              </div>
            </div>
            <div class="chart-target-line">
              <span>Meta: {{ currentScenario.targetAmount | currency:'MXN':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <!-- Enhanced Actions -->
          <div class="enhanced-actions">
            <!-- View Mode Toggle -->
            <div class="view-toggle">
              <button (click)="toggleViewMode()" class="toggle-btn">
                {{ currentViewMode === 'simple' ? '🔬 Vista Avanzada' : '📱 Vista Simple' }}
              </button>
            </div>

            <!-- Simple Actions -->
            <div *ngIf="currentViewMode === 'simple'" class="simple-actions">
              <div class="action-grid">
              <button (click)="speakSummary()" class="action-btn voice-btn" title="Leer resumen" data-cy="ags-voice">🔊 Escuchar</button>
                <button (click)="shareWhatsApp" class="action-btn whatsapp-btn" title="Compartir por WhatsApp" data-cy="ags-wa">📱 WhatsApp</button>
                <button (click)="saveDraft()" class="action-btn" [disabled]="!currentScenario" data-cy="save-scenario" title="Guardar simulación">💾 Guardar</button>
                <button (click)="proceedWithScenario()" class="action-btn proceed-btn">✅ Continuar</button>
                <button (click)="resetSimulation()" class="action-btn reset-btn">🔄 Nuevo</button>
              </div>
            </div>

            <!-- Advanced Actions -->
            <div *ngIf="currentViewMode === 'advanced'" class="advanced-actions">
              <div class="advanced-tools">
                <h4>🛠️ Herramientas Avanzadas</h4>
                
                <!-- Amortization Section -->
                <div class="tool-section">
                  <div class="tool-header">
                    <span>💰 Financiamiento del Remanente</span>
                    <span class="remainder-amount">{{ remainderAmount | currency:'MXN':'symbol':'1.0-0' }}</span>
                  </div>
                  <button (click)="calculateAmortization()" 
                          [disabled]="remainderAmount <= 0"
                          class="tool-btn">
                    📊 Calcular Tabla de Amortización
                  </button>
                </div>

                <!-- Protection Demo -->
                <div class="tool-section">
                  <div class="tool-header">
                    <span>🛡️ Simulador de Protección</span>
                    <span class="protection-label">Para imprevistos</span>
                  </div>
                  <button (click)="showProtectionDemo = true" class="tool-btn">
                    🔐 Ver Protección Conductores
                  </button>
                </div>

                <!-- Traditional Actions -->
                <div class="traditional-actions">
                  <button (click)="proceedWithScenario()" class="proceed-btn">✅ Continuar con este Plan</button>
                  <button (click)="generatePDF()" class="pdf-btn">📄 Descargar PDF</button>
                  <button (click)="resetSimulation()" class="reset-btn">🔄 Nueva Simulación</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Amortization Table Modal -->
          <div *ngIf="showAmortizationTable" class="amortization-modal">
            <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="amortization-title">
              <div class="modal-header">
                <h4 id="amortization-title">📊 Tabla de Amortización del Remanente</h4>
                <button (click)="showAmortizationTable = false" class="close-btn" aria-label="Cerrar" title="Cerrar">×</button>
              </div>
              
              <div class="amortization-summary">
                <div class="summary-row">
                  <span>Monto a financiar:</span>
                  <strong>{{ remainderAmount | currency:'MXN':'symbol':'1.0-0' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Tasa anual AGS:</span>
                  <strong>25.5%</strong>
                </div>
                <div class="summary-row">
                  <span>Plazo típico:</span>
                  <strong>24 meses</strong>
                </div>
                <div class="summary-row highlight">
                  <span>Pago mensual estimado:</span>
                  <strong>{{ amortizationTable[0]?.monthlyPayment | currency:'MXN':'symbol':'1.0-0' }}</strong>
                </div>
              </div>

              <div class="table-container">
                <table class="amortization-table table-lg">
                  <thead>
                    <tr>
                      <th># Pago</th>
                      <th>Pago Mensual</th>
                      <th>Capital</th>
                      <th>Interés</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let row of amortizationTable.slice(0, 12)" 
                        [class.highlight]="row.paymentNumber === 1">
                      <td class="num">{{ row.paymentNumber }}</td>
                      <td class="num">{{ row.monthlyPayment | currency:'MXN':'symbol':'1.0-0' }}</td>
                      <td class="principal num">{{ row.principal | currency:'MXN':'symbol':'1.0-0' }}</td>
                      <td class="interest num">{{ row.interest | currency:'MXN':'symbol':'1.0-0' }}</td>
                      <td class="num">{{ row.balance | currency:'MXN':'symbol':'1.0-0' }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="table-note">
                  <small>* Se muestran los primeros 12 pagos. Total: 24 meses</small>
                </div>
              </div>
            </div>
          </div>

          <div class="helper-text" style="margin-top: var(--space-16);">
            ¿Qué sigue? Puedes pasar al Cotizador o generar un PDF con tu plan.
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="loading" data-loading="true">
        <app-skeleton-card ariaLabel="Calculando escenario de ahorro AGS" [titleWidth]="70" [subtitleWidth]="60" [buttonWidth]="30"></app-skeleton-card>
      </div>
    </div>
  `,
  styles: [`
    .ags-ahorro-simulator {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      background: transparent;
      min-height: auto;
    }

    .simulator-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .back-btn {
      display: inline-block;
      margin-bottom: 16px;
      padding: 8px 16px;
      background: #e2e8f0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .back-btn:hover {
      background: #cbd5e1;
    }

    .simulator-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .simulator-header p {
      color: #64748b;
      margin: 0;
    }

    .simulator-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      align-items: start;
    }

    @media (max-width: 1200px) {
      .simulator-content {
        grid-template-columns: 1fr;
      }
    }

    .config-panel, .results-panel {
      background: transparent;
      box-shadow: none;
      border: none;
      padding: 24px;
    }

    .section {
      margin-bottom: 24px;
    }

    .section h2 {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 6px;
      color: #374151;
    }

    .form-group select,
    .form-group input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 16px;
    }

    .currency-input {
      position: relative;
    }

    .currency-input span {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #6b7280;
      font-weight: 500;
    }

    .currency-input input {
      padding-left: 32px;
    }

    .form-group small {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #6b7280;
    }

    .plates-section {
      margin-bottom: 16px;
    }

    .plates-input {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .plates-input input {
      flex: 1;
    }

    .add-btn {
      padding: 10px 16px;
      background: #059669;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .add-btn:hover {
      background: #047857;
    }

    .plates-list {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      background: #f8fafc;
    }

    .plate-item {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 8px;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .plate-item:last-child {
      border-bottom: none;
    }

    .plate-number {
      font-weight: 500;
      color: #374151;
    }

    .remove-btn {
      width: 28px;
      height: 28px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .remove-btn:hover {
      background: #b91c1c;
    }

    .form-actions {
      margin-top: 24px;
    }

    .simulate-btn {
      width: 100%;
      padding: 14px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .simulate-btn:hover:not(:disabled) {
      background: #2563eb;
    }

    .simulate-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .results-panel h3 {
      font-size: 22px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 24px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f8fafc;
    }

    .metric-card.highlight {
      background: #eff6ff;
      border-color: #3b82f6;
    }

    .metric-card.success {
      background: #f0fdf4;
      border-color: #059669;
    }

    .metric-card.warning {
      background: #fef3c7;
      border-color: #f59e0b;
    }

    .metric-icon {
      font-size: 24px;
      width: 40px;
      text-align: center;
    }

    .metric-content {
      flex: 1;
    }

    .metric-label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 2px;
    }

    .metric-value {
      display: block;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
    }

    .timeline-section, .chart-section {
      margin-bottom: 24px;
    }

    .timeline-section h4, .chart-section h4 {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }

    .timeline {
      position: relative;
      padding-left: 20px;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #d1d5db;
    }

    .timeline-item {
      position: relative;
      padding: 12px 0;
      padding-left: 24px;
    }

    .timeline-marker {
      position: absolute;
      left: -14px;
      top: 16px;
      width: 8px;
      height: 8px;
      background: #3b82f6;
      border-radius: 50%;
    }

    .timeline-item.negative .timeline-marker {
      background: #dc2626;
    }

    .timeline-item.positive .timeline-marker {
      background: #059669;
    }

    .timeline-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .timeline-month {
      font-size: 12px;
      color: #6b7280;
      min-width: 60px;
    }

    .timeline-event {
      flex: 1;
      font-size: 14px;
      color: #374151;
      margin: 0 12px;
    }

    .timeline-amount {
      font-weight: 600;
      color: #059669;
    }

    .timeline-item.negative .timeline-amount {
      color: #dc2626;
    }

    .balance-chart {
      display: flex;
      align-items: end;
      gap: 4px;
      height: 120px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
      overflow-x: auto;
    }

    .balance-bar {
      flex: 1;
      min-width: 24px;
      background: linear-gradient(to top, #3b82f6, #60a5fa);
      border-radius: 2px 2px 0 0;
      position: relative;
      cursor: pointer;
      transition: all 0.2s;
    }

    .balance-bar:hover {
      background: linear-gradient(to top, #2563eb, #3b82f6);
    }

    .bar-label {
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #6b7280;
    }

    .chart-target-line {
      margin-top: 8px;
      padding: 8px 12px;
      background: #fee2e2;
      border-radius: 4px;
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      color: #dc2626;
    }

    .results-actions {
      display: flex;
      gap: 12px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .proceed-btn, .reset-btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .proceed-btn {
      background: #059669;
      color: white;
    }

    .proceed-btn:hover {
      background: #047857;
    }

    .reset-btn {
      background: #f3f4f6;
      color: #374151;
    }

    .reset-btn:hover {
      background: #e5e7eb;
    }

    /* Enhanced Actions Styles */
    .enhanced-actions {
      border-top: 2px solid #e5e7eb;
      padding-top: 24px;
      margin-top: 24px;
    }

    .view-toggle {
      margin-bottom: 16px;
      text-align: center;
    }

    .toggle-btn {
      padding: 8px 16px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .toggle-btn:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
    }

    /* Simple Actions */
    .action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    @media (max-width: 600px) {
      .action-grid {
        grid-template-columns: 1fr;
      }
    }

    .action-btn {
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .voice-btn {
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
    }

    .voice-btn:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      transform: translateY(-1px);
    }

    .whatsapp-btn {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
    }

    .whatsapp-btn:hover {
      background: linear-gradient(135deg, #16a34a, #15803d);
      transform: translateY(-1px);
    }

    /* Advanced Actions */
    .advanced-tools h4 {
      font-size: 18px;
      color: #374151;
      margin-bottom: 16px;
      font-weight: 600;
    }

    .tool-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .tool-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .tool-header span:first-child {
      font-weight: 600;
      color: #374151;
    }

    .remainder-amount {
      background: #fee2e2;
      color: #dc2626;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
    }

    .protection-label {
      background: #dbeafe;
      color: #2563eb;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .tool-btn {
      width: 100%;
      padding: 10px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tool-btn:hover:not(:disabled) {
      background: #2563eb;
    }

    .tool-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .traditional-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .pdf-btn {
      flex: 1;
      padding: 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pdf-btn:hover {
      background: #2563eb;
    }

    /* Amortization Modal */
    .amortization-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h4 {
      font-size: 20px;
      font-weight: 600;
      color: #374151;
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
      padding: 4px;
    }

    .close-btn:hover {
      color: #374151;
    }

    .amortization-summary {
      padding: 20px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .summary-row.highlight {
      background: #fef3c7;
      padding: 12px;
      border-radius: 6px;
      border-bottom: none;
      margin-top: 8px;
    }

    .table-container {
      padding: 20px 24px;
    }

    .amortization-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .amortization-table th {
      background: #f3f4f6;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #d1d5db;
    }

    .amortization-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
    }

    .amortization-table .principal {
      color: #059669;
      font-weight: 500;
    }

    .amortization-table .interest {
      color: #dc2626;
      font-weight: 500;
    }

    .amortization-table tr.highlight {
      background: #fef3c7;
    }

    .table-note {
      text-align: center;
      margin-top: 16px;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .amortization-modal {
        padding: 10px;
      }
      
      .modal-content {
        max-height: 95vh;
      }
      
      .amortization-table {
        font-size: 12px;
      }
      
      .amortization-table th,
      .amortization-table td {
        padding: 6px 4px;
      }
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px;
      color: #6b7280;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f4f6;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* KPI Summary */
    .premium-card.kpi-summary {
      padding: 16px 20px;
      margin-bottom: 24px;
    }

    .kpi-summary .section-title {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      color: #374151;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .kpi-item {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }

    .kpi-label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .kpi-value {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
    }
  `]
})
export class AgsAhorroComponent implements OnInit {
  simuladorForm!: FormGroup;
  currentScenario?: SavingsScenario;
  plates: string[] = [];
  consumptions: number[] = [];
  newPlate = '';
  isLoading = false;
  isSimulating = false;
  asideActions = [
    { label: '📄 PDF', click: () => this.generatePDF() },
    { label: '✅ Continuar', click: () => this.proceedWithScenario() }
  ];
  
  // Enhanced features
  amortizationTable: any[] = [];
  showAmortizationTable = false;
  showWhatsAppShare = false;
  currentViewMode: 'simple' | 'advanced' = 'simple';
  showProtectionDemo = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private simuladorEngine: SimuladorEngineService,
    private toast: ToastService,
    private cotizadorEngine: CotizadorEngineService,
    private pdfExport: PdfExportService,
    private speech: SpeechService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadDefaultValues();
  }

  private createForm(): void {
    this.simuladorForm = this.fb.group({
      unitValue: [799000, [Validators.required, Validators.min(700000)]],
      initialDownPayment: [400000, [Validators.required, Validators.min(0)]],
      deliveryMonths: [6, Validators.required],
      overpricePerLiter: [5.00, [Validators.required, Validators.min(1)]]
    });
  }

  private loadDefaultValues(): void {
    // Pre-load typical AGS scenario
    this.plates = ['ABC-1234'];
    this.consumptions = [2500]; // Typical consumption
  }

  addPlate(): void {
    if (this.newPlate.trim()) {
      this.plates.push(this.newPlate.trim().toUpperCase());
      this.consumptions.push(2500); // Default consumption
      this.newPlate = '';
      this.onConfigChange();
    }
  }

  removePlate(index: number): void {
    this.plates.splice(index, 1);
    this.consumptions.splice(index, 1);
    this.onConfigChange();
  }

  onConfigChange(): void {
    this.currentScenario = undefined;
  }

  simulateScenario(): void {
    if (!this.canSimulate()) return;

    const formValue = this.simuladorForm.value;
    this.isSimulating = true;

    try {
      const scenario = this.simuladorEngine.generateAGSLiquidationScenario(
        formValue.initialDownPayment,
        formValue.deliveryMonths,
        this.plates,
        this.consumptions,
        formValue.overpricePerLiter,
        formValue.unitValue
      );

      this.currentScenario = scenario;
      this.toast.success('Escenario AGS simulado exitosamente');
      this.isSimulating = false;
    } catch (error) {
      this.toast.error('Error al simular escenario AGS');
      this.isSimulating = false;
    }
  }

  proceedWithScenario(): void {
    if (!this.currentScenario) return;
    
    // Store scenario for next step
    sessionStorage.setItem('agsScenario', JSON.stringify(this.currentScenario));
    this.toast.success('Escenario guardado, creando cliente...');
    
    this.router.navigate(['/clientes/nuevo'], {
      queryParams: {
        fromSimulator: 'ags-ahorro',
        market: 'aguascalientes',
        flow: 'AhorroProgramado'
      }
    });
  }

  resetSimulation(): void {
    this.currentScenario = undefined;
    this.toast.info('Simulación limpiada');
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  generatePDF(): void {
    if (!this.currentScenario) {
      this.toast.error('Primero ejecuta la simulación');
      return;
    }

    const formValue = this.simuladorForm.value;
    const scenarioData = {
      targetAmount: this.currentScenario.targetAmount,
      monthsToTarget: this.currentScenario.monthsToTarget,
      monthlyContribution: this.currentScenario.monthlyContribution,
      projectedBalance: this.currentScenario.projectedBalance,
      timeline: this.currentScenario.timeline,
      plates: this.plates,
      consumptions: this.consumptions,
      overpricePerLiter: formValue.overpricePerLiter,
      remainderAmount: this.remainderAmount
    };

    this.pdfExport.generateAGSSavingsPDF(scenarioData).then(blob => {
      const filename = `simulacion-ags-ahorro-${new Date().getTime()}.pdf`;
      this.pdfExport.downloadPDF(blob, filename);
      this.toast.success('PDF de simulación descargado');
    }).catch(error => {
      this.toast.error('Error al generar PDF');
      console.error('PDF Error:', error);
    });
  }

  saveDraft(): void {
    if (!this.currentScenario) { this.toast.error('Primero ejecuta la simulación'); return; }
    const formValue = this.simuladorForm.value;
    const draftKey = `agsScenario-${Date.now()}-draft`;
    const draft = {
      clientName: '',
      market: 'aguascalientes',
      clientType: 'Individual',
      timestamp: Date.now(),
      scenario: {
        targetAmount: this.currentScenario.targetAmount,
        monthsToTarget: this.currentScenario.monthsToTarget,
        monthlyContribution: this.currentScenario.monthlyContribution
      },
      configParams: {
        unitValue: formValue.unitValue,
        initialDownPayment: formValue.initialDownPayment,
        deliveryMonths: formValue.deliveryMonths,
        plates: this.plates,
        consumptions: this.consumptions,
        overpricePerLiter: formValue.overpricePerLiter
      }
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      this.toast.success('Simulación guardada');
    } catch (e) {
      this.toast.error('No se pudo guardar la simulación');
    }
  }

  // Getters and helpers
  canSimulate(): boolean {
    return this.simuladorForm.valid && 
           this.plates.length > 0 && 
           this.consumptions.every(c => c > 0) &&
           !this.isSimulating;
  }

  get remainderAmount(): number {
    if (!this.currentScenario) return 0;
    
    const totalProjected = this.simuladorForm.value.initialDownPayment + 
                          (this.currentScenario.monthlyContribution * this.currentScenario.monthsToTarget);
    return Math.max(0, this.currentScenario.targetAmount - totalProjected);
  }

  get displayTimeline(): any[] {
    return this.currentScenario?.timeline.slice(0, 8) || [];
  }

  getTimelineClass(event: any): string {
    if (event.amount < 0) return 'negative';
    if (event.event.includes('Entrega')) return 'positive';
    return '';
  }

  // Enhanced features methods
  calculateAmortization(): void {
    if (!this.currentScenario) return;

    const remainderToFinance = this.remainderAmount;
    if (remainderToFinance <= 0) {
      this.toast.info('No hay monto a financiar para calcular amortización');
      return;
    }

    // Use AGS financing terms (25.5% annual rate, typical 12-24 months)
    const annualRate = 0.255; // 25.5%
    const term = 24; // 24 months typical
    const monthlyRate = annualRate / 12;
    const monthlyPayment = (remainderToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));

    const table = [];
    let balance = remainderToFinance;

    for (let i = 1; i <= term; i++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      balance -= principal;

      table.push({
        paymentNumber: i,
        monthlyPayment: monthlyPayment,
        principal: principal,
        interest: interest,
        balance: balance > 0 ? balance : 0
      });
    }

    this.amortizationTable = table;
    this.showAmortizationTable = true;
    this.toast.success('Tabla de amortización calculada');
  }

  toggleViewMode(): void {
    this.currentViewMode = this.currentViewMode === 'simple' ? 'advanced' : 'simple';
  }

  shareWhatsApp(): void {
    if (!this.currentScenario) return;

    const message = this.generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  private generateWhatsAppMessage(): string {
    if (!this.currentScenario) return '';

    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    
    return `🌵 *Simulación AGS Ahorro Programado*

📊 *Resumen del Plan:*
• Meta: ${formatter.format(this.currentScenario.targetAmount)}
• Enganche inicial: ${formatter.format(this.simuladorForm.value.initialDownPayment)}
• Ahorro mensual: ${formatter.format(this.currentScenario.monthlyContribution)}
• Tiempo estimado: ${this.currentScenario.monthsToTarget} meses
• Remanente a liquidar: ${formatter.format(this.remainderAmount)}

🚐 *Placas incluidas:* ${this.plates.join(', ')}
⛽ *Sobreprecio por litro:* $${this.simuladorForm.value.overpricePerLiter}

¿Te interesa formalizar este plan? ¡Contáctanos!`;
  }

  speakSummary(): void {
    if (!this.currentScenario) return;

    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const text = `Simulación de ahorro AGS completada. 
    Tu meta es ${formatter.format(this.currentScenario.targetAmount)}. 
    Con tu enganche inicial de ${formatter.format(this.simuladorForm.value.initialDownPayment)} 
    y ahorrando ${formatter.format(this.currentScenario.monthlyContribution)} pesos mensuales, 
    lograrás tu objetivo en ${this.currentScenario.monthsToTarget} meses. 
    Quedaría un remanente de ${formatter.format(this.remainderAmount)} pesos para liquidar.`;

    this.speech.speak(text);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }
}
