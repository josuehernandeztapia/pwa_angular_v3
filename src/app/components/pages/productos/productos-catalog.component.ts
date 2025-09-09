import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CotizadorEngineService, ProductComponent, ProductPackage } from '../../../services/cotizador-engine.service';
import { ToastService } from '../../../services/toast.service';
import { EmptyStateCardComponent } from '../../shared/empty-state-card.component';
import { SkeletonCardComponent } from '../../shared/skeleton-card.component';

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
  imports: [CommonModule, FormsModule, RouterModule, SkeletonCardComponent, EmptyStateCardComponent],
  template: `
    <div class="productos-container command-container">
      <header class="page-header">
        <div class="header-content">
          <h1>🚐 Catálogo de Productos</h1>
          <p class="page-description">Paquetes de unidades vehiculares por mercado</p>
        </div>
      </header>

      <!-- Filtros de mercado -->
      <div class="filters-section">
        <div class="market-filters">
          <button 
            *ngFor="let market of markets" 
            class="filter-btn"
            [class.active]="selectedMarket === market.value"
            [attr.aria-pressed]="selectedMarket === market.value"
            [attr.aria-label]="'Filtrar por mercado: ' + market.label"
            (click)="selectMarket(market.value)"
          >
            {{ market.emoji }} {{ market.label }}
          </button>
        </div>
        
        <div class="type-filters">
          <button 
            *ngFor="let type of productTypes" 
            class="type-filter"
            [class.active]="selectedType === type.value"
            [attr.aria-pressed]="selectedType === type.value"
            [attr.aria-label]="'Filtrar por tipo: ' + type.label"
            (click)="selectType(type.value)"
          >
            {{ type.label }}
          </button>
        </div>
        <div class="filters-actions" *ngIf="selectedMarket !== 'all' || selectedType !== 'all'">
          <button class="clear-filters-btn btn-secondary" (click)="resetFilters()" aria-label="Limpiar filtros activos">Limpiar filtros</button>
        </div>
      </div>

      <!-- Loading State (placeholder estable) -->
      <section *ngIf="isLoading" class="premium-card loading-placeholder" role="status" aria-live="polite" aria-busy="true" style="min-height: 280px">
        <p>Cargando catálogo de productos…</p>
      </section>

      <!-- Catálogo de productos -->
      <div *ngIf="!isLoading" class="productos-grid">
        <div 
          *ngFor="let producto of filteredProducts; trackBy: trackByProductId"
          class="producto-card"
          [class.popular]="producto.isPopular"
        >
          <!-- Popular badge -->
          <div *ngIf="producto.isPopular" class="popular-badge">
            ⭐ Más Popular
          </div>

          <div class="producto-header">
            <div class="producto-title">
              <h3>{{ producto.name }}</h3>
              <span class="producto-market">{{ getMarketLabel(producto.market) }}</span>
            </div>
            <div class="producto-price">
              <span class="price-amount">{{ formatCurrency(producto.basePrice) }}</span>
              <span class="price-label">Precio base</span>
            </div>
          </div>

          <div class="producto-body">
            <!-- Componentes del paquete -->
            <div class="components-section">
              <h4>📦 Componentes del Paquete</h4>
              <div class="components-list">
                <div 
                  *ngFor="let component of producto.components" 
                  class="component-item"
                  [class.optional]="component.isOptional"
                >
                  <div class="component-info">
                    <span class="component-name">{{ component.name }}</span>
                    <span class="component-type" *ngIf="component.isOptional">Opcional</span>
                    <span class="component-type multiplied" *ngIf="component.isMultipliedByTerm">Anual</span>
                  </div>
                  <span class="component-price">{{ formatCurrency(component.price) }}</span>
                </div>
              </div>
            </div>

            <!-- Features -->
            <div class="features-section" *ngIf="producto.features.length > 0">
              <h4>✨ Características</h4>
              <div class="features-list">
                <span *ngFor="let feature of producto.features" class="feature-tag">
                  {{ feature }}
                </span>
              </div>
            </div>

            <!-- Condiciones financieras -->
            <div class="financial-section">
              <h4>💳 Condiciones Financieras</h4>
              <div class="financial-grid">
                <div class="financial-item" *ngIf="producto.rate">
                  <span class="financial-label">Tasa Anual</span>
                  <span class="financial-value">{{ (producto.rate * 100).toFixed(1) }}%</span>
                </div>
                <div class="financial-item">
                  <span class="financial-label">Enganche Mín.</span>
                  <span class="financial-value">{{ (producto.minDownPayment * 100).toFixed(0) }}%</span>
                </div>
                <div class="financial-item" *ngIf="producto.terms && producto.terms.length > 0">
                  <span class="financial-label">Plazos</span>
                  <span class="financial-value">{{ producto.terms.join(', ') }} meses</span>
                </div>
              </div>
            </div>
          </div>

          <div class="producto-actions">
            <button 
              class="btn-secondary"
              (click)="viewDetails(producto.id)"
            >
              👁️ Ver Detalles
            </button>
            <button 
              class="btn-primary"
              (click)="startQuote(producto)"
            >
              💰 Cotizar Ahora
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <app-empty-state-card
        *ngIf="!isLoading && filteredProducts.length === 0"
        icon="🔍"
        title="Sin resultados"
        subtitle="No se encontraron productos para los filtros seleccionados"
        [primaryCtaLabel]="'Mostrar todos'"
        (primary)="resetFilters()"
        [secondaryCtaLabel]="'Simular paquetes demo'"
        (secondary)="simulateDemo()"
      ></app-empty-state-card>
    </div>
  `,
  styles: [`
    .productos-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
      text-align: center;
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 2.5rem;
      font-weight: 700;
    }

    .page-description {
      margin: 0;
      color: #718096;
      font-size: 1.1rem;
    }

    .filters-section {
      margin-bottom: 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .market-filters {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 12px 24px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      background: white;
      color: #4a5568;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
    }

    .filter-btn.active {
      border-color: #4299e1;
      background: #4299e1;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
    }

    .filter-btn:hover:not(.active) {
      border-color: #cbd5e0;
      background: #f7fafc;
    }

    .type-filters {
      display: flex;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .type-filter {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      background: white;
      color: #718096;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .type-filter.active {
      border-color: #48bb78;
      background: #48bb78;
      color: white;
    }

    .type-filter:hover:not(.active) {
      background: #f7fafc;
    }

    .filters-actions {
      display: flex;
      justify-content: center;
    }

    .clear-filters-btn {
      margin-top: 4px;
      padding: 8px 16px;
    }

    .loading-placeholder {
      min-height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      color: #718096;
      font-weight: 600;
    }

    .productos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
      margin-bottom: 40px;
      min-height: 280px;
    }

    .producto-card {
      background: white;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      transition: all 0.3s;
      position: relative;
    }

    .producto-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
      border-color: #cbd5e0;
    }

    .producto-card.popular {
      border-color: #f6ad55;
      box-shadow: 0 0 0 2px rgba(246, 173, 85, 0.2);
    }

    .popular-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      background: linear-gradient(135deg, #f6ad55, #ed8936);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      z-index: 1;
    }

    .producto-header {
      padding: 24px;
      background: #f7fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .producto-title h3 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 1.3rem;
      font-weight: 700;
    }

    .producto-market {
      background: #4299e1;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .producto-price {
      text-align: right;
    }

    .price-amount {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: #48bb78;
      font-family: monospace;
    }

    .price-label {
      font-size: 0.8rem;
      color: #718096;
    }

    .producto-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .components-section h4,
    .features-section h4,
    .financial-section h4 {
      margin: 0 0 12px 0;
      color: #4a5568;
      font-size: 1rem;
      font-weight: 600;
    }

    .components-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .component-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f7fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .component-item.optional {
      border-left: 3px solid #4299e1;
    }

    .component-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .component-name {
      font-weight: 500;
      color: #2d3748;
    }

    .component-type {
      background: #4299e1;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .component-type.multiplied {
      background: #ed8936;
    }

    .component-price {
      font-family: monospace;
      font-weight: 600;
      color: #48bb78;
      font-size: 0.9rem;
    }

    .features-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .feature-tag {
      background: #e6fffa;
      color: #2d7d68;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 500;
      border: 1px solid #b2f5ea;
    }

    .financial-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
    }

    .financial-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      background: #f7fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .financial-label {
      font-size: 0.8rem;
      color: #718096;
      margin-bottom: 4px;
    }

    .financial-value {
      font-size: 1rem;
      font-weight: 700;
      color: #2d3748;
    }

    .producto-actions {
      padding: 20px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 12px;
    }

    .btn-primary, .btn-secondary {
      flex: 1;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #48bb78, #38a169);
      color: white;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #38a169, #2f855a);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #edf2f7;
      border-color: #cbd5e0;
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #718096;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      margin: 0 0 12px 0;
      color: #4a5568;
      font-size: 1.5rem;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      font-size: 1.1rem;
    }

    @media (max-width: 768px) {
      .productos-container {
        padding: 16px;
      }

      .productos-grid {
        grid-template-columns: 1fr;
      }

      .producto-header {
        flex-direction: column;
        gap: 12px;
      }

      .financial-grid {
        grid-template-columns: 1fr 1fr;
      }

      .producto-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ProductosCatalogComponent implements OnInit {
  products: ProductCatalogItem[] = [];
  filteredProducts: ProductCatalogItem[] = [];
  isLoading = true;

  selectedMarket: 'all' | 'aguascalientes' | 'edomex' = 'all';
  selectedType: 'all' | 'plazo' | 'directa' | 'colectivo' = 'all';

  markets = [
    { value: 'all' as const, label: 'Todos los Mercados', emoji: '🌎' },
    { value: 'aguascalientes' as const, label: 'Aguascalientes', emoji: '🏜️' },
    { value: 'edomex' as const, label: 'Estado de México', emoji: '🏙️' }
  ];

  productTypes = [
    { value: 'all' as const, label: 'Todos los Tipos' },
    { value: 'plazo' as const, label: 'Venta a Plazo' },
    { value: 'directa' as const, label: 'Venta Directa' },
    { value: 'colectivo' as const, label: 'Crédito Colectivo' }
  ];

  constructor(
    private cotizadorService: CotizadorEngineService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.restoreFilters();
    this.loadProducts();
  }

  async loadProducts(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Cargar todos los paquetes del cotizador engine
      const packageKeys = [
        'aguascalientes-plazo',
        'aguascalientes-directa', 
        'edomex-plazo',
        'edomex-directa',
        'edomex-colectivo'
      ];

      const packages = await Promise.all(
        packageKeys.map((key: string) => this.cotizadorService.getProductPackage(key).toPromise())
      );

      this.products = packages.map((pkg: ProductPackage | undefined, index: number) => this.transformPackageToProduct(pkg!, packageKeys[index]));
      this.filteredProducts = [...this.products];
      
    } catch (error) {
      this.toast.error('Error al cargar el catálogo de productos');
      console.error('Error loading products:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private transformPackageToProduct(pkg: ProductPackage, key: string): ProductCatalogItem {
    const [market, type] = key.split('-') as ['aguascalientes' | 'edomex', 'plazo' | 'directa' | 'colectivo'];
    
    const basePrice = pkg.components
      .filter(c => !c.isOptional)
      .reduce((sum, c) => sum + c.price, 0);

    const features = this.generateFeatures(market, type, pkg);
    
    return {
      id: key,
      name: pkg.name,
      market,
      type,
      businessFlow: this.getBusinessFlowFromType(type),
      basePrice,
      components: pkg.components,
      features,
      rate: pkg.rate > 0 ? pkg.rate : undefined,
      terms: pkg.terms.length > 0 ? pkg.terms : undefined,
      minDownPayment: pkg.minDownPaymentPercentage,
      isPopular: this.isPopularProduct(key)
    };
  }

  private generateFeatures(market: string, type: string, pkg: ProductPackage): string[] {
    const features: string[] = [];
    
    if (market === 'aguascalientes') {
      features.push('Mercado Aguascalientes', 'Operación desde Día 1');
    } else {
      features.push('Mercado EdoMex', 'Documentación de Ecosistema');
    }

    if (type === 'colectivo') {
      features.push(`Grupo de ${pkg.defaultMembers || 5} miembros`, 'Entrega por Tandas');
    }

    if (type === 'plazo') {
      features.push('Financiamiento Disponible', 'Pagos Mensuales');
    } else if (type === 'directa') {
      features.push('Pago de Contado', 'Entrega Inmediata');
    }

    if (pkg.components.some(c => c.name.includes('GNV'))) {
      features.push('Conversión GNV Incluida');
    }

    if (pkg.components.some(c => c.name.includes('GPS'))) {
      features.push('Paquete Tecnológico');
    }

    return features;
  }

  private getBusinessFlowFromType(type: string): string {
    switch (type) {
      case 'plazo': return 'Venta a Plazo';
      case 'directa': return 'Venta Directa';
      case 'colectivo': return 'Crédito Colectivo';
      default: return 'Venta a Plazo';
    }
  }

  private isPopularProduct(key: string): boolean {
    // Marcar productos populares basado en lógica de negocio
    return key === 'edomex-plazo' || key === 'aguascalientes-plazo';
  }

  selectMarket(market: typeof this.selectedMarket): void {
    this.selectedMarket = market;
    this.applyFilters();
    this.persistFilters();
  }

  selectType(type: typeof this.selectedType): void {
    this.selectedType = type;
    this.applyFilters();
    this.persistFilters();
  }

  private applyFilters(): void {
    this.filteredProducts = this.products.filter(product => {
      const marketMatch = this.selectedMarket === 'all' || product.market === this.selectedMarket;
      const typeMatch = this.selectedType === 'all' || product.type === this.selectedType;
      return marketMatch && typeMatch;
    });
  }

  resetFilters(): void {
    this.selectedMarket = 'all';
    this.selectedType = 'all';
    this.filteredProducts = [...this.products];
    this.persistFilters();
  }

  getMarketLabel(market: string): string {
    const marketLabels: { [key: string]: string } = {
      'aguascalientes': 'Aguascalientes',
      'edomex': 'Estado de México'
    };
    return marketLabels[market] || market;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  trackByProductId(index: number, product: ProductCatalogItem): string {
    return product.id;
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
      if (!raw) return;
      const { market, type } = JSON.parse(raw);
      if (market) this.selectedMarket = market;
      if (type) this.selectedType = type;
    } catch {}
  }

  simulateDemo(): void {
    this.toast.info('Iniciando simulación de paquetes demo...');
  }

  viewDetails(productId: string): void {
    this.toast.info(`Viendo detalles de ${productId}`);
    // Navigate to product detail page
  }

  startQuote(product: ProductCatalogItem): void {
    // Navigate to cotizador with pre-selected product
    const routeBase = product.type === 'colectivo' ? '/cotizador/edomex-colectivo' : '/cotizador';
    this.toast.success(`Iniciando cotización para ${product.name}`);
    // Router navigation would go here
  }
}