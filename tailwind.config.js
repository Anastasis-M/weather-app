/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      colors: {
        bg: '#0a0a0b',
        panel: '#111114',
        panel2: '#17171c',
        line: '#22222a',
        ink: '#f5f5f7',
        sub: '#a0a0aa',
        mute: '#6b6b75',
        accent: '#fbbf24',
        rain: '#60a5fa',
        snow: '#bae6fd',
        warn: '#f59e0b'
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums'
      }
    }
  },
  plugins: []
};
