<template>
  <div
    class="bg-base-content/5 animate-pulse rounded-xl"
    :style="{ width, height, borderRadius }"
    role="presentation"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    borderRadius?: string
  }>(),
  {
    width: '100%',
    height: '1rem',
    borderRadius: undefined,
  },
)
</script>
