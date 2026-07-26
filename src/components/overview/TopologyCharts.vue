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
          class="btn btn-ghost btn-circle btn-sm"
          @click="isPaused = !isPaused"
        >
          <component
            :is="!isPaused ? PauseCircleIcon : PlayCircleIcon"
            class="h-4 w-4"
          />
        </button>
        <button
          class="btn btn-ghost btn-circle btn-sm"
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
      class="bg-base-100 custom-background fixed inset-0 z-[9999] h-screen w-screen bg-cover bg-center"
      :class="`blur-intensity-${blurIntensity} custom-background-${dashboardTransparent}`"
      :style="backgroundImage"
    >
      <div
        ref="fullScreenChart"
        :class="shouldRotate ? 'bg-base-100' : 'bg-base-100 h-full w-full'"
        :style="fullChartStyle"
      />
      <div class="fixed right-4 bottom-4 mb-[env(safe-area-inset-bottom)] flex flex-col gap-1">
        <button
          class="btn btn-ghost btn-circle btn-sm"
          @click="isPaused = !isPaused"
        >
          <component
            :is="!isPaused ? PauseCircleIcon : PlayCircleIcon"
            class="h-4 w-4"
          />
        </button>
        <button
          class="btn btn-ghost btn-circle btn-sm"
          @click="isFullScreen = false"
        >
          <ArrowsPointingInIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { backgroundImage } from '@/helper/indexeddb'
import { getConnectionChains, getConnectionRule, getConnectionSourceIP } from '@/helper'
import { getIPLabelFromMap } from '@/helper/sourceip'
import { isMiddleScreen } from '@/helper/utils'
import { activeConnections } from '@/store/connections'
import { blurIntensity, dashboardTransparent, font, theme } from '@/store/settings'
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  PauseCircleIcon,
  PlayCircleIcon,
} from '@heroicons/vue/24/outline'
import { useElementSize, useWindowSize } from '@vueuse/core'
import { SankeyChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash'
import { twMerge } from 'tailwind-merge'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

echarts.use([SankeyChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const { t } = useI18n()
const isFullScreen = ref(false)
const isPaused = ref(false)
const colorRef = ref()
const chart = ref()
const fullScreenChart = ref()
const fullScreenMyChart = ref<echarts.ECharts>()
const { width: windowWidth, height: windowHeight } = useWindowSize()

const shouldRotate = computed(() => {
  return isFullScreen.value && isMiddleScreen.value && windowHeight.value > windowWidth.value
})

const fullChartStyle = computed(() => {
  const baseStyle = `backdrop-filter: blur(${blurIntensity.value}px);`

  if (shouldRotate.value) {
    return `${baseStyle} transform: rotate(90deg); width: 100vh; height: 100vw; position: absolute; top: 50%; left: 50%; margin-top: -50vw; margin-left: -50vh;`
  }

  return baseStyle
})
const colorSet = {
  baseContent10: '',
  baseContent30: '',
  baseContent: '',
  base70: '',
}

let fontFamily = ''

const updateColorSet = () => {
  const colorStyle = getComputedStyle(colorRef.value)

  colorSet.baseContent = colorStyle.getPropertyValue('--color-base-content').trim()
  colorSet.baseContent10 = colorStyle.color
  colorSet.baseContent30 = colorStyle.borderColor
  colorSet.base70 = colorStyle.backgroundColor
}

const updateFontFamily = () => {
  const baseColorStyle = getComputedStyle(colorRef.value)
  fontFamily = baseColorStyle.fontFamily
}

const sankeyData = computed(() => {
  const connections = activeConnections.value
  if (!connections || connections.length === 0) {
    return { nodes: [], links: [] }
  }

  const nodeMap = new Map<string, number>()
  const nodeNameMap = new Map<string, string>()
  const linkMap = new Map<string, number>()
  const layerMap = new Map<string, number>()
  const nodeTypeMap = new Map<string, string>()
  let nodeIndex = 0

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

  connections.forEach((conn) => {
    const sourceIP = getIPLabelFromMap(getConnectionSourceIP(conn))
    const rulePayload = getConnectionRule(conn)
    const chains = getConnectionChains(conn)

    if (chains.length === 0) return

    const chainLast = chains[chains.length - 1]
    const chainFirst = chains[0]

    const sourceNode = addNode(sourceIP, 0, t('sourceIPAddress'))
    const ruleNode = addNode(rulePayload, 1, t('ruleMatch'))

    if (chainFirst === chainLast) {
      const chainExitNode = addNode(chainFirst, 3, t('proxyChainExit'))

      const link1 = `${sourceNode}-${ruleNode}`
      const link2 = `${ruleNode}-${chainExitNode}`

      linkMap.set(link1, (linkMap.get(link1) || 0) + 1)
      linkMap.set(link2, (linkMap.get(link2) || 0) + 1)
    } else {
      const chainLastNode = addNode(chainLast, 2, t('proxyChainEntry'))
      const chainFirstNode = addNode(chainFirst, 3, t('proxyChainExit'))

      const link1 = `${sourceNode}-${ruleNode}`
      const link2 = `${ruleNode}-${chainLastNode}`
      const link3 = `${chainLastNode}-${chainFirstNode}`

      linkMap.set(link1, (linkMap.get(link1) || 0) + 1)
      linkMap.set(link2, (linkMap.get(link2) || 0) + 1)
      linkMap.set(link3, (linkMap.get(link3) || 0) + 1)
    }
  })

  // 创建初始节点数组
  const initialNodes = Array.from(nodeMap.entries()).map(([nodeKey, index]) => ({
    id: index,
    name: nodeNameMap.get(nodeKey) || '',
    nodeType: nodeTypeMap.get(nodeKey) || t('unknown'),
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
  const idMapping = new Map<number, number>() // 旧 id -> 新 id 映射
  const sortedNodes: typeof initialNodes = []
  let newId = 0

  sortedLayers.forEach((layer) => {
    const layerNodes = nodesByLayer.get(layer)!
    // 对当前层的节点按名称进行字典排序
    layerNodes.sort((a, b) => a.name.localeCompare(b.name))
    // 重新分配 id
    layerNodes.forEach((node) => {
      idMapping.set(node.id, newId)
      sortedNodes.push({
        ...node,
        id: newId,
      })
      newId++
    })
  })

  // 更新 links 中的 source 和 target 引用
  const links = Array.from(linkMap.entries())
    .map(([link, value]) => {
      const [oldSource, oldTarget] = link.split('-').map(Number)
      const source = idMapping.get(oldSource)
      const target = idMapping.get(oldTarget)

      if (source === undefined || target === undefined || source === target) {
        return null
      }

      // 使用对数缩放来压缩数据范围，使小值更明显
      // 公式: log10(value + 1) * 10，确保最小值为0，同时保持相对大小关系
      const scaledValue = Math.log10(value + 1) * 10
      return {
        source,
        target,
        value: scaledValue,
        originalValue: value, // 保存原始值用于 tooltip 显示
      }
    })
    .filter((link): link is NonNullable<typeof link> => link !== null)

  return { nodes: sortedNodes, links }
})

const layerColors = ['#6a6fc5', '#a8d4a0', '#fddb8a', '#f2a0a0']

const options = computed(() => ({
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: fontFamily || 'inherit',
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
        const sourceNode = sankeyData.value.nodes.find((n) => n.id === params.data.source)
        const targetNode = sankeyData.value.nodes.find((n) => n.id === params.data.target)
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
      animationEasing: 'cubicOut',
      animationDelay: (idx: number) => idx * 50,
    },
  ],
}))

onMounted(() => {
  updateColorSet()
  updateFontFamily()

  watch(theme, updateColorSet)
  watch(font, updateFontFamily)

  const myChart = echarts.init(chart.value)

  myChart.setOption(options.value)

  // 监听 tooltip 显示和隐藏事件
  myChart.on('showTip', () => {
    isPaused.value = true
  })
  myChart.on('hideTip', () => {
    isPaused.value = false
  })

  const updateChartData = debounce((newData: typeof sankeyData.value) => {
    if (isPaused.value) {
      return
    }

    if (myChart && newData.nodes.length > 0) {
      myChart.setOption(options.value)
    } else if (myChart && newData.nodes.length === 0) {
      myChart.clear()
    }

    if (isFullScreen.value) {
      nextTick(() => {
        if (!fullScreenMyChart.value) {
          fullScreenMyChart.value = echarts.init(fullScreenChart.value)
          // 为全屏图表也添加事件监听
          fullScreenMyChart.value.on('showTip', () => {
            isPaused.value = true
          })
          fullScreenMyChart.value.on('hideTip', () => {
            isPaused.value = false
          })
        }
        if (fullScreenMyChart.value && newData.nodes.length > 0) {
          fullScreenMyChart.value.setOption(options.value)
        } else if (fullScreenMyChart.value && newData.nodes.length === 0) {
          fullScreenMyChart.value.clear()
        }
      })
    }
  }, 300)

  watch(sankeyData, updateChartData, { deep: true })

  watch([theme, font], () => {
    if (myChart) {
      myChart.setOption(options.value)
    }
    if (fullScreenMyChart.value) {
      fullScreenMyChart.value.setOption(options.value)
    }
  })

  watch(isFullScreen, () => {
    if (isFullScreen.value) {
      nextTick(() => {
        if (!fullScreenMyChart.value) {
          fullScreenMyChart.value = echarts.init(fullScreenChart.value)
          // 为全屏图表也添加事件监听
          fullScreenMyChart.value.on('showTip', () => {
            isPaused.value = true
          })
          fullScreenMyChart.value.on('hideTip', () => {
            isPaused.value = false
          })
        }
        if (fullScreenMyChart.value && sankeyData.value.nodes.length > 0) {
          fullScreenMyChart.value.setOption(options.value)
        }
      })
    } else {
      fullScreenMyChart.value?.dispose()
      fullScreenMyChart.value = undefined
    }
  })

  const { width } = useElementSize(chart)
  const resize = debounce(() => {
    myChart.resize()
    fullScreenMyChart.value?.resize()
  }, 100)

  watch(width, resize)

  // 监听窗口大小变化和旋转状态变化，确保全屏图表正确调整大小
  watch([windowWidth, windowHeight, shouldRotate], () => {
    if (isFullScreen.value && fullScreenMyChart.value) {
      nextTick(() => {
        fullScreenMyChart.value?.resize()
      })
    }
  })
})

onUnmounted(() => {
  if (chart.value) {
    const myChart = echarts.getInstanceByDom(chart.value)
    if (myChart) {
      myChart.dispose()
    }
  }
  if (fullScreenMyChart.value) {
    fullScreenMyChart.value.dispose()
    fullScreenMyChart.value = undefined
  }
})
</script>
