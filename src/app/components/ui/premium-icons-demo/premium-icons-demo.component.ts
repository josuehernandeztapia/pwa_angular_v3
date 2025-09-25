/**
 * Showcase of premium iconography system with micro-interactions
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PremiumIconComponent, IconName, IconSize, IconVariant } from '../premium-icon/premium-icon.component';
import { PREMIUM_ICONS_SYSTEM } from '../../../design-system/icons/premium-icons-system';

interface DemoSection {
  title: string;
  description: string;
  icons: {
    name: IconName;
    title: string;
    description: string;
    concept: string;
    variant?: IconVariant;
    showStatus?: boolean;
    status?: 'ok' | 'warning' | 'error';
    showBadge?: boolean;
    badgeCount?: number;
  }[];
}

@Component({
  standalone: true,
  imports: [CommonModule, PremiumIconComponent],
  template: `
      <!-- Header -->
          <app-premium-icon
            iconName="cotizador"
            size="lg"
            [showLabel]="false"
          </app-premium-icon>
          Sistema Premium de Iconografía
        </h1>
          Quirúrgico end-to-end UX/UI con microinteracciones
        </p>
      </header>

        <!-- Size Variations -->
          <h2 class="section-title">Variaciones de Tamaño</h2>
            <div
              *ngFor="let size of sizes"
              [attr.data-size]="size">
              <app-premium-icon
                iconName="simulador"
                [size]="size"
                [showLabel]="true"
                [label]="size.toUpperCase()">
              </app-premium-icon>
            </div>
          </div>
        </section>

        <!-- Icons Showcase -->
        <section
          *ngFor="let section of demoSections"
          <h2 class="section-title">{{ section.title }}</h2>
          <p class="section-description">{{ section.description }}</p>

          <div class="icons-showcase-grid">
            <div
              *ngFor="let icon of section.icons"
              class="icon-showcase-item"
              (click)="onIconClick(icon)">

                <app-premium-icon
                  [iconName]="icon.name"
                  size="xl"
                  [variant]="icon.variant || 'default'"
                  [showLabel]="false"
                  [showStatus]="icon.showStatus || false"
                  [status]="icon.status"
                  [showBadge]="icon.showBadge || false"
                  [badgeCount]="icon.badgeCount"
                  [ariaLabel]="icon.title">
                </app-premium-icon>
              </div>

              <div class="icon-info">
                <h3 class="icon-title">{{ icon.title }}</h3>
                <p class="icon-description">{{ icon.description }}</p>
                <p class="icon-concept">💡 {{ icon.concept }}</p>
              </div>

              <div class="icon-interactions">
                <button
                  class="trigger-btn"
                  (click)="triggerAnimation($event, icon.name)">
                  ✨ Trigger Animation
                </button>
              </div>
            </div>
          </div>
        </section>

          <h2 class="section-title">Estados Interactivos</h2>
            <div
              *ngFor="let state of interactiveStates"
              <h3 class="state-title">{{ state.title }}</h3>
              <div class="state-icons">
                <app-premium-icon
                  iconName="proteccion"
                  size="lg"
                  [variant]="state.variant"
                  [showLabel]="true"
                  [label]="state.label"
                  [showStatus]="state.showStatus"
                  [status]="state.status"
                  [ariaLabel]="state.title">
                </app-premium-icon>
              </div>
              <p class="state-description">{{ state.description }}</p>
            </div>
          </div>
        </section>

        <!-- Usage Examples -->
          <h2 class="section-title">Ejemplos de Uso en Contexto</h2>
          <div class="usage-examples">

            <!-- Navigation Example -->
            <div class="usage-example">
              <h3 class="example-title">Navegación Principal</h3>
              <div class="nav-example">
                <div *ngFor="let navItem of navigationItems" class="nav-item">
                  <app-premium-icon
                    [iconName]="navItem.icon"
                    size="md"
                    [showBadge]="navItem.showBadge"
                    [badgeCount]="navItem.badgeCount"
                    [showLabel]="true"
                    [label]="navItem.label">
                  </app-premium-icon>
                </div>
              </div>
            </div>

            <!-- Status Cards Example -->
            <div class="usage-example">
              <h3 class="example-title">Cards de Estado</h3>
              <div class="cards-example">
                <div *ngFor="let card of statusCards" class="status-card">
                  <app-premium-icon
                    [iconName]="card.icon"
                    size="lg"
                    [variant]="card.variant"
                    [showStatus]="true"
                    [status]="card.status"
                    [showLabel]="false">
                  </app-premium-icon>
                  <div class="card-content">
                    <h4>{{ card.title }}</h4>
                    <p>{{ card.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Technical Specs -->
          <h2 class="section-title">Especificaciones Técnicas</h2>
          <div class="tech-specs">
            <div class="spec-item">
              <h4>🎯 Precisión Quirúrgica</h4>
              <ul>
                <li>Grosor de línea: <code>2.5px</code> consistente</li>
                <li>Design tokens desde fuente de verdad</li>
                <li>Microinteracciones ≤200ms</li>
                <li>Estados: default, hover, active, error</li>
              </ul>
            </div>
            <div class="spec-item">
              <h4>♿ Accesibilidad</h4>
              <ul>
                <li><code>prefers-reduced-motion</code> respetado</li>
                <li>ARIA labels semánticos</li>
                <li>Contraste WCAG AA compliant</li>
                <li>Focus visible indicators</li>
              </ul>
            </div>
            <div class="spec-item">
              <h4>⚡ Performance</h4>
              <ul>
                <li>Phosphor Icons (optimizado)</li>
                <li>CSS animations hardware-accelerated</li>
                <li>Lazy loading compatible</li>
                <li>Bundle size: <5KB minified</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
      min-height: 100vh;
      background: var(--bg, #0B1220);
      color: var(--ink, #E6ECFF);
      padding: 32px;
    }

    /* Header */
      text-align: center;
      margin-bottom: 48px;
    }

      font-size: 2.5rem;
      font-weight: 800;
      color: var(--acc, #3AA6FF);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }

      font-size: 1.2rem;
      color: var(--muted, #A8B3CF);
      font-style: italic;
    }

    /* Main Layout */
      max-width: 1400px;
      margin: 0 auto;
    }

      margin-bottom: 64px;
      background: var(--card, #101826);
      border-radius: var(--radius, 16px);
      padding: 32px;
      box-shadow: var(--shadow, 0 6px 24px rgba(0,0,0,.25));
    }

    .section-title {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--acc, #3AA6FF);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .section-description {
      color: var(--muted, #A8B3CF);
      margin-bottom: 24px;
      font-size: 1.1rem;
    }

      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 24px;
      margin-top: 24px;
    }

      text-align: center;
      padding: 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    /* Icons Showcase */
    .icons-showcase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .icon-showcase-item {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .icon-showcase-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px rgba(58,166,255,0.15);
      border-color: var(--acc, #3AA6FF);
    }

      margin-bottom: 20px;
    }

    .icon-info {
      margin-bottom: 20px;
    }

    .icon-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--ink, #E6ECFF);
      margin-bottom: 8px;
    }

    .icon-description {
      color: var(--muted, #A8B3CF);
      font-size: 0.9rem;
      margin-bottom: 8px;
    }

    .icon-concept {
      font-size: 0.85rem;
      color: var(--acc, #3AA6FF);
      font-style: italic;
    }

    .trigger-btn {
      background: linear-gradient(135deg, var(--acc, #3AA6FF), var(--primary-cyan-600, #0891b2));
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .trigger-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(58,166,255,0.3);
    }

      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

      text-align: center;
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
    }

    .state-title {
      font-size: 1.1rem;
      color: var(--ink, #E6ECFF);
      margin-bottom: 16px;
    }

    .state-icons {
      margin-bottom: 16px;
    }

    .state-description {
      font-size: 0.85rem;
      color: var(--muted, #A8B3CF);
    }

    /* Usage Examples */
    .usage-examples {
      display: grid;
      gap: 32px;
    }

    .usage-example {
      background: rgba(255,255,255,0.03);
      border-radius: 16px;
      padding: 24px;
    }

    .example-title {
      font-size: 1.3rem;
      color: var(--ink, #E6ECFF);
      margin-bottom: 20px;
    }

    .nav-example {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .nav-item {
      padding: 12px 16px;
      background: rgba(255,255,255,0.08);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .nav-item:hover {
      background: rgba(58,166,255,0.1);
    }

    .cards-example {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .status-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .card-content h4 {
      color: var(--ink, #E6ECFF);
      margin-bottom: 4px;
    }

    .card-content p {
      color: var(--muted, #A8B3CF);
      font-size: 0.85rem;
    }

    /* Technical Specs */
    .tech-specs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .spec-item {
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      padding: 20px;
    }

    .spec-item h4 {
      color: var(--ok, #22C55E);
      margin-bottom: 12px;
    }

    .spec-item ul {
      list-style: none;
      padding: 0;
    }

    .spec-item li {
      color: var(--muted, #A8B3CF);
      margin-bottom: 8px;
      padding-left: 16px;
      position: relative;
    }

    .spec-item li::before {
      content: '•';
      color: var(--acc, #3AA6FF);
      position: absolute;
      left: 0;
    }

    .spec-item code {
      background: rgba(58,166,255,0.1);
      color: var(--acc, #3AA6FF);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.85em;
    }

    /* Responsive */
    @media (max-width: 768px) {
        padding: 16px;
      }

        font-size: 2rem;
        flex-direction: column;
        gap: 12px;
      }

      .icons-showcase-grid {
        grid-template-columns: 1fr;
      }

        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .icon-showcase-item:hover,
      .trigger-btn:hover,
      .nav-item:hover {
        transform: none;
      }

      .trigger-btn:hover {
        box-shadow: none;
      }
    }
  `]
})
export class PremiumIconsDemoComponent {
  sizes: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

  demoSections: DemoSection[] = [
    {
      title: 'Iconos Principales - Conductores',
      description: 'Sistema premium de iconografía con microinteracciones quirúrgicas',
      icons: [
        {
          name: 'cotizador',
          title: 'Cotizador',
          description: 'Calculadora inteligente con engrane dinámico',
          concept: PREMIUM_ICONS_SYSTEM.find(i => i.name === 'cotizador')?.concept || 'calculadora con engrane'
        },
        {
          name: 'simulador',
          title: 'Simulador',
          description: 'Reloj con gráfico de progreso radial',
          concept: PREMIUM_ICONS_SYSTEM.find(i => i.name === 'simulador')?.concept || 'reloj + gráfico de progreso'
        },
        {
          name: 'tanda',
          title: 'Tanda',
          description: 'Círculo de manos que se iluminan secuencialmente',
          concept: PREMIUM_ICONS_SYSTEM.find(i => i.name === 'tanda')?.concept || 'círculo de manos unidas'
        },
        {
          name: 'proteccion',
          title: 'Protección',
          description: 'Escudo con anillo que se llena dinámicamente',
          concept: PREMIUM_ICONS_SYSTEM.find(i => i.name === 'proteccion')?.concept || 'escudo con check dinámico',
          showStatus: true,
          status: 'ok'
        }
      ]
    },
    {
      title: 'Servicios Operacionales',
      description: 'Iconografía para servicios y operaciones del negocio',
      icons: [
        {
          name: 'postventa',
          title: 'Postventa',
          description: 'Caja de herramientas que se abre mostrando refacciones',
          concept: PREMIUM_ICONS_SYSTEM.find(i => i.name === 'postventa')?.concept || 'caja de herramientas + chat bubble'
        },
        {
          name: 'entregas',
          title: 'Entregas',
          description: 'Camión en movimiento con timeline dinámico',
          concept: PREMIUM_ICONS_SYSTEM.find(i => i.name === 'entregas')?.concept || 'camión en movimiento + timeline',
          showBadge: true,
          badgeCount: 3
        },
        {
          name: 'gnv',
          title: 'GNV',
          description: 'Bomba de gas con hoja que se ilumina (eco-friendly)',
          concept: PREMIUM_ICONS_SYSTEM.find(i => i.name === 'gnv')?.concept || 'bomba de gas con símbolo de hoja'
        },
        {
          name: 'avi',
          title: 'AVI Voice',
          description: 'Micrófono con ondas de pulso infinito',
          concept: PREMIUM_ICONS_SYSTEM.find(i => i.name === 'avi')?.concept || 'micrófono con ondas',
          variant: 'active'
        }
      ]
    }
  ];

  interactiveStates = [
    {
      title: 'Estado Normal',
      variant: 'default' as IconVariant,
      label: 'Default',
      description: 'Estado base del icono',
      showStatus: false
    },
    {
      title: 'Estado Activo',
      variant: 'active' as IconVariant,
      label: 'Active',
      description: 'Icono en estado activo',
      showStatus: true,
      status: 'ok' as const
    },
    {
      title: 'Estado Error',
      variant: 'error' as IconVariant,
      label: 'Error',
      description: 'Icono en estado de error',
      showStatus: true,
      status: 'error' as const
    }
  ];

  navigationItems = [
    { icon: 'cotizador' as IconName, label: 'Cotizador', showBadge: false, badgeCount: 0 },
    { icon: 'simulador' as IconName, label: 'Simulador', showBadge: false, badgeCount: 0 },
    { icon: 'entregas' as IconName, label: 'Entregas', showBadge: true, badgeCount: 2 },
    { icon: 'postventa' as IconName, label: 'Postventa', showBadge: true, badgeCount: 7 },
    { icon: 'avi' as IconName, label: 'AVI Voice', showBadge: false, badgeCount: 0 }
  ];

  statusCards = [
    {
      icon: 'proteccion' as IconName,
      title: 'Protección Activa',
      description: 'Todos los sistemas funcionando correctamente',
      variant: 'active' as IconVariant,
      status: 'ok' as const
    },
    {
      icon: 'entregas' as IconName,
      title: 'Entregas Demoradas',
      description: 'Algunas entregas requieren atención',
      variant: 'error' as IconVariant,
      status: 'warning' as const
    },
    {
      icon: 'gnv' as IconName,
      title: 'GNV Saludable',
      description: 'Estaciones funcionando óptimamente',
      variant: 'active' as IconVariant,
      status: 'ok' as const
    }
  ];

  onIconClick(icon: any): void {
  }

  triggerAnimation(event: Event, iconName: IconName): void {
    event.stopPropagation();

    // Find the icon component and trigger its animation
    const iconElement = (event.target as HTMLElement).closest('.icon-showcase-item')?.querySelector('app-premium-icon');
    if (iconElement) {
      // Trigger the animation by dispatching a custom event
      iconElement.dispatchEvent(new CustomEvent('triggerAnimation'));
    }
  }
}
