<template>
  <div
    class="relative w-full overflow-hidden"
    :class="xAxisMode === 'seconds' ? 'h-36' : 'h-28'"
  >
    <div
      ref="chartRef"
      class="h-full w-full"
    />
    <span
      class="border-b-primary/30 border-t-primary/60 border-l-info/30 border-r-info/60 text-base-content/10 bg-base-100/70 hidden"
      ref="colorRef"
    />
    <button
      v-if="showPauseButton"
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
import { useChartColors, useEChartsInstance } from '@/composables/useECharts'
import { timeSaved, type HistoryPoint } from '@/store/overview'
import { PauseCircleIcon, PlayCircleIcon } from '@heroicons/vue/24/outline'
import * as echarts from 'echarts/core'
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    // seconds 模式下每个序列的点为 [已用秒数, y];time 模式下为 HistoryPoint
    data: { name: string; data: HistoryPoint[] | [number, number][] }[]
    labelFormatter: (value: number) => string
    toolTipFormatter: (value: ToolTipParams[]) => string
    // y 轴刻度上限的下限,不传则完全跟随数据
    min?: number
    // time: x 轴为时间戳,隐藏刻度,窗口长度固定为 timeSaved
    // seconds: x 轴为已用秒数,显示刻度,窗口长度为 windowSec
    xAxisMode?: 'time' | 'seconds'
    windowSec?: number
    showPauseButton?: boolean
  }>(),
  { xAxisMode: 'time', windowSec: 20, showPauseButton: true },
)

const colorRef = ref()
const chartRef = ref()
const isPaused = ref(false)

const { colorSet, fontFamily } = useChartColors(colorRef)

const options = computed(() => {
  const isSeconds = props.xAxisMode === 'seconds'
  // 时间窗锚定最新数据点,保证最新点钉在右缘;缓冲点落在左缘外被 clip 裁掉
  const lastPoint = props.data[0]?.data.at(-1)
  const latest = isSeconds
    ? ((lastPoint as [number, number] | undefined)?.[0] ?? 0)
    : ((lastPoint as HistoryPoint | undefined)?.name ?? Date.now())

  return {
    animationDurationUpdate: 1000,
    animationEasingUpdate: 'linear' as const,
    legend: {
      bottom: 0,
      data: props.data.map((item) => item.name),
      textStyle: {
        color: colorSet.baseContent,
        fontFamily: fontFamily.value,
        fontSize: 10,
      },
    },
    grid: isSeconds
      ? { left: 8, top: 15, right: 8, bottom: 40, containLabel: true }
      : { left: 50, top: 15, right: 8, bottom: 25 },
    tooltip: {
      show: true,
      trigger: 'axis' as const,
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
    xAxis: isSeconds
      ? {
          type: 'value' as const,
          min: latest - props.windowSec,
          max: latest,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            show: true,
            color: colorSet.baseContent,
            fontFamily: fontFamily.value,
            fontSize: 10,
            // 测试开始前的负数区间不显示刻度
            formatter: (value: number) => (value < 0 ? '' : `${Math.round(value)} s`),
          },
        }
      : {
          type: 'time' as const,
          min: latest - (timeSaved - 1) * 1000,
          max: latest - 1 * 1000,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
        },
    yAxis: {
      type: 'value' as const,
      splitNumber: 4,
      min: 0,
      max:
        props.min === undefined
          ? undefined
          : (value: { max: number }) => Math.max(value.max, props.min!),
      // x 轴含 0 时 y 轴默认 onZero 钉在 x=0 处,必须显式关掉刻度线
      axisTick: { show: false },
      axisLine: { show: false },
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed' as const,
          color: colorSet.contentDim,
        },
      },
      axisLabel: {
        formatter: props.labelFormatter,
        color: colorSet.baseContent,
        fontFamily: fontFamily.value,
        fontSize: 10,
        // time 模式无左边距,标签左对齐画进 grid 内,避免长数值被裁切
        ...(isSeconds ? {} : { align: 'left' as const, padding: [0, 0, 0, -35] }),
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
        type: 'line' as const,
        color: seriesColor,
        smooth: true,
      }
    }),
  }
})

useEChartsInstance(chartRef, options, { isPaused })
</script>
