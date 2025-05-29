<template>
  <div class="flex flex-col gap-2 p-2 text-sm">
    <StatisticsStats type="ctrl" />

    <div class="flex items-center gap-2">
      <span class="shrink-0">
        {{ $t('version') }}
      </span>
      <BackendVersion />
    </div>
  </div>
</template>

<script setup lang="ts">
import BackendVersion from '../common/BackendVersion.vue'
import StatisticsStats from '../overview/StatisticsStats.vue'
</script>
