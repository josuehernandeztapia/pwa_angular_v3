import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

interface BottomNavItem {
  label: string;
  route: string;
  icon: string;
  activeIcon?: string;
  badge?: number;
  isActive?: boolean;
}

@Component({
  selector: 'app-bottom-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="bottom-nav-bar" *ngIf="showBottomNav">
      <div 
        *ngFor="let item of navItems; trackBy: trackByRoute" 
        class="nav-item"
        [class.active]="item.isActive"
        (click)="navigateTo(item.route)"
      >
        <div class="nav-icon-container">
          <span class="nav-icon">{{ item.isActive ? (item.activeIcon || item.icon) : item.icon }}</span>
          <span class="nav-badge" *ngIf="item.badge && item.badge > 0">{{ item.badge > 99 ? '99+' : item.badge }}</span>
        </div>
        <span class="nav-label">{{ item.label }}</span>
        <div class="active-indicator" *ngIf="item.isActive"></div>
      </div>
    </nav>
  `,
  styles: [`
    .bottom-nav-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      display: flex;
      background: rgba(45, 55, 72, 0.95);
      backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    }

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      min-height: 60px;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .nav-item:active {
      transform: scale(0.95);
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }

    .nav-icon-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin-bottom: 4px;
      transition: transform 0.2s ease;
    }

    .nav-item.active .nav-icon-container {
      transform: translateY(-2px);
    }

    .nav-icon {
      font-size: 20px;
      line-height: 1;
      color: #a0aec0;
      transition: all 0.3s ease;
    }

    .nav-item.active .nav-icon {
      color: #06d6a0;
      filter: drop-shadow(0 0 8px rgba(6, 214, 160, 0.4));
      transform: scale(1.1);
    }

    .nav-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 16px;
      height: 16px;
      background: linear-gradient(135deg, #e53e3e, #c53030);
      color: white;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 2px 4px rgba(229, 62, 62, 0.3);
      animation: pulse-badge 2s infinite;
    }

    @keyframes pulse-badge {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .nav-label {
      font-size: 11px;
      font-weight: 500;
      color: #6b7280;
      text-align: center;
      line-height: 1.2;
      transition: all 0.3s ease;
      max-width: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-item.active .nav-label {
      color: #06d6a0;
      font-weight: 600;
    }

    .active-indicator {
      position: absolute;
      top: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 3px;
      background: linear-gradient(90deg, #06d6a0, #04d9ff);
      border-radius: 0 0 2px 2px;
      animation: slide-in 0.3s ease;
    }

    @keyframes slide-in {
      from {
        width: 0;
        opacity: 0;
      }
      to {
        width: 20px;
        opacity: 1;
      }
    }

    /* Hide on desktop */
    @media (min-width: 769px) {
      .bottom-nav-bar {
        display: none;
      }
    }

    /* Adjust main content when bottom nav is visible */
    @media (max-width: 768px) {
      :host {
        --bottom-nav-height: 76px;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .bottom-nav-bar {
        background: rgba(17, 24, 39, 0.95);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
    }

    /* Accessibility improvements */
    .nav-item:focus {
      outline: 2px solid #06d6a0;
      outline-offset: 2px;
      border-radius: 8px;
    }

    .nav-item:focus-visible {
      background: rgba(6, 214, 160, 0.1);
    }

    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
      .nav-item,
      .nav-icon,
      .nav-label,
      .nav-icon-container,
      .active-indicator {
        transition: none;
      }
      
      .nav-badge {
        animation: none;
      }
    }
  `]
})
export class BottomNavBarComponent implements OnInit {
  showBottomNav = false;

  navItems: BottomNavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: '🏠',
      activeIcon: '🏠'
    },
    {
      label: 'Oportunidades',
      route: '/oportunidades',
      icon: '🎯',
      activeIcon: '🎯',
      badge: 5
    },
    {
      label: 'Cotizar',
      route: '/cotizador',
      icon: '💰',
      activeIcon: '💰'
    },
    {
      label: 'Clientes',
      route: '/clientes',
      icon: '👥',
      activeIcon: '👥',
      badge: 12
    },
    {
      label: 'Más',
      route: '/configuracion',
      icon: '⚡',
      activeIcon: '⚡',
      badge: 2
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkMobileView();
    this.updateActiveStates();
    
    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveStates();
    });

    // Listen to window resize
    window.addEventListener('resize', () => this.checkMobileView());

    // Conditionally add Postventa Wizard to bottom nav (before "Más")
    if (environment.features?.enablePostSalesWizard) {
      const idxMore = this.navItems.findIndex(i => i.route === '/configuracion');
      const exists = this.navItems.some(i => i.route === '/postventa/wizard');
      if (!exists) {
        const item = {
          label: 'Postventa',
          route: '/postventa/wizard',
          icon: '📷',
          activeIcon: '📷'
        } as BottomNavItem;
        if (idxMore > 0) {
          this.navItems.splice(idxMore, 0, item);
        } else {
          this.navItems.push(item);
        }
      }
    }
  }

  private checkMobileView(): void {
    this.showBottomNav = window.innerWidth <= 768;
  }

  private updateActiveStates(): void {
    const currentUrl = this.router.url;
    
    this.navItems.forEach(item => {
      item.isActive = currentUrl === item.route || currentUrl.startsWith(item.route + '/');
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    
    // Haptic feedback on mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  private showMoreMenu(): void {}

  trackByRoute(index: number, item: BottomNavItem): string {
    return item.route;
  }
}
