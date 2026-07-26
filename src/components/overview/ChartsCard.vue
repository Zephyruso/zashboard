<template>
  <div class="charts-card base-container w-full p-4">
    <!-- Surge-style stat cards -->
    <div class="charts-card-grid grid grid-cols-2 gap-3">
      <!-- Upload Speed -->
      <div class="bg-base-200/30 flex flex-col gap-1.5 rounded-xl p-4">
        <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
          {{ $t('upload') }}
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-3xl font-extralight tabular-nums">{{ ulSpeedParts.value }}</span>
          <span class="text-base-content/60 text-sm">{{ ulSpeedParts.unit }}/s</span>
        </div>
        <div class="mt-1 h-14">
          <MiniSparkline
            :data="uploadSpeedHistory"
            :min="60000"
            color="info"
            :name="t('upload')"
            :label-formatter="speedLabelFormatter"
            :tooltip-formatter="speedTooltipFormatter"
          />
        </div>
        <div class="text-base-content/50 text-xs">{{ $t('total') }} {{ ulTotalStr }}</div>
      </div>

      <!-- Download Speed -->
      <div class="bg-base-200/30 flex flex-col gap-1.5 rounded-xl p-4">
        <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
          {{ $t('download') }}
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-3xl font-extralight tabular-nums">{{ dlSpeedParts.value }}</span>
          <span class="text-base-content/60 text-sm">{{ dlSpeedParts.unit }}/s</span>
        </div>
        <div class="mt-1 h-14">
          <MiniSparkline
            :data="downloadSpeedHistory"
            :min="60000"
            :name="t('download')"
            :label-formatter="speedLabelFormatter"
            :tooltip-formatter="speedTooltipFormatter"
          />
        </div>
        <div class="text-base-content/50 text-xs">{{ $t('total') }} {{ dlTotalStr }}</div>
      </div>

      <!-- Active Connections -->
      <div
        class="charts-card-connections bg-base-200/30 col-span-2 flex flex-col gap-1.5 rounded-xl p-4"
      >
        <div
          class="text-base-content/60 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase"
        >
          {{ $t('connections') }}
          <span class="bg-success inline-block h-1.5 w-1.5 rounded-full" />
        </div>
        <div class="text-3xl font-extralight tabular-nums">
          {{ connectionCount }}
        </div>
        <div class="mt-1 h-14">
          <MiniSparkline
            :data="connectionsHistory"
            :min="10"
            :name="t('connections')"
            :label-formatter="connLabelFormatter"
            :tooltip-formatter="connTooltipFormatter"
          />
        </div>
        <div class="text-base-content/50 flex items-center justify-between gap-2 text-xs">
          <span>{{ $t('memoryUsage') }} {{ memoryStr }}</span>
          <span v-if="hasSingboxChannel">{{ $t('goroutines') }} {{ goroutines }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MiniSparkline from '@/components/overview/MiniSparkline.vue'
import { hasSingboxChannel } from '@/assembly/backend'
import { getToolTipForParams } from '@/helper'
import { prettyBytesHelper } from '@/helper/utils'
import { activeConnections, downloadTotal, uploadTotal } from '@/store/connections'
import {
  connectionsHistory,
  downloadSpeed,
  downloadSpeedHistory,
  goroutines,
  memory,
  uploadSpeed,
  uploadSpeedHistory,
} from '@/store/overview'
import dayjs from 'dayjs'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const splitBytes = (bytes: number) => {
  const str = prettyBytesHelper(bytes, { binary: false })
  const match = str.match(/^([\d.]+)\s*(.*)$/)
  return match ? { value: match[1], unit: match[2] } : { value: str, unit: '' }
}

const ulSpeedParts = computed(() => splitBytes(uploadSpeed.value))
const dlSpeedParts = computed(() => splitBytes(downloadSpeed.value))
const ulTotalStr = computed(() => prettyBytesHelper(uploadTotal.value))
const dlTotalStr = computed(() => prettyBytesHelper(downloadTotal.value))
const connectionCount = computed(() => activeConnections.value.length)
const memoryStr = computed(() => prettyBytesHelper(memory.value, { binary: true }))

const speedLabelFormatter = (value: number) => {
  return `${prettyBytesHelper(value, { maximumFractionDigits: 0, binary: false })}/s`
}

const speedTooltipFormatter = (value: ToolTipParams[]) => {
  return value.map((item) => getToolTipForParams(item, { binary: false, suffix: '/s' })).join('')
}

const connLabelFormatter = (value: number) => {
  return `${value}`
}

const connTooltipFormatter = (value: ToolTipParams[]) => {
  return value
    .map((item) => {
      if (item.data.init) return
      return `
    <div class="flex items-center my-2 gap-1">
      <div class="w-4 h-4 rounded-full" style="background-color: ${item.color}"></div>
      ${item.seriesName}
      (${dayjs(item.data.name).format('HH:mm:ss')}): ${item.data.value[1]}
    </div>`
    })
    .join('\n')
}
</script>

<style scoped>
.charts-card {
  container-type: inline-size;
}

@container (min-width: 768px) {
  .charts-card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .charts-card-connections {
    grid-column: span 1 / span 1;
  }
}
</style>
