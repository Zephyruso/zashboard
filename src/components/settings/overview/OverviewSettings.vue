<template>
  <OverviewCard />

  <div
    v-if="hasVisibleItems"
    class="flex flex-col gap-3 text-sm"
  >
    <div class="settings-grid">
      <div
        v-if="isVisibleAutoIPCheckWhenStart"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('autoIPCheckWhenStart') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="autoIPCheck"
        />
      </div>
      <div
        v-if="isVisibleAutoConnectionCheckWhenStart"
        class="setting-item"
      >
        <div class="setting-item-label">
          {{ $t('autoConnectionCheckWhenStart') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="autoConnectionCheck"
        />
      </div>
      <div
        v-if="isVisibleShowStatisticsWhenSidebarCollapsed"
        class="setting-item max-md:hidden"
      >
        <div class="setting-item-label">
          {{ $t('showStatisticsWhenSidebarCollapsed') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="showStatisticsWhenSidebarCollapsed"
        />
      </div>
      <div
        v-if="isVisibleNumberOfChartsInSidebar"
        class="setting-item max-md:hidden"
      >
        <div class="setting-item-label">
          {{ $t('numberOfChartsInSidebar') }}
        </div>
        <select
          class="select select-sm min-w-24"
          v-model="numberOfChartsInSidebar"
        >
          <option
            v-for="opt in [1, 2, 3]"
            :key="opt"
            :value="opt"
          >
            {{ opt }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHasAnyVisibleSetting, useIsSettingVisible } from '@/composables/settings'
import { getItemKeysByCategory, OVERVIEW_ITEM_KEYS } from '@/config/settingsItems'
import { SETTINGS_MENU_KEY } from '@/constant'
import {
  autoConnectionCheck,
  autoIPCheck,
  numberOfChartsInSidebar,
  showStatisticsWhenSidebarCollapsed,
} from '@/store/settings'
import OverviewCard from './OverviewCard.vue'

const k = OVERVIEW_ITEM_KEYS
const isVisibleAutoIPCheckWhenStart = useIsSettingVisible(k.autoIPCheckWhenStart)
const isVisibleAutoConnectionCheckWhenStart = useIsSettingVisible(k.autoConnectionCheckWhenStart)
const isVisibleShowStatisticsWhenSidebarCollapsed = useIsSettingVisible(
  k.showStatisticsWhenSidebarCollapsed,
)
const isVisibleNumberOfChartsInSidebar = useIsSettingVisible(k.numberOfChartsInSidebar)

const overviewGridKeys = getItemKeysByCategory(SETTINGS_MENU_KEY.overview).slice(2)
const hasVisibleItems = useHasAnyVisibleSetting(overviewGridKeys)
</script>
