import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface ConfigurationState {
  mode: 'cotizador' | 'simulador';
  precio: number;
  enganche: number;
  plazo: number;
  tipoCliente: 'nuevo' | 'existente' | 'vip';
  mercado: 'nacional' | 'internacional' | 'premium';
  selectedPackage: 'basico' | 'premium' | 'colectivo' | null;
  isCalculating: boolean;
  errors: { [key: string]: string };
}

interface ProductPackage {
  id: 'basico' | 'premium' | 'colectivo';
  name: string;
  description: string;
  icon: string;
  features: string[];
  price: number;
  recommended?: boolean;
}

interface FinancialResult {
  pmt: number;
  tasa: number;
  ahorro: number;
  total: number;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ui-card">
      <h2 class="text-sm font-semibold mb-6 text-slate-900 dark:text-slate-100">Configuración de Flujos y Productos</h2>

      <!-- Dual Mode Selector -->
      <div class="mb-6">
        <div class="mode-selector" data-cy="config-mode-toggle">
          <button
            class="mode-btn"
            [class.active]="config().mode === 'cotizador'"
            (click)="setMode('cotizador')"
          >
            Cotizador
          </button>
          <button
            class="mode-btn"
            [class.active]="config().mode === 'simulador'"
            (click)="setMode('simulador')"
          >
            Simulador
          </button>
        </div>
      </div>

      <!-- Configuration Panel -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <!-- Precio -->
        <div class="config-field">
          <label class="field-label">Precio</label>
          <input
            type="number"
            class="field-input"
            data-cy="config-precio"
            [value]="config().precio"
            (input)="updateConfig('precio', $event)"
            placeholder="$0"
          >
          <div *ngIf="config().errors['precio']" class="field-error">
            {{ config().errors['precio'] }}
          </div>
        </div>

        <!-- Enganche -->
        <div class="config-field">
          <label class="field-label">% Enganche</label>
          <input
            type="number"
            class="field-input"
            data-cy="config-eng"
            [value]="config().enganche"
            (input)="updateConfig('enganche', $event)"
            placeholder="20"
            min="0"
            max="100"
          >
          <div *ngIf="config().errors['enganche']" class="field-error">
            {{ config().errors['enganche'] }}
          </div>
        </div>

        <!-- Plazo -->
        <div class="config-field">
          <label class="field-label">Plazo (meses)</label>
          <select
            class="field-select"
            data-cy="config-plazo"
            [value]="config().plazo"
            (change)="updateConfigFromSelect('plazo', $event)"
          >
            <option value="12">12 meses</option>
            <option value="24">24 meses</option>
            <option value="36">36 meses</option>
            <option value="48">48 meses</option>
            <option value="60">60 meses</option>
          </select>
        </div>

        <!-- Tipo Cliente -->
        <div class="config-field">
          <label class="field-label">Tipo de Cliente</label>
          <select
            class="field-select"
            data-cy="config-cliente"
            [value]="config().tipoCliente"
            (change)="updateConfigFromSelect('tipoCliente', $event)"
          >
            <option value="nuevo">Nuevo</option>
            <option value="existente">Existente</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        <!-- Mercado -->
        <div class="config-field col-span-2">
          <label class="field-label">Mercado</label>
          <select
            class="field-select"
            data-cy="config-mercado"
            [value]="config().mercado"
            (change)="updateConfigFromSelect('mercado', $event)"
          >
            <option value="nacional">Nacional</option>
            <option value="internacional">Internacional</option>
            <option value="premium">Premium</option>
          </select>
        </div>
      </div>

      <!-- Product Packages -->
      <div class="mb-6">
        <h3 class="text-sm font-medium mb-3 text-slate-900 dark:text-slate-100">Paquetes de Productos</h3>
        <div class="grid grid-cols-3 gap-3">
          <div
            *ngFor="let pkg of productPackages"
            class="product-package"
            [class.selected]="config().selectedPackage === pkg.id"
            [class.recommended]="pkg.recommended"
            (click)="selectPackage(pkg.id)"
            data-cy="product-package"
          >
            <div class="package-header">
              <div class="package-icon">{{ pkg.icon }}</div>
              <div class="package-info">
                <div class="package-name">{{ pkg.name }}</div>
                <div class="package-price">{{ '$' + pkg.price }}</div>
              </div>
            </div>
            <div class="package-description">{{ pkg.description }}</div>
            <ul class="package-features">
              <li *ngFor="let feature of pkg.features">{{ feature }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Financial Results -->
      <div class="financial-results" data-cy="config-result">
        <div *ngIf="config().isCalculating" class="results-loading">
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3 mb-2"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2"></div>
        </div>

        <div *ngIf="!config().isCalculating && financialResults()" class="results-grid">
          <div class="result-item">
            <div class="result-label">PMT Mensual</div>
            <div class="result-value">{{ '$' + financialResults()?.pmt?.toFixed(2) }}</div>
          </div>
          <div class="result-item">
            <div class="result-label">Tasa Efectiva</div>
            <div class="result-value">{{ financialResults()?.tasa?.toFixed(2) }}%</div>
          </div>
          <div class="result-item">
            <div class="result-label">Ahorro Total</div>
            <div class="result-value text-emerald-600 dark:text-emerald-400">{{ '$' + financialResults()?.ahorro?.toFixed(2) }}</div>
          </div>
          <div class="result-item col-span-3">
            <div class="result-label">Total a Pagar</div>
            <div class="result-value text-lg font-semibold">{{ '$' + financialResults()?.total?.toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {
  // Configuration state signal
  config = signal<ConfigurationState>({
    mode: 'cotizador',
    precio: 250000,
    enganche: 20,
    plazo: 36,
    tipoCliente: 'nuevo',
    mercado: 'nacional',
    selectedPackage: null,
    isCalculating: false,
    errors: {}
  });

  // Product packages
  productPackages: ProductPackage[] = [
    {
      id: 'basico',
      name: 'Básico',
      description: 'Paquete esencial para comenzar',
      icon: '📦',
      features: ['Cobertura básica', 'Soporte estándar', '1 año garantía'],
      price: 15000
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Funcionalidades avanzadas',
      icon: '⭐',
      features: ['Cobertura completa', 'Soporte prioritario', '3 años garantía', 'Beneficios extra'],
      price: 35000,
      recommended: true
    },
    {
      id: 'colectivo',
      name: 'Colectivo',
      description: 'Para grupos y empresas',
      icon: '🏢',
      features: ['Cobertura empresarial', 'Soporte dedicado', '5 años garantía', 'Descuentos grupales'],
      price: 75000
    }
  ];

  // Financial results computed signal
  financialResults = computed<FinancialResult | null>(() => {
    const cfg = this.config();
    if (cfg.precio <= 0 || cfg.enganche < 0 || cfg.plazo <= 0) {
      return null;
    }

    const principal = cfg.precio * (1 - cfg.enganche / 100);
    const monthlyRate = 0.12 / 12; // 12% annual rate
    const months = cfg.plazo;

    // PMT calculation
    const pmt = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                (Math.pow(1 + monthlyRate, months) - 1);

    const total = pmt * months;
    const tasa = (total / principal - 1) * 100;
    const ahorro = cfg.precio * 0.05; // 5% savings

    return { pmt, tasa, ahorro, total };
  });

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.initializeCalculation();
  }

  // Set mode (Cotizador/Simulador)
  setMode(mode: 'cotizador' | 'simulador'): void {
    this.config.update(cfg => ({ ...cfg, mode }));
    this.recalculate();
  }

  // Update configuration field
  updateConfig(field: keyof ConfigurationState, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.type === 'number' ? parseFloat(target.value) || 0 : target.value;

    this.config.update(cfg => ({
      ...cfg,
      [field]: value,
      errors: this.validateField(field, value, cfg.errors)
    }));

    this.recalculate();
  }

  // Update configuration from select
  updateConfigFromSelect(field: keyof ConfigurationState, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = field === 'plazo' ? parseInt(target.value) : target.value;

    this.config.update(cfg => ({
      ...cfg,
      [field]: value,
      errors: this.validateField(field, value, cfg.errors)
    }));

    this.recalculate();
  }

  // Select product package
  selectPackage(packageId: 'basico' | 'premium' | 'colectivo'): void {
    this.config.update(cfg => ({ ...cfg, selectedPackage: packageId }));
    this.recalculate();
  }

  // Validation logic
  private validateField(field: string, value: any, currentErrors: { [key: string]: string }): { [key: string]: string } {
    const errors = { ...currentErrors };
    delete errors[field]; // Clear previous error

    switch (field) {
      case 'precio':
        if (value <= 0) {
          errors[field] = 'El precio debe ser mayor a 0';
        } else if (value > 10000000) {
          errors[field] = 'El precio no puede superar los $10,000,000';
        }
        break;
      case 'enganche':
        if (value < 0) {
          errors[field] = 'El enganche no puede ser negativo';
        } else if (value > 100) {
          errors[field] = 'El enganche no puede superar el 100%';
        }
        break;
    }

    return errors;
  }

  // Recalculate with loading state
  private recalculate(): void {
    this.config.update(cfg => ({ ...cfg, isCalculating: true }));

    // Simulate calculation delay
    setTimeout(() => {
      this.config.update(cfg => ({ ...cfg, isCalculating: false }));
    }, 800);
  }

  // Initialize calculation on component load
  private initializeCalculation(): void {
    this.recalculate();
  }
}