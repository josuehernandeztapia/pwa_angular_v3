import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavBarComponent } from './components/shared/bottom-nav-bar/bottom-nav-bar.component';
import { NavigationComponent } from './components/shared/navigation/navigation.component';
import { UpdateBannerComponent } from './components/shared/update-banner/update-banner.component';
import { MediaPermissionsService } from './services/media-permissions.service';
import { SwUpdateService } from './services/sw-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent, BottomNavBarComponent, UpdateBannerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'conductores-pwa';

  constructor(private mediaPermissions: MediaPermissionsService, _sw: SwUpdateService) {}

  async ngOnInit() {
    // Media permissions will be requested just-in-time when needed (voice/camera flows)
  }
}
