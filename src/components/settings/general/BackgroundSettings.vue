<template>
  <template v-if="hasVisibleBackgroundItems">
    <div
      v-if="isVisibleCustomBackgroundURL"
      class="setting-item"
    >
      <div class="setting-item-label">
        {{ $t('customBackgroundURL') }}
      </div>
      <div class="join">
        <TextInput
          class="join-item w-38"
          v-model="customBackgroundURL"
          :clearable="true"
          @update:modelValue="handlerBackgroundURLChange"
        />
        <button
          type="button"
          class="btn join-item btn-sm"
          :aria-label="$t('upload')"
          :title="$t('upload')"
          @click="handlerClickUpload"
        >
          <ArrowUpTrayIcon
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </div>
      <button
        type="button"
        class="btn btn-circle join-item btn-sm"
        v-if="customBackgroundURL"
        :aria-label="$t('backgroundOptions')"
        :title="$t('backgroundOptions')"
        :aria-expanded="displayBgProperty"
        @click="displayBgProperty = !displayBgProperty"
      >
        <AdjustmentsHorizontalIcon
          class="h-4 w-4"
          aria-hidden="true"
        />
      </button>
      <input
        ref="inputFileRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handlerFileChange"
      />
    </div>
    <div
      v-if="customBackgroundURL && displayBgProperty && isVisibleTransparent"
      class="setting-item"
    >
      <div class="setting-item-label">
        {{ $t('transparent') }}
      </div>
      <input
        type="range"
        min="0"
        max="100"
        v-model.number="dashboardTransparent"
        class="range max-w-64"
        @touchstart.passive.stop
        @touchmove.passive.stop
        @touchend.passive.stop
      />
    </div>
    <div
      v-if="shouldShowBlurIntensity"
      class="setting-item"
    >
      <div class="setting-item-label">
        {{ $t('blurIntensity') }}
      </div>
      <input
        type="range"
        min="0"
        max="40"
        v-model.number="blurIntensity"
        class="range max-w-64"
        @touchstart.stop
        @touchmove.stop
        @touchend.stop
      />
    </div>
  </template>
</template>

<script setup lang="ts">
import { useIsSettingVisible } from '@/composables/settings'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { deleteBase64FromIndexedDB, LOCAL_IMAGE, saveBase64ToIndexedDB } from '@/helper/indexeddb'
import {
  autoTheme,
  blurIntensity,
  customBackgroundURL,
  dashboardTransparent,
  defaultTheme,
  theme,
} from '@/store/settings'
import { AdjustmentsHorizontalIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import TextInput from '../../common/TextInput.vue'

type BackgroundToneTheme = 'light' | 'dark'

const { t } = useI18n()

const k = GENERAL_ITEM_KEYS
const isVisibleCustomBackgroundURL = useIsSettingVisible(k.customBackgroundURL)
const isVisibleTransparent = useIsSettingVisible(k.transparent)
const isVisibleBlurIntensity = useIsSettingVisible(k.blurIntensity)

const displayBgProperty = ref(false)
const inputFileRef = ref<HTMLInputElement>()
const shouldShowBlurIntensity = computed(() => {
  if (!isVisibleBlurIntensity.value) return false
  return (
    !customBackgroundURL.value || displayBgProperty.value || !isVisibleCustomBackgroundURL.value
  )
})
const hasVisibleBackgroundItems = computed(() => {
  return isVisibleCustomBackgroundURL.value || shouldShowBlurIntensity.value
})

watch(customBackgroundURL, (value) => {
  if (value) {
    displayBgProperty.value = true
  }
})

const handlerClickUpload = () => {
  inputFileRef.value?.click()
}

const applyThemeByBackgroundTone = (themeName: BackgroundToneTheme) => {
  autoTheme.value = false
  defaultTheme.value = themeName
}

const detectCurrentThemeTone = (): BackgroundToneTheme | null => {
  const themeElement = document.createElement('div')
  themeElement.dataset.theme = theme.value
  themeElement.style.display = 'none'
  document.body.appendChild(themeElement)

  const styles = getComputedStyle(themeElement)
  const colorScheme = styles.getPropertyValue('color-scheme').trim() || styles.colorScheme.trim()

  themeElement.remove()

  if (colorScheme === 'dark') {
    return 'dark'
  }

  return 'light'
}

const confirmApplyThemeByBackgroundTone = (themeName: BackgroundToneTheme) => {
  if (detectCurrentThemeTone() === themeName) {
    return
  }

  const toneLabel =
    themeName === 'dark' ? t('backgroundToneDarkThemeLabel') : t('backgroundToneLightThemeLabel')

  if (!window.confirm(t('backgroundToneSwitchConfirm', { theme: toneLabel }))) {
    return
  }

  applyThemeByBackgroundTone(themeName)
}

const detectBackgroundTone = (imageURL: string) => {
  return new Promise<BackgroundToneTheme>((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      if (!ctx) {
        reject(new Error('Unable to create canvas context'))
        return
      }

      const sampleSize = 48
      canvas.width = sampleSize
      canvas.height = sampleSize
      ctx.drawImage(image, 0, 0, sampleSize, sampleSize)

      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize)
      let weightedBrightness = 0
      let visiblePixels = 0

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255
        if (alpha === 0) continue

        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        weightedBrightness += (0.299 * r + 0.587 * g + 0.114 * b) * alpha
        visiblePixels += alpha
      }

      if (visiblePixels === 0) {
        resolve('light')
        return
      }

      const averageBrightness = weightedBrightness / visiblePixels
      resolve(averageBrightness < 140 ? 'dark' : 'light')
    }

    image.onerror = () => reject(new Error('Failed to load background image'))
    image.src = imageURL
  })
}

const handlerBackgroundURLChange = () => {
  if (!customBackgroundURL.value.includes(LOCAL_IMAGE)) {
    deleteBase64FromIndexedDB()
  }
}

const handlerFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    const imageURL = reader.result as string

    try {
      confirmApplyThemeByBackgroundTone(await detectBackgroundTone(imageURL))
    } catch {
      // Keep the current theme if tone detection fails.
    }

    customBackgroundURL.value = LOCAL_IMAGE + '-' + Date.now()
    saveBase64ToIndexedDB(imageURL)
    target.value = ''
  }
  reader.readAsDataURL(file)
}
</script>
