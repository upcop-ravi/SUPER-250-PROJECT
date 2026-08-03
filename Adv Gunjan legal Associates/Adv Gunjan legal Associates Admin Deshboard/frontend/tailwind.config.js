/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#072C22',
          950: '#031712',
          800: '#115243',
        },
        gold: {
          400: '#D4AF37',
          500: '#C5A059',
          600: '#A3803B',
          100: '#F6EFE2',
        },
      },
    },
  },
  plugins: [],
}
