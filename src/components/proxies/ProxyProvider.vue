<template>
  <CollapseCard :name="proxyProvider.name">
    <template v-slot:title>
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-1 items-center gap-2.5">
          <span class="text-base-content font-medium">{{ proxyProvider.name }}</span>
          <span
            class="text-base-content/40 min-w-0 flex-1 truncate text-[11px] font-medium tracking-wider uppercase tabular-nums"
          >
            {{ proxyProvider.vehicleType }} · {{ proxiesCount }}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            class="btn btn-circle btn-ghost btn-sm z-30"
            @click.stop="healthCheckClickHandler"
          >
            <span
              v-if="isHealthChecking"
              class="loading loading-spinner loading-sm"
            ></span>
            <BoltIcon
              v-else
              class="h-3.5 w-3.5 opacity-60"
            />
          </button>
          <button
            v-if="proxyProvider.vehicleType !== 'Inline'"
            :class="
              twMerge('btn btn-circle btn-ghost btn-sm z-30', isUpdating ? 'animate-spin' : '')
            "
            @click.stop="updateProviderClickHandler"
          >
            <ArrowPathIcon class="h-3.5 w-3.5 opacity-60" />
          </button>
        </div>
      </div>
      <div class="mt-2 space-y-1.5">
        <div
          v-if="subscriptionInfo"
          class="space-y-1"
        >
          <div class="bg-base-content/10 h-1.5 w-full overflow-hidden rounded-full">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="usageBarColor"
              :style="{ width: `${subscriptionInfo.percentage}%` }"
            />
          </div>
          <div class="text-base-content/60 flex justify-between text-xs">
            <span>{{ subscriptionInfo.usageStr }}</span>
            <span>{{ subscriptionInfo.expireStr }}</span>
          </div>
        </div>
        <div class="text-base-content/60 text-xs">
          {{ $t('updated') }} {{ fromNow(proxyProvider.updatedAt) }}
        </div>
      </div>
    </template>
    <template v-slot:preview>
      <ProxyPreview :nodes="renderProxies" />
    </template>
    <template v-slot:content>
      <ProxiesContent
        :name="name"
        :render-proxies="renderProxies"
      />
    </template>
  </CollapseCard>
</template>

<script setup lang="ts">
import { proxyProviderHealthCheckAPI, updateProxyProviderAPI } from '@/assembly/proxies'
import { useBounceOnVisible } from '@/composables/bouncein'
import { useRenderProxyList } from '@/composables/renderProxies'
import { fromNow, prettyBytesHelper } from '@/helper/utils'
import { fetchProxies } from '@/assembly/proxies'
import { proxyProviederList } from '@/assembly/proxies'
import { ArrowPathIcon, BoltIcon } from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { toFinite } from 'lodash'
import { twMerge } from 'tailwind-merge'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CollapseCard from '../common/CollapseCard.vue'
import ProxiesContent from './ProxiesContent.vue'
import ProxyPreview from './ProxyPreview.vue'

const props = defineProps<{
  name: string
}>()

const proxyProvider = computed(
  () => proxyProviederList.value.find((group) => group.name === props.name)!,
)
const allProxies = computed(() => proxyProvider.value.proxies.map((node) => node.name) ?? [])
const { renderProxies, proxiesCount } = useRenderProxyList(allProxies)

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

    const usedStr = `${used} / ${total}`
    const usageStr = Total === 0 ? usedStr : `${usedStr} ( ${percentage}% )`

    return {
      expireStr,
      usageStr,
      percentage: Math.min(percentage, 100),
    }
  }

  return null
})

const usageBarColor = computed(() => {
  const pct = subscriptionInfo.value?.percentage ?? 0

  if (pct >= 90) return 'bg-error'
  if (pct >= 70) return 'bg-warning'
  return 'bg-primary'
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

useBounceOnVisible()
</script>
