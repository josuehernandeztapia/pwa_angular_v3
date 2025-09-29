import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent {
  
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.goHome();
    }
  }

  openHelp(): void {
    // Open help documentation or modal
    // This would typically open a help modal or navigate to help section
  }

  contactSupport(): void {
    // Open support contact form or redirect to support
    // This would typically open a support chat or contact form
    window.open('mailto:soporte@conductores.com?subject=Ayuda con navegación', '_blank');
  }
}
