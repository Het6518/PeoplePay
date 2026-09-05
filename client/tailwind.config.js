/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF7',
          100: '#FAF9F5',
          200: '#F3F0E6',
          300: '#E8E3D4',
        },
        stone: {
          850: '#1F1F23',
          900: '#18181B',
          950: '#0F0F12',
        },
        amber: {
          50: '#FFFDF0',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#F59E0B',
          500: '#D97706',
          600: '#B45309',
        },
        primary: {
          50: '#FFFDF0',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#F59E0B',
          500: '#D97706',
          600: '#18181B',
          700: '#0F0F12',
          800: '#09090B',
          900: '#000000',
          950: '#000000',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        'card': '1.75rem', // 28px
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.03), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 10px 30px -4px rgba(0, 0, 0, 0.04), 0 4px 12px -2px rgba(0, 0, 0, 0.02)',
        'glow': '0 0 40px -10px rgba(245, 158, 11, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
