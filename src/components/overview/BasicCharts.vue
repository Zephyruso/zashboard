<template>
  <div class="relative h-28 w-full overflow-hidden">
    <div
      ref="chart"
      class="h-full w-full"
    />
    <span
      class="border-b-primary/30 border-t-primary/60 border-l-info/30 border-r-info/60 text-base-content/10 bg-base-100/70 hidden"
      style="outline-color: var(--color-base-content)"
      ref="colorRef"
    />
    <button
      type="button"
      class="btn btn-ghost btn-xs absolute right-1 bottom-0"
      :aria-label="isPaused ? t('resumeStream') : t('pauseStream')"
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
import { useEChart } from '@/composables/echarts'
import { font, lowPowerMode, theme } from '@/store/settings'
import { PauseCircleIcon, PlayCircleIcon } from '@heroicons/vue/24/outline'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  data: { name: string; color?: number; data: { name: number; value: number }[] }[]
  labelFormatter: (value: number) => string
  toolTipFormatter: (value: ToolTipParams[]) => string
  min: number
}>()

const colorRef = ref<HTMLElement | null>(null)
const chart = ref<HTMLElement | null>(null)
const isPaused = ref(false)
const { t } = useI18n()
// Reactive: theme switches mutate this map and we want every downstream
// `computed` (options) to recompute automatically.
const colorSet = reactive({
  primary30: '',
  primary60: '',
  info30: '',
  info60: '',
  baseContent10: '',
  baseContent: '',
  base70: '',
})

const fontFamily = ref('')

const updateColorSet = () => {
  if (!colorRef.value) return
  const colorStyle = getComputedStyle(colorRef.value)

  colorSet.baseContent = colorStyle.outlineColor
  colorSet.base70 = colorStyle.backgroundColor
  colorSet.baseContent10 = colorStyle.color
  colorSet.primary30 = colorStyle.borderTopColor
  colorSet.primary60 = colorStyle.borderBottomColor
  colorSet.info30 = colorStyle.borderLeftColor
  colorSet.info60 = colorStyle.borderRightColor
}
const updateFontFamily = () => {
  if (!colorRef.value) return
  const baseColorStyle = getComputedStyle(colorRef.value)

  fontFamily.value = baseColorStyle.fontFamily
}

const chartOptions = () => {
  return {
    animation: false,
    legend: {
      bottom: 0,
      data: props.data.map((item) => item.name),
      textStyle: {
        color: colorSet.baseContent,
        fontFamily: fontFamily.value,
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
        fontFamily: fontFamily.value,
        fontSize: 11,
      },
      formatter: props.toolTipFormatter,
    },
    xAxis: {
      type: 'category',
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
        fontFamily: fontFamily.value,
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
        data: item.data,
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

const { chartInstance } = useEChart(chart, (element) =>
  echarts.init(element, undefined, { renderer: 'canvas', useDirtyRect: true }),
)

const setChartOptions = () => {
  chartInstance.value?.setOption(chartOptions(), { notMerge: false, lazyUpdate: true })
}

const setSeriesData = () => {
  if (isPaused.value || lowPowerMode.value) return
  chartInstance.value?.setOption(
    {
      series: props.data.map((item) => ({ data: item.data })),
    },
    { notMerge: false, lazyUpdate: true },
  )
}

const dataShape = () => props.data.map((item) => item.name).join('\u0000')

watch(theme, () => {
  updateColorSet()
  setChartOptions()
})
watch(font, () => {
  updateFontFamily()
  setChartOptions()
})
watch(() => props.data, setSeriesData)
watch(dataShape, setChartOptions)
watch(isPaused, (paused) => {
  if (!paused) setChartOptions()
})
watch(lowPowerMode, (enabled) => {
  if (enabled) return
  setChartOptions()
})

onMounted(() => {
  updateColorSet()
  updateFontFamily()
  setChartOptions()
})
</script>
