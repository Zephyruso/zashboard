<template>
  <div class="relative h-full w-full overflow-hidden">
    <div
      ref="chartRef"
      class="h-full w-full"
    />
    <span
      class="border-b-primary/30 border-t-primary/60 border-l-info/30 border-r-info/60 text-base-content/60 bg-base-100/70 hidden"
      ref="colorRef"
    />
  </div>
</template>

<script setup lang="ts">
import { isMiddleScreen } from '@/helper/utils'
import { timeSaved, type HistoryPoint } from '@/store/overview'
import { font, theme } from '@/store/settings'
import { useDocumentVisibility, useElementSize, useElementVisibility } from '@vueuse/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash-es'
import { onMounted, onUnmounted, ref, watch } from 'vue'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = withDefaults(
  defineProps<{
    data: HistoryPoint[]
    min?: number
    color?: 'primary' | 'info'
    name?: string
    labelFormatter?: (value: number) => string
    tooltipFormatter?: (value: ToolTipParams[]) => string
  }>(),
  { min: 1, color: 'primary' },
)

const chartRef = ref()
const colorRef = ref()

const colorSet = {
  primary30: '',
  primary60: '',
  info30: '',
  info60: '',
  baseContent40: '',
  baseContent: '',
  base70: '',
}

let fontFamily = ''

const updateColorSet = () => {
  if (!colorRef.value) return
  const s = getComputedStyle(colorRef.value)
  colorSet.baseContent = s.getPropertyValue('--color-base-content').trim()
  colorSet.base70 = s.backgroundColor
  colorSet.baseContent40 = s.color
  colorSet.primary30 = s.borderBottomColor
  colorSet.primary60 = s.borderTopColor
  colorSet.info30 = s.borderLeftColor
  colorSet.info60 = s.borderRightColor
}

const updateFontFamily = () => {
  if (!colorRef.value) return
  fontFamily = getComputedStyle(colorRef.value).fontFamily
}

// 静态 option 只在 init 与主题/字体变化时下发,每拍只推 series data 与时间窗;
// 动画关闭(1s 过渡 × 1s 更新间隔 = 常驻逐帧重绘)。
const buildStaticOptions = () => {
  const seriesColor = props.color === 'info' ? colorSet.info60 : colorSet.primary60
  const areaColor = props.color === 'info' ? colorSet.info30 : colorSet.primary30

  return {
    animation: false,
    grid: { left: 0, top: 0, right: props.labelFormatter ? 30 : 0, bottom: 0 },
    tooltip: props.tooltipFormatter
      ? {
          show: true,
          trigger: 'axis' as const,
          backgroundColor: colorSet.base70,
          borderColor: colorSet.base70,
          confine: true,
          padding: [0, 5],
          textStyle: {
            color: colorSet.baseContent,
            fontFamily,
            fontSize: 11,
          },
          formatter: props.tooltipFormatter,
        }
      : { show: false },
    xAxis: {
      type: 'time' as const,
      show: false,
    },
    yAxis: {
      type: 'value' as const,
      show: true,
      position: 'right' as const,
      splitNumber: 2,
      min: 0,
      max: (value: { max: number }) => Math.max(value.max, props.min),
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: props.labelFormatter
        ? {
            show: true,
            inside: false,
            fontSize: 9,
            color: colorSet.baseContent40,
            fontFamily,
            margin: 4,
            formatter: (value: number) => (value === 0 ? '' : props.labelFormatter!(value)),
          }
        : { show: false },
    },
    series: [
      {
        type: 'line' as const,
        name: props.name,
        symbol: 'none',
        smooth: true,
        lineStyle: { width: 1.5 },
        color: seriesColor,
        emphasis: { disabled: true },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: seriesColor },
            { offset: 1, color: areaColor },
          ]),
        },
      },
    ],
  }
}

let myChart: echarts.ECharts | null = null
let touchEndHandler: ((e: TouchEvent) => void) | null = null

const chartVisible = useElementVisibility(chartRef)
const documentVisibility = useDocumentVisibility()
let pendingUpdate = false

const applyData = () => {
  if (!myChart) {
    return
  }
  if (!chartVisible.value || documentVisibility.value !== 'visible') {
    pendingUpdate = true
    return
  }
  pendingUpdate = false
  // 时间窗锚定最新数据点,保证最新点钉在右缘;缓冲点落在左缘外被 clip 裁掉
  const latest = props.data.at(-1)?.name ?? Date.now()

  myChart.setOption(
    {
      xAxis: {
        min: latest - (timeSaved - 1) * 1000,
        max: latest - 1 * 1000,
      },
      series: [{ data: props.data }],
    },
    { lazyUpdate: true },
  )
}

const applyStaticOptions = () => {
  if (!myChart) {
    return
  }
  myChart.setOption(buildStaticOptions())
  applyData()
}

onMounted(() => {
  updateColorSet()
  updateFontFamily()
  watch(theme, () => {
    updateColorSet()
    applyStaticOptions()
  })
  watch(font, () => {
    updateFontFamily()
    applyStaticOptions()
  })

  myChart = echarts.init(chartRef.value)
  applyStaticOptions()

  watch(() => props.data, applyData)
  watch([chartVisible, documentVisibility], () => {
    if (pendingUpdate && chartVisible.value && documentVisibility.value === 'visible') {
      applyData()
    }
  })

  const { width } = useElementSize(chartRef)
  const resize = debounce(() => myChart?.resize(), 100)
  watch(width, resize)

  if (isMiddleScreen.value && chartRef.value) {
    touchEndHandler = () => {
      myChart?.dispatchAction({ type: 'hideTip' })
    }
    chartRef.value.addEventListener('touchend', touchEndHandler)
  }
})

onUnmounted(() => {
  if (chartRef.value && touchEndHandler) {
    chartRef.value.removeEventListener('touchend', touchEndHandler)
  }
  if (myChart) {
    myChart.dispose()
    myChart = null
  }
})
</script>
