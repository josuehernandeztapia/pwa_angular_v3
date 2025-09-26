/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        surface2: 'var(--color-surface-2)',
        border: 'var(--color-border)',
        ink: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)'
        },
        brand: {
          primary: '#0EA5E9',
          success: '#22C55E',
          warn: '#F59E0B',
          danger: '#EF4444'
        },
        bg: {
          light: '#F9FAFB',
          dark: '#0F172A'
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          inverse: '#F3F4F6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto']
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px'
      },
      boxShadow: {
        none: '0 0 #0000',
        sm: 'var(--shadow-elev-1)',
        md: '0 8px 25px rgba(0,0,0,0.10)'
      }
    }
  },
  plugins: []
}

