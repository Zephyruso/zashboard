import { getAllSettingKeys, SETTINGS_CATEGORIES } from '@/config/settingsItems'
import { SETTINGS_MENU_KEY } from '@/constant'
import { hiddenSettingsItems, settingsMenuOrder } from '@/store/settings'
import type { MaybeRef } from 'vue'
import { computed, ref, unref } from 'vue'

/**
 * 设置项「就地编辑」模式。
 * 开启后，所有设置项（含已隐藏的）都会显示，并在每项前面展示红/绿的 +/- 控制按钮，
 * 用于直接在页面上切换该项的显示/隐藏。
 */
export const settingsEditMode = ref(false)

/**
 * Returns true when the setting item with the given key is visible.
 * In edit mode every item is rendered so its visibility can be toggled in place.
 * Use inside computed() for reactivity. For templates, use useIsSettingVisible(key) instead.
 */
export function isSettingVisible(key: string): boolean {
  return settingsEditMode.value || !hiddenSettingsItems.value[key]
}

/**
 * Returns the raw hidden state of a setting key, ignoring edit mode.
 * Use to dim items that are hidden while editing.
 */
export function isSettingHidden(key: string): boolean {
  return !!hiddenSettingsItems.value[key]
}

/** Toggle the hidden state of a setting key. */
export function toggleSettingHidden(key: string): void {
  hiddenSettingsItems.value = {
    ...hiddenSettingsItems.value,
    [key]: !hiddenSettingsItems.value[key],
  }
}

/**
 * Returns a computed that is true when the setting item with the given key is visible.
 * Use in templates for reactive visibility checks.
 */
export function useIsSettingVisible(key: MaybeRef<string>) {
  return computed(() => settingsEditMode.value || !hiddenSettingsItems.value[unref(key)])
}

/**
 * Returns a computed that is true when at least one of the given setting keys is visible.
 * Use for "has any visible item" in a settings section.
 */
export function useHasAnyVisibleSetting(keys: MaybeRef<string[]>) {
  return computed(
    () => settingsEditMode.value || unref(keys).some((k) => !hiddenSettingsItems.value[k]),
  )
}

/** 应用「全部显示」预设 */
export function applyShowAllPreset(): void {
  hiddenSettingsItems.value = {}
  settingsMenuOrder.value = [...SETTINGS_CATEGORIES].map((category) => category.key)
}

/** 应用「精简显示」预设 */
export function applyMinimalPreset(): void {
  const allKeys = getAllSettingKeys()
  const minimalHiddenKeys: string[] = [SETTINGS_MENU_KEY.proxies, SETTINGS_MENU_KEY.connections]

  for (const key of allKeys) {
    if (key.includes('emoji') || key.includes('language')) {
      minimalHiddenKeys.push(key)
    } else if (key.includes('autoDisconnectIdleUDP') || key.includes('autoDisconnectIdleUDPTime')) {
      minimalHiddenKeys.push(key)
    } else if (
      key.includes('scrollAnimationEffect') ||
      key.includes('swipeInPages') ||
      key.includes('swipeInTabs') ||
      key.includes('disablePullToRefresh')
    ) {
      minimalHiddenKeys.push(key)
    } else if (
      key.includes('displayAllFeatures') ||
      key.includes('IPInfoAPI') ||
      key.includes('numberOfChartsInSidebar') ||
      key.includes('proxyGroupIconSize') ||
      key.includes('proxyGroupIconMargin') ||
      key.includes('proxyPreviewType') ||
      key.includes('proxyCardSize') ||
      key.includes('twoColumnProxyGroup')
    ) {
      minimalHiddenKeys.push(key)
    }
  }

  const newHiddenItems: Record<string, boolean> = {}
  for (const key of minimalHiddenKeys) {
    newHiddenItems[key] = true
  }
  hiddenSettingsItems.value = newHiddenItems
  settingsMenuOrder.value = [...SETTINGS_CATEGORIES].map((category) => category.key)
}

/** 调整大类在设置菜单中的顺序（在编辑模式下就地上移/下移）。 */
export function moveSettingsCategory(key: SETTINGS_MENU_KEY, direction: -1 | 1): void {
  const order = [...settingsMenuOrder.value]
  const from = order.indexOf(key)
  if (from === -1) return
  const to = from + direction
  if (to < 0 || to >= order.length) return
  ;[order[from], order[to]] = [order[to], order[from]]
  settingsMenuOrder.value = order
}
