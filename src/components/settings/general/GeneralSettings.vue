<template>
  <template v-if="hasVisibleGeneralItems">
    <div class="settings-section-label">
      {{ $t('general') }}
    </div>
    <div class="settings-grid">
      <SettingItem
        :setting-key="k.actions"
        :when="!isSingboxBackend"
      >
        <div class="setting-item-label">
          {{ $t('upgradeDashboard') }}
        </div>
        <button
          :class="twMerge('btn btn-sm', isUIUpgrading ? 'animate-pulse' : '')"
          @click="handlerClickUpgradeUI"
        >
          <ArrowUpCircleIcon class="h-4 w-4" />
        </button>
      </SettingItem>
      <SettingItem :setting-key="k.actions">
        <div class="setting-item-label">
          {{ $t('dashboardSettings') }}
        </div>
        <DashboardSettings icon-only />
      </SettingItem>
      <LanguageSelect />
      <SettingItem
        :setting-key="k.autoUpgradeDashboard"
        :when="!isSingboxBackend"
      >
        <div class="setting-item-label">
          {{ $t('autoUpgradeDashboard') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="autoUpgradeDashboard"
        />
      </SettingItem>
      <SettingItem :setting-key="k.autoDisconnectIdleUDP">
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
      </SettingItem>
      <SettingItem
        :setting-key="k.autoDisconnectIdleUDPTime"
        :when="autoDisconnectIdleUDP"
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
      </SettingItem>
      <SettingItem :setting-key="k.IPInfoAPI">
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
      </SettingItem>
      <SettingItem :setting-key="k.geoipCountryDatabaseURL">
        <div class="setting-item-label">
          {{ $t('geoipCountryDatabaseURL') }}
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('geoipDatabaseURLTip'))"
          />
        </div>
        <TextInput
          class="flex-2"
          v-model="geoipCountryDatabaseURL"
          :clearable="true"
        />
      </SettingItem>
      <SettingItem :setting-key="k.geoipASNDatabaseURL">
        <div class="setting-item-label">
          {{ $t('geoipASNDatabaseURL') }}
          <QuestionMarkCircleIcon
            class="h-4 w-4 cursor-pointer"
            @mouseenter="showTip($event, $t('geoipDatabaseURLTip'))"
          />
        </div>
        <TextInput
          class="flex-2"
          v-model="geoipASNDatabaseURL"
          :clearable="true"
        />
      </SettingItem>
      <SettingItem
        :setting-key="k.scrollAnimationEffect"
        class="md:hidden!"
      >
        <div class="setting-item-label">
          {{ $t('scrollAnimationEffect') }}
        </div>
        <input
          type="checkbox"
          v-model="scrollAnimationEffect"
          class="toggle"
        />
      </SettingItem>
      <SettingItem
        :setting-key="k.swipeInPages"
        class="md:hidden!"
      >
        <div class="setting-item-label">
          {{ $t('swipeInPages') }}
        </div>
        <input
          type="checkbox"
          v-model="swipeInPages"
          class="toggle"
        />
      </SettingItem>
      <SettingItem
        :setting-key="k.swipeInTabs"
        :when="swipeInPages"
        class="md:hidden!"
      >
        <div class="setting-item-label">
          {{ $t('swipeInTabs') }}
        </div>
        <input
          type="checkbox"
          v-model="swipeInTabs"
          class="toggle"
        />
      </SettingItem>
      <SettingItem
        :setting-key="k.disablePullToRefresh"
        class="md:hidden!"
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
      </SettingItem>
      <KeyboardShortcutsSettings />
      <SettingItem
        :setting-key="k.displayAllFeatures"
        :when="isSingBoxCore"
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
      </SettingItem>
    </div>
  </template>
</template>

<script setup lang="ts">
import { isSingboxBackend } from '@/assembly/backend'
import { isSingBoxCore, upgradeUIAPI } from '@/assembly/version'
import DashboardSettings from '@/components/common/DashboardSettings.vue'
import KeyboardShortcutsSettings from '@/components/settings/general/KeyboardShortcutsSettings.vue'
import LanguageSelect from '@/components/settings/general/LanguageSelect.vue'
import SettingItem from '@/components/settings/SettingItem.vue'
import TextInput from '@/components/common/TextInput.vue'
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
  geoipASNDatabaseURL,
  geoipCountryDatabaseURL,
  IPInfoAPI,
  scrollAnimationEffect,
  swipeInPages,
  swipeInTabs,
} from '@/store/settings'
import { ArrowUpCircleIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
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
const isVisibleGeoipCountryDatabaseURL = useIsSettingVisible(k.geoipCountryDatabaseURL)
const isVisibleGeoipASNDatabaseURL = useIsSettingVisible(k.geoipASNDatabaseURL)
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
    isVisibleGeoipCountryDatabaseURL.value ||
    isVisibleGeoipASNDatabaseURL.value ||
    isVisibleScrollAnimationEffect.value ||
    isVisibleSwipeInPages.value ||
    (swipeInPages.value && isVisibleSwipeInTabs.value) ||
    isVisibleDisablePullToRefresh.value ||
    (isSingBoxCore.value && isVisibleDisplayAllFeatures.value)
  )
})
</script>
