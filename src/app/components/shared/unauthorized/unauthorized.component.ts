import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss']
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
    // This would typically open a contact form or send an email
    window.open('mailto:supervisor@conductores.com?subject=Solicitud de Permisos', '_blank');
  }

  viewPermissions(): void {
    // This would show a modal with detailed permissions
    alert('Tus permisos actuales:\n' + this.currentUser?.permissions.join('\n'));
  }

  requestAccess(): void {
    // This would open a form to request additional access
    this.router.navigate(['/solicitar-acceso']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
