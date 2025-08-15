/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilitar el modo oscuro basado en clase
  theme: {
    extend: {
      colors: {
        // Direct mapping from user's palette for clarity
        primary: '#083C70',
        'primary-light': '#1E5FA8',
        'accent-red': '#C62828',
        'accent-turquoise': '#1AB6B3',
        'accent-warm': '#E9DFD3',

        // Light Mode semantic colors
        'bg-main': '#FFFFFF',
        'bg-alt': '#F5F7FA',
        'text-main': '#222222',
        'text-muted': '#6E6E6E',
        'border-main': '#E9DFD3', // Soft beige border
        'text-on-primary': '#FFFFFF', // For text on dark primary backgrounds

        // Dark Mode semantic colors
        'bg-dark': '#0A192F',
        'surface-dark': '#112240', // A slightly lighter surface for dark mode cards
        'text-light': '#E6F1FF',
        'text-muted-dark': '#A8B2D1',
        'border-dark': '#243A59',
      },
      animation: {
        'infinite-scroll': 'infinite-scroll 40s linear infinite',
      },
      keyframes: {
        'infinite-scroll': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
