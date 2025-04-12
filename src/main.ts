import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import 'tippy.js/animations/scale.css'
import 'tippy.js/dist/tippy.css'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import './assets/theme.css'
import { applyCustomThemes } from './helper'
import { i18n } from './i18n'
import router from './router'

applyCustomThemes()

if (import.meta.env.MODE === 'cdn-fonts') {
  const createLink = (href: string) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.media = 'print'
    link.onload = () => {
      link.media = 'all'
    }
    document.head.appendChild(link)
  }

  createLink('https://unpkg.com/subsetted-fonts@latest/MiSans-VF/MiSans-VF.css')
  createLink('https://unpkg.com/subsetted-fonts@latest/SarasaUiSC-Regular/SarasaUiSC-Regular.css')
  createLink('https://unpkg.com/subsetted-fonts@latest/PingFangSC-Regular/PingFangSC-Regular.css')
  createLink('https://unpkg.com/@fontsource/fira-sans')
} else {
  import('@fontsource/fira-sans/index.css')
  import('subsetted-fonts/MiSans-VF/MiSans-VF.css')
  import('subsetted-fonts/SarasaUiSC-Regular/SarasaUiSC-Regular.css')
  import('subsetted-fonts/PingFangSC-Regular/PingFangSC-Regular.css')
}

const app = createApp(App)

function customRounding(value) {
  return Math.floor(value);
}

const thresholds = [
  { l: 's', r: 1 },
  { l: 'ss', r: 59, d: 'second' },
  { l: 'm', r: 1 },
  { l: 'mm', r: 59, d: 'minute' },
  { l: 'h', r: 1  },
  { l: 'hh', r: 23, d: 'hour' },
  { l: 'd', r: 1 },
  { l: 'dd', r: 29, d: 'day' },
  { l: 'M', r: 1 },
  { l: 'MM', r: 11, d: 'month' },
  { l: 'y', r: 1 },
  { l: 'yy', d: 'year' }
];

dayjs.extend(relativeTime, { rounding: customRounding, thresholds })
dayjs.extend(updateLocale)
dayjs.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: 'seconds',
    ss: '%d seconds',
    m: '1 minute',
    mm: '%d minutes',
    h: '1 hour',
    hh: '%d hours',
    d: '1 day',
    dd: '%d days',
    M: '1 month',
    MM: '%d months',
    y: '1 year',
    yy: '%d years',
  }
})

dayjs.updateLocale('zh-cn', {
  relativeTime: {
    future: '%s 内',
    past: '%s 前',
    s: '几秒',
    ss: '%d 秒',
    m: '1 分钟',
    mm: '%d 分钟',
    h: '1 小时',
    hh: '%d 小时',
    d: '1 天',
    dd: '%d 天',
    M: '1 个月',
    MM: '%d 个月',
    y: '1 年',
    yy: '%d 年'
  }
})

dayjs.updateLocale('ru', {
  relativeTime: {
    future: 'через %s',
    past: '%s назад',
    s: 'несколько секунд',
    ss: '%d секунд',
    m: 'минуту',
    mm: '%d минут',
    h: 'час',
    hh: '%d часов',
    d: 'день',
    dd: '%d дней',
    M: 'месяц',
    MM: '%d месяцев',
    y: 'год',
    yy: '%d лет'
  }
})
app.use(router)
app.use(i18n)
app.mount('#app')
