<template>
  <div class="base-container glass grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
    <ConnectionStatus />
    <IPCheck />
  </div>
</template>

<script setup lang="ts">
import ConnectionStatus from '@/components/overview/ConnectionStatus.vue'
import IPCheck from '@/components/overview/IPCheck.vue'
</script>
