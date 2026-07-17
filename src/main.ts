import '@/api/http'
import '@/helper/dayjs'
import 'tippy.js/animations/scale.css'
import 'tippy.js/dist/tippy.css'
import { createApp } from 'vue'
import App from './App.vue'
import { loadFonts } from './assets/load-fonts'
import './assets/main.css'
import { applyCustomThemes, applyKsuTheme } from './helper'
import { i18n, setLocale } from './i18n'
import router from './router'
import { language } from './store/settings'

const isEdge = /Edg\//.test(navigator.userAgent)

if (isEdge) {
  const originalReplaceState = history.replaceState
  history.replaceState = function (...args) {
    if (document.visibilityState === 'hidden') return
    return originalReplaceState.apply(this, args)
  }
}

applyCustomThemes()
applyKsuTheme()
loadFonts()

const app = createApp(App)

app.use(router)
app.use(i18n)
// 非英语用户先装载所选语言包(LAN 场景一个小 chunk 的往返),避免键名闪烁
setLocale(language.value).finally(() => {
  app.mount('#app')
})
