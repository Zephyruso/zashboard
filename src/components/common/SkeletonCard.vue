<template>
  <div
    class="overview-stat-card"
    role="presentation"
    aria-hidden="true"
  >
    <SkeletonLoader
      width="40%"
      height="0.75rem"
    />
    <SkeletonLoader
      width="60%"
      height="1.75rem"
    />
    <SkeletonLoader
      class="mt-1"
      width="100%"
      height="3.5rem"
      border-radius="var(--ios-radius-md, 12px)"
    />
    <SkeletonLoader
      width="50%"
      height="0.75rem"
    />
  </div>
</template>

<script setup lang="ts">
import SkeletonLoader from './SkeletonLoader.vue'
</script>
