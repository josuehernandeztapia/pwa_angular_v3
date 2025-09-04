import { Component, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FlowBuilderComponent } from './flow-builder/flow-builder.component';

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  settings: ConfigSetting[];
}

interface ConfigSetting {
  key: string;
  label: string;
  type: 'toggle' | 'select' | 'input' | 'number';
  value: any;
  options?: { value: any; label: string }[];
  description?: string;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, FlowBuilderComponent],
  template: `
    <div class="configuracion-container premium-container command-center-bg">
      <header class="page-header">
        <h1>⚙️ Configuración</h1>
        <p class="page-description">Personaliza tu experiencia en la aplicación</p>
      </header>

      <main class="page-main">
        <div class="config-sections">
          <div *ngFor="let section of configSections" class="config-section">
            <div class="section-header">
              <div class="section-info">
                <div class="section-icon">{{ section.icon }}</div>
                <div class="section-details">
                  <h2>{{ section.title }}</h2>
                  <p>{{ section.description }}</p>
                </div>
              </div>
              <div *ngIf="section.id === 'flow-builder'" class="section-actions">
                <button 
                  class="flow-builder-btn"
                  (click)="openFlowBuilder()"
                  [disabled]="!isFlowBuilderEnabled"
                >
                  🎨 Abrir Constructor
                </button>
              </div>
            </div>
            
            <div class="section-content">
              <div *ngFor="let setting of section.settings" class="setting-item">
                <div class="setting-label">
                  <label>{{ setting.label }}</label>
                  <p *ngIf="setting.description" class="setting-description">
                    {{ setting.description }}
                  </p>
                </div>
                
                <div class="setting-control">
                  <!-- Toggle Switch -->
                  <label *ngIf="setting.type === 'toggle'" class="toggle-switch">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="setting.value"
                      (change)="onSettingChange(setting.key, setting.value)"
                    >
                    <span class="toggle-slider"></span>
                  </label>
                  
                  <!-- Select Dropdown -->
                  <select 
                    *ngIf="setting.type === 'select'" 
                    class="setting-select"
                    [(ngModel)]="setting.value"
                    (change)="onSettingChange(setting.key, setting.value)"
                  >
                    <option *ngFor="let option of setting.options" [value]="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                  
                  <!-- Text Input -->
                  <input 
                    *ngIf="setting.type === 'input'" 
                    type="text"
                    class="setting-input"
                    [(ngModel)]="setting.value"
                    (blur)="onSettingChange(setting.key, setting.value)"
                  >
                  
                  <!-- Number Input -->
                  <input 
                    *ngIf="setting.type === 'number'" 
                    type="number"
                    class="setting-input"
                    [(ngModel)]="setting.value"
                    (blur)="onSettingChange(setting.key, setting.value)"
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="actions-section">
          <button class="btn-secondary" (click)="resetToDefaults()">
            🔄 Restaurar Valores por Defecto
          </button>
          <button class="btn-primary" (click)="saveConfiguration()">
            💾 Guardar Configuración
          </button>
        </div>
      </main>

      <!-- Flow Builder Modal -->
      <div class="flow-builder-modal" *ngIf="showFlowBuilderModal" (click)="closeFlowBuilderModal()">
        <div class="modal-content-wrapper" (click)="$event.stopPropagation()">
          <app-flow-builder></app-flow-builder>
          <button class="modal-close-btn" (click)="closeFlowBuilderModal()">✕</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .configuracion-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .page-header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--glass-border);
    }

    .page-header h1 {
      margin: 0 0 8px 0;
      color: var(--bg-gray-100);
      font-size: 2rem;
      font-weight: 700;
    }

    .page-description {
      margin: 0;
      color: var(--text-light);
      font-size: 1.1rem;
    }

    .config-sections {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-bottom: 32px;
    }

    .config-section {
      background: var(--glass-bg);
      border-radius: 16px;
      border: 1px solid var(--glass-border);
      overflow: hidden;
      backdrop-filter: var(--glass-backdrop);
      -webkit-backdrop-filter: var(--glass-backdrop);
      box-shadow: var(--shadow-card);
    }

    .section-header {
      padding: 20px;
      background: rgba(255, 255, 255, 0.04);
      border-bottom: 1px solid var(--glass-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .section-icon {
      font-size: 2rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-surface-premium);
      border-radius: 12px;
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-card);
    }

    .section-details h2 {
      margin: 0 0 4px 0;
      color: var(--bg-gray-100);
      font-size: 1.3rem;
      font-weight: 600;
    }

    .section-details p {
      margin: 0;
      color: var(--text-light);
      font-size: 0.9rem;
    }

    .section-content {
      padding: 0;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid var(--glass-border);
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-label {
      flex: 1;
    }

    .setting-label label {
      display: block;
      font-weight: 600;
      color: var(--bg-gray-100);
      margin-bottom: 4px;
    }

    .setting-description {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-light);
      line-height: 1.4;
    }

    .setting-control {
      flex-shrink: 0;
      margin-left: 20px;
    }

    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 26px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--border-medium);
      transition: .4s;
      border-radius: 26px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: var(--pure-white);
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .toggle-slider {
      background-color: var(--primary-cyan-500);
    }

    input:checked + .toggle-slider:before {
      transform: translateX(24px);
    }

    /* Select and Input */
    .setting-select, .setting-input {
      padding: 10px 12px;
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--bg-gray-100);
      font-size: 0.95rem;
      min-width: 180px;
      box-shadow: var(--shadow-card);
    }

    .setting-select:focus, .setting-input:focus {
      outline: none;
      border-color: var(--primary-cyan-400);
      box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15);
    }

    .actions-section {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 24px 0;
      border-top: 1px solid var(--glass-border);
    }

    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.95rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary-cyan-400), var(--primary-cyan-600));
      color: white;
      box-shadow: var(--shadow-card);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, var(--primary-cyan-300), var(--primary-cyan-500));
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--bg-gray-100);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-card);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .flow-builder-btn {
      padding: 10px 16px;
      background: linear-gradient(135deg, var(--accent-amber-400), var(--accent-amber-600));
      color: var(--bg-gray-950);
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.95rem;
      box-shadow: var(--shadow-card);
    }

    .flow-builder-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--accent-amber-300), var(--accent-amber-500));
      transform: translateY(-1px);
      box-shadow: var(--shadow-elevated);
    }

    .flow-builder-btn:disabled {
      background: #cbd5e0;
      cursor: not-allowed;
      transform: none;
    }

    .flow-builder-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .modal-content-wrapper {
      position: relative;
      width: 95%;
      height: 95%;
      background: var(--bg-surface-premium);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--shadow-premium);
    }

    .modal-close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      background: rgba(255, 255, 255, 0.9);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #374151;
      z-index: 10;
      transition: all 0.2s;
      box-shadow: var(--shadow-card);
    }

    .modal-close-btn:hover {
      background: white;
      transform: scale(1.1);
    }

    @media (max-width: 768px) {
      .configuracion-container {
        padding: 16px;
      }

      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .setting-control {
        margin-left: 0;
        align-self: flex-end;
      }

      .actions-section {
        flex-direction: column;
      }
    }
  `]
})
export class ConfiguracionComponent implements OnInit {
  showFlowBuilderModal = false;

  get isFlowBuilderEnabled(): boolean {
    const flowBuilderSection = this.configSections.find(section => section.id === 'flow-builder');
    const setting = flowBuilderSection?.settings.find(s => s.key === 'enableFlowBuilder');
    return setting?.value === true;
  }

  configSections: ConfigSection[] = [
    {
      id: 'general',
      title: 'Configuración General',
      description: 'Ajustes básicos de la aplicación',
      icon: '🔧',
      settings: [
        {
          key: 'theme',
          label: 'Tema de la aplicación',
          type: 'select',
          value: 'light',
          options: [
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
            { value: 'auto', label: 'Automático' }
          ],
          description: 'Selecciona el tema visual de la aplicación'
        },
        {
          key: 'language',
          label: 'Idioma',
          type: 'select',
          value: 'es',
          options: [
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' }
          ]
        },
        {
          key: 'autoSave',
          label: 'Guardado automático',
          type: 'toggle',
          value: true,
          description: 'Guarda automáticamente los cambios sin confirmar'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Controla qué notificaciones recibir',
      icon: '🔔',
      settings: [
        {
          key: 'emailNotifications',
          label: 'Notificaciones por email',
          type: 'toggle',
          value: true,
          description: 'Recibir notificaciones importantes por correo electrónico'
        },
        {
          key: 'pushNotifications',
          label: 'Notificaciones push',
          type: 'toggle',
          value: false,
          description: 'Mostrar notificaciones en el navegador'
        },
        {
          key: 'reminderFrequency',
          label: 'Frecuencia de recordatorios',
          type: 'select',
          value: 'daily',
          options: [
            { value: 'never', label: 'Nunca' },
            { value: 'daily', label: 'Diario' },
            { value: 'weekly', label: 'Semanal' }
          ]
        }
      ]
    },
    {
      id: 'data',
      title: 'Gestión de Datos',
      description: 'Configuración de almacenamiento y sincronización',
      icon: '💾',
      settings: [
        {
          key: 'dataRetention',
          label: 'Retención de datos (días)',
          type: 'number',
          value: 365,
          description: 'Número de días para mantener los datos históricos'
        },
        {
          key: 'syncFrequency',
          label: 'Frecuencia de sincronización',
          type: 'select',
          value: 'realtime',
          options: [
            { value: 'realtime', label: 'Tiempo real' },
            { value: 'hourly', label: 'Cada hora' },
            { value: 'daily', label: 'Diario' }
          ]
        },
        {
          key: 'offlineMode',
          label: 'Modo sin conexión',
          type: 'toggle',
          value: true,
          description: 'Permitir uso de la aplicación sin conexión a internet'
        }
      ]
    },
    {
      id: 'security',
      title: 'Seguridad',
      description: 'Configuración de seguridad y privacidad',
      icon: '🔒',
      settings: [
        {
          key: 'sessionTimeout',
          label: 'Tiempo de sesión (minutos)',
          type: 'number',
          value: 30,
          description: 'Tiempo antes de cerrar sesión automáticamente'
        },
        {
          key: 'twoFactorAuth',
          label: 'Autenticación de dos factores',
          type: 'toggle',
          value: false,
          description: 'Activar verificación adicional al iniciar sesión'
        },
        {
          key: 'dataEncryption',
          label: 'Cifrado de datos',
          type: 'toggle',
          value: true,
          description: 'Cifrar datos sensibles almacenados localmente'
        }
      ]
    },
    {
      id: 'flow-builder',
      title: 'Constructor de Flujos',
      description: 'Herramientas visuales para crear nuevos flujos y ciudades',
      icon: '🎨',
      settings: [
        {
          key: 'enableFlowBuilder',
          label: 'Habilitar Constructor Visual',
          type: 'toggle',
          value: true,
          description: 'Acceso al constructor visual de flujos estilo n8n/Zapier'
        }
      ]
    }
  ];

  constructor(private router: Router, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.loadConfiguration();
    // Apply theme on init
    const savedConfig = localStorage.getItem('app-configuration');
    const theme = savedConfig ? (JSON.parse(savedConfig).theme || 'dark') : 'dark';
    this.applyTheme(theme);
  }

  openFlowBuilder(): void {
    if (this.isFlowBuilderEnabled) {
      this.showFlowBuilderModal = true;
    }
  }

  closeFlowBuilderModal(): void {
    this.showFlowBuilderModal = false;
  }

  onSettingChange(key: string, value: any): void {
    console.log('Configuración cambiada:', key, value);
    // Here you would typically save to a service or localStorage
    this.saveToLocalStorage(key, value);
    if (key === 'theme') {
      this.applyTheme(value);
    }
  }

  saveConfiguration(): void {
    const config: { [key: string]: any } = {};
    
    this.configSections.forEach(section => {
      section.settings.forEach(setting => {
        config[setting.key] = setting.value;
      });
    });
    
    localStorage.setItem('app-configuration', JSON.stringify(config));
    console.log('Configuración guardada:', config);
  }

  resetToDefaults(): void {
    const defaultValues: { [key: string]: any } = {
      theme: 'light',
      language: 'es',
      autoSave: true,
      emailNotifications: true,
      pushNotifications: false,
      reminderFrequency: 'daily',
      dataRetention: 365,
      syncFrequency: 'realtime',
      offlineMode: true,
      sessionTimeout: 30,
      twoFactorAuth: false,
      dataEncryption: true,
      enableFlowBuilder: true
    };

    this.configSections.forEach(section => {
      section.settings.forEach(setting => {
        if (defaultValues.hasOwnProperty(setting.key)) {
          setting.value = defaultValues[setting.key];
        }
      });
    });

    localStorage.removeItem('app-configuration');
    console.log('Configuración restaurada a valores por defecto');
  }

  private loadConfiguration(): void {
    const savedConfig = localStorage.getItem('app-configuration');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.configSections.forEach(section => {
          section.settings.forEach(setting => {
            if (config.hasOwnProperty(setting.key)) {
              setting.value = config[setting.key];
            }
          });
        });
      } catch (error) {
        console.error('Error loading configuration:', error);
      }
    }
  }

  private saveToLocalStorage(key: string, value: any): void {
    const savedConfig = localStorage.getItem('app-configuration');
    let config: { [key: string]: any } = {};
    
    if (savedConfig) {
      try {
        config = JSON.parse(savedConfig);
      } catch (error) {
        console.error('Error parsing saved configuration:', error);
      }
    }
    
    config[key] = value;
    localStorage.setItem('app-configuration', JSON.stringify(config));
  }

  private applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    const root = document.documentElement;
    if (theme === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const computedTheme = prefersDark ? 'dark' : 'light';
      this.renderer.setAttribute(root, 'data-theme', computedTheme);
    } else {
      this.renderer.setAttribute(root, 'data-theme', theme);
    }
  }
}