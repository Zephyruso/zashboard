<template>
  <div
    ref="chart"
    class="card h-28 bg-base-100 p-0 shadow-lg"
  ></div>
  <span
    class="hidden text-base-content"
    ref="text"
  ></span>
  <span
    class="hidden text-primary"
    ref="primaryText"
  ></span>
  <span
    class="hidden text-info"
    ref="secondaryText"
  ></span>
</template>

<script setup lang="ts">
import { prettyBytesHelper } from '@/helper'
import { downloadSpeedHistory, uploadSpeedHistory } from '@/store/connections'
import * as echarts from 'echarts'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const text = ref()
const primaryText = ref()
const secondaryText = ref()

const t = useI18n().t
const chart = ref()

onMounted(() => {
  const options = computed(() => {
    const color = getComputedStyle(text.value)?.color
    const primaryColor = getComputedStyle(primaryText.value)?.color
    const secondaryColor = getComputedStyle(secondaryText.value)?.color

    return {
      legend: {
        bottom: 0,
        data: [t('download'), t('upload')],
        textStyle: {
          color: color,
        },
      },
      grid: {
        left: 60,
        top: 15,
        right: 10,
        bottom: 25,
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
          return Math.max(value.max, 100 * 1024)
        },
        axisLine: { show: false },
        axisLabel: {
          align: 'left',
          padding: [0, 0, 0, -45],
          formatter: (value: number) => {
            return `${prettyBytesHelper(value, {
              maximumFractionDigits: 1,
            })}/s`
          },
          color: color,
        },
        splitLine: { show: false },
      },
      animation: false,
      series: [
        {
          name: t('upload'),
          data: uploadSpeedHistory.value,
          symbol: 'none',
          emphasis: {
            disabled: true,
          },
          type: 'line',
          color: secondaryColor,
          smooth: true,
        },
        {
          name: t('download'),
          data: downloadSpeedHistory.value,
          symbol: 'none',
          emphasis: {
            disabled: true,
          },
          type: 'line',
          color: primaryColor,
          smooth: true,
        },
      ],
    }
  })
  const myChart = echarts.init(chart.value)

  myChart.setOption(options.value)

  watch(options, () => {
    myChart.setOption(options.value)
  })
})
</script>
