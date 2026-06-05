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
            class="btn btn-sm join-item"
            @click="customThemeModal = !customThemeModal"
          >
            <PlusIcon class="h-4 w-4" />
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
    </div>
  </template>
</template>

<script setup lang="ts">
import { useIsSettingVisible } from '@/composables/settings'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { autoTheme, darkTheme, defaultTheme } from '@/store/settings'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import BackgroundSettings from './BackgroundSettings.vue'
import CustomTheme from './CustomTheme.vue'
import ThemeSelector from './ThemeSelector.vue'

const customThemeModal = ref(false)

const k = GENERAL_ITEM_KEYS
const isVisibleCustomBackgroundURL = useIsSettingVisible(k.customBackgroundURL)
const isVisibleDefaultTheme = useIsSettingVisible(k.defaultTheme)
const isVisibleDarkTheme = useIsSettingVisible(k.darkTheme)
const isVisibleAutoSwitchTheme = useIsSettingVisible(k.autoSwitchTheme)

const hasVisibleStyleItems = computed(() => {
  return (
    isVisibleDefaultTheme.value ||
    isVisibleAutoSwitchTheme.value ||
    (autoTheme.value && isVisibleDarkTheme.value) ||
    isVisibleCustomBackgroundURL.value
  )
})
</script>
