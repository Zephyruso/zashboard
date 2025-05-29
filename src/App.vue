<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import BinaryInstallModal from './components/modals/BinaryInstallModal.vue'
import { useBinary } from './composables/binary'
import { useNotification } from './composables/notification'
import { FONTS } from './constant'
import { autoImportSettings, importSettingsFromUrl } from './helper/autoImportSettings'
import { backgroundImage } from './helper/indexeddb'
import { isDarkTheme, isPreferredDark } from './helper/utils'
import {
  blurIntensity,
  dashboardTransparent,
  disablePullToRefresh,
  font,
  theme,
} from './store/settings'

const app = ref<HTMLElement>()
const { tipContent, tipShowModel, tipType } = useNotification()
const { showBinaryInstallModal, checkAndInstallBinary, handleBinaryInstallConfirm } = useBinary()
const fontClassMap = {
  [FONTS.MI_SANS]: 'font-MiSans',
  [FONTS.SARASA_UI]: 'font-SarasaUI',
  [FONTS.PING_FANG]: 'font-PingFang',
  [FONTS.FIRA_SANS]: 'font-FiraSans',
  [FONTS.SYSTEM_UI]: 'font-SystemUI',
}
const fontClassName = computed(() => fontClassMap[font.value])

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
    if (disablePullToRefresh.value) {
      document.body.style.overscrollBehavior = 'none'
      document.documentElement.style.overscrollBehavior = 'none'
    } else {
      document.body.style.overscrollBehavior = ''
      document.documentElement.style.overscrollBehavior = ''
    }
  },
  {
    immediate: true,
  },
)

onMounted(() => {
  if (autoImportSettings.value) {
    importSettingsFromUrl()
  }
  watch(
    theme,
    () => {
      document.body.setAttribute('data-theme', theme.value)
      setThemeColor()
      isDarkTheme.value =
        getComputedStyle(document.body).getPropertyValue('color-scheme') === 'dark'
    },
    {
      immediate: true,
    },
  )

  // 检查二进制安装状态
  checkAndInstallBinary()
})

const blurClass = computed(() => {
  if (!backgroundImage.value || blurIntensity.value === 0) {
    return ''
  }

  return `blur-intensity-${blurIntensity.value}`
})
</script>

<template>
  <div
    id="app-content"
    ref="app"
    :class="[
      'bg-base-100 flex h-dvh w-screen overflow-x-hidden',
      fontClassName,
      backgroundImage &&
        `custom-background-${dashboardTransparent} custom-background bg-cover bg-center`,
      blurClass,
    ]"
    :style="backgroundImage"
  >
    <RouterView />
    <div
      v-if="tipShowModel"
      class="toast-sm toast toast-end toast-top z-50 max-w-64 text-sm md:translate-y-8"
    >
      <div
        class="breaks-all alert flex p-2 pr-5 whitespace-normal"
        :class="tipType"
      >
        {{ tipContent }}
        <button
          class="btn btn-circle btn-ghost btn-xs absolute top-0 right-0"
          @click="tipShowModel = false"
        >
          <XMarkIcon class="size-3 cursor-pointer" />
        </button>
      </div>
    </div>

    <BinaryInstallModal
      v-if="showBinaryInstallModal"
      @confirm="handleBinaryInstallConfirm"
    />
  </div>
</template>
