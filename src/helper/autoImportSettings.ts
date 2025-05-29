import { useNotification } from '@renderer/composables/notification'
import { useStorage } from '@vueuse/core'

const { showNotification } = useNotification()
const IMPORT_SETTINGS_URL_KEY = 'config/import-settings-url'

export const DEFAULT_SETTINGS_URL = './zashboard-settings.json'
export const importSettingsUrl = useStorage(IMPORT_SETTINGS_URL_KEY, DEFAULT_SETTINGS_URL)
export const autoImportSettings = useStorage('config/auto-import-settings', false)

const autoImportSettingsHash = useStorage('cache/auto-import-settings-hash', '')
const calculateSettingsHash = (settings: Record<string, unknown>) => {
  const sortedKeys = Object.keys(settings).sort()
  const hashString = sortedKeys.map((key) => `${key}:${settings[key]}`).join('|')
  return hashString
}
export const importSettingsFromUrl = async () => {
  const res = await fetch(importSettingsUrl.value)
  const errorHandler = () => {
    showNotification({
      content: 'importFailed',
      params: { url: res.url },
      type: 'alert-error',
    })
  }
  if (!res.ok) {
    errorHandler()
    return
  }
  let settings: Record<string, unknown> = {}
  try {
    settings = await res.json()
  } catch {
    errorHandler()
    return
  }

  if (!settings) {
    errorHandler()
    return
  }

  const newHash = calculateSettingsHash(settings)

  if (newHash === autoImportSettingsHash.value) {
    return
  }

  showNotification({
    content: 'importing',
  })
  autoImportSettingsHash.value = newHash

  for (const key in settings) {
    if (key === IMPORT_SETTINGS_URL_KEY && !settings[key]) {
      continue
    }
    localStorage.setItem(key, settings[key] as string)
  }
  location.reload()
}
