/**
 * 🎨 Design Tokens - Conductores PWA
 * Tokens centralizados para estilo enterprise minimalista (OpenAI-inspired)
 * Una sola fuente de verdad para colores, tipografía, espaciados y efectos
 */

export const DESIGN_TOKENS = {
  // 🎨 Colores
  color: {
    // Backgrounds base
    bg: {
      light: '#F9FAFB',    // Gris muy claro para modo light
      dark: '#0F172A'      // Azul muy oscuro para modo dark
    },

    // Paneles y tarjetas
    panel: {
      light: '#FFFFFF',    // Blanco puro para cards en light
      dark: '#111827'      // Gris oscuro para cards en dark
    },

    // Texto
    text: {
      primary: '#111827',   // Negro para texto principal
      secondary: '#6B7280', // Gris para texto secundario
      inverse: '#F3F4F6'    // Gris claro para texto en fondos oscuros
    },

    // Colores de marca
    brand: {
      primary: '#0EA5E9',   // Azul cyan para acciones principales
      success: '#22C55E',   // Verde para estados exitosos
      warn: '#F59E0B',      // Amarillo/naranja para advertencias
      danger: '#EF4444'     // Rojo para errores y acciones peligrosas
    },

    // Bordes y divisores
    border: '#E5E7EB',      // Gris claro para bordes

    // Estados de interacción
    hover: {
      light: '#F3F4F6',     // Hover sutil en modo light
      dark: '#1F2937'       // Hover sutil en modo dark
    }
  },

  // 📐 Radios de borde
  radius: {
    sm: '6px',    // Bordes sutiles
    md: '10px',   // Bordes estándar
    lg: '12px'    // Bordes prominentes
  },

  // 🌫️ Sombras
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.06)',      // Sombra sutil para elementos flotantes
    md: '0 8px 25px rgba(0,0,0,0.10)'     // Sombra media para modales y dropdowns
  },

  // ✍️ Tipografía
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

  // 📏 Espaciados
  spacing: {
    xs: '6px',    // Espaciado mínimo
    sm: '10px',   // Espaciado pequeño
    md: '16px',   // Espaciado estándar
    lg: '24px',   // Espaciado grande
    xl: '32px',   // Espaciado extra grande
    '2xl': '48px' // Espaciado muy grande
  },

  // ⏱️ Transiciones
  transition: {
    fast: '150ms ease-in-out',      // Transiciones rápidas (hover, focus)
    normal: '300ms ease-in-out',    // Transiciones estándar (modales, slides)
    slow: '500ms ease-in-out'       // Transiciones lentas (animaciones complejas)
  },

  // 📱 Breakpoints responsive
  breakpoint: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px'
  }
};

/**
 * 🎯 Utilidades de tokens
 */
export const getToken = (path: string): string => {
  const keys = path.split('.');
  let value: any = DESIGN_TOKENS;

  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Token not found: ${path}`);
      return '';
    }
  }

  return value;
};

/**
 * 🌙 Utilidades de tema
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