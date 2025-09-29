import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { PwaInstallService } from '../../../services/pwa-install.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './pwa-install-prompt.component.html',
  styleUrls: ['./pwa-install-prompt.component.scss'],
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
