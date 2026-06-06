<template>
  <div class="relative flex flex-col text-sm">
    <div class="flex items-center gap-2 px-1">
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
        type="button"
        :class="twMerge('btn btn-neutral btn-sm', isUIUpgrading ? 'animate-pulse' : '')"
        :disabled="isUIUpgrading"
        :aria-busy="isUIUpgrading"
        @click="handlerClickUpgradeUI"
      >
        {{ $t('upgradeDashboard') }}
      </button>
      <DashboardSettings />
    </div>

    <StyleSettings />
    <GeneralSettings />
  </div>
</template>

<script setup lang="ts">
import { isRequestCanceled, upgradeUIAPI, zashboardVersion } from '@/api'
import { useIsSettingVisible, useSettings } from '@/composables/settings'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { handlerUpgradeSuccess } from '@/helper'
import { twMerge } from 'tailwind-merge'
import { onBeforeUnmount, ref } from 'vue'
import DashboardSettings from '../../common/DashboardSettings.vue'
import GeneralSettings from './GeneralSettings.vue'
import StyleSettings from './StyleSettings.vue'

const k = GENERAL_ITEM_KEYS
const isVisibleActions = useIsSettingVisible(k.actions)

const commitId = __COMMIT_ID__

const { isUIUpdateAvailable } = useSettings()

const isUIUpgrading = ref(false)
let isUnmounted = false
let upgradeSequence = 0
let upgradeAbortController: AbortController | undefined
let reloadTimer: ReturnType<typeof setTimeout> | undefined

const handlerClickUpgradeUI = async () => {
  if (isUIUpgrading.value) return

  const sequence = ++upgradeSequence
  const controller = new AbortController()

  upgradeAbortController?.abort()
  upgradeAbortController = controller
  isUIUpgrading.value = true
  try {
    await upgradeUIAPI(controller.signal)

    if (isUnmounted || sequence !== upgradeSequence || controller.signal.aborted) return

    handlerUpgradeSuccess()
    reloadTimer = setTimeout(() => {
      if (isUnmounted || sequence !== upgradeSequence) return
      window.location.reload()
    }, 1000)
  } catch (error) {
    if (isRequestCanceled(error)) return
    // handled by current UI state
  } finally {
    if (upgradeAbortController === controller) {
      upgradeAbortController = undefined
    }
    if (!isUnmounted && sequence === upgradeSequence) {
      isUIUpgrading.value = false
    }
  }
}

onBeforeUnmount(() => {
  isUnmounted = true
  upgradeSequence++
  upgradeAbortController?.abort()
  upgradeAbortController = undefined

  if (reloadTimer) {
    clearTimeout(reloadTimer)
    reloadTimer = undefined
  }
})
</script>
