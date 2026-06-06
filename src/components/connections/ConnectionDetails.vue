<template>
  <DialogWrapper
    v-model="connectionDetailModalShow"
    :title="$t('connectionDetails')"
    :no-padding="true"
    :box-class="proxyChainStart ? `max-w-256` : `max-w-128`"
  >
    <template #title-right>
      <button
        v-if="sourceIP"
        type="button"
        class="btn btn-ghost btn-xs absolute top-2 right-10"
        :title="$t('sourceIPLabels')"
        @click="sourceIPDialogVisible = true"
      >
        <PencilSquareIcon class="h-4 w-4" />
        <span>{{ $t('sourceIPLabels') }}</span>
      </button>
    </template>

    <div class="flex flex-col md:h-[70dvh] md:max-h-[70dvh] md:flex-row md:overflow-hidden">
      <div class="flex flex-1 flex-col overflow-hidden p-4">
        <VueJsonPretty
          :data="infoConn"
          class="flex-1 overflow-y-auto"
        >
          <template #renderNodeValue="{ node, defaultValue }">
            <template v-if="node.path.startsWith('root.chains') && proxyMap[node.content]?.icon">
              <span
                >"<ProxyIcon
                  :icon="proxyMap[node.content].icon"
                  class="inline-block"
                  :margin="0"
                />
                {{ node.content }}"
              </span>
            </template>
            <template v-else>
              {{ defaultValue }}
            </template>
          </template>
        </VueJsonPretty>
        <div
          class="min-h-12 shrink-0 pt-2 text-sm"
          v-if="destinationIP && !isPrivateIP"
        >
          <template v-if="details">
            <div class="flex flex-wrap items-center gap-1">
              <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
              <div>
                {{ details?.ip }}
              </div>
              <div>( AS{{ details?.asn }} )</div>
            </div>
            <div class="flex flex-wrap">
              <div
                class="mr-3 flex items-center gap-1"
                v-if="details?.country"
              >
                <MapPinIcon class="h-4 w-4 shrink-0" />
                <template v-if="details?.city && details?.city !== details?.country">
                  {{ details?.city }},
                </template>
                <template v-else-if="details?.region && details?.region !== details?.country">
                  {{ details?.region }},
                </template>
                {{ details?.country }}
              </div>
              <div class="flex items-center gap-1">
                <ServerIcon class="h-4 w-4 shrink-0" />
                {{ details?.organization }}
              </div>
            </div>
          </template>
        </div>
      </div>
      <template v-if="proxyChainStart">
        <div class="divider md:divider-horizontal m-0"></div>
        <div class="flex flex-1 flex-col">
          <div class="shrink-0 p-3">
            <ProxyChainPath
              :proxy="proxyChainStart"
              :selected="selectedProxy"
              :show-now-node="true"
              :show-latency="true"
              @update:selected="selectedProxy = $event"
            />
          </div>
          <ProxyGroup
            :name="selectedProxy || proxyChainStart"
            :force-open="true"
            class="transparent-collapse rounded-none!"
          />
        </div>
      </template>
    </div>
  </DialogWrapper>

  <SourceIPLabels
    v-model="sourceIPDialogVisible"
    :show-trigger="false"
    :default-key="sourceIP"
  />
</template>

<script setup lang="ts">
import { getIPInfo, type IPInfo } from '@/api/geoip'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import ProxyChainPath from '@/components/common/ProxyChainPath.vue'
import ProxyGroup from '@/components/proxies/ProxyGroup.vue'
import SourceIPLabels from '@/components/settings/connections/SourceIPLabels.vue'
import { useConnections } from '@/composables/connections'
import { proxyMap } from '@/store/proxies'
import {
  ArrowRightCircleIcon,
  MapPinIcon,
  PencilSquareIcon,
  ServerIcon,
} from '@heroicons/vue/24/outline'
import * as ipaddr from 'ipaddr.js'
import { last } from 'lodash-es'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import ProxyIcon from '../proxies/ProxyIcon.vue'

const { infoConn, connectionDetailModalShow } = useConnections()
const details = ref<IPInfo | null>(null)
const selectedProxy = ref('')
const sourceIPDialogVisible = ref(false)
let detailsController: AbortController | undefined
let detailsSeq = 0

const destinationIP = computed(() => infoConn.value?.metadata.destinationIP)
const sourceIP = computed(() => infoConn.value?.metadata.sourceIP || '')
const isPrivateIP = computed(() => {
  if (!destinationIP.value || !ipaddr.isValid(destinationIP.value)) {
    return false
  }

  const addr = ipaddr.parse(destinationIP.value)
  const range = addr.range()

  return ['private', 'uniqueLocal', 'loopback', 'linkLocal'].includes(range)
})

const proxyChainStart = computed(() => {
  if (!infoConn.value?.chains || !infoConn.value.chains.length) {
    return null
  }

  return last(infoConn.value.chains)
})

watch(
  () => proxyChainStart.value,
  (name) => {
    selectedProxy.value = name || ''
  },
  { immediate: true },
)

watch(
  () => destinationIP.value,
  (newIP) => {
    detailsController?.abort()
    detailsSeq += 1
    detailsController = undefined

    if (!newIP) {
      details.value = null
      return
    }

    if (isPrivateIP.value) {
      details.value = null
      return
    }

    if (details.value?.ip === newIP) {
      return
    }

    details.value = null
    const controller = new AbortController()
    const currentSeq = detailsSeq
    detailsController = controller

    getIPInfo(newIP, controller.signal)
      .then((res) => {
        if (currentSeq !== detailsSeq || detailsController !== controller) return
        details.value = res
        detailsController = undefined
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (currentSeq !== detailsSeq || detailsController !== controller) return
        detailsController = undefined
      })
  },
)

onBeforeUnmount(() => {
  detailsController?.abort()
  detailsSeq += 1
  detailsController = undefined
})
</script>
