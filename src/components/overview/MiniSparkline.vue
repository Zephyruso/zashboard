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
import { useChartColors, useEChartsInstance } from '@/composables/useECharts'
import { timeSaved, type HistoryPoint } from '@/store/overview'
import * as echarts from 'echarts/core'
import { computed, ref } from 'vue'

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

const { colorSet, fontFamily } = useChartColors(colorRef)

const seriesColor = computed(() => (props.color === 'info' ? colorSet.info60 : colorSet.primary60))
const areaColor = computed(() => (props.color === 'info' ? colorSet.info30 : colorSet.primary30))

const options = computed(() => {
  // 时间窗锚定最新数据点,保证最新点钉在右缘;缓冲点落在左缘外被 clip 裁掉
  const latest = props.data.at(-1)?.name ?? Date.now()

  return {
    animationDurationUpdate: 1000,
    animationEasingUpdate: 'linear' as const,
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
      type: 'time' as const,
      show: false,
      min: latest - (timeSaved - 1) * 1000,
      max: latest - 1 * 1000,
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
            color: colorSet.contentDim,
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
  }
})

useEChartsInstance(chartRef, options)
</script>
