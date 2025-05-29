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
import { getToolTipForParams } from '@renderer/helper'
import { prettyBytesHelper } from '@renderer/helper/utils'
import { downloadSpeedHistory, uploadSpeedHistory } from '@renderer/store/overview'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BasicCharts from './BasicCharts.vue'

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
    maximumFractionDigits: 1,
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
