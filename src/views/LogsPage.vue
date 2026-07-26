<template>
  <div class="relative size-full overflow-x-hidden">
    <VirtualScroller
      :data="renderLogs"
      :size="44"
    >
      <template v-slot:before>
        <LogsCtrl />
      </template>
      <template v-slot="{ item }: { item: LogWithSeq }">
        <LogsCard
          :log="item"
          @connection-click="handlerConnectionClick"
        />
      </template>
    </VirtualScroller>
    <DialogWrapper
      v-model="connectionLogsDialogVisible"
      no-padding
      :title="`${t('sameConnectionLogs')} (${connectionLogID})`"
    >
      <div class="flex flex-col">
        <LogsCard
          v-for="log in connectionLogs"
          :key="log.seq"
          :log="log"
          connection-detail-disabled
        />
      </div>
    </DialogWrapper>
  </div>
</template>

<script setup lang="ts">
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import LogsCtrl from '@/components/controls/LogsCtrl.tsx'
import LogsCard from '@/components/logs/LogsCard.vue'
import { toSearchRegex } from '@/helper/search'
import {
  getLogConnectionID,
  logFilter,
  logFilterEnabled,
  logFilterRegex,
  logTypeFilter,
  logs,
} from '@/store/logs'
import type { LogWithSeq } from '@/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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

const connectionLogID = ref('')
const connectionLogsDialogVisible = ref(false)
const connectionLogs = computed(() => {
  if (!connectionLogID.value) return []

  return logs.value
    .filter((log) => getLogConnectionID(log.payload) === connectionLogID.value)
    .reverse()
})

const handlerConnectionClick = (connectionID: string) => {
  connectionLogID.value = connectionID
  connectionLogsDialogVisible.value = true
}
</script>
