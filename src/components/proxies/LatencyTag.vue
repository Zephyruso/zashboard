<template>
  <button
    type="button"
    :class="latencyClass"
    :aria-label="ariaLabel"
    :aria-busy="loading"
    :disabled="loading"
    @mouseenter="handlerHistoryTip"
  >
    <span
      v-if="loading"
      class="loading loading-dots loading-xs"
    ></span>
    <BoltIcon
      v-else-if="isNoLatency"
      class="h-3 w-3"
    />
    <div
      v-show="!isNoLatency && !loading"
      ref="latencyRef"
    >
      {{ latency }}
    </div>
  </button>
</template>

<script setup lang="ts">
import { NOT_CONNECTED } from '@/constant'
import { getColorForLatency } from '@/helper'
import { useTooltip } from '@/helper/tooltip'
import { getHistoryByName, getLatencyByName } from '@/store/proxies'
import { BoltIcon } from '@heroicons/vue/24/outline'
import { CountUp } from 'countup.js'
import dayjs from 'dayjs'
import { twMerge } from 'tailwind-merge'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { showTip } = useTooltip()
const { t } = useI18n()
const handlerHistoryTip = (e: Event) => {
  const history = getHistoryByName(props.name ?? '', props.groupName, false)

  if (!history.length) return

  const historyList = document.createElement('div')

  historyList.classList.add('flex', 'flex-col', 'gap-1')
  for (const item of history) {
    const itemDiv = document.createElement('div')
    const time = document.createElement('div')
    const latency = document.createElement('div')

    time.textContent = dayjs(item.time).format('YYYY-MM-DD HH:mm:ss')
    latency.textContent = item.delay + 'ms'
    latency.className = getColorForLatency(item.delay)

    itemDiv.classList.add('flex', 'items-center', 'gap-2')
    itemDiv.append(time, latency)
    historyList.append(itemDiv)
  }

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
const latencyRef = ref()
const latency = computed(() => getLatencyByName(props.name ?? '', props.groupName))
const isNoLatency = computed(() => latency.value === NOT_CONNECTED || !latency.value)
const color = computed(() => {
  return getColorForLatency(latency.value)
})
const latencyClass = computed(() =>
  twMerge('latency-tag md:hover:shadow-sm', isNoLatency.value ? 'no-latency' : color.value),
)
const ariaLabel = computed(() => {
  const target = props.name ? ` ${props.name}` : ''
  return `${t('speedtest')}${target}`
})
let countUp: CountUp | null = null

onMounted(() => {
  watch(latency, (value, OldValue) => {
    if (!countUp) {
      nextTick(() => {
        countUp = new CountUp(latencyRef.value, latency.value, {
          duration: 1,
          separator: '',
          enableScrollSpy: false,
          startVal: OldValue,
        })
        countUp?.update(value)
      })
    } else {
      countUp?.update(value)
    }
  })
})

onUnmounted(() => {
  countUp = null
})
</script>
