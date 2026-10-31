import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#121212', secondary: '#4a4a4a', muted: '#6b6b6b' },
        canvas: '#ffffff',
        hairline: '#e2e2e2',
        'live-red': '#c70000',
        'surface-subtle': '#f7f7f7',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', '"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        editorial: '1280px',
      },
    },
  },
  plugins: [],
} satisfies Config
