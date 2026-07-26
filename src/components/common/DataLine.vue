<template>
  <div class="flex min-h-11 items-center justify-between gap-3 px-4 py-2">
    <span class="text-base-content/55 flex-shrink-0">{{ label }}</span>
    <span
      class="text-right break-all"
      :class="mono && 'font-mono text-xs'"
      >{{ value }}</span
    >
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  mono?: boolean
}>()
</script>
