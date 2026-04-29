/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Syne', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        carbon: {
          950: '#070709',
          900: '#0d0d12',
          800: '#131318',
          700: '#1a1a22',
          600: '#22222d',
          500: '#2e2e3d',
        },
        neon: {
          green:  '#00ff88',
          blue:   '#00d4ff',
          amber:  '#ffb347',
          red:    '#ff4757',
          purple: '#a855f7',
        },
      },
      animation: {
        'pulse-slow':    'pulse 3s ease-in-out infinite',
        'scan':          'scan 2s linear infinite',
        'slide-up':      'slideUp 0.4s ease-out',
        'fade-in':       'fadeIn 0.3s ease-out',
        'glow':          'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        slideUp: {
          '0%':   { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        glow: {
          '0%':   { textShadow: '0 0 4px #00ff88' },
          '100%': { textShadow: '0 0 20px #00ff88, 0 0 40px #00ff8844' },
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
