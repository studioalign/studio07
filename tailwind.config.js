/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#131a56',
          accent: '#e6a4fe',
          secondary: {
            100: '#d59efd',
            200: '#b994f7',
            300: '#857bfc',
            400: '#423a88',
          },
        },
      },
    },
  },
  plugins: [],
};