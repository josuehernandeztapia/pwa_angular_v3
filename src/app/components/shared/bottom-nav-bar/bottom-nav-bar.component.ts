import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject, fromEvent } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';

interface BottomNavItem {
  label: string;
  route: string;
  iconType: IconName;
  badge?: number;
  isActive?: boolean;
}

@Component({
  selector: 'app-bottom-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './bottom-nav-bar.component.html',
  styleUrls: ['./bottom-nav-bar.component.scss'],
})
export class BottomNavBarComponent implements OnInit, OnDestroy {
  showBottomNav = false;

  navItems: BottomNavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      iconType: 'home'
    },
    {
      label: 'Oportunidades',
      route: '/oportunidades',
      iconType: 'target',
      badge: 5
    },
    {
      label: 'Cotizar',
      route: '/cotizador',
      iconType: 'calculator'
    },
    {
      label: 'Clientes',
      route: '/clientes',
      iconType: 'users',
      badge: 12
    },
    {
      label: 'Más',
      route: '/configuracion',
      iconType: 'more',
      badge: 2
    }
  ];

  getItemClasses(item: BottomNavItem): Record<string, boolean> {
    return {
      'bottom-nav__item--active': !!item.isActive,
      'bottom-nav__item--with-badge': !!item.badge,
    };
  }

  constructor(private router: Router) {}

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.checkMobileView();
    this.updateActiveStates();
    
    // Listen to route changes
    this.router.events.pipe(
      filter((event: any) => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateActiveStates();
    });

    // Listen to window resize
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkMobileView());

    // Conditionally add Postventa Wizard to bottom nav (before "Más")
    if (environment.features?.enablePostSalesWizard) {
      const idxMore = this.navItems.findIndex(i => i.route === '/configuracion');
      const exists = this.navItems.some(i => i.route === '/postventa/wizard');
      if (!exists) {
        const item = {
          label: 'Postventa',
          route: '/postventa/wizard',
          iconType: 'camera'
        } as BottomNavItem;
        if (idxMore > 0) {
          this.navItems.splice(idxMore, 0, item);
        } else {
          this.navItems.push(item);
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
