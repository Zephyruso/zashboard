<template>
  <div
    ref="chart"
    class="h-24 w-full p-1"
  ></div>
</template>

<script setup lang="ts">
import { memoryHistory } from '@/store/connections'
import * as echarts from 'echarts'
import prettyBytes from 'pretty-bytes'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const t = useI18n().t
const chart = ref()
const options = computed(() => {
  return {
    legend: {
      bottom: 0,
      data: [t('download'), t('upload')],
    },
    grid: {
      left: 60,
      top: 5,
      bottom: 25,
    },
    xAxis: {
      type: 'category',
      axisLine: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      axisLine: { show: false },
      axisLabel: {
        formatter: (value: number) => {
          return `${prettyBytes(value)}`
        },
      },
      splitLine: { show: false },
    },
    animation: false,
    series: [
      {
        name: t('memory'),
        data: memoryHistory.value,
        symbol: 'none',
        type: 'line',
      },
    ],
  }
})

onMounted(() => {
  const myChart = echarts.init(chart.value)

  myChart.setOption(options.value)

  watch(options, () => {
    myChart.setOption(options.value)
  })
})
</script>
