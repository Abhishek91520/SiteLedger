/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern soft color palette
        progress: {
          pending: '#FF6B6B',      // Soft coral red - 0%
          partial: '#FFB84D',      // Warm amber - 1-99%
          complete: '#51CF66',     // Fresh green - 100%
          notApplicable: '#ADB5BD' // Soft gray - N/A
        },
        primary: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
        // Soft accent colors
        accent: {
          blue: '#4DABF7',
          purple: '#9775FA',
          pink: '#F783AC',
          teal: '#20C997',
          orange: '#FF922B',
        },
        // Neutral soft tones
        neutral: {
          50: '#FAFBFC',
          100: '#F1F3F5',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
          600: '#868E96',
          700: '#495057',
          800: '#343A40',
          900: '#212529',
        },
        // Background variants
        background: {
          light: '#FFFFFF',
          soft: '#FAFAFA',
          muted: '#F1F3F5',
        },
        // Dark mode colors
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          hover: '#334155',
          border: '#334155',
          text: '#F1F5F9',
          muted: '#94A3B8',
        }
      },
      fontFamily: {
        sans: ['Quicksand', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Quicksand', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.6' }],
        'xl': ['1.25rem', { lineHeight: '1.6' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['1.875rem', { lineHeight: '1.3' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'soft-xl': '0 12px 36px rgba(0, 0, 0, 0.10)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.15)',
        'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
