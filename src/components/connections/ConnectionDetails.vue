<template>
  <DialogWrapper
    v-model="connectionDetailModalShow"
    :title="$t('connectionDetails')"
    :no-padding="true"
    box-class="max-w-160"
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

    <div class="flex h-[70dvh] max-h-[70dvh] flex-col overflow-hidden">
      <div class="tabs-box tabs tabs-xs m-2 mb-0 shrink-0 gap-1">
        <a
          v-for="tab in availableTabs"
          :key="tab"
          role="tab"
          :class="twMerge('tab flex-1', activeTab === tab && 'tab-active')"
          @click="activeTab = tab"
          >{{ $t(tabLabel[tab]) }}</a
        >
      </div>

      <!-- 概览:美化后的分组展示 -->
      <div
        v-if="activeTab === 'overview'"
        class="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        <template
          v-for="section in sections"
          :key="section.id"
        >
          <div class="border-base-content/8 bg-base-200/40 rounded-lg border p-3">
            <div class="text-primary mb-2 text-sm font-semibold">{{ section.title }}</div>
            <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <template
                v-for="row in section.rows"
                :key="row.label"
              >
                <div class="text-base-content/60">{{ row.label }}</div>
                <div class="min-w-0 break-all">{{ row.value }}</div>
              </template>
            </div>
          </div>

          <div
            v-if="section.id === 'sourceAndDestination' && showGeoInfo"
            class="border-base-content/8 bg-base-200/40 rounded-lg border p-3 text-sm"
          >
            <div class="text-primary mb-2 font-semibold">{{ $t('geoInfo') }}</div>
            <div class="flex flex-wrap items-center gap-1">
              <ArrowRightCircleIcon class="h-4 w-4 shrink-0" />
              <div>{{ details?.ip }}</div>
              <div>( AS{{ details?.asn }} )</div>
            </div>
            <div class="mt-1 flex flex-wrap">
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
          </div>
        </template>
      </div>

      <!-- 原始 JSON -->
      <div
        v-if="activeTab === 'raw'"
        class="flex-1 overflow-y-auto p-4"
      >
        <VueJsonPretty :data="infoConn">
          <template #renderNodeValue="{ node, defaultValue }">
            <template
              v-if="
                (node.path.startsWith('root.chains') || node.path.startsWith('root.chainList')) &&
                proxyMap[node.content]?.icon
              "
            >
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
      </div>

      <!-- 切换代理组 -->
      <div
        v-if="proxyChainStart && activeTab === 'proxies'"
        class="flex flex-1 flex-col overflow-y-auto"
        :class="PROXIES_PARENT_CLASS"
      >
        <div class="shrink-0 p-3 pb-0">
          <ProxyChainPath
            :proxy="proxyChainStart"
            :selected="selectedProxy"
            :show-now-node="true"
            :show-latency="true"
            @update:selected="selectedProxy = $event"
          />
        </div>
        <ProxyGroupPanel :name="selectedProxy || proxyChainStart" />
      </div>
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
import { getConnectionDisplayValue } from '@/assembly/connections'
import { proxyMap } from '@/assembly/proxies'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import ProxyChainPath from '@/components/common/ProxyChainPath.vue'
import ProxyGroupPanel from '@/components/proxies/ProxyGroupPanel.vue'
import SourceIPLabels from '@/components/settings/connections/SourceIPLabels.vue'
import { useConnections } from '@/composables/connections'
import { CONNECTIONS_TABLE_ACCESSOR_KEY } from '@/constant'
import { getConnectionChains, getConnectionSourceIP, getDestinationFromConnection } from '@/helper'
import { PROXIES_PARENT_CLASS } from '@/helper/utils'
import { proxyChainDirection, showFullProxyChain } from '@/store/settings'
import {
  ArrowRightCircleIcon,
  MapPinIcon,
  PencilSquareIcon,
  ServerIcon,
} from '@heroicons/vue/24/outline'
import * as ipaddr from 'ipaddr.js'
import { last } from 'lodash'
import { twMerge } from 'tailwind-merge'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import ProxyIcon from '../proxies/ProxyIcon.vue'

const KEY = CONNECTIONS_TABLE_ACCESSOR_KEY

const { infoConn, connectionDetailModalShow } = useConnections()
const { t } = useI18n()
const details = ref<IPInfo | null>(null)
const selectedProxy = ref('')
const sourceIPDialogVisible = ref(false)

type TabType = 'overview' | 'raw' | 'proxies'
const tabLabel: Record<TabType, string> = {
  overview: 'overview',
  raw: 'rawData',
  proxies: 'proxies',
}
const activeTab = ref<TabType>('overview')

const destinationIP = computed(() =>
  infoConn.value ? getDestinationFromConnection(infoConn.value) : undefined,
)
const sourceIP = computed(() => (infoConn.value ? getConnectionSourceIP(infoConn.value) : ''))
const isValidDestinationIP = computed(
  () => !!destinationIP.value && ipaddr.isValid(destinationIP.value),
)
const isPrivateIP = computed(() => {
  if (!isValidDestinationIP.value) {
    return false
  }

  const addr = ipaddr.parse(destinationIP.value!)
  const range = addr.range()

  return ['private', 'uniqueLocal', 'loopback', 'linkLocal'].includes(range)
})
const showGeoInfo = computed(
  () => isValidDestinationIP.value && !isPrivateIP.value && !!details.value,
)

const proxyChainStart = computed(() => {
  if (!infoConn.value || !getConnectionChains(infoConn.value).length) {
    return null
  }

  return last(getConnectionChains(infoConn.value))
})

const availableTabs = computed<TabType[]>(() =>
  proxyChainStart.value ? ['overview', 'raw', 'proxies'] : ['overview', 'raw'],
)

const sectionDefs: { id: string; keys: CONNECTIONS_TABLE_ACCESSOR_KEY[] }[] = [
  {
    id: 'basic',
    keys: [KEY.Type, KEY.ConnectTime, KEY.Rule, KEY.Process, KEY.InboundUser, KEY.Protocol],
  },
  {
    id: 'sourceAndDestination',
    keys: [
      KEY.SourceIP,
      KEY.SourcePort,
      KEY.Host,
      KEY.SniffHost,
      KEY.Destination,
      KEY.DestinationType,
      KEY.RemoteAddress,
    ],
  },
  { id: 'traffic', keys: [KEY.Download, KEY.Upload, KEY.DlSpeed, KEY.UlSpeed] },
  { id: 'outbound', keys: [KEY.Chains, KEY.Outbound, KEY.OutboundType, KEY.FromOutbound] },
]

const sections = computed(() => {
  const conn = infoConn.value
  if (!conn) return []

  const options = {
    mode: 'table' as const,
    proxyChainDirection: proxyChainDirection.value,
    showFullProxyChain: showFullProxyChain.value,
  }
  const rowsOf = (keys: CONNECTIONS_TABLE_ACCESSOR_KEY[]) =>
    keys
      .map((key) => ({
        label: t(key),
        value: String(getConnectionDisplayValue(conn, key, options) ?? ''),
      }))
      .filter((row) => row.value && row.value !== '-')

  return sectionDefs
    .map((def) => {
      const rows = rowsOf(def.keys)
      if (def.id === 'basic') {
        rows.unshift({ label: 'ID', value: conn.id })
      }
      return { id: def.id, title: t(def.id), rows }
    })
    .filter((section) => section.rows.length)
})

watch(
  () => proxyChainStart.value,
  (name) => {
    selectedProxy.value = name || ''
    if (!name && activeTab.value === 'proxies') {
      activeTab.value = 'overview'
    }
  },
  { immediate: true },
)

watch(
  () => connectionDetailModalShow.value,
  (show) => {
    if (show) {
      activeTab.value = 'overview'
    }
  },
)

watch(
  () => destinationIP.value,
  (newIP) => {
    if (!newIP || !isValidDestinationIP.value || isPrivateIP.value) {
      details.value = null
      return
    }

    if (details.value?.ip === newIP) {
      return
    }

    details.value = null
    getIPInfo(newIP).then((res) => {
      details.value = res
    })
  },
)
</script>
