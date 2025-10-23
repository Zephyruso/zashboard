<template>
  <!-- overview -->
  <div class="card">
    <div class="card-title px-4 pt-4">
      {{ $t('overview') }}
    </div>
    <div
      :class="[
        'card-body grid grid-cols-1 gap-2 lg:grid-cols-2',
        showIPAndConnectionInfo ? 'xl:grid-cols-3' : '2xl:grid-cols-4',
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
import ConnectionsCharts from '@/components/overview/ConnectionsCharts.vue'
import ConnectionStatus from '@/components/overview/ConnectionStatus.vue'
import IPCheck from '@/components/overview/IPCheck.vue'
import MemoryCharts from '@/components/overview/MemoryCharts.vue'
import SpeedCharts from '@/components/overview/SpeedCharts.vue'
import StatisticsStats from '@/components/overview/StatisticsStats.vue'
import { showIPAndConnectionInfo } from '@/store/settings'
import { onMounted, ref } from 'vue'

const isMounted = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    isMounted.value = true
  })
})
</script>
