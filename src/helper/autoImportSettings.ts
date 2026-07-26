import { getStorageAPI } from '@/assembly/storage'
import { showConfirmDialog } from '@/helper/confirmDialog'
import { showNotification } from '@/helper/notification'
import { applyDashboardSettingsToStorage } from '@/helper/utils'
import { i18n } from '@/i18n'
import { useStorage } from '@vueuse/core'
import { isEmpty } from 'lodash'
const IMPORT_SETTINGS_URL_KEY = 'config/import-settings-url'

export const DEFAULT_SETTINGS_URL = './zashboard-settings.json'
export const importSettingsUrl = useStorage(IMPORT_SETTINGS_URL_KEY, DEFAULT_SETTINGS_URL)
export const autoImportSettings = useStorage('config/auto-import-settings', false)
export const autoSyncSettings = useStorage('config/auto-sync-settings', false)

// 用户在确认框里勾选"不再提示"后置为 true，之后直接应用。仅本机生效，不参与导入/同步
export const skipImportSettingsConfirm = useStorage('cache/skip-import-settings-confirm', false)
export const skipSyncSettingsConfirm = useStorage('cache/skip-sync-settings-confirm', false)

const autoImportSettingsHash = useStorage('cache/auto-import-settings-hash', '')
const autoSyncSettingsHash = useStorage('cache/auto-sync-settings-hash', '')
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

// 弹窗确认是否用即将写入的设置覆盖本地。无 key 会被实际覆盖时视为无需应用(返回 false)。
const confirmSettingsOverride = async (
  overriddenKeys: string[],
  messageKey: 'importSettingsConfirm' | 'syncSettingsConfirm',
) => {
  if (overriddenKeys.length === 0) {
    return false
  }

  const isSync = messageKey === 'syncSettingsConfirm'
  const skipConfirm = isSync ? skipSyncSettingsConfirm : skipImportSettingsConfirm

  // 用户选择过"不再提示"，直接应用
  if (skipConfirm.value) {
    return true
  }

  const { confirmed, checked } = await showConfirmDialog({
    title: i18n.global.t(isSync ? 'syncSettings' : 'importSettings'),
    message: i18n.global.t(messageKey, {
      keys: overriddenKeys.join('\n'),
    }),
    checkboxText: i18n.global.t('dontAskAgainAlwaysApply'),
  })

  // 取消时勾选无意义(不再提示的是"自动应用"),仅确认时记住
  if (confirmed && checked) {
    skipConfirm.value = true
  }

  return confirmed
}

// 找出后端设置中真正会覆盖本地的 config/ key(仅 applyDashboardSettingsToStorage 会写入的那些)
const getOverriddenSettingKeys = (settings: Record<string, unknown>) => {
  return Object.keys(settings).filter(
    (key) => key.startsWith('config/') && localStorage.getItem(key) !== (settings[key] as string),
  )
}

export const syncSettingsFromCore = async ({
  force = false,
  notify = false,
  confirm = true,
}: {
  force?: boolean
  notify?: boolean
  confirm?: boolean
  preserveAutoSyncSetting?: boolean
} = {}) => {
  const { data } = await getStorageAPI()

  if (!data || isEmpty(data)) {
    return false
  }

  data['config/auto-sync-settings'] = JSON.stringify(autoSyncSettings.value)

  const newHash = await calculateSettingsHash(data)

  if (!force && autoSyncSettingsHash.value === newHash) {
    return false
  }

  // 记录 hash 避免对相同内容重复提示;用户拒绝(或无 key 变动)时保留本地设置
  if (
    confirm &&
    !(await confirmSettingsOverride(getOverriddenSettingKeys(data), 'syncSettingsConfirm'))
  ) {
    autoSyncSettingsHash.value = newHash
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
// 找出 URL 导入的设置里真正会覆盖本地的 key(与 import 写入逻辑保持一致)
const getImportOverriddenKeys = (settings: Record<string, unknown>) => {
  return Object.keys(settings).filter((key) => {
    if (key === IMPORT_SETTINGS_URL_KEY && !settings[key]) {
      return false
    }
    return localStorage.getItem(key) !== (settings[key] as string)
  })
}

export const importSettingsFromUrl = async ({
  force = false,
  confirm = true,
}: {
  force?: boolean
  confirm?: boolean
} = {}) => {
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

  const newHash = await calculateSettingsHash(settings)

  if (newHash === autoImportSettingsHash.value && !force) {
    return false
  }

  // 记录 hash 避免对相同内容重复提示;用户拒绝(或无 key 变动)时保留本地设置
  if (
    confirm &&
    !(await confirmSettingsOverride(getImportOverriddenKeys(settings), 'importSettingsConfirm'))
  ) {
    autoImportSettingsHash.value = newHash
    return false
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
  return true
}
