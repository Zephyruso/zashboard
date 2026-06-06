<template>
  <CollapseCard :name="proxyProvider.name">
    <template v-slot:title>
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-1 items-center gap-1">
          <span class="text-base font-semibold tracking-tight">{{ proxyProvider.name }}</span>
          <span class="text-base-content/60 text-xs tabular-nums">
            · {{ proxyProvider.vehicleType }} · {{ proxiesCount }}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-sm z-30"
            :aria-label="$t('speedtest')"
            :title="$t('speedtest')"
            :disabled="isHealthChecking"
            :aria-busy="isHealthChecking"
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
            type="button"
            :class="updateButtonClass"
            :aria-label="$t('refresh')"
            :title="$t('refresh')"
            :disabled="isUpdating"
            :aria-busy="isUpdating"
            @click.stop="updateProviderClickHandler"
          >
            <ArrowPathIcon
              class="h-3.5 w-3.5 opacity-60"
              aria-hidden="true"
            />
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
import { isRequestCanceled, proxyProviderHealthCheckAPI, updateProxyProviderAPI } from '@/api'
import { useBounceOnVisible } from '@/composables/bouncein'
import { useRenderProxyList } from '@/composables/renderProxies'
import { fromNow, prettyBytesHelper } from '@/helper/utils'
import { fetchProxies, proxyProviderByName } from '@/store/proxies'
import { ArrowPathIcon, BoltIcon } from '@heroicons/vue/24/outline'
import dayjs from 'dayjs'
import { toFinite } from 'lodash-es'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CollapseCard from '../common/CollapseCard.vue'
import ProxiesContent from './ProxiesContent.vue'
import ProxyPreview from './ProxyPreview.vue'

const props = defineProps<{
  name: string
}>()
const { t } = useI18n()

const proxyProvider = computed(() => proxyProviderByName.value.get(props.name)!)
const allProxies = computed(() => proxyProvider.value.proxies.map((node) => node.name) ?? [])
const { renderProxies, proxiesCount } = useRenderProxyList(allProxies)

const subscriptionInfo = computed(() => {
  const info = proxyProvider.value.subscriptionInfo

  if (info) {
    const { Download = 0, Upload = 0, Total = 0, Expire = 0 } = info

    if (Download === 0 && Upload === 0 && Total === 0 && Expire === 0) {
      return null
    }

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
const updateButtonClass = computed(() =>
  isUpdating.value
    ? 'btn btn-circle btn-ghost btn-sm z-30 animate-spin'
    : 'btn btn-circle btn-ghost btn-sm z-30',
)
let updateProviderController: AbortController | undefined
let healthCheckController: AbortController | undefined
let updateProviderSeq = 0
let healthCheckSeq = 0

const isCurrentUpdate = (controller: AbortController, seq: number) => {
  return updateProviderController === controller && updateProviderSeq === seq
}

const isCurrentHealthCheck = (controller: AbortController, seq: number) => {
  return healthCheckController === controller && healthCheckSeq === seq
}

const healthCheckClickHandler = async () => {
  if (isHealthChecking.value) return

  healthCheckController?.abort()
  const controller = new AbortController()
  const seq = ++healthCheckSeq
  healthCheckController = controller
  isHealthChecking.value = true
  try {
    await proxyProviderHealthCheckAPI(props.name, controller.signal)
    if (isCurrentHealthCheck(controller, seq)) await fetchProxies()
  } catch (error) {
    if (isRequestCanceled(error)) return
    // Request interceptor surfaces API failures; keep this click handler settled.
  } finally {
    if (isCurrentHealthCheck(controller, seq)) {
      isHealthChecking.value = false
      healthCheckController = undefined
    }
  }
}

const updateProviderClickHandler = async () => {
  if (isUpdating.value) return

  updateProviderController?.abort()
  const controller = new AbortController()
  const seq = ++updateProviderSeq
  updateProviderController = controller
  isUpdating.value = true
  try {
    await updateProxyProviderAPI(props.name, controller.signal)
    if (isCurrentUpdate(controller, seq)) await fetchProxies()
  } catch (error) {
    if (isRequestCanceled(error)) return
    // Request interceptor surfaces API failures; keep this click handler settled.
  } finally {
    if (isCurrentUpdate(controller, seq)) {
      isUpdating.value = false
      updateProviderController = undefined
    }
  }
}

useBounceOnVisible()

onBeforeUnmount(() => {
  updateProviderController?.abort()
  healthCheckController?.abort()
  updateProviderSeq += 1
  healthCheckSeq += 1
  updateProviderController = undefined
  healthCheckController = undefined
})
</script>
