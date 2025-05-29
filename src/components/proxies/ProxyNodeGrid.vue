<template>
  <div
    class="grid max-h-96 gap-2 overflow-x-hidden overflow-y-auto"
    :style="`grid-template-columns: repeat(auto-fill, minmax(${minProxyCardWidth}px, 1fr));`"
  >
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { minProxyCardWidth } from '@renderer/store/settings'
</script>
