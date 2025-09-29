import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { PushNotificationService } from '../../../services/push-notification.service';
import { UserPreferencesService } from '../../../services/user-preferences.service';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';
import { environment } from '../../../../environments/environment';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';

interface NavigationItem {
  label: string;
  route: string;
  iconType: IconName;
  badge?: number;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationCenterComponent, IconComponent],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  @ViewChild('notificationCenter') notificationCenter!: NotificationCenterComponent;
  
  isCollapsed = false;
  showMobileMenu = false;
  isMobileView = false;

  userName = 'Ana Domínguez';
  userRole = 'Asesor Financiero';
  userInitials = 'AD';

  unreadCount$: Observable<number>;

  navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      iconType: 'home'
    },
    {
      label: 'Nueva Oportunidad',
      route: '/nueva-oportunidad',
      iconType: 'plus',
      badge: 2
    },
    {
      label: 'Cotizador',
      route: '/cotizador',
      iconType: 'calculator',
      children: [
        { label: 'AGS Individual', route: '/cotizador/ags-individual', iconType: 'truck' },
        { label: 'EdoMex Colectivo', route: '/cotizador/edomex-colectivo', iconType: 'handshake' }
      ]
    },
    {
      label: 'Simulador',
      route: '/simulador',
      iconType: 'target',
      children: [
        { label: 'Ahorro AGS', route: '/simulador/ags-ahorro', iconType: 'lightbulb' },
        { label: 'Enganche EdoMex', route: '/simulador/edomex-individual', iconType: 'bank' },
        { label: 'Tanda Colectiva', route: '/simulador/tanda-colectiva', iconType: 'snow' }
      ]
    },
    {
      label: 'Clientes',
      route: '/clientes',
      iconType: 'users',
      badge: 12
    },
    {
      label: 'Expedientes',
      route: '/expedientes',
      iconType: 'clipboard'
    },
    {
      label: 'Protección',
      route: '/proteccion',
      iconType: 'shield',
      badge: 3
    },
    {
      label: 'Reportes',
      route: '/reportes',
      iconType: 'chart'
    }
  ];

  constructor(
    private router: Router,
    private notificationService: PushNotificationService,
    private userPrefs: UserPreferencesService
  ) {
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  getNavStateClasses(): Record<string, boolean> {
    return {
      'app-nav--collapsed': this.isCollapsed,
      'app-nav--mobile-open': this.showMobileMenu,
    };
  }

  getNavItemClasses(item: NavigationItem): Record<string, boolean> {
    return {
      'is-active': this.isActive(item.route),
      'app-nav__item--has-children': !!item.children?.length,
    };
  }

  ngOnInit() {
    this.checkMobileView();
    window.addEventListener('resize', () => this.checkMobileView());
    
    // Initialize notifications
    this.initializeNotifications();

    // Load user prefs
    this.fontScale = this.userPrefs.getFontScale();
    this.highContrast = this.userPrefs.getHighContrast();

    // Conditionally add Postventa Wizard entry
    if (environment.features?.enablePostSalesWizard) {
      const exists = this.navigationItems.some(i => i.route === '/postventa/wizard');
      if (!exists) {
        this.navigationItems.splice(3, 0, {
          label: 'Postventa',
          route: '/postventa/wizard',
          iconType: 'settings'
        });
      }
    }

    // Conditionally add Integraciones Externas entry
    if (environment.features?.enableIntegrationsConfig) {
      const exists = this.navigationItems.some(i => i.route === '/integraciones');
      if (!exists) {
        this.navigationItems.push({
          label: 'Integraciones',
          route: '/integraciones',
          iconType: 'link'
        });
      }
    }

    // Conditionally add Administración/Usuarios entry
    if (environment.features?.enableAdminConfig) {
      const exists = this.navigationItems.some(i => i.route === '/administracion');
      if (!exists) {
        this.navigationItems.push({
          label: 'Administración',
          route: '/administracion',
          iconType: 'user'
        });
      }
    }
  }

  async initializeNotifications() {
    try {
      await this.notificationService.initializeNotifications();
    } catch (error) {
    }
  }

  checkMobileView() {
    this.isMobileView = window.innerWidth <= 768;
    if (!this.isMobileView) {
      this.showMobileMenu = false;
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
  }

  toggleNotifications() {
    this.notificationCenter.toggle();
  }

  createNewOpportunity() {
    this.router.navigate(['/nueva-oportunidad']);
    if (this.isMobileView) {
      this.closeMobileMenu();
    }
  }

  navigate(item: NavigationItem) {
    if (item.children) {
      // Navigate to parent route to activate and reveal submenu
      this.router.navigate([item.route]);
      return;
    }
    
    this.router.navigate([item.route]);
    
    if (this.isMobileView) {
      this.closeMobileMenu();
    }
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  showHelp() {
    // Implement help functionality
  }

  showSettings() {
    // Navigate to settings or show modal
  }

  logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('rememberMe');
    this.router.navigate(['/login']);
  }

  // Accessibility state & handlers
  fontScale: 'base' | 'sm' | 'lg' = 'base';
  highContrast = false;

  setFontScale(scale: 'base' | 'sm' | 'lg') {
    this.fontScale = scale;
    this.userPrefs.setFontScale(scale);
  }

  toggleHighContrast() {
    this.highContrast = !this.highContrast;
    this.userPrefs.setHighContrast(this.highContrast);
  }
}
