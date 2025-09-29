import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
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
