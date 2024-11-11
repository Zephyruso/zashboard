<template>
  <div class="fex flex-col gap-2 p-4 h-full overflow-y-auto">
    <div 
      v-for="log in logs" 
      :key="log.seq" 
      class="card shadow-md p-2 flex-row gap-2">
      <span>{{ log.seq }}</span>
      <span class="text-primary">{{ log.type }}</span>
      <span>{{ log.payload }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logs } from '@/store/logs';
</script>
