import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BusinessFlow, Client, Quote, SimulatorMode } from '../../models/types';
import { CotizadorEngineService, ProductPackage } from '../../services/cotizador-engine.service';
import { FinancialCalculatorService } from '../../services/financial-calculator.service';
import { SavingsScenario, SimuladorEngineService } from '../../services/simulador-engine.service';
import { SpeechService } from '../../services/speech.service';
import { ToastService } from '../../services/toast.service';

type Market = 'aguascalientes' | 'edomex';
type ClientType = 'individual' | 'colectivo';

interface Component {
  id: string;
  name: string;
  price: number;
  isOptional: boolean;
  isMultipliedByTerm?: boolean;
}

interface CollectionUnit {
  id: number;
  consumption: string;
  overprice: string;
}

@Component({
  selector: 'app-dual-mode-cotizador',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="dual-cotizador">
      <!-- Mode Selector -->
      <div class="mode-selector">
        <h2 class="mode-title">
          <span class="mode-icon">{{ currentMode === 'acquisition' ? '🛒' : '💰' }}</span>
          {{ client ? 'Simulador para ' + client.name : 'Simulador de Soluciones' }}
        </h2>
        
        <div class="mode-tabs">
          <button 
            (click)="switchMode('acquisition')"
            [class.active]="currentMode === 'acquisition'"
            class="mode-tab">
            🛒 Cotizador (Compra)
          </button>
          <button 
            (click)="switchMode('savings')"
            [class.active]="currentMode === 'savings'"
            class="mode-tab">
            💰 Simulador (Ahorro)
          </button>
        </div>
      </div>

      <div class="cotizador-content">
        <div class="cotizador-grid">
          <!-- Configuration Panel -->
          <div class="config-panel">
            <!-- Context Selection -->
            <div class="context-section" *ngIf="!client">
              <h4 class="section-title">1. Contexto</h4>
              <div class="context-grid">
                <div class="form-group">
                  <label>Mercado</label>
                  <select [(ngModel)]="selectedMarket" (change)="onContextChange()" class="form-select">
                    <option value="">-- Seleccionar --</option>
                    <option value="aguascalientes">Aguascalientes</option>
                    <option value="edomex">Estado de México</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Tipo de Cliente</label>
                  <select [(ngModel)]="selectedClientType" (change)="onContextChange()" 
                          [disabled]="!selectedMarket" class="form-select">
                    <option value="">-- Seleccionar --</option>
                    <option value="individual">Individual</option>
                    <option value="colectivo" *ngIf="selectedMarket === 'edomex'">Crédito Colectivo</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Acquisition Mode Configuration -->
            <div *ngIf="currentMode === 'acquisition' && packageData" class="acquisition-config">
              <h4 class="section-title">2. Paquete de Producto</h4>
              
              <!-- Product Components -->
              <div class="components-list">
                <div *ngFor="let comp of packageData.components" 
                     class="component-item">
                  <div class="component-checkbox">
                    <input type="checkbox" 
                           [id]="comp.id"
                           [checked]="selectedComponents[comp.id]"
                           [disabled]="!comp.isOptional"
                           (change)="onComponentChange(comp.id, $event)">
                    <div *ngIf="!comp.isOptional" class="required-dot"></div>
                  </div>
                  <label [for]="comp.id" class="component-label">
                    <span class="component-name">{{ comp.name }}</span>
                    <span class="component-price num">{{ comp.price | currency:'MXN':'symbol':'1.0-0' }}</span>
                  </label>
                </div>
              </div>

              <!-- Financial Structure -->
              <div class="financial-section">
                <h4 class="section-title">3. Estructura Financiera</h4>
                
                <div *ngIf="isVentaDirecta" class="direct-sale">
                  <div class="form-group">
                    <label>Pago Inicial</label>
                    <div class="currency-input">
                      <span>$</span>
                      <input type="number" 
                             [(ngModel)]="directPaymentAmount"
                             (input)="calculateResults()"
                             placeholder="400000"
                             class="form-input">
                    </div>
                  </div>
                </div>
                
                <div *ngIf="!isVentaDirecta" class="financing">
                  <div class="form-group">
                    <label>Enganche ({{ downPaymentPercentage }}%)</label>
                    <input type="range" 
                           [min]="packageData.minDownPaymentPercentage * 100"
                           max="90"
                           [(ngModel)]="downPaymentPercentage"
                           (input)="calculateResults()"
                           class="range-slider">
                    <div class="range-info">
                      <span>Mínimo: {{ packageData.minDownPaymentPercentage * 100 }}%</span>
                      <span class="num">{{ (totalPrice * (downPaymentPercentage / 100)) | currency:'MXN':'symbol':'1.0-0' }}</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Plazo (meses)</label>
                    <select [(ngModel)]="selectedTerm" (change)="calculateResults()" class="form-select">
                      <option *ngFor="let term of packageData.terms" [value]="term">
                        {{ term }} meses
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Mode Configuration -->
            <div *ngIf="currentMode === 'savings' && packageData" class="savings-config">
              <h4 class="section-title">2. Simulación de Ahorro</h4>
              
              <!-- AGS Savings -->
              <div *ngIf="selectedMarket === 'aguascalientes' && selectedClientType === 'individual'" 
                   class="ags-savings">
                <div class="form-group">
                  <label>Enganche Inicial Disponible</label>
                  <div class="currency-input">
                    <span>$</span>
                    <input type="number" 
                           [(ngModel)]="initialDownPayment"
                           (input)="calculateSavingsResults()"
                           placeholder="400000"
                           class="form-input">
                  </div>
                </div>

                <div class="form-group">
                  <label>Fecha de Entrega Estimada</label>
                  <select [(ngModel)]="deliveryTerm" (change)="calculateSavingsResults()" class="form-select">
                    <option [value]="3">3 meses</option>
                    <option [value]="6">6 meses</option>
                    <option [value]="9">9 meses</option>
                    <option [value]="12">12 meses</option>
                  </select>
                </div>
              </div>

              <!-- EdoMex Individual -->
              <div *ngIf="selectedMarket === 'edomex' && selectedClientType === 'individual'" 
                   class="edomex-individual">
                <div class="form-group">
                  <label>Aportación Voluntaria Mensual</label>
                  <div class="currency-input">
                    <span>$</span>
                    <input type="number" 
                           [(ngModel)]="voluntaryMonthly"
                           (input)="calculateSavingsResults()"
                           placeholder="500"
                           class="form-input">
                  </div>
                </div>
              </div>

              <!-- EdoMex Collective -->
              <div *ngIf="selectedMarket === 'edomex' && selectedClientType === 'colectivo'" 
                   class="edomex-collective">
                <div class="form-group">
                  <label>Número de Integrantes</label>
                  <input type="range" 
                         min="2" 
                         max="20" 
                         [(ngModel)]="tandaMembers"
                         (input)="calculateSavingsResults()"
                         class="range-slider">
                  <div class="range-info">
                    <span>{{ tandaMembers }} miembros</span>
                  </div>
                </div>
              </div>

              <!-- Collection Configuration -->
              <div class="collection-section">
                <h5 class="subsection-title">Configurador de Recaudación</h5>
                
                <div *ngFor="let unit of collectionUnits; let i = index" 
                     class="collection-unit">
                  <input type="number" 
                         [(ngModel)]="unit.consumption"
                         (input)="calculateSavingsResults()"
                         placeholder="Litros/mes"
                         class="unit-input">
                  <input type="number" 
                         [(ngModel)]="unit.overprice"
                         (input)="calculateSavingsResults()"
                         placeholder="Sobreprecio/L"
                         class="unit-input">
                  <button (click)="removeCollectionUnit(i)" class="remove-unit-btn">×</button>
                </div>
                
                <button (click)="addCollectionUnit()" class="add-unit-btn">
                  + Agregar Unidad de Recaudación
                </button>
              </div>
            </div>
          </div>

          <!-- Results Panel -->
          <div class="results-panel">
            <div *ngIf="isLoading" class="loading-state">
              <div class="loading-spinner"></div>
              <p>Calculando resultados...</p>
            </div>

            <!-- Acquisition Results -->
            <div *ngIf="currentMode === 'acquisition' && packageData && !isLoading" 
                 class="acquisition-results">
              <h3 class="results-title">Resultados y Amortización</h3>
              
              <div class="results-summary">
                <div class="summary-row">
                  <span>Precio Total:</span>
                  <strong class="num">{{ totalPrice | currency:'MXN':'symbol':'1.0-0' }}</strong>
                </div>
                
                <div *ngIf="isVentaDirecta">
                  <div class="summary-row">
                    <span>Pago Inicial:</span>
                    <strong class="num">{{ downPayment | currency:'MXN':'symbol':'1.0-0' }}</strong>
                  </div>
                  <div class="summary-row highlight">
                    <span>Remanente a Liquidar:</span>
                    <strong class="num">{{ amountToFinance | currency:'MXN':'symbol':'1.0-0' }}</strong>
                  </div>
                </div>
                
                <div *ngIf="!isVentaDirecta">
                  <div class="summary-row">
                    <span>Enganche:</span>
                    <strong class="num">{{ downPayment | currency:'MXN':'symbol':'1.0-0' }}</strong>
                  </div>
                  <div class="summary-row">
                    <span>Monto a Financiar:</span>
                    <strong class="num">{{ amountToFinance | currency:'MXN':'symbol':'1.0-0' }}</strong>
                  </div>
                  <div class="summary-row highlight">
                    <span>Pago Mensual (Est.):</span>
                    <strong class="num">{{ monthlyPayment | currency:'MXN':'symbol':'1.0-0' }}</strong>
                  </div>
                </div>
              </div>

              <!-- Amortization Button -->
              <div *ngIf="!isVentaDirecta && monthlyPayment > 0" class="amortization-section">
                <button (click)="calculateAmortization()" class="amortization-btn">
                  📊 Calcular Tabla de Amortización
                </button>
              </div>
            </div>

            <!-- Savings Results -->
            <div *ngIf="currentMode === 'savings' && savingsScenario && !isLoading" 
                 class="savings-results">
              <h3 class="results-title">Proyección de Ahorro</h3>
              
              <!-- AGS Results -->
              <div *ngIf="selectedMarket === 'aguascalientes'" class="ags-results">
                <div class="remainder-bar-container">
                  <div class="remainder-bar">
                    <div class="bar-section down-payment" 
                         [style.width.%]="getBarPercentage('downPayment')">
                    </div>
                    <div class="bar-section savings" 
                         [style.width.%]="getBarPercentage('savings')">
                    </div>
                  </div>
                  <div class="bar-legend">
                    <span class="legend-item down-payment">
                      Enganche: {{ initialDownPayment | currency:'MXN':'symbol':'1.0-0' }}
                    </span>
                    <span class="legend-item savings">
                      Ahorro: {{ getProjectedSavings() | currency:'MXN':'symbol':'1.0-0' }}
                    </span>
                    <span class="legend-item remainder">
                      Remanente: {{ getRemainder() | currency:'MXN':'symbol':'1.0-0' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- EdoMex Individual Results -->
              <div *ngIf="selectedMarket === 'edomex' && selectedClientType === 'individual'" 
                   class="edomex-individual-results">
                <div class="savings-summary">
                  <div class="summary-card highlight">
                    <span class="card-label">Meta de Enganche</span>
                    <span class="card-value">{{ savingsScenario.targetAmount | currency:'MXN':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="summary-card">
                    <span class="card-label">Ahorro Mensual</span>
                    <span class="card-value">{{ savingsScenario.monthlyContribution | currency:'MXN':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="summary-card success">
                    <span class="card-label">Tiempo Estimado</span>
                    <span class="card-value">{{ savingsScenario.monthsToTarget }} meses</span>
                  </div>
                </div>

                <!-- Savings Progress Chart -->
                <div class="progress-chart">
                  <h5>Proyección de Ahorro</h5>
                  <div class="chart-container">
                    <div *ngFor="let balance of savingsScenario.projectedBalance.slice(0, 8); let i = index"
                         class="chart-bar">
                      <div class="bar" 
                           [style.height]="getChartBarHeight(balance, savingsScenario.targetAmount)"
                           [title]="'Mes ' + (i + 1) + ': ' + (balance | currency:'MXN':'symbol':'1.0-0')">
                      </div>
                      <span class="bar-label">{{ i + 1 }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- EdoMex Collective Results -->
              <div *ngIf="selectedMarket === 'edomex' && selectedClientType === 'colectivo'" 
                   class="edomex-collective-results">
                <div class="tanda-summary">
                  <div class="tanda-header">
                    <span class="tanda-icon">👥</span>
                    <h4>Línea de Tiempo de Tanda ({{ tandaMembers }} Miembros)</h4>
                  </div>
                  
                  <div class="tanda-timeline">
                    <div class="timeline-item" *ngFor="let milestone of getTandaMilestones()">
                      <div class="timeline-marker" [class]="milestone.type">
                        <span>{{ milestone.type === 'entrega' ? '✓' : '⏱' }}</span>
                      </div>
                      <div class="timeline-content">
                        <span class="timeline-duration">{{ milestone.duration }}m</span>
                        <span class="timeline-label">{{ milestone.label }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="results-actions" *ngIf="(packageData && currentMode === 'acquisition') || (savingsScenario && currentMode === 'savings')">
              <button (click)="shareWhatsApp()" class="action-btn whatsapp-btn">
                📱 Compartir por WhatsApp
              </button>
              <button (click)="speakSummary()" class="action-btn voice-btn">
                🔊 Escuchar Resumen
              </button>
              <button (click)="formalizeQuote()" class="action-btn formalize-btn">
                ✅ Formalizar {{ currentMode === 'acquisition' ? 'Cotización' : 'Simulación' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Amortization Modal -->
      <div *ngIf="showAmortizationModal" class="modal-overlay" (click)="closeAmortizationModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h4>📊 Tabla de Amortización</h4>
            <button (click)="closeAmortizationModal()" class="close-btn">×</button>
          </div>
          
          <div class="amortization-summary">
            <div class="summary-row">
              <span>Monto a financiar:</span>
              <strong>{{ amountToFinance | currency:'MXN':'symbol':'1.0-0' }}</strong>
            </div>
            <div class="summary-row">
              <span>Tasa anual:</span>
              <strong>{{ (packageData?.rate || 0) * 100 }}%</strong>
            </div>
            <div class="summary-row">
              <span>Plazo:</span>
              <strong>{{ selectedTerm }} meses</strong>
            </div>
            <div class="summary-row highlight">
              <span>Pago mensual:</span>
              <strong>{{ monthlyPayment | currency:'MXN':'symbol':'1.0-0' }}</strong>
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
                <tr *ngFor="let row of amortizationTable.slice(0, 12)">
                  <td class="num">{{ row.paymentNumber }}</td>
                  <td class="num">{{ row.monthlyPayment | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="principal num">{{ row.principal | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="interest num">{{ row.interest | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="num">{{ row.balance | currency:'MXN':'symbol':'1.0-0' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dual-cotizador {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Mode Selector */
    .mode-selector {
      margin-bottom: 32px;
    }

    .mode-title {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mode-icon {
      font-size: 32px;
    }

    .mode-tabs {
      display: flex;
      gap: 4px;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 12px;
      max-width: 600px;
    }

    .mode-tab {
      flex: 1;
      padding: 12px 20px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      color: #64748b;
    }

    .mode-tab.active {
      background: white;
      color: #0f172a;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .mode-tab:hover:not(.active) {
      background: rgba(255,255,255,0.5);
    }

    /* Main Grid */
    .cotizador-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      align-items: start;
    }

    @media (max-width: 1200px) {
      .cotizador-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Panels */
    .config-panel,
    .results-panel {
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      padding: 24px;
    }

    /* Context Section */
    .context-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e2e8f0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 16px;
    }

    .context-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 768px) {
      .context-grid {
        grid-template-columns: 1fr;
      }
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

    .form-select,
    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }

    .form-select:focus,
    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

    /* Components List */
    .components-list {
      margin-bottom: 24px;
    }

    .component-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .component-checkbox {
      position: relative;
    }

    .required-dot {
      width: 16px;
      height: 16px;
      background: #3b82f6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .required-dot::after {
      content: '';
      width: 4px;
      height: 4px;
      background: white;
      border-radius: 50%;
    }

    .component-label {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }

    .component-name {
      font-weight: 500;
      color: #374151;
    }

    .component-price {
      color: #059669;
      font-weight: 600;
      font-family: monospace;
    }

    /* Range Slider */
    .range-slider {
      width: 100%;
      height: 6px;
      background: #e2e8f0;
      border-radius: 3px;
      outline: none;
      -webkit-appearance: none;
    }

    .range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border-radius: 50%;
      cursor: pointer;
    }

    .range-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }

    /* Collection Units */
    .collection-section {
      margin-top: 20px;
    }

    .subsection-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }

    .collection-unit {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }

    .unit-input {
      flex: 1;
      padding: 8px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    .remove-unit-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: #ef4444;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .add-unit-btn {
      width: 100%;
      padding: 8px;
      border: 2px dashed #d1d5db;
      background: transparent;
      color: #3b82f6;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .add-unit-btn:hover {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.05);
    }

    /* Results Panel */
    .results-title {
      font-size: 22px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 24px;
    }

    .results-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-row.highlight {
      background: #fef3c7;
      padding: 12px;
      border-radius: 6px;
      border-bottom: none;
      margin-top: 8px;
    }

    /* Remainder Bar */
    .remainder-bar-container {
      margin-bottom: 20px;
    }

    .remainder-bar {
      display: flex;
      height: 32px;
      border-radius: 16px;
      overflow: hidden;
      background: #f3f4f6;
      margin-bottom: 8px;
    }

    .bar-section {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .bar-section.down-payment {
      background: linear-gradient(135deg, #059669, #10b981);
    }

    .bar-section.savings {
      background: linear-gradient(135deg, #3b82f6, #60a5fa);
    }

    .bar-legend {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 12px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .legend-item::before {
      content: '';
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-item.down-payment::before {
      background: #059669;
    }

    .legend-item.savings::before {
      background: #3b82f6;
    }

    .legend-item.remainder::before {
      background: #dc2626;
    }

    /* Savings Summary Cards */
    .savings-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      padding: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-align: center;
    }

    .summary-card.highlight {
      background: #fef3c7;
      border-color: #f59e0b;
    }

    .summary-card.success {
      background: #f0fdf4;
      border-color: #22c55e;
    }

    .card-label {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .card-value {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: #374151;
    }

    /* Progress Chart */
    .progress-chart h5 {
      font-weight: 600;
      margin-bottom: 12px;
    }

    .chart-container {
      display: flex;
      align-items: end;
      gap: 4px;
      height: 120px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .chart-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .bar {
      width: 100%;
      min-height: 8px;
      background: linear-gradient(to top, #3b82f6, #60a5fa);
      border-radius: 2px 2px 0 0;
      cursor: pointer;
      transition: all 0.2s;
    }

    .bar:hover {
      background: linear-gradient(to top, #2563eb, #3b82f6);
    }

    .bar-label {
      font-size: 10px;
      color: #6b7280;
      margin-top: 4px;
    }

    /* Tanda Results */
    .tanda-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .tanda-icon {
      font-size: 24px;
    }

    .tanda-timeline {
      space-y: 12px;
    }

    .timeline-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .timeline-marker {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
    }

    .timeline-marker.entrega {
      background: #22c55e;
    }

    .timeline-marker.ahorro {
      background: #f59e0b;
    }

    .timeline-content {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .timeline-duration {
      font-weight: 600;
      color: #374151;
    }

    .timeline-label {
      color: #6b7280;
    }

    /* Actions */
    .results-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }

    .action-btn {
      flex: 1;
      min-width: 120px;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .whatsapp-btn {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
    }

    .whatsapp-btn:hover {
      background: linear-gradient(135deg, #16a34a, #15803d);
    }

    .voice-btn {
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
    }

    .voice-btn:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
    }

    .formalize-btn {
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
    }

    .formalize-btn:hover {
      background: linear-gradient(135deg, #047857, #065f46);
    }

    .amortization-btn {
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .amortization-btn:hover {
      background: #2563eb;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Modal */
    .modal-overlay {
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
      border-radius: 16px;
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #e2e8f0;
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
      border-bottom: 1px solid #e2e8f0;
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
  `]
})
export class DualModeCotizadorComponent implements OnInit {
  @Input() client?: Client;
  @Input() initialMode: SimulatorMode = 'acquisition';
  @Output() onFormalize = new EventEmitter<Quote | any>();

  // State
  currentMode: SimulatorMode = 'acquisition';
  selectedMarket: Market | '' = '';
  selectedClientType: ClientType | '' = '';
  packageData?: ProductPackage;
  isLoading = false;
  
  // Acquisition Mode State
  selectedComponents: Record<string, boolean> = {};
  downPaymentPercentage = 60;
  selectedTerm = 12;
  directPaymentAmount = 0;
  
  // Savings Mode State
  initialDownPayment = 0;
  deliveryTerm = 6;
  voluntaryMonthly = 0;
  tandaMembers = 5;
  collectionUnits: CollectionUnit[] = [];
  
  // Results
  savingsScenario?: SavingsScenario;
  amortizationTable: any[] = [];
  showAmortizationModal = false;

  constructor(
    private fb: FormBuilder,
    private cotizadorEngine: CotizadorEngineService,
    private simuladorEngine: SimuladorEngineService,
    private financialCalc: FinancialCalculatorService,
    private toast: ToastService,
    private speech: SpeechService
  ) {}

  ngOnInit() {
    this.currentMode = this.initialMode;
    
    if (this.client) {
      this.selectedMarket = this.client.ecosystemId ? 'edomex' : 'aguascalientes';
      this.selectedClientType = this.client.flow?.includes('Colectivo') ? 'colectivo' : 'individual';
      this.loadPackageData();
    }
    
    this.initializeCollectionUnits();
  }

  switchMode(mode: SimulatorMode) {
    this.currentMode = mode;
    this.clearResults();
  }

  async onContextChange() {
    if (this.selectedMarket && this.selectedClientType) {
      await this.loadPackageData();
    }
  }

  async loadPackageData() {
    if (!this.selectedMarket || !this.selectedClientType) return;

    this.isLoading = true;
    
    try {
      let packageKey = '';
      
      if (this.currentMode === 'savings' && this.selectedMarket === 'edomex' && this.selectedClientType === 'colectivo') {
        packageKey = 'edomex-colectivo';
      } else if (this.client?.flow?.includes('VentaDirecta')) {
        packageKey = `${this.selectedMarket}-directa`;
      } else {
        packageKey = `${this.selectedMarket}-plazo`;
      }
      
      this.packageData = await this.cotizadorEngine.getProductPackage(packageKey);

      if (!this.packageData) {
        return;
      }

      // Initialize selected components
      this.selectedComponents = {};
      this.packageData.components.forEach(comp => {
        this.selectedComponents[comp.id] = !comp.isOptional;
      });
      
      this.selectedTerm = this.packageData.terms[0];
      this.downPaymentPercentage = this.packageData.minDownPaymentPercentage * 100;
      
      if (this.currentMode === 'acquisition') {
        this.calculateResults();
      } else if (this.currentMode === 'savings') {
        this.calculateSavingsResults();
      }
      
    } catch (error) {
      this.toast.error('Error al cargar datos del paquete');
    } finally {
      this.isLoading = false;
    }
  }

  onComponentChange(componentId: string, event: any) {
    this.selectedComponents[componentId] = event.target.checked;
    this.calculateResults();
  }

  calculateResults() {
    if (!this.packageData) return;
    // Calculation logic here - similar to existing cotizador
  }

  calculateSavingsResults() {
    if (!this.packageData || !this.selectedMarket || !this.selectedClientType) return;

    try {
      if (this.selectedMarket === 'aguascalientes' && this.selectedClientType === 'individual') {
        // AGS Liquidation scenario
        const plates = this.collectionUnits.map((_, i) => `PLACA-${i + 1}`);
        const consumptions = this.collectionUnits.map(u => parseFloat(u.consumption) || 0);
        const overprice = this.collectionUnits.length > 0 ? parseFloat(this.collectionUnits[0].overprice) || 0 : 0;
        
        this.savingsScenario = this.simuladorEngine.generateAGSLiquidationScenario(
          this.initialDownPayment,
          this.deliveryTerm,
          plates,
          consumptions,
          overprice,
          this.totalPrice
        );
      } else if (this.selectedMarket === 'edomex' && this.selectedClientType === 'individual') {
        // EdoMex Individual scenario
        const targetDownPayment = this.totalPrice * 0.2; // 20% down payment
        const consumption = this.collectionUnits.reduce((sum, u) => sum + (parseFloat(u.consumption) || 0), 0);
        const overprice = this.collectionUnits.length > 0 ? parseFloat(this.collectionUnits[0].overprice) || 0 : 0;
        
        this.savingsScenario = this.simuladorEngine.generateEdoMexIndividualScenario(
          targetDownPayment,
          consumption,
          overprice,
          this.voluntaryMonthly
        );
      }
    } catch (error) {
      this.toast.error('Error al calcular escenario de ahorro');
    }
  }

  initializeCollectionUnits() {
    this.collectionUnits = [
      { id: 1, consumption: '400', overprice: '3.0' }
    ];
  }

  addCollectionUnit() {
    const newId = Math.max(...this.collectionUnits.map(u => u.id)) + 1;
    this.collectionUnits.push({ id: newId, consumption: '', overprice: '' });
  }

  removeCollectionUnit(index: number) {
    this.collectionUnits.splice(index, 1);
    this.calculateSavingsResults();
  }

  clearResults() {
    this.savingsScenario = undefined;
    this.amortizationTable = [];
  }

  calculateAmortization() {
    if (!this.packageData || this.amountToFinance <= 0) return;

    const monthlyRate = this.packageData.rate / 12;
    const table = [];
    let balance = this.amountToFinance;

    for (let i = 1; i <= this.selectedTerm; i++) {
      const interest = balance * monthlyRate;
      const principal = this.monthlyPayment - interest;
      balance -= principal;

      table.push({
        paymentNumber: i,
        monthlyPayment: this.monthlyPayment,
        principal,
        interest,
        balance: balance > 0 ? balance : 0
      });
    }

    this.amortizationTable = table;
    this.showAmortizationModal = true;
  }

  closeAmortizationModal() {
    this.showAmortizationModal = false;
  }

  shareWhatsApp() {
    const message = this.generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  speakSummary() {
    const text = this.generateSpeechText();
    this.speech.speak(text);
  }

  formalizeQuote() {
    if (this.currentMode === 'acquisition') {
      const quote: Quote = {
        totalPrice: this.totalPrice,
        downPayment: this.downPayment,
        amountToFinance: this.amountToFinance,
        monthlyPayment: this.monthlyPayment,
        term: this.selectedTerm,
        market: this.selectedMarket,
        clientType: this.selectedClientType,
        flow: BusinessFlow.VentaPlazo
      };
      this.onFormalize.emit(quote);
    } else {
      this.onFormalize.emit(this.savingsScenario);
    }
  }

  private generateWhatsAppMessage(): string {
    if (this.currentMode === 'acquisition') {
      return `🛒 *Cotización ${this.selectedMarket.toUpperCase()}*

💰 *Resumen:*
• Precio total: ${this.formatCurrency(this.totalPrice)}
• Enganche: ${this.formatCurrency(this.downPayment)}
• ${this.isVentaDirecta ? 'Remanente' : 'Financiamiento'}: ${this.formatCurrency(this.amountToFinance)}
${!this.isVentaDirecta ? `• Pago mensual: ${this.formatCurrency(this.monthlyPayment)}` : ''}
${!this.isVentaDirecta ? `• Plazo: ${this.selectedTerm} meses` : ''}

¿Te interesa formalizar esta cotización?`;
    } else {
      return `💰 *Simulación de Ahorro ${this.selectedMarket.toUpperCase()}*

📊 *Tu Plan:*
• Meta: ${this.formatCurrency(this.savingsScenario?.targetAmount || 0)}
• Ahorro mensual: ${this.formatCurrency(this.savingsScenario?.monthlyContribution || 0)}
• Tiempo estimado: ${this.savingsScenario?.monthsToTarget || 0} meses

¿Quieres formalizar este plan de ahorro?`;
    }
  }

  private generateSpeechText(): string {
    if (this.currentMode === 'acquisition') {
      return `Cotización calculada. El precio total es ${this.formatCurrency(this.totalPrice)}. 
               ${this.isVentaDirecta ? 
                 `Con un pago inicial de ${this.formatCurrency(this.downPayment)}, queda un remanente de ${this.formatCurrency(this.amountToFinance)}.` :
                 `Con un enganche de ${this.formatCurrency(this.downPayment)} y un financiamiento de ${this.formatCurrency(this.amountToFinance)} a ${this.selectedTerm} meses, el pago mensual sería de ${this.formatCurrency(this.monthlyPayment)}.`}`;
    } else {
      return `Simulación de ahorro completada. Tu meta es ${this.formatCurrency(this.savingsScenario?.targetAmount || 0)}. 
               Con un ahorro mensual de ${this.formatCurrency(this.savingsScenario?.monthlyContribution || 0)}, 
               lograrás tu objetivo en ${this.savingsScenario?.monthsToTarget || 0} meses.`;
    }
  }

  private formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }

  // Getters for calculated values
  get totalPrice(): number {
    if (!this.packageData) return 0;
    
    return this.packageData.components
      .filter(comp => this.selectedComponents[comp.id])
      .reduce((sum, comp) => {
        const years = Math.ceil(this.selectedTerm / 12);
        return sum + (comp.isMultipliedByTerm ? comp.price * years : comp.price);
      }, 0);
  }

  get downPayment(): number {
    if (this.isVentaDirecta) {
      return this.directPaymentAmount;
    }
    return this.totalPrice * (this.downPaymentPercentage / 100);
  }

  get amountToFinance(): number {
    return this.totalPrice - this.downPayment;
  }

  get monthlyPayment(): number {
    if (this.isVentaDirecta || !this.packageData || this.amountToFinance <= 0) {
      return 0;
    }
    
    const monthlyRate = this.packageData.rate / 12;
    return (this.amountToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -this.selectedTerm));
  }

  get isVentaDirecta(): boolean {
    return this.client?.flow?.includes('VentaDirecta') || false;
  }

  // Helper methods for savings results
  getBarPercentage(type: 'downPayment' | 'savings'): number {
    if (!this.savingsScenario) return 0;
    
    const total = this.savingsScenario.targetAmount;
    if (type === 'downPayment') {
      return (this.initialDownPayment / total) * 100;
    } else {
      const projected = this.getProjectedSavings();
      return (projected / total) * 100;
    }
  }

  getProjectedSavings(): number {
    if (!this.savingsScenario) return 0;
    return this.savingsScenario.monthlyContribution * this.savingsScenario.monthsToTarget;
  }

  getRemainder(): number {
    if (!this.savingsScenario) return 0;
    return Math.max(0, this.savingsScenario.targetAmount - this.initialDownPayment - this.getProjectedSavings());
  }

  getChartBarHeight(balance: number, target: number): string {
    const percentage = Math.min((balance / target) * 100, 100);
    return `${percentage}%`;
  }

  getTandaMilestones(): any[] {
    // Simplified tanda milestones - would integrate with TandaEngineService
    return [
      { type: 'ahorro', duration: 2.3, label: 'Ahorro para primer enganche' },
      { type: 'entrega', duration: 0.1, label: 'Entrega primera unidad' },
      { type: 'ahorro', duration: 1.8, label: 'Ahorro para segundo enganche' },
      { type: 'entrega', duration: 0.1, label: 'Entrega segunda unidad' }
    ];
  }
}