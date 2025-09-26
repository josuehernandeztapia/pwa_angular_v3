import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { CustomValidators } from '../../../validators/custom-validators';
import { of } from 'rxjs';
import { map, delay, debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface RegistrationData {
  // Información personal
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Credenciales
  password: string;
  confirmPassword: string;
  
  // Información profesional
  empleadoId?: string;
  sucursal: string;
  supervisor?: string;
  
  // Términos y condiciones
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

interface WizardStep {
  id: number;
  title: string;
  icon: string;
  completed: boolean;
  active: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <div class="logo">
            <h1>🚐 Conductores PWA</h1>
            <p>Registro de Nuevo Asesor</p>
          </div>
          
          <!-- Progress Steps -->
          <div class="wizard-steps">
            <div 
              *ngFor="let step of steps; let i = index"
              class="step"
              [class.active]="step.active"
              [class.completed]="step.completed"
            >
              <div class="step-circle">
                <span *ngIf="!step.completed">{{ step.icon }}</span>
                <span *ngIf="step.completed">✅</span>
              </div>
              <span class="step-title">{{ step.title }}</span>
            </div>
          </div>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
          
          <!-- Step 1: Información Personal -->
          <div class="form-step" *ngIf="currentStep === 1">
            <h2>👤 Información Personal</h2>
            <p class="step-description">Ingresa tus datos personales básicos</p>
            
            <div class="form-row">
              <div class="form-group">
                <label for="firstName">Nombre *</label>
                <input
                  id="firstName"
                  type="text"
                  formControlName="firstName"
                  class="form-input"
                  [class.error]="isFieldInvalid('firstName')"
                  placeholder="Juan"
                >
                <div *ngIf="isFieldInvalid('firstName')" class="error-message">
                  Nombre es requerido
                </div>
              </div>

              <div class="form-group">
                <label for="lastName">Apellidos *</label>
                <input
                  id="lastName"
                  type="text"
                  formControlName="lastName"
                  class="form-input"
                  [class.error]="isFieldInvalid('lastName')"
                  placeholder="Pérez García"
                >
                <div *ngIf="isFieldInvalid('lastName')" class="error-message">
                  Apellidos son requeridos
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="email">📧 Correo Corporativo *</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="form-input"
                [class.error]="isFieldInvalid('email')"
                [class.checking]="isCheckingEmail"
                placeholder="juan.perez@conductores.com"
              >
              <div *ngIf="isFieldInvalid('email')" class="error-message">
                <span *ngIf="registerForm.get('email')?.errors?.['required']">
                  Correo es requerido
                </span>
                <span *ngIf="registerForm.get('email')?.errors?.['email']">
                  Formato de correo inválido
                </span>
                <span *ngIf="registerForm.get('email')?.errors?.['corporate']">
                  Debe ser un correo corporativo (&#64;conductores.com)
                </span>
                <span *ngIf="registerForm.get('email')?.errors?.['emailTaken']">
                  Este correo ya está registrado
                </span>
              </div>
              <div *ngIf="isCheckingEmail" class="info-message">
                🔍 Verificando disponibilidad...
              </div>
            </div>

            <div class="form-group">
              <label for="phone">📱 Teléfono *</label>
              <input
                id="phone"
                type="tel"
                formControlName="phone"
                class="form-input"
                [class.error]="isFieldInvalid('phone')"
                placeholder="5555555555"
              >
              <div *ngIf="isFieldInvalid('phone')" class="error-message">
                Teléfono mexicano válido es requerido
              </div>
            </div>
          </div>

          <!-- Step 2: Credenciales -->
          <div class="form-step" *ngIf="currentStep === 2">
            <h2>🔒 Credenciales de Acceso</h2>
            <p class="step-description">Crea una contraseña segura para tu cuenta</p>
            
            <div class="form-group">
              <label for="password">Contraseña *</label>
              <div class="password-input">
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  class="form-input"
                  [class.error]="isFieldInvalid('password')"
                  placeholder="••••••••"
                >
                <button
                  type="button"
                  class="password-toggle"
                  (click)="togglePassword()"
                >
                  {{ showPassword ? '👁️' : '🙈' }}
                </button>
              </div>
              <div class="password-strength">
                <div class="strength-bar">
                  <div 
                    class="strength-fill"
                    [class]="getPasswordStrengthClass()"
                    [style.width.%]="getPasswordStrength()"
                  ></div>
                </div>
                <span class="strength-text">{{ getPasswordStrengthText() }}</span>
              </div>
              <div class="password-requirements">
                <div class="requirement" [class.met]="passwordRequirements.length">
                  ✓ Mínimo 8 caracteres
                </div>
                <div class="requirement" [class.met]="passwordRequirements.uppercase">
                  ✓ Al menos una mayúscula
                </div>
                <div class="requirement" [class.met]="passwordRequirements.number">
                  ✓ Al menos un número
                </div>
                <div class="requirement" [class.met]="passwordRequirements.symbol">
                  ✓ Al menos un símbolo
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirmar Contraseña *</label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                class="form-input"
                [class.error]="isFieldInvalid('confirmPassword')"
                placeholder="••••••••"
              >
              <div *ngIf="isFieldInvalid('confirmPassword')" class="error-message">
                <span *ngIf="registerForm.get('confirmPassword')?.errors?.['required']">
                  Confirmación de contraseña es requerida
                </span>
                <span *ngIf="registerForm.get('confirmPassword')?.errors?.['mismatch']">
                  Las contraseñas no coinciden
                </span>
              </div>
            </div>
          </div>

          <!-- Step 3: Información Profesional -->
          <div class="form-step" *ngIf="currentStep === 3">
            <h2>🏢 Información Profesional</h2>
            <p class="step-description">Datos de tu posición en la empresa</p>
            
            <div class="form-group">
              <label for="empleadoId">ID de Empleado</label>
              <input
                id="empleadoId"
                type="text"
                formControlName="empleadoId"
                class="form-input"
                [class.error]="isFieldInvalid('empleadoId')"
                placeholder="EMP-2024-001"
              >
              <div *ngIf="isFieldInvalid('empleadoId')" class="error-message">
                ID de empleado inválido
              </div>
              <div class="info-message">
                💡 Opcional: Si tienes ID de empleado, ingrésalo para validación automática
              </div>
            </div>

            <div class="form-group">
              <label for="sucursal">Sucursal *</label>
              <select
                id="sucursal"
                formControlName="sucursal"
                class="form-select"
                [class.error]="isFieldInvalid('sucursal')"
              >
                <option value="">Seleccionar sucursal</option>
                <option value="aguascalientes">Aguascalientes</option>
                <option value="edomex-norte">Estado de México - Norte</option>
                <option value="edomex-sur">Estado de México - Sur</option>
                <option value="oficina-central">Oficina Central</option>
              </select>
              <div *ngIf="isFieldInvalid('sucursal')" class="error-message">
                Sucursal es requerida
              </div>
            </div>

            <div class="form-group">
              <label for="supervisor">Email del Supervisor</label>
              <input
                id="supervisor"
                type="email"
                formControlName="supervisor"
                class="form-input"
                [class.error]="isFieldInvalid('supervisor')"
                placeholder="supervisor@conductores.com"
              >
              <div *ngIf="isFieldInvalid('supervisor')" class="error-message">
                Email de supervisor inválido
              </div>
              <div class="info-message">
                💡 Opcional: Email del supervisor que aprobará tu registro
              </div>
            </div>
          </div>

          <!-- Step 4: Términos y Verificación -->
          <div class="form-step" *ngIf="currentStep === 4">
            <h2>✅ Términos y Condiciones</h2>
            <p class="step-description">Acepta los términos para completar tu registro</p>
            
            <div class="terms-section">
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="acceptTerms"
                    class="checkbox-input"
                  >
                  <span class="checkmark"></span>
                  Acepto los <a href="#" class="link">Términos y Condiciones</a> del servicio
                </label>
                <div *ngIf="isFieldInvalid('acceptTerms')" class="error-message">
                  Debes aceptar los términos y condiciones
                </div>
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    formControlName="acceptPrivacy"
                    class="checkbox-input"
                  >
                  <span class="checkmark"></span>
                  Acepto la <a href="#" class="link">Política de Privacidad</a>
                </label>
                <div *ngIf="isFieldInvalid('acceptPrivacy')" class="error-message">
                  Debes aceptar la política de privacidad
                </div>
              </div>
            </div>

            <div class="registration-summary">
              <h3>📋 Resumen de Registro</h3>
              <div class="summary-item">
                <strong>Nombre:</strong> {{ getFormValue('firstName') }} {{ getFormValue('lastName') }}
              </div>
              <div class="summary-item">
                <strong>Email:</strong> {{ getFormValue('email') }}
              </div>
              <div class="summary-item">
                <strong>Teléfono:</strong> {{ getFormValue('phone') }}
              </div>
              <div class="summary-item">
                <strong>Sucursal:</strong> {{ getSucursalLabel(getFormValue('sucursal')) }}
              </div>
              <div class="summary-item" *ngIf="getFormValue('supervisor')">
                <strong>Supervisor:</strong> {{ getFormValue('supervisor') }}
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="form-actions">
            <button
              type="button"
              *ngIf="currentStep > 1"
              (click)="previousStep()"
              class="btn-secondary"
            >
              ← Anterior
            </button>
            
            <button
              type="button"
              *ngIf="currentStep < 4"
              (click)="nextStep()"
              class="btn-primary"
              [disabled]="!canProceedToNext()"
            >
              Siguiente →
            </button>
            
            <button
              type="submit"
              *ngIf="currentStep === 4"
              class="btn-primary"
              [disabled]="registerForm.invalid || isLoading"
            >
              <span *ngIf="!isLoading">🚀 Crear Cuenta</span>
              <span *ngIf="isLoading" class="loading">⏳ Creando...</span>
            </button>
          </div>

          <div *ngIf="errorMessage" class="register-error">
            ⚠️ {{ errorMessage }}
          </div>
        </form>

        <div class="register-footer">
          <p>¿Ya tienes cuenta? <a routerLink="/login" class="link">Iniciar Sesión</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      padding: 20px;
    }

    .register-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 40px;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      
    }

    .register-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo h1 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 2rem;
      font-weight: 700;
    }

    .logo p {
      margin: 0 0 24px 0;
      color: #718096;
      font-size: 1rem;
    }

    .wizard-steps {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      opacity: 0.4;
      transition: opacity 0.2s;
    }

    .step.active {
      opacity: 1;
    }

    .step.completed {
      opacity: 0.8;
    }

    .step-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      transition: all 0.2s;
    }

    .step.active .step-circle {
      background: #4299e1;
      color: white;
    }

    .step.completed .step-circle {
      background: #48bb78;
      color: white;
    }

    .step-title {
      font-size: 0.8rem;
      color: #4a5568;
      text-align: center;
      max-width: 80px;
    }

    .form-step {
      margin-bottom: 32px;
    }

    .form-step h2 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 1.5rem;
    }

    .step-description {
      margin: 0 0 24px 0;
      color: #718096;
      font-size: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 600px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #2d3748;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.2s;
      background: #f7fafc;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #4299e1;
      background: white;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }

    .form-input.error, .form-select.error {
      border-color: #e53e3e;
      background: #fed7d7;
    }

    .form-input.checking {
      border-color: #ed8936;
      background: #fef5e7;
    }

    .password-input {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .password-toggle:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .password-strength {
      margin-top: 8px;
    }

    .strength-bar {
      width: 100%;
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .strength-fill {
      height: 100%;
      transition: all 0.3s;
      border-radius: 2px;
    }

    .strength-fill.weak {
      background: #e53e3e;
    }

    .strength-fill.fair {
      background: #ed8936;
    }

    .strength-fill.good {
      background: #38a169;
    }

    .strength-fill.strong {
      background: #48bb78;
    }

    .strength-text {
      font-size: 0.8rem;
      color: #4a5568;
    }

    .password-requirements {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .requirement {
      font-size: 0.85rem;
      color: #e53e3e;
      transition: color 0.2s;
    }

    .requirement.met {
      color: #38a169;
    }

    .checkbox-group {
      margin-bottom: 16px;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      font-size: 0.95rem;
      line-height: 1.4;
    }

    .checkbox-input {
      width: 18px;
      height: 18px;
      margin-top: 2px;
    }

    .terms-section {
      background: #f7fafc;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
    }

    .registration-summary {
      background: #ebf8ff;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #bee3f8;
      margin-top: 24px;
    }

    .registration-summary h3 {
      margin: 0 0 16px 0;
      color: #2b6cb0;
      font-size: 1.1rem;
    }

    .summary-item {
      margin-bottom: 8px;
      color: #2c5282;
      font-size: 0.95rem;
    }

    .error-message {
      color: #e53e3e;
      font-size: 0.85rem;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .info-message {
      color: #2b6cb0;
      font-size: 0.85rem;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 32px;
    }

    .btn-primary, .btn-secondary {
      padding: 14px 28px;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      flex: 1;
      max-width: 200px;
    }

    .btn-primary {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--flat-surface-bg); /* FIXED (verify-ux) */
      transform: translateY(-1px);
      box-shadow: 0 10px 25px rgba(66, 153, 225, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
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

    .loading {
      display: inline-block;
      animation: pulse 1.5s infinite;
    }

    .register-error {
      background: #fed7d7;
      color: #c53030;
      padding: 12px 16px;
      border-radius: 8px;
      text-align: center;
      font-size: 0.9rem;
      margin-top: 16px;
    }

    .register-footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }

    .link {
      color: #4299e1;
      text-decoration: none;
      font-weight: 600;
    }

    .link:hover {
      color: #3182ce;
      text-decoration: underline;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @media (max-width: 600px) {
      .register-card {
        padding: 24px;
        margin: 16px;
      }
      
      .wizard-steps {
        gap: 12px;
      }
      
      .step-title {
        font-size: 0.7rem;
        max-width: 60px;
      }
      
      .form-actions {
        flex-direction: column;
      }
      
      .password-requirements {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  currentStep = 1;
  isLoading = false;
  isCheckingEmail = false;
  showPassword = false;
  errorMessage = '';

  steps: WizardStep[] = [
    { id: 1, title: 'Personal', icon: '👤', completed: false, active: true },
    { id: 2, title: 'Credenciales', icon: '🔒', completed: false, active: false },
    { id: 3, title: 'Profesional', icon: '🏢', completed: false, active: false },
    { id: 4, title: 'Términos', icon: '✅', completed: false, active: false }
  ];

  passwordRequirements = {
    length: false,
    uppercase: false,
    number: false,
    symbol: false
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.setupPasswordValidation();
    this.setupEmailValidation();
  }

  private createForm(): void {
    this.registerForm = this.fb.group({
      // Step 1: Personal Information
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email, this.corporateEmailValidator], [this.emailAvailabilityValidator.bind(this)]],
      phone: ['', [Validators.required, CustomValidators.mexicanPhone]],
      
      // Step 2: Credentials
      password: ['', [Validators.required, this.strongPasswordValidator]],
      confirmPassword: ['', [Validators.required]],
      
      // Step 3: Professional Info
      empleadoId: [''],
      sucursal: ['', [Validators.required]],
      supervisor: ['', [Validators.email]],
      
      // Step 4: Terms
      acceptTerms: [false, [Validators.requiredTrue]],
      acceptPrivacy: [false, [Validators.requiredTrue]]
    }, {
      validators: [this.passwordMatchValidator]
    });
  }

  private setupPasswordValidation(): void {
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      if (password) {
        this.passwordRequirements = {
          length: password.length >= 8,
          uppercase: /[A-Z]/.test(password),
          number: /[0-9]/.test(password),
          symbol: /[^A-Za-z0-9]/.test(password)
        };
      }
    });
  }

  private setupEmailValidation(): void {
    this.registerForm.get('email')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      // The async validator will handle this
    });
  }

  // Validators
  private corporateEmailValidator(control: AbstractControl) {
    if (!control.value) return null;
    
    const email = control.value.toLowerCase();
    if (!email.endsWith('@conductores.com')) {
      return { corporate: true };
    }
    return null;
  }

  private emailAvailabilityValidator(control: AbstractControl) {
    if (!control.value || !control.value.includes('@')) {
      return of(null);
    }

    this.isCheckingEmail = true;
    
    // Simulate API call to check email availability
    return of(null).pipe(
      delay(1000),
      map(() => {
        this.isCheckingEmail = false;
        // Simulate some emails being taken
        const takenEmails = [
          'admin@conductores.com',
          'supervisor@conductores.com',
          'test@conductores.com'
        ];
        
        if (takenEmails.includes(control.value.toLowerCase())) {
          return { emailTaken: true };
        }
        return null;
      })
    );
  }

  private strongPasswordValidator(control: AbstractControl) {
    if (!control.value) return null;
    
    const password = control.value;
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password)
    };
    
    const isValid = Object.values(requirements).every(req => req);
    return isValid ? null : { strongPassword: true };
  }

  private passwordMatchValidator(form: AbstractControl) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      if (confirmPassword.errors) {
        delete confirmPassword.errors['mismatch'];
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
    }
    return null;
  }

  // Form Navigation
  nextStep(): void {
    if (this.canProceedToNext()) {
      this.steps[this.currentStep - 1].completed = true;
      this.steps[this.currentStep - 1].active = false;
      
      this.currentStep++;
      
      if (this.currentStep <= 4) {
        this.steps[this.currentStep - 1].active = true;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.steps[this.currentStep - 1].active = false;
      this.steps[this.currentStep - 2].completed = false;
      
      this.currentStep--;
      this.steps[this.currentStep - 1].active = true;
    }
  }

  canProceedToNext(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.isStepValid(['firstName', 'lastName', 'email', 'phone']);
      case 2:
        return this.isStepValid(['password', 'confirmPassword']);
      case 3:
        return this.isStepValid(['sucursal']);
      default:
        return false;
    }
  }

  private isStepValid(fields: string[]): boolean {
    return fields.every(field => {
      const control = this.registerForm.get(field);
      return control && control.valid;
    });
  }

  // Password Strength
  getPasswordStrength(): number {
    const requirements = Object.values(this.passwordRequirements);
    const met = requirements.filter(req => req).length;
    return (met / requirements.length) * 100;
  }

  getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength < 25) return 'weak';
    if (strength < 50) return 'fair';
    if (strength < 75) return 'good';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength < 25) return 'Débil';
    if (strength < 50) return 'Regular';
    if (strength < 75) return 'Buena';
    return 'Fuerte';
  }

  // Utility Methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  getFormValue(fieldName: string): string {
    return this.registerForm.get(fieldName)?.value || '';
  }

  getSucursalLabel(value: string): string {
    const labels: { [key: string]: string } = {
      'aguascalientes': 'Aguascalientes',
      'edomex-norte': 'Estado de México - Norte',
      'edomex-sur': 'Estado de México - Sur',
      'oficina-central': 'Oficina Central'
    };
    return labels[value] || value;
  }

  // Form Submission
  onSubmit(): void {
    if (this.registerForm.valid && this.currentStep === 4) {
      this.isLoading = true;
      this.errorMessage = '';

      const registrationData: RegistrationData = this.registerForm.value;
      
      // Call the auth service to register
      this.authService.register(registrationData).subscribe({
        next: (response) => {
          this.toast.success('¡Registro exitoso! Revisa tu email para verificar tu cuenta.');
          this.router.navigate(['/login'], { 
            queryParams: { registered: 'true', email: registrationData.email } 
          });
        },
        error: (error) => {
          this.errorMessage = error.message || 'Error al crear la cuenta. Intenta nuevamente.';
          this.isLoading = false;
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }
}