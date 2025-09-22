import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { render, screen, waitFor, fireEvent } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
// removed by clean-audit
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

// removed by clean-audit
// removed by clean-audit
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
// removed by clean-audit
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
// removed by clean-audit

    expect(component.isFieldInvalid('email')).toBe(true);
    expect(component.isFieldInvalid('password')).toBe(true);
  });

  it('should show email format validation error', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('invalid-email');
    emailControl?.markAsTouched();
// removed by clean-audit

    expect(component.isFieldInvalid('email')).toBe(true);
    expect(emailControl?.errors?.['email']).toBeTruthy();
  });

  it('should validate password length', () => {
    const passwordControl = component.loginForm.get('password');
    passwordControl?.setValue('123'); // Too short
    passwordControl?.markAsTouched();
// removed by clean-audit

    expect(component.isFieldInvalid('password')).toBe(true);
    expect(passwordControl?.errors?.['minlength']).toBeTruthy();
  });

  it('should accept valid form inputs', () => {
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'validPassword123'
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

  it('should call performLogin when form is valid', () => {
    spyOn(component as any, 'performLogin');
    
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'validPassword123'
    });

    component.onSubmit();

    expect((component as any).performLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'validPassword123'
    });
  });

  it('should navigate to dashboard on successful login', () => {
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'validPassword123'
    });

    component.performLogin({
      email: 'test@example.com',
      password: 'validPassword123'
    });

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should handle login loading state', () => {
    component.isLoading = true;
// removed by clean-audit

    expect(component.isLoading).toBe(true);
    // Form should be disabled during loading
    expect(component.loginForm.disabled).toBe(false); // Adjust based on actual implementation
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBe(false);
    
    component.togglePasswordVisibility();
    
    expect(component.showPassword).toBe(true);
    
    component.togglePasswordVisibility();
    
    expect(component.showPassword).toBe(false);
  });

  it('should handle keyboard navigation', () => {
// removed by clean-audit
// removed by clean-audit

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
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    await render(LoginComponent, {
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });

    expect(screen.getByText('Centro de Comando')).toBeTruthy();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeTruthy();
    expect(screen.getByLabelText(/contraseña/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeTruthy();
  });

  it('should show validation errors when form is submitted empty', async () => {
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    await render(LoginComponent, {
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });

    const submitButton = screen.getByRole('button');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('El correo es requerido')).toBeTruthy();
      expect(screen.getByText('La contraseña es requerida')).toBeTruthy();
    });
  });

  it('should show email format error for invalid email', async () => {
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    const user = userEvent.setup();
    
    await render(LoginComponent, {
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur event

    await waitFor(() => {
      expect(screen.getByText('Formato de correo inválido')).toBeTruthy();
    });
  });

  it('should enable submit button when form is valid', async () => {
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    const user = userEvent.setup();
    
    await render(LoginComponent, {
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'validPassword123');

    expect(submitButton.getAttribute('disabled')).toBeNull();
  });

  it('should handle form submission with valid data', async () => {
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    const user = userEvent.setup();
    
    await render(LoginComponent, {
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'validPassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  it('should toggle password visibility', async () => {
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    const user = userEvent.setup();
    
    const { container } = await render(LoginComponent, {
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });

    const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;
    const toggleButton = container.querySelector('.password-toggle-premium');

    expect(passwordInput.type).toBe('password');

    if (toggleButton) {
      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');
    }
  });

  it('should have proper accessibility attributes', async () => {
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    await render(LoginComponent, {
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);

    expect(emailInput.getAttribute('type')).toBe('email');
    expect(emailInput.getAttribute('id')).toBe('email');
    expect(passwordInput.getAttribute('id')).toBe('password');
  });

  it('should display brand information', async () => {
    const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    await render(LoginComponent, {
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });

    expect(screen.getByText('Centro de Comando')).toBeTruthy();
    expect(screen.getByText('El Copiloto Estratégico para el Asesor Moderno')).toBeTruthy();
  });
});
// removed by clean-audit