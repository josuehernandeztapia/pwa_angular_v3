import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <div class="error-illustration">
          <div class="error-icon">🚫</div>
          <div class="error-message">No Autorizado</div>
        </div>
        
        <div class="message-section">
          <h1>Acceso Restringido</h1>
          <p>
            No tienes los permisos necesarios para acceder a esta sección.
            Si crees que esto es un error, contacta a tu supervisor.
          </p>
        </div>

        <div class="user-info" *ngIf="currentUser">
          <div class="user-card">
            <div class="user-avatar">{{ getUserInitials() }}</div>
            <div class="user-details">
              <div class="user-name">{{ currentUser.name }}</div>
              <div class="user-role">{{ getRoleLabel(currentUser.role) }}</div>
              <div class="user-permissions">
                <span class="permission-chip" *ngFor="let permission of currentUser.permissions.slice(0, 3)">
                  {{ getPermissionLabel(permission) }}
                </span>
                <span 
                  class="permission-chip more" 
                  *ngIf="currentUser.permissions.length > 3"
                >
                  +{{ currentUser.permissions.length - 3 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="action-section">
          <button 
            class="btn-primary"
            (click)="goHome()"
          >
            🏠 Volver al Dashboard
          </button>
          
          <button 
            class="btn-secondary"
            (click)="goBack()"
          >
            ⬅️ Regresar
          </button>
        </div>

        <div class="help-section">
          <h3>¿Necesitas más permisos?</h3>
          <div class="help-actions">
            <button class="help-btn" (click)="contactSupervisor()">
              👔 Contactar Supervisor
            </button>
            <button class="help-btn" (click)="viewPermissions()">
              🔍 Ver mis Permisos
            </button>
            <button class="help-btn" (click)="requestAccess()">
              📝 Solicitar Acceso
            </button>
          </div>
        </div>

        <div class="logout-section">
          <p class="logout-text">¿No eres {{ currentUser?.name }}?</p>
          <button class="logout-btn" (click)="logout()">
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
      padding: 20px;
    }

    .unauthorized-content {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(10px);
    }

    .error-illustration {
      margin-bottom: 32px;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 16px;
      animation: shake 0.5s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .error-message {
      font-size: 1.5rem;
      font-weight: 700;
      color: #e53e3e;
      margin-bottom: 8px;
    }

    .message-section {
      margin-bottom: 32px;
    }

    .message-section h1 {
      color: #2d3748;
      font-size: 1.8rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .message-section p {
      color: #718096;
      font-size: 1rem;
      line-height: 1.6;
      margin: 0;
    }

    .user-info {
      margin-bottom: 32px;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f7fafc;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
    }

    .user-avatar {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #4299e1, #3182ce);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.2rem;
      color: white;
      flex-shrink: 0;
    }

    .user-details {
      flex: 1;
      text-align: left;
    }

    .user-name {
      font-weight: 600;
      font-size: 1.1rem;
      color: #2d3748;
      margin-bottom: 4px;
    }

    .user-role {
      color: #4a5568;
      font-size: 0.9rem;
      margin-bottom: 8px;
    }

    .user-permissions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .permission-chip {
      background: #e2e8f0;
      color: #4a5568;
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .permission-chip.more {
      background: #cbd5e0;
    }

    .action-section {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #4299e1, #3182ce);
      color: white;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #3182ce, #2c5282);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(66, 153, 225, 0.3);
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

    .help-section {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      margin-bottom: 24px;
    }

    .help-section h3 {
      color: #2d3748;
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .help-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
    }

    .help-btn {
      background: none;
      border: none;
      color: #4299e1;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 6px;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .help-btn:hover {
      background: rgba(66, 153, 225, 0.1);
      color: #3182ce;
    }

    .logout-section {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }

    .logout-text {
      color: #718096;
      font-size: 0.9rem;
      margin-bottom: 12px;
    }

    .logout-btn {
      background: linear-gradient(135deg, #e53e3e, #c53030);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .logout-btn:hover {
      background: linear-gradient(135deg, #c53030, #9c2626);
      transform: translateY(-1px);
    }

    @media (max-width: 480px) {
      .unauthorized-content {
        padding: 32px 24px;
      }
      
      .user-card {
        flex-direction: column;
        text-align: center;
      }
      
      .user-details {
        text-align: center;
      }
      
      .action-section {
        flex-direction: column;
        align-items: center;
      }
      
      .btn-primary, .btn-secondary {
        width: 100%;
        max-width: 200px;
        justify-content: center;
      }
    }
  `]
})
export class UnauthorizedComponent {
  currentUser$ = this.authService.currentUser$;
  currentUser = this.authService.getCurrentUser();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.goHome();
    }
  }

  getUserInitials(): string {
    if (!this.currentUser) return '??';
    
    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return this.currentUser.name.substring(0, 2).toUpperCase();
  }

  getRoleLabel(role: string): string {
    const roleLabels: Record<string, string> = {
      'asesor': 'Asesor Financiero',
      'supervisor': 'Supervisor',
      'admin': 'Administrador'
    };
    return roleLabels[role] || role;
  }

  getPermissionLabel(permission: string): string {
    const permissionLabels: Record<string, string> = {
      'read:clients': 'Ver Clientes',
      'write:quotes': 'Crear Cotizaciones',
      'read:reports': 'Ver Reportes',
      'approve:quotes': 'Aprobar Cotizaciones',
      'manage:team': 'Gestionar Equipo'
    };
    return permissionLabels[permission] || permission;
  }

  contactSupervisor(): void {
// removed by clean-audit
    // This would typically open a contact form or send an email
    window.open('mailto:supervisor@conductores.com?subject=Solicitud de Permisos', '_blank');
  }

  viewPermissions(): void {
// removed by clean-audit
    // This would show a modal with detailed permissions
    alert('Tus permisos actuales:\n' + this.currentUser?.permissions.join('\n'));
  }

  requestAccess(): void {
// removed by clean-audit
    // This would open a form to request additional access
    this.router.navigate(['/solicitar-acceso']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
// removed by clean-audit