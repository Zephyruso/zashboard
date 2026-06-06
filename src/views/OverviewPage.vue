<template>
  <div
    class="smooth-scroll-container h-full overflow-x-hidden overflow-y-auto"
    :style="padding"
  >
    <OverviewCtrl />
    <div class="flex flex-col gap-3 p-3">
      <ErrorBoundary
        v-for="item in visibleCards"
        :key="item.card"
        @retry="handleRetry"
      >
        <component :is="cardComponents[item.card]" />
      </ErrorBoundary>
    </div>
  </div>
</template>

<script setup lang="ts">
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import OverviewCtrl from '@/components/controls/OverviewCtrl.vue'
import ChartsCard from '@/components/overview/ChartsCard.vue'
import ConnectionHistory from '@/components/overview/ConnectionHistory.vue'
import NetworkCard from '@/components/overview/NetworkCard.vue'
import ProviderTrafficOverview from '@/components/overview/ProviderTrafficOverview.vue'
import RuleHitCountCard from '@/components/overview/RuleHitCountCard.vue'
import TopologyCharts from '@/components/overview/TopologyCharts.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { overviewCardOrder } from '@/store/settings'
import { fetchConfigs } from '@/store/config'
import type { Component } from 'vue'
import { computed } from 'vue'

const { padding } = usePaddingForViews({
  offsetTop: 0,
  offsetBottom: 0,
})
const visibleCards = computed(() => {
  return overviewCardOrder.value.filter((card) => card.visible)
})

const handleRetry = () => {
  fetchConfigs()
}

const cardComponents: Record<string, Component> = {
  ChartsCard,
  NetworkCard,
  ProviderTrafficOverview,
  TopologyCharts,
  ConnectionHistory,
  RuleHitCountCard,
}
</script>
