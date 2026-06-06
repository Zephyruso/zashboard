<template>
  <div class="flex w-full flex-col gap-3">
    <form
      class="join w-96 max-w-full max-sm:w-full"
      @submit.prevent="query"
    >
      <TextInput
        v-model="form.name"
        class="join-item flex-1"
        placeholder="Domain Name"
        :clearable="true"
        :menus="dnsQueryNameHistory"
        :menus-deleteable="true"
        @update:menus="updateDnsQueryNameHistory"
      />
      <TextInput
        v-model="form.type"
        class="join-item w-28"
        placeholder="Type"
        :menus="['A', 'AAAA', 'HTTPS']"
      />
      <button
        type="submit"
        class="btn join-item btn-sm"
        :disabled="isQuerying || !form.name.trim()"
        :aria-busy="isQuerying"
      >
        <span
          v-if="isQuerying"
          class="loading loading-spinner loading-sm"
        ></span>
        {{ $t('DNSQuery') }}
      </button>
    </form>
    <div
      v-if="resultList?.length"
      class="bg-base-200/30 max-h-96 overflow-y-auto rounded-sm"
    >
      <div
        v-for="(item, index) in resultList"
        :key="`${item.name}-${item.type}-${item.data}-${index}`"
        class="border-base-300/30 flex items-center justify-between gap-4 p-2 not-last:border-b"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span
              class="bg-base-200 text-base-content/70 rounded-full px-2 py-0.5 text-[11px] font-medium"
            >
              {{ getDnsTypeLabel(item.type) }}
            </span>
            <span class="text-base-content truncate text-sm font-medium">
              {{ item.name }}
            </span>
          </div>
          <div class="text-base-content/50 mt-1 text-xs">TTL {{ item.TTL }}</div>
        </div>
        <div class="text-base-content max-w-[50%] text-right text-sm leading-5 break-all">
          {{ item.data }}
        </div>
      </div>
    </div>
    <div
      v-if="details"
      class="text-base-content/70 flex flex-wrap gap-x-3 gap-y-1 text-xs"
    >
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
  </div>
</template>

<script lang="ts" setup>
import { isRequestCanceled, queryDNSAPI } from '@/api'
import { getIPInfo, type IPInfo } from '@/api/geoip'
import type { DNSQuery } from '@/types'
import { MapPinIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { useStorage } from '@vueuse/core'
import { onUnmounted, reactive, ref } from 'vue'
import TextInput from '../../common/TextInput.vue'

const DNS_TYPE_LABELS: Record<number, string> = {
  1: 'A',
  5: 'CNAME',
  28: 'AAAA',
  65: 'HTTPS',
}

const form = reactive({
  name: 'www.google.com',
  type: 'A',
})
const details = ref<IPInfo | null>(null)
const resultList = ref<DNSQuery['Answer']>([])
const dnsQueryNameHistory = useStorage<string[]>('cache/dns-query-name-history', [])
const isQuerying = ref(false)
let querySequence = 0
let queryAbortController: AbortController | undefined

const getDnsTypeLabel = (type: number) => DNS_TYPE_LABELS[type] ?? `TYPE ${type}`
const updateDnsQueryNameHistory = (history: string[]) => {
  dnsQueryNameHistory.value = history
}

const saveQueryName = (name: string) => {
  const queryName = name.trim()

  if (!queryName) {
    return
  }

  const nextHistory = dnsQueryNameHistory.value.filter((item) => item !== queryName)

  nextHistory.unshift(queryName)
  dnsQueryNameHistory.value = nextHistory.slice(0, 8)
}

const query = async () => {
  const queryName = form.name.trim()

  if (!queryName) return

  const sequence = ++querySequence
  const controller = new AbortController()
  const queryForm = {
    name: queryName,
    type: form.type.trim() || 'A',
  }

  queryAbortController?.abort()
  queryAbortController = controller
  isQuerying.value = true
  details.value = null
  saveQueryName(queryName)

  try {
    const { data } = await queryDNSAPI(queryForm, controller.signal)

    if (sequence !== querySequence) return

    resultList.value = data.Answer ?? []

    const ipAnswer = resultList.value.find(({ type }) => type === 1 || type === 28)

    if (!ipAnswer) return

    try {
      const ipInfo = await getIPInfo(ipAnswer.data, controller.signal)

      if (sequence === querySequence) {
        details.value = ipInfo
      }
    } catch {
      if (sequence === querySequence) {
        details.value = null
      }
    }
  } catch (error) {
    if (!isRequestCanceled(error) && sequence === querySequence) {
      resultList.value = []
      details.value = null
    }
  } finally {
    if (queryAbortController === controller) {
      queryAbortController = undefined
    }
    if (sequence === querySequence) {
      isQuerying.value = false
    }
  }
}

onUnmounted(() => {
  querySequence++
  queryAbortController?.abort()
  queryAbortController = undefined
})
</script>
