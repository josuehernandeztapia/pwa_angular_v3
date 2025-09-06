import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/shared/navigation/navigation.component';
import { BottomNavBarComponent } from './components/shared/bottom-nav-bar/bottom-nav-bar.component';
import { MediaPermissionsService } from './services/media-permissions.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavigationComponent, BottomNavBarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'conductores-pwa';

  constructor(private mediaPermissions: MediaPermissionsService) {}

  async ngOnInit() {
    // Media permissions will be requested just-in-time when needed (voice/camera flows)
  }
}
