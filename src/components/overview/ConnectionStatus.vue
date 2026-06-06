<template>
  <div class="bg-base-200/30 flex flex-col rounded-xl p-4">
    <div class="flex items-center justify-between">
      <div class="text-base-content/60 text-xs font-semibold tracking-wider uppercase">
        {{ $t('latency') }}
      </div>
      <button
        class="btn btn-ghost btn-xs btn-circle touch-target"
        :aria-label="$t('testAllLatency')"
        :disabled="isTestingLatency"
        :aria-busy="isTestingLatency"
        @click="getLatency"
      >
        <span
          v-if="isTestingLatency"
          class="loading loading-spinner loading-xs"
        ></span>
        <BoltIcon
          v-else
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
      </button>
    </div>

    <div class="mt-3 flex flex-col gap-2.5">
      <div
        v-for="item in latencyItems"
        :key="item.name"
        class="flex items-center justify-between"
      >
        <span class="text-base-content/70 text-sm">{{ item.name }}</span>
        <span
          v-if="item.value"
          class="flex items-center gap-1.5 text-sm font-medium"
          :class="getColorForLatency(Number(item.value))"
        >
          {{ item.value }}ms
          <SignalStrength :latency="Number(item.value)" />
        </span>
        <SkeletonLoader
          v-else
          width="3rem"
          height="0.875rem"
          border-radius="var(--ios-radius-sm, 10px)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SignalStrength from './SignalStrength.vue'

const latencyItems = computed(() => [
  { name: 'Baidu', value: baiduLatency.value },
  { name: 'Cloudflare', value: cloudflareLatency.value },
  { name: 'GitHub', value: githubLatency.value },
  { name: 'YouTube', value: youtubeLatency.value },
])

const isTestingLatency = ref(false)
let latencyController: AbortController | undefined
let latencySeq = 0

const getLatency = async () => {
  latencyController?.abort()
  const controller = new AbortController()
  const currentSeq = ++latencySeq
  latencyController = controller
  isTestingLatency.value = true

  baiduLatency.value = ''
  cloudflareLatency.value = ''
  githubLatency.value = ''
  youtubeLatency.value = ''

  const isCurrentLatencyTest = () => {
    return currentSeq === latencySeq && latencyController === controller
  }

  const latencyTasks = [
    getBaiduLatencyAPI(controller.signal).then((res) => {
      if (!isCurrentLatencyTest()) return
      baiduLatency.value = res.toFixed(0)
    }),
    getCloudflareLatencyAPI(controller.signal).then((res) => {
      if (!isCurrentLatencyTest()) return
      cloudflareLatency.value = res.toFixed(0)
    }),
    getGithubLatencyAPI(controller.signal).then((res) => {
      if (!isCurrentLatencyTest()) return
      githubLatency.value = res.toFixed(0)
    }),
    getYouTubeLatencyAPI(controller.signal).then((res) => {
      if (!isCurrentLatencyTest()) return
      youtubeLatency.value = res.toFixed(0)
    }),
  ]

  await Promise.allSettled(latencyTasks)
  if (!isCurrentLatencyTest()) return

  isTestingLatency.value = false
  latencyController = undefined
}

onMounted(() => {
  if (
    autoConnectionCheck.value &&
    [baiduLatency, cloudflareLatency, githubLatency, youtubeLatency].some(
      (item) => item.value === '',
    )
  ) {
    getLatency()
  }
})

onBeforeUnmount(() => {
  latencyController?.abort()
  latencySeq += 1
  latencyController = undefined
})
</script>
