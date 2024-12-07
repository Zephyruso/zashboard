import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1800px',
    },
    extend: {
      colors: {
        ['low-latency']: 'rgb(181,196,177)',
        ['medium-latency']: 'rgb(224, 200, 166)',
        ['high-latency']: '#C68A8A',
      },
      backgroundColors: {
        ['low-latency']: 'rgb(181,196,177)',
        ['medium-latency']: 'rgb(224, 200, 166)',
        ['high-latency']: '#C68A8A',
      },
      fontFamily: {
        MiSans: ['MiSans-VF', 'NotoEmoji', 'system-ui'],
        SarasaUI: ['SarasaUiSC-Regular', 'NotoEmoji', 'system-ui'],
        PingFang: ['PingFangSC-Regular', 'NotoEmoji', 'system-ui'],
        FiraSans: ['Fira Sans', 'NotoEmoji', 'system-ui'],
        SystemUI: ['system-ui', 'NotoEmoji'],
      },
    },
  },
  daisyui: {
    themes: true,
  },
  plugins: [
    daisyui,
  ],
}