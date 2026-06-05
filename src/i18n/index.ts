import { LANG } from '@/constant'
import { language } from '@/store/settings'
import { createI18n } from 'vue-i18n'
import en from './en'
import zh from './zh'
import zhTW from './zh-tw'

export const i18n = createI18n({
  legacy: false,
  locale: language.value,
  messages: {
    [LANG.EN_US]: en,
    [LANG.ZH_CN]: zh,
    [LANG.ZH_TW]: zhTW,
  },
})
