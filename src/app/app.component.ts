import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject, OnDestroy, OnInit, ViewChild, Optional } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BottomNavBarComponent } from './components/shared/bottom-nav-bar/bottom-nav-bar.component';
import { UpdateBannerComponent } from './components/shared/update-banner/update-banner.component';
import { OfflineIndicatorComponent } from './components/shared/offline-indicator/offline-indicator.component';
import { PwaInstallPromptComponent } from './components/shared/pwa-install-prompt/pwa-install-prompt.component';
import { MediaPermissionsService } from './services/media-permissions.service';
import { SwUpdateService } from './services/sw-update.service';
import { theme } from './styles/design-tokens';
import { IconComponent } from './components/shared/icon/icon.component';
import { GlobalSearchComponent } from './components/shared/global-search/global-search.component';
import { FlowContextService } from './services/flow-context.service';
import { KeyboardShortcutsModalComponent } from './components/shared/keyboard-shortcuts-modal/keyboard-shortcuts-modal.component';
import { KeyboardShortcutsService } from './services/keyboard-shortcuts.service';
import { Observable } from 'rxjs';
import { OfflineService } from './services/offline.service';
import { environment } from '../environments/environment';
import { NavigationService, QuickAction } from './services/navigation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, BottomNavBarComponent, UpdateBannerComponent, OfflineIndicatorComponent, PwaInstallPromptComponent, LucideAngularModule, IconComponent, GlobalSearchComponent, KeyboardShortcutsModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(GlobalSearchComponent) globalSearch?: GlobalSearchComponent;

  title = 'conductores-pwa';

  // Dark mode state
  isDarkMode = false;
  breadcrumbs$: Observable<string[]>;
  readonly isGlobalSearchEnabled = environment.features.enableGlobalSearch ?? false;
  readonly quickActions$ = this.navigation.getQuickActions();

  constructor(
    private mediaPermissions: MediaPermissionsService,
    _sw: SwUpdateService,
    @Inject(DOCUMENT) private readonly documentRef: Document,
    private readonly flowContext: FlowContextService,
    private readonly router: Router,
    private readonly shortcuts: KeyboardShortcutsService,
    private readonly navigation: NavigationService,
    @Optional() private readonly offlineService?: OfflineService
  ) {
    this.breadcrumbs$ = this.flowContext.breadcrumbs$;
    this.exposeTestingHelpers();
  }

  async ngOnInit() {
    // Media permissions will be requested just-in-time when needed (voice/camera flows)

    // Initialize dark mode from localStorage
    this.ensureDocumentLang();
    this.initializeDarkMode();

    if (typeof window !== 'undefined') {
      this.handleResize();
      window.addEventListener('resize', this.handleResize, { passive: true });
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
      if (!environment.production) {
        const w = window as any;
        if (w.__offlineService === this.offlineService) {
          delete w.__offlineService;
        }
        if (w.__flowContextService === this.flowContext) {
          delete w.__flowContextService;
        }
      }
    }
  }

  private exposeTestingHelpers(): void {
    if (environment.production || typeof window === 'undefined') {
      return;
    }
    const w = window as any;
    if (this.offlineService) {
      w.__offlineService = this.offlineService;
    }
    w.__flowContextService = this.flowContext;
  }

  private ensureDocumentLang(): void {
    const html = this.documentRef?.documentElement;
    if (!html) {
      return;
    }
    html.setAttribute('lang', 'es-MX');
  }

  /**
   * Dark mode management
   */
  private initializeDarkMode(): void {
    // Apply saved dark mode preference
    theme.initFromStorage();
    this.isDarkMode = theme.isDark();
  }

  onQuickAction(action: QuickAction): void {
    this.navigation.executeQuickAction(action.id);
  }

  trackQuickAction(_: number, action: QuickAction): string {
    return action.id;
  }

  trackBreadcrumb(index: number, crumb: string): string {
    return `${index}-${crumb}`;
  }

  toggleDarkMode(): void {
    theme.toggle();
    this.isDarkMode = theme.isDark();
  }

  setDarkMode(isDark: boolean): void {
    theme.setDark(isDark);
    this.isDarkMode = isDark;
  }

  private handleResize = () => {
    if (typeof window === 'undefined') {
      return;
    }

    this.documentRef?.body?.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;

    if (!isCtrlOrMeta && this.isTypingContext(event)) {
      return;
    }

    if (isCtrlOrMeta) {
      const key = event.key.toLowerCase();
      switch (key) {
        case 'k':
          event.preventDefault();
          this.globalSearch?.focusInput();
          return;
        case 'n':
          event.preventDefault();
          this.router.navigate(['/cotizador'], { queryParams: { source: 'shortcut', view: 'new-quote' } });
          return;
        case 'c':
          event.preventDefault();
          this.router.navigate(['/clientes', 'nuevo'], { queryParams: { source: 'shortcut' } });
          return;
        case 'd':
          event.preventDefault();
          this.router.navigate(['/documentos'], { queryParams: { source: 'shortcut' } });
          return;
        default:
          return;
      }
    }

    if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.shortcuts.open();
      return;
    }
  }

  private isTypingContext(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return false;
    }

    const tagName = target.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
  }
}
