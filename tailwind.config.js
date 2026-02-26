/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4211d4',
        'background-dark': '#151022',
        'surface-dark': '#1e1733',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        panel: '0 10px 24px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};

