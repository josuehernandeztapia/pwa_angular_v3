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

  userName = 'Ana Domínguez';
  userRole = 'Asesor Financiero';
  userInitials = 'AD';

  unreadCount$: Observable<number>;
  private destroy$ = new Subject<void>();

  navigationItems: NavigationItem[] = [
    { label: 'Dashboard', route: '/dashboard', iconType: 'home', dataCy: 'nav-dashboard' },
    { label: 'Clientes', route: '/clientes', iconType: 'users', dataCy: 'nav-clientes' },
    { label: 'Cotizador', route: '/cotizador', iconType: 'calculator', dataCy: 'nav-cotizador' },
    { label: 'Simulador', route: '/simulador', iconType: 'target', dataCy: 'nav-simulador' },
    { label: 'Documentos', route: '/documentos', iconType: 'document', dataCy: 'nav-documentos' },
    { label: 'Entregas', route: '/entregas', iconType: 'truck', dataCy: 'nav-entregas' },
    { label: 'GNV', route: '/gnv', iconType: 'fuel', dataCy: 'nav-gnv' },
    { label: 'Protección', route: '/proteccion', iconType: 'shield', dataCy: 'nav-proteccion' },
    { label: 'Configuración', route: '/configuracion', iconType: 'settings', dataCy: 'nav-configuracion' }
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
