<template>
  <template v-if="hasVisibleStyleItems">
    <div class="settings-section-label">
      {{ $t('appearance') }}
    </div>
    <div class="settings-grid">
      <div
        v-if="isVisibleAutoSwitchTheme"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('autoSwitchTheme') }}
        </div>
        <input
          type="checkbox"
          v-model="autoTheme"
          class="toggle"
        />
      </div>
      <div
        v-if="isVisibleDefaultTheme"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('defaultTheme') }}
        </div>
        <div class="join">
          <ThemeSelector
            class="w-38!"
            v-model:value="defaultTheme"
          />
          <button
            type="button"
            class="btn btn-sm join-item"
            :aria-label="$t('customTheme')"
            :title="$t('customTheme')"
            @click="customThemeModal = !customThemeModal"
          >
            <PlusIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
        <CustomTheme v-model:value="customThemeModal" />
      </div>
      <div
        v-if="autoTheme && isVisibleDarkTheme"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('darkTheme') }}
        </div>
        <ThemeSelector v-model:value="darkTheme" />
      </div>
      <BackgroundSettings />
      <div
        v-if="isVisibleFonts"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('fonts') }}
        </div>
        <select
          class="select select-sm w-48"
          v-model="font"
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
      <div
        v-if="isVisibleEmoji"
        class="setting-item"
      >
        <div class="setting-item-label">Emoji</div>
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
    </div>
  </template>
</template>

<script setup lang="ts">
import { useIsSettingVisible } from '@/composables/settings'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { EMOJIS, FONTS } from '@/constant'
import { autoTheme, darkTheme, defaultTheme, emoji, font } from '@/store/settings'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import BackgroundSettings from './BackgroundSettings.vue'
import CustomTheme from './CustomTheme.vue'
import ThemeSelector from './ThemeSelector.vue'

const customThemeModal = ref(false)

const k = GENERAL_ITEM_KEYS
const isVisibleFonts = useIsSettingVisible(k.fonts)
const isVisibleEmoji = useIsSettingVisible(k.emoji)
const isVisibleCustomBackgroundURL = useIsSettingVisible(k.customBackgroundURL)
const isVisibleBlurIntensity = useIsSettingVisible(k.blurIntensity)
const isVisibleDefaultTheme = useIsSettingVisible(k.defaultTheme)
const isVisibleDarkTheme = useIsSettingVisible(k.darkTheme)
const isVisibleAutoSwitchTheme = useIsSettingVisible(k.autoSwitchTheme)

const hasVisibleStyleItems = computed(() => {
  return (
    isVisibleDefaultTheme.value ||
    isVisibleAutoSwitchTheme.value ||
    (autoTheme.value && isVisibleDarkTheme.value) ||
    isVisibleCustomBackgroundURL.value ||
    isVisibleBlurIntensity.value ||
    isVisibleFonts.value ||
    isVisibleEmoji.value
  )
})

const fontOptions = computed(() => {
  const mode = import.meta.env.MODE

  if (Object.values(FONTS).includes(mode as FONTS)) {
    return [mode]
  }

  return Object.values(FONTS)
})
</script>
