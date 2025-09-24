import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installPromptSubject = new BehaviorSubject<boolean>(false);

  // Signals for reactive state
  public readonly canInstall = signal<boolean>(false);
  public readonly isInstalled = signal<boolean>(false);
  public readonly isStandalone = signal<boolean>(false);

  // Observable for compatibility
  public readonly installPrompt$ = this.installPromptSubject.asObservable();

  constructor() {
    this.initializeInstallTracking();
  }

  private initializeInstallTracking(): void {
    // Check if already installed
    this.checkInstallationStatus();

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
      this.installPromptSubject.next(true);
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.isInstalled.set(true);
      this.canInstall.set(false);
      this.deferredPrompt = null;
      this.installPromptSubject.next(false);
    });

    // Check for installation status changes periodically
    setInterval(() => {
      this.checkInstallationStatus();
    }, 5000);
  }

  private checkInstallationStatus(): void {
    // Check if running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');

    this.isStandalone.set(isStandalone);

    // Check if installed (heuristic approach)
    const wasInstalled = localStorage.getItem('pwa-installed') === 'true';
    if (isStandalone && !wasInstalled) {
      localStorage.setItem('pwa-installed', 'true');
      this.isInstalled.set(true);
    } else {
      this.isInstalled.set(isStandalone || wasInstalled);
    }
  }

  /**
   * Show the install prompt to the user
   */
  async showInstallPrompt(): Promise<{
    outcome: 'accepted' | 'dismissed' | 'unavailable';
    platform?: string;
  }> {
    if (!this.deferredPrompt) {
      return { outcome: 'unavailable' };
    }

    try {
      // Show the install prompt
      await this.deferredPrompt.prompt();

      // Wait for user choice
      const choiceResult = await this.deferredPrompt.userChoice;


      // Clean up
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.installPromptSubject.next(false);

      // Track acceptance
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem('pwa-install-prompted', 'true');
        localStorage.setItem('pwa-install-accepted', 'true');
      }

      return {
        outcome: choiceResult.outcome,
        platform: choiceResult.platform
      };

    } catch (error) {
      return { outcome: 'unavailable' };
    }
  }

  /**
   * Check if user has been prompted to install before
   */
  hasBeenPromptedBefore(): boolean {
    return localStorage.getItem('pwa-install-prompted') === 'true';
  }

  /**
   * Check if user previously accepted install prompt
   */
  previouslyAcceptedInstall(): boolean {
    return localStorage.getItem('pwa-install-accepted') === 'true';
  }

  /**
   * Reset install tracking (useful for testing)
   */
  resetInstallTracking(): void {
    localStorage.removeItem('pwa-install-prompted');
    localStorage.removeItem('pwa-install-accepted');
    localStorage.removeItem('pwa-installed');
    this.canInstall.set(false);
    this.isInstalled.set(false);
    this.installPromptSubject.next(false);
  }

  /**
   * Get platform-specific install instructions
   */
  getInstallInstructions(): {
    platform: string;
    instructions: string[];
  } {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        platform: 'iOS Safari',
        instructions: [
          'Toca el botón de compartir en Safari',
          'Desliza hacia abajo y selecciona "Añadir a pantalla de inicio"',
          'Confirma tocando "Añadir"'
        ]
      };
    }

    if (userAgent.includes('android')) {
      if (userAgent.includes('chrome')) {
        return {
          platform: 'Android Chrome',
          instructions: [
            'Toca el menú de tres puntos en Chrome',
            'Selecciona "Añadir a pantalla de inicio"',
            'Confirma tocando "Añadir"'
          ]
        };
      }

      return {
        platform: 'Android',
        instructions: [
          'Busca la opción "Añadir a pantalla de inicio" en tu navegador',
          'Confirma la instalación'
        ]
      };
    }

    if (userAgent.includes('chrome')) {
      return {
        platform: 'Chrome Desktop',
        instructions: [
          'Busca el ícono de instalación en la barra de direcciones',
          'Haz clic en "Instalar Conductores PWA"',
          'Confirma la instalación'
        ]
      };
    }

    return {
      platform: 'Browser',
      instructions: [
        'Busca la opción de instalación en tu navegador',
        'Añade la aplicación a tu pantalla de inicio'
      ]
    };
  }

  /**
   * Check if PWA features are supported
   */
  getPWASupport(): {
    serviceWorker: boolean;
    manifest: boolean;
    installPrompt: boolean;
    notifications: boolean;
    backgroundSync: boolean;
  } {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      manifest: 'manifest' in document.documentElement,
      installPrompt: 'BeforeInstallPromptEvent' in window ||
                     'onbeforeinstallprompt' in window,
      notifications: 'Notification' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype
    };
  }

  /**
   * Get install metrics for analytics
   */
  getInstallMetrics(): {
    canInstall: boolean;
    isInstalled: boolean;
    isStandalone: boolean;
    hasBeenPrompted: boolean;
    previouslyAccepted: boolean;
    platform: string;
    support: any;
  } {
    return {
      canInstall: this.canInstall(),
      isInstalled: this.isInstalled(),
      isStandalone: this.isStandalone(),
      hasBeenPrompted: this.hasBeenPromptedBefore(),
      previouslyAccepted: this.previouslyAcceptedInstall(),
      platform: navigator.platform,
      support: this.getPWASupport()
    };
  }
}
