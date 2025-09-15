/**
 * 🎨 Premium Icons Service - World-Class Mobility Tech Iconography
 * Phosphor Icons + Custom Animations for Production-Ready UI Polish
 */

import { Injectable } from '@angular/core';

export interface IconConfig {
  name: string;
  phosphorIcon: string;
  category: 'navigation' | 'action' | 'status' | 'mobility' | 'business' | 'system';
  animation?: 'pulse' | 'bounce' | 'shake' | 'rotate' | 'fade' | 'scale';
  semanticContext?: string;
  accessibilityLabel: string;
}

@Injectable({
  providedIn: 'root'
})
export class PremiumIconsService {
  
  // 🚗 Mobility & Transportation Icons
  private readonly mobilityIcons: Record<string, IconConfig> = {
    // Core Mobility
    'vehicle-primary': {
      name: 'vehicle-primary',
      phosphorIcon: 'car',
      category: 'mobility',
      animation: 'pulse',
      semanticContext: 'primary-vehicle',
      accessibilityLabel: 'Vehículo principal'
    },
    'vehicle-fleet': {
      name: 'vehicle-fleet',
      phosphorIcon: 'truck',
      category: 'mobility',
      accessibilityLabel: 'Flota vehicular'
    },
    'route-optimization': {
      name: 'route-optimization',
      phosphorIcon: 'map-pin-line',
      category: 'mobility',
      animation: 'bounce',
      accessibilityLabel: 'Optimización de rutas'
    },
    'fuel-station': {
      name: 'fuel-station',
      phosphorIcon: 'gas-pump',
      category: 'mobility',
      accessibilityLabel: 'Estación de combustible'
    },
    'maintenance': {
      name: 'maintenance',
      phosphorIcon: 'wrench',
      category: 'mobility',
      animation: 'rotate',
      accessibilityLabel: 'Mantenimiento vehicular'
    },
    
    // Insurance & Protection
    'protection-shield': {
      name: 'protection-shield',
      phosphorIcon: 'shield-check',
      category: 'business',
      animation: 'pulse',
      semanticContext: 'protection-active',
      accessibilityLabel: 'Protección activa'
    },
    'coverage-umbrella': {
      name: 'coverage-umbrella',
      phosphorIcon: 'umbrella',
      category: 'business',
      accessibilityLabel: 'Cobertura de seguro'
    },
    'risk-assessment': {
      name: 'risk-assessment',
      phosphorIcon: 'scales',
      category: 'business',
      accessibilityLabel: 'Evaluación de riesgo'
    }
  };

  // 📊 Business & Operations Icons
  private readonly businessIcons: Record<string, IconConfig> = {
    // Dashboard & Analytics
    'dashboard-insights': {
      name: 'dashboard-insights',
      phosphorIcon: 'chart-line-up',
      category: 'business',
      animation: 'fade',
      accessibilityLabel: 'Insights del dashboard'
    },
    'kpi-growth': {
      name: 'kpi-growth',
      phosphorIcon: 'trending-up',
      category: 'business',
      animation: 'bounce',
      semanticContext: 'growth-positive',
      accessibilityLabel: 'Crecimiento de KPIs'
    },
    'pipeline-opportunities': {
      name: 'pipeline-opportunities',
      phosphorIcon: 'funnel',
      category: 'business',
      accessibilityLabel: 'Oportunidades en pipeline'
    },
    
    // Customer Management
    'customer-profile': {
      name: 'customer-profile',
      phosphorIcon: 'user-circle',
      category: 'business',
      accessibilityLabel: 'Perfil de cliente'
    },
    'customer-verification': {
      name: 'customer-verification',
      phosphorIcon: 'user-check',
      category: 'business',
      animation: 'pulse',
      semanticContext: 'verification-approved',
      accessibilityLabel: 'Cliente verificado'
    },
    'customer-communication': {
      name: 'customer-communication',
      phosphorIcon: 'chat-circle-dots',
      category: 'business',
      animation: 'bounce',
      accessibilityLabel: 'Comunicación con cliente'
    },
    
    // Financial Operations
    'payment-processing': {
      name: 'payment-processing',
      phosphorIcon: 'credit-card',
      category: 'business',
      animation: 'pulse',
      semanticContext: 'payment-in-progress',
      accessibilityLabel: 'Procesando pago'
    },
    'invoice-generated': {
      name: 'invoice-generated',
      phosphorIcon: 'receipt',
      category: 'business',
      animation: 'fade',
      accessibilityLabel: 'Factura generada'
    },
    'financial-health': {
      name: 'financial-health',
      phosphorIcon: 'currency-circle-dollar',
      category: 'business',
      accessibilityLabel: 'Salud financiera'
    }
  };

  // 🔄 System & Status Icons
  private readonly systemIcons: Record<string, IconConfig> = {
    // System States
    'system-healthy': {
      name: 'system-healthy',
      phosphorIcon: 'check-circle',
      category: 'status',
      animation: 'pulse',
      semanticContext: 'status-healthy',
      accessibilityLabel: 'Sistema saludable'
    },
    'system-warning': {
      name: 'system-warning',
      phosphorIcon: 'warning-circle',
      category: 'status',
      animation: 'shake',
      semanticContext: 'status-warning',
      accessibilityLabel: 'Advertencia del sistema'
    },
    'system-error': {
      name: 'system-error',
      phosphorIcon: 'x-circle',
      category: 'status',
      animation: 'shake',
      semanticContext: 'status-error',
      accessibilityLabel: 'Error del sistema'
    },
    'system-processing': {
      name: 'system-processing',
      phosphorIcon: 'circle-notch',
      category: 'status',
      animation: 'rotate',
      semanticContext: 'status-processing',
      accessibilityLabel: 'Procesando'
    },
    
    // Integration & Connectivity
    'integration-active': {
      name: 'integration-active',
      phosphorIcon: 'plug',
      category: 'system',
      animation: 'pulse',
      semanticContext: 'integration-connected',
      accessibilityLabel: 'Integración activa'
    },
    'webhook-delivery': {
      name: 'webhook-delivery',
      phosphorIcon: 'globe',
      category: 'system',
      animation: 'bounce',
      accessibilityLabel: 'Entrega de webhook'
    },
    'api-endpoint': {
      name: 'api-endpoint',
      phosphorIcon: 'code',
      category: 'system',
      accessibilityLabel: 'Endpoint de API'
    }
  };

  // ⚡ Navigation & Actions Icons
  private readonly navigationIcons: Record<string, IconConfig> = {
    // Primary Navigation
    'nav-dashboard': {
      name: 'nav-dashboard',
      phosphorIcon: 'house',
      category: 'navigation',
      accessibilityLabel: 'Ir al dashboard'
    },
    'nav-quotes': {
      name: 'nav-quotes',
      phosphorIcon: 'calculator',
      category: 'navigation',
      accessibilityLabel: 'Cotizador'
    },
    'nav-customers': {
      name: 'nav-customers',
      phosphorIcon: 'users',
      category: 'navigation',
      accessibilityLabel: 'Clientes'
    },
    'nav-operations': {
      name: 'nav-operations',
      phosphorIcon: 'gear',
      category: 'navigation',
      accessibilityLabel: 'Operaciones'
    },
    'nav-reports': {
      name: 'nav-reports',
      phosphorIcon: 'chart-bar',
      category: 'navigation',
      accessibilityLabel: 'Reportes'
    },
    
    // Quick Actions
    'action-create': {
      name: 'action-create',
      phosphorIcon: 'plus-circle',
      category: 'action',
      animation: 'scale',
      accessibilityLabel: 'Crear nuevo'
    },
    'action-edit': {
      name: 'action-edit',
      phosphorIcon: 'pencil-simple',
      category: 'action',
      accessibilityLabel: 'Editar'
    },
    'action-save': {
      name: 'action-save',
      phosphorIcon: 'floppy-disk',
      category: 'action',
      animation: 'pulse',
      semanticContext: 'save-in-progress',
      accessibilityLabel: 'Guardar'
    },
    'action-delete': {
      name: 'action-delete',
      phosphorIcon: 'trash',
      category: 'action',
      animation: 'shake',
      accessibilityLabel: 'Eliminar'
    },
    'action-refresh': {
      name: 'action-refresh',
      phosphorIcon: 'arrow-clockwise',
      category: 'action',
      animation: 'rotate',
      accessibilityLabel: 'Actualizar'
    }
  };

  // 🎯 Consolidated Icon Registry
  private readonly iconRegistry: Record<string, IconConfig> = {
    ...this.mobilityIcons,
    ...this.businessIcons,
    ...this.systemIcons,
    ...this.navigationIcons
  };

  // 🎨 Animation CSS Classes
  readonly animationClasses = {
    pulse: 'animate-pulse duration-1000',
    bounce: 'animate-bounce duration-500',
    shake: 'animate-shake duration-300',
    rotate: 'animate-spin duration-1000',
    fade: 'animate-fade duration-800',
    scale: 'animate-scale duration-200'
  };

  // 🎯 Color Themes for Different States
  readonly colorThemes = {
    primary: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    neutral: 'text-gray-600',
    info: 'text-indigo-600'
  };

  /**
   * Get icon configuration by name
   */
  getIcon(iconName: string): IconConfig | null {
    return this.iconRegistry[iconName] || null;
  }

  /**
   * Get all icons by category
   */
  getIconsByCategory(category: IconConfig['category']): IconConfig[] {
    return Object.values(this.iconRegistry).filter(icon => icon.category === category);
  }

  /**
   * Get semantic icon with appropriate styling
   */
  getSemanticIcon(context: string): { icon: IconConfig; theme: string } | null {
    const icon = Object.values(this.iconRegistry).find(icon => 
      icon.semanticContext === context
    );

    if (!icon) return null;

    let theme = 'neutral';
    if (context.includes('healthy') || context.includes('approved') || context.includes('success')) {
      theme = 'success';
    } else if (context.includes('warning') || context.includes('degraded')) {
      theme = 'warning';
    } else if (context.includes('error') || context.includes('failed')) {
      theme = 'error';
    } else if (context.includes('processing') || context.includes('progress')) {
      theme = 'info';
    }

    return { icon, theme };
  }

  /**
   * Generate complete icon CSS classes
   */
  getIconClasses(iconName: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md', theme?: string): string {
    const icon = this.getIcon(iconName);
    if (!icon) return '';

    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8'
    };

    const classes = [
      sizeClasses[size],
      theme ? this.colorThemes[theme as keyof typeof this.colorThemes] : 'text-current'
    ];

    if (icon.animation) {
      classes.push(this.animationClasses[icon.animation]);
    }

    return classes.filter(Boolean).join(' ');
  }

  /**
   * Get all available icon names
   */
  getAllIconNames(): string[] {
    return Object.keys(this.iconRegistry);
  }

  /**
   * Search icons by name or accessibility label
   */
  searchIcons(query: string): IconConfig[] {
    const lowerQuery = query.toLowerCase();
    return Object.values(this.iconRegistry).filter(icon =>
      icon.name.toLowerCase().includes(lowerQuery) ||
      icon.accessibilityLabel.toLowerCase().includes(lowerQuery) ||
      icon.phosphorIcon.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Validate icon exists and return safe fallback
   */
  getSafeIcon(iconName: string, fallback: string = 'circle'): IconConfig {
    const icon = this.getIcon(iconName);
    if (icon) return icon;

    return {
      name: fallback,
      phosphorIcon: fallback,
      category: 'system',
      accessibilityLabel: 'Icono genérico'
    };
  }
  
  /**
   * Generate CSS custom properties for icon theming
   */
  generateIconCSS(): string {
    return `
      :root {
        /* Conductores Premium Icon Tokens */
        --icon-stroke-width: 2px;
        --icon-color-primary: #3AA6FF;
        --icon-color-muted: #A8B3CF;
        --icon-animation-speed: 0.2s;
        --icon-shadow-glow: 0 0 12px;
      }
      
      .premium-icon {
        stroke-width: var(--icon-stroke-width);
        transition: all var(--icon-animation-speed) ease-in-out;
      }
      
      .premium-stroke-2\\.5 {
        stroke-width: 2.5px;
      }
      
      /* Premium Icon States */
      .premium-icon-hover {
        color: var(--icon-color-primary);
        transform: scale(1.05);
      }
      
      .premium-icon-active {
        color: var(--icon-color-primary);
        transform: scale(0.95);
      }
      
      .premium-icon-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .premium-icon-loading {
        animation: spin 1s linear infinite;
      }
      
      .premium-icon-success {
        color: #22C55E;
      }
      
      .premium-icon-error {
        color: #EF4444;
      }
      
      /* Product Icon Specific Styles */
      .premium-icon-cotizador:hover {
        animation: rotate 0.2s ease-in-out;
      }
      
      .premium-icon-proteccion.premium-icon-rejected {
        animation: pulse-red 0.5s infinite;
      }
      
      .premium-icon-avi:hover {
        animation: wave-pulse 1.5s infinite;
      }
    `;
  }
}