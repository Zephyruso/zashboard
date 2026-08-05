<template>
  <div class="flex items-center gap-1 overflow-hidden">
    <img
      :src="coreBrand.logo"
      class="h-4 w-4 rounded-xs"
    />
    <span
      class="text-base-content/60 truncate"
      @mouseenter="checkTruncation"
    >
      {{ version }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { coreBrand, version } from '@/assembly/version'
import { checkTruncation } from '@/helper/tooltip'
</script>
