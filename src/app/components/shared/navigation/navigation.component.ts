import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { PushNotificationService } from '../../../services/push-notification.service';
import { UserPreferencesService } from '../../../services/user-preferences.service';
import { NotificationCenterComponent } from '../notification-center/notification-center.component';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationCenterComponent],
  template: `
    <nav class="navigation" [class.collapsed]="isCollapsed">
      <!-- Header -->
      <div class="nav-header">
        <div class="logo" [class.collapsed]="isCollapsed">
          <span class="logo-icon">🚐</span>
          <span class="logo-text" *ngIf="!isCollapsed">Conductores PWA</span>
        </div>
        <div class="header-actions">
          <button 
            class="notification-btn" 
            (click)="toggleNotifications()"
            [class.has-notifications]="(unreadCount$ | async)! > 0"
            aria-label="Abrir notificaciones"
            title="Notificaciones"
          >
            🔔
            <span class="notification-badge" *ngIf="(unreadCount$ | async) as count">
              {{ count > 99 ? '99+' : count }}
            </span>
          </button>
          
          <!-- Accessibility Controls: Font scale A A A & High Contrast -->
          <div class="a11y-controls">
            <button class="a11y-btn" [class.active]="fontScale==='base'" (click)="setFontScale('base')">A</button>
            <button class="a11y-btn" [class.active]="fontScale==='sm'" (click)="setFontScale('sm')">A</button>
            <button class="a11y-btn" [class.active]="fontScale==='lg'" (click)="setFontScale('lg')">A</button>
            <button class="hc-toggle" [class.active]="highContrast" (click)="toggleHighContrast()" title="Alto contraste">⬛⬜</button>
          </div>
          
          <button 
            class="toggle-btn" 
            (click)="toggleCollapse()"
            aria-label="Alternar navegación"
            title="Alternar navegación"
          >
            {{ isCollapsed ? '➡️' : '⬅️' }}
          </button>
        </div>
      </div>

      <!-- User Info -->
      <div class="user-section" *ngIf="!isCollapsed">
        <div class="user-avatar">
          <span>{{ userInitials }}</span>
        </div>
        <div class="user-info">
          <div class="user-name">{{ userName }}</div>
          <div class="user-role">{{ userRole }}</div>
        </div>
      </div>

      <!-- Nueva Oportunidad Button -->
      <div class="cta-section">
        <button 
          class="btn-nueva-oportunidad"
          [class.collapsed]="isCollapsed" 
          (click)="createNewOpportunity()"
        >
          <span class="btn-icon">➕</span>
          <span class="btn-text" *ngIf="!isCollapsed">Nueva Oportunidad</span>
        </button>
      </div>

      <!-- Navigation Menu -->
      <div class="nav-menu">
        <div 
          *ngFor="let item of navigationItems" 
          class="nav-item"
          [class.active]="isActive(item.route)"
          (click)="navigate(item)"
        >
          <div class="nav-link">
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label" *ngIf="!isCollapsed">{{ item.label }}</span>
            <span class="nav-badge" *ngIf="item.badge && !isCollapsed">{{ item.badge }}</span>
          </div>
          
          <!-- Submenu -->
          <div 
            class="nav-submenu" 
            *ngIf="item.children && !isCollapsed && isActive(item.route)"
          >
            <div 
              *ngFor="let child of item.children"
              class="nav-subitem"
              [class.active]="isActive(child.route)"
              (click)="navigate(child); $event.stopPropagation()"
            >
              <span class="nav-subicon">{{ child.icon }}</span>
              <span class="nav-sublabel">{{ child.label }}</span>
              <span class="nav-badge" *ngIf="child.badge">{{ child.badge }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Actions -->
      <div class="nav-bottom">
        <div class="nav-item" (click)="showHelp()">
          <div class="nav-link">
            <span class="nav-icon">❓</span>
            <span class="nav-label" *ngIf="!isCollapsed">Ayuda</span>
          </div>
        </div>
        
        <div class="nav-item" (click)="showSettings()">
          <div class="nav-link">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label" *ngIf="!isCollapsed">Configuración</span>
          </div>
        </div>
        
        <div class="nav-item logout" (click)="logout()">
          <div class="nav-link">
            <span class="nav-icon">🚪</span>
            <span class="nav-label" *ngIf="!isCollapsed">Salir</span>
          </div>
        </div>
      </div>

      <!-- Mobile Overlay -->
      <div 
        class="mobile-overlay" 
        *ngIf="showMobileMenu"
        (click)="closeMobileMenu()"
      ></div>
    </nav>

    <!-- Mobile Menu Button -->
    <button 
      class="mobile-menu-btn" 
      (click)="toggleMobileMenu()"
      *ngIf="isMobileView"
      aria-label="Abrir menú"
      title="Menú"
    >
      ☰
    </button>

    <!-- Notification Center -->
    <app-notification-center #notificationCenter></app-notification-center>
  `,
  styles: [`
    .navigation {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: 280px;
      background: linear-gradient(180deg, #2d3748 0%, #1a202c 100%);
      color: white;
      transition: width 0.3s ease;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      box-shadow: 4px 0 12px rgba(0, 0, 0, 0.15);
    }

    .navigation.collapsed {
      width: 70px;
    }

    .nav-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .a11y-controls {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 0 8px;
      background: rgba(255,255,255,0.08);
      padding: 4px;
      border-radius: 8px;
    }
    .a11y-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.25);
      color: #e2e8f0;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      line-height: 1;
      font-weight: 700;
      font-size: 12px;
    }
    .a11y-btn:nth-child(1) { font-size: 12px; }
    .a11y-btn:nth-child(2) { font-size: 14px; }
    .a11y-btn:nth-child(3) { font-size: 16px; }
    .a11y-btn.active { background: rgba(34, 211, 238, 0.2); border-color: rgba(34, 211, 238, 0.6); }
    .hc-toggle {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.25);
      color: #e2e8f0;
      width: 36px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .hc-toggle.active { background: rgba(255,255,255,0.15); border-color: #fff; }

    .notification-btn {
      position: relative;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      width: 36px;
      height: 36px;
    }

    .notification-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }

    .notification-btn.has-notifications {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    .notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 0.7rem;
      padding: 2px 5px;
      border-radius: 10px;
      font-weight: 600;
      min-width: 16px;
      text-align: center;
      line-height: 1;
      border: 2px solid #2d3748;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.3s ease;
    }

    .logo.collapsed {
      justify-content: center;
    }

    .logo-icon {
      font-size: 1.8rem;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 1.2rem;
      font-weight: 700;
      color: #e2e8f0;
    }

    .toggle-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: background-color 0.2s;
    }

    .toggle-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .user-section {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #4299e1, #3182ce);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.95rem;
      color: #e2e8f0;
    }

    .user-role {
      font-size: 0.8rem;
      color: #a0aec0;
      margin-top: 2px;
    }

    .cta-section {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-nueva-oportunidad {
      width: 100%;
      background: linear-gradient(135deg, #06d6a0, #059669);
      border: none;
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(6, 214, 160, 0.3);
    }

    .btn-nueva-oportunidad:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(6, 214, 160, 0.4);
      background: linear-gradient(135deg, #059669, #047857);
    }

    .btn-nueva-oportunidad.collapsed {
      width: 48px;
      height: 48px;
      padding: 0;
      border-radius: 50%;
    }

    .btn-icon {
      font-size: 1.2rem;
      font-weight: 900;
    }

    .btn-text {
      white-space: nowrap;
    }

    .nav-menu {
      flex: 1;
      padding: 16px 0;
      overflow-y: auto;
    }

    .nav-item {
      margin-bottom: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-item.active {
      background: rgba(66, 153, 225, 0.2);
      border-right: 3px solid #4299e1;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      text-decoration: none;
      color: inherit;
    }

    .nav-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
    }

    .nav-label {
      flex: 1;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .nav-badge {
      background: #e53e3e;
      color: white;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }

    .nav-submenu {
      background: rgba(0, 0, 0, 0.2);
      margin-top: 4px;
      border-radius: 0 0 8px 8px;
    }

    .nav-subitem {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px 8px 52px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .nav-subitem:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-subitem.active {
      background: rgba(66, 153, 225, 0.3);
    }

    .nav-subicon {
      font-size: 1rem;
      width: 16px;
      text-align: center;
    }

    .nav-sublabel {
      flex: 1;
    }

    .nav-bottom {
      padding: 16px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .nav-item.logout:hover {
      background: rgba(229, 62, 62, 0.2);
    }

    .mobile-menu-btn {
      display: none;
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1001;
      background: #2d3748;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-size: 1.2rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
      display: none;
    }

    @media (max-width: 768px) {
      .navigation {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      .navigation.mobile-open {
        transform: translateX(0);
      }

      .mobile-menu-btn {
        display: block;
      }

      .mobile-overlay {
        display: block;
      }
    }
  `]
})
export class NavigationComponent implements OnInit {
  @ViewChild('notificationCenter') notificationCenter!: NotificationCenterComponent;
  
  isCollapsed = false;
  showMobileMenu = false;
  isMobileView = false;
  
  userName = 'Asesor Demo';
  userRole = 'Asesor Financiero';
  userInitials = 'AD';

  unreadCount$: Observable<number>;

  navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: '🏠'
    },
    {
      label: 'Nueva Oportunidad',
      route: '/nueva-oportunidad',
      icon: '➕',
      badge: 2
    },
    {
      label: 'Cotizador',
      route: '/cotizador',
      icon: '💰',
      children: [
        { label: 'AGS Individual', route: '/cotizador/ags-individual', icon: '🚐' },
        { label: 'EdoMex Colectivo', route: '/cotizador/edomex-colectivo', icon: '🤝' }
      ]
    },
    {
      label: 'Simulador',
      route: '/simulador',
      icon: '🎯',
      children: [
        { label: 'Ahorro AGS', route: '/simulador/ags-ahorro', icon: '💡' },
        { label: 'Enganche EdoMex', route: '/simulador/edomex-individual', icon: '🏦' },
        { label: 'Tanda Colectiva', route: '/simulador/tanda-colectiva', icon: '🌨️' }
      ]
    },
    {
      label: 'Clientes',
      route: '/clientes',
      icon: '👥',
      badge: 12
    },
    {
      label: 'Expedientes',
      route: '/expedientes',
      icon: '📋'
    },
    {
      label: 'Protección',
      route: '/proteccion',
      icon: '🛡️',
      badge: 3
    },
    {
      label: 'Reportes',
      route: '/reportes',
      icon: '📊'
    }
  ];

  constructor(
    private router: Router,
    private notificationService: PushNotificationService,
    private userPrefs: UserPreferencesService
  ) {
    this.unreadCount$ = this.notificationService.getUnreadCount();
  }

  ngOnInit() {
    this.checkMobileView();
    window.addEventListener('resize', () => this.checkMobileView());
    
    // Initialize notifications
    this.initializeNotifications();

    // Load user prefs
    this.fontScale = this.userPrefs.getFontScale();
    this.highContrast = this.userPrefs.getHighContrast();
  }

  async initializeNotifications() {
    try {
      await this.notificationService.initializeNotifications();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
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
    console.log('Show help...');
    // Implement help functionality
  }

  showSettings() {
    console.log('Show settings...');
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