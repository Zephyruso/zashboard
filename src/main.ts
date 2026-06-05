import '@/helper/dayjs'
import 'tippy.js/animations/scale.css'
import 'tippy.js/dist/tippy.css'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import { applyCustomThemes, applyKsuTheme } from './helper'
import { i18n } from './i18n'
import router from './router'

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

if (!localStorage.getItem('config/hidden-settings-items')) {
  localStorage.setItem(
    'config/hidden-settings-items',
    JSON.stringify({
      proxySettings: true,
      connectionSettings: true,
      'proxySettings.twoColumnProxyGroup': true,
      'backendSettings.backendSwitch': true,
      'backendSettings.dnsQuery': true,
      'proxySettings.independentLatencyTest': true,
      'proxySettings.displayGlobalByMode': true,
      'proxySettings.iconSettings': true,
      'connectionSettings.sourceIPLabels': true,
    }),
  )
}

const app = createApp(App)

app.use(router)
app.use(i18n)
app.mount('#app')
