<template>
  <div
    ref="previewRef"
    class="flex flex-wrap"
    :class="[showDots ? 'gap-1 pt-3' : 'gap-2 pt-4 pb-1']"
  >
    <template v-if="showDots">
      <div
        v-for="node in nodesLatency"
        :key="node.name"
        class="flex h-4 w-4 items-center justify-center rounded-full transition hover:scale-110"
        :class="getBgColor(node.latency)"
        ref="dotsRef"
        @mouseenter="(e) => makeTippy(e, node)"
        @click.stop="$emit('nodeclick', node.name)"
      >
        <div
          class="h-2 w-2 rounded-full bg-white"
          v-if="now === node.name"
        ></div>
      </div>
    </template>
    <div
      v-else
      class="flex flex-1 items-center justify-center overflow-hidden rounded-2xl *:h-2"
    >
      <div
        :class="getBgColor(lowLatency - 1)"
        :style="{
          width: getPreviewWidth(goodsCounts), // cant use tw class, otherwise dynamic classname won't be generated
        }"
      />
      <div
        :class="getBgColor(mediumLatency - 1)"
        :style="{
          width: getPreviewWidth(mediumCounts),
        }"
      />
      <div
        :class="getBgColor(mediumLatency + 1)"
        :style="{
          width: getPreviewWidth(badCounts),
        }"
      />
      <div
        :class="getBgColor(NOT_CONNECTED)"
        :style="{
          width: getPreviewWidth(notConnectedCounts),
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NOT_CONNECTED, PROXY_PREVIEW_TYPE } from '@/constant'
import { getColorForLatency } from '@/helper'
import { useTooltip } from '@/helper/tooltip'
import { getLatencyByName } from '@/store/proxies'
import { lowLatency, mediumLatency, proxyPreviewType } from '@/store/settings'
import { useElementSize } from '@vueuse/core'
import { computed, ref } from 'vue'

type ProxyPreviewNode = {
  name: string
  latency: number
}

type LatencyCounts = {
  good: number
  medium: number
  bad: number
  notConnected: number
}

const props = defineProps<{
  nodes: string[]
  now?: string
  groupName?: string
}>()

const { showTip } = useTooltip()
const previewRef = ref<HTMLElement | null>(null)
const { width } = useElementSize(previewRef)

const widthEnough = computed(() => {
  return width.value > 20 * props.nodes.length
})

const makeTippy = (e: Event, node: { name: string; latency: number }) => {
  const tag = document.createElement('div')
  const name = document.createElement('div')

  name.textContent = node.name
  tag.append(name)

  if (node.latency !== NOT_CONNECTED) {
    const latency = document.createElement('div')

    latency.textContent = `${node.latency}ms`
    latency.classList.add(getColorForLatency(node.latency))
    tag.append(latency)
  }

  tag.classList.add('flex', 'items-center', 'gap-2')
  showTip(e, tag)
}

const getPreviewWidth = (count: number) => {
  if (!props.nodes.length) {
    return '0%'
  }

  return `${(count * 100) / props.nodes.length}%`
}

const showDots = computed(() => {
  return (
    proxyPreviewType.value === PROXY_PREVIEW_TYPE.DOTS ||
    (proxyPreviewType.value === PROXY_PREVIEW_TYPE.AUTO && widthEnough.value)
  )
})

const previewLatencyState = computed(() => {
  const nodes: ProxyPreviewNode[] = []
  const counts: LatencyCounts = {
    good: 0,
    medium: 0,
    bad: 0,
    notConnected: 0,
  }

  for (const name of props.nodes) {
    const latency = getLatencyByName(name, props.groupName)

    nodes.push({ latency, name })

    if (latency === NOT_CONNECTED) {
      counts.notConnected += 1
    } else if (latency < lowLatency.value) {
      counts.good += 1
    } else if (latency < mediumLatency.value) {
      counts.medium += 1
    } else {
      counts.bad += 1
    }
  }

  return { nodes, counts }
})
const nodesLatency = computed(() => previewLatencyState.value.nodes)
const latencyCounts = computed(() => previewLatencyState.value.counts)
const getBgColor = (latency: number) => {
  if (latency === NOT_CONNECTED) {
    return 'bg-base-content/60'
  } else if (latency < lowLatency.value) {
    return 'bg-low-latency'
  } else if (latency < mediumLatency.value) {
    return 'bg-medium-latency'
  } else {
    return 'bg-high-latency'
  }
}

const goodsCounts = computed(() => latencyCounts.value.good)
const mediumCounts = computed(() => latencyCounts.value.medium)
const badCounts = computed(() => latencyCounts.value.bad)
const notConnectedCounts = computed(() => latencyCounts.value.notConnected)
</script>

<style scoped>
.tooltip:before {
  left: 0;
  transform: translateX(-10px);
}
</style>
