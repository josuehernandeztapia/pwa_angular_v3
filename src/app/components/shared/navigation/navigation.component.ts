import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subject, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PushNotificationService } from '../../../services/push-notification.service';
import { UserPreferencesService } from '../../../services/user-preferences.service';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icon-definitions';

interface NavigationItem {
  label: string;
  route: string;
  iconType: IconName;
  badge?: number;
  dataCy?: string;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationCenterComponent, IconComponent],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  @ViewChild('notificationCenter') notificationCenter!: NotificationCenterComponent;
  
  isCollapsed = false;
  showMobileMenu = false;
  isMobileView = false;
  showUserProfileDropdown = false;

  userName = 'Ana Domínguez';
  userRole = 'Asesor Financiero';
  userInitials = 'AD';

  unreadCount$: Observable<number>;
  private destroy$ = new Subject<void>();

  navigationItems: NavigationItem[] = [
    { label: 'Dashboard', route: '/dashboard', iconType: 'home', dataCy: 'nav-dashboard' },
    { label: 'Onboarding', route: '/onboarding', iconType: 'user-plus', dataCy: 'nav-onboarding' },
    {
      label: 'Cotizador',
      route: '/cotizador',
      iconType: 'calculator',
      dataCy: 'nav-cotizador',
      children: [
        { label: 'AGS Individual', route: '/cotizador/ags-individual', iconType: 'user', dataCy: 'nav-cotizador-ags' },
        { label: 'EdoMex Colectivo', route: '/cotizador/edomex-colectivo', iconType: 'users', dataCy: 'nav-cotizador-edomex' }
      ]
    },
    {
      label: 'Simulador',
      route: '/simulador',
      iconType: 'target',
      dataCy: 'nav-simulador',
      children: [
        { label: 'Plan de Ahorro', route: '/simulador/ags-ahorro', iconType: 'piggy-bank', dataCy: 'nav-simulador-ahorro' },
        { label: 'Venta a Plazo', route: '/simulador/edomex-individual', iconType: 'credit-card', dataCy: 'nav-simulador-plazo' },
        { label: 'Tanda Colectiva', route: '/simulador/tanda-colectiva', iconType: 'users', dataCy: 'nav-simulador-tanda' }
      ]
    },
    { label: 'Clientes', route: '/clientes', iconType: 'users', dataCy: 'nav-clientes' },
    { label: 'Productos', route: '/productos', iconType: 'cube', dataCy: 'nav-productos' },
    { label: 'Expedientes', route: '/expedientes', iconType: 'folder-open', dataCy: 'nav-expedientes' },
    { label: 'Documentos', route: '/documentos', iconType: 'document', dataCy: 'nav-documentos' },
    {
      label: 'Análisis',
      route: '/reportes',
      iconType: 'chart-bar',
      dataCy: 'nav-analytics',
      children: [
        { label: 'Reportes', route: '/reportes', iconType: 'document-text', dataCy: 'nav-reportes' },
        { label: 'Pipeline', route: '/oportunidades', iconType: 'funnel', dataCy: 'nav-pipeline' },
        { label: 'Uso del Sistema', route: '/usage', iconType: 'cpu-chip', dataCy: 'nav-usage' }
      ]
    },
    {
      label: 'Operaciones',
      route: '/ops',
      iconType: 'truck',
      dataCy: 'nav-ops',
      children: [
        { label: 'Entregas', route: '/ops/deliveries', iconType: 'truck', dataCy: 'nav-ops-entregas' },
        { label: 'Import Tracker', route: '/ops/import-tracker', iconType: 'package', dataCy: 'nav-ops-tracker' },
        { label: 'Monitor GNV', route: '/ops/gnv-health', iconType: 'fuel', dataCy: 'nav-ops-gnv' },
        { label: 'Triggers', route: '/ops/triggers', iconType: 'zap', dataCy: 'nav-ops-triggers' }
      ]
    },
    { label: 'GNV', route: '/gnv', iconType: 'fuel', dataCy: 'nav-gnv' },
    { label: 'Protección', route: '/proteccion', iconType: 'shield', dataCy: 'nav-proteccion' },
    {
      label: 'Configuración',
      route: '/configuracion',
      iconType: 'settings',
      dataCy: 'nav-configuracion',
      children: [
        { label: 'General', route: '/configuracion', iconType: 'cog', dataCy: 'nav-config-general' },
        { label: 'Políticas', route: '/configuracion/politicas', iconType: 'document-text', dataCy: 'nav-config-politicas' },
        { label: 'Flow Builder', route: '/configuracion/flow-builder', iconType: 'git-branch', dataCy: 'nav-config-flow' },
        { label: 'Integraciones', route: '/integraciones', iconType: 'puzzle-piece', dataCy: 'nav-integraciones' }
      ]
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
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkMobileView());
    
    // Initialize notifications
    this.initializeNotifications();

    // Load user prefs
    this.fontScale = this.userPrefs.getFontScale();
    this.highContrast = this.userPrefs.getHighContrast();

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  getNavTestId(route: string): string {
    if (!route) {
      return 'nav-item-root';
    }
    const trimmed = route.startsWith('/') ? route.slice(1) : route;
    const normalized = trimmed.split('/').filter(Boolean).join('-') || 'root';
    return `nav-item-${normalized}`;
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  showHelp() {
    // Implement help functionality
    this.showUserProfileDropdown = false;
  }

  navigateToProfile() {
    this.router.navigate(['/perfil']);
    this.showUserProfileDropdown = false;
  }

  navigateToSettings() {
    this.router.navigate(['/configuracion']);
    this.showUserProfileDropdown = false;
  }

  showSettings() {
    // Navigate to settings or show modal
  }

  logout() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('rememberMe');
    this.showUserProfileDropdown = false;
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
