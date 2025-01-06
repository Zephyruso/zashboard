<template>
  <div class="card card-compact">
    <div class="card-title px-4 pt-4">
      {{ $t('proxies') }}
    </div>
    <div class="card-body">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex items-center gap-2">
          {{ $t('automaticDisconnection') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="automaticDisconnection"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('ipv6Test') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="IPv6test"
          />
        </div>
        <div class="flex w-full items-center gap-2">
          <span class="shrink-0"> {{ $t('speedtestUrl') }}: </span>
          <input
            type="text"
            class="input input-sm input-bordered w-60 flex-1 sm:max-w-80"
            v-model="speedtestUrl"
          />
        </div>
        <div class="flex w-full items-center gap-2">
          <span class="shrink-0"> {{ $t('speedtestTimeout') }}: </span>
          <input
            type="text"
            class="input input-sm input-bordered w-20"
            v-model="speedtestTimeout"
          />
          ms
        </div>
        <div class="flex items-center gap-2">
          <span class="shrink-0"> {{ $t('lowLatencyDesc') }}: </span>
          <input
            type="number"
            class="input input-sm input-bordered w-20"
            v-model="lowLatency"
          />
          ms
        </div>
        <div class="flex items-center gap-2">
          <span class="shrink-0"> {{ $t('mediumLatencyDesc') }}: </span>
          <input
            type="number"
            class="input input-sm input-bordered w-20"
            v-model="mediumLatency"
          />
          ms
        </div>
      </div>
      <div class="divider"></div>
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="flex items-center gap-2 max-sm:hidden">
          {{ $t('twoColumnProxyGroup') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="twoColumnProxyGroup"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyPreviewType') }}:
          <select
            class="select select-bordered select-sm min-w-24"
            v-model="proxyPreviewType"
          >
            <option
              v-for="opt in Object.values(PROXY_PREVIEW_TYPE)"
              :key="opt"
              :value="opt"
            >
              {{ $t(opt) }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          {{ $t('truncateProxyName') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="truncateProxyName"
          />
        </div>
        <div class="flex items-center gap-2">
          {{ $t('proxyCardSize') }}:
          <select
            class="select select-bordered select-sm min-w-24"
            v-model="proxyCardSize"
          >
            <option
              v-for="opt in Object.values(PROXY_CARD_SIZE)"
              :key="opt"
              :value="opt"
            >
              {{ $t(opt) }}
            </option>
          </select>
        </div>
        <template v-if="hasIcon">
          <div class="flex items-center gap-2">
            {{ $t('iconSize') }}:
            <input
              type="number"
              class="input input-sm input-bordered w-20"
              v-model="iconSize"
            />
          </div>
          <div class="flex items-center gap-2">
            {{ $t('iconMarginRight') }}:
            <input
              type="number"
              class="input input-sm input-bordered w-20"
              v-model="iconMarginRight"
            />
          </div>
        </template>
        <div class="flex items-center gap-2">
          {{ $t('showHiddenGroup') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="showHiddenGroup"
          />
        </div>
        <div
          v-if="isSingBox"
          class="flex items-center gap-2"
        >
          {{ $t('showGlobalProxy') }}:
          <input
            class="toggle"
            type="checkbox"
            v-model="showGlobalProxy"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isSingBox } from '@/api'
import { PROXY_CARD_SIZE, PROXY_PREVIEW_TYPE } from '@/config'
import { proxyMap } from '@/store/proxies'
import {
  automaticDisconnection,
  iconMarginRight,
  iconSize,
  IPv6test,
  lowLatency,
  mediumLatency,
  proxyCardSize,
  proxyPreviewType,
  showGlobalProxy,
  showHiddenGroup,
  speedtestTimeout,
  speedtestUrl,
  truncateProxyName,
  twoColumnProxyGroup,
} from '@/store/settings'
import { computed } from 'vue'

const hasIcon = computed(() => {
  return Object.values(proxyMap.value).some((proxy) => !!proxy.icon)
})
</script>
