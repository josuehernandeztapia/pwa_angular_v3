import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="verify-container">
      <div class="verify-card">
        <div class="verify-content" *ngIf="!isLoading && !isVerified && !hasError">
          <div class="icon">📧</div>
          <h1>Verificar Email</h1>
          <p>Verificando tu dirección de correo electrónico...</p>
          <div class="loading-spinner">⏳</div>
        </div>

        <div class="verify-content" *ngIf="isVerified && !hasError">
          <div class="icon success">✅</div>
          <h1>¡Email Verificado!</h1>
          <p>{{ verificationMessage }}</p>
          <div class="actions">
            <button 
              class="btn-primary"
              (click)="goToLogin()"
            >
              Ir al Login
            </button>
          </div>
        </div>

        <div class="verify-content" *ngIf="hasError">
          <div class="icon error">❌</div>
          <h1>Error de Verificación</h1>
          <p>{{ errorMessage }}</p>
          <div class="actions">
            <button 
              class="btn-secondary"
              routerLink="/register"
            >
              Volver a Registro
            </button>
            <button 
              class="btn-primary"
              routerLink="/login"
            >
              Ir al Login
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verify-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      padding: 20px;
    }

    .verify-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 60px 40px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
      text-align: center;
    }

    .verify-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    .icon {
      font-size: 4rem;
      margin-bottom: 16px;
    }

    .icon.success {
      color: #48bb78;
    }

    .icon.error {
      color: #e53e3e;
    }

    h1 {
      margin: 0;
      color: #2d3748;
      font-size: 2rem;
      font-weight: 700;
    }

    p {
      margin: 0;
      color: #4a5568;
      font-size: 1.1rem;
      line-height: 1.6;
      max-width: 400px;
    }

    .loading-spinner {
      font-size: 2rem;
      animation: pulse 1.5s infinite;
    }

    .actions {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-primary, .btn-secondary {
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      color: white;
    }

    .btn-primary:hover {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      transform: translateY(-1px);
      box-shadow: 0 10px 25px rgba(66, 153, 225, 0.3);
    }

    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 2px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #edf2f7;
      border-color: #cbd5e0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @media (max-width: 480px) {
      .verify-card {
        padding: 40px 24px;
        margin: 16px;
      }
      
      .actions {
        flex-direction: column;
        width: 100%;
      }
      
      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
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