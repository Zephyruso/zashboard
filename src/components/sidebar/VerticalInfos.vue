<template>
  <div class="card mx-1 flex flex-col gap-4 py-2 text-xs">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col items-center justify-center gap-1">
        <ArrowsRightLeftIcon class="h-4 w-4" />
        {{ statisticsMap[STATISTICS_TYPE.CONNECTIONS] }}
      </div>
      <div class="flex flex-col items-center justify-center gap-1">
        <ArrowDownCircleIcon class="h-4 w-4" />
        {{ statisticsMap[STATISTICS_TYPE.DOWNLOAD] }}
        <span class="text-base-content/60">{{ statisticsMap[STATISTICS_TYPE.DL_SPEED] }}</span>
      </div>
      <div class="flex flex-col items-center justify-center gap-1">
        <ArrowUpCircleIcon class="h-4 w-4" />
        {{ statisticsMap[STATISTICS_TYPE.UPLOAD] }}
        <span class="text-base-content/60">{{ statisticsMap[STATISTICS_TYPE.UL_SPEED] }}</span>
      </div>
      <div class="flex flex-col items-center justify-center gap-1">
        <CpuChipIcon class="h-4 w-4" />
        {{ statisticsMap[STATISTICS_TYPE.MEMORY_USAGE] }}
      </div>
    </div>

    <div class="flex flex-col items-center justify-center"></div>
  </div>
</template>

<script setup lang="ts">
import { STATISTICS_TYPE, statisticsMap } from '@/composables/statistics'
import {
  ArrowDownCircleIcon,
  ArrowsRightLeftIcon,
  ArrowUpCircleIcon,
  CpuChipIcon,
} from '@heroicons/vue/24/outline'
</script>
