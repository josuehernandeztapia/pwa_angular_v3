import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
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

declare var Chart: any;

@Component({
  selector: 'app-ags-ahorro',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SummaryPanelComponent, SkeletonCardComponent, FormFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Skip Link for Accessibility -->
    <a class="skip-link" href="#main-content">Saltar al contenido principal</a>

    <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
      <!-- Header -->
      <header class="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div class="max-w-6xl mx-auto px-6 py-4">
          <div class="flex items-center gap-4">
            <button (click)="goBack()" class="ui-btn ui-btn-ghost ui-btn-sm" data-cy="back-button">
              ← Volver
            </button>
            <div>
              <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Simulador AGS Ahorro</h1>
              <p class="text-sm text-slate-600 dark:text-slate-400">Proyecta tu ahorro, calcula liquidación en entrega</p>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" class="max-w-6xl mx-auto px-6 py-8">
        <!-- KPIs -->
        <div class="ui-card mb-6" *ngIf="!isLoading">
          <div class="grid grid-cols-3 gap-6">
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="sim-ahorro-label">Mensualidad</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="sim-ahorro">
                {{ formatCurrency(currentScenario?.monthlyContribution || 0) }}
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="sim-plazo-label">Tiempo</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="sim-plazo">
                {{ (currentScenario?.monthsToTarget || simuladorForm.value.deliveryMonths) }} meses
              </div>
            </div>
            <div class="text-center">
              <div class="text-xs text-slate-500 dark:text-slate-400 mb-1" data-cy="sim-pmt-label">Meta Total</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100" data-cy="sim-pmt">
                {{ formatCurrency(currentScenario?.targetAmount || simuladorForm.value.unitValue) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="grid lg:grid-cols-2 gap-8" *ngIf="!isLoading">
          <!-- Configuration Panel -->
          <div class="ui-card">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Configuración</h2>

            <form [formGroup]="simuladorForm" class="space-y-6">
              <!-- Unidad -->
              <div class="space-y-4">
                <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Unidad</h3>

                <div>
                  <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Valor Total de la Unidad</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      formControlName="unitValue"
                      class="ui-input pl-8"
                      placeholder="799000"
                      min="700000"
                      max="1000000"
                      (input)="onConfigChange()"
                      data-cy="unit-value">
                  </div>
                  <p class="text-xs text-slate-500 mt-1">Precio típico AGS: $799,000 (vagoneta + GNV)</p>
                </div>

                <div>
                  <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Enganche Inicial Disponible</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      formControlName="initialDownPayment"
                      class="ui-input pl-8"
                      placeholder="400000"
                      min="0"
                      (input)="onConfigChange()"
                      data-cy="initial-down">
                  </div>
                  <p class="text-xs text-slate-500 mt-1">Monto que tienes disponible ahora</p>
                </div>

                <div>
                  <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Meses Estimados para Entrega</label>
                  <select
                    formControlName="deliveryMonths"
                    class="ui-input"
                    (change)="onConfigChange()"
                    data-cy="delivery-months">
                    <option value="">Seleccionar</option>
                    <option value="3">3 meses (entrega rápida)</option>
                    <option value="6">6 meses (estándar)</option>
                    <option value="9">9 meses (planificado)</option>
                    <option value="12">12 meses (extendido)</option>
                  </select>
                </div>
              </div>

              <!-- Consumo -->
              <div class="space-y-4">
                <h3 class="text-sm font-medium text-slate-700 dark:text-slate-300">Consumo</h3>

                <div>
                  <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Placas de Unidades Actuales</label>
                  <div class="flex gap-2 mb-2">
                    <input
                      type="text"
                      [(ngModel)]="newPlate"
                      placeholder="ABC-1234"
                      class="ui-input flex-1"
                      (keyup.enter)="addPlate()"
                      #plateInput
                      data-cy="new-plate">
                    <button
                      type="button"
                      (click)="addPlate(); plateInput.value=''"
                      class="ui-btn ui-btn-secondary"
                      data-cy="add-plate">
                      Agregar
                    </button>
                  </div>

                  <div class="space-y-2" *ngIf="plates.length > 0">
                    <div *ngFor="let plate of plates; let i = index" class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <span class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ plate }}</span>
                      <input
                        type="number"
                        [(ngModel)]="consumptions[i]"
                        placeholder="Litros/mes"
                        class="ui-input ui-input-sm flex-1"
                        min="0"
                        max="10000"
                        data-cy="plate-consumption">
                      <button
                        type="button"
                        (click)="removePlate(i)"
                        class="text-red-500 hover:text-red-700 w-6 h-6 flex items-center justify-center"
                        aria-label="Eliminar placa"
                        data-cy="remove-plate">
                        ×
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Sobreprecio por Litro</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      formControlName="overpricePerLiter"
                      class="ui-input pl-8"
                      placeholder="5.00"
                      min="1"
                      max="20"
                      step="0.5"
                      (input)="onConfigChange()"
                      data-cy="overprice-per-liter">
                  </div>
                  <p class="text-xs text-slate-500 mt-1">Cantidad extra por litro que vas a ahorrar</p>
                </div>
              </div>

              <!-- Actions -->
              <button
                type="button"
                (click)="simulateScenario()"
                [disabled]="!canSimulate()"
                class="ui-btn ui-btn-primary w-full"
                data-cy="simulate-btn">
                {{ isSimulating ? 'Simulando...' : 'Simular Escenario' }}
              </button>
            </form>
          </div>

          <!-- Results Panel -->
          <div class="ui-card" *ngIf="currentScenario">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Proyección de Ahorro AGS</h2>

            <!-- Key Metrics -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">Meta Total</div>
                <div class="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {{ formatCurrency(currentScenario.targetAmount) }}
                </div>
              </div>

              <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">Tiempo</div>
                <div class="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {{ currentScenario.monthsToTarget }} meses
                </div>
              </div>

              <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">Recaudación Mensual</div>
                <div class="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {{ formatCurrency(currentScenario.monthlyContribution) }}
                </div>
              </div>

              <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg"
                   [class]="remainderAmount <= 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'">
                <div class="text-xs mb-1"
                     [class]="remainderAmount <= 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">
                  {{ remainderAmount <= 0 ? 'Ahorro Completo' : 'Remanente' }}
                </div>
                <div class="text-xl font-bold"
                     [class]="remainderAmount <= 0 ? 'text-green-900 dark:text-green-100' : 'text-amber-900 dark:text-amber-100'">
                  {{ formatCurrency(remainderAmount) }}
                </div>
              </div>
            </div>

            <!-- Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <!-- Ahorro Chart -->
              <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <canvas #ahorroChart width="300" height="200"></canvas>
              </div>

              <!-- PMT Distribution Chart -->
              <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <canvas #pmtChart width="300" height="200"></canvas>
              </div>
            </div>

            <!-- Timeline -->
            <div class="mb-6" *ngIf="displayTimeline.length > 0">
              <h4 class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Cronología de Ahorro</h4>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                <div *ngFor="let event of displayTimeline" class="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                  <div class="text-sm text-slate-600 dark:text-slate-400">Mes {{ event.month }}</div>
                  <div class="text-sm text-slate-900 dark:text-slate-100">{{ event.event }}</div>
                  <div class="text-sm font-medium"
                       [class]="event.amount > 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(event.amount) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Comparison Table -->
            <div class="mb-6">
              <h4 class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Comparación de Escenarios</h4>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-700">
                      <th class="text-left py-2 text-slate-600 dark:text-slate-400">Concepto</th>
                      <th class="text-right py-2 text-slate-600 dark:text-slate-400">Con Ahorro Programado</th>
                      <th class="text-right py-2 text-slate-600 dark:text-slate-400">Sin Ahorro</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-slate-100 dark:border-slate-800">
                      <td class="py-2 text-slate-900 dark:text-slate-100">Enganche</td>
                      <td class="py-2 text-right text-slate-900 dark:text-slate-100">{{ formatCurrency(simuladorForm.value.initialDownPayment + (currentScenario.monthlyContribution * currentScenario.monthsToTarget)) }}</td>
                      <td class="py-2 text-right text-slate-900 dark:text-slate-100">{{ formatCurrency(simuladorForm.value.initialDownPayment) }}</td>
                    </tr>
                    <tr class="border-b border-slate-100 dark:border-slate-800">
                      <td class="py-2 text-slate-900 dark:text-slate-100">Remanente a financiar</td>
                      <td class="py-2 text-right font-medium text-green-600">{{ formatCurrency(remainderAmount) }}</td>
                      <td class="py-2 text-right font-medium text-red-600">{{ formatCurrency(simuladorForm.value.unitValue - simuladorForm.value.initialDownPayment) }}</td>
                    </tr>
                    <tr>
                      <td class="py-2 text-slate-900 dark:text-slate-100 font-medium">Ahorro estimado</td>
                      <td class="py-2 text-right font-bold text-green-600">{{ formatCurrency((simuladorForm.value.unitValue - simuladorForm.value.initialDownPayment) - remainderAmount) }}</td>
                      <td class="py-2 text-right font-bold text-slate-500">$0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Enhanced Actions -->
            <div class="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
              <!-- View Mode Toggle -->
              <div class="flex justify-center mb-4">
                <button
                  (click)="toggleViewMode()"
                  class="ui-btn ui-btn-ghost ui-btn-sm"
                  data-cy="toggle-view-mode">
                  {{ currentViewMode === 'simple' ? 'Vista Avanzada' : 'Vista Simple' }}
                </button>
              </div>

              <!-- Simple Actions -->
              <div *ngIf="currentViewMode === 'simple'" class="grid grid-cols-2 gap-3 mb-4">
                <button
                  (click)="speakSummary()"
                  class="ui-btn ui-btn-secondary"
                  title="Leer resumen"
                  data-cy="ags-voice">
                  Escuchar
                </button>
                <button
                  (click)="shareWhatsApp()"
                  class="ui-btn ui-btn-secondary"
                  title="Compartir por WhatsApp"
                  data-cy="ags-wa">
                  WhatsApp
                </button>
                <button
                  (click)="saveDraft()"
                  [disabled]="!currentScenario"
                  class="ui-btn ui-btn-secondary"
                  data-cy="save-scenario"
                  title="Guardar simulación">
                  Guardar
                </button>
                <button
                  (click)="resetSimulation()"
                  class="ui-btn ui-btn-secondary">
                  Nuevo
                </button>
              </div>

              <!-- Advanced Actions -->
              <div *ngIf="currentViewMode === 'advanced'" class="space-y-4 mb-4">
                <h4 class="text-sm font-medium text-slate-700 dark:text-slate-300">Herramientas Avanzadas</h4>

                <!-- Amortization Section -->
                <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Financiamiento del Remanente</span>
                    <span class="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded">
                      {{ formatCurrency(remainderAmount) }}
                    </span>
                  </div>
                  <button
                    (click)="calculateAmortization()"
                    [disabled]="remainderAmount <= 0"
                    class="ui-btn ui-btn-primary ui-btn-sm w-full"
                    data-cy="calculate-amortization">
                    Calcular Tabla de Amortización
                  </button>
                </div>

                <!-- Protection Demo -->
                <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-medium text-slate-900 dark:text-slate-100">Simulador de Protección</span>
                    <span class="text-xs bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 px-2 py-1 rounded">
                      Para imprevistos
                    </span>
                  </div>
                  <button
                    (click)="showProtectionDemo = true"
                    class="ui-btn ui-btn-primary ui-btn-sm w-full">
                    Ver Protección Conductores
                  </button>
                </div>
              </div>

              <!-- Main Actions -->
              <div class="flex gap-3">
                <button
                  (click)="generatePDF()"
                  class="ui-btn ui-btn-secondary"
                  data-cy="generate-pdf">
                  PDF
                </button>
                <button
                  (click)="proceedWithScenario()"
                  class="ui-btn ui-btn-primary flex-1"
                  data-cy="proceed-scenario">
                  Continuar con este Plan
                </button>
              </div>

              <p class="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                ¿Qué sigue? Puedes pasar al Cotizador o generar un PDF con tu plan.
              </p>
            </div>

            <!-- Amortization Table Modal -->
            <div *ngIf="showAmortizationTable"
                 class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                 (click)="showAmortizationTable = false">
              <div class="ui-card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                   (click)="$event.stopPropagation()"
                   role="dialog"
                   aria-modal="true"
                   aria-labelledby="amortization-title">
                <div class="flex justify-between items-center mb-6">
                  <h4 id="amortization-title" class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Tabla de Amortización del Remanente
                  </h4>
                  <button
                    (click)="showAmortizationTable = false"
                    class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Cerrar">
                    ×
                  </button>
                </div>

                <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-6">
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="flex justify-between">
                      <span class="text-slate-600 dark:text-slate-400">Monto a financiar:</span>
                      <strong class="text-slate-900 dark:text-slate-100">{{ formatCurrency(remainderAmount) }}</strong>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-600 dark:text-slate-400">Tasa anual AGS:</span>
                      <strong class="text-slate-900 dark:text-slate-100">25.5%</strong>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-600 dark:text-slate-400">Plazo típico:</span>
                      <strong class="text-slate-900 dark:text-slate-100">24 meses</strong>
                    </div>
                    <div class="flex justify-between font-medium">
                      <span class="text-slate-900 dark:text-slate-100">Pago mensual estimado:</span>
                      <strong class="text-green-600 dark:text-green-400">{{ formatCurrency(amortizationTable[0]?.monthlyPayment || 0) }}</strong>
                    </div>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-slate-200 dark:border-slate-700">
                        <th class="text-left py-2 text-slate-600 dark:text-slate-400"># Pago</th>
                        <th class="text-right py-2 text-slate-600 dark:text-slate-400">Pago Mensual</th>
                        <th class="text-right py-2 text-slate-600 dark:text-slate-400">Capital</th>
                        <th class="text-right py-2 text-slate-600 dark:text-slate-400">Interés</th>
                        <th class="text-right py-2 text-slate-600 dark:text-slate-400">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let row of amortizationTable.slice(0, 12)"
                          class="border-b border-slate-100 dark:border-slate-800"
                          [class.bg-amber-50]="row.paymentNumber === 1"
                          [class.dark:bg-amber-900/20]="row.paymentNumber === 1">
                        <td class="py-2 text-slate-900 dark:text-slate-100">{{ row.paymentNumber }}</td>
                        <td class="py-2 text-right text-slate-900 dark:text-slate-100">{{ formatCurrency(row.monthlyPayment) }}</td>
                        <td class="py-2 text-right font-medium text-green-600">{{ formatCurrency(row.principal) }}</td>
                        <td class="py-2 text-right font-medium text-red-600">{{ formatCurrency(row.interest) }}</td>
                        <td class="py-2 text-right text-slate-900 dark:text-slate-100">{{ formatCurrency(row.balance) }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p class="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                    * Se muestran los primeros 12 pagos. Total: 24 meses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="flex justify-center py-12">
          <app-skeleton-card
            ariaLabel="Calculando escenario de ahorro AGS"
            [titleWidth]="70"
            [subtitleWidth]="60"
            [buttonWidth]="30">
          </app-skeleton-card>
        </div>
      </main>
    </div>
  `,
  styleUrl: './ags-ahorro.component.scss',
})
export class AgsAhorroComponent implements OnInit, AfterViewInit {
  @ViewChild('ahorroChart') ahorroChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pmtChart') pmtChartRef!: ElementRef<HTMLCanvasElement>;
  private ahorroChart: any;
  private pmtChart: any;
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

  ngAfterViewInit(): void {
    // Chart.js will be initialized when a scenario is calculated
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

      // Initialize charts after scenario is set
      setTimeout(() => this.initializeCharts(), 100);
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

  private initializeCharts(): void {
    if (!this.currentScenario) return;

    this.initializeAhorroChart();
    this.initializePMTChart();
  }

  private initializeAhorroChart(): void {
    if (!this.ahorroChartRef?.nativeElement || !this.currentScenario) return;

    if (this.ahorroChart) {
      this.ahorroChart.destroy();
    }

    const ctx = this.ahorroChartRef.nativeElement.getContext('2d');
    const months = Array.from({ length: this.currentScenario.monthsToTarget }, (_, i) => i + 1);
    const projectedData = this.currentScenario.projectedBalance || [];

    this.ahorroChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Ahorro Acumulado',
          data: projectedData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Proyección de Ahorro Mensual',
            font: { size: 14, weight: '600' },
            color: '#374151'
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Mes', color: '#6B7280' },
            grid: { color: '#E5E7EB' }
          },
          y: {
            title: { display: true, text: 'Monto ($)', color: '#6B7280' },
            grid: { color: '#E5E7EB' },
            ticks: {
              callback: (value: any) => this.formatCurrency(Number(value))
            }
          }
        }
      }
    });
  }

  private initializePMTChart(): void {
    if (!this.pmtChartRef?.nativeElement || !this.currentScenario) return;

    if (this.pmtChart) {
      this.pmtChart.destroy();
    }

    const ctx = this.pmtChartRef.nativeElement.getContext('2d');
    const remainderAmount = this.remainderAmount;
    const monthlyContribution = this.currentScenario.monthlyContribution;

    this.pmtChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Ahorro Programado', 'Remanente a Financiar'],
        datasets: [{
          data: [monthlyContribution * this.currentScenario.monthsToTarget, remainderAmount],
          backgroundColor: ['#10B981', '#F59E0B'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { usePointStyle: true }
          },
          title: {
            display: true,
            text: 'Distribución de Financiamiento',
            font: { size: 14, weight: '600' },
            color: '#374151'
          }
        }
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }
}
