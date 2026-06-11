<template>
  <div
    class="scroller-item hover:bg-base-200/40 flex items-center gap-2 truncate px-3 py-1 text-sm transition-colors"
    :title="log.payload"
  >
    <span
      class="text-base-content/40 shrink-0 text-xs tabular-nums"
      :style="{ minWidth: `${(seqWithPadding.length + 1) * 0.62}em` }"
    >
      {{ seqWithPadding }}
    </span>
    <span
      class="badge badge-sm shrink-0"
      :class="colorMapForType[log.type as keyof typeof colorMapForType]"
    >
      <HighlightText
        :text="log.type"
        :filter="logFilter"
      />
    </span>
    <span class="text-base-content/40 shrink-0 text-xs tabular-nums">
      <HighlightText
        :text="log.time"
        :filter="logFilter"
      />
    </span>
    <span class="truncate">
      <HighlightText
        :text="log.payload"
        :filter="logFilter"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import HighlightText from '@/components/common/HighlightText.vue'
import { useBounceOnVisible } from '@/composables/bouncein'
import { LOG_LEVEL } from '@/constant'
import { logFilter } from '@/store/logs'
import type { LogWithSeq } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  log: LogWithSeq
}>()

const seqWithPadding = computed(() => {
  return props.log.seq.toString().padStart(2, '0')
})

const colorMapForType = {
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
