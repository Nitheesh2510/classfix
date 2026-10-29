/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f1f4f9',
          100: '#dde5f0',
          200: '#c0cfe3',
          300: '#95b0d0',
          400: '#6489b7',
          500: '#446b9f',
          600: '#355586',
          700: '#2c456c',
          800: '#1e2f4d',
          900: '#152238',
          950: '#0d1726',
        },
        teal: {
          50: '#eefbf8',
          100: '#d2f5ee',
          200: '#a9eade',
          300: '#73d8ca',
          400: '#3fbeb1',
          500: '#24a197',
          600: '#1a817b',
          700: '#186763',
          800: '#175251',
          900: '#164544',
          950: '#06282a',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(21 34 56 / 0.06), 0 1px 3px 0 rgb(21 34 56 / 0.05)',
        panel: '0 4px 16px -2px rgb(21 34 56 / 0.10)',
      },
      borderRadius: {
        card: '0.625rem',
      },
    },
  },
  plugins: [],
};
