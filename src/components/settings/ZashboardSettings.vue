<template>
  <!-- dashboard -->
  <div class="card">
    <div class="card-title px-4 pt-4">
      <div class="indicator">
        <span
          v-if="isUIUpdateAvailable"
          class="indicator-item top-1 -right-1 flex"
        >
          <span class="bg-secondary absolute h-2 w-2 animate-ping rounded-full"></span>
          <span class="bg-secondary h-2 w-2 rounded-full"></span>
        </span>
        <a
          href="https://github.com/Zephyruso/zashboard"
          target="_blank"
        >
          <span> zashboard </span>
          <span class="text-sm font-normal">
            {{ zashboardVersion }}
          </span>
        </a>
      </div>
      <button
        class="btn btn-sm absolute top-2 right-2"
        @click="refreshPages"
        v-if="isPWA"
      >
        {{ $t('refresh') }}
        <ArrowPathIcon class="h-4 w-4" />
      </button>
    </div>
    <div class="card-body gap-4">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <LanguageSelect />
        <div class="flex items-center gap-2">
          {{ $t('autoSwitchTheme') }}
          <input
            type="checkbox"
            v-model="autoTheme"
            class="toggle"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('defaultTheme') }}
          <div class="join">
            <select
              class="select select-sm join-item w-48"
              v-model="defaultTheme"
            >
              <option
                v-for="opt in themes"
                :key="opt"
                :value="opt"
              >
                {{ opt }}
              </option>
            </select>
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
          class="flex items-center gap-2"
          v-if="autoTheme"
        >
          {{ $t('darkTheme') }}
          <select
            class="select select-sm w-48"
            v-model="darkTheme"
          >
            <option
              v-for="opt in themes"
              :key="opt"
              :value="opt"
            >
              {{ opt }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          {{ $t('fonts') }}
          <select
            class="select select-sm w-48"
            v-model="font"
          >
            <option
              v-for="opt in Object.values(FONTS)"
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
              class="join-item max-w-64 flex-1"
              v-model="customBackgroundURL"
              :clearable="true"
              @update:modelValue="handlerBackgroundURLChange"
            />
            <button
              class="btn join-item btn-sm"
              @click="handlerClickUpload"
            >
              <ArrowUpCircleIcon class="h-4 w-4" />
            </button>
          </div>
          <input
            ref="inputFileRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handlerFileChange"
          />
        </div>
        <div
          class="flex items-center gap-2"
          v-if="customBackgroundURL"
        >
          {{ $t('transparent') }}
          <input
            type="range"
            min="0"
            max="100"
            v-model="dashboardTransparent"
            class="range max-w-64"
            @touchstart.stop
            @touchmove.stop
            @touchend.stop
          />
        </div>
        <div class="flex items-center gap-2 md:hidden">
          {{ $t('swipeInTabs') }}
          <input
            type="checkbox"
            v-model="swipeInTabs"
            class="toggle"
          />
        </div>
      </div>
      <div
        class="flex items-center gap-2"
        v-if="!isSingBox"
      >
        {{ $t('autoUpgrade') }}
        <input
          class="toggle"
          type="checkbox"
          v-model="autoUpgrade"
        />
      </div>
      <div class="grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
        <template v-if="!isSingBox">
          <button
            :class="twMerge('btn btn-primary btn-sm', isUIUpgrading ? 'animate-pulse' : '')"
            @click="handlerClickUpgradeUI"
          >
            {{ $t('upgradeUI') }}
          </button>
          <div class="sm:hidden"></div>
        </template>

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
</template>

<script setup lang="ts">
import { isSingBox, upgradeUIAPI, zashboardVersion } from '@/api'
import LanguageSelect from '@/components/settings/LanguageSelect.vue'
import { useSettings } from '@/composables/settings'
import { ALL_THEME, FONTS } from '@/constant'
import { exportSettings } from '@/helper'
import {
  deleteBase64FromIndexedDB,
  isPWA,
  LOCAL_IMAGE,
  saveBase64ToIndexedDB,
} from '@/helper/utils'
import {
  autoTheme,
  autoUpgrade,
  customBackgroundURL,
  customThemes,
  darkTheme,
  dashboardTransparent,
  defaultTheme,
  font,
  swipeInTabs,
} from '@/store/settings'
import { ArrowPathIcon, ArrowUpCircleIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { twMerge } from 'tailwind-merge'
import { computed, ref } from 'vue'
import ImportSettings from '../common/ImportSettings.vue'
import TextInput from '../common/TextInput.vue'
import CustomTheme from './CustomTheme.vue'

const customThemeModal = ref(false)

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

const { isUIUpdateAvailable } = useSettings()

const isUIUpgrading = ref(false)
const handlerClickUpgradeUI = async () => {
  if (isUIUpgrading.value) return
  isUIUpgrading.value = true
  try {
    await upgradeUIAPI()
    isUIUpgrading.value = false
    window.location.reload()
  } catch {
    isUIUpgrading.value = false
  }
}

const themes = computed(() => {
  if (customThemes.value.length) {
    return [...ALL_THEME, ...customThemes.value.map((theme) => theme.name)]
  }

  return ALL_THEME
})

const refreshPages = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations()

  for (const registration of registrations) {
    registration.unregister()
  }
  window.location.reload()
}
</script>
