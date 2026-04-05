/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0e0e12',
        surface: '#0e0e12',
        'surface-container': '#19191e',
        'surface-container-high': '#1f1f25',
        'surface-container-highest': '#25252b',
        primary: '#BC13FE',
        'primary-dim': '#b90afc',
        'outline-variant': '#48474c'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
