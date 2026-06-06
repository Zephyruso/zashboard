import { fetchIsUIUpdateAvailable, isRequestCanceled, upgradeUIAPI } from '@/api'
import { autoUpgradeDashboard, hiddenSettingsItems, lowPowerMode } from '@/store/settings'
import type { MaybeRef } from 'vue'
import { computed, ref, unref } from 'vue'

const isUIUpdateAvailable = ref(false)
let uiUpdateCheckController: AbortController | undefined
let uiUpdateCheckSeq = 0
let uiUpdateDelayHandle: ReturnType<typeof setTimeout> | undefined
let uiUpdateIdleHandle:
  | ReturnType<Window['requestIdleCallback']>
  | ReturnType<typeof setTimeout>
  | undefined

const cancelIdleUIUpdateCheck = () => {
  if (typeof window === 'undefined') return

  if (uiUpdateDelayHandle !== undefined) {
    clearTimeout(uiUpdateDelayHandle)
    uiUpdateDelayHandle = undefined
  }

  if (uiUpdateIdleHandle === undefined) return

  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(uiUpdateIdleHandle as ReturnType<Window['requestIdleCallback']>)
  } else {
    clearTimeout(uiUpdateIdleHandle)
  }

  uiUpdateIdleHandle = undefined
}

const requestIdleUIUpdateCheck = (callback: () => void) => {
  if (typeof window === 'undefined') return

  cancelIdleUIUpdateCheck()

  uiUpdateDelayHandle = setTimeout(() => {
    uiUpdateDelayHandle = undefined

    if ('requestIdleCallback' in window) {
      uiUpdateIdleHandle = window.requestIdleCallback(callback, { timeout: 6000 })
    } else {
      uiUpdateIdleHandle = setTimeout(callback, 1600)
    }
  }, 8000)
}

/**
 * Returns true when the setting item with the given key is visible.
 * Use inside computed() for reactivity. For templates, use useIsSettingVisible(key) instead.
 */
export function isSettingVisible(key: string): boolean {
  return !hiddenSettingsItems.value[key]
}

/**
 * Returns a computed that is true when the setting item with the given key is visible.
 * Use in templates for reactive visibility checks.
 */
export function useIsSettingVisible(key: MaybeRef<string>) {
  return computed(() => !hiddenSettingsItems.value[unref(key)])
}

/**
 * Returns a computed that is true when at least one of the given setting keys is visible.
 * Use for "has any visible item" in a settings section.
 */
export function useHasAnyVisibleSetting(keys: MaybeRef<string[]>) {
  return computed(() => unref(keys).some((k) => !hiddenSettingsItems.value[k]))
}

export const useSettings = () => {
  const checkUIUpdate = async () => {
    cancelIdleUIUpdateCheck()
    uiUpdateCheckController?.abort()
    const controller = new AbortController()
    const sequence = ++uiUpdateCheckSeq
    uiUpdateCheckController = controller

    try {
      const updateAvailable = await fetchIsUIUpdateAvailable(controller.signal)

      if (uiUpdateCheckController !== controller || sequence !== uiUpdateCheckSeq) return

      isUIUpdateAvailable.value = updateAvailable
      if (updateAvailable && autoUpgradeDashboard.value) {
        void upgradeUIAPI(controller.signal).catch((error) => {
          if (isRequestCanceled(error)) return
          console.warn('Failed to auto upgrade zashboard UI', error)
        })
      }
    } catch (error) {
      if (isRequestCanceled(error)) return
      console.warn('Failed to check zashboard UI update', error)
    } finally {
      if (uiUpdateCheckController === controller) {
        uiUpdateCheckController = undefined
      }
    }
  }

  const cancelUIUpdateCheck = () => {
    cancelIdleUIUpdateCheck()
    uiUpdateCheckController?.abort()
    uiUpdateCheckController = undefined
    uiUpdateCheckSeq += 1
  }

  const scheduleUIUpdateCheck = () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    if (lowPowerMode.value) return

    requestIdleUIUpdateCheck(() => {
      uiUpdateIdleHandle = undefined

      if (document.visibilityState !== 'visible' || lowPowerMode.value) return
      void checkUIUpdate()
    })
  }

  return {
    isUIUpdateAvailable,
    checkUIUpdate,
    scheduleUIUpdateCheck,
    cancelUIUpdateCheck,
  }
}
