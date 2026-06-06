<template>
  <div
    class="base-container w-full p-4"
    v-if="hasProvidersWithTraffic"
  >
    <div
      class="grid max-h-128 gap-3 overflow-y-auto"
      :style="
        hasMultipleProvidersWithTraffic
          ? `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));`
          : 'grid-template-columns: 1fr;'
      "
    >
      <!-- Total Traffic -->
      <div
        class="bg-base-200/30 flex flex-col gap-3 rounded-xl p-4"
        v-if="hasMultipleProvidersWithTraffic"
      >
        <div class="flex items-center justify-between">
          <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
            {{ $t('totalTraffic') }}
          </div>
          <div class="text-base-content/60 text-xs">{{ totalPercentage }}%</div>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-2xl font-extralight tabular-nums">{{ totalUsedStr }}</span>
          <span class="text-base-content/60 text-sm">/ {{ totalTotalStr }}</span>
        </div>
        <div class="w-full">
          <progress
            class="progress h-1.5 w-full"
            :class="getProgressColor(totalPercentage)"
            :value="totalPercentage"
            max="100"
          ></progress>
        </div>
        <div class="text-base-content/30 text-xs">
          {{ $t('remainingTraffic') }}: {{ totalRemainingStr }}
        </div>
      </div>

      <!-- Per-provider Traffic -->
      <div
        v-for="provider in providersWithTraffic"
        :key="provider.name"
        class="bg-base-200/30 flex flex-col gap-3 rounded-xl p-4"
      >
        <div class="flex items-center justify-between">
          <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
            {{ provider.name }}
          </div>
          <div class="text-base-content/60 text-xs">{{ provider.percentage }}%</div>
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="text-2xl font-extralight tabular-nums">{{ provider.usedStr }}</span>
          <span class="text-base-content/60 text-sm">/ {{ provider.totalStr }}</span>
        </div>
        <div class="w-full">
          <progress
            class="progress h-1.5 w-full"
            :class="getProgressColor(provider.percentage)"
            :value="provider.percentage"
            max="100"
          ></progress>
        </div>
        <div class="text-base-content/30 text-xs">
          {{ $t('remainingTraffic') }}: {{ provider.remainingStr }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { prettyBytesHelper } from '@/helper/utils'
import { proxyProviederList } from '@/store/proxies'
import { toFinite } from 'lodash-es'
import { computed } from 'vue'

interface ProviderTrafficInfo {
  name: string
  used: number
  remaining: number
  total: number
  percentage: number
  usedStr: string
  remainingStr: string
  totalStr: string
}

const providersWithTraffic = computed<ProviderTrafficInfo[]>(() => {
  return proxyProviederList.value
    .filter((provider) => {
      const info = provider.subscriptionInfo
      return info && info.Total && info.Total > 0
    })
    .map((provider) => {
      const { Download = 0, Upload = 0, Total = 0 } = provider.subscriptionInfo!
      const used = Download + Upload
      const remaining = Math.max(0, Total - used)
      const percentage = Total > 0 ? toFinite(((used / Total) * 100).toFixed(2)) : 0

      return {
        name: provider.name,
        used,
        remaining,
        total: Total,
        percentage,
        usedStr: prettyBytesHelper(used, { binary: true }),
        remainingStr: prettyBytesHelper(remaining, { binary: true }),
        totalStr: prettyBytesHelper(Total, { binary: true }),
      }
    })
})

const hasProvidersWithTraffic = computed(() => {
  return providersWithTraffic.value.length > 0
})
const hasMultipleProvidersWithTraffic = computed(() => {
  return providersWithTraffic.value.length > 1
})

// Total traffic
const totalTraffic = computed(() => {
  const total = providersWithTraffic.value.reduce(
    (acc, provider) => ({
      used: acc.used + provider.used,
      remaining: acc.remaining + provider.remaining,
      total: acc.total + provider.total,
    }),
    { used: 0, remaining: 0, total: 0 },
  )
  return total
})

const totalPercentage = computed(() => {
  const { used, total } = totalTraffic.value
  return total > 0 ? toFinite(((used / total) * 100).toFixed(2)) : 0
})

const totalUsedStr = computed(() => {
  return prettyBytesHelper(totalTraffic.value.used, { binary: true })
})

const totalRemainingStr = computed(() => {
  return prettyBytesHelper(totalTraffic.value.remaining, { binary: true })
})

const totalTotalStr = computed(() => {
  return prettyBytesHelper(totalTraffic.value.total, { binary: true })
})

const getProgressColor = (percentage: number) => {
  if (percentage >= 90) return 'progress-error'
  if (percentage >= 70) return 'progress-warning'
  return 'progress-success'
}
</script>
