<template>
  <BasicCharts
    :data="chartsData"
    :label-formatter="labelFormatter"
    :tool-tip-formatter="tooltipFormatter"
    :min="100"
  />
</template>

<script setup lang="ts">
import { connectionsHistory, timeSaved } from '@renderer/store/overview'
import dayjs from 'dayjs'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BasicCharts from './BasicCharts.vue'

const { t } = useI18n()
const chartsData = computed(() => {
  return [
    {
      name: t('connections'),
      data: connectionsHistory.value,
    },
  ]
})

const labelFormatter = (value: number) => {
  return `       ${value}`
}
const tooltipFormatter = (value: ToolTipParams[]) => {
  return value
    .map((item) => {
      // fake data
      if (item.data.name < timeSaved + 1) {
        return
      }
      return `
    <div class="flex items-center my-2 gap-1">
      <div class="w-4 h-4 rounded-full" style="background-color: ${item.color}"></div>
      ${item.seriesName}
      (${dayjs(item.data.name).format('HH:mm:ss')}): ${item.data.value}
    </div>`
    })
    .join('\n')
}
</script>
