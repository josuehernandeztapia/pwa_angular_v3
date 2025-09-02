import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  company: string;
  avatar?: string;
  lastLogin: Date;
  memberSince: Date;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="perfil-container">
      <header class="page-header">
        <h1>👤 Mi Perfil</h1>
        <p class="page-description">Gestiona tu información personal y configuración de cuenta</p>
      </header>

      <main class="page-main">
        <div class="profile-content">
          <!-- Profile Summary Card -->
          <div class="profile-summary">
            <div class="profile-avatar">
              <div class="avatar-circle" [class.has-image]="userProfile.avatar">
                <img *ngIf="userProfile.avatar" [src]="userProfile.avatar" [alt]="userProfile.firstName">
                <span *ngIf="!userProfile.avatar" class="avatar-initials">
                  {{ getInitials() }}
                </span>
              </div>
              <button class="change-avatar-btn" (click)="changeAvatar()">
                📷 Cambiar Foto
              </button>
            </div>
            
            <div class="profile-summary-info">
              <h2>{{ userProfile.firstName }} {{ userProfile.lastName }}</h2>
              <p class="user-position">{{ userProfile.position }}</p>
              <p class="user-company">{{ userProfile.company }}</p>
              
              <div class="profile-stats">
                <div class="stat-item">
                  <span class="stat-label">Último acceso</span>
                  <span class="stat-value">{{ userProfile.lastLogin | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Miembro desde</span>
                  <span class="stat-value">{{ userProfile.memberSince | date:'MMM yyyy' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Profile Form -->
          <div class="profile-form-section">
            <div class="section-header">
              <h3>✏️ Información Personal</h3>
              <button 
                class="edit-toggle-btn"
                [class.active]="isEditing"
                (click)="toggleEdit()"
              >
                {{ isEditing ? '❌ Cancelar' : '✏️ Editar' }}
              </button>
            </div>
            
            <form class="profile-form" (ngSubmit)="saveProfile()">
              <div class="form-row">
                <div class="form-group">
                  <label>Nombre</label>
                  <input 
                    type="text" 
                    [(ngModel)]="userProfile.firstName"
                    name="firstName"
                    [disabled]="!isEditing"
                    class="form-input"
                  >
                </div>
                <div class="form-group">
                  <label>Apellidos</label>
                  <input 
                    type="text" 
                    [(ngModel)]="userProfile.lastName"
                    name="lastName"
                    [disabled]="!isEditing"
                    class="form-input"
                  >
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    [(ngModel)]="userProfile.email"
                    name="email"
                    [disabled]="!isEditing"
                    class="form-input"
                  >
                </div>
                <div class="form-group">
                  <label>Teléfono</label>
                  <input 
                    type="tel" 
                    [(ngModel)]="userProfile.phone"
                    name="phone"
                    [disabled]="!isEditing"
                    class="form-input"
                  >
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Puesto</label>
                  <input 
                    type="text" 
                    [(ngModel)]="userProfile.position"
                    name="position"
                    [disabled]="!isEditing"
                    class="form-input"
                  >
                </div>
                <div class="form-group">
                  <label>Empresa</label>
                  <input 
                    type="text" 
                    [(ngModel)]="userProfile.company"
                    name="company"
                    [disabled]="!isEditing"
                    class="form-input"
                  >
                </div>
              </div>
              
              <div class="form-actions" *ngIf="isEditing">
                <button type="button" class="btn-secondary" (click)="cancelEdit()">
                  Cancelar
                </button>
                <button type="submit" class="btn-primary">
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>

          <!-- Security Section -->
          <div class="security-section">
            <h3>🔒 Seguridad de la Cuenta</h3>
            <div class="security-options">
              <div class="security-item">
                <div class="security-info">
                  <h4>Cambiar Contraseña</h4>
                  <p>Actualiza tu contraseña por seguridad</p>
                </div>
                <button class="btn-tertiary" (click)="changePassword()">
                  Cambiar
                </button>
              </div>
              
              <div class="security-item">
                <div class="security-info">
                  <h4>Verificación en Dos Pasos</h4>
                  <p>Agrega una capa extra de seguridad</p>
                </div>
                <button class="btn-tertiary" (click)="setup2FA()">
                  Configurar
                </button>
              </div>
              
              <div class="security-item">
                <div class="security-info">
                  <h4>Sesiones Activas</h4>
                  <p>Revisa dónde has iniciado sesión</p>
                </div>
                <button class="btn-tertiary" (click)="viewSessions()">
                  Ver Sesiones
                </button>
              </div>
            </div>
          </div>

          <!-- Account Actions -->
          <div class="account-actions">
            <h3>⚙️ Acciones de Cuenta</h3>
            <div class="action-buttons">
              <button class="btn-export" (click)="exportData()">
                📤 Exportar Mis Datos
              </button>
              <button class="btn-danger" (click)="deleteAccount()">
                🗑️ Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .perfil-container {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .page-header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 2rem;
      font-weight: 700;
    }

    .page-description {
      margin: 0;
      color: #718096;
      font-size: 1.1rem;
    }

    .profile-content {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .profile-summary {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 32px;
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .profile-avatar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .avatar-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: #f7fafc;
      border: 3px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .avatar-circle img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-initials {
      font-size: 2rem;
      font-weight: 700;
      color: #4a5568;
    }

    .change-avatar-btn {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .change-avatar-btn:hover {
      background: #edf2f7;
    }

    .profile-summary-info {
      flex: 1;
    }

    .profile-summary-info h2 {
      margin: 0 0 8px 0;
      color: #2d3748;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .user-position {
      margin: 0 0 4px 0;
      color: #4299e1;
      font-weight: 600;
      font-size: 1.1rem;
    }

    .user-company {
      margin: 0 0 20px 0;
      color: #718096;
      font-size: 1rem;
    }

    .profile-stats {
      display: flex;
      gap: 32px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #718096;
      text-transform: uppercase;
      font-weight: 600;
    }

    .stat-value {
      color: #2d3748;
      font-weight: 600;
    }

    .profile-form-section, .security-section, .account-actions {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .section-header h3 {
      margin: 0;
      color: #2d3748;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .edit-toggle-btn {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #f7fafc;
      color: #4a5568;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .edit-toggle-btn:hover {
      background: #edf2f7;
    }

    .edit-toggle-btn.active {
      background: #fed7d7;
      color: #742a2a;
      border-color: #fc8181;
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-weight: 600;
      color: #4a5568;
      font-size: 0.9rem;
    }

    .form-input {
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: #4299e1;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }

    .form-input:disabled {
      background: #f7fafc;
      color: #718096;
      cursor: not-allowed;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }

    .btn-primary, .btn-secondary, .btn-tertiary, .btn-export, .btn-danger {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #4299e1, #3182ce);
      color: white;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #3182ce, #2c5282);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #edf2f7;
    }

    .btn-tertiary {
      background: transparent;
      color: #4299e1;
      border: 1px solid #4299e1;
    }

    .btn-tertiary:hover {
      background: #4299e1;
      color: white;
    }

    .security-section h3, .account-actions h3 {
      margin: 0 0 20px 0;
      color: #2d3748;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .security-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .security-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: #f7fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .security-info h4 {
      margin: 0 0 4px 0;
      color: #2d3748;
      font-weight: 600;
    }

    .security-info p {
      margin: 0;
      color: #718096;
      font-size: 0.9rem;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
    }

    .btn-export {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }

    .btn-export:hover {
      background: #edf2f7;
    }

    .btn-danger {
      background: #fed7d7;
      color: #742a2a;
      border: 1px solid #fc8181;
    }

    .btn-danger:hover {
      background: #fbb6ce;
      color: #742a2a;
    }

    @media (max-width: 768px) {
      .perfil-container {
        padding: 16px;
      }

      .profile-summary {
        flex-direction: column;
        text-align: center;
      }

      .profile-stats {
        justify-content: center;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .security-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class PerfilComponent implements OnInit {
  isEditing = false;
  
  userProfile: UserProfile = {
    id: 'USR-001',
    firstName: 'José Luis',
    lastName: 'González Martínez',
    email: 'jose.gonzalez@conductores.com',
    phone: '+52 449 123 4567',
    position: 'Gerente de Operaciones',
    company: 'Transportes González y Asociados',
    lastLogin: new Date(),
    memberSince: new Date(2023, 0, 15)
  };

  private originalProfile: UserProfile = { ...this.userProfile };

  ngOnInit(): void {
    this.loadUserProfile();
  }

  getInitials(): string {
    const first = this.userProfile.firstName.charAt(0).toUpperCase();
    const last = this.userProfile.lastName.charAt(0).toUpperCase();
    return first + last;
  }

  toggleEdit(): void {
    if (this.isEditing) {
      this.cancelEdit();
    } else {
      this.isEditing = true;
      this.originalProfile = { ...this.userProfile };
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.userProfile = { ...this.originalProfile };
  }

  saveProfile(): void {
    console.log('Guardando perfil:', this.userProfile);
    this.isEditing = false;
    this.originalProfile = { ...this.userProfile };
    // Here you would typically save to a service
  }

  changeAvatar(): void {
    console.log('Cambiar avatar del usuario');
    // Here you would implement file upload logic
  }

  changePassword(): void {
    console.log('Cambiar contraseña');
    // Here you would open a password change dialog
  }

  setup2FA(): void {
    console.log('Configurar autenticación de dos factores');
    // Here you would open 2FA setup wizard
  }

  viewSessions(): void {
    console.log('Ver sesiones activas');
    // Here you would show active sessions list
  }

  exportData(): void {
    console.log('Exportar datos del usuario');
    // Here you would trigger data export
  }

  deleteAccount(): void {
    console.log('Eliminar cuenta - requiere confirmación');
    // Here you would show confirmation dialog
  }

  private loadUserProfile(): void {
    // Here you would load user profile from a service
    console.log('Cargando perfil del usuario');
  }
}