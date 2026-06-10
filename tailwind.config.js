/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'bg-primary': '#0f0f1a',
        'bg-secondary': '#1a1a2e',
        'bg-tertiary': '#16213e',
        'bg-card': '#1e1e36',
        'bg-hover': '#2a2a4a',
        'accent': '#00d4ff',
        'accent-secondary': '#7b2ff7',
        'accent-warm': '#ff6b35',
        'text-primary': '#e8e8f0',
        'text-secondary': '#9999b8',
        'text-muted': '#666688',
        'border-custom': '#2d2d50',
        'border-light': '#3d3d60',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(123, 47, 247, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 212, 255, 0.2)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)' },
        },
      },
    },
  },
  plugins: [],
};
