import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Quote } from '../../../../models/business';
import { CotizadorEngineService, ProductPackage } from '../../../../services/cotizador-engine.service';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { SpeechService } from '../../../../services/speech.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-ags-individual',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ags-individual.component.html',
  styleUrls: ['./ags-individual.component.scss']
})
export class AgsIndividualComponent implements OnInit {
  cotizadorForm!: FormGroup;
  packageData?: ProductPackage;
  currentQuote?: Quote & { packageData: ProductPackage };
  selectedOptionals: string[] = [];
  isLoading = true;
  isCalculating = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cotizadorEngine: CotizadorEngineService,
    private toast: ToastService,
    private pdfExportService: PdfExportService,
    private speech: SpeechService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadDefaultPackage();
  }

  private createForm(): void {
    this.cotizadorForm = this.fb.group({
      saleType: ['aguascalientes-plazo', Validators.required],
      term: [12, Validators.required],
      downPayment: [0, [Validators.required, Validators.min(1)]]
    });
  }

  private loadDefaultPackage(): void {
    this.isLoading = true;
    this.cotizadorEngine.getProductPackage('aguascalientes-plazo').subscribe({
      next: (packageData) => {
        this.packageData = packageData;
        this.updateFormDefaults();
        this.isLoading = false;
      },
      error: (error) => {
        this.toast.error('Error al cargar el paquete AGS');
        this.isLoading = false;
      }
    });
  }

  onSaleTypeChange(): void {
    const saleType = this.cotizadorForm.get('saleType')?.value;
    if (saleType) {
      this.isLoading = true;
      this.currentQuote = undefined;
      
      this.cotizadorEngine.getProductPackage(saleType).subscribe({
        next: (packageData) => {
          this.packageData = packageData;
          this.selectedOptionals = [];
          this.updateFormDefaults();
          this.isLoading = false;
        },
        error: () => {
          this.toast.error('Error al cambiar tipo de venta');
          this.isLoading = false;
        }
      });
    }
  }

  private updateFormDefaults(): void {
    if (!this.packageData) return;

    if (this.packageData.terms.length > 0) {
      this.cotizadorForm.patchValue({ term: this.packageData.terms[0] });
    }

    const minDownPayment = this.totalPrice * this.packageData.minDownPaymentPercentage;
    this.cotizadorForm.patchValue({ downPayment: minDownPayment });
  }

  isOptionalSelected(componentId: string): boolean {
    return this.selectedOptionals.includes(componentId);
  }

  onOptionalToggle(componentId: string): void {
    const index = this.selectedOptionals.indexOf(componentId);
    if (index > -1) {
      this.selectedOptionals.splice(index, 1);
    } else {
      this.selectedOptionals.push(componentId);
    }
    this.updateDownPayment();
    this.currentQuote = undefined;
  }

  onConfigChange(): void {
    this.currentQuote = undefined;
  }

  private updateDownPayment(): void {
    if (!this.packageData) return;
    
    const minDownPayment = this.totalPrice * this.packageData.minDownPaymentPercentage;
    const current = this.cotizadorForm.get('downPayment')?.value || 0;
    
    if (current < minDownPayment) {
      this.cotizadorForm.patchValue({ downPayment: minDownPayment });
    }
  }

  calculateQuote(): void {
    if (!this.canCalculate()) return;

    const formValue = this.cotizadorForm.value;
    this.isCalculating = true;

    this.cotizadorEngine.generateQuoteWithPackage(
      formValue.saleType,
      this.selectedOptionals,
      formValue.downPayment,
      this.isPlazoSale() ? formValue.term : 0
    ).subscribe({
      next: (quote) => {
        this.currentQuote = quote;
        this.isCalculating = false;
        this.toast.success('Cotización AGS calculada');
      },
      error: () => {
        this.toast.error('Error al calcular cotización');
        this.isCalculating = false;
      }
    });
  }

  proceedWithQuote(): void {
    if (!this.currentQuote) return;
    
    sessionStorage.setItem('pendingQuote', JSON.stringify(this.currentQuote));
    this.toast.success('Cotización guardada, creando cliente...');
    
    this.router.navigate(['/clientes/nuevo'], {
      queryParams: {
        fromQuote: 'true',
        market: 'aguascalientes',
        flow: this.currentQuote.flow
      }
    });
  }

  resetQuote(): void {
    this.currentQuote = undefined;
    this.toast.info('Cotización limpiada');
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  // Getters
  get totalPrice(): number {
    if (!this.packageData) return 0;
    return this.cotizadorEngine.calculatePackagePrice(
      this.packageData,
      this.isPlazoSale() ? this.cotizadorForm.get('term')?.value || 1 : 1,
      this.selectedOptionals
    );
  }

  get availableTerms(): number[] {
    return this.packageData?.terms || [];
  }

  get minDownPayment(): number {
    if (!this.packageData) return 0;
    return this.totalPrice * this.packageData.minDownPaymentPercentage;
  }

  get minDownPaymentPct(): number {
    if (!this.packageData) return 0;
    return Math.round(this.packageData.minDownPaymentPercentage * 100);
  }

  isPlazoSale(): boolean {
    return this.cotizadorForm.get('saleType')?.value?.includes('plazo') || false;
  }

  canCalculate(): boolean {
    const form = this.cotizadorForm;
    return form.valid && 
           form.get('downPayment')?.value >= this.minDownPayment &&
           (!this.isPlazoSale() || form.get('term')?.value) &&
           !this.isCalculating;
  }

  generatePDF(): void {
    if (!this.currentQuote || !this.packageData) {
      this.toast.error('No hay cotización disponible para generar PDF');
      return;
    }

    const quoteData = {
      clientInfo: {
        name: 'Cliente AGS',
        contact: 'N/A'
      },
      ecosystemInfo: {
        name: 'Aguascalientes',
        route: 'AGS-Ruta',
        market: 'AGS' as const
      },
      quoteDetails: {
        vehicleValue: this.currentQuote.totalPrice,
        downPaymentOptions: [this.currentQuote.downPayment],
        monthlyPaymentOptions: [this.currentQuote.monthlyPayment || 0],
        termOptions: [this.currentQuote.term || 0],
        interestRate: 25.5
      },
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      quoteNumber: `AGS-${Date.now()}`
    };

    this.pdfExportService.generateQuotePDF(quoteData as any)
      .then(() => {
        this.toast.success('PDF generado exitosamente');
      })
      .catch(() => {
        this.toast.error('Error al generar PDF');
      });
  }

  speakQuote(): void {
    if (!this.currentQuote) return;
    const parts: string[] = [];
    parts.push(`Precio total ${this.formatCurrency(this.currentQuote.totalPrice)} pesos.`);
    if (typeof this.currentQuote.downPayment === 'number') {
      parts.push(`Enganche ${this.formatCurrency(this.currentQuote.downPayment)}.`);
    }
    if (this.isPlazoSale()) {
      if (typeof this.currentQuote.monthlyPayment === 'number') {
        parts.push(`Pago mensual ${this.formatCurrency(this.currentQuote.monthlyPayment)}.`);
      }
      if (typeof this.currentQuote.term === 'number') {
        parts.push(`Plazo ${this.currentQuote.term} meses.`);
      }
    }
    this.speech.cancel();
    this.speech.speak(parts.join(' '));
  }

  private formatCurrency(value: number): string {
    try {
      return new Intl.NumberFormat('es-MX').format(Math.round(value));
    } catch {
      return `${Math.round(value)}`;
    }
  }
}
