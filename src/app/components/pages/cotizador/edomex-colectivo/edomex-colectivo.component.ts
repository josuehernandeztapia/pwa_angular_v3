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
  styleUrls: ['./edomex-colectivo.component.scss'],
  templateUrl: './edomex-colectivo.component.html',
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
      });
  }

  formatCurrency(value: number): string {
    return this.financialCalc.formatCurrency(value);
  }
}
