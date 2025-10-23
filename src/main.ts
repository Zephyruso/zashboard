import '@/helper/dayjs'
import '@fontsource/fira-sans/index.css'
import 'subsetted-fonts/MiSans-VF/MiSans-VF.css'
import 'subsetted-fonts/PingFangSC-Regular/PingFangSC-Regular.css'
import 'subsetted-fonts/SarasaUiSC-Regular/SarasaUiSC-Regular.css'
import 'tippy.js/animations/scale.css'
import 'tippy.js/dist/tippy.css'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/load-fonts'
import './assets/main.css'
import './assets/theme.css'
import { applyCustomThemes } from './helper'
import './helper/syncSettings'
import { i18n } from './i18n'
import router from './router'
import './store/status'
import './store/tray'

applyCustomThemes()

const app = createApp(App)

app.use(router)
app.use(i18n)
app.mount('#app')
