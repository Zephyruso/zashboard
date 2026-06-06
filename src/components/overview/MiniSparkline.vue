<template>
  <div class="relative h-full w-full overflow-hidden">
    <div
      ref="chartRef"
      class="h-full w-full"
    />
    <span
      class="border-b-primary/30 border-t-primary/60 border-l-info/30 border-r-info/60 text-base-content/60 bg-base-100/70 hidden"
      style="outline-color: var(--color-base-content)"
      ref="colorRef"
    />
  </div>
</template>

<script setup lang="ts">
import { useEChart } from '@/composables/echarts'
import { font, theme } from '@/store/settings'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onMounted, reactive, ref, watch } from 'vue'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = withDefaults(
  defineProps<{
    data: { name: number; value: number }[]
    min?: number
    color?: 'primary' | 'info'
    name?: string
    labelFormatter?: (value: number) => string
    tooltipFormatter?: (value: ToolTipParams[]) => string
  }>(),
  { min: 1, color: 'primary' },
)

const chartRef = ref<HTMLElement | null>(null)
const colorRef = ref<HTMLElement | null>(null)

// Reactive: theme switches mutate this map and we want every downstream
// `computed` (options, seriesColor, areaColor) to recompute automatically.
const colorSet = reactive({
  primary30: '',
  primary60: '',
  info30: '',
  info60: '',
  baseContent40: '',
  baseContent: '',
  base70: '',
})

const fontFamily = ref('')

const updateColorSet = () => {
  if (!colorRef.value) return
  const s = getComputedStyle(colorRef.value)
  colorSet.baseContent = s.outlineColor
  colorSet.base70 = s.backgroundColor
  colorSet.baseContent40 = s.color
  colorSet.primary30 = s.borderBottomColor
  colorSet.primary60 = s.borderTopColor
  colorSet.info30 = s.borderLeftColor
  colorSet.info60 = s.borderRightColor
}

const updateFontFamily = () => {
  if (!colorRef.value) return
  fontFamily.value = getComputedStyle(colorRef.value).fontFamily
}

const seriesColor = computed(() => (props.color === 'info' ? colorSet.info60 : colorSet.primary60))
const areaColor = computed(() => (props.color === 'info' ? colorSet.info30 : colorSet.primary30))

const { chartInstance } = useEChart(chartRef, (element) =>
  echarts.init(element, undefined, { renderer: 'canvas', useDirtyRect: true }),
)

const chartOptions = () => ({
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
          fontFamily: fontFamily.value,
          fontSize: 11,
        },
        formatter: props.tooltipFormatter,
      }
    : { show: false },
  xAxis: {
    type: 'category' as const,
    show: false,
    boundaryGap: false,
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
          fontFamily: fontFamily.value,
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
      data: props.data,
      color: seriesColor.value,
      emphasis: { disabled: true },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: seriesColor.value },
          { offset: 1, color: areaColor.value },
        ]),
      },
    },
  ],
})

const setChartOptions = () => {
  chartInstance.value?.setOption(chartOptions(), { notMerge: false, lazyUpdate: true })
}

const setSeriesData = () => {
  chartInstance.value?.setOption(
    { series: [{ data: props.data }] },
    { notMerge: false, lazyUpdate: true },
  )
}

watch(theme, () => {
  updateColorSet()
  setChartOptions()
})
watch(font, () => {
  updateFontFamily()
  setChartOptions()
})
watch(() => props.data, setSeriesData)
watch([seriesColor, areaColor], setChartOptions)
watch(
  () => [props.name, props.min, props.labelFormatter, props.tooltipFormatter] as const,
  setChartOptions,
)

onMounted(() => {
  updateColorSet()
  updateFontFamily()
  setChartOptions()
})
</script>
