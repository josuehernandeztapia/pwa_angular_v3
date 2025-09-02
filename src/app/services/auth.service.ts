import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';

export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  empleadoId?: string;
  sucursal: string;
  supervisor?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export interface RegistrationResponse {
  message: string;
  userId: string;
  emailSent: boolean;
  approvalRequired: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'asesor' | 'supervisor' | 'admin';
  permissions: string[];
  avatarUrl?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'current_user';

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuth(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userData = localStorage.getItem(this.userKey);

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.logout();
      }
    }
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // Demo credentials for development
    const demoUsers = [
      {
        email: 'demo@conductores.com',
        password: 'demo123',
        user: {
          id: '1',
          name: 'Asesor Demo',
          email: 'demo@conductores.com',
          role: 'asesor' as const,
          permissions: ['read:clients', 'write:quotes', 'read:reports'],
          avatarUrl: 'https://picsum.photos/seed/demo/100/100'
        }
      },
      {
        email: 'supervisor@conductores.com',
        password: 'super123',
        user: {
          id: '2',
          name: 'Supervisor Demo',
          email: 'supervisor@conductores.com',
          role: 'supervisor' as const,
          permissions: ['read:clients', 'write:quotes', 'read:reports', 'approve:quotes', 'manage:team'],
          avatarUrl: 'https://picsum.photos/seed/supervisor/100/100'
        }
      }
    ];

    // Simulate API call delay
    return of(null).pipe(
      delay(1500), // Simulate network delay
      map(() => {
        const demoUser = demoUsers.find(
          u => u.email === credentials.email && u.password === credentials.password
        );

        if (!demoUser) {
          throw new Error('Invalid credentials');
        }

        const authResponse: AuthResponse = {
          user: demoUser.user,
          token: 'demo_jwt_token_' + Date.now(),
          refreshToken: 'demo_refresh_token_' + Date.now(),
          expiresIn: 3600 // 1 hour
        };

        this.setAuthData(authResponse, credentials.rememberMe);
        return authResponse;
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error('Credenciales incorrectas'));
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('rememberMe');
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions.includes(permission) || false;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Refresh authentication token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    // Simulate refresh token API call
    return of(null).pipe(
      delay(1000),
      map(() => {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser) {
          throw new Error('No current user');
        }

        const authResponse: AuthResponse = {
          user: currentUser,
          token: 'refreshed_jwt_token_' + Date.now(),
          refreshToken: 'new_refresh_token_' + Date.now(),
          expiresIn: 3600
        };

        this.setAuthData(authResponse);
        return authResponse;
      }),
      catchError(error => {
        console.error('Token refresh error:', error);
        this.logout();
        return throwError(() => new Error('Token refresh failed'));
      })
    );
  }

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<User>): Observable<User> {
    const currentUser = this.getCurrentUser();
    
    if (!currentUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    return of(null).pipe(
      delay(1000),
      map(() => {
        const updatedUser = { ...currentUser, ...updates };
        
        localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
        this.currentUserSubject.next(updatedUser);
        
        return updatedUser;
      }),
      catchError(error => {
        console.error('Profile update error:', error);
        return throwError(() => new Error('Failed to update profile'));
      })
    );
  }

  /**
   * Change password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<boolean> {
    // Simulate password change API call
    return of(null).pipe(
      delay(1500),
      map(() => {
        // In a real app, you would validate the current password
        if (currentPassword === 'demo123' && newPassword.length >= 6) {
          return true;
        }
        throw new Error('Invalid current password or new password too short');
      }),
      catchError(error => {
        console.error('Password change error:', error);
        return throwError(() => new Error('Failed to change password'));
      })
    );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<boolean> {
    return of(null).pipe(
      delay(2000),
      map(() => {
        // Simulate sending password reset email
        console.log('Password reset email sent to:', email);
        return true;
      })
    );
  }

  /**
   * Set authentication data in localStorage
   */
  private setAuthData(authResponse: AuthResponse, rememberMe?: boolean): void {
    localStorage.setItem(this.tokenKey, authResponse.token);
    localStorage.setItem(this.refreshTokenKey, authResponse.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(authResponse.user));
    
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }
    
    this.currentUserSubject.next(authResponse.user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Check if token is expired (simplified version)
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    // In a real app, you would decode the JWT and check the expiration
    // For demo purposes, we'll assume token is valid for 1 hour
    const tokenParts = token.split('_');
    const timestampPart = tokenParts.pop();
    const tokenCreated = timestampPart ? parseInt(timestampPart) : 0;
    
    // If parsing failed or token format is invalid, consider expired
    if (isNaN(tokenCreated) || tokenCreated === 0) {
      return true;
    }
    
    const oneHourInMs = 60 * 60 * 1000;
    return Date.now() - tokenCreated > oneHourInMs;
  }

  /**
   * Register new advisor account
   */
  register(registrationData: RegistrationData): Observable<RegistrationResponse> {
    // Validate registration data
    if (!registrationData.acceptTerms || !registrationData.acceptPrivacy) {
      return throwError(() => new Error('Debe aceptar los términos y condiciones'));
    }

    if (registrationData.password !== registrationData.confirmPassword) {
      return throwError(() => new Error('Las contraseñas no coinciden'));
    }

    if (!registrationData.email.endsWith('@conductores.com')) {
      return throwError(() => new Error('Debe usar un correo corporativo'));
    }

    // Simulate registration API call
    return of(null).pipe(
      delay(2000), // Simulate network delay
      map(() => {
        // Check if email already exists (demo validation)
        const existingEmails = [
          'demo@conductores.com',
          'supervisor@conductores.com',
          'admin@conductores.com',
          'test@conductores.com'
        ];

        if (existingEmails.includes(registrationData.email.toLowerCase())) {
          throw new Error('Este correo ya está registrado');
        }

        // Generate registration response
        const response: RegistrationResponse = {
          message: 'Registro exitoso. Se ha enviado un email de verificación.',
          userId: 'user_' + Date.now(),
          emailSent: true,
          approvalRequired: !!registrationData.supervisor
        };

        // Store pending registration for demo purposes
        const pendingRegistration = {
          ...registrationData,
          userId: response.userId,
          status: 'PENDING_EMAIL_VERIFICATION',
          createdAt: new Date().toISOString(),
          verificationToken: 'verify_' + Date.now()
        };

        // Save to localStorage for demo
        const pendingRegistrations = JSON.parse(
          localStorage.getItem('pendingRegistrations') || '[]'
        );
        pendingRegistrations.push(pendingRegistration);
        localStorage.setItem('pendingRegistrations', JSON.stringify(pendingRegistrations));

        console.log('📧 Registration Email Sent:', {
          to: registrationData.email,
          subject: 'Verificar tu cuenta - Conductores PWA',
          verificationLink: `${window.location.origin}/verify-email?token=${pendingRegistration.verificationToken}`
        });

        if (registrationData.supervisor) {
          console.log('📧 Supervisor Notification Sent:', {
            to: registrationData.supervisor,
            subject: 'Nueva solicitud de registro - Conductores PWA',
            newUser: `${registrationData.firstName} ${registrationData.lastName}`
          });
        }

        return response;
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify email token (demo implementation)
   */
  verifyEmail(token: string): Observable<{ message: string; success: boolean }> {
    return of(null).pipe(
      delay(1000),
      map(() => {
        const pendingRegistrations = JSON.parse(
          localStorage.getItem('pendingRegistrations') || '[]'
        );

        const registration = pendingRegistrations.find(
          (reg: any) => reg.verificationToken === token
        );

        if (!registration) {
          throw new Error('Token de verificación inválido o expirado');
        }

        if (registration.status !== 'PENDING_EMAIL_VERIFICATION') {
          throw new Error('Esta cuenta ya ha sido verificada');
        }

        // Update status
        registration.status = registration.supervisor 
          ? 'PENDING_SUPERVISOR_APPROVAL' 
          : 'APPROVED';
        registration.emailVerifiedAt = new Date().toISOString();

        // Update localStorage
        const updatedRegistrations = pendingRegistrations.map((reg: any) =>
          reg.verificationToken === token ? registration : reg
        );
        localStorage.setItem('pendingRegistrations', JSON.stringify(updatedRegistrations));

        const message = registration.supervisor
          ? 'Email verificado. Tu cuenta está pendiente de aprobación por tu supervisor.'
          : 'Email verificado. Tu cuenta ha sido activada.';

        return { message, success: true };
      }),
      catchError(error => {
        console.error('Email verification error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Check email availability
   */
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const existingEmails = [
          'demo@conductores.com',
          'supervisor@conductores.com',
          'admin@conductores.com',
          'test@conductores.com'
        ];

        const pendingRegistrations = JSON.parse(
          localStorage.getItem('pendingRegistrations') || '[]'
        );
        
        const pendingEmails = pendingRegistrations.map((reg: any) => reg.email.toLowerCase());
        const allTakenEmails = [...existingEmails, ...pendingEmails];

        return { available: !allTakenEmails.includes(email.toLowerCase()) };
      })
    );
  }
}