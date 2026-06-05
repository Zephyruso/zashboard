<template>
  <div class="relative flex flex-col text-sm">
    <div class="flex items-center gap-2 px-1">
      <div class="indicator">

        <a
          href="https://t.me/MerlinClashchat"
          target="_blank"
          class="text-lg font-semibold"
        >
          zashboard
          <span class="text-sm font-normal opacity-50">
            {{ zashboardVersion }}
            <span
              v-if="commitId"
              class="text-xs"
            >
              {{ commitId }}
            </span>
          </span>
        </a>
      </div>
    </div>

    <div
      v-if="isVisibleActions"
      class="settings-grid my-3 gap-2 p-3 md:grid-cols-2!"
    >
      <button
        class="btn btn-sm"
        @click="handlerClickUpgradeUI"
      >
        <span
          v-if="isUIUpgrading"
          class="loading loading-spinner loading-md"
        ></span>
        {{ $t('upgradeDashboard') }}
      </button>
      <DashboardSettings />
    </div>

    <StyleSettings />
    <GeneralSettings />
  </div>
</template>

<script setup lang="ts">
import { upgradeUIAPI, zashboardVersion } from '@/api'
import { useIsSettingVisible, useSettings } from '@/composables/settings'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { handlerUpgradeSuccess } from '@/helper'
import { twMerge } from 'tailwind-merge'
import { ref } from 'vue'
import DashboardSettings from '../../common/DashboardSettings.vue'
import GeneralSettings from './GeneralSettings.vue'
import StyleSettings from './StyleSettings.vue'

const k = GENERAL_ITEM_KEYS
const isVisibleActions = useIsSettingVisible(k.actions)

const commitId = __COMMIT_ID__

const { isUIUpdateAvailable } = useSettings()

const isUIUpgrading = ref(false)

const handlerClickUpgradeUI = async () => {
  if (isUIUpgrading.value) return
  isUIUpgrading.value = true
  try {
    await upgradeUIAPI()
    isUIUpgrading.value = false
    handlerUpgradeSuccess()
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch {
    isUIUpgrading.value = false
  }
}
</script>
