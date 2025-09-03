import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="command-center-container">
      <!-- Dynamic background with subtle animation -->
      <div class="dynamic-background">
        <div class="data-nodes"></div>
        <div class="connection-lines"></div>
      </div>
      
      <div class="command-center-card">
        <div class="command-center-header">
          <div class="brand-identity">
            <div class="brand-icon">🚀</div>
            <h1 class="text-gradient-primary">Centro de Comando</h1>
            <p class="brand-subtitle">El Copiloto Estratégico para el Asesor Moderno</p>
          </div>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="command-center-form">
          <div class="form-group">
            <label for="email" class="premium-label">📧 Correo Electrónico</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="premium-input"
              [class.error]="isFieldInvalid('email')"
              placeholder="ricardo.montoya@cmu.com"
            >
            <div *ngIf="isFieldInvalid('email')" class="error-message">
              <span *ngIf="loginForm.get('email')?.errors?.['required']">
                El correo es requerido
              </span>
              <span *ngIf="loginForm.get('email')?.errors?.['email']">
                Formato de correo inválido
              </span>
            </div>
          </div>

          <div class="form-group password-group">
            <label for="password" class="premium-label">🔒 Contraseña</label>
            <div class="password-input-container">
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                formControlName="password"
                class="premium-input password-input"
                [class.error]="isFieldInvalid('password')"
                placeholder="••••••••••••"
              >
              <button
                type="button"
                class="password-toggle-premium"
                (click)="togglePassword()"
              >
                {{ showPassword ? '👁️' : '🙈' }}
              </button>
            </div>
            <div *ngIf="isFieldInvalid('password')" class="error-message">
              <span *ngIf="loginForm.get('password')?.errors?.['required']">
                La contraseña es requerida
              </span>
              <span *ngIf="loginForm.get('password')?.errors?.['minlength']">
                Mínimo 6 caracteres
              </span>
            </div>
          </div>

          <div class="form-options">
            <label class="remember-me">
              <input 
                type="checkbox" 
                formControlName="rememberMe"
              >
              <span class="checkmark"></span>
              Recordarme
            </label>
            <button type="button" class="forgot-password">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button 
            type="submit" 
            class="btn-primary command-center-btn"
            [disabled]="loginForm.invalid || isLoading"
          >
            <span *ngIf="!isLoading" class="btn-content">
              <span class="btn-icon">➡️</span>
              <span class="btn-text">Acceder al Cockpit</span>
            </span>
            <span *ngIf="isLoading" class="loading-state">
              <span class="loading-spinner">⏳</span>
              <span>Estableciendo conexión...</span>
            </span>
          </button>

          <div *ngIf="errorMessage" class="login-error">
            ⚠️ {{ errorMessage }}
          </div>
        </form>

        <div class="command-center-footer">
          <div class="register-section">
            <p class="register-text">¿Nuevo asesor? <a [attr.href]="'/register'" class="premium-link">Activar Cuenta</a></p>
          </div>
          
          <div class="security-badge">
            <span class="security-icon">🔒</span>
            <span class="security-text">Conexión Segura</span>
          </div>
          
          <div class="demo-credentials">
            <div class="demo-header">
              <span class="demo-icon">🎯</span>
              <span class="demo-title">Acceso Demo</span>
            </div>
            <div class="demo-content">
              <div class="credential-row">
                <span class="credential-label">Email:</span>
                <span class="credential-value">demo&#64;conductores.com</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Password:</span>
                <span class="credential-value">demo123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== COMMAND CENTER CONTAINER ===== */
    .command-center-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-gray-950);
      position: relative;
      overflow: hidden;
    }

    /* ===== DYNAMIC BACKGROUND ===== */
    .dynamic-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.1;
    }

    .data-nodes::before {
      content: '';
      position: absolute;
      top: 20%;
      left: 20%;
      width: 4px;
      height: 4px;
      background: var(--primary-cyan-400);
      border-radius: 50%;
      animation: pulse-node 3s ease-in-out infinite;
      box-shadow: 
        0 0 20px var(--primary-cyan-400),
        200px 100px 0 var(--accent-amber-500),
        400px 300px 0 var(--primary-cyan-300),
        600px 150px 0 var(--accent-amber-400);
    }

    @keyframes pulse-node {
      0%, 100% { 
        opacity: 0.3; 
        transform: scale(1);
      }
      50% { 
        opacity: 0.8; 
        transform: scale(1.2);
      }
    }

    .connection-lines {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        45deg, 
        transparent 45%, 
        var(--primary-cyan-800) 46%, 
        var(--primary-cyan-800) 47%, 
        transparent 48%
      );
      animation: slide-lines 8s linear infinite;
    }

    @keyframes slide-lines {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* ===== COMMAND CENTER CARD ===== */
    .command-center-card {
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      backdrop-filter: var(--glass-backdrop);
      -webkit-backdrop-filter: var(--glass-backdrop);
      border-radius: 24px;
      padding: 48px;
      width: 100%;
      max-width: 480px;
      box-shadow: var(--shadow-premium);
      position: relative;
      z-index: 10;
      animation: fadeInUp 0.8s ease-out;
    }

    .command-center-card::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      right: -1px;
      bottom: -1px;
      background: linear-gradient(135deg, var(--primary-cyan-400), transparent, var(--accent-amber-500));
      border-radius: 24px;
      z-index: -1;
      opacity: 0.3;
    }

    /* ===== BRAND IDENTITY ===== */
    .command-center-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .brand-identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      font-size: 3rem;
      animation: rotate-glow 4s ease-in-out infinite;
    }

    @keyframes rotate-glow {
      0%, 100% { 
        transform: rotate(0deg);
        filter: drop-shadow(0 0 10px var(--primary-cyan-400));
      }
      50% { 
        transform: rotate(5deg);
        filter: drop-shadow(0 0 20px var(--accent-amber-500));
      }
    }

    .command-center-header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.025em;
    }

    .brand-subtitle {
      color: var(--bg-gray-300);
      font-size: 1.1rem;
      font-weight: 500;
      margin: 0;
      opacity: 0.9;
    }

    /* ===== PREMIUM FORM ===== */
    .command-center-form {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .premium-label {
      color: var(--primary-cyan-300);
      font-weight: 600;
      font-size: 0.95rem;
      letter-spacing: 0.025em;
    }

    .password-group .password-input-container {
      position: relative;
    }

    .password-input {
      padding-right: 50px !important;
    }

    .password-toggle-premium {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--bg-gray-400);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .password-toggle-premium:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--primary-cyan-300);
    }

    .premium-input.error {
      border-color: var(--error-500);
      background: rgba(239, 68, 68, 0.05);
    }

    .error-message {
      color: var(--error-500);
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }

    /* ===== FORM OPTIONS ===== */
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -8px 0 8px 0;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      color: var(--bg-gray-300);
      user-select: none;
    }

    .remember-me input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--primary-cyan-400);
    }

    .forgot-password {
      background: none;
      border: none;
      color: var(--accent-amber-500);
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .forgot-password:hover {
      color: var(--accent-amber-400);
      text-decoration: underline;
    }

    /* ===== COMMAND CENTER BUTTON ===== */
    .command-center-btn {
      width: 100%;
      padding: 18px 24px;
      font-size: 1.1rem;
      font-weight: 700;
      margin: 16px 0;
      border-radius: 16px;
      position: relative;
      overflow: hidden;
    }

    .btn-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .btn-icon {
      font-size: 1.2rem;
      transition: transform 0.3s ease;
    }

    .command-center-btn:hover .btn-icon {
      transform: translateX(4px);
    }

    .btn-text {
      font-weight: 700;
      letter-spacing: 0.025em;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .loading-spinner {
      animation: spin-glow 1.5s linear infinite;
    }

    @keyframes spin-glow {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .login-error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--error-500);
      color: var(--error-500);
      padding: 14px 18px;
      border-radius: 12px;
      text-align: center;
      font-size: 0.9rem;
      margin-bottom: 20px;
    }

    /* ===== COMMAND CENTER FOOTER ===== */
    .command-center-footer {
      margin-top: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .register-section {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .register-text {
      margin: 0;
      color: var(--bg-gray-300);
      font-size: 0.95rem;
    }

    .premium-link {
      color: var(--primary-cyan-400);
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .premium-link:hover {
      color: var(--primary-cyan-300);
      text-decoration: underline;
    }

    .security-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--success-500);
      font-size: 0.85rem;
      font-weight: 500;
    }

    .security-icon {
      font-size: 1rem;
    }

    /* ===== DEMO CREDENTIALS ===== */
    .demo-credentials {
      background: rgba(34, 211, 238, 0.05);
      border: 1px solid rgba(34, 211, 238, 0.2);
      border-radius: 12px;
      padding: 20px;
    }

    .demo-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .demo-icon {
      font-size: 1.2rem;
    }

    .demo-title {
      color: var(--primary-cyan-300);
      font-weight: 600;
      font-size: 1rem;
    }

    .demo-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .credential-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .credential-label {
      color: var(--bg-gray-400);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .credential-value {
      color: var(--primary-cyan-200);
      font-size: 0.9rem;
      font-family: 'Courier New', monospace;
      background: rgba(34, 211, 238, 0.1);
      padding: 4px 8px;
      border-radius: 6px;
    }

    /* ===== RESPONSIVE DESIGN ===== */
    @media (max-width: 640px) {
      .command-center-card {
        padding: 32px 24px;
        margin: 20px;
        max-width: none;
      }

      .command-center-header h1 {
        font-size: 2rem;
      }

      .brand-subtitle {
        font-size: 1rem;
      }

      .form-options {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }

      .credential-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  // Back-compat for a11y spec
  loginError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnDestroy(): void {}

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Spec expects togglePasswordVisibility name
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Keep old method name used in template
  togglePassword(): void {
    this.togglePasswordVisibility();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.loginError = null;
      
      const { email, password, rememberMe } = this.loginForm.value;
      
      // Simulate API call
      setTimeout(() => {
        if (email === 'demo@conductores.com' && password === 'demo123') {
          // Successful login
          localStorage.setItem('isAuthenticated', 'true');
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          this.router.navigate(['/dashboard']);
        } else {
          // Failed login
          this.errorMessage = 'Credenciales incorrectas. Usa las credenciales demo.';
          this.loginError = this.errorMessage;
        }
        this.isLoading = false;
      }, 1500);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  // Methods referenced by unit spec
  performLogin(credentials: { email: string; password: string }): void {
    // Simple delegation to onSubmit flow
    this.loginForm.patchValue(credentials);
    this.onSubmit();
  }
}