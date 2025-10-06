import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, map, catchError, tap } from 'rxjs/operators';

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
  private bffBaseUrl = 'http://localhost:3000'; // BFF URL

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
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
        console.warn('[AuthService] Failed to restore persisted session', error);
        this.logout();
      }
    }
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.bffBaseUrl}/auth/login`, {
      email: credentials.email,
      password: credentials.password
    }).pipe(
      tap(response => {
        this.setAuthData(response, credentials.rememberMe);
        console.log('[AuthService] Login successful', { user: response.user.name, role: response.user.role });
      }),
      catchError(error => {
        console.warn('[AuthService] Login failed', { email: credentials.email, error });
        const errorMessage = error.error?.message || 'Credenciales incorrectas';
        return throwError(() => new Error(errorMessage));
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

    return this.http.post<AuthResponse>(`${this.bffBaseUrl}/auth/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    }).pipe(
      tap(response => {
        this.setAuthData(response);
        console.log('[AuthService] Token refreshed successfully');
      }),
      catchError(error => {
        console.warn('[AuthService] Refresh token failed', error);
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
        console.error('[AuthService] Profile update failed', error);
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
        console.warn('[AuthService] Change password failed', error);
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
        const resetRequests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
        resetRequests.push({
          email,
          requestedAt: new Date().toISOString()
        });
        localStorage.setItem('passwordResetRequests', JSON.stringify(resetRequests));
        console.info('[AuthService] Password reset email simulated', { email });
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

    // For BFF tokens, we can validate them via API
    return false; // Let BFF handle token validation
  }

  /**
   * Validate token with BFF
   */
  validateToken(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token available'));
    }

    return this.http.post(`${this.bffBaseUrl}/auth/validate`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).pipe(
      catchError(error => {
        console.warn('[AuthService] Token validation failed', error);
        this.logout();
        return throwError(() => new Error('Token validation failed'));
      })
    );
  }

  /**
   * Get demo users for login UI
   */
  getDemoUsers(): Observable<any> {
    return this.http.get(`${this.bffBaseUrl}/auth/demo-users`).pipe(
      catchError(error => {
        console.warn('[AuthService] Failed to fetch demo users', error);
        // Fallback to local demo users for UI
        return of({
          users: [
            { email: 'asesor@conductores.com', role: 'asesor', name: 'Ana Torres' },
            { email: 'supervisor@conductores.com', role: 'supervisor', name: 'Carlos Mendez' },
            { email: 'admin@conductores.com', role: 'admin', name: 'Maria Rodriguez' }
          ],
          message: 'Usuarios demo disponibles para testing'
        });
      })
    );
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
        const existingEmails = [
          'asesor@conductores.com',
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

        const pendingRegistration = {
          ...registrationData,
          userId: response.userId,
          status: 'PENDING_EMAIL_VERIFICATION',
          createdAt: new Date().toISOString(),
          verificationToken: 'verify_' + Date.now()
        };

        const pendingRegistrations = JSON.parse(
          localStorage.getItem('pendingRegistrations') || '[]'
        );
        pendingRegistrations.push(pendingRegistration);
        localStorage.setItem('pendingRegistrations', JSON.stringify(pendingRegistrations));

        console.info('[AuthService] Verification email simulated', {
          to: registrationData.email,
          subject: 'Verificar tu cuenta - Conductores PWA',
          verificationLink: `${window.location.origin}/verify-email?token=${pendingRegistration.verificationToken}`
        });

        if (registrationData.supervisor) {
          console.info('[AuthService] Supervisor notification simulated', {
            to: registrationData.supervisor,
            subject: 'Nueva solicitud de registro - Conductores PWA',
            newUser: `${registrationData.firstName} ${registrationData.lastName}`
          });
        }

        return response;
      }),
      catchError(error => {
        console.error('[AuthService] Registration failed', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify email token and promote pending registrations when appropriate.
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
        console.error('[AuthService] Email verification failed', error);
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
          'asesor@conductores.com',
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
