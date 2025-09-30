/**
 *  Design Tokens - Conductores PWA
 * Tokens centralizados para estilo enterprise minimalista (OpenAI-inspired)
 * Una sola fuente de verdad para colores, tipografía, espaciados y efectos
 */

const resolveCssColor = (variableName: string): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return `var(${variableName})`;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || `var(${variableName})`;
};

export const DESIGN_TOKENS = {
  //  Colores
  color: {
    // Backgrounds base
    bg: {
      get light() { return resolveCssColor('--color-bg-secondary'); },
      get dark() { return resolveCssColor('--openai-black'); }
    },

    // Paneles y tarjetas
    panel: {
      get light() { return resolveCssColor('--openai-white'); },
      get dark() { return resolveCssColor('--color-primary-800'); }
    },

    // Texto
    text: {
      get primary() { return resolveCssColor('--color-text-primary'); },
      get secondary() { return resolveCssColor('--color-text-secondary'); },
      get inverse() { return resolveCssColor('--color-bg-tertiary'); }
    },

    // Colores de marca
    brand: {
      get primary() { return resolveCssColor('--openai-black'); },
      get success() { return resolveCssColor('--accent-primary'); },
      get warn() { return resolveCssColor('--accent-amber-500'); },
      get danger() { return resolveCssColor('--accent-red-500'); }
    },

    // Data Visualization Colors - OpenAI Compliant
    data: {
      get primary() { return resolveCssColor('--accent-blue-600'); },
      get secondary() { return resolveCssColor('--accent-green-500'); },
      get tertiary() { return resolveCssColor('--accent-purple-600'); },
      get warning() { return resolveCssColor('--accent-amber-500'); },
      get danger() { return resolveCssColor('--accent-red-500'); },
      get neutral() { return resolveCssColor('--color-text-secondary'); },
      get accent() { return resolveCssColor('--accent-cyan-500'); },
      get highlight() { return resolveCssColor('--accent-purple-600'); }
    },

    // Chart specific colors
    chart: {
      // Line charts
      line: {
        get primary() { return resolveCssColor('--accent-blue-600'); },
        get secondary() { return resolveCssColor('--accent-green-500'); },
        get grid() { return resolveCssColor('--color-border-primary'); },
        get axis() { return resolveCssColor('--color-text-secondary'); }
      },
      // Bar charts
      bar: {
        get primary() { return resolveCssColor('--accent-blue-600'); },
        get secondary() { return resolveCssColor('--accent-green-500'); },
        get tertiary() { return resolveCssColor('--accent-purple-600'); },
        background: 'transparent'
      },
      // Progress indicators
      progress: {
        get complete() { return resolveCssColor('--accent-green-500'); },
        get inProgress() { return resolveCssColor('--accent-blue-600'); },
        get pending() { return resolveCssColor('--color-text-secondary'); }
      }
    },

    // Bordes y divisores
    get border() { return resolveCssColor('--color-border-primary'); },

    // Estados de interacción
    hover: {
      get light() { return resolveCssColor('--color-bg-tertiary'); },
      get dark() { return resolveCssColor('--color-border-focus'); }
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
