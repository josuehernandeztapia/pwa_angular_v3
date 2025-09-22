import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- Skip Link for Accessibility -->
    <a class="skip-link" href="#login-form">Saltar al formulario de inicio de sesión</a>

    <!-- Minimalista Enterprise Login Container -->
    <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">

      <!-- Login Card - Enterprise Style -->
      <div class="ui-card ui-card-spacious w-full max-w-md">

        <!-- Header -->
        <div class="text-center mb-8">
          <div class="text-sky-600 dark:text-sky-400 text-5xl mb-4">🚗</div>
          <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Conductores
          </h1>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Sistema de Gestión Empresarial
          </p>
        </div>

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" id="login-form" role="form" aria-labelledby="login-title">

          <!-- Email Field -->
          <div class="mb-4">
            <label for="email" class="ui-label" [class.ui-label-required]="true">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="ui-input"
              [class.ui-input-error]="isFieldInvalid('email')"
              placeholder="usuario@empresa.com"
              autocomplete="email"
              data-cy="email-input"
            >
            <div *ngIf="isFieldInvalid('email')" class="ui-error-text" role="alert">
              <span *ngIf="loginForm.get('email')?.errors?.['required']">
                El correo electrónico es requerido
              </span>
              <span *ngIf="loginForm.get('email')?.errors?.['email']">
                Formato de correo inválido
              </span>
            </div>
          </div>

          <!-- Password Field -->
          <div class="mb-6">
            <label for="password" class="ui-label" [class.ui-label-required]="true">
              Contraseña
            </label>
            <div class="relative">
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                formControlName="password"
                class="ui-input pr-10"
                [class.ui-input-error]="isFieldInvalid('password')"
                placeholder="••••••••"
                autocomplete="current-password"
                data-cy="password-input"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                (click)="togglePassword()"
                [attr.aria-label]="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                data-cy="password-toggle"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path *ngIf="!showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path *ngIf="!showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  <path *ngIf="showPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              </button>
            </div>
            <div *ngIf="isFieldInvalid('password')" class="ui-error-text" role="alert">
              <span *ngIf="loginForm.get('password')?.errors?.['required']">
                La contraseña es requerida
              </span>
              <span *ngIf="loginForm.get('password')?.errors?.['minlength']">
                Mínimo 6 caracteres
              </span>
            </div>
          </div>

          <!-- Form Options -->
          <div class="flex items-center justify-between mb-6">
            <label class="flex items-center text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                formControlName="rememberMe"
                class="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded mr-2"
                data-cy="remember-me"
              >
              Recordarme
            </label>
            <button
              type="button"
              class="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-500 font-medium"
              data-cy="forgot-password"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="ui-btn ui-btn-primary ui-btn-block mb-4"
            [disabled]="loginForm.invalid || isLoading"
            data-cy="login-submit"
          >
            <span *ngIf="!isLoading">Iniciar Sesión</span>
            <span *ngIf="isLoading" class="flex items-center justify-center">
              <div class="ui-spinner ui-spinner-sm mr-2"></div>
              Iniciando sesión...
            </span>
          </button>

          <!-- Error Message -->
          <div *ngIf="errorMessage" class="ui-alert ui-alert-error mb-4" role="alert">
            {{ errorMessage }}
          </div>
        </form>

        <!-- Footer -->
        <div class="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">

          <!-- Register Link -->
          <div class="text-center text-sm text-slate-600 dark:text-slate-400">
            ¿Nuevo usuario?
            <a href="/register" class="text-sky-600 dark:text-sky-400 hover:text-sky-500 font-medium ml-1" data-cy="register-link">
              Crear cuenta
            </a>
          </div>

// removed by clean-audit
          <div class="ui-alert ui-alert-info text-sm">
            <div class="font-medium mb-1">Credenciales de prueba:</div>
            <div class="space-y-1 text-xs">
// removed by clean-audit
              <div><span class="font-medium">Contraseña:</span> demo123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Skip Link for Accessibility */
    .skip-link {
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
    }

    .skip-link:focus {
      position: static;
      width: auto;
      height: auto;
      padding: 8px 12px;
      background: #0EA5E9;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
    }
  `]
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  private subscriptions = new Subscription();

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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = this.loginForm.value;

    // Simulate API call
    const loginSub = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        if (credentials.email === 'demo@conductores.com' && credentials.password === 'demo123') {
          resolve(true);
        } else {
          resolve(false);
        }
      }, 1500);
    }).then((success) => {
      this.isLoading = false;
      if (success) {
        // Store login state (in real app, this would be handled by auth service)
        if (credentials.rememberMe) {
          localStorage.setItem('rememberLogin', 'true');
        }
        localStorage.setItem('isLoggedIn', 'true');
        this.router.navigate(['/dashboard']);
      } else {
// removed by clean-audit
      }
    }).catch(() => {
      this.isLoading = false;
      this.errorMessage = 'Error de conexión. Intente nuevamente.';
    });
  }

  // Methods referenced by unit spec
  performLogin(credentials: { email: string; password: string }): void {
    // Simple delegation to onSubmit flow
    this.loginForm.patchValue(credentials);
    this.onSubmit();
  }
}
// removed by clean-audit