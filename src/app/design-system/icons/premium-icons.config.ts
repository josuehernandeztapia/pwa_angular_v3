/**
 * 🎨 Premium Icons Configuration
 * Enterprise design system for Conductores PWA icons with microinteractions
 */

export interface IconState {
  style: 'outline' | 'filled' | 'duotone';
  stroke?: string;
  fill?: string;
  animation?: string;
  duration?: string;
  details?: string;
}

export interface IconConfig {
  name: string;
  concept: string;
  category: 'navigation' | 'product' | 'action' | 'status' | 'system';
  states: {
    default: IconState;
    hover?: IconState;
    active?: IconState;
    disabled?: IconState;
    loading?: IconState;
    success?: IconState;
    error?: IconState;
    rejected?: IconState;
  };
  variants?: {
    small?: Partial<IconState>;
    large?: Partial<IconState>;
  };
}

/**
 * Premium Icon Design System Configuration
 * Based on Conductores Mini Design Kit specification
 */
export const PREMIUM_ICONS_CONFIG: { [key: string]: IconConfig } = {
  // Product Icons (Main Features)
  cotizador: {
    name: 'cotizador',
    concept: 'calculadora con engrane',
    category: 'product',
    states: {
      default: { 
        style: 'outline', 
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: { 
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'rotate(20deg)',
        duration: '0.2s'
      },
      active: {
        style: 'filled',
        fill: 'var(--accent-primary, #3AA6FF)',
        animation: 'pulse 0.3s ease-in-out'
      }
    }
  },

  simulador: {
    name: 'simulador',
    concept: 'reloj con barra progreso',
    category: 'product',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      active: { 
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'radial-fill 1s ease-in-out'
      },
      loading: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'spin 1s linear infinite'
      }
    }
  },

  tanda: {
    name: 'tanda',
    concept: 'círculo de manos unidas',
    category: 'product',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: { 
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'secuencial-illumination 1.2s'
      },
      active: {
        style: 'filled',
        fill: 'var(--accent-primary, #3AA6FF)',
        animation: 'hands-glow 1s ease-in-out'
      }
    }
  },

  proteccion: {
    name: 'proteccion',
    concept: 'escudo con check',
    category: 'product',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: { 
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'ring-fill 1s'
      },
      success: {
        style: 'filled',
        fill: 'var(--success, #22C55E)',
        animation: 'checkmark-draw 0.8s ease-out'
      },
      rejected: { 
        style: 'outline',
        stroke: 'var(--error, #EF4444)',
        animation: 'pulse-red 0.5s infinite'
      }
    }
  },

  postventa: {
    name: 'postventa',
    concept: 'caja de herramientas + chat',
    category: 'product',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: { 
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'box-open 0.8s',
        details: 'muestra mini refacciones'
      },
      active: {
        style: 'filled',
        fill: 'var(--accent-primary, #3AA6FF)',
        animation: 'tools-appear 1s ease-out'
      }
    }
  },

  entregas: {
    name: 'entregas',
    concept: 'camión en timeline',
    category: 'product',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: { 
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'move-forward 0.8s'
      },
      active: {
        style: 'filled',
        fill: 'var(--accent-primary, #3AA6FF)',
        animation: 'truck-drive 1.5s ease-in-out'
      }
    }
  },

  gnv: {
    name: 'gnv',
    concept: 'bomba de gas con hoja',
    category: 'product',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: { 
        style: 'outline',
        stroke: 'var(--success, #22C55E)',
        animation: 'leaf-glow 1s'
      },
      active: {
        style: 'filled',
        fill: 'var(--success, #22C55E)',
        animation: 'eco-pulse 2s infinite'
      }
    }
  },

  avi: {
    name: 'avi',
    concept: 'micrófono con ondas',
    category: 'product',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: { 
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'wave-pulse 1.5s infinite'
      },
      active: {
        style: 'filled',
        fill: 'var(--accent-primary, #3AA6FF)',
        animation: 'recording-pulse 1s infinite'
      },
      loading: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'voice-analysis 2s infinite'
      }
    }
  },

  // System Icons
  'check-circle': {
    name: 'check-circle',
    concept: 'círculo con check',
    category: 'status',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--success, #22C55E)' 
      },
      success: {
        style: 'filled',
        fill: 'var(--success, #22C55E)',
        animation: 'checkmark-draw 0.6s ease-out'
      }
    }
  },

  'alert-circle': {
    name: 'alert-circle',
    concept: 'círculo con exclamación',
    category: 'status',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--warning, #F59E0B)' 
      },
      error: {
        style: 'filled',
        fill: 'var(--error, #EF4444)',
        animation: 'alert-shake 0.5s ease-in-out'
      }
    }
  },

  'alert-triangle': {
    name: 'alert-triangle',
    concept: 'triángulo con exclamación',
    category: 'status',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--warning, #F59E0B)' 
      },
      hover: {
        style: 'filled',
        fill: 'var(--warning, #F59E0B)',
        animation: 'warning-pulse 0.8s ease-in-out'
      }
    }
  },

  // Action Icons
  camera: {
    name: 'camera',
    concept: 'cámara fotográfica',
    category: 'action',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'camera-focus 0.3s ease-out'
      },
      active: {
        style: 'filled',
        fill: 'var(--accent-primary, #3AA6FF)',
        animation: 'camera-flash 0.2s ease-out'
      }
    }
  },

  refresh: {
    name: 'refresh',
    concept: 'flecha circular',
    category: 'action',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      loading: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'spin 1s linear infinite'
      },
      hover: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'refresh-bounce 0.4s ease-out'
      }
    }
  },

  edit: {
    name: 'edit',
    concept: 'lápiz',
    category: 'action',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'edit-wiggle 0.3s ease-in-out'
      },
      active: {
        style: 'filled',
        fill: 'var(--accent-primary, #3AA6FF)'
      }
    }
  },

  // Navigation Icons
  'chevron-right': {
    name: 'chevron-right',
    concept: 'flecha derecha',
    category: 'navigation',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'slide-right 0.2s ease-out'
      }
    }
  },

  'chevron-down': {
    name: 'chevron-down',
    concept: 'flecha abajo',
    category: 'navigation',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'slide-down 0.2s ease-out'
      }
    }
  },

  // Specialized Icons
  'voice-analysis': {
    name: 'voice-analysis',
    concept: 'ondas de sonido con análisis',
    category: 'system',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      active: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'voice-wave-analysis 2s infinite'
      },
      loading: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'analyzing-pulse 1.5s infinite'
      }
    }
  },

  speedometer: {
    name: 'speedometer',
    concept: 'velocímetro',
    category: 'system',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      active: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'speedometer-gauge 1s ease-in-out'
      }
    }
  },

  scan: {
    name: 'scan',
    concept: 'líneas de escaneo',
    category: 'action',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      active: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'scanning-lines 1.5s infinite'
      }
    }
  },

  car: {
    name: 'car',
    concept: 'automóvil',
    category: 'product',
    states: {
      default: { 
        style: 'outline',
        stroke: 'var(--text-muted, #A8B3CF)' 
      },
      hover: {
        style: 'outline',
        stroke: 'var(--accent-primary, #3AA6FF)',
        animation: 'car-bounce 0.4s ease-out'
      }
    }
  }
};

/**
 * CSS Animation Definitions
 */
export const PREMIUM_ANIMATIONS = `
  /* Rotation and Transform Animations */
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(20deg); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }

  /* Product-specific Animations */
  @keyframes radial-fill {
    0% { 
      stroke-dasharray: 0 100;
      stroke-dashoffset: 0;
    }
    100% { 
      stroke-dasharray: 100 100;
      stroke-dashoffset: 0;
    }
  }

  @keyframes secuencial-illumination {
    0% { stroke: var(--text-muted, #A8B3CF); }
    25% { stroke: var(--accent-primary, #3AA6FF); opacity: 0.7; }
    50% { stroke: var(--accent-primary, #3AA6FF); opacity: 1; }
    75% { stroke: var(--accent-primary, #3AA6FF); opacity: 0.7; }
    100% { stroke: var(--accent-primary, #3AA6FF); opacity: 1; }
  }

  @keyframes ring-fill {
    0% { 
      stroke-dasharray: 0 100;
      stroke: var(--text-muted, #A8B3CF);
    }
    50% {
      stroke-dasharray: 50 100;
      stroke: var(--accent-primary, #3AA6FF);
    }
    100% { 
      stroke-dasharray: 100 100;
      stroke: var(--success, #22C55E);
    }
  }

  @keyframes pulse-red {
    0%, 100% { 
      stroke: var(--error, #EF4444);
      opacity: 1;
    }
    50% { 
      stroke: var(--error, #EF4444);
      opacity: 0.5;
    }
  }

  @keyframes box-open {
    0% { transform: rotateX(0deg); }
    50% { transform: rotateX(-15deg); }
    100% { transform: rotateX(0deg); }
  }

  @keyframes move-forward {
    0% { transform: translateX(0px); }
    50% { transform: translateX(3px); }
    100% { transform: translateX(0px); }
  }

  @keyframes leaf-glow {
    0% { 
      stroke: var(--text-muted, #A8B3CF);
      filter: none;
    }
    100% { 
      stroke: var(--success, #22C55E);
      filter: drop-shadow(0 0 4px var(--success, #22C55E));
    }
  }

  @keyframes wave-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
  }

  /* Status Animations */
  @keyframes checkmark-draw {
    0% { 
      stroke-dasharray: 0 20;
      stroke-dashoffset: 0;
    }
    100% { 
      stroke-dasharray: 20 20;
      stroke-dashoffset: 0;
    }
  }

  @keyframes alert-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px); }
    75% { transform: translateX(2px); }
  }

  @keyframes warning-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }

  /* Action Animations */
  @keyframes camera-focus {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }

  @keyframes camera-flash {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }

  @keyframes refresh-bounce {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-15deg); }
    75% { transform: rotate(15deg); }
  }

  @keyframes edit-wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-3deg); }
    75% { transform: rotate(3deg); }
  }

  /* Navigation Animations */
  @keyframes slide-right {
    0% { transform: translateX(0px); }
    100% { transform: translateX(2px); }
  }

  @keyframes slide-down {
    0% { transform: translateY(0px); }
    100% { transform: translateY(2px); }
  }

  /* Specialized Animations */
  @keyframes voice-wave-analysis {
    0%, 100% { opacity: 1; transform: scaleY(1); }
    25% { opacity: 0.7; transform: scaleY(0.8); }
    50% { opacity: 0.9; transform: scaleY(1.2); }
    75% { opacity: 0.6; transform: scaleY(0.6); }
  }

  @keyframes analyzing-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  @keyframes speedometer-gauge {
    0% { transform: rotate(-45deg); }
    100% { transform: rotate(45deg); }
  }

  @keyframes scanning-lines {
    0% { transform: translateX(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(100%); opacity: 0; }
  }

  @keyframes car-bounce {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-2px); }
  }

  /* Complex Product Animations */
  @keyframes hands-glow {
    0% { filter: none; }
    100% { filter: drop-shadow(0 0 6px var(--accent-primary, #3AA6FF)); }
  }

  @keyframes tools-appear {
    0% { opacity: 0; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes truck-drive {
    0% { transform: translateX(0px); }
    25% { transform: translateX(2px) translateY(-1px); }
    50% { transform: translateX(4px); }
    75% { transform: translateX(2px) translateY(-1px); }
    100% { transform: translateX(0px); }
  }

  @keyframes eco-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }

  @keyframes recording-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes voice-analysis {
    0% { opacity: 0.5; }
    25% { opacity: 1; }
    50% { opacity: 0.7; }
    75% { opacity: 1; }
    100% { opacity: 0.5; }
  }
`;

/**
 * CSS Tokens for Premium Icons
 */
export const ICON_TOKENS = {
  // Color Tokens
  colors: {
    primary: 'var(--bg-primary, #0B1220)',
    secondary: 'var(--bg-secondary, #1a2332)',
    accent: 'var(--accent-primary, #3AA6FF)',
    accentHover: 'var(--accent-hover, #2563EB)',
    textPrimary: 'var(--text-primary, #E6ECFF)',
    textMuted: 'var(--text-muted, #A8B3CF)',
    success: 'var(--success, #22C55E)',
    warning: 'var(--warning, #F59E0B)',
    error: 'var(--error, #EF4444)'
  },

  // Size Tokens
  sizes: {
    xs: '12px',
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px'
  },

  // Stroke Width
  stroke: {
    thin: '1.5px',
    normal: '2px',
    thick: '2.5px',
    bold: '3px'
  },

  // Animation Tokens
  animation: {
    fast: '0.15s',
    normal: '0.2s',
    slow: '0.3s',
    slower: '0.5s'
  },

  // Shadow Tokens
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,.1)',
    md: '0 4px 8px rgba(0,0,0,.15)',
    lg: '0 6px 24px rgba(0,0,0,.25)',
    glow: '0 0 12px'
  }
};