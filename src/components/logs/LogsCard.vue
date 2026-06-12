<template>
  <div
    class="scroller-item hover:bg-base-200/60 active:bg-base-200/80 flex cursor-pointer items-center gap-2 overflow-hidden px-3 py-[4px] text-sm transition-colors"
    :title="log.payload"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
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
    <div class="min-w-0 flex-1 truncate">
      <HighlightText
        :text="log.payload"
        :filter="logFilter"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import HighlightText from '@/components/common/HighlightText.vue'
import { useBounceOnVisible } from '@/composables/bouncein'
import { LOG_LEVEL } from '@/constant'
import { logFilter } from '@/store/logs'
import type { LogWithSeq } from '@/types'
import { computed, inject } from 'vue'

const props = defineProps<{
  log: LogWithSeq
}>()

const showLogDetail = inject<(log: LogWithSeq) => void>('showLogDetail', () => {})
const handleClick = () => {
  showLogDetail(props.log)
}

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
  [LOG_LEVEL.Silent]: 'text-base-content/40',
}

useBounceOnVisible()
</script>
