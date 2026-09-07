<script setup lang="ts">
/*
 * 节点网格按「行」虚拟化,只渲染视口附近的几行。
 */
import { handlerProxySelect } from '@/assembly/proxies'
import { PROXY_CARD_SIZE } from '@/constant'
import { useCollapseTransition } from '@/composables/collapseTransition'
import { scrollNodeIntoViewKey } from '@/composables/proxiesScroll'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import { minProxyCardWidth, proxyCardSize } from '@/store/settings'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useElementSize, useResizeObserver } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import ProxyNodeCard from './ProxyNodeCard.vue'

// 行距做在行自己的 pb 上,算进量到的行高里;最后一行多出来的 pb 由根节点的 -mb-2 抵掉。
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

// 和原来 grid 的 repeat(auto-fill, minmax(minProxyCardWidth, 1fr)) 是同一个算法
const columns = computed(() =>
  width.value ? Math.max(1, Math.floor((width.value + GAP) / (minProxyCardWidth.value + GAP))) : 1,
)
const rowCount = computed(() => Math.ceil(props.renderProxies.length / columns.value))
const estimatedRowHeight = computed(
  () => (proxyCardSize.value === PROXY_CARD_SIZE.SMALL ? 48 : 60) + GAP,
)

// 入场 / 高亮动画会给卡片挂 transform,只能用不受 transform 影响的布局尺寸来量。
const measureRowHeight = (element: Element, entry: ResizeObserverEntry | undefined) => {
  const box = entry?.borderBoxSize?.[0]

  return box ? Math.round(box.blockSize) : (element as HTMLElement).offsetHeight
}

// 动画及外层列表交接期间 overscan 归零，屏外的行等交接绘制后再补。
const collapseTransitioning = useCollapseTransition()
const overscan = computed(() => (collapseTransitioning?.value ? 0 : 3))

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: rowCount.value,
    getScrollElement: () => scrollEl.value,
    estimateSize: () => estimatedRowHeight.value,
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

  /*
   * 一行都没渲染时占位块要顶起全部高度:滚动容器高度全靠内容撑,
   * 这里返回 0 就会「容器 0 高 → 算不出可视区 → 渲不出行」死锁。
   */
  return Math.max(0, totalSize.value - (last ? last.end - scrollMargin.value : 0))
})

const rowNodes = (rowIndex: number) =>
  props.renderProxies.slice(rowIndex * columns.value, (rowIndex + 1) * columns.value)

// 每个元素只交给 virtualizer 量一次;之后的高度变化由它自己的 ResizeObserver 报回来。
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

// 滚动容器不一定紧挨着自己,位置差用 rect 算,不依赖 offsetParent 是谁。
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

/*
 * 定位一律以真实 DOM 几何为准。虚拟坐标里没渲染过的行用的是估算高度,scrollMargin 也可能
 * 还没重新同步(按订阅分段时前面的段一变高就过期),拿它和 scrollTop 混算既会误判可见性
 * ——「本来就在视口里却被滚走」——,也会算出偏掉的落点。
 */
const checkRow = (rowIndex: number): 'missing' | 'visible' | 'off' => {
  const scroller = scrollEl.value
  const row = rowElement(rowIndex)

  if (!scroller || !row) return 'missing'

  const top = offsetInScroller(row, scroller)

  // rect 带小数,边界上留 1px 容差,免得贴边的行老是被判成没露全。
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

  // 显式 instant:直接写 scrollTop 会继承容器上可能存在的 CSS scroll-behavior。
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

/*
 * 屏外的行还没挂出来,量不到几何,只能先让 virtualizer 按估算滚过去 —— 那一跳的落点取决于
 * 沿途行高的估算准不准,重排之后按行号缓存的旧行高更是对不上,所以挂出来之后还要逐帧用
 * 真实几何收尾。
 */
const correctRow = (rowIndex: number) => {
  const scroller = scrollEl.value

  if (!scroller) return

  const deadline = performance.now() + CORRECT_TIMEOUT
  let stable = 0

  // 用户一动就撒手,不跟他抢滚动条。
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
      // 多稳一帧:行高从估算修正成实测、scrollMargin 重新同步,都可能再把它挪走。
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

// 目标节点可能没挂载,由行 virtualizer 负责定位;已经完整可见就不动。
const scrollNodeIntoView = (name: string) => {
  cancelCorrect()

  const index = props.renderProxies.indexOf(name)

  // width 还没量到时 columns 是兜底的 1,这时候算出来的行号会错得离谱。
  if (index < 0 || !scrollEl.value || !width.value) return

  const rowIndex = Math.floor(index / columns.value)
  const state = checkRow(rowIndex)

  if (state === 'visible') return

  if (state === 'off') {
    centerRow(rowIndex)
  } else {
    rowVirtualizer.value.scrollToIndex(rowIndex, { align: 'center' })
  }

  // 滚过去会带出一批没量过的行,它们量完可能又把目标挪走,交给校正循环盯到稳定为止。
  correctRow(rowIndex)
}

// 测速重排后卡片可能已经不在渲染窗口里,由列表负责滚过去(见 ProxyNodeCard)
provide(scrollNodeIntoViewKey, scrollNodeIntoView)

/*
 * 展开时默认落在当前选中的那一行 —— 节点多的组里它常在几屏之外,从头开始得用户自己找。
 * 触发点用「虚拟列表已经产出可视行」而不是 onMounted:它为真才说明容器尺寸量到了、列数
 * 可信;弹窗里内容先挂载后可见的情况也会自然往后推。
 */
const alignActiveRow = () => {
  if (props.now) scrollNodeIntoView(props.now)
}

let pendingAlign = true

watch(
  [() => virtualRows.value.length > 0 && Boolean(width.value), () => props.name],
  ([ready], previous) => {
    // 换了个组(连锁弹窗里点链路切换)组件不会重挂,得重新定位,否则停在上一个组的位置。
    if (previous && previous[1] !== props.name) pendingAlign = true

    if (!ready || !pendingAlign) return

    pendingAlign = false
    alignActiveRow()
  },
  { immediate: true, flush: 'post' },
)

// 展开动画结束后再校一次:按订阅分段时前面段的 scrollMargin 可能到这会儿才同步完。
// 已经完整可见的话这一趟什么都不做,不会二次跳动。
watch(
  () => collapseTransitioning?.value,
  (value, previous) => {
    if (previous && !value) alignActiveRow()
  },
)

// 按订阅分段时会有多个实例共用一个滚动容器,前面的段变高之后要由 ProxiesByProvider 叫醒
defineExpose({ syncScrollMargin })

useResizeObserver(scrollEl, syncScrollMargin)

onMounted(() => {
  scrollEl.value = rootRef.value?.closest(`.${PROXIES_PARENT_CLASS}`) as HTMLElement | null

  nextTick(syncScrollMargin)
})

onBeforeUnmount(cancelCorrect)
</script>

<template>
  <div
    ref="rootRef"
    class="-mb-2 min-w-0"
  >
    <div :style="{ height: `${topSpacer}px` }" />
    <div
      v-for="row in virtualRows"
      :key="row.key.toString()"
      :data-index="row.index"
      :ref="(el) => measureRow(el as Element | null)"
      class="grid min-w-0 gap-2 pb-2"
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
</template>
