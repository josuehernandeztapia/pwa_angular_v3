import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FinancialCalculatorService } from '../../../../services/financial-calculator.service';
import { LoadingService } from '../../../../services/loading.service';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { CollectiveScenarioConfig, SimuladorEngineService } from '../../../../services/simulador-engine.service';

@Component({
  selector: 'app-edomex-colectivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="command-container p-6 space-y-6">
      <!-- Header -->
      <div class="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white rounded-xl p-6 shadow-lg">
        <h1 class="text-3xl font-bold mb-2">Cotizador EdoMex Colectivo</h1>
        <p class="text-emerald-100 text-lg">Genera cotizaciones para grupos de transportistas</p>
      </div>

      <!-- Resumen KPIs -->
      <div class="bg-white rounded-xl shadow-lg p-4">
        <h2 class="text-lg font-semibold text-gray-800 mb-3">Resumen</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-emerald-50 p-3 rounded border border-emerald-100">
            <div class="text-emerald-600 text-xs">Pago mensual por miembro</div>
            <div class="text-xl font-bold text-emerald-800">{{ formatCurrency(quotation?.monthlyPaymentPerMember || 0) }}</div>
          </div>
          <div class="bg-blue-50 p-3 rounded border border-blue-100">
            <div class="text-blue-600 text-xs">Plazo típico</div>
            <div class="text-xl font-bold text-blue-800">60 meses</div>
          </div>
          <div class="bg-purple-50 p-3 rounded border border-purple-100">
            <div class="text-purple-600 text-xs">Meta del grupo</div>
            <div class="text-xl font-bold text-purple-800">{{ formatCurrency(quotation?.scenario?.targetAmount || 0) }}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Configuration Panel -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span class="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
            Unidad
          </h2>

          <form [formGroup]="configForm" class="space-y-6">
            <!-- Member Count -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Número de Miembros del Grupo *
              </label>
              <input
                type="number"
                formControlName="memberCount"
                placeholder="10"
                class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                min="5"
                max="50"
                step="1"
              />
              <div class="flex justify-between text-xs text-gray-500">
                <span>Mínimo: 5 miembros</span>
                <span>Máximo: 50 miembros</span>
              </div>
              <div *ngIf="configForm.get('memberCount')?.errors?.['required']" 
                   class="text-red-500 text-sm">El número de miembros es obligatorio</div>
              <div *ngIf="configForm.get('memberCount')?.errors?.['min']" 
                   class="text-red-500 text-sm">Mínimo 5 miembros</div>
              <div *ngIf="configForm.get('memberCount')?.errors?.['max']" 
                   class="text-red-500 text-sm">Máximo 50 miembros</div>
            </div>

            <!-- Unit Price -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Precio de Unidad por Miembro *
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  formControlName="unitPrice"
                  placeholder="749000"
                  class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min="500000"
                  step="1000"
                />
              </div>
              <p class="text-xs text-gray-500">Precio promedio de unidad que cada miembro desea adquirir</p>
              <div *ngIf="configForm.get('unitPrice')?.errors?.['required']" 
                   class="text-red-500 text-sm">El precio de unidad es obligatorio</div>
              <div *ngIf="configForm.get('unitPrice')?.errors?.['min']" 
                   class="text-red-500 text-sm">El mínimo es $500,000</div>
            </div>

            <!-- Average Consumption -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Consumo Promedio por Miembro *
              </label>
              <div class="relative">
                <input
                  type="number"
                  formControlName="avgConsumption"
                  placeholder="400"
                  class="w-full pr-16 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min="200"
                  step="50"
                />
                <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">litros/mes</span>
              </div>
              <p class="text-xs text-gray-500">Consumo mensual promedio de combustible por miembro</p>
              <div *ngIf="configForm.get('avgConsumption')?.errors?.['required']" 
                   class="text-red-500 text-sm">El consumo promedio es obligatorio</div>
              <div *ngIf="configForm.get('avgConsumption')?.errors?.['min']" 
                   class="text-red-500 text-sm">El mínimo es 200 litros/mes</div>
            </div>

            <!-- Overprice Per Liter -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Sobreprecio por Litro *
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  formControlName="overpricePerLiter"
                  placeholder="3.00"
                  class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min="1.0"
                  step="0.1"
                />
              </div>
              <p class="text-xs text-gray-500">Sobreprecio aplicado para generar el ahorro colectivo</p>
              <div *ngIf="configForm.get('overpricePerLiter')?.errors?.['required']" 
                   class="text-red-500 text-sm">El sobreprecio es obligatorio</div>
              <div *ngIf="configForm.get('overpricePerLiter')?.errors?.['min']" 
                   class="text-red-500 text-sm">El mínimo es $1.00/litro</div>
            </div>

            <!-- Optional Voluntary Monthly -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                Aportación Voluntaria Mensual por Miembro (Opcional)
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  formControlName="voluntaryMonthly"
                  placeholder="0"
                  class="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min="0"
                  step="100"
                />
              </div>
              <p class="text-xs text-gray-500">Dinero adicional mensual que cada miembro puede aportar</p>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4 pt-4">
              <button
                type="button"
                (click)="generateQuotation()"
                [disabled]="!configForm.valid || isCalculating"
                class="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <span *ngIf="!isCalculating">Generar Cotización</span>
                <div *ngIf="isCalculating" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generando...
                </div>
              </button>
              <button
                type="button"
                (click)="resetForm()"
                class="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>

        <!-- Results Panel -->
        <div class="bg-white rounded-xl shadow-lg p-6" *ngIf="quotation">
          <h2 class="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span class="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
            Finanzas
          </h2>

          <!-- Group Summary -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
              <div class="text-emerald-600 text-sm font-medium">Miembros del Grupo</div>
              <div class="text-2xl font-bold text-emerald-800">{{ quotation.memberCount }}</div>
            </div>
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div class="text-blue-600 text-sm font-medium">Inversión Total</div>
              <div class="text-2xl font-bold text-blue-800">{{ formatCurrency(quotation.totalInvestment) }}</div>
            </div>
            <div class="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
              <div class="text-amber-600 text-sm font-medium">Tiempo a Primera Entrega</div>
              <div class="text-2xl font-bold text-amber-800">{{ quotation.scenario.monthsToFirstAward || 'N/A' }} meses</div>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div class="text-purple-600 text-sm font-medium">Tiempo a Entrega Total</div>
              <div class="text-2xl font-bold text-purple-800">{{ quotation.scenario.monthsToFullDelivery || 'N/A' }} meses</div>
            </div>
            <div class="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
              <div class="text-emerald-600 text-sm font-medium">Tiempo a Meta de Ahorro del Grupo</div>
              <div class="text-2xl font-bold text-emerald-800">{{ quotation.scenario.monthsToTarget || 'N/A' }} meses</div>
            </div>
          </div>

          <!-- Individual Member Info -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-gray-800 mb-3">Por Miembro:</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Precio de unidad:</span>
                <span class="font-medium">{{ formatCurrency(quotation.unitPrice) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Enganche requerido:</span>
                <span class="font-medium">{{ formatCurrency(quotation.downPaymentPerMember) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Meta por miembro:</span>
                <span class="font-medium">{{ formatCurrency(quotation.scenario.targetPerMember || quotation.downPaymentPerMember) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Financiamiento:</span>
                <span class="font-medium">{{ formatCurrency(quotation.financingPerMember) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Pago mensual est.:</span>
                <span class="font-medium">{{ formatCurrency(quotation.monthlyPaymentPerMember) }}</span>
              </div>
            </div>
          </div>

          <!-- Group Benefits -->
          <div class="bg-amber-50 rounded-lg p-4 mb-6 border border-amber-200">
            <h3 class="font-semibold text-amber-800 mb-3 flex items-center">
              <span class="text-amber-600 mr-2">🎯</span>
              Beneficios del Grupo:
            </h3>
            <ul class="space-y-2 text-sm text-amber-700">
              <li class="flex items-center">
                <span class="text-emerald-500 mr-2">✓</span>
                Enganche reducido al 15% (vs 25% individual)
              </li>
              <li class="flex items-center">
                <span class="text-emerald-500 mr-2">✓</span>
                Mejor tasa de interés por volumen
              </li>
              <li class="flex items-center">
                <span class="text-emerald-500 mr-2">✓</span>
                Gestión centralizada de trámites
              </li>
              <li class="flex items-center">
                <span class="text-emerald-500 mr-2">✓</span>
                Descuentos por compra en volumen
              </li>
            </ul>
          </div>

          <!-- Financing Timeline -->
          <div class="mb-6" *ngIf="quotation.timeline && quotation.timeline.length > 0">
            <h3 class="font-semibold text-gray-800 mb-3">Cronograma de Financiamiento:</h3>
            <div class="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              <div *ngFor="let milestone of quotation.timeline.slice(0, 6)" 
                   class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                <div>
                  <span class="font-medium text-gray-800">{{ milestone.title }}</span>
                  <p class="text-sm text-gray-600">{{ milestone.description }}</p>
                </div>
                <span class="text-sm font-medium text-emerald-600">
                  {{ milestone.timeframe }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-4">
            <button
              (click)="proceedToClientCreation()"
              class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              Crear Grupo de Clientes
            </button>
            <button
              (click)="generatePDF()"
              class="px-6 py-3 border border-emerald-600 text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 transition-colors duration-200 flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Descargar PDF
            </button>
            <button
              (click)="recalculate()"
              class="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Recalcular
            </button>
          </div>
        </div>

        <!-- Initial Info Panel -->
        <div class="bg-white rounded-xl shadow-lg p-6" *ngIf="!quotation">
          <h2 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span class="bg-amber-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">💡</span>
            Cotización Colectiva EdoMex
          </h2>
          <div class="space-y-4 text-gray-600">
            <div class="flex items-start space-x-3">
              <span class="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">👥</span>
              <div>
                <h3 class="font-medium text-gray-800">Grupos de 5-50 miembros</h3>
                <p class="text-sm">Mejor aprovechamiento con grupos de 10-20 transportistas</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <span class="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">💰</span>
              <div>
                <h3 class="font-medium text-gray-800">Enganche reducido al 15%</h3>
                <p class="text-sm">Significativamente menor que la modalidad individual (25%)</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <span class="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">📈</span>
              <div>
                <h3 class="font-medium text-gray-800">Mejores condiciones</h3>
                <p class="text-sm">Tasas de interés preferenciales y descuentos por volumen</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <span class="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">⚡</span>
              <div>
                <h3 class="font-medium text-gray-800">Gestión centralizada</h3>
                <p class="text-sm">Un solo punto de contacto para todo el grupo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EdomexColectivoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  configForm: FormGroup;
  quotation: any = null;
  isCalculating = false;

  constructor(
    private fb: FormBuilder,
    private simuladorEngine: SimuladorEngineService,
    private loadingService: LoadingService,
    private financialCalc: FinancialCalculatorService,
    private pdfExportService: PdfExportService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.configForm = this.fb.group({
      memberCount: [10, [Validators.required, Validators.min(5), Validators.max(50)]],
      unitPrice: [749000, [Validators.required, Validators.min(500000)]],
      avgConsumption: [400, [Validators.required, Validators.min(200)]],
      overpricePerLiter: [3.0, [Validators.required, Validators.min(1.0)]],
      voluntaryMonthly: [0, [Validators.min(0)]]
    });
  }

  ngOnInit() {
    // Check for query params from Nueva Oportunidad
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['memberCount']) {
        this.configForm.patchValue({
          memberCount: parseInt(params['memberCount'])
        });
      }
      if (params['preCalculate'] === 'true') {
        setTimeout(() => this.generateQuotation(), 500);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async generateQuotation() {
    if (!this.configForm.valid) return;

    const values = this.configForm.value;
    this.isCalculating = true;
    this.loadingService.show('Generando cotización colectiva...');

    try {
      // Create scenario configuration
      const config: CollectiveScenarioConfig = {
        memberCount: values.memberCount,
        unitPrice: values.unitPrice,
        avgConsumption: values.avgConsumption,
        overpricePerLiter: values.overpricePerLiter,
        voluntaryMonthly: values.voluntaryMonthly || 0
      };

      // Generate collective scenario
      const scenario = await this.simuladorEngine.generateEdoMexCollectiveScenario(config);

      // Build quotation from scenario
      this.quotation = {
        memberCount: config.memberCount,
        unitPrice: config.unitPrice,
        totalInvestment: config.unitPrice * config.memberCount,
        downPaymentPerMember: config.unitPrice * 0.15, // 15% for collective
        financingPerMember: config.unitPrice * 0.85,
        monthlyPaymentPerMember: (config.unitPrice * 0.85) / 60, // 60 months typical
        scenario: scenario,
        timeline: [
          {
            title: 'Constitución del Grupo',
            description: 'Reunión inicial y firma de acuerdos',
            timeframe: 'Semana 1'
          },
          {
            title: 'Evaluación Crediticia',
            description: 'Análisis de cada miembro del grupo',
            timeframe: 'Semana 2-3'
          },
          {
            title: 'Aprobación de Crédito',
            description: 'Resolución del financiamiento grupal',
            timeframe: 'Semana 4'
          },
          {
            title: 'Selección de Unidades',
            description: 'Elección y reserva de vehículos',
            timeframe: 'Semana 5-6'
          },
          {
            title: 'Entrega Escalonada',
            description: 'Entrega por fases según disponibilidad',
            timeframe: 'Semana 7-10'
          }
        ]
      };

      this.isCalculating = false;
      this.loadingService.hide();
    } catch (error) {
      console.error('Error generating quotation:', error);
      this.isCalculating = false;
      this.loadingService.hide();
    }
  }

  resetForm() {
    this.configForm.reset({
      memberCount: 10,
      unitPrice: 749000,
      avgConsumption: 400,
      overpricePerLiter: 3.0,
      voluntaryMonthly: 0
    });
    this.quotation = null;
  }

  recalculate() {
    this.quotation = null;
  }

  proceedToClientCreation() {
    if (!this.quotation) return;

    // Store quotation data for client creation
    const clientData: any = {
      quotationData: {
        type: 'EDOMEX_COLECTIVO',
        quotation: this.quotation,
        configParams: this.configForm.value
      }
    };

    sessionStorage.setItem('pendingClientData', JSON.stringify(clientData));
    this.router.navigate(['/clientes/nuevo'], {
      queryParams: { 
        fromCotizador: 'edomex-colectivo',
        hasQuotation: 'true',
        groupSize: this.quotation.memberCount
      }
    });
  }

  generatePDF() {
    if (!this.quotation) return;

    const downPayment = this.quotation.downPaymentPerMember;
    const monthlyPayment = this.quotation.monthlyPaymentPerMember;
    const term = 60;

    const quoteData = {
      clientInfo: {
        name: `Grupo de ${this.quotation.memberCount} miembros`,
        contact: 'contacto@conductores.com'
      },
      ecosystemInfo: {
        name: 'EdoMex Colectivo',
        route: 'Rutas Autorizadas',
        market: 'EDOMEX' as const
      },
      quoteDetails: {
        vehicleValue: this.quotation.unitPrice,
        downPaymentOptions: [downPayment],
        monthlyPaymentOptions: [monthlyPayment],
        termOptions: [term],
        interestRate: 29.9
      },
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      quoteNumber: `EDO-COLECT-${Date.now()}`
    };

    this.pdfExportService.generateProposalPDF(quoteData as any, 0)
      .then((blob: Blob) => {
        const filename = `cotizacion-edomex-colectivo-${this.quotation.memberCount}-miembros.pdf`;
        this.pdfExportService.downloadPDF(blob, filename);
      })
      .catch((err: any) => {
        console.error('Error generating PDF:', err);
      });
  }

  formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }
}