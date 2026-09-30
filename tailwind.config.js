/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        ink: {
          900: '#0F1B33',
          800: '#1B2A4A',
          700: '#28395E',
          600: '#3A4D75',
        },
        mist: {
          50: '#F5F7FA',
          100: '#EEF1F6',
          200: '#E1E6EE',
        },
        signal: {
          blue: '#2F6FED',
          amber: '#E8A33D',
          teal: '#1F9D6B',
          red: '#D94F4F',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 27, 51, 0.06)',
      },
    },
  },
  plugins: [],
}
