import { LANG } from '@/config'
import { language } from '@/store/settings'
import { createI18n } from 'vue-i18n'
import en from './en'
import ru from './ru'
import zh from './zh'

export const i18n = createI18n({
  locale: language.value,
  messages: {
    [LANG.EN_US]: en,
    [LANG.ZH_CN]: zh,
    [LANG.RU_RU]: ru,
  },
})
