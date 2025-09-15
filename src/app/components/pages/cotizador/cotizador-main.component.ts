import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Market, BusinessFlow, Client } from '../../../models/types';
import { Quote, ProductPackage, ClientType, SimulatorMode } from '../../../models/business';
import { TandaMilestone } from '../../../models/tanda';
import { CotizadorEngineService, ProductComponent } from '../../../services/cotizador-engine.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { SavingsProjectionChartComponent } from '../../shared/savings-projection-chart.component';
import { TandaTimelineComponent } from '../../shared/tanda-timeline.component';
import { ToastService } from '../../../services/toast.service';

interface CollectionUnit {
  id: number;
  consumption: string;
  overprice: string;
}

interface AmortizationRow {
  paymentNumber: number;
  monthlyPayment: number;
  principal: number;
  interest: number;
  balance: number;
}

@Component({
  selector: 'app-cotizador-main',
  standalone: true,
  imports: [CommonModule, FormsModule, SavingsProjectionChartComponent, TandaTimelineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cotizador-container command-container">
      <!-- Header Section -->
      <div class="cotizador-header">
        <h2 class="cotizador-title command-title">
          🧮 {{ client ? 'Simulador para ' + client.name : 'Simulador de Soluciones' }}
        </h2>
      </div>

      <!-- Sticky Finance Summary -->
      <div *ngIf="pkg" class="sticky-summary" role="region" aria-label="Resumen financiero" data-cy="cotizador-summary">
        <div class="summary-grid">
          <div class="summary-item">
            <div class="label">Precio</div>
            <div class="value" title="Precio total del paquete" data-cy="sum-precio">{{ formatCurrency(totalPrice) }}</div>
          </div>
          <div class="summary-item">
            <div class="label">Enganche</div>
            <div class="value" title="Enganche estimado" data-cy="sum-enganche">{{ formatCurrency(downPayment) }} ({{ (downPayment/Math.max(totalPrice,1) * 100) | number:'1.0-0' }}%)</div>
          </div>
          <div class="summary-item">
            <div class="label">A Financiar</div>
            <div class="value primary" title="Monto a financiar" data-cy="sum-financiar">{{ formatCurrency(amountToFinance) }}</div>
          </div>
          <div class="summary-item">
            <div class="label">PMT</div>
            <div class="value accent" title="Pago mensual estimado (PMT)" data-cy="sum-pmt">{{ formatCurrency(monthlyPayment) }}</div>
          </div>
          <div class="summary-item">
            <div class="label">Plazo</div>
            <div class="value" title="Plazo en meses" data-cy="sum-plazo">{{ term }} meses</div>
          </div>
          <div class="summary-item insurance" *ngIf="!isVentaDirecta">
            <div class="row">
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="includeInsurance" data-cy="toggle-insurance" />
                <span>Incluir seguros</span>
              </label>
              <input 
                *ngIf="includeInsurance"
                class="insurance-input"
                type="number"
                min="0"
                [placeholder]="'Monto de seguros'"
                [(ngModel)]="insuranceAmount" data-cy="insurance-amount"
              />
            </div>
            <div class="row" *ngIf="includeInsurance">
              <label class="toggle small">
                <input type="radio" name="insMode" value="financiado" [(ngModel)]="insuranceMode" data-cy="ins-financiado" />
                <span>Financiado (sumar a F)</span>
              </label>
              <label class="toggle small">
                <input type="radio" name="insMode" value="contado" [(ngModel)]="insuranceMode" data-cy="ins-contado" />
                <span>Contado (cargo aparte)</span>
              </label>
            </div>
          </div>
        </div>
        
        <!-- First payment breakdown -->
        <div *ngIf="!isVentaDirecta && amountToFinance>0 && term>0" class="first-payment">
          <div class="fp-label">Primer pago:</div>
          <div class="fp-item"><span>I₁</span> <strong>{{ formatCurrency(firstInterest) }}</strong></div>
          <div class="fp-item"><span>K₁</span> <strong class="capital">{{ formatCurrency(firstPrincipal) }}</strong></div>
          <div class="fp-item"><span>S₁</span> <strong class="balance">{{ formatCurrency(firstBalance) }}</strong></div>
        </div>
      </div>

      <!-- Main Content -->
      <div [class]="initialMode === 'acquisition' ? 'acquisition-layout' : 'savings-layout'">
        
        <!-- Left Panel: Configuration -->
        <div class="config-panel">
          <!-- Context Selectors (only if no client) -->
          <div *ngIf="!client" class="context-section">
            <h4 class="section-title primary">1. Contexto</h4>
            <div class="context-grid">
              <div class="form-group">
                <label for="market">Mercado</label>
                <select id="market" [(ngModel)]="market" (change)="onMarketChange()" class="premium-select">
                  <option value="">-- Elige --</option>
                  <option value="aguascalientes">Aguascalientes</option>
                  <option value="edomex">Estado de México</option>
                </select>
              </div>
              <div class="form-group">
                <label for="clientType">Tipo de Cliente</label>
                <select id="clientType" [(ngModel)]="clientType" (change)="onClientTypeChange()" [disabled]="!market" class="premium-select">
                  <option value="">-- Elige --</option>
                  <option value="individual">Individual</option>
                  <option value="colectivo" *ngIf="market === 'edomex'">Crédito Colectivo</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading" class="loading-state premium-card">
            <div class="loading-spinner"></div>
            <p>Cargando paquete...</p>
          </div>

          <!-- Package Components -->
          <div *ngIf="pkg" class="package-section premium-card">
            <h4 class="section-title primary">2. Paquete de Producto</h4>
            <div class="components-list">
              <div *ngFor="let comp of pkg.components" class="component-item">
                <div class="component-info">
                  <div class="component-checkbox">
                    <input 
                      *ngIf="comp.isOptional" 
                      type="checkbox" 
                      [id]="comp.id"
                      [checked]="selectedOptions[comp.id]"
                      (change)="toggleComponent(comp.id)"
                    />
                    <div *ngIf="!comp.isOptional" class="required-dot"></div>
                  </div>
                  <label [for]="comp.id" class="component-name">{{ comp.name }}</label>
                </div>
                <span class="component-price">{{ formatCurrency(comp.price) }}</span>
              </div>
            </div>
          </div>

          <!-- Financial Structure -->
          <div *ngIf="pkg" class="financial-section">
            <!-- Acquisition Mode Controls -->
            <div *ngIf="initialMode === 'acquisition'">
              <div *ngIf="isVentaDirecta">
                <h4 class="section-title primary">3. Estructura de Pago</h4>
                <div class="form-group">
                  <label for="downPaymentAmount">Pago Inicial</label>
                  <input 
                    type="number" 
                    id="downPaymentAmount" 
                    [(ngModel)]="downPaymentAmountDirect"
                    (input)="onDownPaymentDirectChange()"
                    class="premium-input"
                    placeholder="Ej: 400000"
                  />
                </div>
              </div>
              
              <div *ngIf="!isVentaDirecta">
                <h4 class="section-title primary">3. Estructura Financiera</h4>
                <div class="financial-controls premium-card">
                  <div class="form-group">
                    <label for="downPayment">Enganche ({{ downPaymentPercentage }}%)</label>
                    <input 
                      type="range" 
                      id="downPayment"
                      [min]="pkg.minDownPaymentPercentage * 100"
                      max="90"
                      [(ngModel)]="downPaymentPercentage"
                      (input)="onDownPaymentSliderChange()"
                      class="form-range premium-input"
                      [attr.aria-describedby]="'dp-note'"
                      [attr.title]="'Ajusta el % de enganche. Mínimo según política y paquete'"
                    />
                    <div class="range-note" id="dp-note">
                      Mínimo: {{ pkg.minDownPaymentPercentage * 100 }}% ({{ formatCurrency(minDownPaymentRequired) }})
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="term">Plazo (meses)</label>
                    <select id="term" [(ngModel)]="term" (change)="onTermChange()" class="premium-select" title="Selecciona el plazo del financiamiento en meses">
                      <option *ngFor="let t of pkg.terms" [value]="t">{{ t }} meses</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Mode Controls -->
            <div *ngIf="initialMode === 'savings'">
              <h4 class="section-title amber">2. Simulación de Ahorro</h4>
              
              <!-- Aguascalientes Individual -->
              <div *ngIf="market === 'aguascalientes' && clientType === 'individual'" class="savings-controls">
                <div class="form-group">
                  <label for="initialDown">Enganche Inicial (Aportación Fuerte)</label>
                  <input 
                    type="number" 
                    id="initialDown"
                    [(ngModel)]="initialDownPayment"
                    (input)="onSavingsConfigChange()"
                    class="premium-input" title="Monto de enganche disponible al inicio"
                    placeholder="Ej: 400000"
                  />
                </div>
                <div class="form-group">
                  <label for="deliveryTerm">Fecha de Entrega Estimada ({{ deliveryTerm }} meses)</label>
                  <input 
                    type="range" 
                    id="deliveryTerm"
                    min="3" 
                    max="6"
                    [(ngModel)]="deliveryTerm"
                    (input)="onSavingsConfigChange()"
                    class="form-range premium-input" title="Mes estimado de entrega"
                  />
                </div>
              </div>

              <!-- EdoMex Colectivo -->
              <div *ngIf="market === 'edomex' && clientType === 'colectivo'" class="savings-controls">
                <div class="form-group">
                  <label for="tandaMembers">Número de Integrantes ({{ tandaMembers }})</label>
                  <input 
                    type="range" 
                    id="tandaMembers"
                    min="2" 
                    max="20"
                    [(ngModel)]="tandaMembers"
                    (input)="onTandaMembersChange()"
                    class="form-range premium-input" title="Número de integrantes del grupo"
                  />
                </div>
              </div>

              <!-- Default Savings -->
              <div *ngIf="!(market === 'aguascalientes' && clientType === 'individual') && !(market === 'edomex' && clientType === 'colectivo')" class="savings-controls">
                <div class="form-group">
                  <label for="voluntary">Aportación Voluntaria Mensual ({{ formatCurrency(toNumber(voluntaryContribution) || 0) }})</label>
                  <input 
                    type="range"
                    min="0"
                    max="10000"
                    step="500"
                    [(ngModel)]="voluntaryContribution"
                    (input)="onSavingsConfigChange()"
                    class="form-range premium-input" title="Aportación voluntaria mensual"
                  />
                  <input 
                    type="number" 
                    id="voluntary"
                    [(ngModel)]="voluntaryContribution"
                    (input)="onSavingsConfigChange()"
                    class="premium-input"
                  />
                </div>
              </div>

              <!-- Collection Configuration -->
              <div class="collection-section">
                <h5 class="collection-title">Configurador de Recaudación</h5>
                <div class="collection-units">
                  <div *ngFor="let unit of collectionUnits" class="collection-unit">
                    <input 
                      type="number" 
                      [placeholder]="'Consumo (L) - Unidad ' + unit.id"
                      [(ngModel)]="unit.consumption"
                      (input)="onSavingsConfigChange()"
                      class="collection-input"
                    />
                    <input 
                      type="number" 
                      [placeholder]="'Sobreprecio ($) - Unidad ' + unit.id"
                      [(ngModel)]="unit.overprice"
                      (input)="onSavingsConfigChange()"
                      class="collection-input"
                    />
                  </div>
                </div>
                <button class="btn-add-unit" (click)="addCollectionUnit()">
                  [+] Agregar Unidad a Recaudar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Results -->
        <div class="results-panel">
          <div *ngIf="pkg">
            <!-- Acquisition Mode Results -->
            <div *ngIf="initialMode === 'acquisition'">
              <h3 class="results-title">Resultados y Amortización</h3>
              
              <!-- Pricing Summary -->
              <div class="pricing-summary">
                <div class="price-row">
                  <span>Precio Total:</span>
                  <span class="price-value">{{ formatCurrency(totalPrice) }}</span>
                </div>
                
                <div *ngIf="isVentaDirecta">
                  <div class="price-row">
                    <span>Pago Inicial:</span>
                    <span class="price-value">{{ formatCurrency(downPayment) }}</span>
                  </div>
                  <hr class="price-divider">
                  <div class="price-row total-row">
                    <span>Remanente a Liquidar:</span>
                    <span class="price-value primary">{{ formatCurrency(amountToFinance) }}</span>
                  </div>
                </div>
                
                <div *ngIf="!isVentaDirecta">
                  <div class="price-row">
                    <span>Enganche:</span>
                    <span class="price-value">{{ formatCurrency(downPayment) }}</span>
                  </div>
                  <div class="price-row">
                    <span>Monto a Financiar:</span>
                    <span class="price-value">{{ formatCurrency(amountToFinance) }}</span>
                  </div>
                  <div class="price-row" *ngIf="includeInsurance && insuranceMode==='contado'">
                    <span>Seguro (contado):</span>
                    <span class="price-value">{{ formatCurrency(toNumber(insuranceAmount) || 0) }}</span>
                  </div>
                  <hr class="price-divider">
                  <div class="price-row total-row">
                    <span>Pago Mensual (Est.):</span>
                    <span class="price-value primary">{{ formatCurrency(monthlyPayment) }}</span>
                  </div>
                </div>
              </div>

              <!-- Amortization Button -->
              <button 
                *ngIf="!isVentaDirecta" 
                (click)="calculateAmortization()" 
                class="btn-amortization" data-cy="calc-amort" title="Calcula la tabla de amortización para el monto a financiar"
              >
                Calcular y Ver Amortización
              </button>

              <!-- Amortization Table -->
              <div *ngIf="amortizationTable.length > 0 && !isVentaDirecta" class="amortization-table">
                <div class="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th># Pago</th>
                        <th>Pago Mensual</th>
                        <th>Capital</th>
                        <th>Interés</th>
                        <th>Saldo Insoluto</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let row of amortizationTable">
                        <td>{{ row.paymentNumber }}</td>
                        <td>{{ formatCurrency(row.monthlyPayment) }}</td>
                        <td class="capital">{{ formatCurrency(row.principal) }}</td>
                        <td class="interest">{{ formatCurrency(row.interest) }}</td>
                        <td class="balance">{{ formatCurrency(row.balance) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Protection Demo -->
              <div *ngIf="monthlyPayment > 0 && !isVentaDirecta" class="protection-demo">
                <div class="protection-content">
                  <div class="protection-icon">🛡️</div>
                  <div class="protection-info">
                    <h4>Demostración de Protección Conductores</h4>
                    <p>Muestra al cliente cómo puede proteger sus pagos en caso de imprevistos. Un diferenciador clave de nuestra oferta.</p>
                    <button class="btn-protection" (click)="openProtectionDemo()">
                      Ver cómo funciona
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Mode Results -->
            <div *ngIf="initialMode === 'savings'">
              <h3 class="results-title">Proyección de Ahorro</h3>
              
              <!-- Aguascalientes Individual: Remainder Bar -->
              <div *ngIf="market === 'aguascalientes' && clientType === 'individual'" class="remainder-bar">
                <div class="remainder-header">
                  <span>Total del Paquete:</span>
                  <span class="remainder-total">{{ formatCurrency(totalPrice) }}</span>
                </div>
                <div class="remainder-visual">
                  <div 
                    class="bar-segment bar-down" 
                    [style.width.%]="getDownPaymentPercentage()"
                    [title]="'Enganche: ' + formatCurrency(toNumber(initialDownPayment) || 0)"
                  ></div>
                  <div 
                    class="bar-segment bar-saved" 
                    [style.width.%]="getSavedPercentage()"
                    [title]="'Ahorro: ' + formatCurrency(projectedCollectionSavings)"
                  ></div>
                </div>
                <div class="remainder-footer">
                  <span>Remanente a Liquidar:</span>
                  <span class="remainder-amount">{{ formatCurrency(totalPrice - (toNumber(initialDownPayment) || 0) - projectedCollectionSavings) }}</span>
                </div>
              </div>

              <!-- EdoMex Individual: Savings Projection -->
              <div *ngIf="market === 'edomex' && clientType === 'individual'" class="savings-projection">
                <div class="projection-summary">
                  <div class="projection-row total-row">
                    <span>Meta de Enganche:</span>
                    <span class="projection-value">{{ formatCurrency(downPayment) }}</span>
                  </div>
                  <div class="projection-row">
                    <span>Ahorro Mensual Proyectado:</span>
                    <span class="projection-value">{{ formatCurrency(monthlySavings) }}</span>
                  </div>
                  <hr class="projection-divider">
                  <div class="time-estimate">
                    <p>Tiempo Estimado para Alcanzar el Enganche</p>
                    <p class="time-value">{{ timeToGoal > 0 ? timeToGoal.toFixed(1) + ' meses' : 'N/A' }}</p>
                  </div>
                </div>
                <app-savings-projection-chart [goal]="downPayment" [monthlySavings]="monthlySavings"></app-savings-projection-chart>
              </div>

              <!-- EdoMex Colectivo: Tanda Timeline -->
              <div *ngIf="market === 'edomex' && clientType === 'colectivo'" class="tanda-timeline">
                <div class="tanda-header">
                  <div class="tanda-icon">👥</div>
                  <h4>Línea de Tiempo de Tanda ({{ tandaMembers }} Miembros)</h4>
                </div>
                <p class="tanda-subtitle">Proyección del "efecto bola de nieve" para la entrega de unidades.</p>
                <app-tanda-timeline [milestones]="tandaTimeline"></app-tanda-timeline>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div *ngIf="!pkg && !isLoading" class="empty-results">
            <p>Selecciona el contexto para continuar.</p>
          </div>

          <!-- Action Buttons -->
          <div *ngIf="pkg" class="action-section">
            <button class="btn-secondary" (click)="generateOnePagePDF()" data-cy="cotizador-pdf">Generar Propuesta en PDF</button>
            <button class="btn-primary" (click)="handleFormalizeClick()">
              Formalizar y Continuar Proceso
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './cotizador-main.component.scss',
})
export class CotizadorMainComponent implements OnInit, OnDestroy {
  Math = Math;
  @Input() client?: Client;
  @Input() initialMode: SimulatorMode = 'acquisition';
  @Output() onFormalize = new EventEmitter<Quote | Event>();

  private destroy$ = new Subject<void>();
  toNumber(value: any): number {
    const n = typeof value === 'number' ? value : parseFloat(value || '0');
    return isNaN(n) ? 0 : n;
  }

  // Port exacto de state desde React Cotizador
  market: Market | '' = '';
  clientType: ClientType | '' = '';
  pkg: ProductPackage | null = null;
  isLoading = false;

  // State for Acquisition Mode (port exacto líneas 125-131)
  selectedOptions: Record<string, boolean> = {};
  downPaymentPercentage = 20;
  term = 0;
  amortizationTable: AmortizationRow[] = [];
  downPaymentAmountDirect = '';

  // State for Savings Mode (port exacto líneas 132-138)
  initialDownPayment = '0';
  deliveryTerm = 3;
  voluntaryContribution = '0';
  collectionUnits: CollectionUnit[] = [];
  tandaMembers = 5;
  isProtectionDemoOpen = false;

  // UX improvements: insurance financing and first payment breakdown
  includeInsurance = false;
  insuranceAmount: any = '';
  insuranceMode: 'financiado' | 'contado' = 'financiado';

  constructor(
    private cotizadorEngine: CotizadorEngineService,
    private pdf: PdfExportService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Port exacto de useEffect desde React líneas 150-162
    if (this.client) {
      const clientMarket = this.client.ecosystemId ? 'edomex' : 'aguascalientes';
      const clientCtype = this.client.flow === BusinessFlow.CreditoColectivo ? 'colectivo' : 'individual';
      this.market = clientMarket;
      this.clientType = clientCtype;
    } else {
      this.market = '';
      this.clientType = '';
      this.pkg = null;
    }

    // Trigger package fetch if we have both market and clientType
    if (this.market && this.clientType) {
      this.fetchPackage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Port exacto de computed properties desde React líneas 148, 206-233
  get isVentaDirecta(): boolean {
    return this.client?.flow === BusinessFlow.VentaDirecta;
  }

  get totalPrice(): number {
    if (!this.pkg) return 0;
    const years = this.term / 12;
    return this.pkg.components.reduce((sum, comp) => {
      // Include component if it's required OR if it's optional and selected
      if (!comp.isOptional || this.selectedOptions[comp.id]) {
        return sum + (comp.isMultipliedByTerm ? comp.price * Math.ceil(years) : comp.price);
      }
      return sum;
    }, 0);
  }

  get minDownPaymentRequired(): number {
    return this.totalPrice * (this.pkg?.minDownPaymentPercentage || 0);
  }

  get downPayment(): number {
    if (this.isVentaDirecta) {
      return parseFloat(this.downPaymentAmountDirect) || 0;
    }
    return this.totalPrice * (this.downPaymentPercentage / 100);
  }

  get amountToFinance(): number {
    const base = this.totalPrice - this.downPayment;
    if (this.isVentaDirecta) return base;
    const ins = this.includeInsurance ? (parseFloat(this.insuranceAmount) || 0) : 0;
    const addToF = this.includeInsurance && this.insuranceMode === 'financiado' ? ins : 0;
    return Math.max(0, base + addToF);
  }

  get monthlyPayment(): number {
    if (this.amountToFinance <= 0 || !this.term || !this.pkg?.rate) return 0;
    const monthlyRate = this.pkg.rate / 12;
    return (this.amountToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -this.term));
  }

  // First amortization row breakdown (I1, K1, S1)
  get firstInterest(): number {
    if (!this.pkg?.rate) return 0;
    const r = this.pkg.rate / 12;
    return this.amountToFinance * r;
  }
  get firstPrincipal(): number {
    const pmt = this.monthlyPayment;
    return Math.max(0, pmt - this.firstInterest);
  }
  get firstBalance(): number {
    return Math.max(0, this.amountToFinance - this.firstPrincipal);
  }

  // Port exacto de savings calculations desde React líneas 235-282
  get monthlySavings(): number {
    const voluntary = parseFloat(this.voluntaryContribution) || 0;
    const collection = this.collectionUnits.reduce((sum, unit) => 
      sum + ((parseFloat(unit.consumption) || 0) * (parseFloat(unit.overprice) || 0)), 0);
    return voluntary + collection;
  }

  get timeToGoal(): number {
    const goal = this.downPayment;
    return goal > 0 && this.monthlySavings > 0 ? goal / this.monthlySavings : 0;
  }

  get projectedCollectionSavings(): number {
    const collection = this.collectionUnits.reduce((sum, unit) => 
      sum + ((parseFloat(unit.consumption) || 0) * (parseFloat(unit.overprice) || 0)), 0);
    return collection * this.deliveryTerm;
  }

  get tandaTimeline(): TandaMilestone[] {
    // Port exacto de Tanda Timeline Simulation desde React líneas 244-279
    if (!this.pkg || this.clientType !== 'colectivo' || this.initialMode !== 'savings' || 
        this.totalPrice <= 0 || this.tandaMembers <= 0) {
      return [];
    }

    const downPaymentGoal = this.pkg.minDownPaymentPercentage * this.totalPrice;
    const singleMemberMonthlySaving = this.monthlySavings;
    const individualAmountToFinance = this.totalPrice - downPaymentGoal;
    
    let individualMonthlyPayment = 0;
    if (individualAmountToFinance > 0 && this.pkg.rate > 0 && this.pkg.terms.length > 0) {
      const individualTerm = this.pkg.terms[0];
      const monthlyRate = this.pkg.rate / 12;
      individualMonthlyPayment = (individualAmountToFinance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -individualTerm));
    }

    const totalGroupMonthlyIncome = this.tandaMembers * singleMemberMonthlySaving;
    const timeline: TandaMilestone[] = [];
    let accumulatedSavingsSurplus = 0;
    let membersPaying = 0;

    for (let i = 1; i <= this.tandaMembers; i++) {
      const currentMonthlyDebtPayment = membersPaying * individualMonthlyPayment;
      const netSavingsPerMonth = totalGroupMonthlyIncome - currentMonthlyDebtPayment;
      
      if (netSavingsPerMonth <= 0) break;

      const savingsNeeded = downPaymentGoal - accumulatedSavingsSurplus;
      const monthsToSave = savingsNeeded > 0 ? savingsNeeded / netSavingsPerMonth : 0;
      
      timeline.push({ 
        type: 'ahorro', 
        duration: monthsToSave, 
        label: `Ahorro para Enganche ${i}`,
        month: i,
        completed: false,
        current: i === 1,
        emoji: '💰',
        title: `Enganche ${i}`,
        description: `Acumulando ${this.formatCurrency(downPaymentGoal)} para la entrega`,
        amount: downPaymentGoal
      });
      
      timeline.push({ 
        type: 'entrega', 
        unitNumber: i, 
        duration: 0.1, 
        label: `Entrega Unidad ${i}`,
        month: i,
        completed: false,
        current: false,
        emoji: '🚐',
        title: `Entrega ${i}`,
        description: `Unidad #${i} entregada al grupo`
      });

      const totalSavingsGeneratedThisCycle = accumulatedSavingsSurplus + (monthsToSave * netSavingsPerMonth);
      accumulatedSavingsSurplus = totalSavingsGeneratedThisCycle - downPaymentGoal;
      membersPaying++;
    }

    return timeline;
  }

  // Event handlers - port exacto desde React
  onMarketChange(): void {
    this.clientType = '';
    this.pkg = null;
  }

  onClientTypeChange(): void {
    if (this.market && this.clientType) {
      this.fetchPackage();
    }
  }

  onDownPaymentSliderChange(): void {
    // Triggered by slider change
  }

  onDownPaymentDirectChange(): void {
    // Triggered by direct payment input
  }

  onTermChange(): void {
    // Triggered by term selection
  }

  onSavingsConfigChange(): void {
    // Triggered by any savings config change
  }

  onTandaMembersChange(): void {
    // Triggered by tanda members slider
  }

  toggleComponent(componentId: string): void {
    this.selectedOptions[componentId] = !this.selectedOptions[componentId];
  }

  addCollectionUnit(): void {
    const newId = Date.now();
    this.collectionUnits.push({
      id: newId,
      consumption: '',
      overprice: ''
    });
  }

  // Port exacto de fetchPackage desde React líneas 164-200
  private fetchPackage(): void {
    if (!this.market || !this.clientType) {
      this.pkg = null;
      return;
    }

    let packageKey: string;
    const isTandaScenario = this.initialMode === 'savings' && this.market === 'edomex' && this.clientType === 'colectivo';

    if (isTandaScenario) {
      packageKey = 'edomex-colectivo';
    } else if (this.client?.flow === BusinessFlow.VentaDirecta) {
      packageKey = `${this.market}-directa`;
    } else {
      packageKey = `${this.market}-plazo`;
    }

    this.isLoading = true;
    this.cotizadorEngine.getProductPackage(packageKey).subscribe({
      next: (data) => {
        this.pkg = data;
        const initialOptions: Record<string, boolean> = {};
        data.components.forEach((c: ProductComponent) => { 
          initialOptions[c.id] = !c.isOptional; 
        });
        this.selectedOptions = initialOptions;
        this.term = data.terms[0] || 0;
        this.downPaymentPercentage = data.minDownPaymentPercentage * 100;
        this.tandaMembers = data.defaultMembers || 5;
        this.amortizationTable = [];
        this.collectionUnits = [];
        this.voluntaryContribution = '0';
        this.downPaymentAmountDirect = '';
        this.isLoading = false;
      },
      error: (error) => {
        this.toast.error(`Error al cargar el paquete para ${this.market}`);
        this.pkg = null;
        this.isLoading = false;
      }
    });
  }

  // Port exacto de calculateAmortization desde React líneas 318-331
  calculateAmortization(): void {
    if (this.amountToFinance <= 0) {
      this.toast.error("El monto a financiar debe ser mayor a cero.");
      return;
    }

    const table: AmortizationRow[] = [];
    let balance = this.amountToFinance;
    const monthlyRate = this.pkg!.rate / 12;
    
    for (let i = 1; i <= this.term; i++) {
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
    this.toast.success("Tabla de amortización calculada.");
  }

  // Port exacto de handleFormalizeClick desde React líneas 284-315
  handleFormalizeClick(): void {
    if (!this.client) {
      this.onFormalize.emit(new Event('formalize'));
      return;
    }

    if (!this.pkg || !this.market || !this.clientType) {
      this.toast.error("Completa la configuración antes de formalizar.");
      return;
    }

    const quoteFlow = this.initialMode === 'savings' 
      ? BusinessFlow.AhorroProgramado 
      : this.client.flow;
    
    const finalFlow = this.client.flow === BusinessFlow.CreditoColectivo 
      ? BusinessFlow.CreditoColectivo 
      : quoteFlow;

    const quote: Quote = {
      totalPrice: this.totalPrice,
      downPayment: this.downPayment,
      amountToFinance: this.amountToFinance,
      term: this.term,
      monthlyPayment: this.monthlyPayment,
      market: this.market,
      clientType: this.clientType,
      flow: finalFlow,
    };
    
    this.onFormalize.emit(quote);
  }

  openProtectionDemo(): void {
    this.isProtectionDemoOpen = true;
    // Would open modal with ProtectionDemoSimulator
    console.log('Opening protection demo with:', {
      amountToFinance: this.amountToFinance,
      monthlyPayment: this.monthlyPayment,
      term: this.term
    });
  }

  // Utility methods for savings mode calculations
  getDownPaymentPercentage(): number {
    const initialDown = parseFloat(this.initialDownPayment) || 0;
    return this.totalPrice > 0 ? (initialDown / this.totalPrice) * 100 : 0;
  }

  getSavedPercentage(): number {
    return this.totalPrice > 0 ? (this.projectedCollectionSavings / this.totalPrice) * 100 : 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }

  async generateOnePagePDF(): Promise<void> {
    try {
      if (!this.pkg) { this.toast.error('Selecciona un paquete primero'); return; }
      const quoteData = {
        clientInfo: { name: this.client?.name || 'Cliente', contact: this.client?.email || '' },
        ecosystemInfo: { name: this.market || '-', route: this.client?.collectiveGroupName || '-', market: (this.market === 'aguascalientes' ? 'AGS' : 'EDOMEX') as any },
        quoteDetails: {
          vehicleValue: this.totalPrice,
          downPaymentOptions: [this.downPayment],
          monthlyPaymentOptions: [Math.round(this.monthlyPayment)],
          termOptions: [this.term || (this.pkg.terms[0] || 24)],
          interestRate: Math.round((this.pkg.rate || 0) * 10000) / 100
        },
        validUntil: new Date(Date.now() + 14 * 86400000),
        quoteNumber: 'Q-' + Date.now()
      };
      const blob = await this.pdf.generateQuotePDF(quoteData as any);
      this.pdf.downloadPDF(blob, `cotizacion-${Date.now()}.pdf`);
      this.toast.success('PDF generado');
    } catch (e) {
      this.toast.error('No se pudo generar el PDF');
    }
  }
}
