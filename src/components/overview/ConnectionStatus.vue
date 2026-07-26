<template>
  <div class="bg-base-200/30 flex flex-col rounded-xl p-4">
    <div class="flex items-center justify-between">
      <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
        {{ $t('latency') }}
      </div>
      <button
        class="btn btn-ghost btn-xs btn-circle"
        :disabled="isTesting"
        @click="getLatency"
      >
        <BoltIcon
          class="h-3.5 w-3.5"
          :class="isTesting ? 'animate-pulse' : ''"
        />
      </button>
    </div>

    <div class="mt-2 grid grid-cols-2 gap-4">
      <div
        v-for="item in latencyItems"
        :key="item.name"
        class="flex flex-col gap-0.5"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-base-content/70 inline-block w-14 shrink-0 text-xs">{{
            item.name
          }}</span>
          <LatencyChart
            :data="item.values"
            :rounds="ROUNDS"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex flex-wrap gap-x-4 text-[11px] tabular-nums">
          <template v-if="item.stats">
            <span
              v-for="stat in item.stats"
              :key="stat.label"
            >
              <span class="text-base-content/40 mr-1">{{ stat.label }}</span>
              <span :class="getColorForLatency(stat.value)">{{ stat.value }}ms</span>
            </span>
          </template>
          <span
            v-else
            class="text-base-content/30"
            >--</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  getBaiduLatencyAPI,
  getCloudflareLatencyAPI,
  getGithubLatencyAPI,
  getYouTubeLatencyAPI,
} from '@/api/latency'
import {
  baiduLatency,
  cloudflareLatency,
  githubLatency,
  youtubeLatency,
} from '@/composables/overview'
import { getColorForLatency } from '@/helper'
import { autoConnectionCheck } from '@/store/settings'
import { BoltIcon } from '@heroicons/vue/24/outline'
import { computed, onMounted, ref } from 'vue'
import LatencyChart from './LatencyChart.vue'

const ROUNDS = 10

const targets = [
  { name: 'Baidu', ref: baiduLatency, api: getBaiduLatencyAPI },
  { name: 'Cloudflare', ref: cloudflareLatency, api: getCloudflareLatencyAPI },
  { name: 'GitHub', ref: githubLatency, api: getGithubLatencyAPI },
  { name: 'YouTube', ref: youtubeLatency, api: getYouTubeLatencyAPI },
]

const isTesting = ref(false)

// 仅用成功(>0)样本统计 min / avg / max。
const computeStats = (values: number[]) => {
  const ok = values.filter((v) => v > 0).sort((a, b) => a - b)
  if (!ok.length) return null
  const avg = Math.round(ok.reduce((sum, v) => sum + v, 0) / ok.length)
  return [
    { label: 'min', value: ok[0] },
    { label: 'avg', value: avg },
    { label: 'max', value: ok[ok.length - 1] },
  ]
}

const latencyItems = computed(() =>
  targets.map((t) => ({ name: t.name, values: t.ref.value, stats: computeStats(t.ref.value) })),
)

const getLatency = async () => {
  if (isTesting.value) return
  isTesting.value = true
  targets.forEach((t) => (t.ref.value = []))

  try {
    // 每个目标各自独立跑 ROUNDS 轮,互不阻塞;结果逐轮追加,柱子渐次填充。
    await Promise.all(
      targets.map(async (t) => {
        for (let i = 0; i < ROUNDS; i++) {
          const res = await t.api()
          t.ref.value = [...t.ref.value, Math.round(res)]
        }
      }),
    )
  } finally {
    isTesting.value = false
  }
}

onMounted(() => {
  if (autoConnectionCheck.value && targets.every((t) => t.ref.value.length === 0)) {
    getLatency()
  }
})
</script>
