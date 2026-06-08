/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          dark: '#3730A3',
          light: '#E0E7FF',
        },
        sidebar: {
          DEFAULT: '#1E1B4B',
          dark: '#020617',
        },
      },
    },
  },
  plugins: [],
};
