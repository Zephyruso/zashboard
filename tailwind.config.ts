import daisyui from 'daisyui'
import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1792px',
    },
    extend: {
      colors: {
        ['low-latency']: 'oklch(0.648 0.15 160)',
        ['medium-latency']: 'rgb(250, 210, 75)',
        ['high-latency']: 'rgb(244, 96, 108)',
      },
      fontFamily: {
        MiSans: ['MiSans-VF', 'NotoEmoji', 'system-ui'],
        SarasaUI: ['SarasaUiSC-Regular', 'NotoEmoji', 'system-ui'],
        PingFang: ['PingFangSC-Regular', 'NotoEmoji', 'system-ui'],
        FiraSans: ['Fira Sans', 'NotoEmoji', 'system-ui'],
        SystemUI: ['NotoEmoji', 'system-ui'],
      },
    },
  },
  daisyui: {
    themes: true,
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
        },
        '.scrollbar-hidden': {
          'scrollbar-width': 'none',
        },
      })
    }),
    daisyui,
  ],
}
