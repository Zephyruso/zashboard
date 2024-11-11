<template>
  <div class="p-2 h-full overflow-x-hidden overflow-y-scroll">
    <ConnectionCard v-for="conn in renderConnections" :key="conn.id" :conn="conn"></ConnectionCard>
  </div>
</template>

<script setup lang="ts">
import ConnectionCard from '@/components/ConnectionCard.vue';
import { activeConnections, connectionFilter } from '@/store/connections';
import { computed } from 'vue';

const renderConnections = computed(() => {
  return activeConnections.value.filter(conn => {
    if (connectionFilter.value) {
      return [
        conn.metadata.host,
        conn.metadata.destinationIP,
        conn.metadata.destinationPort,
        conn.chains,
        conn.rule,
      ].some(i => i?.includes(connectionFilter.value))
    }

    return true
  }).sort((a, b) => {
    const hostA = a.metadata.host || a.metadata.destinationIP
    const hostB = b.metadata.host || b.metadata.destinationIP

    if (hostA === hostB) {
      return a.id.localeCompare(b.id)
    }

    return hostA.localeCompare(hostB)
  })
})
</script>