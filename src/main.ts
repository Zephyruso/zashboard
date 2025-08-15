import '@/helper/dayjs'
import 'tippy.js/animations/scale.css'
import 'tippy.js/dist/tippy.css'
import { createApp } from 'vue'
import App from './App.vue'
import { loadFonts } from './assets/load-fonts'
import './assets/main.css'
import './assets/theme.css'
import { applyCustomThemes } from './helper'
import { i18n } from './i18n'
import router from './router'

applyCustomThemes()
loadFonts()

const app = createApp(App)

app.use(router)
app.use(i18n)
app.mount('#app')
