import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { PwaInstallService } from '../../../services/pwa-install.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Install Banner -->
    <div
      *ngIf="shouldShowBanner()"
      class="install-banner"
      [@slideIn]>

      <div class="banner-content">
        <div class="install-icon">
          📱
        </div>

        <div class="install-info">
          <h3 class="install-title">
            ¡Instala Conductores PWA!
          </h3>
          <p class="install-subtitle">
            Acceso rápido desde tu pantalla de inicio
          </p>
        </div>

        <div class="install-actions">
          <button
            class="install-btn primary"
            (click)="install()"
            [disabled]="installing()"
            aria-label="Instalar aplicación">

            <span *ngIf="!installing()">📲 Instalar</span>
            <span *ngIf="installing()">⏳ Instalando...</span>
          </button>

          <button
            class="install-btn secondary"
            (click)="dismiss()"
            aria-label="Cerrar prompt de instalación">
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Manual Install Instructions Modal -->
    <div
      *ngIf="showManualInstructions()"
      class="install-modal"
      (click)="closeManualInstructions()">

      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>📱 Instalar en {{ getInstructions().platform }}</h3>
          <button
            class="modal-close"
            (click)="closeManualInstructions()"
            aria-label="Cerrar instrucciones">
            ✕
          </button>
        </div>

        <div class="modal-body">
          <p class="instructions-intro">
            Para instalar esta aplicación en tu dispositivo:
          </p>

          <ol class="instructions-list">
            <li *ngFor="let instruction of getInstructions().instructions; let i = index">
              <span class="step-number">{{ i + 1 }}</span>
              <span class="step-text">{{ instruction }}</span>
            </li>
          </ol>

          <div class="instructions-note">
            💡 Una vez instalada, podrás acceder sin conexión a internet
          </div>
        </div>

        <div class="modal-actions">
          <button
            class="modal-btn primary"
            (click)="closeManualInstructions()">
            Entendido
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Install Button (for installed PWAs) -->
    <button
      *ngIf="shouldShowFloatingButton()"
      class="floating-install-btn"
      (click)="showInstallOptions()"
      aria-label="Opciones de instalación">

      <span class="floating-icon">📱</span>
      <span class="floating-text">Instalar</span>
    </button>
  `,
  styles: [`
    /* Install Banner */
    .install-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 999;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      color: white;
      padding: 16px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
      
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .install-icon {
      font-size: 24px;
      animation: bounce 2s infinite;
    }

    .install-info {
      flex: 1;
    }

    .install-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .install-subtitle {
      font-size: 12px;
      opacity: 0.9;
      margin: 0;
    }

    .install-actions {
      display: flex;
      gap: 8px;
    }

    .install-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .install-btn.primary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      
    }

    .install-btn.primary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .install-btn.primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .install-btn.secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      width: 32px;
      height: 32px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .install-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Install Modal */
    .install-modal {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 400px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      animation: modalSlideIn 0.3s ease;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 20px 0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #6b7280;
      padding: 4px;
      border-radius: 4px;
    }

    .modal-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .modal-body {
      padding: 20px;
    }

    .instructions-intro {
      color: #4b5563;
      margin: 0 0 16px 0;
      font-size: 14px;
    }

    .instructions-list {
      list-style: none;
      padding: 0;
      margin: 0 0 16px 0;
    }

    .instructions-list li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 3px solid #667eea;
    }

    .step-number {
      background: #667eea;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-text {
      color: #374151;
      font-size: 14px;
      line-height: 1.4;
    }

    .instructions-note {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      padding: 12px;
      color: #1e40af;
      font-size: 13px;
      text-align: center;
    }

    .modal-actions {
      padding: 0 20px 20px;
      display: flex;
      justify-content: flex-end;
    }

    .modal-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-btn.primary {
      background: #667eea;
      color: white;
    }

    .modal-btn.primary:hover {
      background: #5a67d8;
      transform: translateY(-1px);
    }

    /* Floating Install Button */
    .floating-install-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 998;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
      transition: all 0.2s ease;
      
    }

    .floating-install-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .floating-icon {
      font-size: 16px;
    }

    .floating-text {
      font-size: 12px;
      white-space: nowrap;
    }

    /* Animations */
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-10px);
      }
      60% {
        transform: translateY(-5px);
      }
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Mobile responsiveness */
    @media (max-width: 640px) {
      .install-banner {
        padding: 12px;
      }

      .banner-content {
        gap: 8px;
      }

      .install-title {
        font-size: 14px;
      }

      .install-subtitle {
        font-size: 11px;
      }

      .install-btn.primary {
        padding: 6px 12px;
        font-size: 12px;
      }

      .floating-install-btn {
        bottom: 16px;
        right: 16px;
        padding: 10px 14px;
      }

      .floating-text {
        font-size: 11px;
      }

      .modal-content {
        margin: 16px;
        max-height: calc(100vh - 32px);
      }
    }
  `],
  animations: []
})
export class PwaInstallPromptComponent {
  private dismissed = signal(false);
  private isInstalling = signal(false);
  private manualInstructionsOpen = signal(false);

  constructor(private pwaInstallService: PwaInstallService) {
    // Auto-show banner after user has been on site for 30 seconds
    setTimeout(() => {
      if (this.shouldAutoShow()) {
        // Banner will show automatically via shouldShowBanner()
      }
    }, 30000);
  }

  shouldShowBanner = computed(() => {
    return this.pwaInstallService.canInstall() &&
           !this.dismissed() &&
           !this.pwaInstallService.isInstalled() &&
           !this.pwaInstallService.hasBeenPromptedBefore();
  });

  shouldShowFloatingButton = computed(() => {
    return !this.pwaInstallService.canInstall() &&
           !this.pwaInstallService.isInstalled() &&
           !this.dismissed();
  });

  showManualInstructions = computed(() => this.manualInstructionsOpen());

  installing = computed(() => this.isInstalling());

  private shouldAutoShow(): boolean {
    // Show if PWA can be installed and user hasn't been prompted recently
    return this.pwaInstallService.canInstall() &&
           !this.pwaInstallService.hasBeenPromptedBefore();
  }

  async install(): Promise<void> {
    this.isInstalling.set(true);

    try {
      const result = await this.pwaInstallService.showInstallPrompt();

      if (result.outcome === 'accepted') {
        this.dismissed.set(true);
      } else if (result.outcome === 'dismissed') {
        this.dismissed.set(true);
      } else {
        // Unavailable - show manual instructions
        this.showInstallOptions();
      }
    } catch (error) {
      this.showInstallOptions();
    } finally {
      this.isInstalling.set(false);
    }
  }

  dismiss(): void {
    this.dismissed.set(true);

    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  }

  showInstallOptions(): void {
    this.manualInstructionsOpen.set(true);
  }

  closeManualInstructions(): void {
    this.manualInstructionsOpen.set(false);
  }

  getInstructions(): { platform: string; instructions: string[] } {
    return this.pwaInstallService.getInstallInstructions();
  }

  // For debugging/testing
  reset(): void {
    this.dismissed.set(false);
    this.isInstalling.set(false);
    this.manualInstructionsOpen.set(false);
    this.pwaInstallService.resetInstallTracking();
  }
}
