<script setup lang="ts">
import { XCircleIcon } from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useTip } from './composables/tip'
import { FONTS } from './config'
import { getBase64FromIndexedDB, LOCAL_IMAGE } from './helper/utils'
import { customBackgroundURL, dashboardTransparent, font, theme } from './store/settings'

const app = ref<HTMLElement>()
const setThemeColor = () => {
  const themeColor = getComputedStyle(app.value!).getPropertyValue('background-color').trim()
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor)
  }
}
const { tipContent, tipShowModel } = useTip()

onMounted(() => {
  setThemeColor()
  watch(theme, () => {
    nextTick(setThemeColor)
  })
})

const fontClassMap = {
  [FONTS.MI_SANS]: 'font-MiSans',
  [FONTS.SARASA_UI]: 'font-SarasaUI',
  [FONTS.PING_FANG]: 'font-PingFang',
  [FONTS.FIRA_SANS]: 'font-FiraSans',
  [FONTS.SYSTEM_UI]: 'font-SystemUI',
}
const fontClassName = computed(() => fontClassMap[font.value])
const date = dayjs().format('YYYY-MM-DD')

const backgroundInDB = ref('')
const getBackgroundInDB = async () => {
  backgroundInDB.value = (await getBase64FromIndexedDB()) || ''
}

watch(
  () => customBackgroundURL.value,
  () => {
    if (customBackgroundURL.value.includes(LOCAL_IMAGE)) {
      getBackgroundInDB()
    }
  },
  {
    immediate: true,
  },
)

const backgroundImage = computed(() => {
  if (customBackgroundURL.value.includes(LOCAL_IMAGE)) {
    return backgroundInDB.value
  }
  return customBackgroundURL.value + `?v=${date}`
})
</script>

<template>
  <div
    ref="app"
    :class="`flex h-dvh w-screen overflow-x-hidden bg-base-100 ${fontClassName} custom-background-${dashboardTransparent} ${customBackgroundURL && 'custom-background bg-cover'}`"
    :data-theme="theme"
    :style="`background-image: url('${backgroundImage}');`"
  >
    <RouterView />
    <div
      class="toast-sm toast toast-start toast-top z-50 max-w-64 whitespace-normal text-sm"
      v-if="tipShowModel"
    >
      <div class="breaks-all alert alert-warning flex w-72 whitespace-normal p-2">
        <a
          href="https://github.com/Zephyruso/zashboard/blob/main/README.md"
          target="_blank"
          class="flex-1"
        >
          {{ $t(tipContent) }}
        </a>
        <button
          class="btn btn-circle btn-ghost btn-sm"
          @click="tipShowModel = false"
        >
          <XCircleIcon class="w-4 cursor-pointer" />
        </button>
      </div>
    </div>
  </div>
</template>
