<template>
  <div class="relative size-full overflow-x-hidden">
    <VirtualScroller
      :data="renderLogs"
      :size="38"
    >
      <template v-slot:before>
        <LogsCtrl />
      </template>
      <template v-slot="{ item }: { item: LogWithSeq }">
        <LogsCard :log="item" />
      </template>
    </VirtualScroller>
    <LogDetailModal
      v-model="isDetailOpen"
      :log="selectedLog"
    />
  </div>
</template>

<script setup lang="ts">
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import LogsCtrl from '@/components/controls/LogsCtrl.tsx'
import LogDetailModal from '@/components/logs/LogDetailModal.vue'
import LogsCard from '@/components/logs/LogsCard.vue'
import { toSearchRegex } from '@/helper/search'
import { logFilter, logFilterEnabled, logFilterRegex, logTypeFilter, logs } from '@/store/logs'
import type { LogWithSeq } from '@/types'
import { computed, provide, ref } from 'vue'

const selectedLog = ref<LogWithSeq | null>(null)
const isDetailOpen = ref(false)
const showLogDetail = (log: LogWithSeq) => {
  selectedLog.value = log
  isDetailOpen.value = true
}
provide('showLogDetail', showLogDetail)

const renderLogs = computed(() => {
  let renderLogs = logs.value
  const searchRegex = toSearchRegex(logFilter.value)

  if (logFilter.value || logTypeFilter.value) {
    renderLogs = logs.value.filter((log) => {
      if (searchRegex && !searchRegex.testAny([log.payload, log.time, log.type])) {
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

  if (logFilterEnabled.value && logFilterRegex.value) {
    const hideRegex = toSearchRegex(logFilterRegex.value)

    if (hideRegex) {
      renderLogs = renderLogs.filter((log) => {
        return !hideRegex.testAny([log.payload, log.time, log.type])
      })
    }
  }

  return renderLogs
})
</script>
