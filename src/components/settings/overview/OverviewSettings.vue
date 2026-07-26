<template>
  <!-- overview -->
  <template v-if="!splitOverviewPage">
    <OverviewCard />
  </template>

  <div
    v-if="hasVisibleItems"
    class="flex flex-col gap-3 text-sm"
  >
    <div class="settings-grid">
      <SettingItem :setting-key="k.splitOverviewPage">
        <div class="setting-item-label">
          {{ $t('splitOverviewPage') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="splitOverviewPage"
        />
      </SettingItem>
      <SettingItem :setting-key="k.autoIPCheckWhenStart">
        <div class="setting-item-label">
          {{ $t('autoIPCheckWhenStart') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="autoIPCheck"
        />
      </SettingItem>
      <SettingItem :setting-key="k.autoConnectionCheckWhenStart">
        <div class="setting-item-label">
          {{ $t('autoConnectionCheckWhenStart') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="autoConnectionCheck"
        />
      </SettingItem>
      <SettingItem
        :setting-key="k.showStatisticsWhenSidebarCollapsed"
        class="max-md:hidden"
      >
        <div class="setting-item-label">
          {{ $t('showStatisticsWhenSidebarCollapsed') }}
        </div>
        <input
          class="toggle"
          type="checkbox"
          v-model="showStatisticsWhenSidebarCollapsed"
        />
      </SettingItem>
      <SettingItem
        :setting-key="k.numberOfChartsInSidebar"
        class="max-md:hidden"
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
      </SettingItem>
    </div>
  </div>
</template>

<script setup lang="ts">
import SettingItem from '@/components/settings/SettingItem.vue'
import { useHasAnyVisibleSetting } from '@/composables/settings'
import { getItemKeysByCategory, OVERVIEW_ITEM_KEYS } from '@/config/settingsItems'
import { SETTINGS_MENU_KEY } from '@/constant'
import {
  autoConnectionCheck,
  autoIPCheck,
  numberOfChartsInSidebar,
  showStatisticsWhenSidebarCollapsed,
  splitOverviewPage,
} from '@/store/settings'
import OverviewCard from './OverviewCard.vue'

const k = OVERVIEW_ITEM_KEYS

const overviewGridKeys = getItemKeysByCategory(SETTINGS_MENU_KEY.overview).slice(2)
const hasVisibleItems = useHasAnyVisibleSetting(overviewGridKeys)
</script>
