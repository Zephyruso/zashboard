<template>
  <div class="flex h-8 items-end gap-0.5">
    <div
      v-for="(bar, i) in bars"
      :key="i"
      class="flex-1 rounded-[1px] transition-all duration-300 hover:opacity-80"
      :class="bar.class"
      :style="{ height: bar.height }"
      @mouseenter="bar.tip && showTip($event, bar.tip)"
    />
  </div>
</template>

<script setup lang="ts">
import { useTooltip } from '@/helper/tooltip'
import { lowLatency, mediumLatency } from '@/store/settings'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ data: number[]; rounds?: number }>(), { rounds: 5 })

const { t } = useI18n()
const { showTip } = useTooltip()

// 字面量类名,确保 Tailwind JIT 能扫描到(不可用运行时拼接)。
const colorClass = (latency: number) => {
  if (latency < lowLatency.value) return 'bg-low-latency'
  if (latency < mediumLatency.value) return 'bg-medium-latency'
  return 'bg-high-latency'
}

const bars = computed(() => {
  // 以本组最大有效值为高度基准,放大组内差异;颜色按绝对阈值,体现好坏。
  const ceil = Math.max(...props.data.filter((v) => v > 0), 1)

  return Array.from({ length: props.rounds }, (_, i) => {
    if (i >= props.data.length) {
      // 尚未测到的轮次:占位,无提示
      return { class: 'bg-base-content/10', height: '18%', tip: '' }
    }
    const value = props.data[i]
    if (!value) {
      // 该次测速失败
      return { class: 'bg-high-latency opacity-40', height: '100%', tip: t('testFailed') }
    }
    const pct = Math.max(18, Math.round((value / ceil) * 100))
    return { class: colorClass(value), height: `${pct}%`, tip: `${value}ms` }
  })
})
</script>
