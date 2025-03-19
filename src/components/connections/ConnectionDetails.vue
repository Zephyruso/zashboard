<template>
  <DialogWrapper
    v-model="connectionDetailModalShow"
    :no-padding="true"
  >
    <div class="flex h-full max-h-[69dvh] flex-col overflow-hidden py-4 md:max-h-[89dvh]">
      <VueJsonPretty
        :data="infoConn"
        class="overflow-y-auto px-4"
      />
      <div
        class="min-h-12 shrink-0 px-4 pt-2 text-sm"
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
import { getIPFromIpsbAPI, type GlobalIPType } from '@/api'
import DialogWrapper from '@/components/common/DialogWrapper.vue'
import { useConnections } from '@/composables/connections'
import { ArrowRightCircleIcon, MapPinIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

const { infoConn, connectionDetailModalShow } = useConnections()
const details = ref<GlobalIPType | null>(null)

const localIPv4Reg = /^(127\.|10\.|192\.18\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/
const localIPv6Reg = /^(fc00::|fd[0-9a-f]{2}:|fe80::)/

const destinationIP = computed(() => infoConn.value?.metadata.destinationIP)
const isPrivateIP = computed(() => {
  if (!destinationIP.value) {
    return false
  }

  return localIPv4Reg.test(destinationIP.value) || localIPv6Reg.test(destinationIP.value)
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
    getIPFromIpsbAPI(infoConn.value?.metadata.destinationIP).then((res) => {
      details.value = res
    })
  },
)
</script>
