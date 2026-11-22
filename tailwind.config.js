/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      colors: {
        canada: {
          red: '#E11D48',
          dark: '#080C14',
          card: '#111827',
          border: '#1E293B',
          blue: '#2563EB',
        }
      }
    },
  },
  plugins: [],
}
