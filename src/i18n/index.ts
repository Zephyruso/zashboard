import { LANG } from '@/constant'
import { language } from '@/store/settings'
import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import en from './en'

// 语言包按需加载:默认只打 en 兜底,其余三份(~48KB)不再全量进 entry。
const localeLoaders: Record<string, (() => Promise<{ default: typeof en }>) | undefined> = {
  [LANG.ZH_CN]: () => import('./zh'),
  [LANG.ZH_TW]: () => import('./zh-tw'),
  [LANG.RU_RU]: () => import('./ru'),
}

export const i18n = createI18n({
  legacy: false,
  locale: LANG.EN_US,
  fallbackLocale: LANG.EN_US,
  messages: {
    [LANG.EN_US]: en,
  },
})

export const setLocale = async (lang: string) => {
  const loader = localeLoaders[lang]
  // 有对应包的语言按需装载;未知语言回退英语
  const target = loader || lang === LANG.EN_US ? lang : LANG.EN_US

  if (loader && !(i18n.global.availableLocales as string[]).includes(lang)) {
    const messages = await loader()

    i18n.global.setLocaleMessage(lang, messages.default)
  }

  ;(i18n.global.locale as unknown as { value: string }).value = target
}

watch(language, (lang) => {
  setLocale(lang)
})
