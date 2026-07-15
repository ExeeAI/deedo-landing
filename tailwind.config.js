/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /*
       * "Architectural drawing set" palette: warm paper stock and ink, the real
       * brand navy, and clay for action.
       *
       * navy.DEFAULT is sampled straight from the logo artwork (the dominant
       * pixel in media/deedologo1by1.png is #123368) so the page and the mark
       * are the same blue — nothing here is invented. Clay is the complement:
       * warm terracotta against cool navy, which keeps CTAs legible without
       * competing with the logo.
       */
      colors: {
        paper: { DEFAULT: '#F5F2EB', deep: '#ECE7DB', shade: '#E0D9C9' },
        ink: { DEFAULT: '#171512', soft: '#4A453D', mute: '#837B6E' },
        navy: { DEFAULT: '#123368', deep: '#0B2049', light: '#27508F' },
        clay: { DEFAULT: '#C4562B', deep: '#A2431F', light: '#E07A4C' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: { survey: '0.18em' },
      keyframes: {
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'draw-x': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.15' } },
      },
      animation: {
        'rise-in': 'rise-in 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'draw-x': 'draw-x 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        blink: 'blink 1.4s steps(1, end) infinite',
      },
    },
  },
  plugins: [],
};
