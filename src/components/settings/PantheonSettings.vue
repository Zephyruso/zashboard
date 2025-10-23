<template>
  <div class="card">
    <div class="card-title px-4 pt-4">
      <a
        href="https://github.com/Zephyruso/Pantheon"
        target="_blank"
      >
        <span> Pantheon v{{ appVersion }} </span>
      </a>
    </div>
    <div class="card-body gap-4">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex items-center gap-2">
          {{ $t('autoLaunch') }}
          <input
            v-model="isAutoLaunchEnabled"
            type="checkbox"
            class="toggle"
            @click="toggleAutoLaunch"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('autoSystemProxy') }}
          <input
            v-model="autoSystemProxy"
            type="checkbox"
            class="toggle"
          />
        </div>
        <LanguageSelect />
        <div class="flex items-center gap-2">
          {{ $t('autoSwitchTheme') }}
          <input
            v-model="autoTheme"
            type="checkbox"
            class="toggle"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('defaultTheme') }}
          <div class="join">
            <ThemeSelector v-model:value="defaultTheme" />
            <button
              class="btn btn-sm join-item"
              @click="customThemeModal = !customThemeModal"
            >
              <PlusIcon class="h-4 w-4" />
            </button>
          </div>
          <CustomTheme v-model:value="customThemeModal" />
        </div>
        <div
          v-if="autoTheme"
          class="flex items-center gap-2"
        >
          {{ $t('darkTheme') }}
          <ThemeSelector v-model:value="darkTheme" />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('fonts') }}
          <select
            v-model="font"
            class="select select-sm w-48"
          >
            <option
              v-for="opt in fontOptions"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          Emoji
          <select
            class="select select-sm w-48"
            v-model="emoji"
          >
            <option
              v-for="opt in Object.values(EMOJIS)"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <span class="shrink-0"> {{ $t('customBackgroundURL') }} </span>
          <div class="join">
            <TextInput
              v-model="customBackgroundURL"
              class="join-item w-48"
              :clearable="true"
              @update:model-value="handlerBackgroundURLChange"
            />
            <button
              class="btn join-item btn-sm"
              @click="handlerClickUpload"
            >
              <ArrowUpTrayIcon class="h-4 w-4" />
            </button>
          </div>
          <button
            v-if="customBackgroundURL"
            class="btn btn-circle join-item btn-sm"
            @click="displayBgProperty = !displayBgProperty"
          >
            <AdjustmentsHorizontalIcon class="h-4 w-4" />
          </button>
          <input
            ref="inputFileRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handlerFileChange"
          />
        </div>
        <template v-if="customBackgroundURL && displayBgProperty">
          <div class="flex items-center gap-2">
            {{ $t('transparent') }}
            <input
              v-model="dashboardTransparent"
              type="range"
              min="0"
              max="100"
              class="range max-w-64"
              @touchstart.passive.stop
              @touchmove.passive.stop
              @touchend.passive.stop
            />
          </div>

          <div class="flex items-center gap-2">
            {{ $t('blurIntensity') }}
            <input
              v-model="blurIntensity"
              type="range"
              min="0"
              max="40"
              class="range max-w-64"
              @touchstart.stop
              @touchmove.stop
              @touchend.stop
            />
          </div>
        </template>
      </div>
      <div class="grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          class="btn btn-sm"
          @click="handlerClickClearRuntimeDir"
        >
          {{ $t('clearRuntimeDir') }}
        </button>
        <button
          class="btn btn-sm"
          @click="showCoreUpdateModal = true"
        >
          {{ $t('updateCore') }}
        </button>
        <button
          class="btn btn-sm"
          @click="exportSettings"
        >
          {{ $t('exportSettings') }}
        </button>
        <ImportSettings />
      </div>
    </div>
  </div>

  <CoreUpdateModal v-model="showCoreUpdateModal" />
</template>

<script setup lang="ts">
import { clearRuntimeDirAPI, disableAutoLaunchAPI, enableAutoLaunchAPI } from '@/api/ipc-invoke'
import LanguageSelect from '@/components/settings/LanguageSelect.vue'
import { EMOJIS, FONTS } from '@/constant'
import { deleteBase64FromIndexedDB, LOCAL_IMAGE, saveBase64ToIndexedDB } from '@/helper/indexeddb'
import { exportSettings } from '@/helper/utils'
import {
  autoSystemProxy,
  autoTheme,
  blurIntensity,
  customBackgroundURL,
  darkTheme,
  dashboardTransparent,
  defaultTheme,
  emoji,
  font,
} from '@/store/settings'
import { isAutoLaunchEnabled } from '@/store/status'
import { AdjustmentsHorizontalIcon, ArrowUpTrayIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import ImportSettings from '../common/ImportSettings.vue'
import TextInput from '../common/TextInput.vue'
import CoreUpdateModal from '../modals/CoreUpdateModal.vue'
import CustomTheme from './CustomTheme.vue'
import ThemeSelector from './ThemeSelector.vue'

const customThemeModal = ref(false)
const displayBgProperty = ref(false)
const appVersion = __APP_VERSION__
const showCoreUpdateModal = ref(false)

watch(customBackgroundURL, (value) => {
  if (value) {
    displayBgProperty.value = true
  }
})

const inputFileRef = ref()
const handlerClickUpload = () => {
  inputFileRef.value?.click()
}
const handlerBackgroundURLChange = () => {
  if (!customBackgroundURL.value.includes(LOCAL_IMAGE)) {
    deleteBase64FromIndexedDB()
  }
}

const handlerFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    customBackgroundURL.value = LOCAL_IMAGE + '-' + Date.now()
    saveBase64ToIndexedDB(reader.result as string)
  }
  reader.readAsDataURL(file)
}

const fontOptions = computed(() => {
  return Object.values(FONTS)
})

const handlerClickClearRuntimeDir = async () => {
  try {
    await clearRuntimeDirAPI()
  } catch (error) {
    console.error('Failed to clear runtime directory:', error)
  }
}

const toggleAutoLaunch = async (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  if (!isAutoLaunchEnabled.value) {
    await enableAutoLaunchAPI()
  } else {
    await disableAutoLaunchAPI()
  }
}
</script>
