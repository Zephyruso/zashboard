<template>
  <template v-if="hasVisibleGeneralItems">
    <div class="settings-section-label">
      {{ $t('general') }}
    </div>
    <div class="settings-grid">
      <div
        v-if="isVisibleActions"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('upgradeDashboard') }}
        </div>
        <button
          :class="twMerge('btn btn-sm', isUIUpgrading ? 'animate-pulse' : '')"
          @click="handlerClickUpgradeUI"
        >
          {{ $t('upgradeDashboard') }}
        </button>
      </div>
      <div
        v-if="isVisibleActions"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('dashboardSettings') }}
        </div>
        <DashboardSettings />
      </div>
      <LanguageSelect v-if="isVisibleLanguage" />
      <div
        v-if="isVisibleAutoUpgrade"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('autoUpgradeDashboard') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="autoUpgradeDashboard"
        />
      </div>
      <div
        v-if="isVisibleAutoDisconnectIdleUDP"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('autoDisconnectIdleUDP') }}
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('autoDisconnectIdleUDPTip'))"
          />
        </div>
        <input
          type="checkbox"
          v-model="autoDisconnectIdleUDP"
          class="toggle"
        />
      </div>
      <div
        v-if="autoDisconnectIdleUDP && isVisibleAutoDisconnectIdleUDPTime"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('autoDisconnectIdleUDPTime') }}
        </div>
        <input
          type="number"
          class="input input-sm w-20"
          v-model="autoDisconnectIdleUDPTime"
        />
        mins
      </div>
      <div
        v-if="isVisibleIPInfoAPI"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('IPInfoAPI') }}
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('IPInfoAPITip'))"
          />
        </div>
        <select
          class="select select-sm min-w-24"
          v-model="IPInfoAPI"
        >
          <option
            v-for="opt in Object.values(IP_INFO_API)"
            :key="opt"
            :value="opt"
          >
            {{ opt }}
          </option>
        </select>
      </div>
      <div
        v-if="isVisibleScrollAnimationEffect"
        class="setting-item md:hidden!"
      >
        <div class="setting-item-label">
          {{ $t('scrollAnimationEffect') }}
        </div>
        <input
          type="checkbox"
          v-model="scrollAnimationEffect"
          class="toggle"
        />
      </div>
      <div
        v-if="isVisibleSwipeInPages"
        class="setting-item md:hidden!"
      >
        <div class="setting-item-label">
          {{ $t('swipeInPages') }}
        </div>
        <input
          type="checkbox"
          v-model="swipeInPages"
          class="toggle"
        />
      </div>
      <div
        v-if="swipeInPages && isVisibleSwipeInTabs"
        class="setting-item md:hidden!"
      >
        <div class="setting-item-label">
          {{ $t('swipeInTabs') }}
        </div>
        <input
          type="checkbox"
          v-model="swipeInTabs"
          class="toggle"
        />
      </div>
      <div
        v-if="isVisibleDisablePullToRefresh"
        class="setting-item md:hidden!"
      >
        <div class="setting-item-label">
          {{ $t('disablePullToRefresh') }}
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('disablePullToRefreshTip'))"
          />
        </div>
        <input
          type="checkbox"
          v-model="disablePullToRefresh"
          class="toggle"
        />
      </div>
      <KeyboardShortcutsSettings v-if="isVisibleShortcuts" />
      <div
        v-if="isSingBox && isVisibleDisplayAllFeatures"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('displayAllFeatures') }}
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('displayAllFeaturesTip'))"
          />
        </div>
        <input
          type="checkbox"
          v-model="displayAllFeatures"
          class="toggle"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { isSingBox, upgradeUIAPI } from '@/api'
import DashboardSettings from '@/components/common/DashboardSettings.vue'
import KeyboardShortcutsSettings from '@/components/settings/general/KeyboardShortcutsSettings.vue'
import LanguageSelect from '@/components/settings/general/LanguageSelect.vue'
import { useIsSettingVisible } from '@/composables/settings'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { IP_INFO_API } from '@/constant'
import { handlerUpgradeSuccess } from '@/helper'
import { useTooltip } from '@/helper/tooltip'
import { isMiddleScreen } from '@/helper/utils'
import { twMerge } from 'tailwind-merge'
import {
  autoDisconnectIdleUDP,
  autoDisconnectIdleUDPTime,
  autoUpgradeDashboard,
  disablePullToRefresh,
  displayAllFeatures,
  IPInfoAPI,
  scrollAnimationEffect,
  swipeInPages,
  swipeInTabs,
} from '@/store/settings'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'

const { showTip } = useTooltip()

const k = GENERAL_ITEM_KEYS
const isVisibleActions = useIsSettingVisible(k.actions)
const isVisibleLanguage = useIsSettingVisible(k.language)
const isVisibleShortcutsSetting = useIsSettingVisible(k.keyboardShortcuts)
const isVisibleShortcuts = computed(() => isVisibleShortcutsSetting.value && !isMiddleScreen.value)
const isVisibleAutoUpgrade = useIsSettingVisible(k.autoUpgradeDashboard)
const isVisibleAutoDisconnectIdleUDP = useIsSettingVisible(k.autoDisconnectIdleUDP)
const isVisibleAutoDisconnectIdleUDPTime = useIsSettingVisible(k.autoDisconnectIdleUDPTime)
const isVisibleIPInfoAPI = useIsSettingVisible(k.IPInfoAPI)
const isVisibleScrollAnimationEffect = useIsSettingVisible(k.scrollAnimationEffect)
const isVisibleSwipeInPages = useIsSettingVisible(k.swipeInPages)
const isVisibleSwipeInTabs = useIsSettingVisible(k.swipeInTabs)
const isVisibleDisablePullToRefresh = useIsSettingVisible(k.disablePullToRefresh)
const isVisibleDisplayAllFeatures = useIsSettingVisible(k.displayAllFeatures)

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

const hasVisibleGeneralItems = computed(() => {
  return (
    isVisibleActions.value ||
    isVisibleLanguage.value ||
    isVisibleShortcuts.value ||
    isVisibleAutoUpgrade.value ||
    isVisibleAutoDisconnectIdleUDP.value ||
    (autoDisconnectIdleUDP.value && isVisibleAutoDisconnectIdleUDPTime.value) ||
    isVisibleIPInfoAPI.value ||
    isVisibleScrollAnimationEffect.value ||
    isVisibleSwipeInPages.value ||
    (swipeInPages.value && isVisibleSwipeInTabs.value) ||
    isVisibleDisablePullToRefresh.value ||
    (isSingBox.value && isVisibleDisplayAllFeatures.value)
  )
})
</script>
