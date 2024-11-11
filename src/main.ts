import './assets/main.css'
import 'dayjs/locale/zh-cn'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import router from './router'
import en from './i18n/en'
import zh from './i18n/zh'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const i18n = createI18n({
  locale: 'en',
  messages: {
    en,
    zh
  }
})
const app = createApp(App)

app.use(router)
app.use(i18n)
app.mount('#app')
