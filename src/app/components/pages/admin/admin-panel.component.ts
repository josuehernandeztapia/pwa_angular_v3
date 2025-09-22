import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'asesor' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
  permissions: string[];
  market: 'AGS' | 'EdoMex' | 'Both';
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'clients' | 'quotes' | 'reports' | 'system';
  enabled: boolean;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalSessions: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-panel.component.html',
  styles: []
})
export class AdminPanelComponent implements OnInit {
  activeTab = signal('users');
  isLoading = signal(true);
  users = signal<User[]>([]);
  permissions = signal<Permission[]>([]);
  systemStats = signal<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalSessions: 0,
    systemHealth: 'healthy'
  });
  systemSettings = signal({
    autoRegister: false,
    emailNotifications: true,
    maintenanceMode: false,
    sessionTimeout: 120,
    maxLoginAttempts: 5
  });
  activityLogs = signal<{timestamp: string, level: string, message: string, user: string}[]>([]);

  tabs = [
    { id: 'users', name: 'Usuarios', icon: '👥' },
    { id: 'roles', name: 'Roles & Permisos', icon: '🔐' },
    { id: 'settings', name: 'Configuración', icon: '⚙️' },
    { id: 'logs', name: 'Logs', icon: '📋' }
  ];

  permissionCategories = ['users', 'clients', 'quotes', 'reports', 'system'];

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    // Simulate loading
    setTimeout(() => {
      this.users.set([
        {
          id: '1',
          name: 'Juan Pérez',
          email: 'juan.perez@conductores.com',
          role: 'admin',
          status: 'active',
          lastLogin: '2024-01-15T10:30:00Z',
          permissions: ['users.manage', 'clients.view', 'quotes.create', 'reports.view'],
          market: 'Both',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'María González',
          email: 'maria.gonzalez@conductores.com',
          role: 'manager',
          status: 'active',
          lastLogin: '2024-01-14T16:45:00Z',
          permissions: ['clients.view', 'quotes.create', 'reports.view'],
          market: 'AGS',
          createdAt: '2024-01-02T00:00:00Z'
        },
        {
          id: '3',
          name: 'Carlos Ruiz',
          email: 'carlos.ruiz@conductores.com',
          role: 'asesor',
          status: 'pending',
          permissions: ['clients.view', 'quotes.create'],
          market: 'EdoMex',
          createdAt: '2024-01-15T00:00:00Z'
        }
      ]);

      this.permissions.set([
        { id: '1', name: 'Gestionar usuarios', description: 'Crear, editar y eliminar usuarios', category: 'users', enabled: true },
        { id: '2', name: 'Ver clientes', description: 'Acceso a la lista de clientes', category: 'clients', enabled: true },
        { id: '3', name: 'Crear cotizaciones', description: 'Generar nuevas cotizaciones', category: 'quotes', enabled: true },
        { id: '4', name: 'Ver reportes', description: 'Acceso a reportes del sistema', category: 'reports', enabled: true },
        { id: '5', name: 'Configuración sistema', description: 'Modificar configuración del sistema', category: 'system', enabled: false }
      ]);

      this.systemStats.set({
        totalUsers: 25,
        activeUsers: 18,
        pendingUsers: 3,
        totalSessions: 12,
        systemHealth: 'healthy'
      });

      this.activityLogs.set([
        { timestamp: '2024-01-15 10:30:15', level: 'info', message: 'Usuario juan.perez inició sesión', user: 'System' },
        { timestamp: '2024-01-15 10:25:32', level: 'info', message: 'Nueva cotización creada ID: COT-2024-001', user: 'maria.gonzalez' },
        { timestamp: '2024-01-15 09:45:18', level: 'warning', message: 'Intento de acceso fallido desde IP: 192.168.1.100', user: 'Unknown' },
        { timestamp: '2024-01-15 09:30:45', level: 'info', message: 'Usuario carlos.ruiz registrado', user: 'System' }
      ]);

      this.isLoading.set(false);
    }, 1500);
  }

  trackByUser(_: number, user: User) {
    return user.id;
  }

  trackByLog(_: number, log: any) {
    return log.timestamp + log.message;
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Activo',
      'inactive': 'Inactivo',
      'pending': 'Pendiente'
    };
    return statusMap[status] || status;
  }

  getRoleText(role: string): string {
    const roleMap: Record<string, string> = {
      'admin': 'Administrador',
      'manager': 'Gerente',
      'asesor': 'Asesor',
      'viewer': 'Visualizador'
    };
    return roleMap[role] || role;
  }

  getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'users': '👥',
      'clients': '🏢',
      'quotes': '💰',
      'reports': '📊',
      'system': '⚙️'
    };
    return iconMap[category] || '📋';
  }

  getCategoryName(category: string): string {
    const nameMap: Record<string, string> = {
      'users': 'Gestión de Usuarios',
      'clients': 'Gestión de Clientes',
      'quotes': 'Cotizaciones',
      'reports': 'Reportes',
      'system': 'Sistema'
    };
    return nameMap[category] || category;
  }

  getPermissionsByCategory(category: string): Permission[] {
    return this.permissions().filter(p => p.category === category);
  }

  togglePermission(permission: Permission) {
    const updated = this.permissions().map(p =>
      p.id === permission.id ? { ...p, enabled: !p.enabled } : p
    );
    this.permissions.set(updated);
  }

  toggleSetting(setting: string) {
    const current = this.systemSettings();
    this.systemSettings.set({
      ...current,
      [setting]: !current[setting as keyof typeof current]
    });
  }

  updateSetting(setting: string, event: any) {
    const current = this.systemSettings();
    const value = parseInt(event.target.value) || 0;
    this.systemSettings.set({
      ...current,
      [setting]: value
    });
  }

  isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark');
  }
}