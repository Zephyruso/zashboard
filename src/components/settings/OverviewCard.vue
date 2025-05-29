<template>
  <!-- overview -->
  <div class="card">
    <div class="card-title px-4 pt-4">
      {{ $t('overview') }}
    </div>
    <div
      :class="[
        'card-body grid grid-cols-1 gap-2',
        isSidebarCollapsed
          ? ['md:grid-cols-2', showIPAndConnectionInfo ? 'lg:grid-cols-3' : 'xl:grid-cols-4']
          : ['lg:grid-cols-2', showIPAndConnectionInfo ? 'xl:grid-cols-3' : '2xl:grid-cols-4'],
      ]"
    >
      <StatisticsStats type="settings" />
      <template v-if="showIPAndConnectionInfo">
        <IPCheck />
        <ConnectionStatus />
      </template>
      <SpeedCharts />
      <MemoryCharts />
      <ConnectionsCharts />
    </div>
  </div>
</template>

<script setup lang="ts">
import ConnectionsCharts from '@renderer/components/overview/ConnectionsCharts.vue'
import ConnectionStatus from '@renderer/components/overview/ConnectionStatus.vue'
import IPCheck from '@renderer/components/overview/IPCheck.vue'
import MemoryCharts from '@renderer/components/overview/MemoryCharts.vue'
import SpeedCharts from '@renderer/components/overview/SpeedCharts.vue'
import StatisticsStats from '@renderer/components/overview/StatisticsStats.vue'
import { isSidebarCollapsed, showIPAndConnectionInfo } from '@renderer/store/settings'
import { onMounted, ref } from 'vue'

const isMounted = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    isMounted.value = true
  })
})
</script>
