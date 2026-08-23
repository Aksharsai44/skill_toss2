/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        // Two-layer elevation: a hairline contact shadow plus a soft ambient one.
        // Depth scales with surface size — chips/rows stay flat, dialogs lift most.
        soft: '0 1px 1px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.05)',
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.16)',
        pop: '0 1px 2px rgba(15, 23, 42, 0.06), 0 18px 40px -18px rgba(15, 23, 42, 0.26)',
      },
      borderRadius: {
        sm: '0.125rem', // 2px
        md: '0.375rem', // 6px
        lg: '0.5rem', // 8px — icon tiles, avatars, icon buttons
        xl: '0.625rem', // 10px — larger tiles, menus, banners
        '2xl': '1rem', // 16px
        // Semantic tokens — consumed by .card / .btn / .input / .sidebar-link
        // in src/index.css. Change these to retune the product's corner language.
        control: '0.5rem', // 8px — buttons, inputs, nav links
        card: '0.625rem', // 10px — surfaces
        dialog: '0.875rem', // 14px — modals, popovers
      },
      fontSize: {
        // Size-specific optical tuning: letter-spacing tightens and leading
        // compresses as type scales up. Body sizes keep Tailwind's defaults.
        '2xl': ['1.5rem', { lineHeight: '1.9rem', letterSpacing: '-0.018em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.021em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.024em' }],
        '5xl': ['3rem', { lineHeight: '1.06', letterSpacing: '-0.028em' }],
        '6xl': ['3.75rem', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
        '7xl': ['4.5rem', { lineHeight: '1.02', letterSpacing: '-0.032em' }],
      },
      animation: {
        'fade-in': 'fadeIn 180ms cubic-bezier(0.23, 1, 0.32, 1)',
        'slide-up': 'slideUp 360ms cubic-bezier(0.23, 1, 0.32, 1)',
        'scale-in': 'scaleIn 180ms cubic-bezier(0.23, 1, 0.32, 1)',
        'tab-content': 'tabContent 180ms cubic-bezier(0.23, 1, 0.32, 1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        tabContent: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
