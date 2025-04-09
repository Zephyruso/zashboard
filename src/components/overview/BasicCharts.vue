<template>
  <div class="relative h-28 w-full overflow-hidden">
    <div
      ref="chart"
      class="absolute top-0 left-0 h-full w-full"
    ></div>
    <span
      class="border-base-content/10 bg-base-100/70 text-base-content hidden"
      ref="baseColorRef"
    ></span>
    <span
      class="border-b-primary/30 border-t-info/30 bg-info/60 text-primary/60 hidden"
      ref="themeColorRef"
    ></span>
    <button
      class="btn btn-circle btn-ghost btn-xs absolute right-1 bottom-0"
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
import { font, theme } from '@/store/settings'
import { PauseCircleIcon, PlayCircleIcon } from '@heroicons/vue/24/outline'
import { useElementSize } from '@vueuse/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { debounce } from 'lodash'
import { computed, onMounted, ref, watch } from 'vue'

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  data: { name: string; color?: number; data: { name: number; value: number }[] }[]
  labelFormatter: (value: number) => string
  toolTipFormatter: (value: ToolTipParams[]) => string
  min: number
}>()

const baseColorRef = ref()
const themeColorRef = ref()

const isPaused = ref(false)
const chart = ref()

onMounted(() => {
  const baseColorStyle = getComputedStyle(baseColorRef.value)
  const themeColorStyle = getComputedStyle(themeColorRef.value)

  let baseContentColor = baseColorStyle.color
  let baseColor = baseColorStyle.backgroundColor
  let baseContent10Color = baseColorStyle.borderColor
  let fontFamily = baseColorStyle.fontFamily
  let primaryColor = themeColorStyle.color
  let secondaryColor = themeColorStyle.backgroundColor
  let primaryColor10 = themeColorStyle.borderBottomColor
  let secondaryColor10 = themeColorStyle.borderTopColor
  watch(
    () => theme.value,
    () => {
      const baseColorStyle = getComputedStyle(baseColorRef.value)
      const themeColorStyle = getComputedStyle(themeColorRef.value)

      baseContentColor = baseColorStyle.color
      baseColor = baseColorStyle.backgroundColor
      baseContent10Color = baseColorStyle.borderColor
      primaryColor = themeColorStyle.color
      secondaryColor = themeColorStyle.backgroundColor
      primaryColor10 = themeColorStyle.borderBottomColor
      secondaryColor10 = themeColorStyle.borderTopColor
    },
  )
  watch(
    () => font.value,
    () => {
      const baseColorStyle = getComputedStyle(baseColorRef.value)

      fontFamily = baseColorStyle.fontFamily
    },
  )

  const options = computed(() => {
    return {
      legend: {
        bottom: 0,
        data: props.data.map((item) => item.name),
        textStyle: {
          color: baseContentColor,
          fontFamily,
        },
      },
      grid: {
        left: 60,
        top: 15,
        right: 10,
        bottom: 25,
      },
      tooltip: {
        show: true,
        trigger: 'axis',
        backgroundColor: baseColor,
        borderColor: baseColor,
        confine: true,
        padding: [0, 5],
        textStyle: {
          color: baseContentColor,
          fontFamily,
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
            color: baseContent10Color,
          },
        },
        axisLabel: {
          align: 'left',
          padding: [0, 0, 0, -45],
          formatter: props.labelFormatter,
          color: baseContentColor,
          fontFamily,
        },
      },
      series: props.data.map((item, index) => {
        const seriesColor = index === props.data.length - 1 ? primaryColor : secondaryColor
        const areaColor = index === props.data.length - 1 ? primaryColor10 : secondaryColor10

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
  })
  const myChart = echarts.init(chart.value)

  myChart.setOption(options.value)

  watch(options, () => {
    if (isPaused.value) {
      return
    }
    myChart?.setOption(options.value)
  })

  const { width } = useElementSize(chart)
  const resize = debounce(() => {
    myChart.resize()
  }, 100)

  watch(
    () => width.value,
    () => {
      resize()
    },
  )
})
</script>
