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
          primary: '#737373', /* OpenAI neutral */
          success: '#737373', /* OpenAI neutral */
          warn: '#737373', /* OpenAI neutral */
          danger: '#737373' /* OpenAI neutral */
        },
        bg: {
          light: '#ffffff', /* OpenAI white */
          dark: '#080808' /* OpenAI black */
        },
        text: {
          primary: '#080808', /* OpenAI black */
          secondary: '#737373', /* OpenAI neutral */
          inverse: '#ffffff' /* OpenAI white */
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

