<template>
  <!-- overview -->
  <div class="mb-3 flex flex-col gap-3">
    <div
      v-if="isVisibleOverviewCard"
      class="relative"
    >
      <SettingVisibilityToggle
        :setting-key="OVERVIEW_ITEM_KEYS.chartsCard"
        class="absolute top-2 left-2 z-10"
      />
      <ChartsCard
        class="shadow-none"
        :class="
          settingsEditMode && isSettingHidden(OVERVIEW_ITEM_KEYS.chartsCard) ? 'opacity-40' : ''
        "
      />
    </div>
    <div
      v-if="isVisibleNetworkCard"
      class="relative"
    >
      <SettingVisibilityToggle
        :setting-key="OVERVIEW_ITEM_KEYS.networkCard"
        class="absolute top-2 left-2 z-10"
      />
      <NetworkCard
        class="shadow-none"
        :class="
          settingsEditMode && isSettingHidden(OVERVIEW_ITEM_KEYS.networkCard) ? 'opacity-40' : ''
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChartsCard from '@/components/overview/ChartsCard.vue'
import NetworkCard from '@/components/overview/NetworkCard.vue'
import SettingVisibilityToggle from '@/components/settings/SettingVisibilityToggle.vue'
import { isSettingHidden, settingsEditMode, useIsSettingVisible } from '@/composables/settings'
import { OVERVIEW_ITEM_KEYS } from '@/config/settingsItems'

const isVisibleOverviewCard = useIsSettingVisible(OVERVIEW_ITEM_KEYS.chartsCard)
const isVisibleNetworkCard = useIsSettingVisible(OVERVIEW_ITEM_KEYS.networkCard)
</script>
