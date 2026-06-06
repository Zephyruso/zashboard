<template>
  <template v-if="hasVisibleGeneralItems">
    <div class="settings-section-label">
      {{ $t('general') }}
    </div>
    <div class="settings-grid">
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
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
            :aria-label="$t('autoDisconnectIdleUDPTip')"
            :title="$t('autoDisconnectIdleUDPTip')"
            @mouseenter="showTip($event, $t('autoDisconnectIdleUDPTip'))"
            @focus="showTip($event, $t('autoDisconnectIdleUDPTip'))"
          >
            <QuestionMarkCircleIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
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
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
            :aria-label="$t('IPInfoAPITip')"
            :title="$t('IPInfoAPITip')"
            @mouseenter="showTip($event, $t('IPInfoAPITip'))"
            @focus="showTip($event, $t('IPInfoAPITip'))"
          >
            <QuestionMarkCircleIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
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
        v-if="isVisibleLowPowerMode"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('lowPowerMode') }}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
            :aria-label="$t('lowPowerModeTip')"
            :title="$t('lowPowerModeTip')"
            @mouseenter="showTip($event, $t('lowPowerModeTip'))"
            @focus="showTip($event, $t('lowPowerModeTip'))"
          >
            <QuestionMarkCircleIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
        <input
          type="checkbox"
          v-model="lowPowerMode"
          class="toggle"
        />
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
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
            :aria-label="$t('disablePullToRefreshTip')"
            :title="$t('disablePullToRefreshTip')"
            @mouseenter="showTip($event, $t('disablePullToRefreshTip'))"
            @focus="showTip($event, $t('disablePullToRefreshTip'))"
          >
            <QuestionMarkCircleIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
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
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle h-6 min-h-6 w-6"
            :aria-label="$t('displayAllFeaturesTip')"
            :title="$t('displayAllFeaturesTip')"
            @mouseenter="showTip($event, $t('displayAllFeaturesTip'))"
            @focus="showTip($event, $t('displayAllFeaturesTip'))"
          >
            <QuestionMarkCircleIcon
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
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
import { isSingBox } from '@/api'
import KeyboardShortcutsSettings from '@/components/settings/general/KeyboardShortcutsSettings.vue'
import LanguageSelect from '@/components/settings/general/LanguageSelect.vue'
import { useIsSettingVisible } from '@/composables/settings'
import { GENERAL_ITEM_KEYS } from '@/config/settingsItems'
import { IP_INFO_API } from '@/constant'
import { useTooltip } from '@/helper/tooltip'
import { isMiddleScreen } from '@/helper/utils'
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
  lowPowerMode,
} from '@/store/settings'
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'

const { showTip } = useTooltip()

const k = GENERAL_ITEM_KEYS
const isVisibleLanguage = useIsSettingVisible(k.language)
const isVisibleShortcutsSetting = useIsSettingVisible(k.keyboardShortcuts)
const isVisibleShortcuts = computed(() => isVisibleShortcutsSetting.value && !isMiddleScreen.value)
const isVisibleAutoUpgrade = useIsSettingVisible(k.autoUpgradeDashboard)
const isVisibleAutoDisconnectIdleUDP = useIsSettingVisible(k.autoDisconnectIdleUDP)
const isVisibleAutoDisconnectIdleUDPTime = useIsSettingVisible(k.autoDisconnectIdleUDPTime)
const isVisibleIPInfoAPI = useIsSettingVisible(k.IPInfoAPI)
const isVisibleLowPowerMode = useIsSettingVisible(k.lowPowerMode)
const isVisibleScrollAnimationEffect = useIsSettingVisible(k.scrollAnimationEffect)
const isVisibleSwipeInPages = useIsSettingVisible(k.swipeInPages)
const isVisibleSwipeInTabs = useIsSettingVisible(k.swipeInTabs)
const isVisibleDisablePullToRefresh = useIsSettingVisible(k.disablePullToRefresh)
const isVisibleDisplayAllFeatures = useIsSettingVisible(k.displayAllFeatures)

const hasVisibleGeneralItems = computed(() => {
  return (
    isVisibleLanguage.value ||
    isVisibleShortcuts.value ||
    isVisibleAutoUpgrade.value ||
    isVisibleAutoDisconnectIdleUDP.value ||
    (autoDisconnectIdleUDP.value && isVisibleAutoDisconnectIdleUDPTime.value) ||
    isVisibleIPInfoAPI.value ||
    isVisibleLowPowerMode.value ||
    isVisibleScrollAnimationEffect.value ||
    isVisibleSwipeInPages.value ||
    (swipeInPages.value && isVisibleSwipeInTabs.value) ||
    isVisibleDisablePullToRefresh.value ||
    (isSingBox.value && isVisibleDisplayAllFeatures.value)
  )
})
</script>
