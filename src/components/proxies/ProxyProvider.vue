<template>
  <CollapseCard :name="proxyProvider.name">
    <template v-slot:title>
      <div class="flex items-center justify-between gap-2">
        <div class="text-lg font-medium sm:text-xl">
          {{ proxyProvider.name }}
          <span class="text-sm font-normal text-base-content/60"> ({{ proxiesCount }}) </span>
          <span
            class="text-sm font-normal text-base-content/60"
            v-if="subscriptionInfo"
          >
            {{ subscriptionInfo.expireStr }}
          </span>
        </div>
        <div class="flex gap-2">
          <button
            :class="twMerge('btn btn-circle btn-sm z-30')"
            @click.stop="healthCheckClickHandler"
          >
            <span
              v-if="isHealthChecking"
              class="loading loading-spinner loading-xs"
            ></span>
            <BoltIcon
              v-else
              class="h-4 w-4"
            />
          </button>
          <button
            :class="twMerge('btn btn-circle btn-sm z-30', isUpdating ? 'animate-spin' : '')"
            @click.stop="updateProviderClickHandler"
          >
            <ArrowPathIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
      <progress
        class="progress mt-2 text-slate-500"
        v-if="subscriptionInfo"
        :value="subscriptionInfo.percentage"
        max="100"
      />
      <div
        v-if="subscriptionInfo"
        class="flex justify-between text-sm text-base-content/60"
      >
        <div>
          {{ subscriptionInfo.used }} / {{ subscriptionInfo.total }} ({{
            subscriptionInfo.percentage
          }}%)
        </div>
        <div>{{ $t('updated') }} {{ fromNow(proxyProvider.updatedAt) }}</div>
      </div>
    </template>
    <template v-slot:preview>
      <ProxyPreview :nodes="renderProxies" />
    </template>
    <template v-slot:content>
      <ProxyNodeGrid>
        <ProxyNodeCard
          v-for="node in renderProxies"
          :key="node"
          :name="node"
        />
      </ProxyNodeGrid>
    </template>
  </CollapseCard>
</template>

<script setup lang="ts">
import { proxyProviderHealthCheckAPI, updateProxyProviderAPI } from '@/api'
import { NOT_CONNECTED } from '@/constant'
import { fromNow, prettyBytesHelper, sortAndFilterProxyNodes } from '@/helper'
import { fetchProxies, getLatencyByName, proxyProviederList } from '@/store/proxies'
import { ArrowPathIcon, BoltIcon } from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { toFinite } from 'lodash'
import { twMerge } from 'tailwind-merge'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CollapseCard from '../common/CollapseCard.vue'
import ProxyNodeCard from './ProxyNodeCard.vue'
import ProxyNodeGrid from './ProxyNodeGrid.vue'
import ProxyPreview from './ProxyPreview.vue'

const props = defineProps<{
  name: string
}>()

const proxyProvider = computed(
  () => proxyProviederList.value.find((group) => group.name === props.name)!,
)
const renderProxies = computed(() => {
  return sortAndFilterProxyNodes(proxyProvider.value.proxies.map((node) => node.name))
})
const availableProxies = computed(() => {
  return renderProxies.value.filter((proxy) => getLatencyByName(proxy) !== NOT_CONNECTED).length
})
const proxiesCount = computed(() => {
  const all = proxyProvider.value.proxies?.length ?? 0
  return `${availableProxies.value}/${all}`
})

const subscriptionInfo = computed(() => {
  const info = proxyProvider.value.subscriptionInfo

  if (info) {
    const { Download = 0, Upload = 0, Total = 0, Expire = 0 } = info

    if (Download === 0 && Upload === 0 && Total === 0 && Expire === 0) {
      return null
    }

    const { t } = useI18n()
    const total = prettyBytesHelper(Total, { binary: true })
    const used = prettyBytesHelper(Download + Upload, { binary: true })
    const percentage = toFinite((((Download + Upload) / Total) * 100).toFixed(2))
    const expireStr =
      Expire === 0
        ? `${t('expire')}: ${t('noExpire')}`
        : `${t('expire')}: ${dayjs(Expire * 1000).format('YYYY-MM-DD')}`

    return {
      total,
      used,
      percentage,
      expireStr,
    }
  }

  return null
})

const isUpdating = ref(false)
const isHealthChecking = ref(false)

const healthCheckClickHandler = async () => {
  if (isHealthChecking.value) return

  isHealthChecking.value = true
  try {
    await proxyProviderHealthCheckAPI(props.name)
    await fetchProxies()
    isHealthChecking.value = false
  } catch {
    isHealthChecking.value = false
  }
}

const updateProviderClickHandler = async () => {
  if (isUpdating.value) return

  isUpdating.value = true
  try {
    await updateProxyProviderAPI(props.name)
    await fetchProxies()
    isUpdating.value = false
  } catch {
    isUpdating.value = false
  }
}
</script>
