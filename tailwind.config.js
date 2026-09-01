/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app.jsx",
    "./constants.jsx",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        gujarati: ['"Noto Sans Gujarati"', 'sans-serif'],
      },
      colors: {
        primary: '#1e3a8a',
        secondary: '#2563EB',
        dark: '#0F172A',
      }
    }
  },
  plugins: []
};
