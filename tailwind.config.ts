import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ['low-latency']: 'var(--color-low-latency, oklch(0.66 0.1 160))',
        ['medium-latency']: 'var(--color-medium-latency, rgb(255, 197, 4))',
        ['high-latency']: 'var(--color-high-latency, rgb(244, 96, 108))',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.scrollbar-hidden': {
          'scrollbar-width': 'none!important',
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
        },
      })
    }),
  ],
}
