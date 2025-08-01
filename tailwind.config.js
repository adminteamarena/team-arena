/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          orange: '#FF6B35',
          pink: '#E91E63',
        },
        secondary: {
          cyan: '#00BCD4',
          blue: '#2196F3',
        },
        accent: {
          purple: '#9C27B0',
          indigo: '#3F51B5',
        },
        background: {
          dark: '#0F172A',
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #FF6B35 0%, #E91E63 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #00BCD4 0%, #2196F3 100%)',
        'gradient-accent': 'linear-gradient(135deg, #9C27B0 0%, #3F51B5 100%)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
} 