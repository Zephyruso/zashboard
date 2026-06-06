<template>
  <ConnectionCtrl />
  <EmptyState
    v-if="renderConnections.length === 0"
    :icon="ArrowsRightLeftIcon"
    :title="
      $t(connectionTabShow === CONNECTION_TAB_TYPE.ACTIVE ? 'noConnections' : 'noClosedConnections')
    "
    :description="
      $t(
        connectionTabShow === CONNECTION_TAB_TYPE.ACTIVE
          ? 'noConnectionsDesc'
          : 'noClosedConnectionsDesc',
      )
    "
  />
  <VirtualScroller
    v-else
    :data="renderConnections"
    :size="size"
  >
    <template v-slot="{ item }: { item: Connection }">
      <ConnectionCard :conn="item" />
    </template>
  </VirtualScroller>
</template>

<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import { CONNECTION_TAB_TYPE } from '@/constant'
import { ArrowsRightLeftIcon } from '@heroicons/vue/24/outline'
import { connectionTabShow, renderConnections } from '@/store/connections'
import { connectionCardLines } from '@/store/settings'
import type { Connection } from '@/types'
import { computed } from 'vue'
import VirtualScroller from '../common/VirtualScroller.vue'
import ConnectionCtrl from '../controls/ConnectionCtrl.tsx'
import ConnectionCard from './ConnectionCard'
const size = computed(() => {
  return connectionCardLines.value.length * 28 + 4
})
</script>
