import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Quote } from '../../../../models/types';
import { CotizadorEngineService, ProductPackage } from '../../../../services/cotizador-engine.service';
import { PdfExportService } from '../../../../services/pdf-export.service';
import { SpeechService } from '../../../../services/speech.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-ags-individual',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="ags-cotizador command-container">
      <!-- Header -->
      <div class="header">
        <button (click)="goBack()" class="back-btn">← Volver</button>
        <h1>🌵 Cotizador AGS Individual</h1>
        <p>Aguascalientes • Venta a Plazo & Compra de Contado</p>
      </div>

      <!-- Resumen KPIs -->
      <div class="summary-card premium-card" *ngIf="!isLoading">
        <h2 class="section-title">Resumen</h2>
        <div class="summary-grid">
          <div class="summary-chip">
            <span class="label">Pago mensual</span>
            <strong class="value">{{ (currentQuote?.monthlyPayment || 0) | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
          <div class="summary-chip">
            <span class="label">Plazo</span>
            <strong class="value">{{ isPlazoSale() ? (currentQuote?.term || cotizadorForm.value.term) + ' meses' : '—' }}</strong>
          </div>
          <div class="summary-chip">
            <span class="label">Total</span>
            <strong class="value">{{ (currentQuote?.totalPrice || totalPrice) | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
        </div>
      </div>

      <div class="content" *ngIf="!isLoading">
        <!-- Left Panel: Configuración -->
        <div class="premium-card config-panel">
          <form [formGroup]="cotizadorForm">
            
            <!-- Tipo de Venta -->
            <div class="section">
              <h2>💰 Unidad</h2>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" formControlName="saleType" value="aguascalientes-plazo" (change)="onSaleTypeChange()">
                  <div class="option-info">
                    <strong>Venta a Plazo</strong>
                    <small>12-24 meses • Enganche 60% • Tasa 25.5%</small>
                  </div>
                </label>
                
                <label class="radio-option">
                  <input type="radio" formControlName="saleType" value="aguascalientes-directa" (change)="onSaleTypeChange()">
                  <div class="option-info">
                    <strong>Compra de Contado</strong>
                    <small>Sin financiamiento • Enganche 50%</small>
                  </div>
                </label>
              </div>
            </div>

            <!-- Paquete AGS -->
            <div class="section" *ngIf="packageData">
              <h2>📦 Consumo</h2>
              <div class="package-info">
                <div class="vehicle-card">
                  <h4>🚐 Vagoneta H6C (19 Pasajeros)</h4>
                  <div class="price">$799,000 MXN</div>
                </div>
                
                <div class="components">
                  <div *ngFor="let component of packageData.components" class="component">
                    <label *ngIf="component.isOptional" class="checkbox-label">
                      <input type="checkbox" [checked]="selectedOptionals.includes(component.id)" (change)="onOptionalToggle(component.id)">
                      <span>{{ component.name }}</span>
                      <strong>{{ component.price | currency:'MXN':'symbol':'1.0-0' }}</strong>
                    </label>
                    <div *ngIf="!component.isOptional" class="required-component">
                      <span>✅ {{ component.name }}</span>
                      <strong>{{ component.price | currency:'MXN':'symbol':'1.0-0' }}</strong>
                    </div>
                  </div>
                </div>
                
                <div class="total-price">
                  <span>Total del Paquete:</span>
                  <strong>{{ totalPrice | currency:'MXN':'symbol':'1.0-0' }}</strong>
                </div>
              </div>
            </div>

            <!-- Configuración Financiera -->
            <div class="section" *ngIf="packageData">
              <h2>💳 Finanzas</h2>
              
              <div class="form-group" *ngIf="isPlazoSale()">
                <label>Plazo</label>
                <select formControlName="term" (change)="onConfigChange()">
                  <option value="">Seleccionar</option>
                  <option *ngFor="let term of availableTerms" [value]="term">{{ term }} meses</option>
                </select>
              </div>

              <div class="form-group">
                <label>Enganche (Mínimo {{ minDownPaymentPct }}%)</label>
                <div class="currency-input">
                  <span>$</span>
                  <input type="number" formControlName="downPayment" [min]="minDownPayment" (input)="onConfigChange()" placeholder="Monto">
                </div>
                <small>Mínimo: {{ minDownPayment | currency:'MXN':'symbol':'1.0-0' }}</small>
              </div>

              <button type="button" (click)="calculateQuote()" [disabled]="!canCalculate()" class="calc-btn">
                {{ isCalculating ? 'Calculando...' : '🧮 Calcular' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Right Panel: Resultado -->
        <div class="premium-card quote-panel" *ngIf="currentQuote">
          <h3>📋 Cotización AGS</h3>
          
          <!-- Resumen XL -->
          <div class="summary-xl">
            <div class="card">
              <div class="sub">Pago mensual</div>
              <div class="num">{{ (currentQuote.monthlyPayment || 0) | currency:'MXN':'symbol':'1.0-0' }}</div>
            </div>
            <div class="card">
              <div class="sub">Plazo</div>
              <div class="num">{{ isPlazoSale() ? (currentQuote.term + ' meses') : '—' }}</div>
            </div>
            <div class="card">
              <div class="sub">Total</div>
              <div class="num">{{ currentQuote.totalPrice | currency:'MXN':'symbol':'1.0-0' }}</div>
            </div>
          </div>
          
          <div class="quote-summary">
            <div class="summary-item total">
              <span>Precio Total</span>
              <strong class="num">{{ currentQuote.totalPrice | currency:'MXN':'symbol':'1.0-0' }}</strong>
            </div>
            
            <div class="summary-item">
              <span>Enganche</span>
              <span class="num">{{ currentQuote.downPayment | currency:'MXN':'symbol':'1.0-0' }}</span>
            </div>
            
            <div *ngIf="isPlazoSale()" class="summary-item">
              <span>A Financiar</span>
              <span class="num">{{ currentQuote.amountToFinance | currency:'MXN':'symbol':'1.0-0' }}</span>
            </div>
            
            <div *ngIf="isPlazoSale()" class="summary-item highlight">
              <span>Pago Mensual</span>
              <strong class="monthly num">{{ currentQuote.monthlyPayment | currency:'MXN':'symbol':'1.0-0' }}</strong>
            </div>
            
            <div *ngIf="isPlazoSale()" class="summary-item">
              <span>Plazo</span>
              <span>{{ currentQuote.term }} meses</span>
            </div>
            
            <div *ngIf="isPlazoSale()" class="summary-item">
              <span>Tasa Anual</span>
              <span>25.5%</span>
            </div>
          </div>

          <div class="quote-actions">
            <button (click)="speakQuote()" class="voice-btn">🔊 Escuchar</button>
            <button (click)="generatePDF()" class="pdf-btn">📄 Descargar PDF</button>
            <button (click)="proceedWithQuote()" class="proceed-btn">✅ Continuar</button>
            <button (click)="resetQuote()" class="reset-btn">🔄 Nueva Cotización</button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <section *ngIf="isLoading" class="premium-card loading" role="status" aria-live="polite" aria-busy="true" style="min-height: 160px; display:flex; align-items:center; justify-content:center;">
        Cargando paquete AGS...
      </section>
    </div>
  `,
  styles: [`
    .ags-cotizador {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      background: transparent;
      min-height: auto;
    }

    .header {
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

    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .header p {
      color: #64748b;
      margin: 0;
    }

    .content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .content {
        grid-template-columns: 1fr;
      }
    }

    .config-panel, .quote-panel {
      background: transparent;
      border-radius: 12px;
      box-shadow: none;
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
    .summary-card.premium-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.1); padding: 16px; margin-bottom: 16px; }
    .summary-card .section-title { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #374151; }
    .summary-grid { display: grid; gap: 12px; grid-template-columns: repeat(3, 1fr); }
    .summary-chip { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
    .summary-chip .label { display:block; font-size:12px; color:#6b7280; margin-bottom:4px; }
    .summary-chip .value { font-size:16px; color:#111827; }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .radio-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .radio-option:hover {
      border-color: #3b82f6;
      background: #f8fafc;
    }

    .radio-option:has(input:checked) {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .option-info strong {
      display: block;
      color: #374151;
      margin-bottom: 4px;
    }

    .option-info small {
      color: #6b7280;
      font-size: 13px;
    }

    .package-info {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
    }

    .vehicle-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .vehicle-card h4 {
      margin: 0;
      color: #374151;
    }

    .vehicle-card .price {
      font-size: 18px;
      font-weight: 700;
      color: #059669;
    }

    .components {
      margin-bottom: 16px;
    }

    .component {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      cursor: pointer;
    }

    .required-component {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .total-price {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 18px;
      font-weight: 600;
      padding-top: 16px;
      border-top: 2px solid #e5e7eb;
      color: #374151;
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

    .calc-btn {
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .calc-btn:hover:not(:disabled) {
      background: #2563eb;
    }

    .calc-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .quote-panel h3 {
      font-size: 20px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 20px;
    }

    .quote-summary {
      margin-bottom: 24px;
    }

    .summary-xl { display:grid; gap:12px; grid-template-columns: repeat(3,1fr); margin-bottom:16px; }
    .summary-xl .card { font-size: clamp(24px, 4vw, 32px); line-height:1.2; padding:16px; border:1px solid var(--border, #e5e5e5); border-radius:12px; background:#fff; }
    .summary-xl .sub { font-size:.75em; opacity:.75; }

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .summary-item.total {
      font-size: 18px;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 8px;
    }

    .summary-item.highlight {
      background: #f0f9ff;
      margin: 0 -16px;
      padding: 16px;
      border-radius: 6px;
      border: none;
      font-weight: 600;
    }

    .summary-item .monthly {
      color: #059669;
      font-size: 20px;
    }

    .quote-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .voice-btn {
      width: 100%;
      padding: 12px;
      background: #0ea5e9;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .voice-btn:hover { background:#0284c7; }

    .proceed-btn, .reset-btn {
      width: 100%;
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

    .pdf-btn {
      width: 100%;
      padding: 12px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pdf-btn:hover {
      background: #b91c1c;
    }

    .loading { color: #a0aec0; }
  `]
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