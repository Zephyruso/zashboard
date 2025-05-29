<template>
  <div class="bg-base-200/50 relative h-28 rounded-lg p-2 text-sm">
    <div class="flex h-full flex-col justify-between">
      <div>
        <span class="inline-block w-20">Baidu </span>
        :
        <span :class="getColorForLatency(Number(baiduLatency))">{{ baiduLatency }}ms </span>
      </div>
      <div>
        <span class="inline-block w-20">Cloudflare </span>
        :
        <span :class="getColorForLatency(Number(cloudflareLatency))"
          >{{ cloudflareLatency }}ms
        </span>
      </div>
      <div>
        <span class="inline-block w-20">Github </span>
        :
        <span :class="getColorForLatency(Number(githubLatency))">{{ githubLatency }}ms </span>
      </div>
      <div>
        <span class="inline-block w-20">YouTube </span>
        :
        <span :class="getColorForLatency(Number(youtubeLatency))">{{ youtubeLatency }}ms </span>
      </div>
    </div>
    <button
      class="btn btn-circle btn-sm absolute right-2 bottom-2"
      @click="getLatency"
    >
      <BoltIcon class="h-4 w-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { BoltIcon } from '@heroicons/vue/24/outline'
import {
  getBaiduLatencyAPI,
  getCloudflareLatencyAPI,
  getGithubLatencyAPI,
  getYouTubeLatencyAPI,
} from '@renderer/api/latency'
import {
  baiduLatency,
  cloudflareLatency,
  githubLatency,
  youtubeLatency,
} from '@renderer/composables/overview'
import { getColorForLatency } from '@renderer/helper'
import { autoConnectionCheck } from '@renderer/store/settings'
import { onMounted } from 'vue'

const getLatency = async () => {
  getBaiduLatencyAPI().then((res) => {
    baiduLatency.value = res.toFixed(0)
  })

  getCloudflareLatencyAPI().then((res) => {
    cloudflareLatency.value = res.toFixed(0)
  })

  getGithubLatencyAPI().then((res) => {
    githubLatency.value = res.toFixed(0)
  })

  getYouTubeLatencyAPI().then((res) => {
    youtubeLatency.value = res.toFixed(0)
  })
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
</script>
