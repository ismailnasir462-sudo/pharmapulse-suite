/** @type {import('tailwindcss').Config} */

import tailwindcss from '@tailwindcss/vite';
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pharmacy: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          900: '#115e59',
        },
        surface: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          sidebar: '#0F172A',
        }
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      }
    },
  },
  plugins: [],
}