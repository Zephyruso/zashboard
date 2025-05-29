import '@renderer/helper/dayjs'
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

app.use(router)
app.use(i18n)
app.mount('#app')
