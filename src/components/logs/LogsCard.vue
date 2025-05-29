<template>
  <div class="card hover:bg-base-200 mb-1 block p-2 text-sm break-all">
    <span>{{ log.seq }}</span>
    <span class="text-main mx-2">
      {{ log.time }}
    </span>
    <span :class="textColorMapForType[log.type as keyof typeof textColorMapForType]">
      {{ log.type }}
    </span>
    <span class="ml-2">{{ log.payload }}</span>
  </div>
</template>

<script setup lang="ts">
import { useBounceOnVisible } from '@renderer/composables/bouncein'
import { LOG_LEVEL } from '@renderer/constant'
import type { LogWithSeq } from '@renderer/types'

defineProps<{
  log: LogWithSeq
}>()

const textColorMapForType = {
  [LOG_LEVEL.Trace]: 'text-success',
  [LOG_LEVEL.Debug]: 'text-accent',
  [LOG_LEVEL.Info]: 'text-info',
  [LOG_LEVEL.Warning]: 'text-warning',
  [LOG_LEVEL.Error]: 'text-error',
  [LOG_LEVEL.Fatal]: 'text-error',
  [LOG_LEVEL.Panic]: 'text-error',
}

useBounceOnVisible()
</script>
