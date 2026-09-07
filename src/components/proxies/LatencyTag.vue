<template>
  <div
    :class="[
      'latency-tag bg-base-100 h-5 w-10 rounded-xl text-xs select-none md:hover:shadow-sm',
      color,
    ]"
    @mouseenter="handlerHistoryTip"
  >
    <Transition name="latency-state">
      <span
        v-if="state === 'loading'"
        class="latency-state loading loading-dots loading-xs text-base-content/80"
      ></span>
      <BoltIcon
        v-else-if="state === 'empty'"
        class="latency-state text-base-content h-3 w-3"
      />
      <div
        v-else
        ref="latencyRef"
        class="latency-state tabular-nums"
      >
        {{ latency }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { NOT_CONNECTED } from '@/constant'
import { getColorForLatency } from '@/helper'
import { buildLatencyHistoryTip } from '@/helper/latencyTip'
import { useTooltip } from '@/helper/tooltip'
import { getLatencyByName } from '@/assembly/proxies'
import { BoltIcon } from '@heroicons/vue/24/outline'
import { CountUp } from 'countup.js'
import { computed, onUnmounted, ref, watch } from 'vue'

const { showTip } = useTooltip()
const handlerHistoryTip = (e: Event) => {
  const historyList = buildLatencyHistoryTip(props.name ?? '', props.groupName)

  if (!historyList) return

  showTip(e, historyList, {
    delay: [1000, 0],
    trigger: 'mouseenter',
    touch: false,
  })
}

const props = defineProps<{
  name?: string
  loading?: boolean
  groupName?: string
}>()
const latencyRef = ref<HTMLElement | null>(null)
const latency = computed(() => getLatencyByName(props.name ?? '', props.groupName))
let countUp: CountUp | null = null
// 数字节点测速期间会被卸载,CountUp 实例跟着丢。记住上一次真正显示出来的数字,
// 节点重新挂载时从它滚到新值,滚动效果才不会在每次测速后消失。
let shownLatency = latency.value

const createCountUp = (el: HTMLElement) => {
  countUp = new CountUp(el, shownLatency, {
    duration: 1,
    separator: '',
    enableScrollSpy: false,
    startVal: shownLatency,
  })

  return countUp
}

/*
 * 由节点自身的挂载来驱动重建:flush: 'post' 保证 DOM 已经补好,
 * 且在这一帧绘制前就把文本压回起始值,不会闪一下最终值。
 *
 * 值和上次显示出来的一样就先不建实例 —— 卡片首次挂载几乎都是这种,而一次展开要挂几十张,
 * 省下的是几十次实例创建加 innerHTML 写入。真要滚的时候下面那个 watch 会补上。
 */
watch(
  latencyRef,
  (el) => {
    countUp = null

    if (!el || latency.value === shownLatency) return

    createCountUp(el).update(latency.value)
    shownLatency = latency.value
  },
  { flush: 'post' },
)

// 节点还挂着的时候(比如自动测速刷新)直接滚过去,不用重建实例。
watch(latency, (value) => {
  const el = latencyRef.value

  if (!el) return

  const instance = countUp ?? createCountUp(el)

  instance.update(value)
  shownLatency = value
})

onUnmounted(() => {
  countUp = null
})

const color = computed(() => {
  return getColorForLatency(latency.value)
})

type LatencyState = 'loading' | 'empty' | 'value'

const state = computed<LatencyState>(() => {
  if (props.loading) return 'loading'
  if (latency.value === NOT_CONNECTED || !latency.value) return 'empty'
  return 'value'
})
</script>

<style scoped>
.latency-tag {
  display: grid;
  place-items: center;
  transition:
    color 0.35s ease-out,
    background-color 0.35s ease-out;
}

.latency-state {
  grid-area: 1 / 1;
}

.latency-state-enter-active,
.latency-state-leave-active {
  transition:
    opacity 0.2s ease-out,
    scale 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}

.latency-state-enter-from,
.latency-state-leave-to {
  opacity: 0;
  scale: 0.6;
}

.latency-state-leave-active {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .latency-tag,
  .latency-state-enter-active,
  .latency-state-leave-active {
    transition: none;
  }
}
</style>
