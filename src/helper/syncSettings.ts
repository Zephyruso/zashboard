import { Ref, watch } from 'vue'
import { updateSettingsAPI } from '../api/ipc-invoke'
import { language, theme } from '../store/settings'

const useSyncSettings = (ref: Ref<string>, key: string): void => {
  watch(ref, (value) => {
    updateSettingsAPI(key, value)
  }, {
    immediate: true,
  })
}

useSyncSettings(language, 'language')
useSyncSettings(theme, 'theme')
