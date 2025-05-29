<template>
  <div
    class="card scrollbar-hidden min-h-28 flex-2 overflow-y-auto text-sm"
    :class="classNameMap[numberOfChartsInSidebar]"
  >
    <SpeedCharts class="h-28 shrink-0" />
    <MemoryCharts class="h-28 shrink-0" />
    <ConnectionsCharts class="h-28 shrink-0" />
  </div>
</template>

<script setup lang="ts">
import ConnectionsCharts from '@renderer/components/overview/ConnectionsCharts.vue'
import MemoryCharts from '@renderer/components/overview/MemoryCharts.vue'
import SpeedCharts from '@renderer/components/overview/SpeedCharts.vue'
import { numberOfChartsInSidebar } from '@renderer/store/settings'

const classNameMap = {
  1: 'max-h-28',
  2: 'max-h-56',
  3: 'max-h-84',
}
</script>
