import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { CustomValidators } from '../../../validators/custom-validators';
import { of } from 'rxjs';
import { map, delay, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { IconComponent } from '../../shared/icon/icon.component';

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
  imports: [CommonModule, ReactiveFormsModule, RouterModule, IconComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  currentStep = 1;
  isLoading = false;
  isCheckingEmail = false;
  showPassword = false;
  errorMessage = '';

  steps: WizardStep[] = [
    { id: 1, title: 'Personal', icon: 'user', completed: false, active: true },
    { id: 2, title: 'Credenciales', icon: 'lock', completed: false, active: false },
    { id: 3, title: 'Profesional', icon: 'building', completed: false, active: false },
    { id: 4, title: 'Términos', icon: 'check-circle', completed: false, active: false }
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
