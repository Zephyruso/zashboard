<template>
  <div
    class="scroller-item hover:bg-base-200/40 flex flex-col gap-2 px-3 py-2 text-sm transition-colors"
    :class="connectionID && 'cursor-pointer'"
    @click="connectionID && emits('connectionClick', connectionID)"
  >
    <div class="flex items-center gap-2">
      <span
        class="text-base-content/40 text-xs tabular-nums"
        :style="{ minWidth: `${(seqWithPadding.length + 1) * 0.62}em` }"
      >
        {{ seqWithPadding }}
      </span>
      <span
        class="text-[11px] font-medium tracking-wide uppercase"
        :class="colorMapForType[log.type as keyof typeof colorMapForType]"
      >
        <HighlightText
          :text="log.type"
          :filter="logFilter"
        />
      </span>
      <div class="flex-1"></div>
      <span class="text-base-content/40 text-xs tabular-nums">
        <HighlightText
          :text="log.time"
          :filter="logFilter"
        />
      </span>
    </div>
    <div class="w-full leading-relaxed break-words">
      <HighlightText
        :text="log.payload"
        :filter="logFilter"
        ansi
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { isSingBoxCore } from '@/assembly/version'
import HighlightText from '@/components/common/HighlightText.vue'
import { useBounceOnVisible } from '@/composables/bouncein'
import { LOG_LEVEL } from '@/constant'
import { getLogConnectionID, logFilter } from '@/store/logs'
import type { LogWithSeq } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  log: LogWithSeq
  connectionDetailDisabled?: boolean
}>()

const emits = defineEmits<{
  (e: 'connectionClick', connectionID: string): void
}>()

const connectionID = computed(() => {
  if (!isSingBoxCore.value || props.connectionDetailDisabled) return null

  return getLogConnectionID(props.log.payload)
})

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
