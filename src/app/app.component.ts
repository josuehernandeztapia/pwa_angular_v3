import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BottomNavBarComponent } from './components/shared/bottom-nav-bar/bottom-nav-bar.component';
import { NavigationComponent } from './components/shared/navigation/navigation.component';
import { UpdateBannerComponent } from './components/shared/update-banner/update-banner.component';
import { MediaPermissionsService } from './services/media-permissions.service';
import { SwUpdateService } from './services/sw-update.service';
import { theme } from './styles/design-tokens';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent, BottomNavBarComponent, UpdateBannerComponent, LucideAngularModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'conductores-pwa';

  // 🌙 Dark mode state
  isDarkMode = false;

  constructor(private mediaPermissions: MediaPermissionsService, _sw: SwUpdateService) {}

  async ngOnInit() {
    // Media permissions will be requested just-in-time when needed (voice/camera flows)

    // 🌙 Initialize dark mode from localStorage
    this.initializeDarkMode();
  }

  /**
   * 🌙 Dark Mode Management
   */
  private initializeDarkMode(): void {
    // Apply saved dark mode preference
    theme.initFromStorage();
    this.isDarkMode = theme.isDark();
  }

  toggleDarkMode(): void {
    theme.toggle();
    this.isDarkMode = theme.isDark();
  }

  setDarkMode(isDark: boolean): void {
    theme.setDark(isDark);
    this.isDarkMode = isDark;
  }
}
