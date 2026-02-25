import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        surface: '#1a1a1a',
        surface2: '#252525',
        surface3: '#2f2f2f',
        border: '#2a2a2a',
        text: '#e8e8e8',
        text2: '#999',
        accent: '#7c4dff',
        accent2: '#651fff',
        green: '#4caf50',
        red: '#ef5350',
        orange: '#ff9800',
        blue: '#42a5f5',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
