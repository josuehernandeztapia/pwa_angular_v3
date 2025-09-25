import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService, RegistrationData, User, LoginCredentials } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Basic Service Setup', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with no authenticated user', () => {
      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should initialize as not authenticated', () => {
      service.isAuthenticated$.subscribe(isAuth => {
        expect(isAuth).toBeFalse();
      });
    });
  });

  describe('Login Functionality', () => {
    it('should login successfully with valid credentials', (done) => {
      const credentials: LoginCredentials = {
        email: 'asesor@conductores.com',
        password: 'demo123'
      };

      service.login(credentials).subscribe({
        next: (result) => {
          expect(result.token).toBeTruthy();
          expect(result.user.email).toBe(credentials.email);
          expect(result.user.role).toBe('asesor');
          expect(result.expiresIn).toBeGreaterThan(0);
          done();
        },
        error: () => fail('Login should succeed with valid credentials')
      });
    });

    it('should fail login with invalid credentials (logs expected warning)', (done) => {
      spyOn(console, 'warn');
      const credentials: LoginCredentials = {
        email: 'invalid@conductores.com',
        password: 'wrongpass'
      };

      service.login(credentials).subscribe({
        next: () => fail('Login should fail with invalid credentials'),
        error: (error) => {
          expect(error.message).toContain('Credenciales incorrectas');
          expect(console.warn).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should fail login with non-corporate email (logs expected warning)', (done) => {
      spyOn(console, 'warn');
      const credentials: LoginCredentials = {
        email: 'user@gmail.com',
        password: 'anypass'
      };

      service.login(credentials).subscribe({
        next: () => fail('Login should fail with non-corporate email'),
        error: (error) => {
          expect(error.message).toContain('Credenciales incorrectas');
          expect(console.warn).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should set user as authenticated after successful login', (done) => {
      const credentials: LoginCredentials = {
        email: 'asesor@conductores.com',
        password: 'demo123'
      };

      service.login(credentials).subscribe({
        next: () => {
          service.isAuthenticated$.subscribe(isAuth => {
            expect(isAuth).toBeTrue();
            done();
          });
        }
      });
    });

    it('should store token in localStorage after successful login', (done) => {
      const credentials: LoginCredentials = {
        email: 'asesor@conductores.com',
        password: 'demo123'
      };

      service.login(credentials).subscribe({
        next: (result) => {
          const storedToken = localStorage.getItem('auth_token');
          expect(storedToken).toBe(result.token);
          done();
        }
      });
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      // Set up a valid token in localStorage
      const mockToken = `demo_jwt_token_${Date.now()}`;
      const mockRefresh = `demo_refresh_token_${Date.now()}`;
      const mockUser: User = {
        id: '1',
        name: 'Ana Torres',
        email: 'asesor@conductores.com',
        role: 'asesor',
        permissions: ['read:clients']
      };

      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('refresh_token', mockRefresh);
      localStorage.setItem('current_user', JSON.stringify(mockUser));
    });

    it('should retrieve stored token', () => {
      const token = service.getToken();
      expect(token).toBeTruthy();
      expect(token).toContain('demo_jwt_token_');
    });

    it('should detect valid token as not expired', () => {
      const isExpired = service.isTokenExpired();
      expect(isExpired).toBeFalse();
    });

    it('should detect old token as expired', () => {
      // Set an old timestamp token
      const oldToken = 'demo_jwt_token_' + (Date.now() - (2 * 60 * 60 * 1000));
      localStorage.setItem('auth_token', oldToken);
      
      const isExpired = service.isTokenExpired();
      expect(isExpired).toBeTrue();
    });

    it('should detect invalid token format as expired', () => {
      localStorage.setItem('auth_token', 'invalid-token-format');
      
      const isExpired = service.isTokenExpired();
      expect(isExpired).toBeTrue();
    });
  });

  describe('Registration Functionality', () => {
    let validRegistrationData: RegistrationData;

    beforeEach(() => {
      validRegistrationData = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@conductores.com',
        phone: '+52 449 123 4567',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        sucursal: 'Aguascalientes Centro',
        acceptTerms: true,
        acceptPrivacy: true
      };
    });

    it('should successfully register with valid data', (done) => {
      service.register(validRegistrationData).subscribe({
        next: (response) => {
          expect(response.message).toContain('Registro exitoso');
          expect(response.userId).toBeTruthy();
          expect(response.emailSent).toBeTrue();
          done();
        },
        error: () => fail('Registration should succeed with valid data')
      });
    });

    it('should fail registration without terms acceptance', (done) => {
      validRegistrationData.acceptTerms = false;

      service.register(validRegistrationData).subscribe({
        next: () => fail('Registration should fail without terms acceptance'),
        error: (error) => {
          expect(error.message).toContain('términos y condiciones');
          done();
        }
      });
    });

    it('should fail registration without privacy acceptance', (done) => {
      validRegistrationData.acceptPrivacy = false;

      service.register(validRegistrationData).subscribe({
        next: () => fail('Registration should fail without privacy acceptance'),
        error: (error) => {
          expect(error.message).toContain('términos y condiciones');
          done();
        }
      });
    });

    it('should fail registration with mismatched passwords', (done) => {
      validRegistrationData.confirmPassword = 'DifferentPassword';

      service.register(validRegistrationData).subscribe({
        next: () => fail('Registration should fail with mismatched passwords'),
        error: (error) => {
          expect(error.message).toContain('no coinciden');
          done();
        }
      });
    });

    it('should fail registration with non-corporate email', (done) => {
      validRegistrationData.email = 'juan.perez@gmail.com';

      service.register(validRegistrationData).subscribe({
        next: () => fail('Registration should fail with non-corporate email'),
        error: (error) => {
          expect(error.message).toContain('correo corporativo');
          done();
        }
      });
    });

    it('should fail registration with existing email (logs expected error)', (done) => {
      spyOn(console, 'error');
      validRegistrationData.email = 'asesor@conductores.com';

      service.register(validRegistrationData).subscribe({
        next: () => fail('Registration should fail with existing email'),
        error: (error) => {
          expect(error.message).toContain('ya está registrado');
          expect(console.error).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should store pending registration in localStorage', (done) => {
      service.register(validRegistrationData).subscribe({
        next: (response) => {
          const pendingRegistrations = JSON.parse(
            localStorage.getItem('pendingRegistrations') || '[]'
          );
          
          expect(pendingRegistrations.length).toBeGreaterThan(0);
          const registration = pendingRegistrations.find((reg: any) => 
            reg.userId === response.userId
          );
          expect(registration).toBeTruthy();
          expect(registration.email).toBe(validRegistrationData.email);
          expect(registration.status).toBe('PENDING_EMAIL_VERIFICATION');
          done();
        }
      });
    });
  });

  describe('Email Verification', () => {
    let verificationToken: string;
    
    beforeEach((done) => {
      const registrationData: RegistrationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@conductores.com',
        phone: '+52 449 123 4567',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        sucursal: 'Test Branch',
        acceptTerms: true,
        acceptPrivacy: true
      };

      // Register a user first to get verification token
      service.register(registrationData).subscribe({
        next: () => {
          const pendingRegistrations = JSON.parse(
            localStorage.getItem('pendingRegistrations') || '[]'
          );
          verificationToken = pendingRegistrations[0].verificationToken;
          done();
        }
      });
    });

    it('should successfully verify email with valid token', (done) => {
      service.verifyEmail(verificationToken).subscribe({
        next: (response) => {
          expect(response.success).toBeTrue();
          expect(response.message).toContain('verificado');
          done();
        },
        error: () => fail('Email verification should succeed with valid token')
      });
    });

    it('should fail verification with invalid token', (done) => {
      service.verifyEmail('invalid-token').subscribe({
        next: () => fail('Verification should fail with invalid token'),
        error: (error) => {
          expect(error.message).toContain('inválido o expirado');
          done();
        }
      });
    });

    it('should update registration status after verification', (done) => {
      service.verifyEmail(verificationToken).subscribe({
        next: () => {
          const pendingRegistrations = JSON.parse(
            localStorage.getItem('pendingRegistrations') || '[]'
          );
          const registration = pendingRegistrations.find((reg: any) => 
            reg.verificationToken === verificationToken
          );
          
          expect(registration.status).toBe('APPROVED');
          expect(registration.emailVerifiedAt).toBeTruthy();
          done();
        }
      });
    });
  });

  describe('Email Availability Check', () => {
    it('should return available for new email', (done) => {
      service.checkEmailAvailability('new.user@conductores.com').subscribe({
        next: (result) => {
          expect(result.available).toBeTrue();
          done();
        }
      });
    });

    it('should return not available for existing email', (done) => {
      service.checkEmailAvailability('asesor@conductores.com').subscribe({
        next: (result) => {
          expect(result.available).toBeFalse();
          done();
        }
      });
    });

    it('should return not available for pending registration email', (done) => {
      // First register a user
      const registrationData: RegistrationData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'pending.user@conductores.com',
        phone: '+52 449 123 4567',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        sucursal: 'Test Branch',
        acceptTerms: true,
        acceptPrivacy: true
      };

      service.register(registrationData).subscribe({
        next: () => {
          // Then check availability
          service.checkEmailAvailability('pending.user@conductores.com').subscribe({
            next: (result) => {
              expect(result.available).toBeFalse();
              done();
            }
          });
        }
      });
    });
  });

  describe('Logout Functionality', () => {
    beforeEach((done) => {
      // Login first
      const credentials: LoginCredentials = {
        email: 'asesor@conductores.com',
        password: 'demo123'
      };
      
      service.login(credentials).subscribe({
        next: () => done()
      });
    });

    it('should clear authentication state on logout', () => {
      service.logout();
      
      service.isAuthenticated$.subscribe(isAuth => {
        expect(isAuth).toBeFalse();
      });
    });

    it('should clear user data on logout', () => {
      service.logout();
      
      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
      });
    });

    it('should remove token from localStorage on logout', () => {
      service.logout();
      
      const token = localStorage.getItem('auth_token');
      expect(token).toBeNull();
    });
  });
});
