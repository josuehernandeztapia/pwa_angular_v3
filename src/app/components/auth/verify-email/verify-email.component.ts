import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  isLoading = true;
  isVerified = false;
  hasError = false;
  verificationMessage = '';
  errorMessage = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];
    
    if (!token) {
      this.hasError = true;
      this.errorMessage = 'Token de verificación no proporcionado.';
      this.isLoading = false;
      return;
    }

    this.verifyEmailToken(token);
  }

  private verifyEmailToken(token: string): void {
    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isVerified = true;
        this.verificationMessage = response.message;
      },
      error: (error) => {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = error.message || 'Error al verificar el email.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
