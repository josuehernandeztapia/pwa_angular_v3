import { CommonModule } from '@angular/common';
import { Component, HostBinding, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CotizadorEngineService, ProductComponent, ProductPackage } from '../../../services/cotizador-engine.service';
import { ToastService } from '../../../services/toast.service';
import { EmptyStateCardComponent } from '../../shared/empty-state-card.component';
import { SkeletonCardComponent } from '../../shared/skeleton-card.component';
import { IconComponent } from '../../shared/icon/icon.component';

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

  markets = [
    { value: 'all', label: 'Todos', emoji: '🌎' },
    { value: 'aguascalientes', label: 'Aguascalientes', emoji: '🌵' },
    { value: 'edomex', label: 'Estado de México', emoji: '🏙️' }
  ];

  productTypes = [
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

    setTimeout(() => {
      const packages: ProductPackage[] = this.cotizador.getProductPackages();
      this.products = packages.map(pkg => this.mapPackageToCatalogItem(pkg));

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

  private mapPackageToCatalogItem(pkg: ProductPackage): ProductCatalogItem {
    return {
      id: pkg.id,
      name: pkg.name,
      market: pkg.market,
      type: pkg.type,
      businessFlow: pkg.businessFlow,
      basePrice: pkg.basePrice,
      components: pkg.components,
      features: pkg.features || [],
      rate: pkg.rate,
      terms: pkg.terms,
      minDownPayment: pkg.minDownPayment,
      isPopular: pkg.isPopular
    };
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
