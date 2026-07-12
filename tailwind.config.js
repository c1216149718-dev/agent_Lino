/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 22px 70px rgba(10, 10, 10, 0.08)',
        insetLine: 'inset 0 0 0 1px rgba(255,255,255,0.78)',
      },
    },
  },
  plugins: [],
}
