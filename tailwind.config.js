/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'neon-pink': '#FF10F0',
        'neon-cyan': '#00FFFF',
        'neon-lime': '#ADFF2F',
        'neon-orange': '#FF6B00',
        'neon-purple': '#B026FF',
        'neon-blue': '#0D7FF5',
        'dark-space': '#0A0A0F',
        'dark-void': '#13131F',
        'dark-shadow': '#1C1C2E',
        'dark-purple': '#1E1730',
        'dark-purple-light': '#2D2045',
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'body': ['Exo 2', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        'gradient': 'gradient-shift 5s ease infinite',
        'flicker': 'neon-flicker 4s ease-in-out infinite',
        'slide-in': 'slide-in-up 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neon-pink': '0 0 20px rgba(255, 16, 240, 0.6), 0 0 40px rgba(255, 16, 240, 0.4)',
        'neon-cyan': '0 0 20px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.4)',
        'neon-lime': '0 0 20px rgba(173, 255, 47, 0.6), 0 0 40px rgba(173, 255, 47, 0.4)',
        'neon-orange': '0 0 20px rgba(255, 107, 0, 0.6), 0 0 40px rgba(255, 107, 0, 0.4)',
      },
    },
  },
  plugins: [],
}