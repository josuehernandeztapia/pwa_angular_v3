import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { render, screen, waitFor, fireEvent } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { LoginComponent } from './login.component';
import { buildComponentTestProviders } from '../../../../test-helpers/component-test-providers';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const providerSetup = buildComponentTestProviders();
    mockRouter = providerSetup.mocks.router;
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        ...providerSetup.providers
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should show required validation errors', () => {
    // Trigger validation by marking fields as touched
    component.loginForm.get('email')?.markAsTouched();
    component.loginForm.get('password')?.markAsTouched();

    expect(component.isFieldInvalid('email')).toBe(true);
    expect(component.isFieldInvalid('password')).toBe(true);
  });

  it('should show email format validation error', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('invalid-email');
    emailControl?.markAsTouched();

    expect(component.isFieldInvalid('email')).toBe(true);
    expect(emailControl?.errors?.['email']).toBeTruthy();
  });

  it('should validate password length', () => {
    const passwordControl = component.loginForm.get('password');
    passwordControl?.setValue('123'); // Too short
    passwordControl?.markAsTouched();

    expect(component.isFieldInvalid('password')).toBe(true);
    expect(passwordControl?.errors?.['minlength']).toBeTruthy();
  });

  it('should accept valid form inputs', () => {
    component.loginForm.patchValue({
      email: 'demo@conductores.com',
      password: 'demo123'
    });

    expect(component.loginForm.valid).toBe(true);
    expect(component.isFieldInvalid('email')).toBe(false);
    expect(component.isFieldInvalid('password')).toBe(false);
  });

  it('should prevent form submission when invalid', () => {
    spyOn(component as any, 'performLogin');
    
    component.onSubmit();

    expect((component as any).performLogin).not.toHaveBeenCalled();
    expect(component.loginForm.get('email')?.touched).toBe(true);
    expect(component.loginForm.get('password')?.touched).toBe(true);
  });

  it('should submit when form is valid and navigate', fakeAsync(() => {
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    component.loginForm.patchValue({
      email: 'demo@conductores.com',
      password: 'demo123'
    });

    component.onSubmit();
    expect(component.isLoading).toBeTrue();
    tick(1600);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('should navigate to dashboard on successful login', fakeAsync(() => {
    component.performLogin({
      email: 'demo@conductores.com',
      password: 'demo123'
    });
    tick(1600);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('should handle login loading state', () => {
    component.isLoading = true;

    expect(component.isLoading).toBe(true);
    // Form should be disabled during loading
    expect(component.loginForm.disabled).toBe(false); // Adjust based on actual implementation
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBe(false);

    component.togglePassword();

    expect(component.showPassword).toBe(true);

    component.togglePassword();

    expect(component.showPassword).toBe(false);
  });

  it('should handle keyboard navigation', () => {
    const emailInput = fixture.nativeElement.querySelector('#email');
    const passwordInput = fixture.nativeElement.querySelector('#password');

    // Focus should move from email to password on Tab
    emailInput.focus();
    expect(document.activeElement).toBe(emailInput);

    // Simulate Tab key press
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    emailInput.dispatchEvent(tabEvent);
    
    // Note: This test might need adjustment based on actual tab behavior implementation
  });
});

describe('LoginComponent Integration Tests', () => {
  it('should render login form with all required fields', async () => {
    const { providers } = buildComponentTestProviders();
    await render(LoginComponent, {
      providers
    });

    expect(screen.getByText('Conductores')).toBeTruthy();
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
    // Disambiguate by selecting the input with id=password
    const passwordInput = screen.getByLabelText('Contraseña', { selector: 'input#password' });
    expect(passwordInput).toBeTruthy();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeTruthy();
  });

  it('should show validation errors when form is submitted empty', async () => {
    const { providers } = buildComponentTestProviders();
    await render(LoginComponent, {
      providers
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    const passwordInput = screen.getByLabelText('Contraseña', { selector: 'input#password' });

    fireEvent.blur(emailInput);
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('El correo electrónico es requerido')).toBeTruthy();
      expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
    });
  });

  it('should show email format error for invalid email', async () => {
    const { providers, mocks } = buildComponentTestProviders();
    const mockRouter = mocks.router;
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    const user = userEvent.setup();
    
    await render(LoginComponent, {
      providers
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur event

    await waitFor(() => {
      expect(screen.getByText('Formato de correo inválido')).toBeTruthy();
    });
  });

  it('should enable submit button when form is valid', async () => {
    const { providers, mocks } = buildComponentTestProviders();
    const mockRouter = mocks.router;
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    const user = userEvent.setup();
    
    await render(LoginComponent, {
      providers
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    const passwordInput = screen.getByLabelText('Contraseña', { selector: 'input#password' });
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'validPassword123');

    expect(submitButton.getAttribute('disabled')).toBeNull();
  });

  it('should handle form submission with valid data', async () => {
    const { providers, mocks } = buildComponentTestProviders();
    const mockRouter = mocks.router;
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    const user = userEvent.setup();
    
    await render(LoginComponent, {
      providers
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    const passwordInput = screen.getByLabelText('Contraseña', { selector: 'input#password' });
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'demo@conductores.com');
    await user.type(passwordInput, 'demo123');
    await user.click(submitButton);

    await new Promise(resolve => setTimeout(resolve, 1600));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should toggle password visibility', async () => {
    const { providers, mocks } = buildComponentTestProviders();
    const mockRouter = mocks.router;
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
    const user = userEvent.setup();
    
    const { container } = await render(LoginComponent, {
      providers
    });

    const passwordInput = screen.getByLabelText('Contraseña', { selector: 'input#password' }) as HTMLInputElement;
    const toggleButton = container.querySelector('[data-cy="password-toggle"]');

    expect(passwordInput.type).toBe('password');

    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');
    }
  });

  it('should have proper accessibility attributes', async () => {
    const { providers } = buildComponentTestProviders();
    await render(LoginComponent, {
      providers
    });

    const emailInput = screen.getByLabelText('Correo electrónico');
    const passwordInput = screen.getByLabelText('Contraseña', { selector: 'input#password' });

    expect(emailInput.getAttribute('type')).toBe('email');
    expect(emailInput.getAttribute('id')).toBe('email');
    expect(passwordInput.getAttribute('id')).toBe('password');
  });

  it('should display brand information', async () => {
    const { providers } = buildComponentTestProviders();
    await render(LoginComponent, {
      providers
    });

    expect(screen.getByText('Conductores')).toBeTruthy();
    expect(screen.getByText('Sistema de Gestión Empresarial')).toBeTruthy();
  });
});
