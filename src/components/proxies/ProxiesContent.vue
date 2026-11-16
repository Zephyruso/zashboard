<script setup lang="ts">
import { handlerProxySelect } from '@/assembly/proxies'
import { PROXY_CARD_SIZE } from '@/constant'
import { useCollapseTransition } from '@/composables/use-collapse-transition'
import { scrollNodeIntoViewKey } from '@/helper/proxies-scroll'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import { minProxyCardWidth, proxyCardSize } from '@/store/settings'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useElementSize, useResizeObserver } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import ProxyNodeCard from './ProxyNodeCard.vue'

const GAP = 8

const props = defineProps<{
  name?: string
  now?: string
  renderProxies: string[]
}>()

const rootRef = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const scrollMargin = ref(0)
const { width } = useElementSize(rootRef)

const columns = computed(() =>
  width.value ? Math.max(1, Math.floor((width.value + GAP) / (minProxyCardWidth.value + GAP))) : 1,
)
const rowCount = computed(() => Math.ceil(props.renderProxies.length / columns.value))
const estimatedCardHeight = computed(() =>
  proxyCardSize.value === PROXY_CARD_SIZE.SMALL ? 48 : 60,
)

const estimateRowHeight = (rowIndex: number) =>
  rowIndex === rowCount.value - 1 ? estimatedCardHeight.value : estimatedCardHeight.value + GAP

const measureRowHeight = (element: Element, entry: ResizeObserverEntry | undefined) => {
  const box = entry?.borderBoxSize?.[0]

  return box ? Math.round(box.blockSize) : (element as HTMLElement).offsetHeight
}

const collapseTransitioning = useCollapseTransition()
const overscan = computed(() => (collapseTransitioning?.value ? 0 : 3))

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: rowCount.value,
    getScrollElement: () => scrollEl.value,
    estimateSize: estimateRowHeight,
    measureElement: measureRowHeight,
    scrollMargin: scrollMargin.value,
    overscan: overscan.value,
  })),
)

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())
const topSpacer = computed(() => {
  const first = virtualRows.value[0]

  return first ? first.start - scrollMargin.value : 0
})
const bottomSpacer = computed(() => {
  const last = virtualRows.value[virtualRows.value.length - 1]

  return Math.max(0, totalSize.value - (last ? last.end - scrollMargin.value : 0))
})

const rowNodes = (rowIndex: number) =>
  props.renderProxies.slice(rowIndex * columns.value, (rowIndex + 1) * columns.value)

const measuredRows = new WeakSet<Element>()
const measureRow = (el: Element | null) => {
  if (!el || measuredRows.has(el)) return

  measuredRows.add(el)
  nextTick(() => {
    if (el.isConnected) {
      rowVirtualizer.value.measureElement(el)
    }
  })
}

const offsetInScroller = (el: HTMLElement, scroller: HTMLElement) =>
  el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop

const syncScrollMargin = () => {
  const root = rootRef.value
  const scroller = scrollEl.value

  if (!root || !scroller) return

  scrollMargin.value = offsetInScroller(root, scroller)
}

const rowElement = (rowIndex: number) =>
  rootRef.value?.querySelector<HTMLElement>(`[data-index="${rowIndex}"]`) ?? null

const checkRow = (rowIndex: number): 'missing' | 'visible' | 'off' => {
  const scroller = scrollEl.value
  const row = rowElement(rowIndex)

  if (!scroller || !row) return 'missing'

  const top = offsetInScroller(row, scroller)

  return top >= scroller.scrollTop - 1 &&
    top + row.offsetHeight <= scroller.scrollTop + scroller.clientHeight + 1
    ? 'visible'
    : 'off'
}

const centerRow = (rowIndex: number) => {
  const scroller = scrollEl.value
  const row = rowElement(rowIndex)

  if (!scroller || !row) return

  const top = offsetInScroller(row, scroller) - (scroller.clientHeight - row.offsetHeight) / 2

  scroller.scrollTo({
    top: Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, top)),
    behavior: 'instant',
  })
}

const CORRECT_TIMEOUT = 600
let correctFrame = 0
let releaseAbort: (() => void) | undefined

const cancelCorrect = () => {
  if (correctFrame) cancelAnimationFrame(correctFrame)
  correctFrame = 0
  releaseAbort?.()
  releaseAbort = undefined
}

const correctRow = (rowIndex: number) => {
  const scroller = scrollEl.value

  if (!scroller) return

  const deadline = performance.now() + CORRECT_TIMEOUT
  let stable = 0

  const abort = () => cancelCorrect()

  scroller.addEventListener('wheel', abort, { once: true, passive: true })
  scroller.addEventListener('touchstart', abort, { once: true, passive: true })
  releaseAbort = () => {
    scroller.removeEventListener('wheel', abort)
    scroller.removeEventListener('touchstart', abort)
  }

  const step = () => {
    correctFrame = 0

    const state = checkRow(rowIndex)

    if (state === 'visible') {
      if (++stable >= 2) {
        cancelCorrect()
        return
      }
    } else {
      stable = 0
      if (state === 'off') centerRow(rowIndex)
    }

    if (performance.now() > deadline) {
      cancelCorrect()
      return
    }

    correctFrame = requestAnimationFrame(step)
  }

  correctFrame = requestAnimationFrame(step)
}

const scrollNodeIntoView = (name: string) => {
  cancelCorrect()

  const index = props.renderProxies.indexOf(name)

  if (index < 0 || !scrollEl.value || !width.value) return

  const rowIndex = Math.floor(index / columns.value)
  const state = checkRow(rowIndex)

  if (state === 'visible') return

  if (state === 'off') {
    centerRow(rowIndex)
  } else {
    rowVirtualizer.value.scrollToIndex(rowIndex, { align: 'center' })
  }

  correctRow(rowIndex)
}

provide(scrollNodeIntoViewKey, scrollNodeIntoView)

const alignActiveRow = () => {
  if (props.now) scrollNodeIntoView(props.now)
}

let pendingAlign = true

watch(
  [() => virtualRows.value.length > 0 && Boolean(width.value), () => props.name],
  ([ready], previous) => {
    if (previous && previous[1] !== props.name) pendingAlign = true

    if (!ready || !pendingAlign) return

    pendingAlign = false
    alignActiveRow()
  },
  { immediate: true, flush: 'post' },
)

watch(
  () => collapseTransitioning?.value,
  (value, previous) => {
    if (previous && !value) alignActiveRow()
  },
)

defineExpose({ syncScrollMargin })

useResizeObserver(scrollEl, syncScrollMargin)

onMounted(() => {
  scrollEl.value = rootRef.value?.closest(`.${PROXIES_PARENT_CLASS}`) as HTMLElement | null

  nextTick(syncScrollMargin)
})

onBeforeUnmount(cancelCorrect)
</script>

<template>
  <div class="min-w-0 pt-1">
    <div
      ref="rootRef"
      class="min-w-0"
    >
      <div :style="{ height: `${topSpacer}px` }" />
      <div
        v-for="row in virtualRows"
        :key="row.key.toString()"
        :data-index="row.index"
        :ref="(el) => measureRow(el as Element | null)"
        class="grid min-w-0 gap-2"
        :class="row.index < rowCount - 1 && 'pb-2'"
        :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
      >
        <ProxyNodeCard
          v-for="node in rowNodes(row.index)"
          :key="node"
          :name="node"
          :group-name="name"
          :active="node === now"
          @click.stop="name && handlerProxySelect(name, node)"
        />
      </div>
      <div :style="{ height: `${bottomSpacer}px` }" />
    </div>
  </div>
</template>
