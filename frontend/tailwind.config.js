/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00a854',
          greenLight: '#e6f7ef',
          greenHover: '#008f47',
          grayBg: '#f8f9fa',
          border: '#e5e7eb',
          textMuted: '#6b7280',
          orangePill: '#ff9800',
          orangeBg: '#fff3e0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
