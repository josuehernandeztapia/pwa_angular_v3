import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../shared/icon/icon.component';
import { AuthService, AuthResponse } from '../../../services/auth.service';

interface DemoUser {
  email: string;
  role: string;
  name: string;
}

type LoginFormValue = {
  email: string;
  password: string;
  rememberMe: boolean;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  demoUsers: DemoUser[] = [];

  private readonly fallbackDemoUsers: DemoUser[] = [
    { email: 'asesor@conductores.com', role: 'asesor', name: 'Ana Torres' },
    { email: 'supervisor@conductores.com', role: 'supervisor', name: 'Carlos Mendez' },
    { email: 'admin@conductores.com', role: 'admin', name: 'Maria Rodriguez' }
  ];

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    this.demoUsers = [...this.fallbackDemoUsers];
  }

  ngOnInit(): void {
    this.loadDemoUsers();
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

    const { email, password, rememberMe } = this.loginForm.getRawValue() as LoginFormValue;

    const loginCredentials = {
      email,
      password,
      rememberMe
    };

    const loginSub = this.authService.login(loginCredentials)
      .subscribe({
        next: (response: AuthResponse) => {
          this.isLoading = false;
          // If we receive a response, login was successful
          // AuthService returns AuthResponse with user, token, etc.
          if (response && response.user && response.token) {
            // Store remember me preference if needed
            if (rememberMe) {
              localStorage.setItem('rememberLogin', 'true');
            }
            // AuthService handles token and user storage, just navigate
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = 'Error en la respuesta del servidor. Intente nuevamente.';
          }
        },
        error: (error: unknown) => {
          this.isLoading = false;
          const message = error instanceof Error ? error.message : null;
          this.errorMessage = message && message.trim().length > 0
            ? message
            : 'Credenciales incorrectas. Verifique su email y contraseña.';
        }
      });

    this.subscriptions.add(loginSub);
  }

  private loadDemoUsers(): void {
    this.authService.getDemoUsers().subscribe({
      next: (response: { users?: DemoUser[] } | null) => {
        this.demoUsers = response?.users && response.users.length
          ? response.users
          : this.fallbackDemoUsers;
      },
      error: (error: unknown) => {
        console.warn('Failed to load demo users:', error);
        this.demoUsers = this.fallbackDemoUsers;
      }
    });
  }

  selectDemoUser(user: DemoUser): void {
    this.loginForm.patchValue({
      email: user.email,
      password: this.getDemoPassword(user.role),
      rememberMe: false
    });

    // Clear any previous error messages
    this.errorMessage = '';
  }

  private getDemoPassword(role: DemoUser['role'] | string): string {
    switch (role) {
      case 'asesor': return 'demo123';
      case 'supervisor': return 'super123';
      case 'admin': return 'admin123';
      default: return 'demo123';
    }
  }

  // Methods referenced by unit spec
  performLogin(credentials: { email: string; password: string }): void {
    // Simple delegation to onSubmit flow
    this.loginForm.patchValue({
      email: credentials.email,
      password: credentials.password,
      rememberMe: false
    });
    this.onSubmit();
  }
}
