/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        outdoor: {
          teal: '#006D77',
          'teal-dark': '#004E57',
          coral: '#D9544D',
          top: '#C52233',
          text: '#102A30',
          'text-secondary': '#465A60',
          bg: '#F7F5EF',
          card: '#FFFFFF',
          positive: '#147A52',
          // Dark mode
          'dark-bg': '#071B20',
          'dark-card': '#102A30',
          'dark-text': '#F5F7F4',
          'dark-secondary': '#B8C8CB',
          'dark-route': '#55C6CE',
          'dark-top': '#FF5964',
        },
      },
      fontFamily: {
        heading: ['"Nunito Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'badge': '8px',
      },
    },
  },
  plugins: [],
};
