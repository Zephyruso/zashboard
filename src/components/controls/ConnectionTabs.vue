<template>
  <div
    class="tabs-box tabs tabs-xs"
    role="tablist"
  >
    <button
      v-for="tab in Object.values(CONNECTION_TAB_TYPE)"
      :key="tab"
      type="button"
      role="tab"
      :aria-selected="connectionTabShow === tab"
      :class="twMerge('tab', connectionTabShow === tab && 'tab-active', !horizental && 'flex-1')"
      @click="() => (connectionTabShow = tab)"
    >
      {{ $t(tab) }}
      <template v-if="connectionTabShow === tab"> ({{ connectionsCount }}) </template>
    </button>
  </div>
</template>

<script setup lang="ts">
import { CONNECTION_TAB_TYPE } from '@/constant'
import { connections, connectionTabShow, renderConnections } from '@/store/connections'
import { twMerge } from 'tailwind-merge'
import { computed } from 'vue'

defineProps({
  horizental: {
    type: Boolean,
    default: true,
  },
})
const connectionsCount = computed(() => {
  if (renderConnections.value.length !== connections.value.length) {
    return `${renderConnections.value.length} / ${connections.value.length}`
  }

  return connections.value.length
})
</script>
