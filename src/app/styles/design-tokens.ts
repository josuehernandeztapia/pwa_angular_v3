/**
 *  Design Tokens - Conductores PWA
 * Tokens centralizados para estilo enterprise minimalista (OpenAI-inspired)
 * Una sola fuente de verdad para colores, tipografía, espaciados y efectos
 */

export const DESIGN_TOKENS = {
  //  Colores
  color: {
    // Backgrounds base
    bg: {
      light: '#f8fafc',    // OpenAI light gray background /* OpenAI light-gray */
      dark: '#080808'      // OpenAI black /* OpenAI black */
    },

    // Paneles y tarjetas
    panel: {
      light: '#ffffff',    // OpenAI white /* OpenAI white */
      dark: '#1e293b'      // OpenAI dark text /* OpenAI dark-text */
    },

    // Texto
    text: {
      primary: '#080808',   // OpenAI black /* OpenAI black */
      secondary: '#737373', // OpenAI neutral gray /* OpenAI neutral */
      inverse: '#f1f5f9'    // OpenAI subtle background /* OpenAI subtle-bg */
    },

    // Colores de marca
    brand: {
      primary: '#080808',   // OpenAI black /* OpenAI black */
      success: '#737373',   // OpenAI neutral gray /* OpenAI neutral */
      warn: '#737373',      // OpenAI neutral gray /* OpenAI neutral */
      danger: '#737373'     // OpenAI neutral gray /* OpenAI neutral */
    },

    // Data Visualization Colors - OpenAI Compliant
    data: {
      primary: '#2563eb',    // Blue for primary data series
      secondary: '#16a34a',  // Green for success/positive metrics
      tertiary: '#9333ea',   // Purple for secondary data
      warning: '#ea580c',    // Orange for warnings
      danger: '#dc2626',     // Red for alerts/negative metrics
      neutral: '#6b7280',    // Gray for neutral data
      accent: '#0891b2',     // Cyan for accent data
      highlight: '#7c3aed'   // Violet for highlights
    },

    // Chart specific colors
    chart: {
      // Line charts
      line: {
        primary: '#2563eb',    // Primary line color
        secondary: '#16a34a',  // Secondary line color
        grid: '#e5e7eb',      // Grid lines
        axis: '#6b7280'       // Axis labels
      },
      // Bar charts
      bar: {
        primary: '#2563eb',    // Primary bar color
        secondary: '#16a34a',  // Secondary bar color
        tertiary: '#9333ea',   // Tertiary bar color
        background: 'transparent'
      },
      // Progress indicators
      progress: {
        complete: '#16a34a',   // Green for completed
        inProgress: '#2563eb', // Blue for in progress
        pending: '#6b7280'     // Gray for pending
      }
    },

    // Bordes y divisores
    border: '#e5e7eb',      // OpenAI light borders /* OpenAI light-border */

    // Estados de interacción
    hover: {
      light: '#f1f5f9',     // OpenAI subtle background /* OpenAI subtle-bg */
      dark: '#525252'       // OpenAI dark gray hover /* OpenAI dark-gray */
    }
  },

  // Radios de borde
  radius: {
    sm: '6px',    // Bordes sutiles
    md: '10px',   // Bordes estándar
    lg: '12px'    // Bordes prominentes
  },

  // Sombras
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.06)',      // Sombra sutil para elementos flotantes
    md: '0 8px 25px rgba(0,0,0,0.10)'     // Sombra media para modales y dropdowns
  },

  // Tipografía
  font: {
    family: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem' // 30px
    },
    weight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },

  // Espaciados
  spacing: {
    xs: '6px',    // Espaciado mínimo
    sm: '10px',   // Espaciado pequeño
    md: '16px',   // Espaciado estándar
    lg: '24px',   // Espaciado grande
    xl: '32px',   // Espaciado extra grande
    '2xl': '48px' // Espaciado muy grande
  },

  // Transiciones
  transition: {
    fast: '150ms ease-in-out',      // Transiciones rápidas (hover, focus)
    normal: '300ms ease-in-out',    // Transiciones estándar (modales, slides)
    slow: '500ms ease-in-out'       // Transiciones lentas (animaciones complejas)
  },

  // Breakpoints responsive
  breakpoint: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px'
  }
};

/**
 *  Utilidades de tokens
 */
export const getToken = (path: string): string => {
  const keys = path.split('.');
  let value: any = DESIGN_TOKENS;

  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      return '';
    }
  }

  return value;
};

/**
 * Data Visualization Color Utilities
 */
export const getDataColor = (type: 'primary' | 'secondary' | 'tertiary' | 'warning' | 'danger' | 'neutral' | 'accent' | 'highlight'): string => {
  return DESIGN_TOKENS.color.data[type];
};

export const getChartColor = (chartType: 'line' | 'bar' | 'progress', colorType: string): string => {
  return (DESIGN_TOKENS.color.chart as any)[chartType][colorType];
};

/**
 * Utilidades de tema
 */
export const theme = {
  isDark: () => document.documentElement.classList.contains('dark'),
  toggle: () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', theme.isDark() ? 'true' : 'false');
  },
  setDark: (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
  },
  initFromStorage: () => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
    }
  }
};
