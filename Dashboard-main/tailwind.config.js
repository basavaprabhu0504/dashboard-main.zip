/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#030712',
          900: '#07131f',
          800: '#0f172a',
          700: '#18243b',
          600: '#23354d',
          500: '#2f4d69',
          400: '#4b7aa2',
          300: '#5ba3ce',
          200: '#9bd3ff',
          100: '#d8f3ff',
        },
      },
      boxShadow: {
        panel: '0 10px 40px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};
