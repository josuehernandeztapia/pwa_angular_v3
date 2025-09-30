import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CotizadorEngineService, ProductComponent, ProductPackage } from '../../../services/cotizador-engine.service';
import { ToastService } from '../../../services/toast.service';
import { EmptyStateCardComponent } from '../../shared/empty-state-card.component';
import { SkeletonCardComponent } from '../../shared/skeleton-card.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../shared/icon/icon-definitions';

interface ProductCatalogItem {
  id: string;
  name: string;
  market: 'aguascalientes' | 'edomex';
  type: 'plazo' | 'directa' | 'colectivo';
  businessFlow: string;
  basePrice: number;
  components: ProductComponent[];
  features: string[];
  rate?: number;
  terms?: number[];
  minDownPayment: number;
  isPopular?: boolean;
}

interface MarketFilterOption {
  value: 'all' | 'aguascalientes' | 'edomex';
  label: string;
  icon: IconName;
}

@Component({
  selector: 'app-productos-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SkeletonCardComponent, EmptyStateCardComponent, IconComponent],
  templateUrl: './productos-catalog.component.html',
  styleUrls: ['./productos-catalog.component.scss']
})
export class ProductosCatalogComponent implements OnInit {
  @HostBinding('class') readonly hostClass = 'catalog-page';
  products: ProductCatalogItem[] = [];
  filteredProducts: ProductCatalogItem[] = [];
  isLoading = false;

  selectedMarket: 'all' | 'aguascalientes' | 'edomex' = 'all';
  selectedType: 'all' | 'plazo' | 'directa' | 'colectivo' = 'all';

  markets: MarketFilterOption[] = [
    { value: 'all', label: 'Todos', icon: 'globe' },
    { value: 'aguascalientes', label: 'Aguascalientes', icon: 'sun' },
    { value: 'edomex', label: 'Estado de México', icon: 'building-office' }
  ];

  productTypes: { value: 'all' | 'plazo' | 'directa' | 'colectivo', label: string }[] = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'plazo', label: 'Venta a Plazo' },
    { value: 'directa', label: 'Venta Directa' },
    { value: 'colectivo', label: 'Crédito Colectivo' }
  ];

  constructor(
    private cotizador: CotizadorEngineService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.restoreFilters();
    this.loadCatalog();
  }

  private loadCatalog(): void {
    this.isLoading = true;

    // Get packages for different markets and types
    const packageKeys = [
      'aguascalientes-plazo', 'aguascalientes-directa',
      'edomex-plazo', 'edomex-directa', 'edomex-colectivo'
    ];

    const packageRequests = packageKeys.map(key => this.cotizador.getProductPackage(key));

    // For demo purposes, create mock packages
    setTimeout(() => {
      this.products = this.createMockCatalogItems();

      if (!this.products.some(product => product.isPopular)) {
        this.products = this.products.map((product, index) => ({
          ...product,
          isPopular: index === 0
        }));
      }

      this.applyFilters();
      this.isLoading = false;
    }, 300);
  }

  private createMockCatalogItems(): ProductCatalogItem[] {
    return [
      {
        id: 'ags-plazo-1',
        name: 'Paquete Venta a Plazo - Aguascalientes',
        market: 'aguascalientes',
        type: 'plazo',
        businessFlow: 'VentaPlazo',
        basePrice: 350000,
        components: [
          { id: 'vehicle-base', name: 'Vehículo Base', price: 280000, isOptional: false, isMultipliedByTerm: false },
          { id: 'insurance', name: 'Seguro Anual', price: 15000, isOptional: false, isMultipliedByTerm: true },
          { id: 'gps', name: 'GPS', price: 5000, isOptional: true, isMultipliedByTerm: false }
        ],
        features: ['Financiamiento directo', 'Tasa competitiva', 'Pagos mensuales fijos'],
        rate: 0.12,
        terms: [12, 24, 36, 48],
        minDownPayment: 0.20,
        isPopular: true
      },
      {
        id: 'ags-directa-1',
        name: 'Venta Directa - Aguascalientes',
        market: 'aguascalientes',
        type: 'directa',
        businessFlow: 'VentaDirecta',
        basePrice: 280000,
        components: [
          { id: 'vehicle', name: 'Vehículo', price: 280000, isOptional: false, isMultipliedByTerm: false }
        ],
        features: ['Sin financiamiento', 'Entrega inmediata'],
        rate: 0,
        terms: [],
        minDownPayment: 1.0,
        isPopular: false
      },
      {
        id: 'edomex-colectivo-1',
        name: 'Crédito Colectivo - Estado de México',
        market: 'edomex',
        type: 'colectivo',
        businessFlow: 'CreditoColectivo',
        basePrice: 320000,
        components: [
          { id: 'vehicle-collective', name: 'Vehículo Base', price: 280000, isOptional: false, isMultipliedByTerm: false },
          { id: 'group-admin', name: 'Administración Grupal', price: 2000, isOptional: false, isMultipliedByTerm: true }
        ],
        features: ['Financiamiento grupal', 'Menores tasas de interés'],
        rate: 0.08,
        terms: [24, 36, 48],
        minDownPayment: 0.15,
        isPopular: false
      }
    ];
  }

  getMarketLabel(market: string): string {
    return market === 'aguascalientes' ? 'AGS' : 'EdoMex';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  selectMarket(market: 'all' | 'aguascalientes' | 'edomex'): void {
    this.selectedMarket = market;
    this.applyFilters();
    this.persistFilters();
  }

  selectType(type: 'all' | 'plazo' | 'directa' | 'colectivo'): void {
    this.selectedType = type;
    this.applyFilters();
    this.persistFilters();
  }

  resetFilters(): void {
    this.selectedMarket = 'all';
    this.selectedType = 'all';
    this.applyFilters();
    this.persistFilters();
    this.toast.info('Filtros restablecidos');
  }

  applyFilters(): void {
    this.filteredProducts = this.products.filter(product => {
      if (this.selectedMarket !== 'all' && product.market !== this.selectedMarket) {
        return false;
      }
      if (this.selectedType !== 'all' && product.type !== this.selectedType) {
        return false;
      }
      return true;
    });
  }

  viewDetails(productId: string): void {
    this.toast.info(`Mostrando detalles de ${productId}`);
  }

  startQuote(producto: ProductCatalogItem): void {
    this.toast.success(`Iniciando cotización para ${producto.name}`);
  }

  simulateDemo(): void {
    this.toast.info('Simulación demo en progreso');
  }

  trackByProductId(index: number, producto: ProductCatalogItem): string {
    return producto.id;
  }

  private persistFilters(): void {
    try {
      localStorage.setItem('catalog.filters', JSON.stringify({
        market: this.selectedMarket,
        type: this.selectedType
      }));
    } catch {}
  }

  private restoreFilters(): void {
    try {
      const raw = localStorage.getItem('catalog.filters');
      if (!raw) {
        return;
      }
      const { market, type } = JSON.parse(raw);
      if (market) {
        this.selectedMarket = market;
      }
      if (type) {
        this.selectedType = type;
      }
    } catch {}
  }

  getMarketButtonClasses(market: string): Record<string, boolean> {
    return {
      'catalog-page__filter-button': true,
      'catalog-page__filter-button--active': this.selectedMarket === market
    };
  }

  getTypeButtonClasses(type: string): Record<string, boolean> {
    return {
      'catalog-page__type-button': true,
      'catalog-page__type-button--active': this.selectedType === type
    };
  }

  getProductCardClasses(producto: ProductCatalogItem): Record<string, boolean> {
    return {
      'catalog-card': true,
      'catalog-card--popular': !!producto.isPopular
    };
  }

  getComponentClasses(component: ProductComponent): Record<string, boolean> {
    return {
      'catalog-card__component': true,
      'catalog-card__component--optional': !!component.isOptional
    };
  }
}
