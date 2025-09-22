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
    <!-- Skip Link for Accessibility -->
    <a class="skip-link" href="#cotizador-content">Saltar al contenido del cotizador</a>

    <div class="ui-container ui-section">
      <!-- Header Section -->
      <div class="mb-8">
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {{ client ? 'Cotizador para ' + client.name : 'Cotizador de Soluciones' }}
        </h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          Configuración de paquetes y simulaciones financieras
        </p>
      </div>

      <!-- Financial Summary Cards -->
      <div *ngIf="pkg" class="ui-grid-metrics mb-8" role="region" aria-label="Resumen financiero" data-cy="cotizador-summary">
        <div class="ui-metric-card">
          <div class="ui-metric-label">Precio Total</div>
          <div class="ui-metric-value" data-cy="sum-precio">{{ formatCurrency(totalPrice) }}</div>
        </div>
        <div class="ui-metric-card">
          <div class="ui-metric-label">Enganche</div>
          <div class="ui-metric-value" data-cy="sum-enganche">{{ formatCurrency(downPayment) }}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {{ (downPayment/Math.max(totalPrice,1) * 100) | number:'1.0-0' }}%
          </div>
        </div>
        <div class="ui-metric-card">
          <div class="ui-metric-label">A Financiar</div>
          <div class="ui-metric-value text-sky-600 dark:text-sky-400" data-cy="sum-financiar">{{ formatCurrency(amountToFinance) }}</div>
        </div>
        <div class="ui-metric-card">
          <div class="ui-metric-label">PMT Mensual</div>
          <div class="ui-metric-value text-sky-600 dark:text-sky-400" data-cy="sum-pmt">{{ formatCurrency(monthlyPayment) }}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {{ term }} meses
          </div>
        </div>
      </div>

      <!-- Insurance Configuration -->
      <div *ngIf="!isVentaDirecta && pkg" class="ui-card mb-6">
        <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4">Configuración de Seguros</h3>
        <div class="space-y-4">
          <label class="flex items-center text-sm text-slate-600 dark:text-slate-400">
            <input type="checkbox" [(ngModel)]="includeInsurance" class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded mr-2" data-cy="toggle-insurance" />
            Incluir seguros en la cotización
          </label>
          <div *ngIf="includeInsurance" class="space-y-3 pl-6">
            <div>
              <label class="ui-label">Monto de Seguros</label>
              <input type="number" min="0" [(ngModel)]="insuranceAmount" class="ui-input" placeholder="Ej: 15000" data-cy="insurance-amount" />
            </div>
            <div class="space-y-2">
              <label class="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <input type="radio" name="insMode" value="financiado" [(ngModel)]="insuranceMode" class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 mr-2" data-cy="ins-financiado" />
                Financiado (sumar al monto a financiar)
              </label>
              <label class="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <input type="radio" name="insMode" value="contado" [(ngModel)]="insuranceMode" class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 mr-2" data-cy="ins-contado" />
                Contado (pago por separado)
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- First Payment Breakdown -->
      <div *ngIf="!isVentaDirecta && amountToFinance>0 && term>0" class="ui-card mb-6">
        <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Desglose Primer Pago</h3>
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div class="text-slate-500 dark:text-slate-400">Interés (I₁)</div>
            <div class="font-medium">{{ formatCurrency(firstInterest) }}</div>
          </div>
          <div>
            <div class="text-slate-500 dark:text-slate-400">Capital (K₁)</div>
            <div class="font-medium text-green-600 dark:text-green-400">{{ formatCurrency(firstPrincipal) }}</div>
          </div>
          <div>
            <div class="text-slate-500 dark:text-slate-400">Saldo (S₁)</div>
            <div class="font-medium">{{ formatCurrency(firstBalance) }}</div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div id="cotizador-content" class="grid gap-8 lg:grid-cols-5">

        <!-- Left Panel: Configuration -->
        <div class="lg:col-span-2">
          <!-- Context Configuration -->
          <div *ngIf="!client" class="ui-card mb-6">
            <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">1. Contexto del Cliente</h3>
            <div class="space-y-4">
              <div>
                <label for="market" class="ui-label">Mercado</label>
                <select id="market" [(ngModel)]="market" (change)="onMarketChange()" class="ui-select">
                  <option value="">-- Seleccionar mercado --</option>
                  <option value="aguascalientes">Aguascalientes</option>
                  <option value="edomex">Estado de México</option>
                </select>
              </div>
              <div>
                <label for="clientType" class="ui-label">Tipo de Cliente</label>
                <select id="clientType" [(ngModel)]="clientType" (change)="onClientTypeChange()" [disabled]="!market" class="ui-select">
                  <option value="">-- Seleccionar tipo --</option>
                  <option value="individual">Individual</option>
                  <option value="colectivo" *ngIf="market === 'edomex'">Crédito Colectivo</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading" class="ui-card text-center py-8">
            <div class="ui-spinner ui-spinner-lg mx-auto mb-4"></div>
            <p class="text-slate-600 dark:text-slate-400">Cargando paquete...</p>
          </div>

          <!-- Package Components -->
          <div *ngIf="pkg" class="ui-card mb-6">
            <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">2. Paquete de Producto</h3>
            <div class="space-y-3">
              <div *ngFor="let comp of pkg.components" class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    <input
                      *ngIf="comp.isOptional"
                      type="checkbox"
                      [id]="comp.id"
                      [checked]="selectedOptions[comp.id]"
                      (change)="toggleComponent(comp.id)"
                      class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                    />
                    <div *ngIf="!comp.isOptional" class="h-2 w-2 bg-sky-600 rounded-full" title="Componente requerido"></div>
                  </div>
                  <label [for]="comp.id" class="text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer">
                    {{ comp.name }}
                    <span *ngIf="!comp.isOptional" class="text-xs text-slate-500 dark:text-slate-400 ml-1">(requerido)</span>
                  </label>
                </div>
                <span class="text-sm font-mono text-slate-600 dark:text-slate-400">{{ formatCurrency(comp.price) }}</span>
              </div>
            </div>
          </div>

          <!-- Financial Configuration -->
          <div *ngIf="pkg" class="ui-card mb-6">
            <!-- Acquisition Mode Controls -->
            <div *ngIf="initialMode === 'acquisition'">
              <div *ngIf="isVentaDirecta">
                <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">3. Estructura de Pago</h3>
                <div>
                  <label for="downPaymentAmount" class="ui-label ui-label-required">Pago Inicial</label>
                  <input
                    type="number"
                    id="downPaymentAmount"
                    [(ngModel)]="downPaymentAmountDirect"
                    (input)="onDownPaymentDirectChange()"
                    class="ui-input"
                    placeholder="Ej: 400,000"
                  />
                </div>
              </div>

              <div *ngIf="!isVentaDirecta">
                <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">3. Estructura Financiera</h3>
                <div class="space-y-4">
                  <div>
                    <label for="downPayment" class="ui-label">Enganche: {{ downPaymentPercentage }}%</label>
                    <input
                      type="range"
                      id="downPayment"
                      [min]="pkg.minDownPaymentPercentage * 100"
                      max="90"
                      [(ngModel)]="downPaymentPercentage"
                      (input)="onDownPaymentSliderChange()"
                      class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      [attr.aria-describedby]="'dp-note'"
                      [attr.title]="'Ajusta el % de enganche. Mínimo según política y paquete'"
                    />
                    <div class="ui-help-text" id="dp-note">
                      Mínimo: {{ pkg.minDownPaymentPercentage * 100 }}% ({{ formatCurrency(minDownPaymentRequired) }})
                    </div>
                  </div>

                  <div>
                    <label for="term" class="ui-label ui-label-required">Plazo</label>
                    <select id="term" [(ngModel)]="term" (change)="onTermChange()" class="ui-select" title="Selecciona el plazo del financiamiento en meses">
                      <option *ngFor="let t of pkg.terms" [value]="t">{{ t }} meses</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Mode Controls -->
            <div *ngIf="initialMode === 'savings'">
              <h3 class="text-lg font-medium text-amber-600 dark:text-amber-400 mb-4">2. Simulación de Ahorro</h3>

              <!-- Aguascalientes Individual -->
              <div *ngIf="market === 'aguascalientes' && clientType === 'individual'" class="space-y-4">
                <div>
                  <label for="initialDown" class="ui-label">Enganche Inicial (Aportación Fuerte)</label>
                  <input
                    type="number"
                    id="initialDown"
                    [(ngModel)]="initialDownPayment"
                    (input)="onSavingsConfigChange()"
                    class="ui-input" title="Monto de enganche disponible al inicio"
                    placeholder="Ej: 400,000"
                  />
                </div>
                <div>
                  <label for="deliveryTerm" class="ui-label">Fecha de Entrega Estimada: {{ deliveryTerm }} meses</label>
                  <input
                    type="range"
                    id="deliveryTerm"
                    min="3"
                    max="6"
                    [(ngModel)]="deliveryTerm"
                    (input)="onSavingsConfigChange()"
                    class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider" title="Mes estimado de entrega"
                  />
                </div>
              </div>

              <!-- EdoMex Colectivo -->
              <div *ngIf="market === 'edomex' && clientType === 'colectivo'" class="space-y-4">
                <div>
                  <label for="tandaMembers" class="ui-label">Número de Integrantes: {{ tandaMembers }}</label>
                  <input
                    type="range"
                    id="tandaMembers"
                    min="2"
                    max="20"
                    [(ngModel)]="tandaMembers"
                    (input)="onTandaMembersChange()"
                    class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider" title="Número de integrantes del grupo"
                  />
                </div>
              </div>

              <!-- Default Savings -->
              <div *ngIf="!(market === 'aguascalientes' && clientType === 'individual') && !(market === 'edomex' && clientType === 'colectivo')" class="space-y-4">
                <div>
                  <label for="voluntary" class="ui-label">Aportación Voluntaria Mensual</label>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="500"
                    [(ngModel)]="voluntaryContribution"
                    (input)="onSavingsConfigChange()"
                    class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider mb-2" title="Aportación voluntaria mensual"
                  />
                  <input
                    type="number"
                    id="voluntary"
                    [(ngModel)]="voluntaryContribution"
                    (input)="onSavingsConfigChange()"
                    class="ui-input"
                    placeholder="Monto mensual voluntario"
                  />
                  <div class="ui-help-text">Actual: {{ formatCurrency(toNumber(voluntaryContribution) || 0) }}</div>
                </div>
              </div>

              <!-- Collection Configuration -->
              <div class="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Configurador de Recaudación</h4>
                <div class="space-y-3">
                  <div *ngFor="let unit of collectionUnits" class="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <input
                      type="number"
                      [placeholder]="'Consumo (L) - Unidad ' + unit.id"
                      [(ngModel)]="unit.consumption"
                      (input)="onSavingsConfigChange()"
                      class="ui-input"
                    />
                    <input
                      type="number"
                      [placeholder]="'Sobreprecio ($) - Unidad ' + unit.id"
                      [(ngModel)]="unit.overprice"
                      (input)="onSavingsConfigChange()"
                      class="ui-input"
                    />
                  </div>
                </div>
                <button class="ui-btn ui-btn-secondary mt-3 w-full" (click)="addCollectionUnit()">
                  <span class="text-lg mr-2">+</span>
                  Agregar Unidad a Recaudar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Results -->
        <div class="lg:col-span-3">
          <div *ngIf="pkg">
            <!-- Acquisition Mode Results -->
            <div *ngIf="initialMode === 'acquisition'">
              <div class="ui-card mb-6">
                <h2 class="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Resumen Financiero</h2>

                <!-- Skeleton loader -->
                <div *ngIf="isLoading" class="animate-pulse space-y-3">
                  <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div class="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>

                <!-- Results Cards -->
                <div *ngIf="!isLoading" class="space-y-4">
                  <!-- Pricing Summary for Direct Sale -->
                  <div *ngIf="isVentaDirecta" class="grid gap-3 md:grid-cols-3">
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Precio Total</div>
                      <div class="text-xl font-semibold">{{ formatCurrency(totalPrice) }}</div>
                    </div>
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Pago Inicial</div>
                      <div class="text-xl font-semibold">{{ formatCurrency(downPayment) }}</div>
                    </div>
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Remanente</div>
                      <div class="text-xl font-semibold text-sky-600 dark:text-sky-400">{{ formatCurrency(amountToFinance) }}</div>
                    </div>
                  </div>

                  <!-- Pricing Summary for Financing -->
                  <div *ngIf="!isVentaDirecta" class="grid gap-3 md:grid-cols-4">
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Tasa Anual</div>
                      <div class="text-xl font-semibold" data-cy="rate-display">{{ ((pkg.rate || 0) * 100).toFixed(1) }}%</div>
                    </div>
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Enganche</div>
                      <div class="text-xl font-semibold">{{ formatCurrency(downPayment) }}</div>
                    </div>
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Monto a Financiar</div>
                      <div class="text-xl font-semibold" data-cy="sum-financiar">{{ formatCurrency(amountToFinance) }}</div>
                    </div>
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">PMT Mensual</div>
                      <div class="text-xl font-semibold text-sky-600 dark:text-sky-400" data-cy="sum-pmt">{{ formatCurrency(monthlyPayment) }}</div>
                    </div>
                  </div>

                  <!-- Insurance info if applicable -->
                  <div *ngIf="includeInsurance && insuranceMode==='contado'" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div class="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Seguro (pago por separado):</strong> {{ formatCurrency(toNumber(insuranceAmount) || 0) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Amortization Button -->
              <div *ngIf="!isVentaDirecta" class="ui-card mb-6">
                <button
                  (click)="calculateAmortization()"
                  class="ui-btn ui-btn-primary w-full" data-cy="calc-amort" title="Calcula la tabla de amortización para el monto a financiar"
                >
                  Calcular Tabla de Amortización
                </button>
              </div>

              <!-- Amortization Table -->
              <div *ngIf="amortizationTable.length > 0 && !isVentaDirecta" class="ui-card mb-6">
                <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Tabla de Amortización</h3>
                <div class="overflow-x-auto">
                  <div class="max-h-96 overflow-y-auto">
                    <table class="min-w-full text-sm">
                      <thead class="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                          <th class="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400"># Pago</th>
                          <th class="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Pago Mensual</th>
                          <th class="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Capital</th>
                          <th class="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Interés</th>
                          <th class="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Saldo</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                        <tr *ngFor="let row of amortizationTable" class="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td class="px-3 py-2 font-mono">{{ row.paymentNumber }}</td>
                          <td class="px-3 py-2 font-mono">{{ formatCurrency(row.monthlyPayment) }}</td>
                          <td class="px-3 py-2 font-mono text-green-600 dark:text-green-400">{{ formatCurrency(row.principal) }}</td>
                          <td class="px-3 py-2 font-mono text-amber-600 dark:text-amber-400">{{ formatCurrency(row.interest) }}</td>
                          <td class="px-3 py-2 font-mono font-semibold">{{ formatCurrency(row.balance) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

// removed by clean-audit
              <div *ngIf="monthlyPayment > 0 && !isVentaDirecta" class="ui-alert ui-alert-info">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 text-2xl">🛡️</div>
                  <div class="flex-1">
                    <h4 class="font-medium mb-2">Protección Conductores</h4>
                    <p class="text-sm mb-3">Muestra al cliente cómo puede proteger sus pagos en caso de imprevistos. Un diferenciador clave de nuestra oferta.</p>
                    <button class="ui-btn ui-btn-secondary ui-btn-sm" (click)="openProtectionDemo()">
                      Ver simulador de protección
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Mode Results -->
            <div *ngIf="initialMode === 'savings'">
              <div class="ui-card mb-6">
                <h2 class="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">Proyección de Ahorro</h2>

                <!-- Aguascalientes Individual: Remainder Progress -->
                <div *ngIf="market === 'aguascalientes' && clientType === 'individual'" class="space-y-4">
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-slate-600 dark:text-slate-400">Total del Paquete:</span>
                    <span class="font-semibold text-sky-600 dark:text-sky-400">{{ formatCurrency(totalPrice) }}</span>
                  </div>

                  <!-- Progress Bar -->
                  <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-8 overflow-hidden">
                    <div class="h-full flex">
                      <div
                        class="bg-green-500 flex items-center justify-center text-white text-xs font-semibold"
                        [style.width.%]="getDownPaymentPercentage()"
                        [title]="'Enganche: ' + formatCurrency(toNumber(initialDownPayment) || 0)"
                      >
                        Enganche
                      </div>
                      <div
                        class="bg-blue-500 flex items-center justify-center text-white text-xs font-semibold"
                        [style.width.%]="getSavedPercentage()"
                        [title]="'Ahorro: ' + formatCurrency(projectedCollectionSavings)"
                      >
                        Ahorro
                      </div>
                    </div>
                  </div>

                  <div class="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span class="text-slate-600 dark:text-slate-400">Remanente a Liquidar:</span>
                    <span class="font-semibold text-amber-600 dark:text-amber-400">{{ formatCurrency(totalPrice - (toNumber(initialDownPayment) || 0) - projectedCollectionSavings) }}</span>
                  </div>
                </div>

                <!-- EdoMex Individual: Savings KPIs -->
                <div *ngIf="market === 'edomex' && clientType === 'individual'" class="space-y-4">
                  <div class="grid gap-4 md:grid-cols-3">
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Meta de Enganche</div>
                      <div class="text-xl font-semibold text-amber-600 dark:text-amber-400">{{ formatCurrency(downPayment) }}</div>
                    </div>
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Ahorro Mensual</div>
                      <div class="text-xl font-semibold">{{ formatCurrency(monthlySavings) }}</div>
                    </div>
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-3">
                      <div class="text-xs text-slate-500 dark:text-slate-400">Tiempo Estimado</div>
                      <div class="text-xl font-semibold text-sky-600 dark:text-sky-400">{{ timeToGoal > 0 ? timeToGoal.toFixed(1) + ' meses' : 'N/A' }}</div>
                    </div>
                  </div>
                  <app-savings-projection-chart [goal]="downPayment" [monthlySavings]="monthlySavings"></app-savings-projection-chart>
                </div>

                <!-- EdoMex Colectivo: Tanda Overview -->
                <div *ngIf="market === 'edomex' && clientType === 'colectivo'" class="space-y-4">
                  <div class="flex items-center space-x-3">
                    <div class="text-2xl">👥</div>
                    <div>
                      <h3 class="font-medium">Tanda Colectiva - {{ tandaMembers }} Miembros</h3>
                      <p class="text-sm text-slate-600 dark:text-slate-400">Proyección del "efecto bola de nieve" para la entrega de unidades</p>
                    </div>
                  </div>
                  <app-tanda-timeline [milestones]="tandaTimeline"></app-tanda-timeline>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div *ngIf="!pkg && !isLoading" class="ui-card text-center py-12">
            <div class="text-slate-400 dark:text-slate-600 text-4xl mb-4">📋</div>
            <p class="text-slate-600 dark:text-slate-400">Selecciona el contexto para continuar con la cotización.</p>
          </div>

          <!-- Action Buttons -->
          <div *ngIf="pkg" class="flex flex-col sm:flex-row gap-3 mt-6">
            <button class="ui-btn ui-btn-secondary" (click)="generateOnePagePDF()" data-cy="cotizador-pdf">
              <span class="mr-2">📄</span>
              Generar Propuesta PDF
            </button>
            <button class="ui-btn ui-btn-primary" (click)="handleFormalizeClick()">
              <span class="mr-2">✓</span>
              Formalizar y Continuar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Skip Link Styles -->
    <style>
      .skip-link {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      .skip-link:focus {
        position: static;
        width: auto;
        height: auto;
        padding: 8px 12px;
        background: #0EA5E9;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
      }
      /* Slider styles */
      .slider::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        background: #0EA5E9;
        border-radius: 50%;
        cursor: pointer;
      }
      .slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: #0EA5E9;
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }
    </style>
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
// removed by clean-audit
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

// removed by clean-audit