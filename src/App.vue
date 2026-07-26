<script setup lang="ts">
import { computed, onMounted, ref, type Ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import ConfirmDialogHost from './components/common/ConfirmDialogHost.vue'
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
import {
  blurIntensity,
  dashboardTransparent,
  disablePullToRefresh,
  emoji,
  font,
  theme,
} from './store/settings'
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
  if (!app.value) return

  const themeColor = getComputedStyle(app.value!).getPropertyValue('background-color').trim()
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor)
  }
}

watch(isPreferredDark, setThemeColor)
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

// iOS bounces the whole page when a vertical drag has nowhere left to scroll:
// either it's over a non-scrollable area (so the drag pans the layout viewport),
// or it's inside a scroll container already at its top/bottom edge and the
// leftover scroll chains up to the document. Classic iOS scroll-lock: find the
// nearest vertically-scrollable ancestor and only let the drag through while
// that element can still move in the drag direction; otherwise cancel it so
// nothing reaches the page.
let touchStartX = 0
let touchStartY = 0

const onTouchStart = (event: TouchEvent) => {
  touchStartX = event.touches[0].clientX
  touchStartY = event.touches[0].clientY
}

const findScrollableY = (target: EventTarget | null) => {
  let el = target as HTMLElement | null
  while (el && el !== document.body && el !== document.documentElement) {
    const { overflowY } = getComputedStyle(el)
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      return el
    }
    el = el.parentElement
  }
  return null
}

const onTouchMove = (event: TouchEvent) => {
  if (event.touches.length > 1) return

  const deltaX = event.touches[0].clientX - touchStartX
  const deltaY = event.touches[0].clientY - touchStartY
  // Leave horizontal gestures (e.g. swiping a horizontally-scrollable table) be.
  if (Math.abs(deltaY) <= Math.abs(deltaX)) return

  const el = findScrollableY(event.target)
  if (!el) {
    event.preventDefault()
    return
  }

  const atTop = el.scrollTop <= 0
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
  // deltaY > 0 means dragging downward (revealing content above).
  if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
    event.preventDefault()
  }
}

watch(
  disablePullToRefresh,
  () => {
    const body = document.body
    if (disablePullToRefresh.value) {
      body.style.overscrollBehavior = 'none'
      body.style.overflow = 'hidden'
      document.addEventListener('touchstart', onTouchStart, { passive: true })
      document.addEventListener('touchmove', onTouchMove, { passive: false })
    } else {
      body.style.overscrollBehavior = ''
      body.style.overflow = ''
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
    }
  },
  {
    immediate: true,
  },
)

const isSameBackend = (b1: Omit<Backend, 'uuid' | 'type'>, b2: Omit<Backend, 'uuid' | 'type'>) => {
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
  setThemeColor()

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
})

const blurClass = computed(() => {
  if (!backgroundImage.value || blurIntensity.value === 0) {
    return ''
  }

  return `blur-intensity-${blurIntensity.value}`
})

useKeyboard()
</script>

<template>
  <div
    ref="app"
    id="app-content"
    :class="[
      'bg-base-100 flex w-screen overflow-hidden',
      fontClassName,
      backgroundImage &&
        `custom-background-${dashboardTransparent} custom-background bg-cover bg-center`,
      blurClass,
    ]"
    :style="[backgroundImage, { height: 'var(--app-height, 100dvh)' }]"
  >
    <RouterView />
    <ConfirmDialogHost />
    <div
      ref="toast"
      class="toast-sm toast toast-end toast-top z-[100000] max-w-80 text-sm md:max-w-96 md:translate-y-8"
    />
  </div>
</template>
