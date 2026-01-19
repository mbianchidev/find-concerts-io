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
        'metal-steel': '#71797E',
        'metal-gunmetal': '#2C3539',
        'metal-charcoal': '#36454F',
        'metal-titanium': '#878681',
        'metal-silver': '#B0B0B0',
        'metal-chrome': '#3D3D3D',
        'accent-crimson': '#8B0000',
        'accent-cobalt': '#0047AB',
        'accent-orange': '#CC5500',
        'void-black': '#0D0D0D',
        'obsidian': '#0B1215',
        'matte-black': '#1A1A1A',
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'body': ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'pulse-sheen': 'pulse-sheen 3s ease-in-out infinite',
        'precision-float': 'precision-float 5s ease-in-out infinite',
        'precision-float-slow': 'precision-float-slow 7s ease-in-out infinite',
        'mechanical-slide': 'mechanical-slide-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'mechanical-scale': 'mechanical-scale 0.4s cubic-bezier(0.8, 0.0, 0.2, 1) forwards',
        'shimmer-metal': 'shimmer-metal 2s infinite',
        'rotate-slow': 'rotate-slow 20s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'metal-steel': '0 2px 12px rgba(113, 121, 126, 0.3), 0 0 4px rgba(176, 176, 176, 0.2)',
        'metal-crimson': '0 2px 10px rgba(139, 0, 0, 0.4), 0 0 4px rgba(139, 0, 0, 0.2)',
        'metal-cobalt': '0 2px 10px rgba(0, 71, 171, 0.4), 0 0 4px rgba(0, 71, 171, 0.2)',
        'metal-orange': '0 2px 10px rgba(204, 85, 0, 0.4), 0 0 4px rgba(204, 85, 0, 0.2)',
      },
    },
  },
  plugins: [],
}