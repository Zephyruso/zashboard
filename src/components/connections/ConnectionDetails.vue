<template>
  <DialogWrapper
    v-model="connectionDetailModalShow"
    :no-padding="true"
  >
    <div class="flex h-full max-h-[69dvh] flex-col overflow-hidden py-4 md:max-h-[89dvh]">
      <VueJsonPretty
        :data="infoConn"
        class="overflow-y-auto px-4"
      >
        <template #renderNodeValue="{ node, defaultValue }">
          <template v-if="node.path.startsWith('root.chains') && proxyMap[node.content]?.icon">
            <span>
              "<ProxyIcon
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
        v-if="destinationIP && !isPrivateIP"
        class="min-h-12 shrink-0 px-4 pt-2 text-sm"
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
              v-if="details?.country"
              class="mr-3 flex items-center gap-1"
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
  </DialogWrapper>
</template>

<script setup lang="ts">
import { ArrowRightCircleIcon, MapPinIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { getIPInfo, type IPInfo } from '@renderer/api/geoip'
import DialogWrapper from '@renderer/components/common/DialogWrapper.vue'
import { useConnections } from '@renderer/composables/connections'
import { proxyMap } from '@renderer/store/proxies'
import * as ipaddr from 'ipaddr.js'
import { computed, ref, watch } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import ProxyIcon from '../proxies/ProxyIcon.vue'

const { infoConn, connectionDetailModalShow } = useConnections()
const details = ref<IPInfo | null>(null)

const destinationIP = computed(() => infoConn.value?.metadata.destinationIP)
const isPrivateIP = computed(() => {
  if (!destinationIP.value || !ipaddr.isValid(destinationIP.value)) {
    return false
  }

  const addr = ipaddr.parse(destinationIP.value)
  const range = addr.range()

  return ['private', 'uniqueLocal', 'loopback', 'linkLocal'].includes(range)
})

watch(
  () => destinationIP.value,
  (newIP) => {
    if (!newIP) {
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
    getIPInfo(infoConn.value?.metadata.destinationIP).then((res) => {
      details.value = res
    })
  },
)
</script>
