<template>
  <template v-if="!renderConnections.length">
    <div class="card m-2 flex-row p-2 text-sm">
      {{ $t('noContent') }}
    </div>
  </template>
  <VirtualScroller
    v-else
    :data="renderConnections"
    :size="size"
  >
    <template #default="{ item }: { item: Connection }">
      <ConnectionCard
        class="mb-1"
        :conn="item"
      />
    </template>
  </VirtualScroller>
</template>

<script setup lang="ts">
import { renderConnections } from '@renderer/store/connections'
import { connectionCardLines } from '@renderer/store/settings'
import type { Connection } from '@renderer/types'
import { computed } from 'vue'
import VirtualScroller from '../common/VirtualScroller.vue'
import ConnectionCard from './ConnectionCard'

const size = computed(() => {
  return connectionCardLines.value.length * 28 + 4
})
</script>
