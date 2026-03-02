import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        dim: 'var(--color-dim)',
      },
      fontFamily: {
        terminal: ['VT323', 'Courier New', 'monospace'],
      },
      animation: {
        flicker: 'flicker 0.1s alternate infinite',
        blink: 'blink 1s step-end infinite',
        scanline: 'scanline 8s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%': { opacity: '0.97' },
          '100%': { opacity: '1.0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
