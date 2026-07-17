<template>
  <div class="relative h-28 w-full overflow-hidden">
    <div
      ref="chart"
      class="h-full w-full"
    />
    <span
      class="border-b-primary/30 border-t-primary/60 border-l-info/30 border-r-info/60 text-base-content/10 bg-base-100/70 hidden"
      ref="colorRef"
    />
    <button
      class="btn btn-ghost btn-xs absolute right-1 bottom-0"
      @click="isPaused = !isPaused"
    >
      <component
        :is="!isPaused ? PauseCircleIcon : PlayCircleIcon"
        class="h-4 w-4"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { isMiddleScreen } from '@/helper/utils'
import { timeSaved, type HistoryPoint } from '@/store/overview'
import { font, theme } from '@/store/settings'
import { PauseCircleIcon, PlayCircleIcon } from '@heroicons/vue/24/outline'
import { useDocumentVisibility, useElementSize, useElementVisibility } from '@vueuse/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash-es'
import { onMounted, onUnmounted, ref, watch } from 'vue'

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  data: { name: string; color?: number; data: HistoryPoint[] }[]
  labelFormatter: (value: number) => string
  toolTipFormatter: (value: ToolTipParams[]) => string
  min: number
}>()

const colorRef = ref()
const chart = ref()
const isPaused = ref(false)
const colorSet = {
  primary30: '',
  primary60: '',
  info30: '',
  info60: '',
  baseContent10: '',
  baseContent: '',
  base70: '',
}

let fontFamily = ''

const updateColorSet = () => {
  const colorStyle = getComputedStyle(colorRef.value)

  colorSet.baseContent = colorStyle.getPropertyValue('--color-base-content').trim()
  colorSet.base70 = colorStyle.backgroundColor
  colorSet.baseContent10 = colorStyle.color
  colorSet.primary30 = colorStyle.borderTopColor
  colorSet.primary60 = colorStyle.borderBottomColor
  colorSet.info30 = colorStyle.borderLeftColor
  colorSet.info60 = colorStyle.borderRightColor
}
const updateFontFamily = () => {
  const baseColorStyle = getComputedStyle(colorRef.value)

  fontFamily = baseColorStyle.fontFamily
}

// 静态 option(布局/样式/渐变)只在 init 与主题/字体变化时下发;每拍只推 series data
// 与时间窗。原实现每秒全量重建 option + 1s 线性过渡动画,更新间隔恰为 1s,等于每个
// 图表 60fps 持续重绘永不停 —— 这是面板空闲耗电的最大头,动画一并关闭。
const buildStaticOptions = () => {
  return {
    animation: false,
    legend: {
      bottom: 0,
      data: props.data.map((item) => item.name),
      textStyle: {
        color: colorSet.baseContent,
        fontFamily,
        fontSize: 10,
      },
    },
    grid: {
      left: 50,
      top: 15,
      right: 8,
      bottom: 25,
    },
    tooltip: {
      show: true,
      trigger: 'axis',
      backgroundColor: colorSet.base70,
      borderColor: colorSet.base70,
      borderRadius: 8,
      confine: true,
      padding: [0, 3],
      textStyle: {
        color: colorSet.baseContent,
        fontFamily,
        fontSize: 11,
      },
      formatter: props.toolTipFormatter,
    },
    xAxis: {
      type: 'time',
      axisLine: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      max: (value: { max: number }) => {
        return Math.max(value.max, props.min)
      },
      axisLine: { show: false },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed',
          color: colorSet.baseContent10,
        },
      },
      axisLabel: {
        align: 'left',
        padding: [0, 0, 0, -35],
        formatter: props.labelFormatter,
        color: colorSet.baseContent,
        fontFamily,
        fontSize: 10,
      },
    },
    series: props.data.map((item, index) => {
      const seriesColor = index === props.data.length - 1 ? colorSet.primary60 : colorSet.info60
      const areaColor = index === props.data.length - 1 ? colorSet.primary30 : colorSet.info30

      return {
        name: item.name,
        symbol: 'none',
        emphasis: {
          disabled: true,
        },
        lineStyle: {
          width: 1,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: seriesColor,
            },
            {
              offset: 1,
              color: areaColor,
            },
          ]),
        },
        type: 'line',
        color: seriesColor,
        smooth: true,
      }
    }),
  }
}

let myChart: echarts.ECharts | null = null
let touchEndHandler: ((e: TouchEvent) => void) | null = null

const chartVisible = useElementVisibility(chart)
const documentVisibility = useDocumentVisibility()
// 离屏/后台期间跳过的更新,回到可见时补一拍
let pendingUpdate = false

const applyData = () => {
  if (!myChart || isPaused.value) {
    return
  }
  if (!chartVisible.value || documentVisibility.value !== 'visible') {
    pendingUpdate = true
    return
  }
  pendingUpdate = false
  // 时间窗锚定最新数据点,保证最新点钉在右缘;缓冲点落在左缘外被 clip 裁掉
  const latest = props.data[0]?.data.at(-1)?.name ?? Date.now()

  myChart.setOption(
    {
      xAxis: {
        min: latest - (timeSaved - 1) * 1000,
        max: latest - 1 * 1000,
      },
      series: props.data.map((item) => ({ data: item.data })),
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

  myChart = echarts.init(chart.value)
  applyStaticOptions()

  watch(() => props.data, applyData)
  watch(isPaused, (paused) => {
    if (!paused) {
      applyData()
    }
  })
  watch([chartVisible, documentVisibility], () => {
    if (pendingUpdate && chartVisible.value && documentVisibility.value === 'visible') {
      applyData()
    }
  })

  const { width } = useElementSize(chart)
  const resize = debounce(() => {
    myChart?.resize()
  }, 100)

  watch(width, resize)

  // 移动端：松手后自动隐藏 tooltip
  if (isMiddleScreen.value && chart.value) {
    touchEndHandler = () => {
      if (myChart) {
        myChart.dispatchAction({ type: 'hideTip' })
      }
    }
    chart.value.addEventListener('touchend', touchEndHandler)
  }
})

onUnmounted(() => {
  if (chart.value && touchEndHandler) {
    chart.value.removeEventListener('touchend', touchEndHandler)
  }
  if (myChart) {
    myChart.dispose()
    myChart = null
  }
})
</script>
