/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        onaccent: 'rgb(var(--onaccent) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)'
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        }
      },
      animation: { pulseRing: 'pulseRing 1.6s ease-out infinite' }
    }
  },
  plugins: []
};
