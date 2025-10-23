<template>
  <div class="size-full overflow-x-hidden">
    <template v-if="!renderLogs.length">
      <div class="card m-2 flex-row p-2 text-sm">
        {{ $t('noContent') }}
      </div>
    </template>
    <VirtualScroller
      v-else
      :data="renderLogs"
      :size="isMiddleScreen ? 96 : 64"
    >
      <template #default="{ item }: { item: LogWithSeq }">
        <LogsCard :log="item" />
      </template>
    </VirtualScroller>
  </div>
</template>

<script setup lang="ts">
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import LogsCard from '@/components/logs/LogsCard.vue'
import { isMiddleScreen } from '@/helper/utils'
import { logFilter, logTypeFilter, logs } from '@/store/logs'
import type { LogWithSeq } from '@/types'
import { computed } from 'vue'

const renderLogs = computed(() => {
  let renderLogs = logs.value

  if (logFilter.value || logTypeFilter.value) {
    const regex = new RegExp(logFilter.value, 'i')

    renderLogs = logs.value.filter((log) => {
      if (logFilter.value && ![log.payload, log.time, log.type].some((i) => regex.test(i))) {
        return false
      }

      if (
        logTypeFilter.value &&
        !(log.payload.includes(logTypeFilter.value) || log.type === logTypeFilter.value)
      ) {
        return false
      }

      return true
    })
  }

  return renderLogs
})
</script>
