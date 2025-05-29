<template>
  <div class="card mx-1 flex flex-col gap-4 py-2 text-xs">
    <div class="flex flex-col items-center justify-center">
      <ArrowsRightLeftIcon class="h-4 w-4" />
      {{ statisticsMap[STATISTICS_TYPE.CONNECTIONS] }}
    </div>
    <div class="flex flex-col items-center justify-center">
      <ArrowDownCircleIcon class="h-4 w-4" />
      {{ statisticsMap[STATISTICS_TYPE.DOWNLOAD] }}
      <span>{{ statisticsMap[STATISTICS_TYPE.DL_SPEED] }}</span>
    </div>
    <div class="flex flex-col items-center justify-center">
      <ArrowUpCircleIcon class="h-4 w-4" />
      {{ statisticsMap[STATISTICS_TYPE.UPLOAD] }}
      <span>{{ statisticsMap[STATISTICS_TYPE.UL_SPEED] }}</span>
    </div>
    <div class="flex flex-col items-center justify-center">
      <CpuChipIcon class="h-4 w-4" />
      {{ statisticsMap[STATISTICS_TYPE.MEMORY_USAGE] }}
    </div>
    <div class="flex flex-col items-center justify-center">
      <button
        class="btn btn-circle btn-sm"
        @click="isSidebarCollapsed = false"
      >
        <ArrowRightCircleIcon class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDownCircleIcon,
  ArrowRightCircleIcon,
  ArrowsRightLeftIcon,
  ArrowUpCircleIcon,
  CpuChipIcon,
} from '@heroicons/vue/24/outline'
import { STATISTICS_TYPE, statisticsMap } from '@renderer/composables/statistics'
import { isSidebarCollapsed } from '@renderer/store/settings'
</script>
