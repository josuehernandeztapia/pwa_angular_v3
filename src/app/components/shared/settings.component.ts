import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

type SettingsTab = 'profile' | 'integrations';

interface Integration {
  name: string;
  role: string;
  priority: string;
  priorityColor: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-container">
      <h2 class="main-title">Configuración y Estado del Sistema</h2>
      
      <!-- Tab Navigation -->
      <div class="tabs-container">
        <nav class="tabs-nav" aria-label="Tabs">
          <button 
            (click)="setActiveTab('profile')" 
            [class]="getTabClass('profile')"
            class="tab-button"
          >
            <span class="tab-icon">👤</span>
            Perfil y Cuenta
          </button>
          <button 
            (click)="setActiveTab('integrations')" 
            [class]="getTabClass('integrations')"
            class="tab-button"
          >
            <span class="tab-icon">🔧</span>
            Estado de Integraciones
          </button>
        </nav>
      </div>
      
      <!-- Content -->
      <div class="tab-content">
        <!-- Profile Settings -->
        <app-profile-settings *ngIf="activeTab === 'profile'"></app-profile-settings>
        
        <!-- Integrations -->
        <app-integrations *ngIf="activeTab === 'integrations'"></app-integrations>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      display: flex;
      flex-direction: column;
    }

    .main-title {
      font-size: 32px;
      font-weight: 700;
      color: white;
      margin-bottom: 24px;
    }

    .tabs-container {
      border-bottom: 1px solid #374151;
      margin-bottom: 24px;
    }

    .tabs-nav {
      display: flex;
      gap: 32px;
      margin-bottom: -1px;
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      padding: 16px 4px;
      border-bottom: 2px solid transparent;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      background: none;
      border-left: none;
      border-right: none;
      border-top: none;
    }

    .tab-icon {
      width: 20px;
      height: 20px;
      font-size: 16px;
    }

    .tab-active {
      border-bottom-color: #06d6a0;
      color: #06d6a0;
    }

    .tab-inactive {
      border-bottom-color: transparent;
      color: #6b7280;
    }

    .tab-inactive:hover {
      color: #e5e7eb;
      border-bottom-color: #6b7280;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
    }
  `]
})
export class SettingsComponent implements OnInit {
  activeTab: SettingsTab = 'profile';

  ngOnInit(): void {
    // Component initialized
  }

  setActiveTab(tab: SettingsTab): void {
    this.activeTab = tab;
  }

  getTabClass(tab: SettingsTab): string {
    return this.activeTab === tab ? 'tab-active' : 'tab-inactive';
  }
}

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-card">
      <div class="profile-content">
        <img 
          class="avatar" 
          src="https://picsum.photos/seed/advisor/100/100" 
          alt="Avatar del Asesor" 
        />
        <h3 class="user-name">Ricardo Montoya</h3>
        <p class="user-role">Asesor Senior</p>
        <div class="actions">
          <button class="btn-edit" (click)="editProfile()">
            Editar Perfil
          </button>
          <button class="btn-logout" (click)="logout()">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-card {
      background: #1f2937;
      padding: 32px;
      border-radius: 12px;
      border: 1px solid #374151;
      max-width: 512px;
      margin: 0 auto;
    }

    .profile-content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 16px;
    }

    .user-name {
      font-size: 32px;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .user-role {
      font-size: 16px;
      color: #6b7280;
      margin: 0;
    }

    .actions {
      margin-top: 24px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .btn-edit, .btn-logout {
      width: 100%;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.2s;
      border: none;
    }

    .btn-edit {
      color: white;
      background: #4b5563;
    }

    .btn-edit:hover {
      background: #6b7280;
    }

    .btn-logout {
      color: white;
      background: rgba(220, 38, 38, 0.5);
      border: 1px solid rgba(239, 68, 68, 0.5);
    }

    .btn-logout:hover {
      background: rgba(220, 38, 38, 0.7);
    }
  `]
})
export class ProfileSettingsComponent {
  editProfile(): void {
    // TODO: Implement edit profile functionality
    console.log('Edit profile clicked');
  }

  logout(): void {
    // TODO: Implement logout functionality
    console.log('Logout clicked');
  }
}

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="integrations-container">
      <h2 class="integrations-title">Mapa de Batalla de Integraciones</h2>
      <p class="integrations-description">
        Esta es la guía para el equipo técnico. Cada tarjeta representa una conexión externa 
        que debe ser construida en el backend. La PWA ya está preparada para consumir los endpoints correspondientes.
      </p>
      
      <div class="integrations-grid">
        <div 
          *ngFor="let integration of integrations" 
          [class]="'integration-card ' + integration.priorityColor"
        >
          <div class="card-header">
            <h3 class="integration-name">{{ integration.name }}</h3>
            <span class="status-badge">SIMULADO</span>
          </div>
          <p class="integration-role">{{ integration.role }}</p>
          <div class="priority-section">
            <span [class]="getPriorityClass(integration.priorityColor)">
              {{ integration.priority }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .integrations-container {
      display: flex;
      flex-direction: column;
    }

    .integrations-title {
      font-size: 32px;
      font-weight: 700;
      color: white;
      margin-bottom: 24px;
    }

    .integrations-description {
      color: #6b7280;
      margin-bottom: 32px;
      max-width: 768px;
      line-height: 1.6;
    }

    .integrations-grid {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 24px;
    }

    @media (min-width: 768px) {
      .integrations-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1280px) {
      .integrations-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .integration-card {
      background: #1f2937;
      border-left: 4px solid;
      border-top-right-radius: 8px;
      border-bottom-right-radius: 8px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .border-red-500 { border-left-color: #ef4444; }
    .border-amber-400 { border-left-color: #fbbf24; }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .integration-name {
      font-size: 20px;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .status-badge {
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 9999px;
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }

    .integration-role {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
      flex: 1;
      margin-bottom: 16px;
    }

    .priority-section {
      margin-top: auto;
    }

    .priority-badge {
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 9999px;
    }

    .priority-critical {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .priority-key {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }
  `]
})
export class IntegrationsComponent implements OnInit {
  // Port exacto de integrations desde React líneas 4-41
  integrations: Integration[] = [
    {
      name: "Odoo",
      role: "CRM, Contabilidad y Fuente de Verdad para datos de clientes.",
      priority: "P1 - Crítico",
      priorityColor: "border-red-500"
    },
    {
      name: "API de GNV",
      role: "Habilita el ahorro y pago por recaudación en consumo de combustible.",
      priority: "P1 - Crítico",
      priorityColor: "border-red-500"
    },
    {
      name: "Conekta / SPEI",
      role: "Procesa todas las aportaciones voluntarias de los clientes.",
      priority: "P1 - Crítico",
      priorityColor: "border-red-500"
    },
    {
      name: "Metamap",
      role: "Provee la verificación de identidad biométrica (KYC).",
      priority: "P2 - Funcionalidad Clave",
      priorityColor: "border-amber-400"
    },
    {
      name: "Mifiel",
      role: "Gestiona la firma electrónica de todos los contratos.",
      priority: "P2 - Funcionalidad Clave",
      priorityColor: "border-amber-400"
    },
    {
      name: "KIBAN / HASE",
      role: "Realiza el análisis de riesgo crediticio.",
      priority: "P2 - Funcionalidad Clave",
      priorityColor: "border-amber-400"
    }
  ];

  ngOnInit(): void {
    // Component initialized
  }

  getPriorityClass(priorityColor: string): string {
    const baseClass = 'priority-badge ';
    if (priorityColor === 'border-red-500') {
      return baseClass + 'priority-critical';
    }
    if (priorityColor === 'border-amber-400') {
      return baseClass + 'priority-key';
    }
    return baseClass;
  }
}