import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#E3EAE2',
          medium: '#C0D2BE',
          accent: '#466758',
          dark: '#3E5A4E',
        },
        base: {
          background: '#FAFAFA',
          white: '#FFFFFF',
          disable: '#F2F2F2',
          border: '#D9D9D9',
        },
        content: {
          text: '#595959',
          title: '#262626',
        },
        error: '#E30000',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'h0': ['64px', { lineHeight: '1.1', fontWeight: '700' }],
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'h3': ['16px', { lineHeight: '1.4', fontWeight: '700' }],
        'paragraph': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'tag-bold': ['14px', { lineHeight: '1.5', fontWeight: '700' }],
        'tag-semibold': ['14px', { lineHeight: '1.5', fontWeight: '600' }],
        'tag-medium': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        'desc-medium': ['12px', { lineHeight: '1.5', fontWeight: '500' }],
        'desc-regular': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      borderRadius: {
        'huge': '48px',
        'big': '32px',
        'regular': '24px',
        'small': '12px',
        'tiny': '8px',
      },
      spacing: {
        '3xs': '12px',
        '2xs': '24px',
        'xs': '32px',
        'sm': '48px',
      },
      keyframes: {
        'drawer-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'drawer-out': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'overlay-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
      },
      animation: {
        'drawer-in': 'drawer-in 300ms ease-out',
        'drawer-out': 'drawer-out 300ms ease-in',
        'overlay-in': 'overlay-in 300ms ease-out',
        'overlay-out': 'overlay-out 300ms ease-in',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
