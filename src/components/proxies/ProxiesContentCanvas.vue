<script setup lang="ts">
/*
 * 节点网格的画布实现:整片网格画在一张跟着滚动容器钉住(sticky)的画布上,
 * 只画落在可视区里的那几行。
 *
 * 相比 DOM 版少掉的东西不是巧合 —— 画布上没有可测量的元素,布局只能解析式算出来,
 * 于是 measureElement / scrollMargin 对账 / correctRow 逐帧校正 / 折叠动画期间的
 * overscan 归零 这一整套补偿逻辑全都不需要了。
 */
import {
  getIPv6ByName,
  getTestUrl,
  handlerProxySelect,
  latencyMapOf,
  proxyLatencyTest,
  proxyMap,
} from '@/assembly/proxies'
import { useCollapseTransition } from '@/composables/collapseTransition'
import {
  highlightProxyNode,
  highlightedProxyNode,
  scrollNodeIntoViewKey,
} from '@/composables/proxiesScroll'
import { NOT_CONNECTED, PROXY_CARD_SIZE, PROXY_SORT_TYPE } from '@/constant'
import { buildLatencyHistoryTip } from '@/helper/latencyTip'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import {
  IPv6test,
  minProxyCardWidth,
  proxyCardSize,
  proxySortType,
  truncateProxyName,
} from '@/store/settings'
import { smartWeightsMap } from '@/store/smart'
import { useResizeObserver } from '@vueuse/core'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { prefersReducedMotion, RenderLoop } from './canvas/animations'
import { onProxyIconReady } from './canvas/icons'
import {
  clearTextMeasureCaches,
  computeLayout,
  hitTest,
  nameAreaWidth,
  truncateText,
  type GridLayout,
  type Hit,
} from './canvas/layout'
import { GridPainter, type NodeView } from './canvas/paint'
import { canvasThemeVersion, watchCanvasTheme } from './canvas/theme'
import { CanvasTooltip } from './canvas/tooltip'

const props = defineProps<{
  name?: string
  now?: string
  renderProxies: string[]
}>()

const { t } = useI18n()

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const scrollEl = shallowRef<HTMLElement | null>(null)
const ctxRef = shallowRef<CanvasRenderingContext2D | null>(null)

const width = ref(0)
const scrollerHeight = ref(0)
const fontFamily = ref('sans-serif')
const hoverIndex = ref(-1)
const hoverEnabled = ref(true)

// 测速中的节点。Set 本身不是响应式的,靠这个计数触发重绘。
const testing = new Set<string>()
const testingVersion = ref(0)

const painter = new GridPainter()
const tooltip = new CanvasTooltip(() => overlayRef.value)

/* ---------- 绘制模型 ---------- */

const latencyMap = latencyMapOf(() => props.name)

const typeFormatter = (type: string) =>
  type
    .toLowerCase()
    .replace('shadowsocks', 'ss')
    .replace('hysteria', 'hy')
    .replace('wireguard', 'wg')

const isSmallCard = computed(() => proxyCardSize.value === PROXY_CARD_SIZE.SMALL)

const nodes = computed<NodeView[]>(() => {
  // testing 是普通 Set,读一下版本号才能让这个 computed 跟着测速状态失效。
  void testingVersion.value

  return props.renderProxies.map((name) => {
    const node = proxyMap.value[name]
    // 与 ProxyNodeCard 的 typeDescription 同源
    const smartUsage = smartWeightsMap.value[props.name ?? '']?.[name]
    const parts = [
      node ? typeFormatter(node.type) : '',
      node?.udp ? (node.xudp ? 'xudp' : 'udp') : '',
      smartUsage ? t(smartUsage) : '',
      IPv6test.value && getIPv6ByName(name) ? 'IPv6' : '',
    ].filter(Boolean)

    return {
      name,
      typeText: parts.join(isSmallCard.value ? '/' : ' / '),
      icon: node?.icon,
      active: name === props.now,
      latency: latencyMap.value.get(name) ?? NOT_CONNECTED,
      testing: testing.has(name),
    }
  })
})

const layout = computed<GridLayout | null>(() => {
  const ctx = ctxRef.value

  if (!ctx || !width.value) return null

  return computeLayout({
    ctx,
    width: width.value,
    names: props.renderProxies,
    minCardWidth: minProxyCardWidth.value,
    cardSize: proxyCardSize.value,
    truncateName: truncateProxyName.value,
    nameFont: `14px ${fontFamily.value}`,
    hasIcon: (name) => Boolean(proxyMap.value[name]?.icon),
  })
})

const totalHeight = computed(() => layout.value?.totalHeight ?? 0)
const viewHeight = computed(() =>
  Math.min(scrollerHeight.value || totalHeight.value, totalHeight.value),
)

/* ---------- 画布 ---------- */

// 画布被 sticky 钉住,内容在它下面滚;两者的位置差就是要跳过的内容高度。
const contentOffset = () => {
  const canvas = canvasRef.value
  const root = rootRef.value

  if (!canvas || !root) return 0

  return Math.max(
    0,
    Math.round(canvas.getBoundingClientRect().top - root.getBoundingClientRect().top),
  )
}

const highlightStart = ref(0)

let backingWidth = 0
let backingHeight = 0

const draw = () => {
  const canvas = canvasRef.value
  const ctx = ctxRef.value
  const value = layout.value

  if (!canvas || !ctx || !value) return

  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.round(width.value * dpr)
  const pixelHeight = Math.round(viewHeight.value * dpr)

  // 改 width/height 会清空画布并重置变换,只在真的变了的时候动。
  if (pixelWidth !== backingWidth || pixelHeight !== backingHeight) {
    canvas.width = backingWidth = pixelWidth
    canvas.height = backingHeight = pixelHeight
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  painter.draw({
    ctx,
    layout: value,
    nodes: nodes.value,
    offsetY: contentOffset(),
    viewHeight: viewHeight.value,
    width: width.value,
    hoverIndex: hoverIndex.value,
    hoverEnabled: hoverEnabled.value,
    fontFamily: fontFamily.value,
    reducedMotion: prefersReducedMotion(),
    highlightName: highlightedProxyNode.value,
    highlightStart: highlightStart.value,
    markAnimating: () => loop.markAnimating(),
  })
}

const loop = new RenderLoop(draw)

/* ---------- 命中与交互 ---------- */

const hitAt = (event: MouseEvent): Hit | null => {
  const canvas = canvasRef.value
  const value = layout.value

  if (!canvas || !value) return null

  const rect = canvas.getBoundingClientRect()

  return hitTest(
    value,
    props.renderProxies.length,
    event.clientX - rect.left,
    event.clientY - rect.top + contentOffset(),
  )
}

const showTooltipFor = (hit: Hit) => {
  const ctx = ctxRef.value
  const value = layout.value

  if (!ctx || !value) return

  const node = nodes.value[hit.index]

  if (hit.region === 'latency') {
    tooltip.show(
      `latency:${node.name}`,
      hit.rect,
      () => buildLatencyHistoryTip(node.name, props.name),
      { delay: [1000, 0], trigger: 'mouseenter', touch: false },
    )

    return
  }

  // 只有真被截断了才提示,等价于 DOM 版的 checkTruncation。
  const isName = hit.region === 'name'
  const text = isName ? node.name : node.typeText

  ctx.font = `${isName ? 14 : 12}px ${fontFamily.value}`

  // 有图标时名称区要窄一截,不能拿命中区的宽度当可用宽度。
  const available = isName
    ? nameAreaWidth(value.columnWidth, value.metrics, Boolean(node.icon))
    : hit.rect.width
  const truncated = truncateText(ctx, text, available) !== text

  tooltip.show(`${hit.region}:${node.name}`, hit.rect, () => (truncated ? text : null), {
    delay: [700, 0],
    trigger: 'mouseenter',
    touch: ['hold', 500],
  })
}

const handlerPointerMove = (event: PointerEvent) => {
  if (event.pointerType === 'touch') return

  const hit = hitAt(event)

  if (hoverIndex.value !== (hit?.index ?? -1)) {
    hoverIndex.value = hit?.index ?? -1
    loop.requestFrame()
  }

  if (hit) showTooltipFor(hit)
  else tooltip.hide()
}

const handlerPointerLeave = () => {
  tooltip.hide()
  if (hoverIndex.value === -1) return

  hoverIndex.value = -1
  loop.requestFrame()
}

const latencyTest = async (name: string) => {
  if (testing.has(name)) return

  testing.add(name)
  testingVersion.value++
  try {
    await proxyLatencyTest(name, getTestUrl(props.name))
  } catch {
    // 失败也要把 loading 态收掉
  }
  testing.delete(name)
  testingVersion.value++

  if ([PROXY_SORT_TYPE.LATENCY_ASC, PROXY_SORT_TYPE.LATENCY_DESC].includes(proxySortType.value)) {
    // 重排会把卡片挪到别处,先标上高亮,再等新顺序落定后滚过去。
    highlightProxyNode(name)
    await nextTick()
    scrollNodeIntoView(name)
  }
}

const handlerClick = (event: MouseEvent) => {
  const hit = hitAt(event)

  if (!hit) return

  // 外面还套着组卡片的点击(移动端展开)与右键(整组测速),别让事件漏上去。
  event.stopPropagation()

  const node = nodes.value[hit.index]

  if (hit.region === 'latency') {
    void latencyTest(node.name)

    return
  }

  if (props.name) handlerProxySelect(props.name, node.name)
}

const handlerContextMenu = (event: MouseEvent) => {
  const hit = hitAt(event)

  if (!hit) return

  event.preventDefault()
  event.stopPropagation()
  void latencyTest(nodes.value[hit.index].name)
}

/* ---------- 滚动定位 ---------- */

const offsetInScroller = () => {
  const root = rootRef.value
  const scroller = scrollEl.value

  if (!root || !scroller) return 0

  return (
    root.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
  )
}

const scrollNodeIntoView = (name: string) => {
  const value = layout.value
  const scroller = scrollEl.value
  const index = props.renderProxies.indexOf(name)

  if (!value || !scroller || index < 0 || !width.value) return

  const row = Math.floor(index / value.columns)
  const top = offsetInScroller() + value.rowTops[row]
  const height = value.rowHeights[row]

  // 已经完整可见就别动;留 1px 容差,免得贴边的行老是被判成没露全。
  if (
    top >= scroller.scrollTop - 1 &&
    top + height <= scroller.scrollTop + scroller.clientHeight + 1
  )
    return

  scroller.scrollTo({
    top: Math.max(
      0,
      Math.min(
        scroller.scrollHeight - scroller.clientHeight,
        top - (scroller.clientHeight - height) / 2,
      ),
    ),
    behavior: 'instant',
  })
}

// 测速重排后卡片可能不在可视区里,由网格负责滚过去(见 ProxyNodeCard 的同名注释)
provide(scrollNodeIntoViewKey, scrollNodeIntoView)

/*
 * 展开时默认落在当前选中的那一行 —— 节点多的组里它常在几屏之外。
 * 触发点是「宽度量到了」,那才说明列数可信、行位置算得准。
 */
let pendingAlign = true

const alignActiveRow = () => {
  if (props.now) scrollNodeIntoView(props.now)
}

watch(
  [() => width.value > 0, () => props.name],
  ([ready], previous) => {
    // 连锁弹窗里切组时组件不会重挂,得重新定位,顺带把上一组的动画状态丢掉。
    if (previous && previous[1] !== props.name) {
      pendingAlign = true
      painter.reset()
    }

    if (!ready || !pendingAlign) return

    pendingAlign = false
    alignActiveRow()
  },
  { immediate: true, flush: 'post' },
)

// 展开动画结束后再校一次;已经完整可见的话这一趟什么都不做。
const collapseTransitioning = useCollapseTransition()

watch(
  () => collapseTransitioning?.value,
  (value, previous) => {
    if (previous && !value) alignActiveRow()
  },
)

watch(highlightedProxyNode, (value) => {
  if (!value) return

  highlightStart.value = performance.now()
  loop.requestFrame()
})

/* ---------- 生命周期 ---------- */

// 滚动时同步重绘:画布的位置由合成器更新,内容要是等到下一帧就会和它错开。
const handlerScroll = () => loop.drawNow()

// 任何一处输入变化都只是「下一帧重画」,不必区分是数据、悬停还是主题。
watch([layout, nodes, testingVersion, canvasThemeVersion, viewHeight], () => loop.requestFrame(), {
  flush: 'post',
})

let releaseIconListener: (() => void) | undefined

// ProxiesByProvider 会在任意一段变高时叫醒所有段。画布这边位置每帧现算,不需要对账。
const syncScrollMargin = () => {}

defineExpose({ syncScrollMargin })

useResizeObserver(rootRef, ([entry]) => {
  width.value = entry.contentRect.width
})

onMounted(() => {
  const canvas = canvasRef.value

  if (!canvas) return

  watchCanvasTheme()
  ctxRef.value = canvas.getContext('2d')
  fontFamily.value = getComputedStyle(canvas).fontFamily || 'sans-serif'
  hoverEnabled.value = window.matchMedia('(hover: hover)').matches

  /*
   * 宽度要在这里同步读一次,不能只等 ResizeObserver 的首次回调:折叠动画展开时
   * collapseMotion 等两帧后就来读内容高度,那时根节点必须已经是最终高度了。
   */
  width.value = rootRef.value?.offsetWidth ?? 0

  scrollEl.value = rootRef.value?.closest(`.${PROXIES_PARENT_CLASS}`) as HTMLElement | null
  scrollerHeight.value = scrollEl.value?.clientHeight ?? 0
  scrollEl.value?.addEventListener('scroll', handlerScroll, { passive: true })

  releaseIconListener = onProxyIconReady(() => loop.requestFrame())

  // 字体加载完文本宽度会变,量过的结果得作废。
  void document.fonts?.ready.then(() => {
    clearTextMeasureCaches()
    loop.requestFrame()
  })

  loop.requestFrame()
})

useResizeObserver(scrollEl, ([entry]) => {
  scrollerHeight.value = entry.target.clientHeight
})

onBeforeUnmount(() => {
  scrollEl.value?.removeEventListener('scroll', handlerScroll)
  releaseIconListener?.()
  tooltip.hide()
  loop.destroy()
})
</script>

<template>
  <div
    ref="rootRef"
    class="relative min-w-0 select-none"
    :style="{ height: `${totalHeight}px` }"
  >
    <canvas
      ref="canvasRef"
      class="sticky top-0 block w-full"
      :class="hoverIndex >= 0 && 'cursor-pointer'"
      :style="{ height: `${viewHeight}px` }"
      @pointermove="handlerPointerMove"
      @pointerleave="handlerPointerLeave"
      @click="handlerClick"
      @contextmenu="handlerContextMenu"
    />
    <!-- tippy 需要一个可定位的元素,悬停目标变化时往这里放一个看不见的锚点 -->
    <div
      ref="overlayRef"
      class="pointer-events-none absolute inset-0"
    />
  </div>
</template>
