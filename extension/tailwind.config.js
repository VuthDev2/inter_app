/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#05050A',
        primary: '#2563EB',
        surface: 'rgba(255, 255, 255, 0.03)',
        border: 'rgba(255, 255, 255, 0.1)',
        text: '#FFFFFF',
        muted: 'rgba(255, 255, 255, 0.6)'
      }
    },
  },
  plugins: [],
}
