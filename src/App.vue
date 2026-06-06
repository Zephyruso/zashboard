<script setup lang="ts">
import SkipLink from '@/accessibility/SkipLink.vue'
import { computed, onMounted, ref, type Ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import { glassStyleVariables, useDocumentGlassVariables } from './composables/glass'
import { useKeyboard } from './composables/keyboard'
import { EMOJIS, FONTS } from './constant'
import {
  autoImportSettings,
  autoSyncSettings,
  importSettingsFromUrl,
  syncSettingsFromCore,
} from './helper/autoImportSettings'
import { backgroundImage } from './helper/indexeddb'
import { initNotification } from './helper/notification'
import { getBackendFromUrl, isPreferredDark } from './helper/utils'
import { disablePullToRefresh, emoji, font, theme, lowPowerMode } from './store/settings'
import { activeUuid, backendList } from './store/setup'
import type { Backend } from './types'

const app = ref<HTMLElement>()
const toast = ref<HTMLElement>()

initNotification(toast as Ref<HTMLElement>)

// 字体类名映射表
const FONT_CLASS_MAP = {
  [EMOJIS.TWEMOJI]: {
    [FONTS.MI_SANS]: 'font-MiSans-Twemoji',
    [FONTS.SARASA_UI]: 'font-SarasaUI-Twemoji',
    [FONTS.PING_FANG]: 'font-PingFang-Twemoji',
    [FONTS.FIRA_SANS]: 'font-FiraSans-Twemoji',
    [FONTS.SYSTEM_UI]: 'font-SystemUI-Twemoji',
  },
  [EMOJIS.NOTO_COLOR_EMOJI]: {
    [FONTS.MI_SANS]: 'font-MiSans-NotoEmoji',
    [FONTS.SARASA_UI]: 'font-SarasaUI-NotoEmoji',
    [FONTS.PING_FANG]: 'font-PingFang-NotoEmoji',
    [FONTS.FIRA_SANS]: 'font-FiraSans-NotoEmoji',
    [FONTS.SYSTEM_UI]: 'font-SystemUI-NotoEmoji',
  },
} as const

const fontClassName = computed(() => {
  return (
    FONT_CLASS_MAP[emoji.value]?.[font.value] || FONT_CLASS_MAP[EMOJIS.TWEMOJI][FONTS.SYSTEM_UI]
  )
})

const setThemeColor = () => {
  const themeColor = getComputedStyle(app.value!).getPropertyValue('background-color').trim()
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor)
  }
}

watch(isPreferredDark, setThemeColor)

watch(
  disablePullToRefresh,
  () => {
    const body = document.body
    if (disablePullToRefresh.value) {
      body.style.overscrollBehavior = 'none'
      body.style.overflow = 'hidden'
    } else {
      body.style.overscrollBehavior = ''
      body.style.overflow = ''
    }
  },
  {
    immediate: true,
  },
)

const isSameBackend = (b1: Omit<Backend, 'uuid'>, b2: Omit<Backend, 'uuid'>) => {
  return (
    b1.host === b2.host &&
    b1.port === b2.port &&
    b1.password === b2.password &&
    b1.protocol === b2.protocol &&
    b1.secondaryPath === b2.secondaryPath &&
    b1.disableUpgradeCore === b2.disableUpgradeCore &&
    b1.disableTunMode === b2.disableTunMode
  )
}

const autoSwitchToURLBackendIfExists = () => {
  const backend = getBackendFromUrl()

  if (backend) {
    for (const b of backendList.value) {
      if (isSameBackend(b, backend)) {
        activeUuid.value = b.uuid
        return
      }
    }
  }
}

autoSwitchToURLBackendIfExists()

onMounted(async () => {
  if (autoImportSettings.value) {
    await importSettingsFromUrl()
  }

  if (autoSyncSettings.value) {
    try {
      await syncSettingsFromCore()
    } catch (e) {
      console.error('Failed to auto-sync settings on app load:', e)
    }
  }

  watch(
    theme,
    () => {
      document.body.setAttribute('data-theme', theme.value)
      setThemeColor()
    },
    {
      immediate: true,
    },
  )
})

useDocumentGlassVariables()
useKeyboard()
</script>

<template>
  <div
    ref="app"
    id="app-content"
    :class="[
      'app-root bg-base-200 relative flex w-screen overflow-hidden',
      fontClassName,
      backgroundImage && 'custom-background',
      lowPowerMode && 'low-power-mode',
      'blur-intensity',
    ]"
    :style="[glassStyleVariables, backgroundImage]"
  >
    <SkipLink />
    <main
      id="main-content"
      class="contents"
    >
      <RouterView />
    </main>
    <Teleport to="body">
      <div
        ref="toast"
        role="status"
        aria-live="polite"
        class="toast-sm toast toast-end toast-top z-[100000] max-w-80 text-sm md:max-w-96 md:translate-y-8"
      />
    </Teleport>
  </div>
</template>
