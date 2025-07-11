import { SettingsKey, SettingsValue } from '@/shared/type'
import { Ref, watch } from 'vue'
import { updateSettingsAPI } from '../api/ipc-invoke'
import { autoSystemProxy, language, theme } from '../store/settings'

const useSyncSettings = (ref: Ref<SettingsValue>, key: SettingsKey): void => {
  watch(
    ref,
    (value) => {
      updateSettingsAPI(key, value)
    },
    {
      immediate: true,
    },
  )
}

useSyncSettings(language, 'language')
useSyncSettings(theme, 'theme')
useSyncSettings(autoSystemProxy, 'autoSystemProxy')
