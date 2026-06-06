import { getStorageAPI } from '@/api'
import { showNotification } from '@/helper/notification'
import { applyDashboardSettingsToStorage } from '@/helper/utils'
import { useStorage } from '@vueuse/core'
import { isEmpty } from 'lodash-es'
const IMPORT_SETTINGS_URL_KEY = 'config/import-settings-url'

export const DEFAULT_SETTINGS_URL = './zashboard-settings.json'
export const importSettingsUrl = useStorage(IMPORT_SETTINGS_URL_KEY, DEFAULT_SETTINGS_URL)
export const autoImportSettings = useStorage('config/auto-import-settings', false)
export const autoSyncSettings = useStorage('config/auto-sync-settings', false)

const autoImportSettingsHash = useStorage('cache/auto-import-settings-hash', '')
const autoSyncSettingsHash = useStorage('cache/auto-sync-settings-hash', '')

const getImportableDashboardSettings = (settings: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(settings).filter(([key, value]) => {
      if (!key.startsWith('config/') || typeof value !== 'string') {
        return false
      }

      return key !== IMPORT_SETTINGS_URL_KEY || Boolean(value)
    }),
  )
}

const calculateSettingsHash = async (settings: Record<string, unknown>) => {
  const sortedKeys = Object.keys(settings).sort()
  const hashString = sortedKeys.map((key) => `${key}:${settings[key]}`).join('|')

  let hash = 0
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export const syncSettingsFromCore = async ({
  force = false,
  notify = false,
  signal,
}: {
  force?: boolean
  notify?: boolean
  preserveAutoSyncSetting?: boolean
  signal?: AbortSignal
} = {}) => {
  const { data } = await getStorageAPI(signal)

  if (!data || isEmpty(data)) {
    return false
  }

  data['config/auto-sync-settings'] = JSON.stringify(autoSyncSettings.value)

  const newHash = await calculateSettingsHash(data)

  if (!force && autoSyncSettingsHash.value === newHash) {
    return false
  }

  applyDashboardSettingsToStorage(data)
  autoSyncSettingsHash.value = newHash

  if (notify) {
    showNotification({
      content: 'syncSettingsSuccess',
      type: 'alert-success',
    })
  }

  location.reload()
  return true
}
export const importSettingsFromUrl = async (
  force = false,
  options: { url?: string; signal?: AbortSignal } = {},
) => {
  const targetUrl = options.url || importSettingsUrl.value
  let res: Response
  try {
    res = await fetch(targetUrl, { signal: options.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return false
    }
    showNotification({
      content: 'importFailed',
      params: { url: targetUrl },
      type: 'alert-error',
    })
    return false
  }

  const errorHandler = () => {
    showNotification({
      content: 'importFailed',
      params: { url: targetUrl },
      type: 'alert-error',
    })
  }
  if (!res.ok) {
    errorHandler()
    return false
  }
  let settings: Record<string, unknown> = {}
  try {
    settings = await res.json()
  } catch {
    errorHandler()
    return false
  }

  if (!settings) {
    errorHandler()
    return false
  }

  const importableSettings = getImportableDashboardSettings(settings)

  if (isEmpty(importableSettings)) {
    errorHandler()
    return false
  }

  const newHash = await calculateSettingsHash(importableSettings)

  if (newHash === autoImportSettingsHash.value && !force) {
    return false
  }

  showNotification({
    content: 'importing',
  })
  autoImportSettingsHash.value = newHash

  applyDashboardSettingsToStorage(importableSettings)
  location.reload()
  return true
}
