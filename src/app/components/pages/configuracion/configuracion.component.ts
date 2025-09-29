import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ConfigurationState {
  mode: 'cotizador' | 'simulador';
  precio: number;
  enganche: number;
  plazo: number;
  tipoCliente: 'nuevo' | 'existente' | 'vip';
  mercado: 'nacional' | 'internacional' | 'premium';
  selectedPackage: 'basico' | 'premium' | 'colectivo' | null;
  isCalculating: boolean;
  errors: Record<string, string>;
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
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {
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

  productPackages: ProductPackage[] = [
    {
      id: 'basico',
      name: 'Básico',
      description: 'Paquete esencial para comenzar',
      icon: '<svg class="configuracion__package-icon configuracion__package-icon--basic" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
      features: ['Cobertura básica', 'Soporte estándar', '1 año garantía'],
      price: 15000
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Funcionalidades avanzadas',
      icon: '<svg class="configuracion__package-icon configuracion__package-icon--premium" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>',
      features: ['Cobertura completa', 'Soporte prioritario', '3 años garantía', 'Beneficios extra'],
      price: 35000,
      recommended: true
    },
    {
      id: 'colectivo',
      name: 'Colectivo',
      description: 'Para grupos y empresas',
      icon: '',
      features: ['Cobertura empresarial', 'Soporte dedicado', '5 años garantía', 'Descuentos grupales'],
      price: 75000
    }
  ];

  financialResults = computed<FinancialResult | null>(() => {
    const cfg = this.config();
    if (cfg.precio <= 0 || cfg.enganche < 0 || cfg.plazo <= 0) {
      return null;
    }

    const principal = cfg.precio * (1 - cfg.enganche / 100);
    const monthlyRate = 0.12 / 12;
    const months = cfg.plazo;

    const pmt = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);

    const total = pmt * months;
    const tasa = (total / principal - 1) * 100;
    const ahorro = cfg.precio * 0.05;

    return { pmt, tasa, ahorro, total };
  });

  ngOnInit(): void {
    this.initializeCalculation();
  }

  setMode(mode: 'cotizador' | 'simulador'): void {
    this.config.update(cfg => ({ ...cfg, mode }));
    this.recalculate();
  }

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

  updateConfigFromSelect(field: keyof ConfigurationState, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = field === 'plazo' ? parseInt(target.value, 10) : target.value;

    this.config.update(cfg => ({
      ...cfg,
      [field]: value,
      errors: this.validateField(field, value, cfg.errors)
    }));

    this.recalculate();
  }

  selectPackage(packageId: 'basico' | 'premium' | 'colectivo'): void {
    this.config.update(cfg => ({ ...cfg, selectedPackage: packageId }));
    this.recalculate();
  }

  private validateField(field: string, value: any, currentErrors: Record<string, string>): Record<string, string> {
    const errors = { ...currentErrors };
    delete errors[field];

    switch (field) {
      case 'precio':
        if (value <= 0) {
          errors[field] = 'El precio debe ser mayor a 0';
        } else if (value > 10_000_000) {
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

  private recalculate(): void {
    this.config.update(cfg => ({ ...cfg, isCalculating: true }));

    setTimeout(() => {
      this.config.update(cfg => ({ ...cfg, isCalculating: false }));
    }, 800);
  }

  private initializeCalculation(): void {
    this.recalculate();
  }
}
