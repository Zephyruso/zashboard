<template>
  <div class="card w-full">
    <div class="card-title px-4 pt-4">
      {{ $t('networkInfo') }}
    </div>
    <div class="card-body gap-4">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <IPCheck />
        <ConnectionStatus />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ConnectionStatus from '@renderer/components/overview/ConnectionStatus.vue'
import IPCheck from '@renderer/components/overview/IPCheck.vue'
</script>
