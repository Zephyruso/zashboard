<template>
  <div class="base-container p-4">
    <div class="flex items-center justify-between">
      <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
        {{ $t('connectionTopology') }}
      </div>
    </div>
    <div
      :class="twMerge('bg-base-200/30 relative mt-4 h-96 w-full overflow-hidden rounded-xl')"
      @mousemove.stop
      @touchmove.stop
    >
      <div
        ref="chart"
        class="h-full w-full"
      />
      <span
        class="border-base-content/30 text-base-content/10 bg-base-100/70 hidden"
        style="outline-color: var(--color-base-content)"
        ref="colorRef"
      />
      <div
        v-if="sankeyData.nodes.length === 0"
        class="text-base-content/50 absolute inset-0 flex items-center justify-center"
      >
        <div class="text-center">
          <div>{{ t('noData') }}</div>
        </div>
      </div>
      <div
        class="absolute right-1 bottom-1 flex flex-col gap-1"
        :class="isFullScreen ? 'fixed right-4 bottom-4 mb-[env(safe-area-inset-bottom)]' : ''"
      >
        <button
          type="button"
          class="btn btn-ghost btn-circle btn-sm"
          :aria-label="isPaused ? t('resumeStream') : t('pauseStream')"
          @click="isPaused = !isPaused"
        >
          <component
            :is="!isPaused ? PauseCircleIcon : PlayCircleIcon"
            class="h-4 w-4"
          />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-circle btn-sm"
          :aria-label="isFullScreen ? t('close') : 'Fullscreen'"
          @click="isFullScreen = !isFullScreen"
        >
          <component
            :is="isFullScreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon"
            class="h-4 w-4"
          />
        </button>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="isFullScreen"
      class="bg-base-100 custom-background blur-intensity fixed inset-0 z-[9999] h-screen w-screen bg-cover bg-center"
      :style="[backgroundImage, glassStyleVariables]"
    >
      <div
        ref="fullScreenChart"
        :class="shouldRotate ? 'bg-base-100' : 'bg-base-100 h-full w-full'"
        :style="fullChartStyle"
      />
      <div class="fixed right-4 bottom-4 mb-[env(safe-area-inset-bottom)] flex flex-col gap-1">
        <button
          type="button"
          class="btn btn-ghost btn-circle btn-sm"
          :aria-label="isPaused ? t('resumeStream') : t('pauseStream')"
          @click="isPaused = !isPaused"
        >
          <component
            :is="!isPaused ? PauseCircleIcon : PlayCircleIcon"
            class="h-4 w-4"
          />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-circle btn-sm"
          :aria-label="t('close')"
          @click="isFullScreen = false"
        >
          <ArrowsPointingInIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useEChart } from '@/composables/echarts'
import { glassBlurRadius, glassStyleVariables } from '@/composables/glass'
import { backgroundImage } from '@/helper/indexeddb'
import { getIPLabelFromMap } from '@/helper/sourceip'
import { isMiddleScreen } from '@/helper/utils'
import { activeConnections } from '@/store/connections'
import { font, lowPowerMode, theme } from '@/store/settings'
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  PauseCircleIcon,
  PlayCircleIcon,
} from '@heroicons/vue/24/outline'
import { useWindowSize } from '@vueuse/core'
import { SankeyChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import type { EChartsType } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash-es'
import { twMerge } from 'tailwind-merge'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  shallowRef,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

echarts.use([SankeyChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const { t } = useI18n()
const isFullScreen = ref(false)
const isPaused = ref(false)
const colorRef = ref<HTMLElement | null>(null)
const chart = ref<HTMLElement | null>(null)
const fullScreenChart = ref<HTMLElement | null>(null)
const fullScreenMyChart = shallowRef<EChartsType | null>(null)
const { width: windowWidth, height: windowHeight } = useWindowSize()

const shouldRotate = computed(() => {
  return isFullScreen.value && isMiddleScreen.value && windowHeight.value > windowWidth.value
})

const fullChartStyle = computed(() => {
  const baseStyle = `backdrop-filter: blur(${glassBlurRadius.value}px);`

  if (shouldRotate.value) {
    return `${baseStyle} transform: rotate(90deg); width: 100vh; height: 100vw; position: absolute; top: 50%; left: 50%; margin-top: -50vw; margin-left: -50vh;`
  }

  return baseStyle
})
// Reactive: theme switches mutate this map and we want every downstream
// `computed` (options) to recompute automatically.
const colorSet = reactive({
  baseContent10: '',
  baseContent30: '',
  baseContent: '',
  base70: '',
})

const fontFamily = ref('')

const updateColorSet = () => {
  if (!colorRef.value) return
  const colorStyle = getComputedStyle(colorRef.value)

  colorSet.baseContent = colorStyle.outlineColor
  colorSet.baseContent10 = colorStyle.color
  colorSet.baseContent30 = colorStyle.borderColor
  colorSet.base70 = colorStyle.backgroundColor
}

const updateFontFamily = () => {
  if (!colorRef.value) return
  const baseColorStyle = getComputedStyle(colorRef.value)
  fontFamily.value = baseColorStyle.fontFamily
}

const sankeyData = computed(() => {
  const connections = activeConnections.value
  if (!connections || connections.length === 0) {
    return { nodes: [], links: [], nodeById: new Map() }
  }

  const nodeMap = new Map<string, number>()
  const nodeNameMap = new Map<string, string>()
  const linkMap = new Map<string, { source: number; target: number; value: number }>()
  const layerMap = new Map<string, number>()
  const nodeTypeMap = new Map<string, string>()
  let nodeIndex = 0
  const labels = {
    proxyChainEntry: t('proxyChainEntry'),
    proxyChainExit: t('proxyChainExit'),
    ruleMatch: t('ruleMatch'),
    sourceIPAddress: t('sourceIPAddress'),
    unknown: t('unknown'),
  }

  const addNode = (name: string, layer: number, type: string) => {
    // 同名节点在不同层需要视为不同节点，否则会在 Sankey 中形成错误回路
    const nodeKey = `${layer}:${name}`

    if (!nodeMap.has(nodeKey)) {
      nodeMap.set(nodeKey, nodeIndex++)
      nodeNameMap.set(nodeKey, name)
      layerMap.set(nodeKey, layer)
      nodeTypeMap.set(nodeKey, type)
    }
    return nodeMap.get(nodeKey)!
  }

  const addLink = (source: number, target: number) => {
    if (source === target) return

    const linkKey = `${source}:${target}`
    const link = linkMap.get(linkKey)
    if (link) {
      link.value += 1
      return
    }

    linkMap.set(linkKey, { source, target, value: 1 })
  }

  connections.forEach((conn) => {
    const sourceIP = getIPLabelFromMap(conn.metadata.sourceIP)
    const rulePayload = conn.rulePayload ? `${conn.rule}: ${conn.rulePayload}` : conn.rule
    const chains = conn.chains || []

    if (chains.length === 0) return

    const chainLast = chains[chains.length - 1]
    const chainFirst = chains[0]

    const sourceNode = addNode(sourceIP, 0, labels.sourceIPAddress)
    const ruleNode = addNode(rulePayload, 1, labels.ruleMatch)

    if (chainFirst === chainLast) {
      const chainExitNode = addNode(chainFirst, 3, labels.proxyChainExit)

      addLink(sourceNode, ruleNode)
      addLink(ruleNode, chainExitNode)
    } else {
      const chainLastNode = addNode(chainLast, 2, labels.proxyChainEntry)
      const chainFirstNode = addNode(chainFirst, 3, labels.proxyChainExit)

      addLink(sourceNode, ruleNode)
      addLink(ruleNode, chainLastNode)
      addLink(chainLastNode, chainFirstNode)
    }
  })

  // 创建初始节点数组
  const initialNodes = Array.from(nodeMap.entries()).map(([nodeKey, index]) => ({
    id: index,
    name: nodeNameMap.get(nodeKey) || '',
    nodeType: nodeTypeMap.get(nodeKey) || labels.unknown,
    layer: layerMap.get(nodeKey) || 0,
    itemStyle: {
      color: layerColors[layerMap.get(nodeKey) || 0],
    },
  }))

  // 按层分组节点
  const nodesByLayer = new Map<number, typeof initialNodes>()
  initialNodes.forEach((node) => {
    const layer = node.layer
    if (!nodesByLayer.has(layer)) {
      nodesByLayer.set(layer, [])
    }
    nodesByLayer.get(layer)!.push(node)
  })

  // 对每一层的节点按名称进行字典排序
  const sortedLayers = Array.from(nodesByLayer.keys()).sort((a, b) => a - b)
  const idMapping: number[] = []
  const sortedNodes: typeof initialNodes = []
  let newId = 0

  sortedLayers.forEach((layer) => {
    const layerNodes = nodesByLayer.get(layer)!
    // 对当前层的节点按名称进行字典排序
    layerNodes.sort((a, b) => a.name.localeCompare(b.name))
    // 重新分配 id
    layerNodes.forEach((node) => {
      idMapping[node.id] = newId
      sortedNodes.push({
        ...node,
        id: newId,
      })
      newId++
    })
  })

  // 更新 links 中的 source 和 target 引用
  const links = Array.from(linkMap.values())
    .map((link) => {
      const source = idMapping[link.source]
      const target = idMapping[link.target]

      if (source === undefined || target === undefined || source === target) {
        return null
      }

      // 使用对数缩放来压缩数据范围，使小值更明显
      // 公式: log10(value + 1) * 10，确保最小值为0，同时保持相对大小关系
      const scaledValue = Math.log10(link.value + 1) * 10
      return {
        source,
        target,
        value: scaledValue,
        originalValue: link.value,
      }
    })
    .filter((link): link is NonNullable<typeof link> => link !== null)

  const nodeById = new Map<number, (typeof sortedNodes)[number]>()
  sortedNodes.forEach((node) => nodeById.set(node.id, node))

  return { nodes: sortedNodes, links, nodeById }
})

const layerColors = ['#6a6fc5', '#a8d4a0', '#fddb8a', '#f2a0a0']

const options = computed(() => ({
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: fontFamily.value || 'inherit',
    color: colorSet.baseContent,
  },
  tooltip: {
    trigger: 'item',
    triggerOn: 'mousemove',
    backgroundColor: colorSet.base70,
    borderColor: colorSet.baseContent30,
    textStyle: {
      color: colorSet.baseContent,
    },
    formatter: (params: {
      dataType: string
      data: {
        name: string
        nodeType?: string
        source: number
        target: number
        value: number
        originalValue?: number
      }
    }) => {
      if (params.dataType === 'node') {
        return `${params.data.name}<br/>${t('nodeType')}: ${params.data.nodeType || t('unknown')}`
      } else if (params.dataType === 'edge') {
        const sourceNode = sankeyData.value.nodeById.get(params.data.source)
        const targetNode = sankeyData.value.nodeById.get(params.data.target)
        // 使用原始值显示真实的连接数量
        const displayValue = params.data.originalValue || params.data.value
        if (sourceNode && targetNode) {
          return `${sourceNode.name} → ${targetNode.name}<br/>${t('connectionCount')}: ${displayValue}`
        }
        return `${t('connectionCount')}: ${displayValue}`
      }
      return ''
    },
  },
  series: [
    {
      id: 'sankey',
      type: 'sankey',
      layout: 'none',
      data: sankeyData.value.nodes,
      links: sankeyData.value.links,
      emphasis: {
        focus: 'trajectory',
      },
      lineStyle: {
        color: 'gradient',
        curveness: 0.5,
      },
      itemStyle: {
        borderWidth: 0,
      },
      label: {
        color: colorSet.baseContent,
        fontSize: isMiddleScreen.value ? 10 : 12,
        formatter: (params: { name: string }) => {
          const name = params.name
          const length = isFullScreen.value ? 45 : isMiddleScreen.value ? 20 : 30
          return name.length > length ? name.substring(0, length) + '...' : name
        },
      },
      nodeGap: 4,
      nodeWidth: 15,
      nodeAlign: 'left',
      animation: true,
      animationDuration: 1000,
      animationDurationUpdate: 250,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicOut',
      animationDelay: (idx: number) => Math.min(idx, 24) * 30,
    },
  ],
}))

const setPaused = () => {
  isPaused.value = true
}

const setPlaying = () => {
  isPaused.value = false
}

const registerTooltipPauseEvents = (instance: EChartsType) => {
  instance.on('showTip', setPaused)
  instance.on('hideTip', setPlaying)
}

const { chartInstance } = useEChart(
  chart,
  (element) => {
    const instance = echarts.init(element, undefined, { renderer: 'canvas', useDirtyRect: true })
    registerTooltipPauseEvents(instance)
    return instance
  },
  { hideTipOnTouchEnd: false },
)

const applyChartOptions = (instance: EChartsType) => {
  if (sankeyData.value.nodes.length === 0) {
    instance.clear()
    return
  }

  instance.setOption(options.value, { notMerge: false, lazyUpdate: true })
}

const disposeFullScreenChart = () => {
  fullScreenMyChart.value?.dispose()
  fullScreenMyChart.value = null
}

const ensureFullScreenChart = async () => {
  await nextTick()
  if (!isFullScreen.value || !fullScreenChart.value) return null

  if (!fullScreenMyChart.value) {
    fullScreenMyChart.value = echarts.init(fullScreenChart.value, undefined, {
      renderer: 'canvas',
      useDirtyRect: true,
    })
    registerTooltipPauseEvents(fullScreenMyChart.value)
  }

  return fullScreenMyChart.value
}

const syncCharts = async () => {
  if (isPaused.value || lowPowerMode.value) return

  if (chartInstance.value) {
    applyChartOptions(chartInstance.value)
  }

  if (isFullScreen.value) {
    const fullScreenInstance = await ensureFullScreenChart()
    if (fullScreenInstance) {
      applyChartOptions(fullScreenInstance)
    }
  }
}

const updateChartData = debounce(() => {
  void syncCharts()
}, 300)

const resizeFullScreenChart = debounce(() => {
  fullScreenMyChart.value?.resize()
}, 100)

watch(theme, () => {
  updateColorSet()
  void syncCharts()
})
watch(font, () => {
  updateFontFamily()
  void syncCharts()
})
watch(sankeyData, () => updateChartData())
watch(isMiddleScreen, () => {
  void syncCharts()
})
watch(isPaused, (paused) => {
  if (!paused) {
    void syncCharts()
  }
})
watch(lowPowerMode, (enabled) => {
  if (enabled) return
  void syncCharts()
})
watch(isFullScreen, async (value) => {
  if (!value) {
    disposeFullScreenChart()
    void syncCharts()
    return
  }

  const fullScreenInstance = await ensureFullScreenChart()
  if (fullScreenInstance) {
    applyChartOptions(fullScreenInstance)
    resizeFullScreenChart()
  }
})
watch([windowWidth, windowHeight, shouldRotate], () => {
  if (!isFullScreen.value) return
  void nextTick(() => resizeFullScreenChart())
})

onMounted(() => {
  updateColorSet()
  updateFontFamily()
  void syncCharts()
})

onBeforeUnmount(() => {
  updateChartData.cancel()
  resizeFullScreenChart.cancel()
  disposeFullScreenChart()
})
</script>
