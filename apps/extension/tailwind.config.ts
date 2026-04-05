/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#07070e',
          100: '#0d0d1a',
          200: '#121220',
          300: '#1a1a2e',
          400: '#23233a',
        },
        cyan: {
          DEFAULT: '#00d4ff',
          dim: '#0ea5c9',
        },
        purple: {
          DEFAULT: '#8b5cf6',
          dim: '#6d28d9',
        },
        verified: '#10b981',
        warn: '#f59e0b',
        ai: '#f43f5e',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      width: {
        popup: '380px',
      },
      maxHeight: {
        popup: '580px',
      },
    },
  },
  plugins: [],
};
