/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './public/assets/app.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Barlow Condensed"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          950: '#0B1120',
          900: '#111827',
          850: '#162033',
          800: '#1E293B',
          700: '#334155',
        },
        cyan: {
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        gold: {
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
        },
      },
    },
  },
  plugins: [],
};
