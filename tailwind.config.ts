import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ['low-latency']: 'var(--color-low-latency, oklch(0.648 0.15 160))',
        ['medium-latency']: 'var(--color-medium-latency, rgb(250, 210, 75))',
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
