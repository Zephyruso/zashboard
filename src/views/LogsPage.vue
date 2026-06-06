<template>
  <div class="relative size-full overflow-x-hidden">
    <LogsCtrl />
    <ErrorBoundary @retry="() => {}">
      <EmptyState
        v-if="renderLogs.length === 0"
        :icon="DocumentTextIcon"
        :title="$t('noLogs')"
        :description="$t('noLogsDesc')"
      />
      <VirtualScroller
        v-else
        :data="renderLogs"
        :size="44"
        :overscan="8"
        dynamic-size
      >
        <template v-slot="{ item }: { item: LogWithSeq }">
          <LogsCard :log="item" />
        </template>
      </VirtualScroller>
    </ErrorBoundary>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import LogsCtrl from '@/components/controls/LogsCtrl.tsx'
import LogsCard from '@/components/logs/LogsCard.vue'
import { toSearchRegex } from '@/helper/search'
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import { logFilter, logFilterEnabled, logFilterRegex, logTypeFilter, logs } from '@/store/logs'
import type { LogWithSeq } from '@/types'
import { computed } from 'vue'

const logSearchFields = new WeakMap<LogWithSeq, string[]>()

const getLogSearchFields = (log: LogWithSeq) => {
  let fields = logSearchFields.get(log)

  if (!fields) {
    fields = [log.payload, log.time, log.type]
    logSearchFields.set(log, fields)
  }

  return fields
}

const renderLogs = computed(() => {
  const searchRegex = logFilter.value ? toSearchRegex(logFilter.value) : null
  const hideRegex =
    logFilterEnabled.value && logFilterRegex.value ? toSearchRegex(logFilterRegex.value) : null
  const typeFilter = logTypeFilter.value

  if (!searchRegex && !hideRegex && !typeFilter) {
    return logs.value
  }

  return logs.value.filter((log) => {
    if (typeFilter && !(log.payload.includes(typeFilter) || log.type === typeFilter)) {
      return false
    }

    if (searchRegex || hideRegex) {
      const fields = getLogSearchFields(log)

      if (searchRegex && !searchRegex.testAny(fields)) {
        return false
      }

      if (hideRegex && hideRegex.testAny(fields)) {
        return false
      }
    }

    return true
  })
})
</script>
