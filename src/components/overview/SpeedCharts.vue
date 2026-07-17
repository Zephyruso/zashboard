<template>
  <BasicCharts
    ref="chartRef"
    :data="chartsData"
    :label-formatter="labelFormatter"
    :tool-tip-formatter="tooltipFormatter"
    :min="60 * 1000"
  />
</template>

<script setup lang="ts">
import { getToolTipForParams } from '@/helper'
import { prettyBytesHelper } from '@/helper/utils'
import { downloadSpeedHistory, uploadSpeedHistory } from '@/store/overview'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { defineAsyncComponent } from 'vue'

// echarts 经「侧栏常驻图表」同步链进 entry(573KB raw):组件层异步化才能把它切出去
const BasicCharts = defineAsyncComponent(() => import('./BasicCharts.vue'))

const chartRef = ref()
const { t } = useI18n()
const chartsData = computed(() => {
  return [
    {
      name: t('ulSpeed'),
      data: uploadSpeedHistory.value,
    },
    {
      name: t('dlSpeed'),
      data: downloadSpeedHistory.value,
    },
  ]
})

const labelFormatter = (value: number) => {
  return `${prettyBytesHelper(value, {
    maximumFractionDigits: 0,
    binary: false,
  })}/s`
}
const tooltipFormatter = (value: ToolTipParams[]) => {
  return value
    .map((item) => {
      return getToolTipForParams(item, {
        binary: false,
        suffix: '/s',
      })
    })
    .join('')
}
</script>
